class Urldownloader:
    def __init__(self, main):
        self.main = main

    def get(self, url):
        self.main.browser.safe_operation(lambda: self.main.browser.driver.get(url))
        print("{0} loaded".format(url))
