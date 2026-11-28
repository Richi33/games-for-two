// Адмінка: модерація контенту ігор, вмикання/вимикання ігор, ціни скілів, нагороди.
// Вхід — за кодом профілю (pid), що перелічений у змінній ADMIN_PIDS (через кому). Без неї адмінка вимкнена.
// Зміни зберігаються в тому ж сховищі, що й профілі (ключ gft:cfg), і застосовуються одразу.
const crypto = require('crypto');
const profiles = require('./profiles');
const skills = require('./skills');
const content = require('./content');
const content2 = require('./content2');
const games2 = require('./games2');

const KEY = 'gft:cfg', MAX_ITEMS = 1500, MAX_TEXT = 220;
const clone = x => JSON.parse(JSON.stringify(x));
const hid = x => crypto.createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 8);
const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const bad = m => { const e = new Error(m); e.user = true; return e; };
const parts = (text, sep) => String(text).split(sep).map(norm);
const chk = (arr, min, max) => { if (arr.length < min || arr.length > max) throw bad(`Потрібно від ${min} до ${max} частин, розділених «|»`); arr.forEach(x => { if (!x) throw bad('Порожня частина'); if (x.length > MAX_TEXT) throw bad('Задовгий текст (макс. ' + MAX_TEXT + ')'); }); return arr; };

// ---- формати колекцій: item <-> текстовий рядок ----
const F = {
  str: { to: x => x, from: t => { t = norm(t); if (!t) throw bad('Порожній текст'); if (t.length > MAX_TEXT) throw bad('Задовгий текст (макс. ' + MAX_TEXT + ')'); return t; }, hint: 'Один рядок тексту' },
  black: { to: x => x, from: t => { t = F.str.from(t); if (!t.includes('___')) throw bad('У чорній карті має бути пропуск ___'); return t; }, hint: 'Текст із пропуском ___' },
  quiz: { to: x => x.join(' | '), from: t => { const a = chk(parts(t, '|'), 5, 5); return a; }, hint: 'Питання | правильна відповідь | хибна 1 | хибна 2 | хибна 3' },
  row: { to: x => x.join(' | '), from: t => chk(parts(t, '|'), 3, 3), hint: 'Варіант 1 | варіант 2 | варіант 3 (рівно три)' },
  know: {
    to: x => (x.k === 's' ? `${x.q} ~ ${x.lo} ~ ${x.hi}` : [x.q, ...x.o].join(' | ')),
    from: t => {
      if (String(t).includes('~')) { const a = chk(parts(t, '~'), 3, 3); return { k: 's', q: a[0], lo: a[1], hi: a[2], o: [1, 2, 3, 4, 5] }; }
      const a = chk(parts(t, '|'), 3, 6); return { k: 'c', q: a[0], o: a.slice(1) };
    },
    hint: 'Питання | варіант 1 | варіант 2 | … (2–5 варіантів)   або шкала: Питання ~ мінімум ~ максимум',
  },
};

// ---- реєстр колекцій ----
const COLS = new Map();
function reg(id, group, title, arr, fmt) { COLS.set(id, { id, group, title, arr, fmt, base: clone(arr) }); }
reg('quiz', 'Вікторина', 'Питання вікторини', games2._QB, F.quiz);
reg('puns', 'Колесо', 'Покарання за замовчуванням', content.DEFAULT_PUNS, F.str);
for (const mode of ['normal', 'adult']) {
  const m = mode === 'adult' ? '18+' : 'звичайний';
  content.WYR[mode].forEach(t => reg(`wyr.${mode}.${t.id}`, 'Що б обрав ти (' + m + ')', `${t.e} ${t.n}`, t.rows, F.row));
  reg(`know.${mode}`, 'Наскільки добре знаєш', 'Питання (' + m + ')', content.KNOW[mode], F.know);
  reg(`tod.${mode}.t`, 'Правда або дія', 'Правда (' + m + ')', content.TOD[mode].t, F.str);
  reg(`tod.${mode}.d`, 'Правда або дія', 'Дія (' + m + ')', content.TOD[mode].d, F.str);
  reg(`black.${mode}`, 'Чорні карти', 'Чорні карти (' + m + ')', content2.BLACK[mode], F.black);
  reg(`white.${mode}`, 'Чорні карти', 'Білі карти (' + m + ')', content2.WHITE[mode], F.str);
}
for (const [pid, p] of Object.entries(content2.PACKS)) {
  if (p.black !== content2.BLACK.normal) reg(`black.pack.${pid}`, 'Чорні карти (пакети)', `${p.e} ${p.n}: чорні`, p.black, F.black);
  if (p.white && p.white.length) reg(`white.pack.${pid}`, 'Чорні карти (пакети)', `${p.e} ${p.n}: білі`, p.white, F.str);
}

