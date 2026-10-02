import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
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
  scene.fog = new THREE.Fog(0xb9a898, 110, 420);
  scene.background = new THREE.Color(0xb9a898);
  // soft image-based lighting so metal, glass and paint read as real materials
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45;

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uLow: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uTop: { value: new THREE.Color() }, uBelow: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vP; uniform vec3 uLow, uMid, uTop, uBelow;
      void main(){
        float h = clamp(vP.y*0.5+0.5, 0., 1.);
        vec3 low = uLow, mid = uMid, top = uTop;
        vec3 c = mix(low, mid, smoothstep(0.42,0.56,h));
        c = mix(c, top, smoothstep(0.55,0.95,h));
        c = mix(c, uBelow, smoothstep(0.46,0.28,h)); // haze below horizon
        gl_FragColor = vec4(c,1.);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), skyMat); sky.renderOrder = -10; scene.add(sky);

  let starsMat, sunSprite, roadMat; const lampMats = []; let wetT = 0, wet = 0, flash = 0;
  // stars
  {
    const n = 700, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random(), v = Math.random() * 0.85 + 0.12;
      const th = u * Math.PI * 2, ph = Math.acos(v);
      p[i * 3] = 650 * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = 650 * Math.cos(ph); p[i * 3 + 2] = 650 * Math.sin(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const s = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.12, fog: false, depthWrite: false }));
    scene.add(s); starsMat = s.material;
  }
  // low sun
  {
    const t = canvasTex(256, 256, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,248,230,1)'); gr.addColorStop(0.1, 'rgba(255,225,170,.9)'); gr.addColorStop(0.35, 'rgba(255,190,130,.22)'); gr.addColorStop(1, 'rgba(255,170,120,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    sun.position.set(-380, 70, -420); sun.scale.set(170, 170, 1); scene.add(sun); sunSprite = sun;
  }

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(0xbcd0f0, 0x4a4a42, 0.85); scene.add(hemi);
  const sunL = new THREE.DirectionalLight(0xffd7a6, 3.1);
  sunL.castShadow = true;
  sunL.shadow.mapSize.set(2048, 2048);
  const sc = sunL.shadow.camera; sc.left = -50; sc.right = 50; sc.top = 50; sc.bottom = -50; sc.near = 1; sc.far = 220;
  sunL.shadow.bias = -0.0006; sunL.shadow.normalBias = 0.04;
  scene.add(sunL, sunL.target);
  const sunOffset = new THREE.Vector3(-85, 55, -60);

  // ---------- island ----------
  const gridTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#5d6b45'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, r); const c = ['90,104,62', '112,104,70', '70,86,52'][i % 3]; gr.addColorStop(0, `rgba(${c},.35)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < 5000; i++) { g.fillStyle = Math.random() > 0.5 ? 'rgba(30,40,20,.18)' : 'rgba(170,175,120,.12)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 3); }
  });
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping; gridTex.repeat.set(14, 14);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(ISLAND_R, 96), new THREE.MeshStandardMaterial({ map: gridTex, roughness: 1 }));
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
    const rock = mesh(g, mat(0x5a5048, { rough: 1 }), {}); rock.castShadow = false; scene.add(rock);
    // crystals hanging below
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 40;
      const c = mesh(new THREE.ConeGeometry(2 + Math.random() * 2, 12 + Math.random() * 18, 5), mat(0x6b6258, { rough: 1 }));
      c.rotation.x = Math.PI; c.position.set(Math.cos(a) * r, -50 - Math.random() * 24 + 18 * (1 - r / 40), Math.sin(a) * r); c.castShadow = false; scene.add(c);
    }
  }

  // glowing rim + posts + invisible barrier
  {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(ISLAND_R - 0.4, 0.35, 8, 128), mat(0x7a6f60, { rough: 0.9 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.15; scene.add(rim);
    const N = 56, posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.4, 1.8, 6), mat(0x252a3a), N);
    const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 10, 8), mat(0xffd9a0, { emissive: 0xffc070, ei: 1.4 }), N);
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, r = ISLAND_R - 3;
      m.makeTranslation(Math.sin(a) * r, 0.9, Math.cos(a) * r); posts.setMatrixAt(i, m);
      m.makeTranslation(Math.sin(a) * r, 2.0, Math.cos(a) * r); lights.setMatrixAt(i, m);
      staticBox(Math.sin(a) * (ISLAND_R - 1.5), 1.5, Math.cos(a) * (ISLAND_R - 1.5), (2 * Math.PI * ISLAND_R) / N + 1.5, 3, 2.5, a + Math.PI / 2);
    }
    posts.castShadow = true; scene.add(posts, lights); lampMats.push(lights.material);
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
      c.fillStyle = '#34363b'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) { c.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.12)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      c.fillStyle = '#d9d6cc'; c.fillRect(10, 0, 5, h); c.fillRect(w - 15, 0, 5, h);
      c.fillStyle = '#e8c84a'; c.fillRect(w / 2 - 3, 20, 6, 90); c.fillRect(w / 2 - 3, 148, 6, 90);
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    road.receiveShadow = true; scene.add(road); roadMat = road.material;
  }

  // timeline year markers painted on road
  for (const [yr, a] of [[2018, 14], [2019, 42], [2020, 90], [2021, 114], [2022, 138], [2023, 184], [2024, 232], [2025, 256]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.8), new THREE.MeshBasicMaterial({
      map: canvasTex(256, 90, (g, w, h) => { g.font = '800 64px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(235,232,220,.8)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(yr), w / 2, h / 2); }),
      transparent: true, depthWrite: false,
    }));
    const ar = a * DEG, p = roadPoint(ar);
    s.rotation.x = -Math.PI / 2; s.rotation.z = ar; // text reads along direction of travel
    s.position.set(p.x, 0.07, p.z); scene.add(s);
  }

  // streetlamps outside the road
  {
    const N = 24, poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 4.2, 6), mat(0x2a3042), N);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 10, 8), mat(0xffe2b8, { emissive: 0xffc070, ei: 1.6 }), N);
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const a = ((i + 0.5) / N) * Math.PI * 2, p = polar(a, roadR(a) + 5);
      m.makeTranslation(p.x, 2.1, p.z); poles.setMatrixAt(i, m);
      m.makeTranslation(p.x, 4.3, p.z); bulbs.setMatrixAt(i, m);
    }
    poles.castShadow = true; scene.add(poles, bulbs); lampMats.push(bulbs.material);
  }

  // data packets flowing along the road, like traffic on a network
  {
    const N = 90, inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), mat(0x8fd8e8, { emissive: 0x4fb8d0, ei: 1.6 }), N);
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
    const cm = mat(i % 3 ? 0xf2ebe4 : 0xd8dbe4, { emissive: 0x8a8070, ei: 0.25, opacity: 0.9 });
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
    const pts2 = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff0d0, size: 0.18, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(pts2);
    updaters.push((t) => { const a = g.attributes.position; for (let i = 0; i < n; i++) a.setY(i, 1 + ((seeds[i][2] * 3 + t * 0.6 + i) % 14)); a.needsUpdate = true; });
  }

  // ---------- time of day ----------
  const C3 = (h) => new THREE.Color(h);
  const MOODS = {
    golden: { name: 'Golden hour', low: C3(0xfac799), mid: C3(0x99add1), top: C3(0x335799), below: C3(0x9e8f8c), fog: C3(0xb9a898), hemiSky: C3(0xbcd0f0), hemiGround: C3(0x4a4a42), hemiI: 0.85, sun: C3(0xffd7a6), sunI: 3.1, off: new THREE.Vector3(-85, 55, -60), exposure: 0.92, stars: 0.12, env: 0.45, lamp: 0.7, disc: 1 },
    day: { name: 'Midday', low: C3(0xdde8f2), mid: C3(0x8fb8e8), top: C3(0x3f7fd0), below: C3(0xa8b0b8), fog: C3(0xc4d4e4), hemiSky: C3(0xdfeeff), hemiGround: C3(0x6a6a60), hemiI: 1.1, sun: C3(0xfff4dd), sunI: 3.4, off: new THREE.Vector3(-40, 90, -30), exposure: 0.9, stars: 0, env: 0.6, lamp: 0.1, disc: 0.3 },
    night: { name: 'Night', low: C3(0x1b2238), mid: C3(0x0e1428), top: C3(0x04060f), below: C3(0x0a0d18), fog: C3(0x0a0e1c), hemiSky: C3(0x4a5a90), hemiGround: C3(0x10131f), hemiI: 0.5, sun: C3(0x9db4ff), sunI: 0.9, off: new THREE.Vector3(60, 70, 40), exposure: 1.05, stars: 0.9, env: 0.12, lamp: 3.4, disc: 0 },
  };
  const cur = { low: C3(0), mid: C3(0), top: C3(0), below: C3(0), fog: C3(0), hemiSky: C3(0), hemiGround: C3(0), sun: C3(0), off: new THREE.Vector3(), hemiI: 0, sunI: 0, exposure: 1, stars: 0, env: 0, lamp: 0, disc: 1 };
  let mood = 'night';
  const copyMood = (m) => { for (const k of Object.keys(cur)) cur[k].isColor || cur[k].isVector3 ? cur[k].copy(m[k]) : (cur[k] = m[k]); };
  copyMood(MOODS.night);
  function applyMood() {
    const u = skyMat.uniforms; u.uLow.value.copy(cur.low); u.uMid.value.copy(cur.mid); u.uTop.value.copy(cur.top); u.uBelow.value.copy(cur.below);
    scene.fog.color.copy(cur.fog); scene.background.copy(cur.fog);
    hemi.color.copy(cur.hemiSky); hemi.groundColor.copy(cur.hemiGround); hemi.intensity = cur.hemiI + flash * 2.5;
    sunL.color.copy(cur.sun); sunL.intensity = cur.sunI * (1 - 0.6 * wet);
    scene.fog.near = 110 * (1 - 0.5 * wet); scene.fog.far = 420 * (1 - 0.45 * wet);
    roadMat.roughness = 0.95 - 0.62 * wet; roadMat.color.setScalar(1 - 0.35 * wet); sunOffset.copy(cur.off);
    renderer.toneMappingExposure = cur.exposure; starsMat.opacity = cur.stars * (1 - wet); scene.environmentIntensity = cur.env; sunSprite.material.opacity = cur.disc;
    for (const m of lampMats) m.emissiveIntensity = cur.lamp;
  }
  applyMood();
  function easeMood(dt) {
    const k = 1 - Math.exp(-dt * 2.2), t = MOODS[mood];
    wet += (wetT - wet) * (1 - Math.exp(-dt * 1.2)); flash = Math.max(0, flash - dt * 3.5);
    for (const key of Object.keys(cur)) { if (cur[key].isColor || cur[key].isVector3) cur[key].lerp(t[key], k); else cur[key] += (t[key] - cur[key]) * k; }
    applyMood();
  }

  return {
    curve, sun: sunL, MOODS,
    get mood() { return mood; }, get wetness() { return wet; }, setWet(v) { wetT = v; }, strike() { flash = 1; }, setMood(m) { if (MOODS[m]) mood = m; return MOODS[mood].name; },
    update(t, dt, focus) {
      easeMood(dt);
      updaters.forEach((u) => u(t, dt));
      sunL.position.copy(focus).add(sunOffset); sunL.target.position.copy(focus);
    },
  };
}
