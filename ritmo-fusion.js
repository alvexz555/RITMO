const KEY = 'ritmo_fusion_v1';

const today = () => {
 const d = new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const seed = {
 profile: {
  name: 'Aventureiro',
  warrior: '',
  className: 'Explorador',
  goal: '',
  rule: ''
 },
 level: 1,
 xp: 0,
 hp: 100,
 maxHp: 100,
 coins: 0,
 missions: [],
 events: [],
 transactions: [],
 history: [],
 wins: [],
 perfectDays: 0,
 lastReview: null
};

let state = load();

function load(){
 try{
  return {...seed,...JSON.parse(localStorage.getItem(KEY)||'{}')};
 }catch{
  return structuredClone(seed);
 }
}

function save(){
 localStorage.setItem(KEY,JSON.stringify(state));
 render();
}

function toast(s){
 let t=document.getElementById('toast');
 t.textContent=s;
 t.style.display='block';
 setTimeout(()=>t.style.display='none',2300);
}

const navItems = [
 ['today','⌂','Hoje'],
 ['missions','⚔','Missões'],
 ['agenda','▦','Agenda'],
 ['progression','✦','Progressão'],
 ['finance','◈','Finanças'],
 ['companion','✧','Companheiro'],
 ['character','♙','Personagem']
];

function navHtml(){
 return navItems.map(([id,ic,n])=>
  `<button class="nav ${id==='today'?'active':''}" data-page="${id}">
   <span>${ic}</span><span>${n}</span>
  </button>`
 ).join('');
}

document.getElementById('sideNav').innerHTML =
 navHtml() +
 '<div class="side-note">RITMO FUSION · CANDIDATA<br>Seus dados ficam neste navegador.</div>';

document.getElementById('bottomNav').innerHTML = navHtml();

function go(id){
 document.querySelectorAll('.page').forEach(p=>
  p.classList.toggle('active',p.id==='page-'+id)
 );

 document.querySelectorAll('.nav').forEach(n=>
  n.classList.toggle('active',n.dataset.page===id)
 );

 if(id==='review') renderReview();

 window.scrollTo({top:0,behavior:'smooth'});
}

document.addEventListener('click',e=>{
 let n=e.target.closest('[data-page]');
 if(n) go(n.dataset.page);
});

function openMission(){
 document.getElementById('missionStart').value=today();
 document.getElementById('missionModal').classList.add('open');
}

function closeModal(id){
 document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-backdrop').forEach(m=>{
 m.addEventListener('click',e=>{
  if(e.target===m) m.classList.remove('open');
 });
});

function val(id){
 return document.getElementById(id).value;
}

document.getElementById('missionForm').addEventListener('submit',e=>{
 e.preventDefault();

 state.missions.push({
  id:crypto.randomUUID(),
  title:val('missionTitle'),
  description:val('missionDescription'),
  type:val('missionType'),
  priority:val('missionPriority'),
  xp:+val('missionXp'),
  damage:+val('missionDamage'),
  time:val('missionTime'),
  duration:+val('missionDuration'),
  start:val('missionStart'),
  due:val('missionDue'),
  days:val('missionDays'),
  done:false,
  created:today()
 });

 e.target.reset();
 closeModal('missionModal');
 save();
 toast('Missão criada.');
});

function doneToday(m){
 return (m.completedDates||[]).includes(today());
}

function scheduledToday(m){
 if(m.type==='task'){
  return (!m.start||m.start<=today())&&(!m.due||m.due>=today());
 }

 if(m.days){
  const map={
   dom:0,domingo:0,
   seg:1,segunda:1,
   ter:2,terça:2,terca:2,
   qua:3,quarta:3,
   qui:4,quinta:4,
   sex:5,sexta:5,
   sab:6,sábado:6,sabado:6
  };

  const names=m.days.toLowerCase()
   .split(/[;,\s]+/)
   .filter(Boolean);

  const selected=names
   .map(n=>map[n])
   .filter(n=>n!==undefined);

  if(selected.length&&!selected.includes(new Date().getDay())){
   return false;
  }
 }

 return !m.start||m.start<=today();
}

