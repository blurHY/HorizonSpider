const DomainResolver = require("../ZeroNet/DomainResolver")

module.exports = {
    async findLinksAndSave(text, fromObjId, fromType) {
        let reg = /(?:[^A-Za-z0-9]+)(?:(?:(?:https?:\/\/)?(?:[A-Za-z0-9.-:]{2,30})(?:\/)((?:1(?=[A-Za-z0-9]*[A-Z][A-Za-z0-9]*)(?=[A-Za-z0-9]*[0-9][A-Za-z0-9]*)(?=[A-Za-z0-9]*[a-z][A-Za-z0-9]*)[A-Za-z0-9]{26,35})|(?:[A-Za-z0-9-_.]+\.bit))(?:(\/(?:[a-zA-Z0-9~_@=\.\+-/]{0,255}))|(?:[^A-Za-z0-9])|$))|(?:((?:1(?=[A-Za-z0-9]*[A-Z][A-Za-z0-9]*)(?=[A-Za-z0-9]*[0-9][A-Za-z0-9]*)(?=[A-Za-z0-9]*[a-z][A-Za-z0-9]*)[A-Za-z0-9]{32,35})|(?:[A-Za-z0-9-_]+\.bit))(\/[a-z\(\)A-Z0-9~_@=\.\+-/]{0,255})))/g
        do {
            let result = reg.exec(text)
            if (!result)
                break
            let link = {
                site: result[1] || result[3],
                path: result[2] || result[4],
                date: Date.now(),
                fromObj: fromObjId, fromType
            }
            let addr = DomainResolver.resolveDomain(link.site)
            global.addrsSet.add(addr)
        } while (true)
    }
}

