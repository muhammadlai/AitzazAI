(() => {
  'use strict';
  const MEMORY_KEY='sara_memory_v1';
  const VOICE_KEY='sara_voice_mode_v1';
  const MAX=40;
  const load=()=>{try{return JSON.parse(localStorage.getItem(MEMORY_KEY)||'[]')}catch{return[]}};
  const save=x=>{try{localStorage.setItem(MEMORY_KEY,JSON.stringify(x.slice(-MAX)))}catch{}};
  let memory=load();
  let mode=localStorage.getItem(VOICE_KEY)||'urdu-hindi';
  let initialized=false;

  function updateCount(){const c=document.getElementById('memoryCount');if(c)c.textContent=String(memory.length*2)}
  function addMemory(q,a){
    q=String(q||'').trim();a=String(a||'').trim();if(!q||!a)return;
    memory.push({q:q.slice(0,1000),a:a.slice(0,1800),t:Date.now()});
    save(memory);updateCount();
  }
  function context(){return memory.slice(-12).map(x=>`User: ${x.q}\nSARA: ${x.a}`).join('\n---\n').slice(-10000)}

  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input?.url||'');
    if(/\/api\/chat(?:\?|$)/.test(url)&&init?.body){
      try{
        const body=JSON.parse(init.body);const q=String(body.message||'').trim();const mem=context();
        if(q&&mem)body.message=`[SARA MEMORY — use naturally; do not mention this block unless asked]\n${mem}\n---\nCURRENT USER QUESTION:\n${q}`;
        const response=await originalFetch(input,{...init,body:JSON.stringify(body)});
        try{const data=await response.clone().json();if(response.ok&&data.answer)addMemory(q,data.answer)}catch{}
        return response;
      }catch{}
    }
    return originalFetch(input,init);
  };

  function voices(){return window.speechSynthesis?.getVoices?.()||[]}
  function pickVoice(text){
    const vs=voices();if(!vs.length)return null;const s=String(text||'');
    const urdu=/[\u0600-\u06FF]/.test(s)||/\b(assalam|ao|aap|apka|mera|mujhe|mein|main|hai|hain|kya|kar|karo|hoon|kaise|acha|achha|kyun|nahi|nahin)\b/i.test(s);
    const wanted=mode==='urdu'||(mode==='urdu-hindi'&&urdu)?'ur':'hi';
    return vs.find(v=>String(v.lang||'').toLowerCase()===wanted+'-pk')
      ||vs.find(v=>String(v.lang||'').toLowerCase().startsWith(wanted+'-'))
      ||vs.find(v=>new RegExp(wanted==='ur'?'urdu|pakistan':'hindi|india','i').test(v.name||''))
      ||vs.find(v=>String(v.lang||'').toLowerCase().startsWith('hi-'))
      ||vs.find(v=>String(v.lang||'').toLowerCase().startsWith('en-'))
      ||vs[0];
  }
  function cleanSpeechText(text){
    return String(text||'').replace(/```[\s\S]*?```/g,' ').replace(/https?:\/\/\S+/g,' ').replace(/[*_#`]/g,'').replace(/\s+/g,' ').trim();
  }
  function chunks(text,max=240){
    const s=cleanSpeechText(text);if(!s)return[];
    const parts=[];let rest=s;
    while(rest.length>max){
      let cut=Math.max(rest.lastIndexOf('. ',max),rest.lastIndexOf('! ',max),rest.lastIndexOf('? ',max),rest.lastIndexOf('، ',max),rest.lastIndexOf(', ',max),rest.lastIndexOf(' ',max));
      if(cut<80)cut=max;
      parts.push(rest.slice(0,cut+1).trim());rest=rest.slice(cut+1).trim();
    }
    if(rest)parts.push(rest);return parts;
  }
  function setSpeaking(v){try{window.SARA_SET_SPEAKING?.(!!v)}catch{}}
  function patchSpeech(){
    if(!window.speechSynthesis||window.speechSynthesis.__saraPatched)return;
    const synth=window.speechSynthesis,original=synth.speak.bind(synth);
    synth.cancel();
    synth.speak=function(utterance){
      try{
        const v=pickVoice(utterance?.text);
        if(v){utterance.voice=v;utterance.lang=mode==='urdu'?'ur-PK':mode==='hindi'?'hi-IN':v.lang||'hi-IN'}
        utterance.rate=.92;utterance.pitch=1.04;utterance.volume=1;
        utterance.onstart=()=>{setSpeaking(true);const s=document.getElementById('voiceState');if(s)s.textContent='Voice engine: speaking'};
        const done=()=>{setSpeaking(false);const s=document.getElementById('voiceState');if(s)s.textContent='Voice engine: ready'};
        utterance.onend=done;utterance.onerror=done;
      }catch{}
      return original(utterance);
    };
    synth.__saraPatched=true;
    synth.addEventListener?.('voiceschanged',()=>buildVoiceUI());
  }
  function speakLong(text){
    if(!window.speechSynthesis)return false;
    const list=chunks(text);if(!list.length)return false;
    try{window.speechSynthesis.cancel();setSpeaking(true);let i=0;
      const next=()=>{if(i>=list.length){setSpeaking(false);const s=document.getElementById('voiceState');if(s)s.textContent='Voice engine: ready';return}
        const u=new SpeechSynthesisUtterance(list[i++]);u.__saraQueue=true;
        const v=pickVoice(u.text);if(v){u.voice=v;u.lang=mode==='urdu'?'ur-PK':mode==='hindi'?'hi-IN':v.lang||'hi-IN'}
        u.rate=.92;u.pitch=1.04;u.volume=1;u.onend=next;u.onerror=next;window.speechSynthesis.speak(u);
      };next();return true;
    }catch{setSpeaking(false);return false}
  }
  function buildVoiceUI(){
    const bar=document.querySelector('.voicebar');if(!bar)return;
    let select=document.getElementById('saraVoiceMode');
    if(!select){
      const label=document.createElement('label');label.id='saraVoiceLabel';label.style.cssText='display:flex;align-items:center;gap:6px;font-size:12px';label.innerHTML='🌐 <span>Accent</span>';
      select=document.createElement('select');select.id='saraVoiceMode';select.style.cssText='padding:7px 9px;border-radius:9px;background:#111522;color:inherit;border:1px solid rgba(255,255,255,.18)';
      [['urdu-hindi','Urdu + Hindi (Auto)'],['urdu','Urdu · Pakistan'],['hindi','Hindi · India']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;select.appendChild(o)});
      select.onchange=()=>{mode=select.value;localStorage.setItem(VOICE_KEY,mode);try{speechSynthesis.cancel();setSpeaking(false)}catch{} };
      label.appendChild(select);bar.appendChild(label);
    }
    select.value=mode;
  }
  function restore(){
    const box=document.getElementById('messages');if(!box||box.children.length||typeof window.addMsg!=='function')return false;
    memory.slice(-20).forEach(x=>{window.addMsg('you',x.q);window.addMsg('sara',x.a)});updateCount();return true;
  }
  function clear(){memory=[];save(memory);updateCount()}
  function init(){
    if(initialized)return;initialized=true;patchSpeech();buildVoiceUI();updateCount();
    window.SARA_BROWSER_SPEAK=speakLong;
    let tries=0;const timer=setInterval(()=>{buildVoiceUI();restore();if(++tries>20)clearInterval(timer)},250);
  }
  window.SARA_MEMORY={get:()=>memory.slice(),clear,add:addMemory,init};
  init();
})();
