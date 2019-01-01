from ZeroWs import ZeroWs
from Config import *
import ZiteUtils


class ZiteBase(ZeroWs):
    def __init__(self, address):
        super().__init__(self.getWrapperKey(address))

    def getWrapperKey(self, address):
        return ZiteUtils.getWrapperkey(address)

    def isDownloaded(self):
        return self.send("siteInfo")["bad_files"] == 0

    def getFile(self, inner_path):
        return super().getFile(inner_path)
