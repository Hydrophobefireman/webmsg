((async () => {
    (new Image).src = "/static/attachment.svg";
    (new Image).src = "/static/close.svg";
    (new Image).src = "/static/home.svg";
    const $ = {
        q: (query, single_only = true) => {
            const _ = Array.from(document.querySelectorAll(query))
            if (single_only) {
                return _[0]
            } else {
                return _
            }
        },
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
    };
    const chatid = $.q("meta[name='chat_id']").content;
    const userDetails = $.q("meta[name='user_details']");
    const HERE = userDetails.getAttribute("data-this");
    const THERE = userDetails.getAttribute("data-that");
    const results_all = $.id('results-all');
    let createUiForNotification, noNotifications;
    let periodicCheckTimer;
    periodicCheckTimer = 10000;
    async function parse_message(parent_element, js) {
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
            }
        };
        const $user = $.id("__chat-with-prof");
        if (js.typing) {
            //if the user is typing..we dont need to create any element
            return $user.style.color = 'green'
        }
        $user.style.color = '#000';
        if (js.fetch) {
            console.log("FETCHED DETAILS")
            const data = js.data;
            if (js.full_fetch) {
                console.log("[indexedDB]Setting Full Cache to indexedDB:", data)
                await $set($.__chatID__, data);
            } else {
                const __ = await $get($.__chatID__);
                const new_data = Object.assign({}, __, data);
                await $set($.__chatID__, new_data);
            }
            const j = js.fetched_from;
            for (let i = 0; i < Object.keys(data).length; i++) {
                let d;
                if (!isNaN(j)) {
                    d = i + j;
                } else {
                    d = i
                }
                const __msg__ = data[d];
                if (__msg__) {
                    __msg__.msgid = d;
                    parse_message(parent_element, __msg__);
                }
            }
            return;
        }
        let text, sender, receiver, stamp, read, rstamp, msgid;
        if (js.media || js.message) {
            if ((js.sender !== HERE && js.receiver !== HERE) || (js.sender !== THERE && js.receiver !== THERE)) {
                console.log(js)
                throw new Error("Invalid Sender and recepient arguments")
            }
            if (!js.read && !js.rstamp && js.sender !== HERE) {
                const _read = {
                    receiver: js.sender,
                    sender: HERE,
                    chat_id: chatid,
                    message: null,
                    read: {
                        id: js.msgid
                    },
                    stamp: new Date().getTime(),
                    rstamp: new Date().getTime(),

                };
                await fetchData(_read);
                ////(_t);
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
            $.set(msg, 'data-rstamp', js.update.rstamp);
            console.log("updating data")
            const ___data___ = await $get(chatid);
            const ___newdata___ = Object.assign({}, ___data___);
            ___newdata___[msid].read = js.update.read;
            ___newdata___[msid].rstamp = js.update.rstamp;
            await $set(chatid, ___newdata___);
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
    async function createChatBox(u) {
        $.__chatID__ = chatid;
        results_all.innerHTML = "";
        results_all.style.display = 'block';
        const boxwrap = $.create("div"),
            box = $.create("div"),
            head = $.create("div"),
            bod = $.create("div"),
            txtbox = $.create("input"),
            img = $.create("img"),
            $user = $.create("span"),
            $menubox = $.create("div"),
            $menu = $.create("span"),
            close_btn = $.create("div"),
            attach_btn = $.create("div");
        $user.id = "__chat-with-prof"
        $.set($menubox, 'data-stat', 'closed');
        $.set($user, "class", "chat_with");
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
        $.set(close_btn, 'class', 'img-button-holder');
        $.set(attach_btn, 'class', 'img-button-holder');
        $.set(txtbox, 'data-user', u)
        bod.id = "_msg_body"
        $menubox.appendChild(close_btn);
        $menubox.appendChild(attach_btn);
        head.appendChild($menu);
        head.appendChild($user);
        box.appendChild(head);
        box.appendChild($menubox);
        box.appendChild(bod);
        box.appendChild(txtbox);
        box.appendChild(img);
        boxwrap.appendChild(box);
        $menu.innerHTML = '&#9776;'
        $user.textContent = u;
        results_all.appendChild(boxwrap);
        close_btn.onclick = () => {
            window.location = `/u/${HERE}`;
        }
        close_btn.textContent = "Close Conversation";
        attach_btn.textContent = "Add An Attachment";
        $menu.onclick = () => {
            if ($menubox.getAttribute("data-stat") != 'closed') {
                $.set($menubox, 'data-stat', 'closed')
                return $menubox.style.marginBottom = '-250px';
            } else {
                $.set($menubox, 'data-stat', 'opened')
                $menubox.style.marginBottom = '0px';
            }
        }
        attach_btn.onclick = () => {
            const files = $.create("input");
            $.set(files, 'accept', 'image/*')
            $.set(files, 'type', 'file');
            $menu.click()
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
                            receiver: u,
                            sender: HERE,
                            chat_id: chatid,
                            stamp: new Date().getTime()
                        };
                        const txt = await fetchData(ws_data);
                        ////(txt);
                    }
                }
                reader.readAsDataURL(f);
            });
            files.click()
        }
        txtbox.onkeydown = async function (e) {
            if (e.keyCode === 13) {
                if (this.value.replace(/\s/g, "").length > 0) {
                    const stamp = new Date().getTime();
                    const value = txtbox.value;
                    const data = {
                        sender: HERE,
                        receiver: THERE,
                        chat_id: chatid,
                        message: value,
                        typing: false,
                        media: null,
                        stamp
                    };
                    txtbox.value = '';
                    const resp = await fetchData(data);
                    ////(resp)
                }
            }
        };
    };
    if (typeof window.Notification === "function") {
        try {
            console.log("Supports Notifications")
            messaging = firebase.messaging();
            await messaging.requestPermission();
            messaging.usePublicVapidKey(
                "BGhv7XYjPBkpVoOEPbq2E19Is1ti_MYfboTDazKE0jgxPENxDqe0-U2p1OKEEgG4JH4Ycl8Wbxdv-UrrP_LcLmw");
            // Callback fired if Instance ID token is updated.
            await messaging.getToken();
            const token_stuff = async () => {
                const token = await messaging.getToken();
                console.log('Token refreshed.');
                console.log(token);
                await fetch("/@/notify/", {
                    method: "post",
                    headers: {
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    body: `token=${encodeURIComponent(token)}`
                })
            };
            await token_stuff()
            messaging.onTokenRefresh(token_stuff);
        } catch (e) {
            noNotifications = true;
            console.log("Permission-Denied")
        }

        createUiForNotification = _data => {
            const box = $.create("div");
            const senderName = $.create("div");
            const messageContent = $.create("div");
            const actionBox = $.create("div");
            const replyBtn = $.create("span");
            const reply_inp = $.create("input");
            const sender = _data.sender;
            const text = _data.message;
            const isMedia = _data.hasImage;
            const chatID = _data.chat_id;
            $.set(reply_inp, "class", "notification-reply-bar");
            $.set(box, "class", "notification-box");
            $.set(senderName, "class", "notification-sender");
            $.set(messageContent, "class", "notification-text");
            $.set(actionBox, "class", "notification-action-box");
            $.set(replyBtn, "class", "notification-action-button");

            box.appendChild(senderName);
            box.appendChild(messageContent);
            box.appendChild(actionBox);
            actionBox.appendChild(replyBtn);

            senderName.textContent = sender;
            replyBtn.textContent = `Reply To ${sender}`;
            if (isMedia) {
                const img = new Image;
                img.src = "/static/attachment.svg";
                messageContent.innerHTML = "";
                messageContent.appendChild(img);
            } else {
                messageContent.textContent = text;
            }
            document.body.appendChild(box);
            let timer;
            replyBtn.onclick = () => {
                clearTimeout(timer)
                replyBtn.replaceWith(reply_inp);
                reply_inp.focus()
                reply_inp.onkeydown = evt => {
                    if (evt.keyCode === 13) {
                        if (reply_inp.value.replace(/\s/g, "").length > 0) {
                            const stamp = new Date().getTime();
                            const value = reply_inp.value;
                            const data = {
                                receiver: sender,
                                message: value,
                                media: null,
                                stamp,
                                sender: HERE,
                                chat_id: chatID
                            };

                            fetchData(data); //no need of the data
                            reply_inp.value = '';
                            box.remove()
                        }
                    }
                };
            };
            messageContent.onclick = senderName.onclick = () => {
                window.location = `/chat/${chatID}`;
            };
            setTimeout(() => {
                box.style.marginTop = '15px';
                timer = setTimeout(() => {
                    box.remove();
                }, 4000);
            }, 500);
        };
        if (Notification.permission === "granted") {
            console.log("Granted Notification Perm")
            messaging.onMessage(payload => {
                const data = payload.data;
                console.log("Creating Notification UI")
                if (data.sender !== THERE) {
                    createUiForNotification(data);
                } else {
                    /*instead of our app checking periodically for notifications..we will let firebase do that for us
                    however we will also periodically update our IDB storage and..paint the page if any updates are found */
                    //  parse_message($.id("_msg_body"), data)
                }
            });
        } else {
            noNotifications = true
        }
    } else {
        noNotifications = true
    };
    if (noNotifications) {
        alert("We Cannot send notifications to you.This might cause messaging to slow down");
        periodicCheckTimer = 8000;
    }
    async function updatePageCache(parent_element = $.id("_msg_body")) {
        const data = await $get(chatid);
        let obj;
        console.log("new template")
        const template = document.createElement("div");
        template.className = "chat_body"
        if (data) {
            const len = Object.keys(data).length;
            console.log("Checking For Updated Data")
            obj = {
                stamp: new Date().getTime(),
                message: null,
                sender: HERE,
                chat_id: chatid,
                receiver: THERE,
                fetch_messages: true,
                fetch_from: len - 1
            }
            for (let i = 0; i < len; i++) {
                const __msg__ = data[i];
                if (__msg__) {
                    __msg__.msgid = i;
                    await parse_message(template, __msg__);
                }
            }
            parent_element.replaceWith(template);
            template.scrollTop = template.scrollHeight;
            template.id = "_msg_body"
            parent_element.remove()

            _resp = await fetchData(obj);
        } else {
            console.log("Fetching New")
            obj = {
                stamp: new Date().getTime(),
                message: null,
                sender: HERE,
                chat_id: chatid,
                receiver: THERE,
                fetch_messages: true
            };
            _resp = await fetchData(obj);
        }
        ////(_resp);
    }

    async function checkForMessages() {
        console.log(`[-] Manually Checking For Messages [Periodic Timer:${periodicCheckTimer}]`)
        await updatePageCache();
        setTimeout(await checkForMessages, 20 * 1000)
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
        close_this.textContent = "Close"
        const $par_const = $.create("div");
        $par_const.style.transition = '0.3s ease-in-out';
        __par.appendChild(close_this);
        __par.appendChild($par_const);
        close_this.onclick = () => {
            $par_const.style.opacity = '0';
            $par_const.style.height = '0px';
            __par.style.opacity = '0';
            __par.innerHTML = "";
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
            media_val.textContent = "Click To Open Media Preview";
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
                i.textContent = 'Click To Open Image In A New Tab';
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
    };

    const wsproto = (window.location.protocol === 'https:' ? "wss://" : "ws://");
    const websocket_url = `${wsproto}${window.location.host}/@/messenger/`;
    const ws = new WebSocket(websocket_url);
    console.log(ws)
    ws.onmessage = response => {
        const _data = response.data;
        if (_data === "pong") {
            return
        }
        parseResponse(_data)
    };
    ws.onopen = async () => {
        console.log("Opened Socket")
        createChatBox(THERE);
        await checkForMessages();
        (function keepAlivePings() {
            if (ws.readyState !== ws.CLOSED && ws.readyState !== ws.CLOSING) {
                ws.send("ping");
            }
            console.log("keeping alive")
            setTimeout(keepAlivePings, 30 * 1000)
        })()
    };
    ws.onclose = () => {
        /* reconnect to the websocket When we begin caching the data...this wont create requests as well*/
        $.id("_msg_body").innerHTML = "<br>Connection to server was lost. Please Reload the page"
    }
    async function fetchData(obj, url = "/@/messenger/") {
        let js;
        if (typeof obj === "object") {
            js = JSON.stringify(obj)
        } else if (typeof obj === "string") {
            js = obj
        };
        ws.send(js);
    }

    function parseResponse(msg) {
        const bod = $.id("_msg_body");
        try {
            const js = JSON.parse(msg);
            if (js.hasOwnProperty('error')) {
                console.log('prop-error', js)
                return bod.innerHTML += '<br>An error occured Please reload the page'
            }
            parse_message(bod, js);
        } catch (e) {
            console.log(e, "ERROR in parsing message");
            bod.innerHTML += '<br>An error occured Please reload the page'
        }
    }
}))()