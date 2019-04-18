const linksExtractor = require("./LinksExtractor"),
    signale = require("signale"),
    chillout = require('chillout')

module.exports.crawl = async function explore(dbSchema, siteDB, siteObj) {
    if (!siteDB || siteObj.runtimeInfo.lastCrawl.databaseScan > new Date - (process.env.DataBaseScanInterval || 7200000))
        return
    let tables = await siteDB.all("SELECT name FROM sqlite_master WHERE type='table'")
    for (let table of tables) {
        if (table.name === "sqlite_sequence")
            continue
        await pagingCrawl(siteDB, siteObj, table.name)
    }
    siteObj.runtimeInfo.lastCrawl.databaseScan = new Date()
}

async function pagingCrawl(siteDB, siteObj, table_name, start = 0, count = 3000) {
    signale.debug(`Scanning ${siteObj.basicInfo.address} db ${start}-${start + count} table: ${table_name}`)
    let rows = await siteDB.all(`SELECT * from ${table_name} limit ${count} offset ${start}`)
    if (rows.length === 0)
        return
    await chillout.forEach(rows, async row => {
        await chillout.forEach(row, async (val) => {
            if (typeof val === "string")
                await linksExtractor.findLinksAndSave(val, siteObj._id, "site")
        })
    })
    await pagingCrawl(siteDB, siteObj, table_name, start + count, count)
}