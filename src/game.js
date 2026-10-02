import * as THREE from 'three';
import { mat, canvasTex } from './core.js';
import { DEG, roadPoint } from './world.js';
import * as audio from './audio.js';

const PAD_ANGLES = [10, 40, 88, 112, 136, 160, 218, 258, 284, 312];
const norm = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const fmt = (s) => { const m = Math.floor(s / 60); return m + ':' + (s - m * 60).toFixed(1).padStart(4, '0'); };

// Boost pads, collectible "data packets", a start line and a lap timer.
export function createGame({ scene, van, startAngle, onAllPackets }) {
  const upd = [];

  // ----- boost pads -----
  const padTex = canvasTex(256, 192, (c, w, h) => {
    c.fillStyle = 'rgba(20,22,28,.85)'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffb347'; c.lineWidth = 8; c.strokeRect(6, 6, w - 12, h - 12);
    c.fillStyle = '#ffd166';
    for (let i = 0; i < 3; i++) { const x = 40 + i * 62; c.beginPath(); c.moveTo(x, 40); c.lineTo(x + 46, h / 2); c.lineTo(x, h - 40); c.lineTo(x + 18, h - 40); c.lineTo(x + 64, h / 2); c.lineTo(x + 18, 40); c.closePath(); c.fill(); }
  });
  const padGeo = new THREE.PlaneGeometry(5, 3.6).rotateX(-Math.PI / 2);
  const padMat = new THREE.MeshStandardMaterial({ map: padTex, emissiveMap: padTex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.8, transparent: true });
  const pads = PAD_ANGLES.map((deg) => {
    const a = deg * DEG, p = roadPoint(a), m = new THREE.Mesh(padGeo, padMat);
    m.position.set(p.x, 0.09, p.z); m.rotation.y = a; m.receiveShadow = true; scene.add(m); return { p, cool: 0 };
  });
  upd.push((t, dt, vp) => {
    padMat.emissiveIntensity = 0.3 + (Math.sin(t * 5) * 0.5 + 0.5) * 0.35;
    for (const pd of pads) {
      pd.cool = Math.max(0, pd.cool - dt);
      if (pd.cool === 0 && Math.hypot(vp.x - pd.p.x, vp.z - pd.p.z) < 2.7 && vp.y < 1.2) { van.kickT = 1.4; pd.cool = 1.5; audio.zap(); }
    }
  });

  // ----- start / finish line -----
  {
    const a = startAngle, p = roadPoint(a);
    const tex = canvasTex(256, 64, (c, w, h) => { const n = 16; for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#101216' : '#f3efe6'; c.fillRect(i * w / n, j * h / 4, w / n, h / 4); } });
    const line = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 7.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex }));
    line.position.set(p.x, 0.1, p.z); line.rotation.y = a; scene.add(line);
  }

  // ----- collectible packets -----
  const N = 45, PK = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.5, 0), mat(0xffc84a, { emissive: 0xffa010, ei: 1.6, metal: 0.4, rough: 0.35 }), N);
  PK.castShadow = true; PK.frustumCulled = false; scene.add(PK);
  const items = Array.from({ length: N }, (_, i) => {
    const a = (i * 8 + 3) * DEG, p = roadPoint(a), lane = [-2.3, 0, 2.3][i % 3];
    const r = Math.hypot(p.x, p.z) + lane, x = Math.sin(a) * r, z = Math.cos(a) * r;
    return { x, z, got: false, ph: i };
  });
  let collected = 0;
  const burst = (() => {
    const n = 90, pos = new Float32Array(n * 3).fill(-50), vel = Array.from({ length: n }, () => new THREE.Vector3()), life = new Float32Array(n);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd166, size: 0.35, transparent: true, depthWrite: false })); pts.frustumCulled = false; scene.add(pts);
    let idx = 0;
    return {
      emit(x, y, z) { for (let k = 0; k < 14; k++) { const i = idx++ % n; pos.set([x, y, z], i * 3); vel[i].set((Math.random() - 0.5) * 7, 3 + Math.random() * 5, (Math.random() - 0.5) * 7); life[i] = 0.8; } },
      step(dt) { for (let i = 0; i < n; i++) { if (life[i] <= 0) { pos[i * 3 + 1] = -50; continue; } life[i] -= dt; vel[i].y -= 14 * dt; pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt; } g.attributes.position.needsUpdate = true; },
    };
  })();
  const d = new THREE.Object3D();
  upd.push((t, dt, vp) => {
    burst.step(dt);
    items.forEach((it, i) => {
      if (!it.got && Math.hypot(vp.x - it.x, vp.z - it.z) < 2.2) {
        it.got = true; collected++; burst.emit(it.x, 1.2, it.z); audio.coin(); api.onChange?.();
        if (collected === N) onAllPackets?.();
      }
      d.position.set(it.x, 1.15 + Math.sin(t * 2 + it.ph) * 0.18, it.z); d.rotation.set(0, t * 1.6 + it.ph, 0.4);
      const s = it.got ? 0 : 1; d.scale.set(s, s, s); d.updateMatrix(); PK.setMatrixAt(i, d.matrix);
    });
    PK.instanceMatrix.needsUpdate = true;
  });

  // ----- lap timer -----
  let started = false, lapStart = 0, prog = 0, prevAng = null, now = 0, best = Infinity;
  try { const b = parseFloat(localStorage.getItem('zh-best')); if (b > 0) best = b; } catch { /* ignore */ }
  upd.push((t, dt, vp) => {
    now = t;
    const ang = Math.atan2(vp.x, vp.z), rel = norm(ang - startAngle);
    if (prevAng === null) { prevAng = ang; if (rel >= 0 && rel < 0.3) { started = true; lapStart = t; prog = rel; } return; }
    const dA = norm(ang - prevAng), prevRel = norm(prevAng - startAngle); prevAng = ang;
    if (Math.abs(dA) > 0.5) { started = false; return; } // teleported
    if (!started) { if (prevRel < 0 && rel >= 0 && rel < 0.5) { started = true; lapStart = t; prog = rel; } return; }
    prog += dA;
    if (prog < -0.4) { started = false; return; }
    if (prog >= Math.PI * 2 - 0.02) {
      const lap = t - lapStart; lapStart = t; prog -= Math.PI * 2;
      const isBest = lap < best; if (isBest) { best = lap; try { localStorage.setItem('zh-best', String(lap)); } catch { /* ignore */ } }
      api.onLap?.(lap, isBest);
    }
  });

  const api = {
    N, update(t, dt, vp) { for (const u of upd) u(t, dt, vp); },
    get collected() { return collected; },
    lapText() { return started ? fmt(now - lapStart) : '--'; },
    bestText() { return best < Infinity ? fmt(best) : '--'; },
    onChange: null, onLap: null,
  };
  return api;
}
