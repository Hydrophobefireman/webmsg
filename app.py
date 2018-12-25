import hashlib
import json
import os
import random
import re
import secrets
import shutil
import time
from functools import wraps
from urllib.parse import urlparse

import cloudinary.uploader
from bs4 import BeautifulSoup as bs
from flask_sqlalchemy import SQLAlchemy
from htmlmin.minify import html_minify
from quart import (
    Quart,
    Response,
    abort,
    jsonify,
    make_response,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    websocket,
)
from sqlalchemy import func, or_
from sqlalchemy.orm.attributes import flag_modified

import envs
from notificationmanager import notify
from utils import (
    check_password_hash,
    dburl,
    generate_password_hash,
    get_data_from,
    is_heroku,
    is_logged_in,
    open_and_read,
    safe_int,
)

app = Quart(__name__)
app.__sockets__ = set()

app.secret_key = os.environ.get("_secret-key")
app.config["SQLALCHEMY_DATABASE_URI"] = dburl
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3163.100 Safari/537.36"


class userData(db.Model):
    # pylint: disable=E1101
    user = db.Column(db.String, primary_key=True)
    pw_hash = db.Column(db.String(1000))
    notification_id = db.Column(db.String(1000))
    # pylint: enable=E1101

    def __init__(self, u, pw, n=""):
        self.user = u
        self.pw_hash = pw
        self.notification_id = n

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


class chatData(db.Model):
    # pylint: disable=E1101
    id_ = db.Column(db.String(30), primary_key=True)
    user1 = db.Column(db.String(100))
    user2 = db.Column(db.String(100))
    chats = db.Column(db.PickleType)
    updates = db.Column(db.PickleType)
    # pylint: enable=E1101
    def __init__(self, u1, u2, chats={}):
        self.id_ = secrets.token_urlsafe(random.randint(12, 18))
        self.user1 = u1
        self.user2 = u2
        self.chats = chats
        self.updates = []

    def __repr__(self):
        return "<Chat:%r <=> %r>" % (self.user1, self.user2)


@app.route("/")
async def main():
    if is_heroku(request.url):
        return redirect("https://chat.pycode.tk")
    session.permanent = True
    session["u-id"] = secrets.token_urlsafe(30)
    if not session.get("user"):
        session["logged_in"] = False
    return html_minify(await render_template("index.html", nonce=session["u-id"]))


@app.route("/api/gen_204/", strict_slashes=False)
async def api_app_wake_up():
    # __import__("time").sleep(2000)
    return Response("", status=204)


@app.after_request
async def resp_headers(resp):
    if "localhost" in request.headers.get("origin", ""):
        resp.headers["access-control-allow-origin"] = request.headers["origin"]
    else:
        resp.headers["access-control-allow-origin"] = "https://chat.pycode.tk"
    resp.headers["Access-Control-Allow-Headers"] = request.headers.get(
        "Access-Control-Request-Headers", "*"
    )
    resp.headers["access-control-allow-credentials"] = "true"
    return resp


@app.route("/api/set-notification-token/", methods=["POST"])
async def make_notif():
    form = await request.form
    if not is_logged_in(session) or not form.get("token"):
        return "NO"
    token = form.get("token")
    user = userData.query.filter(
        func.lower(userData.user) == func.lower(session["user"])
    ).first()
    if not user:
        return "ERROR:USER NOT IN DB", 500
    user.notification_id = token
    # pylint: disable=E1101
    db.session.commit()
    # pylint: enable=E1101
    return "OK"


@app.route("/logout/")
async def logout():
    session.clear()
    return redirect("/?auth=0")


@app.route("/api/logout/", methods=["POST"])
async def logout_api():
    session.clear()
    return Response(json.dumps({"ok": "logged-out"}))


@app.route("/@/binary/", methods=["POST"])
async def upload_bin():
    data = await request.data
    resp = upload(data)
    return Response(
        json.dumps({"url": resp["secure_url"]}), content_type="application/octet-stream"
    )


# @app.route("/api/get")
@app.route("/api/getuser/", methods=["POST"], strict_slashes=False)
async def api_tools():
    if not is_logged_in(session):
        return Response("__error__", status=403, content_type="application/json")
    return Response(f')}}]{session["user"]}', content_type="application/json")


