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
from flask_sqlalchemy import SQLAlchemy
from htmlmin.minify import html_minify
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
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
    user = db.Column(db.String, primary_key=True)
    pw_hash = db.Column(db.String(1000))

    def __init__(self, u, pw):
        self.user = u
        self.pw_hash = pw

    def __repr__(self):
        return "<Name %r>" % self.user


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


class chatData(db.Model):
    id_ = db.Column(db.String(20), primary_key=True)
    user1 = db.Column(db.String(1000))
    user2 = db.Column(db.String(1000))
    chats = db.Column(db.PickleType)

    def __init__(self, u1, u2, chats={}):
        self.id_ = secrets.token_urlsafe(20)
        self.user1 = u1
        self.user2 = u2
        self.chats = chats

    def __repr__(self):
        return "<%r-%r>" % (self.user1, self.user2)


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
    session["u-id"] = secrets.token_urlsafe(20)
    return html_minify(render_template("index.html", nonce=session["u-id"]))

if __name__=="__main__":
    app.run(debug=True,host='0.0.0.0')