((async () => {
    /*Get them cached*/
    (new Image).src = "/static/attachment.svg";
    (new Image).src = "/static/close.svg";
    (new Image).src = "/static/home.svg";
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
        HERE = $.id("username_meta").content;
    rdetails = $.id('resbox-details');
    img.oncontextmenu = e => {
        e.preventDefault()
    }
    inp.addEventListener("keydown", e => {
        if (e.keyCode === 13) {
            submit.click()
        }
    });
    const urlencode = json => {
        return `${Object.keys(json).
            map(key =>`${encodeURIComponent(key)}=${encodeURIComponent(json[key])}`)
            .join('&')}`;
    };

    function paint_page(data) {
        const js = data.users;
        results_all.innerHTML = "<div>Search Result</div>";
        results_all.style.display = 'block';
        if (js.length === 0) {
            return results_all.innerHTML = 'No Results Found'
        }
        for (const i of js) {
            const a = $.create("a"),
                btn = $.create("button")
            btn.textContent = i.user;
            a.appendChild(btn);
            $.set(a, 'data-user', i.user)
            $.set(a, "data-chat_id", i.chat_id)
            a.href = `/chat/${i.chat_id}`
            btn.className = 'resbtn'
            results_all.appendChild(a);
            a.style.textDecoration = 'none';
            a.style.color = "#000";
            a.style.display = 'block';
        }
    };
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
    let noNotifications, createUiForNotification;
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
        createUiForNotification = _data => {
            const box = $.create("div");
            const senderName = $.create("div");
            const messageContent = $.create("div");
            const actionBox = $.create("div");
            const replyBtn = $.create("span");
            const markAsRead = $.create("span");
            const reply_inp = $.create("input");
            const sender = _data.sender;
            const text = _data.messageContent;
            const isMedia = _data.hasImage;
            const chatID = _data.chat_id;
            $.set(reply_inp, "class", "notification-reply-bar");
            $.set(box, "class", "notification-box");
            $.set(senderName, "class", "notification-sender");
            $.set(messageContent, "class", "notification-text");
            $.set(actionBox, "class", "notification-action-box");
            $.set(replyBtn, "class", "notification-action-button");
            $.set(markAsRead, "class", "notification-action-button");
            box.appendChild(senderName);
            box.appendChild(messageContent);
            box.appendChild(actionBox);
            actionBox.appendChild(replyBtn);
            actionBox.appendChild(markAsRead);
            senderName.textContent = sender;
            replyBtn.textContent = `Reply To ${sender}`;
            markAsRead.textContent = "Mark As Read";
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
            markAsRead.onclick = () => {
                const _read = {
                    sender: sender,
                    receiver: HERE,
                    chat_id: chatID,
                    message: null,
                    read: {
                        id: _data.msgid
                    },
                    stamp: new Date().getTime(),
                    rstamp: new Date().getTime(),
                };
                fetchData(_read)
                box.remove()
            }
            messageContent.onclick = senderName.onclick = () => {
                createChatBox(sender);
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
                createUiForNotification(data);

            });
        } else {
            noNotifications = true
        }
    } else {
        noNotifications = true
    };
    if (noNotifications) {
        alert("We Cannot send notifications to you.This might cause messaging to slow down");
    };
    ((async () => {
        const _dat = await fetch("/api/chat_ids/", {
            method: "post",
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            },
            body: `user=${encodeURIComponent(document.getElementById("username_meta").content)}`

        });
        const resp = await _dat.json();
        const prevchats = $.id("prev-chats");
        prevchats.innerHTML = "<div>Your Previous Chats</div>"
        const data = resp.previous_chats;
        if (data.length === 0) {
            return prevchats.innerHTML = 'No previous chats Found'
        }
        for (const i of data) {
            const a = $.create("div"),
                btn = $.create("button")
            btn.textContent = i.user;
            a.appendChild(btn);
            $.set(a, 'data-user', i.user)
            $.set(a, "data-chat_id", i.chat_id)
            btn.onclick = e => window.location = `/chat/${i.chat_id}`;
            btn.className = 'resbtn'
            prevchats.appendChild(a);
        }
    }))();
    async function fetchData(obj, url = "/@/messenger/") {
        let js;
        if (typeof obj === "object") {
            js = JSON.stringify(obj)
        } else if (typeof obj === "string") {
            js = obj
        };
        const req = new Request(url, {
            method: "post",
            headers: {
                "content-type": "application/json"
            },
            body: js
        });
        const resp = await fetch(req);
        const _data = await resp.text();
        return _data
    }

}))()