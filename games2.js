// Додаткові ігри (підключаються з games.js). Той самий інтерфейс: init / move / view (+ start).
const rnd = n => (Math.random() * n) | 0;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; };
const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const ERR_TURN = { error: 'Зараз не ваш хід' };

const WORDS = ['кішка','собака','яблуко','груша','школа','вікно','ліхтар','годинник','парасоля','телефон','пляж','гори','річка','озеро','ліс','дорога','місто','село','музика','малюнок','книга','зошит','олівець','футбол','шахи','подорож','літак','потяг','велосипед','ракета','космос','веселка','сніжинка','морозиво','шоколад','борщ','вареники','калина','соняшник','кавун'];

const WORDS_E = ['кіт','дім','ліс','сир','мак','дуб','сом','хліб','вовк','сніг','літо','зима','рука','гора','лампа','кава','мед','чай','вода','мова','ніж','вік','ключ','стіл'];
const WORDS_H = ['велосипед','калькулятор','електричка','бібліотека','математика','телевізор','холодильник','фотографія','мандрівник','кінотеатр','університет','акваріум','електрика','календар','парашутист','космонавт','екскаватор','супермаркет'];

// ---------- Шашки (8x8, обов'язкове взяття, прості дамки) ----------
const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const D4 = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ckCaps = (b, i) => {
  const pc = b[i], r = i >> 3, c = i & 7, out = [];
  for (const [dr, dc] of D4) {
    const r2 = r + 2 * dr, c2 = c + 2 * dc; if (!inb(r2, c2)) continue;
    const o = b[(r + dr) * 8 + c + dc];
    if (o && o[0] !== pc[0] && !b[r2 * 8 + c2]) out.push({ to: r2 * 8 + c2, over: (r + dr) * 8 + c + dc });
  }
  return out;
};
const ckMoves = (b, i) => {
  const pc = b[i], r = i >> 3, c = i & 7, out = [];
  for (const [dr, dc] of D4) {
    if (!pc[1] && dr !== (pc[0] === 0 ? -1 : 1)) continue;
    if (inb(r + dr, c + dc) && !b[(r + dr) * 8 + c + dc]) out.push((r + dr) * 8 + c + dc);
  }
  return out;
};
function ckLegal(s, p) {
  const pairs = []; let caps = false;
  for (let i = 0; i < 64; i++) {
    const pc = s.b[i]; if (!pc || pc[0] !== p) continue;
    if (s.must !== null && i !== s.must) continue;
    const cs = ckCaps(s.b, i);
    if (cs.length) { if (!caps) { pairs.length = 0; caps = true; } cs.forEach(x => pairs.push([i, x.to])); }
    else if (!caps) ckMoves(s.b, i).forEach(t => pairs.push([i, t]));
  }
  return pairs;
}
const chk = {
  init() {
    const b = Array(64).fill(null);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) { if (r < 3) b[r * 8 + c] = [1, 0]; else if (r > 4) b[r * 8 + c] = [0, 0]; }
    return { b, turn: 0, must: null, winner: null };
  },
  move(s, p, m) {
    if (s.turn !== p) return ERR_TURN;
    if (!isInt(m.from, 0, 63) || !isInt(m.to, 0, 63)) return { error: 'Невірний хід' };
    const legal = ckLegal(s, p);
    if (!legal.some(x => x[0] === m.from && x[1] === m.to))
      return { error: legal.some(x => Math.abs((x[0] >> 3) - (x[1] >> 3)) === 2) ? 'Обов’язково бити!' : 'Так ходити не можна' };
    const pc = s.b[m.from], cap = ckCaps(s.b, m.from).find(x => x.to === m.to);
    s.b[m.from] = null; s.b[m.to] = pc;
    if (cap) s.b[cap.over] = null;
    let promoted = false;
    if (!pc[1] && (m.to >> 3) === (p === 0 ? 0 : 7)) { pc[1] = 1; promoted = true; }
    if (cap && !promoted && ckCaps(s.b, m.to).length) { s.must = m.to; return {}; }
    s.must = null; s.turn = 1 - p;
    if (!ckLegal(s, 1 - p).length) s.winner = p;
    return {};
  },
  view: (s, p) => ({ b: s.b, turn: s.turn, must: s.must, legal: s.turn === p && s.winner == null ? ckLegal(s, p) : [] }),
};

