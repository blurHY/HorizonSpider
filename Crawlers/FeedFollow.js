const signale = require("signale"),
    DataBase = require("../DataBase"),
    BaseCrawer = require("./BaseCrawler")
const defaultFeedRecrawlInterval = 1000 * 60 * 60 * 24 * 7,
    defaultFeedCheckInterval = 1000 * 60 * 30

module.exports = class FeedFollowCrawler extends BaseCrawer {
    constructor(params) {
        super(params)
        if (!this.dbSchema)
            throw new this.NAError()
        this.interval = {
            recrawl: parseInt(process.env.FeedRecrawlInterval) || defaultFeedRecrawlInterval,
            check: parseInt(process.env.FeedCheckInterval) || defaultFeedCheckInterval
        }
        this.crawl = this.updateFeeds
    }

    async updateFeeds(modification) {
        let now = Date.now(),
            prevDate = 0
        if (this.siteObj.runtime && this.siteObj.runtime.feeds && this.siteObj.runtime.feeds.last_refresh > now - this.interval.recrawl) { // Still not needed to refresh
            if (!this.siteObj.runtime.feeds.last_check || this.siteObj.runtime.feeds.last_check < now - this.interval.check) { // Add New feeds only
                prevDate = this.siteObj.runtime.feeds.last_check // Save previous checking date for site database querying
                signale.note(`Checking feeds for ${this.address}, date after ${prevDate}`)
                modification.runtime.feeds.last_check = now
            } else {
                signale.note(`Stored feeds are up to date ${this.address}`)
                return
            }
        } else {
            signale.info(`Crawl all feeds for ${this.address}`)
            await DataBase.clearFeeds(this.siteId)     // Delete all outdated content
            modification.runtime.feeds = { last_check: now, last_refresh: now }
        }
        for (let name in this.dbSchema.feeds)
            if (name)
                await this.pagingFeedQuery(this.dbSchema.feeds[name], name, 3000, 0, prevDate ? (prevDate.getTime() / 1000) : 0) // Convert prevDate to linux time
    }

    async pagingFeedQuery(query, category, count = 3000, start = 0, dateAfter = null) { // TODO: Suspicious query may slow down the spider
        let ori_query = query
        query = `select * from (${query}) ${dateAfter ? `where date_added > ${dateAfter}` : ""} order by date_added limit ${count} offset ${start}`
        try {
            let rows = await this.siteDB.all(query)
            if (!(rows instanceof Array)) {
                throw "Rows are not an array"
            } else if (rows.length > 0) {
                await DataBase.addFeeds(this.siteId, rows.map(r => ({ ...r, item_type: r.type, type: undefined, category })))
                signale.info(`Imported ${rows.length} feeds from ${this.address}`)
                await this.pagingFeedQuery(ori_query, category, count, start + count, dateAfter) // Query and store next page
            }
        } catch (e) {
            signale.error(query, e)
        }
    }

}
