import atexit
import os
import platform
import requests
from loguru import logger
from json import dump
from time import sleep, time

import ZiteUtils
from Config import *
from ContentDb import ContentDb
from DataStorage import DataStorage
from ZeroWs import ZeroWs
from ZiteAnalyze import ZiteAnalyze

logger.info("Horizon spider started")

try:
    ZeroHelloKey = ZiteUtils.getWrapperkey(
        "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D")
except:
    logger.warning("ZeroHello has not been downloaded yet")
    requests.get("http://"+ZeroNetAddr, headers={"ACCEPT": "text/html"})
    while True:
        try:
            ZeroHelloKey = ZiteUtils.getWrapperkey(
                "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D")
        except:
            logger.info("Not downloaded.Continue waiting.")
            sleep(60)

zSocket = ZeroWs(ZeroHelloKey)

logger.info("Got ZeroHello wrapper key")

zSocket.addZites(Initial_sites)

logger.info("Initial sites added")

ziteAnalyze = ZiteAnalyze()
contentDb = ContentDb()
sotrage = DataStorage()

atexit.register(sotrage.close)


def fullCrawl(siteInfo):
    fileList = zSocket.fileList("./", siteinfo["address"])
    cdb_id = contentDb.getSiteId(siteinfo["address"])
    opFileList = contentDb.getSiteOptionalFileList(cdb_id)
    userDataFileList = zSocket.fileList(
        "./data/users", siteinfo["address"])
    if siteinfo["feed_follow_num"] and siteinfo["feed_follow_num"] > 0:
        feeds = zSocket.crawlFeeds(siteinfo["address"])
    else:
        feeds = {}

    flat_feeds = ziteAnalyze.feedsFlatten(feeds)

    logger.info("Got {0} feeds from {1}", len(flat_feeds), siteinfo["address"])

    site_id = sotrage.addSite(siteinfo["address"],
                              siteinfo["content"].get("title"),
                              siteinfo["peers"],
                              siteinfo["content"].get("description"),
                              ziteAnalyze.fileTypes(fileList),
                              ziteAnalyze.
                              getUserDataRatio(siteInfo,
                                               len(userDataFileList) if userDataFileList is list else 0),
                              siteinfo["settings"]["size"],
                              siteinfo["settings"]["size_optional"],
                              ziteAnalyze.optionalFileTypes(opFileList),
                              len(flat_feeds),
                              ','.join(tuple(feeds.keys())))

    links = scanAllFiles(siteinfo["address"], flat_feeds)

    zSocket.addZites(links)
    kw_feeds = ziteAnalyze.analyzeFeeds(
        flat_feeds[:20])  # Crawl first 20 feeds
    sotrage.storeFeeds(kw_feeds, site_id)

    logger.info("Got {0} links from {1}", len(links), siteinfo["address"])


def scanAllFiles(site_addr, flat_feeds):
    links = ziteAnalyze.crawlLinksFeeds(flat_feeds)  # Get links in feeds
    # Get links in all files
    for folder, subs, files in os.walk(os.path.join(DataDir, site_addr)):
        for filename in files:
            name, ext = os.path.splitext(filename)
            if not filename in Skip_files:
                if ext == ".html" or ext == ".htm":  # Scan address in these files
                    with open(os.path.join(folder, filename), 'r', encoding='UTF-8') as src:
                        links |= ziteAnalyze.extractLinks_auto(src.read())
                if ext == ".js":  # Analyze javascript code
                    pass
                    # TODO: Js files analyzing
    return links


def updateCrawl(siteInfo, runTimeInfo):
    pass
    # TODO: Updaing crawl


while True:
    siteList = zSocket.siteList()  # Update site list
    logger.info("SiteList Updated")
    logger.debug("Sites count:{}", len(siteList))
    
    for siteinfo in siteList:
        if not siteinfo["address"] in Skip_sites:
            if sotrage.siteExist(siteinfo["address"]):
                site_id = sotrage.getSiteId(siteinfo["address"])
                run_time_info = sotrage.getSiteRuntimeData(site_id)
                if time() - run_time_info[0] >= ReCrawlInterval:
                    logger.info(siteinfo["address"] + " Outdated,Re-fullCrawl")
                    fullCrawl(siteinfo)
                else:
                    logger.info(siteinfo["address"] + " UpdateCrawl")
                    updateCrawl(siteinfo, run_time_info)
            else:  # First crawl
                if siteinfo["bad_files"] == 0 and siteinfo["settings"]["size"] > 0:
                    logger.info(siteinfo["address"] + " New Site,fullCrawl")
                    fullCrawl(siteinfo)
                else:  # Continue waiting
                    logger.info(siteinfo["address"] + " Not Downloaded")
            sotrage.conn.commit()
        else:
            logger.info("Skip site {}", siteinfo["address"])

    sleep(RunInterval)
