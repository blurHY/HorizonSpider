import sys

sys.path.append('../SurfacePart')
from Log import Log
from Crawler import Crawler
from Urldownloader import Urldownloader
from Browser import Browser
from Utils import *
import pytest


class TestCrawl:
    def setup_class(self):
        self.main = FakeMain()
        self.crawler = Crawler(self.main)

    def test_alert(self):
        longurl = "http://127.0.0.1:43111/16ukkCqajCuuXUNu32Hwm5sJUZU3FWjTLc"
        self.main.urldownloader.get(longurl)
        self.crawler.crawl_page(longurl)


class FakeMain:
    def __init__(self):
        self.log = Log()
        self.urldownloader = Urldownloader(self)
        self.browser = Browser()
        self.crawler = Crawler(self)
