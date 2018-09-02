class Urldownloader:
    def __init__(self, main):
        self.main = main

    def get(self, url):
        self.main.browser.driver.get(url)
        self.main.log.log("{0} loaded".format(url), "Info")
