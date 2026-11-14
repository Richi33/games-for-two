const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const games = require('./games');
const content = require('./content');
const content2 = require('./content2');
const bots = require('./bots');
const profiles = require('./profiles');
const achievements = require('./achievements');

const PORT = process.env.PORT || 3000;
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/sw.js': ['sw.js', 'text/javascript'],
  '/app.js': ['app.js', 'text/javascript'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/extra.js': ['extra.js', 'text/javascript'],
  '/extra2.js': ['extra2.js', 'text/javascript'],
  '/rules.js': ['rules.js', 'text/javascript'],
  '/extra3.js': ['extra3.js', 'text/javascript'],
  '/extra4.js': ['extra4.js', 'text/javascript'],
  '/extra5.js': ['extra5.js', 'text/javascript'],
  '/extra6.js': ['extra6.js', 'text/javascript'],
  '/extra7.js': ['extra7.js', 'text/javascript'],
  '/extra8.js': ['extra8.js', 'text/javascript'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
  '/icon-192.png': ['icon-192.png', 'image/png'],
  '/icon-512.png': ['icon-512.png', 'image/png'],
  '/icon-180.png': ['icon-180.png', 'image/png'],
  '/icon-maskable-512.png': ['icon-maskable-512.png', 'image/png'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
  '/offline.html': ['offline.html', 'text/html; charset=utf-8'],
};
const server = http.createServer((req, res) => {
  if (req.url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  const hit = STATIC[req.url.split('?')[0]];
  if (!hit) { res.writeHead(404); return res.end('404'); }
  fs.readFile(path.join(__dirname, hit[0]), (e, d) => {
    if (e) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': hit[1], 'Cache-Control': 'no-cache' });
    res.end(d);
  });
});

const DEFAULT_PUNS = ['10 присідань', 'Заспівати уривок пісні', 'Розповісти жарт', 'Зробити комплімент переможцю', 'Танцювати 30 секунд', 'Масаж плечей 1 хвилину', 'Розповісти секрет', 'Принести переможцю напій'];
const rooms = new Map();
const REACTS = ['😂', '👏', '😡', '😮', '❤️', '🔥', '👍', '😭'];
const rnd = n => (Math.random() * n) | 0;

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c;
  do { c = ''; for (let i = 0; i < 4; i++) c += A[rnd(A.length)]; } while (rooms.has(c));
  return c;
}
const clearTimers = r => { r.timers.forEach(clearTimeout); r.timers.clear(); };
const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };

const isOn = p => !!(p && (p.ws || p.bot));
function snapshot(r, i) {
  const playing = r.state && (r.phase === 'play' || r.phase === 'over');
  return {
    type: 'room', code: r.code, you: i,
    names: r.players.map(p => p && p.name), online: r.players.map(isOn), bot: !!r.bot, botGames: r.bot ? bots.SUPPORTED : undefined, mar: r.mar, marPick: r.marPick,
    game: r.game, diff: r.diff, deck: r.deck, perevod: r.perevod, lang: r.lang, len: r.len, daily: r.daily, mode: r.mode, topic: r.topic, pack: r.pack, packs: r.phase === 'lobby' ? content2.PACK_LIST : undefined, custom: r.custom, topics: r.phase === 'lobby' ? content.topicsFor(r.mode) : undefined, withPun: r.withPun, puns: r.puns, phase: r.phase, wheel: r.wheel, punishment: r.punishment,
    winner: r.state ? r.state.winner : null, series: r.series,
    view: playing ? games[r.game].view(r.state, i) : null,
  };
}
function broadcast(r) { r.players.forEach((p, i) => p && send(p.ws, snapshot(r, i))); if (r.bot) botAct(r); }
function botAct(r) {                                      // бот (гравець №1) думає й ходить із затримкою
  if (r.botT || r.phase !== 'play' || !r.state) return;
  const th = bots.think(r.game, r.state, r.botCtx || (r.botCtx = {}), r.diff), st = r.state;
  if (!th) return;
  r.botT = setTimeout(() => {
    r.botT = null;
    if (r.phase !== 'play' || r.state !== st) return;
    if (th.msg) { games[r.game].move(r.state, bots.BOT, th.msg, sched(r)); check(r); broadcast(r); } else botAct(r);
  }, th.msg ? th.delay : th.retry);
}

function sched(r) {
  return (ms, fn) => {
    const t = setTimeout(() => {
      r.timers.delete(t);
      if (r.phase !== 'play') return;
      fn(); check(r); broadcast(r);
    }, ms);
    r.timers.add(t);
  };
}
const emptyCustom = () => ({ know: [], wyr: [], tod: [], black: [], white: [], only: false });
const txt = (x, n) => String(x == null ? '' : x).trim().replace(/\s+/g, ' ').slice(0, n);
function cleanCustom(c) {                               // власні питання й завдання з лобі
  if (!c || typeof c !== 'object') return null;
  const arr = (a, f) => (Array.isArray(a) ? a.map(f).filter(Boolean).slice(0, 30) : []);
  return {
    know: arr(c.know, x => { const o = x && Array.isArray(x.o) ? x.o.map(t => txt(t, 40)).filter(Boolean).slice(0, 4) : []; const q = txt(x && x.q, 100); return q && o.length >= 2 ? { q, o } : null; }),
    wyr: arr(c.wyr, x => { const o = x && Array.isArray(x.o) ? x.o.map(t => txt(t, 50)).filter(Boolean) : []; return o.length === 3 ? { o } : null; }),
    tod: arr(c.tod, x => { const t = txt(x && x.t, 100); return t && (x.k === 't' || x.k === 'd') ? { k: x.k, t } : null; }),
    black: arr(c.black, x => { const t = txt(x, 120); return t.includes('___') ? t : null; }),
    white: arr(c.white, x => txt(x, 60) || null),
    only: c.only === true,
  };
}
function pushProfile(ws, type, extra) { if (ws && ws.pid) profiles.load(ws.pid, false).then(p => p && send(ws, { type, ...extra, profile: profiles.view(p) })); }
function sendReward(r, i, res) { const p = r.players[i]; if (p && p.ws && res && !res.short) send(p.ws, { type: 'reward', ...res }); else if (p && p.ws && res) send(p.ws, { type: 'profile', profile: res.profile }); }
function rewardRound(r) {                                      // нагороди за завершену партію (зірки, XP, досягнення)
  const w = r.state.winner, dur = Date.now() - (r.startedAt || Date.now());
  const pids = r.players.map(p => (p && !p.bot && p.pid) || null);
  if (pids[0] && pids[0] === pids[1]) return;                  // той самий пристрій з двох вкладок — без нагород
  pids.forEach((pid, i) => {
    if (!pid) return;
    const result = w === 'draw' ? 'd' : w === i ? 'w' : 'l';
    let extra = {}; try { extra = achievements.gameFacts(r.game, r.state, i, r); } catch (e) {}
    const facts = { ...extra, game: r.game, result, bot: !!r.bot, diff: r.diff, dur, punished: result === 'l' && !!(r.withPun && r.punishment) };
    profiles.award(pid, facts).then(res => sendReward(r, i, res)).catch(e => console.error(e));
  });
}
const newSeries = () => ({ w: [0, 0], d: 0, hist: [] });
function check(r) {
  if (!r.state || r.state.winner == null || r.phase === 'over') return;
  r.phase = 'over';
  const w = r.state.winner, S = r.series;                      // рахунок серії та історія покарань
  if (w === 'draw') S.d++; else S.w[w]++;
  S.hist.push({ g: r.game, w, p: r.withPun && r.punishment && w !== 'draw' ? r.punishment : null });
  if (S.hist.length > 30) S.hist.shift();
  try { rewardRound(r); } catch (e) { console.error(e); }
  if (r.mar) { if (w === 'draw') r.mar.d++; else r.mar.w[w]++; r.mar.res.push({ g: r.game, w }); }      // підсумок марафону
}

function begin(r) {
  const g = games[r.game];
  r.botCtx = {}; r.state = g.init({ diff: r.diff, deck: r.deck, perevod: r.perevod, lang: r.lang, len: r.len, daily: r.daily, mode: r.mode, topic: r.topic, pack: r.pack, custom: r.custom }); r.phase = 'play'; r.startedAt = Date.now();
  if (g.start) g.start(r.state, sched(r));
  broadcast(r);
}
function finishMarathon(r) {
  r.mar.done = true; clearTimers(r);
  const [a, b] = r.mar.w;
  r.players.forEach((p, i) => { if (p && !p.bot && p.pid) profiles.awardMarathon(p.pid, a !== b && (a > b ? 0 : 1) === i).then(res => sendReward(r, i, res)).catch(e => console.error(e)); });
  if (r.withPun && a !== b && r.puns.length >= 2) {            // колесо крутиться в кінці — для загального програвшого
    const target = rnd(r.puns.length);
    r.wheel = { target, turns: 5 + rnd(4), seq: Date.now() };
    r.punishment = r.puns[target]; r.phase = 'wheel'; r.state = null;
    const t = setTimeout(() => { r.timers.delete(t); if (r.phase === 'wheel') { r.phase = 'mover'; broadcast(r); } }, 6800);
    r.timers.add(t);
  } else { r.phase = 'mover'; r.state = null; }
  broadcast(r);
}
function startGame(r, ws) {
  if (!isOn(r.players[0]) || !isOn(r.players[1])) return send(ws, { type: 'error', msg: 'Потрібні двоє гравців онлайн' });
  if (r.withPun && r.puns.length < 2) return send(ws, { type: 'error', msg: 'Додайте щонайменше 2 покарання' });
  const mara = r.phase === 'lobby' && r.marPick.length >= 2;
  const list = mara ? r.marPick : [r.game];
  if (r.bot && list.some(g => !bots.SUPPORTED.includes(g))) return send(ws, { type: 'error', msg: '🤖 Бот ще не вміє цю гру' });
  clearTimers(r);
  if (mara) {                                                  // марафон: колеса перед іграми немає
    r.mar = { games: [...r.marPick], idx: 0, w: [0, 0], d: 0, res: [], done: false };
    r.game = r.mar.games[0]; r.wheel = null; r.punishment = null;
    return begin(r);
  }
  if (r.withPun) {
    const target = rnd(r.puns.length);
    r.wheel = { target, turns: 5 + rnd(4), seq: Date.now() };
    r.punishment = r.puns[target]; r.phase = 'wheel'; r.state = null;
    const t = setTimeout(() => { r.timers.delete(t); if (r.phase === 'wheel') begin(r); }, 6800);
    r.timers.add(t);
    return broadcast(r);
  }
  r.wheel = null; r.punishment = null;
  return begin(r);
}
function toLobby(r) { clearTimers(r); clearTimeout(r.botT); r.botT = null; r.mar = null; r.phase = 'lobby'; r.state = null; r.wheel = null; r.punishment = null; }

function cleanPuns(a) {
  if (!Array.isArray(a)) return null;
  return a.map(x => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 24);
}

function handle(ws, m) {
  if (m.type === 'hello') {                                      // пристрій представляється секретним кодом профілю
    const pid = String(m.pid || '');
    if (!profiles.PID_RE.test(pid)) return;
    ws.pid = pid;
    if (ws.room && ws.room.players[ws.idx]) ws.room.players[ws.idx].pid = pid;
    profiles.load(pid, true, String(m.name || '').slice(0, 20)).then(p => {
      if (!p) return send(ws, { type: 'error', msg: 'Профіль недоступний' });
      profiles.setName(pid, String(m.name || ''));
      send(ws, { type: 'profile', profile: profiles.view(p), defs: achievements.publicDefs() });
      return profiles.daily(pid).then(res => res && send(ws, { type: 'reward', ...res }));
    }).catch(e => console.error(e));
    return;
  }
  if (m.type === 'restore') {                                    // перенесення профілю на інший пристрій кодом
    const code = String(m.code || '').trim().toLowerCase();
    if (!profiles.PID_RE.test(code)) return send(ws, { type: 'restored', ok: false });
    ws.restoreTries = (ws.restoreTries || 0) + 1; if (ws.restoreTries > 8) return send(ws, { type: 'restored', ok: false });
    profiles.load(code, false).then(p => {
      if (!p) return send(ws, { type: 'restored', ok: false });
      ws.pid = code; if (ws.room && ws.room.players[ws.idx]) ws.room.players[ws.idx].pid = code;
      send(ws, { type: 'restored', ok: true, pid: code }); send(ws, { type: 'profile', profile: profiles.view(p), defs: achievements.publicDefs() });
    }).catch(e => console.error(e));
    return;
  }
  if (m.type === 'create') {
    const code = newCode();
    const r = { code, players: [null, null], game: 'ttt', diff: 'normal', deck: '36', perevod: true, lang: 'uk', len: 5, daily: false, pack: 'mix', custom: emptyCustom(), mode: 'normal', topic: 'mix', withPun: false, puns: [...DEFAULT_PUNS], phase: 'lobby', state: null, wheel: null, punishment: null, timers: new Set(), series: newSeries(), chat: [], bot: false, marPick: [], mar: null };
    rooms.set(code, r);
    ws.room = r; ws.idx = 0; ws.token = String(m.token || '');
    r.players[0] = { ws, name: String(m.name || 'Гравець').slice(0, 20), token: ws.token, pid: ws.pid };
    if (m.bot === true) { r.bot = true; r.players[1] = { ws: null, bot: true, name: '🤖 Бот', token: 'bot-' + code }; }
    return broadcast(r);
  }
  if (m.type === 'join') {
    const r = rooms.get(String(m.code || '').toUpperCase());
    if (!r) return send(ws, { type: 'error', msg: 'Кімнату не знайдено', fatal: true });
    const token = String(m.token || '');
    let i = r.players.findIndex(p => p && p.token === token);
    if (i === -1) i = r.players.findIndex(p => !p);
    if (i === -1) return send(ws, { type: 'error', msg: 'Кімната вже заповнена', fatal: true });
    const old = r.players[i];
    if (!old) { r.series = newSeries(); r.chat = []; }
    if (old && old.ws && old.ws !== ws) { old.ws.room = null; old.ws.close(); }
    ws.room = r; ws.idx = i; ws.token = token;
    r.players[i] = { ws, name: String(m.name || 'Гравець').slice(0, 20), token, pid: ws.pid };
    r.dead && clearTimeout(r.dead);
    broadcast(r); send(ws, { type: 'chathist', list: r.chat });
    return;
  }
  const r = ws.room, i = ws.idx;
  if (!r) return;
  switch (m.type) {
    case 'settings':
      if (r.phase !== 'lobby') return;
      if (typeof m.game === 'string' && Object.prototype.hasOwnProperty.call(games, m.game)) r.game = m.game;
      if (['easy', 'normal', 'hard'].includes(m.diff)) r.diff = m.diff;
      if (m.lang === 'uk' || m.lang === 'ru') r.lang = m.lang;
      if (Number.isInteger(m.len) && m.len >= 5 && m.len <= 8) r.len = m.len;
      if (Array.isArray(m.marathon)) {
        const ok = g => typeof g === 'string' && Object.prototype.hasOwnProperty.call(games, g) && (!r.bot || bots.SUPPORTED.includes(g));
        r.marPick = [...new Set(m.marathon.filter(ok))].slice(0, 6);
      }
      if (typeof m.daily === 'boolean') r.daily = m.daily;
      if (m.pack === 'mix' || (typeof m.pack === 'string' && Object.prototype.hasOwnProperty.call(content2.PACKS, m.pack))) r.pack = m.pack;
      if (m.custom) { const c = cleanCustom(m.custom); if (c) r.custom = c; }
      if (m.deck === '24' || m.deck === '36' || m.deck === '52') r.deck = m.deck;
      if (typeof m.perevod === 'boolean') r.perevod = m.perevod;
      if (m.mode === 'normal' || m.mode === 'adult') { if (r.mode !== m.mode) r.topic = 'mix'; r.mode = m.mode; }
      if (typeof m.topic === 'string' && (m.topic === 'mix' || content.topicsFor(r.mode).some(x => x.id === m.topic))) r.topic = m.topic;
      if (typeof m.withPun === 'boolean') r.withPun = m.withPun;
      if (m.puns) { const p = cleanPuns(m.puns); if (p) r.puns = p; }
      return broadcast(r);
    case 'start':
      if (r.phase !== 'lobby') return;
      return startGame(r, ws);
    case 'restart':                      // «Почати заново» після гри: та сама гра й налаштування
      if (r.phase !== 'over' || r.mar) return;
      return startGame(r, ws);
    case 'move': {
      if (r.phase !== 'play') return;
      const res = games[r.game].move(r.state, i, m, sched(r));
      if (res.error) return send(ws, { type: 'error', msg: res.error });
      check(r); return broadcast(r);
    }
    case 'menu':                         // «В меню» у будь-який момент гри
      if (r.phase === 'lobby') return;
      toLobby(r);
      r.players.forEach((p, k) => { if (p && k !== i) send(p.ws, { type: 'toast', msg: (r.players[i] ? r.players[i].name : 'Суперник') + ' повернувся в меню' }); });
      return broadcast(r);
    case 'again':
      if (r.phase === 'over' || r.phase === 'mover') { toLobby(r); broadcast(r); }
      return;
    case 'next':                         // марафон: наступна гра або підсумок
      if (!r.mar || r.phase !== 'over') return;
      if (r.mar.idx + 1 < r.mar.games.length) { r.mar.idx++; r.game = r.mar.games[r.mar.idx]; clearTimers(r); return begin(r); }
      return finishMarathon(r);
    case 'unbot':                        // замінити бота живою людиною
      if (!r.bot || r.phase !== 'lobby') return;
      r.bot = false; r.players[1] = null; r.series = newSeries(); r.chat = []; return broadcast(r);
    case 'react': {
      if (!REACTS.includes(m.e)) return;
      r.players.forEach(p => p && send(p.ws, { type: 'react', from: i, e: m.e }));
      if (ws.pid) profiles.bump(ws.pid, 'react').then(res => res && send(ws, { type: 'reward', ...res })); return;
    }
    case 'chat': {
      const t = String(m.t || '').trim().replace(/\s+/g, ' ').slice(0, 120), now = Date.now();
      if (!t || now - (ws.lastChat || 0) < 300) return;
      ws.lastChat = now;
      const msg = { from: i, name: r.players[i] ? r.players[i].name : '', t, ts: now };
      r.chat.push(msg); if (r.chat.length > 30) r.chat.shift();
      r.players.forEach(p => p && send(p.ws, { type: 'chat', ...msg }));
      if (ws.pid) profiles.bump(ws.pid, 'chat').then(res => res && send(ws, { type: 'reward', ...res })); return;
    }
    case 'leave':
      if (r.bot) { clearTimers(r); clearTimeout(r.botT); rooms.delete(r.code); ws.room = null; return; }
      r.players[i] = null; ws.room = null; r.series = newSeries(); r.chat = [];
      if (!r.players[0] && !r.players[1]) { clearTimers(r); rooms.delete(r.code); }
      else { toLobby(r); broadcast(r); }
      return;
  }
}

const wss = new WebSocketServer({ server, maxPayload: 10000 });
wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);
  ws.on('message', d => { try { handle(ws, JSON.parse(d)); } catch (e) { console.error(e); } });
  ws.on('close', () => {
    const r = ws.room;
    if (!r) return;
    const p = r.players[ws.idx];
    if (p && p.ws === ws) { p.ws = null; broadcast(r); }
    if (r.players.every(x => !x || !x.ws)) {
      r.dead = setTimeout(() => { if (r.players.every(x => !x || !x.ws)) { clearTimers(r); clearTimeout(r.botT); rooms.delete(r.code); } }, 15 * 60 * 1000);
    }
  });
});
setInterval(() => wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 25000);

server.listen(PORT, () => console.log('Games for two on http://localhost:' + PORT));
