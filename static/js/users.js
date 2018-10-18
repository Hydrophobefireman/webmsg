(() => {
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

    function create_chat_box(u) {
        const __SKELETON__ = `
        <div class="chat_box_wrap">
            <div class="chat_box">
                <div class="chat_head"></div>
                <div id=menubox>   </div>
                <div class="chat_body"></div>
                <input type="text" placeholder="type a message">
                <img src="" class=context>
            </div>
        </div>`
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
        check_page_cache(ws, u);
        ws.onopen = () => {
            console.log('Socket Opened')
        }
        ws.onclose = () => {
            bod.innerHTML = 'Connection to the server Broke..Please reload the page'
        }
        ws.onmessage = e => {
            const msg = e.data;
            try {
                const js = JSON.parse(msg);
                parse_message(bod, js, $user);
                if (js.hasOwnProperty('error')) {
                    return bod.innerHTML = 'An error occured Please reload the page'
                }
            } catch (e) {
                console.log(e);
                bod.innerHTML = 'An error occured Please reload the page'
            }
        }

        function check_page_cache(ws, user) {
            /* TODO: check indexed DB*/
            const obj = {
                stamp: new Date().getTime(),
                message: null,
                user,
                fetch_messages: true
            };
            ws.send(JSON.stringify(obj))
            return ws
        }

        function parse_message(parent_element, js, user) {
            function make_message_box(box, message, sender, receiver, stamp, msgid, read, rstamp) {
                let msg_class;
                if (sender === HERE) {
                    msg_class = 'msg_recieved'
                } else {
                    msg_class = "msg_sent"
                }
                const msg = $.create("div");
                $.set(msg, "class", `msg ${msg_class}`);
                msg.textContent = message;
                $.set(msg, "data-sender", sender);
                $.set(msg, "data-receiver", receiver);
                $.set(msg, "data-stamp", stamp);
                $.set(msg, 'data-msgid', msgid);
                $.set(msg, "data-read", read);
                $.set(msg, "data-rstamp", rstamp)
                box.appendChild(msg)
            }
            console.log(js)
            if (js.typing) {
                //if the user is typing..we dont need to create any element
                return user.style.color = 'green'
            }
            user.style.color = '#fff';
            if (js.fetch) {
                console.log(js.data);
            }
            if (js.message) {
                const text = js.message,
                    sender = js.sender,
                    receiver = js.receiver,
                    stamp = js.stamp,
                    read = js.read,
                    rstamp = js.rstamp,
                    msgid = js.msgid;
                return make_message_box(parent_element, text, sender, receiver, stamp, msgid, read, rstamp)
            }
            if (js.update) {
                const msid = js.msgid;
                const msg = document.querySelector(`div[data-msgid='${msid}']`);
                $.set(msg, "data-read", js.update.read);
                $.set(msg, 'data-rstamp', js.update.rstamp)
            }
            if (js.media) {}
            const msgdiv = $.create("div");


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
                            method: "post",
                            headers: {
                                "x-file-name": f.name
                            },
                            body: data
                        });
                        const resp = await subm.json();
                        return resp.url;
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
                    const value = txtbox.value;
                    const data = {
                        user: this.getAttribute("data-user"),
                        message: value,
                        typing: false,
                        media: null,
                        stamp: new Date().getTime()
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
        console.log(img);
        console.log(img.width, img.height, img.naturalHeight, img.naturalWidth);
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
})()