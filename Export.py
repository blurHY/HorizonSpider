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
        with open(filename, "w", encoding="utf8") as f:
            json.dump(current, f, ensure_ascii=False, separators=(',', ':'))
        compress_gz(filename)


def export_normal(cursor):
    db = connect(host="localhost", port=3308, user="root", passwd="123456", db="zeronetspider", charset="utf8mb4")
    cur = db.cursor(cursor)

    cur.execute("SELECT * FROM zeronetspider.main")
    main = cur.fetchall()
    spilit_export_compress(main, "main", 180000)

    cur.execute("SELECT * FROM zeronetspider.keywords")
    keywords = cur.fetchall()
    spilit_export_compress(keywords, "keywords", 650000)

    cur.execute("SELECT * FROM zeronetspider.phrases")
    phrases = cur.fetchall()
    spilit_export_compress(phrases, "phrases", 290000)

    cur.execute("SELECT * FROM zeronetspider.relationship")
    rela = cur.fetchall()
    spilit_export_compress(rela, "relationship", 800400)

    cur.execute("Select * From zeronetspider.zite")
    zites = cur.fetchall()
    spilit_export_compress(zites, "zites", 4000)


def compress_gz(filename):
    import gzip

    try:
        f_in = open(filename, 'rb')
        f_out = gzip.open(filename + ".gz", 'wb')
        f_out.write(f_in.read())

    except Exception as e:
        print(e)


if __name__ == '__main__':
    export_normal(cursors.DictCursor)
