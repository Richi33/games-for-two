// «Фортуна»: кожного раунду випадає подія (монета, рулетка, кубики, масть, урна, перегони).
// Гравці по черзі обирають різні варіанти; хто вгадав — отримує бали, що залежать від імовірності (рідкісний виграш дорожчий).
const rnd = n => (Math.random() * n) | 0;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; };
const ROUNDS = 7;
const pts = p => Math.max(1, Math.min(8, Math.round(0.5 / p)));            // чим рідше, тим більше балів (≈ чесна ставка)
const mk = (list, total) => list.map((o, i) => ({ id: i, l: o.l, e: o.e, p: o.w / total, pts: pts(o.w / total), w: o.w }));
const wpick = (opts) => { let r = Math.random() * opts.reduce((a, o) => a + o.w, 0); for (const o of opts) { if ((r -= o.w) < 0) return o; } return opts[opts.length - 1]; };
const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const SUITS = [{ l: 'Піки', e: '♠️' }, { l: 'Чирви', e: '♥️' }, { l: 'Бубни', e: '♦️' }, { l: 'Тріфи', e: '♣️' }];
const THEMES = [
  { t: 'Кульки на горках', icon: '🛝', names: [['Червона', '🔴'], ['Синя', '🔵'], ['Зелена', '🟢'], ['Жовта', '🟡']], q: 'Яка кулька скотиться першою?' },
  { t: 'Перегони равликів', icon: '🐌', names: [['Равлик Тік', '🐌'], ['Равлик Так', '🐌'], ['Равлик Тук', '🐌'], ['Равлик Бум', '🐌']], q: 'Хто приповзе першим?' },
  { t: 'Скачки', icon: '🏇', names: [['Блискавка', '🐎'], ['Ураган', '🐴'], ['Комета', '🦄'], ['Тихоня', '🫏']], q: 'Хто першим перетне фініш?' },
  { t: 'Гонка качок', icon: '🦆', names: [['Кряк', '🦆'], ['Плюх', '🦢'], ['Бульк', '🐥'], ['Пух', '🐤']], q: 'Яка качка допливе першою?' },
  { t: 'Космічні перегони', icon: '🚀', names: [['Альфа', '🚀'], ['Бета', '🛸'], ['Гамма', '🛰️'], ['Дельта', '☄️']], q: 'Який апарат прибуде першим?' },
];
const WEIGHT_SETS = [[40, 30, 20, 10], [35, 30, 20, 15], [45, 25, 20, 10], [30, 30, 25, 15]];

const KINDS = {
  coin() { return { kind: 'coin', title: 'Підкидання монети', icon: '🪙', q: 'Що випаде?', opts: mk([{ l: 'Орел', e: '🦅', w: 1 }, { l: 'Решка', e: '🪙', w: 1 }], 2),
    roll(o) { const win = rnd(2); return { win, detail: { side: win } }; } }; },
  roulette() { const o = mk([{ l: 'Червоне', e: '🔴', w: 18 }, { l: 'Чорне', e: '⚫', w: 18 }, { l: 'Зеро', e: '🟢', w: 1 }], 37);
    return { kind: 'roulette', title: 'Рулетка', icon: '🎡', q: 'На який колір зупиниться?', opts: o,
      roll() { const n = rnd(37); return { win: n === 0 ? 2 : RED.has(n) ? 0 : 1, detail: { n, color: n === 0 ? 'g' : RED.has(n) ? 'r' : 'b' } }; } }; },
  dpar() { return { kind: 'dice', title: 'Кубик: парне чи непарне', icon: '🎲', q: 'Яке число випаде?', opts: mk([{ l: 'Парне', e: '2️⃣', w: 3 }, { l: 'Непарне', e: '1️⃣', w: 3 }], 6),
    roll() { const d = 1 + rnd(6); return { win: d % 2 === 0 ? 0 : 1, detail: { dice: [d] } }; } }; },
  drange() { return { kind: 'dice', title: 'Кубик: яка пара', icon: '🎲', q: 'У яку пару потрапить число?', opts: mk([{ l: '1–2', e: '🔹', w: 2 }, { l: '3–4', e: '🔸', w: 2 }, { l: '5–6', e: '🔺', w: 2 }], 6),
    roll() { const d = 1 + rnd(6); return { win: (d - 1) >> 1, detail: { dice: [d] } }; } }; },
  dsum() { return { kind: 'dice', title: 'Два кубики: сума', icon: '🎲', q: 'Яка буде сума?', opts: mk([{ l: 'Менше 7', e: '⬇️', w: 15 }, { l: 'Рівно 7', e: '🎯', w: 6 }, { l: 'Більше 7', e: '⬆️', w: 15 }], 36),
    roll() { const a = 1 + rnd(6), b = 1 + rnd(6), s = a + b; return { win: s < 7 ? 0 : s === 7 ? 1 : 2, detail: { dice: [a, b] } }; } }; },
  suit() { return { kind: 'suit', title: 'Карта з колоди', icon: '🂡', q: 'Якої масті буде карта?', opts: mk(SUITS.map(s => ({ ...s, w: 1 })), 4),
    roll() { const win = rnd(4), rank = ['6', '7', '8', '9', '10', 'В', 'Д', 'К', 'Т'][rnd(9)]; return { win, detail: { suit: win, rank } }; } }; },
  urn() { const tpl = [[5, 3, 2], [6, 3, 1], [4, 4, 2], [5, 4, 1], [7, 2, 1]][rnd(5)], cols = shuffle([['Білі', '⚪'], ['Червоні', '🔴'], ['Чорні', '⚫'], ['Сині', '🔵'], ['Жовті', '🟡']]).slice(0, 3);
    const o = mk(tpl.map((w, i) => ({ l: cols[i][0], e: cols[i][1], w })), 10);
    return { kind: 'urn', title: 'Урна з кульками', icon: '🏺', q: 'Кулька якого кольору випаде?', opts: o, note: 'В урні: ' + o.map(x => `${x.e}×${x.w}`).join(' '),
      roll() { return { win: wpick(o).id, detail: {} }; } }; },
  race() { const th = THEMES[rnd(THEMES.length)], w = shuffle([...WEIGHT_SETS[rnd(WEIGHT_SETS.length)]]);
    const o = mk(th.names.map((n, i) => ({ l: n[0], e: n[1], w: w[i] })), 100);
    return { kind: 'race', title: th.t, icon: th.icon, q: th.q, opts: o, note: 'Швидкість у кожного різна — дивіться на шанс',
      roll() { const pool = [...o], order = []; while (pool.length) { const x = wpick(pool); order.push(x.id); pool.splice(pool.indexOf(x), 1); } return { win: order[0], detail: { order } }; } }; },
};
const ORDER = Object.keys(KINDS);

