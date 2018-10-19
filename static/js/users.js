(async () => {
    (new Image).src = "/static/attachment.svg";
    (new Image).src = "/static/close.svg"
    const $ = {
            id: (_id) => {
                return document.getElementById(_id)
            },
            className: (klass, single_only = true) => {
                const _ = Array.from(document.getElementsByClassName(klass))
                if (single_only) {
                    return _[0]
                } else {
                    return _
                }
            },
            create: (el) => document.createElement(el),
            set: (obj, attr, val) => obj.setAttribute(attr, val)
        },
        inp = $.id('users'),
        submit = $.id('sbm'),
        nonce = document.querySelector("meta[name='nonce']").getAttribute('content'),
        img = $.id('loading-gif'),
        messages = $.id('messages'),
        results_all = $.id('results-all'),
        rdetails = $.id('resbox-details'),
        swindow = $.id("res"),
        HERE = $.id("username_meta").getAttribute("content"),
        searchbox = $.id('searchbox');
    img.oncontextmenu = e => {
        e.preventDefault()
    }
    inp.addEventListener("keydown", e => {
        if (e.keyCode === 13) {
            submit.click()
        }
    });

    function make_msg_info(_self) {
        const dataset = _self.dataset,
            sender = dataset.sender,
            stamp = parseInt(dataset.stamp),
            read = dataset.read,
            rstamp = parseInt(dataset.rstamp),
            media = dataset.media;
        const __par = $.id("message-info");
        __par.innerHTML = '';
        __par.style.opacity = '1';
        const close_this = $.create("div");
        $.set(close_this, 'class', "message-close");
        close_this.innerHTML = "Close"
        const $par_const = $.create("div");
        $par_const.style.transition = '0.3s ease-in-out';
        __par.appendChild(close_this);
        __par.appendChild($par_const);
        close_this.onclick = () => {
            $par_const.style.opacity = '0';
            $par_const.style.height = '0px';
            __par.style.opacity = '0';
            __par.innerHTML = ""
        }
        const sender_key = $.create("div"),
            sender_val = $.create("div");
        const read_key = $.create("div"),
            read_val = $.create("div");
        const stamp_key = $.create("div"),
            stamp_val = $.create("div");
        $.set(sender_key, "class", "message-info-key");
        $.set(sender_key, "data-slide", "out")
        $.set(sender_val, "class", "message-info-value");
        $.set(read_key, "class", "message-info-key");
        $.set(read_key, "data-slide", "out")
        $.set(read_val, "class", "message-info-value");
        $.set(stamp_key, "class", "message-info-key");
        $.set(stamp_key, "data-slide", "out")
        $.set(stamp_val, "class", "message-info-value");

        sender_key.onclick = () => {
            slideout(sender_val);
            slidein(sender_key);
        }
        sender_val.onclick = () => {
            slideout(sender_key);
            slidein(sender_val);
        }
        read_key.onclick = () => {
            slideout(read_val);
            slidein(read_key);
        }
        read_val.onclick = () => {
            slideout(read_key);
            slidein(read_val);
        }
        stamp_key.onclick = () => {
            slideout(stamp_val);
            slidein(stamp_key);
        }
        stamp_val.onclick = () => {
            slideout(stamp_key);
            slidein(stamp_val);
        }
        sender_key.textContent = 'Sender';
        sender_val.textContent = sender + (sender === HERE ? "(You)" : "");
        stamp_key.textContent = 'Time';
        stamp_val.textContent = new Date(stamp).toLocaleString();
        read_key.textContent = 'Read-Status';
        read_val.textContent = read === "true" ? `Read (${!isNaN(rstamp) ? new Date(rstamp).toLocaleString() : "N/A"})` : "Sent";
        if (sender !== HERE) {
            read_key.style.display = 'none';
            read_val.style.display = 'none'
        }
        if (media !== "null") {
            const media_key = $.create("div"),
                media_val = $.create("div");
            $.set(media_key, "class", "message-info-key");
            $.set(media_val, "class", "message-info-value");
            media_key.textContent = "Media Message";
            media_val.innerHTML = "Click To Open Media Preview";
            media_val.style.cursor = 'pointer'
            $.set(media_val, "data-media", media)
            slideout(media_val)
            media_val.onclick = () => {
                const val = media_val.dataset;
                const img = new Image;
                img.src = val.media;
                $par_const.innerHTML = '';
                const i = $.create("a");
                $par_const.appendChild(img);
                $par_const.appendChild(i);
                i.style.color = 'black';
                i.style.textDecoration = 'none';
                i.target = "__blank";
                i.style.display = 'block';
                i.innerHTML = 'Click To Open Image In A New Tab';
                i.href = val.media
                img.style.width = '160px';
                img.style.height = '100px';
            }
            $par_const.appendChild(media_key);
            $par_const.appendChild(media_val);
        }
        __par.style.display = 'block';
        $par_const.appendChild(sender_key);
        $par_const.appendChild(sender_val);
        $par_const.appendChild(stamp_key);
        $par_const.appendChild(stamp_val);
        $par_const.appendChild(read_key);
        $par_const.appendChild(read_val);
        console.log(dataset);
    }

    async function create_chat_box(u) {
        var __id = await fetch("/api/chatid/", {
            method: "POST",
            credentials: "include",
            body: urlencode({
                side_a: HERE,
                side_b: u
            }),
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            },
        });
        if (__id.status !== 200) {
            return document.body.innerHTML = 'An error Occured..please reload the page'
        }
        $.__chatID__ = await __id.text();
        results_all.innerHTML = "";
        swindow.style.display = 'none';
        searchbox.style.display = 'none';
        const boxwrap = $.create("div"),
            box = $.create("div"),
            head = $.create("div"),
            bod = $.create("div"),
            txtbox = $.create("input"),
            img = $.create("img"),
            $user = $.create("span"),
            $menubox = $.create("div"),
            $menu = $.create("span"),
            close = $.create("img"),
            $imgholder1 = $.create("div"),
            $imgholder2 = $.create("div"),
            attach = $.create("img");
        $.set($menubox, 'data-stat', 'closed');
        $.set($menubox, 'class', 'menu-details');
        $.set($menu, 'class', 'menubox');
        $.set(txtbox, 'type', 'text');
        $.set(txtbox, 'placeholder', 'Type a Message');
        $.set(boxwrap, 'class', 'chat_box_wrap');
        $.set(box, 'class', 'chat_box');
        $.set(head, 'class', 'chat_head');
        $.set(bod, 'class', 'chat_body');
        $.set(txtbox, 'class', 'chat_inp');
        $.set(img, 'class', 'context');
        $.set($imgholder1, 'class', 'img-button-holder');
        $.set($imgholder2, 'class', 'img-button-holder');
        $.set(attach, 'title', 'Attach a File');
        $.set(close, 'title', 'Close this Chat');
        $.set(txtbox, 'data-user', u)
        $imgholder1.appendChild(close)
        $imgholder2.appendChild(attach)
        $menubox.appendChild($imgholder1);
        $menubox.appendChild($imgholder2);
        head.appendChild($menu);
        head.appendChild($user);
        box.appendChild(head);
        box.appendChild($menubox);
        box.appendChild(bod);
        box.appendChild(txtbox);
        box.appendChild(img);
        boxwrap.appendChild(box);
        results_all.appendChild(boxwrap);
        close.onclick = () => {
            $.id("message-info").innerHTML = '';
            $.id("message-info").style.opacity = '0.0'
            results_all.innerHTML = '';
            results_all.style.display = 'none';
            searchbox.style.display = 'block';
            swindow.style.display = 'block'
        }
        $menu.innerHTML = '&#9776;'
        $user.textContent = u;
        close.src = '/static/close.svg';
        attach.src = "/static/attachment.svg";
        close.style.cursor = 'pointer';
        attach.style.cursor = 'pointer';
        const websocket_url = `${(window.location.protocol === 'https:' ? "wss://" : "ws://") +
        window.location.host}/@/messenger/`;
        const ws = new WebSocket(websocket_url);
        ws.onmessage = e => {
            const msg = e.data;
            try {
                const js = JSON.parse(msg);
                if (js.hasOwnProperty('error')) {
                    console.log('prop-error', js)
                    return bod.innerHTML += '<br>An error occured Please reload the page'
                }
                parse_message(bod, js);
            } catch (e) {
                console.log(e, "ERR");
                bod.innerHTML += '<br>An error occured Please reload the page'
            }
        }
        ws.onopen = () => {
            check_page_cache(ws, u, bod);
            console.log('Socket Opened')
        }
        ws.onclose = () => {
            /* reconnect to the websocket When we begin caching the data...this wont create requests as well*/
            create_chat_box(u)
            bod.innerHTML += "<br>Connection to server was lost. Please Reload the page"
        }

        async function check_page_cache(ws, user, parent_element) {
            /* TODO: check indexed DB*/
            const data = await $get($.__chatID__);
            let obj;
            if (data) {
                const len = Object.keys(data).length;
                console.log("Checking For Updated Data")
                obj = {
                    stamp: new Date().getTime(),
                    message: null,
                    user,
                    fetch_messages: true,
                    fetch_from: len - 1
                }
                for (let i = 0; i < len; i++) {
                    const __msg__ = data[i];
                    __msg__.msgid = i;
                    console.log("Parsing msgid " + i + "from cache")
                    parse_message(parent_element, __msg__);
                }
                ws.send(JSON.stringify(obj));
                return !0
            } else {
                console.log("Fetching New")
                obj = {
                    stamp: new Date().getTime(),
                    message: null,
                    user,
                    fetch_messages: true
                };
                ws.send(JSON.stringify(obj))
                return !0
            }
        }

        function parse_message(parent_element, js) {
            async function make_message_box(box, message, sender, receiver, stamp, msgid, read, rstamp, media = null) {
                let msg_class;
                const msg = $.create("div");
                if (sender === HERE) {
                    msg_class = 'msg_sent'
                    msg.style.marginLeft = 'auto'
                } else {
                    msg_class = "msg_recieved";
                    msg.style.marginRight = 'auto'
                }
                $.set(msg, "class", `msg ${msg_class}`);
                if (media) {
                    $.set(msg, "data-media", media)
                    const img = new Image;
                    img.src = '/static/attachment.svg';
                    msg.appendChild(img);
                    msg.style.fontSize = '12px';
                    msg.appendChild += "Media Message";
                } else {
                    $.set(msg, "data-media", null)
                    msg.textContent = message;
                }

                $.set(msg, "data-sender", sender);
                $.set(msg, "data-receiver", receiver);
                $.set(msg, "data-stamp", stamp);
                $.set(msg, 'data-msgid', msgid);
                $.set(msg, "data-read", read);
                $.set(msg, "data-rstamp", rstamp)
                box.appendChild(msg);
                box.scrollTop = box.scrollHeight;
                msg.onclick = function () {
                    make_msg_info(this)
                }
                let data;
                data = await $get($.__chatID__);
                if (data) {
                    console.log("Cache HIT")
                    if (!data[msgid]) {
                        console.log("[indexedDB]Adding new entry:", msgid)
                        /*never added to indexedDB..i.e new Message*/
                        data[msgid] = {
                            message,
                            sender,
                            stamp,
                            read,
                            media: (!!media ? true : null),
                            mediaURL: media,
                            rstamp,
                            receiver
                        };
                        await $set($.__chatID__, data)
                    }
                } else {
                    console.log("[indexedDB]Cache MISS")
                }
            };
            if (js.typing) {
                //if the user is typing..we dont need to create any element
                return $user.style.color = 'green'
            }
            $user.style.color = '#fff';
            if (js.fetch) {
                console.log("FETCHED DETAILS")
                const data = js.data;
                if (js.full_fetch) {
                    console.log("[indexedDB]Setting Full Cache to indexedDB:", data)
                    $set($.__chatID__, data);
                }
                for (let i = 0; i < Object.keys(data).length; i++) {
                    const __msg__ = data[i];
                    __msg__.msgid = i;
                    parse_message(parent_element, __msg__);
                }
            }
            let text, sender, receiver, stamp, read, rstamp, msgid;
            if (js.media || js.message) {
                if (!js.read && !js.rstamp && js.sender !== HERE) {
                    const _read = {
                        user: js.sender,
                        message: null,
                        read: {
                            id: js.msgid
                        },
                        stamp: new Date().getTime(),
                        rstamp: new Date().getTime(),

                    };
                    ws.send(JSON.stringify(_read))
                }
            }
            if (js.message) {
                text = js.message;
                sender = js.sender;
                receiver = js.receiver;
                stamp = js.stamp;
                read = js.read;
                rstamp = js.rstamp;
                msgid = js.msgid;
                return make_message_box(parent_element, text, sender, receiver, stamp, msgid, read, rstamp)
            }
            if (js.update) {
                const msid = js.msgid;
                const msg = document.querySelector(`div[data-msgid='${msid}']`);
                $.set(msg, "data-read", js.update.read);
                $.set(msg, 'data-rstamp', js.update.rstamp)
            }
            if (js.media) {
                const media_url = js.mediaURL;
                sender = js.sender;
                receiver = js.receiver;
                read = js.read;
                rstamp = js.rstamp;
                stamp = js.stamp;
                msgid = js.msgid;
                make_message_box(parent_element, null, sender, receiver, stamp, msgid, read, rstamp, media_url)
            }

        }
        attach.onclick = () => {
            const files = $.create("input");
            $.set(files, 'accept', 'image/*')
            $.set(files, 'type', 'file')
            files.addEventListener("change", () => {
                const f = files.files[0],
                    reader = new FileReader();
                reader.onload = e => {
                    const res = reader.result,
                        img = new Image;
                    img.src = res;
                    img.onload = async () => {
                        const data = await resize(img, 65, f.type);
                        const subm = await fetch("/@/binary/", {
                            credentials: "include",
                            method: "post",
                            headers: {
                                "x-file-name": f.name
                            },
                            body: data
                        });
                        const resp = await subm.json();
                        const ws_data = {
                            media: resp.url,
                            message: null,
                            user: u,
                            stamp: new Date().getTime()
                        };
                        ws.send(JSON.stringify(ws_data));
                    }
                }
                reader.readAsDataURL(f);
            });
            files.click()
        }
        $menu.onclick = () => {

            if ($menubox.getAttribute("data-stat") != 'closed') {
                $.set($menubox, 'data-stat', 'closed')
                return $menubox.style.marginLeft = '-100px';
            } else {
                $.set($menubox, 'data-stat', 'opened')
                $menubox.style.marginLeft = '0px';
            }
        }
        txtbox.onkeydown = function (e) {
            if (e.keyCode === 13) {
                if (txtbox.value.replace(/\s/g, "").length > 0) {
                    const stamp = new Date().getTime();
                    const value = txtbox.value;
                    const data = {
                        user: this.getAttribute("data-user"),
                        message: value,
                        typing: false,
                        media: null,
                        stamp
                    };
                    ws.send(JSON.stringify(data))
                    txtbox.value = '';
                }
            }
        };
    }

    const urlencode = json => {
        return `${Object.keys(json).
            map(key =>`${encodeURIComponent(key)}=${encodeURIComponent(json[key])}`)
            .join('&')}`;

    }

    function paint_page(data) {
        const js = data.users;
        results_all.innerHTML = "";
        results_all.style.display = 'block';
        if (js.length === 0) {
            return results_all.innerHTML = 'No Results Found'
        }
        for (const i of js) {
            const a = document.createElement("span"),
                btn = document.createElement("button")
            btn.innerHTML = i;
            a.appendChild(btn);
            $.set(a, 'data-result', i)
            btn.className = 'resbtn'
            results_all.appendChild(a);
            a.onclick = function () {
                create_chat_box(this.getAttribute("data-result"));
            }
        }
    }
    submit.onclick = async () => {
        messages.style.visibility = 'hidden';
        if (inp.value.length == 0) {
            return
        } else {
            rdetails.style.display = 'block';
            img.style.display = 'inline';
            const _result = await fetch(`/api/user-search/tokens/${nonce}`, {
                method: 'get',
                credentials: "include"
            });
            const token = await _result.text();
            const results = await fetch("/api/users/", {
                credentials: "include",
                method: "post",
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                },
                body: urlencode({
                    token,
                    user: inp.value
                })
            });
            img.style.display = 'none';
            rdetails.style.display = 'none'
            try {
                const data = await results.json();
                return paint_page(data);
            } catch (e) {
                console.warn(e);
                messages.style.visibility = 'visible';
                return messages.innerHTML = 'An error occured on our end..please try again'
            }
        }
    }
    async function resize(img, quality, mime_type) {
        const canvas = document.createElement('canvas');
        if (img.naturalWidth === undefined && img.naturalHeight === undefined) {
            console.log(img, 'no natural width')
            return null
        }
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        const dataurl = canvas.toDataURL(mime_type, quality / 100);
        const res = await fetch(dataurl);
        return await res.arrayBuffer();
    }

    function slidein(el) {
        el.style.overflow = 'hidden'
        el.style.padding = '0px';
        el.style.opacity = 0;
        el.style.height = '0'
        el.style.border = 'none';
        el.style.width = '0';
    }

    function slideout(el) {
        el.style.padding = '5px';
        el.style.opacity = 1;
        el.style.height = 'auto';
        el.style.width = 'auto';
        el.style.border = "2px solid #e3e3e3";
        el.style.overflow = 'visible'
    }
})()