from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.common.exceptions import *


class Browser:
    def __init__(self):
        options = webdriver.ChromeOptions()
        prefs = {'profile.default_content_settings.popups': 0,  # 设置为 0 禁止弹出窗口
                 'download.default_directory': 'NUL'}  # 指定下载路径
        caps = DesiredCapabilities().CHROME
        caps["pageLoadStrategy"] = "none"
        options.add_experimental_option("prefs", prefs)
        options.add_argument("start-maximized")
        options.add_argument("--headless")
        self.driver = webdriver.Chrome(chrome_options=options, desired_capabilities=caps)
        self.driver.set_page_load_timeout(120)

    def safe_operation(self, func, times=0):
        if times > 10:
            raise Exception("Too many alerts")
        try:
            val = func()
            self.driver.execute_script("alert=prompt=confirm=()=>{}")
        except UnexpectedAlertPresentException as e:
            self.driver.switch_to.alert.dismiss()
            print("dismiss alert")
            return self.safe_operation(func, times + 1)
        else:
            return val
