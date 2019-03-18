const readFileSync = require("fs").readFileSync
const join = require("path").join
const signale = require("signale")


module.exports = {
    reloadJson() {
        try {
            global.sitesJson = JSON.parse(readFileSync(join(process.env.ZeroNetPath, "data", "sites.json"), "utf-8"))
        } catch (e) {
            signale.error("Cannot load sites json: " + e)
        }
    },
    getWrapperKey(site_addr) {
        if (!global.sitesJson)
            module.exports.reloadJson()
        if (global.sitesJson && global.sitesJson[site_addr])
            return global.sitesJson[site_addr].wrapper_key
        else
            throw `No wrapper_key for ${site_addr}`
    }
}