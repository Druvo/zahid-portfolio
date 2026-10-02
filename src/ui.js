import { profile, jobs, skills, exploring, awards, education, stations } from './data.js';
import { ISLAND_R, roadR, DEG } from './world.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const stars = (n) => `<span class="stars">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;

// ---------- cards ----------
function projectHTML(st) {
  return `<div class="meta">${esc(st.org)} · ${esc(st.period)}</div>
    <h2>${esc(st.title)}</h2>
    <div class="sub">${esc(st.role)}${st.team ? ' · ' + esc(st.team) : ''}</div>
    <div class="chips">${st.scope.map((s) => `<span>${esc(s)}</span>`).join('')}</div>
    <ul>${st.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
    <div class="outcome"><b>Outcome</b>${esc(st.outcome)}</div>
    <div class="hint">${esc(st.hint)}</div>`;
}

const hubHTML = {
  about: () => `<div class="meta">Profile</div><h2>Zahid Hasan</h2><div class="sub">${esc(profile.title)} · ${esc(profile.location)}</div>
    <p style="font-size:.9rem;line-height:1.55;margin:.3rem 0 .8rem;color:#e2ddd2">${esc(profile.summary)}</p>
    <div class="stat3">${profile.stats.map((s) => `<div><b>${s.big}</b><small>${s.label}</small></div>`).join('')}</div>
    <ul>${profile.achievements.map(([t, d]) => `<li><b>${esc(t)}.</b> ${esc(d)}</li>`).join('')}</ul>
    <div class="hint">Knock over my name if you like. Press T to put everything back.</div>`,
  skills: () => `<div class="meta">Skills matrix</div><h2>What I build with</h2><div class="sub">Towers are rated from my CV: tall = expert hands-on delivery, short = working knowledge.</div>
    ${skills.map((s) => `<div class="skillrow"><b>${esc(s.name)}</b>${stars(s.rating)}<small>${esc(s.note)}</small></div>`).join('')}`,
  awards: () => `<div class="meta">Recognition</div><h2>Awards & Certifications</h2>
    <ul>${awards.map((a) => `<li><b>${esc(a.title)}</b><br>${esc(a.sub)}</li>`).join('')}</ul>
    <div class="outcome"><b>Why it matters</b>The design patterns certification underpins the Clean Architecture and SOLID-driven backend design used across my projects.</div>`,
  lab: () => `<div class="meta">In the lab</div><h2>Currently exploring</h2><div class="sub">What I am learning next, so the platform keeps growing.</div>
    <div class="chips">${exploring.map((s) => `<span>${esc(s)}</span>`).join('')}</div>
    <div class="outcome"><b>Direction</b>Moving from backend services toward integration platforms: gateways, containers, pipelines, and AI tooling (MCP and RAG).</div>`,
  edu: () => `<div class="meta">Education</div><h2>Where it started</h2>
    ${education.map((e) => `<div class="outcome" style="margin:.6rem 0"><b>${esc(e.period)}</b>${esc(e.title)}<br><span style="color:var(--mute)">${esc(e.org)}</span></div>`).join('')}`,
  contact: () => `<div class="meta">Contact</div><h2>Let's build something</h2><div class="sub">Open to conversations about backend, integration, and platform work.</div>
    <div class="links">
      <a href="mailto:${profile.email}">Email <small>${profile.email}</small></a>
      <a href="${profile.linkedin}" target="_blank" rel="noopener">LinkedIn <small>in/zhdruvo</small></a>
      <a href="${profile.site}" target="_blank" rel="noopener">Website <small>druvo.github.io</small></a>
      <a href="tel:${profile.phone}">Phone <small>${profile.phone}</small></a>
    </div>
    <div class="hint">${esc(profile.location)}</div>`,
};

