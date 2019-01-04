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
import chardet


def waitForZeroHello():
    try:
        global ZeroHelloKey
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


@logger.catch
def main():
    global ZeroHelloKey
    zSocket = ZeroWs(ZeroHelloKey)

    logger.info("Got ZeroHello wrapper key")

    zSocket.addZites(Initial_sites)

    logger.info("Initial sites added")

    ziteAnalyze = ZiteAnalyze()
    contentDb = ContentDb()
    sotrage = DataStorage()

    atexit.register(sotrage.close)

    def fullCrawl(siteInfo):
        fileList = zSocket.fileList("./", siteInfo["address"])
        cdb_id = contentDb.getSiteId(siteInfo["address"])
        opFileList = contentDb.getSiteOptionalFileList(cdb_id)
        userDataFileList = zSocket.fileList(
            "./data/users", siteInfo["address"])
        dbschema = zSocket.getDbschema(siteInfo["address"])
        feeds = zSocket.crawlFeeds(siteInfo["address"], dbschema)
        flat_feeds = ziteAnalyze.feedsFlatten(feeds)
        logger.info("Got {0} feeds from {1}", len(
            flat_feeds), siteInfo["address"])
        site_id = sotrage.addSite(siteInfo["address"],
                                  siteInfo["content"].get("title"),
                                  siteInfo["peers"],
                                  siteInfo["content"].get("description"),
                                  ziteAnalyze.fileTypes(fileList),
                                  ziteAnalyze.
                                  getUserDataRatio(siteInfo,
                                                   len(userDataFileList) if userDataFileList is list else 0),
                                  siteInfo["settings"]["size"],
                                  siteInfo["settings"]["size_optional"],
                                  ziteAnalyze.optionalFileTypes(opFileList),
                                  len(flat_feeds),
                                  ','.join(tuple(feeds.keys())))

        links = scanAllFiles(siteInfo["address"], flat_feeds)

        zSocket.addZites(links)
        kw_feeds = ziteAnalyze.analyzeFeeds(
            flat_feeds[:20])  # Crawl first 20 feeds
        sotrage.storeFeeds(kw_feeds, site_id)

        logger.info("Got {0} links from {1}", len(links), siteInfo["address"])

    def scanAllFiles(site_addr, flat_feeds):
        links = ziteAnalyze.crawlLinksFeeds(flat_feeds)  # Get links in feeds
        # Get links in all files
        for folder, subs, files in os.walk(os.path.join(DataDir, site_addr)):
            for filename in files:
                name, ext = os.path.splitext(filename)
                if not filename in Skip_files:
                    if ext == ".html" or ext == ".htm":  # Scan address in these files
                        with open(os.path.join(folder, filename), 'rb') as src:
                            raw = src.read()
                            det = chardet.detect(raw)
                            links |= ziteAnalyze.extractLinks_auto(
                                raw.decode(det["encoding"] if det and det.get("encoding") else "utf-8", 'ignore'))
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
                        logger.info(siteinfo["address"] +
                                    " Outdated,Re-fullCrawl")
                        fullCrawl(siteinfo)
                    else:
                        logger.info(siteinfo["address"] + " UpdateCrawl")
                        updateCrawl(siteinfo, run_time_info)
                else:  # First crawl
                    if siteinfo["bad_files"] == 0 and siteinfo["settings"]["size"] > 0:
                        logger.info(siteinfo["address"] +
                                    " New Site,fullCrawl")
                        fullCrawl(siteinfo)
                    else:  # Continue waiting
                        logger.info(siteinfo["address"] + " Not Downloaded")
                sotrage.conn.commit()
            else:
                logger.info("Skip site {}", siteinfo["address"])

        sleep(RunInterval)


if __name__ == "__main__":
    logger.info("Horizon spider started")
    waitForZeroHello()
    main()
