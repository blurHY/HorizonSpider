require("dotenv").config()

const request = require("request")
const fs = require("fs")
const Admin = require("./ZeroNet/AdminZite")
const delay = require("delay")
const log = require("./Logger")
const DataBase = require("./DataBase")
const SiteDB = require("./ZeroNet/SiteDataBase")
const SiteMeta = require("./ZeroNet/SiteMeta")
const SitesJson = require("./ZeroNet/SitesJson")
const PromisePool = require("es6-promise-pool")
const SettingsLoader = require("./ZeroNet/SettingsLoader")
const DomainResolver = require("./ZeroNet/DomainResolver")

let modules = require("require-dir-all")("Crawlers")

let admin = null
let exiting = false

async function waitAndGetAdmin() {
    while (true) {
        try {
            SitesJson.reloadJson()
            admin = new Admin()
            log("info", "zeronet", "Connected to admin site")
        } catch (e) {
            log("error", "zeronet", "Cannot connect to admin site: Possibly ZeroHello is not downloaded", e)
        }
        if (admin)
            break
        else {
            request({
                url: `http://${SettingsLoader.ZeroNetHost}`,
                headers: {"Accept": "text/html"}
            }, (err, res, body) => {
                log(err ? "error" : "info", "zeronet", "Sent a request to ZeroHello", err)
            })
            log("info","spider","Wait a while and send a request again")
            await delay(process.env.mainLoopInterval)
        }
    }
}

function bootstrapCrawling() {
    log("info", "spider", "Adding bootstrap sites")
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
        log("info", "zeronet", `Adding ${Object.keys(global.domainMapObj).length} sites from ZeroName`)
        for (let domain in global.domainMapObj)
            if (global.domainMapObj[domain])
                admin.addSites([global.domainMapObj[domain]])
        fs.writeFileSync("./lastAddDomain", Date.now())
    }
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

        if (new Date() - siteObj.runtimeInfo.lastCrawl.siteInfo > process.env.siteInfoUpdateInterval || 3600000) {
            log("info", "spider", `Updated siteInfo for ${site.address}`)
            siteObj.setSiteInfo(site)
        }

        function* promiseGenerator() {
            for (let crawler in modules) {
                if (modules[crawler] && modules[crawler].crawl)
                    log("info", "spider", `Started crawler ${crawler} for ${site.address}`)
                yield (async () => {
                    await modules[crawler].crawl(dbSchema, siteDB, siteObj)
                    log("info", "spider", `Finished crawler ${crawler} for ${site.address}`)
                })()
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
    let arr
    log("info","spider","Adding sites of extracted links to ZeroNet")
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
                if (exiting)
                    process.exit()
                await extractSitesAndAdd()
                log("info", "spider", `Sleeping for next loop`)
                await delay(process.env.mainLoopInterval)
            }
        })
    })
    admin.Event.on("wsClose", () => {

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