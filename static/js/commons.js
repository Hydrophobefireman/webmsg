export const trace = (e, i = "warn") => {
    console[i](`[logger]--->${e}`);
};
export const noop = () => {};
export const __random__ = (e = 15) => {
    return [...Array(e)]
        .map(() => (~~(Math.random() * 16)).toString(16))
        .join("");
};
export const dumps = e => JSON.stringify(e);
export const _random = (n = 15) => [...(Array(n))].join(".").replace(/[.]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
)
const _s = (() => {
    const a = document.createElement("style");
    a.appendChild(document.createTextNode(""));
    document.head.appendChild(a);
    return a.sheet
})();

export const sheet = _s
export const isKeyValObj = obj => obj.constructor === Object;
const _getRules = (a, b = sheet) => {
    const c = Array.from(b.rules);
    return c.filter(e => e.selectorText === a)[0];
};
/**
 *
 * @param {String} a
 * @param {(Object{}|String)} b
 * @param {Boolean} c to completely remove elements previous css and start afresh
 */
export const changeCSS = (a, b, c = !1) => {
    let d;
    const e = _getRules(a);
    if (!e) return sheet.insertRule(`${a}{${b}}`);
    if (c) return (e.style = makeCSS(b));
    d = makeObjectFromCss(b);
    for (const f of Object.keys(d)) e.style[f] = d[f];
};
export const makeObjectFromCss = a => {
    if ("object" == typeof a) return a;
    const b = a.split(";");
    return b.reduce((c, d) => {
        const e = d.split(":"),
            f = {};
        if (e.length > 1) {
            return (f[e[0].trim()] = e[1].trim()), Object.assign(c, f);
        } else {
            return c;
        }
    }, {});
};
export const PostRequest = async (
    data,
    url,
    content_type = "application/x-www-form-urlencoded"
) => {
    let _post;
    if (isKeyValObj(data) && content_type === "application/x-www-form-urlencoded") {
        _post = urlencode(data)
    } else {
        _post = data
    }
    const a = new Request(url, {
        method: "post",
        headers: {
            "content-type": content_type
        },
        credentials: "include",
        body: _post
    });
    return await fetch(a);
};

export const isFunction = f => f instanceof Function;
export const isAsync = e => "AsyncFunction" === e.constructor.name;
export const $ = {
    /**
     * @param {String} e
     * @param {Boolean} i
     * @returns {(HTMLElement|Array)}
     */
    q: (e, i = !0) => {
        const j = Array.from(document.querySelectorAll(e));
        return i ? j[0] : j;
    },

    /**
     * @param {String} e
     * @returns {HTMLElement}
     */
    id: e => document.getElementById(e),
    className: (e, i = !0) => {
        const j = Array.from(document.getElementsByClassName(e));
        return i ? j[0] : j;
    },
    /**
     * @param {String} a
     * @param {Object} b
     * @param {CSSStyleSheet=} c
     * @returns {HTMLElement}
     */
    create: (a, b, c = sheet) => {
        const d = document.createElement(a);
        if (b && "object" == typeof b) {
            const e = Object.keys(b);
            for (const f of e)
                if ("events" === f)
                    for (const g of Object.keys(b[f])) d.addEventListener(g, b[f][g]);
                else if ("style" === f && c) {
                let _;
                let rs = b[f]
                if (isKeyValObj(rs)) {
                    _ = makeCSS(rs)
                } else {
                    _ = rs
                }
                const g = _random();
                d.setAttribute("data-rtr-selector", g),
                    c.insertRule(`[data-rtr-selector='${g}']{${_}}`);
            } else d.setAttribute(f, b[f]);
        }
        return d;
    },
    /**
     * @param {HTMLElement} e
     * @param {String} i
     * @param {?} j
     * @returns {void}
     */
    set: (e, i, j) => e.setAttribute(i, j),
    /**
     * @param {HTMLElement} e
     * @returns {void}
     */
    empty: e => {
        let i;
        for (i = e.lastChild; i;) e.removeChild(i), (i = e.lastChild);
    }
};
export const getIntegrity = async () => {
    const e = $.q("meta[name='integrity']"),
        i = e.getAttribute("content"),
        j = await PostRequest(
            urlencode({
                key: i
            }),
            "/api/integrity/"
        );
    let k;
    try {
        k = await j.json();
    } catch (m) {
        console.warn(m);
    }
    const l = k.key;
    return e.setAttribute("content", l), l;
};
export const DATA = {};
/**
 * @async
 * @returns {(Boolean|String)} returns False if user is offline else the username
 */
export const getUser = async () => {
    if (DATA.HERE) return DATA.HERE;
    const b = await fetch("/api/getuser", {
        credentials: "include"
    });
    if (!b.ok) return !1;
    const c = await b.text(),
        d = c.substr(3)
    return (DATA.HERE = d), DATA.HERE;
};

/**
 *
 * @param {Object} e
 * @returns {String}
 */
export const urlencode = e => {
    return `${Object.keys(e)
      .map(i => `${encodeURIComponent(i)}=${encodeURIComponent(e[i])}`)
      .join("&")}`;
};
/**
 *
 * @param {String} element
 * @param {Object{}} attrs
 * @param {Object{}} events
 * @param {(String|null)} textContent
 * @param {Function} beforeRender
 * @param {Function} onrender
 * @param {Array} children
 * @param {String} route
 * @param {Function} onUnmount
 * @returns {Object{}}
 */
