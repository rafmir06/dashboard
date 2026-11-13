const STORE_KEY = 'dashboard.v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmt = (s, o = { day: 'numeric', month: 'short' }) => parse(s).toLocaleDateString('fr-FR', o);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const weekStart = d => addDays(d, -((d.getDay() + 6) % 7));
const weekKey = s => iso(weekStart(typeof s === 'string' ? parse(s) : s));
const dow = d => (d.getDay() + 6) % 7;
const todayIso = () => iso(new Date());

const ICONS = {
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  projects: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9h8M8 13h5"/>',
  agenda: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  fitness: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 1.2 14H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 1.2V1a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 17 4.6a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 22.8 10H23a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'
};
const NAV = [['home', 'Accueil'], ['projects', 'Tâches'], ['agenda', 'Agenda'], ['fitness', 'Sport'], ['settings', 'Réglages']];
const MODULE_LABELS = { stats: 'Cartes de synthèse', projects: 'Projets', tasks: 'Tâches', agenda: 'Agenda', fitness: 'Salle de sport', applications: 'Candidatures' };
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const SESSION_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Cardio', 'Full body', 'Repos'];
const DEFAULT_PROGRAM = ['Push', 'Pull', 'Legs', 'Cardio', 'Upper', 'Lower', 'Cardio'];
const APP_STATUS = ['Envoyée', 'Entretien', 'Refusée', 'Acceptée'];
const THEMES = {
  forest: ['Forest', ['#051F20', '#235347', '#8EB69B', '#DAF1DE']],
  sunset: ['Sunset', ['#EA6113', '#F88F22', '#FBB931', '#FFE3B3']],
  dusk: ['Dusk', ['#502D55', '#935073', '#F6DBC0', '#F8F4E9']],
  moon: ['Moon', ['#210635', '#7B337E', '#6667AB', '#F5D5E0']],
  rose: ['Rose', ['#4B0F1E', '#8E2B44', '#E07A94', '#F7D6DC']],
  bordeaux: ['Bordeaux', ['#090909', '#3A0C1C', '#7B1939', '#C2416B']],
  moonstone: ['Moonstone', ['#3A4048', '#6B737D', '#D9E0E7', '#F3F6F9']],
  charcoal: ['Royal Charcoal', ['#1E2023', '#47484C', '#4C4E51', '#B9BCC2']]
};
function applyTheme(t) {
  if (!THEMES[t]) t = 'forest';
  document.documentElement.dataset.theme = t;
  localStorage.setItem('dashboard.theme', t);
  $('meta[name=theme-color]').content = getComputedStyle(document.documentElement).getPropertyValue('--c0').trim();
  $('#themePick').innerHTML = Object.entries(THEMES).map(([k, [n, cs]]) =>
    `<button class="theme-opt${k === t ? ' active' : ''}" data-theme-opt="${k}"><i>${cs.map(c => `<b style="background:${c}"></b>`).join('')}</i>${n}</button>`).join('');
}
const CHECK = '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>';
const WHEEL_H = 36;
const WHEELS = {
  w: Array.from({ length: 161 }, (_, i) => i * 2.5),
  s: Array.from({ length: 10 }, (_, i) => i + 1),
  r: Array.from({ length: 50 }, (_, i) => i + 1)
};

const state = { data: null, view: 'home', projFilter: 'all', taskScope: 'day', calCursor: new Date(), selDay: todayIso(), fitAll: false, appsAll: false };

const store = {
  async load() {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) try { return JSON.parse(saved); } catch {}
    return this.fetchDefault();
  },
  async fetchDefault() {
    try { const r = await fetch('data.json', { cache: 'no-store' }); if (r.ok) return r.json(); } catch {}
    toast('data.json inaccessible : lance un serveur local');
    return {};
  },
  save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.data)); }
    catch { toast('Stockage plein : exporte puis nettoie tes données'); }
    if (state.view === 'settings') RENDER.storage?.();
  }
};

let saveTimer;
function commit(...parts) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.save(), 150);
  requestAnimationFrame(() => { parts.forEach(p => RENDER[p]?.()); RENDER.stats(); });
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

function navigate(view) {
  if (state.view === view) return;
  state.view = view;
  $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === view));
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, '', '#' + view);
  if (view === 'settings') RENDER.storage();
}

function buildNav() {
  const html = NAV.map(([k, l]) => `<button class="nav-btn${k === state.view ? ' active' : ''}" data-view="${k}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg><span>${l}</span></button>`).join('');
  $('#bottomNav').innerHTML = html;
  $('#sideNav').innerHTML = html;
}

const recPeriod = r => r.freq === 'weekly' ? weekKey(new Date()) : todayIso();
const recDone = r => r.done === recPeriod(r);
const recLabel = r => r.freq === 'weekly' ? 'Chaque semaine' : 'Chaque jour';

function taskBuckets() {
  const today = todayIso(), wk = weekKey(today);
  const b = { today: [], week: [], upcoming: [] };
  for (const t of state.data.tasks) {
    if (t.scope === 'week') {
      const k = weekKey(t.due);
      if (k === wk || (k < wk && !t.done)) b.week.push(t);
      else if (k > wk) b.upcoming.push(t);
    } else if (t.due === today || (t.due < today && !t.done)) b.today.push(t);
    else if (t.due > today) b.upcoming.push(t);
  }
  b.today.sort((a, c) => a.done - c.done);
  b.week.sort((a, c) => a.done - c.done);
  b.upcoming.sort((a, c) => a.due.localeCompare(c.due));
  return b;
}

function taskTag(t) {
  const today = todayIso();
  if (!t.done && (t.scope === 'week' ? weekKey(t.due) < weekKey(today) : t.due < today)) return '<span class="tag late">En retard</span>';
  if (t.due > today && t.scope !== 'week') return `<span class="tag">${fmt(t.due, { weekday: 'short', day: 'numeric', month: 'short' })}</span>`;
  if (t.scope === 'week' && weekKey(t.due) > weekKey(today)) return `<span class="tag">Sem. du ${fmt(weekKey(t.due))}</span>`;
  return '';
}

const taskHTML = t => `
  <div class="task${t.done ? ' done' : ''}">
    <button class="check" data-toggle-task="${t.id}" aria-label="Cocher">${CHECK}</button>
    <div class="t-body"><span class="t-title">${esc(t.title)}</span>${taskTag(t)}</div>
    <button class="del" data-edit-task="${t.id}" aria-label="Modifier">✎</button>
    <button class="del" data-del-task="${t.id}" aria-label="Supprimer">✕</button>
  </div>`;

