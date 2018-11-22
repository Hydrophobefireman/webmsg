import {
    $,
    urlencode,
    makeComponent as H,
    PostRequest,
    noop,
    dumps,
    notifyUser,
    isKeyValObj,
    getUser,
} from "../commons.js";
import {
    Router
} from "../rtr.js"
let pc;
let ws, localConnection, dataChannel;
let isOfferer, cWith;
const peerConnectionConfig = {
    iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
};
const _GlobalScope = {
    websockets: [],
    chatWith: null,
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
    _GlobalScope.websockets.forEach(a => {
        "function" === typeof a.close && a.close()
    });
    for (const a of Object.keys(_GlobalScope._functions)) _GlobalScope._functions[a] = noop;
    Object.keys(_GlobalScope).forEach(a => {
        delete _GlobalScope[a]
    }), _GlobalScope.websockets = [], _GlobalScope._functions = {}, _GlobalScope.chatWith = null;
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
    return d.status === "online"
};
/**
 * 
 * @param {String} cWith 
 * @param {Router} app 
 */
function sendMessage(a) {
    if (ws instanceof WebSocket) {
        if (typeof a === "string") {
            ws.send(a)
        } else if (isKeyValObj(a)) {
            ws.send(dumps(a))
        }
    }
};

function startChatSession() {
    const _el = $.id("start_chat");
    if (_el) {
        $.empty(_el);
        _el.remove()
    }
    sendMessage("ping");
    sendMessage({
        sendTo: cWith,
        isOfferer: !!isOfferer
    });
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

function webRTCSessionRenderer(message) {
    const data = message.data;
    document.body.innerHTML += `<div>Message From:${_GlobalScope.chatWith}->${data}</div>`
}

function _startActualChat(dc) {
    const _msg = dc.data;
    if (_msg === "__ping__") {
        dataChannel.onmessage = webRTCSessionRenderer
    }
};
async function startRTCMaybe(start) {
    if (start) {
        //TODO fix firefox bug
        pc = new RTCPeerConnection(peerConnectionConfig);
        pc.onicecandidate = e => pcOnicecandidate(e, cWith)
        dataChannel = pc.createDataChannel(+new Date())
        console.log("new Data Channel", dataChannel)
        dataChannel.onmessage = e => _startActualChat(e)
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
    console.log(data)
    const {
        rtcData,
        sendTo: chat
    } = data;
    if (c !== chat) {
        /* TODO add notification using commons.notifyUser
         */
        console.log(c, chat)
        //throw new Error("Multiple RTC Connections Not Supported on the Same Page")
    };
    if (rtcData.type === "offer") {
        if (typeof pc === "undefined") {
            pc = new RTCPeerConnection(peerConnectionConfig);
            pc.onicecandidate = e => pcOnicecandidate(e, c)
            pc.ondatachannel = x => {
                dataChannel = x.channel;
                dataChannel.onmessage = webRTCSessionRenderer;
                dataChannel.send("__ping__")
                console.log("Created a Data Channel", x)
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
    console.log(msg)
    const {
        checkOfferer,
        set_role,
        rtcData,
        sendTo
    } = msg;
    cWith = cWith || sendTo
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
    }
};

function startWebRTCRequest() {
    console.log("Attempting to start a webrtc connection...");
    startChatSession()
}
/**
 * 
 * @param {Object} args 
 * @param {Router} app 
 */
const chatComponentOnRender = async (args, app) => {
    const chatID = args[0];
    const validChat = await validateChat(chatID);
    if (!validChat) {
        return app.pushStatus(500)
    };
    cWith = validChat.chat_with;
    _GlobalScope.chatWith = cWith
    ws = await startWebSocketConn(app);
    ws.onmessage = handleWebsocketMessage
    const userIsOnline = await isOnline(cWith);
    console.log(userIsOnline)
    //pc is not defined right now..which means we can safely request a connection
    if (!userIsOnline) {
        await createStartChatComponent(cWith, app);
    } else {
        await startWebRTCRequest()
    }
};
const comp = H("div", {
        id: "main-chat-box",
        class: "box-s"
    }, null, null,
    chatComponentBeforeRender,
    chatComponentOnRender,
    [H("div", {
        class: "main"
    }, null, null, null, null, [H("div", {
        id: "results-all"
    }), H("div", {
        class: "message-info"
    })])], "/chat/", chatComponentOnUnmount);

function createStartChatComponent(a, b) {
    const c = $.id("main-chat-box"),
        d = H("div", {
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
        }, null, null, null, null, [H("div", {
                style: {
                    "font-weight": "bold"
                }
            }, null, `Start Chat Session with ${a}`),
            H("div", null, null,
                "No ongoing chat session detected. Press the button to start a session"),
            H("button", {
                style: {
                    "border-radius": "5px"
                },
                class: "resbtn"
            }, {
                click: startChatSession
            }, "Start")
        ]);
    b.render(d, c)
}
export const chatComponent = comp;