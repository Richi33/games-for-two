// Швидкі реакції та чат (живуть поза #app, тому не зникають при перемальовуванні гри).
(function () {
  const REACT = ['😂', '👏', '😡', '😮', '❤️', '🔥', '👍', '😭'];
  const st = document.createElement('style');
  st.textContent = `
#cbtn{position:fixed;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:20;width:52px;height:52px;border-radius:50%;padding:0;font-size:24px;background:var(--ac);box-shadow:0 4px 14px #0006;display:none}
#cbtn i{position:absolute;top:-2px;right:-2px;background:var(--bad);color:#fff;font-style:normal;font-size:12px;min-width:20px;height:20px;border-radius:10px;line-height:20px;text-align:center}
#cpan{position:fixed;left:0;right:0;bottom:0;z-index:30;background:var(--card);border-radius:18px 18px 0 0;padding:12px 12px calc(12px + env(safe-area-inset-bottom));max-width:560px;margin:0 auto;box-shadow:0 -6px 24px #000a;display:none}
#cpan.on{display:block}
.crx{display:flex;gap:4px;justify-content:space-between;margin-bottom:8px}.crx button{flex:1;font-size:24px;padding:8px 0;background:var(--card2)}
#clist{max-height:34vh;overflow:auto;display:flex;flex-direction:column;gap:5px;margin-bottom:8px}
.cm{max-width:82%;padding:7px 11px;border-radius:14px;background:var(--card2);word-break:break-word;font-size:15px}.cm small{display:block;color:var(--mu);font-size:11px}
.cm.me{align-self:flex-end;background:var(--ac)}.cm.me small{color:#e6e2ff}
.cin{display:flex;gap:8px}.cin input{flex:1;min-width:0;font-size:16px;padding:10px 12px}.cin button{flex:none;padding:10px 16px}
.cx{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.fly{position:fixed;bottom:90px;z-index:40;pointer-events:none;text-align:center;font-size:44px;animation:fly 2.2s ease-out forwards}
.fly small{display:block;font-size:12px;color:#fff;text-shadow:0 1px 3px #000}
@keyframes fly{0%{transform:translateY(0) scale(.6);opacity:0}15%{opacity:1;transform:translateY(-30px) scale(1.15)}100%{transform:translateY(-52vh) scale(1);opacity:0}}
`;
  document.head.appendChild(st);
  const btn = document.createElement('button'); btn.id = 'cbtn'; btn.setAttribute('aria-label', 'Чат і реакції'); btn.textContent = '💬';
  const pan = document.createElement('div'); pan.id = 'cpan';
  pan.innerHTML = `<div class="cx"><b>Чат і реакції</b><button class="ghost" id="cclose" aria-label="Закрити">✕</button></div>
    <div class="crx">${REACT.map(e => `<button data-e="${e}">${e}</button>`).join('')}</div>
    <div id="clist"></div><div class="cin"><input id="cin" type="text" maxlength="120" placeholder="Повідомлення…" autocomplete="off"><button class="primary" id="csend" style="margin:0;width:auto">➤</button></div>`;
  document.body.append(btn, pan);

  let msgs = [], unread = 0, open = false;
  const me = () => (S ? S.you : -1);
  const nm = i => (S && S.names[i]) || '';
  function drawList() {
    const el = document.getElementById('clist'); if (!el) return;
    el.innerHTML = msgs.map(m => `<div class="cm ${m.from === me() ? 'me' : ''}"><small>${esc(m.from === me() ? 'Ви' : (m.name || nm(m.from)))}</small>${esc(m.t)}</div>`).join('') || '<div class="muted" style="text-align:center">Поки порожньо — напишіть щось 🙂</div>';
    el.scrollTop = el.scrollHeight;
  }
  function badge() { btn.innerHTML = '💬' + (unread ? `<i>${unread > 9 ? '9+' : unread}</i>` : ''); }
  function setOpen(v) {
    open = v; pan.classList.toggle('on', v); if (v) { unread = 0; badge(); drawList(); }
  }
  btn.onclick = () => setOpen(!open);
  document.getElementById('cclose').onclick = () => setOpen(false);
  pan.querySelectorAll('.crx button').forEach(b => b.onclick = () => send({ type: 'react', e: b.dataset.e }));
  const sendChat = () => { const i = document.getElementById('cin'), t = i.value.trim(); if (!t) return; i.value = ''; send({ type: 'chat', t }); };
  document.getElementById('csend').onclick = sendChat;
  document.getElementById('cin').onkeydown = e => { if (e.key === 'Enter') sendChat(); };

  function fly(e, from) {
    const d = document.createElement('div'); d.className = 'fly'; d.style.left = (12 + Math.random() * 62) + '%';
    d.innerHTML = `${e}<small>${esc(from)}</small>`; document.body.appendChild(d); setTimeout(() => d.remove(), 2300);
  }
  window.onExtraMsg = m => {
    if (m.type === 'react') fly(m.e, m.from === me() ? 'Ви' : nm(m.from));
    else if (m.type === 'chat') { msgs.push(m); if (msgs.length > 40) msgs.shift(); if (open) drawList(); else if (m.from !== me()) { unread++; badge(); toast('💬 ' + (m.name || nm(m.from)) + ': ' + m.t.slice(0, 40)); } }
    else if (m.type === 'chathist') { msgs = m.list || []; drawList(); }
  };
  const base = window.render;
  window.render = function () { base(); const inRoom = !!S; btn.style.display = inRoom ? 'block' : 'none'; if (!inRoom) { setOpen(false); msgs = []; unread = 0; badge(); } };
  badge(); window.render();
})();
