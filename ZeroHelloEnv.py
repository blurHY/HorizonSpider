from ZeroWebsocket import ZeroWebSocket


class ZeroHelloEnv:
    def __init__(self):
        self.address = "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D"
        self.wrapper_key = "dc2b4e3999ad344d7d95bf8179fc0f399668c1694c5d86320b6c0bef97b6c658"
        self.port = 43111
        self.ip = "127.0.0.1"
        self.ws = ZeroWebSocket(self.wrapper_key, self.ip, self.port)
