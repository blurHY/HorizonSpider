from ZiteBase import ZiteBase
from json import loads
from time import time
from Config import *


class ZeroName(ZiteBase):
    def __init__(self):
        super().__init__("1Name2NXVi1RDPDgf5617UoW7xA6YrhM9F")
        self.last_reload = 0

    def getNamesJson(self):
        return self.getFile("data/names.json")

    def resolveDomain(self, domain):
        if time() - self.last_reload > DomainReloadInterval:
            self.reloadDomainData()
        return self.names.get(domain.lower())

    def reloadDomainData(self):
        self.last_reload = time()
        self.names = loads(self.getNamesJson())


if __name__ == "__main__":
    zn = ZeroName()
    print(zn.resolveDomain("Sites.ZeroNetwork.bit"))
