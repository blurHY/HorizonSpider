from pymysql import *
import traceback
from SurfacePart.Utils import *
import time


class RowDeletedException(Exception):
    pass


class Database:

    def __init__(self, main):
        self.main = main
        self.db = connect(host="localhost", port=3308, user="root", passwd="123456", db="zeronetspider",
                          charset="utf8mb4")

    def __del__(self):
        print("Closing database connection")
        self.db.close()

    def url_pop(self):
        try:
            last = time.time()
            cursor = self.db.cursor()
            self.db.ping()
            cursor.execute(
                "select url,priority,id from main where state=0 order by priority limit 1")
            res = cursor.fetchone()
            if res:
                cursor.execute(
                    "update main set state=1 where id=%s", [res[2]])
            cursor.close()
            self.commit_or_rollback()
            print(time.time() - last)
            return res
        except IntegrityError as ie:
            self._error_info(ie)
        except:
            self._error_traceback()

    def urls_pop(self):
        try:
            cursor = self.db.cursor()
            self.db.ping()
            cursor.execute(
                "select url,priority,id from main where state=0 order by priority limit 100")
            res = cursor.fetchall()
            if res:
                cursor.execute(
                    "update main set state=1 where id=%s", [res[2]])
            cursor.close()
            self.commit_or_rollback()
            return res
        except IntegrityError as ie:
            self._error_info(ie)
        except:
            self._error_traceback()

    def url_scraped(self, id):
        self.update_main_item(id, state=2)

    def reset_scraping_but_not_success(self):
        try:
            cursor = self.db.cursor()
            self.db.ping()
            query = "update main set state=0 where state=1"
            cursor.execute(query)
            cursor.close()
        except IntegrityError as ie:
            self._error_info(ie)
        except:
            self._error_traceback()

    def update_main_item(self, id_or_url, on_1062_del=False, **kwargs):
        if type(id_or_url) == int:
            clause = "id={}".format(id_or_url)
        else:
            clause = "url='{}'".format(escape_string(id_or_url))

        try:
            cursor = self.db.cursor()
            self.db.ping()
            eqs = ",".join("{0}='{1}'".format(
                key, kwargs[key]) for key in kwargs.keys())
            query = "update main set {0} where {1}".format(eqs, clause)
            cursor.execute(query)
        except IntegrityError as ie:
            if on_1062_del and ie.args[0] == 1062 and clause and id_or_url:
                cursor.execute("delete from main where {}".format(clause))
                print("deleted")
                raise RowDeletedException()

            self._error_info(ie)
        except:
            self._error_traceback()
        finally:
            cursor.close()

    def insert_or_update_main_item(self, **kwargs):
        try:
            cursor = self.db.cursor()
            self.db.ping()
            keys = ",".join(key for key in kwargs.keys())
            values = ",".join("'" + escape_string(str(value)) +
                              "'" for value in kwargs.values())
            eqs = ",".join("{0}=values({0})".format(key)
                           for key in kwargs.keys())
            query = "insert into main({0}) values ({1}) on duplicate key update {2} ".format(
                keys, values, eqs)
            cursor.execute(query)
            cursor.close()
        except IntegrityError as ie:
            self._error_info(ie)
        except:
            self._error_traceback()

    def insert_or_update_blank_main_item_s(self, urls, priority):
        try:
            if len(urls) == 0:
                return
            cursor = self.db.cursor()
            self.db.ping()
            strx = "',0,'',0,{}".format(priority)
            stry = strx + "),('"
            # value = "('" + stry.join(urls) + strx + ")"
            value = "('"
            for url in urls:
                value += escape_string(shorted_url(url)) + stry  # ',0,'',0,{}),('
            value = value[:-3]
            query = "insert into main(url,imgcount,title,state,priority) values {0}" \
                    " on duplicate key update url=values(url) " \
                .format(value)
            cursor.execute(query)
            cursor.close()
        except IntegrityError as ie:
            self._error_info(ie)
        except:
            self._error_traceback()

    def get_main_item_id(self, url):
        """
        :param url:
        :return:  Item ID
        """
        cursor = self.db.cursor()
        self.db.ping()
        cursor.execute(
            "select id from main where url='{0}'".format(escape_string(url)))
        res = cursor.fetchone()
        cursor.close()
        if res is not None and len(res) >= 1:
            return res[0]
        return res  # None

    def add_phrases(self, pageid, phrases):
        try:
            cursor = self.db.cursor()
            self.db.ping()
            for phrase in phrases:
                cursor.execute(
                    "insert ignore into phrases(pageid,phrase) values ({0},'{1}')".format(pageid,
                                                                                          escape_string(phrase)))
            cursor.close()
        except IntegrityError as ie:
            self._error_info(ie)
        except:
            self._error_traceback()

    def add_keywords(self, pageid, keywords):
        try:
            cursor = self.db.cursor()
            self.db.ping()
            for keyword in keywords:
                cursor.execute(
                    "insert ignore into keywords(pageid,keyword) values ({0},'{1}')".format(pageid,
                                                                                            escape_string(keyword)))
            cursor.close()
        except IntegrityError as ie:
            self._error_info(ie)
        except:
            self._error_traceback()

    def add_relationship(self, parent_page_id, sub_page_ids):
        try:
            cursor = self.db.cursor()
            self.db.ping()
            for id_ in sub_page_ids:
                if parent_page_id and id_:
                    cursor.execute(
                        "insert ignore into relationship(parent,sub) values ('{0}',{1})".format(parent_page_id, id_))
            cursor.close()
        except IntegrityError as ie:
            self._error_info(ie)
        except:
            self._error_traceback()

    def _error_traceback(self, e=None):
        print(traceback.format_exc(), "Error")

    def _error_info(self, e):
        print(e)

    # 成功返回True
    def commit_or_rollback(self):
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            self._error_info(e)
            return False
        else:
            return True

    def site_status(self, objs):
        try:
            cursor = self.db.cursor()
            self.db.ping()
            cursor.execute("truncate zite")
            for obj in objs:
                cursor.execute(
                    "insert ignore into zite values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (None, obj["content"].get("description"), obj["content"].get("cloned_from"),
                     obj["content"].get("modified"),
                     obj["content"].get("title"), obj["content"].get("zeronet_version"), obj["content"].get("includes"),
                     obj["content"].get("files"), obj["content"].get("files_optional"), obj["peers"],
                     obj["settings"].get("size"),
                     obj["settings"].get("size_optional"), obj["content"].get("domain"),
                     len(obj["content"].get("translate", [])),
                     obj["content_updated"], obj.get("feed_follow_num"), obj["address"]))

            cursor.close()
            self.commit_or_rollback()
        except IntegrityError as ie:
            self._error_info(ie)
        except:
            self._error_traceback()


class FakeMain:
    pass


if __name__ == '__main__':
    db = Database(FakeMain())

    print(db.url_pop())
