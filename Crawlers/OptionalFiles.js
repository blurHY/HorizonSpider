const ContentDB = require("../ZeroNet/ContentDB"),
    DataBase = require("../DataBase"),
    signale = require("signale"),
    BaseCrawer = require("./BaseCrawler")
const defaultDataBaseScanInterval = 1000 * 60 * 60 * 24 * 7,
    defaultDataBaseCheckInterval = (parseInt(process.env.OptionalFilesCheckInterval) || 3600000)

module.exports = class OptionalFilesCrawler extends BaseCrawer {
    constructor(params) {
        super(params)
        if (!this.siteDB)
            throw new this.NAError()
        this.crawl = this.updateOptionalFiles
        this.interval = parseInt(process.env.DataBaseScanInterval) || defaultDataBaseScanInterval
    }
    async updateOptionalFiles(modification) {
        let lastDate = 0,
            now = Date.now()
        this.modification = modification
        if (this.siteObj.runtime && this.siteObj.runtime.op_files && this.siteObj.runtime.op_files.last_refresh > now - this.interval) {
            if (!this.siteObj.runtime.op_files.last_check || this.siteObj.runtime.op_files.last_check < now - defaultDataBaseCheckInterval) { // New files only
                lastDate = this.siteObj.runtime.op_files.last_check
                signale.info(`Checking for new optional files ${this.address}, date after ${lastDate}`)
                modification.runtime.op_files.last_check = now
            } else {
                signale.info(`Stored optional files are up to date ${this.address}`)
                return
            }
        } else {
            signale.info("Crawl all optional files for " + this.address)
            await DataBase.clearOpfiles(this.siteId)
            modification.op_files = []
            modification.runtime.op_files.last_refresh = now
            modification.runtime.op_files.last_check = now
        }

        await this.pagingQuery(800, 0, lastDate ? lastDate.getTime() / 1000 : 0)
    }


    async pagingQuery(count = 3000, start = 0, dateAfter = null) {
        let rowsToAdd = []
        signale.info(`Fetching optional files ${start}-${start + count} for ${this.address}`)
        let rows = await ContentDB.getOptionalFiles(this.address, count, start, dateAfter)
        if (!rows || rows.length === 0) {
            signale.info(`No optional files found ${this.address}`)
            return
        }
        for (let row of rows) {
            let obj = {
                inner_path: row.inner_path,
                hash_id: row.hash_id,
                size: row.size,
                peer: row.peer,
                time_added: row.time_added,
                extra: {}
            }
            rowsToAdd.push(obj)
        }

        await DataBase.addOptionalFiles(this.siteId, rowsToAdd, this.modification)
        await this.pagingQuery(count, start + count, dateAfter)
    }

}
