import hashlib
import json
import os
import re
import secrets
import shutil
import time
from functools import wraps
from urllib.parse import urlparse
import cloudinary.uploader
import passlib.hash as pwhash
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
    request,
    send_from_directory,
    session,
    jsonify,
    websocket,
)
from sqlalchemy import or_
from sqlalchemy.orm.attributes import flag_modified

import envs
from flask_tools import flaskUtils
from notificationmanager import notify

app = Quart(__name__)
app.__sockets__ = set()
flaskUtils(app)

app.secret_key = os.environ.get("_secret-key")
dburl = os.environ.get("DATABASE_URL")


def open_and_read(fn: str, mode: str = "r", strip: bool = True):
    if not os.path.isfile(fn):
        return None
    with open(fn, mode) as f:
        if strip:
            data = f.read().strip()
        else:
            data = f.read()
    return data


if dburl is None:
    dburl = open_and_read(".dbinfo_")
if dburl is None:
    raise Exception(
        "No DB url specified try add it to the environment or create a .dbinfo_ file with the url"
    )

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
    id_ = db.Column(db.String(20), primary_key=True)
    user1 = db.Column(db.String(1000))
    user2 = db.Column(db.String(1000))
    chats = db.Column(db.PickleType)
    # pylint: enable=E1101
    def __init__(self, u1, u2, chats={}):
        self.id_ = secrets.token_urlsafe(12)
        self.user1 = u1
        self.user2 = u2
        self.chats = chats

    def __repr__(self):
        return "<Chat:%r <=> %r>" % (self.user1, self.user2)


@app.route("/")
async def main():
    session.permanent = True
    session["u-id"] = secrets.token_urlsafe(30)
    if not session.get("user"):
        session["logged_in"] = False
    return parse_local_assets(
        html_minify(await render_template("index.html", nonce=session["u-id"]))
    )


@app.route("/@/notify/", methods=["POST"])
async def make_notif():
    form = await request.form
    if not session.get("logged_in") or not session.get("user") or not form.get("token"):
        return "NO"
    token = form.get("token")
    user = userData.query.filter_by(user=session["user"]).first()
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


@app.route("/@/binary/", methods=["POST"])
async def upload_bin():
    data = await request.data
    resp = upload(data)
    return Response(
        json.dumps({"url": resp["secure_url"]}), content_type="application/octet-stream"
    )


# @app.route("/api/get")
@app.route("/api/getuser/", strict_slashes=False)
async def api_tools():
    if not session.get("logged_in") or not session.get("user"):
        return "__error__", 400
    return session["user"]


@app.route("/deb")
async def sessions__():
    app.config["JSONIFY_PRETTYPRINT_REGULAR"] = True
    print(session)
    return jsonify(dict(session))


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


@app.route("/api/validate-chat", methods=["POST"], strict_slashes=False)
async def get_chat_ids():
    content_type = "application/octet-stream"
    form = await request.form
    print(form)
    idx = form.get("chat_id")
    if not idx or not session.get("logged_in") or not session.get("user"):
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
    user1 = data.user1 if not data.user1 == session["user"] else data.user2
    chat_id = data.id_
    return Response(
        json.dumps({"chat_id": chat_id, "chat_with": user1, "HERE": session["user"]}),
        content_type=content_type,
    )


@app.route("/api/integrity/", methods=["POST"], strict_slashes=False)
async def api_integ():
    session.permanent = True
    session.pop("u-id")
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
        code = 200
    else:
        session["logged_in"] = False
        resp = await make_response(json.dumps({"error": "incorrect_password"}))
        code = 403
    resp.headers["Content-Type"] = "application/json"
    session.permanent = True
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
    session.permanent = True
    session["search-token"] = token
    return token


def collect_websocket(func):
    # https://medium.com/@pgjones/websockets-in-quart-f2067788d1ee
    @wraps(func)
    async def wrapper(*args, **kwargs):
        _obj = websocket._get_current_object()
        setattr(_obj, "__user__", session["user"])
        tr = []
        for i in app.__sockets__:
            if i.__user__ == session["user"]:
                print("Multiple Socket Connections..removing previous one")
                tr.append(i)
        [app.__sockets__.remove(i) for i in tr]
        app.__sockets__.add(_obj)
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            try:
                app.__sockets__.remove(_obj)
            except:
                print("Couldn't remove:", _obj)
            print(f"Removing {_obj.__user__}")
            raise e

    return wrapper


