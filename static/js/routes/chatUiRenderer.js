import {
  $,
  getUser,
  makeComponent as H,
  stampFormat,
  trace,
  _getTime,
  _random,
  dumps,
  CustomElement as messageElement,
  notifyUser,
  isKeyValObj,
  blobToArrayBuffer,
  ImgAsBlob,
  arrayBufferToBlob,
  slidein,
  slideout,
  apptSize
} from "../commons.js";
import { _closeConversation, createChatBox } from "./chatUiMisc.js";
const CACHE = {
  chatID: "",
  messageCache: {},
  USERS: {},
  lastMsgID: -1
};
/**
 * @returns {HTMLElement}
 */
const MSG_BODY = () => $.id("_msg_body");
let __pc__;
const inputBoxOnKeyDown = (h, dc) => {
  if (13 === h.keyCode) {
    const _target = h.target;
    if (_target.value.replace(/\s/g, "").length > 0) {
      const i = _target.value || $.className("chat_inp").value;
      CACHE.lastMsgID += 1;
      const _data = {
        sender: CACHE.USERS.HERE,
        receiver: CACHE.USERS.THERE,
        data: i,
        typing: !1,
        stamp: _getTime(),
        _id: CACHE.lastMsgID
      };
      sendRTCMessage(dc, _data);
      _renderSingleMessage(_data, true);
      _target.value = "";
    }
  } else
    sendRTCMessage(dc, {
      sender: CACHE.USERS.HERE,
      receiver: CACHE.USERS.THERE,
      data: null,
      typing: !0,
      stamp: _getTime()
    });
};
window.customElements.define("text-message", messageElement);
const _startFilePicker = (e, dc) => {
  const { name, size } = e;
  const type = e.type || "application/octet-stream";
  const reader = new FileReader();
  reader.onload = () =>
    sendRTCMessage(dc, reader.result, !0, {
      name,
      type,
      size
    });
  reader.readAsArrayBuffer(e);
};

function addAttachment(a) {
  const b = $.create("input", {
    type: "file"
  });
  (b.oninput = _ref => {
    const c = _ref.target;
    return _startFilePicker(c.files[0], a);
  }),
    b.click(),
    MSG_BODY().click();
}
async function createUIChanges(opts) {
  const { dataChannel: dc, app, HERE, chat, pc } = opts;
  const logoutFn = (pc, dc) => {
    return () => {
      destroy(pc, dc);
      return (location.href = "/logout");
    };
  };
  const startAddAttachment = dc => () => addAttachment(dc);
  const inponkd = dc => e => inputBoxOnKeyDown(e, dc);
  const resultsAll = $.id("results-all");
  resultsAll.textContent = "Loading a Secure Session";
  createChatBox(
    chat,
    app,
    inponkd(dc),
    startAddAttachment(dc),
    logoutFn(pc, dc)
  );
}

export const renderStart = async opts => {
  const _el = $.id("start_chat");
  if (_el) {
    _el.remove();
  }
  const { dataChannel: dc, pc, app, chat, chatID } = opts;

  dc.onmessage = _receiveMessage;
  iceStateChange(pc, dc);
  __pc__ = pc;
  const HERE = await getUser();
  const THERE = chat;
  opts.HERE = HERE;
  CACHE.USERS = {
    HERE,
    THERE
  };
  CACHE.chatID = chatID;
  await createUIChanges(opts);
  await renderPreviousMessages(chatID, dc, pc);
};
/**
 *
 * @param {RTCPeerConnection} pc
 */
function iceStateChange(pc, dc) {
  pc.oniceconnectionstatechange = e => {
    const state = pc.iceConnectionState;
    if (["closed", "disconnected", "failed"].includes(state)) {
      console.log("Connection is Dead..");
      if (dc && typeof dc.close === "function") {
        dc.close();
      }
      pc.close();
    }
  };
}

