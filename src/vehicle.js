import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { C, mat, box, cyl, sph, at, world, phys, canvasTex } from './core.js';
import * as audio from './audio.js';

const FWD = new CANNON.Vec3(0, 0, 1), tmpV = new CANNON.Vec3();
const glowMat = (c, ei = 3) => ({ emissive: c, ei });

// ---------- car models ----------
// stats: max / boostMax (m/s), accel, grip (lateral damping), steer (yaw rate), half = collider half extents
export const MODELS = [
  { key: 'racer', name: 'Apex GT', tag: 'Racing car', color: '#e8262b', stats: { max: 20, boostMax: 34, accel: 2.4, grip: 7.5, steer: 2.3, half: [0.95, 0.4, 2.1] }, bars: [5, 4, 4] },
  { key: 'rally', name: 'Rally Hatch', tag: 'Drift-happy hatchback', color: '#19c3b1', stats: { max: 17, boostMax: 29, accel: 2.0, grip: 4.6, steer: 2.5, half: [0.95, 0.5, 1.7] }, bars: [3, 2, 5] },
  { key: 'buggy', name: 'Dune Buggy', tag: 'Light and bouncy', color: '#ff8a1f', stats: { max: 16, boostMax: 28, accel: 2.2, grip: 5.4, steer: 2.7, half: [1.0, 0.5, 1.5] }, bars: [3, 3, 5] },
  { key: 'van', name: 'ZH.NET Van', tag: 'The original delivery van', color: '#ffb347', stats: { max: 15.5, boostMax: 27, accel: 1.7, grip: 6.5, steer: 2.05, half: [0.95, 0.5, 1.7] }, bars: [2, 4, 3] },
];

function wheelSet(car, { x, zf, zr, rf, rr, wf, wr, color = 0x151821, rim = 0xcfd6e4, steerFront = true }) {
  const wm = mat(color, { rough: 0.9 }), rm = mat(rim, { metal: 0.7, rough: 0.25 });
  for (const [sx, sz, fr] of [[-1, zf, 1], [1, zf, 1], [-1, zr, 0], [1, zr, 0]]) {
    const r = fr ? rf : rr, w = fr ? wf : wr;
    const pivot = new THREE.Group(); pivot.position.set(sx * x, r, sz);
    const spin = new THREE.Group(); pivot.add(spin);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 22), wm); tire.rotation.z = Math.PI / 2; tire.castShadow = true;
    const rimM = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.02, 10), rm); rimM.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, w + 0.05, 6), mat(0x10151f)); hub.rotation.z = Math.PI / 2;
    spin.add(tire, rimM, hub); car.visual.add(pivot);
    car.wheels.push({ pivot, spin, front: fr && steerFront, r });
  }
}

function lights(car, { x, zf, zr, y, w = 0.4, h = 0.16 }) {
  for (const sx of [-x, x]) {
    car.visual.add(at(box(w, h, 0.08, 0xfff6c8, glowMat(0xfff0b0, 3)), sx, y, zf));
    const tl = box(w, h, 0.08, 0xff3b3b, glowMat(0xff2020, 1.2)); at(tl, sx, y, zr); car.visual.add(tl); car.tails.push(tl);
  }
}

function plate(car, text, z, y, w = 1.0, h = 0.42, color = '#ffd166') {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
    map: canvasTex(256, Math.round(256 * h / w), (g, W, H) => { g.fillStyle = '#10151f'; g.fillRect(0, 0, W, H); g.strokeStyle = '#4de3d0'; g.lineWidth = 6; g.strokeRect(4, 4, W - 8, H - 8); g.fillStyle = color; g.font = '800 ' + Math.round(H * 0.62) + 'px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 3); }),
  }));
  p.position.set(0, y, z); p.rotation.y = Math.PI; car.visual.add(p);
}