@app.route("/api/updates/", methods=["POST"])
async def get_updates():
    fetch_time: float = time.time()
    form: dict = await request.form
    if not is_logged_in(session):
        return Response(json.dumps({"error": "not_authenticated"}), status=403)
    chat_id: str = form.get("chat_id")
    fetch_from: int = form.get("fetch_from")
    full_fetch: bool = fetch_from == 0 or fetch_from == "0"
    _chat_data: chatData = check_chat_data(id_=chat_id)
    chats: dict = _chat_data.chats
    updates: dict = _chat_data.updates
    for k, v in chats.items():
        if v.get("sender") != session["user"] and not v.get("rstamp"):
            chats[k]["read"]: bool = True
            stamp: float = time.time() * 1000
            chats[k]["rstamp"]: float = stamp
    _chat_data.chats = chats
    flag_modified(_chat_data, "chats")
    # pylint: disable=E1101
    db.session.merge(_chat_data)
    db.session.commit()
    # pylint: enable=E1101
    data: dict = get_data_from(chats, fetch_from, session["user"], "messages")
    return Response(
        json.dumps(
            {
                "update_data": updates,
                "message_data": data,
                "newest_message_id": fetch_from,
                "full_fetch": full_fetch,
                "sp": time.time() - fetch_time,
            }
        )
    )


@app.route("/api/chat_ids/", methods=["POST"])
async def get_previous_chats():
    _idx = await request.form
    idx = _idx.get("user")
    if not idx or not idx == session.get("user") or not session.get("logged_in"):
        return Response(json.dumps({"error": "Not Authenticated"}), status=403)
    _chats1 = chatData.query.filter(
        or_(chatData.user1 == idx, chatData.user2 == idx)
    ).all()
    all_chats = [
        s
        for s in map(
            lambda x: {"user": x.user1, "chat_id": x.id_}
            if not x.user1 == idx
            else {"user": x.user2, "chat_id": x.id_},
            _chats1,
        )
    ]
    return Response(
        json.dumps({"previous_chats": all_chats}), content_type="application/json"
    )


@app.route("/api/chat-stats", methods=["POST"], strict_slashes=False)
async def get_chat_ids():
    content_type = "application/octet-stream"
    form = await request.form
    idx = form.get("chat_id")
    if not idx or not is_logged_in(session):
        return Response(
            json.dumps({"error": "Invalid Credentials"}),
            content_type=content_type,
            status=401,
        )
    data = check_chat_data(id_=idx)
    if not data:
        return Response(
            json.dumps({"error": "Invalid ID"}), content_type=content_type, status=403
        )
    if session["user"] not in (data.user1, data.user2):
        return Response(
            json.dumps({"error": "InvalidID"}), content_type=content_type, status=403
        )
    user1 = data.user1 if not data.user1 == session["user"] else data.user2
    chat_id = data.id_
    _socket = sockets_get(user1)
    userHasSocket: str = "online" if _socket else "offline"
    return Response(
        json.dumps(
            {
                "is_online": userHasSocket,
                "chat_id": chat_id,
                "chat_with": user1,
                "HERE": session["user"],
            }
        ),
        content_type=content_type,
    )


@app.route("/api/integrity/", methods=["POST"], strict_slashes=False)
async def api_integ():
    session.permanent = True
    try:
        session.pop("u-id")
    except:
        pass
    session["u-id"] = secrets.token_urlsafe(20)
    return jsonify({"key": session["u-id"]})


@app.route("/firebase-messaging-sw.js")
async def fbsw():
    return await send_from_directory("static", "firebase-sw.js")


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
    udata = userData.query.filter(func.lower(userData.user) == func.lower(user)).first()
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
        code = 200
    else:
        session["logged_in"] = False
        resp = await make_response(json.dumps({"error": "incorrect_password"}))
        code = 403
    resp.headers["Content-Type"] = "application/json"
    session.permanent = True
    return resp, code


@app.route("/favicon.ico")
async def faviconss():
    return await send_from_directory("static", "favicon.ico")


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
    if userData.query.filter(func.lower(userData.user) == func.lower(user)).first():
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
    session.permanent = True
    session["search-token"] = token
    return token


def collect_websocket(func):
    # https://medium.com/@pgjobnes/websockets-in-quart-f2067788d1ee
    @wraps(func)
    async def wrapper(*args, **kwargs):
        _obj = websocket._get_current_object()
        setattr(_obj, "idxs", session["user"])
        tr = []
        for i in app.__sockets__:
            if i.idxs == session["user"]:
                print("Multiple Socket Connections..removing previous one")
                tr.append(i)
        try:
            [app.__sockets__.remove(i) for i in tr]
        except KeyError:
            pass
        app.__sockets__.add(_obj)
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            try:
                app.__sockets__.remove(_obj)
            except KeyError:
                pass
            print(f"Removing {_obj.idxs}")
            raise e

    return wrapper


def sockets_get(u):
    a = [i for i in app.__sockets__ if i.idxs == u]
    if a:
        return a[0]
    return None