// ---- налаштування (зберігаються) ----
let cfg = { v: 1, content: {}, games: {}, skills: {}, rewards: {}, log: [] };
const ov = id => cfg.content[id] || (cfg.content[id] = { hidden: [], edited: {}, added: [] });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function rows(col) {                       // усі записи колекції зі статусами
  const o = cfg.content[col.id] || { hidden: [], edited: {}, added: [] };
  const out = col.base.map(it => {
    const id = hid(it), hidden = o.hidden.includes(id), ed = o.edited[id];
    return { id, text: col.fmt.to(ed || it), status: hidden ? 'hidden' : ed ? 'edited' : 'base', orig: ed ? col.fmt.to(it) : undefined };
  });
  o.added.forEach(it => out.push({ id: 'a' + hid(it), text: col.fmt.to(it), status: 'added' }));
  return out;
}
function applyCol(col) {                   // перебудовує живий масив «на місці»
  const o = cfg.content[col.id] || { hidden: [], edited: {}, added: [] };
  const merged = col.base.filter(it => !o.hidden.includes(hid(it))).map(it => clone(o.edited[hid(it)] || it)).concat(o.added.map(clone));
  col.arr.length = 0; col.arr.push(...merged);
}
function applyAll() { COLS.forEach(applyCol); skills.apply(cfg.skills); profiles.setRewards(cfg.rewards); }
const logAct = (who, text) => { cfg.log.unshift({ t: Date.now(), who, text }); cfg.log.length = Math.min(cfg.log.length, 80); };

let saveChain = Promise.resolve();
const save = () => (saveChain = saveChain.then(() => profiles.kv.set(KEY, JSON.stringify(cfg))).catch(e => console.error('Налаштування адмінки не збережено:', e.message)));
async function load() {
  try { const raw = await profiles.kv.get(KEY); if (raw) { const c = JSON.parse(raw); cfg = { v: 1, content: c.content || {}, games: c.games || {}, skills: c.skills || {}, rewards: c.rewards || {}, log: c.log || [] }; } }
  catch (e) { console.error('Налаштування адмінки не прочитано:', e.message); }
  applyAll();
}

