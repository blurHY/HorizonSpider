const chalk = require("chalk")
const capitalize = require("capitalize")

// This is a super simple logger

let consoleColor = {
    error: "red",
    warning: "yellow",
    info: "blue",
    type: "inverse"
}

// level: error warning info
// type: zeronet spider panel
function log(level, type, msg, obj) {
    let [levelC, typeC] = [level, type].map(capitalize)
    console.log(`${chalk[consoleColor[level]](levelC)} - ${new Date()} - ${chalk[consoleColor.type](typeC)}: ${msg} ${(typeof obj === "object") ? JSON.stringify(obj) : (obj ? obj : "")}`)
    // TODO: Ws send to panel
}

module.exports = log