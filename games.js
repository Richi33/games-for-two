// Ігрова логіка (на сервері — щоб не можна було шахраювати).
// Кожна гра: init() -> state, move(state, playerIdx, msg, sched) -> {error?}, view(state, playerIdx) -> дані для клієнта.
// state.winner: null (йде гра) | 0 | 1 | 'draw'
const rnd = n => (Math.random() * n) | 0;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; };
const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const ERR_TURN = { error: 'Зараз не ваш хід' };

// ---------- Хрестики-нулики ----------
const LINES3 = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const ttt = {
  init: () => ({ b: Array(9).fill(null), turn: rnd(2), winner: null, line: null }),
  move(s, p, m) {
    if (s.turn !== p) return ERR_TURN;
    if (!isInt(m.i, 0, 8) || s.b[m.i] !== null) return { error: 'Клітинка зайнята' };
    s.b[m.i] = p;
    const l = LINES3.find(l => l.every(k => s.b[k] === p));
    if (l) { s.winner = p; s.line = l; }
    else if (s.b.every(x => x !== null)) s.winner = 'draw';
    else s.turn = 1 - p;
    return {};
  },
  view: s => ({ b: s.b, turn: s.turn, line: s.line }),
};

// ---------- Чотири в ряд ----------
const c4 = {
  init: () => ({ b: Array.from({ length: 6 }, () => Array(7).fill(null)), turn: rnd(2), winner: null, line: null }),
  move(s, p, m) {
    if (s.turn !== p) return ERR_TURN;
    if (!isInt(m.c, 0, 6)) return { error: 'Невірна колонка' };
    let r = 5; while (r >= 0 && s.b[r][m.c] !== null) r--;
    if (r < 0) return { error: 'Колонка заповнена' };
    s.b[r][m.c] = p;
    for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
      const cells = [[r, m.c]];
      for (const sg of [1, -1]) {
        let rr = r + dr * sg, cc = m.c + dc * sg;
        while (rr >= 0 && rr < 6 && cc >= 0 && cc < 7 && s.b[rr][cc] === p) { cells.push([rr, cc]); rr += dr * sg; cc += dc * sg; }
      }
      if (cells.length >= 4) { s.winner = p; s.line = cells; return {}; }
    }
    if (s.b[0].every(x => x !== null)) s.winner = 'draw'; else s.turn = 1 - p;
    return {};
  },
  view: s => ({ b: s.b, turn: s.turn, line: s.line }),
};

// ---------- Реверсі ----------
function flips(b, i, p) {
  if (b[i] !== null) return [];
  const r0 = i >> 3, c0 = i & 7, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    let r = r0 + dr, c = c0 + dc; const t = [];
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && b[r * 8 + c] === 1 - p) { t.push(r * 8 + c); r += dr; c += dc; }
    if (t.length && r >= 0 && r < 8 && c >= 0 && c < 8 && b[r * 8 + c] === p) out.push(...t);
  }
  return out;
}
const legal = (b, p) => { const o = []; for (let i = 0; i < 64; i++) if (flips(b, i, p).length) o.push(i); return o; };
const count = b => [b.filter(x => x === 0).length, b.filter(x => x === 1).length];
const rev = {
  init() { const b = Array(64).fill(null); b[27] = 1; b[36] = 1; b[28] = 0; b[35] = 0; return { b, turn: 0, winner: null, note: '', last: null }; },
  move(s, p, m) {
    if (s.turn !== p) return ERR_TURN;
    if (!isInt(m.i, 0, 63)) return { error: 'Невірна клітинка' };
    const f = flips(s.b, m.i, p);
    if (!f.length) return { error: 'Сюди ходити не можна' };
    s.b[m.i] = p; f.forEach(k => s.b[k] = p); s.last = m.i; s.note = '';
    if (legal(s.b, 1 - p).length) s.turn = 1 - p;
    else if (legal(s.b, p).length) s.note = 'Суперник пропускає хід';
    else { const [a, b2] = count(s.b); s.winner = a > b2 ? 0 : b2 > a ? 1 : 'draw'; }
    return {};
  },
  view: (s, p) => ({ b: s.b, turn: s.turn, cnt: count(s.b), last: s.last, note: s.note, legal: s.turn === p && s.winner == null ? legal(s.b, p) : [] }),
};