function isSender(a) {
  return a !== CACHE.USERS.THERE && (!(a !== CACHE.USERS.HERE) || void 0);
}

function _renderSingleMessage(_msg, saveToDb) {
  const {
    binary,
    data,
    name,
    read,
    receiver,
    rstamp,
    sender,
    size,
    stamp,
    type,
    typing
  } = _msg;
  let classname, el, _id;
  _id = _msg._id;
  if (read) {
    return console.log("Handle Read..");
  }
  if (typing) {
    return _startedTyping(sender);
  }
  if (!data && !binary) {
    return trace("Bad arguments");
  }
  el = new messageElement();
  if (isSender(sender)) {
    _id = CACHE.lastMsgID;
  } else {
    CACHE.lastMsgID++;
  }
  console.log(`Cached ID:${CACHE.lastMsgID}\nmsgid:${_id}`);
  if (_id !== CACHE.lastMsgID) {
    console.log("Bad IDB storage on one side");
  }
  el._id = CACHE.lastMsgID;
  if (data && !binary) {
    el.textContent = data;
  } else if (binary) {
    console.log(_msg);
    el._messagedata = data;
    const _node = document.createTextNode(
      `File:${name} Size:${apptSize(size)} type:${type}`
    );
    const i = new Image();
    el.appendChild(i);
    ImgAsBlob("/static/attachment.svg").then(src => (i.src = src));
    i.onclick = () => {
      el.click();
    };
    el.style.fontSize = "12px";
    el.appendChild(_node);
  }
  el.meta = {
    binary,
    name,
    read,
    receiver,
    rstamp,
    sender,
    size,
    stamp,
    type
  };
  const _sender = isSender(sender);
  if (typeof _sender === "undefined") {
    return console.warn("Invalid args!", _msg);
  }
  if (_sender) {
    classname = "msg_sent";
  } else {
    classname = "msg_received";
  }
  el.className = classname;
  el.onclick = e => {
    messageonClickFn(e.target);
  };
  const msgb = MSG_BODY();
  msgb.appendChild(el);
  msgb.scrollTop = msgb.scrollHeight;
  if (saveToDb) {
    return saveMessagetoDatabase(_msg);
  }
}
/**
 *
 * @param {messageElement} el
 */
