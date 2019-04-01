const WebsocketClient = require("websocket").client
const EventEmitter = require("events")
const signale = require("signale")


module.exports = class ZeroWs {
    constructor(wrapper_key, zeroNetHost = "localhost:43110", secureWs = false) {
        if (!wrapper_key)
            throw "No wrapper_key"
        this.Event = new EventEmitter()
        this.wrapper_key = wrapper_key
        this.zeroNetHost = zeroNetHost
        this.secureWs = secureWs
        this.waiting_cb = {}
        this.message_queue = []
        this.next_message_id = 1
        signale.info("Creating websocket connection")

        this.ws = new WebsocketClient({maxReceivedMessageSize: 83886080, maxReceivedFrameSize: 83886080})
        this.ws.on("connect", x => this.onOpen(x))
        this.ws.on("connectFailed", x => this.onError(x))
        this.connect()
    }

    onError(e) {
        signale.error("Cannot connect to ZeroNet", e)
        if (!this.reconnecting) {
            this.reconnecting = true
            setTimeout(() => {
                this.reconnecting = false
                this.connect()
            }, 2000)
        }
    }

    onClose(e) {
        signale.warn("Connection to ZeroNet has been closed", e)
        if (!this.reconnecting) {
            this.reconnecting = true
            setTimeout(() => {
                this.reconnecting = false
                this.connect()
            }, 2000)
        }
        this.Event.emit("wsClose")
    }

    onMsg(e) {
        try {
            let cmd, message
            message = JSON.parse(e.utf8Data)
            cmd = message.cmd
            if (cmd === "response" && this.waiting_cb[message.to] != null)
                return this.waiting_cb[message.to](message.result)
            else if (cmd === "ping")
                this.response(message.id, "pong")
            else
                signale.info("Message from ZeroNet", message)
        } catch (err) {
            signale.error("Failed to parse message", err)
        }
    }

    onOpen(conn) {
        signale.success(`ZeroNet websocket connected`)

        conn.on("error", (x) => this.onError(x))
        conn.on("close", (x) => this.onClose(x))
        conn.on("message", (x) => this.onMsg(x))

        this.conn = conn

        let i, len, message, ref
        ref = this.message_queue
        for (i = 0, len = ref.length; i < len; i++) {
            message = ref[i]
            this.ws.send(JSON.stringify(message))
        }
        this.message_queue = []
        this.Event.emit("wsOpen")
    }

    connect() {
        let uri = `ws${this.secureWs ? "s" : ""}://${this.zeroNetHost}/Websocket?wrapper_key=${this.wrapper_key}`
        signale.debug(uri)

        this.ws.connect(uri, null, null, null, {})
    }

    get connected() {
        return this.conn && this.conn.connected
    }

    cmd(cmd, params = {}, cb = null) { // params can b both obj or array
        this.send({
            cmd,
            params
        }, cb)
    }

    cmdp(cmd, params = {}) {
        return new Promise((resolve, reject) => this.cmd(cmd, params, (res) => {
            if (res.error)
                reject(res.error)
            else
                resolve(res)
        }))
    }

    send(message, cb) {
        if (cb == null)
            cb = null
        if (message.id == null) {
            message.id = this.next_message_id
            this.next_message_id++
        }
        if (this.connected)
            this.conn.sendUTF(JSON.stringify(message))
        else
            this.message_queue.push(message)
        if (cb)
            return this.waiting_cb[message.id] = cb
    }

    response(to, result) {
        this.send({"cmd": "response", "to": to, "result": result})
    }
}