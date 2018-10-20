import json
import os
import re
import secrets
import time
from functools import wraps
from urllib.parse import urlparse

import cloudinary.uploader
import passlib.hash as pwhash
import requests
from bs4 import BeautifulSoup as bs
from flask_sqlalchemy import SQLAlchemy
from htmlmin.minify import html_minify
from quart import (
    Quart,
    Response,
    abort,
    make_response,
    redirect,
    render_template,
    send_from_directory,
    request,
    session,
    websocket,
)
from sqlalchemy.orm.attributes import flag_modified

from flask_tools import flaskUtils

app = Quart(__name__)
flaskUtils(app)

app.secret_key = "GI4cEwO7e2g-Hc6jpo-StrXyRi_Qx8PTrCzzSfiR"
dburl = os.environ.get("DATABASE_URL")
try:
    if dburl is None:
        with open(".dbinfo_", "r") as f:
            dburl = f.read()
except FileNotFoundError:
    raise Exception(
        "No DB url specified try add it to the environment or create a .dbinfo_ file with the url"
    )
app.config["SQLALCHEMY_DATABASE_URI"] = dburl
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3163.100 Safari/537.36"


def open_and_read(fn: str, mode: str = "r", strip: bool = True):
    if not os.path.isfile(fn):
        return None
    with open(fn, mode) as f:
        if strip:
            data = f.read().strip()
        else:
            data = f.read()
    return data


def check_password_hash(_hash, pw):
    meth = pwhash.pbkdf2_sha512
    return meth.verify(pw, _hash)


def generate_password_hash(pw):
    meth = pwhash.pbkdf2_sha512
    return meth.hash(pw)


class userData(db.Model):
    # pylint: disable=E1101
    user = db.Column(db.String, primary_key=True)
    pw_hash = db.Column(db.String(1000))
    # pylint: enable=E1101

    def __init__(self, u, pw):
        self.user = u
        self.pw_hash = pw

    def __repr__(self):
        return "<USER:%r>" % self.user


class User(object):
    def __init__(self, username, password):
        self.username = username
        self.set_password(password)

    def set_password(self, password):
        self.pw_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.pw_hash, password)


def is_heroku(url):
    parsedurl = urlparse(url).netloc
    return (
        "127.0.0.1" not in parsedurl
        or "localhost" not in parsedurl
        or "192.168." not in parsedurl
    ) and "herokuapp" in parsedurl


app.__connectedSockets__ = set()


def collect_websocket(func):
    # https://medium.com/@pgjones/websockets-in-quart-f2067788d1ee
    @wraps(func)
    async def wrapper(*args, **kwargs):
        _obj = websocket._get_current_object()
        setattr(_obj, "idxs", session["user"])
        tr = []
        for i in app.__connectedSockets__:
            if i.idxs == session["user"]:
                print("Multiple Socket Connections..removing previous one")
                tr.append(i)
        [app.__connectedSockets__.remove(i) for i in tr]
        app.__connectedSockets__.add(_obj)
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            app.__connectedSockets__.remove(_obj)
            print(f"Removing {_obj.idxs}")
            raise e

    return wrapper


@app.route("/logout/")
async def logout():
    keys = [s for s in session]
    [session.pop(i) for i in keys]
    return redirect("/?auth=0")


@app.route("/@/binary/", methods=["POST"])
async def get_files():
    data = await request.data
    resp = upload(data)
    return Response(
        json.dumps({"url": resp["secure_url"]}), content_type="application/octet-stream"
    )


def validate_stamp(stamp: int) -> int:
    if not isinstance(stamp, (str, float, int)) or (
        isinstance(stamp, str) and not stamp.isnumeric()
    ):
        return time.time() * 1000
    return abs(int(stamp)) if isinstance(stamp, str) else abs(stamp)



