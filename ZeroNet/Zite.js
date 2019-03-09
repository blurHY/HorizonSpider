const ZeroWs = require('./ZeroWs');
const Settings = require('./SettingsLoader');
const getWrapperKey = require("./SitesJson").getWrapperKey;
const log = require('../Logger')


module.exports = class Zite extends ZeroWs {
    constructor(site_addr) {
        log('info', "zeronet", "Getting wrapper key for " + site_addr)
        super(getWrapperKey(site_addr), Settings.ZeroNetHost)
    }
}