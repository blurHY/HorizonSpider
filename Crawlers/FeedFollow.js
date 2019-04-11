const signale = require('signale');
const DataBase = require("../DataBase")

async function updateFeeds(dbSchema, siteDB, siteObj) {
    if (!(siteDB && dbSchema && dbSchema.feeds))
        return

    signale.info(`Feeds available for ${siteObj.basicInfo.address}`)

    let query, func = s => s,
        maxDate = siteObj.runtimeInfo.lastCrawl.feeds.itemDate,
        now = new Date()

    if ((siteObj.runtimeInfo.lastCrawl.feeds.full > now - process.env.feedFull_Period) && maxDate > 0) {
        if (siteObj.runtimeInfo.lastCrawl.feeds.check < now - process.env.feedCheck_Peroid) { // New feeds only
            siteObj.runtimeInfo.lastCrawl.feeds.check = now
            siteObj.runtimeInfo.lastCrawl.feeds.itemDate = await siteDB.each(`select * from (${dbSchema.feeds[name]}) order by date_added desc limit 1`)
            func = s => `SELECT * FROM (${s}) where date_added > ${maxDate}` // Not needed to add the outer where clause to inner, because of the sqlite optimization
        } else
            signale.info(`Stored feeds are up to date ${siteObj.basicInfo.address}`)
    } else {
        siteObj.feedsQueried.splice(0) // Clear old data and re-query all feeds
        siteObj.runtimeInfo.lastCrawl.feeds.full = now
    }

    for (let name in dbSchema.feeds)
        if (name) {
            query = func(dbSchema.feeds[name])
            await pagingFeedQuery(query, siteDB, siteObj, name)
        }
    signale.info(`Updated feeds for ${siteObj.basicInfo.address}`)
}

async function pagingFeedQuery(query, siteDB, siteObj, name, count = 3000, start = 0) {
    let ori_query = query
    query = `select * from (${query}) order by date_added limit ${count} offset ${start}` // Sqlite has powerful optimization, so we have do it like this.
    let rows = await siteDB.all(query)
    if (!(rows instanceof Array)) {
        signale.error("An error occurred during a feed query", err)
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

        signale.info(`Imported ${rows.length} feeds from ${siteObj.basicInfo.address}`)
        await pagingFeedQuery(ori_query, siteDB, siteObj, name, count, start + count) // Query and store next page
    }
}

module.exports = { crawl: updateFeeds }