@app.websocket("/@/messenger/")
@collect_websocket
async def messenger():
    print([s.idxs for s in app.__connectedSockets__])
    __available_types = ("typing", "message", "fetch_messages", "read")
    users = app.__connectedSockets__
    ws = websocket
    if not session.get("logged_in"):
        return await ws.send('{"error":"Not Logged in"}')
    while 1:
        _message = await ws.receive()
        try:
            # Database to be updated only on Read and message type calls
            message = json.loads(_message)
            if not all(i in message for i in ("user", "message", "stamp")):
                await ws.send(json.dumps({"error": f"Insufficient Data received"}))
            else:
                user = message.get("user")
                text = message.get("message")
                istyping = message.get("typing")
                fetch = message.get("fetch_messages")
                read = message.get("read")
                stamp = validate_stamp(message.get("stamp"))
                media = message.get("media")
                _from = message.get("fetch_from")
                chat_data = None
                chat_data_args = (session["user"], user, is_heroku(ws.url))
                _connected_ = [s for s in users if s.idxs == user]
                if session["user"] == user:
                    ws.send(json.dumps({"error": "Invalid recepient"}))
                chat = check_chat_data(*chat_data_args)
                if not chat:
                    print(
                        f"Creating A new Chat between '{session['user']}' and '{user}'"
                    )
                    chat = create_chat_data(session["user"], user)
                else:
                    print(
                        f"Using Existing Chat with id:{chat.id_};Participants:{session['user']}<=>{user}"
                    )
                chat_id = chat.id_
                if istyping:
                    rec_user = _connected_[0] if _connected_ else None
                    if rec_user:
                        await rec_user.send(
                            json.dumps(
                                {"message": None, "typing": True, "stamp": stamp}
                            )
                        )

                elif text:
                    rec_user = _connected_[0] if _connected_ else None
                    chat_data = {
                        "chatid": chat_id,
                        "data": {
                            "message": text,
                            "sender": session["user"],
                            "stamp": stamp,
                            "read": False,
                            "media": False,
                            "mediaURL": None,
                            "rstamp": None,
                            "receiver": user,
                        },
                    }
                    ind = alter_chat_data(chat_data)
                    to_send = json.dumps({**chat_data["data"], "msgid": ind})
                    await ws.send(to_send)
                    if rec_user:
                        await rec_user.send(to_send)
                elif fetch:
                    if not _from:
                        await ws.send(
                            json.dumps(
                                {
                                    "data": check_chat_data(id_=chat_id).chats,
                                    "fetch": True,
                                    "full_fetch": True,
                                }
                            )
                        )
                    else:
                        _data = check_chat_data(id_=chat_id).chats
                        tsend = get_data_from(_data, _from)
                        await ws.send(
                            json.dumps(
                                {
                                    "data": tsend,
                                    "full_fetch": False,
                                    "fetch": True,
                                    "fetched_from": _from + 1,
                                }
                            )
                        )
                elif read and read.get("user") != session["user"]:
                    data = read
                    msgs = chat.chats
                    idx = data.get("id")
                    part_msg = msgs.get(idx)
                    if not part_msg:
                        await ws.send(json.dumps({"error": "no such message"}))
                    else:
                        part_msg["read"] = True
                        msgs[idx] = part_msg
                        rec_user = _connected_[0] if _connected_ else None
                        chat_data = {
                            "chatid": chat_id,
                            "msgid": idx,
                            "update": {"read": True, "rstamp": stamp},
                        }
                        if rec_user:
                            await rec_user.send(json.dumps(chat_data))
                        alter_chat_data(chat_data, True)
                elif media:
                    rec_user = _connected_[0] if _connected_ else None
                    chat_data = {
                        "chatid": chat_id,
                        "data": {
                            "message": None,
                            "sender": session["user"],
                            "stamp": stamp,
                            "read": False,
                            "media": True,
                            "mediaURL": media,
                            "rstamp": None,
                            "receiver": user,
                        },
                    }
                    ind = alter_chat_data(chat_data)
                    to_send = json.dumps({**chat_data["data"], "msgid": ind})
                    await ws.send(to_send)
                    if rec_user:
                        await rec_user.send(to_send)

        except Exception as e:
            await ws.send(
                json.dumps(
                    {"error": f"Invalid Data received from the user: {_message[:50]}"}
                )
            )
            raise (e)


def get_data_from(_dict, _from):
    mark = None
    tr = {}
    if not isinstance(_from, (str, int)):
        print("Bad Type")
        return {}
    elif isinstance(_from, str):
        if not _from.isnumeric():
            print("not a number")
            return {}
        mark = int(_from) + 1
    else:
        mark = _from + 1
    while 1:
        data = _dict.get(mark)
        if data:
            tr[mark] = data
            mark += 1
        else:
            break
    return tr


