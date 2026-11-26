const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const ph = s => (s.match(/\{\d+\}/g) || []).sort().join();
const load = l => JSON.parse(fs.readFileSync(path.join(root, 'lang', l + '.json'), 'utf8'));

test('кожна україномовна фраза в коді має переклад en і ru з тими самими {n}', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-')), 'keys.json');
  const r = spawnSync(process.execPath, [path.join(root, 'tools', 'i18n_extract.js'), root, out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const keys = JSON.parse(fs.readFileSync(out, 'utf8'));
  for (const l of ['en', 'ru']) {
    const d = load(l);
    const miss = keys.filter(x => !d[x.k] || typeof d[x.k] !== 'string');
    assert.deepEqual(miss.map(x => x.k + ' ← ' + x.f.join(',')), [], `${l}: немає перекладу (додайте в lang/${l}.json і запустіть node tools/build_lang.js)`);
    const bad = keys.filter(x => ph(x.k) !== ph(d[x.k]));
    assert.deepEqual(bad.map(x => x.k), [], `${l}: різні {n} у перекладі`);
  }
});

test('lang_en.js / lang_ru.js відповідають lang/*.json', () => {
  for (const l of ['en', 'ru']) {
    const js = fs.readFileSync(path.join(root, 'lang_' + l + '.js'), 'utf8');
    const m = js.match(/window\.I18N_DICT = (.*);\n$/s);
    assert.ok(m, 'формат lang_' + l + '.js');
    assert.deepEqual(JSON.parse(m[1]), load(l), `lang_${l}.js застарів: node tools/build_lang.js`);
  }
});

test('рушій перекладу: точні фрази, шаблони, емодзі по краях, порожні змінні', () => {
  const dict = { 'Ваш хід': 'Your turn', 'Раунд {0}/{1} · {2}:{3}': 'Round {0}/{1} · {2}:{3}', 'Скіли діють{0}.': 'Skills work{0}.', 'Піца': 'Pizza', '· клітинки {0}:{1}': '· boxes {0}:{1}', 'Днів поспіль: {1}': 'Days in a row: {1}', '{2} · рівень {3}': 'Level {3} · {2}' };
  const sandbox = { window: { I18N_DICT: dict }, localStorage: { gft_lang: 'en' }, navigator: { language: 'en' }, document: { documentElement: {}, body: null, addEventListener() {}, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), head: { appendChild() {} } }, MutationObserver: class { observe() {} }, Intl };
  sandbox.window.alert = () => {}; sandbox.window.confirm = () => {}; sandbox.window.prompt = () => {};
  const vm = require('node:vm'); sandbox.self = sandbox.window; Object.assign(sandbox, sandbox.window);
  vm.runInNewContext(fs.readFileSync(path.join(root, 'i18n.js'), 'utf8'), sandbox);
  const { tr, tf, rk } = sandbox.window;
  assert.equal(tr('Ваш хід'), 'Your turn');
  assert.equal(tr('  Ваш хід \n'), '  Your turn \n');
  assert.equal(tr('🟢 Ваш хід'), '🟢 Your turn');
  assert.equal(tr('Раунд 2/7 · 3:1'), 'Round 2/7 · 3:1');
  assert.equal(tr('Скіли діють.'), 'Skills work.');
  assert.equal(tr('🟢 Ваш хід · клітинки 2:1'), '🟢 Your turn · boxes 2:1');
  assert.equal(tr('Днів поспіль: 5'), 'Days in a row: 5');
  assert.equal(tr('Аня · рівень 3'), 'Level 3 · Аня');
  assert.equal(tr('Невідомо'), 'Невідомо');
  assert.equal(tr('Аня'), 'Аня');
  assert.equal(tf('Раунд {0}/{1} · {2}:{3}', 1, 7, 0, 0), 'Round 1/7 · 0:0');
  assert.equal(rk('В♠'), 'J♠'); assert.equal(rk('10♥'), '10♥');
});
