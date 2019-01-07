# coding:utf-8
from ZeroWebsocketBase import ZeroWebSocketBase
from json import loads
from loguru import logger


class ZeroWs(ZeroWebSocketBase):

    def addZite(self, address):
        logger.debug("Request site:{}", address)
        self.send("siteAdd", address)

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

    @logger.catch
    def crawlFeeds(self, site_addr, dbschema, date_least=0, no_comment=True):
        results = {}
        if dbschema:
            feeds = dbschema.get("feeds")
            logger.debug("Querying all feeds")
            if feeds:
                for feed in feeds:
                    if feeds[feed].strip().upper().startswith("SELECT"):
                        results[feed] = self.queryDb(site_addr, "select type,date_added,title,body,url from ({0}) where date_added > {1} {2}".format(
                            feeds[feed], date_least, "and type != 'comment'"if no_comment else ""))
                    else:
                        results[feed] = []
            logger.debug("This site has dbschama.json. Feeds crawled")
        return results

    def exploreDataBase(self, dbschema):
        pass

    def addZites(self, address_set):
        for a in address_set:
            try:
                self.addZite(a)
            except Exception as ze:
                logger.warning(ze)


class ZeroWsException(Exception):
    pass
