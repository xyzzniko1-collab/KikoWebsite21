let state={user:null,links:[],filter:"ALL",announcements:[]};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
async function api(url,opts={}){const r=await fetch(url,{headers:{"Content-Type":"application/json",...(opts.headers||{})},...opts});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Request failed");return d}
function notify(e){alert(e.message)}
async function load(){
 const [me,links,ann]=await Promise.all([api("/api/auth/me"),api("/api/links"),api("/api/announcements")]);
 state.user=me.user;state.links=links;state.announcements=ann;
 $("#heroLinks").textContent=links.length;render();updateAuth();
 if(state.user){$("#chatBox").classList.remove("hidden");loadMessages()}
}
function render(){
 const list=state.links.filter(x=>state.filter==="ALL"||x.category===state.filter);
 $("#links").innerHTML=list.length?list.map(x=>`<article class="resource"><div><div class="tag">${x.category==="GTA_MOD"?"GTA / MOD":"GTA / KEBUTUHAN"}</div><h3>${esc(x.title)}</h3><p>Added by ${esc(x.createdBy.username)}</p></div><div class="resource-bottom"><span class="access">${x.visibility==="PUBLIC"?"PUBLIC":x.visibility==="MEMBER"?"MEMBER":"PRIVATE"}${x.followGate?" · GATE":""}</span><button class="open" onclick="openLink('${x.id}')">Open ↗</button></div></article>`).join(""):`<div class="resource"><h3>No resources</h3><p>Belum ada upload untuk filter ini.</p></div>`;
 $("#announcementsList").innerHTML=state.announcements.length?state.announcements.map(x=>`<article class="announcement"><div class="tag">${new Date(x.createdAt).toLocaleDateString("id-ID")} · ${esc(x.author.username)}</div><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></article>`).join(""):`<p class="muted">Belum ada announcement.</p>`;
}
async function openLink(id){
 const x=state.links.find(a=>a.id===id);if(!x)return;
 if(x.visibility!=="PUBLIC"&&!state.user){$("#modal").classList.remove("hidden");return}
 try{const d=await api("/api/links/"+id+"/gate",{method:"POST"});window.open(d.url,"_blank","noopener")}catch(e){notify(e)}
}
function updateAuth(){
 $("#authButton").textContent=state.user?state.user.username:"Login";
 $("#authButton").onclick=()=>{location.hash=state.user?"dashboard":"dashboard";if(state.user)showDashboard()};
 if(state.user)showDashboard();
}
async function showDashboard(){
 $("#dashboard").classList.remove("hidden");$("#dashboard").scrollIntoView({behavior:"smooth"});
 $("#dashName").textContent=state.user.username+" / "+state.user.role;
 $("#ownerTools").classList.toggle("hidden",state.user.role!=="OWNER");
 $("#memberTools").classList.toggle("hidden",state.user.role!=="MEMBER");
 if(state.user.role==="OWNER"){const s=await api("/api/owner/summary");$("#summary").innerHTML=Object.entries(s).map(([k,v])=>`<div class="summary"><strong>${v}</strong><span>${k}</span></div>`).join("")}
}
$("#discord").href="#";
api("/api/config").then(x=>$("#discord").href=x.discordUrl);
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.filter=b.dataset.filter;render()});
$("#authButton").onclick=()=>{if(state.user)showDashboard();else $("#dashboard").classList.remove("hidden")};
$("#logout").onclick=async()=>{await api("/api/auth/logout",{method:"POST"});location.reload()};
$("#memberForm").onsubmit=async e=>{e.preventDefault();try{await api("/api/users",{method:"POST",body:JSON.stringify({username:$("#newUser").value,password:$("#newPass").value})});e.target.reset();alert("Member dibuat.")}catch(e){notify(e)}};
$("#linkForm").onsubmit=async e=>{e.preventDefault();try{await api("/api/links",{method:"POST",body:JSON.stringify({title:$("#title").value,url:$("#url").value,visibility:$("#visibility").value,category:$("#category").value,followGate:$("#gate").checked})});e.target.reset();await load();alert("Resource published.")}catch(e){notify(e)}};
$("#memberLinkForm").onsubmit=async e=>{e.preventDefault();try{await api("/api/links",{method:"POST",body:JSON.stringify({title:$("#mTitle").value,url:$("#mUrl").value,category:$("#mCat").value})});e.target.reset();await load();alert("Resource published.")}catch(e){notify(e)}};
$("#announceForm").onsubmit=async e=>{e.preventDefault();try{await api("/api/announcements",{method:"POST",body:JSON.stringify({title:$("#aTitle").value,body:$("#aBody").value})});e.target.reset();await load();alert("Announcement posted.")}catch(e){notify(e)}};
$("#chatForm").onsubmit=async e=>{e.preventDefault();try{await api("/api/messages",{method:"POST",body:JSON.stringify({body:$("#message").value})});$("#message").value="";loadMessages()}catch(e){notify(e)}};
async function loadMessages(){const ms=await api("/api/messages");$("#messages").innerHTML=ms.map(x=>`<div class="chat-msg"><b>${esc(x.author.username)}</b> <span>${new Date(x.createdAt).toLocaleString("id-ID")}</span><div>${esc(x.body)}</div></div>`).join("")||"<p class='muted'>No messages yet.</p>"}
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#modalLogin").onclick=()=>{$("#modal").classList.add("hidden");$("#dashboard").classList.remove("hidden");showLogin()};
function showLogin(){
 const modal=document.createElement("div");modal.className="modal";modal.innerHTML=`<div class="modal-card"><button class="close">×</button><div class="eyebrow">ACCOUNT</div><h2>Sign in</h2><form><input id="lu" placeholder="Username"><input id="lp" type="password" placeholder="Password"><button class="primary">Login</button></form></div>`;document.body.append(modal);modal.querySelector(".close").onclick=()=>modal.remove();modal.querySelector("form").onsubmit=async e=>{e.preventDefault();try{await api("/api/auth/login",{method:"POST",body:JSON.stringify({username:$("#lu").value,password:$("#lp").value})});modal.remove();await load();showDashboard()}catch(err){notify(err)}}}
load().catch(notify);