function missionRow(m,review=false){
 const completed=doneToday(m);

 return `
 <div class="item">
  <button class="check ${completed?'done':''}"
   ${completed?'disabled':''}
   onclick="toggleMission('${m.id}')">
   ${completed?'✓':''}
  </button>

  <div class="item-main">
   <div class="item-title">${esc(m.title)}</div>
   <div class="item-meta">
    ${m.type} · ${m.xp} XP · ${m.time||'Sem horário'}
    ${m.due?'· Prazo '+m.due:''}
   </div>
  </div>

  <span class="tag ${m.type}">${m.type}</span>

  ${review
   ? `<button class="btn small secondary" onclick="markFailed('${m.id}')">Não realizada</button>`
   : `<button class="btn small secondary" onclick="removeMission('${m.id}')">×</button>`
  }
 </div>`;
}

function esc(s=''){
 return String(s).replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
 }[c]));
}

function toggleMission(id){
 let m=state.missions.find(x=>x.id===id);
 if(!m) return;

 if(doneToday(m)){
  toast('Esta missão já foi recompensada hoje.');
  return;
 }

 m.completedDates=m.completedDates||[];
 m.completedDates.push(today());

 state.xp+=m.xp;

 let leveled=false;

 while(state.xp>=state.level*100){
  state.xp-=state.level*100;
  state.level++;
  state.maxHp+=5;
  state.hp=Math.min(state.maxHp,state.hp+10);
  leveled=true;
 }

 let reward=Math.max(1,Math.round(m.xp/10));

 state.coins+=reward;

 state.transactions.push({
  id:crypto.randomUUID(),
  type:'in',
  amount:reward,
  category:'Recompensa de missão',
  desc:m.title,
  date:today()
 });

 save();

 toast(
  leveled
   ? 'Level up! Você evoluiu.'
   : 'Missão concluída e recompensa registrada.'
 );
}

function removeMission(id){
 state.missions=state.missions.filter(x=>x.id!==id);
 save();
}

function markFailed(id){
 let m=state.missions.find(x=>x.id===id);

 if(m){
  m.review='failed';
  toast('Marcada para revisão como não realizada.');
 }

 renderReview();
}

function renderMissions(){
 const f=document.querySelector('.filter.active')?.dataset.filter||'all';

 const todays=state.missions.filter(scheduledToday);

 let arr=state.missions.filter(m=>
  f==='all'||
  f===m.type||
  f==='pending'&&!doneToday(m)||
  f==='done'&&doneToday(m)
 );

 document.getElementById('allMissions').innerHTML=
  arr.length
   ? arr.map(m=>missionRow(m)).join('')
   : '<div class="empty">Nenhuma missão neste filtro. Crie a primeira.</div>';

 document.getElementById('todayMissions').innerHTML=
  todays.length
   ? todays.slice(0,5).map(m=>missionRow(m)).join('')
   : '<div class="empty">Nenhuma missão prevista para hoje.</div>';

 const completed=todays.filter(doneToday).length;

 document.getElementById('todayCount').textContent=
  `(${completed}/${todays.length})`;

 document.getElementById('doneStat').textContent=completed;

 document.getElementById('pendingStat').textContent=
  todays.length-completed;
}

document.getElementById('missionFilters').addEventListener('click',e=>{
 let b=e.target.closest('[data-filter]');
 if(!b) return;

 document.querySelectorAll('.filter').forEach(x=>
  x.classList.toggle('active',x===b)
 );

 renderMissions();
});

document.getElementById('eventForm').addEventListener('submit',e=>{
 e.preventDefault();

 state.events.push({
  id:crypto.randomUUID(),
  title:val('eventTitle'),
  date:val('eventDate'),
  time:val('eventTime'),
  desc:val('eventDesc')
 });

 e.target.reset();
 save();
 toast('Compromisso salvo.');
});