const builders = {
  racer(car) {
    const v = car.visual, red = 0xe8262b, dark = 0x12151d, white = 0xf3efe6;
    v.add(at(box(1.5, 0.3, 4.3, red), 0, 0.42, -0.1));                       // tub
    v.add(at(box(1.0, 0.22, 1.3, red), 0, 0.38, 2.15));                       // nose
    v.add(at(box(0.6, 0.18, 0.7, red), 0, 0.34, 2.75));                       // nose tip
    v.add(at(box(0.5, 0.05, 4.3, white), 0, 0.585, -0.1));                    // centre stripe
    for (const s of [-1, 1]) {
      v.add(at(box(0.5, 0.36, 2.0, red), s * 0.95, 0.46, -0.2));              // side pods
      v.add(at(box(0.42, 0.06, 1.4, dark), s * 0.95, 0.66, -0.2));            // pod inlet
      v.add(at(box(0.08, 0.5, 0.7, white), s * 0.97, 0.5, 0.95 - 0.2 - 0.9));// number strip
    }
    const canopy = box(0.95, 0.38, 1.35, 0x7fe9ff, { rough: 0.1, metal: 0.6, emissive: 0x2a8fa8, ei: 0.5 }); at(canopy, 0, 0.82, -0.25); v.add(canopy);
    v.add(at(box(0.8, 0.14, 1.0, red), 0, 1.04, -0.3));                       // roof scoop
    v.add(at(box(0.9, 0.55, 1.5, red), 0, 0.72, -1.55));                      // engine cover
    v.add(at(box(0.18, 0.5, 1.4, red), 0, 1.15, -1.55));                      // shark fin
    // front wing
    v.add(at(box(2.1, 0.06, 0.55, dark), 0, 0.2, 3.0));
    v.add(at(box(2.1, 0.02, 0.06, C.cyan, glowMat(C.cyan, 2)), 0, 0.235, 3.27));
    for (const s of [-1, 1]) v.add(at(box(0.06, 0.28, 0.6, red), s * 1.05, 0.28, 3.0));
    // rear wing
    v.add(at(box(2.0, 0.07, 0.7, dark), 0, 1.38, -2.3));
    v.add(at(box(2.0, 0.05, 0.4, red), 0, 1.5, -2.45));
    for (const s of [-1, 1]) { v.add(at(box(0.07, 0.6, 0.9, red), s * 1.0, 1.28, -2.3)); v.add(at(box(0.1, 0.7, 0.1, dark), s * 0.35, 0.95, -2.2)); }
    v.add(at(box(1.9, 0.05, 0.05, 0xff2020, glowMat(0xff2020, 2.5)), 0, 1.25, -2.62)); car.tails.push(v.children[v.children.length - 1]);
    // underglow
    const ug = box(1.4, 0.03, 3.8, C.cyan, glowMat(C.cyan, 2.2)); ug.position.set(0, 0.2, 0); ug.castShadow = false; v.add(ug);
    lights(car, { x: 0.35, zf: 3.1, zr: -2.62, y: 0.4, w: 0.28, h: 0.1 });
    car.tails.length = 1; // keep wing bar only for brake light swap
    for (const s of [-0.35, 0.35]) v.add(at(box(0.28, 0.1, 0.08, 0xff3b3b, glowMat(0xff2020, 1.2)), s, 0.55, -2.32)), car.tails.push(v.children[v.children.length - 1]);
    plate(car, 'ZH', -2.31, 0.95, 0.5, 0.25);
    wheelSet(car, { x: 1.02, zf: 1.7, zr: -1.55, rf: 0.42, rr: 0.47, wf: 0.42, wr: 0.56 });
    car.headlight.position.set(0, 0.5, 3.0); car.headlight.target.position.set(0, 0.2, 14);
    car.flame.position.set(0, 0.75, -2.9);
  },

  rally(car) {
    const v = car.visual, teal = 0x19c3b1, dark = 0x12151d;
    v.add(at(box(1.9, 0.6, 3.5, teal), 0, 0.62, 0));
    v.add(at(box(1.7, 0.55, 1.9, teal), 0, 1.17, -0.5));
    const glass = box(1.76, 0.42, 1.95, 0x7fe9ff, { rough: 0.1, metal: 0.6, emissive: 0x2a8fa8, ei: 0.45 }); at(glass, 0, 1.2, -0.5); v.add(glass);
    v.add(at(box(1.72, 0.08, 2.0, 0xf3efe6), 0, 1.5, -0.5));
    v.add(at(box(0.2, 0.04, 3.52, 0xf3efe6), 0.55, 0.95, 0)); v.add(at(box(0.2, 0.04, 3.52, 0xf3efe6), -0.55, 0.95, 0));
    for (const sx of [-1, 1]) for (const sz of [-1.15, 1.15]) v.add(at(box(0.28, 0.4, 1.0, dark), sx * 0.95, 0.5, sz)); // flares
    v.add(at(box(1.95, 0.22, 0.2, dark), 0, 0.38, 1.78)); v.add(at(box(1.95, 0.22, 0.2, dark), 0, 0.38, -1.78));
    // spoiler
    v.add(at(box(1.9, 0.07, 0.45, dark), 0, 1.38, -1.7)); for (const s of [-1, 1]) v.add(at(box(0.08, 0.35, 0.3, dark), s * 0.8, 1.2, -1.65));
    // roof light bar
    for (let i = -2; i <= 2; i++) v.add(at(box(0.26, 0.16, 0.2, 0xfff0b0, glowMat(0xffd070, 3)), i * 0.3, 1.64, -0.1));
    v.add(at(box(1.7, 0.08, 0.26, dark), 0, 1.56, -0.1));
    lights(car, { x: 0.62, zf: 1.76, zr: -1.76, y: 0.72 });
    plate(car, 'ZH.NET', -1.78, 0.7, 0.9, 0.36);
    wheelSet(car, { x: 1.0, zf: 1.15, zr: -1.15, rf: 0.45, rr: 0.45, wf: 0.36, wr: 0.36 });
    car.headlight.position.set(0, 0.9, 1.7); car.headlight.target.position.set(0, 0.2, 13);
    car.flame.position.set(0, 0.55, -2.4);
  },

  buggy(car) {
    const v = car.visual, org = 0xff8a1f, dark = 0x12151d, steel = 0xcfd6e4;
    v.add(at(box(1.5, 0.22, 3.0, org), 0, 0.55, 0));
    v.add(at(box(1.1, 0.3, 1.0, dark), 0, 0.75, -1.2));                       // engine
    v.add(at(box(0.9, 0.08, 0.9, steel, { metal: 0.8 }), 0, 0.93, -1.2));
    for (const sx of [-0.4, 0.4]) { v.add(at(box(0.5, 0.5, 0.2, dark), sx, 0.95, -0.2)); v.add(at(box(0.5, 0.15, 0.55, org), sx, 0.7, 0.05)); } // seats
    v.add(at(box(0.5, 0.12, 0.5, dark), 0, 0.75, 0.75));                      // dash
    // roll cage
    const tube = (a, b, r = 0.055) => { const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), mat(steel, { metal: 0.8, rough: 0.3 })); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; v.add(m); };
    const P = (x, y, z) => new THREE.Vector3(x, y, z);
    for (const s of [-0.65, 0.65]) { tube(P(s, 0.6, 0.9), P(s, 1.7, 0.1)); tube(P(s, 1.7, 0.1), P(s, 1.7, -1.1)); tube(P(s, 1.7, -1.1), P(s, 0.6, -1.4)); tube(P(s, 1.1, 0.5), P(s, 1.1, -1.25)); }
    tube(P(-0.65, 1.7, 0.1), P(0.65, 1.7, 0.1)); tube(P(-0.65, 1.7, -1.1), P(0.65, 1.7, -1.1));
    for (const s of [-0.5, 0.5]) tube(P(s, 0.6, 1.3), P(s, 0.9, 1.1));
    // front bumper + light bar
    v.add(at(box(1.7, 0.1, 0.1, steel, { metal: 0.8 }), 0, 0.62, 1.6));
    for (let i = -2; i <= 2; i++) v.add(at(box(0.22, 0.16, 0.14, 0xfff0b0, glowMat(0xffd070, 3)), i * 0.28, 1.78, 0.1));
    v.add(at(box(1.6, 0.08, 0.1, dark), 0, 1.7, 0.1));
    lights(car, { x: 0.6, zf: 1.52, zr: -1.52, y: 0.62, w: 0.3 });
    plate(car, 'ZH', -1.55, 0.95, 0.5, 0.25);
    wheelSet(car, { x: 1.15, zf: 1.15, zr: -1.15, rf: 0.55, rr: 0.58, wf: 0.5, wr: 0.62, rim: 0xff8a1f });
    car.headlight.position.set(0, 1.2, 1.4); car.headlight.target.position.set(0, 0.2, 13);
    car.flame.position.set(0, 0.8, -2.0);
  },

  van(car) {
    const v = car.visual, yellow = 0xffb347;
    v.add(at(box(1.9, 0.62, 3.5, yellow), 0, 0.62, 0));
    const glass = box(1.88, 0.4, 1.56, 0x7fe9ff, { rough: 0.1, metal: 0.6, emissive: 0x2a8fa8, ei: 0.4 }); at(glass, 0, 1.25, -0.55); v.add(glass);
    v.add(at(box(1.84, 0.55, 1.5, yellow), 0, 1.2, -0.55));
    v.add(at(box(1.94, 0.18, 3.54, 0x242b3d), 0, 0.33, 0));
    v.add(at(box(1.88, 0.1, 1.6, 0xfff3d6), 0, 1.5, -0.55));
    v.add(at(box(1.92, 0.12, 3.52, C.cyan, glowMat(C.cyan, 0.6)), 0, 0.72, 0));
    const beacon = box(0.34, 0.34, 0.34, C.cyan, glowMat(C.cyan, 3)); at(beacon, 0, 1.95, -0.9); v.add(beacon); car.beacon = beacon;
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xe9eef7, { rough: 0.4 }));
    dish.rotation.x = -Math.PI / 3; at(dish, 0.5, 1.72, -0.2); dish.castShadow = true; v.add(dish);
    v.add(at(cyl(0.04, 0.04, 0.4, 0xaaabbb, {}, 6), 0.5, 1.58, -0.2));
    lights(car, { x: 0.62, zf: 1.76, zr: -1.76, y: 0.72 });
    plate(car, 'ZH.NET', -1.76, 0.9, 1.1, 0.5);
    wheelSet(car, { x: 0.98, zf: 1.1, zr: -1.1, rf: 0.42, rr: 0.42, wf: 0.34, wr: 0.34 });
    car.headlight.position.set(0, 0.9, 1.7); car.headlight.target.position.set(0, 0.2, 12);
    car.flame.position.set(0, 0.7, -2.5);
  },
};

