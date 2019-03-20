require("dotenv").config()

const rp = require("request-promise")
const fs = require("fs")
const Admin = require("./ZeroNet/AdminZite")
const delay = require("delay")
const signale = require("signale")
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
            signale.success("Connected to admin site")
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
        }

        if (new Date() - siteObj.runtimeInfo.lastCrawl.siteInfo > process.env.siteInfoUpdateInterval || 3600000) {
            siteObj.setSiteInfo(site)
        }

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

async function extractSitesAndAdd() {
    // await LinksExtractor.extractLinksForNewFeeds()
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
        await admin.reloadSiteList()
        DataBase.connect()
        DataBase.event.on("connected", async () => { // Main loop
            if (global.loopStarted || exiting)
                return
            global.loopStarted = true
            signale.debug("Started main loop")
            bootstrapCrawling()
            while (true) {
                await forEachSite()
                if (exiting)
                    process.exit()
                await extractSitesAndAdd()
                signale.await(`Sleeping for next loop`)
                await delay(process.env.mainLoopInterval)
                await admin.reloadSiteList()
            }
        })
    })
})

function exitHandler() {
    if (!global.foreaching || exiting)
        process.exit()
    signale.warn("Received signal, gracefully shutting down...")
    exiting = true
}

process.on("SIGINT", exitHandler)
process.on("SIGTERM", exitHandler)

process.on("exit", () => {
    signale.warn("Exited")
})