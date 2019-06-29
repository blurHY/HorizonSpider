module.exports = class BaseCrawler {
    constructor(params) {   // dbSchema, siteDB, siteObj, address, siteId
        Object.assign(this, params)
        this.crawl = this.updateFeeds
        this.NAError = require("./Errors/NAError")
        if (!(this.address && this.siteId))
            throw new this.NAError()
    }
}