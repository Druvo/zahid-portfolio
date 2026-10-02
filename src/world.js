import * as THREE from 'three';
import { C, mat, mesh, box, cyl, sph, canvasTex, staticBox } from './core.js';

export const ISLAND_R = 95;
export const DEG = Math.PI / 180;

// road radius wobbles gently so the loop does not feel like a perfect circle
export const roadR = (a) => 65 + 3.5 * Math.sin(a * 2 + 0.6);
export const polar = (a, r) => new THREE.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r);
export const roadPoint = (a) => polar(a, roadR(a));

export function createWorld(scene, renderer) {
  const updaters = [];

  // ---------- fog / sky ----------
  scene.fog = new THREE.Fog(0x5b3f78, 90, 330);
  scene.background = new THREE.Color(0x2a1d4a);

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vP;
      void main(){
        float h = clamp(vP.y*0.5+0.5, 0., 1.);
        vec3 low = vec3(1.0,0.46,0.34), mid = vec3(0.55,0.27,0.52), top = vec3(0.07,0.06,0.19);
        vec3 c = mix(low, mid, smoothstep(0.42,0.56,h));
        c = mix(c, top, smoothstep(0.55,0.95,h));
        c = mix(c, vec3(0.16,0.10,0.28), smoothstep(0.46,0.28,h)); // below horizon
        gl_FragColor = vec4(c,1.);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), skyMat); sky.renderOrder = -10; scene.add(sky);

  // stars
  {
    const n = 700, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random(), v = Math.random() * 0.85 + 0.12;
      const th = u * Math.PI * 2, ph = Math.acos(v);
      p[i * 3] = 650 * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = 650 * Math.cos(ph); p[i * 3 + 2] = 650 * Math.sin(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const s = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false, depthWrite: false }));
    scene.add(s);
  }
  // low sun
  {
    const t = canvasTex(256, 256, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.18, 'rgba(255,190,110,.95)'); gr.addColorStop(0.5, 'rgba(255,110,90,.35)'); gr.addColorStop(1, 'rgba(255,90,90,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    sun.position.set(-380, 70, -420); sun.scale.set(260, 260, 1); scene.add(sun);
  }

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0x9a86e0, 0x25304a, 1.1));
  const sunL = new THREE.DirectionalLight(0xffb27a, 2.6);
  sunL.castShadow = true;
  sunL.shadow.mapSize.set(2048, 2048);
  const sc = sunL.shadow.camera; sc.left = -50; sc.right = 50; sc.top = 50; sc.bottom = -50; sc.near = 1; sc.far = 220;
  sunL.shadow.bias = -0.0006; sunL.shadow.normalBias = 0.04;
  scene.add(sunL, sunL.target);
  const sunOffset = new THREE.Vector3(-70, 75, -55);

  // ---------- island ----------
  const gridTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#243b52'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    g.strokeStyle = 'rgba(77,227,208,.3)'; g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
    g.strokeStyle = 'rgba(77,227,208,.12)'; g.lineWidth = 1;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
  });
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping; gridTex.repeat.set(24, 24);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(ISLAND_R, 96), new THREE.MeshStandardMaterial({ map: gridTex, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // rocky underside
  {
    const g = new THREE.ConeGeometry(ISLAND_R, 78, 28, 6, true);
    g.rotateX(Math.PI); g.translate(0, -39 - 0.3, 0);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < -0.5 && y > -76) { pos.setX(i, pos.getX(i) * (1 + (Math.random() - 0.5) * 0.14)); pos.setZ(i, pos.getZ(i) * (1 + (Math.random() - 0.5) * 0.14)); pos.setY(i, y + (Math.random() - 0.5) * 3); }
    }
    g.computeVertexNormals();
    const rock = mesh(g, mat(0x2b2a45, { rough: 1 }), {}); rock.castShadow = false; scene.add(rock);
    // crystals hanging below
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 40;
      const c = mesh(new THREE.ConeGeometry(2 + Math.random() * 2, 12 + Math.random() * 18, 5), mat(C.violet, { emissive: C.violet, ei: 0.8 }));
      c.rotation.x = Math.PI; c.position.set(Math.cos(a) * r, -50 - Math.random() * 24 + 18 * (1 - r / 40), Math.sin(a) * r); c.castShadow = false; scene.add(c);
    }
  }

  // glowing rim + posts + invisible barrier
  {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(ISLAND_R - 0.4, 0.35, 8, 128), mat(C.amber, { emissive: C.amber, ei: 1.8 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.15; scene.add(rim);
    const N = 56, posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.4, 1.8, 6), mat(0x252a3a), N);
    const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 10, 8), mat(C.cyan, { emissive: C.cyan, ei: 3 }), N);
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, r = ISLAND_R - 3;
      m.makeTranslation(Math.sin(a) * r, 0.9, Math.cos(a) * r); posts.setMatrixAt(i, m);
      m.makeTranslation(Math.sin(a) * r, 2.0, Math.cos(a) * r); lights.setMatrixAt(i, m);
      staticBox(Math.sin(a) * (ISLAND_R - 1.5), 1.5, Math.cos(a) * (ISLAND_R - 1.5), (2 * Math.PI * ISLAND_R) / N + 1.5, 3, 2.5, a + Math.PI / 2);
    }
    posts.castShadow = true; scene.add(posts, lights);
  }

  // ---------- road (the timeline) ----------
  const SAMPLES = 360;
  const pts = []; for (let i = 0; i < SAMPLES; i++) pts.push(roadPoint((i / SAMPLES) * Math.PI * 2));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  {
    const W = 7.4, seg = 600, pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, p = curve.getPointAt(t % 1), tg = curve.getTangentAt(t % 1);
      const n = new THREE.Vector3(-tg.z, 0, tg.x);
      const l = p.clone().addScaledVector(n, -W / 2), r = p.clone().addScaledVector(n, W / 2);
      pos.push(l.x, 0.04, l.z, r.x, 0.04, r.z); uv.push(0, t * 34, 1, t * 34);
      if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const tex = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#10141c'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.04)'; for (let i = 0; i < 500; i++) c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      c.fillStyle = '#ffb347'; c.fillRect(8, 0, 5, h); c.fillRect(w - 13, 0, 5, h);
      c.fillStyle = '#4de3d0'; c.fillRect(w / 2 - 3, 20, 6, 90); c.fillRect(w / 2 - 3, 148, 6, 90);
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.9 }));
    road.receiveShadow = true; scene.add(road);
  }

  // timeline year markers painted on road
  for (const [yr, a] of [[2018, 14], [2019, 42], [2020, 90], [2021, 114], [2022, 138], [2023, 184], [2024, 232], [2025, 256]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.8), new THREE.MeshBasicMaterial({
      map: canvasTex(256, 90, (g, w, h) => { g.font = '800 64px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(255,179,71,.85)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(yr), w / 2, h / 2); }),
      transparent: true, depthWrite: false,
    }));
    const ar = a * DEG, p = roadPoint(ar);
    s.rotation.x = -Math.PI / 2; s.rotation.z = ar; // text reads along direction of travel
    s.position.set(p.x, 0.07, p.z); scene.add(s);
  }

  // streetlamps outside the road
  {
    const N = 24, poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 4.2, 6), mat(0x2a3042), N);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 10, 8), mat(0xffd9a0, { emissive: 0xffc070, ei: 3.5 }), N);
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const a = ((i + 0.5) / N) * Math.PI * 2, p = polar(a, roadR(a) + 5);
      m.makeTranslation(p.x, 2.1, p.z); poles.setMatrixAt(i, m);
      m.makeTranslation(p.x, 4.3, p.z); bulbs.setMatrixAt(i, m);
    }
    poles.castShadow = true; scene.add(poles, bulbs);
  }

  // data packets flowing along the road, like traffic on a network
  {
    const N = 90, inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), mat(C.cyan, { emissive: C.cyan, ei: 3.2 }), N);
    inst.frustumCulled = false; scene.add(inst);
    const d = new THREE.Object3D(), tmp = new THREE.Vector3(), tg = new THREE.Vector3();
    const items = Array.from({ length: N }, (_, i) => ({ u: Math.random(), lane: i % 2 ? 1 : -1, sp: 0.006 + Math.random() * 0.004, ph: Math.random() * 6 }));
    updaters.push((t, dt) => {
      items.forEach((it, i) => {
        it.u = (it.u + it.sp * dt * it.lane * -1 + 1) % 1;
        curve.getPointAt(it.u, tmp); curve.getTangentAt(it.u, tg);
        d.position.set(tmp.x - tg.z * it.lane * 2.5, 0.6 + Math.sin(t * 3 + it.ph) * 0.12, tmp.z + tg.x * it.lane * 2.5);
        d.rotation.set(t + it.ph, t * 1.3, 0); d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
    });
  }

  // ---------- clouds & floating rocks ----------
  const clouds = [];
  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group(), a = (i / 18) * Math.PI * 2 + Math.random(), r = 130 + Math.random() * 190;
    const cm = mat(i % 3 ? 0xffc8d4 : 0xd9c8ff, { emissive: 0x6a3a6a, ei: 0.35, opacity: 0.88 });
    for (let k = 0; k < 5; k++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(7 + Math.random() * 7, 1), cm);
      s.position.set((k - 2) * 9 + Math.random() * 4, Math.random() * 4, Math.random() * 8); s.scale.y = 0.6; g.add(s);
    }
    g.position.set(Math.sin(a) * r, -20 + Math.random() * 60, Math.cos(a) * r); g.userData = { a, r, y: g.position.y, sp: 0.01 + Math.random() * 0.012 };
    scene.add(g); clouds.push(g);
  }
  updaters.push((t) => clouds.forEach((c) => {
    const u = c.userData, a = u.a + t * u.sp * 0.1;
    c.position.set(Math.sin(a) * u.r, u.y + Math.sin(t * 0.2 + u.a) * 2, Math.cos(a) * u.r);
  }));

  // ambient fireflies near island
  {
    const n = 220, p = new Float32Array(n * 3), seeds = [];
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, r = Math.random() * 92; seeds.push([a, r, Math.random() * 6]); p[i * 3] = Math.sin(a) * r; p[i * 3 + 1] = 1 + Math.random() * 14; p[i * 3 + 2] = Math.cos(a) * r; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts2 = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.35, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(pts2);
    updaters.push((t) => { const a = g.attributes.position; for (let i = 0; i < n; i++) a.setY(i, 1 + ((seeds[i][2] * 3 + t * 0.6 + i) % 14)); a.needsUpdate = true; });
  }

  return {
    curve, sun: sunL,
    update(t, dt, focus) {
      updaters.forEach((u) => u(t, dt));
      sunL.position.copy(focus).add(sunOffset); sunL.target.position.copy(focus);
    },
  };
}
