// Клієнт: «Що б обрав ти», «Наскільки добре знаєш», «Правда або дія» + налаштування складності/режиму/теми.
(function () {
  const st = document.createElement('style');
  st.textContent = `
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.chip{padding:8px 10px;font-size:14px;border:2px solid transparent}.chip.on{border-color:var(--ac);background:#3a3f6b}
.wo{background:var(--card2);border-radius:12px;padding:12px 14px;margin:8px 0;font-size:17px}.wo.me{outline:3px solid var(--ac)}.wo.op{background:#1f5a78}.wo.me.op{background:#1f7a52}
.wo small{display:block;color:var(--mu);font-size:13px;margin-top:2px}
.pics{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:10px 0}
.pic{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 6px;font-size:15px;border:3px solid transparent}.pic b{font-size:clamp(40px,14vw,64px);line-height:1}
.pic.sel{border-color:var(--ac)}.pic.ok{background:#1f7a52;opacity:1}.pic.no{background:#7a2433;opacity:1}
.scale{display:flex;gap:8px;margin:12px 0}.scale button{flex:1;font-size:22px;font-weight:800;padding:16px 0}.scale button.sel{outline:3px solid var(--ac)}.scale button.ok{background:#1f7a52;opacity:1}.scale button.no{background:#7a2433;opacity:1}
.sc-l{display:flex;justify-content:space-between;color:var(--mu);font-size:13px}
.tod{background:var(--card);border-radius:18px;padding:22px 16px;text-align:center;font-size:21px;font-weight:700;margin:12px 0}.tod .k{font-size:14px;color:var(--mu);display:block;margin-bottom:8px}
.tbtns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}.tbtns button{font-size:20px;font-weight:800;padding:26px 8px}
`;
  document.head.appendChild(st);

  GAMES.push(
    { id: 'wyr', e: '🤔', n: 'Що б обрав ти', d: '20 тем: обери й вгадай' },
    { id: 'know', e: '💬', n: 'Наскільки добре знаєш', d: 'Текст, картинки, шкала' },
    { id: 'tod', e: '🎭', n: 'Правда або дія', d: 'Завдання по черзі' },
  );

  const ADULT_PUNS = ['Поцілунок у щоку', 'Масаж плечей 2 хвилини', 'Шепотіти компліменти хвилину', 'Станцювати повільний танець', 'Описати ідеальне побачення', 'Подивитись в очі 30 секунд', 'Написати флірт-повідомлення', 'Обійняти на 20 секунд'];
  const CONTENT = ['wyr', 'know', 'tod'];
  window.addAdultPuns = () => setS({ puns: [...S.puns, ...ADULT_PUNS.filter(x => !S.puns.includes(x))].slice(0, 24) });

  // ---------- налаштування в лобі ----------
  window.extraSettings = function () {
    const g = S.game; let h = '';
    const btn = (on, fn, label, sub) => `<button class="gbtn ${on ? 'on' : ''}" onclick="${fn}"><b>${label}</b>${sub ? `<span>${sub}</span>` : ''}</button>`;
    if (g === 'mem' || g === 'hang') {
      const desc = g === 'mem'
        ? { easy: '12 карток, довго видно', normal: '16 карток', hard: '24 картки, швидко ховаються' }
        : { easy: 'Короткі слова, 8 життів', normal: 'Середні слова, 6 життів', hard: 'Довгі слова, 5 життів' };
      h += `<div class="muted">Складність</div><div class="games" style="grid-template-columns:repeat(3,1fr)">`
        + [['easy', '🟢 Легко'], ['normal', '🟡 Звичайно'], ['hard', '🔴 Складно']].map(([k, l]) => btn(S.diff === k, `setS({diff:'${k}'})`, l, desc[k])).join('') + `</div>`;
    }
    if (g === 'durak') {
      h += `<div class="muted">Колода</div><div class="games">`
        + btn(S.deck !== '52', `setS({deck:'36'})`, '🂠 36 карт', 'від 6 до туза')
        + btn(S.deck === '52', `setS({deck:'52'})`, '🂠 52 карти', 'від 2 до туза')
        + `</div>`;
    }
    if (g === 'hang' || g === 'anag') {
      h += `<div class="muted" style="margin-top:10px">Мова слів</div><div class="games">`
        + btn(S.lang !== 'ru', `setS({lang:'uk'})`, '🇺🇦 Українська', 'Українські слова')
        + btn(S.lang === 'ru', `setS({lang:'ru'})`, 'Російська', 'Русские слова')
        + `</div>`;
    }
    if (CONTENT.includes(g)) {
      h += `<div class="muted">Режим</div><div class="games">`
        + btn(S.mode === 'normal', `setS({mode:'normal'})`, '😊 Звичайний', 'Для всіх')
        + btn(S.mode === 'adult', `if(confirm('Режим 18+: флірт і пікантні питання. Вам обом є 18 років?'))setS({mode:'adult'})`, '🔞 18+', 'Флірт і пікантні питання')
        + `</div>`;
    }
    if (g === 'wyr' && S.topics) {
      h += `<div class="muted" style="margin-top:10px">Тема (${S.topics.length})</div><div class="chips">`
        + `<button class="chip ${S.topic === 'mix' ? 'on' : ''}" onclick="setS({topic:'mix'})">🎲 Мікс</button>`
        + S.topics.map(t => `<button class="chip ${S.topic === t.id ? 'on' : ''}" onclick="setS({topic:'${t.id}'})">${t.e} ${esc(t.n)}</button>`).join('') + `</div>`;
    }
    if (S.mode === 'adult' && S.withPun && h) h += `<button class="ghost" onclick="addAdultPuns()">🔞 Додати 18+ покарання до колеса</button>`;
    const rules = (window.RULES && RULES[g]) ? `<div class="card rules-card">📖 <b>Правила.</b> ${esc(RULES[g])}</div>` : '';
    return rules + (h ? `<h3>Налаштування гри</h3><div class="card">${h}</div>` : '');
  };

  // ---------- Що б обрав ти ----------
  const L3 = ['A', 'B', 'C'];
  R.wyr = v => {
    const me = S.you, ot = 1 - me;
    const head = `<div class="muted" style="text-align:center">${esc(v.tn)} · раунд ${v.r + 1}/${v.total} · ${v.score[me]}:${v.score[ot]}</div>`;
    if (v.ph === 'pick' || v.ph === 'guess') {
      const pick = v.ph === 'pick', cur = pick ? v.mine : v.gmine, done = cur !== null;
      const st = pick
        ? (done ? '⏳ Чекаємо вибір суперника…' : 'Що б обрав(ла) ти?')
        : (done ? '⏳ Чекаємо відповідь суперника…' : `Що обрав(ла) ${esc(opp())}? Вгадайте!`);
      const btns = v.o.map((t, i) => `<button class="qb ${cur === i ? 'sel' : ''}" ${done ? 'disabled' : ''} data-m='{"a":"${pick ? 'pick' : 'guess'}","o":${i}}'>${L3[i]}. ${esc(t)}${!pick && v.mine === i ? ' <small class="muted">(ваш вибір)</small>' : ''}</button>`).join('');
      return { st, html: `${head}<div class="qa" style="margin-top:12px">${btns}</div>` };
    }
    const r = v.rev;
    const rows = v.o.map((t, i) => {
      const tags = [];
      if (r.pick[me] === i) tags.push('ваш вибір');
      if (r.pick[ot] === i) tags.push(`вибір: ${esc(opp())}`);
      return `<div class="wo ${r.pick[me] === i ? 'me' : ''} ${r.pick[ot] === i ? 'op' : ''}">${L3[i]}. ${esc(t)}${tags.length ? `<small>${tags.join(' · ')}</small>` : ''}</div>`;
    }).join('');
    const line = `Ви ${r.gain[me] ? 'вгадали ✅ +1' : 'не вгадали ❌'} · ${esc(opp())} ${r.gain[ot] ? 'вгадав(ла) ✅ +1' : 'не вгадав(ла) ❌'}`;
    return { st: 'Результат раунду', html: `${head}${rows}<div class="big" style="font-size:17px">${line}</div>${S.phase === 'play' ? `<button class="primary" onclick="mv({a:'next'})">${v.r + 1 >= v.total ? '🏁 Результат' : 'Далі ➜'}</button>` : ''}` };
  };

  // ---------- Наскільки добре знаєш ----------
  const optsHtml = (v, o) => { // o: {sel, dis, ok, bad, act}
    const cls = i => (o.ok === i ? 'ok' : o.bad === i ? 'no' : o.sel === i ? 'sel' : '');
    const dm = (i) => (o.dis ? 'disabled' : `data-m='{"a":"${o.act}","o":${i}}'`);
    if (v.k === 'i') {
      return `<div class="pics">${v.o.map((t, i) => { const sp = t.indexOf(' '), e = t.slice(0, sp), l = t.slice(sp + 1); return `<button class="pic ${cls(i)}" ${dm(i)}><b>${e}</b>${esc(l)}</button>`; }).join('')}</div>`;
    }
    if (v.k === 's') {
      return `<div class="scale">${v.o.map((n, i) => `<button class="${cls(i)}" ${dm(i)}>${n}</button>`).join('')}</div><div class="sc-l"><span>1 — ${esc(v.lo)}</span><span>5 — ${esc(v.hi)}</span></div>`;
    }
    return `<div class="qa">${v.o.map((t, i) => `<button class="qb ${cls(i)}" ${dm(i)}>${esc(t)}</button>`).join('')}</div>`;
  };
  R.know = v => {
    const me = S.you, isS = v.subj === me, sn = esc(S.names[v.subj]);
    const head = `<div class="muted" style="text-align:center">Питання ${v.r + 1}/${v.total} · ${v.score[me]}:${v.score[1 - me]}</div>`;
    const q = `<div class="qq">${esc(v.q)}</div><div class="muted" style="text-align:center">${isS ? 'Відповідайте про себе' : `Питання про: ${sn}`}</div>`;
    if (v.ph === 'ans') {
      return { st: isS ? 'Ваша відповідь про себе' : `⏳ ${sn} відповідає про себе…`, html: head + q + optsHtml(v, { dis: !isS, act: 'ans' }) };
    }
    if (v.ph === 'guess') {
      return isS
        ? { st: `⏳ ${esc(S.names[1 - me])} вгадує…`, html: head + q + optsHtml(v, { dis: true, sel: v.ans }) }
        : { st: `Вгадайте відповідь: ${sn}`, html: head + q + optsHtml(v, { act: 'guess' }) };
    }
    const hit = v.guess === v.ans, gname = esc(S.names[1 - v.subj]);
    const note = `${gname}: ${v.gain > 0 ? (hit ? '✅ вгадав(ла)' : '➖ майже') : '❌ не вгадав(ла)'} · +${v.gain}`;
    return { st: 'Результат', html: head + q + optsHtml(v, { dis: true, ok: v.ans, bad: hit ? null : v.guess }) + `<div class="big" style="font-size:17px">${note}</div>`
      + (S.phase === 'play' ? `<button class="primary" onclick="mv({a:'next'})">${v.r + 1 >= v.total ? '🏁 Результат' : 'Далі ➜'}</button>` : '') };
  };

  // ---------- Правда або дія ----------
  R.tod = v => {
    const me = S.you, mine = v.turn === me, who = esc(S.names[v.turn]);
    const head = `<div class="muted" style="text-align:center">Хід ${v.t + 1}/${v.total} · виконано: ви ${v.done[me]}, ${esc(opp())} ${v.done[1 - me]}</div>`;
    if (v.ph === 'choose') {
      return { st: mine ? 'Ваш вибір' : `⏳ ${who} обирає…`, html: head + (mine
        ? `<div class="tbtns"><button class="primary" style="margin:0" data-m='{"a":"pick","k":"t"}'>💬 Правда</button><button class="primary" style="margin:0;background:#b03a2e" data-m='{"a":"pick","k":"d"}'>🔥 Дія</button></div>`
        : `<div class="tod"><span class="k">${who} вибирає</span>💬 Правда чи 🔥 Дія?</div>`) };
    }
    const card = `<div class="tod"><span class="k">${v.kind === 't' ? '💬 ПРАВДА' : '🔥 ДІЯ'} · ${who}</span>${esc(v.prompt)}</div>`;
    if (v.ph === 'task') {
      return { st: mine ? 'Ваше завдання' : `${who} виконує…`, html: head + card + (mine
        ? `<div class="row"><button class="primary" style="margin:0" onclick="mv({a:'done'})">✅ Готово</button><button onclick="mv({a:'skip'})">⏭ Пропустити</button></div>` : '') };
    }
    return { st: mine ? '⏳ Чекаємо підтвердження…' : 'Чи виконано?', html: head + card + (mine ? '' :
      `<div class="row"><button class="primary" style="margin:0" onclick="mv({a:'ok'})">✅ Зараховано</button><button onclick="mv({a:'no'})">❌ Ні</button></div>`) };
  };
})();
