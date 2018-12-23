import os
import random
import time
from urllib.parse import urlparse

import passlib.hash as pwhash

dburl = os.environ.get("DATABASE_URL")


def check_password_hash(_hash, pw):
    meth = pwhash.pbkdf2_sha512
    return meth.verify(pw, _hash)


def generate_password_hash(pw):
    meth = pwhash.pbkdf2_sha512
    return meth.hash(pw)


def open_and_read(fn: str, mode: str = "r", strip: bool = True):
    if not os.path.isfile(fn):
        return None
    with open(fn, mode) as f:
        if strip:
            data = f.read().strip()
        else:
            data = f.read()
    return data


def is_logged_in(session):
    return session.get("logged_in") and session.get("user")


def safe_int(i):
    if not isinstance(i, (str, int)):
        print("Bad Type")
        return {}
    elif isinstance(i, str):
        if not i.isnumeric():
            raise Exception("not a number")
        return int(i)
    return i


def get_data_from(_dict, _from, user, _type):
    mark = None
    tr = {_type: {}}
    print(_from)
    mark = safe_int(_from) + 1
    while 1:
        data = _dict.get(mark)
        if data:
            tr[_type][mark] = data
            mark += 1
        else:
            break
    return tr


def is_heroku(url):
    parsedurl = urlparse(url).netloc
    return (
        "127.0.0.1" not in parsedurl
        or "localhost" not in parsedurl
        or "192.168." not in parsedurl
    ) and "herokuapp" in parsedurl


# def validate_stamp(stamp: int) -> int:
#     if not isinstance(stamp, (str, float, int)) or (
#         isinstance(stamp, str) and not stamp.isnumeric()
#     ):
#         return time.time() * 1000
#     return abs(int(stamp)) if isinstance(stamp, str) else abs(stamp)


# def force_join(_list, lim=","):
#     return lim.join(map(str, _list))
# def is_heroku(url):
#     parsedurl = urlparse(url).netloc
#     return (
#         "127.0.0.1" not in parsedurl
#         or "localhost" not in parsedurl
#         or "192.168." not in parsedurl
#     ) and "herokuapp" in parsedurl
