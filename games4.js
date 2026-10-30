// Дурень переводний для двох гравців (колода 36 або 52 карти).
// Карта: { s: масть 0..3, r: ранг 2..14 (11=В, 12=Д, 13=К, 14=Т) }.
//
// Правила, які реалізовано:
//  • роздача по 6 карт, козир — нижня карта колоди (вона лежить відкритою й береться останньою);
//  • першим атакує власник найменшого козиря (якщо козирів немає — випадково);
//  • побити можна старшою картою тієї ж масті або будь-яким козирем (козир — лише старшим козирем);
//  • ПЕРЕВІД (лише в «переводному» режимі; у «звичайному» вимкнений): поки жодну карту не побито, захисник кладе карту того ж рангу й передає атаку
//    суперникові — якщо в того в руці не менше карт, ніж буде на столі;
//  • підкидати можна карти рангів, що вже є на столі (до 6 пар і не більше, ніж карт у захисника);
//  • «Беру»: атакувальник може ще підкинути, потім захисник забирає все;
//  • після «Бито» ролі міняються, після «Беру» атакує той самий; добір до 6 (спершу атакувальник);
//  • коли колода скінчилась, хто першим лишився без карт — переміг, останній з картами — дурень.
const rnd = n => (Math.random() * n) | 0;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; };
const ERR = e => ({ error: e });
const cid = c => c.r + '.' + c.s;
const beats = (c, a, t) => (c.s === a.s && c.r > a.r) || (c.s === t && a.s !== t);
const CLEAR_MS = 1100;

function legalFor(s, p) {
  const L = { atk: [], beat: {}, tr: [], take: false, bito: false, done: false };
  if (s.winner != null) return L;
  const h = s.hands[p], def = 1 - s.att;
  const unbeaten = s.table.filter(x => !x.d).length;
  const ranks = new Set();
  s.table.forEach(x => { ranks.add(x.a.r); if (x.d) ranks.add(x.d.r); });
  const canAdd = s.table.length < 6 && unbeaten + 1 <= s.hands[def].length;
  if (s.ph === 'attack' && p === s.att) {
    if (!s.table.length) L.atk = h.map(cid);
    else { if (canAdd) L.atk = h.filter(c => ranks.has(c.r)).map(cid); L.bito = true; }
  } else if (s.ph === 'take' && p === s.att) {
    if (canAdd) L.atk = h.filter(c => ranks.has(c.r)).map(cid);
    L.done = true;
  } else if (s.ph === 'defend' && p === def) {
    h.forEach(c => {
      const t = [];
      s.table.forEach((x, i) => { if (!x.d && beats(c, x.a, s.trump)) t.push(i); });
      if (t.length) L.beat[cid(c)] = t;
    });
    if (s.tr && s.table.every(x => !x.d) && s.table.length < 6 && s.table.length + 1 <= s.hands[s.att].length)
      L.tr = h.filter(c => c.r === s.table[0].a.r).map(cid);
    L.take = true;
  }
  return L;
}

function checkEnd(s) {
  if (s.talon.length) return;
  const e = s.hands.map(h => !h.length);
  if (e[0] && e[1]) s.winner = 'draw';
  else if (e[0]) s.winner = 0;
  else if (e[1]) s.winner = 1;
}

function finishClear(s) {
  const a = s.att, d = 1 - a;
  const cards = [];
  s.table.forEach(x => { cards.push(x.a); if (x.d) cards.push(x.d); });
  if (s.kind === 'take') s.hands[d].push(...cards); else s.out += cards.length;
  for (const p of [a, d]) while (s.hands[p].length < 6 && s.talon.length) s.hands[p].push(s.talon.shift());
  if (s.kind === 'bito') s.att = d;
  s.table = []; s.ph = 'attack'; s.kind = null;
  checkEnd(s);
}

