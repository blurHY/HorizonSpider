const linksExtractor = require("./LinksExtractor")

module.exports.crawl = async function explore(dbSchema, siteDB, siteObj) {
    if (!siteDB)
        return
    let tables = await siteDB.all("SELECT name FROM sqlite_master WHERE type='table'")
    for (let table of tables) {
        await pagingCrawl(siteDB, siteObj, table.name)
    }
}

async function pagingCrawl(siteDB, siteObj, table_name, start = 0, count = 300) {
    let rows = await siteDB.all(`SELECT * from ${table_name} limit ${count} offset ${start}`)
    if (rows.length > 0) {
        for (let row of rows) {
            for (let field_name in row) {
                if (typeof row[field_name] === "string")
                    await linksExtractor.findLinksAndSave(row[field_name], siteObj._id, "site")
            }
        }
        await pagingCrawl(siteDB, siteObj, table_name, start + count, count)
    }
}