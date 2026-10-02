import * as THREE from 'three';
import { C, mat, mesh, box, cyl, sph, at, sprite, sign, canvasTex, text3d, rr, dynBox, colliderIn, localToWorld, staticBox } from './core.js';
import { stations, hubs, skills, awards, education, exploring, profile } from './data.js';
import { DEG, roadR, polar, roadPoint } from './world.js';

const hex = (s) => new THREE.Color(s).getHex();
const ease = (x) => x * x * (3 - 2 * x);

// ---------- shared pieces ----------
function crate(ctx, size, color, x, y, z, rotY = 0, mass = 3, tape = 0xe8d9b0) {
  const m = box(size, size, size, color);
  m.add(box(size * 1.03, size * 0.18, size * 1.03, tape));
  dynBox(ctx.scene, m, size, size, size, { mass, x, y, z, rotY });
  return m;
}

function labelCrate(ctx, text, color, x, y, z, rotY = 0, size = 1.8) {
  const tex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
    g.fillStyle = '#10151f'; g.textAlign = 'center'; g.textBaseline = 'middle'; let s = 54; g.font = `800 ${s}px Inter, system-ui, sans-serif`;
    while (g.measureText(text).width > w - 30) { s -= 3; g.font = `800 ${s}px Inter, system-ui, sans-serif`; }
    g.fillText(text, w / 2, h / 2);
  });
  const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), cap = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), [side, side, cap, cap, side, side]); m.castShadow = m.receiveShadow = true;
  dynBox(ctx.scene, m, size, size, size, { mass: 3, x, y, z, rotY });
  return m;
}

function pad(g, st, r = 8.6) {
  const c = hex(st.color);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ color: 0x0d1220, emissive: c, emissiveIntensity: 0.04, roughness: 1, transparent: true, opacity: 0.7 }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.06; disc.receiveShadow = true; g.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.28, r, 64), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; g.add(ring);
  const ring2 = ring.clone(); ring2.material = ring.material.clone(); ring2.scale.setScalar(0.72); g.add(ring2);
  return { disc, ring, ring2 };
}

function nameSign(g, st, z = 8.2) {
  const short = st.title.split(' - ')[0];
  const s = sign(short, { w: 6.4, h: 1.7, sub: st.period + '  ·  ' + st.org, accent: st.color });
  s.position.set(0, 1.25, z); s.rotation.x = -0.12; g.add(s);
  for (const sx of [-2.9, 2.9]) g.add(at(box(0.16, 1.1, 0.16, 0x2a3042), sx, 0.55, z - 0.1));
  return s;
}

function stripedTex(a = '#ff5d5d', b = '#f3efe6') {
  const t = canvasTex(256, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 32, 0, 32, h); } });
  t.wrapS = THREE.RepeatWrapping; return t;
}

function pillar(h, r, color, opts) { const m = cyl(r, r * 1.05, h, color, opts, 10); m.position.y = h / 2; return m; }

