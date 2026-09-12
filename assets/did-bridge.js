(() => {
  const mic = document.getElementById('mic');
  const status = document.getElementById('status');
  const fallback = document.querySelector('#sara-agent .fallback');
  const fallbackText = fallback?.querySelector('p');
  const retry = document.getElementById('retry');

  const setStatus = (text, online = false) => {
    if (!status) return;
    status.textContent = text;
    status.className = 'status ' + (online ? 'online' : 'offline');
  };
  const setFallback = (text, showRetry = true) => {
    if (fallbackText) fallbackText.textContent = text;
    if (retry) retry.style.display = showRetry ? '' : 'none';
  };
  const waitForApi = (timeout = 15000) => new Promise(resolve => {
    if (window.DID_AGENTS_API) return resolve(window.DID_AGENTS_API);
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.DID_AGENTS_API) { clearInterval(timer); resolve(window.DID_AGENTS_API); }
      else if (Date.now() - started >= timeout) { clearInterval(timer); resolve(null); }
    }, 100);
  });

  if (mic) {
    // Browser SpeechRecognition fallback is owned by index.html and remains usable
    // even when D-ID authentication/domain authorization fails.
    mic.disabled = false;
  }

  waitForApi().then(api => {
    if (!api) {
      setStatus('D-ID unavailable · Voice fallback ready');
      setFallback('D-ID avatar connect nahi hua. Browser Mic + Voice fallback ready hai.');
      return;
    }

    if (mic) {
      mic.disabled = false;
      mic.title = 'D-ID microphone; browser microphone fallback available';
    }

    api.events.on('connection', ({ state }) => {
      const s = String(state || '').toLowerCase();
      if (s === 'connected') {
        setStatus('SARA online', true);
        setFallback('SARA live hai.', false);
        if (mic) mic.disabled = false;
      } else if (s === 'connecting' || s === 'new') {
        setStatus('D-ID connecting…');
        setFallback('SARA se secure connection ban raha hai…');
      } else if (s === 'disconnected' || s === 'closed') {
        setStatus('D-ID disconnected · Voice fallback ready');
        setFallback('D-ID band hai. Browser voice/mic fallback available hai.');
        if (mic) mic.disabled = false;
      } else if (s === 'fail' || s === 'failed') {
        setStatus('D-ID unavailable · Voice fallback ready');
        setFallback('D-ID connection fail hua. Browser voice/mic fallback phir bhi available hai.');
        if (mic) mic.disabled = false;
      }
    });

    api.events.on('error', ({ error }) => {
      console.error('[SARA] D-ID error', error);
      const code = error?.code || error?.type || '';
      const c = String(code).toUpperCase();
      if (c.includes('AUTH')) {
        setStatus('D-ID auth error · Voice fallback ready');
        setFallback('D-ID client key is domain ke liye authorized nahi. Allowed Domains mein aitzaz-ai.vercel.app add karein. Browser voice/mic fallback ready hai.');
      } else if (c.includes('NETWORK')) {
        setStatus('D-ID network error · Voice fallback ready');
        setFallback('D-ID network connection nahi bani. Browser voice/mic fallback ready hai.');
      } else {
        setStatus(code ? `D-ID error: ${code}` : 'D-ID error · Voice fallback ready');
        setFallback('D-ID avatar load nahi hua. Browser voice/mic fallback ready hai.');
      }
      if (mic) mic.disabled = false;
    });

    api.events.on('agentActivity', ({ state }) => {
      const s = String(state || '').toUpperCase();
      if (s === 'TALKING') setStatus('SARA speaking', true);
      else if (s === 'LOADING') setStatus('SARA thinking…', true);
      else if (s === 'IDLE') setStatus('SARA online', true);
    });
  });
})();
