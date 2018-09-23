import re
from Utils import *


class Store:
    def __init__(self, main):
        self.main = main

    def store_item(self, title, img_count, url, phrases, keywords, subpage_urls, priority, subpage_priority):
        shorturl = shorted_url(url)
        self.main.database.insert_or_update_main_item(url=shorturl, imgcount=img_count, title=title,
                                                      state=2,
                                                      priority=priority)
        pageid = self.main.database.get_main_item_id(shorturl)
        self.main.database.add_keywords(pageid, keywords)
        if phrases:
            self.main.database.add_phrases(pageid, phrases)
        subpage_ids = set()

        self.main.database.insert_or_update_blank_main_item_s(subpage_urls, subpage_priority)
        for sburl in subpage_urls:
            surl = shorted_url(sburl)
            sub_id = self.main.database.get_main_item_id(surl)
            subpage_ids.add(sub_id)

        if subpage_ids:
            self.main.database.add_relationship(pageid, subpage_ids)


if __name__ == '__main__':
    s = Store()
    s.store_item("ZeroBlog", 5, r"http://127.0.0.1:43110/Blog.ZeroNetwork.bit/", ["hello world", "damn my butt"],
                 ["blog", "summit"],
                 ["http://127.0.0.1:43110/Blog.ZeroNetwork.bit/?Post:3:How+to+have+a+blog+like+this",
                  "http://127.0.0.1:43110/Blog.ZeroNetwork.bit/?Post:34:Slides+about+ZeroNet"])
