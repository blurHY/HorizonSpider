from zerowebsocket import ZeroWebSocket

import importlib.util
spec = importlib.util.spec_from_file_location("site", "./site.py")
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)

ZeroHelloKey = site.getWrapperkey(
    "D:\ZeroNet\data", "1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D")

print("Got wrapper key")

with ZeroWebSocket(ZeroHelloKey) as ZeroWs:
    print(ZeroWs.send("siteAdd", "1DhCTPF95e8LCBSWK6VB5J5CYjnmTjK1y6"))
    print(ZeroWs.send("siteInfo", "1DhCTPF95e8LCBSWK6VB5J5CYjnmTjK1y6"))
