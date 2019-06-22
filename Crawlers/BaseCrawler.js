module.exports = class BaseCrawler {
    constructor(params) {   // dbSchema, siteDB, siteObj, address
        Object.assign(this, params)
        this.crawl = this.updateFeeds
        this.NAError = require("./Errors/NAError")
        if (!this.address)
            throw new this.NAError()
    }
}