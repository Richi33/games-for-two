// Лобі: власні питання/завдання/карти («про вас») і тематичні пакети.
(function () {
  const WHAT = {
    know: { title: 'Свої питання (Наскільки добре знаєш)', ph: 'Питання | варіант 1 | варіант 2 | варіант 3', hint: 'Питання і 2–4 варіанти через «|».', btns: [['know', '＋ Додати']] },
    wyr: { title: 'Свої питання (Що б обрав ти)', ph: 'варіант 1 | варіант 2 | варіант 3', hint: 'Рівно три варіанти через «|».', btns: [['wyr', '＋ Додати']] },
    tod: { title: 'Свої завдання (Правда або дія)', ph: 'Текст питання або завдання', hint: 'Додайте як «Правда» або як «Дія».', btns: [['t', '＋ Правда'], ['d', '＋ Дія']] },
    cards: { title: 'Свої карти (Чорні карти)', ph: 'Текст карти', hint: 'Чорна карта має містити пропуск ___ .', btns: [['black', '＋ Чорна (з ___)'], ['white', '＋ Біла']] },
  };
  const C = () => Object.assign({ know: [], wyr: [], tod: [], black: [], white: [], only: false }, S.custom || {});
  const show = (key, x) => key === 'know' ? [x.q, ...x.o].join(' | ') : key === 'wyr' ? x.o.join(' | ') : key === 'tod' ? (x.k === 't' ? '💬 ' : '🔥 ') + x.t : x;
  const keysFor = g => g === 'cards' ? ['black', 'white'] : [g];
  window.cuAdd = kind => {
    const el = document.getElementById('cu'); if (!el) return;
    const v = el.value.trim(); if (!v) return toast('Напишіть текст');
    const c = C(), parts = v.split('|').map(x => x.trim()).filter(Boolean);
    if (kind === 'know') { if (parts.length < 3 || parts.length > 5) return toast('Потрібне питання і від 2 до 4 варіантів через «|»'); c.know.push({ q: parts[0], o: parts.slice(1) }); }
    else if (kind === 'wyr') { if (parts.length !== 3) return toast('Потрібно рівно 3 варіанти через «|»'); c.wyr.push({ o: parts }); }
    else if (kind === 't' || kind === 'd') c.tod.push({ k: kind, t: v });
    else if (kind === 'black') { if (!v.includes('___')) return toast('У чорній карті має бути пропуск ___'); c.black.push(v); }
    else c.white.push(v);
    for (const k of Object.keys(c)) if (Array.isArray(c[k]) && c[k].length > 30) return toast('Не більше 30 записів у списку');
    el.value = ''; setS({ custom: c });
  };
  window.cuDel = (key, i) => { const c = C(); c[key].splice(i, 1); setS({ custom: c }); };
  window.cuOnly = v => { const c = C(); c.only = v; setS({ custom: c }); };
  window.customHtml = function (g) {
    const w = WHAT[g]; if (!w) return '';
    const c = C(), n = keysFor(g).reduce((a, k) => a + c[k].length, 0);
    const lists = keysFor(g).map(k => c[k].map((x, i) => `<div class="pun"><span>${esc(show(k, x))}</span><button onclick="cuDel('${k}',${i})">✕</button></div>`).join('')).join('');
    return `<details class="card" ${n ? 'open' : ''}><summary><b>✍️ ${w.title}</b> ${n ? `· ${n}` : ''}</summary>
      <div class="muted" style="margin:6px 0">${w.hint} Додані змішаються зі стандартними.</div>${lists}
      <input id="cu" type="text" maxlength="260" placeholder="${esc(w.ph)}" style="margin-top:8px">
      <div class="row" style="margin-top:8px">${w.btns.map(([k, l]) => `<button onclick="cuAdd('${k}')">${l}</button>`).join('')}</div>
      <label class="chk"><input type="checkbox" ${c.only ? 'checked' : ''} onchange="cuOnly(this.checked)"> Лише мої (коли їх щонайменше 3)</label></details>`;
  };
})();
