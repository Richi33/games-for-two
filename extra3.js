// Клієнт гри «Дурень переводний».
(function () {
  const st = document.createElement('style');
  st.textContent = `
.dc{display:inline-flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;width:46px;height:66px;padding:4px 5px;border-radius:8px;background:#fafafa;color:#1b1d2a;font-weight:800;box-shadow:0 2px 4px #0006;border:2px solid transparent;line-height:1.05;user-select:none;flex:none}
.dc b{font-size:17px}.dc i{font-style:normal;font-size:20px}
.dc.red{color:#c0392b}.dc.tr{background:#fff3c4}
.dc.back{align-items:center;justify-content:center;padding:0;background:repeating-linear-gradient(45deg,#4f55a0,#4f55a0 5px,#5b62b8 5px,#5b62b8 10px);color:#fff;font-size:15px}
.dc.dim{opacity:.4}.dc.ok{border-color:#38d996;box-shadow:0 0 0 2px #38d99666,0 2px 4px #0006}.dc.sel{border-color:var(--ac);transform:translateY(-8px)}
.dc.tgt{border-color:#ff5c7a;cursor:pointer}
button.dc{cursor:pointer}button.dc:disabled{opacity:1}
.dhand{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:12px 0}
.dopp{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin:6px 0}.dopp .dc{width:26px;height:38px;font-size:11px;border-radius:5px}
.dmid{display:flex;gap:10px;align-items:flex-start;margin:10px 0}
.dpile{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:70px;font-size:13px;color:var(--mu);text-align:center}
.dpile .dc.back{width:46px;height:66px}.dpile .tc{transform:rotate(90deg);margin:10px 0 6px;align-items:center;justify-content:center;padding:0;flex-direction:row;gap:2px}
.dtable{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:10px 4px;min-height:96px}
.pair{position:relative;height:92px}.pair .dc{position:absolute;left:0;top:0}.pair .dc.df{left:22px;top:20px;transform:rotate(6deg)}
.dact{display:flex;gap:8px;justify-content:center;margin:8px 0;flex-wrap:wrap}.dact button{flex:1;min-width:120px;margin:0}
.dnote{text-align:center;font-size:14px;color:var(--mu);min-height:20px}
`;
  document.head.appendChild(st);
  GAMES.push({ id: 'durak', e: '🃏', n: 'Дурень переводний', d: '36 або 52 карти' });

  const SY = ['♠', '♥', '♦', '♣'], RL = { 11: 'В', 12: 'Д', 13: 'К', 14: 'Т' };
  const lab = r => RL[r] || r;
  const cid = c => c.r + '.' + c.s;
  let dSel = null;

  const card = (c, tr, extra, attrs) =>
    `<span class="dc ${(c.s === 1 || c.s === 2) ? 'red' : ''} ${c.s === tr ? 'tr' : ''} ${extra || ''}" ${attrs || ''}><b>${lab(c.r)}</b><i>${SY[c.s]}</i></span>`;
  const handCard = (c, tr, cls, id) =>
    `<button class="dc ${(c.s === 1 || c.s === 2) ? 'red' : ''} ${c.s === tr ? 'tr' : ''} ${cls}" onclick="dClick('${id}')"><b>${lab(c.r)}</b><i>${SY[c.s]}</i></button>`;

  window.dClick = id => {
    const v = S.view;
    if (S.phase !== 'play' || v.turn !== S.you) return toast('Зараз не ваш хід');
    const L = v.legal, targets = L.beat[id] || [], canTr = L.tr.includes(id);
    if (L.atk.includes(id)) { dSel = null; return mv({ a: 'atk', c: id }); }
    if (targets.length === 1 && !canTr) { dSel = null; return mv({ a: 'beat', t: targets[0], c: id }); }
    if (targets.length || canTr) { dSel = dSel === id ? null : id; return render(); }
    toast('Цією картою зараз не можна');
  };
  window.dTable = t => {
    const v = S.view;
    if (dSel && (v.legal.beat[dSel] || []).includes(t)) { const c = dSel; dSel = null; mv({ a: 'beat', t, c }); }
  };
  window.dTransfer = () => { if (dSel) { const c = dSel; dSel = null; mv({ a: 'tr', c }); } };

  R.durak = v => {
    const me = S.you, L = v.legal, tr = v.trump, mine = v.turn === me && S.phase === 'play';
    const handIds = v.hand.map(cid);
    if (!mine || !dSel || !handIds.includes(dSel) || !((L.beat[dSel] || []).length || L.tr.includes(dSel))) dSel = null;
    const oname = esc(opp()), role = v.att === me ? '🗡 Ви атакуєте' : '🛡 Ви відбиваєтесь';
    let st;
    if (S.phase === 'over') st = '';
    else if (v.ph === 'clear') st = v.kind === 'take' ? '🤲 Забирає карти…' : '✅ Бито!';
    else if (v.ph === 'attack') st = v.turn === me ? (v.table.length ? 'Усе побито: підкиньте або «Бито»' : 'Ваш хід: атакуйте') : `⏳ ${oname} ${v.table.length ? 'вирішує, чи підкидати' : 'атакує'}…`;
    else if (v.ph === 'defend') st = v.turn === me ? 'Відбивайтесь: побийте, переведіть або візьміть' : `⏳ ${oname} відбивається…`;
    else st = v.turn === me ? `${oname} бере — можете підкинути` : `⏳ ${oname} підкидає…`;

    const pairs = v.table.map((x, i) => {
      const tgt = mine && dSel && (L.beat[dSel] || []).includes(i) && !x.d;
      return `<div class="pair">${card(x.a, tr, tgt ? 'tgt' : '', tgt ? `onclick="dTable(${i})"` : '')}${x.d ? card(x.d, tr, 'df') : ''}</div>`;
    }).join('');

    const trumpHtml = v.trumpCard ? card(v.trumpCard, tr, 'tc') : `<div style="font-size:30px" class="${tr === 1 || tr === 2 ? '' : ''}">${SY[tr]}</div>`;
    const pile = `<div class="dpile"><div>Козир ${SY[tr]}</div>${trumpHtml}${v.talon ? `<div class="dc back">${v.talon}</div>` : '<div>колода порожня</div>'}</div>`;

    const opp_ = (v.oppHand ? v.oppHand.map(c => card(c, tr)) : [...Array(Math.min(v.opp, 14))].map(() => '<span class="dc back"></span>')).join('');
    const oppMore = !v.oppHand && v.opp > 14 ? `<span class="muted">+${v.opp - 14}</span>` : '';

    const hand = v.hand.map(c => {
      const id = cid(c);
      const playable = L.atk.includes(id) || (L.beat[id] || []).length || L.tr.includes(id);
      return handCard(c, tr, `${dSel === id ? 'sel' : ''} ${mine ? (playable ? 'ok' : 'dim') : ''}`, id);
    }).join('');

    let acts = '';
    if (mine) {
      if (dSel && L.tr.includes(dSel)) acts += `<button class="primary" onclick="dTransfer()">↪ Перевести</button>`;
      if (L.take) acts += `<button style="background:#7a2433" onclick="dSel=null;mv({a:'take'})">🤲 Беру</button>`;
      if (L.bito) acts += `<button class="primary" onclick="mv({a:'bito'})">✅ Бито</button>`;
      if (L.done) acts += `<button class="primary" onclick="mv({a:'done'})">✅ Готово</button>`;
    }
    let note = '';
    if (mine && v.ph === 'defend') note = dSel ? ((L.beat[dSel] || []).length > 1 ? 'Торкніться карти на столі, яку хочете побити' : (L.beat[dSel] || []).length ? 'Торкніться підсвіченої карти на столі' : 'Натисніть «Перевести»') : 'Торкніться карти, щоб побити (зелена рамка — можна)';
    else if (mine && v.ph === 'attack' && !v.table.length) note = 'Торкніться карти, щоб піти';

    return {
      st,
      html: `<div class="muted" style="text-align:center">${role} · у суперника ${v.opp} карт</div><div class="dopp">${opp_}${oppMore}</div>
        <div class="dmid">${pile}<div class="dtable">${pairs || '<div class="muted" style="grid-column:1/-1;text-align:center;align-self:center">Стіл порожній</div>'}</div></div>
        <div class="dnote">${note}</div><div class="dact">${acts}</div><div class="dhand">${hand}</div>`,
    };
  };
})();
