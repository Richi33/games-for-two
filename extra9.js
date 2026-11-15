// Скіли: вибір у лобі (за згодою обох) і використання під час гри.
(function () {
  const st = document.createElement('style');
  st.textContent = `
.sk-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;margin:4px 6px 4px 0;border-radius:12px;background:var(--card2);color:var(--tx);border:2px solid transparent;font-size:14px;width:auto}
.sk-chip.on{border-color:var(--ac)}.sk-chip small{color:var(--mu)}
#skBar{position:fixed;left:0;right:0;bottom:0;z-index:40;background:var(--card);box-shadow:0 -2px 12px #0004;padding:8px 10px calc(8px + env(safe-area-inset-bottom));display:none;text-align:center}
#skBar button{width:auto;margin:2px 4px;padding:8px 12px;border-radius:12px;font-size:14px}#skBar .o{font-size:12px;color:var(--mu);margin-top:2px}
body.sk-pad #app{padding-bottom:84px}body.sk-pad #cbtn{bottom:calc(76px + env(safe-area-inset-bottom))}`;
  document.head.appendChild(st);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const def = id => (window.pfSkills ? pfSkills() : []).find(s => s.id === id) || { icon: '❔', name: id };

  window.skToggle = id => {
    const cur = [...(S.sk.load[S.you] || [])], i = cur.indexOf(id);
    if (i >= 0) cur.splice(i, 1); else if (cur.length < 2) cur.push(id); else return toast('Максимум 2 скіли на гру');
    send({ type: 'skload', ids: cur });
  };
  function card() {
    if (!S || !S.sk) return '';
    const me = S.you, o = 1 - me, P = window.pfGet && pfGet(), inv = (P && P.inv) || {}, owned = (window.pfSkills ? pfSkills() : []).filter(s => inv[s.id] > 0);
    const vote = S.sk.vote, on = S.sk.on;
    const oppName = esc(S.names[o] || 'Суперник');
    return `<h3>🎒 Скіли</h3><div class="card">
<label class="chk"><input type="checkbox" ${vote[me] ? 'checked' : ''} onchange="send({type:'skvote',on:this.checked})"> Грати зі скілами</label>
<div class="muted" style="font-size:13px">${on ? '✅ Обоє погодились — скіли діятимуть.' : vote[me] ? `⏳ Чекаємо згоди: ${oppName}` : `Скіли діють, лише якщо погодяться обоє${vote[o] ? ` (${oppName} вже «за»)` : ''}.`}</div>
${vote[me] ? (owned.length ? `<div style="margin-top:6px">Ваш набір (до 2):</div>${owned.map(s => `<button class="sk-chip ${(S.sk.load[me] || []).includes(s.id) ? 'on' : ''}" onclick="skToggle('${s.id}')">${s.icon} ${E(s.name)} <small>×${inv[s.id]}</small></button>`).join('')}` : '<div class="muted" style="margin-top:6px">У вас немає скілів — купіть у «👤 Профіль» → Магазин.</div>') : ''}
${on && (S.sk.load[o] || []).length ? `<div class="muted" style="font-size:13px;margin-top:4px">${oppName} взяв(ла): ${(S.sk.load[o]).map(id => def(id).icon).join(' ')}</div>` : ''}</div>`;
  }
  const prevES = window.extraSettings;
  window.extraSettings = function () { return (prevES ? prevES() : '') + card(); };

  const bar = document.createElement('div'); bar.id = 'skBar'; document.body.appendChild(bar);
  function drawBar() {
    const k = S && S.sk && S.sk.ids, live = S && (S.phase === 'play' || S.phase === 'wheel');
    if (!k || !live || !(k[0].length || k[1].length)) { bar.style.display = 'none'; document.body.classList.remove('sk-pad'); return; }
    const me = S.you, o = 1 - me, used = S.sk.used;
    bar.innerHTML = k[me].map(id => { const d = def(id), u = used[me].includes(id), wrong = d.when !== S.phase;
      return `<button class="${u ? 'ghost' : 'primary'}" ${u || wrong ? 'disabled' : ''} onclick="send({type:'skill',id:'${id}'})" title="${E(d.desc || '')}">${d.icon} ${E(d.name)}${u ? ' ✔' : ''}</button>`; }).join('')
      + (k[o].length ? `<div class="o">${esc(S.names[o] || 'Суперник')}: ${k[o].map(id => def(id).icon + (used[o].includes(id) ? '✔' : '')).join(' ')}</div>` : '');
    bar.style.display = 'block'; document.body.classList.add('sk-pad');
  }
  const base = window.render;
  window.render = function () { base(); drawBar(); };
  window.render();
})();