@app.websocket("/@/messenger/")
@collect_websocket
async def messenger():
    socket_obj = None
    ws = websocket
    while 1:
        data = None
        __data = await ws.receive()
        if __data == "ping":
            # keep alive for heroku
            await ws.send("pong")
        else:
            try:
                data = json.loads(__data)
            except:
                await ws.send(json.dumps({"error": "Bad request"}))
            if not session.get("user") or not session.get("logged_in"):
                await ws.send(
                    json.dumps(
                        {"error": "Not Authenticated..did you clear your cookies?"}
                    )
                )
            has_falsey, falsey_vals = has_false_types(
                data, ("sender", "receiver", "chat_id", "message", "stamp")
            )
            if has_falsey:
                await ws.send(
                    json.dumps(
                        {
                            "error": f"No values provided for :{force_join(falsey_vals)} ."
                        }
                    )
                )
            sender = data["sender"]
            receiver = data["receiver"]
            chat_id = data["chat_id"]
            message = data["message"]
            tstamp = validate_stamp(data["stamp"])
            fetch = data.get("fetch_messages")
            fetch_from = data.get("fetch_from")
            read = data.get("read")
            media = data.get("media")
            chat_data = None
            if (
                not sender == data["sender"]
                or sender == data["receiver"]
                or not session.get("user") == sender
            ):
                await ws.send(json.dumps({"error": f"Invalid sender value {sender}"}))
            chat = verify_chat(session["user"], receiver, chat_id)
            if not chat:
                print(
                    f"Creating A new Chat between '{session['user']}' and '{receiver}'"
                )
                chat = create_chat_data(session["user"], receiver)
            else:
                print(
                    f"Using Existing Chat with id:{chat.id_};Participants:{session['user']}<=>{receiver}"
                )
            if message:
                _chat_data = {
                    "chat_id": chat_id,
                    "data": {
                        "message": message,
                        "sender": sender,
                        "receiver": receiver,
                        "stamp": tstamp,
                        "read": False,
                        "media": False,
                        "mediaURL": None,
                        "rstamp": None,
                    },
                }
                ind = alter_chat_data(_chat_data)
                to_send = json.dumps({**_chat_data["data"], "msgid": ind})
                _chat_data["msgid"] = ind
                await ws.send(to_send)
                await _make_notify(session["user"], receiver, _chat_data)
            elif fetch:
                if not fetch_from and not fetch_from == 0:
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
                    tsend = get_data_from(_data, fetch_from)
                    await ws.send(
                        json.dumps(
                            {
                                "data": tsend,
                                "full_fetch": False,
                                "fetch": True,
                                "fetched_from": fetch_from + 1,
                            }
                        )
                    )
            elif read and sender == session["user"]:
                data = read
                msgs = chat.chats
                idx = data.get("id")
                part_msg = msgs.get(idx)
                if not part_msg:
                    await ws.send(json.dumps({"error": "no_such_message"}))
                part_msg["read"] = True
                msgs[idx] = part_msg
                chat_data = {
                    "chat_id": chat_id,
                    "msgid": idx,
                    "update": {"read": True, "rstamp": tstamp},
                }
                alter_chat_data(chat_data, True)
                await _make_notify(sender, receiver, chat_data, True)
                await ws.send(json.dumps({"success": "ok"}))
            elif media:
                chat_data = {
                    "chat_id": chat_id,
                    "data": {
                        "message": None,
                        "sender": session["user"],
                        "stamp": tstamp,
                        "read": False,
                        "media": True,
                        "mediaURL": media,
                        "rstamp": None,
                        "receiver": receiver,
                    },
                }
                ind = alter_chat_data(chat_data)
                to_send = json.dumps({**chat_data["data"], "msgid": ind})
                chat_data["msgid"] = ind
                await _make_notify(session["user"], receiver, chat_data)
                await ws.send(to_send)
            else:
                await ws.send(json.dumps({"error": "Bad request"}))
    if socket_obj:
        print("Removing user")
        app.__sockets__.remove(socket_obj)


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


