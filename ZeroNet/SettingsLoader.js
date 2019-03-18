const readFileSync = require("fs").readFileSync
const parse = require("ini").parse
const join = require("path").join
const signale = require('signale');
global.ZeroNetConfObj = null

function reloadConf() { // Reloading zeronet conf file
    signale.info("Reloading configuration file of zeronet")
    global.ZeroNetConfObj  = parse(readFileSync(join(process.env.ZeroNetPath, "zeronet.conf"), "utf-8"))
}

module.exports = {
    get ZeroNetHost() {
        return `${this.settingsObj.global.ui_ip || "127.0.0.1"}:${this.settingsObj.global.ui_port || "43110"}`
    },
    get settingsObj() {
        if (!global.ZeroNetConfObj ) reloadConf()
        return global.ZeroNetConfObj 
    },
    reloadConf
}