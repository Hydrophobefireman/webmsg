import json
import os

import requests
import psycopg2
from flask_sqlalchemy import SQLAlchemy
from firebase_admin import credentials
from firebase_admin import messaging
from firebase_admin import initialize_app

cred_ = {
    "type": "service_account",
    "project_id": "webmsg-py",
    "private_key_id": os.environ.get("g_private_key_id"),
    "private_key": os.environ.get("g_private_key").replace("\\n", "\n"),
    "client_email": "firebase-adminsdk-6jaaj@webmsg-py.iam.gserviceaccount.com",
    "client_id": os.environ.get("g_client_id"),
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": os.environ.get("g_client_x509_cert_url"),
}
cred = credentials.Certificate(cred_)

URL = "https://fcm.googleapis.com/v1/projects/webmsg-py/messages:send"


def _get_new_access_token():
    return cred.get_access_token()


initialize_app(cred)


def notify(user, data, db):
    userdata = db.query.filter_by(user=user).first()
    if not userdata:
        return None
    if not userdata.notification_id:
        return None
    idx: str = userdata.notification_id

    data_fs: dict = {"data": json.dumps(data)}
    message = messaging.Message(data=data_fs, token=idx)
    return messaging.send(message)


"""def notify(user, data, db):
    userdata = db.query.filter_by(user=user).first()
    if not userdata:
        return None
    if not userdata.notification_id:
        return None
    idx = userdata.notification_id
    headers = {"Authorization": f"Bearer {_get_new_access_token().access_token}"}
    data_fs = {"message": {"data": {"data": json.dumps(data)}, "token": idx}}
    req = requests.post(URL, headers=headers, json=(data_fs))
    print(req.text)
    return req.text"""

