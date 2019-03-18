const W3CWebSocket = require("websocket").w3cwebsocket
const EventEmitter = require("events")
const signale = require("signale")


module.exports = class ZeroWs {
    constructor(wrapper_key, zeroNetHost = "localhost:43110", secureWs = false) {
        if (!wrapper_key)
            throw "No wrapper_key"
        this.Event = new EventEmitter()
        this.createWebSocket(wrapper_key, zeroNetHost, secureWs)
    }

    createWebSocket(wrapper_key, zeroNetHost = "localhost:43110", secureWs = false) {
        signale.info("Creating websocket connection")
        this.ws = new W3CWebSocket(`ws${secureWs ? "s" : ""}://${zeroNetHost}/Websocket?wrapper_key=${wrapper_key}`)

        this.waiting_cb = {}
        this.next_message_id = 1
        this.message_queue = []

        this.ws.onerror = () => {
            signale.error("Cannot connect to ZeroNet")
            if (!this.reconnecting) {
                this.reconnecting = true
                setTimeout(() => {
                    this.createWebSocket(wrapper_key, zeroNetHost, secureWs)
                }, 3000)
            }
        }

        this.ws.onclose = () => {
            signale.warn("Connection to ZeroNet has been closed")
            if (!this.reconnecting) {
                this.reconnecting = true
                setTimeout(() => {
                    this.createWebSocket(wrapper_key, zeroNetHost, secureWs)
                }, 3000)
            }
            this.Event.emit("wsClose")
        }

        this.ws.onmessage = e => {
            let cmd, message
            message = JSON.parse(e.data)
            cmd = message.cmd
            if (cmd === "response" && this.waiting_cb[message.to] != null)
                return this.waiting_cb[message.to](message.result)
            else
                signale.info("Message from ZeroNet", message)
        }

        this.ws.onopen = () => {
            signale.info(`ZeroNet websocket connected - Pending messages: ${this.message_queue.length}`)
            let i, len, message, ref
            ref = this.message_queue
            for (i = 0, len = ref.length; i < len; i++) {
                message = ref[i]
                this.ws.send(JSON.stringify(message))
            }
            this.message_queue = []
            this.Event.emit("wsOpen")
        }
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