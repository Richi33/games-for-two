// Клієнт гри «Фортуна»: вгадай випадкову подію (монета, рулетка, кубики, масть, урна, перегони).
(function () {
  const st = document.createElement('style');
  st.textContent = `
.lk-q{text-align:center;margin:6px 0}.lk-q .ic{font-size:44px;line-height:1.1}.lk-q h3{margin:2px 0 0;font-size:19px}.lk-note{text-align:center;color:var(--mu);font-size:13px;margin:2px 0 8px}
.lk-o{display:grid;gap:8px;margin:10px 0}.lk-o.n2{grid-template-columns:1fr 1fr}.lk-o.n3{grid-template-columns:repeat(3,1fr)}.lk-o.n4{grid-template-columns:1fr 1fr}
.lk-b{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 6px;margin:0;border-radius:14px;position:relative;text-align:center}
.lk-b .e{font-size:34px;line-height:1.1}.lk-b .l{font-weight:700;font-size:15px}.lk-b .c{font-size:12px;color:var(--mu)}.lk-b .p{font-size:12px;font-weight:700;color:var(--ok)}
.lk-b.mine{outline:3px solid var(--p0)}.lk-b.opp{outline:3px solid var(--p1)}.lk-b.take{opacity:.6}.lk-b.win{outline:3px solid #ffd45e;box-shadow:0 0 16px #ffd45e88}
.lk-b .own{position:absolute;top:-8px;right:-4px;background:var(--card);border-radius:10px;font-size:11px;padding:2px 7px;box-shadow:0 1px 4px #0005}
.lk-bar{height:5px;border-radius:3px;background:var(--card2);width:80%;margin-top:3px;overflow:hidden}.lk-bar i{display:block;height:100%;background:var(--ac)}
.lk-stage{background:var(--card);border-radius:16px;padding:14px;margin:10px 0;text-align:center;min-height:110px;display:flex;flex-direction:column;align-items:center;justify-content:center}
.lk-roll{font-size:56px;animation:lkspin .5s linear infinite}.lk-roll.gone{animation:lkspin .5s linear 3,lkgone .01s 1.5s forwards}
@keyframes lkspin{to{transform:rotate(360deg)}}@keyframes lkgone{to{opacity:0;height:0;font-size:0;margin:0}}
.lk-final{font-size:20px;font-weight:800}.lk-final.late{animation:lkin .35s 1.5s both}.lk-big{font-size:60px;line-height:1.1}
.late{animation:lkin .35s var(--d,1.5s) both}@keyframes lkin{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:none}}
.lk-dice{font-size:62px;letter-spacing:6px}.lk-num{display:inline-flex;align-items:center;justify-content:center;width:84px;height:84px;border-radius:50%;font-size:38px;font-weight:800;color:#fff}
.lk-num.r{background:#d63a3a}.lk-num.b{background:#23263a;border:3px solid #666}.lk-num.g{background:#1f9d62}
.lk-card{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:84px;height:118px;border-radius:12px;background:#fafafa;color:#1b1d2a;font-size:30px;font-weight:800}
.lk-card.red{color:#c0392b}
.lk-track{position:relative;height:38px;margin:5px 0;background:var(--card2);border-radius:19px;overflow:hidden}.lk-track:after{content:'🏁';position:absolute;right:6px;top:5px;font-size:20px}
.lk-track .rc{position:absolute;top:2px;left:2%;font-size:28px;transition:left var(--t,3s) cubic-bezier(.3,.6,.4,1)}
.lk-track b{position:absolute;left:10px;top:9px;font-size:12px;color:var(--mu);z-index:0}
.lk-hist{font-size:13px;color:var(--mu);margin-top:8px}.lk-hist div{padding:2px 0}
`;
  document.head.appendChild(st);
  GAMES.push({ id: 'luck', e: '🍀', n: 'Фортуна', d: 'Вгадай випадок: колір, кулька, перегони' });

  const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  let animKey = null, readyAt = 0;
  window.lkPick = o => { const v = S.view; if (S.phase !== 'play' || v.turn !== S.you) return toast('Зараз не ваш вибір'); mv({ a: 'pick', o }); };
  window.lkNext = () => { if (Date.now() < readyAt) return toast('Дочекайтесь результату 😉'); mv({ a: 'next' }); };

  function stage(v, fresh) {
    const o = v.out, ev = v.ev, w = ev.opts[o.win];
    const finalTxt = `Випало: ${w.e} ${esc(w.l)}`;
    const wrap = inner => `<div class="lk-stage">${fresh ? '<div class="lk-roll gone">🎰</div>' : ''}<div class="${fresh ? 'late' : ''}" style="--d:1.5s">${inner}</div></div>`;
    if (ev.kind === 'coin') return wrap(`<div class="lk-big">${o.detail.side === 0 ? '🦅' : '🪙'}</div><div class="lk-final">${finalTxt}</div>`);
    if (ev.kind === 'roulette') return wrap(`<div class="lk-num ${o.detail.color}">${o.detail.n}</div><div class="lk-final">${finalTxt}</div>`);
    if (ev.kind === 'dice') return wrap(`<div class="lk-dice">${o.detail.dice.map(d => DICE[d]).join(' ')}</div><div class="lk-final">${o.detail.dice.length === 2 ? 'Сума ' + (o.detail.dice[0] + o.detail.dice[1]) : 'Випало ' + o.detail.dice[0]} · ${finalTxt}</div>`);
    if (ev.kind === 'suit') { const red = o.detail.suit === 1 || o.detail.suit === 2; return wrap(`<div class="lk-card ${red ? 'red' : ''}"><span>${esc(o.detail.rank)}</span><span>${ev.opts[o.detail.suit].e}</span></div><div class="lk-final">${finalTxt}</div>`); }
    if (ev.kind === 'urn') return wrap(`<div class="lk-big">${w.e}</div><div class="lk-final">${finalTxt}</div>`);
    // перегони: кожен учасник їде зі своєю швидкістю; порядок фінішу задано сервером
    const order = o.detail.order, rows = ev.opts.map(op => {
      const rank = order.indexOf(op.id), dur = 2.6 + rank * 0.5;
      return `<div class="lk-track"><b>${esc(op.l)}</b><span class="rc" data-to="86%" style="--t:${fresh ? dur : 0}s;left:${fresh ? '2%' : '86%'}">${op.e}</span></div>`;
    }).join('');
    if (fresh) { readyAt = Date.now() + 4300; setTimeout(() => document.querySelectorAll('.lk-track .rc').forEach(el => { el.style.left = el.dataset.to; }), 80); }
    return `<div class="lk-stage" style="align-items:stretch">${rows}<div class="lk-final ${fresh ? 'late' : ''}" style="--d:${3.9}s;margin-top:6px">${finalTxt}</div></div>`;
  }

  R.luck = v => {
    const me = S.you, ot = 1 - me, ev = v.ev, play = S.phase === 'play', res = v.ph === 'result';
    const key = 'r' + v.r + '_' + S.code + '_' + S.game;
    const fresh = res && animKey !== key; if (res) { animKey = key; if (fresh && ev.kind !== 'race') readyAt = Date.now() + 1900; }
    const head = `<div class="muted" style="text-align:center">Раунд ${v.r + 1}/${v.total} · ${v.score[me]} : ${v.score[ot]}</div>`;
    const q = `<div class="lk-q"><div class="ic">${ev.icon}</div><h3>${esc(ev.title)}</h3><div class="muted">${esc(ev.q)}</div></div>${ev.note ? `<div class="lk-note">${esc(ev.note)}</div>` : ''}`;
    const winId = res ? v.out.win : -1;
    const opts = ev.opts.map(op => {
      const own = v.pick[me] === op.id ? me : v.pick[ot] === op.id ? ot : null;
      const free = own === null && v.ph === 'pick' && v.turn === me && play;
      const cls = `${own === me ? 'mine' : own === ot ? 'opp' : ''} ${res && winId === op.id ? 'win' : ''} ${own === null && !free ? 'take' : ''}`;
      return `<button class="lk-b ${cls}" ${free ? `onclick="lkPick(${op.id})"` : 'disabled'}>${own !== null ? `<span class="own">${own === me ? 'ви' : esc(opp())}</span>` : ''}
        <span class="e">${op.e}</span><span class="l">${esc(op.l)}</span><span class="c">шанс ${Math.round(op.p * 100 * 10) / 10}%</span><div class="lk-bar"><i style="width:${Math.max(3, op.p * 100)}%"></i></div><span class="p">+${op.pts} ${op.pts === 1 ? 'бал' : op.pts < 5 ? 'бали' : 'балів'}</span></button>`;
    }).join('');
    const grid = `<div class="lk-o n${ev.opts.length}">${opts}</div>`;
    let st, body = head + q + grid;
    if (v.ph === 'pick') {
      st = v.turn === me ? 'Ваш вибір: оберіть варіант' : `⏳ ${esc(opp())} обирає…`;
    } else {
      const g = v.gain, w = ev.opts[v.out.win];
      const who = g[me] ? `🎉 Ви вгадали: +${g[me]}` : g[ot] ? `${esc(opp())} вгадав(ла): +${g[ot]}` : 'Ніхто не вгадав — балів немає';
      st = 'Результат раунду';
      body += stage(v, fresh);
      const lateD = ev.kind === 'race' ? 3.9 : 1.5;
      body += `<div class="big late" style="font-size:17px;--d:${lateD}s">${who}</div>`
        + (play ? `<button class="primary late" style="--d:${lateD}s" onclick="lkNext()">${v.r + 1 >= v.total ? '🏁 Результат' : 'Далі ➜'}</button>` : '');
      if (S.phase === 'over' || v.r + 1 >= v.total) body += `<div class="lk-hist">${v.hist.map((h, i) => `<div>${i + 1}. ${h.icon} ${esc(h.t)} — ${esc(h.win)}${h.by === null ? ' · ніхто' : ' · ' + esc(S.names[h.by]) + ' +' + h.pts}</div>`).join('')}</div>`;
    }
    return { st, html: body };
  };
})();
