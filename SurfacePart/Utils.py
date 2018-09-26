from urllib.parse import urljoin
import re


def process_link(base_url, link):
    retval = urljoin(base_url, link)
    retval = retval.strip()
    retval = re.sub(
        "^https?://127.0.0.1:[0-9]+", "http://127.0.0.1:43111", retval)
    try:
        # 移除带id的链接，这些大多没什么用
        match = re.match("^https?://127.0.0.1:43111/[^#]+", retval)
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


def filter_link_before_crawl(link):
    ext = ""
    try:
        ext = re.match(r"^.*\.([^\./]*)$", link).group(1)
    except:
        IsFile = False
    else:
        IsFile = True
        if "htm" in ext or "bit" in ext:
            IsFile = False

    try:
        re.match(
            r"^http://127\.0\.0\.1:43111/Mail\.ZeroNetwork\.bit/\?to=[A-Za-z0-9]*$", link)[0]
    except:
        MailTo = False
    else:
        MailTo = True

    return not (IsFile or MailTo)


def longer_url(shorturl):
    return "http://127.0.0.1:43111/" + shorturl


def shorted_url(url):
    try:
        return re.sub("^http:\/\/127\.0\.0\.1:43111\/", "", url)
    except:
        return url


def strip_url(url):
    if url.endswith("/"):
        return url[:-1]
    return url


def removeWrapperNonce(url):
    return re.sub("[&?](wrapper_nonce=[A-Za-z0-9]+|wrapper=False)|index.html", "", url)
