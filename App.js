require("dotenv").config()

const Settings = require("./SettingsLoader")
const Admin = require("./AdminZite")
const delay = require("delay")
const log = require("./Logger")
const DataBase = require("./DataBase")
const SiteDB = require("./SiteDataBase")
const SiteMeta = require("./SiteMeta")
const PromisePool = require("es6-promise-pool")


let admin = new Admin()

let exiting = false

async function updateFeeds(dbSchema, siteDB, siteObj) {
    if (!siteDB || !dbSchema || !dbSchema.feeds) // Always check params in final function
        return

    log("info", "spider", `Feeds available: ${siteObj.basicInfo.address}`)
    for (let name in dbSchema.feeds) {
        if (!name)
            continue

        let query = dbSchema.feeds[name]
        if (!(siteObj.runtimeInfo.lastCrawl.feeds.full < new Date() - process.env.feedFull_Period)) {
            if (siteObj.runtimeInfo.lastCrawl.feeds.check < new Date() - process.env.feedCheck_Peroid) { // New feeds only
                siteObj.runtimeInfo.lastCrawl.feeds.check = new Date()
                let maxDate = Math.max.apply(Math, siteObj.feedsQueried.map(o => o.result.date_added))
                query = `SELECT * FROM (${query}) where date_added > ${maxDate}` // Not needed to add outer where clause into inner, because of the sqlite optimization
            } else
                log("info", "spider", `Stored feeds are up to date ${siteObj.basicInfo.address}`)
        } else {
            siteObj.feedsQueried = [] // Clear old data and re-query all feeds
            siteObj.runtimeInfo.lastCrawl.feeds.full = new Date()
        }

        await pagingFeedQuery(query, siteDB, siteObj, name)
    }
    log("info", "spider", `Updated feeds for ${siteObj.basicInfo.address}`)
}

async function pagingFeedQuery(query, siteDB, siteObj, name, count = 3000, start = 0) {
    let ori_query = query
    query = `select * from (${query}) limit ${count} offset ${start}` // Sqlite has powerful optimization, so we have do it like this.
    siteDB.all(query, async (err, rows) => {
        if (err || !(rows instanceof Array)) {
            log("error", "spider", "An error occurred during a feed query", err)
        } else if (rows.length > 0) {
            for (let row of rows) {
                siteObj.feedsQueried.push({
                    name,
                    result: {
                        itemType: row.type,
                        date_added: row.date_added,
                        title: row.title,
                        body: row.body,
                        url: row.url
                    }
                })
            }
            log("info", "spider", `Imported ${rows.length} feeds from ${siteObj.basicInfo.address}`)
            await pagingFeedQuery(ori_query, siteDB, siteObj, name, count, start + count) // Query and store next page
        }
    })
}

async function updateOptionalFiles(siteDB, siteObj) {
    if (!siteDB)
        return
    // TODO: For each content.json and get optional files.Get details from database
}

async function crawlASite(site) {
    try {
        log("info", "spider", `Started crawling site ${site.address}`)
        let dbSchema = SiteMeta.getDBJson(site.address)
        let siteObj = await DataBase.getSite(site.address)
        let siteDB = SiteDB.getSiteDataBase(site.address)

        if (!siteObj) { // Site not found, create one
            log("info", "spider", `Discovered a brand new site ${site.address}`)
            siteObj = DataBase.genNewSite(site)
        }

        await Promise.all([updateFeeds(dbSchema, siteDB, siteObj), updateOptionalFiles(siteDB, siteObj)])

        siteObj.save(r => log((r && r.errors) ? "warning" : "info", "spider", `Saved site ${site.address}`, r))
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

    let pool = new PromisePool(promiseGenerator, process.env.Concurrency || 3)
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