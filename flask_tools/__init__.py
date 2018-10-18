import os
import uuid
from quart import redirect, request, send_from_directory
import gzip
from io import BytesIO

config = {
    "COMPRESS_MIMETYPES": [
        "text/html",
        "text/css",
        "text/xml",
        "application/json",
        "application/javascript",
    ],
    "COMPRESS_MIN_SIZE": 500,
}

import time


class flaskUtils(object):
    def __init__(self, app=None):
        self.app = None
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        if "utils_ext" in app.extensions:
            raise RuntimeError("utils extension already initialized")
        app.extensions["utils_ext"] = self
        self.app = app

        @app.before_request
        async def enforce_https():
            request.process_time = time.time()
            if (
                request.endpoint in app.view_functions
                and not request.is_secure
                and not request.headers.get("X-Forwarded-Proto", "http") == "https"
                and "127.0.0.1" not in request.url
                and "localhost" not in request.url
                and "herokuapp." in request.url
            ):
                return redirect(
                    request.url.replace("http://", "https://"), status_code=301
                )

        @app.after_request
        async def cors___(res):
            defaults = [
                (
                    "COMPRESS_MIMETYPES",
                    [
                        "text/html",
                        "text/css",
                        "text/xml",
                        "application/json",
                        "application/javascript",
                    ],
                ),
                ("COMPRESS_LEVEL", 8),
                ("COMPRESS_MIN_SIZE", 500),
            ]

            for k, v in defaults:
                app.config.setdefault(k, v)
            res.direct_passthrough = False
            accept_encoding = request.headers.get("Accept-Encoding", "")
            res.headers["Access-Control-Allow-Origin"] = "https://pycode.tk"
            res.headers["Access-Control-Allow-Headers"] = "*"
            res.headers["X-Process-Time"] = str(time.time() - request.process_time)
            vary = res.headers.get("Vary")
            if vary:
                if "access-control-allow-origin" not in vary.lower():
                    res.headers[
                        "Vary"
                    ] = "{}, Access-Control-Allow-Origin,Access-Control-Allow-Headers".format(
                        vary
                    )
            else:
                res.headers[
                    "Vary"
                ] = "Access-Control-Allow-Origin,Access-Control-Allow-Headers"
            if (
                res.mimetype not in app.config["COMPRESS_MIMETYPES"]
                or "gzip" not in accept_encoding.lower()
                or not 200 <= res.status_code < 300
                or (
                    res.content_length is not None
                    and res.content_length < app.config["COMPRESS_MIN_SIZE"]
                )
                or "Content-Encoding" in res.headers
            ):
                return res
            gzip_content = await compress(app, res)
            res.set_data(gzip_content)
            res.headers["content-encoding"] = "gzip"
            res.headers["content-length"] = str(res.content_length)
            if vary:
                if "accept-encoding" not in vary.lower():
                    res.headers["vary"] = "{}, Accept-Encoding".format(vary)
            else:
                res.headers["vary"] = "Accept-Encoding"
            return res

        async def compress(app, response):
            gzip_buffer = BytesIO()
            with gzip.GzipFile(
                mode="wb",
                compresslevel=app.config["COMPRESS_LEVEL"],
                fileobj=gzip_buffer,
            ) as gzip_file:
                gzip_file.write(await response.get_data())
            return gzip_buffer.getvalue()

        @app.route("/favicon.ico")
        async def send_fav():
            return await send_from_directory(
                os.path.join(app.root_path, "static"), "favicon.ico"
            )
