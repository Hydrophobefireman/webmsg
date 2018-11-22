import {
    $,
    _random,
    isAsync,
    sheet,
    isFunction
} from "./commons.js"

const backEl = {
    element: "a",
    attrs: {
        href: "/#/",
        style: {
            display: "block",
            color: "#000"
        }
    },
    events: {
        click(b) {
            b.preventDefault(), location.hash = "/"
        }
    },
    textContent: "Click Here to Go Back",
    children: []
};
const __cssrule = {
    "display": "block",
    "text-align": "center",
    "font-family": "sans-serif",
    "padding": "8px",
    "margin": "auto",
    "font-weight": "bold"
};
export class Router {
    constructor(root = $.id("app-root") || $.q("body")) {
        this.root = root, this.unMountFn = () => {};
        this.routeMap = {};
        this.__socket = null;
        this.statusHandler = {
            404: {
                element: "div",
                attrs: {
                    style: __cssrule,
                },
                textContent: "The Page you are requesting was not found",
                children: [backEl]
            },
            500: {
                element: "div",
                attrs: {
                    style: __cssrule
                },
                textContent: "An Error Occured while trying to process your request",
                children: [backEl]
            }
        };
        this.routes = [];
        this.routeParser = f => {
            let g, h;
            if ("#" === f[0]) g = f.substr(1);
            else try {
                h = new URL(f), g = h.hash.substr(1)
            } catch (i) {
                g = "/", console.log(i)
            }
            return 0 === g.length ? "/" : g
        };
        window.onhashchange = () => {
            this.routeChange()
        }
    }
    load(hash) {
        window.location.href = `${window.location.protocol}//${window.location.host}/#/${hash}`;
    };
    _dataWebsocket(url = "/_/data/") {
        return new Promise(resolve => {
            if (this.__socket &&
                this.__socket.readyState !== this.__socket.CLOSED &&
                this.__socket.readyState !== this.__socket.CLOSING) {
                resolve(this.__socket)
            } else {
                const c = "https:" === window.location.protocol ? "wss://" : "ws://";
                const d = `${c}${window.location.host}${url}`;
                const e = new WebSocket(d);
                this.__socket = e;
                e.onopen = () => {
                    resolve(e)
                };
            }
        });
    }
    startLoad() {
        this.routeChange()
    }
    pushStatus(a) {
        const b = this.statusHandler[a];
        return b ? this.render(this.statusHandler[a], this.root, !0) : this.render(this.statusHandler[404])
    }
    isValidRoute(a) {
        if (this.routes.includes(a)) return {
            res: !0,
            args: null,
            _fRoute: a
        };
        try {
            const b = a.split("/").filter(d => d),
                c = `/${b[0]}/`;
            return this.routes.includes(c) ? {
                res: !0,
                args: b.slice(1),
                _fRoute: c
            } : {
                res: !1
            }
        } catch (b) {
            return console.log(b), {
                res: !1
            }
        }
    }
    routeChange() {
        const route = this.routeParser(location.href);
        const {
            res,
            args,
            _fRoute
        } = this.isValidRoute(route);
        if (!res) {
            this.render(this.statusHandler["404"], this.root, true, args)
        } else {
            console.log("rendering");
            this.render(this.routeMap[_fRoute], this.root, true, args)
        }
    };
    /**
     * 
     * @param {Object} obj 
     * @param {HTMLElement} parent 
     * @param {Boolean} toEmpty 
     * @param {Object} routeArgs 
     * @returns {HTMLElement}
     */
    async render(obj, parent, toEmpty = false, routeArgs = null) {
        const {
            element,
            attrs,
            beforeRender,
            onrender,
            textContent,
            onUnmount,
            events,
            children,
            isRoute
        } = obj;
        if (isRoute) {
            this.unMountFn();
        };
        if (isFunction(beforeRender)) {
            if (isAsync(beforeRender)) {
                await beforeRender(routeArgs, this)
            } else {
                beforeRender(routeArgs, this);
            }
        };
        //attrs["data-rtr-id"] = _random();
        const el = $.create(element, attrs, sheet);
        if (textContent) {
            el.textContent = textContent;
        };
        for (const b of Object.keys(events || {})) {
            el.addEventListener(b, events[b])
        };
        for (const c of (children || [])) {
            this.render(c, el)
        };
        if (toEmpty) {
            $.empty(parent);
        };
        parent.appendChild(el);
        if (isRoute) {
            this.unMountFn = onUnmount || (() => {});
        }
        if (isFunction(onrender)) {
            if (isAsync(onrender)) {
                await onrender(routeArgs, this)
            } else {
                onrender(routeArgs, this)
            }
        };
        return el;
    }
    registerRoute(obj, isStatus = false) {
        /*** 
          obj-->{route:String,onrender:function,
           element:HTMLElement,attrs:{},textContent:"",events:{event:handler},children:[]}
                   
        ***/
        if (!obj.route || !obj.element || obj.route[0] !== "/") {
            throw new Error("invalid values")
        }
        if (isStatus) {
            const code = obj.status;
            this.statusHandler[code] = obj;
        } else {
            this.routes.push(obj.route);
            const {
                attrs,
                beforeRender,
                children,
                element,
                events,
                hasRouteArgs,
                onUnmount,
                onrender,
                route,
                textContent
            } = obj;
            return this.routeMap[route] = {
                element,
                beforeRender,
                onrender,
                hasRouteArgs,
                attrs,
                textContent,
                events,
                children,
                onUnmount,
                isRoute: true
            };
        }
    };

};