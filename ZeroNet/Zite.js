const ZeroWs = require("./ZeroWs")
const Settings = require("./SettingsLoader")
const getWrapperKey = require("./SitesJson").getWrapperKey
const log = require("../Logger")


module.exports = class Zite extends ZeroWs {
    constructor(site_addr) {
        log.info("Getting wrapper key for " + site_addr)
        log.info(`ZeroNetHost: ${Settings.ZeroNetHost}`)
        super(getWrapperKey(site_addr), Settings.ZeroNetHost)
    }
}