const recTaskHTML = r => `
  <div class="task${recDone(r) ? ' done' : ''}">
    <button class="check" data-toggle-rec="${r.id}" aria-label="Cocher">${CHECK}</button>
    <div class="t-body"><span class="t-title">${esc(r.title)}</span><span class="tag rec">↻ ${r.freq === 'weekly' ? 'hebdo' : 'quotidien'}</span></div>
    <button class="del" data-edit-rec="${r.id}" aria-label="Modifier">✎</button>
    <button class="del" data-del-rec="${r.id}" aria-label="Supprimer">✕</button>
  </div>`;

const projectHTML = p => `
  <div class="project" data-edit-project="${p.id}">
    <div class="p-top"><span class="p-name">${esc(p.name)}</span><span class="pct">${p.progress}%</span></div>
    <div class="p-meta"><span class="badge">${esc(p.status)}</span><span class="badge ${esc(p.priority)}">${esc(p.priority)}</span>${p.due ? `<span class="badge">⏱ ${fmt(p.due)}</span>` : ''}</div>
    <div class="progress"><i style="width:${p.progress}%"></i></div>
  </div>`;

const eventHTML = e => {
  const d = parse(e.date);
  return `<div class="event" data-edit-event="${e.id}">
    <div class="ev-date"><b>${d.getDate()}</b><small>${d.toLocaleDateString('fr-FR', { month: 'short' })}</small></div>
    <div class="ev-info"><div>${esc(e.title)}</div><small>${e.time || 'Journée'}${e.duration ? ' · ' + e.duration + ' min' : ''}</small></div>
  </div>`;
};

const sortPriority = { Haute: 0, Moyenne: 1, Basse: 2 };
const monthWorkouts = () => { const from = iso(addDays(new Date(), -29)), to = todayIso(); return state.data.workouts.filter(w => w.date >= from && w.date <= to); };
const workoutScore = w => (w.lifts || []).reduce((a, l) => a + (l.weight || 0) * (l.reps || 0) * (l.sets || 1), 0) || (w.duration || 0) * 20;
const programFor = d => state.data.program[dow(d)];

function fitnessStats(list) {
  let volume = 0, minutes = 0;
  const records = {};
  for (const w of list) {
    minutes += +w.duration || 0;
    for (const l of w.lifts || []) {
      volume += (l.weight || 0) * (l.reps || 0) * (l.sets || 1);
      if (l.weight > 0 && (!records[l.name] || l.weight > records[l.name].weight)) records[l.name] = { weight: l.weight, date: w.date };
    }
  }
  return { count: list.length, volume, minutes, records };
}

function todaySessionHTML(compact) {
  const now = new Date(), today = todayIso();
  const type = programFor(now);
  const done = state.data.workouts.find(w => w.date === today);
  const ws = weekStart(now);
  const strip = DEFAULT_PROGRAM.map((_, i) => {
    const d = addDays(ws, i), k = iso(d);
    const ok = state.data.workouts.some(w => w.date === k);
    return `<span class="${k === today ? 'now' : ok ? 'ok' : ''}" title="${DAYS[i]}">${DAYS[i][0]}<br>${esc(state.data.program[i]).slice(0, 4)}</span>`;
  }).join('');
  const action = type === 'Repos' ? '' : done
    ? `<button class="btn-ghost small" data-edit-workout="${done.id}">Voir</button>`
    : `<button class="btn-primary" data-start-session="${esc(type)}">Démarrer</button>`;
  return `<div class="today-session${done ? ' done' : ''}">
      <div class="grow"><small>Séance du jour · ${DAYS[dow(now)]}</small><div class="big">${esc(type)}</div>
      <small>${done ? '✓ Séance enregistrée' : type === 'Repos' ? 'Récupération' : 'À faire'}</small></div>${action}
    </div>${compact ? '' : `<div class="week-strip">${strip}</div>`}`;
}

function heatmapHTML(all) {
  const ws = state.data.workouts;
  const scores = {};
  ws.forEach(w => scores[w.date] = (scores[w.date] || 0) + workoutScore(w));
  const max = Math.max(1, ...Object.values(scores));
  const now = new Date(), today = iso(now);
  let start, end, inRange;
  if (all) {
    const first = ws.reduce((m, w) => w.date < m ? w.date : m, today);
    const minStart = addDays(now, -7 * 11);
    start = weekStart(parse(first) < minStart ? parse(first) : minStart);
    end = weekStart(now);
    inRange = () => true;
  } else {
    const from = iso(addDays(now, -29));
    start = weekStart(parse(from)); end = weekStart(now);
    inRange = k => k >= from && k <= today;
  }
  let html = 'LMMJVSD'.split('').map(l => `<div class="hm-lbl">${l}</div>`).join('') + '<div></div>';
  for (let w = start; w <= end; w = addDays(w, 7)) {
    for (let i = 0; i < 7; i++) {
      const k = iso(addDays(w, i)), s = scores[k] || 0, r = s / max;
      const lvl = !s ? '' : r >= .9 ? 'l4' : r >= .6 ? 'l3' : r >= .3 ? 'l2' : 'l1';
      const wk = ws.filter(x => x.date === k).map(x => x.type).join(', ');
      html += `<div class="hm-cell ${lvl}${inRange(k) ? '' : ' out'}${k === today ? ' today' : ''}" title="${fmt(k, { weekday: 'short', day: 'numeric', month: 'short' })}${wk ? ' · ' + esc(wk) : ''}" data-hm="${k}"></div>`;
    }
    const lbl = all ? (w.getDate() <= 7 ? w.toLocaleDateString('fr-FR', { month: 'short' }) : '') : w.getDate();
    html += `<div class="hm-lbl">${lbl}</div>`;
  }
  return `<div class="hm-cols">${html}</div>`;
}

