from pymysql import *
import json


# 25MB
def spilit_export_compress(array, name, step):
    x = 0
    for index in range(0, len(array), step):
        x += 1
        current = array[index:index + step]
        current = {name: current}
        filename = ".\data_{0}{1}.json".format(name, x)
        print(filename)
        with open(filename, "w", encoding="utf8") as f:
            json.dump(current, f, ensure_ascii=False, separators=(',', ':'))
        compress_gz(filename)


def export_normal(db):
    cur = db.cursor(cursors.DictCursor)

    print("export main")
    cur.execute("SELECT * FROM zeronetspider.main")
    main = cur.fetchall()
    spilit_export_compress(main, "main", 100000)

    print("export keywords")
    cur.execute("SELECT * FROM zeronetspider.keywords")
    keywords = cur.fetchall()
    spilit_export_compress(keywords, "keywords", 550000)

    print("export phrases")
    cur.execute("SELECT * FROM zeronetspider.phrases")
    phrases = cur.fetchall()
    spilit_export_compress(phrases, "phrases", 290000)

    cur.close()


def export_relationship(db):
    cur = db.cursor()

    print("export relationship")
    cur.execute("SELECT * FROM zeronetspider.relationship")
    rela = cur.fetchall()
    newrela = {}

    for row in rela:
        newrela[row[0]] = row[1]  # parent:sub

    spilit_export_compress(rela, "relationship", 600400)

    cur.close()


def compress_gz(filename):
    import gzip

    try:
        f_in = open(filename, 'rb')
        f_out = gzip.open(filename + ".gz", 'wb')
        f_out.write(f_in.read())

    except Exception as e:
        print(e)


def export_zite(db):
    cur = db.cursor(cursors.DictCursor)

    print("export zite")
    cur.execute("SELECT * FROM zeronetspider.zite")
    zites = cur.fetchall()
    spilit_export_compress(zites, "zites", 100000)


if __name__ == '__main__':
    db = connect(host="localhost", port=3308, user="root", passwd="123456", db="zeronetspider", charset="utf8mb4")
    export_normal(db)
    export_relationship(db)
    export_zite(db)
