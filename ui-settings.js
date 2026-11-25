/* Shared presentation preferences. Business records and credentials are untouched. */
(() => {
  'use strict';
  const KEY = 'legal_ui_preferences_v1';
  const defaults = {mode:'light', accent:'blue', scale:100, style:'soft', idle:15, margin:8};
  const colors = {blue:'#2563eb',emerald:'#047857',purple:'#7c3aed',rose:'#be123c',gold:'#a16207',slate:'#475569'};
  function clean(value = {}) {
    const number = (v,min,max,fallback) => Number.isFinite(Number(v)) ? Math.min(max,Math.max(min,Math.round(Number(v)))) : fallback;
    return {mode:value.mode==='dark'?'dark':'light', accent:colors[value.accent]?value.accent:'blue',
      scale:number(value.scale,85,150,100),style:['soft','flat','contrast'].includes(value.style)?value.style:'soft',
      idle:number(value.idle,1,120,15),margin:number(value.margin,5,25,8)};
  }
  function read(){try{return clean(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{return {...defaults};}}
  let state = read();
  const host = () => parent!==window && parent.LVUX ? parent.LVUX : window.LVUX;
  function set(patch){
    if(parent!==window && parent.LVUX)return parent.LVUX.set(patch);
    const next=clean({...state,...patch});
    try{localStorage.setItem(KEY,JSON.stringify(next));}catch{alert('تعذر حفظ الإعدادات. تحقق من مساحة التخزين.');return;}
    apply(next);document.querySelectorAll('iframe.sub-frame').forEach(f=>{try{f.contentWindow.LVUX?.apply(next);}catch{}});
  }
  function apply(next){
    state=clean(next);const root=document.documentElement;
    root.dataset.lvMode=state.mode;root.dataset.lvStyle=state.style;
    root.classList.toggle('dark',state.mode==='dark');root.classList.toggle('light',state.mode==='light');
    root.style.setProperty('--lv-scale',state.scale/100);root.style.setProperty('--lv-accent',colors[state.accent]);
    root.style.setProperty('--theme-accent',colors[state.accent]);
    document.querySelectorAll('[data-lv-field]').forEach(el=>{if(document.activeElement!==el)el.value=state[el.dataset.lvField];});
    document.querySelectorAll('[data-lv-scale]').forEach(el=>el.textContent=state.scale+'%');
    const icon=document.getElementById('header-theme-icon');if(icon)icon.className='fa-solid fa-'+(state.mode==='dark'?'sun':'moon');
    // Keep Alpine's existing theme button and model aligned with the shared setting.
    try{const el=document.querySelector('[x-data]');if(el&&window.Alpine)Alpine.$data(el).darkMode=state.mode==='dark';}catch{}
  }
  function lock(){const security=parent!==window?parent.SecUI:window.SecUI;if(security)security.lockNow();}
  function panel(){
    const section=document.createElement('section');section.className='lv-preferences no-print';
    section.innerHTML=`<h3>المظهر والخط والطباعة والأمان — جميع الشعب والوحدات</h3>
      <div class="lv-fields">
      <label>المظهر<select data-lv-field="mode"><option value="light">نهاري</option><option value="dark">داكن</option></select></label>
      <label>لون النظام<select data-lv-field="accent"><option value="blue">أزرق</option><option value="emerald">أخضر</option><option value="purple">بنفسجي</option><option value="rose">وردي</option><option value="gold">ذهبي</option><option value="slate">رمادي</option></select></label>
      <label>نمط الواجهة<select data-lv-field="style"><option value="soft">ناعم</option><option value="flat">مسطّح</option><option value="contrast">تباين مرتفع</option></select></label>
      <div><span>حجم خط الشاشة</span><div class="lv-font-controls"><button type="button" data-lv-action="smaller" aria-label="تصغير الخط">أ−</button><output data-lv-scale aria-live="polite"></output><button type="button" data-lv-action="larger" aria-label="تكبير الخط">أ+</button><button type="button" data-lv-action="reset">100%</button></div></div>
      <label>قفل بعد خمول (دقيقة)<input type="number" min="1" max="120" step="1" data-lv-field="idle"></label>
      <label>هامش الطباعة (ملم)<input type="number" min="5" max="25" step="1" data-lv-field="margin"></label>
      </div><p>تُحفظ الإعدادات تلقائيًا وتُطبّق على جميع الشعب والوحدات. تكبير الشاشة لا يغيّر حجم الخط المطبوع. اتجاه الورقة يُحدّد من لوحة طباعة التقرير.</p>
      <button type="button" data-lv-action="lock">قفل الشاشة الآن</button>`;
    section.addEventListener('change',e=>{const key=e.target.dataset.lvField;if(key){if(!e.target.checkValidity()){e.target.reportValidity();return;}set({[key]:e.target.value});}});
    section.addEventListener('click',e=>{const action=e.target.closest('[data-lv-action]')?.dataset.lvAction;
      if(action==='lock')lock();if(action==='reset')set({scale:100});if(action==='larger'||action==='smaller')set({scale:state.scale+(action==='larger'?5:-5)});});
    return section;
  }
  let dialog;
  function open(){if(!dialog){dialog=document.createElement('dialog');dialog.className='lv-dialog no-print';dialog.setAttribute('aria-label','إعدادات العرض والأمان');
    const close=document.createElement('button');close.type='button';close.textContent='إغلاق';close.onclick=()=>dialog.close();dialog.append(close,panel());document.body.append(dialog);}
    apply(host().get());dialog.showModal();}
  function printStyle(){
    let sheet=document.getElementById('lv-print-page');if(!sheet){sheet=document.createElement('style');sheet.id='lv-print-page';}
    sheet.textContent=`@media print{@page{margin:${state.margin}mm!important;}html{font-size:16px!important;}}`;
    document.head.append(sheet);
  }
  window.LVUX={set,apply,get:()=>({...state}),open,lock,clean};
  function mount(){
    const bar=document.createElement('div');bar.className='lv-toolbar no-print';
    for(const [text,fn] of [['إعدادات العرض والأمان',open],['قفل الشاشة',lock]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;bar.append(b);}
    const header=document.querySelector('header');
    if(header)header.append(bar);else document.body.prepend(bar);
    const native=document.querySelector('#settings-tab-appearance')||document.querySelector('section[x-show="activeTab === \'settings\'"]');
    if(native)native.prepend(panel());
    if(parent===window){const shell=document.querySelector('#inv-security-btn')?.parentElement;if(shell){const copy=bar.cloneNode(true);copy.querySelectorAll('button')[0].onclick=open;copy.querySelectorAll('button')[1].onclick=lock;shell.prepend(copy);}}
    document.addEventListener('click',e=>{
      const button=e.target.closest('button');if(!button)return;
      const action=(button.getAttribute('onclick')||button.getAttribute('@click')||'');
      if(action.includes('toggleDarkMode(')){e.preventDefault();e.stopImmediatePropagation();set({mode:state.mode==='dark'?'light':'dark'});}
      const accent=action.match(/(?:setAccentTheme|setThemeColor)\('([^']+)'/);
      if(accent){e.preventDefault();e.stopImmediatePropagation();set({accent:accent[1]==='sky'?'blue':accent[1]});}
      if(action.trim()==='lockSystem()'){e.preventDefault();e.stopImmediatePropagation();lock();}
    },true);
    document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.altKey&&e.code==='KeyL'){e.preventDefault();lock();}});
    window.addEventListener('beforeprint',printStyle);
    window.addEventListener('storage',e=>{if(e.key===KEY)apply(read());});
    apply(parent!==window&&parent.LVUX?parent.LVUX.get():read());
    window.addEventListener('load',()=>apply(host().get()),{once:true});
    // Parent can close modal dialogs before locking; they otherwise sit above all z-index overlays.
    window.addEventListener('lv-lock',()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
