const path = require("path")
const fs = require("fs")

let domainNameJsonPath = path.join(process.env.ZeronetDataPath, "1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F/data/names.json")
let modified = 0

let zeroNameContentJson = path.join(process.env.ZeronetDataPath, "1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F/content.json")
let domainMapObj = null

function loadDomains() {
    zeroNameContentJson = JSON.parse(fs.readFileSync(zeroNameContentJson, "utf8"))
    if (zeroNameContentJson.modified > modified)
        domainMapObj = JSON.parse(fs.readFileSync(domainNameJsonPath, "utf8"))
    modified = zeroNameContentJson.modified
}

function resolveDomain(address) {
    loadDomains()
    if (!(address in domainMapObj))
        throw "Unresolved domain"
    return domainMapObj[address]
}

module.exports = {resolveDomain, domainMapObj, loadDomains}