def alter_chat_data(data, update=False):
    # pylint: disable=E1101
    if update and data.get("msgid") is None:
        raise ValueError("Cannot Update without message ID")
    msgs = {}
    if not update:
        chat_data = chatData.query.filter_by(id_=data["chatid"]).first()
        msgs = chat_data.chats
        msg_index = len(msgs)
        msgs[msg_index] = data["data"]
        chat_data.chats = msgs
        flag_modified(chat_data, "chats")
        db.session.merge(chat_data)
        db.session.commit()
        return msg_index
    else:
        chat_data = chatData.query.filter_by(id_=data["chatid"]).first()
        msgs = chat_data.chats
        msgid = data["msgid"]
        edit_ = msgs[msgid]
        edit_["read"] = data["update"]["read"]
        edit_["rstamp"] = data["update"]["rstamp"]
        msgs[msgid] = edit_
        chat_data.chats = msgs
        flag_modified(chat_data, "chats")
        db.session.merge(chat_data)
        db.session.commit()
        return True
    # pylint: enable=E1101


@app.route("/api/chatid/", methods=["POST"])
async def get_chat_id():
    form = await request.form
    if not session.get("logged_in") or not session.get("user"):
        return "", 403
    elif not form.get("side_a") and not form.get("side_b"):
        return "", 500
    elif session["user"] != form.get("side_a"):
        return "Invalid Request", 500
    data = check_chat_data(form["side_a"], form["side_b"])
    if not data:
        return "", 403
    else:
        return data.id_


def check_chat_data(
    u1: str = None, u2: str = None, isheroku: bool = True, id_: str = None
):
    if id_:
        dat = chatData.query.filter_by(id_=id_).first()
        if dat:
            return dat
    n1, n2 = sorted((u1, u2))
    __data = None
    _testvar_ = False
    if not isheroku and _testvar_:
        # cache localhost chat between dummy account to not create a DB call on every message
        __data = open_and_read("__usercache.json")
    if __data:
        d = json.loads(__data)
        print("Cached Data")
        return chatData(u1=d["user1"], u2=d["user2"])
    data = (
        chatData.query.filter_by(user1=n1, user2=n2).first()
        or chatData.query.filter_by(user1=n2, user2=n1).first()
    )  # we shoudln't be checking the second one but better safe than sorry
    if data and not is_heroku and _testvar_:
        tw = {
            "chats": data.chats,
            "id_": data.id_,
            "user1": data.user1,
            "user2": data.user2,
        }
        with open("__usercache.json", "w") as f:
            f.write(json.dumps(tw))
    return data


def create_chat_data(u1: str, u2: str) -> bool:
    n1, n2 = sorted((u1, u2))
    data = chatData(u1=n1, u2=n2)
    if (
        not userData.query.filter_by(user=n1).first()
        or not userData.query.filter_by(user=n2).first()
    ):
        raise RuntimeError("Cannot create chat between Non Existent users")
    # pylint: disable=E1101
    db.session.add(data)
    db.session.commit()
    return data
    # pylint: enable=E1101


class chatData(db.Model):
    # pylint: disable=E1101
    id_ = db.Column(db.String(20), primary_key=True)
    user1 = db.Column(db.String(1000))
    user2 = db.Column(db.String(1000))
    chats = db.Column(db.PickleType)
    # pylint: enable=E1101
    def __init__(self, u1, u2, chats={}):
        self.id_ = secrets.token_urlsafe(10)
        self.user1 = u1
        self.user2 = u2
        self.chats = chats

    def __repr__(self):
        return "<Chat:%r <=> %r>" % (self.user1, self.user2)


def upload(imgurl):
    clapi_key = os.environ.get("key") or open_and_read("a.cloudinary")
    clapi_secret = os.environ.get("cl_secret") or open_and_read("b.cloudinary")
    if clapi_key is None:
        raise Exception("no key provided")
    cloudinary.config(
        cloud_name="cdn-media-proxy", api_key=clapi_key, api_secret=clapi_secret
    )
    a = cloudinary.uploader.upload(imgurl)
    return a


@app.route("/")
async def main():
    session["u-id"] = secrets.token_urlsafe(30)
    if not session.get("user"):
        session["logged_in"] = False
    if session.get("logged_in"):
        return redirect(f"/u/{session['user']}/?auth=1")
    return html_minify(await render_template("index.html", nonce=session["u-id"]))


