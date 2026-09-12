(() => {
  const mic = document.getElementById('mic');
  const status = document.getElementById('status');
  const fallback = document.querySelector('#sara-agent .fallback');
  const fallbackText = fallback?.querySelector('p');
  const retry = document.getElementById('retry');
  const voiceState = document.getElementById('voiceState');
  let connected = false;
  let api = null;

  const setStatus = (text, online = false) => {
    if (!status) return;
    status.textContent = text;
    status.className = 'status ' + (online ? 'online' : 'offline');
  };
  const setFallback = (text, show = true) => {
    if (fallbackText) fallbackText.textContent = text;
    if (fallback) fallback.classList.toggle('hidden', !show);
    if (retry) retry.style.display = show ? '' : 'none';
  };
  const waitForApi = (timeout = 15000) => new Promise(resolve => {
    if (window.DID_AGENTS_API) return resolve(window.DID_AGENTS_API);
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.DID_AGENTS_API) { clearInterval(timer); resolve(window.DID_AGENTS_API); }
      else if (Date.now() - started >= timeout) { clearInterval(timer); resolve(null); }
    }, 100);
  });

  const markOffline = (message = 'SARA ready hai. Live avatar abhi connect nahi hua.') => {
    connected = false;
    setStatus('SARA avatar offline');
    setFallback(message);
    if (mic) mic.disabled = false;
    if (voiceState && !voiceState.textContent.includes('speaking')) voiceState.textContent = 'Voice engine: fallback ready';
  };

  // Never leave the user on an endless Loading screen.
  setTimeout(() => { if (!connected) markOffline('SARA ready hai. D-ID avatar connect nahi hua — Reconnect try karein.'); }, 10000);
  if (mic) mic.disabled = false;

  waitForApi().then(agentApi => {
    api = agentApi;
    if (!api) {
      markOffline('SARA ready hai. D-ID service load nahi hui. Browser voice fallback available hai.');
      return;
    }

    if (mic) {
      mic.disabled = false;
      mic.title = 'D-ID microphone; browser voice fallback available';
    }

    api.events.on('connection', ({ state }) => {
      const s = String(state || '').toLowerCase();
      if (s === 'connected') {
        connected = true;
        setStatus('SARA online', true);
        setFallback('', false);
        if (mic) mic.disabled = false;
      } else if (s === 'connecting' || s === 'new') {
        setStatus('D-ID connecting…');
        setFallback('SARA se secure connection ban raha hai…');
      } else if (s === 'disconnected' || s === 'closed') {
        markOffline('D-ID connection band ho gaya. Reconnect karein.');
      } else if (s === 'fail' || s === 'failed') {
        markOffline('D-ID connection fail hua. D-ID Allowed Domain aur Agent ID/key check karein.');
      }
    });

    api.events.on('error', ({ error }) => {
      connected = false;
      console.error('[SARA] D-ID error', error);
      const code = error?.code || error?.type || '';
      const c = String(code).toUpperCase();
      if (c.includes('AUTH')) {
        setStatus('D-ID authorization error');
        setFallback('D-ID client key/domain authorize nahi hua. D-ID Studio mein aitzaz-ai.vercel.app ko Allowed Domains mein add karein.');
      } else if (c.includes('NETWORK')) {
        setStatus('D-ID network error');
        setFallback('D-ID network connection nahi ban saki. Reconnect karein.');
      } else {
        setStatus(code ? `D-ID error: ${code}` : 'D-ID error');
        setFallback('D-ID avatar load nahi ho saka. SARA ki AI chat aur fallback voice available rehengi.');
      }
      if (mic) mic.disabled = false;
    });

    api.events.on('agentActivity', ({ state }) => {
      const s = String(state || '').toUpperCase();
      if (s === 'TALKING') {
        setStatus('SARA speaking', true);
        if (voiceState) voiceState.textContent = 'Voice engine: SARA speaking';
      } else if (s === 'LOADING') {
        setStatus('SARA thinking…', true);
        if (voiceState) voiceState.textContent = 'Voice engine: thinking';
      } else if (s === 'IDLE') {
        setStatus('SARA online', true);
        if (voiceState) voiceState.textContent = 'Voice engine: ready';
      }
    });
  });

  window.SARA_DID_STATE = () => ({ connected, api });
})();
