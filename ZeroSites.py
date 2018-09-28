import sqlite3
import Database
import Utils
import DomainParse


class ZeroSites:
    def __init__(self, db_path):
        self.conn = sqlite3.connect(db_path)
        self.cur = self.conn.cursor()
        self.spidb = Database.Database(Database.FakeMain())
        self.dp = DomainParse.DomainParse()

    def get_all_data(self):
        self.cur.execute("select * from site order by date_added desc")
        res = self.cur.fetchall()
        err = 0
        for row in res:
            if err > 150:
                break
            try:
                url = self.dp.ParseDomain_OrRetAddr(Utils.strip_url(row[5]))
                if not Utils.filter_zerosites(url):
                    print("Invalid", url)
                    continue
                print(url)
                self.spidb.insert_main_item(url=url, imgcount=0, title=row[3], state=0, priority=1)
                self.spidb.commit_or_rollback()
                pageid = self.spidb.get_main_item_id(url)
                phrs = []

                if row[3]:
                    phrs.append(row[3])
                if row[4]:
                    phrs.append(row[4])

                if len(phrs) > 0:
                    self.spidb.add_phrases(pageid, phrs)
            except Exception as e:
                print(e)
                err += 1

        self.spidb.commit_or_rollback()


if __name__ == '__main__':
    zl = ZeroSites(r"F:\ZeroNet\data\1SiTEs2D3rCBxeMoLHXei2UYqFcxctdwB\data\users\zerosites.db")
    zl.get_all_data()
