const db = require("../DataBase")

module.exports = {
    async extractLinksForNewFeeds() { // Extract links to other zeronet site
        while (true) {
            let feed = await db.feed.findOne({linksExtracted: false})
            if (!feed)
                break
            await module.exports.findLinksAndSave(feed.title, feed._id, "feed")
            await module.exports.findLinksAndSave(feed.body, feed._id, "feed")
        }
    },
    async findLinksAndSave(text, fromObjId, fromType) {
        let reg = /(?:(?:https?:\/\/)(?:[A-Za-z0-9.-:]{2,30})(?:\/)((?:[A-Za-z0-9]{26,35})|(?:[A-Za-z0-9-_]+\.bit))([a-z\[\]\(\)A-Z0-9~_@=\.\+-/]{0,255}))|(?:((?:[A-Za-z0-9]{32,36})|(?:[A-Za-z0-9-_]+\.bit))([a-z\[\]\(\)A-Z0-9~_@=\.\+-/]{0,255}))/g
        do {
            let result = reg.exec(text)
            if (!result)
                break
            let link = {
                site: result[1] || result[3],
                path: result[2] || result[4],
                date: new Date(),
                fromObj: fromObjId, fromType
            }
            await db.addLink(link)
        } while (true)
    }
}