function appsChartSVG() {
  const days = 30, now = new Date();
  const counts = {};
  state.data.applications.forEach(a => counts[a.date] = (counts[a.date] || 0) + 1);
  const pts = Array.from({ length: days }, (_, i) => { const k = iso(addDays(now, i - days + 1)); return [k, counts[k] || 0]; });
  const max = Math.max(2, ...pts.map(p => p[1]));
  const W = 300, H = 130, L = 20, T = 8, B = 18;
  const x = i => L + i * (W - L - 4) / (days - 1);
  const y = v => T + (1 - v / max) * (H - T - B);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
  const grid = [0, .5, 1].map(f => { const v = Math.round(max * f); return `<line class="grid" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="0" y="${y(v) + 3}">${v}</text>`; }).join('');
  const xl = pts.map((p, i) => (i % 7 === 0 && i < days - 4) || i === days - 1 ? `<text class="axis" x="${x(i)}" y="${H - 4}" text-anchor="middle">${fmt(p[0])}</text>` : '').join('');
  const dots = pts.map((p, i) => p[1] ? `<circle class="dot" cx="${x(i)}" cy="${y(p[1])}" r="2.6"><title>${fmt(p[0])} : ${p[1]}</title></circle>` : '').join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="ag" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--c4)" stop-opacity=".45"/><stop offset="1" style="stop-color:var(--c4)" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${line}L${x(days - 1)},${y(0)}L${L},${y(0)}Z" fill="url(#ag)"/><path class="line" d="${line}"/>${dots}${xl}</svg>`;
}

const RENDER = {
  header() {
    const { user } = state.data;
    const name = (user.name || '').trim();
    $('#greeting').textContent = (new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir') + (name ? `, ${name}` : '');
    $('#today').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#userName').textContent = name || 'Mon dashboard';
    $('#userSub').textContent = user.subtitle || '';
    $('#avatar').textContent = name ? name[0].toUpperCase() : '☺';
    const f = $('#profileForm');
    if (document.activeElement?.form !== f) { f.elements.name.value = name; f.elements.subtitle.value = user.subtitle || ''; }
  },
  modules() {
    const m = state.data.modules;
    $$('[data-module]').forEach(el => el.classList.toggle('hidden-module', m[el.dataset.module] === false));
    $('#moduleToggles').innerHTML = Object.entries(MODULE_LABELS).map(([k, l]) =>
      `<div class="mod-row"><span>${l}</span><button class="toggle${m[k] !== false ? ' on' : ''}" data-module-toggle="${k}"><span></span></button></div>`).join('');
    $('#programEditor').innerHTML = DAYS.map((d, i) =>
      `<div class="mod-row"><span>${d}</span><select class="input" style="width:auto" data-program="${i}">${SESSION_TYPES.map(t => `<option${t === state.data.program[i] ? ' selected' : ''}>${t}</option>`).join('')}</select></div>`).join('');
  },
  stats() {
    const { projects, events, workouts, applications } = state.data;
    const today = todayIso();
    const active = projects.filter(p => p.status !== 'Terminé');
    const avg = active.length ? Math.round(active.reduce((a, p) => a + p.progress, 0) / active.length) : 0;
    const b = taskBuckets();
    const items = [...b.today, ...b.week], recs = state.data.recurring;
    const open = items.filter(t => !t.done).length + recs.filter(r => !recDone(r)).length;
    const cards = [
      ['Projets actifs', `${active.length}<small> · ${avg}% moy.</small>`, 'projects'],
      ['Tâches restantes', `${open}<small> / ${items.length + recs.length}</small>`, 'projects'],
      ['Événements à venir', events.filter(e => e.date >= today).length, 'agenda'],
      ['Séances 30 j', `${monthWorkouts().length}<small> · ${workouts.length} total</small>`, 'fitness']
    ];
    $('#stats').innerHTML = cards.map(([l, v, g]) => `<div class="stat glass" data-goto="${g}"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');
  },
  projects() {
    const list = [...state.data.projects].sort((a, b) => sortPriority[a.priority] - sortPriority[b.priority] || b.progress - a.progress);
    $('#homeProjects').innerHTML = list.filter(p => p.status === 'En cours').slice(0, 3).map(projectHTML).join('') || '<p class="empty">Aucun projet actif.</p>';
    const filtered = state.projFilter === 'all' ? list : list.filter(p => p.status === state.projFilter);
    $('#projectList').innerHTML = filtered.map(projectHTML).join('') || '<p class="empty">Rien ici.</p>';
  },
  tasks() {
    const b = taskBuckets();
    const recs = state.data.recurring;
    const daily = recs.filter(r => r.freq !== 'weekly'), weekly = recs.filter(r => r.freq === 'weekly');
    const homeItems = [...daily.map(recTaskHTML), ...b.today.map(taskHTML), ...weekly.filter(r => !recDone(r)).map(recTaskHTML), ...b.week.filter(t => !t.done).map(taskHTML)];
    $('#homeTasks').innerHTML = homeItems.join('') || '<p class="empty">Rien à faire 🎉</p>';
    const total = recs.length + b.today.length + b.week.length;
    const done = recs.filter(recDone).length + b.today.filter(t => t.done).length + b.week.filter(t => t.done).length;
    $('#taskCount').textContent = $('#taskCount2').textContent = `${done}/${total}`;
    const group = (title, arr) => arr.length ? `<div class="task-group">${title}</div>${arr.join('')}` : '';
    $('#taskList').innerHTML =
      group("Aujourd'hui", [...daily.map(recTaskHTML), ...b.today.map(taskHTML)]) +
      group('Cette semaine', [...weekly.map(recTaskHTML), ...b.week.map(taskHTML)]) +
      group('À venir', b.upcoming.map(taskHTML)) || '<p class="empty">Aucune tâche.</p>';
    $('#recurringList').innerHTML = recs.map(r => `<div class="rec-row" data-edit-rec="${r.id}"><span>${esc(r.title)}</span><span class="pill">${recLabel(r)}</span></div>`).join('') || '<p class="empty">Aucune tâche récurrente.</p>';
  },
  agenda() {
    const { events, workouts, tasks } = state.data;
    const today = todayIso();
    const upcoming = events.filter(e => e.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    $('#homeEvents').innerHTML = upcoming.slice(0, 4).map(eventHTML).join('') || '<p class="empty">Rien de prévu.</p>';

    const c = state.calCursor, y = c.getFullYear(), m = c.getMonth();
    $('#calTitle').textContent = c.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const byDay = {};
    events.forEach(e => (byDay[e.date] ??= { e: 0, w: 0 }).e++);
    tasks.forEach(t => { if (t.scope !== 'week' && !t.done) (byDay[t.due] ??= { e: 0, w: 0 }).e++; });
    workouts.forEach(w => (byDay[w.date] ??= { e: 0, w: 0 }).w++);
    const start = weekStart(new Date(y, m, 1));
    let html = '';
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i), k = iso(d), info = byDay[k];
      const cls = ['cal-day', d.getMonth() !== m && 'other', k === today && 'today', k === state.selDay && 'sel'].filter(Boolean).join(' ');
      const dots = info ? `<span class="dots">${'<i></i>'.repeat(Math.min(info.e, 3))}${info.w ? '<i class="w"></i>' : ''}</span>` : '';
      html += `<button class="${cls}" data-day="${k}">${d.getDate()}${dots}</button>`;
    }
    $('#calGrid').innerHTML = html;

    const sel = state.selDay;
    $('#dayTitle').textContent = fmt(sel, { weekday: 'long', day: 'numeric', month: 'long' });
    const dayEv = events.filter(e => e.date === sel).sort((a, b) => (a.time || '').localeCompare(b.time || '')).map(eventHTML).join('');
    const dayT = tasks.filter(t => t.scope !== 'week' && t.due === sel).map(taskHTML).join('');
    const dayW = workouts.filter(w => w.date === sel).map(w => `<div class="event" data-edit-workout="${w.id}"><div class="ev-date"><b>🏋</b></div><div class="ev-info"><div>Séance ${esc(w.type)}</div><small>${w.duration} min</small></div></div>`).join('');
    $('#dayEvents').innerHTML = dayEv + dayW + dayT || `<p class="empty">Rien ce jour. Programme : ${esc(programFor(parse(sel)))}</p>`;
  },
  fitness() {
    const { workouts } = state.data;
    const month = monthWorkouts();
    const ms = fitnessStats(month);
    $('#homeFitness').innerHTML = `${todaySessionHTML(true)}
      <div class="stats-grid small" style="margin-top:12px">
        <div class="stat glass" data-goto="fitness"><div class="lbl">Séances 30 j</div><div class="val">${ms.count}</div></div>
        <div class="stat glass" data-goto="fitness"><div class="lbl">Volume</div><div class="val">${(ms.volume / 1000).toFixed(1)}<small> t</small></div></div>
      </div>`;
    $('#todaySession').innerHTML = todaySessionHTML(false);
    $('#heatmap').innerHTML = heatmapHTML(state.fitAll);

    const list = state.fitAll ? workouts : month;
    const s = fitnessStats(list);
    $('#fitStats').innerHTML = [
      ['Séances', s.count], ['Volume', `${(s.volume / 1000).toFixed(1)}<small> t</small>`],
      ['Temps', `${Math.round(s.minutes / 6) / 10}<small> h</small>`], ['Moy./séance', `${s.count ? Math.round(s.minutes / s.count) : 0}<small> min</small>`]
    ].map(([l, v]) => `<div class="stat glass"><div class="lbl">${l}</div><div class="val">${v}</div></div>`).join('');
    $('#fitRecords').innerHTML = Object.entries(s.records).sort((a, b) => b[1].weight - a[1].weight)
      .map(([n, r]) => `<div class="record"><span>${esc(n)}</span><span><b>${r.weight} kg</b> <small>· ${fmt(r.date)}</small></span></div>`).join('') || '<p class="empty">Aucune donnée.</p>';

    $('#fitToggle').classList.toggle('on', state.fitAll);
    $('#fitLabelMonth').classList.toggle('on', !state.fitAll);
    $('#fitLabelAll').classList.toggle('on', state.fitAll);

    $('#workoutList').innerHTML = [...list].sort((a, b) => b.date.localeCompare(a.date)).map(w => `
      <div class="workout" data-edit-workout="${w.id}">
        <div class="p-top"><b>${esc(w.type)}</b><small>${fmt(w.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${w.duration} min</small></div>
        <ul>${(w.lifts || []).map(l => `<li>${esc(l.name)} — ${l.sets}×${l.reps} @ ${l.weight} kg</li>`).join('')}</ul>
      </div>`).join('') || '<p class="empty">Aucune séance.</p>';
    RENDER.agenda();
  },
  applications() {
    const apps = [...state.data.applications].sort((a, b) => b.date.localeCompare(a.date));
    const today = todayIso(), week = iso(addDays(new Date(), -6));
    $('#appKpis').innerHTML = `<div><small>Aujourd'hui</small><b>${apps.filter(a => a.date === today).length}</b></div>
      <div><small>7 jours</small><b>${apps.filter(a => a.date >= week).length}</b></div>
      <div><small>Total</small><b>${apps.length}</b></div>`;
    $('#appChart').innerHTML = appsChartSVG();
    $('#appLatest').innerHTML = (state.appsAll ? apps : apps.slice(0, 3)).map(a => `
      <div class="app-item" data-edit-app="${a.id}"><div><div>${esc(a.company)}</div><small>${esc(a.role)} · ${fmt(a.date)}</small></div><span class="status ${esc(a.status)}">${esc(a.status)}</span></div>`).join('') || '<p class="empty">Importe un JSON ou ajoute une candidature.</p>';
    $('#appShowAll').textContent = state.appsAll ? 'Réduire' : `Voir tout (${apps.length})`;
    $('#appShowAll').hidden = apps.length <= 3;
  },
  storage() {
    const used = storageUsage(), pct = Math.max(.5, used / STORAGE_MAX * 100);
    const d = state.data, last = localStorage.getItem(BACKUP_KEY);
    const kb = n => n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} Ko` : `${(n / 1048576).toFixed(2)} Mo`;
    $('#storageGauge').innerHTML = `
      <div class="p-top"><span>Stockage utilisé</span><span class="pct">${kb(used)} / 5 Mo</span></div>
      <div class="progress${pct > 80 ? ' warn' : ''}"><i style="width:${pct}%"></i></div>
      <small>${d.tasks.length} tâches · ${d.workouts.length} séances · ${d.applications.length} candidatures · ${d.events.length} événements</small>
      <small>Dernière sauvegarde : ${last ? fmt(last, { day: 'numeric', month: 'long', year: 'numeric' }) : 'jamais'} · tâches terminées nettoyées après 30 jours</small>`;
  },
  all() { ['storage', 'header', 'modules', 'projects', 'tasks', 'fitness', 'applications', 'stats'].forEach(k => RENDER[k]()); }
};

const modal = {
  onSave: null, onDelete: null,
  open({ title, fields, onSave, onDelete, after }) {
    $('#modalTitle').textContent = title;
    $('#modalFields').innerHTML = fields.map(f => {
      if (f.type === 'custom') return f.html;
      const v = esc(f.value ?? '');
      let input;
      if (f.type === 'select') input = `<select class="input" name="${f.name}">${f.options.map(o => `<option${o === f.value ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
      else if (f.type === 'range') input = `<input type="range" name="${f.name}" min="0" max="100" value="${v}" oninput="this.previousElementSibling.querySelector('b').textContent=this.value+'%'">`;
      else input = `<input class="input" type="${f.type || 'text'}" name="${f.name}" value="${v}"${f.required ? ' required' : ''}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}>`;
      return `<div class="field"><label>${f.label}${f.type === 'range' ? ` <b>${v}%</b>` : ''}</label>${input}</div>`;
    }).join('');
    this.onSave = onSave;
    this.onDelete = onDelete;
    $('#modalDelete').style.display = onDelete ? '' : 'none';
    $('#modal').classList.add('open');
    after?.();
  },
  close() { $('#modal').classList.remove('open'); }
};

function wheelHTML(kind, value) {
  return `<div class="wheel" data-kind="${kind}" data-value="${value}">${WHEELS[kind].map(v => `<div>${v}</div>`).join('')}</div>`;
}

function setWheel(el, value, smooth) {
  const vals = WHEELS[el.dataset.kind];
  let idx = vals.findIndex(v => v >= value);
  if (idx < 0) idx = vals.length - 1;
  el.scrollTo({ top: idx * WHEEL_H, behavior: smooth ? 'smooth' : 'instant' });
  markWheel(el, idx);
}

function markWheel(el, idx) {
  const vals = WHEELS[el.dataset.kind];
  idx = Math.max(0, Math.min(vals.length - 1, idx));
  if (el._sel) el._sel.classList.remove('sel');
  el._sel = el.children[idx];
  el._sel?.classList.add('sel');
  el.dataset.value = vals[idx];
}

function liftRowHTML(l = { name: '', weight: 20, sets: 3, reps: 10 }) {
  return `<div class="lift-row">
    <div class="top"><input class="input lift-name" placeholder="Nom de l'exercice" value="${esc(l.name)}"><button type="button" class="btn-icon" data-del-lift>✕</button></div>
    <div class="wheels">
      <div class="wheel-col"><small>Poids (kg)</small>${wheelHTML('w', l.weight)}</div>
      <div class="wheel-col"><small>Séries</small>${wheelHTML('s', l.sets)}</div>
      <div class="wheel-col"><small>Reps</small>${wheelHTML('r', l.reps)}</div>
    </div></div>`;
}

function initWheels(root) { $$('.wheel', root).forEach(w => setWheel(w, +w.dataset.value)); }

function templateLifts(type) {
  const last = [...state.data.workouts].filter(w => w.type === type && w.lifts?.length).sort((a, b) => b.date.localeCompare(a.date))[0];
  return last ? last.lifts.map(l => ({ ...l })) : [];
}

function editWorkout(id, preset = {}) {
  const w = state.data.workouts.find(x => x.id === id) || { date: preset.date || todayIso(), type: preset.type || programFor(new Date()), duration: 60, lifts: null };
  const lifts = w.lifts ?? templateLifts(w.type);
  modal.open({
    title: id ? 'Modifier la séance' : `Séance ${w.type}`,
    fields: [
      { name: 'date', label: 'Date', type: 'date', value: w.date, required: true },
      { name: 'type', label: 'Type', type: 'select', options: SESSION_TYPES.filter(t => t !== 'Repos'), value: w.type },
      { name: 'duration', label: 'Durée (min)', type: 'number', value: w.duration },
      { type: 'custom', html: `<div class="field"><label>Exercices</label><div id="liftRows">${(lifts.length ? lifts : [undefined]).map(liftRowHTML).join('')}</div><button type="button" class="btn-ghost" id="addLift">+ Ajouter un exercice</button></div>` }
    ],
    after: () => {
      initWheels($('#liftRows'));
      $('#addLift').onclick = () => {
        $('#liftRows').insertAdjacentHTML('beforeend', liftRowHTML());
        const row = $('#liftRows').lastElementChild;
        initWheels(row);
        $('.lift-name', row).focus();
      };
      $('#modalFields [name=type]').onchange = e => {
        if ($$('.lift-name').some(i => i.value.trim())) return;
        const t = templateLifts(e.target.value);
        if (!t.length) return;
        $('#liftRows').innerHTML = t.map(liftRowHTML).join('');
        initWheels($('#liftRows'));
      };
    },
    onSave: v => {
      const lifts = $$('#liftRows .lift-row').map(r => {
        const [wt, s, rp] = $$('.wheel', r).map(x => +x.dataset.value);
        return { name: $('.lift-name', r).value.trim(), weight: wt, sets: s, reps: rp };
      }).filter(l => l.name);
      Object.assign(w, { date: v.date, type: v.type, duration: +v.duration || 0, lifts });
      if (!id) state.data.workouts.push({ id: uid('w'), ...w });
      commit('fitness');
    },
    onDelete: id && (() => { state.data.workouts = state.data.workouts.filter(x => x.id !== id); commit('fitness'); })
  });
}

function editProject(id) {
  const p = state.data.projects.find(x => x.id === id) || { name: '', status: 'En cours', priority: 'Moyenne', progress: 0, due: '' };
  modal.open({
    title: id ? 'Modifier le projet' : 'Nouveau projet',
    fields: [
      { name: 'name', label: 'Nom', value: p.name, required: true },
      { name: 'status', label: 'Statut', type: 'select', options: ['En cours', 'En pause', 'Terminé'], value: p.status },
      { name: 'priority', label: 'Priorité', type: 'select', options: ['Haute', 'Moyenne', 'Basse'], value: p.priority },
      { name: 'progress', label: 'Progression', type: 'range', value: p.progress },
      { name: 'due', label: 'Échéance', type: 'date', value: p.due }
    ],
    onSave: v => {
      Object.assign(p, v, { progress: +v.progress });
      if (p.progress === 100) p.status = 'Terminé';
      if (!id) state.data.projects.push({ id: uid('p'), ...p });
      commit('projects');
    },
    onDelete: id && (() => { state.data.projects = state.data.projects.filter(x => x.id !== id); commit('projects'); })
  });
}

const WHEN = { day: "Aujourd'hui", week: 'Cette semaine', date: 'Date précise' };

function editTask(id) {
  const t = state.data.tasks.find(x => x.id === id);
  if (!t) return;
  const when = t.scope === 'week' ? 'week' : t.due === todayIso() ? 'day' : 'date';
  modal.open({
    title: 'Modifier la tâche',
    fields: [
      { name: 'title', label: 'Intitulé', value: t.title, required: true },
      { name: 'when', label: 'Quand', type: 'select', options: Object.values(WHEN), value: WHEN[when] },
      { name: 'due', label: 'Date (si date précise)', type: 'date', value: t.due }
    ],
    onSave: v => {
      const w = Object.keys(WHEN).find(k => WHEN[k] === v.when);
      t.title = v.title.trim() || t.title;
      t.scope = w === 'week' ? 'week' : 'day';
      t.due = w === 'week' ? weekKey(new Date()) : w === 'day' ? todayIso() : (v.due || t.due);
      commit('tasks', 'agenda');
    },
    onDelete: () => { state.data.tasks = state.data.tasks.filter(x => x.id !== id); commit('tasks', 'agenda'); }
  });
}

function editRecurring(id) {
  const r = state.data.recurring.find(x => x.id === id) || { title: '', freq: 'daily' };
  modal.open({
    title: id ? 'Tâche récurrente' : 'Nouvelle tâche récurrente',
    fields: [
      { name: 'title', label: 'Intitulé', value: r.title, required: true },
      { name: 'freq', label: 'Fréquence', type: 'select', options: ['Chaque jour', 'Chaque semaine'], value: recLabel(r) }
    ],
    onSave: v => {
      Object.assign(r, { title: v.title, freq: v.freq === 'Chaque semaine' ? 'weekly' : 'daily' });
      if (!id) state.data.recurring.push({ id: uid('r'), ...r });
      commit('tasks');
    },
    onDelete: id && (() => { state.data.recurring = state.data.recurring.filter(x => x.id !== id); commit('tasks'); })
  });
}

function editEvent(id) {
  const e = state.data.events.find(x => x.id === id) || { title: '', date: state.selDay, time: '09:00', duration: 60 };
  modal.open({
    title: id ? "Modifier l'événement" : 'Nouvel événement',
    fields: [
      { name: 'title', label: 'Titre', value: e.title, required: true },
      { name: 'date', label: 'Date', type: 'date', value: e.date, required: true },
      { name: 'time', label: 'Heure', type: 'time', value: e.time },
      { name: 'duration', label: 'Durée (min)', type: 'number', value: e.duration }
    ],
    onSave: v => {
      Object.assign(e, v, { duration: +v.duration || 60 });
      if (!id) state.data.events.push({ id: uid('e'), ...e });
      state.selDay = e.date;
      state.calCursor = parse(e.date);
      commit('agenda');
    },
    onDelete: id && (() => { state.data.events = state.data.events.filter(x => x.id !== id); commit('agenda'); })
  });
}

function editApp(id) {
  const a = state.data.applications.find(x => x.id === id) || { company: '', role: '', date: todayIso(), status: 'Envoyée', link: '' };
  modal.open({
    title: id ? 'Candidature' : 'Nouvelle candidature',
    fields: [
      { name: 'company', label: 'Entreprise', value: a.company, required: true },
      { name: 'role', label: 'Poste', value: a.role },
      { name: 'date', label: 'Date', type: 'date', value: a.date, required: true },
      { name: 'status', label: 'Statut', type: 'select', options: APP_STATUS, value: a.status },
      { name: 'link', label: 'Lien', type: 'url', value: a.link, placeholder: 'https://…' }
    ],
    onSave: v => {
      Object.assign(a, v);
      if (!id) state.data.applications.push({ id: uid('a'), ...a });
      commit('applications');
    },
    onDelete: id && (() => { state.data.applications = state.data.applications.filter(x => x.id !== id); commit('applications'); })
  });
}

function importApplications(json) {
  const arr = Array.isArray(json) ? json : json.applications || json.candidatures || [];
  const keyOf = a => `${a.company}|${a.role}|${a.date}`.toLowerCase();
  const seen = new Set(state.data.applications.map(keyOf));
  let added = 0;
  for (const r of arr) {
    const a = {
      id: uid('a'),
      company: r.company ?? r.entreprise ?? '',
      role: r.role ?? r.poste ?? r.title ?? '',
      date: (r.date ?? todayIso()).slice(0, 10),
      status: APP_STATUS.includes(r.status ?? r.statut) ? (r.status ?? r.statut) : 'Envoyée',
      link: r.link ?? r.url ?? r.lien ?? ''
    };
    if (!a.company || seen.has(keyOf(a))) continue;
    seen.add(keyOf(a));
    state.data.applications.push(a);
    added++;
  }
  return added;
}

const icsStamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEsc = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');

function exportICS() {
  const now = icsStamp(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dashboard//FR', 'CALSCALE:GREGORIAN'];
  const allDay = (id, title, date) => lines.push('BEGIN:VEVENT', `UID:${id}@dashboard`, `DTSTAMP:${now}`, `DTSTART;VALUE=DATE:${date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${iso(addDays(parse(date), 1)).replace(/-/g, '')}`, `SUMMARY:${icsEsc(title)}`, 'END:VEVENT');
  for (const e of state.data.events) {
    if (!e.time) { allDay(e.id, e.title, e.date); continue; }
    const s = parse(e.date); const [h, m] = e.time.split(':').map(Number); s.setHours(h, m);
    lines.push('BEGIN:VEVENT', `UID:${e.id}@dashboard`, `DTSTAMP:${now}`, `DTSTART:${icsStamp(s)}`, `DTEND:${icsStamp(new Date(s.getTime() + (e.duration || 60) * 60000))}`, `SUMMARY:${icsEsc(e.title)}`, 'END:VEVENT');
  }
  for (const p of state.data.projects) if (p.due && p.status !== 'Terminé') allDay(p.id, `Échéance : ${p.name}`, p.due);
  for (const t of state.data.tasks) if (t.scope !== 'week' && !t.done && t.due >= todayIso()) allDay(t.id, `Tâche : ${t.title}`, t.due);
  lines.push('END:VCALENDAR');
  download('planning.ics', lines.join('\r\n'), 'text/calendar');
  toast('Planning exporté (.ics)');
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildIndex() {
  const d = state.data;
  return [
    ...d.projects.map(p => ({ t: p.name, s: `Projet · ${p.status}`, go: () => { navigate('projects'); editProject(p.id); } })),
    ...d.tasks.map(t => ({ t: t.title, s: `Tâche · ${fmt(t.due)}`, go: () => navigate('projects') })),
    ...d.recurring.map(r => ({ t: r.title, s: `Récurrente · ${recLabel(r)}`, go: () => { navigate('projects'); editRecurring(r.id); } })),
    ...d.events.map(e => ({ t: e.title, s: `Événement · ${fmt(e.date)}`, go: () => { state.selDay = e.date; state.calCursor = parse(e.date); RENDER.agenda(); navigate('agenda'); } })),
    ...d.workouts.map(w => ({ t: `${w.type} ${(w.lifts || []).map(l => l.name).join(' ')}`, s: `Séance · ${fmt(w.date)}`, go: () => { navigate('fitness'); editWorkout(w.id); } })),
    ...d.applications.map(a => ({ t: `${a.company} ${a.role}`, s: `Candidature · ${a.status}`, go: () => { navigate('home'); editApp(a.id); } }))
  ];
}

function setupSearch() {
  const input = $('#search'), box = $('#searchResults'), bar = $('#topbar');
  let results = [];
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  input.addEventListener('focus', () => bar.classList.add('searching'));
  input.addEventListener('blur', () => setTimeout(() => { if (!input.value) bar.classList.remove('searching'); }, 150));
  input.addEventListener('input', () => {
    const raw = input.value.trim(), q = norm(raw);
    if (!q) { box.classList.remove('open'); return; }
    results = buildIndex().filter(r => norm(r.t).includes(q) || norm(r.s).includes(q)).slice(0, 8);
    const rx = new RegExp(`(${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    box.innerHTML = results.length
      ? results.map((r, i) => `<div class="sr-item" data-sr="${i}"><span>${esc(r.t).replace(rx, '<mark>$1</mark>')}</span><small>${esc(r.s)}</small></div>`).join('')
      : '<p class="empty">Aucun résultat</p>';
    box.classList.add('open');
  });
  const close = () => { input.value = ''; box.classList.remove('open'); input.blur(); bar.classList.remove('searching'); };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && results[0]) { results[0].go(); close(); }
    if (e.key === 'Escape') close();
  });
  box.addEventListener('mousedown', e => e.preventDefault());
  box.addEventListener('click', e => { const el = e.target.closest('[data-sr]'); if (el) { results[+el.dataset.sr].go(); close(); } });
  document.addEventListener('click', e => { if (!e.target.closest('.topbar')) { box.classList.remove('open'); if (!input.value) bar.classList.remove('searching'); } });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); input.focus(); } });
}

