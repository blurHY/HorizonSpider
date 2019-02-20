const mongoose = require('mongoose');

let siteSchema = new mongoose.Schema({
    basicInfo: {
        files: Number,
        files_optional: Number,
        domain: String,
        description: String,
        title: String,
        cloned_from: String,
        address: String,
        cloneable: Boolean,
        extra: Object,
        modified: Number,
        backgroundColor: String,
        peers: Number,
        added: Number,
        size: Number,
        size_optional: Number
    },
    feedsQueried: [{
        query: String,
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
            itemType: String, // frontend or zeronet
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
        time_added: Number
    }],
    runtimeInfo: {
        lastCrawl: {
            siteInfo: Date,
            feeds: {
                check: Date,
                full: Date
            },
            analyze: {
                full: Date
            },
            optioanl: {
                check: Date
            }
        }
    }
})

siteSchema.methods.setSiteInfo = function (siteInfoObj) {
    let newObj = {
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
    for (let key in this.basicInfo)
        this.basicInfo[key] = newObj[key]
    for (let key in siteInfoObj.content)
        if (!(key in ['files',
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
            'background-color']))
            this.basicInfo.extra[key] = siteInfoObj.content[key]
}

let siteModel = mongoose.model('site', siteSchema)

mongoose.connect('mongodb://localhost:27017/horizon', {
    useNewUrlParser: true
}).then(() => {
    console.log('Database connection successful')

    let site = new siteModel()
    site.setSiteInfo({
        "tasks": 0,
        "size_limit": 10,
        "address": "1Mbwaw4Uxp1sq5GzWo3SCmYFTk7mgSWNmw",
        "next_size_limit": 10,
        "auth_address": "1H5XedSvn8PdRcPLo3f5EdMi3ZGG33iN7o",
        "feed_follow_num": null,
        "content": {
            "files": 90,
            "domain": "setuplist.0web.bit",
            "description": "Share software/hardware you are using.",
            "cloned_from": "186THqMWuptrZxq1rxzpguAivK3Bs6z84o",
            "address": "1Mbwaw4Uxp1sq5GzWo3SCmYFTk7mgSWNmw",
            "includes": 1,
            "cloneable": true,
            "inner_path": "content.json",
            "settings": {
                "admin": "domains4free",
                "topic_sticky_uris": ["2_1J3rJ8ecnwH2EPYa6MrgZttBNc61ACFiCj"],
                "admin_href": "http://127.0.0.1:43110/Mail.ZeroNetwork.bit/?to=domains4free"
            },
            "files_optional": 0,
            "title": "SetupList",
            "signs_required": 1,
            "modified": 1481803328.426737,
            "ignore": "((js|css)/(?!all.(js|css))|data/users/.*db|data/users/.*/.*|.*.py)",
            "zeronet_version": "0.5.1",
            "postmessage_nonce_security": true,
            "address_index": 34733440,
            "background-color": "#F5F5F5"
        },
        "peers": 18,
        "auth_key": "fafda7e99b6a823e0c81e6122623bb6eecebb7a8e0d33de679975818521aeeef",
        "settings": {
            "ajax_key": "a1c60cddb629f67018ff51c4ec1a4341abacd3744a179998ab6c322ba506c065",
            "added": 1530851904,
            "optional_downloaded": 0,
            "serving": true,
            "domain": "setuplist.0web.bit",
            "own": false,
            "size": 719779,
            "peers": 17,
            "bytes_recv": 1136420,
            "cache": {},
            "bytes_sent": 264686,
            "modified": 1547579498,
            "size_optional": 0,
            "permissions": []
        },
        "bad_files": 1,
        "workers": 0,
        "cert_user_id": null,
        "started_task_num": 0,
        "content_updated": false
    })
    site.save(console.log)
}).catch(err => {
    console.error('Database connection error')
});