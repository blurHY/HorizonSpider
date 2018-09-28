# coding: utf-8

from Database import *
from Urlmanager import Urlmanager
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
from selenium.common.exceptions import *

from DomainParse import DomainParse


class ZeronetSpider:
    wait_sec = 10000
    allow_wait = False

    def __init__(self):
        print("Initing")
        self.database = Database(self)
        self.database2 = Database(self)
        self.urlmanager = Urlmanager(self)
        self.browser = Browser()
        self.urldownloader = Urldownloader(self)
        self.store = Store(self)
        self.crawler = Crawler(self)
        self.domain = DomainParse()
        self.count = 0

    def quit(self):
        print("Quit")
        sys.exit()

    def crawl(self, url, priority, id):
        # 在父页面的优先级上加一
        print("Priority Now is {}".format(priority))
        try:
            originalUrl = url
            url = self.domain.url_domain_to_address(removeWrapperNonce(url))

            if originalUrl != url:
                self.database.update_main_item(id, True, url=url)

            longurl = longer_url(url)
            print("Parsed to " + longurl)
            if not filter_link_before_crawl(longurl):
                self.database.url_scraped(id)
                return
            self.urldownloader.get(longurl)
            data = self.crawler.crawl_page(longurl)  # joined url
            if data:
                data["subpage_priority"] = priority + 1
                data["priority"] = priority
                self.store.store_item(**data)
                self.database.url_scraped(id)

                self.database.commit_or_rollback()
        except UnexpectedAlertPresentException:
            self.browser.safe_operation(lambda: None)
        except RowDeletedException:
            pass
        except Exception as e:
            print(e)
            self.database.update_main_item(id, priority=priority + 1)  # 发生错误时降低优先级

    def run(self):
        print("Run---------")
        res = self.database.url_pop()
        if res is None:
            sys.exit()
        else:
            getone, priority, id = res
            print("Got url:{0} and its Priority is {1}".format(getone, priority))
            self.crawl(getone, priority, id)

    def start(self):
        print("Start")

        # self.database.reset_scraping_but_not_success()
        # self.database.commit_or_rollback()

        while True:
            try:
                last = time.time()
                self.run()
                duration = time.time() - last
                print("Total time: {}".format(duration))
                self.database.crawl_duration_add(duration)
            except Exception as e:
                print(traceback.format_exc(), "Error")


if __name__ == '__main__':
    znspider = ZeronetSpider()
    znspider.start()

"""
priority 优先级 0最高，跟递归层次有关，实现广度优先
"""
