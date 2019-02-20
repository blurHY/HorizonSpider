require('dotenv').config()
const fs = require("fs")
const conf = require("./Config")
const join = require('path').join;

function getContentJson(siteAddr) {
    return JSON.parse(fs.readFileSync(join(conf.DataPath, siteAddr, "content.json")))
}

function getDBJson(siteAddr) {
    return JSON.parse(fs.readFileSync(join(conf.DataPath, siteAddr, "dbschema.json")))
}

module.exports = {
    getContentJson,
    getDBJson
}