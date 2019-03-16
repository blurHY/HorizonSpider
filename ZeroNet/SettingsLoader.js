const readFileSync = require('fs').readFileSync;
const parse = require('ini').parse;
const join = require('path').join;
const log = require('../Logger')
let obj;

function reloadConf() { // Reloading zeronet conf file
    log("info", "zeronet", "Reloading configuration file of zeronet")
    obj = parse(readFileSync(join(process.env.ZeroNetPath, 'zeronet.conf'), 'utf-8'))
}

module.exports = {
    get ZeroNetHost() {
        return `${this.settingsObj.global.ui_ip||"127.0.0.1"}:${this.settingsObj.global.ui_port||"43110"}`
    },
    get settingsObj() {
        if (!obj) reloadConf()
        return obj
    },
    reloadConf
}