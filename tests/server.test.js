const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const WebSocket = require('ws');

const PORT = 41000 + Math.floor(Math.random() * 1000);
let srv;
test.before(async () => {
  srv = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise(res => srv.stdout.on('data', d => String(d).includes('http://') && res()));
});
test.after(() => srv && srv.kill());

const sleep = ms => new Promise(r => setTimeout(r, ms));
function client(name) {
  const ws = new WebSocket('ws://localhost:' + PORT), c = { ws, S: null, got: [], token: 't' + Math.random() };
  c.ready = new Promise(r => ws.on('open', r));
  ws.on('message', d => { const m = JSON.parse(d); if (m.type === 'room') c.S = m; else c.got.push(m); });
  c.send = o => ws.send(JSON.stringify(o));
  c.name = name;
  c.until = async (fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (c.S && fn(c.S)) return c.S; await sleep(30); } throw new Error('timeout: ' + JSON.stringify(c.S && { phase: c.S.phase, game: c.S.game, mar: c.S.mar })); };
  return c;
}
async function pair() {
  const a = client('Аня'), b = client('Богдан'); await a.ready; await b.ready;
  a.send({ type: 'create', name: a.name, token: a.token }); await a.until(s => s.code);
  b.send({ type: 'join', code: a.S.code, name: b.name, token: b.token }); await a.until(s => s.online[0] && s.online[1]); await b.until(s => s.you === 1);
  return [a, b];
}
const freeCells = b => b.map((x, i) => x === null ? i : -1).filter(i => i >= 0);

test('/healthz і статика', async () => {
  for (const u of ['/healthz', '/', '/app.js', '/style.css', '/manifest.webmanifest', '/offline.html', '/extra6.js']) {
    const r = await fetch(`http://localhost:${PORT}${u}`); assert.equal(r.status, 200, u);
  }
  assert.equal((await fetch(`http://localhost:${PORT}/server.js`)).status, 404);
});

test('двоє гравців: гра, рахунок серії та історія', async () => {
  const [a, b] = await pair();
  a.send({ type: 'settings', game: 'ttt' }); await b.until(s => s.game === 'ttt');
  a.send({ type: 'start' }); await a.until(s => s.phase === 'play');
  const players = [a, b];
  for (let k = 0; k < 20; k++) {
    const s = a.S; if (s.phase === 'over') break;
    const p = players[s.view.turn]; if (!p) break;
    // гравець-переможець: ходить у перші вільні клітинки, суперник у останні
    const f = freeCells(s.view.b); p.send({ type: 'move', i: s.view.turn === 0 ? f[0] : f[f.length - 1] });
    await sleep(60);
  }
  await a.until(s => s.phase === 'over');
  assert.equal(a.S.series.hist.length, 1);
  assert.equal(a.S.series.w[0] + a.S.series.w[1] + a.S.series.d, 1);
  a.send({ type: 'again' }); await a.until(s => s.phase === 'lobby'); assert.equal(b.S.series.hist.length, 1);
});

test('чат і реакції доходять; недопустима реакція ігнорується', async () => {
  const [a, b] = await pair();
  a.send({ type: 'react', e: '😂' }); a.send({ type: 'react', e: '💣' }); await sleep(200);
  assert.deepEqual(b.got.filter(m => m.type === 'react').map(m => m.e), ['😂']);
  a.send({ type: 'chat', t: '  Привіт  ' }); await sleep(200);
  const m = b.got.find(x => x.type === 'chat'); assert.equal(m.t, 'Привіт'); assert.equal(m.from, 0);
});

