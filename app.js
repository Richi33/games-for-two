// тема: auto / dark / light (запам'ятовується)
const THEMES = ['auto', 'dark', 'light'];
function themePref() { try { return localStorage.theme || 'auto'; } catch (e) { return 'auto'; } }
function applyTheme() {
  const p = themePref(), light = p === 'light' || (p === 'auto' && matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = light ? '#f2f3fa' : '#1b1d2a';
  const b = document.getElementById('thm'); if (b) { b.textContent = p === 'auto' ? '🌓' : p === 'light' ? '☀️' : '🌙'; b.title = 'Тема: ' + p; }
}
function cycleTheme() { const n = THEMES[(THEMES.indexOf(themePref()) + 1) % 3]; try { localStorage.theme = n; } catch (e) {} applyTheme(); toast('Тема: ' + { auto: 'як у системі', dark: 'темна', light: 'світла' }[n]); }
applyTheme(); matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GAMES = [
  {id:'ttt',e:'❌',n:'Хрестики-нулики',d:'3 в ряд'},
  {id:'bs',e:'🚢',n:'Морський бій',d:'Потопи флот'},
  {id:'dots',e:'🔲',n:'Крапки й квадрати',d:'Замикай клітинки'},
  {id:'mem',e:'🧠',n:'Пам’ять',d:'Знайди пари'},
  {id:'rps',e:'✊',n:'Камінь-ножиці-папір',d:'До 2 перемог'},
  {id:'nim',e:'🥢',n:'Нім',d:'Не бери останню'},
  {id:'guess',e:'🔢',n:'Вгадай число',d:'Від 1 до 100'},
  {id:'react',e:'⚡',n:'Дуель реакції',d:'До 3 перемог'},
];
const MARK = {ttt:['✕','○'],dots:['🟦','🟥']};
const DEFAULT_PUNS = ['10 присідань','Заспівати уривок пісні','Розповісти жарт','Зробити комплімент переможцю','Танцювати 30 секунд','Масаж плечей 1 хвилину','Розповісти секрет','Принести переможцю напій'];

let S = null, ws = null, runSeq = null, name = localStorage.name || '';
let token = localStorage.token || (localStorage.token = Math.random().toString(36).slice(2) + Date.now().toString(36));

// ---------- мережа ----------
function connect() {
  ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  ws.onopen = () => { $('#conn').textContent = ''; const c = localStorage.room; if (c && name) send({type:'join', code:c, name, token}); };
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.type === 'room') { const prev = S; S = m; localStorage.room = m.code; if (m.phase === 'play' && prev && prev.phase !== 'play') playStart(); render(); }
    else if (m.type === 'toast') toast(m.msg);
    else if (window.onExtraMsg) onExtraMsg(m);
    else if (m.type === 'error') { toast(m.msg); if (m.fatal) { localStorage.removeItem('room'); S = null; render(); } }
  };
  ws.onclose = () => { $('#conn').textContent = '⚠ немає зв’язку…'; setTimeout(connect, 1500); };
}
function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); else toast('Немає зв’язку із сервером'); }
const mv = o => send({type:'move', ...o});
const setS = o => send({type:'settings', ...o});
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2200); }

// ---------- звук ----------
let AC = null;
function audio() {
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {}
  return AC;
}
function playStart() {
  try { if (localStorage.snd === '0') return; } catch (e) {}
  const a = audio(); if (!a) return; const t = a.currentTime;
  [[660, 0], [880, 0.13]].forEach(([f, d]) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.18, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.25);
    o.connect(g); g.connect(a.destination); o.start(t + d); o.stop(t + d + 0.28);
  });
}
function toggleSnd() { try { localStorage.snd = localStorage.snd === '0' ? '1' : '0'; } catch (e) {} render(); }
document.addEventListener('pointerdown', audio, { once: true });

