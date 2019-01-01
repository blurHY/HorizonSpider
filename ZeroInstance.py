import psutil
import os
import sys
import subprocess
from Config import *


def isRunning():
    try:
        with open("%s/lock.pid" % DataDir, "w") as f:
            f.write("0")
            return True
    except IOError:
        return False


def getPid():
    lock_file = os.path.realpath("%s/lock.pid" % DataDir).encode("utf-8")

    for proc in psutil.process_iter():
        try:
            if lock_file in (x.path for x in proc.open_files()):
                return proc.pid
        except psutil.Error as e:
            pass

    return None


def start():
    with open(os.devnull, "w") as null:
        subprocess.Popen([sys.executable, "%s/start.py" %
                          RootDir], stdout=null, stderr=null)


class ZeroInstanceException(Exception):
    pass


def ensureRunning():
    if not isRunning():
        start()
        if not isRunning():
            raise ZeroInstanceException("Cannot launch ZeroNet client")
    print("ZeroNet instance is running")


if __name__ == "__main__":
    ensureRunning()
