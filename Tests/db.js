const db = require("../DataBase")

db.connect(true) // This will delete indices
db.on("connected", async () => {
    let site = await db.genNewSite({
        address: "1TaLkFrMwvbNsooF4ioKAY9EuxTBTjipT",
        "background_color": "#F5F5F5",
        "cloneable": true,
        "description": "Decentralized forum with ZeroID",
        "domain": "Talk.ZeroNetwork.bit",
        "inner_path": "content.json",
        "modified": 1555237623,
        "title": "ZeroTalk",
        "zeronet_version": "0.6.4",
        "peers": 95,
        "size": 21974527,
        "size_optional": 422141
    })
    console.log("Site object generated")
    console.log(JSON.stringify(site, null, 2))
    await db.addSite(site)
    console.log("Added")
    console.log(JSON.stringify(await db.getSite("1TaLkFrMwvbNsooF4ioKAY9EuxTBTjipT"), null, 2))
    await db.updateSite({ cloneable: false }, "1TaLkFrMwvbNsooF4ioKAY9EuxTBTjipT")
    console.log("Updated")
    console.log(JSON.stringify(await db.getSite("1TaLkFrMwvbNsooF4ioKAY9EuxTBTjipT"), null, 2))
    await db.addFeeds("1TaLkFrMwvbNsooF4ioKAY9EuxTBTjipT", [{ title: "12313" }, { title: "1231sss3" }])
    let items = await db.filterItemsToGetIds("1TaLkFrMwvbNsooF4ioKAY9EuxTBTjipT", "feed")
    console.log(JSON.stringify(items, null, 2))
    console.log(JSON.stringify(await db.getSite("1TaLkFrMwvbNsooF4ioKAY9EuxTBTjipT"), null, 2))
    console.log(JSON.stringify(await db.clearFeeds("1TaLkFrMwvbNsooF4ioKAY9EuxTBTjipT"), null, 2))

})