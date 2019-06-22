const fs = require("fs")
const join = require("path").join
const signale = require("signale")
const sqlite = require("sqlite")
const path = require("path")

module.exports = {
    getContentJson: (siteAddr) => new Promise((res, rej) => {
        fs.readFile(join(process.env.ZeronetDataPath, siteAddr, "content.json"), "utf8", (err, data) => {
            if (err)
                rej(err)
            else
                res(JSON.parse(data))
        })
    }),
    mergeContentJsonWithSiteList: async obj => ({ ...(await module.exports.getContentJson(obj.address)), ...obj }),
    getDBJson: (siteAddr) => new Promise((res, rej) => {
        fs.readFile(join(process.env.ZeronetDataPath, siteAddr, "dbschema.json"), "utf8", (err, data) => {
            if (err) {
                signale.debug(`No dbschema.json for ${siteAddr}`)
                res(null)
            } else
                res(JSON.parse(data))
        })
    }),
    reloadSitesJson: () => new Promise((res, rej) => {
        fs.readFile(join(process.env.ZeronetDataPath, "sites.json"), "utf8", (err, data) => {
            if (err) {
                rej(err)
                signale.error("Cannot load sites.json")
            } else
                res(global.sitesJson = JSON.parse(data))
        })
    }),
    async getWrapperKey(site_addr) {
        await module.exports.getSitesList()
        if (global.sitesJson && global.sitesJson[site_addr])
            return global.sitesJson[site_addr].wrapper_key
        else
            throw `No wrapper_key for ${site_addr}`
    },
    async getSitesList() {
        if (!global.sitesJson)
            await module.exports.reloadSitesJson()
        return global.sitesJson
    },
    async asWsSiteList() {
        let sites = await module.exports.getSitesList()
        let arr = []
        for (let address in sites)
            try {
                arr.push(await module.exports.mergeContentJsonWithSiteList({ address, ...sites[address] }))
            } catch {
            }
        return arr
    },
    async getWsSiteInfo(address) {
        let sites = await module.exports.getSitesList()
        return await module.exports.mergeContentJsonWithSiteList({ address, ...sites[address] })
    },
    async getSiteDataBase(siteAddr, dbSchema = null) {
        if (!dbSchema)
            try {
                dbSchema = await module.exports.getDBJson(siteAddr)
            } catch {
                return null
            }
        let joined = path.resolve(process.env.ZeronetDataPath, siteAddr, dbSchema.db_file)
        if (!joined.startsWith(path.resolve(process.env.ZeronetDataPath, siteAddr)))
            throw Error("Path disallowed: " + joined)
        return await sqlite.open(joined)
    }
}