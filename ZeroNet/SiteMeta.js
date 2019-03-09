const fs = require("fs")
const join = require('path').join;
function getContentJson(siteAddr) {
    return JSON.parse(fs.readFileSync(join(process.env.ZeronetDataPath, siteAddr, "content.json")))
}

function getDBJson(siteAddr) {
    try {
        return JSON.parse(fs.readFileSync(join(process.env.ZeronetDataPath, siteAddr, "dbschema.json")))
    } catch {
        return null
    }
}

module.exports = {
    getContentJson,
    getDBJson
}