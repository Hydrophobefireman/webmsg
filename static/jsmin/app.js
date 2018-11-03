(async () => {
    let e;
    (new Image).src = "/static/attachment.svg", (new Image).src = "/static/close.svg", (new Image).src = "/static/home.svg";
    const t = e => `${Object.keys(e).map(t=>`${encodeURIComponent(t)}=${encodeURIComponent(e[t])}`).join("&")}`;

    function n(e) {
        e.style.overflow = "hidden", e.style.padding = "0px", e.style.opacity = 0, e.style.height = "0", e.style.border = "none", e.style.width = "0"
    }

    function a(e) {
        e.style.padding = "5px", e.style.opacity = 1, e.style.height = "auto", e.style.width = "auto", e.style.border = "2px solid #e3e3e3", e.style.overflow = "visible"
    }
    const s = {
            login: {
                fields_empty_or_session_error: "Check Your Username and Password or try to reload the page",
                no_such_user: "No Such User Exists",
                incorrect_password: "incorrect password"
            },
            register: {
                fields_empty_or_session_error: "Check Your Username and Password or try to reload the page",
                bad_request: "Bad Username or Password",
                username_taken: "Username Already Taken"
            }
        },
        i = document.getElementById("app-root"),
        o = {
            q: (e, t = !0) => {
                const n = Array.from(document.querySelectorAll(e));
                return t ? n[0] : n
            },
            id: e => document.getElementById(e),
            className: (e, t = !0) => {
                const n = Array.from(document.getElementsByClassName(e));
                return t ? n[0] : n
            },
            create: (e, t) => {
                const n = document.createElement(e);
                if ("object" == typeof t) {
                    const e = Object.keys(t);
                    for (const a of e) n.setAttribute(a, t[a])
                }
                return n
            },
            set: (e, t, n) => e.setAttribute(t, n),
            empty: e => {
                let t;
                for (t = e.lastChild; t;) e.removeChild(t), t = e.lastChild
            }
        };
    async function r(e) {
        const n = e[0];
        o.empty(i), i.textContent = "Loading";
        const a = await p.getUser();
        if (!a) return l("Not Logged In..redirecting to '/'"), p.route("/");
        if (n !== a) return p.route(`/u/${a}`);
        document.title = `${a} - Profile`;
        const s = await p.getIntegrity(),
            r = o.create("div", {
                id: "searchbox"
            }),
            c = o.create("div", {
                id: "messages",
                class: "__messages__"
            }),
            d = o.create("input", {
                class: "input_n",
                id: "users",
                type: "text",
                placeholder: "Search for a User",
                spellcheck: !1
            }),
            u = o.create("button", {
                id: "sbm",
                class: "submit-button"
            });
        u.textContent = "Search";
        const h = o.create("div", {
            id: "errmsgs"
        });
        r.appendChild(c), r.appendChild(d), r.appendChild(u), r.appendChild(h);
        const g = o.create("div", {
                id: "res"
            }),
            y = o.create("div", {
                class: "resbox-details",
                style: "margin-top: 20px"
            }),
            m = new Image;
        m.oncontextmenu = (e => {
            e.preventDefault()
        }), m.src = "/static/loading.gif", y.appendChild(m), m.id = "loading-gif", g.appendChild(y);
        const f = o.create("div", {
                id: "results-all"
            }),
            w = o.create("div", {
                id: "prev-chats"
            });
        i.innerHTML = "", i.appendChild(r), i.appendChild(g), i.appendChild(f), i.appendChild(w), d.addEventListener("keydown", e => {
            13 === e.keyCode && u.click()
        }), u.onclick = (async () => {
            if (c.style.visibility = "hidden", 0 != d.value.length) {
                y.style.display = "block", m.style.display = "inline";
                const e = await fetch(`/api/user-search/tokens/${s}`, {
                        method: "get",
                        credentials: "include"
                    }),
                    n = await e.text(),
                    a = await fetch("/api/users/", {
                        credentials: "include",
                        method: "post",
                        headers: {
                            "content-type": "application/x-www-form-urlencoded"
                        },
                        body: t({
                            token: n,
                            user: d.value
                        })
                    });
                m.style.display = "none", y.style.display = "none";
                try {
                    return function (e) {
                        const t = e.users;
                        if (f.innerHTML = "<div>Search Result</div>", f.style.display = "block", 0 === t.length) return f.innerHTML = "No Results Found";
                        for (const e of t) {
                            const t = o.create("a"),
                                n = o.create("button");
                            n.textContent = e.user, t.appendChild(n), o.set(t, "data-user", e.user), o.set(t, "data-chat_id", e.chat_id), t.href = `/#/chat/${e.chat_id}`, n.className = "resbtn", f.appendChild(t), t.style.textDecoration = "none", t.style.color = "#000", t.style.display = "block"
                        }
                    }(await a.json())
                } catch (e) {
                    return console.warn(e), c.style.visibility = "visible", c.innerHTML = "An error occured on our end..please try again"
                }
            }
        }), (async () => {
            const e = await fetch("/api/chat_ids/", {
                    method: "post",
                    headers: {
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    body: `user=${encodeURIComponent(await p.getUser())}`
                }),
                t = await e.json();
            w.innerHTML = "<div>Your Previous Chats</div>";
            const n = t.previous_chats;
            if (0 === n.length) return w.innerHTML = "No previous chats Found";
            for (const e of n) {
                const t = o.create("div"),
                    n = o.create("button");
                n.textContent = e.user, t.appendChild(n), o.set(t, "data-user", e.user), o.set(t, "data-chat_id", e.chat_id), n.onclick = (() => {
                    window.location.href = `/#/chat/${e.chat_id}`, window.location.reload()
                }), n.className = "resbtn", w.appendChild(t)
            }
        })()
    }
    async function c(e) {
        (async e => {
            o.empty(i);
            const t = e[0],
                s = [];
            if (!await p.validateChat(t)) return p._errstatus(500, "No chat exists with the given ID");
            const r = o.create("div", {
                id: "results-all"
            });
            i.appendChild(r), i.appendChild(o.create("div", {
                id: "message-info"
            }));
            const c = p.chat_with,
                d = p.chat_id,
                u = await p.getUser();
            let h;
            async function g(e, t) {
                async function s(e, t, s, i, r, c, d, l, p = null) {
                    if (o.q(`div[data-msgid='${c}']`)) return;
                    let h;
                    const g = o.create("div");
                    if (s === u ? (h = "msg_sent", g.style.marginLeft = "auto", o.set(g, "data-read", d)) : (h = "msg_recieved", o.set(g, "data-read", !0), o.set(g, "data-rstamp", l), d = !0, l = l || (new Date).getTime(), g.style.marginRight = "auto"), o.set(g, "class", `msg ${h}`), p) {
                        o.set(g, "data-media", p);
                        const e = new Image;
                        e.src = "/static/attachment.svg", g.appendChild(e), g.style.fontSize = "12px", g.appendChild += "Media Message"
                    } else o.set(g, "data-media", null), g.textContent = t;
                    let y;
                    o.set(g, "data-rstamp", l), o.set(g, "data-sender", s), o.set(g, "data-receiver", i), o.set(g, "data-stamp", r), o.set(g, "data-msgid", c), e.appendChild(g), e.scrollTop = e.scrollHeight, g.onclick = function () {
                        ! function (e) {
                            const t = e.dataset,
                                s = t.sender,
                                i = parseInt(t.stamp),
                                r = t.read,
                                c = parseInt(t.rstamp),
                                d = t.media,
                                l = o.id("message-info");
                            l.innerHTML = "", l.style.opacity = "1";
                            const p = o.create("div");
                            o.set(p, "class", "message-close"), p.textContent = "Close";
                            const h = o.create("div");
                            h.style.transition = "0.3s ease-in-out", l.appendChild(p), l.appendChild(h), p.onclick = (() => {
                                h.style.opacity = "0", h.style.height = "0px", l.style.opacity = "0", l.innerHTML = ""
                            });
                            const g = o.create("div"),
                                y = o.create("div"),
                                m = o.create("div"),
                                f = o.create("div"),
                                w = o.create("div"),
                                _ = o.create("div");
                            o.set(g, "class", "message-info-key"), o.set(g, "data-slide", "out"), o.set(y, "class", "message-info-value"), o.set(m, "class", "message-info-key"), o.set(m, "data-slide", "out"), o.set(f, "class", "message-info-value"), o.set(w, "class", "message-info-key"), o.set(w, "data-slide", "out"), o.set(_, "class", "message-info-value"), g.onclick = (() => {
                                a(y), n(g)
                            }), y.onclick = (() => {
                                a(g), n(y)
                            }), m.onclick = (() => {
                                a(f), n(m)
                            }), f.onclick = (() => {
                                a(m), n(f)
                            }), w.onclick = (() => {
                                a(_), n(w)
                            }), _.onclick = (() => {
                                a(w), n(_)
                            }), g.textContent = "Sender", y.textContent = s + (s === u ? "(You)" : ""), w.textContent = "Time", _.textContent = new Date(i).toLocaleString(), m.textContent = "Read-Status", f.textContent = "true" === r ? `Read (${isNaN(c)?"N/A":new Date(c).toLocaleString()})` : "Sent", s !== u && (m.style.display = "none", f.style.display = "none");
                            if ("null" !== d) {
                                const e = o.create("div"),
                                    t = o.create("div");
                                o.set(e, "class", "message-info-key"), o.set(t, "class", "message-info-value"), e.textContent = "Media Message", t.textContent = "Click To Open Media Preview", t.style.cursor = "pointer", o.set(t, "data-media", d), a(t), t.onclick = (() => {
                                    const e = t.dataset,
                                        n = new Image;
                                    n.src = e.media, h.innerHTML = "";
                                    const a = o.create("a");
                                    h.appendChild(n), h.appendChild(a), a.style.color = "black", a.style.textDecoration = "none", a.target = "__blank", a.style.display = "block", a.textContent = "Click To Open Image In A New Tab", a.href = e.media, n.style.width = "160px", n.style.height = "100px"
                                }), h.appendChild(e), h.appendChild(t)
                            }
                            l.style.display = "block", h.appendChild(g), h.appendChild(y), h.appendChild(w), h.appendChild(_), h.appendChild(m), h.appendChild(f), console.log(t)
                        }(this)
                    }, (y = await $get(o.__chatID__)) && (y[c] || (console.log("[indexedDB]Adding new entry:", c), y[c] = {
                        message: t,
                        sender: s,
                        stamp: r,
                        read: d,
                        media: !!p || null,
                        mediaURL: p,
                        rstamp: l,
                        receiver: i
                    }, await $set(o.__chatID__, y)))
                }
                const i = o.id("__chat-with-prof");
                if (t.typing) return i.style.color = "green";
                if (i.style.color = "#000", t.fetch) {
                    console.log("FETCHED DETAILS");
                    const n = t.data,
                        a = n.messages || n,
                        s = n.updates || [];
                    if (t.full_fetch) console.log("[indexedDB]Setting Full Cache to indexedDB:", a), await $set(o.__chatID__, a);
                    else {
                        const e = await $get(o.__chatID__),
                            t = Object.assign({}, e, a);
                        await $set(o.__chatID__, t)
                    }
                    const i = t.fetched_from;
                    for (let t = 0; t < Object.keys(a).length; t++) {
                        let n;
                        const s = a[n = isNaN(i) ? t : t + i];
                        s && (s.msgid = n, await g(e, s))
                    }
                    const r = await $get(o.__chatID__);
                    for (const e of s) {
                        const t = e.id;
                        r[t].read = !0, r[t].rstamp = e.s, await $set(o.__chatID__, r), v({
                            sender: u,
                            receiver: c,
                            message: null,
                            chat_id: d,
                            seen_read: {
                                id: t
                            },
                            stamp: (new Date).getTime()
                        })
                    }
                    return
                }
                let r, l, p, h, y, m, f;
                if (t.media || t.message) {
                    if (t.sender !== u && t.receiver !== u || t.sender !== c && t.receiver !== c) throw console.log(t), new Error("Invalid Sender and recepient arguments");
                    if (!t.read && !t.rstamp && t.sender !== u) {
                        const e = {
                            receiver: u,
                            sender: t.sender,
                            chat_id: d,
                            message: null,
                            read: {
                                id: t.msgid
                            },
                            stamp: (new Date).getTime(),
                            rstamp: (new Date).getTime()
                        };
                        await v(e)
                    }
                }
                if (t.message) return r = t.message, l = t.sender, p = t.receiver, h = t.stamp, y = t.read, m = t.rstamp, s(e, r, l, p, h, f = t.msgid, y, m);
                if (t.update) {
                    const e = t.msgid,
                        n = document.querySelector(`div[data-msgid='${e}']`);
                    if (n) {
                        o.set(n, "data-read", t.update.read), o.set(n, "data-rstamp", t.update.rstamp), console.log("updating data");
                        const a = await $get(d),
                            s = Object.assign({}, a);
                        s[e].read = t.update.read, s[e].rstamp = t.update.rstamp, await $set(d, s)
                    }
                }
                if (t.media) {
                    const n = t.mediaURL;
                    l = t.sender, p = t.receiver, y = t.read, m = t.rstamp, s(e, null, l, p, h = t.stamp, f = t.msgid, y, m, n)
                }
            }
            async function y(e) {
                o.__chatID__ = d, r.innerHTML = "", r.style.display = "block";
                const t = o.create("div"),
                    n = o.create("div"),
                    a = o.create("div"),
                    s = o.create("div"),
                    i = o.create("input"),
                    l = o.create("img"),
                    h = o.create("span"),
                    g = o.create("div"),
                    y = o.create("span"),
                    m = o.create("div"),
                    f = o.create("div"),
                    w = o.create("div");
                h.id = "__chat-with-prof", o.set(g, "data-stat", "closed"), o.set(h, "class", "chat_with"), o.set(g, "class", "menu-details"), g.id = "__menubox__", o.set(y, "class", "menubox"), o.set(i, "type", "text"), o.set(i, "placeholder", "Type a Message"), o.set(t, "class", "chat_box_wrap"), o.set(n, "class", "chat_box"), o.set(a, "class", "chat_head"), o.set(s, "class", "chat_body"), o.set(i, "class", "chat_inp"), o.set(l, "class", "context"), o.set(m, "class", "img-button-holder"), o.set(w, "class", "img-button-holder"), o.set(f, "class", "img-button-holder"), o.set(i, "data-user", e), s.id = "_msg_body", g.appendChild(m), g.appendChild(w), g.appendChild(f), a.appendChild(y), a.appendChild(h), n.appendChild(a), n.appendChild(g), n.appendChild(s), n.appendChild(i), n.appendChild(l), t.appendChild(n), y.innerHTML = "&#9776;", h.textContent = e, f.textContent = "Start WebRTC Session", r.appendChild(t), m.onclick = (() => {
                    "object" == typeof _ && _.close(), p.route(`/u/${u}`)
                }), y.id = "Nzk3NzEzOD", m.textContent = "Close Conversation", w.textContent = "Add An Attachment", y.onclick = (() => {
                    if ("closed" != g.getAttribute("data-stat")) return o.set(g, "data-stat", "closed"), g.style.marginBottom = "-250px";
                    o.set(g, "data-stat", "opened"), g.style.marginBottom = "0px"
                }), f.onclick = (async () => {}), w.onclick = (() => {
                    const t = o.create("input");
                    o.set(t, "accept", "image/*"), o.set(t, "type", "file"), y.click(), t.addEventListener("change", () => {
                        const n = t.files[0],
                            a = new FileReader;
                        a.onload = (t => {
                            const s = a.result,
                                i = new Image;
                            i.src = s, i.onload = (async () => {
                                const t = await async function (e, t, n) {
                                    const a = document.createElement("canvas");
                                    if (void 0 === e.naturalWidth && void 0 === e.naturalHeight) return console.log(e, "no natural width"), null;
                                    a.width = e.naturalWidth, a.height = e.naturalHeight, a.getContext("2d").drawImage(e, 0, 0);
                                    const s = a.toDataURL(n, t / 100),
                                        i = await fetch(s);
                                    return await i.arrayBuffer()
                                }(i, 65, n.type), a = await fetch("/@/binary/", {
                                    credentials: "include",
                                    method: "post",
                                    headers: {
                                        "x-file-name": n.name
                                    },
                                    body: t
                                }), s = {
                                    media: (await a.json()).url,
                                    message: null,
                                    receiver: e,
                                    sender: u,
                                    chat_id: d,
                                    stamp: (new Date).getTime()
                                };
                                await v(s)
                            })
                        }), a.readAsDataURL(n)
                    }), t.click()
                }), i.onkeydown = async function (e) {
                    if (13 === e.keyCode && this.value.replace(/\s/g, "").length > 0) {
                        const e = (new Date).getTime(),
                            t = i.value,
                            n = {
                                sender: u,
                                receiver: c,
                                chat_id: d,
                                message: t,
                                typing: !1,
                                media: null,
                                stamp: e
                            };
                        i.value = "";
                        await v(n)
                    }
                }
            }

            function m(e, t) {
                return console.log("Settimeout func"), "chat" === p.currentFuncRoute() ? (console.log(`${p.currentFuncRoute()}->Current Route`), setTimeout(e, t)) : l("Ignoring Timeout ")
            }
            async function f() {
                let e;
                console.log(`[-] Manually Checking For Messages [Periodic Timer:${h}]`), await async function (e = o.id("_msg_body")) {
                    if ("chat" !== p.currentFuncRoute()) return l("Removed Chat Context->");
                    const t = await $get(d);
                    let n;
                    if (console.log("new template"), document.createElement("div").className = "chat_body", t) {
                        const a = Object.keys(t).length;
                        console.log("Checking For Updated Data"), n = {
                            stamp: (new Date).getTime(),
                            message: null,
                            sender: u,
                            chat_id: d,
                            receiver: c,
                            fetch_messages: !0,
                            fetch_from: a - 1
                        };
                        for (let n = 0; n < a; n++) {
                            const a = t[n];
                            a && (a.msgid = n, await g(e, a))
                        }
                        await v(n)
                    } else console.log("Fetching New"), n = {
                        stamp: (new Date).getTime(),
                        message: null,
                        sender: u,
                        chat_id: d,
                        receiver: c,
                        fetch_messages: !0
                    }, await v(n)
                }(), e = m(await f, 2e4)
            }
            h = 2e4;
            const w = `${"https:"===window.location.protocol?"wss://":"ws://"}${window.location.host}/@/messenger/`,
                _ = new WebSocket(w);
            async function v(e, t = "/@/messenger/") {
                let n;
                "object" == typeof e ? n = JSON.stringify(e) : "string" == typeof e && (n = e), _.send(n)
            }
            console.log(_), _.onmessage = (e => {
                const t = e.data;
                "pong" !== t && function (e) {
                    const t = o.id("_msg_body");
                    try {
                        const n = JSON.parse(e);
                        if (n.hasOwnProperty("error")) return console.log("prop-error", n), t.innerHTML += "<br>An error occured Please reload the page";
                        g(t, n)
                    } catch (e) {
                        console.log(e, "ERROR in parsing message"), t.innerHTML += "<br>An error occured Please reload the page"
                    }
                }(t)
            }), _.onopen = (async () => {
                console.log("Opened Socket"), y(c), await f(), o.id("_msg_body").onclick = (() => {
                        ! function () {
                            const e = o.id("Nzk3NzEzOD");
                            "opened" === o.id("__menubox__").getAttribute("data-stat") && e.click()
                        }()
                    }),
                    function e() {
                        _.readyState !== _.CLOSED && _.readyState !== _.CLOSING && _.send("ping"), console.log("keeping alive"), m(e, 3e4), s.push(void 0)
                    }()
            }), _.onclose = (() => {
                o.id("_msg_body").innerHTML = "<br>Connection to server was lost. Please Reload the page"
            })
        })(e)
    }
    async function d() {
        o.empty(i);
        const e = await p.getUser();
        e && (l(`Logged In->routing to:${e}`), p.route(`/u/${e}`));
        const n = o.create("div", {
                class: "main"
            }),
            a = o.create("button", {
                id: "login"
            });
        a.textContent = "Login";
        const r = o.create("button", {
            id: "signup"
        });
        r.textContent = "Signup";
        const c = o.create("div", {
            class: "errors-and-notices"
        });
        c.style.color = "red";
        const d = o.create("div", {
            id: "lfbox"
        });
        d.style.display = "none";
        const u = o.create("div", {
                "data-action": "/login/check",
                id: "login-form"
            }),
            h = o.create("input", {
                type: "text",
                class: "input_x",
                name: "user",
                id: "username-log",
                placeholder: "Username"
            }),
            g = o.create("input", {
                type: "password",
                id: "password-log",
                class: "input_x",
                placeholder: "Password",
                name: "password"
            }),
            y = o.create("button", {
                class: "submit-button",
                id: "login-btn"
            });
        y.textContent = "Login", u.appendChild(h), u.appendChild(g), d.appendChild(u), d.appendChild(y);
        const m = o.create("div", {
            id: "rfbox"
        });
        m.style.display = "none";
        const f = o.create("div", {
                id: "register-form",
                "data-action": "/register/check/"
            }),
            w = o.create("div", {
                id: "__errs__"
            }),
            _ = o.create("input", {
                type: "text",
                class: "input_x",
                name: "user",
                id: "username-reg",
                placeholder: "Username"
            }),
            v = o.create("input", {
                type: "password",
                class: "input_x",
                id: "password-reg",
                placeholder: "Password",
                name: "password"
            }),
            C = o.create("input", {
                type: "password",
                id: "password-reg-conf",
                class: "input_x",
                placeholder: "Confirm Password",
                name: "password"
            }),
            b = o.create("button", {
                class: "submit-button",
                id: "register-btn"
            });
        b.textContent = "Signup", f.appendChild(w), f.appendChild(_), f.appendChild(v), f.appendChild(C), m.appendChild(f), m.appendChild(b), n.appendChild(a), n.appendChild(r), n.appendChild(c), n.appendChild(d), n.appendChild(m), i.appendChild(n), a.onclick = (() => {
            login.style.backgroundColor = "#6200ee", login.style.color = "#fff", r.style.backgroundColor = "#fff", r.style.color = "#6200ee", o.id("lfbox").style.display = "block", o.id("rfbox").style.display = "none"
        }), r.onclick = (() => {
            r.style.backgroundColor = "#6200ee", r.style.color = "#fff", a.style.backgroundColor = "#fff", a.style.color = "#6200ee", o.id("rfbox").style.display = "block", o.id("lfbox").style.display = "none"
        }), String.prototype.isValid = function () {
            if (this.length > 0) return /^[0-9a-zA-Z_.-]+$/.test(this)
        };
        const k = await p.getIntegrity();
        console.log(k), b.addEventListener("click", async () => {
            const e = v.value,
                n = C.value;
            if (e !== n) return c.textContent = "Passwords Do not Match!"; {
                c.textContent = "Loading";
                const a = await fetch("/register/check/", {
                    credentials: "include",
                    headers: {
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    method: "post",
                    body: t({
                        user: _.value,
                        password: e,
                        checkpw: n,
                        integrity: k
                    })
                });
                try {
                    const e = await a.json();
                    if (403 === a.status) {
                        const t = s.register[e.error];
                        c.innerHTML = t
                    } else 200 !== a.status ? c.innerHTML = "An Error Occured..please reload the page and try again" : c.innerHTML = "Account Created. Please Login"
                } catch (e) {
                    return console.log(e), c.innerHTML = "An Error Occured..please reload the page and try again"
                }
            }
        }), y.addEventListener("click", async () => {
            c.innerHTML = "Loading";
            const e = await fetch("/login/check/", {
                credentials: "include",
                method: "post",
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                },
                body: t({
                    user: h.value,
                    password: g.value,
                    integrity: k
                })
            });
            try {
                const t = await e.json();
                if (403 === e.status) {
                    const e = s.login[t.error];
                    c.innerHTML = e
                } else 200 !== e.status ? c.innerHTML = "An Error Occured..please reload the page and try again" : (c.textContent = "Authenticated", p.route(`/u/${t.user}`))
            } catch (e) {
                return console.log(e), c.innerHTML = "An Error Occured..please reload the page and try again"
            }
        }), g.addEventListener("keydown", e => {
            const t = h;
            0 !== g.value.length && 0 !== t.value.length && 13 === e.keyCode && y.click()
        });
        const x = _,
            T = v,
            L = C;
        check_passwords = (e => {
            e.value !== T.value ? (w.style.visibility = "visible", w.innerHTML = "Passwords Do Not Match!", registerbtn.disabled = !0) : (w.style.visibility = "hidden", o.empty(w), b.disabled = !1)
        }), L.oninput = (({
            target: e
        }) => {
            check_passwords(e)
        }), L.onkeydown = (e => {
            13 !== e.keyCode || registerbtn.disabled || registerbtn.click()
        }), T.oninput = (() => {
            L.value.length > 0 && check_passwords(L)
        }), x.oninput = (({
            target: e
        }) => {
            errs.style.visibility = "hidden", o.empty(errs),
                function (e) {
                    const t = e.value;
                    t.isValid() ? t.length < 4 ? (w.style.visibility = "visible", w.innerHTML = "Username Too Short", T.disabled = !0, L.disabled = !0) : t.length > 30 ? (w.style.visibility = "visible", w.innerHTML = "Username Too Long", T.disabled = !0, L.disabled = !0) : (T.disabled = !1, L.disabled = !1) : (w.style.visibility = "visible", w.innerHTML = "Invalid Characters!", T.disabled = !0, L.disabled = !0)
                }(e)
        })
    }

    function l(e, t = "warn") {
        (0, console[t])(`[${performance.now()}]=>${e}`)
    }
    const p = new class {
        constructor() {
            this.RouteParser = (e => {
                try {
                    return new URL(e).hash.substr(1) || "/"
                } catch (e) {
                    return l(e), "/"
                }
            }), this.HERE = null, this.integrity = o.q("meta[name='integrity']").getAttribute("content"), this.prevKey = null, this.chat_id = null, this.chat_with = null, this.host = window.location.hostname, this.first_location = window.location.href, this.first_route = this.RouteParser(this.first_location)
        }
        async getCurrChat() {
            return 0 !== this.currentRoute().indexOf("/chat/") ? null : this.chat_with
        }
        async validateChat(e) {
            const n = await fetch("/api/validate-chat/", {
                    method: "post",
                    body: t({
                        chat_id: e
                    }),
                    headers: {
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    credentials: "include"
                }),
                a = await n.json();
            return !a.hasOwnProperty("error") && (this.chat_id = a.chat_id, this.chat_with = a.chat_with, !0)
        }
        async getUser() {
            if (this.HERE) return this.HERE;
            const e = await fetch("/api/getuser", {
                credentials: "include"
            });
            if (!e.ok) return null;
            const t = await e.text();
            return this.HERE = t, this.HERE
        }
        _errstatus(e) {
            switch (e) {
                case 404:
                    i.innerHTML = '\n                    <div>404:The requested URL was not found</div>\n                    <div><a href="/#/">Click To Go  Back</a></div>';
                case 500:
                    i.innerHTML = '\n                    <div>500:An error occured while processing your request</div>\n                    <div><a href="/#/">Click To Go  Back</a></div>'
            }
        }
        currentRoute() {
            return location.hash.substr(1)
        }
        currentFuncRoute() {
            return this.currentRoute().split("/")[1]
        }
        route(e) {
            if (this.RouteParser(location.href) !== e) return window.location.hash = e;
            let t;
            "" === (t = e.split("/")[1]) && (t = "/");
            const n = e.split("/");
            if (!["/", "chat", "u", "login"].includes(t)) return p._errstatus(404), l(`[app route->${e}]No Such Route`);
            this.paintPage(t, n.filter(e => n.indexOf(e) > 1))
        }
        paintPage(e, t) {
            if ({
                    "/": 0,
                    chat: 1,
                    u: 1
                } [e] !== t.length) return p._errstatus(404);
            const n = {
                "/": d,
                chat: c,
                u: r
            } [e];
            l(`Painting Page for Route:${e}`), n(t)
        }
        async getIntegrity() {
            const e = await fetch("/api/integrity/", {
                method: "post",
                body: t({
                    key: this.prevKey || this.integrity
                }),
                credentials: "include",
                headers: {
                    "content-type": "application/x-www-form-urlencoded"
                }
            });
            let n;
            try {
                n = await e.json()
            } catch (e) {
                console.warn(e)
            }
            const a = n.key;
            return this.prevKey = a, this.integrity = null, a
        }
        notifyUser(e, t) {
            let n, a, s, i, r, c, d, l, p, u, h, g, y;
            p = o.create("div", {
                class: "notification-box"
            }), h = o.create("div", {
                class: "notification-sender"
            }), g = o.create("div", {
                class: "notification-text"
            }), (d = t.hasAction) && (i = o.create("div", {
                class: "notification-action-box"
            }), (r = o.create("div", {
                class: "notification-action-button"
            })).textContent = t.actionText || "Example Button", i.appendChild(r)), n = t.body || "New Notification", g.textContent = n, a = t.messageMode, l = t.messageOnClick, g.onclick = h.onclick = "__close__" === l ? () => {
                o.empty(p), p.remove()
            } : l, h.textContent = e, a ? ((s = !!t.mediaURL) && ((y = new Image).src = "/static/attachment.svg", o.empty(g), g.appendChild(y)), c = t.chat_id, d && (r.onclick = (() => {
                this._respondToNotification(u, r, c, e, p)
            }))) : d && (r.onclick = void 0), p.appendChild(h), p.appendChild(g), d && p.appendChild(i), document.body.appendChild(p), setTimeout(() => {
                p.style.marginTop = "15px", u = setTimeout(() => {
                    p.remove()
                }, 4e3)
            }, 500)
        }
        _respondToNotification(e, t, n, a, s) {
            let i;
            var r;
            clearTimeout(e), i = o.create("input", {
                class: "notification-reply-bar"
            }), t.replaceWith(i), i.focus(), i.onkeydown = (async e => {
                if (13 === e.keyCode && i.value.replace(/\s/g, "").length > 0) {
                    const e = (new Date).getTime(),
                        t = i.value,
                        o = {
                            receiver: a,
                            message: t,
                            media: null,
                            stamp: e,
                            sender: await this.getUser(),
                            chat_id: n
                        };
                    r = o, new Promise((e, t) => {
                        let n;
                        "object" == typeof r ? n = JSON.stringify(r) : "string" == typeof r && (n = r);
                        const a = "https:" === window.location.protocol ? "wss://" : "ws://",
                            s = `${a}${window.location.host}/@/messenger/`,
                            i = new WebSocket(s);
                        i.onopen = (() => {
                            e(i.send(n))
                        })
                    }), i.value = "", s.remove()
                }
            })
        }
    };
    if (o.set(i, "curr-route", p.first_route), window.onhashchange = (() => {
            const e = window.location.hash.substr(1);
            l(`app route->${e}`, "log"), p.route(e), o.set(i, "curr-route", e)
        }), p.route(p.first_route), "function" == typeof window.Notification) {
        const t = firebase.messaging();
        try {
            console.log("Supports Notifications"), await t.requestPermission(), t.usePublicVapidKey("BGhv7XYjPBkpVoOEPbq2E19Is1ti_MYfboTDazKE0jgxPENxDqe0-U2p1OKEEgG4JH4Ycl8Wbxdv-UrrP_LcLmw"), await t.getToken();
            const n = async () => {
                const e = await t.getToken();
                console.log("Token refreshed."), console.log(e), await fetch("/@/notify/", {
                    method: "post",
                    headers: {
                        "content-type": "application/x-www-form-urlencoded"
                    },
                    body: `token=${encodeURIComponent(e)}`
                })
            };
            await n(), t.onTokenRefresh(n)
        } catch (t) {
            console.warn(t), e = !0, console.log("Permission-Denied")
        }
        "granted" === Notification.permission ? (console.log("Granted Notification Perm"), t.onMessage(async e => {
            const t = await p.getCurrChat(),
                n = e.data,
                a = n.chat_id,
                s = n.sender;
            if (t === s) return l("Not creating notification for current chat");
            const i = n.message,
                o = n.hasImage,
                r = `Reply to ${s}`;
            console.log("Creating Notification UI"), console.log("DATA:", n), p.notifyUser(s, {
                body: i,
                chat_id: a,
                mediaURL: o,
                hasAction: !0,
                actionText: r,
                messageMode: !0
            })
        })) : e = !0
    } else e = !0;
    e && p.notifyUser("Notification Error", {
        body: "We Cannot send notifications to you.This might cause messaging to slow down",
        messageOnClick: "__close__"
    })
})();