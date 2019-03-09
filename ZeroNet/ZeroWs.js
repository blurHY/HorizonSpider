const W3CWebSocket = require("websocket").w3cwebsocket
const EventEmitter = require("events")
const log = require("../Logger")


module.exports = class ZeroWs {
    constructor(wrapper_key, zeroNetHost = "localhost:43110", secureWs = false) {
        this.Event = new EventEmitter()
        this.ws = new W3CWebSocket(`ws${secureWs ? "s" : ""}://${zeroNetHost}/Websocket?wrapper_key=${wrapper_key}`)

        this.waiting_cb = {}
        this.next_message_id = 1
        this.message_queue = []

        this.ws.onerror = () => {
            log("error", "zeronet", "Cannot connect to zeronet")
        }

        this.ws.onclose = () => {
            log("warning", "zeronet", "Connection to zeronet has been closed")
            this.Event.emit("wsClose")
        }

        this.ws.onmessage = e => {
            let cmd, message
            message = JSON.parse(e.data)
            cmd = message.cmd
            if (cmd === "response" && this.waiting_cb[message.to] != null)
                return this.waiting_cb[message.to](message.result)
            else
                log("info", "zeronet", "Msg from ZeroNet", message)
        }

        this.ws.onopen = () => {
            log("info", "zeronet", `Zeronet websocket connected - Msg queue: ${this.message_queue.length}`)
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
        log("info", "zeronet", `Cmd: ${cmd}`, params)
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