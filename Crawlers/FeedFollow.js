const signale = require("signale")
const DataBase = require("../DataBase")

async function updateFeeds(dbSchema, siteDB, siteObj) {
    if (!(siteDB && dbSchema && dbSchema.feeds))
        return

    signale.info(`Feeds available for ${siteObj.basicInfo.address}`)

    let query, func = s => s,
        now = new Date()

    if (siteObj.runtimeInfo.lastCrawl.feeds.full > now - process.env.feedFull_Period) { // Not too outdated 
        if (siteObj.runtimeInfo.lastCrawl.feeds.check < now - process.env.feedCheck_Peroid && siteObj.runtimeInfo.lastCrawl.feeds.check) { // New feeds only
            func = s => `SELECT * FROM (${s}) where date_added > ${siteObj.runtimeInfo.lastCrawl.feeds.check.getTime() / 1000}` // Not needed to add the outer where clause to inner, because of the sqlite optimization
            siteObj.runtimeInfo.lastCrawl.feeds.check = now
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
    query = `select * from (${query}) order by date_added limit ${count} offset ${start}`
    let rows = await siteDB.all(query)
    if (!(rows instanceof Array)) {
        signale.error("An error occurred during a feed query", rows)
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