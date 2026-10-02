import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// ---------- palette ----------
export const C = {
  ground: 0x1b2a3a, grid: 0x2f4d63, road: 0x12161d, amber: 0xffb347, cyan: 0x4de3d0,
  pink: 0xff7ab6, violet: 0x9d8cff, green: 0x7cf29a, red: 0xff5d5d, gold: 0xffd166,
  white: 0xf3efe6, dark: 0x1d2433, steel: 0x8da2b8, wood: 0xb98a5b,
};

// ---------- materials / meshes ----------
const EM = 0.45; // global emissive scale: keeps neon accents subtle
const matCache = new Map();
export function mat(color, { emissive = 0, ei = 1, rough = 0.65, metal = 0.05, opacity = 1 } = {}) {
  const key = `${color}|${emissive}|${ei}|${rough}|${metal}|${opacity}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({
      color, roughness: rough, metalness: metal, flatShading: true,
      emissive, emissiveIntensity: emissive ? ei * EM : 0,
      transparent: opacity < 1, opacity,
    }));
  }
  return matCache.get(key);
}

export function shadow(m, cast = true, recv = true) { m.castShadow = cast; m.receiveShadow = recv; return m; }

export function mesh(geo, color, opts = {}) {
  return shadow(new THREE.Mesh(geo, typeof color === 'object' && color.isMaterial ? color : mat(color, opts)));
}
export function box(w, h, d, color, opts) { return mesh(new THREE.BoxGeometry(w, h, d), color, opts); }
export function cyl(rt, rb, h, color, opts = {}, seg = 20) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), color, opts); }
export function sph(r, color, opts = {}, seg = 16) { return mesh(new THREE.SphereGeometry(r, seg, seg), color, opts); }
export function at(o, x = 0, y = 0, z = 0) { o.position.set(x, y, z); return o; }
export function glow(color, ei = 2) { return { emissive: color, ei }; }

// ---------- 2D label textures ----------
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function sprite(text, { scale = 4, color = '#fff', bg = null, font = '700 64px Inter, system-ui, sans-serif', sub = null, pad = 28 } = {}) {
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const tw = Math.ceil(probe.measureText(text).width);
  const H = sub ? 190 : 120;
  const W = Math.max(tw + pad * 2, 140);
  const tex = canvasTex(W, H, (g) => {
    if (bg) { g.fillStyle = bg; rr(g, 0, 0, W, H, 26); g.fill(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font; g.fillStyle = color; g.fillText(text, W / 2, sub ? 60 : H / 2 + 2);
    if (sub) { g.font = '500 40px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(sub, W / 2, 140); }
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(scale * (W / H), scale, 1);
  return s;
}

// sign plane that faces +z (does not billboard)
export function sign(text, { w = 6, h = 1.6, color = '#fff', bg = '#10151f', accent = '#4de3d0', font = '800 84px Inter, system-ui, sans-serif', sub = null } = {}) {
  const W = 1024, H = Math.round(1024 * h / w);
  const tex = canvasTex(W, H, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.strokeStyle = accent; g.lineWidth = 12; g.strokeRect(10, 10, W - 20, H - 20);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 84; g.font = font;
    while (g.measureText(text).width > W - 90 && size > 20) { size -= 4; g.font = font.replace('84px', size + 'px'); }
    g.fillStyle = color; g.fillText(text, W / 2, sub ? H * 0.42 : H / 2 + 4);
    if (sub) { g.font = '500 44px Inter, system-ui, sans-serif'; g.fillStyle = accent; g.fillText(sub, W / 2, H * 0.78); }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.8 }));
  return shadow(m, false, false);
}

export function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// ---------- 3D text ----------
export function text3d(font, str, { size = 1, depth = 0.4, color = C.white, emissive = 0, ei = 1.2 } = {}) {
  const geo = new TextGeometry(str, { font, size, depth, curveSegments: 4, bevelEnabled: true, bevelThickness: size * 0.04, bevelSize: size * 0.03, bevelSegments: 2 });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -depth / 2);
  const m = mesh(geo, color, emissive ? { emissive, ei } : {});
  m.userData.size = new THREE.Vector3(bb.max.x - bb.min.x, bb.max.y - bb.min.y, depth);
  return m;
}

// ---------- physics ----------
export const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -32, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.defaultContactMaterial.friction = 0.35;

export const phys = {
  ground: new CANNON.Material('ground'),
  car: new CANNON.Material('car'),
  prop: new CANNON.Material('prop'),
};
world.addContactMaterial(new CANNON.ContactMaterial(phys.car, phys.ground, { friction: 0, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(phys.car, phys.prop, { friction: 0.05, restitution: 0.05 }));
world.addContactMaterial(new CANNON.ContactMaterial(phys.prop, phys.ground, { friction: 0.5, restitution: 0.12 }));
world.addContactMaterial(new CANNON.ContactMaterial(phys.prop, phys.prop, { friction: 0.4, restitution: 0.1 }));

const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: phys.ground });
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

export const synced = []; // { mesh, body }

export function staticBox(x, y, z, w, h, d, rotY = 0) {
  const b = new CANNON.Body({ mass: 0, material: phys.prop });
  b.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
  b.position.set(x, y, z); b.quaternion.setFromEuler(0, rotY, 0);
  world.addBody(b); return b;
}

// attach mesh (already in scene root) to a dynamic box body
export function dynBox(scene, m, w, h, d, { mass = 4, x = 0, y = h / 2, z = 0, rotY = 0 } = {}) {
  const b = new CANNON.Body({ mass, material: phys.prop, linearDamping: 0.12, angularDamping: 0.25 });
  b.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
  b.position.set(x, y, z); b.quaternion.setFromEuler(0, rotY, 0);
  b.allowSleep = true; b.sleepSpeedLimit = 0.25; b.sleepTimeLimit = 0.8;
  world.addBody(b);
  m.position.set(x, y, z); m.quaternion.copy(b.quaternion);
  scene.add(m);
  synced.push({ mesh: m, body: b, home: new THREE.Vector3(x, y, z), homeQ: b.quaternion.clone() });
  return b;
}

// helpers that resolve group-local coords to world for colliders / dynamic props
export function localToWorld(g, x, y, z) {
  g.updateMatrixWorld(true);
  return g.localToWorld(new THREE.Vector3(x, y, z));
}
export function colliderIn(g, x, y, z, w, h, d) {
  const p = localToWorld(g, x, y, z);
  return staticBox(p.x, p.y, p.z, w, h, d, g.rotation.y);
}
