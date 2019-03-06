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

async function updateFeeds(dbSchema, siteDB, siteObj) {
    if (!siteDB || !dbSchema || !dbSchema.feeds) // Always check params in final function
        return

    log("info", "spider", `Feeds available: ${siteObj.basicInfo.address}`)
    for (let name in dbSchema.feeds) {
        if (!name)
            continue

        let query = dbSchema.feeds[name]
        if (!(siteObj.runtimeInfo.lastCrawl.feeds.full < Date.now() - process.env.feedFull_Period)) {
            if (siteObj.runtimeInfo.lastCrawl.feeds.check < Date.now() - process.env.feedCheck_Peroid) { // New feeds only
                let maxDate = Math.max.apply(Math, siteObj.feedsQueried.map(o => o.result.date_added))
                query = `SELECT * FROM (${query}) where date_added > ${maxDate}` // Not needed to add outer where clause into inner, because of the sqlite optimization
            }
        } else {
            siteObj.feedsQueried = []
        }

        await pagingFeedQuery(query, siteDB, siteObj, name)
    }
    log("info", "spider", `Updated feeds for ${siteObj.basicInfo.address}`)
}

async function pagingFeedQuery(query, siteDB, siteObj, name, count = 3000, start = 0) {
    let ori_query = query
    query = `select * from (${query}) limit ${count} offset ${start}`
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
            await pagingFeedQuery(ori_query, siteDB, siteObj, name, count, start + count)
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
        let siteObj = (await DataBase.getSite(site.address))[0]
        let siteDB = SiteDB.getSiteDataBase(site.address)

        if (!siteObj) // Site not found, create one
            siteObj = DataBase.genNewSite(site)

        await Promise.all([updateFeeds(dbSchema, siteDB, siteObj), updateOptionalFiles(siteDB, siteObj)])

        siteObj.save(r => log((r && r.errors) ? "warning" : "info", "spider", `Saved site ${site.address}`, r))
    } catch (e) {
        log("error", "spider", `Unknown error in ${site.address}`, e)
    }
}

async function forEachSite() {
    function* promiseGenerator() {
        for (let site of admin.siteList) {
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
            await delay(process.env.mainLoopInterval)
        }
    })
})
