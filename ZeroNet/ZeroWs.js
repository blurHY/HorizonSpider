const W3CWebSocket = require("websocket").w3cwebsocket
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
        signale.info("Creating websocket connection")
        this.connect()
    }

    onError() {
        signale.error("Cannot connect to ZeroNet")
        if (!this.reconnecting) {
            this.reconnecting = true
            setTimeout(() => {
                this.reconnecting = false
                this.connect()
            }, 2000)
        }
    }

    onClose() {
        signale.warn("Connection to ZeroNet has been closed")
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
        let cmd, message
        if (!e)
            return
        message = JSON.parse(e.data)
        cmd = message.cmd
        if (cmd === "response" && this.waiting_cb[message.to] != null)
            return this.waiting_cb[message.to](message.result)
        else
            signale.info("Message from ZeroNet", message)
    }

    onOpen() {
        signale.info(`ZeroNet websocket connected`)
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
        this.ws = new W3CWebSocket(`ws${this.secureWs ? "s" : ""}://${this.zeroNetHost}/Websocket?wrapper_key=${this.wrapper_key}`)

        this.waiting_cb = {}
        this.next_message_id = 1
        this.message_queue = []

        this.ws.onmessage = e => this.onMsg(e)
        this.ws.onopen = e => this.onOpen(e)
        this.ws.onerror = e => this.onError(e)
        this.ws.onclose = e => this.onClose(e)
    }

    get connected() {
        return this.ws && this.ws.readyState === this.ws.OPEN
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
            this.ws.send(JSON.stringify(message))
        else
            this.message_queue.push(message)
        if (cb)
            return this.waiting_cb[message.id] = cb
    }
}