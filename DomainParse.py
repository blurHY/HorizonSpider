import json
import re


class DomainParse:
    path = r"F:\ZeroNet\data\1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F\data\names.json"

    def __init__(self):
        with open(self.path) as namesjson:
            self.names = json.load(namesjson)
            print("Domain names json loaded")

    def ParseDomain(self, domain):
        res = self.names.get(domain)
        return res if res else None

    def url_domain_to_address(self, url):
        res = re.sub("(^|http://127.0.0.1:4311./)([A-Z0-9a-z.\-]+\.bit)", lambda ma: self.ParseDomain(ma[2].lower()),
                     url, 0, re.RegexFlag.IGNORECASE)
        if res:
            return res
        else:
            raise DomainInvaildException()

    def ParseDomain_OrRetAddr(self, url):
        res = self.names.get(url)
        return res if res else url


class DomainInvaildException(Exception):
    pass
