(() => {
  'use strict';
  const MEMORY_KEY='sara_memory_v1';
  const VOICE_KEY='sara_voice_mode_v1';
  const MAX=40;
  const load=()=>{try{return JSON.parse(localStorage.getItem(MEMORY_KEY)||'[]')}catch{return[]}};
  const save=x=>{try{localStorage.setItem(MEMORY_KEY,JSON.stringify(x.slice(-MAX)))}catch{}};
  let memory=load();
  let mode=localStorage.getItem(VOICE_KEY)||'urdu-hindi';

  function addMemory(q,a){
    if(!q||!a)return;
    memory.push({q:String(q).slice(0,1000),a:String(a).slice(0,1800),t:Date.now()});
    save(memory);
    const c=document.getElementById('memoryCount');if(c)c.textContent=String(memory.length*2);
  }
  function context(){
    return memory.slice(-12).map(x=>`User: ${x.q}\nSARA: ${x.a}`).join('\n---\n').slice(-10000);
  }

  // Keep every question/answer in browser storage and feed recent memory back to SARA.
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input?.url||'');
    if(/\/api\/chat(?:\?|$)/.test(url) && init?.body){
      try{
        const body=JSON.parse(init.body);
        const q=String(body.message||'').trim();
        const mem=context();
        if(q&&mem){
          body.message=`[SARA MEMORY — use this context naturally; do not mention this memory block unless asked]\n${mem}\n---\nCURRENT USER QUESTION:\n${q}`;
        }
        init={...init,body:JSON.stringify(body)};
        const response=await originalFetch(input,init);
        try{const clone=response.clone();const data=await clone.json();if(response.ok&&data.answer)addMemory(q,data.answer)}catch{}
        return response;
      }catch{}
    }
    return originalFetch(input,init);
  };

  function pickVoice(text){
    if(!window.speechSynthesis)return null;
    const voices=window.speechSynthesis.getVoices();
    if(!voices.length)return null;
    const lower=String(text||'').toLowerCase();
    const wantUrdu=mode==='urdu'||(mode==='urdu-hindi'&&(/[\u0600-\u06ff]/.test(lower)||/\b(ao|assalam|hai|hain|aap|tum|kya|mujhe|apka|mera|mein|kar|karo|hoon|kaise)\b/.test(lower)));
    const lang=wantUrdu?'ur':'hi';
    const exact=voices.find(v=>v.lang?.toLowerCase().startsWith(lang));
    if(exact)return exact;
    const broad=voices.find(v=>/urdu|hindi|india|pakistan/i.test(v.name||'') && (v.lang||'').toLowerCase().startsWith(lang==='ur'?'ur':'hi'));
    if(broad)return broad;
    return voices.find(v=>(v.lang||'').toLowerCase().startsWith('hi'))||voices.find(v=>(v.lang||'').toLowerCase().startsWith('ur'))||null;
  }

  if(window.speechSynthesis){
    const originalSpeak=window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak=function(u){
      try{
        const v=pickVoice(u.text);
        if(v)u.voice=v;
        if(mode==='urdu')u.lang='ur-PK';
        else if(mode==='hindi')u.lang='hi-IN';
        else u.lang=v?.lang || (/[\u0600-\u06ff]/.test(u.text)?'ur-PK':'hi-IN');
        u.rate=.94;u.pitch=1.06;
      }catch{}
      return originalSpeak(u);
    };
  }

  function buildVoiceUI(){
    const bar=document.querySelector('.voicebar');if(!bar||document.getElementById('saraVoiceMode'))return;
    const label=document.createElement('label');label.style.cssText='display:flex;align-items:center;gap:6px;font-size:12px';label.innerHTML='🌐 <span>Accent</span>';
    const select=document.createElement('select');select.id='saraVoiceMode';select.style.cssText='padding:7px 9px;border-radius:9px;background:rgba(255,255,255,.06);color:inherit;border:1px solid rgba(255,255,255,.12)';
    [['urdu-hindi','Urdu + Hindi (Auto)'],['urdu','Urdu · Pakistan'],['hindi','Hindi · India']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;select.appendChild(o)});
    select.value=mode;select.onchange=()=>{mode=select.value;localStorage.setItem(VOICE_KEY,mode)};label.appendChild(select);bar.appendChild(label);
  }
  function restore(){
    const box=document.getElementById('messages');if(!box)return;
    if(box.children.length)return;
    memory.slice(-20).forEach(x=>{if(typeof window.addMsg==='function'){window.addMsg('you',x.q);window.addMsg('sara',x.a)}});
    const c=document.getElementById('memoryCount');if(c)c.textContent=String(memory.length*2);
  }
  function clear(){memory=[];save(memory);const c=document.getElementById('memoryCount');if(c)c.textContent='0'}
  window.SARA_MEMORY={get:()=>memory.slice(),clear,add:addMemory};
  setTimeout(()=>{buildVoiceUI();restore()},700);
  window.addEventListener('load',()=>setTimeout(()=>{buildVoiceUI();restore()},400));
})();