function renderEvents(){
 let a=state.events.slice().sort((x,y)=>
  (x.date+x.time).localeCompare(y.date+y.time)
 );

 let html=a.map(ev=>`
  <div class="item">
   <div class="item-main">
    <div class="item-title">${esc(ev.title)}</div>
    <div class="item-meta">
     ${ev.date} · ${ev.time||'Horário livre'}
     ${ev.desc?'· '+esc(ev.desc):''}
    </div>
   </div>
   <button class="btn small secondary" onclick="removeEvent('${ev.id}')">×</button>
  </div>
 `).join('')||'<div class="empty">Nenhum compromisso cadastrado.</div>';

 document.getElementById('eventList').innerHTML=html;

 document.getElementById('todayEvents').innerHTML=
  a.filter(x=>x.date>=today()).slice(0,4).map(x=>`
   <div class="item">
    <div class="item-main">
     <div class="item-title">${esc(x.title)}</div>
     <div class="item-meta">${x.date} · ${x.time||'Sem horário'}</div>
    </div>
   </div>
  `).join('')||'<div class="empty">Agenda livre por enquanto.</div>';
}

function removeEvent(id){
 state.events=state.events.filter(x=>x.id!==id);
 save();
}

function renderReview(){
 const todays=state.missions.filter(scheduledToday);
 const completed=todays.filter(doneToday);
 const pending=todays.filter(m=>!doneToday(m));

 document.getElementById('reviewStats').innerHTML=`
  <div class="card">
   <div class="label">Concluídas</div>
   <div class="stat positive">${completed.length}</div>
  </div>
  <div class="card">
   <div class="label">Pendentes</div>
   <div class="stat">${pending.length}</div>
  </div>
  <div class="card">
   <div class="label">Vida atual</div>
   <div class="stat">${state.hp}/${state.maxHp}</div>
  </div>
 `;

 document.getElementById('reviewList').innerHTML=
  todays.length
   ? pending.map(m=>`
    <div class="item">
     <div class="item-main">
      <div class="item-title">${esc(m.title)}</div>
      <div class="item-meta">Não concluída · impacto potencial ${m.damage} HP</div>
     </div>
     <span class="tag">PENDENTE</span>
     <button class="btn small secondary" onclick="confirmFailed('${m.id}')">Confirmar falha</button>
    </div>
   `).join('')+
   completed.map(m=>`
    <div class="item">
     <div class="item-main">
      <div class="item-title">${esc(m.title)}</div>
      <div class="item-meta">Concluída · ${m.xp} XP</div>
     </div>
     <span class="tag">CONCLUÍDA</span>
    </div>
   `).join('')
   : '<div class="empty">Não há missões previstas para hoje.</div>';
}

function confirmFailed(id){
 const m=state.missions.find(x=>x.id===id);

 if(m){
  m.failedDates=m.failedDates||[];

  if(!m.failedDates.includes(today())){
   m.failedDates.push(today());
  }

  renderReview();
 }
}

function saveReview(){
 if(state.lastReview===today()){
  toast('A revisão de hoje já foi registrada.');
  return;
 }

 const todays=state.missions.filter(scheduledToday);

 const failed=todays.filter(m=>
  (m.failedDates||[]).includes(today())
 );

 const damage=failed.reduce((s,m)=>s+m.damage,0);
 const done=todays.filter(doneToday).length;

 state.hp=Math.max(0,state.hp-damage);

 const perfect=
  todays.length>0&&
  failed.length===0&&
  done===todays.length;

 state.history.unshift({
  date:today(),
  done,
  failed:failed.length,
  damage,
  note:val('reviewNote'),
  perfect
 });

 if(perfect){
  state.perfectDays++;
  state.hp=Math.min(state.maxHp,state.hp+10);
 }

 state.lastReview=today();

 save();

 toast(`Revisão salva. ${damage} de dano aplicado após confirmação.`);

 go('today');
}

document.getElementById('winForm').addEventListener('submit',e=>{
 e.preventDefault();

 state.wins.unshift({
  title:val('winTitle'),
  date:today()
 });

 e.target.reset();
 save();
 toast('Vitória registrada.');
});

