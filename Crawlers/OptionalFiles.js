const ContentDB = require("../ZeroNet/ContentDB")
const basename = require("path").basename
const signale = require("signale")

async function updateOptionalFiles(dbSchema, siteDB, siteObj) {
    if (!siteDB)
        return

    let count = 0
    try {
        count = await siteDB.each("select count(*) from file limit 1")
    } catch (e) {
        signale.info("No additional data for optional files")
    }

    let maxDate = siteObj.runtimeInfo.lastCrawl.optional.itemDate

    if ((siteObj.runtimeInfo.lastCrawl.optional.full > new Date() - process.env.optionalFull_Period) && maxDate > 0) {
        if (siteObj.runtimeInfo.lastCrawl.optional.check < new Date() - process.env.optionalCheck_Peroid) { // New feeds only
            siteObj.runtimeInfo.lastCrawl.optional.check = new Date()
            siteObj.runtimeInfo.lastCrawl.optional.itemDate = await ContentDB.getLastItemDate(siteObj.basicInfo.address)
        } else
            signale.info(`Stored optional files are up to date ${siteObj.basicInfo.address}`)
    } else {
        siteObj.optionalFiles.splice(0) // Clear old data and re-query all optionalFiles, but leave records
        siteObj.runtimeInfo.lastCrawl.optional.full = new Date()
        maxDate = null
    }

    await pagingQuery(siteDB, siteObj, count, 3000, 0, maxDate > 0 ? maxDate : null)
}


async function pagingQuery(siteDB, siteObj, addiCount, count = 3000, start = 0, dateAfter = null) {
    let rowsToAdd = []
    for (let offset = start; offset < start + count; offset += count) {
        let rows = await ContentDB.getOptionalFiles(siteObj.basicInfo.address, count, offset, dateAfter)
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
    signale.info(`Imported ${rowsToAdd.length} rows of optional file info`)
    await pagingQuery(siteDB, siteObj, addiCount, count, start + count)
}

module.exports = { crawl: updateOptionalFiles }