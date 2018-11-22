import {
    $,
    urlencode,
    makeComponent as H,
    PostRequest,
    noop,
    notifyUser,
    getUser
} from "../commons.js";
let pc;
const peerConnectionConfig = {
    'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
    }]
};
const _GlobalScope = {
    websockets: [],
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
    }), _GlobalScope.websockets = [], _GlobalScope._functions = {};
}
const startWebSocketConn = async a => {
    const b = await a._dataWebsocket(),
        c = _GlobalScope.websockets;
    return c && (c.forEach(d => {
        "function" == typeof d.close && d.close()
    }), _GlobalScope.websockets.length = 0), _GlobalScope.websockets.push(b), b
};
const _wsonmsg = async (e, pc, ws, chatW) => {
    const msg = JSON.parse(e.data);
    window.pc = pc
    if (msg.success) {
        console.log("success");
        return
    }
    if (msg.offline === true) {
        return notifyUser(`${chatW} is offline`, {
            body: " ",
            messageOnClick: "__close__"
        });
    } else {
        const role = msg.set_role;
        if (role) {
            if (role === "offer") {
                const dataChannel = pc.createDataChannel("channel", {
                    "priority": "high"
                });
                dataChannel.onmessage = e => {
                    console.log(e)
                }
                dataChannel.onopen = () => {
                    console.log("opened channel");
                    dataChannel.send(`SENT-->${JSON.stringify(dataChannel)}`)
                }
                console.log(dataChannel)
                await pc.setLocalDescription(await pc.createOffer());
                ws.send(JSON.stringify({
                    rtcData: pc.localDescription,
                    sendTo: chatW,
                }))
            }
            console.log(`RTC ROLE:${role}`)
        }
        if (msg.rtcData) {
            const rtcd = msg.rtcData;
            const candidate = rtcd.candidate;
            if (rtcd.type === "offer") {
                if (role === "offer") {
                    pc = new RTCPeerConnection(peerConnectionConfig);
                }
                await pc.setRemoteDescription(rtcd);
                await pc.setLocalDescription(await pc.createAnswer());
                await ws.send(JSON.stringify({
                    sendTo: chatW,
                    rtcData: pc.localDescription
                }))
            } else if (rtcd.type === "answer") {
                await pc.setRemoteDescription(rtcd);
            } else if (candidate) {
                await pc.addIceCandidate(candidate);
            };
        }
    }
};
const chatComponentOnRender = async (args, app) => {
    let __chatId;
    console.log("ChatOnRender")
    try {
        __chatId = args[0];
    } catch (e) {
        console.log("Err", args);
        return await app.pushStatus(500)
    }
    const data = await PostRequest(urlencode({
        chat_id: __chatId,
    }), "/api/validate-chat/");
    const resp = await data.json();
    let chatId, cWith;
    chatId = resp.chat_id;
    cWith = resp.chat_with;
    pc = new RTCPeerConnection(peerConnectionConfig);
    pc.ondatachannel = e => console.log(e)
    let ws;
    if (resp.hasOwnProperty("error")) {
        return await app.pushStatus(500);
    };
    ws = await startWebSocketConn(app);
    ws.onmessage = async e => await _wsonmsg(e, pc, ws, cWith)
    ws.send(JSON.stringify({
        sendTo: cWith,
        get_role: true
    }));
};
const comp = H("div", {
    class: "box-s"
}, null, null, chatComponentBeforeRender, chatComponentOnRender, [H("div", {
    class: "main"
}, null, null, null, null, [H("div", {
    id: "results-all"
}), H("div", {
    class: "message-info"
})])], "/chat/", chatComponentOnUnmount);
export const chatComponent = comp;