function renderProgress(){
 document.getElementById('progLevel').textContent=state.level;
 document.getElementById('progXp').textContent=state.xp;
 document.getElementById('progPerfect').textContent=state.perfectDays;
 document.getElementById('streakStat').textContent=state.perfectDays;

 document.getElementById('wins').innerHTML=
  state.wins.map(w=>`
   <div class="item">
    <div class="item-main">
     <b>${esc(w.title)}</b>
     <div class="item-meta">${w.date}</div>
    </div>
   </div>
  `).join('')||'<div class="empty">Suas vitórias aparecerão aqui.</div>';

 let ach=[
  ['Primeiro passo',state.missions.length>0],
  ['Em movimento',state.missions.some(m=>(m.completedDates||[]).length>0)],
  ['Nível 2',state.level>=2],
  ['Dia perfeito',state.perfectDays>0]
 ];

 document.getElementById('achievements').innerHTML=
  ach.map(([n,ok])=>`
   <div class="item">
    <div class="item-main">${n}</div>
    <span class="tag">${ok?'DESBLOQUEADA':'BLOQUEADA'}</span>
   </div>
  `).join('');

 document.getElementById('history').innerHTML=
  state.history.map(h=>`
   <div class="item">
    <div class="item-main">
     <b>${h.date}</b>
     <div class="item-meta">
      ${h.done} concluídas · ${h.failed} não realizadas · ${h.damage} HP de dano
      ${h.perfect?'· Dia perfeito':''}
     </div>
    </div>
   </div>
  `).join('')||'<div class="empty">O histórico será construído conforme você fecha os dias.</div>';
}

document.getElementById('transactionForm').addEventListener('submit',e=>{
 e.preventDefault();

 let type=val('txType');
 let amount=+val('txAmount');

 if(!amount||amount<1) return;

 if(type==='out'&&amount>state.coins){
  toast('Saldo insuficiente.');
  return;
 }

 state.transactions.push({
  id:crypto.randomUUID(),
  type,
  amount,
  category:val('txCategory'),
  desc:val('txDesc'),
  date:today()
 });

 state.coins+=type==='in'?amount:-amount;

 e.target.reset();
 save();
 toast('Movimentação registrada.');
});

function renderFinance(){
 let ins=state.transactions
  .filter(t=>t.type==='in')
  .reduce((s,t)=>s+t.amount,0);

 let outs=state.transactions
  .filter(t=>t.type==='out')
  .reduce((s,t)=>s+t.amount,0);

 document.getElementById('balance').textContent=state.coins+' MC';
 document.getElementById('income').textContent='+'+ins+' MC';
 document.getElementById('expense').textContent='-'+outs+' MC';

 document.getElementById('transactions').innerHTML=
  state.transactions.slice().reverse().map(t=>`
   <div class="item">
    <div class="item-main">
     <div class="item-title">${esc(t.desc||t.category)}</div>
     <div class="item-meta">${t.date} · ${esc(t.category)}</div>
    </div>
    <b class="${t.type==='in'?'positive':'negative'}">
     ${t.type==='in'?'+':'-'}${t.amount} MC
    </b>
   </div>
  `).join('')||'<div class="empty">Nenhuma movimentação ainda.</div>';

 drawChart(ins,outs);
}

function drawChart(ins,outs){
 let c=document.getElementById('financeChart');
 let ctx=c.getContext('2d');
 let w=c.clientWidth||400;
 let h=210;
 let dpr=devicePixelRatio||1;

 c.width=w*dpr;
 c.height=h*dpr;

 ctx.scale(dpr,dpr);
 ctx.clearRect(0,0,w,h);

 let max=Math.max(ins,outs,10);
 let base=h-32;

 ctx.strokeStyle='#354052';
 ctx.beginPath();
 ctx.moveTo(25,base);
 ctx.lineTo(w-15,base);
 ctx.stroke();

 let bw=Math.min(70,w/4);

 [
  [ins,'#b8f36b',w*.32,'Entradas'],
  [outs,'#ff6b78',w*.66,'Saídas']
 ].forEach(([v,color,x,label])=>{
  let bh=(v/max)*(h-70);

  ctx.fillStyle=color;
  ctx.beginPath();

  if(ctx.roundRect){
   ctx.roundRect(x-bw/2,base-bh,bw,bh,7);
  }else{
   ctx.rect(x-bw/2,base-bh,bw,bh);
  }

  ctx.fill();

  ctx.fillStyle='#e7edf6';
  ctx.textAlign='center';
  ctx.font='12px sans-serif';
  ctx.fillText(v+' MC',x,base-bh-9);

  ctx.fillStyle='#8e9aaf';
  ctx.fillText(label,x,base+19);
 });
}

