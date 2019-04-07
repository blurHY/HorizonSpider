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
    console.log(`Blocked for ${time / 1000}s, operation started here:`, stack)
}, {threshold: 30000})

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
                    headers: {"Accept": "text/html"},
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
    } catch {
    }
    if (Date.now() - lastAddDomain > 12 * 60 * 60 * 1000) {
        DomainResolver.loadDomains()
        signale.info(`Adding ${Object.keys(global.domainMapObj).length} sites from ZeroName`)
        for (let domain in global.domainMapObj)
            if (global.domainMapObj[domain])
                admin.addSites([global.domainMapObj[domain]])
        fs.writeFileSync("./lastAddDomain", Date.now())
    }
}

async function crawlASite(site) {
    try {
        signale.start(`Started crawling site ${site.address} id:${global.tempSiteId[site.address]} total:${global.sitesCount}`)
        signale.time(site.address)

        let dbSchema = SiteMeta.getDBJson(site.address),
            siteObj = await DataBase.getSite(site.address),
            siteDB = await SiteMeta.getSiteDataBase(site.address)

        if (!siteObj) { // Site not found, create one
            signale.info(`Discovered a brand new site ${site.address}`)
            siteObj = DataBase.genNewSite(site) // Init with siteInfo
        } else if (new Date() - siteObj.runtimeInfo.lastCrawl.siteInfo > process.env.siteInfoUpdateInterval || 3600000) { // Update siteInfo
            signale.info(`Updated siteInfo for ${site.address}`)
            siteObj.setSiteInfo(site)
        }

        // Run all crawlers in parallel
        function* promiseGenerator() {
            for (let crawler in modules) {
                if (modules[crawler] && modules[crawler].crawl) {
                    signale.start(`Started crawler ${crawler} for ${site.address} ${global.tempSiteId[site.address]}/${global.sitesCount}`)
                    yield (async () => {
                        try {
                            await modules[crawler].crawl(dbSchema, siteDB, siteObj)
                            signale.complete(`Finished crawler ${crawler} for ${site.address} ${global.tempSiteId[site.address]}/${global.sitesCount}`)
                        } catch (e) {
                            signale.error(`An error appeared in ${crawler}`)
                        }
                    })()
                }
            }
        }

        let pool = new PromisePool(promiseGenerator, parseInt(process.env.Concurrency) || 3) // Start crawlers in parallel
        await pool.start()

        await siteObj.save()
        signale.info(`Saved site ${site.address} id:${global.tempSiteId[site.address]} total:${global.sitesCount}`)

        signale.timeEnd(site.address)
    } catch (e) {
        signale.error(`Unknown error in ${site.address}`, e)
    }
}

// Add found sites
async function extractSitesAndAdd() {
    let perPageCount = 500
    let skip = 0
    let arr
    signale.await("Adding sites of extracted links to ZeroNet")
    while (true) {
        arr = await DataBase.link.find({added: {$ne: true}}).limit(perPageCount).skip(skip).sort("site").select("site").exec()
        skip += perPageCount
        if (!arr || arr.length === 0)
            break
        for (let link of arr) {
            let addr = link.site
            console.log(addr)
            try {
                addr = DomainResolver.resolveDomain(addr)
            } catch {
            }
            if (!admin.isSiteExisted(addr))
                admin.addSites([addr])
            link.added = true
            await link.save()
        }
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
    await pool.start()
}

function syncWithZeroNet() {
    waitAndGetAdmin().then(() => {
        admin.Event.on("wsOpen", async () => {
            while (!exiting) {
                bootstrapCrawling()
                await extractSitesAndAdd()
                await admin.updateAll()
                await delay(process.env.mainLoopInterval)
            }
        })
    })
}

function standaloneCrawl() {
    signale.info("Standalone crawler started")
    DataBase.connect()
    DataBase.event.on("connected", async () => { // Main loop
        signale.debug(`Database connected`)
        signale.debug(`Started main loop {DryRun:${process.env.DryRun}}`)
        while (!exiting) {
            await SiteMeta.reloadSitesJson()
            let list = await SiteMeta.asWsSiteList()
            signale.info(`Sites to crawl: ${list.length}`)
            await forEachSite(list)
            signale.info(`Sleeping for next loop`)
            await delay(process.env.mainLoopInterval)
        }
    })
}

standaloneCrawl()
if (!process.env.DryRun)
    syncWithZeroNet()