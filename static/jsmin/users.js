(()=>{$={id:e=>document.getElementById(e),className:(e,n=!0)=>{const t=[].slice.call(document.getElementsByClassName(e));return n?t[0]:t}};const e=$.id("users"),n=$.id("sbm"),t=document.querySelector("meta[name='nonce']").content,s=$.id("loading-gif"),i=$.id("messages"),o=$.id("resbox-details");e.addEventListener("keydown",e=>{13===e.keyCode&&n.click()}),n.onclick=(async()=>{if(i.style.visibility="hidden",0!=e.value.length){o.style.display="block",s.style.display="inline";const n=await fetch(`/api/user-search/tokens/${t}`,{method:"get",credentials:"include"}),a=await n.text(),l=await fetch("/api/users/",{method:"post",headers:{"content-type":"application/x-www-form-urlencoded"},body:(e=>`${Object.keys(e).map(n=>`${encodeURIComponent(n)}=${encodeURIComponent(e[n])}`).join("&")}`)({token:a,user:e.value})});s.style.display="none",o.style.display="none";try{return function(e){const n=e.users,t=$.id("results-all");if(t.innerHTML="",0===n.length)return t.innerHTML="No Results Found";for(const e of n){const n=document.createElement("a"),s=document.createElement("button");n.href=`/u/${e}`,s.innerHTML=e,n.appendChild(s),s.className="resbtn",t.appendChild(n)}}(await l.json())}catch(e){console.warn(e),i.style.visibility="visible",i.innerHTML="An error occured on our end..please try again"}}})})();