document.getElementById('profileForm').addEventListener('submit',e=>{
 e.preventDefault();

 state.profile={
  name:val('profileName'),
  warrior:val('warriorName'),
  className:val('className'),
  goal:val('goal'),
  rule:val('personalRule')
 };

 save();
 toast('Personagem atualizado.');
});

function renderProfile(){
 let p=state.profile;

 document.getElementById('profileName').value=p.name||'';
 document.getElementById('warriorName').value=p.warrior||'';
 document.getElementById('className').value=p.className||'Explorador';
 document.getElementById('goal').value=p.goal||'';
 document.getElementById('personalRule').value=p.rule||'';
}

document.getElementById('chatForm').addEventListener('submit',e=>{
 e.preventDefault();

 let s=val('chatInput');
 let box=document.getElementById('chatMessages');

 box.innerHTML+=`
  <div class="item">
   <div class="item-main"><b>Você</b><br>${esc(s)}</div>
  </div>
  <div class="item">
   <div class="item-main">
    <b>Companheiro</b><br>
    Mensagem registrada. Posso ajudar a transformar isso em uma missão.
    Nesta versão, ainda não estou conectado a um modelo de IA.
   </div>
  </div>
 `;

 e.target.reset();
 box.scrollTop=box.scrollHeight;
});

function exportData(){
 let blob=new Blob(
  [JSON.stringify(state,null,2)],
  {type:'application/json'}
 );

 let a=document.createElement('a');
 a.href=URL.createObjectURL(blob);
 a.download='ritmo-backup-'+today()+'.json';
 a.click();

 URL.revokeObjectURL(a.href);
}

function resetData(){
 if(confirm('Isso apagará os dados locais desta demonstração. Deseja continuar?')){
  localStorage.removeItem(KEY);
  state=structuredClone(seed);
  save();
  renderProfile();
  toast('Demonstração reiniciada.');
 }
}

function render(){
 let p=state.profile;

 document.getElementById('hudHp').textContent=
  state.hp+'/'+state.maxHp;

 document.getElementById('hudLevel').textContent=state.level;

 document.getElementById('hudXp').textContent=
  state.xp+'/'+(state.level*100);

 document.getElementById('hudCoins').textContent=
  state.coins+' MC';

 document.getElementById('heroName').textContent=
  p.warrior||p.name||'Aventureiro';

 document.getElementById('heroLevel').textContent=
  'Nível '+state.level;

 document.getElementById('heroXpBar').style.width=
  Math.min(100,state.xp/(state.level*100)*100)+'%';

 document.getElementById('heroXpText').textContent=
  state.xp+' / '+state.level*100+' XP';

 document.getElementById('heroHp').innerHTML=
  state.hp+' <small style="font-size:15px;color:var(--muted)">/ '+state.maxHp+'</small>';

 document.getElementById('heroHpBar').style.width=
  state.hp/state.maxHp*100+'%';

 document.getElementById('todayDate').textContent=
  new Date().toLocaleDateString('pt-BR',{
   weekday:'long',
   day:'2-digit',
   month:'long'
  }).toUpperCase();

 document.getElementById('greeting').textContent=
  p.goal?'Objetivo atual: '+p.goal:'Uma missão de cada vez.';

 renderMissions();
 renderEvents();
 renderProgress();
 renderFinance();
 renderProfile();
}

document.getElementById('eventDate').value=today();

window.addEventListener('resize',()=>renderFinance());

render();
