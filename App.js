/* eslint-disable no-inner-declarations */
require("dotenv").config()

const rp = require("request-promise"),
    fs = require("fs"),
    delay = require("delay"),
    signale = require("signale"),
    PromisePool = require("es6-promise-pool"),

    Admin = require("./ZeroNet/AdminZite"),
    DataBase = require("./DataBase"),
    SiteMeta = require("./ZeroNet/SiteMeta"),
    SettingsLoader = require("./ZeroNet/SettingsLoader"),
    DomainResolver = require("./ZeroNet/DomainResolver"),

    modules = require("require-dir-all")("Crawlers")

let admin = null
let exiting = false

const blocked = require("blocked-at")
blocked((time, stack) => {
    signale.warn(`Blocked for ${time / 1000}s, operation started here:`, stack)
}, { threshold: 10000 })

function exitHandler() {
    if (exiting)
        process.exit()
    signale.warn("Received signal, gracefully shutting down...")
    exiting = true
}

process.on("SIGINT", exitHandler)
process.on("SIGTERM", exitHandler)

process.on("exit", () => {
    signale.warn("Exited")
})


// ZeroHello won't be downloaded without requesting
async function waitAndGetAdmin() {
    while (true) {
        try {
            admin = new Admin()
        } catch (e) {
            signale.fatal("Cannot connect to admin site", e)
        }
        if (!admin) {
            try {
                await rp({
                    url: `http://${SettingsLoader.ZeroNetHost}`,
                    headers: { "Accept": "text/html" },
                    followRedirect: false
                })
            } catch {
                signale.info("Sent request to trigger ZeroHello downloading.")
                await delay(process.env.mainLoopInterval)
            }
        } else
            break
    }
}

function bootstrapCrawling() {
    signale.info("Adding bootstrap sites")
    admin.addSites([
        "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D",
        "1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F"
    ])
    let lastAddDomain = 0
    try {
        lastAddDomain = parseInt(fs.readFileSync("./lastAddDomain", "utf8"))
    } catch { }
    if (Date.now() - lastAddDomain > 12 * 60 * 60 * 1000) {
        DomainResolver.loadDomains()
        signale.info(`Adding ${Object.keys(global.domainMapObj).length} sites from ZeroName`)
        for (let domain in global.domainMapObj)
            if (global.domainMapObj[domain])
                admin.addSites([global.domainMapObj[domain]])
        fs.writeFileSync("./lastAddDomain", Date.now())
    }
}

async function crawlASite(siteInfo) {
    try {
        signale.start(`Started crawling site ${siteInfo.address} id:${global.tempSiteId[siteInfo.address]} total:${global.sitesCount}`)
        signale.time(siteInfo.address)

        let dbSchema = await SiteMeta.getDBJson(siteInfo.address),
            siteObj = await DataBase.getSite(siteInfo.address),
            siteDB = dbSchema ? await SiteMeta.getSiteDataBase(siteInfo.address) : null,
            isNewSite = false

        if (!siteObj) { // Site not found, create one
            signale.info(`Discovered a brand new site ${siteInfo.address}`)
            siteObj = DataBase.genNewSite(siteInfo) // Init with siteInfo
            isNewSite = true
        } else if (new Date() - siteObj.runtimeInfo.lastCrawl.siteInfo > process.env.siteInfoUpdateInterval || 3600000) { // Update siteInfo
            signale.info(`Updated siteInfo for ${siteInfo.address}`)
            DataBase.setSiteInfo(siteObj, siteInfo)
        }

        // Run all crawlers in parallel
        function* promiseGenerator() {
            for (let crawler in modules) {
                if (modules[crawler] && modules[crawler].crawl) {
                    signale.start(`Started crawler ${crawler} for ${siteInfo.address} ${global.tempSiteId[siteInfo.address]}/${global.sitesCount}`)
                    yield (async () => {
                        try {
                            await modules[crawler].crawl(dbSchema, siteDB, siteObj)
                            signale.complete(`Finished crawler ${crawler} for ${siteInfo.address} ${global.tempSiteId[siteInfo.address]}/${global.sitesCount}`)
                        } catch (e) {
                            signale.error(`An error appeared in ${crawler}`)
                        }
                    })()
                }
            }
        }

        let pool = new PromisePool(promiseGenerator, parseInt(process.env.Concurrency) || 3) // Start crawlers in parallel
        await pool.start()

        if (isNewSite)
            DataBase.saveSite(siteObj)
        else
            DataBase.updateSite(siteObj)

        signale.info(`Saved site ${siteInfo.address} id:${global.tempSiteId[siteInfo.address]} total:${global.sitesCount}`)
        signale.timeEnd(siteInfo.address)
    } catch (e) {
        signale.error(`Unknown error in ${siteInfo.address}`, e)
    }
}

// Add found sites
async function extractSitesAndAdd() {
    let perPageCount = 500
    let skip = 0
    let arr, resolved
    signale.await("Adding sites of extracted links to ZeroNet")
    while (true) {
        arr = await DataBase.link.find({ added: { $ne: true } }).limit(perPageCount).skip(skip).sort("site").select("site").exec()
        skip += perPageCount
        if (!arr || arr.length === 0)
            break
        resolved = new Set()
        for (let link of arr) {
            let addr = link.site
            try {
                addr = DomainResolver.resolveDomain(addr)
            } catch {
            }
            if (arr)
                if (!admin.isSiteExisted(addr))
                    resolved.add(addr)
            link.added = true
            await link.save()
        }
        admin.addSites([...resolved])
    }
}

// Crawl every site in siteList
async function forEachSite(siteList) {
    global.tempSiteId = {}
    global.sitesCount = siteList.length

    let n = 0

    function* promiseGenerator() {
        for (let site of siteList) {
            if (exiting)
                return
            global.tempSiteId[site.address] = n
            yield crawlASite(site)
            n++
        }
    }

    let pool = new PromisePool(promiseGenerator, parseInt(process.env.Concurrency) || 3)
    pool.addEventListener("rejected", ev => signale.error("Promise pool item rejected:", ev))
    await pool.start()
}

function syncWithZeroNet() {
    waitAndGetAdmin().then(() => {
        admin.on("wsOpen", async () => {
            while (!exiting) {
                bootstrapCrawling()
                await extractSitesAndAdd()
                await admin.updateAll()
                signale.info(`Sleeping for next loop to sync with zeronet`)
                await delay(process.env.mainLoopInterval)
            }
        })
    })
}

function standaloneCrawl() {
    signale.info("Standalone crawler started")
    DataBase.on("connected", async () => { // Main loop
        signale.debug(`Database connected`)
        signale.debug(`Started main loop {DryRun:${process.env.DryRun}}`)
        while (!exiting) {
            await SiteMeta.reloadSitesJson()
            let list = await SiteMeta.asWsSiteList()
            signale.info(`Sites to crawl: ${list.length}`)
            await forEachSite(list)
            signale.info(`Sleeping for next main loop`)
            await delay(process.env.mainLoopInterval)
        }
    })
    DataBase.connect()
}

standaloneCrawl()
if (!process.env.DryRun)
    syncWithZeroNet()