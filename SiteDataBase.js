const siteMeta = require("./SiteMeta")
const sqlite3 = require("sqlite3").verbose()
const path = require("path")


function getSiteDataBase(siteAddr) {
    let dbSchema = siteMeta.getDBJson(siteAddr)
    if (!dbSchema)
        return null
    let joined = path.resolve(process.env.ZeronetDataPath, siteAddr, dbSchema.db_file)
    if (!joined.startsWith(path.resolve(process.env.ZeronetDataPath, siteAddr)))
        throw Error("Path disallowed: " + joined)
    return new sqlite3.Database(joined)
}

module.exports = {getSiteDataBase}