export class Van {
  constructor(scene, spawn, heading, modelKey = 'racer') {
    this.scene = scene; this.spawn = spawn.clone(); this.heading = heading;
    this.group = new THREE.Group(); scene.add(this.group);
    this.visual = new THREE.Group(); this.group.add(this.visual);
    this.speed = 0; this.boostEnergy = 1; this.grounded = true;
    this.buildBody();
    this.buildDust();
    this.setModel(modelKey);
    this.reset();
  }

  setModel(key) {
    const m = MODELS.find((x) => x.key === key) || MODELS[0];
    this.model = m; this.stats = m.stats;
    // clear visual
    for (const c of [...this.visual.children]) { this.visual.remove(c); c.traverse?.((o) => { if (o.geometry && !o.isSprite) o.geometry.dispose(); }); }
    this.wheels = []; this.tails = []; this.beacon = null;
    this.headlight = new THREE.SpotLight(0xffe2b0, 90, 46, 0.55, 0.65, 1.2);
    this.visual.add(this.headlight, this.headlight.target);
    this.visual.add(this.flame);
    builders[m.key](this);
    this.visual.rotation.set(0, 0, 0);
    // collider
    const b = this.body; b.shapes.length = 0; b.shapeOffsets.length = 0; b.shapeOrientations.length = 0;
    b.addShape(new CANNON.Box(new CANNON.Vec3(...m.stats.half)), new CANNON.Vec3(0, 0.1, 0));
    b.updateBoundingRadius(); b.updateMassProperties();
    b.angularFactor.set(0, 1, 0);
  }

