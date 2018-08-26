from urllib.parse import urljoin
import re


def process_link(base_url, link):
    retval = urljoin(base_url, link)
    retval = retval.strip()
    retval = re.sub("^https?://127.0.0.1:[0-9]+", "http://127.0.0.1:43111", retval)
    try:
        match = re.match("^https?://127.0.0.1:43111/[^#]+", retval)  # 移除带id的链接，这些大多没什么用
        if match:
            retval = match[0]
    except:
        pass
    retval = retval.replace("\\", "/")  # 统一斜杠
    if retval.endswith("/"):
        retval = retval[:-1]
    return retval


def filter_link(link):
    prefix = link.startswith("http://127.0.0.1:43111/")
    return prefix


def longer_url(shorturl):
    return "http://127.0.0.1:43111/" + shorturl


def shorted_url(url):
    try:
        return re.sub("^http:\/\/127\.0\.0\.1:43111\/", "", url)
    except:
        return url
