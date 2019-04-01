require("dotenv").config()

const rp = require("request-promise"),
    fs = require("fs"),
    Admin = require("./ZeroNet/AdminZite"),
    delay = require("delay"),
    signale = require("signale"),
    DataBase = require("./DataBase"),
    SiteDB = require("./ZeroNet/SiteDataBase"),
    SiteMeta = require("./ZeroNet/SiteMeta"),
    SitesJson = require("./ZeroNet/SitesJson"),
    PromisePool = require("es6-promise-pool"),
    SettingsLoader = require("./ZeroNet/SettingsLoader"),
    DomainResolver = require("./ZeroNet/DomainResolver"),

    modules = require("require-dir-all")("Crawlers")

let admin = null
let exiting = false

// ZeroHello won't be downloaded without requesting
async function waitAndGetAdmin() {
    let id
    while (true) {
        try {
            SitesJson.reloadJson()
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
        signale.start(`Started crawling site ${site.address}`)
        signale.time(site.address)

        let dbSchema = SiteMeta.getDBJson(site.address)
        let siteObj = await DataBase.getSite(site.address)
        let siteDB = await SiteDB.getSiteDataBase(site.address)

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
                    signale.start(`Started crawler ${crawler} for ${site.address}`)
                    yield (async () => {
                        try {
                            await modules[crawler].crawl(dbSchema, siteDB, siteObj)
                            signale.complete(`Finished crawler ${crawler} for ${site.address}`)
                        }catch (e) {
                            signale.error(`An error appeared in ${crawler}`)
                        }
                    })()
                }
            }
        }

        let pool = new PromisePool(promiseGenerator, parseInt(process.env.Concurrency) || 3) // Start crawlers in parallel
        await pool.start()

        await siteObj.save()
        signale.info(`Saved site ${site.address}`)

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
async function forEachSite() {
    global.foreaching = true


    function* promiseGenerator() {
        for (let site of admin.siteList) {
            if (exiting) // The minimal unit is a single site.
                return
            yield crawlASite(site)
        }
    }

    let pool = new PromisePool(promiseGenerator, parseInt(process.env.Concurrency) || 3)
    await pool.start()

    global.foreaching = false
}

waitAndGetAdmin().then(() => {
    admin.Event.on("wsOpen", async () => {
        if (exiting)
            return
        DataBase.connect()
        DataBase.event.on("connected", async () => { // Main loop
            if (global.loopStarted || exiting)
                return
            global.loopStarted = true
            signale.debug(`Started main loop {DryRun:${process.env.DryRun}}`)
            if (!process.env.DryRun)
                bootstrapCrawling()
            while (true) {
                await admin.reloadSiteList()
                await forEachSite()
                if (exiting)
                    process.exit()
                if (!process.env.DryRun)
                    await extractSitesAndAdd()
                signale.info(`Sleeping for next loop`)
                await delay(process.env.mainLoopInterval)
            }
        })
    })
})


function exitHandler() {
    if (!global.foreaching)
        process.exit()
    signale.warn("Received signal, gracefully shutting down...")
    exiting = true
}

process.on("SIGINT", exitHandler)
process.on("SIGTERM", exitHandler)

process.on("exit", () => {
    signale.warn("Exited")
})