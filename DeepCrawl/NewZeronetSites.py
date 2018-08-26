import sqlite3
from SurfacePart import Database
from SurfacePart import Utils
from urllib.parse import urljoin
import traceback


class NZeroSites:
    def __init__(self, db_path):
        self.conn = sqlite3.connect(db_path)
        self.cur = self.conn.cursor()
        self.spidb = Database.Database(Database.FakeMain())

    def get_all_data(self):
        self.cur.execute("select * from sites")
        res = self.cur.fetchall()
        for row in res:
            try:
                url = Utils.process_link("http://127.0.0.1:43111/", row[2])
                if not Utils.filter_link(url):
                    continue
                self.spidb.insert_or_update_main_item(url=url, imgcount=0, title="", state=0, priority=1)
                self.spidb.commit_or_rollback()
            except:
                traceback.print_exc()

        self.spidb.commit_or_rollback()


if __name__ == '__main__':
    zl = NZeroSites(r"F:\ZeroNet\data\1LtvsjbtQ2tY7SCtCZzC4KhErqEK3bXD4n\data\zerosites.db")
    zl.get_all_data()
