import * as THREE from 'three';
import { mat, mesh, box, sph, cyl, at, sign } from './core.js';
import * as audio from './audio.js';

// ---------- rain: streaks that follow the player ----------
export function createRain(scene) {
  const N = 1800, W = 64, H = 34;
  const off = new Float32Array(N * 3), pos = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) { off[i * 3] = (Math.random() - 0.5) * W; off[i * 3 + 1] = Math.random() * H; off[i * 3 + 2] = (Math.random() - 0.5) * W; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineBasicMaterial({ color: 0xbfd0e8, transparent: true, opacity: 0, depthWrite: false });
  const lines = new THREE.LineSegments(g, m); lines.frustumCulled = false; lines.visible = false; scene.add(lines);
  return {
    update(dt, c, k) {
      m.opacity = 0.38 * k; lines.visible = k > 0.02; if (!lines.visible) return;
      for (let i = 0; i < N; i++) {
        let y = off[i * 3 + 1] - 42 * dt; if (y < 0) y += H; off[i * 3 + 1] = y;
        const x = c.x + off[i * 3], z = c.z + off[i * 3 + 2];
        pos.set([x, y, z, x - 0.04, y + 0.9, z + 0.03], i * 6);
      }
      g.attributes.position.needsUpdate = true;
    },
  };
}

// ---------- blimp with a hiring banner ----------
export function createBlimp(scene) {
  const g = new THREE.Group();
  const body = sph(1, 0xe8e4da, { rough: 0.5 }, 24); body.scale.set(9, 3.2, 3.2); g.add(body);
  for (const x of [-4.5, -1.5, 1.5]) { const band = new THREE.Mesh(new THREE.TorusGeometry(3.05 * Math.sqrt(Math.max(0.05, 1 - (x / 9) ** 2)), 0.12, 6, 28), mat(0xe8262b)); band.rotation.y = Math.PI / 2; band.position.x = x; g.add(band); }
  g.add(at(box(3.2, 1.1, 1.4, 0x2a3350), 0, -3.4, 0));
  for (const r of [0, Math.PI / 2]) { const f = box(2.6, 0.15, 3.6, 0xe8262b); f.position.set(-8.2, 0, 0); f.rotation.x = r; g.add(f); }
  const nav = [sph(0.18, 0xff2020, { emissive: 0xff2020, ei: 3 }, 8), sph(0.18, 0x20ff60, { emissive: 0x20ff60, ei: 3 }, 8)]; nav[0].position.set(-8.8, 0.2, 1.2); nav[1].position.set(-8.8, 0.2, -1.2); g.add(...nav);
  const banner = sign('OPEN TO NEW OPPORTUNITIES', { w: 13, h: 2.4, sub: 'zhdruvo@gmail.com', accent: '#ffb347' });
  banner.position.set(-18, -1, 0); banner.rotation.y = -Math.PI / 2; g.add(banner);
  const back = banner.clone(); back.rotation.y = Math.PI / 2; back.position.z = 0.02; g.add(back);
  for (const z of [-5.5, 5.5]) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-7, 0, 0), new THREE.Vector3(-12, -1, z * 0.3)]), new THREE.LineBasicMaterial({ color: 0x8da2b8 })));
  scene.add(g);
  return {
    update(t) {
      const a = t * 0.045, r = 78;
      g.position.set(Math.sin(a) * r, 44 + Math.sin(t * 0.4) * 1.5, Math.cos(a) * r);
      g.rotation.y = a + Math.PI; g.rotation.z = Math.sin(t * 0.3) * 0.03;
      nav[0].visible = nav[1].visible = Math.sin(t * 4) > -0.2;
    },
  };
}

// ---------- fireworks ----------
export function createFireworks(scene) {
  const N = 1100, pos = new Float32Array(N * 3).fill(-500), col = new Float32Array(N * 3), vel = Array.from({ length: N }, () => new THREE.Vector3()), life = new Float32Array(N);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.1, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); pts.frustumCulled = false; scene.add(pts);
  const rockets = []; let idx = 0, left = 0, next = 0; const c = new THREE.Color();
  const palette = [0xffd166, 0xff7ab6, 0x4de3d0, 0x9d8cff, 0xffffff, 0xff8a1f];
  function burst(p) {
    audio.boom(); c.setHex(palette[Math.floor(Math.random() * palette.length)]); const c2 = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
    for (let k = 0; k < 110; k++) {
      const i = idx++ % N, a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1), s = 9 + Math.random() * 7;
      pos.set([p.x, p.y, p.z], i * 3); vel[i].set(Math.sin(b) * Math.cos(a) * s, Math.cos(b) * s, Math.sin(b) * Math.sin(a) * s); life[i] = 1.6 + Math.random() * 0.8;
      const cc = k % 3 ? c : c2; col.set([cc.r, cc.g, cc.b], i * 3);
    }
  }
  return {
    show(seconds = 8) { left = seconds; next = 0; },
    update(dt, center) {
      if (left > 0) { left -= dt; next -= dt; if (next <= 0) { next = 0.35 + Math.random() * 0.4; const a = Math.random() * 6.283, r = 25 + Math.random() * 45; rockets.push({ p: new THREE.Vector3(center.x + Math.sin(a) * r, 2, center.z + Math.cos(a) * r), vy: 28 + Math.random() * 10, t: 0, top: 0.9 + Math.random() * 0.4 }); } }
      for (let i = rockets.length - 1; i >= 0; i--) { const r = rockets[i]; r.t += dt; r.p.y += r.vy * dt; if (r.t > r.top) { burst(r.p); rockets.splice(i, 1); } else { const j = idx++ % N; pos.set([r.p.x, r.p.y, r.p.z], j * 3); vel[j].set(0, -2, 0); life[j] = 0.35; col.set([1, 0.85, 0.5], j * 3); } }
      for (let i = 0; i < N; i++) { if (life[i] <= 0) { pos[i * 3 + 1] = -500; continue; } life[i] -= dt; vel[i].y -= 6 * dt; vel[i].multiplyScalar(1 - dt * 0.9); pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt; }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    },
  };
}
