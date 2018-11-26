import {
    $,
    urlencode,
    makeComponent as H,
    PostRequest,
    noop,
    getUser,
    _random,
    trace,
    notifyUser,
    ImgAsBlob,
} from "../commons.js";
import * as chatUI from "./chatUiRenderer.js"
let pc, ws, dataChannel, isOfferer, cWith;
const peerConnectionConfig = {
    iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
};
const _GlobalScope = {
    websockets: [],
    chatWith: "",
    _functions: {}
}
const chatComponentBeforeRender = async (args, app) => {
    let c;
    const d = await getUser();
    if (!d) return console.log("Not Logged In"), location.hash = "/";
    if (!args) return await app.pushStatus(500);
    if (1 < args.length) return console.log("Unusable Args"), c = args[0], location.hash = `/chat/${c}`;
    return 1 > args.length ? await app.pushStatus(500) : void 0
};

function chatComponentOnUnmount() {
    console.log("Unmounting");
    isOfferer = cWith = undefined;
    _GlobalScope.websockets.forEach(a => {
        "function" === typeof a.close && a.close()
    });
    for (const a of Object.keys(_GlobalScope._functions)) _GlobalScope._functions[a] = noop;
    Object.keys(_GlobalScope).forEach(a => {
        delete _GlobalScope[a]
    }), _GlobalScope.websockets = [], _GlobalScope._functions = {}, _GlobalScope.chatWith = null;
    chatUI.destroy(pc, dataChannel);
}
const startWebSocketConn = async a => {
    const b = await a._dataWebsocket();
    const c = _GlobalScope.websockets;
    return c && (c.forEach(d => {
        "function" == typeof d.close && d.close()
    }), _GlobalScope.websockets.length = 0), _GlobalScope.websockets.push(b), b
};
const validateChat = async t => {
    const a = await PostRequest(urlencode({
            chat_id: t
        }), "/api/validate-chat/"),
        e = await a.json();
    if (e.hasOwnProperty("error")) {
        return false
    } else {
        return e
    }
};

const isOnline = async b => {
    const c = await PostRequest(urlencode({
        user: b
    }), "/api/get-userstats/");
    const d = await c.json();
    return d.status === "online";
};

function sendMessage(a) {
    if (ws) {
        ws.send(a)
    } else {
        return console.log("no active connections found to a websocket")
    }
};

async function __loadingScreen() {
    console.log("TODO:Add Notification")
    const _ = cWith || _GlobalScope.chatWith;
    const _el = $.id("start_chat");
    if (_el) {
        $.empty(_el);
        _el.appendChild((() => {
            const a = $.create("div");
            return a.textContent = `waiting for ${_} to come online`, a;
        })());
        const img = $.create("img", {
            class: "loading-gif",
            src: await ImgAsBlob("/static/loading.gif"),
            style: {
                display: "block",
                margin: "auto"
            }
        });
        _el.appendChild(img)
    };
}

const pcOnicecandidate = async ({
    candidate
}, c) => {
    if (candidate) {
        await sendMessage({
            sendTo: c,
            rtcData: {
                candidate
            }
        })
    }
};

function startChatSession() {
    __loadingScreen()
    sendMessage("ping");
    sendMessage({
        sendTo: cWith,
        isOfferer: !!isOfferer
    });
}

function getUIOpts() {
    if (dataChannel && pc && _GlobalScope.chatWith) {
        return {
            dataChannel,
            pc,
            chat: _GlobalScope.chatWith,
            app: _GlobalScope.__app,
            chatID: _GlobalScope.__chatID
        }
    }
}

function __startSessionPing(dc) {
    const _msg = dc.data;
    if (_msg === "__ping__") {
        document.title = `WebMsg ${_GlobalScope.chatWith ? `Chat With - ${_GlobalScope.chatWith}` : ""}`
        chatUI.renderStart(getUIOpts())
    }
};
async function startRTCMaybe(start) {
    if (start) {
        //TODO fix firefox bug
        pc = new RTCPeerConnection(peerConnectionConfig);
        pc.onicecandidate = e => pcOnicecandidate(e, cWith)
        dataChannel = pc.createDataChannel(_random())
        console.log("new Data Channel", dataChannel)
        dataChannel.onmessage = e => __startSessionPing(e);
        dataChannel.onclose = dataChannel.onerror = () => {
            pc = dataChannel = isOfferer = undefined;
            console.log("data channel closed");
            createWebRTCRequest();
        }
        const x = await pc.createOffer();
        await pc.setLocalDescription(x);
        sendMessage({
            rtcData: pc.localDescription,
            sendTo: cWith
        });
    };
    return
}

