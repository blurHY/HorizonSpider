require('dotenv').config()
const siteMeta = require('./SiteMeta')
const sqlite3 = require('sqlite3').verbose();
const conf = require("./Config")
const path = require('path')
const sql_parse = require('node-sqlparser').parse

let excepted_tables = new Set(["json", "sqlite_sequence"])

function getSiteDataBase(siteAddr) {
    let dbsj = siteMeta.getDBJson(siteAddr)
    let joined = path.resolve(conf.DataPath, siteAddr, dbsj.db_file)
    if (!joined.startsWith(path.resolve(conf.DataPath, siteAddr)))
        throw Error("Path disallowed: " + joined)
    return new sqlite3.Database(joined)
}

function getAllTextCols(db) {
    let db_cols = {} // db_name:[col1,col2,...]
    db.all("select name,sql from sqlite_master where type='table'", (err, rows) => {
        for (let table of rows) {
            if (excepted_tables.has(table.name) || !table.sql)
                continue;
            let parsedSql = sql_parse(table.sql)
            let cols_collected = []
            for (let col of parsedSql.columns)
                if (col.type.type === "TEXT")
                    cols_collected.push(col.name);
            db_cols[table.name] = cols_collected
        }
    })
    return db_cols
}

let db = getSiteDataBase("1KkHNyD9TA5bi4gwGDYuTKSWp94MQEqrS1")