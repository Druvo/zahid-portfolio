export const DEFS = [
  { id: 'first', title: 'First Contact', desc: 'Discover your first place.' },
  { id: 'carto', title: 'Cartographer', desc: 'Find every place on the island.' },
  { id: 'packets10', title: 'Packet Rat', desc: 'Collect 10 data packets.' },
  { id: 'packetsAll', title: 'Courier of the Year', desc: 'Deliver all 45 packets. Unlocks a secret car.' },
  { id: 'speed', title: 'Speed Demon', desc: 'Hit 100 km/h.' },
  { id: 'drift', title: 'Drift King', desc: 'Drift for 5 seconds in total.' },
  { id: 'lap', title: 'Full Lap', desc: 'Complete a lap of the timeline road.' },
  { id: 'strike', title: 'Strike!', desc: 'Knock over 8 props.' },
  { id: 'garage', title: 'Car Collector', desc: 'Drive every car in the garage.' },
  { id: 'hacker', title: 'Hello, World', desc: 'Open the dev terminal.' },
  { id: 'storm', title: 'Storm Chaser', desc: 'Drive through the rain.' },
  { id: 'photo', title: 'Photographer', desc: 'Capture a photo in photo mode.' },
  { id: 'tour', title: 'Guided', desc: 'Sit back and finish the guided tour.' },
  { id: 'konami', title: 'Old School', desc: 'Enter the Konami code.' },
];

export function createAchievements({ onUnlock }) {
  let have = new Set();
  try { have = new Set(JSON.parse(localStorage.getItem('zh-ach') || '[]')); } catch { /* ignore */ }
  const save = () => { try { localStorage.setItem('zh-ach', JSON.stringify([...have])); } catch { /* ignore */ } };
  return {
    total: DEFS.length,
    get count() { return have.size; },
    has: (id) => have.has(id),
    unlock(id) {
      if (have.has(id)) return false; const d = DEFS.find((x) => x.id === id); if (!d) return false;
      have.add(id); save(); onUnlock(d); return true;
    },
    html() {
      return `<div class="box"><button class="close" data-close>Close (Esc)</button><h2>Trophies <small style="color:var(--mute);font-size:.9rem">${have.size}/${DEFS.length}</small></h2><p>Things to find, break and drive through. Saved in your browser.</p>
        <div class="trophies">${DEFS.map((d) => `<div class="trophy ${have.has(d.id) ? 'got' : ''}"><b>${have.has(d.id) ? '★ ' : '☆ '}${d.title}</b><small>${d.desc}</small></div>`).join('')}</div></div>`;
    },
  };
}