// ---------- Гомоку (5 в ряд, 15x15) ----------
const gmk = {
  init: () => ({ b: Array(225).fill(null), turn: 0, winner: null, line: null, last: null }),
  move(s, p, m) {
    if (s.turn !== p) return ERR_TURN;
    if (!isInt(m.i, 0, 224) || s.b[m.i] !== null) return { error: 'Клітинка зайнята' };
    s.b[m.i] = p; s.last = m.i;
    const r = (m.i / 15) | 0, c = m.i % 15;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const cells = [m.i];
      for (const sg of [1, -1]) {
        let rr = r + dr * sg, cc = c + dc * sg;
        while (rr >= 0 && rr < 15 && cc >= 0 && cc < 15 && s.b[rr * 15 + cc] === p) { cells.push(rr * 15 + cc); rr += dr * sg; cc += dc * sg; }
      }
      if (cells.length >= 5) { s.winner = p; s.line = cells; return {}; }
    }
    if (s.b.every(x => x !== null)) s.winner = 'draw'; else s.turn = 1 - p;
    return {};
  },
  view: s => ({ b: s.b, turn: s.turn, line: s.line, last: s.last }),
};

// ---------- Шибениця-дуель ----------
const hang = {
  init(o) { const d = (o && o.diff) || 'normal'; const list = d === 'easy' ? WORDS_E : d === 'hard' ? WORDS_H : WORDS.filter(w => w.length >= 5 && w.length <= 8); const n = { easy: 8, normal: 6, hard: 5 }[d] || 6; return { word: list[rnd(list.length)], g: [], lives: [n, n], turn: rnd(2), winner: null }; },
  move(s, p, m) {
    if (s.turn !== p) return ERR_TURN;
    const l = String(m.l || '');
    if (!/^[а-щьюяєіїґ]$/.test(l)) return { error: 'Оберіть літеру' };
    if (s.g.some(x => x.l === l)) return { error: 'Ця літера вже була' };
    const ok = s.word.includes(l); s.g.push({ l, p, ok });
    if (ok) { if ([...s.word].every(ch => s.g.some(x => x.l === ch))) s.winner = p; }
    else { s.lives[p]--; if (s.lives[p] <= 0) s.winner = 1 - p; else s.turn = 1 - p; }
    return {};
  },
  view: s => ({ mask: [...s.word].map(ch => s.g.some(x => x.l === ch) ? ch : null), g: s.g, lives: s.lives, turn: s.turn, word: s.winner != null ? s.word : null }),
};