// ---------- дії ----------
function getName() { name = ($('#nm').value || '').trim() || 'Гравець'; localStorage.name = name; return name; }
function create() { getName(); send({type:'create', name, token}); }
function createBot() { getName(); send({type:'create', name, token, bot:true}); }
function join() { getName(); const c = ($('#cd').value || '').trim().toUpperCase(); if (c.length < 4) return toast('Введіть код із 4 символів'); send({type:'join', code:c, name, token}); }
function openModal(inner, onAct) {
  if (document.querySelector('.modal')) return;
  const d = document.createElement('div'); d.className = 'modal';
  d.innerHTML = '<div class="mbox">' + inner + '</div>';
  d.addEventListener('click', e => {
    const a = e.target.dataset && e.target.dataset.act;
    if (e.target === d || (e.target.dataset && e.target.dataset.close)) d.remove();
    else if (a && onAct) { d.remove(); onAct(a); }
  });
  document.body.appendChild(d);
}
function askLeave() {
  openModal('Вийти з кімнати?<div class="row"><button class="primary" data-act="y">Вийти</button><button data-close="1">Залишитись</button></div>', leave);
}
function askMenu() {
  openModal('Повернутись у меню вибору гри? Поточну гру буде перервано для обох.<div class="row"><button class="primary" data-act="y">У меню</button><button data-close="1">Скасувати</button></div>', () => send({ type: 'menu' }));
}
function showRules() {
  const g = GAMES.find(x => x.id === S.game); if (!g) return;
  openModal('<b>' + g.e + ' ' + esc(g.n) + '</b><div class="rules">' + esc((window.RULES && RULES[S.game]) || 'Правила скоро з’являться.') + '</div><button class="primary" data-close="1">Зрозуміло</button>');
}
function leave() { localStorage.removeItem('room'); send({type:'leave'}); S = null; render(); }
function share() {
  const url = location.origin + '/?r=' + S.code;
  if (navigator.share) navigator.share({title:'Грати зі мною', text:'Заходь у гру, код ' + S.code, url}).catch(() => {});
  else navigator.clipboard.writeText(url).then(() => toast('Посилання скопійовано'));
}
function addPun() { const el = $('#np'); const v = (el.value || '').trim(); if (!v) return; el.value = ''; setS({puns:[...S.puns, v]}); }
function delPun(i) { setS({puns:S.puns.filter((_, k) => k !== i)}); }
function guessNum() {
  const el = $('#gn'), n = parseInt(el.value, 10);
  if (!(n >= 1 && n <= 100)) return toast('Число від 1 до 100');
  if (!S || S.phase !== 'play' || S.view.turn !== S.you) return toast('Зараз не ваш хід');
  el.value = ''; mv({n});
}

// ---------- колесо ----------
function drawWheel(cv, items, rot) {
  const n = items.length, s = 2 * Math.PI / n, R = cv.width / 2, x = cv.getContext('2d');
  x.clearRect(0, 0, cv.width, cv.height); x.save(); x.translate(R, R); x.rotate(rot);
  items.forEach((t, i) => {
    x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R - 4, i * s - Math.PI / 2, (i + 1) * s - Math.PI / 2); x.closePath();
    x.fillStyle = `hsl(${i * 360 / n},65%,48%)`; x.fill(); x.strokeStyle = '#fff6'; x.lineWidth = 2; x.stroke();
    x.save(); x.rotate((i + .5) * s - Math.PI / 2); x.textAlign = 'right'; x.fillStyle = '#fff'; x.font = 'bold 17px system-ui,sans-serif';
    x.fillText(t.length > 17 ? t.slice(0, 16) + '…' : t, R - 16, 6); x.restore();
  });
  x.restore();
}
function spin() {
  const w = S.wheel; if (runSeq === w.seq) return; runSeq = w.seq;
  const cv = $('#wheel'), puns = S.puns.slice(), pun = S.punishment, s = 2 * Math.PI / puns.length;
  const fin = 2 * Math.PI * w.turns - (w.target + .5) * s, t0 = performance.now(), D = 5200;
  (function f(t) {
    if (!cv.isConnected) return;                       // пішли з екрана колеса — зупиняємо анімацію
    const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 4);
    drawWheel(cv, puns, fin * e);
    if (k < 1) requestAnimationFrame(f);
    else { const el = $('#wres'); if (el) el.innerHTML = '😈 ' + esc(pun); }
  })(t0);
}

