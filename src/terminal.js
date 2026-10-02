import { profile, jobs, skills, exploring, awards, education, stations } from './data.js';

// In-page dev console (backtick). Because a backend engineer's portfolio should have a shell.
export function createTerminal({ entries, goto, setCar, cars, setMood, moods, setQuality, game, weather, party, onOpen, onClose }) {
  const el = document.createElement('div');
  el.id = 'term'; el.hidden = true;
  el.innerHTML = '<div class="term-bar"><span>zahid@portfolio:~$</span><button type="button" data-x>esc</button></div><div class="term-out" role="log"></div><form class="term-in" autocomplete="off"><span>&gt;</span><input type="text" spellcheck="false" autocapitalize="off" aria-label="terminal command" /></form>';
  document.body.appendChild(el);
  const out = el.querySelector('.term-out'), input = el.querySelector('input'), form = el.querySelector('form');
  const history = []; let hi = 0;
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const print = (t, cls = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = t; out.appendChild(d); out.scrollTop = out.scrollHeight; };
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const findStation = (q) => { q = q.toLowerCase(); return entries.find((e) => e.st.id === q) || entries.find((e) => e.st.id.includes(q) || e.st.title.toLowerCase().includes(q)); };

  const cmds = {
    help: () => print('commands: <b>whoami</b> · <b>experience</b> · <b>projects</b> · <b>skills</b> · <b>education</b> · <b>awards</b> · <b>exploring</b> · <b>contact</b><br>game: <b>goto &lt;id&gt;</b> · <b>car &lt;name&gt;</b> · <b>sky &lt;golden|day|night&gt;</b> · <b>quality &lt;low|high&gt;</b> · <b>rain [off]</b> · <b>party</b> · <b>stats</b> · <b>clear</b> · <b>exit</b>'),
    whoami: () => print(`${esc(profile.name)} — ${esc(profile.title)}<br>${esc(profile.summary)}`),
    experience: () => jobs.slice().reverse().forEach(([r, c, p]) => print(`${esc(p).padEnd(18)} ${esc(r)} @ ${esc(c)}`)),
    projects: () => stations.forEach((s) => print(`<b>${esc(s.id)}</b> — ${esc(s.title.split(' - ')[0])} <i>(${esc(s.period)})</i>`)),
    skills: () => skills.forEach((s) => print(`${stars(s.rating)}  ${esc(s.name)}`)),
    education: () => education.forEach((e) => print(`${esc(e.period)}  ${esc(e.title)}, ${esc(e.org)}`)),
    awards: () => awards.forEach((a) => print(`${esc(a.title)} — ${esc(a.sub)}`)),
    exploring: () => print(exploring.map(esc).join(' · ')),
    contact: () => print(`email: <a href="mailto:${profile.email}">${profile.email}</a><br>linkedin: <a href="${profile.linkedin}" target="_blank" rel="noopener">in/zhdruvo</a><br>web: <a href="${profile.site}" target="_blank" rel="noopener">druvo.github.io</a>`),
    goto: (a) => { const e = a && findStation(a); if (!e) return print('usage: goto &lt;id&gt;  (try: projects)', 'err'); goto(e); print('teleporting to ' + esc(e.st.title.split(' - ')[0]) + '…'); },
    car: (a) => { const c = cars().find((m) => m.key === a || m.name.toLowerCase().includes((a || '#').toLowerCase())); if (!c) return print('cars: ' + cars().map((m) => m.key).join(', '), 'err'); setCar(c.key); print('now driving ' + esc(c.name)); },
    sky: (a) => { if (!moods.includes(a)) return print('sky: ' + moods.join(' | '), 'err'); setMood(a); print('sky set to ' + a); },
    quality: (a) => { if (a !== 'low' && a !== 'high') return print('quality: low | high', 'err'); setQuality(a); print('graphics: ' + a); },
    rain: (a) => { weather(a !== 'off'); print('rain ' + (a === 'off' ? 'off' : 'on')); },
    party: () => { party(); print('fireworks launched'); },
    stats: () => print(`packets delivered: ${game.collected}/${game.N}<br>lap: ${game.lapText()} · best: ${game.bestText()}`),
    clear: () => { out.innerHTML = ''; },
    exit: () => close(),
    sudo: (...a) => { if (a.join(' ') === 'hire zahid') print('<b>permission granted.</b> generating offer letter… ✔<br>just kidding. but email me: ' + profile.email); else print('zahid is not in the sudoers file. this incident will be reported.', 'err'); },
    ls: () => print('about/  projects/  skills/  contact.txt'),
    cat: (a) => (a === 'contact.txt' ? cmds.contact() : print('cat: ' + esc(a || '') + ': no such file', 'err')),
    pwd: () => print('/home/zahid/career/2018-now'),
    date: () => print(new Date().toString()),
    echo: (...a) => print(esc(a.join(' '))),
  };

  function run(line) {
    const [name, ...args] = line.trim().split(/\s+/);
    if (!name) return;
    print('<span class="p">&gt;</span> ' + esc(line));
    const fn = cmds[name.toLowerCase()];
    if (fn) fn(...args); else print(`${esc(name)}: command not found. type <b>help</b>.`, 'err');
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; if (v.trim()) { history.push(v); hi = history.length; } run(v); });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape' || e.key === '`') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) input.value = history[--hi]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); input.value = hi < history.length - 1 ? history[++hi] : (hi = history.length, ''); }
    else if (e.key === 'Tab') { e.preventDefault(); const v = input.value.toLowerCase(); const m = Object.keys(cmds).filter((c) => c.startsWith(v)); if (m.length === 1) input.value = m[0] + ' '; }
  });
  el.querySelector('[data-x]').onclick = () => close();
  function open() { if (!el.hidden) return; el.hidden = false; onOpen?.(); if (!out.childElementCount) print('Zahid\'s portfolio shell. type <b>help</b>.'); setTimeout(() => input.focus(), 30); }
  function close() { if (el.hidden) return; el.hidden = true; input.blur(); onClose?.(); }
  return { open, close, toggle() { el.hidden ? open() : close(); }, get isOpen() { return !el.hidden; } };
}
