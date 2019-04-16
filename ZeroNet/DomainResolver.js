const path = require("path")
const fs = require("fs")
const signale = require("signale")

let domainNameJsonPath = path.join(process.env.ZeronetDataPath, "1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F/data/names.json")
global.domainMapObj = null
global.lastReloadDomain = 0

function loadDomains() {
    if (Date.now() - global.lastReloadDomain > 1500000 || !global.domainMapObj) {
        signale.warn("Loading domains")
        global.domainMapObj = JSON.parse(fs.readFileSync(domainNameJsonPath, "utf8"))
        global.lastReloadDomain = Date.now()
    }
}

function resolveDomain(address) {
    loadDomains()
    if (!(address in global.domainMapObj))
        return address
    return global.domainMapObj[address]
}

module.exports = { resolveDomain, loadDomains }