(async()=>{(new Image).src="/static/attachment.svg",(new Image).src="/static/close.svg",(new Image).src="/static/home.svg";const e={q:(e,t=!0)=>{const a=Array.from(document.querySelectorAll(e));return t?a[0]:a},id:e=>document.getElementById(e),className:(e,t=!0)=>{const a=Array.from(document.getElementsByClassName(e));return t?a[0]:a},create:e=>document.createElement(e),set:(e,t,a)=>e.setAttribute(t,a)},t=e.q("meta[name='chat_id']").content,a=e.q("meta[name='user_details']"),s=a.getAttribute("data-this"),n=a.getAttribute("data-that"),i=e.id("results-all");let o,c,d;async function l(a,i){async function o(t,a,n,i,o,c,d,l,r=null){let p;const h=e.create("div");if(n===s?(p="msg_sent",h.style.marginLeft="auto"):(p="msg_recieved",h.style.marginRight="auto"),e.set(h,"class",`msg ${p}`),r){e.set(h,"data-media",r);const t=new Image;t.src="/static/attachment.svg",h.appendChild(t),h.style.fontSize="12px",h.appendChild+="Media Message"}else e.set(h,"data-media",null),h.textContent=a;let u;e.set(h,"data-sender",n),e.set(h,"data-receiver",i),e.set(h,"data-stamp",o),e.set(h,"data-msgid",c),e.set(h,"data-read",d),e.set(h,"data-rstamp",l),t.appendChild(h),t.scrollTop=t.scrollHeight,h.onclick=function(){!function(t){const a=t.dataset,n=a.sender,i=parseInt(a.stamp),o=a.read,c=parseInt(a.rstamp),d=a.media,l=e.id("message-info");l.innerHTML="",l.style.opacity="1";const r=e.create("div");e.set(r,"class","message-close"),r.textContent="Close";const p=e.create("div");p.style.transition="0.3s ease-in-out",l.appendChild(r),l.appendChild(p),r.onclick=(()=>{p.style.opacity="0",p.style.height="0px",l.style.opacity="0",l.innerHTML=""});const h=e.create("div"),u=e.create("div"),y=e.create("div"),f=e.create("div"),w=e.create("div"),_=e.create("div");e.set(h,"class","message-info-key"),e.set(h,"data-slide","out"),e.set(u,"class","message-info-value"),e.set(y,"class","message-info-key"),e.set(y,"data-slide","out"),e.set(f,"class","message-info-value"),e.set(w,"class","message-info-key"),e.set(w,"data-slide","out"),e.set(_,"class","message-info-value"),h.onclick=(()=>{m(u),g(h)}),u.onclick=(()=>{m(h),g(u)}),y.onclick=(()=>{m(f),g(y)}),f.onclick=(()=>{m(y),g(f)}),w.onclick=(()=>{m(_),g(w)}),_.onclick=(()=>{m(w),g(_)}),h.textContent="Sender",u.textContent=n+(n===s?"(You)":""),w.textContent="Time",_.textContent=new Date(i).toLocaleString(),y.textContent="Read-Status",f.textContent="true"===o?`Read (${isNaN(c)?"N/A":new Date(c).toLocaleString()})`:"Sent",n!==s&&(y.style.display="none",f.style.display="none");if("null"!==d){const t=e.create("div"),a=e.create("div");e.set(t,"class","message-info-key"),e.set(a,"class","message-info-value"),t.textContent="Media Message",a.textContent="Click To Open Media Preview",a.style.cursor="pointer",e.set(a,"data-media",d),m(a),a.onclick=(()=>{const t=a.dataset,s=new Image;s.src=t.media,p.innerHTML="";const n=e.create("a");p.appendChild(s),p.appendChild(n),n.style.color="black",n.style.textDecoration="none",n.target="__blank",n.style.display="block",n.textContent="Click To Open Image In A New Tab",n.href=t.media,s.style.width="160px",s.style.height="100px"}),p.appendChild(t),p.appendChild(a)}l.style.display="block",p.appendChild(h),p.appendChild(u),p.appendChild(w),p.appendChild(_),p.appendChild(y),p.appendChild(f),console.log(a)}(this)},(u=await $get(e.__chatID__))&&(u[c]||(console.log("[indexedDB]Adding new entry:",c),u[c]={message:a,sender:n,stamp:o,read:d,media:!!r||null,mediaURL:r,rstamp:l,receiver:i},await $set(e.__chatID__,u)))}const c=e.id("__chat-with-prof");if(i.typing)return c.style.color="green";if(c.style.color="#000",i.fetch){console.log("FETCHED DETAILS");const t=i.data;if(i.full_fetch)console.log("[indexedDB]Setting Full Cache to indexedDB:",t),await $set(e.__chatID__,t);else{const a=await $get(e.__chatID__),s=Object.assign({},a,t);await $set(e.__chatID__,s)}const s=i.fetched_from;for(let e=0;e<Object.keys(t).length;e++){let n;const i=t[n=isNaN(s)?e:e+s];i&&(i.msgid=n,l(a,i))}return}let d,r,p,h,u,y,w;if(i.media||i.message){if(i.sender!==s&&i.receiver!==s||i.sender!==n&&i.receiver!==n)throw console.log(i),new Error("Invalid Sender and recepient arguments");if(!i.read&&!i.rstamp&&i.sender!==s){const e={receiver:i.sender,sender:s,chat_id:t,message:null,read:{id:i.msgid},stamp:(new Date).getTime(),rstamp:(new Date).getTime()};await f(e)}}if(i.message)return d=i.message,r=i.sender,p=i.receiver,h=i.stamp,u=i.read,y=i.rstamp,o(a,d,r,p,h,w=i.msgid,u,y);if(i.update){const a=i.msgid,s=document.querySelector(`div[data-msgid='${a}']`);e.set(s,"data-read",i.update.read),e.set(s,"data-rstamp",i.update.rstamp),console.log("updating data");const n=await $get(t),o=Object.assign({},n);o[a].read=i.update.read,o[a].rstamp=i.update.rstamp,await $set(t,o)}if(i.media){const e=i.mediaURL;r=i.sender,p=i.receiver,u=i.read,y=i.rstamp,o(a,null,r,p,h=i.stamp,w=i.msgid,u,y,e)}}async function r(a){e.__chatID__=t,i.innerHTML="",i.style.display="block";const o=e.create("div"),c=e.create("div"),d=e.create("div"),l=e.create("div"),r=e.create("input"),p=e.create("img"),g=e.create("span"),m=e.create("div"),h=e.create("span"),u=e.create("div"),y=e.create("div");g.id="__chat-with-prof",e.set(m,"data-stat","closed"),e.set(g,"class","chat_with"),e.set(m,"class","menu-details"),e.set(h,"id","__menubox__"),e.set(h,"class","menubox"),e.set(r,"type","text"),e.set(r,"placeholder","Type a Message"),e.set(o,"class","chat_box_wrap"),e.set(c,"class","chat_box"),e.set(d,"class","chat_head"),e.set(l,"class","chat_body"),e.set(r,"class","chat_inp"),e.set(p,"class","context"),e.set(u,"class","img-button-holder"),e.set(y,"class","img-button-holder"),e.set(r,"data-user",a),l.id="_msg_body",m.appendChild(u),m.appendChild(y),d.appendChild(h),d.appendChild(g),c.appendChild(d),c.appendChild(m),c.appendChild(l),c.appendChild(r),c.appendChild(p),o.appendChild(c),h.innerHTML="&#9776;",g.textContent=a,i.appendChild(o),u.onclick=(()=>{window.location=`/u/${s}`}),h.id="Nzk3NzEzOD",u.textContent="Close Conversation",y.textContent="Add An Attachment",h.onclick=(()=>{if("closed"!=m.getAttribute("data-stat"))return e.set(m,"data-stat","closed"),m.style.marginBottom="-250px";e.set(m,"data-stat","opened"),m.style.marginBottom="0px"}),y.onclick=(()=>{const n=e.create("input");e.set(n,"accept","image/*"),e.set(n,"type","file"),h.click(),n.addEventListener("change",()=>{const e=n.files[0],i=new FileReader;i.onload=(n=>{const o=i.result,c=new Image;c.src=o,c.onload=(async()=>{const n=await async function(e,t,a){const s=document.createElement("canvas");if(void 0===e.naturalWidth&&void 0===e.naturalHeight)return console.log(e,"no natural width"),null;s.width=e.naturalWidth,s.height=e.naturalHeight,s.getContext("2d").drawImage(e,0,0);const n=s.toDataURL(a,t/100),i=await fetch(n);return await i.arrayBuffer()}(c,65,e.type),i=await fetch("/@/binary/",{credentials:"include",method:"post",headers:{"x-file-name":e.name},body:n}),o={media:(await i.json()).url,message:null,receiver:a,sender:s,chat_id:t,stamp:(new Date).getTime()};await f(o)})}),i.readAsDataURL(e)}),n.click()}),r.onkeydown=async function(e){if(13===e.keyCode&&this.value.replace(/\s/g,"").length>0){const e=(new Date).getTime(),a=r.value,i={sender:s,receiver:n,chat_id:t,message:a,typing:!1,media:null,stamp:e};r.value="";await f(i)}}}if(d=1e4,"function"==typeof window.Notification){try{console.log("Supports Notifications"),messaging=firebase.messaging(),await messaging.requestPermission(),messaging.usePublicVapidKey("BGhv7XYjPBkpVoOEPbq2E19Is1ti_MYfboTDazKE0jgxPENxDqe0-U2p1OKEEgG4JH4Ycl8Wbxdv-UrrP_LcLmw"),await messaging.getToken();const e=async()=>{const e=await messaging.getToken();console.log("Token refreshed."),console.log(e),await fetch("/@/notify/",{method:"post",headers:{"content-type":"application/x-www-form-urlencoded"},body:`token=${encodeURIComponent(e)}`})};await e(),messaging.onTokenRefresh(e)}catch(e){c=!0,console.log("Permission-Denied")}o=(t=>{const a=e.create("div"),n=e.create("div"),i=e.create("div"),o=e.create("div"),c=e.create("span"),d=e.create("input"),l=t.sender,r=t.message,p=t.hasImage,g=t.chat_id;if(e.set(d,"class","notification-reply-bar"),e.set(a,"class","notification-box"),e.set(n,"class","notification-sender"),e.set(i,"class","notification-text"),e.set(o,"class","notification-action-box"),e.set(c,"class","notification-action-button"),a.appendChild(n),a.appendChild(i),a.appendChild(o),o.appendChild(c),n.textContent=l,c.textContent=`Reply To ${l}`,p){const e=new Image;e.src="/static/attachment.svg",i.innerHTML="",i.appendChild(e)}else i.textContent=r;let m;document.body.appendChild(a),c.onclick=(()=>{clearTimeout(m),c.replaceWith(d),d.focus(),d.onkeydown=(e=>{if(13===e.keyCode&&d.value.replace(/\s/g,"").length>0){const e=(new Date).getTime(),t=d.value;f({receiver:l,message:t,media:null,stamp:e,sender:s,chat_id:g}),d.value="",a.remove()}})}),i.onclick=n.onclick=(()=>{window.location=`/chat/${g}`}),setTimeout(()=>{a.style.marginTop="15px",m=setTimeout(()=>{a.remove()},4e3)},500)}),"granted"===Notification.permission?(console.log("Granted Notification Perm"),messaging.onMessage(e=>{const t=e.data;console.log("Creating Notification UI"),t.sender!==n&&o(t)})):c=!0}else c=!0;async function p(){console.log(`[-] Manually Checking For Messages [Periodic Timer:${d}]`),await async function(a=e.id("_msg_body")){const i=await $get(t);let o;console.log("new template");const c=document.createElement("div");if(c.className="chat_body",i){const e=Object.keys(i).length;console.log("Checking For Updated Data"),o={stamp:(new Date).getTime(),message:null,sender:s,chat_id:t,receiver:n,fetch_messages:!0,fetch_from:e-1};for(let t=0;t<e;t++){const e=i[t];e&&(e.msgid=t,await l(c,e))}const d=a.scrollTop;a.replaceWith(c),c.scrollTop=d,c.id="_msg_body",c.onclick=(()=>{y()}),a.remove(),_resp=await f(o)}else console.log("Fetching New"),o={stamp:(new Date).getTime(),message:null,sender:s,chat_id:t,receiver:n,fetch_messages:!0},_resp=await f(o)}(),setTimeout(await p,2e4)}function g(e){e.style.overflow="hidden",e.style.padding="0px",e.style.opacity=0,e.style.height="0",e.style.border="none",e.style.width="0"}function m(e){e.style.padding="5px",e.style.opacity=1,e.style.height="auto",e.style.width="auto",e.style.border="2px solid #e3e3e3",e.style.overflow="visible"}c&&(alert("We Cannot send notifications to you.This might cause messaging to slow down"),d=8e3);const h=`${"https:"===window.location.protocol?"wss://":"ws://"}${window.location.host}/@/messenger/`,u=new WebSocket(h);function y(){const t=e.id("Nzk3NzEzOD");"opened"===e.id("__menubox__").getAttribute("data-stat")&&t.click()}async function f(e,t="/@/messenger/"){let a;"object"==typeof e?a=JSON.stringify(e):"string"==typeof e&&(a=e),u.send(a)}console.log(u),u.onmessage=(t=>{const a=t.data;"pong"!==a&&function(t){const a=e.id("_msg_body");try{const e=JSON.parse(t);if(e.hasOwnProperty("error"))return console.log("prop-error",e),a.innerHTML+="<br>An error occured Please reload the page";l(a,e)}catch(e){console.log(e,"ERROR in parsing message"),a.innerHTML+="<br>An error occured Please reload the page"}}(a)}),u.onopen=(async()=>{console.log("Opened Socket"),r(n),await p(),e.id("_msg_body").onclick=(void y())()}),u.onclose=(()=>{e.id("_msg_body").innerHTML="<br>Connection to server was lost. Please Reload the page"})})();