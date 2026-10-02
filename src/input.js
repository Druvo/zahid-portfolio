// Keyboard + touch joystick -> one input state object
export const input = { throttle: 0, steer: 0, boost: false, brake: false, hop: false, honk: false, reset: false, any: false, camLook: 0 };

const keys = new Set();
const edge = { hop: false, honk: false, reset: false };
const handlers = [];
export const onKey = (fn) => handlers.push(fn);

addEventListener('keydown', (e) => {
  if (e.target && /input|textarea/i.test(e.target.tagName)) return;
  const k = e.code;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(k)) e.preventDefault();
  if (!keys.has(k)) {
    if (k === 'Space') edge.hop = true;
    if (k === 'KeyH') edge.honk = true;
    if (k === 'KeyR') edge.reset = true;
    handlers.forEach((h) => h(k));
  }
  keys.add(k); input.any = true;
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// touch joystick
const joy = { x: 0, y: 0, active: false };
export function setupTouch(root) {
  const base = root.querySelector('#joy'), knob = root.querySelector('#joy-knob'), boostBtn = root.querySelector('#btn-boost'), hopBtn = root.querySelector('#btn-hop');
  if (!base) return;
  let id = null, cx = 0, cy = 0;
  const R = 46;
  base.addEventListener('pointerdown', (e) => { id = e.pointerId; base.setPointerCapture(id); const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; joy.active = true; move(e); });
  base.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; joy.active = false; joy.x = joy.y = 0; knob.style.transform = 'translate(-50%,-50%)'; };
  base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
  function move(e) {
    let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy);
    if (l > R) { dx = dx / l * R; dy = dy / l * R; }
    joy.x = dx / R; joy.y = dy / R; knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; input.any = true;
  }
  let boostHeld = false;
  boostBtn.addEventListener('pointerdown', () => { boostHeld = true; input.any = true; });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((n) => boostBtn.addEventListener(n, () => { boostHeld = false; }));
  hopBtn.addEventListener('pointerdown', () => { edge.hop = true; input.any = true; });
  input._boostTouch = () => boostHeld;
}

export function pollInput() {
  const k = (c) => keys.has(c);
  const up = k('KeyW') || k('ArrowUp'), dn = k('KeyS') || k('ArrowDown');
  const lf = k('KeyA') || k('ArrowLeft'), rt = k('KeyD') || k('ArrowRight');
  input.throttle = (up ? 1 : 0) - (dn ? 1 : 0);
  input.steer = (lf ? 1 : 0) - (rt ? 1 : 0);
  if (joy.active) { input.throttle = -joy.y; input.steer = -joy.x; if (Math.abs(joy.x) < 0.12) input.steer = 0; if (Math.abs(joy.y) < 0.12) input.throttle = 0; }
  input.boost = k('ShiftLeft') || k('ShiftRight') || !!(input._boostTouch && input._boostTouch());
  input.brake = k('KeyX') || k('ControlLeft');
  input.camLook = (k('KeyQ') ? 1 : 0) - (k('KeyE') ? 1 : 0);
  input.hop = edge.hop; input.honk = edge.honk; input.reset = edge.reset;
  edge.hop = edge.honk = edge.reset = false;
  return input;
}