// ---------- builders: each gets (ctx, g, st) and returns { update(t, dt, f, vanPos) } ----------
const builders = {
  recharge(ctx, g, st) {
    g.add(at(cyl(3.2, 3.5, 0.5, 0x252b3d, {}, 8), 0, 0.25, 0));
    const tw = new THREE.Group(); g.add(tw);
    [[1.5, 0.3], [1.25, 2.4], [1.0, 4.6], [0.7, 6.6]].forEach(([r, y], i) => { tw.add(at(cyl(r * 0.8, r, 2.4, i % 2 ? 0x2d3552 : 0xffb347, {}, 12), 0, y + 1.0, 0)); });
    tw.add(at(sph(0.9, C.amber, { emissive: C.amber, ei: 2.5 }), 0, 8.4, 0));
    for (let i = 0; i < 4; i++) tw.add(at(cyl(1.7 - i * 0.2, 1.7 - i * 0.2, 0.1, C.cyan, { emissive: C.cyan, ei: 1.5 }, 24), 0, 1.6 + i * 1.9, 0));
    colliderIn(g, 0, 2.5, 0, 3.4, 5, 3.4);
    // 23 satellites on 3 orbits = 23 third-party APIs
    const orbits = [], counts = [8, 8, 7];
    counts.forEach((n, oi) => {
      const o = new THREE.Group(); o.position.y = 6.3; o.rotation.set((oi - 1) * 0.5, 0, oi * 0.35); g.add(o);
      const rad = 3.2 + oi * 1.1;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.03, 6, 64), new THREE.MeshBasicMaterial({ color: 0x4de3d0, transparent: true, opacity: 0.4 })); ring.rotation.x = Math.PI / 2; o.add(ring);
      const sats = [];
      for (let i = 0; i < n; i++) { const s = sph(0.3, i % 2 ? C.pink : C.cyan, { emissive: i % 2 ? C.pink : C.cyan, ei: 2.2 }, 10); s.castShadow = false; o.add(s); sats.push(s); }
      orbits.push({ o, rad, sats, sp: 0.5 - oi * 0.12 });
    });
    const lab = sprite('23 API satellites', { scale: 1.1, color: '#4de3d0', bg: 'rgba(10,14,24,.75)' }); lab.position.set(0, 10.4, 0); g.add(lab);
    const cur = ['$', '€', '£', '¥', '₹'].map((s, i) => { const sp = sprite(s, { scale: 1.5, color: '#ffd166', font: '800 90px Inter, system-ui, sans-serif', pad: 10 }); g.add(sp); return sp; });
    // phone slab
    const ph = box(1.6, 3, 0.2, 0x151a28, { metal: 0.5 }); ph.position.set(-5.2, 1.7, 1); ph.rotation.set(-0.25, 0.35, 0); g.add(ph);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.7), new THREE.MeshBasicMaterial({ map: canvasTex(140, 270, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffb347'); gr.addColorStop(1, '#ff5d5d'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '800 26px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('TOP-UP', w / 2, 70); c.font = '800 44px Inter, sans-serif'; c.fillText('100+', w / 2, 140); c.font = '600 20px Inter, sans-serif'; c.fillText('countries', w / 2, 175); }) }));
    scr.position.z = 0.11; ph.add(scr);
    return {
      update(t) {
        orbits.forEach((ob, oi) => ob.sats.forEach((s, i) => { const a = t * ob.sp + (i / ob.sats.length) * Math.PI * 2; s.position.set(Math.cos(a) * ob.rad, 0, Math.sin(a) * ob.rad); }));
        cur.forEach((s, i) => { const a = t * 0.6 + i * 1.256; s.position.set(Math.cos(a) * 6, 2.2 + Math.sin(t * 1.5 + i) * 0.5 + i * 0.3, Math.sin(a) * 6); });
        tw.rotation.y = t * 0.3;
      },
    };
  },

  gate(ctx, g, st) {
    const booth = box(2.2, 2.8, 2.2, 0x2a3350); booth.position.set(-4.4, 1.4, 0); g.add(booth);
    g.add(at(box(2.5, 0.25, 2.5, 0xe9eef7), -4.4, 2.9, 0));
    g.add(at(box(1.4, 0.8, 0.06, 0x7fe9ff, { emissive: 0x4de3d0, ei: 1.2 }), -4.4, 1.7, 1.12));
    colliderIn(g, -4.4, 1.4, 0, 2.2, 2.8, 2.2);
    g.add(at(box(0.7, 3.6, 0.7, 0x2a3350), 4.4, 1.8, 0)); colliderIn(g, 4.4, 1.8, 0, 0.7, 3.6, 0.7);
    g.add(at(box(0.9, 0.3, 0.9, C.red, { emissive: C.red, ei: 1 }), 4.4, 3.7, 0));
    const pivot = new THREE.Group(); pivot.position.set(-3.1, 1.6, 0); g.add(pivot);
    const arm = box(6.8, 0.28, 0.28, 0xffffff); arm.material = new THREE.MeshStandardMaterial({ map: stripedTex(), roughness: 0.6 }); arm.position.x = 3.4; arm.castShadow = true; pivot.add(arm);
    const card = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.06), new THREE.MeshStandardMaterial({ map: canvasTex(300, 200, (c, w, h) => { c.fillStyle = '#10151f'; c.fillRect(0, 0, w, h); c.fillStyle = '#4de3d0'; c.fillRect(0, 0, w, 50); c.fillStyle = '#10151f'; c.font = '800 32px Inter, sans-serif'; c.textAlign = 'center'; c.fillText('VISITOR', w / 2, 37); c.fillStyle = '#fff'; c.fillRect(30, 80, 70, 70); c.fillStyle = '#ffd166'; c.fillRect(120, 85, 140, 12); c.fillRect(120, 110, 100, 12); c.fillRect(120, 135, 120, 12); }), emissive: 0x335566, emissiveIntensity: 0.3 }));
    card.castShadow = true; g.add(card);
    const w = sprite('WPF + Django', { scale: 0.95, color: '#4de3d0', bg: 'rgba(10,14,24,.75)' }); w.position.set(0, 6.1, 0); g.add(w);
    let open = 0;
    return {
      update(t, dt, f, van) {
        const d = van ? Math.hypot(van.x - g.position.x, van.z - g.position.z) : 99;
        open += ((d < 13 ? 1 : 0) - open) * Math.min(1, 3 * dt);
        pivot.rotation.z = open * 1.2;
        card.position.set(0, 4.3 + Math.sin(t * 1.6) * 0.25, 0); card.rotation.y = t * 0.9;
      },
    };
  },

  shop(ctx, g, st) {
    g.add(at(box(6, 1.2, 1.8, C.wood), -1.2, 0.6, -1.2)); colliderIn(g, -1.2, 0.6, -1.2, 6, 1.2, 1.8);
    for (const sx of [-4, 1.6]) g.add(at(box(0.2, 3.4, 0.2, 0x3b2f2a), sx, 1.7, -2));
    const aw = box(6.6, 0.18, 2.8, 0xffffff); aw.material = new THREE.MeshStandardMaterial({ map: stripedTex('#ff7ab6', '#f3efe6'), roughness: 0.7 }); aw.position.set(-1.2, 3.5, -1); aw.rotation.x = 0.22; aw.castShadow = true; g.add(aw);
    const nop = sprite('nopCommerce', { scale: 1.1, color: '#ff7ab6', bg: 'rgba(10,14,24,.75)' }); nop.position.set(-1.2, 5.1, -1.2); g.add(nop);
    // parcels you can push around
    const cols = [0xc89a64, 0xb98a5b, 0xd8ae78, 0xa8794a];
    let n = 0;
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
      const p = localToWorld(g, 4.6 + (i - (3 - row) / 2) * 1.35 - 1, 0.6 + row * 1.25, 3.2);
      crate(ctx, 1.2, cols[n++ % 4], p.x, p.y, p.z, g.rotation.y + (Math.random() - 0.5) * 0.15);
    }
    for (let i = 0; i < 4; i++) { const p = localToWorld(g, -5 + i * 1.5, 0.6, 3.6); crate(ctx, 1.1, cols[i], p.x, p.y, p.z, g.rotation.y + i * 0.2); }
    return { update() { } };
  },

  phone(ctx, g, st) {
    const ph = new THREE.Group(); ph.position.y = 3.2; g.add(ph);
    ph.add(box(3.1, 5.6, 0.5, 0x151a28, { metal: 0.6, rough: 0.3 }));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 5.2), new THREE.MeshBasicMaterial({ map: canvasTex(280, 520, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0f7a45'); gr.addColorStop(1, '#0a2f2a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '800 44px Inter, sans-serif'; c.fillText('Telepay', w / 2, 80); c.font = '600 22px Inter, sans-serif'; c.fillStyle = '#7cf29a'; c.fillText('Retailer recharge', w / 2, 112);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { c.fillStyle = 'rgba(255,255,255,.14)'; rr(c, 30 + k * 82, 160 + r * 82, 70, 70, 14); c.fill(); c.fillStyle = '#fff'; c.font = '700 30px Inter, sans-serif'; c.fillText(String(r * 3 + k + 1), 65 + k * 82, 205 + r * 82); }
    }) }));
    scr.position.z = 0.26; ph.add(scr);
    const waves = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 40), new THREE.MeshBasicMaterial({ color: 0x7cf29a, transparent: true })); m.position.y = 6.8; m.rotation.x = Math.PI / 2; g.add(m); return m; });
    const sim = box(0.9, 1.2, 0.08, C.gold, { metal: 0.8, rough: 0.3, emissive: 0x6a5200, ei: 0.4 }); sim.add(at(box(0.45, 0.4, 0.1, 0x7a5c00), 0, 0.1, 0)); g.add(sim);
    g.add(at(cyl(2.4, 2.6, 0.4, 0x252b3d, {}, 8), 0, 0.2, 0));
    colliderIn(g, 0, 1.2, 0, 2.6, 2.4, 2.6);
    return {
      update(t) {
        ph.position.y = 3.6 + Math.sin(t * 1.2) * 0.2; ph.rotation.y = Math.sin(t * 0.5) * 0.35;
        waves.forEach((w, i) => { const k = ((t * 0.5 + i / 3) % 1); w.scale.setScalar(1 + k * 3.2); w.material.opacity = (1 - k) * 0.8; });
        sim.position.set(Math.cos(t * 0.9) * 3.4, 3.6 + Math.sin(t * 1.4) * 0.4, Math.sin(t * 0.9) * 3.4); sim.rotation.y = t * 1.5;
      },
    };
  },

  docs(ctx, g, st) {
    for (let i = 0; i < 7; i++) { const d = box(3.2, 0.14, 4.2, i % 2 ? 0xf3efe6 : 0xe4dfff); d.position.set(-2.4 + (Math.random() - 0.5) * 0.3, 0.1 + i * 0.16, 0); d.rotation.y = (i - 3) * 0.1; g.add(d); }
    colliderIn(g, -2.4, 0.6, 0, 3.4, 1.2, 4.2);
    const doc = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.8, 0.12), new THREE.MeshStandardMaterial({ map: canvasTex(360, 480, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#4c6ef5'; c.fillRect(0, 0, w, 64); c.fillStyle = '#fff'; c.font = '800 34px Inter, sans-serif'; c.textAlign = 'left'; c.fillText('Laxic', 20, 44);
      c.fillStyle = '#c7ccdb'; for (let i = 0; i < 12; i++) c.fillRect(24, 100 + i * 30, 312 - (i % 3) * 50, 12);
      c.fillStyle = '#9d8cff'; c.fillRect(24, 100 + 3 * 30, 160, 12);
    }), emissive: 0x222233, emissiveIntensity: 0.4 }));
    doc.position.set(1.8, 2.6, 0.5); doc.rotation.y = -0.2; doc.castShadow = true; g.add(doc);
    const cr = mesh(new THREE.OctahedronGeometry(1.1, 0), C.violet, { emissive: C.violet, ei: 1.8, rough: 0.2 }); g.add(cr);
    const orbs = [0, 1, 2, 3].map(() => { const o = mesh(new THREE.TetrahedronGeometry(0.25), 0xe4dfff, { emissive: C.violet, ei: 2 }); o.castShadow = false; g.add(o); return o; });
    const l = sprite('AI automation', { scale: 1, color: '#9d8cff', bg: 'rgba(10,14,24,.75)' }); l.position.set(0, 7.4, 0); g.add(l);
    return {
      update(t) {
        cr.position.set(0.2, 5.2 + Math.sin(t * 1.3) * 0.35, 0.5); cr.rotation.set(t * 0.6, t, 0);
        orbs.forEach((o, i) => { const a = t * 1.4 + i * 1.57; o.position.set(0.2 + Math.cos(a) * 1.9, 5.2 + Math.sin(a * 1.3) * 0.6, 0.5 + Math.sin(a) * 1.9); o.rotation.set(t * 2, a, 0); });
      },
    };
  },

  clock(ctx, g, st) {
    g.add(at(box(2.6, 7, 2.6, 0x2a3350), -2.6, 3.5, 0)); colliderIn(g, -2.6, 3.5, 0, 2.6, 7, 2.6);
    g.add(at(box(3.2, 0.5, 3.2, 0xffd166, { emissive: 0x6a4a00, ei: 0.6 }), -2.6, 7.2, 0));
    const face = new THREE.Mesh(new THREE.CircleGeometry(1.15, 48), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#f7f3e8'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill(); c.strokeStyle = '#10151f'; c.lineWidth = 6; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); c.lineTo(128 + Math.sin(a) * 118, 128 - Math.cos(a) * 118); c.stroke(); } }) }));
    face.position.set(-2.6, 5.4, 1.32); g.add(face);
    const hh = box(0.1, 0.65, 0.05, 0x10151f); hh.geometry.translate(0, 0.3, 0); const mh = box(0.07, 0.95, 0.05, 0x10151f); mh.geometry.translate(0, 0.45, 0); const sh = box(0.03, 1.0, 0.04, C.red); sh.geometry.translate(0, 0.4, 0);
    [hh, mh, sh].forEach((h) => { h.position.set(-2.6, 5.4, 1.36); g.add(h); });
    const bars = [0, 1, 2, 3, 4].map((i) => { const m = box(0.9, 1, 0.9, [C.cyan, C.amber, C.pink, C.green, C.violet][i], { emissive: [C.cyan, C.amber, C.pink, C.green, C.violet][i], ei: 0.5 }); m.geometry.translate(0, 0.5, 0); m.position.set(1.2 + i * 1.3, 0.05, 0.2); g.add(m); return m; });
    g.add(at(box(7, 0.12, 2, 0x252b3d), 3.4, 0.06, 0.2));
    const l = sprite('Attendance + Sales', { scale: 0.95, color: '#ffd166', bg: 'rgba(10,14,24,.75)' }); l.position.set(0, 8.9, 0); l.position.x = -1; g.add(l);
    return {
      update(t) {
        const d = new Date();
        sh.rotation.z = -d.getSeconds() / 60 * Math.PI * 2; mh.rotation.z = -(d.getMinutes() + d.getSeconds() / 60) / 60 * Math.PI * 2; hh.rotation.z = -((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2;
        bars.forEach((b, i) => { b.scale.y = 1.4 + (Math.sin(t * 0.9 + i * 1.3) * 0.5 + 0.5) * 3.6 + i * 0.35; });
      },
    };
  },

  conveyor(ctx, g, st) {
    const mkB = (x, label, color) => { const b = box(3, 4, 3, 0x2a3350); b.position.set(x, 2, -1); g.add(b); g.add(at(box(3.2, 0.3, 3.2, color, { emissive: color, ei: 0.8 }), x, 4.1, -1)); const s = sprite(label, { scale: 0.9, color: '#fff', bg: 'rgba(10,14,24,.75)' }); s.position.set(x, 5.4, -1); g.add(s); colliderIn(g, x, 2, -1, 3, 4, 3); };
    mkB(-6.2, 'ERP', C.cyan); mkB(6.2, 'SHOP', C.pink);
    const belt = box(9.2, 0.45, 1.5, 0x161a24); belt.position.set(0, 0.25, -1); g.add(belt);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.3), new THREE.MeshBasicMaterial({ map: (() => { const t = canvasTex(128, 32, (c, w, h) => { c.fillStyle = '#1e2330'; c.fillRect(0, 0, w, h); c.fillStyle = '#34404f'; for (let i = 0; i < 8; i++) c.fillRect(i * 16, 0, 6, h); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 1); return t; })() }));
    stripe.rotation.x = -Math.PI / 2; stripe.position.set(0, 0.49, -1); g.add(stripe);
    colliderIn(g, 0, 0.25, -1, 9.2, 0.5, 1.5);
    // gear = Windows service
    const gear = new THREE.Group(); gear.add(cyl(0.9, 0.9, 0.35, C.amber, { metal: 0.4 }, 16)); for (let i = 0; i < 8; i++) { const t = box(0.35, 0.35, 0.35, C.amber); const a = i * Math.PI / 4; t.position.set(Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05); gear.add(t); }
    gear.rotation.x = Math.PI / 2; const gw = new THREE.Group(); gw.position.set(0, 4.6, -1); gw.add(gear); g.add(gw);
    const lab = sprite('Windows Service · WCF', { scale: 0.8, color: '#ffb347', bg: 'rgba(10,14,24,.75)' }); lab.position.set(0, 6.6, -1); g.add(lab);
    // moving cargo
    const kinds = [['PRODUCT', 0x4de3d0], ['ORDER', 0xffb347], ['STOCK', 0xff7ab6]];
    const cargo = Array.from({ length: 9 }, (_, i) => { const [n, col] = kinds[i % 3]; const c = box(0.8, 0.8, 0.8, col, { emissive: col, ei: 0.35 }); g.add(c); return { c, u: i / 9 }; });
    kinds.forEach(([n, col], i) => { const s = sprite(n, { scale: 0.45, color: '#' + new THREE.Color(col).getHexString(), pad: 10 }); s.position.set(-2.6 + i * 2.6, 2.6, 1.2); g.add(s); });
    return {
      update(t, dt) {
        cargo.forEach((k) => { k.u = (k.u + dt * 0.1) % 1; k.c.position.set(-4.4 + k.u * 8.8, 0.95, -1); k.c.rotation.y = k.u * 0.5; });
        stripe.material.map.offset.x = -t * 0.8 / 9 * 9 * 0.1; gear.rotation.z = t * 1.2;
      },
    };
  },

  bridge(ctx, g, st) {
    // river crossing the road, deck on top. local x = direction of travel
    const river = new THREE.Mesh(new THREE.PlaneGeometry(13, 30), new THREE.MeshStandardMaterial({ map: (() => { const t = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#1b6e9e'; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(160,235,255,${0.1 + Math.random() * 0.3})`; c.lineWidth = 2; c.beginPath(); const y = Math.random() * h, x = Math.random() * w; c.moveTo(x, y); c.quadraticCurveTo(x + 20, y - 6, x + 40, y); c.stroke(); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 5); return t; })(), emissive: 0x0a3550, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.2 }));
    river.rotation.x = -Math.PI / 2; river.position.y = 0.025; river.receiveShadow = true; g.add(river);
    g.add(at(box(13.8, 0.14, 8, 0x30384a), 0, 0.08, 0));
    // road markings on deck
    g.add(at(box(13.8, 0.02, 0.2, C.cyan, { emissive: C.cyan, ei: 0.5 }), 0, 0.16, 0));
    const tops = [];
    for (const sx of [-6.6, 6.6]) for (const sz of [-4.5, 4.5]) { g.add(at(box(0.7, 10, 0.7, C.amber, { emissive: 0x6a3a00, ei: 0.4 }), sx, 5, sz)); colliderIn(g, sx, 5, sz, 0.8, 10, 0.8); }
    for (const sx of [-6.6, 6.6]) g.add(at(box(0.6, 0.6, 9.7, C.amber), sx, 9.8, 0)), g.add(at(box(0.5, 0.5, 9.7, C.amber), sx, 7, 0));
    const cableMat = new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffb347, emissiveIntensity: 0.5 });
    for (const sz of [-4.5, 4.5]) {
      const cv = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-6.6, 9.8, sz), new THREE.Vector3(0, 1.0, sz), new THREE.Vector3(6.6, 9.8, sz));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 40, 0.1, 6), cableMat));
      for (let i = 1; i < 14; i++) { const p = cv.getPoint(i / 14); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, p.y, 4), cableMat); h.position.set(p.x, p.y / 2, sz); g.add(h); }
      for (const sx of [-1, 1]) g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(sx * 6.6, 9.8, sz), new THREE.Vector3(sx * 13, 0.2, sz)), 2, 0.07, 5), cableMat));
    }
    const a = sprite('ASP.NET', { scale: 0.95, color: '#c5b8ff', bg: 'rgba(10,14,24,.8)' }), k = sprite('Kotlin', { scale: 0.95, color: '#ff9f43', bg: 'rgba(10,14,24,.8)' });
    a.position.set(-6.6, 11.6, 0); k.position.set(6.6, 11.6, 0); g.add(a, k);
    const pk = box(0.4, 0.4, 0.4, C.cyan, { emissive: C.cyan, ei: 3 }); g.add(pk);
    return { update(t) { river.material.map.offset.y = -t * 0.04; pk.position.set(Math.sin(t * 0.9) * 6.6, 11.6, 0); pk.rotation.set(t * 2, t * 1.5, 0); } };
  },

  inspect(ctx, g, st) {
    g.add(at(box(6, 1.1, 3.2, 0x2a3350), -1, 0.55, 0)); colliderIn(g, -1, 0.55, 0, 6, 1.1, 3.2);
    const model = new THREE.Group(); model.position.set(-1, 1.1, 0); g.add(model);
    model.add(at(box(4.6, 0.18, 1.2, 0xcfd6e4), 0, 0.5, 0));
    for (const sx of [-1.8, 1.8]) model.add(at(box(0.18, 1.8, 0.18, C.amber), sx, 1.1, 0.5)), model.add(at(box(0.18, 1.8, 0.18, C.amber), sx, 1.1, -0.5));
    for (let i = 0; i < 5; i++) model.add(at(box(0.12, 0.12, 1.0, 0x8da2b8), -2 + i, 0.3, 0));
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), new THREE.MeshBasicMaterial({ color: 0x4de3d0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); scan.rotation.y = Math.PI / 2; scan.position.y = 1.5; model.add(scan);
    // WinForms window
    const mon = new THREE.Group(); mon.position.set(5.5, 3.1, -0.5); g.add(mon);
    mon.add(box(4.6, 3.1, 0.2, 0x151a28, { metal: 0.4 }));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.8), new THREE.MeshBasicMaterial({ map: canvasTex(430, 280, (c, w, h) => {
      c.fillStyle = '#e9edf5'; c.fillRect(0, 0, w, h); c.fillStyle = '#2d5fbf'; c.fillRect(0, 0, w, 30); c.fillStyle = '#fff'; c.font = '600 18px Segoe UI, sans-serif'; c.fillText('Bridge Inspection  -  WinForms', 12, 21);
      c.fillStyle = '#ff5d5d'; c.fillRect(w - 24, 6, 16, 18);
      c.fillStyle = '#10151f'; c.font = '600 16px Segoe UI, sans-serif'; ['Pier P1', 'Girder G3', 'Bearing B2', 'Deck D4'].forEach((s, i) => { c.fillText(s, 20, 70 + i * 34); c.fillStyle = i == 2 ? '#ff9f43' : '#2fb36d'; c.fillRect(170, 56 + i * 34, 90, 18); c.fillStyle = '#10151f'; });
      c.fillStyle = '#c9d1e0'; c.fillRect(290, 50, 125, 160); c.fillStyle = '#2d5fbf'; c.fillRect(20, 230, 260, 24); c.fillStyle = '#e9edf5'; c.fillText('Save report', 320, 250);
    }) }));
    scr.position.z = 0.11; mon.add(scr); g.add(at(box(0.3, 1.8, 0.3, 0x2a3350), 5.5, 0.9, -0.5)); colliderIn(g, 5.5, 1.5, -0.5, 4.6, 3, 0.4);
    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.gold, { emissive: 0x6a5200, ei: 0.4 })); hat.castShadow = true; g.add(hat);
    hat.add(at(box(1.8, 0.1, 1.2, C.gold), 0, 0, 0.1));
    const l = sprite('C# · WinForms · SQL Server', { scale: 0.8, color: '#4de3d0', bg: 'rgba(10,14,24,.75)' }); l.position.set(-1, 5.3, 0); g.add(l);
    return { update(t) { scan.position.x = Math.sin(t * 1.1) * 2.2; hat.position.set(-1 + Math.cos(t * 0.8) * 0.1, 5.3 + Math.sin(t * 1.8) * 0.3 - 1.4 + 0.6, 0); hat.rotation.y = t; } };
  },

  meter(ctx, g, st) {
    g.add(at(box(6.5, 0.4, 3.2, 0x252b3d), 0, 0.2, -0.8));
    const body = new THREE.Group(); body.position.set(0, 4.6, -0.8); g.add(body);
    const cas = cyl(3.1, 3.1, 1.3, 0xe9eef7, { rough: 0.35 }, 32); cas.rotation.x = Math.PI / 2; body.add(cas);
    const dialTex = canvasTex(512, 512, (c, w, h) => {
      c.fillStyle = '#f7f3e8'; c.beginPath(); c.arc(256, 256, 250, 0, 7); c.fill();
      c.strokeStyle = '#10151f'; c.fillStyle = '#10151f'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i <= 20; i++) { const a = (-135 + i * 13.5) * DEG, l = i % 2 ? 18 : 34; c.lineWidth = i % 2 ? 3 : 5; c.beginPath(); c.moveTo(256 + Math.sin(a) * 215, 256 - Math.cos(a) * 215); c.lineTo(256 + Math.sin(a) * (215 - l), 256 - Math.cos(a) * (215 - l)); c.stroke(); if (i % 4 === 0) { c.font = '700 34px Inter, sans-serif'; c.fillText(String(i * 5), 256 + Math.sin(a) * 150, 256 - Math.cos(a) * 150); } }
      c.font = '800 44px Inter, sans-serif'; c.fillText('kWh', 256, 340); c.font = '600 24px Inter, sans-serif'; c.fillStyle = '#e03131'; c.fillText('SMART METER', 256, 400);
    });
    const dial = new THREE.Mesh(new THREE.CircleGeometry(2.85, 48), new THREE.MeshBasicMaterial({ map: dialTex })); dial.position.z = 0.67; body.add(dial);
    const needle = box(0.12, 2.5, 0.06, C.red, { emissive: C.red, ei: 1 }); needle.geometry.translate(0, 1.1, 0); needle.position.z = 0.72; body.add(needle);
    body.add(at(cyl(0.2, 0.2, 0.15, 0x10151f, {}, 12), 0, 0, 0.74)).rotation.x = 0;
    body.children[body.children.length - 1].rotation.x = Math.PI / 2;
    const glass = new THREE.Mesh(new THREE.CircleGeometry(2.9, 32), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.1 })); glass.position.z = 0.75; body.add(glass);
    colliderIn(g, 0, 2.5, -0.8, 6.4, 5, 1.8);
    // 46 engineers
    const N = 46, eng = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 8), mat(0xffffff), N); eng.castShadow = true; g.add(eng);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 8), mat(0xffd9b0), N); g.add(heads);
    const palette = [C.cyan, C.amber, C.pink, C.violet, C.green, 0xffffff]; const ec = new THREE.Color();
    const slots = [];
    for (let i = 0; i < N; i++) { const row = i < 18 ? 0 : i < 34 ? 1 : 2, k = row === 0 ? i : row === 1 ? i - 18 : i - 34, cnt = [18, 16, 12][row]; const a = (k / (cnt - 1) - 0.5) * 2.6 * (1 + row * 0.1); const r = 6.2 + row * 1.5; slots.push({ x: Math.sin(a) * r * 1.0, z: -0.8 + Math.cos(a) * r * 0.55 - 0.4, ph: i * 0.7 }); eng.setColorAt(i, ec.setHex(palette[i % palette.length])); }
    const d = new THREE.Object3D();
    const l = sprite('46 engineers · microservices', { scale: 0.85, color: '#ffd166', bg: 'rgba(10,14,24,.75)' }); l.position.set(0, 9.3, -0.8); g.add(l);
    // odometer
    const odo = document.createElement('canvas'); odo.width = 256; odo.height = 64; const oc = odo.getContext('2d'); const ot = new THREE.CanvasTexture(odo); ot.colorSpace = THREE.SRGBColorSpace;
    const op = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: ot })); op.position.set(0, -1.2, 0.8); body.add(op);
    let lastOdo = -1;
    // Ocelot gateway arch on the road, a bit before the station
    makeArch(ctx, st.angle * DEG - 0.2, 'OCELOT API GATEWAY', 'JWT secured', '#ffd166');
    return {
      update(t) {
        needle.rotation.z = -(Math.sin(t * 0.8) * 0.5 + 0.5) * 4.4 + 2.3;
        const v = Math.floor(t * 3.3); if (v !== lastOdo) { lastOdo = v; oc.fillStyle = '#10151f'; oc.fillRect(0, 0, 256, 64); oc.fillStyle = '#ffd166'; oc.font = '700 44px monospace'; oc.textAlign = 'center'; oc.textBaseline = 'middle'; oc.fillText(String(48210 + v).padStart(7, '0'), 128, 34); ot.needsUpdate = true; }
        slots.forEach((s, i) => { const b = Math.max(0, Math.sin(t * 2 + s.ph)) * 0.18; d.position.set(s.x, 0.55 + b, s.z); d.rotation.y = 0; d.updateMatrix(); eng.setMatrixAt(i, d.matrix); d.position.y += 0.7; d.updateMatrix(); heads.setMatrixAt(i, d.matrix); });
        eng.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
      },
    };
  },

  torii(ctx, g, st) {
    const red = 0xe0392f, rm = { emissive: 0x5a0a0a, ei: 0.5 };
    for (const sx of [-3.2, 3.2]) { g.add(at(cyl(0.38, 0.5, 6.4, red, rm, 12), sx, 3.2, 0)); colliderIn(g, sx, 3, 0, 0.9, 6, 0.9); }
    g.add(at(box(8.6, 0.55, 0.7, 0x151a28), 0, 6.5, 0)); g.add(at(box(9.6, 0.5, 0.9, red, rm), 0, 6.95, 0));
    g.add(at(box(7.2, 0.4, 0.5, red, rm), 0, 5.2, 0));
    const tab = sign('FBSC', { w: 1.4, h: 1.5, accent: '#ff5d5d', sub: 'JP' }); tab.position.set(0, 5.9, 0.4); g.add(tab);
    // databases + SSIS pipe
    const db = (x, color, label) => { const d = new THREE.Group(); for (let i = 0; i < 3; i++) d.add(at(cyl(1.5, 1.5, 0.9, i % 2 ? 0x2a3350 : color, { emissive: i % 2 ? 0 : color, ei: 0.35, metal: 0.3 }, 24), 0, 0.6 + i * 1.0, 0)); d.position.set(x, 0, -5.4); g.add(d); colliderIn(g, x, 1.6, -5.4, 3, 3.2, 3); const s = sprite(label, { scale: 0.8, color: '#fff', bg: 'rgba(10,14,24,.75)' }); s.position.set(x, 4.2, -5.4); g.add(s); };
    db(-5.2, C.cyan, 'System A'); db(5.2, C.amber, 'System B');
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 7.4, 10), mat(0x2a3350, { metal: 0.5 })); pipe.rotation.z = Math.PI / 2; pipe.position.set(0, 1.1, -5.4); g.add(pipe);
    const lab = sprite('SSIS · ETL · SQL Server', { scale: 0.75, color: '#ff9f9f', bg: 'rgba(10,14,24,.75)' }); lab.position.set(0, 3.4, -5.4); g.add(lab);
    const pulses = Array.from({ length: 8 }, (_, i) => { const p = sph(0.22, C.pink, { emissive: C.pink, ei: 3 }, 8); p.castShadow = false; g.add(p); return { p, u: i / 8 }; });
    for (const sx of [-4.2, 4.2]) { const lt = mesh(new THREE.SphereGeometry(0.45, 10, 8), 0xffd9a0, { emissive: 0xffb050, ei: 2 }); lt.position.set(sx, 2.4, 2.6); lt.scale.y = 1.4; g.add(lt); g.add(at(cyl(0.05, 0.05, 2, 0x10151f, {}, 5), sx, 1.2, 2.6)); }
    return { update(t, dt) { pulses.forEach((o) => { o.u = (o.u + dt * 0.25) % 1; o.p.position.set(-3.6 + o.u * 7.2, 1.1, -5.4); }); } };
  },
};

