from pymysql import *
from DomainParse import *

db = connect(host="localhost", port=3308, user="root", passwd="123456", db="zeronetspider",
             charset="utf8mb4")
cur = db.cursor()
dp = DomainParse()
print("Rows count:", cur.execute("select * from main where url regexp '^[^/]+\.bit'"))
rowWithDomain = cur.fetchall()

cur.execute("ALTER TABLE `zeronetspider`.`main` DROP INDEX `url_UNIQUE` ;")

for r in rowWithDomain:
    try:
        cur.execute("update main set url=%s where id=%s", [dp.url_domain_to_address(r[1]), r[0]])
    except DomainInvaildException:
        cur.execute("delete from main where id=%s", [r[0]])

cur.execute("delete from main where id not in (select * from (select min(id) from main group by url) as x)")
cur.execute("ALTER TABLE `zeronetspider`.`main` ADD UNIQUE INDEX `url_UNIQUE` (`url` ASC) VISIBLE;")

db.commit()
db.close()
