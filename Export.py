from pymysql import *
import json


def export_normal(cursor):
    db = connect(host="localhost", port=3308, user="root", passwd="123456", db="zeronetspider", charset="utf8mb4")
    cur = db.cursor(cursor)

    cur.execute("SELECT * FROM zeronetspider.main")
    main = cur.fetchall()
    main = {"main": main}
    with open(".\data_main.json", "w", encoding="utf8") as f:
        json.dump(main, f, ensure_ascii=False, separators=(',', ':'))
    compress_gz(".\data_main.json")

    cur.execute("SELECT * FROM zeronetspider.keywords")
    keywords = cur.fetchall()
    keywords = {"keywords": keywords}
    with open(".\data_keywords.json", "w", encoding="utf8") as f:
        json.dump(keywords, f, ensure_ascii=False, separators=(',', ':'))
    compress_gz(".\data_keywords.json")

    cur.execute("SELECT * FROM zeronetspider.phrases")
    phrases = cur.fetchall()
    phrases = {"phrases": phrases}
    with open(".\data_phrases.json", "w", encoding="utf8") as f:
        json.dump(phrases, f, ensure_ascii=False, separators=(',', ':'))
    compress_gz(".\data_phrases.json")

    cur.execute("SELECT * FROM zeronetspider.relationship")
    rela = cur.fetchall()
    rela = {"relationship": rela}
    with open(".\data_relationship.json", "w", encoding="utf8") as f:
        json.dump(rela, f, ensure_ascii=False, separators=(',', ':'))
    compress_gz(".\data_relationship.json")


def export_relationship(filename, cursor):
    db = connect(host="localhost", port=3308, user="root", passwd="123456", db="zeronetspider", charset="utf8mb4")
    cur = db.cursor(cursor)
    cur.execute("SELECT * FROM zeronetspider.relationship")
    all = cur.fetchall()
    file = open(filename, "w", encoding="utf8")
    json.dump(all, file, ensure_ascii=False, separators=(',', ':'))
    file.close()


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
