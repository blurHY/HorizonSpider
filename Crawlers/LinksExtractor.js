const db = require("../DataBase")

module.exports = {
    async extractLinksForNewFeeds() { // Extract links to other zeronet site
        while (true) {
            let feed = await db.feeds.findOne({ linksExtracted: { $ne: true } })
            if (!feed)
                break
            await module.exports.findLinksAndSave(feed.title, feed._id, "feed")
            await module.exports.findLinksAndSave(feed.body, feed._id, "feed")
            feed.linksExtracted = true
            await feed.save()
        }
    },
    async findLinksAndSave(text, fromObjId, fromType) {
        let reg = /(?:[^A-Za-z0-9]+)(?:(?:(?:https?:\/\/)?(?:[A-Za-z0-9.-:]{2,30})(?:\/)((?:1(?=[A-Za-z0-9]*[A-Z][A-Za-z0-9]*)(?=[A-Za-z0-9]*[0-9][A-Za-z0-9]*)(?=[A-Za-z0-9]*[a-z][A-Za-z0-9]*)[A-Za-z0-9]{26,35})|(?:[A-Za-z0-9-_.]+\.bit))(?:(\/(?:[a-zA-Z0-9~_@=\.\+-/]{0,255}))|(?:[^A-Za-z0-9])|$))|(?:((?:1(?=[A-Za-z0-9]*[A-Z][A-Za-z0-9]*)(?=[A-Za-z0-9]*[0-9][A-Za-z0-9]*)(?=[A-Za-z0-9]*[a-z][A-Za-z0-9]*)[A-Za-z0-9]{32,35})|(?:[A-Za-z0-9-_]+\.bit))(\/[a-z\(\)A-Z0-9~_@=\.\+-/]{0,255})))/g,
            arr = []
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
            arr.push(link)
        } while (true)
        await db.addLinks(arr)
    }
}

