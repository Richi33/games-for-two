// Клієнт: Wordle (укр/рос), Діксіт для двох, «Чорні карти».
(function () {
  const st = document.createElement('style');
  st.textContent = `
.wg{display:grid;gap:5px;margin:10px auto;max-width:340px}
.wr{display:grid;gap:5px}
.wt{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:clamp(18px,6vw,28px);text-transform:uppercase;border-radius:8px;background:var(--card2);border:2px solid #3a3f6b;color:var(--tx,#fff)}
.wt.g{background:#2e9e5b;border-color:#2e9e5b}.wt.y{background:#c9a227;border-color:#c9a227}.wt.b{background:#3a3f55;border-color:#3a3f55;color:#aab}
.wt.cur{border-color:#8a93d6}
.wopp{display:flex;gap:10px;justify-content:center;align-items:flex-start;margin:6px 0;font-size:13px;color:var(--mu)}
.wm{display:grid;gap:2px}.wm div{display:flex;gap:2px}.wm i{width:9px;height:9px;border-radius:2px;background:#3a3f55}.wm i.g{background:#2e9e5b}.wm i.y{background:#c9a227}.wm i.e{background:#2a2e4a}
.kb{display:flex;flex-direction:column;gap:5px;margin:10px 0}.kr{display:flex;gap:3px;justify-content:center}
.kb button{flex:1 1 0;min-width:0;padding:11px 0;font-size:16px;font-weight:700;margin:0;border-radius:7px;text-transform:uppercase}
.kb button.g{background:#2e9e5b;color:#fff}.kb button.y{background:#c9a227;color:#fff}.kb button.b{background:#23263a;color:#667}
.kb button.w{flex:1.6;font-size:15px}
.dxg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.dxg.four{grid-template-columns:repeat(2,1fr)}
.dxc{position:relative;padding:0;border:3px solid transparent;border-radius:12px;overflow:hidden;background:#000;aspect-ratio:5/7;display:block;cursor:pointer}
.dxc svg{width:100%;height:100%;display:block}.dxc.sel{border-color:var(--ac);transform:translateY(-3px)}.dxc.mine{opacity:.5;cursor:default}
.dxc.good{border-color:#38d996}.dxc.vote{border-color:#ff5c7a}
.dxc .tag{position:absolute;left:0;right:0;bottom:0;background:#000b;color:#fff;font-size:12px;padding:3px 2px;text-align:center}
.clue{background:var(--card);border-radius:14px;padding:12px;text-align:center;font-size:18px;font-weight:700;margin:8px 0}.clue small{display:block;font-size:12px;color:var(--mu);font-weight:400}
.bk{background:#14161f;color:#fff;border:2px solid #555b86;border-radius:14px;padding:18px 14px;font-size:19px;font-weight:700;line-height:1.35;margin:10px 0}
.bk u{color:#ffd45e;text-decoration:underline wavy #ffd45e55;text-underline-offset:4px}
.wh{background:#f4f4f6;color:#1b1d2a;font-weight:700;font-size:15px;text-align:left;padding:12px 14px;margin:6px 0;border-radius:10px;width:100%;display:block}
.wh.dim{opacity:.55}
.rt{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.rt button{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:26px;padding:12px 0;margin:0}.rt small{font-size:11px;color:var(--mu)}.rt button.sel{outline:3px solid var(--ac)}
`;
  document.head.appendChild(st);
  GAMES.push(
    { id: 'wordle', e: '🟩', n: 'Wordle', d: 'Слово за 6 спроб (укр/рос), 5–8 літер' },
    { id: 'dixit', e: '🖼️', n: 'Діксіт', d: 'Картки-асоціації на двох' },
    { id: 'cards', e: '🖤', n: 'Чорні карти', d: 'Чорний гумор (є 18+)' },
  );

  // ---------- Wordle ----------
  const KBL = {
    uk: ['йцукенгшщзхї', 'фівапролджє', 'ячсмитьбюґ'],
    ru: ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'],
  };
  let wBuf = '', wN = 0;
  window.wKey = k => {
    const v = S.view; if (!v || S.game !== 'wordle' || S.phase !== 'play' || v.done) return;
    if (k === '⌫') wBuf = wBuf.slice(0, -1);
    else if (k === '⏎') { if ([...wBuf].length !== v.len) return toast(`Потрібно ${v.len} літер`); mv({ a: 'g', w: wBuf }); return; }
    else if ([...wBuf].length < v.len) wBuf += k;
    render();
  };
  document.addEventListener('keydown', e => {
    if (S.game !== 'wordle' || !S.view || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === 'Enter') wKey('⏎'); else if (e.key === 'Backspace') wKey('⌫');
    else { let c = e.key.toLowerCase(); if (c === 'ё') c = 'е'; if (c.length === 1 && KBL[S.view.lang].join('').includes(c)) wKey(c); }
  });
  R.wordle = v => {
    if (v.mine.g.length !== wN) { wN = v.mine.g.length; wBuf = ''; }
    const L = v.len, rows = [];
    const best = {};
    v.mine.g.forEach((w, i) => [...w].forEach((c, j) => { const t = v.mine.res[i][j], o = { g: 3, y: 2, b: 1 }; if (!best[c] || o[t] > o[best[c]]) best[c] = t; }));
    for (let i = 0; i < v.max; i++) {
      let cells = '';
      for (let j = 0; j < L; j++) {
        if (i < v.mine.g.length) cells += `<div class="wt ${v.mine.res[i][j]}">${esc([...v.mine.g[i]][j])}</div>`;
        else if (i === v.mine.g.length && !v.done && S.phase === 'play') { const ch = [...wBuf][j]; cells += `<div class="wt ${ch ? 'cur' : ''}">${ch ? esc(ch) : ''}</div>`; }
        else cells += `<div class="wt"></div>`;
      }
      rows.push(`<div class="wr" style="grid-template-columns:repeat(${L},1fr)">${cells}</div>`);
    }
    const oppRows = [...Array(v.max)].map((_, i) => `<div>${[...Array(L)].map((_, j) => `<i class="${v.opp.res[i] ? v.opp.res[i][j] : 'e'}"></i>`).join('')}</div>`).join('');
    const over = S.phase === 'over';
    const kb = KBL[v.lang].map((row, ri) => `<div class="kr">${ri === 2 ? '<button class="w" onclick="wKey(\'⏎\')">⏎</button>' : ''}${[...row].map(c => `<button class="${best[c] || ''}" onclick="wKey('${c}')">${c}</button>`).join('')}${ri === 2 ? '<button class="w" onclick="wKey(\'⌫\')">⌫</button>' : ''}</div>`).join('');
    let st;
    if (over) st = 'Слово: ' + esc(v.word).toUpperCase();
    else if (v.done) st = '⏳ Спроби закінчились — чекаємо суперника';
    else st = `Спроба ${v.mine.g.length + 1}/${v.max} · ${v.lang === 'ru' ? 'російською' : 'українською'}, ${L} літер`;
    const oppInfo = `<div class="wopp"><div class="wm">${oppRows}</div><div style="align-self:center">${esc(opp())}: ${v.opp.n} спроб${v.oppDone && !over ? ' (все)' : ''}</div></div>`;
    const reveal = over ? `<div class="big">Слово — <b>${esc(v.word).toUpperCase()}</b></div>` : '';
    return { st, html: `${oppInfo}<div class="wg">${rows.join('')}</div>${reveal}${over || v.done ? '' : `<div class="kb">${kb}</div>`}` };
  };

  // ---------- Діксіт: картки малюються з числа-«насіння» (оригінальна графіка) ----------
  const EM = ['🐋', '🦉', '🕰️', '🪁', '🌙', '🏰', '🚪', '🗝️', '🦋', '🐘', '🎈', '🪜', '🌳', '🍄', '🔮', '⛵', '🦊', '🐙', '🕊️', '🌵', '🪐', '🐢', '🎭', '🪞', '🕯️', '📖', '🎻', '🧩', '🐚', '🌈', '🦢', '🐝', '🌊', '🏮', '🎪', '🚂', '🛶', '🦌', '🪆', '🐉', '🦄', '🌻', '☂️', '🔔', '⚓', '🎩', '🗼', '🍎', '🪑', '🐌', '🦚', '🌋', '⛓️', '🧿', '🪶', '👁️', '🕸️', '🧸', '🍂', '🐺', '🦀', '🎠', '🪵', '🌹', '💎', '🧭', '🔭', '🐓', '🦩'];
  const mul = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let svgN = 0;
  window.dxArt = id => {
    const r = mul(Math.imul(id + 1, 2654435761) >>> 0); r(); r(); r(); const h1 = r() * 360, h2 = (h1 + 60 + r() * 160) % 360, gid = 'dg' + (svgN++);
    const sky = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${h1},65%,${22 + r() * 18}%)"/><stop offset="1" stop-color="hsl(${(h1 + 30) % 360},70%,${55 + r() * 20}%)"/></linearGradient></defs><rect width="100" height="140" fill="url(#${gid})"/>`;
    let o = sky;
    for (let i = 0; i < 6 + (r() * 10 | 0); i++) o += `<circle cx="${r() * 100}" cy="${r() * 80}" r="${.4 + r() * .9}" fill="#fff" opacity="${.4 + r() * .5}"/>`;
    const cx = 15 + r() * 70, cy = 18 + r() * 40, cr = 8 + r() * 14;
    o += `<circle cx="${cx}" cy="${cy}" r="${cr}" fill="hsl(${(h1 + 180) % 360},80%,80%)" opacity=".85"/>` + (r() < .5 ? `<circle cx="${cx + cr * .35}" cy="${cy - cr * .1}" r="${cr * .85}" fill="hsl(${h1},65%,30%)" opacity=".8"/>` : `<circle cx="${cx}" cy="${cy}" r="${cr * 1.5}" fill="none" stroke="#fff" stroke-width=".6" opacity=".6"/>`);
    for (let k = 0; k < 2; k++) {
      const y0 = 88 + k * 16 + r() * 8, p = `M0 ${y0} Q ${20 + r() * 20} ${y0 - 14 - r() * 10} 50 ${y0 - r() * 8} T 100 ${y0 - r() * 10} V140 H0Z`;
      o += `<path d="${p}" fill="hsl(${(h2 + k * 25) % 360},45%,${20 - k * 6 + r() * 8}%)" opacity=".92"/>`;
    }
    const n = 2 + (r() * 2 | 0);
    for (let i = 0; i < n; i++) {
      const e = i === 0 ? EM[(id * 29) % EM.length] : EM[(r() * EM.length) | 0], sz = i === 0 ? 34 + r() * 16 : 16 + r() * 18, x = i === 0 ? 50 + (r() - .5) * 30 : 10 + r() * 80, y = i === 0 ? 70 + r() * 25 : 30 + r() * 90;
      o += `<text x="${x}" y="${y}" font-size="${sz}" text-anchor="middle" transform="rotate(${(r() - .5) * 30} ${x} ${y})">${e}</text>`;
    }
    return `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${o}</svg>`;
  };
  let dxSel = null, dxR = -1, dxPh = '';
  window.dxPick = c => { dxSel = dxSel === c ? null : c; render(); };
  window.dxSend = () => {
    const el = document.getElementById('dv'); if (!el || dxSel === null) return toast('Оберіть картку');
    const t = el.value.trim(); if (!t) return toast('Напишіть натяк'); el.value = ''; mv({ a: 'clue', c: dxSel, t });
  };
  window.dxVote = () => { if (dxSel === null) return toast('Оберіть картку'); const i = dxSel; dxSel = null; mv({ a: 'vote', i }); };
  R.dixit = v => {
    if (v.r !== dxR || v.ph !== dxPh) { dxR = v.r; dxPh = v.ph; dxSel = null; }
    const me = S.you, ot = 1 - me, play = S.phase === 'play';
    const head = `<div class="muted" style="text-align:center">Раунд ${v.r + 1}/${v.total} · ${v.score[me]}:${v.score[ot]}</div>`;
    if (v.ph === 'clue') {
      if (v.picked) return { st: `⏳ Чекаємо ${esc(opp())}…`, html: head + `<div class="clue"><small>Ваш натяк</small>${esc(v.myClue)}</div><div class="muted" style="text-align:center">${v.oppPicked ? 'Суперник уже обрав' : 'Суперник ще думає'}</div>` };
      const hand = v.hand.map(c => `<button class="dxc ${dxSel === c ? 'sel' : ''}" onclick="dxPick(${c})">${dxArt(c)}</button>`).join('');
      return { st: 'Оберіть картку й придумайте натяк', html: head + `<div class="dxg">${hand}</div>
        <div class="rowin"><input id="dv" data-ctx="dx${v.r}" type="text" maxlength="40" placeholder="Натяк: слово чи фраза" autocomplete="off" onkeydown="if(event.key==='Enter')dxSend()"><button class="primary" onclick="dxSend()">OK</button></div>
        <div class="muted" style="text-align:center;margin-top:6px">Не надто очевидно й не надто загадково 😉</div>` };
    }
    const cards = v.table.map((c, i) => {
      const mine = i === v.mineIdx;
      if (v.ph === 'vote') return `<button class="dxc ${mine ? 'mine' : ''} ${dxSel === i ? 'sel' : ''} ${v.myVote === i ? 'vote' : ''}" ${mine || v.myVote !== null ? 'disabled' : `onclick="dxPick(${i})"`}>${dxArt(c)}${mine ? '<span class="tag">ваша</span>' : ''}</button>`;
      const own = v.rev.owners[i], tag = own === 'd' ? 'випадкова' : own === me ? 'ваша' : esc(opp());
      const votes = []; if (v.rev.vote[me] === i) votes.push('ваш вибір'); if (v.rev.vote[ot] === i) votes.push('вибір суперника');
      return `<div class="dxc ${own === 'd' ? '' : 'good'} ${votes.length ? 'vote' : ''}" style="cursor:default">${dxArt(c)}<span class="tag">${tag}${votes.length ? ' · ' + votes.join(', ') : ''}</span></div>`;
    }).join('');
    if (v.ph === 'vote') {
      return { st: v.myVote !== null ? `⏳ Чекаємо ${esc(opp())}…` : 'Знайдіть картку суперника', html: head + `<div class="clue"><small>Натяк: ${esc(opp())}</small>${esc(v.oppClue)}</div><div class="dxg four">${cards}</div>`
        + (v.myVote === null ? `<button class="primary" onclick="dxVote()">Це ця картка</button>` : '') };
    }
    const r = v.rev, line = `Ви: ${r.found[me] ? 'знайшли ✅' : 'не знайшли ❌'} (+${r.gain[me]}) · ${esc(opp())}: ${r.found[ot] ? 'знайшов(ла) ✅' : 'не знайшов(ла) ❌'} (+${r.gain[ot]})`;
    return { st: 'Результат раунду', html: head + `<div class="muted" style="text-align:center">Ваш натяк: «${esc(r.clue[me])}» · натяк суперника: «${esc(r.clue[ot])}»</div><div class="dxg four">${cards}</div><div class="big" style="font-size:16px">${line}</div>`
      + (play ? `<button class="primary" onclick="mv({a:'next'})">${v.r + 1 >= v.total ? '🏁 Результат' : 'Далі ➜'}</button>` : '') };
  };

  // ---------- Чорні карти ----------
  const fill = (b, w) => esc(b).replace('___', `<u>${esc(w)}</u>`);
  const RT = [['😐', '0'], ['🙂', '1'], ['😂', '2'], ['🤣', '3']];
  R.cards = v => {
    const me = S.you, ot = 1 - me, play = S.phase === 'play';
    const head = `<div class="muted" style="text-align:center">Раунд ${v.r + 1}/${v.total} · ${v.score[me]}:${v.score[ot]}</div>`;
    if (v.ph === 'play') {
      const blank = `<div class="bk">${esc(v.black)}</div>`;
      if (v.mineCard !== null) return { st: `⏳ Чекаємо ${esc(opp())}…`, html: head + `<div class="bk">${fill(v.black, v.mineCard)}</div>` };
      return { st: 'Оберіть біду, що закриє пропуск', html: head + blank + v.hand.map((c, i) => `<button class="wh" data-m='{"a":"play","i":${i}}'>${esc(c)}</button>`).join('') };
    }
    const mine = `<div class="muted">Ваша відповідь</div><div class="bk">${fill(v.black, v.mineCard)}</div>`;
    const theirs = `<div class="muted">Відповідь: ${esc(opp())}</div><div class="bk">${fill(v.black, v.oppCard)}</div>`;
    if (v.ph === 'rate') {
      return { st: v.myRate !== null ? `⏳ Чекаємо оцінку від ${esc(opp())}…` : `Оцініть відповідь: ${esc(opp())}`, html: head + mine + theirs
        + `<div class="rt">${RT.map(([e, n]) => `<button class="${v.myRate === +n ? 'sel' : ''}" ${v.myRate !== null ? 'disabled' : `data-m='{"a":"rate","n":${n}}'`}>${e}<small>${n}</small></button>`).join('')}</div>` };
    }
    const r = v.rev;
    return { st: 'Результат раунду', html: head + mine + theirs + `<div class="big" style="font-size:17px">Ви поставили ${RT[r.rate[me]][0]} (+${r.rate[me]} суперникові) · ${esc(opp())} поставив(ла) ${RT[r.rate[ot]][0]} (+${r.rate[ot]} вам)</div>`
      + (play ? `<button class="primary" onclick="mv({a:'next'})">${v.r + 1 >= v.total ? '🏁 Результат' : 'Далі ➜'}</button>` : '') };
  };
})();
