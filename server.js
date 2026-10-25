const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const games = require('./games');
const content = require('./content');

const PORT = process.env.PORT || 3000;
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/sw.js': ['sw.js', 'text/javascript'],
  '/extra.js': ['extra.js', 'text/javascript'],
  '/extra2.js': ['extra2.js', 'text/javascript'],
  '/rules.js': ['rules.js', 'text/javascript'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'],
  '/icon-192.png': ['icon-192.png', 'image/png'],
  '/icon-512.png': ['icon-512.png', 'image/png'],
};
const server = http.createServer((req, res) => {
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
const rnd = n => (Math.random() * n) | 0;

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c;
  do { c = ''; for (let i = 0; i < 4; i++) c += A[rnd(A.length)]; } while (rooms.has(c));
  return c;
}
const clearTimers = r => { r.timers.forEach(clearTimeout); r.timers.clear(); };
const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };

function snapshot(r, i) {
  const playing = r.state && (r.phase === 'play' || r.phase === 'over');
  return {
    type: 'room', code: r.code, you: i,
    names: r.players.map(p => p && p.name), online: r.players.map(p => !!(p && p.ws)),
    game: r.game, diff: r.diff, lang: r.lang, mode: r.mode, topic: r.topic, topics: r.phase === 'lobby' ? content.topicsFor(r.mode) : undefined, withPun: r.withPun, puns: r.puns, phase: r.phase, wheel: r.wheel, punishment: r.punishment,
    winner: r.state ? r.state.winner : null,
    view: playing ? games[r.game].view(r.state, i) : null,
  };
}
function broadcast(r) { r.players.forEach((p, i) => p && send(p.ws, snapshot(r, i))); }

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
function check(r) { if (r.state && r.state.winner != null) r.phase = 'over'; }

function begin(r) {
  const g = games[r.game];
  r.state = g.init({ diff: r.diff, lang: r.lang, mode: r.mode, topic: r.topic }); r.phase = 'play';
  if (g.start) g.start(r.state, sched(r));
  broadcast(r);
}
function startGame(r, ws) {
  if (!r.players[0] || !r.players[1] || !r.players[0].ws || !r.players[1].ws) return send(ws, { type: 'error', msg: 'Потрібні двоє гравців онлайн' });
  if (r.withPun && r.puns.length < 2) return send(ws, { type: 'error', msg: 'Додайте щонайменше 2 покарання' });
  clearTimers(r);
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
function toLobby(r) { clearTimers(r); r.phase = 'lobby'; r.state = null; r.wheel = null; r.punishment = null; }

function cleanPuns(a) {
  if (!Array.isArray(a)) return null;
  return a.map(x => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 24);
}

function handle(ws, m) {
  if (m.type === 'create') {
    const code = newCode();
    const r = { code, players: [null, null], game: 'ttt', diff: 'normal', lang: 'uk', mode: 'normal', topic: 'mix', withPun: false, puns: [...DEFAULT_PUNS], phase: 'lobby', state: null, wheel: null, punishment: null, timers: new Set() };
    rooms.set(code, r);
    ws.room = r; ws.idx = 0; ws.token = String(m.token || '');
    r.players[0] = { ws, name: String(m.name || 'Гравець').slice(0, 20), token: ws.token };
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
    if (old && old.ws && old.ws !== ws) { old.ws.room = null; old.ws.close(); }
    ws.room = r; ws.idx = i; ws.token = token;
    r.players[i] = { ws, name: String(m.name || 'Гравець').slice(0, 20), token };
    r.dead && clearTimeout(r.dead);
    return broadcast(r);
  }
  const r = ws.room, i = ws.idx;
  if (!r) return;
  switch (m.type) {
    case 'settings':
      if (r.phase !== 'lobby') return;
      if (typeof m.game === 'string' && Object.prototype.hasOwnProperty.call(games, m.game)) r.game = m.game;
      if (['easy', 'normal', 'hard'].includes(m.diff)) r.diff = m.diff;
      if (m.lang === 'uk' || m.lang === 'ru') r.lang = m.lang;
      if (m.mode === 'normal' || m.mode === 'adult') { if (r.mode !== m.mode) r.topic = 'mix'; r.mode = m.mode; }
      if (typeof m.topic === 'string' && (m.topic === 'mix' || content.topicsFor(r.mode).some(x => x.id === m.topic))) r.topic = m.topic;
      if (typeof m.withPun === 'boolean') r.withPun = m.withPun;
      if (m.puns) { const p = cleanPuns(m.puns); if (p) r.puns = p; }
      return broadcast(r);
    case 'start':
      if (r.phase !== 'lobby') return;
      return startGame(r, ws);
    case 'restart':                      // «Почати заново» після гри: та сама гра й налаштування
      if (r.phase !== 'over') return;
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
      if (r.phase === 'over') { toLobby(r); broadcast(r); }
      return;
    case 'leave':
      r.players[i] = null; ws.room = null;
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
      r.dead = setTimeout(() => { if (r.players.every(x => !x || !x.ws)) { clearTimers(r); rooms.delete(r.code); } }, 15 * 60 * 1000);
    }
  });
});
setInterval(() => wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 25000);

server.listen(PORT, () => console.log('Games for two on http://localhost:' + PORT));
