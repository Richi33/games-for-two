const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');

const ADM = 'cd'.repeat(16), USER = 'ef'.repeat(16);
const freePort = () => new Promise(r => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });

async function start(env, dir) {
  const port = await freePort();
  const p = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: port, DATA_DIR: dir, ...env }, stdio: 'ignore' });
  const base = 'http://127.0.0.1:' + port;
  for (let i = 0; i < 60; i++) { try { await fetch(base + '/admin'); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  const api = async (pth, body, tok = ADM) => {
    const r = await fetch(base + '/api/admin/' + pth, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, j: await r.json().catch(() => ({})) };
  };
  return { p, base, api, stop: () => new Promise(r => { p.once('exit', r); p.kill('SIGTERM'); }) };
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gft-adm-'));

test('без ADMIN_PIDS адмінка вимкнена (403)', async () => {
  const s = await start({ ADMIN_PIDS: '' }, tmp());
  try { assert.equal((await s.api('overview')).status, 403); } finally { await s.stop(); }
});

test('доступ лише за кодом із ADMIN_PIDS', async () => {
  const s = await start({ ADMIN_PIDS: ADM }, tmp());
  try {
    assert.equal((await s.api('overview', null, USER)).status, 401);
    const r = await s.api('overview');
    assert.equal(r.status, 200);
    assert.ok(r.j.cols.length > 30 && r.j.games.length > 5 && r.j.skills.length);
    assert.equal((await (await fetch(s.base + '/admin')).text()).includes('admin_ui.js'), true);
  } finally { await s.stop(); }
});

test('контент: додати, змінити, видалити, відновити і зберегти після перезапуску', async () => {
  const dir = tmp();
  let s = await start({ ADMIN_PIDS: ADM }, dir);
  let id;
  try {
    const col = (await s.api('overview')).j.cols.find(c => c.id === 'punishments' || /пока|штраф|колесо/i.test(c.title)) || (await s.api('overview')).j.cols[0];
    const before = (await s.api('col/' + col.id)).j;
    const added = await s.api('col/' + col.id, { op: 'add', text: before.items[0].text.replace(/./, 'Ц') + ' тест' });
    assert.equal(added.status, 200);
    assert.equal(added.j.items.length, before.items.length + 1);
    const del = await s.api('col/' + col.id, { op: 'delete', id: before.items[1].id });
    assert.equal(del.j.items.find(i => i.id === before.items[1].id).status, 'hidden');
    const res = await s.api('col/' + col.id, { op: 'restore', id: before.items[1].id });
    assert.equal(res.j.items.find(i => i.id === before.items[1].id).status, 'base');
    await s.api('col/' + col.id, { op: 'delete', id: before.items[2].id });
    id = col.id;
  } finally { await s.stop(); }
  s = await start({ ADMIN_PIDS: ADM }, dir);
  try {
    const d = (await s.api('col/' + id)).j;
    assert.ok(d.items.some(i => i.status === 'hidden'), 'видалення збереглося');
    assert.ok(d.items.some(i => i.status === 'added'), 'додане збереглося');
    const r = await s.api('col/' + id, { op: 'reset' });
    assert.ok(r.j.items.every(i => i.status === 'base'));
  } finally { await s.stop(); }
});

test('не можна вимкнути всі ігри; ціни скілів і нагороди змінюються з валідацією', async () => {
  const s = await start({ ADMIN_PIDS: ADM }, tmp());
  try {
    const ov = (await s.api('overview')).j;
    for (const g of ov.games.slice(0, -1)) assert.equal((await s.api('games', { id: g.id, off: true })).status, 200);
    assert.notEqual((await s.api('games', { id: ov.games.at(-1).id, off: true })).status, 200);
    assert.equal((await s.api('overview')).j.games.filter(g => !g.off).length, 1);
    const sk = ov.skills[0];
    assert.equal((await s.api('skills', { id: sk.id, price: 77 })).status, 200);
    assert.equal((await s.api('overview')).j.skills.find(x => x.id === sk.id).price, 77);
    assert.notEqual((await s.api('skills', { id: sk.id, price: -5 })).status, 200);
    assert.equal((await s.api('rewards', { rewards: { w: { stars: 9, xp: 30 } } })).status, 200);
    assert.equal((await s.api('overview')).j.rewards.w.stars, 9);
    assert.equal((await s.api('rewards', { reset: true })).status, 200);
  } finally { await s.stop(); }
});
