const Zite = require("./Zite")
const signale = require("signale")

module.exports = class AdminZite extends Zite {
    constructor() {
        super("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D")
        this.siteList = []
        this.siteAddrs = []
    }

    async reloadSiteList() {
        signale.await("Reloading sites list")
        this.siteList = await this.cmdp("siteList", [])
        this.siteAddrs = this.siteList.map(s => s.address)
        signale.success(`SiteList: ${this.siteList.length}`)
    }

    async updateAll() {
        signale.await("Updating all sites")
        await this.reloadSiteList()
        for (let site of this.siteList)
            this.cmdp("siteUpdate", site.address).then(res => signale.complete(`Site updated ${res}: ${site.address}`))
    }

    addSites(siteAddrs) {
        let count = siteAddrs.length
        if (count > 1)
            signale.info(`Adding ${count} sites to zeronet`)
        for (let addr of siteAddrs)
            this.cmdp("siteAdd", addr).catch((e) => {
            })
    }

    isSiteExisted(siteAddr) {
        return this.siteAddrs.indexOf(siteAddr) >= 0
    }
}
