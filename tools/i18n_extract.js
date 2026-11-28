// Витягує всі україномовні тексти з коду: рядки, шаблони (з {0} замість ${}), конкатенації, HTML-сегменти й атрибути.
const acorn = require('acorn');
const fs = require('fs'), path = require('path');
const ROOT = process.argv[2] || path.join(__dirname, '..');
const CYR = /[А-Яа-яІіЇїЄєҐґ]/;
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&middot;': '·' };
const dec = s => s.replace(/&(amp|lt|gt|quot|nbsp|middot|#39);/g, m => ENT[m]).replace(/ /g, ' ');
const norm = s => dec(s).replace(/\s+/g, ' ').trim();
const keys = new Map();           // key -> Set(files)
const isAlpha = k => /^[а-яіїєґё]{26,}$/i.test(k) || /^[А-Яа-яІіЇїЄєҐґ]$/.test(k);
const add = (k, f) => { k = norm(k); if (isAlpha(k)) return; if (!k || !CYR.test(k.replace(/\{\d+\}/g, ''))) return; if (!keys.has(k)) keys.set(k, new Set()); keys.get(k).add(f); };

// розбиває HTML-фрагмент (з {n}) на текстові сегменти й атрибути
function addHtml(s, f) {
  const attrRe = /\b(placeholder|title|alt|aria-label)\s*=\s*"([^"]*)"/g;
  let m; while ((m = attrRe.exec(s))) add(m[2], f);
  s.split(/<[^>]*>/).forEach(seg => add(seg, f));
}
const lit = (n, f) => { if (f === 'content.js' && n.includes('|')) n.split('|').forEach(x => addHtml(x, f)); else addHtml(n, f); };

function flatten(n, out) {                 // a + b + c  →  [a,b,c]
  if (n.type === 'BinaryExpression' && n.operator === '+') { flatten(n.left, out); flatten(n.right, out); } else out.push(n);
  return out;
}
const SKIP_VARS = new Set(['WORDS', 'WORDS_E', 'WORDS_H', 'WORDS_RU', 'WORDS_RU_E', 'WORDS_RU_H']);
function walk(node, src, f, parent) {
  if (!node || typeof node.type !== 'string') return;
  if (node.type === 'VariableDeclarator' && node.id && SKIP_VARS.has(node.id.name)) return;
  switch (node.type) {
    case 'Literal': if (typeof node.value === 'string' && CYR.test(node.value)) lit(node.value, f); break;
    case 'TemplateLiteral': {
      let s = '';
      node.quasis.forEach((q, i) => { s += q.value.cooked; if (i < node.expressions.length) s += '{' + i + '}'; });
      if (CYR.test(s)) addHtml(s, f);
      break;
    }
    case 'BinaryExpression':
      if (node.operator === '+' && !(parent && parent.type === 'BinaryExpression' && parent.operator === '+')) {
        const parts = flatten(node, []); let s = '', n = 0, has = false;
        for (const p of parts) {
          if (p.type === 'Literal' && typeof p.value === 'string') { s += p.value; if (CYR.test(p.value)) has = true; }
          else if (p.type === 'TemplateLiteral' && p.expressions.length === 0) { s += p.quasis[0].value.cooked; if (CYR.test(p.quasis[0].value.cooked)) has = true; }
          else s += '{' + (n++) + '}';
        }
        if (has && n > 0) addHtml(s, f);
      }
      break;
  }
  for (const k in node) {
    if (k === 'type' || k === 'start' || k === 'end') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach(c => c && c.type && walk(c, src, f, node)); else if (v && typeof v.type === 'string') walk(v, src, f, node);
  }
}
const files = fs.readdirSync(ROOT).filter(x => /\.(js|html)$/.test(x) && !/^(sw\.js|i18n\.js|admin\.js|admin_ui\.js|admin\.html|lang_.*\.js)$/.test(x));
for (const fn of files) {
  const src = fs.readFileSync(path.join(ROOT, fn), 'utf8');
  if (fn.endsWith('.html')) {
    src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').split(/(?=<)/).forEach(() => {}); 
    addHtml(src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ''), fn);
    // скрипти в html (offline)
    continue;
  }
  let ast; try { ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true }); } catch (e) { console.error('parse fail', fn, e.message); continue; }
  walk(ast, src, fn, null);
}
const out = [...keys.entries()].map(([k, fs_]) => ({ k, f: [...fs_] }));
fs.writeFileSync(process.argv[3] || 'keys.json', JSON.stringify(out, null, 0));
const bytes = out.reduce((a, x) => a + x.k.length, 0);
console.log('keys', out.length, 'chars', bytes);
const byFile = {}; out.forEach(x => x.f.forEach(f => byFile[f] = (byFile[f] || 0) + 1)); console.log(byFile);