// ---------- Вікторина ----------
const QB = [
  ['Столиця Австралії?', 'Канберра', 'Сідней', 'Мельбурн', 'Перт'],
  ['Скільки планет у Сонячній системі?', '8', '7', '9', '10'],
  ['Хто автор «Кобзаря»?', 'Тарас Шевченко', 'Іван Франко', 'Леся Українка', 'Григорій Сковорода'],
  ['Найбільший океан Землі?', 'Тихий', 'Атлантичний', 'Індійський', 'Північний Льодовитий'],
  ['Хімічний символ золота?', 'Au', 'Ag', 'Go', 'Gd'],
  ['У якому році Гагарін полетів у космос?', '1961', '1957', '1969', '1975'],
  ['Найдовша річка, що повністю тече Україною?', 'Південний Буг', 'Дніпро', 'Дністер', 'Сіверський Донець'],
  ['Скільки гравців однієї команди на футбольному полі?', '11', '9', '10', '12'],
  ['Найбільша планета Сонячної системи?', 'Юпітер', 'Сатурн', 'Нептун', 'Земля'],
  ['Хто написала «Лісову пісню»?', 'Леся Українка', 'Ліна Костенко', 'Марко Вовчок', 'Ольга Кобилянська'],
  ['Найвища гора світу?', 'Еверест', 'Кіліманджаро', 'Монблан', 'Говерла'],
  ['Столиця Японії?', 'Токіо', 'Кіото', 'Осака', 'Сеул'],
  ['Скільки кісток у дорослої людини (приблизно)?', '206', '150', '300', '412'],
  ['Якого газу найбільше в повітрі?', 'Азоту', 'Кисню', 'Вуглекислого газу', 'Аргону'],
  ['Хто намалював «Мону Лізу»?', 'Леонардо да Вінчі', 'Мікеланджело', 'Рафаель', 'Пабло Пікассо'],
  ['Найменша країна світу?', 'Ватикан', 'Монако', 'Мальта', 'Андорра'],
  ['Скільки днів у високосному році?', '366', '365', '364', '367'],
  ['Столиця Канади?', 'Оттава', 'Торонто', 'Ванкувер', 'Монреаль'],
  ['Який метал рідкий за кімнатної температури?', 'Ртуть', 'Свинець', 'Олово', 'Залізо'],
  ['Яка країна має форму чобота?', 'Італія', 'Іспанія', 'Греція', 'Португалія'],
  ['Хто створив теорію відносності?', 'Альберт Ейнштейн', 'Ісаак Ньютон', 'Нікола Тесла', 'Галілео Галілей'],
  ['Найбільша жарка пустеля світу?', 'Сахара', 'Гобі', 'Калахарі', 'Атакама'],
  ['Скільки струн у класичної гітари?', '6', '4', '7', '12'],
  ['Яку планету називають червоною?', 'Марс', 'Венера', 'Меркурій', 'Юпітер'],
  ['Столиця Туреччини?', 'Анкара', 'Стамбул', 'Анталія', 'Ізмір'],
  ['Скільки кольорів у веселці?', '7', '5', '6', '8'],
  ['Найглибше озеро світу?', 'Байкал', 'Вікторія', 'Верхнє', 'Ладозьке'],
  ['Яка тварина найвища на Землі?', 'Жираф', 'Слон', 'Лось', 'Страус'],
  ['У якому році почалася Друга світова війна?', '1939', '1914', '1941', '1936'],
  ['Яка річка протікає через Париж?', 'Сена', 'Рейн', 'Темза', 'Дунай'],
  ['Який океан омиває береги Африки зі сходу?', 'Індійський', 'Тихий', 'Атлантичний', 'Південний'],
];
function qStart(s, sched) {
  s.phase = 'q'; s.ans = [null, null]; s.corr = []; s.gain = [0, 0]; s.tok = Math.random();
  const t = s.tok;
  sched(15000, () => { if (s.phase === 'q' && s.tok === t) qReveal(s, sched); });
}
function qReveal(s, sched) {
  s.phase = 'show'; s.gain = [0, 0];
  s.corr.forEach((p, k) => { const g = k === 0 ? 2 : 1; s.gain[p] = g; s.score[p] += g; });
  sched(3000, () => {
    if (s.round + 1 >= s.qs.length) { s.phase = 'end'; s.winner = s.score[0] > s.score[1] ? 0 : s.score[1] > s.score[0] ? 1 : 'draw'; }
    else { s.round++; qStart(s, sched); }
  });
}
const quiz = {
  init() {
    const qs = shuffle([...QB]).slice(0, 7).map(([q, ...o]) => { const a = o[0], so = shuffle([...o]); return { q, o: so, a: so.indexOf(a) }; });
    return { qs, round: 0, score: [0, 0], ans: [null, null], corr: [], gain: [0, 0], phase: 'q', tok: 0, winner: null };
  },
  start: qStart,
  move(s, p, m, sched) {
    if (s.phase !== 'q') return { error: 'Зачекайте' };
    if (s.ans[p] !== null) return { error: 'Ви вже відповіли' };
    if (!isInt(m.o, 0, 3)) return { error: 'Оберіть варіант' };
    s.ans[p] = m.o;
    if (m.o === s.qs[s.round].a) s.corr.push(p);
    if (s.ans[0] !== null && s.ans[1] !== null) qReveal(s, sched);
    return {};
  },
  view(s, p) {
    const q = s.qs[s.round], show = s.phase === 'show' || s.phase === 'end';
    return { round: s.round, total: s.qs.length, q: q.q, o: q.o, phase: s.phase, mine: s.ans[p], oppDone: s.ans[1 - p] !== null, score: s.score, a: show ? q.a : null, gain: show ? s.gain : null };
  },
};

// ---------- Дуелі «хто швидше» (до 3 перемог): рахунок і анаграми ----------
function makeDuel(gen) {
  const nq = s => { const g = gen(); s.q = g.q; s.a = g.a; s.phase = 'q'; s.lock = [false, false]; s.res = null; };
  return {
    init() { const s = { score: [0, 0], round: 1, winner: null }; nq(s); return s; },
    move(s, p, m, sched) {
      if (s.phase !== 'q') return {};
      if (s.lock[p]) return { error: 'Ви вже помилились у цьому раунді' };
      const v = String(m.v == null ? '' : m.v).trim().toLowerCase();
      if (!v || v.length > 30) return { error: 'Введіть відповідь' };
      const done = w => {
        s.phase = 'result'; s.res = { w };
        if (w !== 'none') { s.score[w]++; if (s.score[w] >= 3) { s.winner = w; return; } }
        sched(2200, () => { s.round++; nq(s); });
      };
      if (v === s.a) done(p);
      else { s.lock[p] = true; if (s.lock[0] && s.lock[1]) done('none'); }
      return {};
    },
    view: (s, p) => ({ q: s.q, score: s.score, round: s.round, phase: s.phase, res: s.res, a: s.phase === 'result' ? s.a : null, locked: s.lock[p] }),
  };
}
const math = makeDuel(() => {
  const t = rnd(3); let a, b, q, r;
  if (t === 0) { a = 10 + rnd(90); b = 10 + rnd(90); q = `${a} + ${b}`; r = a + b; }
  else if (t === 1) { a = 30 + rnd(70); b = 10 + rnd(a - 10); q = `${a} − ${b}`; r = a - b; }
  else { a = 3 + rnd(10); b = 3 + rnd(10); q = `${a} × ${b}`; r = a * b; }
  return { q, a: String(r) };
});
const anag = makeDuel(() => {
  const w = WORDS[rnd(WORDS.length)]; let l = [...w], n = 0;
  do { shuffle(l); n++; } while (l.join('') === w && n < 20);
  return { q: l.join(' ').toUpperCase(), a: w };
});