function messageonClickFn(el) {
  function slideInOut(a, b) {
    slideout(a);
    slidein(b);
  }
  const __par = $.id("message-info");
  const meta = el.meta;
  $.empty(__par);
  __par.style.opacity = "1";
  const closeThis = $.create("div", {
    class: "message-close",
    events: {
      click() {
        $par_const.style.opacity = "0";
        $par_const.style.height = "0px";
        __par.style.opacity = "0";
        $.empty(__par);
      }
    }
  });
  closeThis.textContent = "Close";
  const $par_const = $.create("div", {
    style: {
      transition: "0.3s ease-in-out"
    }
  });
  __par.appendChild(closeThis);
  __par.appendChild($par_const);
  const sender_key = $.create("div", {
    class: "message-info-key",
    "data-slide": "out"
  });
  const sender_val = $.create("div", {
    class: "message-info-value"
  });
  const read_key = $.create("div", {
    class: "message-info-key",
    "data-slide": "out"
  });
  const read_val = $.create("div", {
    class: "message-info-value"
  });
  const stamp_key = $.create("div", {
    class: "message-info-key",
    "data-slide": "out"
  });
  const stamp_val = $.create("div", {
    class: "message-info-value"
  });
  sender_key.onclick = () => {
    slideInOut(sender_val, sender_key);
  };
  sender_val.onclick = () => {
    slideInOut(sender_key, sender_val);
  };
  read_key.onclick = () => {
    slideInOut(read_val, read_key);
  };
  read_val.onclick = () => {
    slideInOut(read_key, read_val);
  };
  stamp_key.onclick = () => {
    slideInOut(stamp_val, stamp_key);
  };
  stamp_val.onclick = () => {
    slideInOut(stamp_key, stamp_val);
  };
  sender_key.textContent = "Sender";
  const sender = meta.sender;
  const stamp = meta.stamp;
  const read = meta.read;
  const rstamp = meta.rstamp;
  const HERE = CACHE.USERS.HERE;
  sender_val.textContent = sender + (sender === HERE ? "(You)" : "");
  const media = meta.binary;
  stamp_key.textContent = "Time";
  stamp_val.textContent = stampFormat(stamp);
  read_key.textContent = "Read-Status";
  read_val.textContent =
    read === "true"
      ? `Read (${!isNaN(rstamp) ? stampFormat(rstamp) : "N/A"})`
      : "Sent";
  if (sender !== HERE) {
    read_key.style.display = "none";
    read_val.style.display = "none";
  }
  if (media) {
    const media_key = $.create("div"),
      media_val = $.create("div");
    $.set(media_key, "class", "message-info-key");
    $.set(media_val, "class", "message-info-value");
    media_key.textContent = "Media Message";
    media_val.textContent = "Click To Open Media Preview";
    media_val.style.cursor = "pointer";
    $.set(media_val, "data-media", media);
    slideout(media_val);
    media_val.onclick = () => {
      const val = meta;
      const img = new Image();
      img.onerror = () => {
        img.style.display = "none";
      };
      const _src = URL.createObjectURL(
        arrayBufferToBlob(el._messagedata, val.type)
      );
      img.src = _src;
      $par_const.innerHTML = "";
      const i = $.create("a");
      $par_const.appendChild(img);
      $par_const.appendChild(i);
      i.style.color = "black";
      i.style.textDecoration = "none";
      i.target = "__blank";
      i.style.display = "block";
      i.textContent = "Click To Open Media In A New Tab";
      i.href = _src;
      img.style.width = "160px";
      img.style.height = "100px";
    };
    $par_const.appendChild(media_key);
    $par_const.appendChild(media_val);
  }
  __par.style.display = "block";
  $par_const.appendChild(sender_key);
  $par_const.appendChild(sender_val);
  $par_const.appendChild(stamp_key);
  $par_const.appendChild(stamp_val);
  $par_const.appendChild(read_key);
  $par_const.appendChild(read_val);
  console.log(meta);
}
async function saveMessagetoDatabase(msg) {
  const get = window.$get,
    set = window.$set,
    chat_id = CACHE.chatID;
  const prevData = (await get(chat_id)) || {};
  const _id = msg._id;
  const _test = prevData[_id];
  if (_test) {
    return console.warn("Message Already in database!");
  }
  prevData[_id] = msg;
  return console.log("setting database") || (await set(chat_id, prevData));
}
async function renderPreviousMessages(chatID, dc, pc) {
  CACHE.lastMsgID = -1;
  /*check for messages from the other client..whoever has more messages..is probably correct..
    hard to manage integrity of messages when there is no server...*/
  console.log("Rendering Messages from IDB");
  const messages = await getChatMessages(chatID, false);
  MSG_BODY().style.visibility = "none";
  for (const i of Object.keys(messages)) {
    const _msg = messages[i];
    _renderSingleMessage(_msg, false);
  }
  MSG_BODY().style.visibility = "visible";
}
async function getChatMessages(a, b) {
  const c = await window.$get(a);
  return (
    c ||
      (b &&
        notifyUser("No IndexedDB Support Found", {
          body: "This website stores messages within your browsers database.",
          messageOnClick: "__close__"
        })),
    c || {}
  );
}

let _BINARYMODE;
let finalBuf, binarymeta;
let _BCount;

