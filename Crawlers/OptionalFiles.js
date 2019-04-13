const ContentDB = require("../ZeroNet/ContentDB"),
    DataBase = require("../DataBase")
const signale = require("signale")

async function updateOptionalFiles(dbSchema, siteDB, siteObj) {
    if (!siteDB)
        return

    let lastDate = 0

    if ((siteObj.runtimeInfo.lastCrawl.optional.full > new Date() - process.env.optionalFull_period)) {
        if (siteObj.runtimeInfo.lastCrawl.optional.check < new Date() - process.env.optionalCheck_period) { // New files only
            signale.info(`Checking for new optional files ${siteObj.basicInfo.address}`)
            lastDate = siteObj.runtimeInfo.lastCrawl.optional.check
            siteObj.runtimeInfo.lastCrawl.optional.check = new Date()
        } else
            signale.info(`Stored optional files are up to date ${siteObj.basicInfo.address}`)
    } else {
        signale.info("Re-crawl all optional files for " + siteObj.basicInfo.address)
        if (siteObj.runtimeInfo.lastCrawl.optional.full === 0)
            signale.info("lastCrawl.optional.full is 0")
        siteObj.optionalFiles.splice(0) // Clear old data and re-query all optionalFiles, but leave records
        siteObj.runtimeInfo.lastCrawl.optional.full = new Date()
    }

    await pagingQuery(siteDB, siteObj, 3000, 0, lastDate)
}


async function pagingQuery(siteDB, siteObj, count = 3000, start = 0, dateAfter = null) {
    let rowsToAdd = []
    signale.info(`Fetching optional files ${start}-${start + count} for ${siteObj.basicInfo.address}`)
    let rows = await ContentDB.getOptionalFiles(siteObj.basicInfo.address, count, start, dateAfter)

    if (!rows || rows.length === 0) {
        signale.info(`No optional files found ${siteObj.basicInfo.address}`)
        return
    }

    for (let row of rows) {
        let obj = {
            inner_path: row.inner_path,
            hash_id: row.hash_id,
            size: row.size,
            peer: row.peer,
            time_added: row.time_added,
            extra: {} // That field name is from ZeroUp
        }
        rowsToAdd.push(obj)
    }

    await DataBase.addOptionalFiles(siteObj, rowsToAdd)
    await pagingQuery(siteDB, siteObj, count, start + count)
}

module.exports = { crawl: updateOptionalFiles }