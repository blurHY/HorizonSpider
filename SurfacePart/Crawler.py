import json
import time
from rake_nltk import Rake
import jieba.analyse
from Utils import *
from selenium.common.exceptions import *
import re
import stopit

from Utils import filter_link


class CrawlerException(Exception):
    pass

class Crawler:
    wait_title = 0
    wait_normal = 0
    timeout = 20

    def __init__(self, main):
        self.main = main
        with open("..\stop_words.json", "rb") as f:
            sw = json.load(f)
            for lang in sw:
                jieba.analyse.default_tfidf.STOP_WORDS |= set(sw[lang])
        jieba.set_dictionary('..\dict.txt')
        jieba.analyse.set_idf_path("..\idf.txt")
        jieba.initialize()
        self.rake = Rake()

    def crawl_page(self, url):
        self.main.log.log("Wait for zeronet loading")

        def wait():
            end_time = time.time() + self.timeout  # timeout
            lastPeer = 0
            while True:
                try:
                    self.main.browser.safe_operation(lambda: self.main.browser.driver.switch_to.default_content())

                    try:
                        notfound = self.main.browser.safe_operation(
                            lambda: self.main.browser.driver.find_element_by_xpath("/html/body/h1"))
                    except:
                        pass
                    else:
                        if notfound.text == "Not Found":
                            raise CrawlerException("Domain doesn't exist")

                    try:
                        value1 = not self.main.browser.safe_operation(
                            lambda: self.main.browser.driver.find_element_by_css_selector(
                                "div.loadingscreen").is_displayed())
                    except:
                        value1 = True
                    try:
                        value5 = self.main.browser.safe_operation(
                            lambda: self.main.browser.driver.find_element_by_tag_name(
                                "iframe"))
                    except:
                        value5 = False
                        value2 = False
                    else:
                        try:
                            self.main.browser.safe_operation(
                                lambda: self.main.browser.driver.switch_to.default_content())
                            self.main.browser.safe_operation(lambda: self.main.browser.driver.switch_to.frame(value5))
                            value2 = self.main.browser.safe_operation(lambda: self.main.browser.driver.execute_script(
                                "return document.body.innerText").strip())
                        except:
                            value2 = False

                    try:
                        self.main.browser.safe_operation(lambda: self.main.browser.driver.switch_to.default_content())
                        page_title = self.main.browser.safe_operation(lambda: self.main.browser.driver.title)
                        value3 = "Loading" not in page_title
                    except:
                        value3 = False

                    page_url = self.main.browser.safe_operation(lambda: self.main.browser.driver.current_url)
                    if "1GitLiXB6t5r8vuU2zC6a8GYj9ME6HMQ4t" in page_url:
                        raise CrawlerException("Gitcenter Repo Zite")
                    value4 = strip_url(page_url) == strip_url(url)

                    value = value1 and value2 and value3 and value4 and value5
                    try:
                        eles = self.main.browser.safe_operation(
                            lambda: self.main.browser.driver.find_elements_by_class_name(
                                "console-line"))
                        status = eles[-1].text
                        peer = re.findall("[0-9]+", status)[0]
                        if "peer" not in str.lower(status):
                            raise CrawlerException()
                    except CrawlerException:
                        raise
                    except:
                        pass
                    else:
                        try:
                            end_time += int(peer) - lastPeer  # 根据peer增长数
                        except:
                            pass
                        else:
                            lastPeer = int(peer)

                    if value:
                        return value
                except CrawlerException:
                    raise
                except (NoSuchElementException,
                        ElementNotVisibleException) as e:
                    return True

                if time.time() > end_time:
                    break
                time.sleep(2)
            raise Exception("Timed out")

        wait()

        self.main.log.log("Page Loaded")
        self.main.browser.safe_operation(lambda: self.main.browser.driver.switch_to.default_content())
        page_title = self.main.browser.safe_operation(lambda: self.main.browser.driver.title)
        page_url = self.main.browser.safe_operation(lambda: self.main.browser.driver.current_url)

        if not filter_link(page_url):
            return None

        self.main.browser.safe_operation(lambda: self.grant())

        self.main.browser.safe_operation(lambda: self.main.browser.driver.switch_to.frame(
            self.main.browser.driver.find_element_by_tag_name("iframe")))

        if re.match(
                "http://127.0.0.1:43111/1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D/?",
                page_url):
            return None

        alltext = self.main.browser.safe_operation(lambda: self.main.browser.driver.execute_script(
            "return document.body.innerText"))

        alltext_for_nlp = alltext[:1000]

        self.main.log.log("Analysing Content", "Info")

        page_tags = self.get_tags(alltext_for_nlp)
        page_phrases = self.get_phrases(alltext_for_nlp)
        page_img_count = self.get_image_count()

        self.main.log.log("Extracting links", "Info")

        all_links = set()
        all_links |= self.get_links_text_re(alltext, page_url)
        all_links |= self.get_links_tag_a(page_url)

        self.main.log.log("Store Item", "Info")

        page_title = re.sub("\s-\sZeroNet$", "", page_title)

        return dict(
            title=page_title,
            keywords=page_tags,
            phrases=page_phrases,
            img_count=page_img_count,
            url=page_url,
            subpage_urls=all_links)

    #
    # def raise_limit_before_loaded(self):
    #     try:
    #         ele = self.main.browser.driver.find_element_by_css_selector(
    #             "a.button-setlimit")
    #         if ele:
    #             ele.click()
    #             self.main.log.log("raise_limit_before_loaded")
    #     except:
    #         pass
    #
    # def raise_limit(self):
    #     try:
    #         ele = self.main.browser.driver.find_element_by_css_selector(
    #             ".button-Set.limit")
    #         if ele:
    #             ele.click()
    #     except:
    #         pass

    # def use_meek(self):
    #     try:
    #         ele = self.main.browser.driver.find_element_by_css_selector(
    #             ".button-settrackerbridge")
    #         if ele:
    #             ele.click()
    #             self.main.log.log("use_meek")
    #
    #     except:
    #         pass

    def grant(self):
        try:
            eles = self.main.browser.safe_operation(lambda: self.main.browser.driver.find_elements_by_css_selector(
                "a.button-Grant"))
            for ele in eles:
                ele.click()
        except:
            pass

    def get_links_tag_a(self, base_url):
        try:
            elements = self.main.browser.safe_operation(lambda: self.main.browser.driver.find_elements_by_css_selector(
                "a[href]"))
            links = set()
            for e in elements:
                link = process_link(base_url, e.get_attribute("href"))
                if filter_link(link):
                    links.add(link)
            return links
        except:
            return set()

    def get_links_text_re(self, alltext, baseurl):
        regex = re.compile("(https?://127.0.0.1:[0-9]+/(.+\.bit|[A-Za-z0-9]+))"
                           ).findall(alltext)
        text_links = set()
        for r in regex:
            link = process_link(baseurl, r[0])
            if filter_link(link):
                text_links.add(link)
        return text_links

    def get_tags(self, alltext):
        return set(jieba.analyse.extract_tags(alltext, topK=30))

    # def raise_all_limit_zerohello(self):
    #     try:
    #         # ele = self.main.browser.driver.find_elements_by_css_selector(
    #         #     "a.details.needaction")
    #         # if ele:
    #         #     for e in ele:
    #         #         e.click()
    #     except:
    #         pass

    def get_phrases(self, alltext):
        self.rake.extract_keywords_from_text(alltext)
        phrases = self.rake.get_ranked_phrases()
        total_len = 0
        return_phrases = list()
        for phra in phrases:
            total_len += len(phra)
            if total_len < 70:
                return_phrases.append(phra)
            elif total_len == len(phra):
                return_phrases.append(phra[:70])
        return return_phrases

    def get_image_count(self):
        try:
            return len(
                self.main.browser.safe_operation(lambda: self.main.browser.driver.find_elements_by_tag_name("img")))
        except:
            return 0
