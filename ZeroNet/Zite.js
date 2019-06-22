const delay = require("delay"),
    ZeroWs = require("./ZeroWs"),
    Settings = require("./SettingsLoader"),
    getWrapperKey = require("./SiteMeta").getWrapperKey,
    signale = require("signale")


module.exports = class Zite extends ZeroWs {
    static defaultRetryInterval = 1000 * 60 * 5
    constructor(site_addr) {
        signale.info("Getting wrapper key for " + site_addr)
        signale.info(`ZeroNetHost: ${Settings.ZeroNetHost}`)
        super()
        this.getKeyAndInit(site_addr)
    }
    async getKeyAndInit(site_addr) {
        try {
            await getWrapperKey(site_addr)
        } catch (e) {
            console.log(e)
            await delay(ZeroWs.defaultRetryInterval)
            await this.getKeyAndInit(site_addr)
        }
    }
}