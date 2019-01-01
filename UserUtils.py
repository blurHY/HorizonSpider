import json
from Config import *


def getUsersJson():
    with open("%s/users.json" % DataDir) as f:
        return json.loads(f.read())


def getUsers():
    return getUsersJson(DataDir).keys()


def getUser(address):
    return getUsersJson(DataDir)[address]
