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

const defaultMainLoopInterval = 1000 * 60 * 3

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
            await delay(process.env.mainLoopInterval || defaultMainLoopInterval)
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
            siteObj = doc["_source"],
            siteDB = dbSchema ? await SiteMeta.getSiteDataBase(siteInfo.address) : null,
            isNewSite = false

        if (!siteObj) { // Site not found, create one
            signale.fav(`Discovered a brand new site ${siteInfo.address}`)
            siteObj = DataBase.genNewSite(siteInfo) // Init with siteInfo
            isNewSite = true
        } else if ((Date.now() - siteObj.runtime.siteinfo) > (process.env.siteInfoUpdateInterval || 3600000)) { // Update siteInfo
            DataBase.setSiteInfo(siteObj, siteInfo)
        }

        function* promiseGenerator() {
            for (let crawler in modules) {
                if (modules[crawler] && modules[crawler].crawl) {
                    yield (async () => {
                        try {
                            let crawler = new modules[crawler](dbSchema, siteDB, siteObj)
                            await crawler.crawl()
                        } catch (e) {
                            if (e instanceof NAError) // Not applicable stands for parameters not enough
                                return
                            signale.error(`An error appeared in ${crawler}`, e)
                        }
                    })()
                }
            }
        }
        await (new PromisePool(promiseGenerator, parseInt(process.env.Concurrency) || 3)).start()

        try {
            if (isNewSite)
                await DataBase.addSite(siteObj)
            else
                await DataBase.updateSite(siteObj, doc["_id"])
        } catch (e) {
            signale.error(`Failed to save site ${siteInfo.address}`, e)
        }
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

function syncWithZeroNet() {
    waitAndGetAdmin().then(() => {
        signale.wait("Waiting for ws open")
        admin.on("wsOpen", async () => {
            while (!exiting) {
                signale.info("== Send requests to zeronet")
                for (let func in utils)
                    await utils[func](admin)
                await bootstrapCrawling()
                await admin.addSites([...global.addrsSet])
                await admin.updateAll()
                signale.info(`Sleeping for next loop to sync with zeronet`)
                await delay(1000 * 60 * 60)
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
            await delay(process.env.mainLoopInterval || 1000 * 60 * 10)
        }
    })
    DataBase.connect()
}

if (!process.env.DryRun)
    syncWithZeroNet()
else
    signale.warn("DryRun mode enabled")
standaloneCrawl()
