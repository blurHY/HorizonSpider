import sqlite3
from SurfacePart import Database
from SurfacePart import Utils
import traceback
import DomainParse


class NZeroSites:
    def __init__(self, db_path):
        self.conn = sqlite3.connect(db_path)
        self.cur = self.conn.cursor()
        self.spidb = Database.Database(Database.FakeMain())
        self.dp = DomainParse.DomainParse()

    def get_all_data(self):
        self.cur.execute("select * from sites order by added desc")
        res = self.cur.fetchall()
        err = 0
        for row in res:
            if err > 200:
                break
            try:
                url = self.dp.ParseDomain_OrRetAddr(Utils.strip_url(row[2]))
                if not Utils.filter_zerosites(url):
                    print("Invalid", url)
                    continue
                print(url)
                self.spidb.insert_main_item(url=url, imgcount=0, title="", state=0, priority=1)
                self.spidb.commit_or_rollback()
            except Exception as e:
                print(e)
                err += 1

        self.spidb.commit_or_rollback()


if __name__ == '__main__':
    zl = NZeroSites(r"F:\ZeroNet\data\1LtvsjbtQ2tY7SCtCZzC4KhErqEK3bXD4n\data\zerosites.db")
    zl.get_all_data()
