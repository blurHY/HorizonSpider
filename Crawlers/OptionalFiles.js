const ContentDB = require("../ZeroNet/ContentDB")
const basename = require("path").basename
const DataBase = require("../DataBase")
const log = require("../Logger")

async function updateOptionalFiles(dbSchema, siteDB, siteObj) {
    if (!siteDB)
        return

    let count = 0
    try {
        count = await siteDB.each("select count(*) from file limit 1")
    } catch (e) {
        log("info", "spider", "No additional data for optional files")
    }

    await pagingQuery(siteDB, siteObj, count, 3000, 0)
}


async function pagingQuery(siteDB, siteObj, addiCount, count = 3000, start = 0) {
    let rowsToAdd = []
    for (let offset = start; offset < start + count; offset += count) {
        let rows = await ContentDB.getOptionalFiles(siteObj.basicInfo.address, count, offset)
        if (!rows || rows.length === 0)
            return
        for (let row of rows) {
            let obj = {
                inner_path: row.inner_path,
                hash_id: row.hash_id,
                size: row.size,
                peer: row.peer,
                time_added: row.time_added,
                extra: {} // That field name is from ZeroUp
            }
            try {
                if (addiCount)
                    obj.extra = await siteDB.each(`select * from file where file_name=? limit 1`, basename(row.inner_path))
            } catch {

            }
            rowsToAdd.push(obj)
        }
    }
    await siteObj.addOptionalFiles(rowsToAdd)
    log("info", "spider", `Imported ${rowsToAdd.length} rows of optional file info`)
    await pagingQuery(siteDB, siteObj, addiCount, count, start + count)
}

module.exports = {crawl: updateOptionalFiles}