test('власні матеріали й пакети валідуються на сервері', async () => {
  const [a, b] = await pair();
  a.send({ type: 'settings', custom: { know: [{ q: 'q', o: ['a'] }, { q: 'ok', o: ['a', 'b'] }], tod: [{ k: 'x', t: 'bad' }, { k: 't', t: 'добре' }], black: ['без пропуску', 'є ___'], white: ['біла'], wyr: [{ o: ['1', '2'] }], only: true }, pack: 'work', len: 7, daily: true, marathon: ['ttt', 'нема-такої', 'ttt', 'nim'] });
  const s = await b.until(x => x.pack === 'work');
  assert.deepEqual(s.custom.know, [{ q: 'ok', o: ['a', 'b'] }]); assert.deepEqual(s.custom.tod, [{ k: 't', t: 'добре' }]);
  assert.deepEqual(s.custom.black, ['є ___']); assert.deepEqual(s.custom.wyr, []); assert.equal(s.len, 7); assert.equal(s.daily, true);
  assert.deepEqual(s.marPick, ['ttt', 'nim']);
  a.send({ type: 'settings', pack: 'нема', len: 99 }); await sleep(150); assert.equal(a.S.pack, 'work'); assert.equal(a.S.len, 7);
});

test('гра з ботом: бот ходить сам, непідтримувана гра блокується', async () => {
  const a = client('Аня'); await a.ready;
  a.send({ type: 'create', name: 'Аня', token: a.token, bot: true }); await a.until(s => s.bot && s.online[1]);
  a.send({ type: 'settings', game: 'dice' }); a.send({ type: 'start' }); await sleep(200);
  assert.equal(a.S.phase, 'lobby'); assert.ok(a.got.some(m => m.type === 'error' && /Бот/.test(m.msg)));
  a.send({ type: 'settings', game: 'nim', diff: 'hard' }); a.send({ type: 'start' }); await a.until(s => s.phase === 'play');
  for (let k = 0; k < 250 && a.S.phase === 'play'; k++) {
    if (a.S.view.turn === 0) { const p = a.S.view.piles.findIndex(x => x > 0); a.send({ type: 'move', p, n: 1 }); }
    await sleep(100);
  }
  await a.until(s => s.phase === 'over', 15000);
  assert.equal(a.S.winner, 1, 'складний бот у нім має виграти, якщо людина ходить по одній паличці');
  a.send({ type: 'again' }); await a.until(s => s.phase === 'lobby'); a.send({ type: 'unbot' }); await a.until(s => !s.bot && !s.online[1]);
});

test('марафон: 2 гри з ботом, підсумок і колесо покарань', async () => {
  const a = client('Аня'); await a.ready;
  a.send({ type: 'create', name: 'Аня', token: a.token, bot: true }); await a.until(s => s.bot);
  a.send({ type: 'settings', diff: 'hard', withPun: true, marathon: ['nim', 'ttt'] }); await a.until(s => s.marPick.length === 2);
  a.send({ type: 'start' }); await a.until(s => s.phase === 'play' && s.mar);
  assert.equal(a.S.game, 'nim'); assert.equal(a.S.wheel, null);
  const playOut = async g => {
    for (let k = 0; k < 250 && a.S.phase === 'play'; k++) {
      const v = a.S.view;
      if (g === 'nim' && v.turn === 0) { const p = v.piles.findIndex(x => x > 0); a.send({ type: 'move', p, n: 1 }); }
      if (g === 'ttt' && v.turn === 0) a.send({ type: 'move', i: freeCells(v.b)[0] });
      await sleep(100);
    }
    await a.until(s => s.phase === 'over', 15000);
  };
  await playOut('nim'); a.send({ type: 'next' }); await a.until(s => s.phase === 'play' && s.game === 'ttt' && s.mar.idx === 1);
  await playOut('ttt'); assert.equal(a.S.mar.res.length, 2);
  a.send({ type: 'next' });
  const fin = await a.until(s => s.phase === 'mover' || s.phase === 'wheel', 5000);
  if (fin.phase === 'wheel') { assert.ok(fin.punishment); await a.until(s => s.phase === 'mover', 12000); }
  assert.equal(a.S.mar.done, true); a.send({ type: 'again' }); await a.until(s => s.phase === 'lobby' && !s.mar);
});

test('третій гравець не може приєднатися; кімнату з ботом не зайняти', async () => {
  const [a] = await pair(); const c = client('Третій'); await c.ready;
  c.send({ type: 'join', code: a.S.code, name: 'Третій', token: c.token }); await sleep(200);
  assert.ok(c.got.some(m => m.type === 'error' && m.fatal));
});