@app.route("/login/check/", methods=["GET", "POST"])
async def login():
    resp, code = json.dumps({"response": "dummy"}), 200
    if request.method == "GET":
        return redirect("/?wmsg_rd=login")
    reqform = await request.form
    user, password, integrity = (
        reqform.get("user"),
        reqform.get("password"),
        reqform.get("integrity"),
    )
    if user is None or password is None or integrity != session["u-id"]:
        resp = await make_response(
            json.dumps({"error": "fields_empty_or_session_error"})
        )
        code = 403
    udata = userData.query.filter_by(user=user).first()
    if udata is None:
        resp = await make_response(json.dumps({"error": "no_such_user"}))
        code = 403
        return resp, code
    session["logged_in"] = False
    if check_password_hash(udata.pw_hash, password):
        session["logged_in"] = True
        session["user"] = udata.user
        resp = await make_response(
            json.dumps({"success": "authenticated", "user": udata.user})
        )
    else:
        session["logged_in"] = False
        resp = await make_response(json.dumps({"error": "incorrect_password"}))
        code = 403
    resp.headers["Content-Type"] = "application/json"
    return resp, code


@app.route("/register/check/", methods=["GET", "POST"])
async def register():
    if request.method == "GET":
        return redirect("/?wmsg_rd=login")
    reqform = await request.form
    user, password, integrity, checkpw, sessid = (
        reqform.get("user"),
        reqform.get("password"),
        reqform.get("integrity"),
        reqform.get("checkpw"),
        session["u-id"],
    )
    if user is None or password != checkpw or password is None or integrity != sessid:
        return Response(
            json.dumps({"error": "fields_empty_or_session_error"}),
            content_type="application/json",
            status=403,
        )
    if (
        len(user) == 0
        or len(password) == 0
        or not re.search(r"^[0-9a-zA-Z_.-]+$", user)
    ):
        return Response(
            json.dumps({"error": "bad_request"}),
            content_type="application/json",
            status=403,
        )
    u_data = User(user, password)
    if userData.query.filter_by(user=user).first():
        return Response(
            json.dumps({"error": "username_taken"}),
            content_type="application/json",
            status=403,
        )
    data = userData(u_data.username, u_data.pw_hash)
    try:
        # pylint: disable=E1101
        db.session.add(data)
        db.session.commit()
        # pylint: enable=E1101
    except:
        return Response(
            json.dumps({"error": "username_taken"}),
            content_type="application/json",
            status=403,
        )
    print("registered:", data)
    return Response(
        json.dumps({"success": "login_now"}), content_type="application/json"
    )


@app.route("/api/user-search/tokens/<nonce>")
async def get_search_token(nonce):
    if nonce != session.get("u-id"):
        return ""
    token = secrets.token_hex(20)
    session["search-token"] = token
    return token


@app.route("/api/users/", methods=["POST"])
async def get_search_results():
    reqform = await request.form
    token = reqform["token"]
    user = reqform.get("user")
    if isinstance(user, str):
        user = re.sub(r"[^-\w]", "", user)
        print("sanitized user:", user)
    if not user or len(user) == 0:
        print("invalid user args")
        resp = {"users": []}
    if token != session["search-token"]:
        print("Invalid Token")
        resp = {"users": []}
    data = [
        s.user
        for s in userData.query.filter(userData.user.op("~")(r"(?is).*?%s" % (user)))
        .limit(30)
        .all()
        if s.user != session["user"]
    ]
    session.pop("search-token")
    resp = {"users": data}
    return Response(json.dumps(resp), content_type="application/json")


@app.route("/u/<user>/", strict_slashes=False)
async def userpages(user):
    if not session.get("logged_in"):
        return redirect("/?auth=0")
    session["u-id"] = secrets.token_urlsafe(30)
    if session["user"] == user:
        return html_minify(
            await render_template("user.html", nonce=session["u-id"], user=user)
        )
    else:
        return redirect(f"/u/{session['user']}")
    return html_minify(
        await render_template("chat.html", nonce=session["u-id"], user=user)
    )


if __name__ == "__main__":
    app.run(use_reloader=True, host="0.0.0.0")
