import sys

sys.path.append('..\SurfacePart')
from Log import Log
from Crawler import Crawler
from Urldownloader import Urldownloader
from Browser import Browser
from Utils import *
import time


class TestCrawl:
    def setup_class(self):
        self.main = FakeMain()
        self.crawler = Crawler(self.main)

    def test_alert(self):
        longurl = "http://127.0.0.1:43111/1Atifm3m3wqUo7RqD2GPnyG6PKSxCk3g4c/ZeroCalc/quadratic.html"
        for x in range(1, 50):
            self.main.urldownloader.get(longurl)
            try:
                self.crawler.crawl_page(longurl)
            except Exception:
                pass
            time.sleep(2)


class FakeMain:
    def __init__(self):
        self.log = Log()
        self.browser = Browser()
        self.urldownloader = Urldownloader(self)
        self.crawler = Crawler(self)


if __name__ == '__main__':
    tc = TestCrawl()
    tc.setup_class()
    tc.test_alert()
