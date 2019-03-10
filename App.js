require("dotenv").config()

const Admin = require("./ZeroNet/AdminZite")
const delay = require("delay")
const log = require("./Logger")
const DataBase = require("./DataBase")
const SiteDB = require("./ZeroNet/SiteDataBase")
const SiteMeta = require("./ZeroNet/SiteMeta")
const PromisePool = require("es6-promise-pool")
const extractLinks = require("./Crawlers/LinksExtractor").extractLinks

let modules = require("require-dir-all")("Crawlers")

let admin = new Admin()

let exiting = false

async function crawlASite(site) {
    try {
        log("info", "spider", `Started crawling site ${site.address}`)
        let dbSchema = SiteMeta.getDBJson(site.address)
        let siteObj = await DataBase.getSite(site.address)
        let siteDB = await SiteDB.getSiteDataBase(site.address)

        if (!siteObj) { // Site not found, create one
            log("info", "spider", `Discovered a brand new site ${site.address}`)
            siteObj = DataBase.genNewSite(site) // Init with siteInfo
        }

        function* promiseGenerator() {
            for (let crawler in modules) {
                if (modules[crawler] && modules[crawler].crawl)
                    yield (async () =>
                            await modules[crawler].crawl(dbSchema, siteDB, siteObj)
                    )()
            }
        }

        let pool = new PromisePool(promiseGenerator, parseInt(process.env.Concurrency) || 3) // Start crawlers in parallel
        await pool.start()

        await siteObj.save()
        siteObj = await DataBase.getSite(site.address) // Refresh from db
        let links = await extractLinks(siteObj, siteDB)

        if (links && links.length > 0)
            admin.addSites(links)

        await siteObj.save()
        log("info", "spider", `Saved site ${site.address}`)
    } catch (e) {
        log("error", "spider", `Unknown error in ${site.address}`, e)
    }
}

async function forEachSite() {
    function* promiseGenerator() {
        for (let site of admin.siteList) {
            if (exiting) // The minimal unit is a single site.
                return
            yield crawlASite(site)
        }
    }

    let pool = new PromisePool(promiseGenerator, parseInt(process.env.Concurrency) || 3)
    await pool.start()
}

admin.Event.on("wsOpen", async () => {
    DataBase.connect()
    DataBase.event.on("connected", async () => { // Main loop
        while (true) {
            await admin.reloadSiteList()
            await forEachSite()
            log("info", "spider", `Sleeping for next loop`)
            if (exiting)
                process.exit()
            await delay(process.env.mainLoopInterval)
        }
    })
})

function exitHandler() {
    log("warning", "spider", "Received signal, gracefully shutting down...")
    exiting = true
}

process.on("SIGINT", exitHandler)
process.on("SIGTERM", exitHandler)

process.on("exit", () => {
    log("warning", "spider", "Exited")
})