// ---------- Камінь-ножиці-папір (до 2 перемог) ----------
const rps = {
  init: () => ({ c: [null, null], score: [0, 0], round: 1, last: null, winner: null }),
  move(s, p, m) {
    if (!isInt(m.c, 0, 2)) return { error: 'Невірний вибір' };
    if (s.c[p] !== null) return { error: 'Ви вже обрали' };
    s.c[p] = m.c;
    if (s.c[0] !== null && s.c[1] !== null) {
      const d = (s.c[0] - s.c[1] + 3) % 3;
      const w = d === 0 ? 'draw' : d === 1 ? 0 : 1;
      s.last = { c: [...s.c], w };
      if (w !== 'draw') s.score[w]++;
      s.c = [null, null]; s.round++;
      if (s.score[0] >= 2) s.winner = 0; else if (s.score[1] >= 2) s.winner = 1;
    }
    return {};
  },
  view: (s, p) => ({ mine: s.c[p], oppDone: s.c[1 - p] !== null, score: s.score, round: s.round, last: s.last }),
};

// ---------- Пам'ять ----------
const EMO = ['🐶','🐱','🦊','🐼','🐸','🦁','🐙','🦄','🍕','🚀','🎈','🍩'];
const mem = {
  init(o) { const L = { easy: [6, 1800], normal: [8, 1300], hard: [12, 800] }[o && o.diff] || [8, 1300]; const e = shuffle([...EMO]).slice(0, L[0]); return { cards: shuffle([...e, ...e]), matched: Array(L[0] * 2).fill(-1), open: [], turn: rnd(2), score: [0, 0], lock: false, delay: L[1], winner: null }; },
  move(s, p, m, sched) {
    if (s.turn !== p) return ERR_TURN;
    if (s.lock) return { error: 'Зачекайте' };
    if (!isInt(m.i, 0, s.cards.length - 1) || s.matched[m.i] !== -1 || s.open.includes(m.i)) return { error: 'Не можна' };
    s.open.push(m.i);
    if (s.open.length === 2) {
      const [a, b] = s.open;
      if (s.cards[a] === s.cards[b]) {
        s.matched[a] = s.matched[b] = p; s.score[p]++; s.open = [];
        if (s.matched.every(x => x !== -1)) s.winner = s.score[0] > s.score[1] ? 0 : s.score[1] > s.score[0] ? 1 : 'draw';
      } else { s.lock = true; sched(s.delay, () => { s.open = []; s.lock = false; s.turn = 1 - s.turn; }); }
    }
    return {};
  },
  view: s => ({ cards: s.cards.map((c, i) => (s.matched[i] !== -1 || s.open.includes(i)) ? c : null), matched: s.matched, turn: s.turn, score: s.score }),
};

// ---------- Морський бій ----------
function place() {
  const occ = new Set(), ships = [];
  for (const L of [5, 4, 3, 3, 2]) for (;;) {
    const h = Math.random() < .5, r = rnd(h ? 10 : 11 - L), c = rnd(h ? 11 - L : 10);
    const cells = [...Array(L)].map((_, k) => h ? r * 10 + c + k : (r + k) * 10 + c);
    if (cells.some(x => occ.has(x))) continue;
    cells.forEach(x => occ.add(x)); ships.push(cells); break;
  }
  return ships;
}
const bs = {
  init: () => ({ ph: 'place', ships: [place(), place()], ready: [false, false], shots: [Array(100).fill(0), Array(100).fill(0)], turn: rnd(2), winner: null }),
  move(s, p, m) {
    if (s.ph === 'place') {
      if (s.ready[p]) return { error: 'Ви вже готові' };
      if (m.a === 'rand') { s.ships[p] = place(); return {}; }
      if (m.a === 'ready') { s.ready[p] = true; if (s.ready[0] && s.ready[1]) s.ph = 'play'; return {}; }
      return { error: 'Невірна дія' };
    }
    if (m.a !== 'fire') return { error: 'Невірна дія' };
    if (s.turn !== p) return ERR_TURN;
    if (!isInt(m.i, 0, 99) || s.shots[p][m.i]) return { error: 'Сюди вже стріляли' };
    const enemy = s.ships[1 - p], hit = enemy.some(sh => sh.includes(m.i));
    s.shots[p][m.i] = hit ? 2 : 1;
    if (enemy.every(sh => sh.every(k => s.shots[p][k] === 2))) s.winner = p;
    else if (!hit) s.turn = 1 - p;
    return {};
  },
  view(s, p) {
    const own = Array(100).fill(0); s.ships[p].forEach(sh => sh.forEach(k => own[k] = 1));
    const mine = s.shots[p].slice(); const en = s.ships[1 - p];
    en.forEach(sh => { if (sh.every(k => s.shots[p][k] === 2)) sh.forEach(k => mine[k] = 3); });
    const alive = (ships, shots) => ships.filter(sh => !sh.every(k => shots[k] === 2)).length;
    return { ph: s.ph, own, inc: s.shots[1 - p], mine, ready: s.ready, turn: s.turn, left: [alive(s.ships[p], s.shots[1 - p]), alive(en, s.shots[p])] };
  },
};

