const delay = require("delay"),
    ZeroWs = require("./ZeroWs"),
    Settings = require("./SettingsLoader"),
    getWrapperKey = require("./SiteMeta").getWrapperKey,
    signale = require("signale")

const defaultRetryInterval = 1000 * 60 * 5

module.exports = class Zite extends ZeroWs {
    constructor(site_addr, retryIfFail) {
        signale.info("Getting wrapper key for " + site_addr)
        signale.info(`ZeroNetHost: ${Settings.ZeroNetHost}`)
        super()
        this.getKeyAndInit(site_addr, retryIfFail)
    }
    async getKeyAndInit(site_addr, retryIfFail) {
        try {
            await getWrapperKey(site_addr)
        } catch (e) {
            signale.warn(e)
            if (retryIfFail) {
                await delay(defaultRetryInterval)
                await this.getKeyAndInit(site_addr, retryIfFail)
            }
        }
    }
}