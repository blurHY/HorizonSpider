/* eslint-disable no-inner-declarations */
require("dotenv").config()

const rp = require("request-promise-native"),
    delay = require("delay"),
    signale = require("signale"),
    PromisePool = require('es6-promise-pool'),
    requireAll = require("require-dir-all"),

    Admin = require("./ZeroNet/AdminZite"),
    DataBase = require("./DataBase"),
    SiteMeta = require("./ZeroNet/SiteMeta"),
    SettingsLoader = require("./ZeroNet/SettingsLoader"),
    DomainResolver = require("./ZeroNet/DomainResolver"),

    modules = requireAll("./Crawlers"),
    utils = requireAll("./Utils"),
    NAError = require("./Crawlers/Errors/NAError")

let admin = null,
    exiting = false

const blocked = require("blocked-at"),
    whyHanging = require('why-is-node-running')

blocked((time, stack) => {
    signale.warn(`Blocked for ${time / 1000}s, operation started here:`, stack)
}, { threshold: 1000 })

global.addrsSet = new Set()

function exitHandler() {
    if (exiting)
        process.exit()
    signale.warn("Received signal, gracefully shutting down...")
    exiting = true
}

process.on("SIGINT", exitHandler)
process.on("SIGTERM", exitHandler)
process.on("SIGUSR2", whyHanging)

process.on("exit", () => {
    signale.warn("Exited")
})

// ZeroHello won't be downloaded without requesting
async function waitAndGetAdmin() {
    let continue_ = true
    while (continue_) {
        try {
            continue_ = false
            signale.info("Connecting to zeronet ...")
            admin = new Admin()
        } catch (e) {
            continue_ = true
            signale.fatal("Cannot connect to admin site", e)
        }
        if (!(admin && admin.inited)) {
            continue_ = false
            try {
                signale.fatal("Failed to connect admin site. Sending a request to zeronet")
                let body = await rp({
                    url: `http://${SettingsLoader.ZeroNetHost}`,
                    headers: { "Accept": "text/html", "Accept-Encoding": "gzip, deflate, br", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36", "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,pt;q=0.6,ru;q=0.5,ja;q=0.4,de;q=0.3" },
                    followRedirect: true
                })
                try {
                    signale.info(/\<title\>[^<>]+\<\/title\>/g.exec(body)[0])
                } catch{
                    signale.info(body)
                }
            } catch (e) {
                signale.warn(e)
                continue_ = true
            }
        }
        if (continue_)
            await delay(1000 * 60 * 3)
    }
}

global.lastAddDomain = 0
async function bootstrapCrawling() {
    signale.info("Adding bootstrap sites")
    await admin.addSites([
        "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D",
        "1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F"
    ])
    if (Date.now() - global.lastAddDomain > 12 * 60 * 60 * 1000) {
        DomainResolver.loadDomains()
        signale.info(`Adding ${Object.keys(global.domainMapObj).length} sites from ZeroName`)
        for (let domain in global.domainMapObj)
            if (global.domainMapObj[domain])
                await admin.addSites([global.domainMapObj[domain]])
    }
}

async function crawlASite(siteInfo) {
    try {
        signale.info(`Started crawling site ${siteInfo.address} ${global.tempSiteId[siteInfo.address]}/${global.sitesCount}`)

        let dbSchema = await SiteMeta.getDBJson(siteInfo.address),
            doc = await DataBase.getSite(siteInfo.address),
            siteObj = null,
            siteDB = dbSchema ? await SiteMeta.getSiteDataBase(siteInfo.address) : null
        if (doc)
            siteObj = doc["_source"]
        if (!siteObj) { // Site not found, create one
            signale.fav(`Discovered a brand new site ${siteInfo.address}`)
            siteObj = DataBase.genNewSite(siteInfo) // Init with siteInfo
            doc = await DataBase.addSite(siteObj)
        } else if ((Date.now() - siteObj.runtime.siteinfo) > (process.env.siteInfoUpdateInterval || 3600000)) { // Update siteInfo
            DataBase.setSiteInfo(siteObj, siteInfo)
            await DataBase.updateSite(siteObj, doc["_id"])
            doc = await DataBase.getSite(siteInfo.address)
        }
        let modification = { runtime: { feeds: {}, op_files: {} } }
        function* promiseGenerator() {
            for (let crawler_name in modules) {
                if (modules[crawler_name] && modules[crawler_name].prototype instanceof modules["BaseCrawler"]) {
                    yield (async () => {
                        try {
                            let crawler = new modules[crawler_name]({ dbSchema, siteDB, siteObj, address: siteInfo.address, siteId: doc["_id"] })
                            await crawler.crawl(modification)
                        } catch (e) {
                            if (e instanceof NAError) { // Not applicable stands for parameters not enough
                                signale.debug(`${siteInfo.address} - ${crawler_name} NA`)
                                return
                            }
                            signale.error(`An error appeared in ${crawler_name}`, e)
                        }
                    })()
                }
            }
        }
        await (new PromisePool(promiseGenerator, parseInt(process.env.Concurrency) || 3)).start()
        await DataBase.updateSite(modification, doc["_id"])
    } catch (e) {
        signale.error(`Unknown error in ${siteInfo.address}`, e)
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
    await (new PromisePool(promiseGenerator, parseInt(process.env.Concurrency) || 3)).start()
}

let connected = false
function syncWithZeroNet() {
    waitAndGetAdmin().then(() => {
        signale.wait("Waiting for ws open")
        admin.on("wsOpen", async () => {
            connected = true
            while (!exiting) {
                signale.info("== Send requests to zeronet")
                for (let func in utils)
                    if (typeof utils[func] === "function") // Note: A util that exports a function is different from the one exports an object
                        await utils[func](admin)
                await bootstrapCrawling()
                await admin.addSites([...global.addrsSet])
                await admin.updateAll()
                signale.info(`Sleeping for next loop to sync with zeronet`)
                await delay(1000 * 60 * 15)
            }
        })
    })
}

function standaloneCrawl() {
    signale.info("Standalone crawler started")
    DataBase.on("connected", async () => { // Main loop
        signale.debug(`Database connected`)
        while (!exiting) {
            await SiteMeta.reloadSitesJson()
            let list = await SiteMeta.asWsSiteList()
            signale.info(`Sites to crawl: ${list.length}`)
            await forEachSite(list)
            signale.info(`Sleeping for next main loop`)
            if ((!connected) && (!process.env.DryRun))
                await delay(1000 * 60 * 90)
            else
                await delay(1000 * 60 * 30)
        }
    })
    DataBase.connect()
}

if (!process.env.DryRun)
    syncWithZeroNet()
else
    signale.warn("DryRun mode enabled")
standaloneCrawl()