async def _make_notify(sender, receiver, chat_, read=False):
    final = {}
    data = None
    if not read:
        data = chat_.get("data")
        final["hasImage"] = data.get("mediaURL")
        final["chat_id"] = chat_["chat_id"]
        final["sender"] = data.get("sender")
        final["receiver"] = data.get("receiver")
        final["message"] = data.get("message")
    _req_socket = [s for s in app.__sockets__ if s.__user__ == receiver]
    if _req_socket:
        try:
            if read:
                return await _req_socket[0].send(json.dumps(chat_))
            else:
                await _req_socket[0].send(
                    json.dumps({**data, "msgid": chat_.get("msgid")})
                )
        except Exception as e:  # user disconnected?
            print(e)
    if not read:
        notify(receiver, final, userData)


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


def validate_stamp(stamp: int) -> int:
    if not isinstance(stamp, (str, float, int)) or (
        isinstance(stamp, str) and not stamp.isnumeric()
    ):
        return time.time() * 1000
    return abs(int(stamp)) if isinstance(stamp, str) else abs(stamp)


scripts_dir = os.path.join(app.root_path, "static", "dist")
if not os.path.isdir(scripts_dir):
    os.mkdir(scripts_dir)


def resolve_local_url(url):
    # all static assets are location in /static folder..so we dont care about urls like "./"
    if url.startswith("/"):
        return url
    elif url.startswith("."):
        url = url.lstrip(".")
    if url.startswith("static"):
        return "/" + url
    else:
        return url


def parse_local_assets(html):
    soup = bs(html, "html5lib")
    assets = soup.find_all(
        lambda x: (
            x.name == "script"
            and resolve_local_url(x.attrs.get("src", "")).startswith("/")
        )
        or (
            x.name == "link"
            and resolve_local_url(x.attrs.get("href", "")).startswith("/")
            and "stylesheet" in x.attrs.get("rel", "")
        )  # Relative urls
    )
    for data in assets:
        ftype = data.name
        attr, ext = ("src", ".js") if ftype == "script" else ("href", ".css")
        src = data.attrs.get(attr)
        print(f"Parsing asset->{src}")
        if src.startswith("/"):
            src = src[1:]
        _file = os.path.join(app.root_path, src)
        checksum = checksum_f(_file)
        name = checksum + ext
        location = os.path.join("static", "dist", name)
        if os.path.isfile(os.path.join(app.root_path, location)):
            print("No change in file..skipping")
        else:
            shutil.copyfile(_file, os.path.join(app.root_path, location))
        data.attrs[attr] = f"/{location}"
    return str(soup)


def checksum_f(filename, meth="sha256"):
    foo = getattr(hashlib, meth)()
    _bytes = 0
    total = os.path.getsize(filename)
    with open(filename, "rb") as f:
        while _bytes <= total:
            f.seek(_bytes)
            chunk = f.read(1024 * 4)
            foo.update(chunk)
            _bytes += 1024 * 4
    return foo.hexdigest()


def check_password_hash(_hash, pw):
    meth = pwhash.pbkdf2_sha512
    return meth.verify(pw, _hash)


def generate_password_hash(pw):
    meth = pwhash.pbkdf2_sha512
    return meth.hash(pw)


def is_heroku(url):
    parsedurl = urlparse(url).netloc
    return (
        "127.0.0.1" not in parsedurl
        or "localhost" not in parsedurl
        or "192.168." not in parsedurl
    ) and "herokuapp" in parsedurl


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


def has_false_types(_dict, vals):
    falses = []
    _k = _dict.keys()
    for val in vals:
        if not val in _k:
            falses.append(val)
    if falses:
        return True, falses
    return False, None


def force_join(_list, lim=","):
    return lim.join(map(str, _list))


def check_chat_data(u1=None, u2=None, id_=None):
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


def alter_chat_data(data, update=False):
    # pylint: disable=E1101
    if update and data.get("msgid") is None:
        raise ValueError("Cannot Update without message ID")
    msgs = {}
    if not update:
        print("Altering data")
        chat_data = chatData.query.filter_by(id_=data["chat_id"]).first()
        msgs = chat_data.chats
        msg_index = len(msgs)
        msgs[msg_index] = data["data"]
        chat_data.chats = msgs
        flag_modified(chat_data, "chats")
        db.session.merge(chat_data)
        db.session.commit()
        return msg_index
    else:
        chat_data = chatData.query.filter_by(id_=data["chat_id"]).first()
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


open("/tmp/app-initialized", "w").close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", use_reloader=True)