export const makeComponent = (
    element,
    attrs = {},
    events = {},
    textContent = null,
    beforeRender = () => {},
    onrender = () => {},
    children = [],
    route = null,
    onUnmount = () => {}
) => ({
    element,
    attrs,
    beforeRender,
    onrender,
    textContent,
    events,
    children,
    route,
    onUnmount
});

export const notifyUser = function (title, options = {}) {
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
    hasAction = options.hasAction;
    if (hasAction) {
        actionBox = $.create("div", {
            class: "notification-action-box"
        });
        actionBtn = $.create("div", {
            class: "notification-action-button"
        });
        actionBtn.textContent = options.actionText || "Example Button";
        actionBox.appendChild(actionBtn);
    }
    body = options.body || " ";
    content.textContent = body;
    messageMode = options.messageMode;
    messageOnClick = options.messageOnClick;
    if (messageOnClick === "__close__") {
        content.onclick = titleBox.onclick = box.onclick = () => {
            $.empty(box);
            box.remove();
        };
    } else {
        content.onclick = titleBox.onclick = messageOnClick;
    }
    titleBox.textContent = title;
    if (messageMode) {
        hasImage = !!options.mediaURL;
        if (hasImage) {
            img = new Image();
            img.src = "/static/attachment.svg";
            $.empty(content);
            content.appendChild(img);
        }
        chat_id = options.chat_id;
        if (hasAction) {
            actionBtn.onclick = () => {
                this._respondToNotification(timer, actionBtn, chat_id, title, box);
            };
        }
    } else {
        if (hasAction) {
            actionBtn.onclick = actionOnClick;
        }
    }
    box.appendChild(titleBox);
    box.appendChild(content);
    if (hasAction) {
        box.appendChild(actionBox);
    }
    document.body.appendChild(box);
    setTimeout(() => {
        box.style.marginTop = "15px";
        timer = setTimeout(() => {
            box.remove();
        }, 4000);
    }, 500);
};
/**
 *
 * @param {Object{}} a
 * @returns {String}
 */
export const makeCSS = d => {
    if ("string" == typeof d) return d;
    const e = [];
    for (const f of Object.keys(d)) e.push(`${f}:${d[f]}`);
    return e.join(";");
};

export const stampFormat = stamp => {
    try {
        return Intl.DateTimeFormat("auto", {
            hour: 'numeric',
            hour12: !0,
            minute: 'numeric',
            second: 'numeric',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }).format(new Date(stamp));
    } catch (e) {
        return new Date(stamp).toLocaleString()
    }
};
export const _getTime = () => new Date().getTime();

const tmplate = (() => {
    const b = document.createElement("template");
    const a = makeCSS({
        margin: "5px",
        width: "fit-content",
        "border-radius": "15px",
        "max-width": "45%",
        display: "flex",
        padding: "6px",
        "margin-top": "5px",
        color: "#fff",
        cursor: "pointer",
        "text-align": "left",
        "overflow-wrap": "break-word",
        "word-break": "break-word"
    });
    return b.innerHTML = `<style>:host{${a}}</style><slot></slot>`, b
})();
export class CustomElement extends HTMLElement {
    set _id(val) {
        this._id_ = val;
        this.setAttribute("data-msgid", val)
    }
    get _id() {
        return this._id_
    }
    constructor(__tmpl, meta) {
        super();
        const tmpl = __tmpl || tmplate;
        const shadowRoot = this.attachShadow({
            mode: 'open'
        });
        shadowRoot.appendChild(tmpl.content.cloneNode(true));
        this.meta = null;
        this.data = null
        this._id_ = 0;
        if (meta) {
            this.meta = meta;
        };
        this._messagedata = null;
    }
};

export const blobToArrayBuffer = blob => new Promise((resolve, reject) => {
    const reader = new FileReader;
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsArrayBuffer(blob);
});
export const arrayBufferToBlob = (buf, type) => new Blob([buf], {
    type
})
export const arrayBufferToBase64 = buffer => new Promise((resolve, _) => {
    const blob = new Blob([buffer], {
        type: 'application/octet-binary'
    });
    const reader = new FileReader();
    reader.onload = evt => {
        const dataurl = evt.target.result;
        resolve(dataurl.substr(dataurl.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
});

export const base64ToArrayBuffer = async b64 => {
    const data = await fetch(`data:application/octet-stream;base64,${b64}`);
    return await data.arrayBuffer();
};

export const base64ToBlob = async (b64, type) => arrayBufferToBlob(await base64ToArrayBuffer(b64), type);
export const ImgAsBlob = async a => {
    try {
        const b = await fetch(a),
            c = await b.blob();
        return URL.createObjectURL(c)
    } catch (b) {
        return console.warn(`An error occured while fetching:${a}.Returning ${a} back...`), a
    }
};
export function slidein(a) {
    a.style.overflow = 'hidden',
        a.style.padding = '0px',
        a.style.opacity = 0,
        a.style.height = '0',
        a.style.border = 'none',
        a.style.width = '0'
}

export function slideout(a) {
    a.style.padding = '5px',
        a.style.opacity = 1,
        a.style.height = 'auto',
        a.style.width = 'auto',
        a.style.border = '2px solid #e3e3e3',
        a.style.overflow = 'visible'
}
export const apptSize = a => {
    const b = 0 | a / 1048576;
    if (b) return `${b} MB`;
    const c = 0 | a / 1024;
    return c ? `${c} KB` : `${a} b`
};