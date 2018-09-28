# imachug/ThunderProxy
import websocket
import json


class ZeroWebSocket(object):
    def __init__(self, wrapper_key, ip="127.0.0.1", port=43110):
        self.wrapper_key = wrapper_key
        self.ws = websocket.create_connection("ws://{0}:{1}/Websocket?wrapper_key={2}".format(ip, port, wrapper_key))
        self.next_id = 1

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.ws.close()

    def __getattr__(self, cmd):
        def proxy(*args, **kwargs):
            self.async(cmd, *args, **kwargs)

            while True:
                response = self.recv()
                if response["cmd"] == "response" and response["to"] == self.next_id:
                    self.next_id += 1
                    return response["result"]

        return proxy

    def recv(self):
        return json.loads(self.ws.recv())

    def async(self, cmd, *args, **kwargs):
        data = None
        if len(args) == 0:
            data = dict(cmd=cmd, params=kwargs, id=self.next_id)
        elif len(kwargs) == 0:
            data = dict(cmd=cmd, params=args, id=self.next_id)
        else:
            raise TypeError("Only args/kwargs alone are allowed in call to ZeroWebSocket")

        self.ws.send(json.dumps(data))

    def __call__(self, cmd, *args, **kwargs):
        return self[cmd](*args, **kwargs)