const CLICK_SEL = '[data-theme-opt],.nav-btn,[data-goto],[data-toggle-task],[data-toggle-rec],[data-del-task],[data-del-rec],[data-edit-task],[data-edit-project],[data-edit-event],[data-edit-workout],[data-edit-rec],[data-edit-app],[data-start-session],[data-day],[data-hm],[data-module-toggle],[data-del-lift],.wheel div';

function bindEvents() {
  document.addEventListener('click', e => {
    const t = e.target.closest(CLICK_SEL);
    if (!t) return;
    const ds = t.dataset;
    if (ds.themeOpt) applyTheme(ds.themeOpt);
    else if (t.classList.contains('nav-btn')) navigate(ds.view);
    else if (ds.goto) navigate(ds.goto);
    else if (ds.toggleTask || ds.toggleRec) {
      if (ds.toggleTask) { const x = state.data.tasks.find(k => k.id === ds.toggleTask); x.done = !x.done; }
      else { const r = state.data.recurring.find(k => k.id === ds.toggleRec); r.done = recDone(r) ? null : recPeriod(r); }
      $$(`[data-toggle-task="${ds.toggleTask}"],[data-toggle-rec="${ds.toggleRec}"]`).forEach(b => b.closest('.task').classList.toggle('done'));
      store.save();
      clearTimeout(bindEvents.tt);
      bindEvents.tt = setTimeout(() => commit('tasks'), 400);
    } else if (ds.delTask) { state.data.tasks = state.data.tasks.filter(x => x.id !== ds.delTask); commit('tasks', 'agenda'); }
    else if (ds.editProject) editProject(ds.editProject);
    else if (ds.editEvent) editEvent(ds.editEvent);
    else if (ds.editWorkout) editWorkout(ds.editWorkout);
    else if (ds.editRec) editRecurring(ds.editRec);
    else if (ds.editTask) editTask(ds.editTask);
    else if (ds.delRec) { state.data.recurring = state.data.recurring.filter(x => x.id !== ds.delRec); commit('tasks'); toast('Tâche récurrente supprimée'); }
    else if (ds.editApp) editApp(ds.editApp);
    else if (ds.startSession) editWorkout(null, { type: ds.startSession });
    else if (ds.hm) {
      const w = state.data.workouts.find(x => x.date === ds.hm);
      w ? editWorkout(w.id) : editWorkout(null, { date: ds.hm, type: programFor(parse(ds.hm)) === 'Repos' ? 'Cardio' : programFor(parse(ds.hm)) });
    } else if (ds.day) {
      state.selDay = ds.day;
      const d = parse(ds.day);
      if (d.getMonth() !== state.calCursor.getMonth()) state.calCursor = d;
      RENDER.agenda();
    } else if (ds.moduleToggle) {
      const m = state.data.modules;
      m[ds.moduleToggle] = m[ds.moduleToggle] === false;
      commit('modules');
    } else if ('delLift' in ds) t.closest('.lift-row').remove();
    else if (t.parentElement.classList.contains('wheel')) setWheel(t.parentElement, +t.textContent, true);
  });

  document.addEventListener('scroll', e => {
    const el = e.target;
    if (!el.classList?.contains('wheel')) return;
    cancelAnimationFrame(el._raf);
    el._raf = requestAnimationFrame(() => markWheel(el, Math.round(el.scrollTop / WHEEL_H)));
  }, true);

  document.addEventListener('change', e => {
    const p = e.target.dataset.program;
    if (p !== undefined) { state.data.program[+p] = e.target.value; commit('fitness'); toast('Programme mis à jour'); }
  });

  $('#profileForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    state.data.user = { name: f.elements.name.value.trim(), subtitle: f.elements.subtitle.value.trim() };
    f.querySelector('button').blur();
    commit('header');
    toast('Profil mis à jour');
  });
  $('#projFilter').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#projFilter button').forEach(x => x.classList.toggle('active', x === b));
    state.projFilter = b.dataset.f;
    RENDER.projects();
  });
  $('#taskScope').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#taskScope button').forEach(x => x.classList.toggle('active', x === b));
    state.taskScope = b.dataset.s;
    const dp = $('#taskForm [name=date]');
    dp.hidden = b.dataset.s !== 'date';
    dp.required = !dp.hidden;
    dp.min = iso(addDays(new Date(), 1));
    if (!dp.hidden && !dp.value) dp.value = dp.min;
  });
  $('#taskForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, title = f.title.value.trim();
    if (!title) return;
    const scope = state.taskScope;
    const due = scope === 'date' ? f.date.value : scope === 'week' ? weekKey(new Date()) : todayIso();
    state.data.tasks.push({ id: uid('t'), title, done: false, scope: scope === 'week' ? 'week' : 'day', due });
    f.title.value = '';
    toast(scope === 'date' ? `Ajoutée pour le ${fmt(due, { day: 'numeric', month: 'long' })}` : 'Tâche ajoutée');
    commit('tasks', 'agenda');
  });

  $('#addProject').onclick = () => editProject(null);
  $('#addRecurring').onclick = () => editRecurring(null);
  $('#addEvent').onclick = () => editEvent(null);
  $('#addWorkout').onclick = () => editWorkout(null);
  $('#addApp').onclick = () => editApp(null);
  $('#appShowAll').onclick = () => { state.appsAll = !state.appsAll; RENDER.applications(); };
  $('#exportIcs').onclick = exportICS;
  $('#calPrev').onclick = () => { state.calCursor = new Date(state.calCursor.getFullYear(), state.calCursor.getMonth() - 1, 1); RENDER.agenda(); };
  $('#calNext').onclick = () => { state.calCursor = new Date(state.calCursor.getFullYear(), state.calCursor.getMonth() + 1, 1); RENDER.agenda(); };
  $('#fitToggle').onclick = () => { state.fitAll = !state.fitAll; RENDER.fitness(); };

  $('#modalForm').addEventListener('submit', e => {
    e.preventDefault();
    modal.onSave?.(Object.fromEntries(new FormData(e.target)));
    modal.close();
    toast('Enregistré');
  });
  $('#modalCancel').onclick = () => modal.close();
  $('#modalDelete').onclick = () => { if (confirm('Supprimer cet élément ?')) { modal.onDelete?.(); modal.close(); toast('Supprimé'); } };
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') modal.close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.close(); });

  $('#importApps').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const n = importApplications(JSON.parse(await f.text())); commit('applications'); toast(`${n} candidature(s) ajoutée(s)`); }
    catch { toast('Fichier JSON invalide'); }
    e.target.value = '';
  };
  $('#exportJson').onclick = backupNow;
  $('#backupNow').onclick = backupNow;
  $('#backupLater').onclick = () => { localStorage.setItem(SNOOZE_KEY, todayIso()); $('#backupBanner').hidden = true; };
  $('#importJson').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { state.data = normalize(JSON.parse(await f.text()), {}); store.save(); RENDER.all(); toast('Données importées'); }
    catch { toast('Fichier invalide'); }
    e.target.value = '';
  };
  $('#resetData').onclick = async () => {
    if (!confirm('Revenir aux données de data.json ? Les modifications locales seront perdues.')) return;
    localStorage.removeItem(STORE_KEY);
    state.data = normalize(await store.fetchDefault(), {});
    store.save();
    RENDER.all();
    toast('Données réinitialisées');
  };
}

