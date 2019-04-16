const signale = require("signale"),
    DataBase = require("../DataBase")

async function updateFeeds(dbSchema, siteDB, siteObj) {
    if (!(siteDB && dbSchema && dbSchema.feeds))
        return

    signale.info(`Feeds available for ${siteObj.basicInfo.address}`)

    let query, func = s => s,
        now = new Date(),
        lastDate = 0

    if (siteObj.runtimeInfo.lastCrawl.feeds && siteObj.runtimeInfo.lastCrawl.feeds.full > now - (process.env.FeedRecrawlInterval || 7200000)) { // Not too outdated 
        if (!siteObj.runtimeInfo.lastCrawl.feeds.check || siteObj.runtimeInfo.lastCrawl.feeds.check < now - (process.env.FeedCheckInterval || 3600000)) { // New feeds only
            func = s => `SELECT * FROM (${s}) where date_added > ${siteObj.runtimeInfo.lastCrawl.feeds.check.getTime() / 1000}` // Not needed to add the outer where clause to inner, because of the sqlite optimization
            signale.info(`Check feeds for ${siteObj.basicInfo.address}`)
            lastDate = siteObj.runtimeInfo.lastCrawl.feeds.check
            siteObj.runtimeInfo.lastCrawl.feeds.check = now
        } else {
            signale.info(`Stored feeds are up to date ${siteObj.basicInfo.address}`)
            return
        }
    } else {
        if (!siteObj.feedsQueried)
            siteObj.feedsQueried = []
        if (!siteObj.runtimeInfo.lastCrawl.feeds)
            siteObj.runtimeInfo.lastCrawl.feeds = {}
        signale.info(`Re-crawl all feeds for ${siteObj.basicInfo.address}`)
        if (!siteObj.runtimeInfo.lastCrawl.feeds || siteObj.runtimeInfo.lastCrawl.feeds.full === 0)
            signale.info("lastCrawl.optional.full is 0")
        await DataBase.feeds.deleteMany({ site: siteObj._id })
        siteObj.feedsQueried.splice(0) // Clear old data and re-query all feeds
        siteObj.runtimeInfo.lastCrawl.feeds.full = now
        siteObj.runtimeInfo.lastCrawl.feeds.check = now
    }

    for (let name in dbSchema.feeds)
        if (name) {
            query = func(dbSchema.feeds[name])
            await pagingFeedQuery(query, siteDB, siteObj, name, 3000, 0, lastDate ? lastDate.getTime() / 1000 : 0)
        }
}

async function pagingFeedQuery(query, siteDB, siteObj, name, count = 3000, start = 0, dateAfter = null) {
    let ori_query = query
    query = `select * from (${query}) ${dateAfter ? `where date_added > ${dateAfter}` : ""} order by date_added limit ${count} offset ${start}`
    try {
        let rows = await siteDB.all(query)
        if (!(rows instanceof Array)) {
            throw "Rows are an array"
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
            await DataBase.addFeeds(siteObj, renamedRows, name)
            signale.info(`Imported ${rows.length} feeds from ${siteObj.basicInfo.address}`)
            await pagingFeedQuery(ori_query, siteDB, siteObj, name, count, start + count, dateAfter) // Query and store next page
        }
    } catch (e) {
        signale.error(query, `An error appeared in query ${query}`)
    }
}

module.exports = { crawl: updateFeeds }