// ---------- рендери ігор ----------
const opp = () => S.names[1 - S.you] || 'Суперник';
const turnSt = t => S.phase === 'over' ? '' : t === S.you ? '🟢 Ваш хід' : '⏳ Хід: ' + esc(opp());
const R = {};
R.ttt = v => ({st: turnSt(v.turn), html: `<div class="grid g3">${v.b.map((x, i) => `<button class="cell x${x} ${v.line && v.line.includes(i) ? 'win' : ''}" data-m='{"i":${i}}'>${x === null ? '' : x === 0 ? '✕' : '○'}</button>`).join('')}</div>`});
R.rps = v => {
  const E = ['✊', '✋', '✌️']; let info = '';
  if (v.last) info = `Минулий раунд: ви ${E[v.last.c[S.you]]} проти ${E[v.last.c[1 - S.you]]} — ${v.last.w === 'draw' ? 'нічия' : v.last.w === S.you ? '✅ ви виграли' : '❌ суперник виграв'}`;
  return {st: `Раунд ${v.round} · ${v.score[S.you]}:${v.score[1 - S.you]} ${v.mine !== null ? '· чекаємо суперника…' : v.oppDone ? '· суперник уже обрав!' : ''}`,
    html: `<div class="rps">${E.map((e, i) => `<button class="${v.mine === i ? 'sel' : ''}" ${v.mine !== null ? 'disabled' : ''} data-m='{"c":${i}}'>${e}</button>`).join('')}</div><div class="muted" style="text-align:center">${info}</div>`};
};
R.mem = v => ({st: turnSt(v.turn) + ` · ${v.score[S.you]}:${v.score[1 - S.you]}`,
  html: `<div class="grid g4">${v.cards.map((c, i) => `<button class="cell mem ${v.matched[i] !== -1 ? 'mo' + v.matched[i] : ''}" data-m='{"i":${i}}'>${c === null ? '❔' : c}</button>`).join('')}</div>`});
