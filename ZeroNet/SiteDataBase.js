const siteMeta = require("./SiteMeta")
const sqlite = require("sqlite")
const path = require("path")


async function getSiteDataBase(siteAddr) {
    let dbSchema = siteMeta.getDBJson(siteAddr)
    if (!dbSchema)
        return null
    let joined = path.resolve(process.env.ZeronetDataPath, siteAddr, dbSchema.db_file)
    if (!joined.startsWith(path.resolve(process.env.ZeronetDataPath, siteAddr)))
        throw Error("Path disallowed: " + joined)
    return await sqlite.open(joined)
}

module.exports = {getSiteDataBase}
