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

// ----- weather / fx -----
let rainSrc = null, rainGain = null;
export function rain(on) {
  if (!ctx) return;
  if (!rainSrc) {
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    rainSrc = ctx.createBufferSource(); rainSrc.buffer = buf; rainSrc.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.6;
    rainGain = ctx.createGain(); rainGain.gain.value = 0; rainSrc.connect(bp); bp.connect(rainGain); rainGain.connect(master); rainSrc.start();
  }
  rainGain.gain.setTargetAtTime(on ? 0.09 : 0, ctx.currentTime, 0.6);
}
function noiseBurst(dur, freq, vol, delay = 0) {
  if (!ctx) return;
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol; src.connect(f); f.connect(g); g.connect(master); src.start(ctx.currentTime + delay);
}
export const thunder = () => noiseBurst(2.4, 260, 0.5, 0.4);
export const boom = () => noiseBurst(0.5, 700, 0.18);
export const click = () => tone(1400, 0.05, 'square', 0.05);

// ----- generative ambient pad (follows the master mute) -----
let musicOn = false, musicTimer = null, musicGain = null;
const CHORDS = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 207.65, 246.94]];
const PENTA = [440, 493.88, 554.37, 659.25, 739.99, 880];
function pad(freqs, t0, dur) {
  for (const f of freqs) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 12; lp.type = 'lowpass'; lp.frequency.value = 700;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5, t0 + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(lp); lp.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + dur + 0.1);
  }
}
export function music(on) {
  if (!ctx) return; musicOn = on;
  if (!musicGain) { musicGain = ctx.createGain(); musicGain.gain.value = 0.05; musicGain.connect(master); }
  clearInterval(musicTimer); if (!on) return;
  let step = 0;
  const play = () => {
    if (!musicOn || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + 0.05; pad(CHORDS[step % CHORDS.length], t0, 7.5);
    for (let k = 0; k < 3; k++) { const f = PENTA[Math.floor(Math.random() * PENTA.length)], t = t0 + 1.2 + k * 1.7 + Math.random() * 0.6; tone(f, 1.4, 'sine', 0.05, null, t - ctx.currentTime); }
    step++;
  };
  play(); musicTimer = setInterval(play, 6500);
}
