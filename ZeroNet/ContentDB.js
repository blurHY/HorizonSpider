const sqlite = require("sqlite")
const path = require("path")
const SQL = require("sql-template-strings")

let contentDB = null

async function getContentDB() {
    if (contentDB && contentDB.open)
        return contentDB
    else
        return contentDB = await sqlite.open(path.join(process.env.ZeronetDataPath, "content.db"))
}

async function getOptionalFiles(site_addr, count, start) {
    let db = await getContentDB()
    return await db.all(SQL`select * from file_optional where site_id=(select site_id from site where address = ${site_addr})  limit ${count} offset ${start}`)
}

module.exports = {getContentDB, getOptionalFiles}
