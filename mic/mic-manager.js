// SARA Mic Manager
// Handles browser permission, Android WebView permission handoff, retries and D-ID mic state.
export class SaraMicManager {
  constructor({ apiGetter, onState = () => {}, onError = () => {} } = {}) {
    this.apiGetter = apiGetter;
    this.onState = onState;
    this.onError = onError;
    this.stream = null;
    this.enabled = false;
    this.busy = false;
    this.retryTimer = null;
  }

  api() {
    return this.apiGetter?.() || window.DID_AGENTS_API || null;
  }

  state(text, ok = true) {
    this.onState(text, ok);
  }

  async permissionState() {
    try {
      if (!navigator.permissions?.query) return 'unknown';
      const p = await navigator.permissions.query({ name: 'microphone' });
      return p.state;
    } catch (_) {
      return 'unknown';
    }
  }

  async requestHardware() {
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      throw new Error('Microphone ke liye HTTPS secure page zaroori hai');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Is device/browser mein microphone API available nahi hai');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      },
      video: false
    });

    // Keep the permission warm briefly, then release this preflight track.
    // D-ID owns the actual conversational audio track.
    this.stream = stream;
    await new Promise(resolve => setTimeout(resolve, 250));
    stream.getTracks().forEach(track => track.stop());
    this.stream = null;
  }

  async enable({ silent = false } = {}) {
    if (this.busy) return false;
    this.busy = true;
    try {
      if (!silent) this.state('Microphone permission check ho rahi hai…');
      await this.requestHardware();

      const api = this.api();
      if (!api?.functions?.toggleMicState) {
        throw new Error('D-ID microphone control abhi ready nahi hai');
      }

      await api.functions.toggleMicState(false);
      this.enabled = true;
      this.state('Mic ON — SARA continuously sunne ke liye ready hai');
      return true;
    } catch (err) {
      this.enabled = false;
      const message = err?.message || String(err);
      this.onError(message, err);
      if (!silent) this.state('Mic start nahi hua — permission Allow karein', false);
      return false;
    } finally {
      this.busy = false;
    }
  }

  async disable() {
    const api = this.api();
    try { await api?.functions?.toggleMicState(true); } catch (_) {}
    this.enabled = false;
    this.state('Mic OFF');
  }

  async autoStart() {
    // First try immediately; browsers may show the permission prompt.
    const ok = await this.enable({ silent: true });
    if (ok) return true;

    // If a browser blocks automatic permission until interaction, retry after the
    // first touch/click/keypress without forcing the user through another setup page.
    const retry = async () => {
      if (this.enabled) return;
      await this.enable();
      window.removeEventListener('pointerdown', retry);
      window.removeEventListener('keydown', retry);
    };
    window.addEventListener('pointerdown', retry, { once: true, passive: true });
    window.addEventListener('keydown', retry, { once: true });
    return false;
  }

  destroy() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
  }
}