function _receiveMessage(e) {
  const dc = e.target,
    _ = e.data;
  if (_ === "__next__") {
    return;
  }

  function _binaryMessageHandler(_) {
    const dat = new Uint8ClampedArray(_);
    finalBuf.set(dat, _BCount);
    _BCount += dat.byteLength;
    if (_BCount === finalBuf.byteLength) {
      trace("Data Received!");
      _renderSingleMessage(
        { ...binarymeta, data: finalBuf.buffer, binary: true },
        true
      );
      _BCount = _BINARYMODE = finalBuf = binarymeta = undefined;
      return;
    }
    dc.send("__next__");
    return;
  }
  if (_BINARYMODE && typeof _ !== "string") {
    return _binaryMessageHandler(_);
  }
  let msg;
  try {
    msg = JSON.parse(_);
    if (msg.__close__) {
      trace("User Left the chat..");
      dc.close();
      __pc__.close();
      return;
    }
    if (parseInt(msg.dataType) === 206) {
      const { len, meta } = msg;
      trace(`expecting binary data with length ${len}`, "log");
      //ranged response..
      _BINARYMODE = true;
      _BCount = 0;
      binarymeta = meta;
      finalBuf = new Uint8ClampedArray(len);
      return;
    }
    _renderSingleMessage(msg, true);
  } catch (_) {
    console.warn(_);
    return console.log("^^^", e);
  }
}

/**
 *
 * @param {RTCDataChannel} dc
 * @param {ArrayBuffer} data
 */
async function sendBinaryData(dc, data, _m) {
  const _CHUNK_SIZE = 65e3;
  const len = data.byteLength;
  const n = parseInt(len / _CHUNK_SIZE);
  const _previousOnMessage = dc.onmessage;
  dc.onmessage = () => null;
  const DCMsg = () =>
    new Promise(resolve => {
      dc.onmessage = e => resolve(e);
    });
  CACHE.lastMsgID += 1;
  const _meta = { ..._m, sender: CACHE.USERS.HERE };
  dc.send(
    dumps({
      dataType: 206,
      len,
      _id: CACHE.lastMsgID,
      meta: _meta
    })
  );
  const uint8 = new Uint8Array(data);
  for (let i = 0; i < n; i++) {
    const _startByte = i * _CHUNK_SIZE;
    const _endByte = _startByte + _CHUNK_SIZE;
    const subarr = uint8.subarray(_startByte, _endByte);
    dc.send(subarr);
    console.log(`Sent data of ->${_endByte}`);
    const _isReady = await DCMsg();
    if (_isReady.data === "__next__") {
      continue;
    } else {
      console.log("Unknown message");
      _previousOnMessage(_isReady);
    }
  }
  const _ = len % _CHUNK_SIZE;
  if (_) {
    trace(`last ${_} byte(s)`, "log");
    dc.send(uint8.subarray(n * _CHUNK_SIZE));
  }
  dc.onmessage = _previousOnMessage;
  _renderSingleMessage({ ..._meta, binary: true, data: uint8.buffer }, true);
}
export const destroy = (pc, dc) => {
  if (dc) {
    console.log(`Destroying Session..from readystate->${dc.readyState}`);
  }
  _closeConversation(pc, dc);
};

async function sendRTCMessage(dc, msg, binary = false, _meta) {
  if (!msg) {
    return;
  }
  let data;
  if (!binary) {
    if (isKeyValObj(msg)) {
      data = dumps(msg);
    } else {
      data = msg;
    }
  } else {
    if (msg instanceof ArrayBuffer) {
      data = msg;
    } else if (msg instanceof Blob) {
      data = await blobToArrayBuffer(msg);
    } else {
      throw new Error("Invalid Binary Type");
    }
    return sendBinaryData(dc, data, _meta);
  }
  if (data) {
    return dc.send(data);
  } else {
    throw new Error("No Data To Send");
  }
}
let _t_out_typing;

function _startedTyping(a, b = $.id("__chat-with-prof")) {
  clearTimeout(_t_out_typing),
    a === CACHE.USERS.THERE &&
      b &&
      ((b.textContent = `${a} is typing...`),
      (_t_out_typing = setTimeout(() => {
        (b.textContent = a), (_t_out_typing = void 0);
      }, 700)));
}