// ---------- Вгадай число ----------
const guess = {
  init: () => ({ secret: 1 + rnd(100), turn: rnd(2), log: [], winner: null }),
  move(s, p, m) {
    if (s.turn !== p) return ERR_TURN;
    if (!isInt(m.n, 1, 100)) return { error: 'Число від 1 до 100' };
    const r = m.n < s.secret ? '<' : m.n > s.secret ? '>' : '=';
    s.log.push({ p, n: m.n, r });
    if (r === '=') s.winner = p; else s.turn = 1 - p;
    return {};
  },
  view: s => ({ turn: s.turn, log: s.log }),
};

// ---------- Дуель реакції (до 3) ----------
function startRound(s, sched) {
  s.phase = 'wait'; s.res = null; s.tok = Math.random();
  const tok = s.tok;
  sched(2000 + rnd(3000), () => { if (s.phase === 'wait' && s.tok === tok) { s.phase = 'go'; s.goAt = Date.now(); } });
}
const react = {
  init: () => ({ phase: 'wait', score: [0, 0], round: 1, res: null, winner: null, goAt: 0, tok: 0 }),
  start: startRound,
  move(s, p, m, sched) {
    let w, ms = null;
    if (s.phase === 'wait') w = 1 - p;                    // фальстарт
    else if (s.phase === 'go') { w = p; ms = Date.now() - s.goAt; }
    else return {};
    s.phase = 'result'; s.res = { w, ms }; s.score[w]++;
    if (s.score[w] >= 3) s.winner = w;
    else sched(2200, () => { s.round++; startRound(s, sched); });
    return {};
  },
  view: s => ({ phase: s.phase, score: s.score, round: s.round, res: s.res }),
};

// ---------- Нім (хто бере останню — програє) ----------
const nim = {
  init: () => ({ piles: [1, 3, 5, 7], turn: rnd(2), winner: null }),
  move(s, p, m) {
    if (s.turn !== p) return ERR_TURN;
    if (!isInt(m.p, 0, 3) || !isInt(m.n, 1, s.piles[m.p] || 0)) return { error: 'Невірний хід' };
    s.piles[m.p] -= m.n;
    if (s.piles.every(x => x === 0)) s.winner = 1 - p; else s.turn = 1 - p;
    return {};
  },
  view: s => ({ piles: s.piles, turn: s.turn }),
};

// ---------- Крапки й квадрати (4x4) ----------
const N = 4, HN = (N + 1) * N;
const boxEdges = (r, c) => [r * N + c, (r + 1) * N + c, HN + r * (N + 1) + c, HN + r * (N + 1) + c + 1];
const dots = {
  init: () => ({ e: Array(HN * 2 - 0 + 0).fill(null).slice(0, HN + N * (N + 1)), boxes: Array(N * N).fill(null), turn: rnd(2), score: [0, 0], winner: null }),
  move(s, p, m) {
    if (s.turn !== p) return ERR_TURN;
    if (!isInt(m.e, 0, s.e.length - 1) || s.e[m.e] !== null) return { error: 'Лінія вже є' };
    s.e[m.e] = p; let got = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const k = r * N + c;
      if (s.boxes[k] === null && boxEdges(r, c).every(x => s.e[x] !== null)) { s.boxes[k] = p; got++; }
    }
    s.score[p] += got;
    if (s.boxes.every(x => x !== null)) s.winner = s.score[0] > s.score[1] ? 0 : s.score[1] > s.score[0] ? 1 : 'draw';
    else if (!got) s.turn = 1 - p;
    return {};
  },
  view: s => ({ n: N, e: s.e, boxes: s.boxes, turn: s.turn, score: s.score }),
};

module.exports = { ttt, c4, rev, rps, mem, bs, guess, react, nim, dots };
Object.assign(module.exports, require('./games2'));
Object.assign(module.exports, require('./games3'));
