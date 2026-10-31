// Wordle (укр/рос), Діксіт для двох та «Чорні карти».
// Інтерфейс: init(opts) / move(state, playerIdx, msg, sched) / view(state, playerIdx).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const content2 = require('./content2');
const rnd = n => (Math.random() * n) | 0;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; };
const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const byScore = sc => (sc[0] > sc[1] ? 0 : sc[1] > sc[0] ? 1 : 'draw');

// ---------- Wordle: однакове слово, змагання «хто швидше» ----------
const ALPHA = { uk: 'абвгґдеєжзийіїклмнопрстуфхцчшщьюя', ru: 'абвгдежзийклмнопрстуфхцчшщъыьэюя' };
const DICT = {};
function dict(lang) {
  if (DICT[lang]) return DICT[lang];
  const rd = f => zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'dict', f))).toString('utf8').split('\n').filter(Boolean);
  const words = new Set(rd('words_' + lang + '.txt.gz'));
  const answers = { 5: [], 6: [], 7: [], 8: [] };
  rd('answers_' + lang + '.txt.gz').forEach(w => { if (answers[w.length]) answers[w.length].push(w); });
  return (DICT[lang] = { words, answers });
}
const wnorm = (lang, w) => { w = String(w || '').trim().toLowerCase(); return lang === 'ru' ? w.replace(/ё/g, 'е') : w; };
function wscore(g, s) {                       // 'g' — на місці, 'y' — є в слові, 'b' — немає
  const r = Array(g.length).fill('b'), left = {};
  for (let i = 0; i < s.length; i++) { if (g[i] === s[i]) r[i] = 'g'; else left[s[i]] = (left[s[i]] || 0) + 1; }
  for (let i = 0; i < g.length; i++) if (r[i] === 'b' && left[g[i]]) { r[i] = 'y'; left[g[i]]--; }
  return r.join('');
}
const WMAX = 6;
const wordle = {
  init(o) {
    const lang = o && o.lang === 'ru' ? 'ru' : 'uk';
    const len = o && isInt(o.len, 5, 8) ? o.len : 5;
    const d = dict(lang), pool = d.answers[len];
    return { lang, len, word: pool[rnd(pool.length)], g: [[], []], res: [[], []], done: [false, false], solved: [false, false], winner: null };
  },
  move(s, p, m) {
    if (m.a !== 'g') return { error: 'Невірна дія' };
    if (s.winner != null) return { error: 'Гру завершено' };
    if (s.done[p]) return { error: 'У вас закінчились спроби' };
    const w = wnorm(s.lang, m.w);
    if ([...w].length !== s.len) return { error: `Потрібне слово з ${s.len} літер` };
    if ([...w].some(ch => !ALPHA[s.lang].includes(ch))) return { error: 'Тільки літери ' + (s.lang === 'ru' ? 'російського' : 'українського') + ' алфавіту' };
    if (!dict(s.lang).words.has(w)) return { error: 'Такого слова немає в словнику' };
    const r = wscore(w, s.word);
    s.g[p].push(w); s.res[p].push(r);
    if (w === s.word) { s.solved[p] = true; s.done[p] = true; s.winner = p; }
    else if (s.g[p].length >= WMAX) { s.done[p] = true; if (s.done[0] && s.done[1]) s.winner = 'draw'; }
    return {};
  },
  view(s, p) {
    const over = s.winner != null, o = 1 - p;
    return {
      lang: s.lang, len: s.len, max: WMAX, mine: { g: s.g[p], res: s.res[p] }, opp: { res: s.res[o], n: s.g[o].length, g: over ? s.g[o] : null },
      done: s.done[p], oppDone: s.done[o], word: over ? s.word : null,
    };
  },
  stats() { return { uk: dict('uk').words.size, ru: dict('ru').words.size }; },
  score: wscore,
};