function newEvent(prev) {
  let k; do k = ORDER[rnd(ORDER.length)]; while (k === prev && ORDER.length > 1);
  const e = KINDS[k](); e.id = k; return e;
}
const sanitize = e => ({ kind: e.kind, title: e.title, icon: e.icon, q: e.q, note: e.note || null, opts: e.opts.map(o => ({ id: o.id, l: o.l, e: o.e, p: o.p, pts: o.pts })) });

const luck = {
  init() { const ev = newEvent(null); return { r: 0, total: ROUNDS, first: rnd(2), ph: 'pick', ev, pick: [null, null], out: null, gain: [0, 0], score: [0, 0], hist: [], winner: null }; },
  move(s, p, m) {
    if (s.ph === 'result') {
      if (m.a !== 'next') return { error: 'Натисніть «Далі»' };
      if (s.r + 1 >= s.total) { s.winner = s.score[0] > s.score[1] ? 0 : s.score[1] > s.score[0] ? 1 : 'draw'; return {}; }
      s.r++; s.first = 1 - s.first; s.ev = newEvent(s.ev.id); s.ph = 'pick'; s.pick = [null, null]; s.out = null; s.gain = [0, 0];
      return {};
    }
    if (m.a === 'next') return {};
    if (m.a !== 'pick' || !Number.isInteger(m.o) || m.o < 0 || m.o >= s.ev.opts.length) return { error: 'Оберіть варіант' };
    const turn = s.pick[s.first] === null ? s.first : s.first === 0 ? 1 : 0;
    if (s.pick[p] !== null || p !== turn) return { error: 'Зараз не ваш вибір' };
    if (s.pick.includes(m.o)) return { error: 'Цей варіант уже обрано' };
    s.pick[p] = m.o;
    if (s.pick[0] !== null && s.pick[1] !== null) {
      s.out = s.ev.roll(); s.ph = 'result';
      for (const q of [0, 1]) if (s.pick[q] === s.out.win) { s.gain[q] = s.ev.opts[s.out.win].pts; s.score[q] += s.gain[q]; }
      s.hist.push({ t: s.ev.title, icon: s.ev.icon, win: s.ev.opts[s.out.win].l + ' ' + s.ev.opts[s.out.win].e, by: s.pick[0] === s.out.win ? 0 : s.pick[1] === s.out.win ? 1 : null, pts: Math.max(...s.gain) });
    }
    return {};
  },
  view(s, p) {
    const turn = s.ph === 'pick' ? (s.pick[s.first] === null ? s.first : 1 - s.first) : null;
    return { r: s.r, total: s.total, ph: s.ph, ev: sanitize(s.ev), pick: s.pick, turn, first: s.first, score: s.score,
      out: s.ph === 'result' ? s.out : null, gain: s.ph === 'result' ? s.gain : null, hist: s.hist };
  },
};
luck.kinds = ORDER;
module.exports = { luck };
