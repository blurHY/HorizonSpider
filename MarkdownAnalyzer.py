import re
from urllib.parse import urljoin
import Utils
import DomainParse


class Markdown:
    def __init__(self):
        self.dp = DomainParse.DomainParse()

    def get_all_links(self, marktext, baseurl):
        """
        Links,images,videos
        """

        reg = re.findall(
            "(?:\[[^\[\]]*\]\(([A-Za-z0-9-._~:/?#\[\]@!$&'()*+,;=%\\\s]+)\))|(?:<([A-Za-z0-9-._~:/?#\[\]@!$&'()*+,;=%\\\s]+)>)|(1[A-Za-z0-9]{32,36})|([A-Za-z0-9-]{2,20}\.bit)",
            marktext)

        final = []

        def url_add(url):
            if Utils.filter_link(url):
                processed = Utils.removeWrapperNonce(Utils.shorted_url(Utils.strip_url(url)))
                final.append(processed)

        for r in reg:
            if r[0]:
                joined = urljoin(baseurl, r[0])
                url_add(joined)
            elif r[1]:
                joined = urljoin(baseurl, r[1])
                url_add(joined)
            elif r[2]:
                final.append(r[2])
            elif r[3]:
                res = self.dp.ParseDomain(r[3])
                if res:
                    final.append(res)
                else:
                    continue

        return final
