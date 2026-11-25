/* Local cross-department notifications. Messages are stored only in this browser. */
(() => {
  'use strict';
  const KEY='legal_notifications_v1', PREF='legal_notification_preferences_v1';
  const depts={lawsuits:'شعبة الدعاوى والنزاهة',investigations:'شعبة التحقيقات والكفالات',followup:'وحدة المتابعة'};
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[];}catch{return[];}};
  const prefs=()=>{try{return {...{sound:true},...JSON.parse(localStorage.getItem(PREF)||'{}')}}catch{return {sound:true}}};
  const save=v=>localStorage.setItem(KEY,JSON.stringify(v.slice(-500)));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const user=()=>window.appState||parent.appState||{};
  const visible=n=>n.target==='all'||n.target===user().selectedDept||n.target===user().selectedRole;
  const unread=()=>read().filter(n=>visible(n)&&!n.readBy?.includes(user().selectedRole+':'+user().selectedDept)).length;
  let panel;
  function beep(){if(!prefs().sound)return;try{const C=window.AudioContext||window.webkitAudioContext,c=new C(),o=c.createOscillator(),g=c.createGain();o.frequency.value=740;g.gain.setValueAtTime(.0001,c.currentTime);g.gain.exponentialRampToValueAtTime(.12,c.currentTime+.02);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.25);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.27);}catch{}}
  function ensure(){
    if(panel)return panel;
    panel=document.createElement('dialog');panel.className='lv-dialog no-print';panel.id='lv-notifications-dialog';
    panel.innerHTML='<button type="button" data-nclose>إغلاق</button><div id="lv-notifications-content"></div>';
    panel.addEventListener('click',e=>{if(e.target.matches('[data-nclose]'))panel.close(); if(e.target.matches('[data-nread]')){const id=e.target.dataset.nread,v=read(),n=v.find(x=>x.id===id);if(n){n.readBy=[...(n.readBy||[]),user().selectedRole+":"+user().selectedDept];save(v);render();}}});
    document.body.append(panel);return panel;
  }
  function render(){const p=ensure(),items=read().filter(visible).sort((a,b)=>b.createdAt-a.createdAt),c=p.querySelector('#lv-notifications-content');
    c.innerHTML='<h2>التنبيهات والتوجيهات بين الشعب والوحدات</h2><p class="lv-notice-help">'+(items.length?'الرسائل الأحدث تظهر أولًا.':'لا توجد رسائل موجهة إليك.')+'</p>'+items.map(n=>`<article class="lv-notice lv-notice-${esc(n.kind)}"><div><strong>${esc(n.title)}</strong><small>${esc(n.kindLabel)} — ${esc(n.from)} — ${new Date(n.createdAt).toLocaleString('ar-IQ')}</small></div><p>${esc(n.body)}</p>${n.readBy?.includes(user().selectedRole+':'+user().selectedDept)?'<small>تم تأكيد الاستلام</small>':`<button type="button" data-nread="${esc(n.id)}">تأكيد الاستلام</button>`}</article>`).join('');
  }
  function open(){render();ensure().showModal();}
  function add(n){const v=read();v.push({...n,id:crypto.randomUUID?.()||String(Date.now()+Math.random()),createdAt:Date.now(),readBy:[]});save(v);beep();update();}
  function manager(){if(user().selectedRole!=='admin')return open();const p=ensure();p.querySelector('#lv-notifications-content').innerHTML=`<h2>لوحة مدير قسم الشؤون القانونية</h2><p class="lv-notice-help">إرسال إعلام أو تنبيه أو تحذير أو توجيه إلى شعبة أو إلى الشعب الثلاث.</p><form id="lv-notice-form"><label>المستلم<select name="target"><option value="all">الشعب والوحدات الثلاث</option><option value="lawsuits">${depts.lawsuits}</option><option value="investigations">${depts.investigations}</option><option value="followup">${depts.followup}</option></select></label><label>النوع<select name="kind"><option value="info">إعلام</option><option value="alert">تنبيه</option><option value="warning">تحذير</option><option value="directive">توجيه</option></select></label><label>العنوان<input name="title" required maxlength="120"></label><label>الرسالة<textarea name="body" required maxlength="2000" rows="5"></textarea></label><label class="lv-check"><input type="checkbox" name="sound" checked> تفعيل الصوت للمستلمين</label><button>إرسال الرسالة</button></form><hr><div id="lv-manager-history"></div>`;
    p.querySelector('#lv-notice-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),labels={info:'إعلام',alert:'تنبيه',warning:'تحذير',directive:'توجيه'};add({target:f.get('target'),kind:f.get('kind'),kindLabel:labels[f.get('kind')],title:f.get('title'),body:f.get('body'),from:'مدير قسم الشؤون القانونية',sound:f.has('sound')});e.target.reset();alert('تم إرسال الرسالة وحفظها لجميع المستلمين.');};p.showModal();
  }
  function update(){const b=document.querySelector('[data-lv-bell]');if(b)b.textContent='🔔 '+(unread()?`(${unread()})`:'');}
  function mount(){if(window!==parent)return;const bar=document.createElement('div');bar.className='lv-toolbar no-print';bar.innerHTML='<button type="button" data-lv-bell>🔔</button><button type="button" data-lv-manager>مدير قسم الشؤون القانونية</button>';document.body.prepend(bar);bar.querySelector('[data-lv-bell]').onclick=open;bar.querySelector('[data-lv-manager]').onclick=manager;bar.querySelector('[data-lv-manager]').hidden=user().selectedRole!=='admin';update();window.addEventListener('storage',e=>{if(e.key===KEY){beep();update();}});}
  window.LVNotify={open,manager,add,unread};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
