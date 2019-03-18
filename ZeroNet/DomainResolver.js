const path = require("path")
const fs = require("fs")
const signale = require('signale');

let domainNameJsonPath = path.join(process.env.ZeronetDataPath, "1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F/data/names.json")
let modified = 0

let zeroNameContentJson = path.join(process.env.ZeronetDataPath, "1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F/content.json")
global.domainMapObj = null

function loadDomains(force = false) {
    zeroNameContentJson = JSON.parse(fs.readFileSync(zeroNameContentJson, "utf8"))
    if (zeroNameContentJson.modified > modified || !global.domainMapObj || force) {
        global.domainMapObj = JSON.parse(fs.readFileSync(domainNameJsonPath, "utf8"))
        if(!global.domainMapObj){
            signale.error(`Domain map is null`)
        }
    }
    modified = zeroNameContentJson.modified
}

function resolveDomain(address) {
    loadDomains()
    if (!(address in global.domainMapObj))
        throw "Unresolved domain"
    return global.domainMapObj[address]
}

module.exports = {resolveDomain, loadDomains}