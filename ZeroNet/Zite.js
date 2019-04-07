const ZeroWs = require("./ZeroWs")
const Settings = require("./SettingsLoader")
const getWrapperKey = require("./SiteMeta").getWrapperKey
const signale = require('signale');


module.exports = class Zite extends ZeroWs {
    constructor(site_addr) {
        signale.info("Getting wrapper key for " + site_addr)
        signale.info(`ZeroNetHost: ${Settings.ZeroNetHost}`)
        super(getWrapperKey(site_addr), Settings.ZeroNetHost)
    }
}