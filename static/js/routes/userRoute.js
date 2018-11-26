import {
    makeComponent as H,
    getUser,
    getIntegrity,
    urlencode,
    $,
    PostRequest,
} from "../commons.js";

function paintPageResults(b) {
    const c = b.users,
        d = $.id("results-all");
    d.style.display = "block", $.empty(d);
    const e = document.createElement("div");
    if (e.textContent = "Search Results", d.appendChild(e), 0 === c.length) {
        return e.innerHTML = "No Results Found";
    }
    $.empty(d);
    for (const f of c) {
        const g = $.create("a", {
                style: {
                    "text-decoration": "none",
                    color: "#000",
                    display: "block"
                },
                "data-user": f.user,
                "title": f.user,
                "data-chat_id": f.chat_id
            }),
            h = $.create("button");
        h.textContent = f.user;
        g.appendChild(h);
        g.href = `/#/chat/${f.chat_id}`;
        h.className = "resbtn";
        d.appendChild(g);
    }
}
const userComponentBeforeRender = async (args, app) => {
    let arg;
    if (args.length > 1) {
        console.log("Unusable args");
        return location.hash = `/u/${args[0]}`
    }
    const user = await getUser();
    if (!user) {
        console.log("Not Logged In");
        return location.hash = "/";
    }
    if (args.length === 0) {
        return location.hash = `/u/${user}`;
    }
    arg = args[0];
    if (user !== arg) {
        return location.hash = location.hash.replace(arg, user)
    };
    const root = app.root;
    $.empty(root);
    root.textContent = "Loading";

};
const userComponentOnRender = async (args, app) => {
    document.title = `${args[0]} - WebMsg`;
    const d = await PostRequest(`user=${encodeURIComponent((await getUser()))}`, "/api/chat_ids/");
    const e = await d.json();
    const f = $.id("prev-chats");
    if (f) {
        f.innerHTML = "<div>Your Previous Chats</div>";
    } else {
        return
    }

    const g = e.previous_chats;
    if (0 === g.length) {
        return f.innerHTML = "No previous chats Found";
    }
    for (const h of g) {
        const j = $.create("div", {
                "data-user": h.user,
                "title": h.user,
                "data-chat_id": h.chat_id
            }),
            k = $.create("button", {
                class: "resbtn"
            });
        k.textContent = h.user;
        j.appendChild(k);
        k.onclick = () => {
            location.href = `${window.location.protocol}//${location.host}/#/chat/${h.chat_id}`
        };
        f.appendChild(j)
    }
    await app._dataWebsocket()
};
const searchBoxComponent = H("div",
    null, null, null, null, null,
    [H("div", {
        id: "messages",
        style: {
            height: "20px",
            color: "red",
            visibility: "hidden"
        },
    }), H("input", {
        id: "users",
        class: "input_n",
        placeholder: "Search for a User"
    }, {
        keydown(a) {
            13 === a.keyCode && $.id("sbm").click()
        }
    }), H("button", {
        id: "sbm",
        class: "submit-button"
    }, {
        async click() {
            const a = $.id("users"),
                b = $.id("messages");
            if (b.style.visibility = "hidden", 0 !== a.value.length) {
                const c = $.id("resbox-details"),
                    d = $.id("loading-gif");
                d.style.display = "inline";
                c.style.display = "block";
                const f = await fetch(`/api/user-search/tokens/${await getIntegrity()}`, {
                        method: "get",
                        credentials: "include"
                    }),
                    g = await f.text(),
                    h = await PostRequest(urlencode({
                        token: g,
                        user: a.value
                    }), "/api/users/");
                d.style.display = "none";
                c.style.display = "none";
                try {
                    const i = await h.json();
                    return paintPageResults(i)
                } catch (i) {
                    b.style.visibility = "visible";
                    b.innerHTML = "An error occured on our end..please try again"
                    return console.warn(i)
                }
            }
        }
    }, "Search"), H("div", {
        id: "errmsgs"
    })]);
const resultsComponent = H("div", {
    class: "results",
    id: "res"
}, null, null, null, null, [
    H("div", {
            id: "resbox-details",
            style: {
                "margin-top": "20px"
            },
        }, null, null, null, null, [
            H("img", {
                id: "loading-gif",
                class: "loading-gif",
                src: "/static/loading.gif"
            })
        ]

    )
])
export const userComponent = H("div", {
        class: "box-s"
    },
    null, null,
    userComponentBeforeRender,
    userComponentOnRender,
    [H("div", {
        class: "main"
    }, null, null, null, null, [
        searchBoxComponent,
        resultsComponent,
        H("div", {
            id: "results-all"
        }),
        H("div", {
            id: 'prev-chats'
        })
    ])], "/u/")