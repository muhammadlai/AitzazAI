// SARA Mic Manager
// Lets the D-ID Agent own the live conversational microphone.
export class SaraMicManager {
  constructor({ apiGetter, onState = () => {}, onError = () => {} } = {}) {
    this.apiGetter = apiGetter;
    this.onState = onState;
    this.onError = onError;
    this.enabled = false;
    this.busy = false;
  }

  api() {
    return this.apiGetter?.() || window.DID_AGENTS_API || null;
  }

  state(text, ok = true) {
    this.onState(text, ok);
  }

  async requestPermissionFallback() {
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      throw new Error('Microphone ke liye HTTPS secure page zaroori hai');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Is browser/device mein microphone API available nahi hai');
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
    stream.getTracks().forEach(track => track.stop());
  }

  async enable({ silent = false } = {}) {
    if (this.busy || this.enabled) return this.enabled;
    this.busy = true;
    try {
      const api = this.api();
      if (!api?.functions?.toggleMicState) {
        throw new Error('D-ID microphone control abhi ready nahi hai');
      }

      if (!silent) this.state('SARA microphone enable ho raha hai…');

      // D-ID owns the actual conversational audio track. Try the official
      // Agent control first instead of creating a separate browser audio track.
      try {
        await api.functions.toggleMicState(false);
      } catch (firstError) {
        // If the browser has not granted microphone access yet, trigger the
        // browser permission prompt once, then ask D-ID to unmute again.
        await this.requestPermissionFallback();
        await api.functions.toggleMicState(false);
      }

      this.enabled = true;
      this.state('Mic ON — SARA sun rahi hai');
      return true;
    } catch (err) {
      this.enabled = false;
      const message = err?.message || String(err);
      this.onError(message, err);
      if (!silent) this.state('Mic start nahi hua — browser mein Allow karein', false);
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
    const ok = await this.enable({ silent: true });
    if (ok) return true;

    // Browsers may require a user gesture before microphone permission.
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
    this.enabled = false;
  }
}
