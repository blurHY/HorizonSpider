const mongoose = require("mongoose")
const ObjectId = mongoose.Schema.Types.ObjectId
const signale = require("signale")
const events = require("events")

let feedSchema = new mongoose.Schema({
    itemType: String,
    date_added: Number,
    title: String,
    body: String,
    url: String,
    site: {type: ObjectId, ref: "site"},
    linksExtracted: {type: Boolean, default: false}
})

let feed = mongoose.model("feed", feedSchema)

let opfileSchema = new mongoose.Schema({ // https://zeronet.io/docs/site_development/zeroframe_api_reference/#optionalfilelist
    inner_path: String,
    hash_id: Number,
    size: Number,
    peer: Number,
    time_added: Number,
    extra: {},
    site: {type: ObjectId, ref: "site"}
})

let opfile = mongoose.model("opfile", opfileSchema)

let linkSchema = new mongoose.Schema({
    site: String,
    path: String,
    date: Date,
    fromObj: {type: ObjectId, refPath: "fromType"},
    fromType: {
        type: String,
        enum: ["feed", "site", "opfile"]
    },
    added: Boolean // Whether added to zeronet pending sites list
})

let link = mongoose.model("link", linkSchema)

let siteSchema = new mongoose.Schema({
    basicInfo: {
        files: Number,
        files_optional: Number,
        domain: String,
        description: String,
        title: String,
        cloned_from: String,
        address: {type: String, unique: true},
        cloneable: Boolean,
        extra: Object,
        modified: Number, // Keep original format to reduce bugs
        backgroundColor: String,
        peers: Number,
        added: Number,
        size: Number,
        size_optional: Number,
        zeronet_version: String
    },
    feedsQueried: [{
        name: String,
        result: [{type: ObjectId, ref: "feed"}]
    }],
    optionalFiles: [
        {type: ObjectId, ref: "opfile"}
    ],
    runtimeInfo: {
        lastCrawl: {
            siteInfo: {type: Date, default: Date.now},
            feeds: {
                check: Date, // Only compare last row and add new stuff
                full: Date, // Check old rows
                itemDate: Number // Date of latest item checked
            },
            optional: {
                check: Date,
                full: Date,
                itemDate: Number
            }
        },
        error: [] // Errors occurred while crawling
    },
    json: [{
        json_id: Number,
        directory: String,
        cert_user_id: String
    }]
})

siteSchema.methods.setSiteInfo = function (siteInfoObj) {
    siteInfoObj = {files: {}, files_optional: {}, ...siteInfoObj}
    this.basicInfo = {
        files: Object.keys(siteInfoObj.files).length,
        files_optional: Object.keys(siteInfoObj.files_optional).length,
        domain: siteInfoObj.domain,
        description: siteInfoObj.description,
        title: siteInfoObj.title,
        cloned_from: siteInfoObj.cloned_from,
        address: siteInfoObj.address,
        cloneable: siteInfoObj.cloneable,
        extra: {},                                  // Non-standard key-values in content.json
        modified: siteInfoObj.modified,     // This modified field is signed by the owner and located in the content.json
        backgroundColor: siteInfoObj["background-color"],
        peers: siteInfoObj.peers,
        added: siteInfoObj.added,
        size: siteInfoObj.size,
        size_optional: siteInfoObj.size_optional,
        zeronet_version: siteInfoObj.zeronet_version
    }
    // Extra keys such as 'settings'
    try {
        for (let key in siteInfoObj)
            if (["files",
                "domain",
                "description",
                "cloned_from",
                "address",
                "includes",
                "cloneable",
                "inner_path",
                "files_optional",
                "title",
                "signs_required",
                "modified",
                "ignore",
                "zeronet_version",
                "postmessage_nonce_security",
                "address_index",
                "background-color"].indexOf(key) < 0 && !/[.$]/.test(key))
                this.basicInfo.extra[key] = siteInfoObj[key]
    } catch (e) {
        signale.warn(e)
    }
    this.markModified("basicInfo.extra")
    this.runtimeInfo.lastCrawl.siteInfo = new Date()
    signale.info(`Updated site info for ${this.basicInfo.address}`)
}

siteSchema.methods.addFeeds = async function (feeds, name) {
    let feedCategory = this.feedsQueried.find(f => f.name === name)
    if (!feedCategory) {
        feedCategory = {name, result: []}
        this.feedsQueried.push(feedCategory)
    }
    for (let f of feeds) {
        f._id = new mongoose.Types.ObjectId()
        f.site = this._id
        let feedObj = new feed(f)
        feedCategory.result.push(f._id)
        await feedObj.save()
    }
}

siteSchema.methods.addOptionalFiles = async function (optionals) {
    for (let o of optionals) {
        o._id = new mongoose.Types.ObjectId()
        o.site = this._id
        let oObj = new opfile(o)
        this.optionalFiles.push(oObj._id)
        await oObj.save()
    }
}

let siteModel = mongoose.model("site", siteSchema)
let event = new events.EventEmitter()

module.exports = {
    genNewSite(siteInfo) { // Generate a site obj with siteInfo
        let site = new siteModel()
        site.setSiteInfo(siteInfo)
        site.runtimeInfo.lastCrawl.siteInfo = Date.now()
        return site
    },
    connect() {
        mongoose.connect("mongodb://localhost:27017/horizon", {
            useNewUrlParser: true
        }).then(() => {
            signale.info("Successfully connected database")
            event.emit("connected")
        }).catch(err => {
            signale.error("Cannot connect to database", err)
            event.emit("error", err)
        })
    },
    async getSite(addr) {
        return await siteModel.findOne({
            "basicInfo.address": addr
        })
    },
    event,
    siteModel,
    async addLink(obj) {
        await (new link(obj)).save()
    },
    feed, opfile, link
}

// module.exports.connect()
// event.on("connected", async () => {
//     let siteId = new mongoose.Types.ObjectId()
//     let feedId = new mongoose.Types.ObjectId()
//     let feedObj = new feed({title: "234", _id: feedId})
//     await feedObj.save()
//     let site = new siteModel({address: "123123", _id: siteId})
//     site.feedsQueried.push({name: "a", result: [feedId]})
//     await site.save()

//     let x = await siteModel.findOne({}).populate("feedsQueried.result").exec()
//     console.log(x)
// })

// event.on("connected", async () => {
//     // for (let x = 0; x < 100; x++) {
//     //     //     await (new link({site: x, added: Boolean(x % 2)})).save()
//     //     // }
//     let arr = await module.exports.link.find({added: false}).limit(10).skip(10).select("site").exec()
//     console.log(arr)
// })