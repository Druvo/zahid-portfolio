import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { world, synced } from './core.js';
import { createWorld, roadPoint, polar, DEG } from './world.js';
import { buildAll } from './props.js';
import { Van, MODELS } from './vehicle.js';
import { input, pollInput, setupTouch, onKey } from './input.js';
import { createUI } from './ui.js';
import * as audio from './audio.js';

const $ = (s) => document.querySelector(s);
const bar = $('#load-bar'), startBtn = $('#start');
const progress = (p) => { bar.style.width = p + '%'; };
const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

async function boot() {
  progress(8);
  try { await Promise.race([document.fonts.load('800 64px Inter'), new Promise((r) => setTimeout(r, 1800))]); await document.fonts.load('600 40px Inter'); } catch { /* fall back to system font */ }
  const font = await new FontLoader().loadAsync(import.meta.env.BASE_URL + 'fonts/helvetiker_bold.typeface.json');
  progress(30); await frame();

  // ----- renderer -----
  const canvas = $('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.3, 1400);

  const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.14, 0.4, 1.1); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ----- world -----
  const W = createWorld(scene, renderer);
  // ----- quality: high = bloom + MSAA + shadows, low = plain render, DPR 1, no shadows -----
  let sw = 0, sh = 0;
  let qPref = null; try { qPref = localStorage.getItem('zh-q'); } catch { /* ignore */ }
  let quality = qPref || 'high', vanRef = null;
  function applyQuality(q, save = true) {
    quality = q;
    renderer.setPixelRatio(q === 'low' ? 1 : Math.min(devicePixelRatio, 1.5));
    W.sun.castShadow = q !== 'low';
    composer.setPixelRatio?.(q === 'low' ? 1 : Math.min(devicePixelRatio, 1.5));
    if (vanRef) vanRef.headlight.visible = q !== 'low';
    const b = document.getElementById('btn-q'); if (b) b.textContent = q === 'low' ? 'Quality: Low' : 'Quality: High';
    if (sw) resize();
    if (save) { try { localStorage.setItem('zh-q', q); } catch { /* ignore */ } }
  }
  progress(55); await frame();
  const ctx = { scene, font };
  const entries = buildAll(ctx);
  progress(80); await frame();

  const spawnA = -34 * DEG, spawnP = roadPoint(spawnA);
  let saved = 'racer'; try { saved = localStorage.getItem('zh-car') || 'racer'; } catch { /* ignore */ }
  const van = new Van(scene, spawnP, spawnA + Math.PI / 2, saved); vanRef = van;
  const pickCar = (k) => { van.setModel(k); van.headlight.visible = quality !== 'low'; try { localStorage.setItem('zh-car', k); } catch { /* ignore */ } ui.toast('Now driving: ' + van.model.name); };
  scene.updateMatrixWorld(true);

  let muted = false;
  const ui = createUI({
    entries,
    onTravel(e) {
      const p = e.st.onRoad ? e.g.position.clone() : e.g.localToWorld(new THREE.Vector3(0, 0, e.st.kind ? 11 : 13));
      p.y = 0; if (e.st.onRoad) p.addScaledVector(new THREE.Vector3(Math.sin(e.g.rotation.y + Math.PI / 2), 0, Math.cos(e.g.rotation.y + Math.PI / 2)), -14);
      van.spawn.copy(p); van.heading = Math.atan2(e.g.position.x - p.x, e.g.position.z - p.z); van.reset(); camYaw = van.heading; snap = true;
    },
    onSound() { muted = !muted; audio.setMuted(muted); }, isMuted: () => muted, onCar: (k) => pickCar(k), getCar: () => van.model.key,
  });
  setupTouch(document);
  progress(100);

  // ----- camera state -----
  let snap = false, camYaw = van.heading, camOff = 0, zoom = 12, introMode = true, introT = 0, blend = 0;
  const camPos = new THREE.Vector3(0, 60, 150), look = new THREE.Vector3(), tmp = new THREE.Vector3();
  addEventListener('wheel', (e) => { zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.01, 7, 22); }, { passive: true });
  let drag = false, lx = 0;
  canvas.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; });
  addEventListener('pointerup', () => { drag = false; });
  addEventListener('pointermove', (e) => { if (drag) { camOff -= (e.clientX - lx) * 0.006; lx = e.clientX; } });

  onKey((k) => {
    if (k === 'Escape') ui.closeAll();
    if (k === 'KeyM' && !introMode) ui.toggle(ui.menu);
    if (k === 'KeyC' && !introMode) ui.toggle(ui.cv);
    if (k === 'KeyV' && !introMode) pickCar(MODELS[(MODELS.findIndex((x) => x.key === van.model.key) + 1) % MODELS.length].key);
    if (k === 'KeyT'&& !introMode) { for (const s of synced) { s.body.position.copy(s.home); s.body.quaternion.copy(s.homeQ); s.body.velocity.setZero(); s.body.angularVelocity.setZero(); s.body.wakeUp(); } ui.toast('Props tidied up'); }
    if (k === 'KeyG' && !introMode) $('#btn-q').click();
    if (k === 'KeyN') { muted = !muted; audio.setMuted(muted); ui.soundLabel(); }
    if (k === 'Enter' && introMode) start();
  });

  function start() {
    if (!introMode) return;
    introMode = false; audio.initAudio();
    $('#intro').classList.add('hide'); $('#hud').hidden = false;
    setTimeout(() => ui.toast('Drive forward to explore. Follow the amber road, or press M to fast travel.', 5000), 700);
  }
  applyQuality(quality, false);
  $('#btn-q').onclick = () => { applyQuality(quality === 'low' ? 'high' : 'low'); ui.toast(quality === 'low' ? 'Low quality: bloom, shadows and sharpness reduced' : 'High quality on'); };
  startBtn.disabled = false; startBtn.textContent = 'Start driving →'; startBtn.onclick = start;

  // ----- resize -----
  function resize() {
    sw = Math.max(1, innerWidth); sh = Math.max(1, innerHeight);
    renderer.setSize(sw, sh); composer.setSize(sw, sh);
    camera.aspect = sw / sh; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  // ----- loop -----
  let fpsT = 0, fpsN = 0, fpsSum = 0, autoDone = false;
  const clock = new THREE.Clock(); let t = 0, active = null, wasRoad = false;
  const lerpAngle = (a, b, k) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * k; };

  function tick() {
    if (innerWidth !== sw || innerHeight !== sh) resize();
    const dt = Math.min(clock.getDelta(), 0.05); t += dt;
    const inp = introMode ? { throttle: 0, steer: 0, boost: false, brake: true, hop: false, honk: false, reset: false } : pollInput();
    if (!introMode && ui.anyOpen()) { inp.throttle = 0; inp.steer = 0; inp.boost = false; }
    van.update(dt, inp, t);
    world.step(1 / 60, dt, 3);
    for (const s of synced) { const b = s.body; if (b.sleepState === 2) continue; s.mesh.position.copy(b.position); s.mesh.quaternion.copy(b.quaternion); }

    // proximity -> active station
    const vp = van.group.position; let best = null, bd = 1e9;
    for (const e of entries) {
      const d = Math.hypot(vp.x - e.g.position.x, vp.z - e.g.position.z);
      e.dist = d; const f = THREE.MathUtils.clamp(1 - (d - e.radius * 0.35) / (e.radius * 0.65), 0, 1); e.f = f;
      if (d < bd) { bd = d; best = e; }
    }
    if (!introMode) {
      if (active && active.dist < active.radius + 2) { /* stay */ } else active = best && best.dist < best.radius ? best : null;
      if (active) { if (ui.discover(active)) audio.chime(); }
      ui.show(active);
      if (!active) {
        let nb = null, nd = 1e9;
        for (const e of entries) if (!ui.visited.has(e.st.id) && e.dist < nd) { nd = e.dist; nb = e; }
        ui.setPrompt(nb ? 'Next stop: ' + nb.st.title.split(' - ')[0] + '  ·  ' + Math.round(nd) + ' m' : 'You found every place. Press M to revisit.');
      } else ui.setPrompt('');
    }
    for (const e of entries) {
      e.update(t, dt, e.f, vp);
      if (e.ring) e.ring.material.opacity = 0.18 + e.f * 0.35;
    }
    W.update(t, dt, vp);

    // camera
    if (introMode) {
      introT += dt; const a = introT * 0.07 + 0.6;
      camPos.set(Math.sin(a) * 135, 58, Math.cos(a) * 135); look.set(0, 4, 0); camera.position.copy(camPos); camera.lookAt(look);
    } else {
      blend = Math.min(1, blend + dt * 0.7);
      if (input.camLook) camOff += input.camLook * dt * 1.8;
      if (!drag && !input.camLook) camOff *= Math.exp(-dt * 0.8);
      camYaw = lerpAngle(camYaw, van.heading + camOff, 1 - Math.exp(-dt * 3.0));
      const vf = van.forward(), speedK = Math.min(Math.abs(van.speed) / 20, 1.4);
      const dist = zoom + speedK * 2.2, h = 4.2 + dist * 0.28;
      tmp.set(vp.x - Math.sin(camYaw) * dist, h, vp.z - Math.cos(camYaw) * dist);
      if (snap) { camPos.copy(tmp); look.set(vp.x, vp.y + 1.6, vp.z); snap = false; } else camPos.lerp(tmp, 1 - Math.exp(-dt * (blend < 1 ? 1.4 : 6)));
      camera.position.copy(camPos);
      if (van.boosting) camera.position.add(tmp.set((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12));
      look.lerp(tmp.set(vp.x + vf.x * 4, vp.y + 1.6, vp.z + vf.z * 4), 1 - Math.exp(-dt * 8));
      camera.lookAt(look);
      const fov = 55 + speedK * 6 + (van.boosting ? 7 : 0); camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
      ui.setSpeed(van.speed, van.boostEnergy); ui.drawMap(vp, van.heading);
      if (quality !== 'low') bloom.strength = 0.14 + (van.boosting ? 0.1 : 0);
    }
    if (quality === 'low') renderer.render(scene, camera); else composer.render();
    // auto-fallback: weak machines with no saved choice drop to low quality
    if (!introMode && !qPref && !autoDone) {
      fpsT += dt; if (fpsT > 1.5) { fpsN++; fpsSum += dt; }
      if (fpsN >= 120) { autoDone = true; if (fpsN / fpsSum < 24) { applyQuality('low', false); ui.toast('Slow frame rate detected: switched to low quality. Press G to switch back.', 5000); } }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.tp = (i, z = 17) => { const e = entries[i], p = e.g.localToWorld(new THREE.Vector3(0, 0, z)); van.spawn.copy(p); van.heading = Math.atan2(e.g.position.x - p.x, e.g.position.z - p.z); van.reset(); camYaw = van.heading; snap = true; };
  window.__dbg = { van, entries, camera, scene, ui, THREE, start, get active() { return active; } };
}
const ease = (x) => x * x * (3 - 2 * x);

boot().catch((e) => { console.error(e); startBtn.textContent = 'Error: ' + e.message; });
