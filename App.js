require('dotenv').config()

const Settings = require('./SettingsLoader');
const Admin = require("./AdminZite");
const delay = require('delay');
const log = require("./Logger")

let admin = new Admin()
let checkInterval = 60 * 1000

async function forEachSite() {
    for (let site of admin.siteList) {
        log("info", "spider", "", site);
        // Crawl links in text and store text to mongodb as cache
    }
}

admin.Event.on("wsOpen", async () => {
    while (true) {
        await admin.reloadSiteList()
        await forEachSite()
        await delay(checkInterval)
    }
})