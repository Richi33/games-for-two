// Збирає lang_en.js / lang_ru.js із lang/en.json та lang/ru.json (ключ — українська фраза).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
for (const l of ['en', 'ru']) {
  const d = JSON.parse(fs.readFileSync(path.join(root, 'lang', l + '.json'), 'utf8'));
  const sorted = Object.fromEntries(Object.entries(d).sort(([a], [b]) => a.localeCompare(b, 'uk')));
  fs.writeFileSync(path.join(root, 'lang', l + '.json'), JSON.stringify(sorted, null, 1) + '\n');
  fs.writeFileSync(path.join(root, 'lang_' + l + '.js'), '// Згенеровано tools/build_lang.js — не редагуйте вручну (джерело: lang/' + l + '.json)\nwindow.I18N_DICT = ' + JSON.stringify(sorted) + ';\n');
  console.log(l, Object.keys(d).length);
}
