import sqlite3
from contextlib import closing
from Config import *
from loguru import logger


class ContentDb:
    DbPath = DataDir + "\\content.db"

    def __init__(self):
        logger.debug("Content Db path {}".format(self.DbPath))
        self.conn = sqlite3.connect(self.DbPath)

    def getSiteOptionalFileCount(self, site_id):
        with closing(self.conn.cursor()) as c:
            c.execute(
                "select count(*) from file_optional where site_id='{}'".format(site_id))
            res = c.fetchone()
            if len(res) > 0:
                return res[0]

    def getSiteId(self, addr):
        with closing(self.conn.cursor()) as c:
            c.execute("select site_id from site where address='{}'".format(addr))
            res = c.fetchone()
            if len(res) > 0:
                return res[0]

    def getSiteOptionalFileList(self, site_id):
        with closing(self.conn.cursor()) as c:
            c.execute(
                "select inner_path,peer,size from file_optional where site_id='{}'".format(site_id))
            return c.fetchall()


if __name__ == "__main__":
    cd = ContentDb()
    sid = cd.getSiteId("18Pfr2oswXvD352BbJvo59gZ3GbdbipSzh")
    print(cd.getSiteOptionalFileList(sid)[:5])
