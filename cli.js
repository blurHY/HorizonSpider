require("dotenv").config()

const DataBase = require("./DataBase"),
    Admin = require("./ZeroNet/AdminZite"),
    SiteMeta = require("./ZeroNet/SiteMeta"),
    DomainResolver = require("./ZeroNet/DomainResolver")

let admin = null
require('yargs')
    .command('getInfo <siteAddr>', 'Get siteInfo for given site address', () => { }, async (argv) => {
        console.log(await SiteMeta.getWsSiteInfo(argv.siteAddr))
    })
    .command('stats', "Get stats", () => { }, async () => {
        console.log(`Total sites in site.json: ${Object.keys(await SiteMeta.reloadSitesJson()).length}`)
        let incomplete = 0, done = 0
        for (let addr in global.sitesJson) {
            try {
                if (Object.keys(global.sitesJson[addr].cache.bad_files).length > 0) {
                    incomplete++
                } else
                    done++
            } catch {
                incomplete++
            }
        }
        console.log(`-- Incomplete:${incomplete}, Done:${done}`)
        DataBase.on("connected", async () => { // Main loop
            console.log(`DataBase:`)
            console.log(`-- Sites: ${await DataBase.sites.countDocuments()}`)
            console.log(`-- Feeds: ${await DataBase.feeds.countDocuments()}`)
            console.log(`-- Optional Files: ${await DataBase.opfiles.countDocuments()}`)
            console.log(`-- Links: ${await DataBase.links.countDocuments()}, Pending Links: ${await DataBase.links.countDocuments({ added: false })}`)
            process.exit()
        })
        DataBase.connect()
    })
    .command("admin <command> [args...]", "Send command to zeronet, e.g. siteList", () => { }, async (argv) => {
        async function sendCmd() {
            try {
                console.log(await admin.cmdp(argv.command, argv.args))
            } catch (e) {
                console.log("Error: " + e)
            }
            process.exit()
        }
        if (!admin) {
            admin = new Admin()
            admin.on("wsOpen", sendCmd)
        } else
            await sendCmd()
    })
    .command("resolve <domain>", "Resolve a domain", () => { }, (argv) => {
        console.log(DomainResolver.resolveDomain(argv.domain))
    })
    .command("resetLinks", "Reset links to non-added status", () => { }, async () => {
        DataBase.on("connected", async () => { // Main loop
            console.log((await DataBase.links.updateMany({ added: true }, { $set: { added: false } })).result)
            process.exit()
        })
        DataBase.connect()
    })
    .demandCommand(1, "")
    .help("h")
    .alias("h", "help")
    .argv