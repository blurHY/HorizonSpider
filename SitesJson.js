const readFileSync = require('fs').readFileSync;
const join = require('path').join;
const log = require('./Logger')

let obj = null

function reloadJson(cb) {
    try {
        obj = JSON.parse(readFileSync(join(process.env.ZeroNetPath, 'data', 'sites.json'), 'utf-8'))
    } catch (e) {
        log("error", "spider", "Cannot load sites json: " + e)
    }
}

module.exports = {
    reloadJson,
    obj,
    getWrapperKey(site_addr) {
        if (!obj)
            reloadJson()
        return obj ? obj[site_addr].wrapper_key : null
    }
}