R.bs = v => {
  const own = v.own.map((x, i) => `<div class="bc ${x ? 'ship' : ''} ${v.inc[i] === 2 ? 'hit' : v.inc[i] === 1 ? 'miss' : ''}"></div>`).join('');
  if (v.ph === 'place') return {st: v.ready[S.you] ? '⏳ Чекаємо суперника…' : 'Розставте кораблі',
    html: `<div class="bs" style="max-width:340px;margin:10px auto">${own}</div>${v.ready[S.you] ? '' : `<div class="row"><button onclick="mv({a:'rand'})">🎲 Перемішати</button><button class="primary" style="margin:0" onclick="mv({a:'ready'})">✅ Готово</button></div>`}`};
  const en = v.mine.map((x, i) => `<div class="bc ${x === 0 ? 'fire' : x === 1 ? 'miss' : x === 2 ? 'hit' : 'hit sunk'}" ${x === 0 ? `data-m='{"a":"fire","i":${i}}'` : ''}></div>`).join('');
  return {st: turnSt(v.turn) + ` · кораблів: ${v.left[0]} / ${v.left[1]}`,
    html: `<div class="bsw"><div><h4>Поле суперника (стріляйте)</h4><div class="bs">${en}</div></div><div><h4>Ваше поле</h4><div class="bs">${own}</div></div></div>`};
};
R.guess = v => {
  let lo = 1, hi = 100; v.log.forEach(l => { if (l.r === '<') lo = Math.max(lo, l.n + 1); if (l.r === '>') hi = Math.min(hi, l.n - 1); });
  const lines = v.log.slice(-8).reverse().map(l => `<div>${esc(S.names[l.p])}: <b>${l.n}</b> — ${l.r === '<' ? '⬆ більше' : l.r === '>' ? '⬇ менше' : '✅ вгадав!'}</div>`).join('');
  return {st: turnSt(v.turn) + ` · число між ${lo} і ${hi}`,
    html: `<div class="rowin"><input id="gn" type="number" min="1" max="100" inputmode="numeric" placeholder="1–100" onkeydown="if(event.key==='Enter')guessNum()"><button class="primary" onclick="guessNum()" ${v.turn === S.you && S.phase === 'play' ? '' : 'disabled'}>Спробувати</button></div><div class="log">${lines || '<span class="muted">Ще немає спроб</span>'}</div>`};
};
R.react = v => {
  let cls, txt;
  if (v.phase === 'wait') { cls = 'w'; txt = 'Чекай… не тисни!'; }
  else if (v.phase === 'go') { cls = 'g'; txt = 'ТИСНИ!'; }
  else { cls = 'r'; const r = v.res; txt = r.w === S.you ? (r.ms != null ? `✅ Ви перші (${r.ms} мс)` : '✅ Суперник поспішив') : (r.ms != null ? `❌ Суперник швидший (${r.ms} мс)` : '❌ Ви поспішили'); }
  return {st: `Раунд ${v.round} · ${v.score[S.you]}:${v.score[1 - S.you]} (до 3)`, html: `<div class="react ${cls}" data-fast data-m='{"c":1}'>${txt}</div>`};
};
R.nim = v => ({st: turnSt(v.turn), html: `<div class="muted" style="text-align:center">Торкніться палички — заберете її і всі праворуч. Хто візьме останню — програє.</div>` +
  v.piles.map((n, j) => `<div class="pile">${n ? [...Array(n)].map((_, k) => `<span class="stick" data-m='{"p":${j},"n":${n - k}}'></span>`).join('') : '<em class="muted">—</em>'}</div>`).join('')});
R.dots = v => {
  const n = v.n, cs = 64, m = 24, W = n * cs + 2 * m, H = (n + 1) * n; let s = `<svg viewBox="0 0 ${W} ${W}" class="dots">`;
  v.boxes.forEach((o, k) => { if (o !== null) s += `<rect x="${m + (k % n) * cs + 4}" y="${m + (k / n | 0) * cs + 4}" width="${cs - 8}" height="${cs - 8}" rx="8" class="bx b${o}"/>`; });
  const ed = (x1, y1, x2, y2, e) => { const o = v.e[e]; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="ed ${o === null ? 'free' : 'e' + o}"/>` + (o === null ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="hit" data-m='{"e":${e}}'/>` : ''); };
  for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) s += ed(m + c * cs, m + r * cs, m + (c + 1) * cs, m + r * cs, r * n + c);
  for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) s += ed(m + c * cs, m + r * cs, m + c * cs, m + (r + 1) * cs, H + r * (n + 1) + c);
  for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) s += `<circle cx="${m + c * cs}" cy="${m + r * cs}" r="6" fill="#eef0ff"/>`;
  return {st: turnSt(v.turn) + ` · клітинки ${v.score[S.you]}:${v.score[1 - S.you]}`, html: s + '</svg>'};
};