// ---------- Кості-блеф ----------
const roll = n => Array.from({ length: n }, () => 1 + rnd(6));
function dNew(s, starter) { s.dice = [roll(s.n[0]), roll(s.n[1])]; s.bid = null; s.hist = []; s.turn = starter; s.phase = 'bid'; s.rev = null; }
const dice = {
  init() { const s = { n: [5, 5], winner: null }; dNew(s, rnd(2)); return s; },
  move(s, p, m, sched) {
    if (s.phase !== 'bid') return { error: 'Зачекайте' };
    if (s.turn !== p) return ERR_TURN;
    if (m.a === 'bid') {
      const q = m.q, f = m.f;
      if (!isInt(q, 1, s.n[0] + s.n[1]) || !isInt(f, 1, 6)) return { error: 'Невірна ставка' };
      if (s.bid && !(q > s.bid.q || (q === s.bid.q && f > s.bid.f))) return { error: 'Ставка має бути вищою за попередню' };
      s.bid = { q, f, p }; s.hist.push({ p, q, f }); s.turn = 1 - p; return {};
    }
    if (m.a === 'call') {
      if (!s.bid) return { error: 'Спершу має бути ставка' };
      const cnt = s.dice[0].concat(s.dice[1]).filter(x => x === s.bid.f).length;
      const loser = cnt >= s.bid.q ? p : s.bid.p;
      s.n[loser]--; s.phase = 'reveal';
      s.rev = { dice: s.dice.map(d => [...d]), cnt, bid: { ...s.bid }, loser };
      sched(4200, () => { if (s.n[loser] <= 0) s.winner = 1 - loser; else dNew(s, loser); });
      return {};
    }
    return { error: 'Невірна дія' };
  },
  view: (s, p) => ({ phase: s.phase, n: s.n, mine: s.dice[p], bid: s.bid, hist: s.hist.slice(-6), turn: s.turn, rev: s.rev, total: s.n[0] + s.n[1] }),
};

// ---------- Двадцять одне (очко) ----------
const SU = ['♠', '♥', '♦', '♣'];
const RK = [['6', 6], ['7', 7], ['8', 8], ['9', 9], ['10', 10], ['В', 2], ['Д', 3], ['К', 4], ['Т', 11]];
const sum = h => h.reduce((a, c) => a + c.v, 0);
const bj = {
  init() { const d = shuffle(SU.flatMap(su => RK.map(([r, v]) => ({ t: r + su, v })))); return { d, h: [[d.pop(), d.pop()], [d.pop(), d.pop()]], stand: [false, false], turn: rnd(2), winner: null }; },
  move(s, p, m) {
    if (s.turn !== p) return ERR_TURN;
    if (m.a === 'hit') {
      if (!s.d.length) return { error: 'Колода закінчилась' };
      s.h[p].push(s.d.pop());
      if (sum(s.h[p]) > 21) { s.winner = 1 - p; return {}; }
      if (!s.stand[1 - p]) s.turn = 1 - p;
      return {};
    }
    if (m.a === 'stand') {
      if (sum(s.h[p]) > 21) { s.winner = 1 - p; return {}; }
      s.stand[p] = true;
      if (s.stand[0] && s.stand[1]) { const a = sum(s.h[0]), b = sum(s.h[1]); s.winner = a > b ? 0 : b > a ? 1 : 'draw'; }
      else s.turn = 1 - p;
      return {};
    }
    return { error: 'Невірна дія' };
  },
  view(s, p) {
    const w = s.winner != null;
    return { mine: s.h[p], opp: s.h[1 - p].map((c, i) => (i === 0 && !w) ? null : c), sumMine: sum(s.h[p]), sumOpp: w ? sum(s.h[1 - p]) : null, stand: s.stand, turn: s.turn };
  },
};

module.exports = { chk, gmk, hang, quiz, math, anag, dice, bj };
