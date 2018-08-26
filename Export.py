from pymysql import *
import json


def export_normal(filename):
    db = connect(host="localhost", port=3308, user="root", passwd="123456", db="zeronetspider", charset="utf8mb4")
    cur = db.cursor()
    cur.execute("SELECT * FROM zeronetspider.main")
    main = cur.fetchall()
    # cur.execute("SELECT * FROM zeronetspider.relationship")
    # relationship = cur.fetchall()
    cur.execute("SELECT * FROM zeronetspider.keywords")
    keywords = cur.fetchall()
    cur.execute("SELECT * FROM zeronetspider.phrases")
    phrases = cur.fetchall()
    all = [main, None, keywords, phrases]
    file = open(filename, "w", encoding="utf8")
    json.dump(all, file, ensure_ascii=False,separators=(',',':'))
    file.close()


# def export_normal_one_array(filename):
#     db = connect(host="localhost", port=3308, user="root", passwd="123456", db="zeronetspider", charset="utf8mb4")
#     cur = db.cursor()
#     cur.execute("SELECT * FROM zeronetspider.main")
#     items = list()
#     main = cur.fetchall()
#     for m in main:
#         cur.execute("SELECT * FROM zeronetspider.keywords where pageid={0}".format(m[0]))
#         keywords = cur.fetchall()
#         cur.execute("SELECT * FROM zeronetspider.phrases where pageid={0}".format(m[0]))
#         phrases = cur.fetchall()
#         item = list(m)
#         item.pop()
#         item.pop()
#         item.append(keywords)
#         item.append(phrases)
#         items.append(item)
#
#     file = open(filename, "w", encoding="utf8")
#     json.dump(items, file, ensure_ascii=False)
#     file.close()


export_normal(".\\data_normal.json")

# export_normal_one_array(".\\data.json")