async function parseRTCData(data, c) {
    const {
        rtcData,
        sendTo: chat
    } = data;
    if (c !== chat) {
        /* TODO add notification using commons.notifyUser
         */
        trace(c, chat);
        trace("Multiple RTC Connections Not Supported on the Same Page")
    };
    if (rtcData.type === "offer") {
        if (typeof pc === "undefined") {
            pc = new RTCPeerConnection(peerConnectionConfig);
            pc.onicecandidate = e => pcOnicecandidate(e, c)
            pc.ondatachannel = x => {
                dataChannel = x.channel;
                dataChannel.onclose = dataChannel.onerror = e => {
                    pc = dataChannel = isOfferer = undefined;
                    console.log("datachannel Closed");
                    createWebRTCRequest();
                }
                dataChannel.send("__ping__");
                console.log("Created a Data Channel", x)
                chatUI.renderStart(getUIOpts())
            }
        };
        await pc.setRemoteDescription(rtcData)
        await pc.setLocalDescription(await pc.createAnswer())
        await sendMessage({
            rtcData: pc.localDescription,
            sendTo: c
        });
    } else if (rtcData.type === "answer") {
        console.log("-->", pc)
        await pc.setRemoteDescription(rtcData)
    } else if (rtcData.candidate) {
        await pc.addIceCandidate(rtcData.candidate)
    }
};
const handleWebsocketMessage = async (e, cWith) => {
    const _ = e.data;
    if (_ === "pong") {
        return
    };
    if (_ === "ping") {
        return sendMessage("ping")
    };
    const msg = JSON.parse(_);
    const {
        _status,
        get_status,
        checkOfferer,
        restart,
        rtcData,
        sendTo,
        set_role
    } = msg;
    cWith = cWith || sendTo || _GlobalScope.chatWith
    if (checkOfferer) {
        return sendMessage({
            sendTo: cWith,
            isOfferer: !!isOfferer
        })
    } else if (set_role && typeof isOfferer !== "boolean") {
        isOfferer = set_role
        return await startRTCMaybe(isOfferer)
    } else if (rtcData) {
        await parseRTCData(msg, cWith)
    } else if (_status) {
        return sendMessage({
            sendTo: cWith,
            _set_status: true,
            RB: msg.RB,
            dataChannel: (typeof dataChannel !== "undefined")
        });
    } else if (restart) {
        if (pc && dataChannel && dataChannel.readyState === "open") {
            dataChannel.onclose = () => {
                trace("closing data channel", "log")
            }
            dataChannel.close();
            pc.close();
            pc = dataChannel = isOfferer = undefined;
        };
        pc = dataChannel = isOfferer = undefined;
        isOfferer = undefined
        startChatSession();
    } else if (get_status) {
        if (msg.isOn && sendTo === _GlobalScope.chatWith) {
            sendMessage({
                requestRestart: true,
                sendTo
            })
        } else {
            notifyUser(`Requesting ${sendTo} for a chat session`, {
                body: " ",
                messageOnClick: "__close__"
            });
            PostRequest({
                user: _GlobalScope.chatWith,
            }, "/api/request-chat/")
        }
    }
};

function createWebRTCRequest() {
    /*
    user is online..this means that there is a possibility that
    we reloaded our page..which means we were previously in a session
     */
    trace("Attempting to start a webrtc connection...", "log");
    const sendTo = _GlobalScope.chatWith;
    createStartChatComponent(sendTo, _GlobalScope.__app);
    __loadingScreen()
    sendMessage({
        _get_status: true,
        sendTo
    })

}

const chatComponentOnRender = async (args, app) => {
    const chatID = args[0];
    _GlobalScope.__chatID = chatID
    const validChat = await validateChat(chatID);
    if (!validChat) {
        return app.pushStatus(500, "the chat id you provided is invalid. please try again")
    };
    cWith = validChat.chat_with;
    _GlobalScope.__app = app
    _GlobalScope.chatWith = cWith
    ws = await startWebSocketConn(app);
    ws.onmessage = handleWebsocketMessage;
    const userIsOnline = await isOnline(_GlobalScope.chatWith);
    console.log(`${cWith} is Online-->:${userIsOnline}`)
    //pc is not defined right now..which means we can safely request a connection
    if (!userIsOnline) {
        await createStartChatComponent(_GlobalScope.chatWith, app);
    } else {
        createWebRTCRequest();
    }
};

function createStartChatComponent(e, f) {
    const g = $.id("main-chat-box"),
        h = H("div", {
            id: "start_chat",
            style: {
                height: "20%",
                "overflow-wrap": "break-word",
                "background-color": "#fff",
                width: "40%",
                display: "block",
                position: "absolute",
                margin: "auto",
                top: "0",
                left: "0",
                right: "0",
                bottom: "0",
                border: "2px solid #e3e3e3",
                "border-radius": "15px",
                "box-shadow": "2px 2px 2px 2px #e3e3f0",
                "text-align": "center",
                "flex-wrap": "wrap",
                "align-items": "center",
                padding: "8px",
                "justify-content": "center"
            }
        }, null, null, null, () => {
            $.id("start_chat").style.height = "fit-content"
        }, [H("div", {
            style: {
                "font-weight": "bold"
            }
        }, null, `Start Chat Session with ${e}`), H("div", null, null, "No ongoing chat session detected. Press the button to start a session"), H("button", {
            style: {
                "border-radius": "5px",
                height: "auto"
            },
            class: "resbtn"
        }, {
            click: startChatSession
        }, "Start")]);
    f.render(h, g)
}

const comp = H("div", {
        id: "main-chat-box",
        class: "box-s"
    },
    null, null,
    chatComponentBeforeRender,
    chatComponentOnRender,
    [H("div", {
        class: "main"
    }, null, null, null, null, [H("div", {
        id: "results-all"
    }), H("div", {
        class: "message-info",
        id: "message-info"
    })])], "/chat/", chatComponentOnUnmount);


export const chatComponent = comp;