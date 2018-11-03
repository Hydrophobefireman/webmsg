((async () => {
    (new Image).src = "/static/attachment.svg";
    (new Image).src = "/static/close.svg";
    (new Image).src = "/static/home.svg";
    let noNotifications;
    const urlencode = json => {
        return `${Object.keys(json).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(json[key])}`).join('&')}`;
    };

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

    const _responses = {
        login: {
            fields_empty_or_session_error: 'Check Your Username and Password or try to reload the page',
            no_such_user: 'No Such User Exists',
            incorrect_password: 'incorrect password'
        },
        register: {
            fields_empty_or_session_error: 'Check Your Username and Password or try to reload the page',
            bad_request: 'Bad Username or Password',
            username_taken: "Username Already Taken"
        }
    };
    const root = document.getElementById("app-root");
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
        create: (e, attrs) => {
            const el = document.createElement(e);
            if (typeof attrs === "object") {
                const keys = Object.keys(attrs);
                for (const i of keys) {
                    el.setAttribute(i, attrs[i])
                }
            }
            return el;
        },
        set: (obj, attr, val) => obj.setAttribute(attr, val),
        empty: (el) => {
            let r;
            r = el.lastChild;
            while (r) {
                el.removeChild(r);
                r = el.lastChild
            }
        }
    };

    async function _paintUserPage(params) {
        const __u = params[0];
        $.empty(root);
        root.textContent = "Loading";
        const user = await app.getUser();
        if (!user) {
            trace("Not Logged In..redirecting to '/'")
            return app.route("/")
        } else if (__u !== user) {
            return app.route(`/u/${user}`)
        }

        document.title = `${user} - Profile`;
        const nonce = await app.getIntegrity();
        const searchbox = $.create("div", {
            id: "searchbox"
        });
        //searchbox     
        const messages = $.create("div", {
            id: "messages",
            class: "__messages__"
        });
        const inputUsers = $.create("input", {
            class: "input_n",
            id: "users",
            type: "text",
            placeholder: "Search for a User",
            spellcheck: false
        });
        const searchButton = $.create("button", {
            id: "sbm",
            class: "submit-button"
        });
        searchButton.textContent = "Search"
        const errmsgs = $.create("div", {
            id: 'errmsgs'
        });
        //end searchbox
        searchbox.appendChild(messages);
        searchbox.appendChild(inputUsers);
        searchbox.appendChild(searchButton);
        searchbox.appendChild(errmsgs);
        const results = $.create("div", {
            id: "res"
        });
        //results
        const resbox = $.create("div", {
            class: "resbox-details",
            style: 'margin-top: 20px'
        });
        const img = new Image;
        img.oncontextmenu = e => {
            e.preventDefault()
        }
        img.src = "/static/loading.gif";
        resbox.appendChild(img);
        img.id = "loading-gif";
        results.appendChild(resbox);
        //end-results
        const resultsAll = $.create("div", {
            id: "results-all"
        });
        const prevChats = $.create("div", {
            id: "prev-chats"
        });
        root.innerHTML = '';
        root.appendChild(searchbox);
        root.appendChild(results);
        root.appendChild(resultsAll);
        root.appendChild(prevChats);
        inputUsers.addEventListener("keydown", e => {
            if (e.keyCode === 13) {
                searchButton.click()
            }
        });

        function paintPageResults(data) {
            const js = data.users;
            resultsAll.innerHTML = "<div>Search Result</div>";
            resultsAll.style.display = 'block';
            if (js.length === 0) {
                return resultsAll.innerHTML = 'No Results Found'
            }
            for (const i of js) {
                const a = $.create("a"),
                    btn = $.create("button")
                btn.textContent = i.user;
                a.appendChild(btn);
                $.set(a, 'data-user', i.user)
                $.set(a, "data-chat_id", i.chat_id)
                a.href = `/#/chat/${i.chat_id}`
                btn.className = 'resbtn'
                resultsAll.appendChild(a);
                a.style.textDecoration = 'none';
                a.style.color = "#000";
                a.style.display = 'block';
            };
        };
        searchButton.onclick = async () => {
            messages.style.visibility = 'hidden';
            if (inputUsers.value.length == 0) {
                return
            } else {
                resbox.style.display = 'block';
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
                        user: inputUsers.value
                    })
                });
                img.style.display = 'none';
                resbox.style.display = 'none';
                try {
                    const data = await results.json();
                    return paintPageResults(data);
                } catch (e) {
                    console.warn(e);
                    messages.style.visibility = 'visible';
                    return messages.innerHTML = 'An error occured on our end..please try again'
                }
            }
        };
        ((async () => {
            const _dat = await fetch("/api/chat_ids/", {
                method: "post",
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                },
                body: `user=${encodeURIComponent(await app.getUser())}`

            });
            const resp = await _dat.json();
            prevChats.innerHTML = "<div>Your Previous Chats</div>"
            const data = resp.previous_chats;
            if (data.length === 0) {
                return prevChats.innerHTML = 'No previous chats Found'
            }
            for (const i of data) {
                const a = $.create("div"),
                    btn = $.create("button")
                btn.textContent = i.user;
                a.appendChild(btn);
                $.set(a, 'data-user', i.user)
                $.set(a, "data-chat_id", i.chat_id)
                btn.onclick = () => {
                    window.location.href = `/#/chat/${i.chat_id}`;
                    window.location.reload();
                }
                //refresh chat context
                btn.className = 'resbtn'
                prevChats.appendChild(a);
            }
        }))();
    };
    async function _paintChatPage(params) {
        ((async params => {
            $.empty(root);
            const id = params[0];
            const ___PROCESSES___ = [];
            const data = await app.validateChat(id);
            if (!data) {
                return app._errstatus(500, "No chat exists with the given ID");
            };
            const results_all = $.create("div", {
                id: 'results-all'
            });
            root.appendChild(results_all);
            root.appendChild($.create("div", {
                id: "message-info"
            }))
            const THERE = app.chat_with;
            const chatid = app.chat_id;
            const HERE = await app.getUser();
            let periodicCheckTimer;
            periodicCheckTimer = 20 * 1000;
            async function parse_message(parent_element, js) {
                async function make_message_box(box, message, sender, receiver, stamp, msgid, read, rstamp, media = null) {
                    if ($.q(`div[data-msgid='${msgid}']`)) {
                        return;
                    };
                    let msg_class;
                    const msg = $.create("div");
                    if (sender === HERE) {
                        msg_class = 'msg_sent'
                        msg.style.marginLeft = 'auto';
                        $.set(msg, "data-read", read);
                    } else {
                        msg_class = "msg_recieved";
                        $.set(msg, "data-read", true);
                        $.set(msg, "data-rstamp", rstamp);
                        read = true;
                        rstamp = rstamp || new Date().getTime();
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
                    };
                    $.set(msg, "data-rstamp", rstamp);
                    $.set(msg, "data-sender", sender);
                    $.set(msg, "data-receiver", receiver);
                    $.set(msg, "data-stamp", stamp);
                    $.set(msg, 'data-msgid', msgid);

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
                    const _data = js.data;
                    const data = _data.messages || _data;
                    const updates = _data.updates || [];
                    if (js.full_fetch) {
                        console.log("[indexedDB]Setting Full Cache to indexedDB:", data)
                        await $set($.__chatID__, data);
                    } else {
                        const __ = await $get($.__chatID__);
                        const new_data = Object.assign({}, __, data);
                        await $set($.__chatID__, new_data);
                    };
                    const __chats__ = await $get($.__chatID__);
                    for (const cc of updates) {
                        const b = cc.id;
                        const msg_to_edit = document.querySelector(`div[data-msgid='${b}']`);
                        __chats__[b].read = true;
                        __chats__[b].rstamp = cc.s;
                        $.set(msg_to_edit, "data-read", true);
                        $.set(msg_to_edit, "data-rstamp", cc.s);
                        await $set($.__chatID__, __chats__);
                        await __CurrSocketFetch({
                            sender: HERE,
                            receiver: THERE,
                            message: null,
                            chat_id: chatid,
                            seen_read: {
                                id: b
                            },
                            stamp: new Date().getTime(),
                        })
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
                            await parse_message(parent_element, __msg__);
                        }
                    };

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
                            receiver: HERE,
                            sender: js.sender,
                            chat_id: chatid,
                            message: null,
                            read: {
                                id: js.msgid
                            },
                            stamp: new Date().getTime(),
                            rstamp: new Date().getTime(),

                        };
                        await __CurrSocketFetch(_read);
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
                    if (msg) {
                        $.set(msg, "data-read", js.update.read);
                        $.set(msg, 'data-rstamp', js.update.rstamp);
                        console.log("updating data")
                        const ___data___ = await $get(chatid);
                        const ___newdata___ = Object.assign({}, ___data___);
                        ___newdata___[msid].read = js.update.read;
                        ___newdata___[msid].rstamp = js.update.rstamp;
                        await $set(chatid, ___newdata___);
                    }
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
                    webrtcReq = $.create("div"),
                    attach_btn = $.create("div");
                $user.id = "__chat-with-prof"
                $.set($menubox, 'data-stat', 'closed');
                $.set($user, "class", "chat_with");
                $.set($menubox, 'class', 'menu-details');
                $menubox.id = "__menubox__";
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
                $.set(webrtcReq, "class", "img-button-holder");
                $.set(txtbox, 'data-user', u);
                bod.id = "_msg_body";
                $menubox.appendChild(close_btn);
                $menubox.appendChild(attach_btn);
                $menubox.appendChild(webrtcReq);
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
                webrtcReq.textContent = "Start WebRTC Session";
                results_all.appendChild(boxwrap);
                close_btn.onclick = () => {
                    if (typeof ws === "object") {
                        ws.close()
                    }
                    app.route(`/u/${HERE}`);
                };
                $menu.id = "Nzk3NzEzOD"
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
                };
                webrtcReq.onclick = async () => {};
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
                                await __CurrSocketFetch(ws_data);
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
                            await __CurrSocketFetch(data);
                            ////(resp)
                        }
                    }
                };
            };

            async function updatePageCache(parent_element = $.id("_msg_body")) {
                if (app.currentFuncRoute() !== "chat") {
                    return trace("Removed Chat Context->")
                }
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
                            await parse_message(parent_element, __msg__);
                        }
                    }
                    await __CurrSocketFetch(obj);
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
                    await __CurrSocketFetch(obj);
                }
                ////(_resp);
            }

            function _CustomSetTimeout(func, time) {
                console.log("Settimeout func")
                if (app.currentFuncRoute() === "chat") {
                    console.log(`${app.currentFuncRoute()}->Current Route`)
                    return setTimeout(func, time)
                } else {
                    return trace(`Ignoring Timeout `)
                }
            }
            async function checkForMessages() {
                console.log(`[-] Manually Checking For Messages [Periodic Timer:${periodicCheckTimer}]`)
                await updatePageCache();
                let _timeout;
                _timeout = _CustomSetTimeout(await checkForMessages, 20 * 1000);
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

            function toggle_menu() {
                const el = $.id("Nzk3NzEzOD");
                if ($.id("__menubox__").getAttribute("data-stat") === "opened") {
                    el.click()
                }
                return
            }
            ws.onopen = async () => {
                console.log("Opened Socket")
                createChatBox(THERE);
                await checkForMessages();
                $.id("_msg_body").onclick = () => {
                        toggle_menu()
                    }
                    (function keepAlivePings() {
                        if (ws.readyState !== ws.CLOSED && ws.readyState !== ws.CLOSING) {
                            ws.send("ping");
                        }
                        console.log("keeping alive");
                        let keepAlivePings_timer;
                        _CustomSetTimeout(keepAlivePings, 30 * 1000);
                        ___PROCESSES___.push(keepAlivePings_timer);
                    })()
            };
            ws.onclose = () => {
                /* reconnect to the websocket When we begin caching the data...this wont create requests as well*/
                $.id("_msg_body").innerHTML = "<br>Connection to server was lost. Please Reload the page"
            };
            async function __CurrSocketFetch(obj, url = "/@/messenger/") {
                let js;
                if (typeof obj === "object") {
                    js = JSON.stringify(obj)
                } else if (typeof obj === "string") {
                    js = obj
                };
                ws.send(js);
            };

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
            };
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
        }))(params)
    }
    async function _paintLoginPage() {
        $.empty(root);
        const __isLoggedIn = await app.getUser();
        if (__isLoggedIn) {
            trace(`Logged In->routing to:${__isLoggedIn}`)
            app.route(`/u/${__isLoggedIn}`)
        }
        const parent = $.create("div", {
            class: "main"
        });
        //main children:
        const loginbtn = $.create("button", {
            id: "login"
        });
        loginbtn.textContent = "Login";
        const signupbtn = $.create("button", {
            id: "signup"
        });
        signupbtn.textContent = "Signup";
        const errsAndNotices = $.create("div", {
            class: "errors-and-notices"
        });
        errsAndNotices.style.color = 'red';
        const lfbox = $.create("div", {
            id: "lfbox"
        });
        lfbox.style.display = "none";
        //lfbox children:
        const loginform = $.create("div", {
            "data-action": "/login/check",
            id: "login-form"
        });
        //loginform children
        const loginUsername = $.create("input", {
            type: 'text',
            class: 'input_x',
            name: 'user',
            id: 'username-log',
            placeholder: 'Username'
        });
        const loginPassword = $.create("input", {
            type: "password",
            id: "password-log",
            class: 'input_x',
            placeholder: "Password",
            name: "password"
        });
        //end loginform
        const submitLogin = $.create("button", {
            class: "submit-button",
            id: "login-btn"
        });
        submitLogin.textContent = "Login";
        loginform.appendChild(loginUsername);
        loginform.appendChild(loginPassword);
        lfbox.appendChild(loginform);
        lfbox.appendChild(submitLogin);
        //end lfbox
        const rfbox = $.create("div", {
            id: "rfbox"
        })
        rfbox.style.display = 'none';
        //rfbox children
        const signupForm = $.create("div", {
            id: "register-form",
            "data-action": "/register/check/"
        });
        //signupform children
        const regErrs = $.create("div", {
            id: "__errs__"
        });
        const regUsername = $.create("input", {
            type: 'text',
            class: 'input_x',
            name: 'user',
            id: 'username-reg',
            placeholder: 'Username'
        });
        const regPassword = $.create("input", {
            type: "password",
            class: 'input_x',
            id: "password-reg",
            placeholder: "Password",
            name: "password"
        });
        const conf_regPassword = $.create("input", {
            type: "password",
            id: "password-reg-conf",
            class: 'input_x',
            placeholder: "Confirm Password",
            name: "password"
        });
        //end signupform
        const submitSignup = $.create("button", {
            class: "submit-button",
            id: "register-btn"
        });
        submitSignup.textContent = "Signup";
        signupForm.appendChild(regErrs);
        signupForm.appendChild(regUsername);
        signupForm.appendChild(regPassword);
        signupForm.appendChild(conf_regPassword);
        rfbox.appendChild(signupForm);
        rfbox.appendChild(submitSignup);
        //end rfbox
        parent.appendChild(loginbtn)
        parent.appendChild(signupbtn);
        parent.appendChild(errsAndNotices);
        parent.appendChild(lfbox);
        parent.appendChild(rfbox);
        root.appendChild(parent);
        loginbtn.onclick = () => {
            login.style.backgroundColor = "#6200ee";
            login.style.color = '#fff';
            signupbtn.style.backgroundColor = "#fff";
            signupbtn.style.color = "#6200ee";
            $.id("lfbox").style.display = 'block';
            $.id("rfbox").style.display = 'none';
        };
        signupbtn.onclick = () => {
            signupbtn.style.backgroundColor = "#6200ee";
            signupbtn.style.color = '#fff';
            loginbtn.style.backgroundColor = "#fff";
            loginbtn.style.color = "#6200ee";
            $.id("rfbox").style.display = 'block';
            $.id("lfbox").style.display = 'none';
        };
        String.prototype.isValid = function () {
            if (this.length > 0) {
                return /^[0-9a-zA-Z_.-]+$/.test(this);
            }
        };
        const integrity = await app.getIntegrity();
        console.log(integrity);
        submitSignup.addEventListener("click", async () => {
            const pass = regPassword.value,
                pass_conf = conf_regPassword.value;
            if (pass !== pass_conf) {
                return errsAndNotices.textContent = "Passwords Do not Match!";
            } else {
                errsAndNotices.textContent = "Loading";
                const data = await fetch("/register/check/", {
                    credentials: 'include',
                    headers: {
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    method: "post",
                    body: urlencode({
                        user: regUsername.value,
                        password: pass,
                        checkpw: pass_conf,
                        integrity
                    })
                });
                try {
                    const resp = await data.json();
                    if (data.status === 403) {
                        const possibiliies = _responses.register,
                            text = possibiliies[resp.error];
                        errsAndNotices.innerHTML = text;
                    } else if (data.status !== 200) /*expecting a 50x error*/ {
                        errsAndNotices.innerHTML = 'An Error Occured..please reload the page and try again'
                    } else {
                        errsAndNotices.innerHTML = 'Account Created. Please Login';
                    }
                } catch (e) {
                    console.log(e);
                    return errsAndNotices.innerHTML = 'An Error Occured..please reload the page and try again'
                }
            };
        });
        submitLogin.addEventListener("click", async () => {
            errsAndNotices.innerHTML = 'Loading'
            const data = await fetch("/login/check/", {
                credentials: 'include',
                method: 'post',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                },
                body: urlencode({
                    user: loginUsername.value,
                    password: loginPassword.value,
                    integrity

                })
            });
            try {
                const resp = await data.json();
                if (data.status === 403) {
                    const possibiliies = _responses.login,
                        text = possibiliies[resp.error];
                    errsAndNotices.innerHTML = text;
                } else if (data.status !== 200) /*expecting a 50x error*/ {
                    errsAndNotices.innerHTML = 'An Error Occured..please reload the page and try again'
                } else {
                    errsAndNotices.textContent = "Authenticated";
                    app.route(`/u/${resp.user}`)
                }
            } catch (e) {
                console.log(e);
                return errsAndNotices.innerHTML = 'An Error Occured..please reload the page and try again'
            }
        });
        loginPassword.addEventListener('keydown', (e) => {
            const inp = loginPassword,
                user = loginUsername;
            if (inp.value.length !== 0 && user.value.length !== 0 && e.keyCode === 13) {
                submitLogin.click()
            }
        });
        const usrreg = regUsername,
            passreg = regPassword,
            passreg_conf = conf_regPassword;
        check_passwords = (target) => {
            const val = target.value;
            const mainval = passreg.value;
            if (val !== mainval) {
                regErrs.style.visibility = 'visible';
                regErrs.innerHTML = 'Passwords Do Not Match!';
                registerbtn.disabled = true;
            } else {
                regErrs.style.visibility = 'hidden';
                $.empty(regErrs);
                submitSignup.disabled = false;
            }
        };
        passreg_conf.oninput = ({
            target
        }) => {
            check_passwords(target)
        };
        passreg_conf.onkeydown = (e) => {
            if (e.keyCode === 13 && !registerbtn.disabled) {
                registerbtn.click()
            }
        };
        passreg.oninput = () => {
            if (passreg_conf.value.length > 0) {
                check_passwords(passreg_conf)
            }
        };

        function checkDataValidity(target) {
            const val = target.value;
            if (!val.isValid()) {
                regErrs.style.visibility = 'visible';
                regErrs.innerHTML = 'Invalid Characters!';
                passreg.disabled = !0;
                passreg_conf.disabled = !0;
            } else if (val.length < 4) {
                regErrs.style.visibility = 'visible';
                regErrs.innerHTML = 'Username Too Short';
                passreg.disabled = !0;
                passreg_conf.disabled = !0;
            } else if (val.length > 30) {
                regErrs.style.visibility = 'visible';
                regErrs.innerHTML = 'Username Too Long';
                passreg.disabled = !0;
                passreg_conf.disabled = !0;
            } else {
                passreg.disabled = !1;
                passreg_conf.disabled = !1;
            }
        };
        usrreg.oninput = ({
            target
        }) => {
            errs.style.visibility = 'hidden';
            $.empty(errs);
            checkDataValidity(target)
        }
    }

    function trace(err, type = "warn") {
        const func = console[type];
        func(`[${performance.now()}]=>${err}`)
    }
    class App {
        constructor() {
            this.RouteParser = (_url) => {
                try {
                    const url = new URL(_url);
                    return url.hash.substr(1) || "/";
                } catch (e) {
                    trace(e);
                    return "/";
                }
            }
            this.HERE = null;
            this.integrity = $.q("meta[name='integrity']").getAttribute("content");
            this.prevKey = null;
            this.chat_id = null;
            this.chat_with = null;
            this.host = window.location.hostname;
            this.first_location = window.location.href
            this.first_route = this.RouteParser(this.first_location);
        };
        async getCurrChat() {
            if (this.currentRoute().indexOf("/chat/") !== 0) {
                return null;
            };
            return this.chat_with;
        };
        async validateChat(id) {
            const data = await fetch("/api/validate-chat/", {
                method: "post",
                body: urlencode({
                    chat_id: id,
                }),
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                },
                credentials: "include"
            });
            const resp = await data.json();
            if (resp.hasOwnProperty("error")) {
                return false
            } else {
                this.chat_id = resp.chat_id;
                this.chat_with = resp.chat_with;
            };
            return true;
        }
        async getUser() {
            if (this.HERE) {
                return this.HERE
            }
            const a = await fetch("/api/getuser", {
                credentials: "include"
            });
            if (!a.ok) {
                return null;
            }
            const b = await a.text();
            this.HERE = b;
            return this.HERE;
        };
        _errstatus(code) {
            switch (code) {
                case 404:
                    root.innerHTML = `
                    <div>404:The requested URL was not found</div>
                    <div><a href="/#/">Click To Go  Back</a></div>`
                case 500:
                    root.innerHTML = `
                    <div>500:An error occured while processing your request</div>
                    <div><a href="/#/">Click To Go  Back</a></div>`
            }
        }
        currentRoute() {
            return location.hash.substr(1)
        }
        currentFuncRoute() {
            return this.currentRoute().split("/")[1]
        }
        route(href) {
            if (this.RouteParser(location.href) !== href) {
                return window.location.hash = href
            };
            let _route;
            _route = href.split("/")[1]
            if (_route === "") {
                _route = "/"
            }
            const _routeParam = href.split("/");
            const availableRoutes = ["/", "chat", "u", "login"];
            if (!availableRoutes.includes(_route)) {
                app._errstatus(404);
                return trace(`[app route->${href}]No Such Route`);
            };
            this.paintPage(_route, _routeParam.filter(x => _routeParam.indexOf(x) > 1));

        };
        paintPage(href, params) {
            const routes = {
                "/": 0,
                "chat": 1,
                "u": 1
            };
            if (routes[href] !== params.length) {
                return app._errstatus(404);
            };

            const _pageMap = {
                "/": _paintLoginPage,
                "chat": _paintChatPage,
                "u": _paintUserPage
            }
            const func = _pageMap[href];
            trace(`Painting Page for Route:${href}`)
            func(params);

        };
        async getIntegrity() {
            const data = await fetch("/api/integrity/", {
                method: "post",
                body: urlencode({
                    key: this.prevKey || this.integrity
                }),
                credentials: "include",
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                }
            });
            let resp;
            try {
                resp = await data.json();
            } catch (e) {
                console.warn(e)
            }
            const key = resp.key;
            this.prevKey = key;
            this.integrity = null;
            return key
        }
        notifyUser(title, options) {
            let body, messageMode, hasImage, actionBox, actionBtn, chat_id, hasAction;
            let actionOnClick, messageOnClick, box, timer, titleBox, content, img;
            box = $.create("div", {
                class: "notification-box"
            });
            titleBox = $.create("div", {
                class: "notification-sender"
            });
            content = $.create("div", {
                class: "notification-text"
            });
            hasAction = options.hasAction
            if (hasAction) {
                actionBox = $.create("div", {
                    class: "notification-action-box"
                })
                actionBtn = $.create("div", {
                    class: "notification-action-button"
                });
                actionBtn.textContent = options.actionText || "Example Button";
                actionBox.appendChild(actionBtn);
            }
            body = options.body || "New Notification";
            content.textContent = body;
            messageMode = options.messageMode;
            messageOnClick = options.messageOnClick;
            if (messageOnClick === "__close__") {
                content.onclick = titleBox.onclick = () => {
                    $.empty(box);
                    box.remove();
                }
            } else {
                content.onclick = titleBox.onclick = messageOnClick;
            }
            titleBox.textContent = title;
            if (messageMode) {
                hasImage = !!options.mediaURL;
                if (hasImage) {
                    img = new Image;
                    img.src = "/static/attachment.svg";
                    $.empty(content)
                    content.appendChild(img);
                }
                chat_id = options.chat_id;
                if (hasAction) {
                    actionBtn.onclick = () => {
                        this._respondToNotification(timer, actionBtn, chat_id, title, box)
                    }
                }
            } else {
                if (hasAction) {
                    actionBtn.onclick = actionOnClick;
                }
            };
            box.appendChild(titleBox);
            box.appendChild(content);
            if (hasAction) {
                box.appendChild(actionBox);
            }
            document.body.appendChild(box);
            setTimeout(() => {
                box.style.marginTop = '15px';
                timer = setTimeout(() => {
                    box.remove();
                }, 4000);
            }, 500);
        };
        _respondToNotification(timer, actionBtn, chat_id, title, box) {
            let actionInput;
            clearTimeout(timer);
            actionInput = $.create("input", {
                class: "notification-reply-bar"
            });
            actionBtn.replaceWith(actionInput);
            actionInput.focus()
            actionInput.onkeydown = async evt => {
                if (evt.keyCode === 13) {
                    if (actionInput.value.replace(/\s/g, "").length > 0) {
                        const stamp = new Date().getTime();
                        const value = actionInput.value;
                        const data = {
                            receiver: title,
                            message: value,
                            media: null,
                            stamp,
                            sender: await this.getUser(),
                            chat_id
                        };

                        actionInput.value = '';
                        box.remove()
                        await fetchData(data); //no need of the data
                    }
                }
            };
        };
    };
    const app = new App();
    $.set(root, "curr-route", app.first_route);
    window.onhashchange = () => {
        const hash = window.location.hash.substr(1);
        trace(`app route->${hash}`, 'log');
        app.route(hash);
        $.set(root, "curr-route", hash)
    };
    app.route(app.first_route)
    if (typeof window.Notification === "function") {
        const messaging = firebase.messaging();
        try {
            console.log("Supports Notifications")
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
            console.warn(e)
            noNotifications = true;
            console.log("Permission-Denied")
        };
        if (Notification.permission === "granted") {
            console.log("Granted Notification Perm")
            messaging.onMessage(async payload => {
                const chat_with = await app.getCurrChat();
                const data = payload.data;
                const chat_id = data.chat_id;
                const sender = data.sender;
                if (chat_with === sender) {
                    return trace("Not creating notification for current chat")
                }
                const body = data.message;
                const mediaURL = data.hasImage;
                const hasAction = true;
                const actionText = `Reply to ${sender}`;
                const messageMode = true;
                console.log("Creating Notification UI");
                console.log("DATA:", data)
                app.notifyUser(sender, {
                    body,
                    chat_id,
                    mediaURL,
                    messageOnClick() {
                        window.location = `/#/chat/${chat_id}`;
                        location.reload()
                    },
                    hasAction,
                    actionText,
                    messageMode
                });

            });
        } else {
            noNotifications = true
        }
    } else {
        noNotifications = true
    };
    if (noNotifications) {
        app.notifyUser("Notification Error", {
            body: "We Cannot send notifications to you.This might cause messaging to slow down",
            messageOnClick: "__close__"
        });
    };

    function fetchData(obj) {
        return new Promise((res, rej) => {
            let js;
            if (typeof obj === "object") {
                js = JSON.stringify(obj)
            } else if (typeof obj === "string") {
                js = obj
            };
            const wsproto = (window.location.protocol === 'https:' ? "wss://" : "ws://");
            const websocket_url = `${wsproto}${window.location.host}/@/messenger/`;
            const ws = new WebSocket(websocket_url);
            ws.onopen = () => {
                res(ws.send(js))
            }
        });
    }
}))()