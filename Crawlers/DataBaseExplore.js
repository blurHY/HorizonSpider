const linksExtractor = require("../Utils/LinksExtractor"),
    signale = require("signale"),
    chillout = require('chillout'),
    DataBase = require("../DataBase"),
    BaseCrawer = require("./BaseCrawler")
const defaultDataBaseScanInterval = 1000 * 60 * 60 * 24 * 7

module.exports = class DataBaseExplorer extends BaseCrawer {
    constructor(params) {
        super(params)
        if (!this.siteDB)
            throw new this.NAError()
        this.crawl = this.explore
        this.interval = parseInt(process.env.DataBaseScanInterval) || defaultDataBaseScanInterval
    }
    async explore() {
        if (this.siteObj.runtime.database_scan > new Date() - this.interval)
            return
        let tables = await this.siteDB.all("SELECT name FROM sqlite_master WHERE type='table'")
        for (let table of tables) {
            if (table.name === "sqlite_sequence")
                continue
            await this.pagingCrawl(table.name)
        } // TODO: Ignore non-text fields
        await DataBase.updateSite({ runtime: { database_scan: Date.now() } }, this.address)
    }

    async pagingCrawl(table_name, start = 0, count = 3000) {
        signale.debug(`Scanning ${this.address} db ${start}-${start + count} table: ${table_name}`)
        let rows = await this.siteDB.all(`SELECT * from ${table_name} limit ${count} offset ${start}`)
        if (rows.length === 0)
            return
        await chillout.forEach(rows, async row => {
            await chillout.forEach(row, async (val) => {
                if (typeof val === "string")
                    await linksExtractor.findLinksAndSave(val, this.siteObj._id, "site")
            })
        })
        await this.pagingCrawl(table_name, start + count, count)
    }
}
