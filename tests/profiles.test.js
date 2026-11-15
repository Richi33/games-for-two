const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const WebSocket = require('ws');
const { fileStore, upstashStore, createStore } = require('../storage');
const profiles = require('../profiles');
const ach = require('../achievements');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gft-'));
const PID = 'ab'.repeat(16);

test('файлове сховище зберігає та читає', async () => {
  const d = tmp(), s = fileStore(d);
  await s.set('k', 'v1'); s.flush();
  assert.equal(await fileStore(d).get('k'), 'v1');
  assert.equal(await s.get('нема'), null);
});

test('Upstash-сховище працює через REST (фейковий сервер)', async () => {
  const db = new Map(), seen = [];
  const srv = http.createServer((req, res) => {
    let body = ''; req.on('data', c => body += c);
    req.on('end', () => {
      seen.push(req.headers.authorization);
      if (req.method === 'POST') { const [, k, v] = JSON.parse(body); db.set(k, v); return res.end(JSON.stringify({ result: 'OK' })); }
      const k = decodeURIComponent(req.url.split('/get/')[1]); res.end(JSON.stringify({ result: db.has(k) ? db.get(k) : null }));
    });
  });
  await new Promise(r => srv.listen(0, r));
  const url = 'http://localhost:' + srv.address().port, s = upstashStore(url, 'TOK');
  await s.set('gft:p:x', '{"a":1}');
  assert.equal(await s.get('gft:p:x'), '{"a":1}');
  assert.equal(await s.get('gft:p:none'), null);
  assert.ok(seen.every(h => h === 'Bearer TOK'));
  assert.equal(createStore({ UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: 'T' }).kind, 'upstash');
  assert.equal(createStore({ DATA_DIR: tmp() }).kind, 'file');
  srv.close();
});

test('нагороди: перемога, бот, коротка гра, ліміт ботів, рівні', async () => {
  profiles._setStore(fileStore(tmp()));
  assert.equal(await profiles.load('bad', true), null);
  await profiles.load(PID, true, 'Аня');
  const base = { game: 'rps', diff: 'normal', dur: 30000 };
  const w = await profiles.award(PID, { ...base, result: 'w', bot: false });
  assert.equal(w.stars, 10); assert.equal(w.xp, 30); assert.ok(w.ach.some(a => a.id === 'wins'));
  assert.equal((await profiles.award(PID, { ...base, result: 'd', bot: false })).stars, 5);
  assert.equal((await profiles.award(PID, { ...base, result: 'l', bot: false })).stars, 3);
  assert.equal((await profiles.award(PID, { ...base, result: 'w', bot: true })).stars, 5);
  assert.ok((await profiles.award(PID, { ...base, result: 'w', bot: false, dur: 1000 })).short);
  let botTotal = 5; for (let i = 0; i < 12; i++) botTotal += (await profiles.award(PID, { ...base, result: 'w', bot: true })).stars;
  assert.ok(botTotal <= 40, 'ліміт зірок за ботів на добу: ' + botTotal);
  const p = (await profiles.load(PID)); assert.equal(profiles.view(p).tot.human, 3);
  assert.equal(profiles.levelOf(0), 1); assert.equal(profiles.levelOf(60), 2); assert.equal(profiles.levelOf(240), 3);
});

test('щоденний бонус раз на добу; марафон; лічильники', async () => {
  profiles._setStore(fileStore(tmp()));
  await profiles.load(PID, true);
  const d = await profiles.daily(PID);
  assert.equal(d.daily.streak, 1); assert.equal(d.daily.stars, 12);
  assert.equal(await profiles.daily(PID), null);
  const m = await profiles.awardMarathon(PID, true); assert.equal(m.stars, 40); assert.ok(m.ach.some(a => a.id === 'marathon'));
  for (let i = 0; i < 10; i++) await profiles.bump(PID, 'chat');
  assert.ok(profiles.view(await profiles.load(PID)).ach.chat >= 1);
});

