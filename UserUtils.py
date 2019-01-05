import json
from Config import config


def getUsersJson():
    with open("%s/users.json" % config.DataDir) as f:
        return json.loads(f.read())


def getUsers():
    return getUsersJson().keys()


def getUser(address):
    return getUsersJson()[address]
