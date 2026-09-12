(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const base = () => (window.SARA_API_BASE || localStorage.getItem('sara_api_base') || location.origin).replace(/\/$/, '');
  const api = (p, o = {}) => fetch(base() + p, o);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function inject() {
    const tab = $('tab-tiktok');
    if (!tab || $('saraTikTokAdvanced')) return;
    const style = document.createElement('style');
    style.textContent = `.sara-tt-advanced{display:grid;gap:12px;margin-top:12px}.sara-tt-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.sara-tt-stat{padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.03)}.sara-tt-stat b{display:block;font-size:21px}.sara-tt-stat small{opacity:.65}.sara-tt-box{display:grid;gap:9px}.sara-tt-box textarea,.sara-tt-box input,.sara-tt-box select{width:100%;box-sizing:border-box}.sara-tt-plan{white-space:pre-wrap;max-height:300px;overflow:auto;padding:12px;border-radius:10px;background:rgba(0,0,0,.18);font-size:12px;line-height:1.55}.sara-tt-consent{display:flex;gap:7px;font-size:12px;opacity:.8}.sara-tt-consent input{width:auto}.sara-tt-queue{display:grid;gap:7px}.sara-tt-job{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:10px}.sara-tt-job small{display:block;opacity:.6}@media(max-width:850px){.sara-tt-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
    document.head.appendChild(style);
    const box = document.createElement('div');
    box.id = 'saraTikTokAdvanced'; box.className = 'sara-tt-advanced';
    box.innerHTML = `
      <div class="tool-box sara-tt-box"><h3>🚀 SARA Growth & Analytics</h3><div class="sara-tt-stats"><div class="sara-tt-stat"><b id="saraTTFollowers">—</b><small>Followers</small></div><div class="sara-tt-stat"><b id="saraTTLikes">—</b><small>Total likes</small></div><div class="sara-tt-stat"><b id="saraTTVideos">—</b><small>Videos</small></div><div class="sara-tt-stat"><b id="saraTTViews">—</b><small>Recent views</small></div></div><button id="saraTTRefresh" class="action">Refresh analytics</button><pre id="saraTTAnalytics"></pre></div>
      <div class="tool-box sara-tt-box"><h3>🤖 AI Content Factory</h3><input id="saraTTNiche" placeholder="Niche / topic"><select id="saraTTTone"><option>Natural Pakistani Urdu</option><option>Roman Urdu + English</option><option>Funny / energetic</option><option>Professional / informative</option></select><div class="tool-actions"><button id="saraTTPlan" class="primary">Generate 7-Day Plan</button><button id="saraTTGrowth" class="action">Growth Strategy</button></div><div id="saraTTPlanOut" class="sara-tt-plan">Plan will appear here…</div></div>
      <div class="tool-box sara-tt-box"><h3>📅 Human-approved Content Queue</h3><p class="hint">SARA prepares the queue, but posting requires your explicit approval. This follows TikTok's current developer posting requirements.</p><input id="saraTTTitle" placeholder="Caption / title"><input id="saraTTVideo" type="url" placeholder="HTTPS video URL"><input id="saraTTTime" type="datetime-local"><label class="sara-tt-consent"><input id="saraTTConsent" type="checkbox"><span>I reviewed this content and consent to sending it to TikTok.</span></label><div class="tool-actions"><button id="saraTTQueueAdd" class="action">Add to queue</button><button id="saraTTPost" class="primary">Post now</button></div><div id="saraTTQueue" class="sara-tt-queue"></div></div>`;
    tab.appendChild(box);
    bind(); renderQueue();
  }

  async function refresh() {
    try {
      const r = await api('/api/tiktok/profile'); const d = await r.json(); const u = d?.data?.user;
      if (!r.ok || !u) { $('saraTTAnalytics').textContent = JSON.stringify(d, null, 2); return; }
      $('saraTTFollowers').textContent = Number(u.follower_count || 0).toLocaleString();
      $('saraTTLikes').textContent = Number(u.likes_count || 0).toLocaleString();
      $('saraTTVideos').textContent = Number(u.video_count || 0).toLocaleString();
      const vr = await api('/api/tiktok/videos?max_count=20'); const vd = await vr.json(); const vs = vd?.data?.videos || [];
      $('saraTTViews').textContent = vs.reduce((n, v) => n + Number(v.view_count || 0), 0).toLocaleString();
      $('saraTTAnalytics').textContent = `@${u.username || ''} · ${u.display_name || 'TikTok'}\nVerified: ${u.is_verified ? 'Yes' : 'No'}\nRecent videos: ${vs.length}`;
    } catch (e) { $('saraTTAnalytics').textContent = 'Analytics unavailable: ' + e.message; }
  }

  async function ai(prompt) {
    try { const r = await api('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sessionId:localStorage.getItem('sara_session') || crypto.randomUUID(), message:prompt}) }); const d = await r.json(); return d.answer || d.error || 'No response.'; }
    catch { return 'AI content service unavailable.'; }
  }

  const key = 'sara_tiktok_advanced_queue';
  const getQ = () => JSON.parse(localStorage.getItem(key) || '[]');
  const saveQ = q => { localStorage.setItem(key, JSON.stringify(q)); renderQueue(); };
  function renderQueue(){ const q=getQ(); const el=$('saraTTQueue'); if(!el)return; el.innerHTML=q.length?q.map((j,i)=>`<div class="sara-tt-job"><div><b>${esc(j.title || 'Untitled')}</b><small>${new Date(j.time).toLocaleString()} · ${j.status || 'Queued'}</small></div><button class="action" data-sara-post="${i}">Post</button></div>`).join(''):'<span class="hint">Queue empty.</span>'; el.querySelectorAll('[data-sara-post]').forEach(b=>b.onclick=()=>postQueued(Number(b.dataset.saraPost))); }
  async function postPayload(title, videoUrl){ if(!$('saraTTConsent').checked){alert('Pehle consent checkbox select karein.');return;} if(!/^https:\/\//i.test(videoUrl)){alert('HTTPS video URL required hai.');return;} const r=await api('/api/tiktok/post-url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videoUrl,title,privacyLevel:'SELF_ONLY'})}); const d=await r.json(); $('saraTTAnalytics').textContent=JSON.stringify(d,null,2); return r.ok; }
  async function postQueued(i){ const q=getQ(),j=q[i]; if(!j)return; if(!confirm('Is queued post ko TikTok par send karna hai?'))return; const ok=await postPayload(j.title,j.videoUrl); j.status=ok?'Sent to TikTok':'Failed'; saveQ(q); }
  function bind(){
    $('saraTTRefresh').onclick=refresh;
    $('saraTTPlan').onclick=async()=>{ $('saraTTPlanOut').textContent='SARA is creating your 7-day plan…'; const niche=$('saraTTNiche').value.trim()||'AI creator'; $('saraTTPlanOut').textContent=await ai(`Create a practical 7-day TikTok content plan for SARA. Niche: ${niche}. Tone: ${$('saraTTTone').value}. Give 2 ideas per day, first-2-second hook, short caption, 4-6 hashtags and CTA. Do not promise virality or fake engagement.`); };
    $('saraTTGrowth').onclick=async()=>{ $('saraTTPlanOut').textContent='SARA is creating the growth strategy…'; $('saraTTPlanOut').textContent=await ai('Create an advanced realistic TikTok growth system: content pillars, retention hooks, posting cadence, comment prompts, LIVE topics, weekly analytics review and conversion to followers. Never suggest bots, fake followers, fake views, spam or mass-following.'); };
    $('saraTTQueueAdd').onclick=()=>{const title=$('saraTTTitle').value.trim(),videoUrl=$('saraTTVideo').value.trim(),time=$('saraTTTime').value;if(!title||!videoUrl||!time){alert('Caption, video URL aur time fill karein.');return}if(!$('saraTTConsent').checked){alert('Consent checkbox select karein.');return}const q=getQ();q.push({title,videoUrl,time,status:'Queued'});saveQ(q);};
    $('saraTTPost').onclick=()=>postPayload($('saraTTTitle').value.trim(),$('saraTTVideo').value.trim());
  }

  inject();
  document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.tab==='tiktok'){setTimeout(refresh,80);}}));
})();