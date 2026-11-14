// Профіль гравця: рівень, ⭐ зірки, статистика, досягнення, нагороди після ігор, код відновлення.
(function () {
  const st = document.createElement('style');
  st.textContent = `
#pfBtn{position:fixed;top:10px;left:10px;z-index:30;margin:0;padding:7px 12px;border-radius:20px;font-size:14px;width:auto;background:var(--card);color:var(--tx);box-shadow:0 2px 8px #0004;display:none}
#pfBox{position:fixed;inset:0;z-index:60;background:var(--bg);overflow:auto;display:none;padding:14px 14px 40px}
#pfBox .in{max-width:520px;margin:0 auto}
.pf-h{display:flex;align-items:center;gap:12px;margin:8px 0}.pf-av{width:56px;height:56px;border-radius:50%;background:var(--ac);color:#fff;font-size:26px;font-weight:800;display:flex;align-items:center;justify-content:center}
.pf-bar{height:10px;border-radius:5px;background:var(--card2);overflow:hidden;margin:4px 0}.pf-bar i{display:block;height:100%;background:var(--ac)}
.pf-st{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center;margin:10px 0}.pf-st div{background:var(--card);border-radius:12px;padding:8px 2px}.pf-st b{display:block;font-size:18px}.pf-st span{font-size:11px;color:var(--mu)}
.pf-ac{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pf-a{background:var(--card);border-radius:12px;padding:10px;font-size:13px}.pf-a.off{opacity:.45;filter:grayscale(1)}.pf-a b{display:block;font-size:14px}.pf-a .t{color:var(--mu);font-size:12px}
.pf-g{display:flex;justify-content:space-between;padding:5px 2px;border-bottom:1px solid var(--card2);font-size:14px}
#pfPop{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:80;width:min(92vw,420px);display:flex;flex-direction:column;gap:8px;pointer-events:none}
.pf-r{background:var(--card);border:2px solid var(--ac);border-radius:16px;padding:10px 14px;box-shadow:0 4px 20px #0007;animation:pfin .35s both;font-size:14px}.pf-r b{font-size:15px}
@keyframes pfin{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}`;
  document.head.appendChild(st);
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let P = null, defs = [];
  const btn = document.createElement('button'); btn.id = 'pfBtn'; document.body.appendChild(btn);
  const box = document.createElement('div'); box.id = 'pfBox'; document.body.appendChild(box);
  const pop = document.createElement('div'); pop.id = 'pfPop'; document.body.appendChild(pop);
  const gname = id => { const g = (typeof GAMES !== 'undefined' ? GAMES : []).find(x => x.id === id); return g ? g.e + ' ' + g.n : id; };
  const label = () => { btn.textContent = P ? `👤 ${P.title} · ⭐ ${P.stars}` : '👤 Профіль'; };
  btn.onclick = () => open();

  function open() { box.style.display = 'block'; draw(); }
  window.pfClose = () => { box.style.display = 'none'; };
  function draw() {
    if (!P) { box.innerHTML = '<div class="in"><button onclick="pfClose()">← Назад</button><p class="muted">Профіль завантажується…</p></div>'; return; }
    const pct = Math.min(100, Math.round(P.xpCur / P.xpNeed * 100));
    const t = P.tot, gs = Object.entries(P.games).sort((a, b) => b[1].p - a[1].p);
    const have = defs.filter(d => P.ach[d.id]).length;
    box.innerHTML = `<div class="in"><button onclick="pfClose()" style="width:auto;margin:0">← Назад</button>
<div class="pf-h"><div class="pf-av">${P.level}</div><div style="flex:1"><b style="font-size:18px">${E(P.name || 'Гравець')}</b><div class="muted">${E(P.title)} · рівень ${P.level}</div>
<div class="pf-bar"><i style="width:${pct}%"></i></div><div class="muted" style="font-size:12px">XP: ${P.xpCur} / ${P.xpNeed}</div></div><div style="font-size:20px;font-weight:800">⭐ ${P.stars}</div></div>
<div class="pf-st"><div><b>${t.p}</b><span>ігор</span></div><div><b>${t.w}</b><span>перемог</span></div><div><b>${P.best}</b><span>серія 🔥</span></div><div><b>${P.days.streak}</b><span>днів поспіль</span></div></div>
<h3>🏅 Досягнення ${have}/${defs.length}</h3><div class="pf-ac">${defs.map(d => {
      const tier = P.ach[d.id] || 0, tiers = d.tiers.length;
      return `<div class="pf-a ${tier ? '' : 'off'}"><b>${d.icon} ${E(d.name)}</b><span>${E(d.desc)}</span><div class="t">${tiers > 1 ? `Рівень ${tier}/${tiers}` : (tier ? '✔ отримано' : 'ще ні')}${tiers > 1 ? ' · наступна ціль: ' + (d.tiers[tier] || 'максимум') : ''}</div></div>`;
    }).join('')}</div>
<h3>🎮 За іграми</h3>${gs.length ? gs.map(([g, x]) => `<div class="pf-g"><span>${E(gname(g))}</span><span>${x.w}✔ ${x.d}＝ ${x.l}✖</span></div>`).join('') : '<p class="muted">Зіграйте першу гру!</p>'}
<h3>🔑 Код відновлення</h3><p class="muted" style="font-size:13px">Збережіть його: за кодом профіль можна перенести на інший пристрій. Нікому не показуйте.</p>
<input id="pfCode" readonly value="${E(localStorage.gft_pid)}" onclick="this.select()" style="font-family:monospace;font-size:13px">
<p class="muted" style="font-size:13px;margin-bottom:4px">Вхід з іншого пристрою:</p><div class="row"><input id="pfIn" placeholder="вставте код" style="flex:1"><button onclick="pfRestore()" style="width:auto;margin:0">Ввійти</button></div></div>`;
  }
  window.pfRestore = () => { const c = (document.getElementById('pfIn').value || '').trim().toLowerCase(); if (c) send({ type: 'restore', code: c }); };

  function show(html) { const d = document.createElement('div'); d.className = 'pf-r'; d.innerHTML = html; pop.appendChild(d); setTimeout(() => d.remove(), 6500); }
  function reward(m) {
    if (m.profile) P = m.profile;
    const parts = [];
    if (m.daily) parts.push(`<b>🎁 Щоденний бонус: +${m.daily.stars} ⭐</b><div class="muted">Днів поспіль: ${m.daily.streak}</div>`);
    else if (m.marathon) parts.push(`<b>🏁 Марафон завершено</b>: +${m.stars} ⭐ +${m.xp} XP`);
    else if (m.stars || m.xp) parts.push(`<b>${m.result === 'w' ? '🏆 Перемога' : m.result === 'd' ? '🤝 Нічия' : '🎮 Гру зіграно'}</b>: +${m.stars} ⭐ +${m.xp} XP`);
    (m.ach || []).forEach(a => parts.push(`<b>${a.icon} Досягнення: ${E(a.name)}${a.of > 1 ? ' (' + a.tier + '/' + a.of + ')' : ''}</b> +${a.stars} ⭐`));
    if (m.levelUp) parts.push(`<b>⬆ Новий рівень: ${m.levelUp}!</b> ${E(P ? P.title : '')}`);
    parts.forEach(p => show(p)); label(); if (box.style.display === 'block') draw();
  }
  const prev = window.onExtraMsg;
  window.onExtraMsg = m => {
    if (m.type === 'profile') { P = m.profile; if (m.defs) defs = m.defs; label(); if (box.style.display === 'block') draw(); }
    else if (m.type === 'reward') reward(m);
    else if (m.type === 'restored') {
      if (m.ok) { localStorage.gft_pid = m.pid; toast('Профіль відновлено'); setTimeout(() => location.reload(), 700); } else toast('Код не підійшов');
    }
    else if (prev) prev(m);
  };
  const base = window.render;
  window.render = function () { base(); btn.style.display = (!S && box.style.display !== 'block') ? 'block' : 'none'; label(); };
  window.render();
})();
