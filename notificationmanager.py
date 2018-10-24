import json
import os

import requests
import psycopg2
from flask_sqlalchemy import SQLAlchemy
from firebase_admin import credentials


cred_ = {
    "type": "service_account",
    "project_id": "webmsg-py",
    "private_key_id": os.environ.get("g_private_key_id"),
    "private_key": os.environ.get("g_private_key").replace("\\n", "\n"),
    "client_email": "pycode@webmsg-py.iam.gserviceaccount.com",
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


def notify(user, data, db):
    userdata = db.query.filter_by(user=user).first()
    if not userdata:
        return None
    if not userdata.notification_id:
        return None
    idx = userdata.notification_id
    headers = {
        "Authorization": f"Bearer {_get_new_access_token().access_token}",
        "content-type": "application/json",
    }
    data_fs = {
        "message": {
            "token": idx,
            "webpush": {"headers": {"Urgency": "high"}, "data": data},
        }
    }
    print("\n\n\n", data_fs)
    req = requests.post(URL, headers=headers, data=json.dumps(data_fs))
    print(req.text)
    return req.text
