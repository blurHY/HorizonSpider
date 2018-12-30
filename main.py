from Config import *
from ZeroWs import ZeroWs
from ZiteAnalyze import ZiteAnalyze
from ContentDb import ContentDb
from DataStorage import DataStorage
from time import sleep
from json import dump
import atexit

import importlib.util
spec = importlib.util.spec_from_file_location("site", "./site.py")
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)

print("Horizon spider started")

ZeroHelloKey = site.getWrapperkey(
    "D:\ZeroNet\data", "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D")

zSocket = ZeroWs(ZeroHelloKey)

print("Got wrapper key")

ziteAnalyze = ZiteAnalyze()
contentDb = ContentDb()
sotrage = DataStorage()

atexit.register(sotrage.close)


def fullCrawl(siteInfo):
    fileList = zSocket.fileList("./", siteinfo["address"])
    cdb_id = contentDb.getSiteId(siteinfo["address"])
    opFileList = contentDb.getSiteOptionalFileList(cdb_id)
    userDataFileList = zSocket.fileList("./data/users", siteinfo["address"])
    if siteinfo["feed_follow_num"] and siteinfo["feed_follow_num"] > 0:
        feeds = zSocket.crawlFeeds(siteinfo["address"])
    else:
        feeds = {}
    flat_feeds = ziteAnalyze.feedsFlatten(feeds)

    site_id = sotrage.addSite(siteinfo["address"],
                              siteinfo["content"].get("title"),
                              siteinfo["peers"],
                              siteinfo["content"].get("description"),
                              ziteAnalyze.fileTypes(fileList),
                              ziteAnalyze.
                              getUserDataRatio(
        siteInfo, len(userDataFileList) if userDataFileList is list else 0),
        siteinfo["settings"]["size"],
        siteinfo["settings"]["size_optional"],
        ziteAnalyze.optionalFileTypes(opFileList),
        len(flat_feeds),
        ','.join(tuple(feeds.keys())))

    kw_feeds = ziteAnalyze.analyzeFeeds(flat_feeds[:20])
    sotrage.storeFeeds(kw_feeds, site_id)


while True:
    siteList = zSocket.siteList()  # Update site list
    for siteinfo in siteList:
        if sotrage.siteExist(siteinfo["address"]):
            print(siteinfo["address"] + "Update")
            # TODO: Updating Crawling
        else:  # First crawl
            print(siteinfo["address"] + "New Site")
            fullCrawl(siteinfo)
        sotrage.conn.commit()

    sleep(RunInterval)
