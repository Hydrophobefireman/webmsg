import base64
import html
import json
import os
import random
import re
import secrets
import time
import uuid
from urllib.parse import urlparse

import cloudinary.uploader
import requests
from bs4 import BeautifulSoup as bs
from flask import (
    Flask,
    Response,
    abort,
    make_response,
    redirect,
    render_template,
    request,
    session,
)
from flask_socketio import join_room, leave_room, SocketIO, send
from flask_sockets import Sockets
from flask_sqlalchemy import SQLAlchemy
from htmlmin.minify import html_minify
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
socket = Sockets(app)
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


class userData(db.Model):
    # pylint: disable=E1101
    user = db.Column(db.String, primary_key=True)
    pw_hash = db.Column(db.String(1000))
    # pylint: enable=E1101

    def __init__(self, u, pw):
        self.user = u
        self.pw_hash = pw

    def __repr__(self):
        return "USER:%r" % self.user


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

@app.before_request
def enforce_https():
    if (
        request.endpoint in app.view_functions
        and request.url.startswith("http://")
        and not request.is_secure
        and is_heroku(request.url)
    ):
        return redirect(request.url.replace("http://", "https://"), code=301)


@app.route("/web/", strict_slashes=False)
def rtcs():
    return render_template("rtc.html")


"""@socket.route("/echo")
def echo_socket(ws):
    while not ws.closed:
        message = ws.receive()
        print(dir(ws))
        ws.send(message)

"""


class chatData(db.Model):
    # pylint: disable=E1101
    id_ = db.Column(db.String(20), primary_key=True)
    user1 = db.Column(db.String(1000))
    user2 = db.Column(db.String(1000))
    chats = db.Column(db.PickleType)
    # pylint: enable=E1101
    def __init__(self, u1, u2, chats={}):
        self.id_ = secrets.token_urlsafe(20)
        self.user1 = u1
        self.user2 = u2
        self.chats = chats

    def __repr__(self):
        return "Chat Between:%r and %r" % (self.user1, self.user2)


def upload(imgurl):
    clapi_key = os.environ.get("key")
    clapi_secret = os.environ.get("cl_secret")
    if clapi_key is None:
        try:
            with open("a.cloudinary", "r") as f:
                clapi_key = f.read().strip()
            with open("b.cloudinary", "r") as f:
                clapi_secret = f.read().strip()
        except:
            raise Exception("no key provided")
    cloudinary.config(
        cloud_name="media-proxy", api_key=clapi_key, api_secret=clapi_secret
    )
    a = cloudinary.uploader.upload(imgurl)
    return a


@app.route("/")
def main():
    session["u-id"] = secrets.token_urlsafe(30)
    if not session.get("user"):
        session["logged_in"] = False
    if session.get("logged_in"):
        return redirect(f"/u/{session['user']}/?auth=1")
    return html_minify(render_template("index.html", nonce=session["u-id"]))


@app.route("/login/check/", methods=["GET", "POST"])
def login():
    resp, code = json.dumps({"response": "dummy"}), 200
    if request.method == "GET":
        return redirect("/?wmsg_rd=login")
    user, password, integrity = (
        request.form.get("user"),
        request.form.get("password"),
        request.form.get("integrity"),
    )
    if user is None or password is None or integrity != session["u-id"]:
        resp = make_response(json.dumps({"error": "fields_empty_or_session_error"}))
        code = 403
    udata = userData.query.filter_by(user=user).first()
    if udata is None:
        resp = make_response(json.dumps({"error": "no_such_user"}))
        code = 403
    session["logged_in"] = False
    if check_password_hash(udata.pw_hash, password):
        session["logged_in"] = True
        session["user"] = udata.user
        resp = make_response(
            json.dumps({"success": "authenticated", "user": udata.user})
        )
    else:
        session["logged_in"] = False
        resp = make_response(json.dumps({"error": "incorrect_password"}))
        code = 403
    resp.headers["Content-Type"] = "application/json"
    return resp, code


@app.route("/register/check/", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return redirect("/?wmsg_rd=login")
    user, password, integrity, checkpw, sessid = (
        request.form.get("user"),
        request.form.get("password"),
        request.form.get("integrity"),
        request.form.get("checkpw"),
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
        Response(
            json.dumps({"error": "username_taken"}),
            content_type="application/json",
            status=403,
        )
    print("registered:", data)
    return Response(
        json.dumps({"success": "login_now"}), content_type="application/json"
    )


@app.route("/api/user-search/tokens/<nonce>")
def get_search_token(nonce):
    if nonce != session.get("u-id"):
        return ""
    token = secrets.token_hex(16)
    session["search-token"] = token
    return token


@app.route("/api/users/", methods=["POST"])
def get_search_results():
    token = request.form["token"]
    user = request.form.get("user")
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

    resp = {"users": data}
    return Response(json.dumps(resp), content_type="application/json")


@app.route("/u/<user>/", strict_slashes=False)
def userpages(user):
    if not session.get("logged_in"):
        return redirect("/?auth=0")
    session["u-id"] = secrets.token_urlsafe(30)
    if session["user"] == user:
        return html_minify(
            render_template("user.html", nonce=session["u-id"], user=user)
        )
    return html_minify(render_template("chat.html", nonce=session["u-id"], user=user))


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")
