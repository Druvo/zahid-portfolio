import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { C, mat, box, cyl, sph, at, world, phys, sprite, canvasTex } from './core.js';
import * as audio from './audio.js';

const FWD = new CANNON.Vec3(0, 0, 1), tmpV = new CANNON.Vec3();

export class Van {
  constructor(scene, spawn, heading) {
    this.scene = scene; this.spawn = spawn.clone(); this.heading = heading;
    this.group = new THREE.Group(); scene.add(this.group);
    this.visual = new THREE.Group(); this.group.add(this.visual);
    this.speed = 0; this.boostT = 0; this.boostEnergy = 1; this.grounded = true;
    this.buildMesh();
    this.buildBody();
    this.buildDust();
    this.reset();
  }

  buildMesh() {
    const v = this.visual, yellow = 0xffb347, dark = 0x1d2433;
    // chassis shell
    v.add(at(box(1.9, 0.62, 3.5, yellow), 0, 0.62, 0));
    v.add(at(box(1.84, 0.55, 1.5, yellow), 0, 1.2, -0.55)); // cabin body
    const glass = box(1.88, 0.4, 1.56, 0x7fe9ff, { rough: 0.1, metal: 0.6, emissive: 0x2a8fa8, ei: 0.4 });
    at(glass, 0, 1.25, -0.55); v.add(glass);
    v.add(at(box(1.94, 0.18, 3.54, 0x242b3d), 0, 0.33, 0)); // bumper strip
    v.add(at(box(1.88, 0.1, 1.6, 0xfff3d6), 0, 1.5, -0.55)); // roof
    // stripe + ZH plate
    v.add(at(box(1.92, 0.12, 3.52, C.cyan, { emissive: C.cyan, ei: 0.6 }), 0, 0.72, 0));
    // roof gear: beacon packet + dish
    const beacon = box(0.34, 0.34, 0.34, C.cyan, { emissive: C.cyan, ei: 3 }); at(beacon, 0, 1.95, -0.9); v.add(beacon); this.beacon = beacon;
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xe9eef7, { rough: 0.4 }));
    dish.rotation.x = -Math.PI / 3; at(dish, 0.5, 1.72, -0.2); dish.castShadow = true; v.add(dish);
    v.add(at(cyl(0.04, 0.04, 0.4, 0xaab, {}, 6), 0.5, 1.58, -0.2));
    // headlights / taillights
    for (const sx of [-0.62, 0.62]) {
      v.add(at(box(0.4, 0.2, 0.08, 0xfff6c8, { emissive: 0xfff0b0, ei: 3 }), sx, 0.72, 1.76));
      const tl = box(0.4, 0.2, 0.08, 0xff3b3b, { emissive: 0xff2020, ei: 1.2 }); at(tl, sx, 0.72, -1.76); v.add(tl); (this.tails ||= []).push(tl);
    }
    this.headlight = new THREE.SpotLight(0xffe2b0, 90, 46, 0.55, 0.65, 1.2);
    this.headlight.position.set(0, 0.9, 1.7); this.headlight.target.position.set(0, 0.2, 12); v.add(this.headlight, this.headlight.target);
    // ZH rear label
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5), new THREE.MeshBasicMaterial({
      map: canvasTex(256, 112, (g, w, h) => { g.fillStyle = '#10151f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4de3d0'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = '#ffd166'; g.font = '800 70px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ZH.NET', w / 2, h / 2 + 4); }),
    }));
    plate.position.set(0, 0.9, -1.76); plate.rotation.y = Math.PI; v.add(plate);
    // wheels
    this.wheels = [];
    const wm = mat(0x151821, { rough: 0.9 }), rm = mat(0xcfd6e4, { metal: 0.6, rough: 0.3 });
    for (const [sx, sz, front] of [[-1, 1.1, 1], [1, 1.1, 1], [-1, -1.1, 0], [1, -1.1, 0]]) {
      const pivot = new THREE.Group(); pivot.position.set(sx * 0.98, 0.42, sz);
      const spin = new THREE.Group(); pivot.add(spin);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 20), wm); tire.rotation.z = Math.PI / 2; tire.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 8), rm); rim.rotation.z = Math.PI / 2;
      spin.add(tire, rim); v.add(pivot); this.wheels.push({ pivot, spin, front });
    }
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
    this.flame.rotation.x = -Math.PI / 2; this.flame.position.set(0, 0.7, -2.5); this.flame.visible = false; this.visual.add(this.flame);
  }

  reset() {
    this.body.position.set(this.spawn.x, 0.6, this.spawn.z);
    this.body.quaternion.setFromEuler(0, this.heading, 0);
    this.body.velocity.setZero(); this.body.angularVelocity.setZero();
  }

  forward() { return this.body.quaternion.vmult(FWD, tmpV); }

  update(dt, inp, t) {
    const b = this.body, f = this.forward();
    const fx = f.x, fz = f.z, rx = fz, rz = -fx; // right-hand (x,z) of forward looking down: right = (fz, -fx)
    let vF = b.velocity.x * fx + b.velocity.z * fz, vL = b.velocity.x * rx + b.velocity.z * rz;
    this.grounded = b.position.y < 0.75;

    // boost meter
    const wantBoost = inp.boost && this.boostEnergy > 0.02 && inp.throttle >= 0;
    this.boostEnergy = THREE.MathUtils.clamp(this.boostEnergy + (wantBoost ? -0.34 : 0.22) * dt, 0, 1);
    this.boosting = wantBoost;
    const max = wantBoost ? 27 : 15.5, target = inp.throttle > 0 ? max : inp.throttle < 0 ? -8 : 0;
    const braking = inp.brake || (target !== 0 && Math.sign(target) !== Math.sign(vF) && Math.abs(vF) > 0.5);
    const rate = inp.throttle === 0 ? 1.4 : braking ? 5 : (wantBoost ? 3.4 : 1.7);
    vF += (inp.brake ? 0 - vF : target - vF) * Math.min(1, rate * dt * (inp.brake ? 2.5 : 1));
    const grip = inp.brake ? 1.8 : 6.5;
    vL *= Math.exp(-grip * dt);
    if (this.grounded) { b.velocity.x = fx * vF + rx * vL; b.velocity.z = fz * vF + rz * vL; }

    // steering
    const steerPower = THREE.MathUtils.clamp(Math.abs(vF) / 5, 0, 1) * (vF < -0.1 ? -1 : 1);
    const yaw = inp.steer * 2.05 * steerPower * (wantBoost ? 0.8 : 1) * (inp.brake ? 1.35 : 1);
    b.angularVelocity.y += (yaw - b.angularVelocity.y) * Math.min(1, 9 * dt);

    if (inp.hop && this.grounded) { b.velocity.y = 8.5; audio.hop(); }
    if (inp.honk) audio.honk();
    if (inp.reset) this.reset();
    if (b.position.y < -20) this.reset();

    this.speed = vF;
    audio.engineUpdate(vF, inp.throttle, wantBoost);

    // sync visual
    this.group.position.copy(b.position); this.group.quaternion.copy(b.quaternion);
    const accel = (target - vF) * 0.012, roll = -inp.steer * Math.min(Math.abs(vF) / 20, 1) * 0.1;
    this.visual.rotation.x += (-THREE.MathUtils.clamp(accel, -0.07, 0.07) - this.visual.rotation.x) * Math.min(1, 6 * dt);
    this.visual.rotation.z += (roll - this.visual.rotation.z) * Math.min(1, 6 * dt);
    this.visual.position.y = (this.grounded ? 0 : 0) - 0.05;
    for (const w of this.wheels) {
      w.spin.rotation.x += vF * dt / 0.42;
      if (w.front) w.pivot.rotation.y += (inp.steer * 0.5 - w.pivot.rotation.y) * Math.min(1, 12 * dt);
    }
    this.beacon.rotation.y = t * 2; this.beacon.rotation.x = t * 1.4; this.beacon.position.y = 1.95 + Math.sin(t * 3) * 0.06;
    const braking2 = inp.throttle < 0 || inp.brake;
    for (const tl of this.tails) tl.material = braking2 ? mat(0xff3b3b, { emissive: 0xff2020, ei: 3.5 }) : mat(0xff3b3b, { emissive: 0xff2020, ei: 1.2 });
    this.flame.visible = wantBoost; if (wantBoost) { this.flame.scale.set(1, 0.7 + Math.random() * 0.7, 1); }

    // dust
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
