from os.path import join
from loguru import logger


class Config:
    def __init__(self):
        self._RootDir = '/ZeroBundle/ZeroNet/'
        self._sitesJson = ""

        self.RootDir = '/mnt/d/ZeroNet/'
        self.DataDir = join(self.RootDir, "data")
        self.RunInterval = 120  # Checking siteInfo
        self.DbName = "./horizon_data.db"
        self.Skip_sites = [
            "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D",
            "1MaiL5gfBM1cyb4a8e3iiL8L5gXmoAJu27",
            "1SiTEs2D3rCBxeMoLHXei2UYqFcxctdwB",
            "1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F"
        ]  # Excluded in normal crawling functions. There are special crawlers for them
        self.ReCrawlInterval = 86400  # Fullly crawl once again : 24 hours
        self.ZeroNetAddr = u"127.0.0.1:43110"
        self.DomainReloadInterval = 43200  # 12 hours
        self.Skip_files = [
            "dbschema.json",
            "content.json"
        ]
        logger.add(".log", retention="10 Days")
        self.Initial_sites = [
            "186THqMWuptrZxq1rxzpguAivK3Bs6z84o"
        ]  # Start crawling from them

    @property
    def RootDir(self):
        return self._RootDir

    @RootDir.setter
    def RootDir(self, value):
        self._RootDir = value
        self.DataDir = join(value, 'data')
        self._sitesJson = join(self.DataDir, "sites.json")

    @property
    def ContentDbPath(self):
        return join(self.DataDir, "content.db")

    @property
    def sitesJson(self):
        return self._sitesJson


config = Config()
