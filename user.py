import json

def getUsersJson(data_directory):
	with open("%s/users.json" % data_directory) as f:
		return json.loads(f.read())

def getUsers(data_directory):
	return getUsersJson(data_directory).keys()

def getUser(data_directory, address):
	return getUsersJson(data_directory)[address]