test('досягнення: одноразові з фактів гри', () => {
  const p = { ach: {}, tot: { p: 1, w: 1, l: 0, d: 0, human: 0, pun: 0, chat: 0, react: 0, mar: 0 }, games: {}, best: 1, days: { best: 0 } };
  const u = ach.evaluate(p, { game: 'wordle', result: 'w', guesses: 2, len: 5 });
  assert.ok(u.some(a => a.id === 'wordle_fast'));
  assert.equal(ach.evaluate(p, { game: 'wordle', result: 'w', guesses: 2, len: 5 }).length, 0, 'вдруге не видається');
});

// ---- інтеграція через WebSocket ----
test('WS: hello → профіль, гра → нагорода, відновлення кодом', async () => {
  const PORT = 42000 + Math.floor(Math.random() * 900), dir = tmp();
  const srv = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(PORT), DATA_DIR: dir, UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    await new Promise(res => srv.stdout.on('data', d => String(d).includes('http://') && res()));
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const mk = () => { const ws = new WebSocket('ws://localhost:' + PORT), c = { ws, got: [], S: null }; c.open = new Promise(r => ws.on('open', r)); ws.on('message', d => { const m = JSON.parse(d); if (m.type === 'room') c.S = m; else c.got.push(m); }); c.send = o => ws.send(JSON.stringify(o)); c.wait = async (f, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { const x = c.got.find(f); if (x) return x; await sleep(30); } throw new Error('timeout ' + JSON.stringify(c.got.map(g => g.type + (g.result || '') )) + JSON.stringify(c.S && c.S.phase + ':' + c.S.winner)); }; return c; };
    const a = mk(), b = mk(); await a.open; await b.open;
    const pa = 'a1'.repeat(16), pb = 'b2'.repeat(16);
    a.send({ type: 'hello', pid: pa, name: 'Аня' }); b.send({ type: 'hello', pid: pb, name: 'Богдан' });
    const prof = await a.wait(m => m.type === 'profile'); assert.equal(prof.profile.level, 1); assert.ok(prof.defs.length >= 18);
    assert.equal((await a.wait(m => m.type === 'reward' && m.daily)).daily.streak, 1);
    await b.wait(m => m.type === 'profile'); await sleep(100);
    a.send({ type: 'create', name: 'Аня', token: 'ta' }); while (!a.S) await sleep(20);
    b.send({ type: 'join', code: a.S.code, name: 'Богдан', token: 'tb' }); while (!(a.S.online[0] && a.S.online[1])) await sleep(20);
    a.send({ type: 'settings', game: 'ttt' }); a.send({ type: 'start' });
    while (a.S.phase !== 'play') await sleep(20);
    await sleep(10500);                                       // мінімальна тривалість партії для нагород
    for (let k = 0; k < 12 && a.S.phase === 'play'; k++) {       // Аня (гравець 0) прагне верхнього ряду, Богдан грає в інші клітинки
      const v = a.S.view, turn = v.turn, free = v.b.map((x, i) => x === null ? i : -1).filter(i => i >= 0);
      const pick = turn === 0 ? ([0, 1, 2].find(i => free.includes(i)) ?? free[0]) : ([3, 4, 5, 6, 7, 8].find(i => free.includes(i)) ?? free[0]);
      (turn === 0 ? a : b).send({ type: 'move', i: pick }); await sleep(80);
    }
    const winner = a.S.winner; assert.ok(winner === 0 || winner === 1);
    const [win, lose] = winner === 0 ? [a, b] : [b, a];
    assert.equal((await win.wait(m => m.type === 'reward' && m.result === 'w')).stars, 10);
    assert.equal((await lose.wait(m => m.type === 'reward' && m.result === 'l')).stars, 3);
    // відновлення кодом на новому з'єднанні
    const c = mk(); await c.open; c.send({ type: 'restore', code: 'ff'.repeat(16) });
    assert.equal((await c.wait(m => m.type === 'restored')).ok, false);
    c.send({ type: 'restore', code: pa }); const ok = await c.wait(m => m.type === 'restored' && m.ok);
    assert.equal(ok.pid, pa); const pr = await c.wait(m => m.type === 'profile'); assert.equal(pr.profile.tot.p, 1);
    [a, b, c].forEach(x => x.ws.close());
  } finally { srv.kill(); }
});