// ---------- екрани ----------
function home() {
  const q = new URLSearchParams(location.search).get('r') || '';
  return `<h1>🎮 Ігри на двох</h1>
  <div class="card"><input id="nm" type="text" maxlength="20" placeholder="Ваше ім’я" value="${esc(name)}">
  <button class="primary" onclick="create()">➕ Створити кімнату</button></div>
  <div class="card"><button class="primary" style="margin:0" onclick="createBot()">🤖 Грати з ботом</button><div class="muted" style="margin-top:6px">Немає з ким грати? Бот вміє 12 ігор; друга людину можна запросити пізніше.</div></div>
  <div class="card"><div class="muted" style="margin-bottom:8px">Або введіть код від друга</div>
  <div class="row"><input id="cd" type="text" maxlength="4" placeholder="КОД" value="${esc(q.toUpperCase())}" style="text-transform:uppercase;letter-spacing:4px;text-align:center"><button onclick="join()">Увійти</button></div></div>`;
}
const gname = id => { const g = GAMES.find(x => x.id === id); return g ? g.e + ' ' + g.n : id; };
window.marToggle = id => { const p = [...(S.marPick || [])], i = p.indexOf(id); if (i >= 0) p.splice(i, 1); else if (p.length < 6) p.push(id); setS({marathon: p}); };
function marathonHtml() {
  const pick = S.marPick || [], avail = GAMES.filter(g => !S.bot || (S.botGames || []).includes(g.id));
  return `<h3>🏁 Марафон</h3><div class="card"><div class="muted">Оберіть 2–6 ігор по порядку: їх зіграєте поспіль із загальним рахунком. Колесо покарань (якщо ввімкнене) крутиться наприкінці для загального програвшого. Налаштування гри (складність, мова…) діють на весь марафон.</div>
  <div class="chips">${avail.map(g => { const i = pick.indexOf(g.id); return `<button class="chip ${i >= 0 ? 'on' : ''}" onclick="marToggle('${g.id}')">${i >= 0 ? (i + 1) + '. ' : ''}${g.e} ${esc(g.n)}</button>`; }).join('')}</div>
  ${pick.length ? `<div class="muted">${pick.length < 2 ? 'Оберіть ще хоча б одну гру' : 'Порядок: ' + pick.map(gname).join(' → ')}</div><button class="ghost" onclick="setS({marathon:[]})">Очистити вибір</button>` : ''}</div>`;
}
function marBar() {
  const m = S.mar; if (!m) return '';
  const me = S.you, ot = 1 - me;
  return `<div class="serie">🏁 Марафон ${m.idx + 1}/${m.games.length} · <b class="p${me}">${esc(S.names[me])} ${m.w[me]}</b> : <b class="p${ot}">${m.w[ot]} ${esc(S.names[ot] || '')}</b>${m.d ? ` · нічиїх ${m.d}` : ''}</div>`;
}
function marOver() {
  const m = S.mar, me = S.you, ot = 1 - me, a = m.w[me], b = m.w[ot];
  const cls = a > b ? 'win' : a < b ? 'lose' : 'draw', title = a > b ? '🏆 Ви виграли марафон!' : a < b ? '😔 Марафон за суперником' : '🤝 Марафон — нічия!';
  const loser = a < b ? me : b < a ? ot : null;
  const rows = m.res.map((r, i) => `<div class="hrow">${i + 1}. ${gname(r.g)} — ${r.w === 'draw' ? 'нічия' : '🏆 ' + esc(S.names[r.w] || '?')}</div>`).join('');
  return `<div class="bar"><b>🏁 Підсумок марафону</b><span class="hbtns"><button class="ghost xbtn" onclick="askLeave()" aria-label="Вийти">✕</button></span></div>
  <div class="banner ${cls}"><h2>${title}</h2><div class="big" style="margin:4px 0">${esc(S.names[me])} ${a} : ${b} ${esc(S.names[ot] || '')}${m.d ? ` · нічиїх ${m.d}` : ''}</div>
  ${S.withPun && S.punishment && loser !== null ? `<div>😈 <b>${esc(S.names[loser])}</b> виконує: <b>${esc(S.punishment)}</b></div>` : ''}
  <div class="endbtns"><button class="primary" onclick="send({type:'again'})">🏠 В лобі</button></div></div>${rows}`;
}
function seriesHtml(full) {
  const sr = S.series; if (!sr) return '';
  const me = S.you, ot = 1 - me, n = sr.w[0] + sr.w[1] + sr.d;
  if (!n) return full ? '<div class="muted" style="text-align:center;margin-top:8px">Рахунок вечора: 0 : 0 — ще не грали</div>' : '';
  const line = `<div class="serie">🏅 Рахунок вечора: <b class="p${me}">${esc(S.names[me])} ${sr.w[me]}</b> : <b class="p${ot}">${sr.w[ot]} ${esc(S.names[ot] || '')}</b>${sr.d ? ` · нічиїх ${sr.d}` : ''}</div>`;
  if (!full) return line;
  const gn = id => { const g = GAMES.find(x => x.id === id); return g ? g.e + ' ' + g.n : id; };
  const rows = sr.hist.slice(-8).reverse().map(h => `<div class="hrow">${gn(h.g)} — ${h.w === 'draw' ? 'нічия' : '🏆 ' + esc(S.names[h.w] || '?')}${h.p ? `<br><small>😈 ${esc(S.names[1 - h.w] || '?')}: ${esc(h.p)}</small>` : ''}</div>`).join('');
  return line + `<details class="hist"><summary>Історія ігор і покарань (${sr.hist.length})</summary>${rows}</details>`;
}
function playersHtml() {
  return S.names.map((n, i) => `<div><span class="dot ${S.online[i] ? 'on' : ''}"></span><b class="p${i}">${n ? esc(n) : '— очікуємо гравця —'}</b>${i === S.you ? ' (ви)' : ''}</div>`).join('');
}
function lobby() {
  const ready = S.online[0] && S.online[1], mara = (S.marPick || []).length >= 2, noBot = S.bot && !mara && !(S.botGames || []).includes(S.game);
  return `<div class="bar"><b>Кімната</b><span><button class="ghost" onclick="toggleSnd()" aria-label="Звук">${localStorage.snd === '0' ? '🔇' : '🔊'}</button><button class="ghost" onclick="leave()">Вийти ✕</button></span></div>
  <div class="card"><div class="muted" style="text-align:center">Код кімнати</div><div class="code">${S.code}</div>
  <button class="primary" style="margin:0 0 10px" onclick="share()">🔗 Запросити друга</button>${playersHtml()}${S.bot ? '<button class="ghost" onclick="send({type:\'unbot\'})">👥 Замінити бота живою людиною</button>' : ''}${seriesHtml(true)}</div>
  <h3>Гра</h3><div class="games">${GAMES.map(g => `<button class="gbtn ${g.id === S.game ? 'on' : ''}" onclick="setS({game:'${g.id}'})"><b>${g.e} ${g.n}</b><span>${g.d}</span></button>`).join('')}</div>
  ${window.extraSettings ? extraSettings() : ''}
  ${marathonHtml()}
  <h3>Покарання</h3><div class="card">
  <label class="chk"><input type="checkbox" ${S.withPun ? 'checked' : ''} onchange="setS({withPun:this.checked})"> З покаранням для того, хто програє</label>
  ${S.withPun ? `<div class="muted">Перед грою колесо вибере покарання — його побачать обоє.</div>
   ${S.puns.length >= 2 ? '<div class="wheelbox"><canvas id="wheel" width="640" height="640"></canvas></div>' : ''}
   ${S.puns.map((p, i) => `<div class="pun"><span>${esc(p)}</span><button onclick="delPun(${i})">✕</button></div>`).join('')}
   <div class="row" style="margin-top:8px"><input id="np" type="text" maxlength="60" placeholder="Нове покарання…" onkeydown="if(event.key==='Enter')addPun()"><button onclick="addPun()">＋</button></div>
   <button class="ghost" onclick="setS({puns:DEFAULT_PUNS})">Скинути до стандартних</button>` : ''}</div>
  <button class="primary" ${ready && !noBot ? '' : 'disabled'} onclick="send({type:'start'})">${!ready ? 'Чекаємо другого гравця…' : noBot ? '🤖 Бот ще не вміє цю гру' : mara ? `🏁 Почати марафон (${S.marPick.length} ігор)` : '▶ Почати гру'}</button>`;
}
function wheelScreen() {
  return `<div class="bar"><span></span><span class="hbtns"><button class="ghost xbtn" onclick="askMenu()" aria-label="В меню">🏠</button><button class="ghost xbtn" onclick="askLeave()" aria-label="Вийти">✕</button></span></div><h1>🎡 Колесо покарань</h1><div class="muted" style="text-align:center">Покарання для того, хто програє:</div>
  <div class="wheelbox"><canvas id="wheel" width="640" height="640"></canvas></div><div class="big" id="wres"></div>`;
}
function game() {
  const g = GAMES.find(x => x.id === S.game), r = R[S.game](S.view), mk = MARK[S.game];
  const tag = i => `<span class="p${i}">${mk ? mk[i] + ' ' : ''}${esc(S.names[i] || '?')}</span>`;
  let ban = '';
  if (S.phase === 'over') {
    const w = S.winner, me = w === S.you;
    const cls = w === 'draw' ? 'draw' : me ? 'win' : 'lose';
    const title = w === 'draw' ? '🤝 Нічия!' : me ? '🏆 Ви перемогли!' : '😔 Ви програли';
    const pun = S.withPun && S.punishment && w !== 'draw' ? `<div>😈 <b>${esc(S.names[1 - w])}</b> виконує: <b>${esc(S.punishment)}</b></div>` : '';
    const btns = S.mar
      ? `<button class="primary" onclick="send({type:'next'})">${S.mar.idx + 1 >= S.mar.games.length ? '🏁 Підсумок марафону' : '➜ Далі: ' + gname(S.mar.games[S.mar.idx + 1])}</button>`
      : `<button class="primary" onclick="send({type:'restart'})">🔁 Почати заново</button><button onclick="send({type:'again'})">🏠 В меню</button>`;
    ban = `<div class="banner ${cls}"><h2>${title}</h2>${pun}<div class="endbtns">${btns}</div></div>`;
  }
  return `<div class="bar"><b>${g.e} ${g.n}</b><span class="hbtns"><button class="ghost xbtn" onclick="showRules()" aria-label="Правила">❓</button><button class="ghost xbtn" onclick="askMenu()" aria-label="В меню">🏠</button><button class="ghost xbtn" onclick="askLeave()" aria-label="Вийти">✕</button></span></div>
  <div class="bar"><div class="pl">${tag(S.you)}</div><div class="pl">${tag(1 - S.you)}</div></div>
  ${S.mar ? marBar() : seriesHtml(false)}
  ${S.withPun && S.punishment ? `<div class="badge">😈 Програвший: ${esc(S.punishment)}</div>` : ''}
  <div class="status">${r.st}</div><div id="board">${r.html}</div>${ban}`;
}

