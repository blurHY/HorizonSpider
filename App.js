require("dotenv").config()

const request = require("request")
const Admin = require("./ZeroNet/AdminZite")
const delay = require("delay")
const log = require("./Logger")
const DataBase = require("./DataBase")
const SiteDB = require("./ZeroNet/SiteDataBase")
const SiteMeta = require("./ZeroNet/SiteMeta")
const PromisePool = require("es6-promise-pool")
const DomainResolver = require("./ZeroNet/DomainResolver")

let modules = require("require-dir-all")("Crawlers")

let admin = null
let exiting = false

async function waitAndGetAdmin() {
    while (true) {
        try {
            admin = new Admin()
        } catch (e) {
            log("error", "zeronet", "Cannot connect to admin site: Possibly ZeroHello is not downloaded", e)
        }
        if (admin && admin.connected)
            break
        else {
            request({
                url: process.env.ZeroNetUrl || "http://127.0.0.1:43110",
                headers: {"Accept": "text/html"}
            }, (err, res, body) => {
                log("info", "zeronet", "Sent request to ZeroHello", err || body)
            })
            await delay(process.env.mainLoopInterval)
        }
    }
}

function bootstrapCrawling() {
    admin.addSites([
        "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D",
        "1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F"
    ])
}

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
        log("info", "spider", `Saved site ${site.address}`)
    } catch (e) {
        log("error", "spider", `Unknown error in ${site.address}`, e)
    }
}

async function extractSitesAndAdd() {
    // await LinksExtractor.extractLinksForNewFeeds()
    let perPageCount = 500
    let skip = 0

    while (true) {
        let arr = await DataBase.link.find({added: {$ne: true}}).limit(perPageCount).skip(skip).sort("site").select("site").exec()
        if (arr.length === 0)
            break
        for (let link of arr) {
            let addr = link.site
            try {
                addr = DomainResolver.resolveDomain(addr)
            } catch {
            }
            if (!admin.isSiteExisted(addr))
                admin.addSites([addr])
        }
        skip += perPageCount
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

waitAndGetAdmin().then(() => {
    admin.Event.on("wsOpen", async () => {
        DataBase.connect()
        bootstrapCrawling()
        DataBase.event.on("connected", async () => { // Main loop
            while (true) {
                await admin.reloadSiteList()
                await forEachSite()
                await extractSitesAndAdd()

                log("info", "spider", `Sleeping for next loop`)
                if (exiting)
                    process.exit()
                await delay(process.env.mainLoopInterval)
            }
        })
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