const BACKUP_KEY = 'dashboard.lastBackup', SNOOZE_KEY = 'dashboard.backupSnooze', STORAGE_MAX = 5 * 1024 * 1024;
const daysSince = s => s ? Math.floor((Date.now() - parse(s)) / 864e5) : Infinity;

function backupNow() {
  download(`dashboard-${todayIso()}.json`, JSON.stringify(state.data, null, 2), 'application/json');
  localStorage.setItem(BACKUP_KEY, todayIso());
  $('#backupBanner').hidden = true;
  RENDER.storage();
  toast('Sauvegarde téléchargée');
}

function checkBackup() {
  const last = localStorage.getItem(BACKUP_KEY);
  if (daysSince(last) < 30 || daysSince(localStorage.getItem(SNOOZE_KEY)) < 3) return;
  $('#backupInfo').textContent = last ? ` Dernière il y a ${daysSince(last)} jours` : ' Aucune sauvegarde pour l\x27instant';
  $('#backupBanner').hidden = false;
}

function cleanupTasks() {
  const limit = iso(addDays(new Date(), -30));
  const before = state.data.tasks.length;
  state.data.tasks = state.data.tasks.filter(t => !t.done || (t.scope === 'week' ? iso(addDays(parse(t.due), 6)) : t.due) >= limit);
  return before - state.data.tasks.length;
}

