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
        # profile.setPreference("capability.policy.strict.Window.alert", "noAccess");
        # profile.setPreference("capability.policy.strict.Window.confirm", "noAccess");
        # profile.setPreference("capability.policy.strict.Window.prompt", "noAccess");
        options.add_experimental_option("prefs", prefs)
        options.add_argument("start-maximized")
        self.driver = webdriver.Chrome(chrome_options=options, desired_capabilities=caps)
        self.driver.set_page_load_timeout(120)

    def safe_operation(self, func):
        try:
            val = func()
        except UnexpectedAlertPresentException as e:
            self.driver.switch_to.alert.dismiss()
            print("dismiss alert")
            return self.safe_operation(func)
        else:
            return val