function startClear(s, sched, kind) {
  s.ph = 'clear'; s.kind = kind;
  sched(CLEAR_MS, () => finishClear(s));
}

// Автоматично завершуємо раунд, коли підкидати вже нічого.
function advance(s, sched) {
  if (s.ph === 'attack' && s.table.length) {
    if (!legalFor(s, s.att).atk.length) startClear(s, sched, 'bito');
  } else if (s.ph === 'take') {
    if (!legalFor(s, s.att).atk.length) startClear(s, sched, 'take');
  }
}

const sortHand = (h, t) => [...h].sort((x, y) => ((x.s === t ? 4 : x.s) - (y.s === t ? 4 : y.s)) || (x.r - y.r));

const durak = {
  init(o) {
    const n = o && o.deck === '52' ? 52 : o && o.deck === '24' ? 24 : 36;
    const lo = n === 52 ? 2 : n === 36 ? 6 : 9, talon = [];
    for (let s = 0; s < 4; s++) for (let r = lo; r <= 14; r++) talon.push({ s, r });
    shuffle(talon);
    const hands = [talon.splice(0, 6), talon.splice(0, 6)];
    const trump = talon[talon.length - 1].s;
    const low = hands.map(h => Math.min(99, ...h.filter(c => c.s === trump).map(c => c.r)));
    const att = low[0] === low[1] ? rnd(2) : (low[0] < low[1] ? 0 : 1);
    return { n, tr: !(o && o.perevod === false), talon, hands, trump, att, table: [], ph: 'attack', kind: null, out: 0, winner: null };
  },
  move(s, p, m, sched) {
    if (s.ph === 'clear') return ERR('Зачекайте');
    const L = legalFor(s, p);
    const id = String(m.c || '');
    const take = () => { const i = s.hands[p].findIndex(c => cid(c) === id); return i < 0 ? null : s.hands[p].splice(i, 1)[0]; };
    switch (m.a) {
      case 'atk': {
        if (!L.atk.includes(id)) return ERR(s.att !== p || (s.ph !== 'attack' && s.ph !== 'take') ? 'Зараз не ваш хід' : 'Цю карту підкинути не можна');
        const c = take(); s.table.push({ a: c, d: null });
        if (s.ph === 'attack') s.ph = 'defend';
        break;
      }
      case 'beat': {
        const t = L.beat[id];
        if (!t || !t.includes(m.t)) return ERR('Цією картою не можна побити');
        s.table[m.t].d = take();
        if (s.table.every(x => x.d)) s.ph = 'attack';
        break;
      }
      case 'tr': {
        if (!L.tr.includes(id)) return ERR('Перевести не можна');
        s.table.push({ a: take(), d: null });
        s.att = 1 - s.att;                          // тепер відбивається колишній атакувальник
        break;
      }
      case 'take':
        if (!L.take) return ERR('Зараз не ваш хід');
        s.ph = 'take'; break;
      case 'bito':
        if (!L.bito) return ERR('Бито зараз не можна');
        startClear(s, sched, 'bito'); return {};
      case 'done':
        if (!L.done) return ERR('Зараз не ваш хід');
        startClear(s, sched, 'take'); return {};
      default: return ERR('Невірна дія');
    }
    advance(s, sched);
    return {};
  },
  view(s, p) {
    return {
      n: s.n, perevod: s.tr, trump: s.trump, trumpCard: s.talon.length ? s.talon[s.talon.length - 1] : null, talon: s.talon.length,
      hand: sortHand(s.hands[p], s.trump), opp: s.hands[1 - p].length, oppHand: s.winner != null ? sortHand(s.hands[1 - p], s.trump) : null,
      table: s.table, ph: s.ph, kind: s.kind, att: s.att,
      turn: s.ph === 'defend' ? 1 - s.att : (s.ph === 'clear' ? null : s.att),
      legal: legalFor(s, p),
    };
  },
};

durak.legal = legalFor;   // для тестів
module.exports = { durak };
