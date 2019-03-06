const mongoose = require('mongoose');
const log = require("./Logger")
const events = require('events');

let siteSchema = new mongoose.Schema({
    basicInfo: {
        files: Number,
        files_optional: Number,
        domain: String,
        description: String,
        title: String,
        cloned_from: String,
        address: { type: String, unique: true },
        cloneable: Boolean,
        extra: Object,
        modified: Number, // Keep original format to reduce bugs
        backgroundColor: String,
        peers: Number,
        added: Number,
        size: Number,
        size_optional: Number
    },
    feedsQueried: [{
        name: String,
        result: [{
            itemType: String,
            date_added: Number,
            title: String,
            body: String,
            url: String
        }]
    }],
    analyzedInfo: {
        cert_signers: [String],
        includesOfRoot: [String], // Included content jsons in root content.json
        usedTechs: [{
            itemType: String, // Frontend frameworks, zeronet apis etc.
            value: String
        }], // Site quality
        siteFiles: [{ // files field in a site's root content.json
            fileType: String,
            count: Number
        }],
        userContentJson: {
            permission_rules: {
                "all": {
                    files_allowed: [String],
                    max_size: Number,
                    max_size_optional: Number,
                    signers: [String]
                }
            },
            permissions_individual: [{
                user: String,
                rule: Object
            }]
        }
    },
    optionalFiles: [{ // https://zeronet.io/docs/site_development/zeroframe_api_reference/#optionalfilelist
        inner_path: String,
        hash_id: String,
        size: Number,
        peer: Number,
        time_added: Number,
        category: String // Originally the name of a feed query
    }],
    runtimeInfo: {
        lastCrawl: {
            siteInfo: { type: Date, default: Date.now },
            feeds: {
                check: Date, // Only compare last row and add new stuff
                full: Date // Check old rows
            },
            analyze: {
                full: Date
            },
            optional: {
                check: Date,
                full: Date
            }
        },
        error: [] // Errors occurred while crawling
    }
})

siteSchema.methods.setSiteInfo = function (siteInfoObj) {
    this.basicInfo = {
        files: siteInfoObj.content.files,
        files_optional: siteInfoObj.content.files_optional,
        domain: siteInfoObj.content.domain,
        description: siteInfoObj.content.description,
        title: siteInfoObj.content.title,
        cloned_from: siteInfoObj.content.cloned_from,
        address: siteInfoObj.content.address,
        cloneable: siteInfoObj.content.cloneable,
        extra: {},                                  // Non-standard key-values in content.json
        modified: siteInfoObj.content.modified,     // This modified field is signed by the owner and located in the content.json
        backgroundColor: siteInfoObj.content["background-color"],
        peers: siteInfoObj.settings.peers,
        added: siteInfoObj.settings.added,
        size: siteInfoObj.settings.size,
        size_optional: siteInfoObj.settings.size_optional
    }
    // Extra keys such as 'settings'
    for (let key in siteInfoObj.content)
        if (["files",
            'domain',
            'description',
            'cloned_from',
            'address',
            'includes',
            'cloneable',
            'inner_path',
            'files_optional',
            'title',
            'signs_required',
            'modified',
            'ignore',
            'zeronet_version',
            'postmessage_nonce_security',
            'address_index',
            "background-color"].indexOf(key) < 0)
            this.basicInfo.extra[key] = siteInfoObj.content[key]
    this.runtimeInfo.lastCrawl.siteInfo = new Date()
    this.markModified("basicInfo.extra")
    log("info", "spider", `Updated site info for ${this.basicInfo.address}`, siteInfoObj)
}

siteSchema.method.addFeeds = function (feeds) {
    log("info", "spider", `Added ${feeds.length} feeds to ${this.basicInfo.address}`, feeds)
    this.feedsQueried = this.feedsQueried.concat(feeds)
}

siteSchema.method.addOptionalFiles = function (optionals) {
    log("info", "spider", `Added ${optionals.length} optioanl files to ${this.basicInfo.address}`, optionals)
    this.optionalFiles = this.optionalFiles.concat(optionals)
}

let siteModel = mongoose.model('site', siteSchema)
let event = new events.EventEmitter()

module.exports = {
    genNewSite(siteInfo) { // Generate a site obj with siteInfo
        let site = new siteModel()
        site.setSiteInfo(siteInfo)
        site.runtimeInfo.lastCrawl.siteInfo = Date.now()
        return site
    },
    connect() {
        mongoose.connect('mongodb://localhost:27017/horizon', {
            useNewUrlParser: true
        }).then(() => {
            log("info", "spider", "Successfully connected database")
            event.emit("connected")
        }).catch(err => {
            log("error", "spider", "Cannot connect to database", err)
            event.emit("error", err)
        });
    },
    getSite(addr) {
        return new Promise((res, rej) => {
            siteModel.find({
                "basicInfo.address": addr
            }, (err, site) => {
                if (err)
                    rej(err)
                else
                    res(site)
            })
        })
    },
    event,
    siteModel
}


