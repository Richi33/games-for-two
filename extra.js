// Клієнтська частина додаткових ігор (завантажується після основного скрипта).
(function () {
  const st = document.createElement('style');
  st.textContent = `
.ck{display:grid;grid-template-columns:repeat(8,1fr);max-width:420px;margin:10px auto;border:4px solid #4a3523;border-radius:6px;overflow:hidden}
.sq{aspect-ratio:1;display:flex;align-items:center;justify-content:center;position:relative}
.sq.lt{background:#f0d9b5}.sq.dk{background:#a6713f}.sq.sel{background:#d6b84a}.sq.tg:after{content:"";position:absolute;width:30%;height:30%;border-radius:50%;background:#2ecc7199}
.pc{width:80%;height:80%;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:clamp(14px,5vw,24px);color:#ffd23f;box-shadow:inset 0 -4px 0 #0004,0 2px 3px #0006}
.pc.q0{background:#f4f4f4;color:#c28a00}.pc.q1{background:#b52b2b}
.word{font-size:clamp(26px,9vw,40px);font-weight:800;letter-spacing:4px;text-align:center;margin:14px 0;word-break:break-word}
.kb{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:10px 0}
.kb button{width:clamp(34px,10.5vw,46px);padding:10px 0;font-weight:700}.kb button.ok{background:#1f7a52}.kb button.no{background:#7a2433}
.qq{font-size:20px;font-weight:700;text-align:center;margin:14px 0}.qa{display:grid;gap:8px}
.qb{text-align:left;font-size:17px}.qb.sel{outline:3px solid var(--ac)}.qb.ok{background:#1f7a52;opacity:1}.qb.no{background:#7a2433;opacity:1}
.die{font-size:44px;line-height:1;margin-right:4px}.faces{display:flex;gap:6px;justify-content:center;margin:10px 0}.faces button{font-size:30px;padding:6px 10px;flex:none}.faces button.sel{outline:3px solid var(--ac)}
.pcard{display:inline-block;background:#f4f4f4;color:#111;border-radius:8px;padding:10px 8px;margin:4px;font-weight:800;font-size:22px;min-width:48px;text-align:center}.pcard.red{color:#c0392b}.pcard.back{background:#4f55a0;color:#fff}
`;
  document.head.appendChild(st);

  GAMES.push(
    { id: 'chk', e: '⚪', n: 'Шашки', d: 'Бий і стань дамкою' },
    { id: 'hang', e: '🔤', n: 'Шибениця', d: 'Слова: вгадуйте літери' },
    { id: 'quiz', e: '❓', n: 'Вікторина', d: 'Ерудиція, 7 питань' },
    { id: 'math', e: '➗', n: 'Дуель рахунку', d: 'Хто швидше порахує' },
    { id: 'anag', e: '🔀', n: 'Анаграми', d: 'Склади слово з літер' },
    { id: 'dice', e: '🎲', n: 'Кості-блеф', d: 'Обман і блеф' },
    { id: 'bj', e: '🃏', n: 'Двадцять одне', d: 'Очко: ближче до 21' },
  );
  Object.assign(MARK, { chk: ['⚪', '🔴'] });

  // ----- Шашки -----
  let ckSel = null;
  window.ckClick = function (i) {
    const v = S.view; if (S.phase !== 'play' || v.turn !== S.you) return;
    const cur = v.must !== null ? v.must : ckSel;
    if (cur !== null && v.legal.some(x => x[0] === cur && x[1] === i)) { ckSel = null; mv({ from: cur, to: i }); return; }
    ckSel = (v.must === null && v.b[i] && v.b[i][0] === S.you && v.legal.some(x => x[0] === i)) ? i : null;
    render();
  };
  R.chk = v => {
    if (v.turn !== S.you) ckSel = null;
    const sel = v.turn === S.you ? (v.must !== null ? v.must : ckSel) : null;
    const targets = sel !== null ? v.legal.filter(x => x[0] === sel).map(x => x[1]) : [];
    const order = [...Array(64).keys()]; if (S.you === 1) order.reverse();
    return {
      st: turnSt(v.turn) + (v.must !== null && v.turn === S.you ? ' · бийте далі!' : ''),
      html: `<div class="ck">${order.map(i => {
        const dark = ((i >> 3) + (i & 7)) % 2 === 1, pc = v.b[i];
        return `<div class="sq ${dark ? 'dk' : 'lt'} ${sel === i ? 'sel' : ''} ${targets.includes(i) ? 'tg' : ''}" onclick="ckClick(${i})">${pc ? `<b class="pc q${pc[0]}">${pc[1] ? '♛' : ''}</b>` : ''}</div>`;
      }).join('')}</div><div class="muted" style="text-align:center">Бити обов’язково. Дійшовши до краю, шашка стає дамкою.</div>`,
    };
  };

  // ----- Шибениця -----
  const UA = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя';
  const KB = { uk: UA, ru: 'абвгдежзийклмнопрстуфхцчшщъыьэюя' };
  R.hang = v => ({
    st: turnSt(v.turn) + ` · ❤️ ${v.lives[S.you]} / ${v.lives[1 - S.you]}`,
    html: `<div class="word">${v.mask.map(c => c ? c.toUpperCase() : '_').join(' ')}</div>${v.word ? `<div class="muted" style="text-align:center">Слово: <b>${esc(v.word)}</b></div>` : ''}
      <div class="kb">${[...(KB[v.lang] || UA)].map(l => { const g = v.g.find(x => x.l === l); return `<button class="${g ? (g.ok ? 'ok' : 'no') : ''}" ${g || S.phase !== 'play' ? 'disabled' : ''} data-m='{"l":"${l}"}'>${l.toUpperCase()}</button>`; }).join('')}</div>
      <div class="muted" style="text-align:center">Вгадали літеру — ходите ще раз. Схибили — втрачаєте життя й хід.</div>`,
  });

  // ----- Вікторина -----
  R.quiz = v => {
    const btns = v.o.map((t, i) => {
      let cls = '';
      if (v.a !== null) { if (i === v.a) cls = 'ok'; else if (i === v.mine) cls = 'no'; } else if (v.mine === i) cls = 'sel';
      return `<button class="qb ${cls}" ${v.mine !== null || v.a !== null ? 'disabled' : ''} data-m='{"o":${i}}'>${esc(t)}</button>`;
    }).join('');
    let note = '';
    if (v.a !== null) note = `Ви: +${v.gain[S.you]} · ${esc(opp())}: +${v.gain[1 - S.you]}`;
    else if (v.mine !== null) note = 'Відповідь прийнято, чекаємо суперника…';
    else if (v.oppDone) note = 'Суперник уже відповів!';
    return {
      st: `Питання ${v.round + 1}/${v.total} · ${v.score[S.you]}:${v.score[1 - S.you]}`,
      html: `<div class="qq">${esc(v.q)}</div><div class="qa">${btns}</div><div class="muted" style="text-align:center;margin-top:10px">${note}<br>Перший правильний — 2 бали, другий — 1. На відповідь 15 с.</div>`,
    };
  };

  // ----- Дуелі (рахунок / анаграми) -----
  window.duelSend = () => { const el = document.getElementById('dv'); if (!el) return; const v = el.value.trim(); if (!v) return; el.value = ''; mv({ v }); };
  const duel = hint => v => {
    let info = '';
    if (v.phase === 'result') info = (v.res.w === 'none' ? 'Обидва помилились. ' : v.res.w === S.you ? '✅ Ви перші! ' : '❌ Суперник швидший. ') + `Відповідь: <b>${esc(v.a)}</b>`;
    else if (v.locked) info = 'Ви помилились — чекайте наступного раунду';
    const off = v.phase !== 'q' || v.locked ? 'disabled' : '';
    return {
      st: `Раунд ${v.round} · ${v.score[S.you]}:${v.score[1 - S.you]} (до 3)`,
      html: `<div class="word">${esc(v.q)}</div><div class="muted" style="text-align:center">${typeof hint === 'function' ? hint(v) : hint}</div>
        <div class="rowin"><input id="dv" data-ctx="${v.round}" type="text" autocomplete="off" autocapitalize="off" ${off} onkeydown="if(event.key==='Enter')duelSend()"><button class="primary" ${off} onclick="duelSend()">OK</button></div><div class="big">${info}</div>`,
    };
  };
  R.math = duel('Введіть результат. Помилка — до кінця раунду ви виходите.');
  R.anag = duel(v => `Складіть слово з цих літер (${v.lang === 'ru' ? 'російською' : 'українською'}, маленькими).`);

  // ----- Кості-блеф -----
  const DF = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  let dq = 1, df = 2;
  window.dQ = d => { dq = Math.max(1, Math.min(S.view.total, dq + d)); render(); };
  window.dF = f => { df = f; render(); };
  window.dBid = () => mv({ a: 'bid', q: dq, f: df });
  R.dice = v => {
    const b = v.bid, mine = v.phase === 'bid' && v.turn === S.you;
    if (mine) {
      const ok = (q, f) => !b || q > b.q || (q === b.q && f > b.f);
      if (!ok(dq, df) && b) { dq = b.f < 6 ? b.q : b.q + 1; df = b.f < 6 ? b.f + 1 : 1; }
      dq = Math.max(1, Math.min(dq, v.total));
    }
    const dc = a => a.map(x => `<span class="die">${DF[x - 1]}</span>`).join('');
    let mid;
    if (v.phase === 'reveal') {
      const r = v.rev;
      mid = `<div class="card"><div>Ваші: ${dc(r.dice[S.you])}</div><div>Суперника: ${dc(r.dice[1 - S.you])}</div><div class="big" style="font-size:18px">Ставка ${r.bid.q} × ${DF[r.bid.f - 1]}, насправді ${r.cnt} — ${r.loser === S.you ? 'ви втрачаєте кубик 😬' : 'суперник втрачає кубик 🎉'}</div></div>`;
    } else mid = `<div class="card"><div>Ваші кубики: ${dc(v.mine)}</div><div style="margin-top:6px">Суперник: ${'🎲'.repeat(v.n[1 - S.you])}</div></div>`;
    const ctr = mine ? `<div class="card"><div class="row"><button onclick="dQ(-1)">−</button><b style="text-align:center;font-size:26px">${dq} ×</b><button onclick="dQ(1)">＋</button></div><div class="faces">${DF.map((d, i) => `<button class="${df === i + 1 ? 'sel' : ''}" onclick="dF(${i + 1})">${d}</button>`).join('')}</div><button class="primary" onclick="dBid()">Ставка: ${dq} × ${DF[df - 1]}</button>${b ? `<button class="primary" style="background:#b03a2e" onclick="mv({a:'call'})">🤥 Не вірю!</button>` : ''}</div>` : '';
    return {
      st: v.phase === 'reveal' ? 'Розкриваємо кубики…' : turnSt(v.turn) + ` · кубиків: ви ${v.n[S.you]} / суперник ${v.n[1 - S.you]}`,
      html: `${mid}<div class="muted" style="text-align:center">${b ? `Остання ставка: <b>${esc(S.names[b.p])}</b> — не менше ${b.q} × ${DF[b.f - 1]} серед усіх кубиків` : 'Ставок ще немає'}</div>${ctr}`,
    };
  };

  // ----- Двадцять одне -----
  R.bj = v => {
    const card = c => c ? `<span class="pcard ${/[♥♦]/.test(c.t) ? 'red' : ''}">${c.t}</span>` : '<span class="pcard back">?</span>';
    const over = S.phase === 'over', my = S.phase === 'play' && v.turn === S.you;
    return {
      st: turnSt(v.turn) + (v.stand[S.you] ? ' · ви спасували' : ''),
      html: `<div class="card"><div class="muted">${esc(opp())}${v.stand[1 - S.you] ? ' (спасував)' : ''}${over ? ' — ' + v.sumOpp + ' очок' : ''}</div><div>${v.opp.map(card).join('')}</div></div>
        <div class="card"><div class="muted">Ви — ${v.sumMine} очок</div><div>${v.mine.map(card).join('')}</div></div>
        ${my ? `<div class="row"><button class="primary" style="margin:0;flex:1" onclick="mv({a:'hit'})">🃏 Ще</button><button class="primary" style="margin:0;flex:1" onclick="mv({a:'stand'})">✋ Досить</button></div>` : ''}
        <div class="muted" style="text-align:center;margin-top:8px">Ближче до 21 — перемагає, перебір — програш. В=2, Д=3, К=4, Т=11. Перша карта суперника прихована.</div>`,
    };
  };

  // фокус на полі вводу в дуелях
  const baseRender = window.render;
  window.render = function () {
    baseRender();
    const el = document.getElementById('dv');
    if (el && !el.disabled && document.activeElement !== el) el.focus();
  };
})();
