from os.path import join
from loguru import logger

RootDir = 'D:/ZeroNet/'
DataDir = join(RootDir, "data")
RunInterval = 120  # Checking siteInfo
DbName = "./horizon_data.db"
Skip_sites = [
    "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D",
    "1MaiL5gfBM1cyb4a8e3iiL8L5gXmoAJu27",
    "1SiTEs2D3rCBxeMoLHXei2UYqFcxctdwB",
    "1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F"
]  # Excluded in normal crawling functions. There are special crawlers for them
ReCrawlInterval = 86400  # Fullly crawl once again : 24 hours
ZeroNetAddr = u"127.0.0.1:43110"
DomainReloadInterval = 43200  # 12 hours
Skip_files = [
    "dbschema.json",
    "content.json"
]
logger.add(".log", retention="10 Days")
Initial_sites = [
    "186THqMWuptrZxq1rxzpguAivK3Bs6z84o"
]  # Start crawling from them
