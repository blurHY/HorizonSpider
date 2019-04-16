let request = require('request-promise-native'),
    signale = require("signale")

module.exports = async function (admin) {
    let list = (await request({ uri: "https://github.com/ngosang/trackerslist/raw/master/trackers_all_http.txt" })).split(/[\r\n]+/)
    await admin.cmdp("configSet", ["trackers", list])
    signale.info(`Updated trackers: `, list)
}