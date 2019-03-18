const log = require("../Logger")
const DataBase = require("../DataBase")

async function updateFeeds(dbSchema, siteDB, siteObj) {
    if (!siteDB || !dbSchema || !dbSchema.feeds) // Always check params in final function
        return

    log.info(`Feeds available: ${siteObj.basicInfo.address}`)

    let query, func = s => s

    let maxDate = siteObj.runtimeInfo.lastCrawl.feeds.itemDate
    if ((siteObj.runtimeInfo.lastCrawl.feeds.full > new Date() - process.env.feedFull_Period) && maxDate > 0) {
        if (siteObj.runtimeInfo.lastCrawl.feeds.check < new Date() - process.env.feedCheck_Peroid) { // New feeds only
            siteObj.runtimeInfo.lastCrawl.feeds.check = new Date()
            siteObj.runtimeInfo.lastCrawl.feeds.itemDate = await siteDB.each(`select * from (${dbSchema.feeds[name]}) order by date_added desc limit 1`)
            func = s => `SELECT * FROM (${s}) where date_added > ${maxDate}` // Not needed to add the outer where clause to inner, because of the sqlite optimization
        } else
            log.info(`Stored feeds are up to date ${siteObj.basicInfo.address}`)
    } else {
        siteObj.feedsQueried.splice(0) // Clear old data and re-query all feeds
        siteObj.runtimeInfo.lastCrawl.feeds.full = new Date()
    }

    for (let name in dbSchema.feeds) {
        if (!name)
            continue
        query = func(dbSchema.feeds[name])

        await pagingFeedQuery(query, siteDB, siteObj, name)
    }
    log.info(`Updated feeds for ${siteObj.basicInfo.address}`)
}

async function pagingFeedQuery(query, siteDB, siteObj, name, count = 3000, start = 0) {
    let ori_query = query
    query = `select * from (${query}) order by date_added limit ${count} offset ${start}` // Sqlite has powerful optimization, so we have do it like this.
    let rows = await siteDB.all(query)
    if (!(rows instanceof Array)) {
        log.error("An error occurred during a feed query", err)
    } else if (rows.length > 0) {
        let renamedRows = []
        for (let row of rows) {
            renamedRows.push({
                itemType: row.type,
                date_added: row.date_added,
                title: row.title,
                body: row.body,
                url: row.url
            })
        }

        let refreshedSiteObj = await DataBase.getSite(siteObj.basicInfo.address) // Refresh model
        if (refreshedSiteObj)
            siteObj = refreshedSiteObj

        await siteObj.addFeeds(renamedRows, name)

        log.info(`Imported ${rows.length} feeds from ${siteObj.basicInfo.address}`)
        await pagingFeedQuery(ori_query, siteDB, siteObj, name, count, start + count) // Query and store next page
    }
}

module.exports = {crawl: updateFeeds}