// ---------- gateway arch (on the road) ----------
function makeArch(ctx, a, title, sub, color) {
  const p = roadPoint(a), ag = new THREE.Group(); ag.position.copy(p); ag.rotation.y = a; ctx.scene.add(ag);
  for (const sz of [-4.5, 4.5]) { ag.add(at(box(0.8, 6.4, 0.8, 0x2a3350, { metal: 0.3 }), 0, 3.2, sz)); ag.add(at(box(0.9, 0.3, 0.9, hex(color), { emissive: hex(color), ei: 1.5 }), 0, 6.5, sz)); colliderIn(ag, 0, 3.2, sz, 0.9, 6.4, 0.9); }
  ag.add(at(box(0.9, 1.5, 10.2, 0x1b2133), 0, 6.8, 0));
  for (const side of [-1, 1]) { const s = sign(title, { w: 8.6, h: 1.3, accent: color, sub }); s.position.set(side * 0.47, 6.8, 0); s.rotation.y = side < 0 ? -Math.PI / 2 : Math.PI / 2; ag.add(s); }
  const shield = sph(0.5, hex(color), { emissive: hex(color), ei: 2 }, 6); shield.scale.set(0.2, 1, 1); shield.position.set(0, 8, 0); ag.add(shield);
  return ag;
}

