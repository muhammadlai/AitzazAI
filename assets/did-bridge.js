(() => {
  'use strict';

  // Free SARA Mode: no D-ID connection, no D-ID credits required.
  // Keeps the existing AI chat, browser mic, memory and TikTok tools intact.
  const agent = document.getElementById('sara-agent');
  const status = document.getElementById('status');
  const voiceState = document.getElementById('voiceState');
  const mic = document.getElementById('mic');
  const retry = document.getElementById('retry');
  const stageTag = document.querySelector('.stage-head .tag');

  window.SARA_FREE_MODE = true;

  // Prevent the paid D-ID embed from connecting in this mode.
  const removeDidScripts = () => {
    document.querySelectorAll('script[src*="agent.d-id.com"]').forEach(s => s.remove());
    try { delete window.DID_AGENTS_API; } catch {}
  };
  removeDidScripts();
  const didBlocker = setInterval(removeDidScripts, 500);
  setTimeout(() => clearInterval(didBlocker), 12000);

  if (stageTag) stageTag.textContent = 'Free SARA Mode';
  if (status) {
    status.textContent = 'SARA Free Mode';
    status.className = 'status online';
  }
  if (voiceState) voiceState.textContent = window.speechSynthesis ? 'Voice engine: browser free voice' : 'Voice engine: unavailable';
  if (mic) { mic.disabled = false; mic.title = 'Free browser microphone'; }
  if (retry) { retry.textContent = 'Reset Free Mode'; retry.onclick = () => location.reload(); }

  const style = document.createElement('style');
  style.textContent = `
    #sara-agent.free-sara-stage{position:relative;overflow:hidden;min-height:420px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 18%,rgba(176,104,255,.20),transparent 38%),linear-gradient(145deg,#111522,#090b12 62%,#171021)}
    .free-sara{position:relative;width:min(100%,420px);height:410px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;border-radius:22px}
    .free-glow{position:absolute;width:280px;height:280px;border-radius:50%;background:rgba(174,93,255,.16);filter:blur(42px);top:34px;animation:freeGlow 4s ease-in-out infinite}
    .free-head{position:absolute;top:54px;width:152px;height:184px;border-radius:48% 48% 44% 44%;background:linear-gradient(145deg,#f4c8ad,#d9967e);box-shadow:0 12px 40px rgba(0,0,0,.35);z-index:3}
    .free-hair{position:absolute;top:24px;left:50%;transform:translateX(-50%);width:174px;height:204px;border-radius:52% 52% 42% 42%;background:linear-gradient(150deg,#21191d,#4a3030);z-index:2}
    .free-hair:after{content:"";position:absolute;left:9px;right:9px;top:34px;height:166px;border-radius:48%;background:linear-gradient(150deg,#251b1f,#513536)}
    .free-face{position:absolute;inset:22px 20px 18px;border-radius:46%;background:linear-gradient(145deg,#f5ccb2,#df9e86);z-index:4}
    .free-eye{position:absolute;top:78px;width:13px;height:8px;border-radius:50%;background:#3a2730}
    .free-eye.left{left:48px}.free-eye.right{right:48px}
    .free-brow{position:absolute;top:66px;width:28px;height:5px;border-radius:50%;background:#5a3735;opacity:.75}
    .free-brow.left{left:40px;transform:rotate(-5deg)}.free-brow.right{right:40px;transform:rotate(5deg)}
    .free-nose{position:absolute;top:88px;left:50%;width:8px;height:35px;transform:translateX(-50%);border-right:2px solid rgba(125,72,65,.35);border-radius:50%}
    .free-mouth{position:absolute;top:129px;left:50%;width:30px;height:12px;transform:translateX(-50%);border-bottom:3px solid #9c4d5e;border-radius:0 0 50% 50%;transition:all .12s ease}
    .free-neck{position:absolute;bottom:90px;width:64px;height:92px;border-radius:0 0 30px 30px;background:#dda084;z-index:1}
    .free-body{position:absolute;bottom:-20px;width:280px;height:185px;border-radius:120px 120px 20px 20px;background:linear-gradient(145deg,#28283a,#121320);z-index:0;box-shadow:0 -12px 50px rgba(0,0,0,.3)}
    .free-collar{position:absolute;bottom:132px;width:110px;height:55px;border-left:2px solid rgba(255,255,255,.15);border-right:2px solid rgba(255,255,255,.15);z-index:2;transform:rotate(45deg)}
    .free-badge{position:absolute;left:18px;bottom:18px;padding:7px 11px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(0,0,0,.26);font-size:11px;z-index:5;backdrop-filter:blur(8px)}
    .free-wave{position:absolute;right:18px;bottom:18px;display:flex;gap:3px;align-items:end;height:28px;z-index:5}
    .free-wave i{display:block;width:3px;height:8px;border-radius:3px;background:rgba(205,160,255,.8);animation:freeWave 1s ease-in-out infinite}
    .free-wave i:nth-child(2){animation-delay:.12s}.free-wave i:nth-child(3){animation-delay:.24s}.free-wave i:nth-child(4){animation-delay:.36s}.free-wave i:nth-child(5){animation-delay:.48s}
    #sara-agent.free-sara-speaking .free-mouth{height:18px;border-bottom-width:4px;transform:translateX(-50%) scaleY(1.15)}
    #sara-agent.free-sara-speaking .free-head{animation:freeTalk .34s ease-in-out infinite alternate}
    #sara-agent.free-sara-speaking .free-wave i{animation-duration:.45s}
    @keyframes freeTalk{from{transform:translateY(0)}to{transform:translateY(2px)}}
    @keyframes freeGlow{0%,100%{transform:scale(.94);opacity:.75}50%{transform:scale(1.08);opacity:1}}
    @keyframes freeWave{0%,100%{height:7px}50%{height:24px}}
  `;
  document.head.appendChild(style);

  function renderFreeAvatar() {
    if (!agent) return;
    agent.classList.add('free-sara-stage');
    agent.innerHTML = `
      <div class="free-sara" aria-label="SARA free avatar">
        <div class="free-glow"></div>
        <div class="free-hair"></div>
        <div class="free-head"><div class="free-face">
          <i class="free-brow left"></i><i class="free-brow right"></i>
          <i class="free-eye left"></i><i class="free-eye right"></i>
          <i class="free-nose"></i><i class="free-mouth"></i>
        </div></div>
        <div class="free-neck"></div><div class="free-body"></div><div class="free-collar"></div>
        <span class="free-badge">SARA · FREE MODE</span>
        <span class="free-wave"><i></i><i></i><i></i><i></i><i></i></span>
      </div>`;
  }

  renderFreeAvatar();

  // D-ID can inject UI asynchronously. Keep the mount locked to Free SARA Mode.
  if (agent) {
    const observer = new MutationObserver(() => {
      if (!agent.querySelector('.free-sara')) renderFreeAvatar();
    });
    observer.observe(agent, { childList: true, subtree: true });
  }

  function updateSpeaking() {
    const speaking = (voiceState?.textContent || '').toLowerCase().includes('speaking');
    agent?.classList.toggle('free-sara-speaking', speaking);
  }
  if (voiceState) {
    new MutationObserver(updateSpeaking).observe(voiceState, { childList: true, characterData: true, subtree: true });
    updateSpeaking();
  }

  const sideStatus = document.getElementById('sideStatus');
  const sideStatusText = document.getElementById('sideStatusText');
  if (sideStatus) sideStatus.textContent = 'SARA Free Mode';
  if (sideStatusText) sideStatusText.textContent = 'Browser voice + mic ready';
})();