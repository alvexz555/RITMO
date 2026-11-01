const STORAGE_KEY = "ritmo_app_v1";
const DEMO = {
  name:"Aventureiro", xp:65, streak:3, goal:"Construir uma rotina consistente", availability:"60", tone:"balanced", rule:"Priorizar o essencial e respeitar pausas.", consequence:"Revisar o planejamento e reduzir o escopo.",
  missions:[
    {id:"m1",title:"Organizar o espaço de trabalho",duration:15,priority:"low",time:"08:30",status:"done",xpAwarded:true},
    {id:"m2",title:"Estudar programação",duration:45,priority:"high",time:"10:00",status:"pending",xpAwarded:false},
    {id:"m3",title:"Fazer uma pausa e caminhar",duration:15,priority:"medium",time:"12:30",status:"pending",xpAwarded:false},
    {id:"m4",title:"Avançar no projeto pessoal",duration:30,priority:"high",time:"16:00",status:"pending",xpAwarded:false}
  ], victories:[], reviews:[]
};
let state = loadState();
let currentFilter = "all";
let toastTimer;
const $ = id => document.getElementById(id);
function clone(obj){return JSON.parse(JSON.stringify(obj))}
function loadState(){try{const saved=localStorage.getItem(STORAGE_KEY);return saved?{...clone(DEMO),...JSON.parse(saved)}:clone(DEMO)}catch(e){return clone(DEMO)}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));render()}
function uid(){return "m"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function levelInfo(xp){const level=Math.floor(xp/100)+1;const into=xp%100;return {level,into,next:100-into,name:level===1?"Iniciante":level<4?"Explorador":level<7?"Construtor":"Lenda"}}
function awardXP(mission){if(mission.status!=="done"&&!mission.xpAwarded){mission.status="done";mission.xpAwarded=true;state.xp+=mission.priority==="high"?30:mission.priority==="medium"?20:15;showToast("Missão concluída. XP conquistado!")}else if(mission.status==="done"){showToast("Essa missão já foi recompensada.")}}
function render(){
 const info=levelInfo(state.xp);$("xp-total").textContent=state.xp;$("level-number").textContent=info.level;$("level-label").textContent=info.name;$("xp-progress").style.width=info.into+"%";$("xp-current").textContent=info.into+" / 100 XP";$("xp-next").textContent=info.next+" XP para o próximo nível";$("streak-count").textContent=state.streak;
 $("profile-name-display").textContent=state.name;$("profile-level").textContent=info.level;$("profile-xp").textContent=state.xp+" XP";
 const done=state.missions.filter(m=>m.status==="done").length,total=state.missions.length,pct=total?Math.round(done/total*100):0;$("done-count").textContent=`${done} de ${total}`;$("day-progress-fill").style.width=pct+"%";$("day-percent").textContent=pct+"%";
 const active=state.missions.filter(m=>m.status!=="done");$("today-missions").innerHTML=active.length?active.slice(0,4).map(missionHTML).join(""):empty("Tudo em dia por aqui. Que tal registrar uma vitória?");
 const sorted=state.missions.filter(m=>m.time&&m.status!=="done").sort((a,b)=>a.time.localeCompare(b.time));$("schedule-list").innerHTML=sorted.length?sorted.slice(0,4).map(m=>`<div class="schedule-item"><span class="schedule-time">${escapeHTML(m.time)}</span><span class="schedule-line"></span><span class="schedule-name">${escapeHTML(m.title)}</span></div>`).join(""):empty("Nenhum horário definido.");
 let filtered=state.missions;if(currentFilter==="pending")filtered=filtered.filter(m=>m.status==="pending");if(currentFilter==="done")filtered=filtered.filter(m=>m.status==="done");$("all-missions").innerHTML=filtered.length?filtered.map(missionHTML).join(""):empty("Nenhuma missão nesta categoria.");
 const achievements=[{id:"first",icon:"✦",title:"Primeiro passo",desc:"Conclua sua primeira missão.",ok:state.missions.some(m=>m.status==="done")},{id:"five",icon:"⚡",title:"Em movimento",desc:"Conclua cinco missões.",ok:state.missions.filter(m=>m.status==="done").length>=5},{id:"xp",icon:"◈",title:"Centena",desc:"Alcance 100 XP.",ok:state.xp>=100},{id:"victory",icon:"🏆",title:"Reconhecer o caminho",desc:"Registre uma vitória pessoal.",ok:state.victories.length>0},{id:"level3",icon:"⬆",title:"Subindo de nível",desc:"Alcance o nível 3.",ok:info.level>=3},{id:"planner",icon:"◎",title:"Planejador",desc:"Crie três missões.",ok:state.missions.length>=3}];$("achievement-count").textContent=achievements.filter(a=>a.ok).length+" de "+achievements.length+" conquistas";$("achievement-list").innerHTML=achievements.map(a=>`<div class="achievement ${a.ok?"unlocked":""}"><div class="achievement-icon">${a.icon}</div><strong>${a.title}</strong><p>${a.desc}</p></div>`).join("");
 $("victory-list").innerHTML=state.victories.length?state.victories.slice().reverse().map(v=>`<div class="victory-item"><span class="victory-star">✦</span><div><strong>${escapeHTML(v.title)}</strong>${v.reward?`<p>Recompensa: ${escapeHTML(v.reward)}</p>`:""}<p>${new Date(v.date).toLocaleDateString("pt-BR")}</p></div></div>`).join(""):empty("Suas vitórias pessoais vão aparecer aqui.");
}
function empty(msg){return `<div class="empty-state">${escapeHTML(msg)}</div>`}
function missionHTML(m){const completed=m.status==="done";return `<article class="mission-card ${completed?"completed":""}" data-id="${m.id}"><button class="check-button" data-action="toggle" data-id="${m.id}" aria-label="${completed?"Reabrir":"Concluir"} missão">${completed?"✓":""}</button><div class="mission-main"><div class="mission-title">${escapeHTML(m.title)}</div><div class="mission-meta"><span>${m.duration} min</span><span><i class="priority ${m.priority}"></i>${m.priority==="high"?"Alta":m.priority==="medium"?"Média":"Baixa"}</span>${m.time?`<span>${escapeHTML(m.time)}</span>`:""}</div></div><span class="mission-xp">+${m.priority==="high"?30:m.priority==="medium"?20:15} XP</span><div class="card-actions"><button class="tiny-action" data-action="edit" data-id="${m.id}" aria-label="Editar">✎</button><button class="tiny-action" data-action="more" data-id="${m.id}" aria-label="Mais opções">⋯</button></div></article>`}
function showToast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2400)}
function navigate(page){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));window.scrollTo({top:0,behavior:"smooth"})}
function openMission(m){$("mission-form").reset();$("mission-id").value=m?.id||"";$("mission-title").value=m?.title||"";$("mission-duration").value=m?.duration||15;$("mission-priority").value=m?.priority||"medium";$("mission-time").value=m?.time||"";$("mission-modal-title").textContent=m?"Editar missão":"Criar missão";$("mission-dialog").showModal()}
function companionReply(message){
 const text=message.toLowerCase();
 if(/procrast|adiar|enrol|foco/.test(text))return "Vamos tirar o peso da largada. Escolha uma missão e faça só 5 minutos. Depois você decide se continua. Qual é a menor primeira ação?";
 if(/difícil|cansad|ansios|mal|desanim/.test(text))return "Então vamos diminuir a marcha, sem transformar isso em culpa. O que é realmente essencial hoje? Podemos reduzir o plano e deixar espaço para descanso.";
 if(/organizar|planejar|dia|rotina/.test(text)){const pending=state.missions.filter(m=>m.status==="pending").length;return `Você tem ${pending} missão(ões) pendente(s) e ${state.availability} minutos de disponibilidade configurada. Comece pela prioridade mais alta e deixe intervalos entre blocos. Quer criar uma missão agora?`;}
 if(/objetivo|meta|quero/.test(text))return "Boa. Vamos transformar isso em algo executável: qual seria uma ação pequena, de até 30 minutos, que aproxima você desse objetivo?";
 return "Entendi. Vamos trabalhar com o que cabe no seu dia. Qual é o próximo passo concreto que você consegue fazer em até 15 minutos?";
}
function sendChat(message){if(!message.trim())return;const box=$("chat-messages");box.insertAdjacentHTML("beforeend",`<div class="message user-message">${escapeHTML(message)}</div>`);$("chat-input").value="";setTimeout(()=>{box.insertAdjacentHTML("beforeend",`<div class="message bot-message">${escapeHTML(companionReply(message))}</div>`);box.scrollTop=box.scrollHeight},250);box.scrollTop=box.scrollHeight}
document.addEventListener("click",e=>{
 const page=e.target.closest("[data-page]");if(page){navigate(page.dataset.page);return}
 const close=e.target.closest("[data-close]");if(close){$(close.dataset.close).close();return}
 const filter=e.target.closest("[data-filter]");if(filter){currentFilter=filter.dataset.filter;document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b===filter));render();return}
 const action=e.target.closest("[data-action]");if(!action)return;const id=action.dataset.id;const mission=state.missions.find(m=>m.id===id);
 switch(action.dataset.action){
 case "add":openMission();break;
 case "toggle":if(mission){if(mission.status==="done"){mission.status="pending";mission.xpAwarded=false;state.xp=Math.max(0,state.xp-(mission.priority==="high"?30:mission.priority==="medium"?20:15));showToast("Missão reaberta. XP ajustado.")}else awardXP(mission);save()}break;
 case "edit":if(mission)openMission(mission);break;
 case "more":if(mission){const choice=prompt("Digite: adiar, não realizada ou excluir", "adiar");if(choice==="adiar"){mission.time="";showToast("Horário removido. Reagende quando quiser.")}else if(choice==="não realizada"){mission.status="missed";showToast("Registrado sem punição.")}else if(choice==="excluir"){if(confirm("Excluir esta missão?"))state.missions=state.missions.filter(m=>m.id!==id)}save()}break;
 case "review":$("review-dialog").showModal();break;
 case "victory":$("victory-dialog").showModal();break;
 case "edit-name":{const n=prompt("Como quer ser chamado?",state.name);if(n?.trim()){state.name=n.trim().slice(0,35);save()}}break;
 case "save-consequence":state.consequence=$("consequence-input").value.trim();save();showToast("Regra pessoal salva.");break;
 case "reset":if(confirm("Restaurar os dados demonstrativos? Isso substitui seus dados locais atuais.")){state=clone(DEMO);save();showToast("Demonstração restaurada.")}break;
 }
});
$("mission-form").addEventListener("submit",e=>{e.preventDefault();const id=$("mission-id").value;const data={title:$("mission-title").value.trim(),duration:Number($("mission-duration").value),priority:$("mission-priority").value,time:$("mission-time").value};if(!data.title)return;if(id){const m=state.missions.find(x=>x.id===id);if(m){Object.assign(m,data);if(m.status==="done"&&m.xpAwarded){/* XP já concedido permanece uma única recompensa. */}}}else state.missions.push({id:uid(),...data,status:"pending",xpAwarded:false});$("mission-dialog").close();save();showToast(id?"Missão atualizada.":"Missão criada.")});
$("profile-form").addEventListener("submit",e=>{e.preventDefault();state.goal=$("goal-input").value;state.availability=$("availability-input").value;state.tone=$("tone-input").value;state.rule=$("rule-input").value;save();showToast("Preferências salvas.")});
$("review-form").addEventListener("submit",e=>{e.preventDefault();state.reviews.push({mood:$("review-mood").value,note:$("review-note").value,date:new Date().toISOString()});$("review-dialog").close();$("review-note").value="";save();showToast("Revisão registrada. Amanhã é uma nova página.")});
$("victory-form").addEventListener("submit",e=>{e.preventDefault();state.victories.push({title:$("victory-title").value.trim(),reward:$("victory-reward").value.trim(),date:new Date().toISOString()});$("victory-dialog").close();$("victory-form").reset();save();showToast("Vitória registrada. Ela conta.")});
$("chat-form").addEventListener("submit",e=>{e.preventDefault();sendChat($("chat-input").value)});
document.querySelectorAll("[data-prompt]").forEach(b=>b.addEventListener("click",()=>sendChat(b.dataset.prompt)));
function hydrateProfile(){$("goal-input").value=state.goal||"";$("availability-input").value=state.availability||"60";$("tone-input").value=state.tone||"balanced";$("rule-input").value=state.rule||"";$("consequence-input").value=state.consequence||""}
const now=new Date();$("today-date").textContent=now.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"}).toUpperCase();hydrateProfile();render();