// ---------- hubs ----------
function buildHubs(ctx) {
  const out = [];
  const scene = ctx.scene;
  const hubAt = (id, x, z, r, rotY = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g); const h = { st: hubs[id], g, radius: r, update() { } }; out.push(h); return h; };

  // ABOUT: name in physical 3D letters
  {
    const p = polar(0, roadR(0) - 15), h = hubAt('about', p.x, p.z, 17);
    const ring = pad(h.g, hubs.about, 10);
    const letters = 'ZAHID HASAN', size = 2.5, gap = 0.28;
    const metas = []; let total = 0;
    for (const ch of letters) { if (ch === ' ') { metas.push(null); total += size * 0.55; continue; } const m = text3d(ctx.font, ch, { size, depth: 1.0, color: C.white, emissive: 0x335a66, ei: 0.5 }); metas.push(m); total += m.userData.size.x + gap; }
    let x = -total / 2;
    metas.forEach((m, i) => {
      if (!m) { x += size * 0.55; return; }
      const s = m.userData.size, cx = x + s.x / 2; x += s.x + gap;
      const wp = localToWorld(h.g, cx, s.y / 2, 0);
      m.geometry.translate(0, -s.y / 2 + 0, 0);
      dynBox(scene, m, s.x, s.y, s.z, { mass: 4, x: wp.x, y: s.y / 2, z: wp.z, rotY: 0 });
      m.material = mat([C.cyan, C.white, C.amber][i % 3], { emissive: [0x1f6a6a, 0x222222, 0x6a4a00][i % 3], ei: 0.7 });
    });
    const sub = sign('SENIOR SOFTWARE ENGINEER', { w: 12, h: 1.3, sub: '.NET · Python · Microservices · AI-assisted', accent: '#4de3d0' });
    sub.position.set(0, 0.9, 3.6); sub.rotation.x = -0.1; h.g.add(sub);
    for (const sx of [-5.6, 5.6]) h.g.add(at(box(0.16, 0.8, 0.16, 0x2a3350), sx, 0.4, 3.5));
    const hint = sprite('W A S D / arrows to drive  ·  SHIFT boost  ·  SPACE hop  ·  H horn', { scale: 0.55, color: '#ffd166', bg: 'rgba(10,14,24,.75)' }); hint.position.set(0, 6.6, 0); h.g.add(hint);
    // physical stat numbers on the outer side of the road, readable from the road
    const stats = profile.stats;
    stats.forEach((s, i) => {
      const gx = polar(0, roadR(0) + 8.5);
      const m = text3d(ctx.font, s.big, { size: 3, depth: 1.2, color: C.gold, emissive: 0x7a4a00, ei: 0.8 });
      const sz = m.userData.size; m.geometry.translate(0, -sz.y / 2, 0);
      const wx = gx.x + (i - 1) * 9, wz = gx.z;
      dynBox(scene, m, sz.x, sz.y, sz.z, { mass: 5, x: wx, y: sz.y / 2, z: wz, rotY: Math.PI });
      const lab = sprite(s.label, { scale: 0.9, color: '#ffffff', bg: 'rgba(10,14,24,.75)' }); lab.position.set(0, sz.y / 2 + 1.0, 0); m.add(lab);
    });
    h.update = (t, dt, f) => { ring.ring.material.opacity = 0.2 + f * 0.35; };
  }

  // SKILLS: bowling-pin towers, height = rating
  {
    const c = new THREE.Vector3(-17, 0, 4), h = hubAt('skills', c.x, c.z, 17);
    const r = pad(h.g, hubs.skills, 15);
    const sg = sign('SKILLS MATRIX', { w: 7, h: 1.5, sub: 'height = proficiency · knock them down', accent: '#4de3d0' }); sg.position.set(0, 1.3, 0); sg.rotation.y = 0.0; h.g.add(sg);
    h.g.add(at(cyl(2.4, 2.8, 0.4, 0x252b3d, {}, 8), 0, 0.2, 0));
    const n = skills.length;
    skills.forEach((sk, i) => {
      const a = (i / n) * Math.PI * 2, rad = 9.2, hgt = 1.0 + sk.rating * 1.15, w = 1.55;
      const col = sk.rating === 5 ? C.cyan : sk.rating === 4 ? C.amber : C.pink;
      const m = box(w, hgt, w, col, { emissive: col, ei: 0.22 });
      m.add(at(box(w * 1.06, 0.18, w * 1.06, 0xffffff), 0, hgt / 2 - 0.1, 0));
      const lab = sprite(sk.name, { scale: 0.62, color: '#fff', bg: 'rgba(10,14,24,.78)', sub: '★'.repeat(sk.rating) + '☆'.repeat(5 - sk.rating) }); lab.position.set(0, hgt / 2 + 1.1, 0); m.add(lab);
      dynBox(scene, m, w, hgt, w, { mass: 5, x: c.x + Math.sin(a) * rad, y: hgt / 2, z: c.z + Math.cos(a) * rad, rotY: a });
    });
    h.update = (t, dt, f) => { r.ring.material.opacity = 0.18 + f * 0.35; };
  }

  // AWARDS: trophy podium + confetti
  {
    const c = new THREE.Vector3(18, 0, 10), h = hubAt('awards', c.x, c.z, 13);
    const r = pad(h.g, hubs.awards, 9);
    h.g.add(at(cyl(3, 3.4, 0.9, 0x2a3350, {}, 8), 0, 0.45, 0)); h.g.add(at(cyl(2.2, 2.6, 0.9, 0x3a4668, {}, 8), 0, 1.35, 0));
    colliderIn(h.g, 0, 1, 0, 6, 2, 6);
    const prof = [[0, 0], [0.9, 0.05], [0.5, 0.5], [0.5, 1.2], [1.2, 2.2], [1.6, 3.0], [1.5, 3.4], [0, 3.4]].map(([x, y]) => new THREE.Vector2(x, y));
    const cup = mesh(new THREE.LatheGeometry(prof, 24), C.gold, { metal: 0.9, rough: 0.25, emissive: 0x6a4a00, ei: 0.5 }); cup.position.y = 1.8; h.g.add(cup);
    for (const s of [-1, 1]) { const hd = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.1, 8, 20, Math.PI), mat(C.gold, { metal: 0.9, rough: 0.25 })); hd.position.set(s * 1.55, 4.7, 0); hd.rotation.z = s < 0 ? Math.PI / 2 : -Math.PI / 2; hd.rotation.y = 0; h.g.add(hd); }
    const star = mesh(new THREE.OctahedronGeometry(0.7, 0), C.gold, { emissive: C.gold, ei: 2.5 }); h.g.add(star);
    const s1 = sign('BEST PERFORMER', { w: 6, h: 1.6, sub: '2023-2024 · BJIT Limited', accent: '#ffd166' }); s1.position.set(0, 1.2, 5.4); s1.rotation.x = -0.12; h.g.add(s1);
    const s2 = sign('Design Patterns C#/.NET', { w: 6, h: 1.4, sub: '2023 · Udemy certified', accent: '#4de3d0' }); s2.position.set(0, 0.95, 7.6); s2.rotation.x = -0.12; h.g.add(s2);
    // confetti
    const N = 160, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = [], life = new Float32Array(N), cc = new THREE.Color();
    const pal = [0xffd166, 0x4de3d0, 0xff7ab6, 0x9d8cff, 0xffffff];
    for (let i = 0; i < N; i++) { col.set(cc.setHex(pal[i % 5]).toArray(), i * 3); vel.push(new THREE.Vector3()); pos[i * 3 + 1] = -50; }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); cg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const cf = new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.28, vertexColors: true, transparent: true, depthWrite: false })); cf.frustumCulled = false; h.g.add(cf);
    h.update = (t, dt, f) => {
      cup.rotation.y = t * 0.8; star.position.set(0, 6.3 + Math.sin(t * 2) * 0.2, 0); star.rotation.y = t * 1.5;
      r.ring.material.opacity = 0.18 + f * 0.35;
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) { if (f > 0.4 && Math.random() < dt * 3) { life[i] = 2 + Math.random() * 1.5; pos.set([(Math.random() - 0.5) * 1.5, 5.5, (Math.random() - 0.5) * 1.5], i * 3); vel[i].set((Math.random() - 0.5) * 6, 5 + Math.random() * 5, (Math.random() - 0.5) * 6); } else pos[i * 3 + 1] = -50; continue; }
        life[i] -= dt; vel[i].y -= 9 * dt; vel[i].multiplyScalar(1 - dt * 0.4);
        pos[i * 3] += vel[i].x * dt; pos[i * 3 + 1] += vel[i].y * dt; pos[i * 3 + 2] += vel[i].z * dt;
      }
      cg.attributes.position.needsUpdate = true;
    };
  }

  // LAB: currently exploring
  {
    const c = new THREE.Vector3(8, 0, -20), h = hubAt('lab', c.x, c.z, 15);
    const r = pad(h.g, hubs.lab, 12);
    h.g.add(at(cyl(7, 7.4, 0.5, 0x1c2133, {}, 6), 0, 0.25, 0));
    const tape = box(14, 0.3, 0.3, 0xffffff); tape.material = new THREE.MeshStandardMaterial({ map: stripedTex('#ffd166', '#10151f'), roughness: 0.7 }); tape.position.set(0, 0.9, 6.4); h.g.add(tape);
    const sg = sign('UNDER CONSTRUCTION', { w: 7, h: 1.5, sub: 'currently exploring', accent: '#9d8cff' }); sg.position.set(0, 1.6, 6.8); h.g.add(sg);
    const items = [];
    const mk = (label, x, z, build) => { const o = new THREE.Group(); o.position.set(x, 3.4, z); build(o); const s = sprite(label, { scale: 0.75, color: '#fff', bg: 'rgba(10,14,24,.78)' }); s.position.set(x, 6.1, z); h.g.add(o, s); items.push(o); return o; };
    mk('Kubernetes', -3.6, -2, (o) => { o.add(cyl(0.5, 0.5, 0.5, 0x326ce5, { emissive: 0x326ce5, ei: 1 }, 7).rotateX?.(Math.PI / 2)); const hub = o.children[0]; hub.rotation.x = Math.PI / 2; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const sp = box(0.18, 1.4, 0.18, 0x326ce5, { emissive: 0x326ce5, ei: 0.8 }); sp.geometry.translate(0, 0.9, 0); sp.rotation.z = a; o.add(sp); const k = sph(0.22, 0xffffff, { emissive: 0xffffff, ei: 1 }, 8); k.position.set(-Math.sin(a) * 1.7, Math.cos(a) * 1.7, 0); o.add(k); } o.add(new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 6, 36), mat(0x326ce5, { emissive: 0x326ce5, ei: 0.8 }))); });
    mk('Kong Gateway', 3.6, -2, (o) => { const hx = cyl(1.3, 1.3, 0.6, 0x1dd8a8, { emissive: 0x1dd8a8, ei: 1 }, 6); hx.rotation.x = Math.PI / 2; o.add(hx); const inner = cyl(0.7, 0.7, 0.7, 0x10151f, {}, 6); inner.rotation.x = Math.PI / 2; o.add(inner); for (const s of [-1, 1]) { const r1 = box(1, 0.2, 0.2, 0x1dd8a8, { emissive: 0x1dd8a8, ei: 1 }); r1.position.x = s * 2; o.add(r1); } });
    mk('MCP', -3.6, 3, (o) => { const a1 = box(1.2, 1.2, 1.2, 0xff9f43, { emissive: 0xff9f43, ei: 0.7 }); a1.name = 'pa'; o.add(a1); const b1 = box(1.2, 1.2, 1.2, 0x4de3d0, { emissive: 0x4de3d0, ei: 0.7 }); b1.name = 'pb'; o.add(b1); for (const s of [-1, 1]) { const pr = box(0.7, 0.18, 0.18, 0xe9eef7); pr.name = s < 0 ? 'pra' : 'prb'; pr.position.set(s * 0.9, 0.2, 0); o.add(pr); } });
    mk('RAG', 3.6, 3, (o) => { for (let i = 0; i < 4; i++) { const b = box(1.6 - i * 0.12, 0.28, 1.1, [C.pink, C.violet, C.cyan, C.amber][i]); b.position.set((i % 2) * 0.1, -0.5 + i * 0.3, 0); b.rotation.y = i * 0.25; o.add(b); } const lens = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.1, 8, 24), mat(C.gold, { metal: 0.8, rough: 0.3 })); lens.position.set(0.5, 1.4, 0.4); lens.name = 'lens'; o.add(lens); const hd = box(0.14, 0.9, 0.14, C.gold); hd.position.set(1.1, 0.95, 0.4); hd.rotation.z = 0.7; hd.name = 'lh'; o.add(hd); });
    h.update = (t, dt, f) => {
      r.ring.material.opacity = 0.18 + f * 0.35;
      items.forEach((o, i) => { o.position.y = 3.6 + Math.sin(t * 1.2 + i * 1.5) * 0.3; });
      items[0].rotation.z = t * 0.5; items[1].rotation.y = Math.sin(t * 0.8) * 0.6; items[3].rotation.y = t * 0.6;
      const m = items[2], gap = 0.9 + (Math.sin(t * 1.6) * 0.5 + 0.5) * 1.1;
      m.getObjectByName('pa').position.x = -gap - 0.6; m.getObjectByName('pb').position.x = gap + 0.6;
      m.getObjectByName('pra').position.x = -gap + 0.1; m.getObjectByName('prb').position.x = gap - 0.1;
    };
  }

  // EDUCATION
  {
    const p = new THREE.Vector3(-14, 0, -24), h = hubAt('edu', p.x, p.z, 14);
    const r = pad(h.g, hubs.edu, 11);
    const mkU = (x, color, label, sub) => {
      const b = box(4.4, 3.4, 3.4, color); b.position.set(x, 1.7, 0); h.g.add(b);
      h.g.add(at(box(4.8, 0.4, 3.8, 0xe9eef7), x, 3.6, 0));
      for (let i = 0; i < 3; i++) h.g.add(at(box(0.5, 1.2, 0.08, 0xfff0b0, { emissive: 0xffd080, ei: 1 }), x - 1.4 + i * 1.4, 1.9, 1.72));
      const capTop = box(2.2, 0.15, 2.2, 0x10151f); capTop.position.set(x, 4.4, 0); capTop.rotation.y = Math.PI / 4; h.g.add(capTop);
      h.g.add(at(cyl(0.9, 1.0, 0.5, 0x10151f, {}, 4), x, 4.1, 0).rotateY(Math.PI / 4));
      const tas = sph(0.14, C.gold, { emissive: C.gold, ei: 1.5 }, 6); tas.position.set(x + 1.0, 4.4, 1.0); h.g.add(tas);
      const s = sprite(label, { scale: 1.0, color: '#fff', bg: 'rgba(10,14,24,.78)', sub }); s.position.set(x, 6.6, 0); h.g.add(s);
      colliderIn(h.g, x, 1.9, 0, 4.4, 3.8, 3.4);
    };
    mkU(-3.4, 0x8a3a46, 'BUBT', 'B.Sc. CSE 2018-2022'); mkU(3.4, 0x2d5fbf, 'SIMT', 'Diploma 2014-2018');
    h.update = (t, dt, f) => { r.ring.material.opacity = 0.18 + f * 0.35; };
  }

  // CONTACT
  {
    const p = polar(300 * DEG, roadR(300 * DEG) - 14), h = hubAt('contact', p.x, p.z, 14, 300 * DEG);
    const r = pad(h.g, hubs.contact, 9);
    const mast = new THREE.Group(); h.g.add(mast);
    for (let i = 0; i < 6; i++) mast.add(at(cyl(0.5 - i * 0.06, 0.62 - i * 0.06, 1.6, i % 2 ? 0xe9eef7 : C.red, {}, 6), 0, 0.9 + i * 1.5, 0));
    const beacon = sph(0.4, C.red, { emissive: C.red, ei: 3 }, 8); beacon.position.y = 10.1; mast.add(beacon);
    const waves = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true })); m.position.y = 10.1; m.rotation.x = Math.PI / 2; h.g.add(m); return m; });
    colliderIn(h.g, 0, 3, 0, 1.4, 6, 1.4);
    const sg = sign("LET'S TALK", { w: 6, h: 1.6, sub: 'zhdruvo@gmail.com', accent: '#ffb347' }); sg.position.set(0, 1.2, 6.2); sg.rotation.x = -0.12; h.g.add(sg);
    [['EMAIL', '#ffb347', -3.8], ['LINKEDIN', '#4de3d0', 0], ['GITHUB.IO', '#ff7ab6', 3.8]].forEach(([t, c, x], i) => { const w = localToWorld(h.g, x, 0.9, 3.4 + (i === 1 ? 0.8 : 0)); labelCrate(ctx, t, c, w.x, w.y, w.z, h.g.rotation.y + (i - 1) * 0.12); });
    h.update = (t, dt, f) => { r.ring.material.opacity = 0.18 + f * 0.35; beacon.material.emissiveIntensity = 1 + (Math.sin(t * 5) > 0 ? 2.5 : 0); waves.forEach((w, i) => { const k = (t * 0.6 + i / 3) % 1; w.scale.setScalar(1 + k * 5); w.material.opacity = (1 - k) * 0.7; }); };
  }
  return out;
}

export function buildAll(ctx) {
  const entries = [];
  for (const st of stations) {
    const a = st.angle * DEG, rad = st.onRoad ? roadR(a) : roadR(a) - 14, p = polar(a, rad);
    const g = new THREE.Group(); g.position.copy(p); g.rotation.y = a; ctx.scene.add(g);
    g.updateMatrixWorld(true);
    let pd;
    if (!st.onRoad) { pd = pad(g, st); nameSign(g, st); } else { pd = pad(g, st, 9.5); const s = sign(st.title.split(' - ')[0], { w: 6.8, h: 1.7, sub: st.period + '  ·  ' + st.org, accent: st.color }); s.position.set(0, 1.25, -9); s.rotation.x = -0.12; g.add(s); }
    const impl = builders[st.build](ctx, g, st) || {};
    entries.push({ st, g, radius: st.onRoad ? 13 : 17, ring: pd.ring, update: impl.update || (() => { }) });
  }
  const hubEntries = buildHubs(ctx);
  entries.push(...hubEntries.map((h) => ({ ...h, ring: null })));
  return entries;
}
