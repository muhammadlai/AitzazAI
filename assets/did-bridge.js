(() => {
  'use strict';

  // FREE SARA 3D MODE
  // Uses Three.js + @pixiv/three-vrm from public CDNs and a CC0 female VRM sample.
  // No D-ID connection or D-ID credits are used.
  const agent = document.getElementById('sara-agent');
  const status = document.getElementById('status');
  const voiceState = document.getElementById('voiceState');
  const mic = document.getElementById('mic');
  const retry = document.getElementById('retry');
  const stageTag = document.querySelector('.stage-head .tag');

  window.SARA_FREE_MODE = true;
  window.SARA_3D_MODE = true;

  const removeDidScripts = () => {
    document.querySelectorAll('script[src*="agent.d-id.com"]').forEach(s => s.remove());
    try { delete window.DID_AGENTS_API; } catch {}
  };
  removeDidScripts();
  const didBlocker = setInterval(removeDidScripts, 400);
  setTimeout(() => clearInterval(didBlocker), 15000);

  if (!agent) return;
  if (stageTag) stageTag.textContent = 'Free 3D SARA';
  if (status) { status.textContent = 'SARA 3D · FREE'; status.className = 'status online'; }
  if (voiceState && !voiceState.textContent.toLowerCase().includes('speaking')) voiceState.textContent = '3D avatar: ready';
  if (mic) { mic.disabled = false; mic.title = 'Free browser microphone'; }
  if (retry) { retry.textContent = 'Reload 3D SARA'; retry.onclick = () => location.reload(); }

  const style = document.createElement('style');
  style.textContent = `
    #sara-agent.free-sara-3d-stage{position:relative;overflow:hidden;min-height:420px;background:radial-gradient(circle at 50% 22%,rgba(139,92,246,.22),transparent 34%),radial-gradient(circle at 50% 100%,rgba(56,189,248,.10),transparent 42%),linear-gradient(145deg,#090b13,#111522 58%,#090a10)}
    #sara-agent.free-sara-3d-stage canvas{display:block;width:100%!important;height:100%!important;min-height:420px;outline:none}
    .sara-3d-loading{position:absolute;inset:0;display:grid;place-items:center;z-index:8;pointer-events:none;color:#e9e4ff;font-size:13px;letter-spacing:.04em;background:radial-gradient(circle,rgba(20,16,34,.2),rgba(5,6,10,.78))}
    .sara-3d-loading span{padding:10px 15px;border:1px solid rgba(255,255,255,.13);border-radius:999px;background:rgba(8,10,18,.58);backdrop-filter:blur(12px)}
    .sara-3d-badge{position:absolute;left:18px;bottom:18px;z-index:7;padding:8px 12px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(6,8,14,.58);color:#ddd6fe;font:600 11px/1 system-ui,sans-serif;letter-spacing:.08em;backdrop-filter:blur(12px)}
    .sara-3d-wave{position:absolute;right:18px;bottom:18px;display:flex;gap:3px;align-items:end;height:28px;z-index:7}
    .sara-3d-wave i{display:block;width:3px;height:7px;border-radius:3px;background:#c4b5fd;opacity:.8;animation:sara3dWave 1s ease-in-out infinite}
    .sara-3d-wave i:nth-child(2){animation-delay:.12s}.sara-3d-wave i:nth-child(3){animation-delay:.24s}.sara-3d-wave i:nth-child(4){animation-delay:.36s}.sara-3d-wave i:nth-child(5){animation-delay:.48s}
    #sara-agent.sara-speaking .sara-3d-wave i{animation-duration:.38s}
    @keyframes sara3dWave{0%,100%{height:6px}50%{height:24px}}
  `;
  document.head.appendChild(style);
  agent.classList.add('free-sara-3d-stage');
  agent.innerHTML = '<div class="sara-3d-loading"><span>Loading SARA 3D…</span></div><div class="sara-3d-badge">SARA · FREE 3D</div><div class="sara-3d-wave"><i></i><i></i><i></i><i></i><i></i></div>';

  const importMap = document.createElement('script');
  importMap.type = 'importmap';
  importMap.textContent = JSON.stringify({ imports: {
    three: 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
    'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/',
    '@pixiv/three-vrm': 'https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3/lib/three-vrm.module.min.js'
  }});
  document.head.appendChild(importMap);

  const module = document.createElement('script');
  module.type = 'module';
  module.textContent = `
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
    import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

    const mount = document.getElementById('sara-agent');
    const loading = mount?.querySelector('.sara-3d-loading');
    if (!mount) throw new Error('SARA mount not found');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080a11);

    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
    camera.position.set(0, 1.45, 5.4);
    camera.lookAt(0, 1.38, 0);

    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label', 'SARA 3D female avatar');
    mount.prepend(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x17121f, 2.0);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 3.0);
    key.position.set(2.5, 4.0, 4.0);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb9a4ff, 2.1);
    rim.position.set(-3, 2.5, -2.5);
    scene.add(rim);
    const fill = new THREE.PointLight(0x7dd3fc, 1.1, 8);
    fill.position.set(0, 1.5, 2.5);
    scene.add(fill);

    const loader = new GLTFLoader();
    loader.crossOrigin = 'anonymous';
    loader.register(parser => new VRMLoaderPlugin(parser));

    // CC0 female sample model (AvatarSample_F / formerly Vita) documented as CC0.
    const MODEL_URL = 'https://huggingface.co/akamotaco/ppaso-tts-v1/resolve/main/example/avatar_vrm/AvatarSample_F.vrm';
    let vrm = null;
    let mixer = null;
    let blinkTimer = 0;
    let blinkPhase = 0;
    let speaking = false;
    let last = performance.now();

    function resize(){
      const rect = mount.getBoundingClientRect();
      const w = Math.max(320, rect.width);
      const h = Math.max(420, rect.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(mount);
    resize();

    function setExpression(name, value){
      try { vrm?.expressionManager?.setValue(name, value); } catch {}
    }

    function updateFace(dt, t){
      if (!vrm) return;
      const head = vrm.humanoid?.getNormalizedBoneNode?.('head');
      const neck = vrm.humanoid?.getNormalizedBoneNode?.('neck');
      if (head) {
        head.rotation.y = Math.sin(t * 0.55) * 0.035;
        head.rotation.x = Math.sin(t * 0.8) * 0.018;
        if (speaking) head.rotation.y += Math.sin(t * 4.0) * 0.012;
      }
      if (neck) neck.rotation.z = Math.sin(t * 0.45) * 0.008;

      blinkTimer -= dt;
      if (blinkTimer <= 0) {
        blinkTimer = 2.4 + Math.random() * 4.0;
        blinkPhase = 0.001;
      }
      if (blinkPhase > 0) {
        blinkPhase += dt * 8;
        const v = Math.sin(Math.min(blinkPhase, Math.PI));
        setExpression('blink', Math.max(0, v));
        setExpression('blinkLeft', Math.max(0, v));
        setExpression('blinkRight', Math.max(0, v));
        if (blinkPhase >= Math.PI) blinkPhase = 0;
      }

      const mouth = speaking ? (0.22 + Math.max(0, Math.sin(t * 9.5)) * 0.58) : 0;
      setExpression('aa', mouth);
      setExpression('A', mouth);
      setExpression('a', mouth);
    }

    try {
      const gltf = await loader.loadAsync(MODEL_URL);
      vrm = gltf.userData.vrm;
      if (!vrm) throw new Error('VRM metadata not found');
      VRMUtils.removeUnnecessaryVertices(vrm.scene);
      VRMUtils.removeUnnecessaryJoints(vrm.scene);
      vrm.scene.traverse(o => { o.frustumCulled = false; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      vrm.scene.rotation.y = Math.PI;
      vrm.scene.position.y = -1.0;
      vrm.scene.scale.setScalar(1.55);
      scene.add(vrm.scene);
      loading?.remove();
      if (window.status) window.status.textContent = 'SARA 3D · READY';
      window.SARA_VRM = vrm;
    } catch (error) {
      console.error('Free SARA VRM load failed:', error);
      if (loading) loading.innerHTML = '<span>3D model could not load — tap Reload 3D SARA</span>';
      if (status) { status.textContent = 'SARA 3D · LOAD ERROR'; status.className = 'status'; }
    }

    function animate(now){
      requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      if (vrm) {
        vrm.update(dt);
        updateFace(dt, t);
      }
      if (mixer) mixer.update(dt);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);

    window.addEventListener('resize', resize);
    window.SARA_SET_SPEAKING = value => { speaking = !!value; mount.classList.toggle('sara-speaking', speaking); };
    window.SARA_FULLSCREEN = () => {
      if (!document.fullscreenElement) mount.requestFullscreen?.(); else document.exitFullscreen?.();
    };
  `;
  document.body.appendChild(module);

  function updateSpeaking(){
    const text = (voiceState?.textContent || '').toLowerCase();
    const on = text.includes('speaking') || text.includes('sara bolo');
    window.SARA_SET_SPEAKING?.(on);
  }
  if (voiceState) {
    new MutationObserver(updateSpeaking).observe(voiceState, { childList:true, characterData:true, subtree:true });
    updateSpeaking();
  }

  // Make the existing fullscreen controls work with the free 3D avatar.
  ['fs','topFs'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.onclick = () => window.SARA_FULLSCREEN?.();
  });

  const sideStatus = document.getElementById('sideStatus');
  const sideStatusText = document.getElementById('sideStatusText');
  if (sideStatus) sideStatus.textContent = 'SARA 3D Free Mode';
  if (sideStatusText) sideStatusText.textContent = '3D avatar + browser voice ready';
})();