class Responder:
    def __init__(self, ws_obj: websocket) -> None:
        self.socket = ws_obj
        self._chat_meta = {
            "meta": {"from": session.get("user"), "sessid": secrets.token_urlsafe(10)}
        }
        self._user: str = None
        self._req = {}

    async def cred_check(self, _session: dict) -> bool:
        if not is_logged_in(_session):
            await self.send_message(
                {"error": "Not Authenticated..did you clear your cookies?"}
            )
            return False
        self.user: str = _session["user"]
        return True

    def parse_json_or_none(self, msg: str) -> dict:
        try:
            return json.loads(msg)
        except:
            return None

    async def send_string(self, data: str, peer=None) -> None:
        socket_obj = peer or self.socket
        if not socket_obj:
            return print("No socket")
        return await socket_obj.send(data)

    async def send_message(self, data: dict, peer=None) -> None:
        unpck = json.dumps({**self._chat_meta, **data})
        return await self.send_string(unpck, peer)

    async def create_socket_response(self):
        msg = await self.socket.receive()
        if msg == "ping" or msg == "pong":
            return await self.send_string(("ping" if msg == "ping" else "pong"))
        self.current_message = msg
        self._data = self.parse_json_or_none(msg)
        if not self._data:
            return
        peer: str = self._data.get("peer")
        peer_socket: websocket = sockets_get(peer)
        tpe: str = self._data.get("type")
        data: dict = self._data.get("data")
        if not tpe:
            return await self.send_message({"error": "Invalid Values"})
        if tpe == "use_fallback":
            if peer:
                return await self.send_message({"type": tpe, "data": data}, peer_socket)
        if tpe == "rtc_data":
            return await self.send_message({"type": tpe, "data": data}, peer_socket)
        if tpe == "message-relay":
            if not peer_socket:
                return await notify_user(session["user"], peer, data)
            # alter_chat_data({**data, "sender": session["user"], "receiver": peer}, True)
            return await self.send_message({"type": tpe, "data": data}, peer_socket)
        if tpe == "binary-file":
            if peer_socket:
                return await self.send_message({"type": tpe, "data": {}}, peer_socket)
        if tpe == "direct-relay":
            return await self.send_message({"type": tpe, "data": data}, peer_socket)
        if tpe == "start_chat":
            if peer_socket:
                return await self.send_message(
                    {
                        "type": "online_status",
                        "data": {
                            "user": session["user"],
                            "isonline": True,
                            "common_chat_id": check_or_create_chat(
                                peer, session["user"]
                            ).id_,
                        },
                    },
                    peer_socket,
                )
        if tpe == "get_role":
            return await self.send_message({"type": tpe, "data": data}, peer_socket)
        if tpe == "fetch-update":
            resp = {"type": "ping-update", "data": []}
            msg_ids: list = data.get("msgids", [])
            chat_id: str = data.get("chat_id")
            chat_data = check_chat_data(id_=chat_id).chats
            for idx in msg_ids:
                message: dict = chat_data.get(str(idx)) or chat_data.get(safe_int(idx))
                if not message:
                    continue
                if message.get("sender") == session["user"] and message.get("read"):
                    resp["data"].append(
                        {
                            "chat_id": chat_id,
                            "update_type": "read",
                            "msg": idx,
                            "rstamp": message.get("stamp"),
                        }
                    )
            return await self.send_message(resp)
        if tpe == "update":
            update_type: str = data.get("update_type")
            details: dict = data.get("details")
            _chat_id: str = details.get("chat_id")
            if update_type == "read-update":
                msgid = details.get("read")
                stamp = details.get("rstamp")
                chat_data = check_chat_data(id_=_chat_id)
                if chat_data:
                    chts = chat_data.chats
                    msg = chts.get(str(msgid)) or chts.get(safe_int(msgid))
                    msg["read"] = True
                    msg["rstamp"] = stamp
                    chts[safe_int(msgid)] = msg
                    chat_data.chats = chts
                    flag_modified(chat_data, "chats")
                    # pylint: disable=E1101
                    db.session.merge(chat_data)
                    db.session.commit()
                    print("updated")
                    # pylint: enable=E1101
                    return await self.send_message(
                        {
                            "type": "chat-update",
                            "data": {
                                "chat_id": _chat_id,
                                "update_type": "read",
                                "msg": msgid,
                                "rstamp": stamp,
                            },
                        },
                        peer_socket,
                    )

        if tpe == "send_role":
            print(peer_socket)
            offerer = data.get("is_offerer")
            await self.send_message(
                {"type": "set_role", "data": {"is_offerer": not offerer}}
            )
            return await self.send_message(
                {"type": "set_role", "data": {"is_offerer": offerer}}, peer_socket
            )