// ---- операції з контентом ----
function colOp(col, body, who) {
  const snap = cfg.content[col.id] ? clone(cfg.content[col.id]) : undefined;
  const o = ov(col.id), op = body.op;
  if (op === 'add') {
    if (rows(col).filter(r => r.status !== 'hidden').length >= MAX_ITEMS) throw bad('Забагато записів у колекції');
    const it = col.fmt.from(body.text), h = 'a' + hid(it);
    if (rows(col).some(r => r.id === h || (r.status !== 'hidden' && same(r.text, col.fmt.to(it))))) throw bad('Такий запис уже є');
    o.added.push(it); logAct(who, `+ ${col.title}: ${col.fmt.to(it)}`);
  } else if (op === 'edit') {
    const it = col.fmt.from(body.text), id = String(body.id || '');
    if (id.startsWith('a')) { const i = o.added.findIndex(x => 'a' + hid(x) === id); if (i < 0) throw bad('Запис не знайдено'); o.added[i] = it; }
    else { const b = col.base.find(x => hid(x) === id); if (!b) throw bad('Запис не знайдено'); if (same(b, it)) delete o.edited[id]; else o.edited[id] = it; o.hidden = o.hidden.filter(x => x !== id); }
    logAct(who, `✎ ${col.title}: ${col.fmt.to(it)}`);
  } else if (op === 'delete') {
    const id = String(body.id || '');
    if (id.startsWith('a')) { const i = o.added.findIndex(x => 'a' + hid(x) === id); if (i < 0) throw bad('Запис не знайдено'); logAct(who, `− ${col.title}: ${col.fmt.to(o.added[i])}`); o.added.splice(i, 1); }
    else { const b = col.base.find(x => hid(x) === id); if (!b) throw bad('Запис не знайдено'); if (!o.hidden.includes(id)) o.hidden.push(id); logAct(who, `− ${col.title}: ${col.fmt.to(b)}`); }
  } else if (op === 'restore') {
    const id = String(body.id || ''); o.hidden = o.hidden.filter(x => x !== id); delete o.edited[id]; logAct(who, `↩ ${col.title}`);
  } else if (op === 'reset') { delete cfg.content[col.id]; logAct(who, `⟲ скинуто колекцію «${col.title}»`); }
  else throw bad('Невідома дія');
  if (op !== 'reset' && rows(col).filter(r => r.status !== 'hidden').length < 1) {   // не даємо спорожнити колекцію
    if (snap) cfg.content[col.id] = snap; else delete cfg.content[col.id];
    throw bad('Не можна видалити всі записи колекції (скористайтесь «Скинути»)');
  }
  applyCol(col);
}

// ---- API ----
const adminPids = () => String(process.env.ADMIN_PIDS || '').split(',').map(s => s.trim().toLowerCase()).filter(s => profiles.PID_RE.test(s));
const h256 = s => crypto.createHash('sha256').update(s).digest();
const fails = new Map();
function auth(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const f = fails.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - f.t > 600000) { f.n = 0; f.t = Date.now(); }
  if (f.n >= 15) return { code: 429, msg: 'Забагато спроб. Зачекайте 10 хвилин.' };
  const list = adminPids();
  if (!list.length) return { code: 403, msg: 'Адмінка вимкнена: задайте змінну ADMIN_PIDS' };
  const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim().toLowerCase();
  const ok = profiles.PID_RE.test(given) && list.some(p => crypto.timingSafeEqual(h256(p), h256(given)));
  if (!ok) { f.n++; fails.set(ip, f); return { code: 401, msg: 'Невірний код' }; }
  return { ok: true, who: given.slice(0, 6) + '…' };
}
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
function readBody(req) {
  return new Promise((ok, no) => { let b = ''; req.on('data', c => { b += c; if (b.length > 60000) { no(bad('Завеликий запит')); req.destroy(); } }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { no(bad('Невірний JSON')); } }); });
}

