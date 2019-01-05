import os
import re
from collections import Counter
from json import dump, loads
from mimetypes import init as mime_init
from mimetypes import types_map
import jieba.analyse
from rake_nltk import Rake
import nltk
from langdetect import detect, lang_detect_exception
from loguru import logger

from Config import config
from ZeroName import ZeroName


class ZiteAnalyze:
    def __init__(self):
        mime_init()
        jieba.analyse.set_stop_words("./ChineseStopWords.txt")
        nltk.download("stopwords")
        nltk.download("punkt")
        self.rake = Rake()
        self.zeroName = ZeroName()

    def feedsFlatten(self, feeds):
        flat_feeds = []
        for key in feeds:
            for feed in feeds[key]:
                flat_feeds.append(feed)
        return flat_feeds

    def analyzeFeeds(self, feeds):  # Turn text to keywords
        for feed in feeds:
            if feed["type"] == "comment":  # Skip comments
                continue
            feed["body"] = self.textOptimize(feed["body"])
            if len(feed["body"]) > 200:
                feed["keywords"] = self.extractKeyword_auto(
                    feed["body"], 5)
            elif len(feed["title"]) < 10:
                feed["keywords"] = self.extractKeyword_auto(
                    feed["body"], 1)[:10]
            else:
                feed["keywords"] = []
            del feed["body"]
        return feeds

    def textOptimize(self, text):
        newtx = re.sub('!?\[(?P<tag>.*)\]\((?P<link>.*)\)',
                       '\g<tag>:\g<link>', text)
        newtx = re.sub('https?:\/\/[^\s]+',
                       ' ', newtx)
        return re.sub('!?\[(?P<tag>.*)\]\((?P<link>.*)\)', '\g<tag>:\g<link>', newtx)

    def extractKeyword_auto(self, text, count=20):
        try:
            lang = detect(text)
        except:
            lang = None
        if lang == "zh-cn" or lang == "zh-tw":
            return jieba.analyse.extract_tags(text)
        else:
            self.rake.extract_keywords_from_text(text)
            return self.rake.get_ranked_phrases()[:count]

    def extractLinks_BitcoinAddr(self, text):
        res = re.findall(
            "http?://.*/(1[A-Za-z0-9]{25,34})|\[.*\]\(.*\/(1[A-Za-z0-9]{25,34}).*\)", text)
        return res[0] if res[0] else res[1]

    def extractLinks_NameCoinDomain(self, text):
        return re.findall("[A-Za-z0-9_-]+\.bit", text)

    def extractLinks_auto(self, text):
        bitc_addrs = self.extractLinks_BitcoinAddr(text)
        namec_dms = self.extractLinks_NameCoinDomain(text)
        resolved_dms = []
        for n in namec_dms:
            res = self.zeroName.resolveDomain(n)
            if res:
                resolved_dms.append(res)
        return set(bitc_addrs+resolved_dms)

    def crawlLinksFeeds(self, feeds):  # Crawl all links
        links = set()
        logger.info("{} feeds", len(feeds))
        for feed in feeds:
            links |= self.extractLinks_auto(feed["body"])
            links |= self.extractLinks_auto(feed["title"])
        return links

    # Get most common 3 types of file with the count.For complex sites.
    # list_from_query : result of db query
    # Results ---
    # KopyKate : [('video', 2902), ('image', 3), ('application', 2)]
    # Zerotalk : [('image', 2)]
    # GIF Time : [('video', 7195)]
    # ZeroUp : [('application', 785), ('video', 742), ('audio', 1)]

    def optionalFileTypes(self, list_from_query):
        mime_types = []
        for element in list_from_query:
            ext = re.search(r"\.([A-Za-z0-9-_]+)$", element[0])
            if not ext:
                continue
            ext = ext.group(0)
            mime = types_map.get(ext)
            if mime:
                mime_types.append(
                    types_map.get(ext).split("/")[0])
        x = ()
        for y in Counter(mime_types).most_common(3):
            x += y
        x = [str(y) for y in x]
        return ','.join(x)

    # For common simple sites.Similar to optionalFileTypes
    def fileTypes(self, filelist):
        mime_types = []
        for path_str in filelist:
            ext = re.search(r"\.([A-Za-z0-9-_]+)$", path_str)
            if not ext:
                continue
            ext = ext.group(0)
            mime = types_map.get(ext)
            if mime:
                mime_types.append(
                    types_map.get(ext).split("/")[0])
        x = ()
        for y in Counter(mime_types).most_common(3):
            x += y
        x = [str(y) for y in x]
        return ','.join(x)

    # For ranking , the bigger the better
    def getUserDataRatio(self, site_info, optinal_file_count):
        return optinal_file_count/site_info["content"]["files"]

    def countSiteFiles(self, addr):  # Downloaded files
        return sum([len(files) for r, d, files in os.walk(config.DataDir + "\\" + addr)])


if __name__ == "__main__":
    config.RootDir = "D:/ZeroNet"
    za = ZiteAnalyze()
    za.zeroName.reloadDomainData()
    print(za.extractLinks_BitcoinAddr(
        "1asdas/1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D"))
