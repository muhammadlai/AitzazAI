(() => {
  const mic = document.getElementById('mic');
  const status = document.getElementById('status');

  const setStatus = (text, online = false) => {
    if (!status) return;
    status.textContent = text;
    status.className = 'status ' + (online ? 'online' : 'offline');
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
      return;
    }

    api.events.on('connection', ({ state }) => {
      if (state === 'connected') {
        setStatus('SARA online', true);
        if (mic) mic.disabled = false;
      } else if (state === 'connecting' || state === 'new') {
        setStatus('D-ID connecting…');
      } else if (state === 'disconnected' || state === 'closed') {
        setStatus('D-ID disconnected');
        if (mic) mic.disabled = true;
      } else if (state === 'fail') {
        setStatus('D-ID unavailable');
        if (mic) mic.disabled = true;
      }
    });

    api.events.on('error', ({ error }) => {
      console.error('[SARA] D-ID error', error);
      const code = error?.code || error?.type;
      setStatus(code ? `D-ID error: ${code}` : 'D-ID error');
      if (mic) mic.disabled = true;
    });

    api.events.on('agentActivity', ({ state }) => {
      if (state === 'TALKING') setStatus('SARA speaking', true);
      else if (state === 'LOADING') setStatus('SARA thinking…', true);
      else if (state === 'IDLE') setStatus('SARA online', true);
    });
  });
})();
