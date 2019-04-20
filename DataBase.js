const Mongo = require("mongodb"),
    MongoClient = Mongo.MongoClient;
const signale = require("signale")
const EventEmitter = require("events").EventEmitter

class DataBase extends EventEmitter {
    async connect() {
        const url = "mongodb://localhost:27017/horizon";
        this.client = new MongoClient(url, { useNewUrlParser: true });
        try {
            await this.client.connect()
        } catch (err) {
            signale.error(err)
            return
        }
        this.db = this.client.db("horizon")
        this.feeds = this.db.collection("feeds")
        this.opfiles = this.db.collection("opfiles")
        this.sites = this.db.collection("sites")
        this.links = this.db.collection("links")
        try {
            signale.info("Creating indexes, including full text search")
            await this.links.createIndex({ fromObj: 1, site: 1 }, { unique: true })
            await this.sites.createIndex({ "basicInfo.address": 1 }, { unique: true })
            await this.feeds.createIndex({ body: "text", title: "text", url: "text" })
            await this.sites.createIndex({ "$**": "text" })
            await this.opfiles.createIndex({ "$**": "text" })
        } catch (e) {
            signale.error(e)
            process.exit(1)
        }

        this.emit("connected")
    }
    async addFeeds(site, feeds, name) {
        if (feeds.length <= 0 || !site)
            return
        if (!site.feedsQueried)
            site.feedsQueried = []
        let feedCategory = site.feedsQueried.find(f => f.name === name) // Find the corresponding category
        if (!feedCategory) { // Or create one
            feedCategory = { name, result: [] }
            site.feedsQueried.push(feedCategory)
        }
        let feedObjs = []
        for (let f of feeds) {
            f._id = new Mongo.ObjectId()
            f.site = site._id
            let feedObj = {
                ...f,
                linksExtracted: false
            }
            feedCategory.result.push(f._id)
            feedObjs.push(feedObj)
        }
        await this.feeds.insertMany(feedObjs)
        signale.star(`DB operation: Added ${feedObjs.length} feeds`)
    }
    async addOptionalFiles(site, optionals) {
        if (optionals.length <= 0 || !site)
            return
        let oObjs = []
        for (let o of optionals) {
            o._id = new Mongo.ObjectId()
            o.site = site._id
            let oObj = { ...o }
            site.optionalFiles.push(oObj._id)
            oObjs.push(oObj)
        }
        await this.opfiles.insertMany(oObjs)
        signale.star(`DB operation: Added ${oObjs.length} optional files`)
    }
    genNewSite(siteInfo) { // Generate a site obj with siteInfo
        let site = {
            runtimeInfo: {
                lastCrawl: {
                    optional: {},
                    feeds: {},
                    siteInfo: 0
                }
            },
            optionalFiles: [],
            feedsQueried: [],
            json: [],
            _id: new Mongo.ObjectId()
        }
        site = this.setSiteInfo(site, siteInfo)
        site.runtimeInfo.lastCrawl.siteInfo = Date.now()
        return site
    }
    setSiteInfo(site, siteInfoObj) {
        siteInfoObj = { files: {}, files_optional: {}, ...siteInfoObj }
        site.basicInfo = {
            files: Object.keys(siteInfoObj.files).length,
            files_optional: Object.keys(siteInfoObj.files_optional).length,
            domain: siteInfoObj.domain,
            description: siteInfoObj.description,
            title: siteInfoObj.title,
            cloned_from: siteInfoObj.cloned_from,
            address: siteInfoObj.address,
            cloneable: siteInfoObj.cloneable,
            modified: siteInfoObj.modified,     // This modified field is signed by the owner and located in the content.json
            backgroundColor: siteInfoObj["background-color"],
            peers: siteInfoObj.peers,
            added: siteInfoObj.added,
            size: siteInfoObj.size,
            size_optional: siteInfoObj.size_optional,
            zeronet_version: siteInfoObj.zeronet_version
        }

        site.runtimeInfo.lastCrawl.siteInfo = new Date()
        signale.info(`Updated site info for ${site.basicInfo.address}`)
        return site
    }
    async saveSite(site) {
        signale.debug(`DB operation: Save site ${site.basicInfo.address}`)
        await this.sites.insertOne(site)
    }
    async updateSite(site) {
        signale.debug(`DB operation: Update site ${site.basicInfo.address}`)
        await this.sites.updateOne({ "basicInfo.address": site.basicInfo.address }, { $set: site })
    }
    async getSite(address) {
        return await this.sites.findOne({ "basicInfo.address": address })
    }
    async addLinks(objs) {
        try {
            if (objs.length > 0) {
                await this.links.insertMany(objs, { ordered: false })
                signale.star(`DB operation: Added ${objs.length} links`)
            }
        } catch (e) {
            // BulkWriteError is expected
        }
    }
}

// let db = new DataBase()
// db.on("connected", async () => {
//     console.log(await db.getSite("asdads"))
// })
// db.connect()

module.exports = new DataBase()