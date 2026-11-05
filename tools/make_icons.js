// Генерує іконки PWA (запуск: node tools/make_icons.js; потрібен playwright).
const { chromium } = require('playwright');
const path = require('path');
const art = (round, size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b7bff"/><stop offset="1" stop-color="#3b2f9e"/></linearGradient>
<linearGradient id="x" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cc0ff"/><stop offset="1" stop-color="#3b82f0"/></linearGradient>
<linearGradient id="o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9cc4"/><stop offset="1" stop-color="#ee4a8a"/></linearGradient></defs>
<rect width="512" height="512" rx="${round ? 112 : 0}" fill="url(#g)"/>
<g stroke-linecap="round" fill="none">
<path d="M118 190 L228 300 M228 190 L118 300" stroke="url(#x)" stroke-width="42"/>
<circle cx="338" cy="245" r="62" stroke="url(#o)" stroke-width="40"/></g>
<g fill="#fff" opacity=".95"><rect x="150" y="352" width="212" height="22" rx="11" opacity=".35"/>
<circle cx="256" cy="130" r="14"/><circle cx="210" cy="130" r="9" opacity=".7"/><circle cx="302" cy="130" r="9" opacity=".7"/></g>
</svg>`;
(async () => {
  const br = await chromium.launch(), pg = await br.newPage();
  for (const [file, round, size] of [['icon-192.png', true, 192], ['icon-512.png', true, 512], ['icon-maskable-512.png', false, 512], ['icon-180.png', false, 180]]) {
    await pg.setViewportSize({ width: size, height: size });
    await pg.setContent(`<body style="margin:0;background:transparent">${art(round, size)}</body>`);
    await pg.screenshot({ path: path.join(__dirname, '..', file), omitBackground: true });
  }
  require('fs').writeFileSync(path.join(__dirname, '..', 'favicon.svg'), art(true, 64));
  await br.close();
})();
