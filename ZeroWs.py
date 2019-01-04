# coding:utf-8
from ZeroWebsocketBase import ZeroWebSocketBase
from json import loads
from loguru import logger


class ZeroWs(ZeroWebSocketBase):

    def addZite(self, address):
        try:
            self.send("siteAdd", address)
            logger.debug("Request site:{}", address)
        except self.Error as e:
            if e == "Invalid address":
                raise ZeroWsException(
                    "Site address invalid:{}", address)

    def getZiteInfo(self, address):
        return self.send("as", address, "siteInfo")

    def getFile(self, file, target_site=None):
        if target_site:
            return self.send("as", target_site, "fileGet", file)
        else:
            return self.send("fileGet", file)

    def queryDb(self, address, query):
        return self.send("as", address, "dbQuery", query)

    def getDbschema(self, target_site):
        file = self.getFile("dbschema.json", target_site)
        return loads(file) if file else None

    def siteList(self):
        return self.send("siteList")

    def fileList(self, dir, target_site=None):
        if target_site:
            return self.send("as", target_site, "fileList", dir)
        else:
            return self.send("fileList", dir)

    def crawlFeeds(self, site_addr, date_least=0, no_comment=True):
        dbschema = self.getDbschema(site_addr)
        if dbschema:
            feeds = dbschema["feeds"]
            results = {}
            for feed in feeds:
                results[feed] = self.queryDb(site_addr, "select type,date_added,title,body,url from ({0}) where date_added > {1} {2}".format(
                    feeds[feed], date_least, "and type != 'comment'"if no_comment else ""))
            return results
        logger.debug("The site doesn't have dbschema.json")

    def addZites(self, address_set):
        for a in address_set:
            try:
                self.addZite(a)
            except ZeroWsException as ze:
                logger.warning(ze)


class ZeroWsException(Exception):
    pass
