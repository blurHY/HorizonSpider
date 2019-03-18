const readFileSync = require("fs").readFileSync
const join = require("path").join
const log = require("../Logger")

let obj = null

module.exports = {
    reloadJson() {
        try {
            obj = JSON.parse(readFileSync(join(process.env.ZeroNetPath, "data", "sites.json"), "utf-8"))
        } catch (e) {
            log.error("Cannot load sites json: " + e)
        }
    },
    getWrapperKey(site_addr) {
        if (!obj)
            module.exports.reloadJson()
        return obj && obj[site_addr] ? obj[site_addr].wrapper_key : null
    },
    obj
}