function render() {
  const keep = {}; document.querySelectorAll('input[id]').forEach(i => keep[i.id] = [i.value, i.dataset.ctx]);
  const act = document.activeElement && document.activeElement.id;
  if (S && S.phase === 'wheel' && runSeq === S.wheel.seq) return;
  let h;
  if (!S) h = home();
  else if (S.phase === 'lobby') h = lobby();
  else if (S.phase === 'wheel') h = wheelScreen();
  else if (S.phase === 'mover') h = marOver();
  else h = game();
  $('#app').innerHTML = h;
  for (const id in keep) { const el = document.getElementById(id); if (el && (id === 'np' || id === 'gn' || id === 'dv' || id === 'cu') && (!el.dataset.ctx || el.dataset.ctx === keep[id][1])) { el.value = keep[id][0]; if (act === id) el.focus(); } }
  if (S && S.phase === 'lobby' && S.withPun && S.puns.length >= 2) drawWheel($('#wheel'), S.puns, 0);
  if (S && S.phase === 'wheel') spin();
  if (S && S.phase === 'lobby') runSeq = null;
}

// кліки по ігрових елементах
document.addEventListener('click', e => {
  const el = e.target.closest('[data-m]:not([data-fast])');
  if (el) mv(JSON.parse(el.getAttribute('data-m')));
});
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-fast]');
  if (el) mv(JSON.parse(el.getAttribute('data-m')));
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
render(); connect(); applyTheme();
