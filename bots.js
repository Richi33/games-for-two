// Бот-суперник (завжди гравець №1). think(game, state, ctx, skill) -> { msg, delay } | null
const G = require('./games');
const rnd = n => (Math.random() * n) | 0;
const pick = a => a[rnd(a.length)];
const between = (a, b) => a + rnd(b - a + 1);
const BOT = 1;

// ---- хрестики-нулики: мінімакс ----
const L3 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const tw = b => { const l = L3.find(l => b[l[0]] !== null && l.every(k => b[k] === b[l[0]])); return l ? b[l[0]] : null; };
function mm(b, turn) {                              // оцінка для БОТА: 1 виграш, 0 нічия, -1 програш
  const w = tw(b); if (w !== null) return w === BOT ? 1 : -1;
  const free = b.map((x, i) => x === null ? i : -1).filter(i => i >= 0); if (!free.length) return 0;
  let best = turn === BOT ? -2 : 2;
  for (const i of free) { b[i] = turn; const v = mm(b, 1 - turn); b[i] = null; best = turn === BOT ? Math.max(best, v) : Math.min(best, v); }
  return best;
}
// ---- нім (мізер): розв'язуємо повним перебором ----
const nimMemo = new Map();
function nimWin(p) {                                // чи виграє той, хто ходить
  if (p.every(x => x === 0)) return true;
  const k = p.join(','); if (nimMemo.has(k)) return nimMemo.get(k);
  let w = false;
  for (let i = 0; i < 4 && !w; i++) for (let n = 1; n <= p[i] && !w; n++) { const q = [...p]; q[i] -= n; if (!nimWin(q)) w = true; }
  nimMemo.set(k, w); return w;
}
// ---- крапки й квадрати ----
const N = 4, HN = (N + 1) * N;
const boxEdges = (r, c) => [r * N + c, (r + 1) * N + c, HN + r * (N + 1) + c, HN + r * (N + 1) + c + 1];
const boxes = [...Array(N * N)].map((_, k) => boxEdges((k / N) | 0, k % N));
const FREQ = { uk: 'оаинвтретсукмлдпзяьбгчхєжшюцщїфґ', ru: 'оеаинтсрвлкмдпуяыьгзбчйхжшюцщэфъ' };

