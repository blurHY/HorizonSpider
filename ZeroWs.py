from ZeroWebsocketBase import ZeroWebSocketBase
from json import loads


class ZeroWs(ZeroWebSocketBase):

    def addZite(self, address):
        return self.send("siteAdd", address)

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
        return loads(self.getFile("dbschema.json", target_site))

    def siteList(self):
        return self.send("siteList")

    def getSiteToCrawl():
        pass

    def fileList(self, dir, target_site=None):
        if target_site:
            return self.send("as", target_site, "fileList", dir)
        else:
            return self.send("fileList", dir)

    def crawlFeeds(self, site_addr, date_least=0, no_comment=True):
        feeds = self.getDbschema(site_addr)["feeds"]
        results = {}
        for feed in feeds:
            results[feed] = self.queryDb(site_addr, "select type,date_added,title,body,url from ({0}) where date_added > {1} {2}".format(
                feeds[feed], date_least, "and type != 'comment'"if no_comment else ""))
        return results
