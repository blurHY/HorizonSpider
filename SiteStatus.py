import Database
from ZeroHelloEnv import ZeroHelloEnv


class SiteStatus:
    def __init__(self):
        self.db = Database.Database(Database.FakeMain)

    def crawl(self):
        self.ZeroHelloEnv = ZeroHelloEnv()
        with self.ZeroHelloEnv.ws as ws:
            ws.async("siteList")
            while True:
                msg = ws.recv()
                if msg["cmd"] != "response":
                    continue
                self.db.site_status(msg["result"])
                break


if __name__ == '__main__':
    ss = SiteStatus()
    ss.crawl()
