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
      if (window.DID_AGENTS_API) {
        clearInterval(timer);
        resolve(window.DID_AGENTS_API);
      } else if (Date.now() - started >= timeout) {
        clearInterval(timer);
        resolve(null);
      }
    }, 100);
  });

  waitForApi().then(api => {
    if (!api) {
      setStatus('D-ID API not loaded');
      setFallback('D-ID embed load nahi hua. Reconnect try karein.');
      return;
    }

    if (mic) {
      mic.disabled = false;
      mic.title = 'Microphone on/off';
      mic.onclick = async () => {
        try {
          await api.functions.toggleMicState();
          mic.classList.toggle('active');
          const label = mic.querySelector('span');
          if (label) label.textContent = mic.classList.contains('active') ? 'Mic On' : 'Mic';
          setStatus(mic.classList.contains('active') ? 'Mic on — SARA sun rahi hai' : 'SARA online', true);
        } catch (e) {
          console.error('[SARA] microphone error', e);
          setStatus('Mic permission/error');
          setFallback('Browser microphone permission Allow karein, phir Reconnect dabayein.');
        }
      };
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
        setStatus('D-ID disconnected');
        setFallback('D-ID connection band ho gaya. Reconnect karein.');
        if (mic) mic.disabled = true;
      } else if (s === 'fail' || s === 'failed') {
        setStatus('D-ID unavailable');
        setFallback('D-ID connection fail hua. Client key/domain settings check karein.');
        if (mic) mic.disabled = true;
      }
    });

    api.events.on('error', ({ error }) => {
      console.error('[SARA] D-ID error', error);
      const code = error?.code || error?.type || '';
      const c = String(code).toUpperCase();
      if (c.includes('AUTH')) {
        setStatus('D-ID auth error');
        setFallback('D-ID client key is domain ke liye authorized nahi hai. D-ID Studio mein aitzaz-ai.vercel.app ko Allowed Domains mein add karein.');
      } else if (c.includes('NETWORK')) {
        setStatus('D-ID network error');
        setFallback('D-ID network connection nahi ban saki. Reconnect karein.');
      } else {
        setStatus(code ? `D-ID error: ${code}` : 'D-ID error');
        setFallback('D-ID avatar load nahi ho saka. Reconnect karein.');
      }
      if (mic) mic.disabled = true;
    });

    api.events.on('agentActivity', ({ state }) => {
      const s = String(state || '').toUpperCase();
      if (s === 'TALKING') setStatus('SARA speaking', true);
      else if (s === 'LOADING') setStatus('SARA thinking…', true);
      else if (s === 'IDLE') setStatus('SARA online', true);
    });
  });
})();
