from pymysql import *
import json


def export_normal(filename, cursor):
    db = connect(host="localhost", port=3308, user="root", passwd="123456", db="zeronetspider", charset="utf8mb4")
    cur = db.cursor(cursor)
    cur.execute("SELECT * FROM zeronetspider.main")
    main = cur.fetchall()
    # cur.execute("SELECT * FROM zeronetspider.relationship")
    # relationship = cur.fetchall()
    cur.execute("SELECT * FROM zeronetspider.keywords")
    keywords = cur.fetchall()
    cur.execute("SELECT * FROM zeronetspider.phrases")
    phrases = cur.fetchall()
    all = {"main": main, "keywords": keywords, "phrases": phrases}
    file = open(filename, "w", encoding="utf8")
    json.dump(all, file, ensure_ascii=False, separators=(',', ':'))
    file.close()


def export_relationship(filename, cursor):
    db = connect(host="localhost", port=3308, user="root", passwd="123456", db="zeronetspider", charset="utf8mb4")
    cur = db.cursor(cursor)
    cur.execute("SELECT * FROM zeronetspider.relationship")
    all = cur.fetchall()
    file = open(filename, "w", encoding="utf8")
    json.dump(all, file, ensure_ascii=False, separators=(',', ':'))
    file.close()


def compress(filename):
    import bz2

    try:
        f_in = open(filename, 'rb')
        f_out = bz2.open(filename + ".bz2", 'wb')
        f_out.write(f_in.read())

    except Exception as e:
        print(e)


def compress_gz(filename):
    import gzip

    try:
        f_in = open(filename, 'rb')
        f_out = gzip.open(filename + ".gz", 'wb')
        f_out.write(f_in.read())

    except Exception as e:
        print(e)


def horizon_normal():
    filename = ".\\data_normal.json"
    export_normal(filename, cursors.DictCursor)
    compress_gz(filename)


def horizon_relationship():
    filename = ".\\data_relationship.json"
    export_relationship(filename, cursors.DictCursor)
    compress_gz(filename)
