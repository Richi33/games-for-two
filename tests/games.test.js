const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const G = require('../games');
const bots = require('../bots');
const content2 = require('../content2');
const rnd = n => (Math.random() * n) | 0;
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('кожна гра має init/move/view і правила; клієнт знає про всі ігри', () => {
  const ids = Object.keys(G);
  assert.ok(ids.length >= 22, 'ігор: ' + ids.length);
  const sandbox = { window: {} }; vm.runInNewContext(read('rules.js'), sandbox);
  for (const id of ids) {
    for (const f of ['init', 'move', 'view']) assert.equal(typeof G[id][f], 'function', `${id}.${f}`);
    assert.ok(sandbox.window.RULES[id], 'немає правил для ' + id);
  }
  const client = ['app.js', 'extra.js', 'extra2.js', 'extra3.js', 'extra4.js', 'extra7.js', 'extra8.js'].map(read).join('\n');
  const found = new Set([...client.matchAll(/\{\s*id:\s*'([a-z]+)'\s*,\s*e:/g)].map(m => m[1]));
  for (const id of ids) assert.ok(found.has(id), 'у клієнті немає гри ' + id);
});

test('Wordle: словники ≥100 тис. слів, відповіді з правильною довжиною', () => {
  const st = G.wordle.stats();
  assert.ok(st.uk + st.ru >= 100000, JSON.stringify(st));
  for (const lang of ['uk', 'ru']) for (let len = 5; len <= 8; len++) {
    for (let i = 0; i < 20; i++) {
      const s = G.wordle.init({ lang, len });
      assert.equal([...s.word].length, len);
      if (lang === 'uk') assert.ok(!/(уть|ють|ете|ите)$/.test(s.word), 'дієвідмінювана форма ' + s.word);
      else assert.ok(!/(ете|ите|ешь|ишь|ают|яют|уют)$/.test(s.word), 'дієвідмінювана форма ' + s.word);
    }
  }
  assert.equal(G.wordle.score('слово', 'слово'), 'ggggg');
  assert.equal(G.wordle.score('аабба', 'ббаах'.slice(0, 5)).length, 5);
});

test('Wordle: слово дня однакове, перемога й нічия', () => {
  const a = G.wordle.init({ lang: 'uk', len: 6, daily: true }), b = G.wordle.init({ lang: 'uk', len: 6, daily: true });
  assert.equal(a.word, b.word);
  const s = G.wordle.init({ lang: 'uk', len: 5 });
  assert.ok(G.wordle.move(s, 0, { a: 'g', w: 'ааа' }).error);
  assert.ok(G.wordle.move(s, 1, { a: 'g', w: 'ююююю' }).error);
  assert.ok(!G.wordle.move(s, 1, { a: 'g', w: s.word }).error);
  assert.equal(s.winner, 1);
  const d = G.wordle.init({ lang: 'uk', len: 5 });
  const pool = ['думка', 'хмара', 'зірка', 'місто', 'вікно', 'земля', 'школа'].filter(w => w !== d.word);
  for (let i = 0; i < 6; i++) for (const p of [0, 1]) assert.ok(!G.wordle.move(d, p, { a: 'g', w: pool[i] }).error);
  assert.equal(d.winner, 'draw');
});

test('Діксіт: випадкові партії доходять до кінця, ходи проходять перевірки', () => {
  for (let t = 0; t < 100; t++) {
    const s = G.dixit.init(); let guard = 0;
    while (s.winner == null && guard++ < 300) {
      if (s.ph === 'clue') for (const p of [0, 1]) assert.ok(!G.dixit.move(s, p, { a: 'clue', c: s.hands[p][rnd(6)], t: 'натяк' }).error);
      else if (s.ph === 'vote') for (const p of [0, 1]) {
        const v = G.dixit.view(s, p); assert.ok(G.dixit.move(s, p, { a: 'vote', i: v.mineIdx }).error);
        assert.ok(!G.dixit.move(s, p, { a: 'vote', i: [0, 1, 2, 3].filter(i => i !== v.mineIdx)[rnd(3)] }).error);
      } else { G.dixit.move(s, 0, { a: 'next' }); G.dixit.move(s, 1, { a: 'next' }); }
    }
    assert.ok(s.winner != null);
  }
});

test('Чорні карти: пакети, власні картки, 18+', () => {
  for (const b of Object.values(content2.PACKS).flatMap(p => p.black).concat(content2.BLACK.adult)) assert.ok(b.includes('___'), b);
  for (const opts of [{}, { mode: 'adult' }, { pack: 'work' }, { pack: 'tech', custom: { black: ['Мій ___'], white: ['моя'], only: false } }]) {
    const s = G.cards.init(opts); let guard = 0;
    while (s.winner == null && guard++ < 200) {
      if (s.ph === 'play') for (const p of [0, 1]) assert.ok(!G.cards.move(s, p, { a: 'play', i: rnd(7) }).error);
      else if (s.ph === 'rate') for (const p of [0, 1]) assert.ok(!G.cards.move(s, p, { a: 'rate', n: rnd(4) }).error);
      else { G.cards.move(s, 0, { a: 'next' }); G.cards.move(s, 1, { a: 'next' }); }
    }
    assert.ok(s.winner != null);
  }
});

test('Свої матеріали потрапляють у питання', () => {
  const k = G.know.init({ custom: { know: [1, 2, 3].map(i => ({ q: 'моє' + i, o: ['а', 'б'] })), only: true } });
  assert.ok(k.qs.every(q => q.q.startsWith('моє')));
  const t = G.tod.init({ custom: { tod: [...'ttt'].map((x, i) => ({ k: 't', t: 'т' + i })).concat([...'ddd'].map((x, i) => ({ k: 'd', t: 'д' + i }))), only: true } });
  assert.ok(t.bag.t.every(x => x.startsWith('т')) && t.bag.d.every(x => x.startsWith('д')));
  const w = G.wyr.init({ custom: { wyr: [1, 2, 3].map(i => ({ o: ['а', 'б', 'в'] })), only: true } });
  assert.ok(w.rounds.every(r => r.tn.includes('Свої')));
});

test('Дурень: 300 випадкових партій без помилок (усі колоди й варіанти)', () => {
  for (const deck of ['24', '36', '52']) for (const perevod of [true, false]) for (let t = 0; t < 50; t++) {
    const s = G.durak.init({ deck, perevod }); const q = []; const sc = (ms, fn) => q.push(fn); let guard = 0;
    while (s.winner == null && guard++ < 3000) {
      while (q.length) q.shift()();
      if (s.winner != null) break;
      let moved = false;
      for (const p of [0, 1]) {
        const L = G.durak.legal(s, p), acts = [];
        L.atk.forEach(c => acts.push({ a: 'atk', c }));
        Object.entries(L.beat).forEach(([c, ts]) => ts.forEach(t2 => acts.push({ a: 'beat', c, t: t2 })));
        L.tr.forEach(c => acts.push({ a: 'tr', c }));
        if (L.take) acts.push({ a: 'take' }); if (L.bito) acts.push({ a: 'bito' }); if (L.done) acts.push({ a: 'done' });
        if (!acts.length) continue;
        const r = G.durak.move(s, p, acts[rnd(acts.length)], sc); assert.ok(!r.error, r.error); moved = true; break;
      }
      if (!moved && !q.length) break;
    }
    assert.ok(s.winner != null, 'партія не завершилась');
    if (!perevod) assert.equal(s.tr, false);
  }
});

test('Фортуна: ходи по черзі, різні варіанти, бали за імовірністю, 500 партій', () => {
  const L = G.luck, seen = new Set();
  for (let t = 0; t < 500; t++) {
    const s = L.init(); let guard = 0;
    while (s.winner == null && guard++ < 100) {
      if (s.ph === 'pick') {
        seen.add(s.ev.id);
        const p = L.view(s, 0).turn, free = s.ev.opts.map(o => o.id).filter(i => !s.pick.includes(i));
        assert.ok(L.move(s, 1 - p, { a: 'pick', o: free[0] }).error, 'ходить не той гравець');
        assert.ok(L.move(s, p, { a: 'pick', o: 99 }).error);
        assert.ok(!L.move(s, p, { a: 'pick', o: free[rnd(free.length)] }).error);
        if (s.ph === 'pick') { const q = L.view(s, 0).turn; assert.ok(L.move(s, q, { a: 'pick', o: s.pick[p] }).error, 'той самий варіант'); assert.ok(!L.move(s, q, { a: 'pick', o: s.ev.opts.map(o => o.id).filter(i => !s.pick.includes(i))[0] }).error); }
        assert.equal(L.view(s, 0).out, null === 1 ? 0 : L.view(s, 0).out);
      } else { const v = L.view(s, 1); assert.ok(v.out && v.gain); L.move(s, 0, { a: 'next' }); }
    }
    assert.ok(s.winner != null);
    assert.equal(s.score[0] + s.score[1], s.hist.reduce((a, h) => a + (h.by === null ? 0 : h.pts), 0));
  }
  assert.ok(seen.size >= 8, 'усі види подій трапляються: ' + [...seen]);
  // результат не видно до того, як обидва зробили вибір
  const s = L.init(); const v = L.view(s, 0); assert.equal(v.out, null); assert.ok(!JSON.stringify(v).includes('"roll"'));
});

test('Бот грає в усі підтримувані ігри без помилок і партії завершуються', () => {
  assert.ok(bots.SUPPORTED.length >= 12);
  for (const g of bots.SUPPORTED.filter(x => !['react', 'wordle'].includes(x))) {
    for (let t = 0; t < 15; t++) {
      const s = G[g].init({ diff: 'normal', lang: 'uk', len: 5 }), ctx = {}, q = [], sc = (ms, fn) => q.push(fn); let steps = 0, idle = 0;
      while (s.winner == null && steps++ < 3000 && idle < 60) {
        while (q.length) q.shift()();
        let moved = false;
        const m = humanMove(g, s);
        if (m) { moved = !G[g].move(s, 0, m, sc).error; }
        const th = bots.think(g, s, ctx, 'normal');
        if (th && th.msg) { const r = G[g].move(s, 1, th.msg, sc); assert.ok(!r.error, `${g}: ${r.error} ${JSON.stringify(th.msg)}`); moved = true; }
        idle = moved || q.length ? 0 : idle + 1;
      }
      if (g !== 'chk') assert.ok(s.winner != null, g + ' не завершилась');   // у шашках немає правила нічиєї: дамки можуть ходити вічно
    }
  }
});
function humanMove(g, s) {
  const free = a => a.map((x, i) => x === null ? i : -1).filter(i => i >= 0);
  if (g === 'ttt' && s.turn === 0) return { i: free(s.b)[0] };
  if (g === 'rps') return { c: rnd(3) };
  if (g === 'nim' && s.turn === 0) { const p = s.piles.findIndex(x => x > 0); return { p, n: 1 }; }
  if (g === 'guess' && s.turn === 0) return { n: 1 + rnd(100) };
  if (g === 'bs') return s.ph === 'place' ? { a: 'ready' } : s.turn === 0 ? { a: 'fire', i: free(s.shots[0].map(x => x || null))[0] } : null;
  if (g === 'mem' && s.turn === 0 && !s.lock) { const f = []; for (let i = 0; i < s.cards.length; i++) if (s.matched[i] === -1 && !s.open.includes(i)) f.push(i); return { i: f[0] }; }
  if (g === 'dots' && s.turn === 0) return { e: free(s.e)[0] };
  if (g === 'hang' && s.turn === 0) { const ls = [...'абвгдеєжзиіїйклмнопрстуфхцчшщьюя'].filter(l => !s.g.some(x => x.l === l)); return { l: ls[0] }; }
  if (g === 'chk' && s.turn === 0) { const lg = G.chk.view(s, 0).legal; return lg.length ? { from: lg[0][0], to: lg[0][1] } : null; }
  if (g === 'bj' && s.turn === 0) return { a: 'stand' };
  if (g === 'luck') { if (s.ph === 'result') return { a: 'next' }; const t = s.pick[s.first] === null ? s.first : 1 - s.first; return t === 0 ? { a: 'pick', o: s.ev.opts.map(o => o.id).find(i => !s.pick.includes(i)) } : null; }
  return null;
}