const T = {
  ttt(s, ctx, skill) {
    if (s.turn !== BOT) return null;
    const free = s.b.map((x, i) => x === null ? i : -1).filter(i => i >= 0);
    let i;
    if (Math.random() < skill) {
      let best = -2, bi = [];
      for (const k of free) { s.b[k] = BOT; const v = mm(s.b, 0); s.b[k] = null; if (v > best) { best = v; bi = [k]; } else if (v === best) bi.push(k); }
      i = pick(bi);
    } else i = pick(free);
    return { msg: { i }, delay: between(500, 1100) };
  },
  rps(s) { return s.c[BOT] === null ? { msg: { c: rnd(3) }, delay: between(600, 1600) } : null; },
  nim(s, ctx, skill) {
    if (s.turn !== BOT) return null;
    const mv = [];
    for (let i = 0; i < 4; i++) for (let n = 1; n <= s.piles[i]; n++) mv.push({ p: i, n });
    const good = mv.filter(m => { const q = [...s.piles]; q[m.p] -= m.n; return !nimWin(q); });
    const m = good.length && Math.random() < skill ? pick(good) : pick(mv);
    return { msg: m, delay: between(800, 1500) };
  },
  guess(s, ctx, skill) {
    if (s.turn !== BOT) return null;
    let lo = 1, hi = 100; for (const l of s.log) { if (l.r === '<') lo = Math.max(lo, l.n + 1); else if (l.r === '>') hi = Math.min(hi, l.n - 1); }
    const n = Math.random() < skill ? ((lo + hi) >> 1) : between(lo, hi);
    return { msg: { n }, delay: between(900, 1800) };
  },
  bs(s, ctx, skill) {
    if (s.ph === 'place') return s.ready[BOT] ? null : { msg: { a: 'ready' }, delay: 500 };
    if (s.turn !== BOT || s.winner != null) return null;
    const sh = s.shots[BOT], enemy = s.ships[0];
    const sunk = new Set(); enemy.forEach(x => { if (x.every(k => sh[k] === 2)) x.forEach(k => sunk.add(k)); });
    const hits = []; for (let i = 0; i < 100; i++) if (sh[i] === 2 && !sunk.has(i)) hits.push(i);
    const free = i => i >= 0 && i < 100 && !sh[i];
    const nb = i => [[i - 10, 1], [i + 10, 1], [i - 1, (i % 10) > 0], [i + 1, (i % 10) < 9]].filter(([k, ok]) => ok && free(k)).map(x => x[0]);
    let c = [];
    if (Math.random() < skill + 0.1) {
      for (const h of hits) { // продовжуємо лінію, якщо вже є два влучання підряд
        for (const d of [1, 10]) if (hits.includes(h + d)) { [h - d, h + 2 * d].forEach(k => { if (free(k) && (d === 10 || ((k / 10) | 0) === ((h / 10) | 0))) c.push(k); }); }
      }
      if (!c.length) hits.forEach(h => c.push(...nb(h)));
    }
    if (!c.length) { const all = []; for (let i = 0; i < 100; i++) if (free(i)) all.push(i); const chk = all.filter(i => (((i / 10) | 0) + i) % 2 === 0); c = Math.random() < skill && chk.length ? chk : all; }
    return { msg: { a: 'fire', i: pick(c) }, delay: between(700, 1400) };
  },
  mem(s, ctx, skill) {
    ctx.known = ctx.known || {};
    s.open.forEach(i => { if (Math.random() < skill + 0.15) ctx.known[i] = s.cards[i]; });
    for (const i of Object.keys(ctx.known)) if (s.matched[i] !== -1) delete ctx.known[i];
    if (s.turn !== BOT) return null;
    if (s.lock) return { retry: 400 };
    const free = []; for (let i = 0; i < s.cards.length; i++) if (s.matched[i] === -1 && !s.open.includes(i)) free.push(i);
    const kn = Object.keys(ctx.known).map(Number);
    let i;
    if (s.open.length === 1) {
      const f = ctx.known[s.open[0]] !== undefined ? ctx.known[s.open[0]] : s.cards[s.open[0]];
      const mate = kn.find(k => k !== s.open[0] && ctx.known[k] === f);
      if (mate !== undefined) i = mate; else { const unk = free.filter(k => !kn.includes(k)); i = pick(unk.length ? unk : free); }
    } else {
      let pair = null; for (const a of kn) for (const b of kn) if (a < b && ctx.known[a] === ctx.known[b]) pair = a;
      if (pair !== null) i = pair; else { const unk = free.filter(k => !kn.includes(k)); i = pick(unk.length ? unk : free); }
    }
    s.open.length === 1 && void 0;
    return { msg: { i }, delay: between(700, 1200) };
  },
  dots(s, ctx, skill) {
    if (s.turn !== BOT) return null;
    const free = s.e.map((x, i) => x === null ? i : -1).filter(i => i >= 0);
    const cnt = e => boxes.filter(b => b.includes(e) && s.boxes[boxes.indexOf(b)] === null).map(b => b.filter(x => s.e[x] !== null).length);
    let c = [];
    if (Math.random() < skill + 0.1) c = free.filter(e => cnt(e).some(n => n === 3));            // замкнути клітинку
    if (!c.length && Math.random() < skill + 0.1) c = free.filter(e => cnt(e).every(n => n < 2));  // не дарувати третю лінію
    return { msg: { e: pick(c.length ? c : free) }, delay: between(600, 1200) };
  },
  wordle(s, ctx, skill) {
    if (s.done[BOT] || s.winner != null) return null;
    return { msg: { a: 'g', w: G.wordle.bot(s, BOT, skill) }, delay: between(5000, 11000) };
  },
  hang(s, ctx, skill) {
    if (s.turn !== BOT) return null;
    const used = new Set(s.g.map(x => x.l)), order = [...FREQ[s.lang]].filter(l => !used.has(l));
    const l = Math.random() < skill ? order[0] : pick(order.slice(0, 12));
    return { msg: { l }, delay: between(900, 1700) };
  },
  chk(s, ctx, skill) {
    if (s.turn !== BOT || s.winner != null) return null;
    const legal = G.chk.view(s, BOT).legal; if (!legal.length) return null;
    const prom = legal.filter(([f, t]) => s.b[f] && !s.b[f][1] && (t >> 3) === 7), adv = legal.filter(([f, t]) => (t >> 3) > (f >> 3));
    const [from, to] = Math.random() < skill ? pick(prom.length ? prom : adv.length ? adv : legal) : pick(legal);
    return { msg: { from, to }, delay: between(700, 1400) };
  },
  react(s, ctx, skill) {
    if (s.phase !== 'go') return null;
    return { msg: { c: 1 }, delay: between(Math.round(700 - 400 * skill), Math.round(1300 - 500 * skill)) };
  },
  luck(s) {                                   // бот обирає вільний варіант випадково (ставки в цій грі «чесні»)
    if (s.ph !== 'pick') return null;
    const turn = s.pick[s.first] === null ? s.first : 1 - s.first;
    if (turn !== BOT) return null;
    const free = s.ev.opts.map(o => o.id).filter(i => !s.pick.includes(i));
    return { msg: { a: 'pick', o: pick(free) }, delay: between(900, 1800) };
  },
  bj(s, ctx, skill) {
    if (s.turn !== BOT || s.winner != null) return null;
    const sum = s.h[BOT].reduce((a, c) => a + c.v, 0), lim = skill > .8 ? 17 : skill > .5 ? 16 : 14;
    return { msg: { a: sum < lim ? 'hit' : 'stand' }, delay: between(800, 1500) };
  },
};
const SUPPORTED = Object.keys(T);
const SKILL = { easy: .3, normal: .65, hard: .95 };
function think(game, s, ctx, diff) { return T[game] ? T[game](s, ctx, SKILL[diff] || SKILL.normal) : null; }
module.exports = { SUPPORTED, think, BOT };
