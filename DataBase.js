const elasticsearch = require('elasticsearch')
const signale = require("signale")
const EventEmitter = require("events").EventEmitter

class DataBase extends EventEmitter {
    async connect(truncate) {
        this.client = new elasticsearch.Client({
            node: 'http://localhost:9200',
            compression: true
        });
        try {
            await this.client.ping()
            if (await this.client.indices.exists({
                index: ["site", "feed", "op_file"]
            }) && (!truncate))
                signale.debug("Indices exist")
            else {
                await this.client.indices.delete({
                    index: "*" // Clear broken indices
                })
                signale.debug("Deleted all indices")
                await this.client.indices.create({ // Difference between original names and these: '_' instead of '-'
                    index: "site",
                    body: {
                        "mappings": {
                            "properties": {
                                "address": { "type": "keyword" },
                                "title": {
                                    "type": "text",
                                    "analyzer": "ik_max_word",
                                    "search_analyzer": "ik_smart"
                                },
                                "files_number": { "type": "short" },
                                "op_files_number": { "type": "short" },
                                "domain": {
                                    "type": "text",
                                    "analyzer": "ik_max_word",
                                    "search_analyzer": "ik_smart"
                                },
                                "description": {
                                    "type": "text",
                                    "analyzer": "ik_max_word",
                                    "search_analyzer": "ik_smart"
                                },
                                "modified": {
                                    "type": "date",
                                    "format": "epoch_second"
                                },
                                "cloneable": { "type": "boolean" },
                                "cloned_from": { "type": "keyword" },
                                "background_color": { "type": "keyword" },
                                "peers": { "type": "short" },
                                "added": {
                                    "type": "date",
                                    "format": "epoch_second"
                                },
                                "size": { "type": "integer" },
                                "size_optional": { "type": "long" },
                                "zeronet_version": { "type": "keyword" },
                                "feeds": { "type": "keyword" }, // Array of feeds' ids (elasticsearch document id)
                                "op_files": { "type": "keyword" }, // Array of files' ids
                                "runtime": {
                                    "properties": {
                                        "feeds": {
                                            "properties": {
                                                "last_check": {
                                                    "type": "date",
                                                    "format": "epoch_millis"
                                                },
                                                "last_refresh": {
                                                    "type": "date",
                                                    "format": "epoch_millis"
                                                }
                                            }
                                        },
                                        "op_files": {
                                            "properties": {
                                                "last_check": {
                                                    "type": "date",
                                                    "format": "epoch_millis"
                                                },
                                                "last_refresh": {
                                                    "type": "date",
                                                    "format": "epoch_millis"
                                                }
                                            }
                                        },
                                        "database_scan": {
                                            "type": "date",
                                            "format": "epoch_millis"
                                        },
                                        "siteinfo": {
                                            "type": "date",
                                            "format": "epoch_millis"
                                        }
                                    }
                                },
                                "owner": { // e.g. zerotalk's settings.admin
                                    "type": "text",
                                    "analyzer": "ik_max_word",
                                    "search_analyzer": "ik_smart"
                                }
                            }
                        }
                    }
                })
                await this.client.indices.create({
                    index: "op_file",
                    body: {
                        "mappings": {
                            "properties": {
                                "inner_path": {
                                    "type": "text",
                                    "analyzer": "ik_max_word",
                                    "search_analyzer": "ik_smart"
                                },
                                "hash_id": {
                                    "type": "keyword"
                                },
                                "size": { "type": "integer" },
                                "peer": { "type": "short" },
                                "time_added": {
                                    "type": "date",
                                    "format": "epoch_second"
                                },
                                "description": {
                                    "type": "text",
                                    "analyzer": "ik_max_word",
                                    "search_analyzer": "ik_smart"
                                },
                                "title": {
                                    "type": "text",
                                    "analyzer": "ik_max_word",
                                    "search_analyzer": "ik_smart"
                                },
                                "address": {
                                    "type": "keyword"
                                }
                            }
                        }
                    }
                })
                await this.client.indices.create({ // https://zeronet.io/docs/site_development/zeroframe_api_reference/#plugin-newsfeed
                    index: "feed",
                    body: {
                        "mappings": {
                            "properties": {
                                "item_type": {
                                    "type": "keyword"
                                },
                                "date_added": {
                                    "type": "date",
                                    "format": "epoch_second"
                                },
                                "title": {
                                    "type": "text",
                                    "analyzer": "ik_max_word",
                                    "search_analyzer": "ik_smart"
                                },
                                "body": {
                                    "type": "text",
                                    "analyzer": "ik_max_word",
                                    "search_analyzer": "ik_smart"
                                },
                                "url": {
                                    "type": "text",
                                    "analyzer": "ik_max_word",
                                    "search_analyzer": "ik_smart"
                                },
                                "category": {
                                    "type": "text",
                                    "analyzer": "ik_max_word",
                                    "search_analyzer": "ik_smart"
                                },
                                "address": {
                                    "type": "keyword"
                                }
                            }
                        }
                    }
                })
                signale.success("Indices created")
            }

        } catch (err) {
            signale.error(err)
            return
        }
        this.emit("connected")
    }
    async filterItemsByAddr(address, indexName, fullDoc) {
        return await this.client.search({
            index: indexName,
            body: {
                "_source": fullDoc ? true : "_id",
                "query": {
                    "constant_score": {
                        "filter": {
                            "term": {
                                address
                            }
                        }
                    }
                }
            }
        })
    }
    async clearFeeds(address) {
        return await this.client.deleteByQuery({
            index: "feed",
            type: "_doc",
            body: {
                "query": {
                    "constant_score": {
                        "filter": {
                            "term": {
                                address
                            }
                        }
                    }
                }
            }
        })
    }
    async clearOpfiles(address) {
        return await this.client.deleteByQuery({
            index: "op_file",
            type: "_doc",
            body: {
                "query": {
                    "constant_score": {
                        "filter": {
                            "term": {
                                address
                            }
                        }
                    }
                }
            }
        })
    }
    async filterItemsToGetIds(address, indexName) {
        return (await this.filterItemsByAddr(address, indexName)).hits.hits.map(v => v._id)
    }
    async addFeeds(address, feeds) {
        if (feeds.length <= 0 || !address)
            return
        let operations = []
        feeds.forEach(f =>
            operations.push({ index: { _index: 'feed' } }, { ...f, address })
        )
        const res = await this.client.bulk({
            refresh: true,
            body: operations
        })
        if (res.errors)
            signale.error(res)
        this.updateSite({ feeds: (await this.filterItemsToGetIds(address, "feed")) }, address)
    }
    async addOptionalFiles(address, optionals) {
        if (optionals.length <= 0 || !address)
            return
        let operations = []
        optionals.forEach(f =>
            operations.push({ index: { _index: 'optional' } }, { ...f, address })
        )
        const res = await this.client.bulk({
            refresh: true,
            body: operations
        })
        if (res.errors)
            signale.error(res)
        this.updateSite({ op_files: (await this.filterItemsToGetIds(address, "op_file")) }, address)
    }
    genNewSite(siteInfo) { // Generate a site obj with siteInfo 
        let site = {
            runtime: {
                feeds: {},
                op_files: {}
            }
        }
        site = this.setSiteInfo(site, siteInfo)
        site.runtime.feeds.last_refresh = Date.now()
        return site
    }
    setSiteInfo(site, siteInfoObj) { // siteInfoObj example: https://blurhy.xyz/2019/05/24/Horizon%E6%95%B0%E6%8D%AE%E7%9A%84%E5%88%9D%E6%AD%A5%E5%A4%84%E7%90%86/
        siteInfoObj = { files: {}, files_optional: {}, ...siteInfoObj }
        site = {
            address: siteInfoObj.address,
            title: siteInfoObj.title,
            files_number: Object.keys(siteInfoObj.files).length,
            op_files_number: Object.keys(siteInfoObj.files_optional).length,
            domain: siteInfoObj.domain,
            description: siteInfoObj.description,
            modified: siteInfoObj.modified,     // This modified field is signed by the owner and located in the content.json
            cloneable: siteInfoObj.cloneable,
            cloned_from: siteInfoObj.cloned_from,
            background_color: siteInfoObj["background-color"],
            peers: siteInfoObj.peers,
            added: siteInfoObj.added,
            size: siteInfoObj.size,
            size_optional: siteInfoObj.size_optional,
            zeronet_version: siteInfoObj.zeronet_version,
            feeds: siteInfoObj.feeds || [],
            op_files: siteInfoObj.op_files || []
        }
        if (!site.runtime)
            site.runtime = {}
        if (!site.runtime.feeds)
            site.runtime.feeds = {}
        site.runtime.feeds.last_refresh = Date.now()
        site.runtime.siteinfo = Date.now()
        signale.info(`Updated site info for ${siteInfoObj.address}`)
        return site
    }
    async addSite(doc) {
        return await this.client.index({ index: "site", type: "_doc", body: doc })
    }
    async updateSite(newDoc, id) { // Partial update
        await this.client.update({ index: "site", type: "_doc", id, body: { doc: newDoc } })
    }
    async getSite(address) {
        try {
            let hits = (await this.client.search({
                index: "site",
                body: {
                    "query": {
                        "constant_score": {
                            "filter": {
                                "term": {
                                    address
                                }
                            }
                        }
                    }
                }
            })).hits.hits
            if (hits.length === 0)
                return
            else
                return hits[0]
        }
        catch (e) {
            return null
        }
    }
}

module.exports = new DataBase()