@app.route("/api/instant-message/", methods=["POST"])
async def instants():
    form = await request.get_json()
    if not is_logged_in(session):
        return "{}", 403
    details = form.get("details")
    _chat_id = details.get("chat_id")
    _data = details.get("data")
    _new_msg_id = alter_chat_data(_data, _chat_id, True)
    ws_obj = sockets_get(_data.get("receiver"))
    if ws_obj:
        await ws_obj.send(
            json.dumps(
                {
                    "meta": {
                        "from": session.get("user"),
                        "sessid": secrets.token_urlsafe(10),
                    },
                    "data": {"msgid": _new_msg_id},
                    "type": "get-update",
                }
            )
        )
    return Response(
        json.dumps({"type": "new_message", "data": _new_msg_id}),
        content_type="application/json",
    )


@app.websocket("/_/data/")
@collect_websocket
async def messenger():
    ws = Responder(websocket)
    while 1:
        cred = await ws.cred_check(session)
        if not cred:
            return
        await ws.create_socket_response()


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
        return jsonify({"users": []})
    if token != session["search-token"]:
        print("Invalid Token")
        return jsonify({"users": []})
    _data = [
        s
        for s in userData.query.filter(
            userData.user.op("~")(r"(?is).*?%s" % (re.escape(user)))
        )
        .limit(30)
        .all()
        if s.user != session["user"]
    ]
    data = [
        {"user": s.user, "chat_id": check_or_create_chat(session["user"], s.user).id_}
        for s in _data
    ]
    resp = {"users": data}
    return jsonify(resp)


def check_or_create_chat(user1, user2):
    a = check_chat_data(user1, user2)
    if not a:
        return create_chat_data(user1, user2)
    return a


async def notify_user(sender=None, receiver=None, data=None):
    data["sender"] = sender
    if isinstance(data.get("message"), dict):
        data["media"] = data["message"].get("media")
        data["mediaURL"] = data["message"].get("mediaURL")
        data["message"] = None
    try:
        notify(receiver, data, userData)
    except:
        pass


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


def check_chat_data(u1=None, u2=None, id_=None) -> chatData:
    if id_:
        dat = chatData.query.filter_by(id_=id_).first()
        if dat:
            return dat
    if not u1 or not u2:
        print("No useful arguments")
        return None
    n1, n2 = sorted((u1, u2))
    __data = None
    data = (
        chatData.query.filter_by(user1=n1, user2=n2).first()
        or chatData.query.filter_by(user1=n2, user2=n1).first()
    )  # we shoudln't be checking the second one but better safe than sorry
    return data


def verify_chat(u1, u2, idx):
    n1, n2 = sorted((u1, u2))
    dat = check_chat_data(id_=idx)
    if not dat:
        return False
    if (n1 == dat.user1 and n2 == dat.user2) or (n1 == dat.user2 and n2 == dat.user1):
        if idx == dat.id_:
            return dat
        else:
            False
    else:
        False


def flag_chat_updates(column, updates):
    column.updates = updates
    flag_modified(column, "updates")
    # pylint: disable=E1101
    db.session.merge(column)
    db.session.commit()
    # pylint: enable=E1101


def create_chat_data(u1: str, u2: str) -> bool:
    if u1 == u2:
        return False
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


def alter_chat_data(data, chat_id, new_message=False, read=False):
    # pylint: disable=E1101
    if (read) and data.get("msgid") is None:
        raise ValueError("Cannot Update without message ID")
    msgs = {}
    chat_data = chatData.query.filter_by(id_=chat_id).first()
    msgs = chat_data.chats
    if new_message:
        print("Altering data")
        msg_index = len(msgs)
        msgs[msg_index] = data
        chat_data.chats = msgs
        flag_modified(chat_data, "chats")
        db.session.merge(chat_data)
        db.session.commit()
        return msg_index
    elif read:
        # TODO fix
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


@app.errorhandler(404)
async def handle404(error):
    return redirect("/")


@app.errorhandler(500)
async def handle500(error):
    print(error)
    return Response(
        json.dumps({"error": "An unknown error occured on our end.."}),
        content_type="application/json",
    )


# for heroku nginx
@app.before_serving
def open_to_nginx():
    try:
        open("/tmp/app-initialized", "w").close()
    except:
        pass


# WebRTC signalling thorugh-->WebSockets..set up a signalling mechanism

if __name__ == "__main__":
    app.run(host="0.0.0.0", use_reloader=True)