// ---------- Діксіт для двох ----------
// Обидва гравці одночасно обирають карту зі своєї руки й придумують натяк. На столі 4 карти:
// дві гравців і дві «випадкові» з колоди. Кожен має знайти карту суперника за його натяком (свою вибрати не можна).
// Знайшов — +2 тому, хто шукав, і +1 автору натяку. 6 раундів.
const DIXIT_N = 84, DIXIT_ROUNDS = 6;
const dixit = {
  init() {
    const deck = shuffle([...Array(DIXIT_N).keys()]);
    const hands = [deck.splice(0, 6), deck.splice(0, 6)];
    return { deck, hands, r: 0, ph: 'clue', pick: [null, null], clue: [null, null], table: null, vote: [null, null], gain: [0, 0], found: [false, false], score: [0, 0], winner: null };
  },
  move(s, p, m) {
    if (s.ph === 'show') {
      if (m.a !== 'next') return { error: 'Натисніть «Далі»' };
      if (s.r + 1 >= DIXIT_ROUNDS) { s.winner = byScore(s.score); return {}; }
      s.r++; s.ph = 'clue'; s.pick = [null, null]; s.clue = [null, null]; s.table = null; s.vote = [null, null]; s.gain = [0, 0]; s.found = [false, false];
      for (const q of [0, 1]) while (s.hands[q].length < 6 && s.deck.length) s.hands[q].push(s.deck.shift());
      return {};
    }
    if (m.a === 'next') return {};
    if (s.ph === 'clue') {
      if (m.a !== 'clue') return { error: 'Оберіть карту й напишіть натяк' };
      if (s.pick[p] !== null) return { error: 'Ви вже обрали' };
      const t = String(m.t || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      if (!t) return { error: 'Напишіть натяк' };
      if (!s.hands[p].includes(m.c)) return { error: 'Такої карти в руці немає' };
      s.hands[p].splice(s.hands[p].indexOf(m.c), 1);
      s.pick[p] = m.c; s.clue[p] = t;
      if (s.pick[0] !== null && s.pick[1] !== null) {
        const t4 = [{ c: s.pick[0], o: 0 }, { c: s.pick[1], o: 1 }, { c: s.deck.shift(), o: 'd' }, { c: s.deck.shift(), o: 'd' }];
        s.table = shuffle(t4); s.ph = 'vote';
      }
      return {};
    }
    if (s.ph === 'vote') {
      if (m.a !== 'vote' || !isInt(m.i, 0, 3)) return { error: 'Оберіть карту' };
      if (s.vote[p] !== null) return { error: 'Ви вже обрали' };
      if (s.table[m.i].o === p) return { error: 'Свою карту обирати не можна' };
      s.vote[p] = m.i;
      if (s.vote[0] !== null && s.vote[1] !== null) {
        for (const q of [0, 1]) if (s.table[s.vote[q]].o === 1 - q) { s.found[q] = true; s.gain[q] += 2; s.gain[1 - q] += 1; }
        s.score[0] += s.gain[0]; s.score[1] += s.gain[1]; s.ph = 'show';
      }
    }
    return {};
  },
  view(s, p) {
    const o = 1 - p, vote = s.ph === 'vote', show = s.ph === 'show';
    return {
      ph: s.ph, r: s.r, total: DIXIT_ROUNDS, score: s.score,
      hand: s.hands[p], picked: s.pick[p] !== null, oppPicked: s.pick[o] !== null,
      myClue: s.clue[p], oppClue: vote || show ? s.clue[o] : null,
      table: vote || show ? s.table.map(x => x.c) : null,
      mineIdx: vote || show ? s.table.findIndex(x => x.o === p) : null,
      myVote: s.vote[p], oppVoted: s.vote[o] !== null,
      rev: show ? { owners: s.table.map(x => x.o), vote: [...s.vote], gain: [...s.gain], found: [...s.found], clue: [...s.clue] } : null,
    };
  },
};

// ---------- Чорні карти (чорний гумор) ----------
// Кожного раунду чорна карта з пропуском. Обидва таємно кладуть по одній білій карті з руки (7 карт),
// потім оцінюють відповідь суперника від 0 до 3 😂. Бали = оцінки, які поставив суперник. 8 раундів.
const CARDS_ROUNDS = 8;
const cards = {
  init(o) {
    const adult = o && o.mode === 'adult';
    const blacks = shuffle([...(adult ? content2.BLACK.adult : content2.BLACK.normal)]).slice(0, CARDS_ROUNDS);
    const whites = shuffle([...(adult ? [...content2.WHITE.adult, ...content2.WHITE.normal.slice(0, 40)] : content2.WHITE.normal)]);
    const hands = [whites.splice(0, 7), whites.splice(0, 7)];
    return { blacks, whites, hands, r: 0, ph: 'play', pick: [null, null], rate: [null, null], score: [0, 0], winner: null };
  },
  move(s, p, m) {
    if (s.ph === 'show') {
      if (m.a !== 'next') return { error: 'Натисніть «Далі»' };
      if (s.r + 1 >= s.blacks.length) { s.winner = byScore(s.score); return {}; }
      s.r++; s.ph = 'play'; s.pick = [null, null]; s.rate = [null, null];
      for (const q of [0, 1]) while (s.hands[q].length < 7 && s.whites.length) s.hands[q].push(s.whites.shift());
      return {};
    }
    if (m.a === 'next') return {};
    if (s.ph === 'play') {
      if (m.a !== 'play' || !isInt(m.i, 0, s.hands[p].length - 1)) return { error: 'Оберіть карту' };
      if (s.pick[p] !== null) return { error: 'Ви вже обрали' };
      s.pick[p] = s.hands[p].splice(m.i, 1)[0];
      if (s.pick[0] !== null && s.pick[1] !== null) s.ph = 'rate';
      return {};
    }
    if (s.ph === 'rate') {
      if (m.a !== 'rate' || !isInt(m.n, 0, 3)) return { error: 'Оцініть відповідь' };
      if (s.rate[p] !== null) return { error: 'Ви вже оцінили' };
      s.rate[p] = m.n;
      if (s.rate[0] !== null && s.rate[1] !== null) { s.score[0] += s.rate[1]; s.score[1] += s.rate[0]; s.ph = 'show'; }
    }
    return {};
  },
  view(s, p) {
    const o = 1 - p, rate = s.ph === 'rate' || s.ph === 'show';
    return {
      ph: s.ph, r: s.r, total: s.blacks.length, score: s.score, black: s.blacks[s.r], hand: s.hands[p],
      mineCard: s.pick[p] !== null ? s.pick[p] : null, oppPlayed: s.pick[o] !== null,
      oppCard: rate ? s.pick[o] : null, myRate: s.rate[p], oppRated: s.rate[o] !== null,
      rev: s.ph === 'show' ? { rate: [...s.rate] } : null,
    };
  },
};

module.exports = { wordle, dixit, cards };