// ctx: { games: { id: {e,n} }, stats(): {...} }
async function handle(req, res, ctx) {
  const url = req.url.split('?')[0];
  if (!url.startsWith('/api/admin/')) return false;
  const a = auth(req);
  if (!a.ok) { json(res, a.code, { error: a.msg }); return true; }
  try {
    if (req.method === 'GET' && url === '/api/admin/overview') {
      json(res, 200, {
        cols: [...COLS.values()].map(c => { const r = rows(c); return { id: c.id, group: c.group, title: c.title, hint: c.fmt.hint, total: r.filter(x => x.status !== 'hidden').length, changed: r.filter(x => x.status !== 'base').length }; }),
        games: ctx.games().map(g => ({ id: g.id, e: g.e, n: g.n, off: !!(cfg.games[g.id] && cfg.games[g.id].off) })),
        skills: skills.CATALOG.map(s => ({ id: s.id, icon: s.icon, name: s.name, fam: s.fam, price: s.price, basePrice: s.basePrice, off: s.off })),
        rewards: profiles.getRewards(), baseRewards: profiles.baseRewards(), log: cfg.log.slice(0, 40), stats: ctx.stats(),
      }); return true;
    }
    let m = url.match(/^\/api\/admin\/col\/([\w.]+)$/);
    if (m) {
      const col = COLS.get(m[1]); if (!col) { json(res, 404, { error: 'Колекції немає' }); return true; }
      if (req.method === 'POST') { const body = await readBody(req); colOp(col, body, a.who); await save(); }
      json(res, 200, { id: col.id, title: col.title, hint: col.fmt.hint, items: rows(col) }); return true;
    }
    if (req.method === 'POST' && url === '/api/admin/games') {
      const b = await readBody(req); const g = ctx.games().find(x => x.id === b.id); if (!g) throw bad('Невідома гра');
      const off = b.off === true; const now = ctx.games().filter(x => !(cfg.games[x.id] && cfg.games[x.id].off) && x.id !== g.id).length;
      if (off && now < 1) throw bad('Має лишитись хоча б одна увімкнена гра');
      cfg.games[g.id] = { off }; logAct(a.who, `${off ? '⛔ вимкнено' : '✅ увімкнено'} гру ${g.n}`); ctx.onGamesChanged && ctx.onGamesChanged(); await save(); json(res, 200, { ok: true }); return true;
    }
    if (req.method === 'POST' && url === '/api/admin/skills') {
      const b = await readBody(req); const s = skills.byId(b.id); if (!s) throw bad('Невідомий скіл');
      const cur = cfg.skills[s.id] || {};
      const price = b.price === undefined ? cur.price : Number(b.price); if (price !== undefined && !(Number.isInteger(price) && price >= 0 && price <= 10000)) throw bad('Ціна: ціле число 0–10000');
      cfg.skills[s.id] = { price, off: b.off === undefined ? !!cur.off : b.off === true };
      skills.apply(cfg.skills); logAct(a.who, `скіл ${s.name}: ціна ${s.price}, ${s.off ? 'вимкнено' : 'увімкнено'}`); await save(); json(res, 200, { ok: true }); return true;
    }
    if (req.method === 'POST' && url === '/api/admin/rewards') {
      const b = await readBody(req); cfg.rewards = b.reset ? {} : (b.rewards || {}); profiles.setRewards(cfg.rewards); cfg.rewards = profiles.getRewards();
      logAct(a.who, 'нагороди за гру оновлено'); await save(); json(res, 200, { ok: true, rewards: profiles.getRewards() }); return true;
    }
    json(res, 404, { error: 'Невідомий запит' }); return true;
  } catch (e) {
    if (e.user) json(res, 400, { error: e.message }); else { console.error(e); json(res, 500, { error: 'Помилка сервера' }); }
    return true;
  }
}

// назви ігор беремо з клієнтського списку GAMES (app.js)
const GAME_LIST = (() => { try { const src = require('fs').readFileSync(require('path').join(__dirname, 'app.js'), 'utf8'); return [...src.matchAll(/\{id:'(\w+)',e:'([^']+)',n:'([^']+)'/g)].map(m => ({ id: m[1], e: m[2], n: m[3] })); } catch (e) { return []; } })();
const gameOff = id => !!(cfg.games[id] && cfg.games[id].off);
const offList = () => Object.keys(cfg.games).filter(gameOff);
module.exports = { GAME_LIST, load, handle, gameOff, offList, _cfg: () => cfg, _COLS: COLS, _rows: rows, _colOp: colOp, _applyAll: applyAll, _reset: () => { cfg = { v: 1, content: {}, games: {}, skills: {}, rewards: {}, log: [] }; applyAll(); } };
