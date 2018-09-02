# coding: utf-8

from Database import Database
from Urlmanager import Urlmanager
from Log import Log
from Crawler import Crawler
from Urldownloader import Urldownloader
from Store import Store
from Browser import Browser
import time
import sys
import signal
import traceback
import threading
from Utils import *


class ZeronetSpider:
    wait_sec = 10
    allow_wait = False

    def __init__(self):
        self.log = Log()
        self.log.log("Initing", "Info")
        self.database = Database(self)
        self.database2 = Database(self)
        self.urlmanager = Urlmanager(self)
        self.urldownloader = Urldownloader(self)
        self.browser = Browser()
        self.store = Store(self)
        self.crawler = Crawler(self)

    def quit(self):
        self.log.log("Quit", "Info")
        sys.exit()

    def crawl(self, url, priority):
        # 在父页面的优先级上加一
        self.log.log("Priority Now is {}".format(priority))
        try:
            longurl = longer_url(url)
            if not filter_link_before_crawl(longurl):
                self.database.url_scraped(url)
                return
            self.urldownloader.get(longurl)
            data = self.crawler.crawl_page(longurl)  # joined url
            if data:
                data["subpage_priority"] = priority + 1
                data["priority"] = priority
                self.store.store_item(**data)
                self.database.url_scraped(url)

                self.database.commit_or_rollback()
        except Exception as e:
            self.log.log(e, "Info")
            self.database.update_main_item(url, priority=priority + 1)  # 发生错误时降低优先级

    def run(self):
        self.log.log("Run---------", "Info")
        res = self.database.url_pop()
        if res is None:
            self.log.log("Start crawling from ZeroHello", "Info")

            self.log.log("Wait for syncing.", "Info")
            time.sleep(self.wait_sec)

            self.crawl("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D", 0)
        else:
            getone, priority, id = res
            self.log.log("Got url:{0} and its Priority is {1}".format(getone, priority), "Info")
            self.crawl(getone, priority)

    def start(self):
        self.log.log("Start", "Info")

        # self.database.reset_scraping_but_not_success()
        # self.database.commit_or_rollback()

        while True:
            try:
                self.run()
            except:
                self.log.log(traceback.format_exc(), "Error")


if __name__ == '__main__':
    znspider = ZeronetSpider()
    znspider.start()

"""
priority 优先级 0最高，跟递归层次有关，实现广度优先
"""
