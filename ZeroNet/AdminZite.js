const Zite = require("./Zite")
const log = require("../Logger")

module.exports = class AdminZite extends Zite {
    constructor() {
        super("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D")
        this.siteList = []
        this.siteAddrs = []
    }

    async reloadSiteList() {
        log.info("Reloading sites list")
        this.siteList = await this.cmdp("siteList")
        this.siteAddrs = this.siteList.map(s => s.address)
    }

    async updateAll() {
        log.info("Updating all sites")
        await this.reloadSiteList()
        for (let site of this.siteList)
            this.cmdp("siteUpdate", site.address).then(res => log.info(`${res}: ${site.address}`))
    }

    addSites(siteAddrs) {
        let count = siteAddrs.length
        if (count > 1)
            log.info(`Adding ${count} sites to zeronet`)
        for (let addr of siteAddrs)
            this.cmdp("siteAdd", addr).catch((e) => {
            })
    }

    isSiteExisted(siteAddr) {
        return this.siteAddrs.indexOf(siteAddr) >= 0
    }
}
