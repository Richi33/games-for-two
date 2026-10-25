// Ігри на спілкування: «Що б обрав ти», «Наскільки добре знаєш», «Правда або дія».
// Той самий інтерфейс: init(opts) / move(state, playerIdx, msg, sched) / view(state, playerIdx).
const content = require('./content');
const rnd = n => (Math.random() * n) | 0;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; };
const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const ERR_TURN = { error: 'Зараз не ваш хід' };
const byScore = sc => (sc[0] > sc[1] ? 0 : sc[1] > sc[0] ? 1 : 'draw');

// ---------- Що б обрав ти: обираєш 1 з 3, потім вгадуєш вибір суперника ----------
const wyr = {
  init(o) {
    const mode = o && o.mode === 'adult' ? 'adult' : 'normal';
    const pool = content.wyrPool(mode, o && o.topic);
    const items = [];
    pool.forEach(t => t.rows.forEach(r => items.push({ tn: t.e + ' ' + t.n, o: r })));
    const rounds = shuffle(items).slice(0, pool.length === 1 ? items.length : 8);
    return { rounds, r: 0, ph: 'pick', pick: [null, null], guess: [null, null], gain: [0, 0], score: [0, 0], winner: null };
  },
  move(s, p, m) {
    if (s.ph === 'show') {
      if (m.a !== 'next') return { error: 'Натисніть «Далі»' };
      if (s.r + 1 >= s.rounds.length) s.winner = byScore(s.score);
      else { s.r++; s.ph = 'pick'; s.pick = [null, null]; s.guess = [null, null]; s.gain = [0, 0]; }
      return {};
    }
    if (m.a === 'next') return {};                      // запізніле «Далі» від другого гравця
    if (!isInt(m.o, 0, 2)) return { error: 'Оберіть варіант' };
    const slot = s.ph === 'pick' ? s.pick : s.guess;
    if (slot[p] !== null) return { error: 'Ви вже обрали' };
    slot[p] = m.o;
    if (slot[0] !== null && slot[1] !== null) {
      if (s.ph === 'pick') s.ph = 'guess';
      else {
        for (const q of [0, 1]) { s.gain[q] = s.guess[q] === s.pick[1 - q] ? 1 : 0; s.score[q] += s.gain[q]; }
        s.ph = 'show';
      }
    }
    return {};
  },
  view(s, p) {
    const rd = s.rounds[s.r], show = s.ph === 'show';
    return {
      ph: s.ph, r: s.r, total: s.rounds.length, tn: rd.tn, o: rd.o, score: s.score,
      mine: s.pick[p], oppPicked: s.pick[1 - p] !== null,
      gmine: s.guess[p], oppGuessed: s.guess[1 - p] !== null,
      rev: show ? { pick: [...s.pick], guess: [...s.guess], gain: [...s.gain] } : null,
    };
  },
};

// ---------- Наскільки добре знаєш: один відповідає про себе, інший вгадує ----------
const know = {
  init(o) {
    const pool = content.KNOW[o && o.mode === 'adult' ? 'adult' : 'normal'];
    return { qs: shuffle([...pool]).slice(0, 12), r: 0, start: rnd(2), ph: 'ans', ans: null, guess: null, gain: 0, score: [0, 0], winner: null };
  },
  move(s, p, m) {
    const subj = (s.start + s.r) % 2, q = s.qs[s.r];
    if (s.ph === 'show') {
      if (m.a !== 'next') return { error: 'Натисніть «Далі»' };
      if (s.r + 1 >= s.qs.length) s.winner = byScore(s.score);
      else { s.r++; s.ph = 'ans'; s.ans = null; s.guess = null; s.gain = 0; }
      return {};
    }
    if (m.a === 'next') return {};
    if (!isInt(m.o, 0, q.o.length - 1)) return { error: 'Оберіть варіант' };
    if (s.ph === 'ans') {
      if (p !== subj) return { error: 'Зараз відповідає суперник' };
      s.ans = m.o; s.ph = 'guess'; return {};
    }
    if (p === subj) return { error: 'Зараз вгадує суперник' };
    s.guess = m.o;
    const d = Math.abs(m.o - s.ans);
    s.gain = q.k === 's' ? (d === 0 ? 2 : d === 1 ? 1 : 0) : (d === 0 ? 2 : 0);
    s.score[p] += s.gain; s.ph = 'show';
    return {};
  },
  view(s, p) {
    const q = s.qs[s.r], subj = (s.start + s.r) % 2, show = s.ph === 'show';
    return {
      ph: s.ph, r: s.r, total: s.qs.length, k: q.k, q: q.q, o: q.o, lo: q.lo, hi: q.hi, subj, score: s.score,
      ans: (p === subj || show) ? s.ans : null,
      guess: (p !== subj || show) ? s.guess : null,
      gain: show ? s.gain : null,
    };
  },
};

// ---------- Правда або дія ----------
const TURNS = 10;
const tod = {
  init(o) {
    const pool = content.TOD[o && o.mode === 'adult' ? 'adult' : 'normal'];
    return { t: 0, turn: rnd(2), ph: 'choose', kind: null, prompt: null, done: [0, 0], skips: [0, 0],
      bag: { t: shuffle([...pool.t]), d: shuffle([...pool.d]) }, winner: null };
  },
  move(s, p, m) {
    const next = () => {
      s.t++;
      if (s.t >= TURNS) s.winner = byScore(s.done);
      else { s.turn = 1 - s.turn; s.ph = 'choose'; s.kind = null; s.prompt = null; }
    };
    if (s.ph === 'choose') {
      if (p !== s.turn) return ERR_TURN;
      if (m.a !== 'pick' || (m.k !== 't' && m.k !== 'd')) return { error: 'Оберіть: правда чи дія' };
      s.kind = m.k; s.prompt = s.bag[m.k].pop() || (m.k === 't' ? 'Розкажи щось про себе' : 'Зроби комплімент суперникові');
      s.ph = 'task'; return {};
    }
    if (s.ph === 'task') {
      if (p !== s.turn) return { error: 'Завдання виконує суперник' };
      if (m.a === 'done') { s.ph = 'confirm'; return {}; }
      if (m.a === 'skip') { s.skips[p]++; next(); return {}; }
      return { error: 'Невірна дія' };
    }
    if (s.ph === 'confirm') {
      if (p === s.turn) return { error: 'Чекайте підтвердження суперника' };
      if (m.a === 'ok') { s.done[s.turn]++; next(); return {}; }
      if (m.a === 'no') { next(); return {}; }
    }
    return {};
  },
  view: s => ({ ph: s.ph, turn: s.turn, kind: s.kind, prompt: s.prompt, done: s.done, skips: s.skips, t: s.t, total: TURNS }),
};

module.exports = { wyr, know, tod };
