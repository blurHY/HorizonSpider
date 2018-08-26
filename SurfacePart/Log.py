from colorama import Fore, Back, Style


class Log:
    def log(self, obj, level="Debug"):
        """
        :param level: Debug|Info|Warning|Error
        :return:
        """
        text = str(obj)
        if level == "Debug":
            print(text)
        elif level == "Info":
            print(text)
        elif level == "Warning":
            print(text)
        elif level == "Error":
            print(text)


if __name__ == '__main__':
    lo = Log()
    lo.log("Warning", "Warning")
    lo.log("Error", "Error")
    lo.log("aaa")
