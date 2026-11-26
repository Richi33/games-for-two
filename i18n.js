// Переклад інтерфейсу: 🇺🇦 українська (оригінал), 🇬🇧 англійська, 🇷🇺 російська.
// Ключ словника — українська фраза; фрази зі змінними записані як «{0} · раунд {1}».
// Усе, що з'являється на екрані (у т.ч. тексти з сервера), перекладається автоматично: див. MutationObserver нижче.
(function () {
  const SUP = ['uk', 'en', 'ru'], NAMES = { uk: ['🇺🇦', 'UA', 'Українська'], en: ['🇬🇧', 'EN', 'English'], ru: ['🇷🇺', 'RU', 'Русский'] };
  let L = null;
  try { L = localStorage.gft_lang; } catch (e) {}
  if (!SUP.includes(L)) { const n = String(navigator.language || 'uk').slice(0, 2).toLowerCase(); L = n === 'uk' || n === 'ru' ? n : 'en'; }
  const D = L === 'uk' ? {} : (window.I18N_DICT || {});
  document.documentElement.lang = L;
  const CYR = /[А-Яа-яІіЇїЄєҐґ]/;
  const norm = s => s.replace(/[\s ]+/g, ' ').trim();
  const exact = new Map(), pats = [];
  for (const k in D) {
    if (/\{\d+\}/.test(k)) {
      const re = new RegExp('^' + k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\d+\}/g, '([\\s\\S]*?)') + '$');
      pats.push({ re, to: D[k], ids: [...k.matchAll(/\{(\d+)\}/g)].map(x => +x[1]), len: k.replace(/\{\d+\}/g, '').length });
    } else exact.set(norm(k), D[k]);
  }
  pats.sort((a, b) => b.len - a.len);                         // конкретніші шаблони першими
  const cache = new Map();
  const fill = (t, m, ids) => t.replace(/\{(\d+)\}/g, (_, i) => { const g = ids.indexOf(+i) + 1; return g > 0 && m[g] != null ? m[g] : ''; });
  // Перекладає один рядок (без пробілів по краях). Повертає null, якщо перекладу немає.
  function look1(core) {
    if (cache.has(core)) return cache.get(core);
    let r = exact.has(core) ? exact.get(core) : null;
    if (r == null) for (const p of pats) { const m = core.match(p.re); if (m) { r = fill(p.to, m, p.ids); r = translateInner(r, m); break; } }
    if (cache.size > 4000) cache.clear();
    cache.set(core, r); return r;
  }
  const EDGE = /^([^\p{L}]*)([\s\S]*?)([^\p{L}\p{N}?!.…)»”"]*)$/u;
  // Перекладає один рядок (без пробілів по краях). Якщо повного збігу немає — пробує без емодзі/розділових знаків по краях.
  function look(core) {
    let r = look1(core); if (r != null) return r;
    const m = core.match(EDGE);
    if (m && m[2] && m[2] !== core && CYR.test(m[2])) { const t = look1(m[2]); if (t != null) return m[1] + t + m[3]; }
    // складений рядок «Ваш хід · клітинки 0:0» — перекладаємо частини між « · » окремо
    if (core.includes(' · ')) {
      const parts = core.split(' · '); let hit = false;
      const out = parts.map((p, i) => {
        let t = i ? look1('· ' + p) : null; if (t != null) { hit = true; return t.replace(/^· ?/, ''); }
        t = look1(p); if (t == null && CYR.test(p)) { const e = p.match(EDGE); if (e && e[2] && e[2] !== p) { const t2 = look1(e[2]); if (t2 != null) t = e[1] + t2 + e[3]; } }
        if (t != null) hit = true; return t == null ? p : t;
      });
      if (hit) return out.join(' · ');
    }
    return null;
  }
  // Змінні, що самі є українськими фразами (назви, питання тощо), теж перекладаємо в уже готовому рядку.
  function translateInner(r, m) {
    for (let i = 1; i < m.length; i++) { const v = m[i]; if (v && CYR.test(v)) { const t = look(norm(v)); if (t != null && t !== norm(v)) r = r.split(v).join(t); } }
    return r;
  }
  function tr(s) {
    if (L === 'uk' || typeof s !== 'string' || !CYR.test(s)) return s;
    const mm = s.match(/^(\s*)([\s\S]*?)(\s*)$/), core = norm(mm[2]);
    const r = look(core); return r == null ? s : mm[1] + r + mm[3];
  }
  // tf('{0}: {1} спроб', name, n) — переклад шаблону й підстановка значень (для складання рядків у коді)
  function tf(key, ...args) { const t = L === 'uk' ? key : (exact.get(key) || D[key] || key); return t.replace(/\{(\d+)\}/g, (_, i) => (args[+i] != null ? args[+i] : '')); }
  // Літери рангів карт: В Д К Т → J Q K A в англійській версії (у російській і українській однакові)
  const RANK = { 'В': 'J', 'Д': 'Q', 'К': 'K', 'Т': 'A' };
  window.rk = s => (L === 'en' ? String(s).replace(/^[ВДКТ](?=[♠♥♦♣]|$)/, m => RANK[m]) : s);
  window.tr = tr; window.tf = tf; window.LANG = L;

  if (L !== 'uk') {
    const ATTR = ['placeholder', 'title', 'alt', 'aria-label'];
    const skip = n => { const p = n.parentNode; return p && p.nodeType === 1 && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.tagName === 'TEXTAREA' || p.closest && p.closest('[data-notr]')); };
    function text(n) { const v = n.nodeValue; if (v && CYR.test(v) && !skip(n)) { const r = tr(v); if (r !== v) n.nodeValue = r; } }
    function attrs(el) { for (const a of ATTR) { const v = el.getAttribute && el.getAttribute(a); if (v && CYR.test(v)) { const r = tr(v); if (r !== v) el.setAttribute(a, r); } } }
    function walk(n) {
      if (n.nodeType === 3) return text(n);
      if (n.nodeType !== 1) return;
      if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.hasAttribute('data-notr')) return;
      attrs(n);
      for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
    }
    const mo = new MutationObserver(recs => {
      for (const r of recs) {
        if (r.type === 'childList') r.addedNodes.forEach(walk);
        else if (r.type === 'characterData') text(r.target);
        else if (r.type === 'attributes') attrs(r.target);
      }
    });
    const start = () => {
      document.title = tr(document.title); walk(document.body);
      mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR });
    };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
    for (const f of ['alert', 'confirm', 'prompt']) { const o = window[f].bind(window); window[f] = (m, ...a) => o(tr(String(m)), ...a); }
  }

  // ---------- перемикач мови (верхній правий кут) ----------
  function ui() {
    const st = document.createElement('style');
    st.textContent = `#lgBtn{position:fixed;top:8px;right:8px;z-index:90;width:auto;margin:0;padding:6px 10px;border-radius:18px;font-size:13px;font-weight:700;background:var(--card);color:var(--tx);box-shadow:0 2px 8px #0004}
#lgMenu{position:fixed;top:44px;right:8px;z-index:91;background:var(--card);border-radius:14px;box-shadow:0 6px 22px #0007;padding:6px;display:none;min-width:150px}
#lgMenu button{display:block;width:100%;margin:0;text-align:left;background:none;color:var(--tx);padding:9px 12px;border-radius:10px;font-size:15px}
#lgMenu button.on{background:var(--card2);font-weight:700}#conn{right:78px!important}
#app>.bar:first-child{padding-right:62px}#app>h1:first-child{margin-top:46px}`;
    document.head.appendChild(st);
    const b = document.createElement('button'), m = document.createElement('div');
    b.id = 'lgBtn'; b.setAttribute('data-notr', ''); b.setAttribute('aria-label', 'Language'); b.textContent = NAMES[L][0] + ' ' + NAMES[L][1];
    m.id = 'lgMenu'; m.setAttribute('data-notr', '');
    SUP.forEach(c => { const o = document.createElement('button'); o.textContent = NAMES[c][0] + '  ' + NAMES[c][2]; if (c === L) o.className = 'on'; o.onclick = () => { try { localStorage.gft_lang = c; } catch (e) {} location.reload(); }; m.appendChild(o); });
    b.onclick = e => { e.stopPropagation(); m.style.display = m.style.display === 'block' ? 'none' : 'block'; };
    document.addEventListener('click', () => { m.style.display = 'none'; });
    document.body.append(b, m);
  }
  if (document.body) ui(); else document.addEventListener('DOMContentLoaded', ui);
})();