  buildBody() {
    this.body = new CANNON.Body({ mass: 120, material: phys.car, linearDamping: 0.04, angularDamping: 0.6, allowSleep: false });
    this.body.addShape(new CANNON.Box(new CANNON.Vec3(0.95, 0.5, 1.7)), new CANNON.Vec3(0, 0.1, 0));
    this.body.angularFactor.set(0, 1, 0);
    world.addBody(this.body);
    this.body.addEventListener('collide', (e) => {
      const rv = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (rv > 3 && performance.now() - (this._lastBump || 0) > 140) { this._lastBump = performance.now(); audio.bump(rv); }
    });
  }

  buildDust() {
    this.dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: 0xffd9b0, transparent: true, opacity: 0.45, depthWrite: false }), 48);
    this.dust.frustumCulled = false; this.scene.add(this.dust);
    this.dustP = Array.from({ length: 48 }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() }));
    this.dustI = 0; this.dustAcc = 0;
    this.flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.6, 8), new THREE.MeshBasicMaterial({ color: 0x7fe9ff, transparent: true, opacity: 0.85 }));
    this.flame.rotation.x = -Math.PI / 2; this.flame.position.set(0, 0.7, -2.5); this.flame.visible = false;
  }

  reset() {
    this.body.position.set(this.spawn.x, 0.6, this.spawn.z);
    this.body.quaternion.setFromEuler(0, this.heading, 0);
    this.body.velocity.setZero(); this.body.angularVelocity.setZero();
  }

  forward() { return this.body.quaternion.vmult(FWD, tmpV); }

  update(dt, inp, t) {
    const b = this.body, f = this.forward(), S = this.stats;
    const fx = f.x, fz = f.z, rx = fz, rz = -fx;
    let vF = b.velocity.x * fx + b.velocity.z * fz, vL = b.velocity.x * rx + b.velocity.z * rz;
    this.grounded = b.position.y < 0.75;

    const wantBoost = inp.boost && this.boostEnergy > 0.02 && inp.throttle >= 0;
    this.boostEnergy = THREE.MathUtils.clamp(this.boostEnergy + (wantBoost ? -0.34 : 0.22) * dt, 0, 1);
    this.boosting = wantBoost;
    const max = wantBoost ? S.boostMax : S.max, target = inp.throttle > 0 ? max : inp.throttle < 0 ? -8 : 0;
    const braking = inp.brake || (target !== 0 && Math.sign(target) !== Math.sign(vF) && Math.abs(vF) > 0.5);
    const rate = inp.throttle === 0 ? 1.4 : braking ? 5 : (wantBoost ? S.accel * 2 : S.accel);
    vF += (inp.brake ? 0 - vF : target - vF) * Math.min(1, rate * dt * (inp.brake ? 2.5 : 1));
    const grip = inp.brake ? 1.8 : S.grip;
    vL *= Math.exp(-grip * dt);
    if (this.grounded) { b.velocity.x = fx * vF + rx * vL; b.velocity.z = fz * vF + rz * vL; }

    const steerPower = THREE.MathUtils.clamp(Math.abs(vF) / 5, 0, 1) * (vF < -0.1 ? -1 : 1);
    const yaw = inp.steer * S.steer * steerPower * (wantBoost ? 0.8 : 1) * (inp.brake ? 1.35 : 1);
    b.angularVelocity.y += (yaw - b.angularVelocity.y) * Math.min(1, 9 * dt);

    if (inp.hop && this.grounded) { b.velocity.y = 8.5; audio.hop(); }
    if (inp.honk) audio.honk();
    if (inp.reset) this.reset();
    if (b.position.y < -20) this.reset();

    this.speed = vF;
    audio.engineUpdate(vF, inp.throttle, wantBoost);

    this.group.position.copy(b.position); this.group.quaternion.copy(b.quaternion);
    const accel = (target - vF) * 0.012, roll = -inp.steer * Math.min(Math.abs(vF) / 20, 1) * 0.1;
    this.visual.rotation.x += (-THREE.MathUtils.clamp(accel, -0.07, 0.07) - this.visual.rotation.x) * Math.min(1, 6 * dt);
    this.visual.rotation.z += (roll - this.visual.rotation.z) * Math.min(1, 6 * dt);
    this.visual.position.y = -0.05;
    for (const w of this.wheels) {
      w.spin.rotation.x += vF * dt / w.r;
      if (w.front) w.pivot.rotation.y += (inp.steer * 0.5 - w.pivot.rotation.y) * Math.min(1, 12 * dt);
    }
    if (this.beacon) { this.beacon.rotation.y = t * 2; this.beacon.rotation.x = t * 1.4; this.beacon.position.y = 1.95 + Math.sin(t * 3) * 0.06; }
    const braking2 = inp.throttle < 0 || inp.brake;
    for (const tl of this.tails) tl.material = braking2 ? mat(0xff3b3b, { emissive: 0xff2020, ei: 3.5 }) : mat(0xff3b3b, { emissive: 0xff2020, ei: 1.2 });
    this.flame.visible = wantBoost; if (wantBoost) this.flame.scale.set(1, 0.7 + Math.random() * 0.7, 1);

    this.dustAcc += dt * (Math.abs(vL) * 8 + (wantBoost ? 30 : 0) + (Math.abs(vF) > 3 ? 4 : 0) + (inp.brake ? Math.abs(vF) * 3 : 0));
    while (this.dustAcc > 1) {
      this.dustAcc -= 1; const d = this.dustP[this.dustI++ % 48];
      d.life = 1; d.p.set(b.position.x - fx * 1.5 + (Math.random() - 0.5), 0.15, b.position.z - fz * 1.5 + (Math.random() - 0.5));
      d.v.set((Math.random() - 0.5) * 1.2 - fx * 1.5, 0.8 + Math.random(), (Math.random() - 0.5) * 1.2 - fz * 1.5);
    }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    this.dustP.forEach((d, i) => {
      d.life = Math.max(0, d.life - dt * 1.6); d.p.addScaledVector(d.v, dt);
      const sc = d.life * 1.3; s.set(sc, sc, sc); m.compose(d.p, q, s); this.dust.setMatrixAt(i, m);
    });
    this.dust.instanceMatrix.needsUpdate = true;
  }
}