function storageUsage() {
  let bytes = 0;
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); bytes += (k.length + localStorage.getItem(k).length) * 2; }
  return bytes;
}

function normalize(d, defaults) {
  for (const k of ['projects', 'tasks', 'events', 'workouts', 'recurring', 'applications']) d[k] ??= defaults[k] ?? [];
  d.modules ??= {};
  d.user ??= defaults.user ?? { name: '', subtitle: '' };
  if (!Array.isArray(d.program) || d.program.length !== 7) d.program = defaults.program ?? [...DEFAULT_PROGRAM];
  for (const t of d.tasks) { t.scope ??= 'day'; t.due ??= todayIso(); }
  return d;
}

(async function init() {
  let data = await store.load();
  const missing = ['recurring', 'applications', 'program'].some(k => !(k in data));
  data = normalize(data, missing ? await store.fetchDefault() : {});
  state.data = data;
  const cleaned = cleanupTasks();
  store.save();
  if (cleaned) toast(`${cleaned} ancienne(s) tâche(s) terminée(s) nettoyée(s)`);
  checkBackup();
  applyTheme(document.documentElement.dataset.theme);
  buildNav();
  bindEvents();
  setupSearch();
  RENDER.all();
  const hash = location.hash.slice(1);
  if (NAV.some(([k]) => k === hash)) navigate(hash);
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (NAV.some(([k]) => k === h)) navigate(h); });
  addEventListener('storage', e => {
    if (e.key !== STORE_KEY || !e.newValue) return;
    clearTimeout(saveTimer);
    try { state.data = normalize(JSON.parse(e.newValue), {}); RENDER.all(); } catch {}
  });
  addEventListener('pagehide', () => { clearTimeout(saveTimer); store.save(); });
})();