export function createUI({ entries, onTravel, onSound, isMuted }) {
  const card = $('#card'), prompt = $('#prompt'), toastEl = $('#toast'), mini = $('#minimap'), mctx = mini.getContext('2d');
  const visited = new Set(); let current = null, toastT = 0;
  $('#total').textContent = entries.length;

  function show(entry) {
    if (current === entry) return;
    current = entry;
    if (!entry) { card.classList.remove('on'); return; }
    const st = entry.st;
    card.style.setProperty('--accent', st.color);
    card.innerHTML = st.bullets ? projectHTML(st) : hubHTML[st.kind]();
    card.scrollTop = 0; card.classList.add('on');
  }

  function toast(msg, ms = 3200) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms); }

  function discover(entry) {
    if (visited.has(entry.st.id)) return false;
    visited.add(entry.st.id); $('#found').textContent = visited.size;
    toast(visited.size === entries.length ? 'Every place found. You have seen the whole career. Say hello at the radio mast!' : `Discovered: ${entry.st.title.split(' - ')[0]}`);
    return true;
  }

  let lastP = null; function setPrompt(text) { if (text === lastP) return; lastP = text; prompt.textContent = text || ''; prompt.classList.toggle('on', !!text); }

  // ---------- minimap ----------
  const S = mini.width / 2, k = (S - 14) / (ISLAND_R + 6);
  function drawMap(van, heading) {
    mctx.clearRect(0, 0, mini.width, mini.height);
    mctx.save(); mctx.translate(S, S);
    mctx.strokeStyle = 'rgba(255,179,71,.55)'; mctx.lineWidth = 5; mctx.beginPath();
    for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, r = roadR(a) * k; const x = Math.sin(a) * r, y = Math.cos(a) * r; i ? mctx.lineTo(x, y) : mctx.moveTo(x, y); }
    mctx.stroke();
    mctx.strokeStyle = 'rgba(255,255,255,.18)'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(0, 0, ISLAND_R * k, 0, 7); mctx.stroke();
    for (const e of entries) {
      const x = e.g.position.x * k, y = e.g.position.z * k, seen = visited.has(e.st.id);
      mctx.fillStyle = seen ? e.st.color : 'rgba(255,255,255,.35)'; mctx.beginPath(); mctx.arc(x, y, seen ? 6 : 4.5, 0, 7); mctx.fill();
      if (current === e) { mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(x, y, 10, 0, 7); mctx.stroke(); }
    }
    mctx.translate(van.x * k, van.z * k); mctx.rotate(-heading + Math.PI);
    mctx.fillStyle = '#4de3d0'; mctx.beginPath(); mctx.moveTo(0, -11); mctx.lineTo(8, 9); mctx.lineTo(0, 5); mctx.lineTo(-8, 9); mctx.closePath(); mctx.fill();
    mctx.restore();
  }

  // ---------- fast travel + plain CV ----------
  const menu = $('#mapmenu'), cv = $('#cv');
  function renderMenu() {
    menu.innerHTML = `<div class="box"><button class="close" data-close>Close (Esc)</button><h2>Fast travel</h2><p>Pick a place and the van teleports there. Projects run chronologically around the road.</p>
      <div class="travel">${entries.map((e, i) => `<button data-i="${i}" class="${visited.has(e.st.id) ? 'seen' : ''}" style="--c:${e.st.color}">${esc(e.st.title.split(' - ')[0])}<small>${esc(e.st.period || e.st.kind)}</small></button>`).join('')}</div></div>`;
  }
  menu.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === menu) return toggle(menu, false);
    const b = e.target.closest('[data-i]'); if (b) { toggle(menu, false); onTravel(entries[+b.dataset.i]); }
  });
  function renderCV() {
    cv.innerHTML = `<div class="box"><button class="close" data-close>Close (Esc)</button><h2>${profile.name}</h2><p>${profile.title} · ${profile.location}<br>${profile.email} · ${profile.phone} · <a style="color:var(--cyan)" href="${profile.linkedin}" target="_blank">linkedin.com/in/zhdruvo</a> · <a style="color:var(--cyan)" href="${profile.site}" target="_blank">druvo.github.io</a></p>
      <h3>Summary</h3><p>${esc(profile.summary)}</p>
      <h3>Employment</h3>${jobs.map(([r, c, p]) => `<div class="row"><b>${r} · ${c}</b><small>${p}</small></div>`).join('')}
      <h3>Key client engagements</h3>${[...stations].reverse().map((s) => `<div class="row"><b>${esc(s.title)}</b><small>${esc(s.role)}, ${esc(s.org)} · ${esc(s.period)}${s.team ? ' · ' + esc(s.team) : ''}</small><p style="margin:.3rem 0 0">${esc(s.outcome)}</p></div>`).join('')}
      <h3>Skills</h3><p>${skills.map((s) => `${esc(s.name)} (${s.rating}/5)`).join(' · ')}</p>
      <h3>Currently exploring</h3><p>${exploring.join(' · ')}</p>
      <h3>Awards & certifications</h3><ul>${awards.map((a) => `<li>${esc(a.title)} — ${esc(a.sub)}</li>`).join('')}</ul>
      <h3>Education</h3><ul>${education.map((e) => `<li>${esc(e.title)}, ${esc(e.org)}, ${esc(e.period)}</li>`).join('')}</ul></div>`;
  }
  cv.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target === cv) toggle(cv, false); });
  renderCV();
  function toggle(el, on) { if (on === undefined) on = el.hidden; if (on && el === menu) renderMenu(); el.hidden = !on; el.classList.toggle('hide', !on); }
  const anyOpen = () => !menu.hidden || !cv.hidden;
  $('#btn-map').onclick = () => toggle(menu); $('#btn-cv').onclick = () => toggle(cv);
  const sBtn = $('#btn-sound'); sBtn.onclick = () => { onSound(); sBtn.textContent = isMuted() ? 'Sound off' : 'Sound on'; };

  return {
    visited, show, discover, toast, setPrompt, drawMap, toggle, menu, cv, anyOpen, closeAll() { toggle(menu, false); toggle(cv, false); },
    setSpeed(v, boost) { $('#speed').textContent = Math.round(Math.abs(v) * 3.6); $('#boost').style.width = (boost * 100).toFixed(0) + '%'; },
    soundLabel() { sBtn.textContent = isMuted() ? 'Sound off' : 'Sound on'; },
  };
}
