import {
    isKeyValObj
} from "./commons.js";
export class SocketHandler {
    /**
     * @param {WebSocket} ws 
     */
    constructor(url) {
        if (!new URL(url).protocol.includes("ws")) {
            throw new Error(`invalid WebSocket url:${url}`)
        }
        try {
            this._kaTimeout = null;
            this.Socket = new WebSocket(url);
            this.keepAlivePings = false;
        } catch (e) {
            throw new Error("could not create a new  WebSocket")
        }
    };
    close() {
        if (this._isAlive()) {
            this.Socket.close()
        }
    }
    set onopen(fn) {
        this.Socket.onopen = fn
    }
    set keepAlivePings(b) {
        const sendMsg = (msg = "ping") => {
            if (this.isAlive) {
                this.Socket.send(msg);
                this._kaTimeout = setTimeout(sendMsg, 20 * 1000)
            }
        };
        if (b) {
            sendMsg()
        } else {
            clearTimeout(this._kaTimeout)
        }
    }
    set onmessage(fn) {
        this.Socket.onmessage = fn
    }

    get readyState() {
        return this.Socket.readyState
    }
    _isAlive() {
        const ws = this.Socket;
        return (ws instanceof WebSocket &&
            ws.readyState !== ws.CLOSED &&
            ws.readyState !== ws.CLOSING)
    }
    get isAlive() {
        return this._isAlive()
    }
    send(msg) {
        if (this._isAlive()) {
            if (isKeyValObj(msg)) {
                return this.Socket.send(JSON.stringify(msg))
            } else {
                this.Socket.send(msg)
            }
        }
    }
}