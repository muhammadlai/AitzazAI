(() => {
  'use strict';
  const MEMORY_KEY='sara_memory_v1', VOICE_KEY='sara_voice_mode_v1', MAX=40;
  const load=()=>{try{return JSON.parse(localStorage.getItem(MEMORY_KEY)||'[]')}catch{return[]}};
  const save=x=>{try{localStorage.setItem(MEMORY_KEY,JSON.stringify(x.slice(-MAX)))}catch{}};
  let memory=load(), mode=localStorage.getItem(VOICE_KEY)||'urdu-hindi', initialized=false;
  let recognition=null, listening=false, autoListen=true, waiting=false;
  const updateCount=()=>{const c=document.getElementById('memoryCount');if(c)c.textContent=String(memory.length*2)};
  const addMemory=(q,a)=>{q=String(q||'').trim();a=String(a||'').trim();if(!q||!a)return;memory.push({q:q.slice(0,1000),a:a.slice(0,1800),t:Date.now()});save(memory);updateCount()};
  const context=()=>memory.slice(-12).map(x=>`User: ${x.q}\nSARA: ${x.a}`).join('\n---\n').slice(-10000);
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input?.url||'');
    if(/\/api\/chat(?:\?|$)/.test(url)&&init?.body){
      try{const body=JSON.parse(init.body),q=String(body.message||'').trim(),mem=context();if(q&&mem)body.message=`[SARA MEMORY — use naturally; do not mention this block unless asked]\n${mem}\n---\nCURRENT USER QUESTION:\n${q}`;const response=await originalFetch(input,{...init,body:JSON.stringify(body)});try{const data=await response.clone().json();if(response.ok&&data.answer)addMemory(q,data.answer)}catch{};return response}catch{}
    }
    return originalFetch(input,init);
  };
  const voices=()=>window.speechSynthesis?.getVoices?.()||[];
  function pickVoice(text){
    const vs=voices();if(!vs.length)return null;const s=String(text||''),urdu=/[\u0600-\u06FF]/.test(s)||/\b(assalam|ao|aap|apka|mera|mujhe|mein|main|hai|hain|kya|kar|karo|hoon|kaise|acha|achha|kyun|nahi|nahin)\b/i.test(s);
    if(mode==='american')return vs.find(v=>/^en-US$/i.test(v.lang))||vs.find(v=>/^en-US/i.test(v.lang))||vs.find(v=>/US|American|Google US|Samantha|Jenny/i.test(v.name||''))||vs.find(v=>/^en/i.test(v.lang))||vs[0];
    if(mode==='hindi')return vs.find(v=>/^hi-IN$/i.test(v.lang))||vs.find(v=>/^hi-/i.test(v.lang))||vs.find(v=>/Hindi|India/i.test(v.name||''))||vs.find(v=>/^en/i.test(v.lang))||vs[0];
    if(mode==='urdu')return vs.find(v=>/^ur-PK$/i.test(v.lang))||vs.find(v=>/^ur-/i.test(v.lang))||vs.find(v=>/Urdu|Pakistan/i.test(v.name||''))||vs.find(v=>/^hi-IN/i.test(v.lang))||vs[0];
    if(urdu)return vs.find(v=>/^ur-PK$/i.test(v.lang))||vs.find(v=>/^ur-/i.test(v.lang))||vs.find(v=>/Urdu|Pakistan/i.test(v.name||''))||vs.find(v=>/^hi-IN/i.test(v.lang))||vs[0];
    return vs.find(v=>/^en-US$/i.test(v.lang))||vs.find(v=>/^en-US/i.test(v.lang))||vs.find(v=>/^hi-IN/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang))||vs[0];
  }
  const cleanSpeechText=text=>String(text||'').replace(/```[\s\S]*?```/g,' ').replace(/https?:\/\/\S+/g,' ').replace(/[*_#`]/g,'').replace(/\s+/g,' ').trim();
  function chunks(text,max=240){const s=cleanSpeechText(text);if(!s)return[];const parts=[];let rest=s;while(rest.length>max){let cut=Math.max(rest.lastIndexOf('. ',max),rest.lastIndexOf('! ',max),rest.lastIndexOf('? ',max),rest.lastIndexOf('، ',max),rest.lastIndexOf(', ',max),rest.lastIndexOf(' ',max));if(cut<80)cut=max;parts.push(rest.slice(0,cut+1).trim());rest=rest.slice(cut+1).trim()}if(rest)parts.push(rest);return parts}
  const setSpeaking=v=>{try{window.SARA_SET_SPEAKING?.(!!v)}catch{}};
  function setState(t){const s=document.getElementById('voiceState');if(s)s.textContent=t}
  function recognitionLang(){return mode==='american'?'en-US':mode==='hindi'?'hi-IN':'ur-PK'}
  function stopListening(){try{recognition?.abort()}catch{}listening=false}
  function startListening(){
    if(!autoListen||listening||waiting||window.speechSynthesis?.speaking||typeof window.send!=='function')return false;
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setState('Mic: browser speech recognition unsupported');return false}
    if(!recognition){recognition=new SR();recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1;
      recognition.onstart=()=>{listening=true;setState('🎙️ SARA listening…')};
      recognition.onresult=e=>{const text=Array.from(e.results).filter(x=>x.isFinal).map(x=>x[0].transcript).join(' ').trim();if(text){waiting=true;stopListening();window.send(text)}};
      recognition.onerror=e=>{listening=false;if(e.error==='not-allowed'||e.error==='service-not-allowed')setState('🎙️ Microphone permission needed');else setState('Mic: '+e.error)};
      recognition.onend=()=>{listening=false;if(autoListen&&!waiting&&!window.speechSynthesis?.speaking)setTimeout(startListening,700)};
    }
    recognition.lang=recognitionLang();try{recognition.start();return true}catch{return false}
  }
  function resumeListening(){waiting=false;if(autoListen&&!window.speechSynthesis?.speaking)setTimeout(startListening,700)}
  function patchSpeech(){
    if(!window.speechSynthesis||window.speechSynthesis.__saraPatched)return;const synth=window.speechSynthesis,original=synth.speak.bind(synth);synth.cancel();
    synth.speak=function(utterance){try{const v=pickVoice(utterance?.text);if(v){utterance.voice=v;utterance.lang=mode==='urdu'?'ur-PK':mode==='hindi'?'hi-IN':mode==='american'?'en-US':v.lang||'en-US'}utterance.rate=.92;utterance.pitch=1.04;utterance.volume=1;utterance.onstart=()=>{stopListening();setSpeaking(true);setState('Voice engine: speaking')};const done=()=>{setSpeaking(false);setState('Voice engine: ready');resumeListening()};utterance.onend=done;utterance.onerror=done}catch{}return original(utterance)};
    synth.__saraPatched=true;synth.addEventListener?.('voiceschanged',()=>buildVoiceUI());
  }
  function speakLong(text){if(!window.speechSynthesis)return false;const list=chunks(text);if(!list.length)return false;try{stopListening();window.speechSynthesis.cancel();setSpeaking(true);setState('Voice engine: speaking');let i=0;const next=()=>{if(i>=list.length){setSpeaking(false);setState('Voice engine: ready');resumeListening();return}const u=new SpeechSynthesisUtterance(list[i++]),v=pickVoice(u.text);if(v){u.voice=v;u.lang=mode==='urdu'?'ur-PK':mode==='hindi'?'hi-IN':mode==='american'?'en-US':v.lang||'en-US'}u.rate=.92;u.pitch=1.04;u.volume=1;u.onend=next;u.onerror=next;window.speechSynthesis.speak(u)};next();return true}catch{setSpeaking(false);resumeListening();return false}}
  function buildVoiceUI(){
    const bar=document.querySelector('.voicebar');if(!bar)return;bar.querySelectorAll('#mic,#mic + *').forEach(()=>{});const mic=document.getElementById('mic');if(mic)mic.style.display='none';
    let select=document.getElementById('saraVoiceMode');
    if(!select){const label=document.createElement('label');label.id='saraVoiceLabel';label.style.cssText='display:flex;align-items:center;gap:6px;font-size:12px';label.innerHTML='🌐 <span>Accent</span>';select=document.createElement('select');select.id='saraVoiceMode';select.style.cssText='padding:7px 9px;border-radius:9px;background:#111522;color:inherit;border:1px solid rgba(255,255,255,.18)';[['urdu-hindi','Urdu + Hindi Auto'],['urdu','Urdu · Pakistan'],['hindi','Hindi · India'],['american','American English']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;select.appendChild(o)});select.onchange=()=>{mode=select.value;localStorage.setItem(VOICE_KEY,mode);try{speechSynthesis.cancel();setSpeaking(false);if(recognition)recognition.lang=recognitionLang()}catch{};resumeListening()};label.appendChild(select);bar.appendChild(label)}select.value=mode;
  }
  function restore(){const box=document.getElementById('messages');if(!box||box.children.length||typeof window.addMsg!=='function')return false;memory.slice(-20).forEach(x=>{window.addMsg('you',x.q);window.addMsg('sara',x.a)});updateCount();return true}
  function clear(){memory=[];save(memory);updateCount()}
  function init(){if(initialized)return;initialized=true;patchSpeech();buildVoiceUI();updateCount();window.SARA_BROWSER_SPEAK=speakLong;try{window.DID_AGENTS_API={functions:{speak:async({input})=>{const ok=speakLong(input);if(!ok)throw new Error('Browser speech unavailable');return{ok:true}}}}}catch{};let tries=0;const timer=setInterval(()=>{buildVoiceUI();restore();if(++tries>20){clearInterval(timer);if(typeof window.send==='function')setTimeout(startListening,900)}},250)}
  window.SARA_AUTO_LISTEN={start:startListening,stop:()=>{autoListen=false;stopListening()},resume:()=>{autoListen=true;resumeListening()}};window.SARA_MEMORY={get:()=>memory.slice(),clear,add:addMemory,init};init();
})();
