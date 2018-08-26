from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities


class Browser:
    def __init__(self):
        options = webdriver.ChromeOptions()
        prefs = {'profile.default_content_settings.popups': 0,  # 设置为 0 禁止弹出窗口
                 'download.default_directory': 'NUL'}  # 指定下载路径
        caps = DesiredCapabilities().FIREFOX
        caps["pageLoadStrategy"] = "none"
        options.add_experimental_option("prefs", prefs)
        # options.add_argument("--headless")
        self.driver = webdriver.Chrome(chrome_options=options, desired_capabilities=caps)
        self.driver.set_page_load_timeout(120)
