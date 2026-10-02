// Tiny synthesized audio: engine hum, horn, discovery chime, bump. No asset files.
let ctx = null, engine = null, eGain = null, filt = null, master = null, muted = false;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
  filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 500;
  eGain = ctx.createGain(); eGain.gain.value = 0;
  engine = ctx.createOscillator(); engine.type = 'sawtooth'; engine.frequency.value = 50;
  const e2 = ctx.createOscillator(); e2.type = 'square'; e2.frequency.value = 25;
  const g2 = ctx.createGain(); g2.gain.value = 0.4;
  engine.connect(filt); e2.connect(g2); g2.connect(filt); filt.connect(eGain); eGain.connect(master);
  engine.start(); e2.start(); engine._e2 = e2;
}

export function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.05); }
export const isMuted = () => muted;

export function engineUpdate(speed, throttle, boost) {
  if (!ctx) return;
  const s = Math.min(Math.abs(speed) / 16, 1.6);
  const f = 42 + s * 70 + (boost ? 25 : 0) + Math.abs(throttle) * 12;
  const t = ctx.currentTime;
  engine.frequency.setTargetAtTime(f, t, 0.08); engine._e2.frequency.setTargetAtTime(f / 2, t, 0.08);
  filt.frequency.setTargetAtTime(260 + s * 700 + (boost ? 400 : 0), t, 0.1);
  eGain.gain.setTargetAtTime(0.05 + s * 0.09 + Math.abs(throttle) * 0.03, t, 0.1);
}

function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
export const honk = () => { tone(311, 0.32, 'square', 0.12); tone(392, 0.32, 'square', 0.12); };
export const chime = () => { tone(659, 0.35, 'sine', 0.18); tone(988, 0.5, 'sine', 0.14, null, 0.09); tone(1318, 0.6, 'sine', 0.1, null, 0.18); };
export const hop = () => tone(220, 0.22, 'triangle', 0.15, 520);
export const bump = (v = 1) => tone(90, 0.12, 'sine', Math.min(0.25, 0.05 * v), 50);
export const zap = () => { tone(260, 0.35, 'sawtooth', 0.1, 1100); };
export const coin = () => { tone(988, 0.12, 'square', 0.07); tone(1318, 0.2, 'square', 0.07, null, 0.07); };
export const lap = () => { tone(523, 0.2, 'triangle', 0.15); tone(659, 0.2, 'triangle', 0.15, null, 0.12); tone(784, 0.4, 'triangle', 0.15, null, 0.24); };
