import json
import os

import firebase_admin
from firebase_admin import credentials, storage
from secrets import token_urlsafe

from io import BytesIO


def open_and_read(fn: str, mode: str = "r", strip: bool = True):
    if not os.path.isfile(fn):
        return None
    with open(fn, mode) as f:
        if strip:
            data = f.read().strip()
        else:
            data = f.read()
    return data


data = open_and_read(".firebase_creds.json")
if not data:
    cred_ = {
        "type": "service_account",
        "project_id": "webmsg-py",
        "private_key_id": os.environ.get("g_private_key_id"),
        "private_key": os.environ.get("g_private_key"),
        "client_email": "pycode@webmsg-py.iam.gserviceaccount.com",
        "client_id": os.environ.get("g_client_id"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": os.environ.get("g_client_x509_cert_url"),
    }

else:
    cred_ = json.loads(data)
cred = credentials.Certificate(cred_)
firebase_admin.initialize_app(cred, {"storageBucket": "webmsg-py.appspot.com"})
bucket = storage.bucket()


def upload_blob(filename_or_bytes, type_):
    blobn = token_urlsafe(25)
    blob = bucket.blob(blobn)
    if isinstance(filename_or_bytes, str) and os.path.isfile(filename_or_bytes):
        meth = getattr(blob, "upload_from_filename")
    elif isinstance(filename_or_bytes, bytes):
        filename_or_bytes = BytesIO(filename_or_bytes)
        meth = getattr(blob, "upload_from_file")
    else:
        raise TypeError("File does not exist or incorrect type of argument provided")
    meth(filename_or_bytes)
    blob.make_public()
    blob.content_type = type_
    blob.update()
    return blob.public_url
