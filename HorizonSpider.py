import atexit
import os
import platform
import requests
from loguru import logger
from json import dump
from time import sleep, time
import argparse

import ZiteUtils
from Config import config
from os.path import join
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
        requests.get("http://"+config.ZeroNetAddr, headers={"ACCEPT": "text/html"})
        while True:
            try:
                ZeroHelloKey = ZiteUtils.getWrapperkey(
                    "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D")
            except (KeyboardInterrupt, SystemExit):
                raise
            except:
                logger.info("Not downloaded.Continue waiting.")
                sleep(60)


@logger.catch
def main():
    global ZeroHelloKey

    zSocket = ZeroWs(ZeroHelloKey)

    logger.info("Got ZeroHello wrapper key")

    zSocket.addZites(config.Initial_sites)

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
                                  ','.join(tuple(feeds.keys())),
                                  siteInfo["settings"].get("modified"),
                                  siteInfo["content"].get("domain"))

        logger.debug("Scanning files and feeds")

        links = scanAllFiles(siteInfo["address"], flat_feeds)

        logger.info("Got {0} links from {1}", len(links), siteInfo["address"])

        logger.debug("Request crawled links")
        zSocket.addZites(links)

        logger.debug("Analyze a few feeds via NLP")
        kw_feeds = ziteAnalyze.analyzeFeeds(flat_feeds[:20])

        logger.debug("Store analyzed feeds")
        sotrage.storeFeeds(kw_feeds, site_id)

    def scanAllFiles(site_addr, flat_feeds):
        links = ziteAnalyze.crawlLinksFeeds(flat_feeds)  # Get links in feeds

        logger.debug("Entered file scanning loop")
        # Get links in all files
        for folder, subs, files in os.walk(os.path.join(config.DataDir, site_addr)):
            for filename in files:
                name, ext = os.path.splitext(filename)
                if not filename in config.Skip_files:
                    if ext == ".html" or ext == ".htm":  # Scan address in these files
                        logger.debug("Scan file: {}", filename)
                        with open(os.path.join(folder, filename), 'rb') as src:
                            raw = src.read()
                            det = chardet.detect(raw)
                            if det:
                                encoding = det.get("encoding")
                            if not encoding:
                                encoding = "utf-8"
                            links |= ziteAnalyze.extractLinks_auto(
                                raw.decode(encoding, 'ignore'))
                    if ext == ".js":  # Analyze javascript code
                        pass
                        # TODO: Js files analyzing
        return links

    def updateCrawl(siteInfo, runTimeInfo):
        pass
        # TODO: Updaing crawl

    def crawlZeroName():
        logger.info("Started crawling ZeroName")
        ziteAnalyze.zeroName.reloadDomainData()
        zSocket.addZites(set(ziteAnalyze.zeroName.names.values()))

    @logger.catch
    def mainProcess():
        logger.info("Updating SiteList")
        siteList = zSocket.siteList()  # Update site list
        logger.debug("Sites count:{}", len(siteList))
        ziteAnalyze.zeroName.reloadDomainData()
        for siteinfo in siteList:
            if not siteinfo["address"] in config.Skip_sites:
                if sotrage.siteExist(siteinfo["address"]):
                    site_id = sotrage.getSiteId(siteinfo["address"])
                    run_time_info = sotrage.getSiteRuntimeData(site_id)
                    if time() - run_time_info[0] >= config.ReCrawlInterval:
                        logger.info(siteinfo["address"] +
                                    " Outdated: Re-fullCrawl")
                        fullCrawl(siteinfo)
                    else:
                        logger.info(siteinfo["address"] + " UpdateCrawl")
                        updateCrawl(siteinfo, run_time_info)
                else:  # First crawl
                    if siteinfo["bad_files"] == 0 and siteinfo["settings"]["size"] > 0:
                        logger.info(siteinfo["address"] +
                                    " New Site: fullCrawl")
                        fullCrawl(siteinfo)
                    else:  # Continue waiting
                        logger.info(siteinfo["address"] + " Not Downloaded")
                sotrage.conn.commit()
            else:
                logger.info("Skip site {}", siteinfo["address"])

    if args.crawlZeroName:
        crawlZeroName()

    while True:
        mainProcess()
        logger.info("No site left. Sleep ...")
        sleep(config.RunInterval)


if __name__ == "__main__":
    logger.info("Horizon spider started")

    parser = argparse.ArgumentParser()
    parser.add_argument("-crZN", "--crawlZeroName",
                        help="Crawl the site ZeroName first",
                        action="store_true")
    parser.add_argument("--reCrawl",
                        help="Re-crawl all sites",
                        action="store_true")
    parser.add_argument("-znRoot", "--zeronetRootDir",
                        help="Root dir of ZeroNet",
                        type=str)

    args = parser.parse_args()

    if args.zeronetRootDir:
        config.RootDir = args.zeronetRootDir
    if args.reCrawl:  # Delete database
        os.remove(config.DbName)

    try:
        waitForZeroHello()
        main()
    except KeyboardInterrupt:
        logger.warning("KeyboardInterrupt. Exiting")
