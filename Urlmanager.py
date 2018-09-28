class Urlmanager:
    def __init__(self, main):
        self.main = main

    def validate_urls_in_db(self):
        pass

    def analyse_link(self, link):
        url_args = link.find("?") >= 0
        slash_times = link.count("/") > 4
        return url_args + slash_times

