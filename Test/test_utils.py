import sys

sys.path.append('../SurfacePart')
from Utils import *


class TestUtils:
    def test_filter_link_before_crawl(self):
        assert filter_link_before_crawl("abc.bit")
        assert filter_link_before_crawl("abc.bit/")
        assert filter_link_before_crawl("1SFsdfs/")
        assert filter_link_before_crawl("1SFsdfs/a.html")
        assert filter_link_before_crawl("a.bit/a.html")
        assert filter_link_before_crawl("a.bit/a.htm")
        assert not filter_link_before_crawl("a.bit/a.zip")
        assert not filter_link_before_crawl("123/a.zip")
