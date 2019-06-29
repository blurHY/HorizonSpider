require("dotenv").config()

const Admin = require("./ZeroNet/AdminZite"),
    SiteMeta = require("./ZeroNet/SiteMeta"),
    DomainResolver = require("./ZeroNet/DomainResolver"),
    DataBase = require("./DataBase")
let admin = null
require('yargs')
    .command('getInfo <siteAddr>', 'Get siteInfo for given site address', () => { }, async (argv) => {
        console.log(await SiteMeta.getWsSiteInfo(argv.siteAddr))
    })
    .command('getSite <siteAddr>', 'Get siteObj for given site address', () => { }, async (argv) => {
        DataBase.on("connected", async () => {
            console.log("Getting data for " + argv.siteAddr)
            console.log(await DataBase.getSite(argv.siteAddr))
            process.exit()
        })
        DataBase.connect()
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
    .command("resetDatabase", "Clear the database", () => { }, async () => {
        DataBase.on("connected", async () => {
            console.log("OK")
            process.exit()
        })
        DataBase.connect(true)
    })
    .demandCommand(1, "")
    .help("h")
    .alias("h", "help")
    .argv