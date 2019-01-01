from ZeroWebsocketBase import ZeroWebSocketBase
from json import loads
from loguru import logger


class ZeroWs(ZeroWebSocketBase):

    def addZite(self, address):
        try:
            self.send("siteAdd", address)
        except self.Error as e:
            if e == "Invalid address":
                raise ZeroWsException("Site address invalid")

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

    def addZites(self, address_set):
        for a in address_set:
            try:
                self.addZite(address_set)
            except ZeroWsException as ze:
                logger.warn(ze)


class ZeroWsException(Exception):
    pass


if __name__ == "__main__":
    import ZiteUtils
    ZeroHelloKey = ZiteUtils.getWrapperkey(
        "D:\ZeroNet\data", "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D")

    zSocket = ZeroWs(ZeroHelloKey)
    zSocket.addZite("1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D")
