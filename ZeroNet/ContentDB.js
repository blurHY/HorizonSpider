const sqlite = require("sqlite")
const path = require("path")

let contentDB = null

async function getContentDB() {
    if (contentDB && contentDB.open)
        return contentDB
    else
        return contentDB = await sqlite.open(path.join(process.env.ZeronetDataPath, "content.db"))
}

async function getOptionalFiles(site_addr, count, start, dateAfter = null) {
    await getContentDB()
    return await contentDB.all(`select * from file_optional where site_id=(select site_id from site where address = ?) ${dateAfter ? `and time_added > ${dateAfter}` : ""} order by time_added limit ? offset ?`, site_addr, count, start)
}

async function getLastItemDate(site_addr) {
    await getContentDB()
    return await parseInt(contentDB.each(`select * from file_optional where site_id=(select site_id from site where address = ?) order by time_added desc limit 1`), site_addr)
}

module.exports = {getContentDB, getOptionalFiles, getLastItemDate}
