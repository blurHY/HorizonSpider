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
        return re.findall("\/1[A-Za-z0-9]{25,34}", text)

    def extractLinks_NameCoinDomain(self, text):
        return re.findall("[A-Za-z0-9_-]+\.bit", text)

    def extractLinks_auto(self, text):
        bitc_addrs = self.extractLinks_BitcoinAddr(text)
        namec_dms = self.extractLinks_NameCoinDomain(text)
        resolved_dms = []
        for n in namec_dms:
            resolved_dms.append(self.zeroName.resolveDomain(n))
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
    config.RootDir = "/ZeroBundle/ZeroNet"
    za = ZiteAnalyze()
    za.zeroName.reloadDomainData()
    za.extractLinks_auto("""
    from 92 个站点 用时 81.11秒
ZeroTalk
4 小时前
评论于Ways to popularize zeronet
eightyfour › quantumworld:  This. The growing climate of censorship will lead to increased interest in censorship-resistant technologies, but don't let that lead you to inaction! There's still much to be done! As c
ZeroTalk
6 小时前
评论于ZeroNet Games
eightyfour › what do people think.bit of a sort of Steam alternative using ZeroNet? As in: an interface to download, manage, rate, and interact socially in games (find other players, share tips, etc.) Maybe even linked
ZeroTalk
12 小时前
New issue: Like Beaker-browser, support.bit to point a site to custom folder
 https://github.com/HelloZeroNet/ZeroNet/issues/1844  -- [Issues · HelloZeroNet/ZeroNet · GitHub](https://github.com/HelloZeroNet/ZeroNet/issues) Jan 4, 2019
ZeroTalk
12 小时前
评论于ZeroNet Games
randomshit › [Games shared on ZeroWiki](/138R53t3ZW7KDfSfxVpWUsMXgwUnsDNXLP/?Page:zite-list-games)
ZeroTalk
12 小时前
评论于"9/11 Papers"
randomshit › It is not very difficult to breach a security system when granting a means of backdoor access for the federal government is mandatory. I can't throw any stones at TDO when figures like Alexander Nix ar
ZeroMe
12 小时前
评论于Your post
styromaniac@zeroid.bit › Add a few craters to the inside of the ring. Make each circlet and letter a deep space kind of color. Dreamy and stuff.
styromaniac@zeroid.bit › I like it.
ssdifnskdjfnsdjk@zeroid.bit › would better like smaller font and.bit round corners of the font, smaller circle when comparing to font
blurHY › @styromaniac
ZeroTalk
14 小时前
评论于"9/11 Papers"
ssdifnskdjfnsdjk › "TDO used remote access tools.bit to breach school district networks and then proceeded to steal sensitive data. To extort money from its victims, including students, TDO threatened violence or the release
ZeroTalk
14 小时前
New issue: ZeroName updater should use "map" field for subdomains
 https://github.com/HelloZeroNet/ZeroNet/issues/1843  -- [Issues · HelloZeroNet/ZeroNet · GitHub](https://github.com/HelloZeroNet/ZeroNet/issues) Jan 4, 2019
ZeroTalk
14 小时前
New commit: Rev3747. Dont show tor meek proxy on configuration page if it's not s…
     Rev3747. Dont show tor meek proxy on configuration page if it's not supported https://github.com/HelloZeroNet/ZeroNet/commit/1ab9bc40a5d54b6ed04f4dde0376cd5a36fbd391  -- [Recent Commits to ZeroNet
0list
14 小时前
Incantata - creative common trading card game
http://127.0.0.1:43110/13VDeMgRgGf73mHsMrrorXkq4fhUKfBvPz/  (DE) http://127.0.0.1:43110/19xqgCi5YTsdTxY97Pferz9GuQERzSSVFe/ (EN) 
ZeroTalk
14 小时前
提到了你Do you have any idea about the logo of Horizon Search Engine
blurhy › ssdifnskdjfnsdjk:  That's the problem of browser,maybe
    """)
