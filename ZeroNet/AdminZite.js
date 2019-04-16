const Zite = require("./Zite")
const signale = require("signale")

module.exports = class AdminZite extends Zite {
    constructor() {
        super("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D")
        this.siteList = {}
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
        for (let site of this.siteList) {
            await this.cmdp("siteUpdate", site.address).then(() => signale.complete(`Site updated ${site.address}`))
            signale.start("Update site: " + site.address)
        }
    }

    async addSites(siteAddrs) {
        let count = siteAddrs.length
        if (count > 1)
            signale.info(` -- Adding ${count} sites to zeronet --`)
        else
            signale.debug("Add site: " + siteAddrs[0])
        for (let addr of siteAddrs)
            await this.cmdp("siteAdd", addr).catch(() => { })
    }

    isSiteExisted(siteAddr) {
        return this.siteAddrs.indexOf(siteAddr) >= 0
    }
}