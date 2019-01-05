import sqlite3
from Config import config
from time import time
import atexit


class DataStorageException(Exception):
    pass


class DataStorage:

    def __init__(self):
        self.conn = sqlite3.connect(config.DbName)
        self.checkDb()

    def checkDb(self):
        cur = self.conn.cursor()
        cur.execute("""
    CREATE  TABLE if not exists "site" (
	"id"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "addr"  TEXT NOT NULL,
	"title"	TEXT,
	"peer"	INTEGER NOT NULL,
	"description"	TEXT,
	"files_type"	TEXT,
	"userdata_ratio"	INTEGER,
	"size"	INTEGER,
	"optional_size"	INTEGER,
	"optional_files_type"	INTEGER,
	"feeds_count"	INTEGER,
    "feeds_keys" TEXT,
    "last_modified" INTEGER,
    "domain" TEXT
)""")
        cur.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS site_id_addr ON site (id,addr) ")
        cur.execute("""
    CREATE TABLE if not exists "feed" (
	"site_id"	INTEGER NOT NULL,
	"feed_id"	INTEGER NOT NULL,
    "date_added"	INTEGER NOT NULL,
	"type"	TEXT NOT NULL,
    "url"	TEXT NOT NULL,
	"title"	TEXT NOT NULL,
	"keywords"	TEXT NOT NULL,
	PRIMARY KEY("site_id","feed_id")
);""")
        cur.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS feed_id_id ON feed (site_id,feed_id) ")
        cur.execute("""
    CREATE  TABLE if not exists "site_runtime" (
	"id"	INTEGER NOT NULL PRIMARY KEY,
	"last_crawl"	INTEGER NOT NULL
)""")
        self.conn.commit()

    def close(self):
        self.conn.close()

    def addSite(self, *args):
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO site VALUES (NULL,?,?,?,?,?,?,?,?,?,?,?,?,?)", args)
        sid = self.getSiteId(args[0])
        cur.execute(
            "INSERT OR REPLACE INTO site_runtime VALUES (?,?)", (sid, time()))
        return sid

    def getSiteRuntimeData(self, site_id):
        cur = self.conn.cursor()
        cur.execute(
            "SELECT last_crawl FROM site_runtime WHERE id=?", (site_id,))
        return cur.fetchone()

    def updateSite(self, site_id, *args):
        cur = self.conn.cursor()
        cur.execute("UPDATE site SET (?,?,?,?,?,?,?,?,?,?,?) WHERE id=?",
                    (site_id,)+args+(site_id,))
        sid = self.getSiteId(args[0])
        cur.execute(
            "INSERT OR REPLACE INTO site_runtime VALUES (?,?)", (sid, time()))

    def addFeed(self, site_id):
        cur = self.conn.cursor()

    def siteExist(self, addr):
        cur = self.conn.cursor()
        cur.execute("select count(*) from site where addr=?", (addr,))
        return bool(cur.fetchone()[0])

    def getSiteId(self, addr):
        cur = self.conn.cursor()
        cur.execute("SELECT id FROM site WHERE addr=?", (addr,))
        try:
            return cur.fetchone()[0]
        except:
            raise DataStorageException("Site doesn't exist")

    def storeFeeds(self, feeds, site_id, truncate=True):  # Truncate and store
        cur = self.conn.cursor()
        x = 0
        if truncate:
            cur.execute("DELETE FROM feed WHERE site_id=?", (site_id,))
        for feed in feeds:
            cur.execute("INSERT INTO feed VALUES(?,?,?,?,?,?,?)",
                        (site_id, x, feed["date_added"], feed["type"],
                         feed["url"], feed["title"], ','.join(feed["keywords"])))
            x += 1


if __name__ == "__main__":
    ds = DataStorage()
    print(ds.getSiteRuntimeData(1))
