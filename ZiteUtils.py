import json
import sqlite3
from os.path import join
from Config import *


def getWrapperkey(address):
    with open(join(DataDir, "sites.json")) as f:
        sites = json.loads(f.read())
        if address in sites:
            return sites[address]["wrapper_key"]
        else:
            raise KeyError("No site %s" % address)


def findByWrapperkey(wrapper_key):
    with open(join(DataDir, "sites.json")) as f:
        sites = json.loads(f.read())

        for address, site in sites.iteritems():
            if site["wrapper_key"] == wrapper_key:
                return address

        raise KeyError("No wrapper key %s" % wrapper_key)


def sqlQuery(path, query):
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    return cursor.execute(query)


def getDomains(path, address=None):
    with open(path, "r") as f:
        names = json.loads(f.read())

        if address is None:
            domains = names.keys()
        else:
            domains = []
            for domain, result in names.iteritems():
                if result == address:
                    domains.append(domain)

        if len(domains) == 0:
            raise KeyError("%s has no domains" % address)
        else:
            return domains


def findByDomain(path, domain):
    with open(path, "r") as f:
        names = json.loads(f.read())
        if domain.lower() in names:
            return names[domain.lower()]
        else:
            raise KeyError("No domain %s" % domain)
