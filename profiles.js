// Профілі гравців: зірки ⭐, XP, рівні, статистика, досягнення, щоденний бонус.
// Ідентифікатор — секретний код пристрою (pid, 32 hex). У сховищі лежить лише його хеш.
const crypto = require('crypto');
const { createStore } = require('./storage');
const ach = require('./achievements');

const PID_RE = /^[a-f0-9]{32}$/;
const REWARD = { w: { stars: 10, xp: 30 }, d: { stars: 5, xp: 15 }, l: { stars: 3, xp: 10 } };
const BOT_STARS_CAP = 40;          // зірок на добу, які можна заробити проти бота
const MIN_GAME_MS = 10000;         // дуже короткі партії нагород не дають
const TITLES = [[1, 'Новачок'], [3, 'Гравець'], [5, 'Знавець'], [8, 'Майстер'], [12, 'Легенда'], [20, 'Міфічний']];

let store = createStore();
const cache = new Map(), chains = new Map(), timers = new Map();
const keyOf = pid => 'gft:p:' + crypto.createHash('sha256').update(pid).digest('hex').slice(0, 40);
const day = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv' }).format(d);
const yesterday = () => day(new Date(Date.now() - 864e5));
const levelOf = xp => 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 60));
const xpAt = lvl => 60 * (lvl - 1) * (lvl - 1);
const titleOf = lvl => TITLES.reduce((t, [l, n]) => (lvl >= l ? n : t), TITLES[0][1]);

const blank = name => ({ v: 1, created: Date.now(), name: name || '', xp: 0, stars: 0, games: {}, tot: { p: 0, w: 0, l: 0, d: 0, human: 0, pun: 0, chat: 0, react: 0, mar: 0 },
  streak: 0, best: 0, days: { last: '', streak: 0, best: 0 }, botStars: { day: '', n: 0 }, ach: {}, hist: [] });

function save(pid) {                                 // послідовний запис, щоб відповіді мережі не перемішались
  const k = keyOf(pid);
  const prev = chains.get(k) || Promise.resolve();
  const next = prev.then(() => store.set(k, JSON.stringify(cache.get(k)))).catch(e => console.error('Профіль не збережено:', e.message));
  chains.set(k, next); return next;
}
function saveLater(pid, ms = 3000) { const k = keyOf(pid); if (!timers.has(k)) timers.set(k, setTimeout(() => { timers.delete(k); save(pid); }, ms)); }

async function load(pid, create, name) {
  if (!PID_RE.test(pid || '')) return null;
  const k = keyOf(pid);
  if (cache.has(k)) return cache.get(k);
  let p = null;
  try { const raw = await store.get(k); if (raw) p = JSON.parse(raw); } catch (e) { console.error('Профіль не прочитано:', e.message); return null; }
  if (!p && create) { p = blank(name); }
  if (p) { cache.set(k, p); if (create && p.created > Date.now() - 2000) save(pid); }
  return p;
}
const exists = async pid => !!(await load(pid, false));

function view(p) {
  const lvl = levelOf(p.xp), cur = xpAt(lvl), nxt = xpAt(lvl + 1);
  return { name: p.name, xp: p.xp, stars: p.stars, level: lvl, title: titleOf(lvl), xpCur: p.xp - cur, xpNeed: nxt - cur, games: p.games, tot: p.tot, streak: p.streak, best: p.best, days: p.days, ach: p.ach, hist: p.hist };
}

function grant(p, stars, xp) {                       // додає нагороду; повертає, чи піднявся рівень
  const before = levelOf(p.xp); p.stars += stars; p.xp += xp; const after = levelOf(p.xp);
  return after > before ? after : 0;
}

// Щоденний бонус при вході.
async function daily(pid) {
  const p = await load(pid, false); if (!p) return null;
  const today = day(); if (p.days.last === today) return null;
  p.days.streak = p.days.last === yesterday() ? p.days.streak + 1 : 1; p.days.best = Math.max(p.days.best, p.days.streak); p.days.last = today;
  const stars = 10 + Math.min(p.days.streak, 7) * 2, up = grant(p, stars, 10);
  const newAch = ach.evaluate(p, null); newAch.forEach(a => { p.stars += a.stars; });
  await save(pid);
  return { daily: { stars, streak: p.days.streak }, xp: 10, ach: newAch, levelUp: up, profile: view(p) };
}

// Підсумок завершеної гри. facts: { game, result:'w'|'l'|'d', bot, diff, dur, punished, ...факти гри }
async function award(pid, facts) {
  const p = await load(pid, false); if (!p) return null;
  if (facts.dur < MIN_GAME_MS) return { short: true, stars: 0, xp: 0, ach: [], profile: view(p) };
  const g = p.games[facts.game] || (p.games[facts.game] = { p: 0, w: 0, l: 0, d: 0 });
  const r = facts.result;
  g.p++; g[r]++; p.tot.p++; p.tot[r]++; if (!facts.bot) p.tot.human++;
  if (r === 'w') { p.streak++; p.best = Math.max(p.best, p.streak); } else if (r === 'l') p.streak = 0;
  if (facts.punished) p.tot.pun++;
  let { stars, xp } = REWARD[r];
  if (facts.bot) {
    stars = Math.floor(stars / 2); xp = Math.floor(xp / 2);
    const today = day(); if (p.botStars.day !== today) p.botStars = { day: today, n: 0 };
    stars = Math.max(0, Math.min(stars, BOT_STARS_CAP - p.botStars.n)); p.botStars.n += stars;
  }
  p.hist.push({ g: facts.game, r, bot: !!facts.bot, ts: Date.now() }); if (p.hist.length > 20) p.hist.shift();
  const up = grant(p, stars, xp);
  const newAch = ach.evaluate(p, facts); let bonus = 0; newAch.forEach(a => { bonus += a.stars; }); p.stars += bonus;
  const up2 = levelOf(p.xp) > (up || levelOf(p.xp - xp)) ? levelOf(p.xp) : up;
  await save(pid);
  return { stars, xp, bonus, ach: newAch, levelUp: up2, result: r, game: facts.game, profile: view(p) };
}

async function awardMarathon(pid, won) {
  const p = await load(pid, false); if (!p) return null;
  p.tot.mar++; const stars = 25 + (won ? 15 : 0), xp = 50;
  const up = grant(p, stars, xp), newAch = ach.evaluate(p, null); newAch.forEach(a => { p.stars += a.stars; });
  await save(pid);
  return { marathon: true, stars, xp, ach: newAch, levelUp: up, profile: view(p) };
}

// Лічильники чату/реакцій (збереження відкладене).
async function bump(pid, field) {
  const p = await load(pid, false); if (!p) return null;
  p.tot[field]++; const newAch = ach.evaluate(p, null); let bonus = 0; newAch.forEach(a => { bonus += a.stars; }); p.stars += bonus;
  if (newAch.length) { await save(pid); return { ach: newAch, stars: 0, bonus, xp: 0, profile: view(p) }; }
  saveLater(pid); return null;
}

function setName(pid, name) { const k = keyOf(pid), p = cache.get(k); if (p && name && p.name !== name) { p.name = name.slice(0, 20); saveLater(pid, 1000); } }
function flushAll() { for (const [k, t] of timers) { clearTimeout(t); } timers.clear(); if (store.flush) store.flush(); }

module.exports = {
  PID_RE, load, exists, view, daily, award, awardMarathon, bump, setName, flushAll, levelOf, titleOf, xpAt,
  _setStore(s) { store = s; cache.clear(); chains.clear(); }, _store: () => store, _day: day,
};
