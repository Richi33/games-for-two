// Інтерфейс адмінки (/admin). Вхід — код профілю з ADMIN_PIDS.
(function () {
  const $ = s => document.querySelector(s), m = $('#m');
  let code = sessionStorage.adm || '', ov = null, tab = 'content', colId = sessionStorage.admCol || '', q = '';
  const el = (tag, props, ...kids) => { const e = document.createElement(tag); Object.assign(e, props || {}); kids.flat().forEach(k => e.append(k)); return e; };
  const toast = t => { const x = $('#toast'); x.textContent = t; x.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => x.style.display = 'none', 2400); };
  async function api(path, body) {
    const r = await fetch('/api/admin/' + path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + code, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'Помилка ' + r.status); e.status = r.status; throw e; }
    return j;
  }
  const fail = e => { if (e.status === 401 || e.status === 403 || e.status === 429) { if (e.status === 401) { delete sessionStorage.adm; code = ''; } login(e.message); } else toast('⚠ ' + e.message); };

  function login(msg) {
    m.replaceChildren(el('h1', { textContent: '🔐 Адмінка' }), el('div', { className: 'card' },
      el('div', { className: 'mu', textContent: 'Введіть код профілю (👤 Профіль → Код відновлення). Доступ мають лише коди з змінної ADMIN_PIDS на сервері.' }),
      (() => { const i = el('input', { id: 'code', placeholder: 'код профілю (32 символи)', value: code || localStorage.gft_pid || '', autocomplete: 'off' }); i.onkeydown = e => e.key === 'Enter' && go(); return i; })(),
      msg ? el('div', { className: 'err', textContent: msg }) : '', el('button', { textContent: 'Увійти', onclick: go })));
    async function go() { code = $('#code').value.trim().toLowerCase(); try { await load(); sessionStorage.adm = code; } catch (e) { login(e.message); } }
  }
  async function load() { ov = await api('overview'); draw(); }

  function draw() {
    const tabs = [['content', '📚 Контент'], ['games', '🎮 Ігри'], ['skills', '🎒 Скіли й нагороди'], ['log', '📝 Журнал']];
    m.replaceChildren(
      el('div', { className: 'row' }, el('h1', { className: 'grow', textContent: '⚙️ Адмінка' }), el('span', { className: 'mu', textContent: `Кімнат: ${ov.stats.rooms} · гравців онлайн: ${ov.stats.players}` }), el('button', { className: 'g s', textContent: 'Вийти', onclick: () => { delete sessionStorage.adm; code = ''; login(); } })),
      el('div', { className: 'tabs' }, tabs.map(([k, t]) => el('button', { className: tab === k ? 'on' : '', textContent: t, onclick: () => { tab = k; draw(); } }))),
      el('div', { id: 'body' }));
    ({ content: drawContent, games: drawGames, skills: drawSkills, log: drawLog })[tab]();
  }

  // ---------- Контент ----------
  async function drawContent() {
    const b = $('#body'), groups = {};
    ov.cols.forEach(c => (groups[c.group] = groups[c.group] || []).push(c));
    if (!ov.cols.some(c => c.id === colId)) colId = ov.cols[0].id;
    const sel = el('select', { onchange: () => { colId = sel.value; sessionStorage.admCol = colId; q = ''; drawContent(); } },
      Object.entries(groups).map(([g, list]) => el('optgroup', { label: g }, list.map(c => el('option', { value: c.id, selected: c.id === colId, textContent: `${c.title} (${c.total}${c.changed ? ', змін: ' + c.changed : ''})` })))));
    b.replaceChildren(el('div', { className: 'card' }, sel), el('div', { id: 'col' }, el('div', { className: 'mu', textContent: 'Завантаження…' })));
    try { renderCol(await api('col/' + colId)); } catch (e) { fail(e); }
  }
  function renderCol(d) {
    const box = $('#col'); if (!box) return;
    const add = el('textarea', { placeholder: d.hint });
    const search = el('input', { placeholder: '🔎 пошук…', value: q, oninput: () => { q = search.value; list(); } });
    const lst = el('div', { className: 'card' });
    const act = async body => { try { const r = await api('col/' + colId, body); ov = await api('overview'); renderCol(r); return true; } catch (e) { fail(e); return false; } };
    function list() {
      const low = q.toLowerCase(), items = d.items.filter(i => !low || i.text.toLowerCase().includes(low));
      lst.replaceChildren(el('div', { className: 'mu', textContent: `Показано ${items.length} з ${d.items.length}` }), ...items.slice(0, 300).map(i => {
        const row = el('div', { className: 'item ' + i.status });
        const view = () => {
          row.replaceChildren(el('div', { className: 't' }, i.text, i.orig ? el('div', { className: 'mu', textContent: 'було: ' + i.orig }) : ''),
            i.status !== 'base' ? el('span', { className: 'badge ' + i.status, textContent: { added: 'додано', edited: 'змінено', hidden: 'видалено' }[i.status] }) : '',
            i.status === 'hidden' ? '' : el('button', { className: 'g s', textContent: '✏️', title: 'Редагувати', onclick: edit }),
            i.status === 'hidden' || i.status === 'edited' ? el('button', { className: 'g s', textContent: '↩', title: 'Відновити оригінал', onclick: () => act({ op: 'restore', id: i.id }) }) : '',
            i.status === 'hidden' ? '' : el('button', { className: 'r s', textContent: '🗑', title: 'Видалити', onclick: () => confirm('Видалити запис?') && act({ op: 'delete', id: i.id }) }));
        };
        const edit = () => { const ta = el('textarea', { value: i.text }); row.replaceChildren(el('div', { className: 't' }, ta, el('div', { className: 'row' }, el('button', { className: 's', textContent: 'Зберегти', onclick: () => act({ op: 'edit', id: i.id, text: ta.value }) }), el('button', { className: 'g s', textContent: 'Скасувати', onclick: view })))); ta.focus(); };
        view(); return row;
      }));
    }
    box.replaceChildren(
      el('div', { className: 'card' }, el('b', { textContent: '➕ Додати запис' }), el('div', { className: 'mu', textContent: d.hint }), add, el('div', { className: 'row' }, el('button', { textContent: 'Додати', onclick: async () => { if (await act({ op: 'add', text: add.value })) toast('Додано'); } }))),
      el('div', { className: 'card' }, search, el('div', { className: 'row' }, el('button', { className: 'g s', textContent: '⟲ Скинути колекцію до стандартної', onclick: () => confirm('Скасувати всі зміни в цій колекції?') && act({ op: 'reset' }) }))),
      lst); list();
  }

  // ---------- Ігри ----------
  function drawGames() {
    $('#body').replaceChildren(el('div', { className: 'card' }, el('div', { className: 'mu', textContent: 'Вимкнена гра зникає з вибору в лобі й не запускається. Кімнати в лобі автоматично переходять на іншу гру.' }),
      ov.games.map(g => { const cb = el('input', { type: 'checkbox', checked: !g.off, style: 'width:auto', onchange: async () => { try { await api('games', { id: g.id, off: !cb.checked }); ov = await api('overview'); draw(); toast(cb.checked ? 'Увімкнено' : 'Вимкнено'); } catch (e) { cb.checked = !cb.checked; fail(e); } } });
        return el('label', { className: 'sw' }, el('span', { textContent: `${g.e} ${g.n}` }), cb); })));
  }

  // ---------- Скіли та нагороди ----------
  function drawSkills() {
    const b = $('#body'), fam = { strong: 'сильний', neutral: 'нейтральний', soft: 'м’який' };
    const sk = el('div', { className: 'card' }, el('b', { textContent: '🎒 Скіли' }), ov.skills.map(s => {
      const price = el('input', { className: 'num', type: 'number', min: 0, max: 10000, value: s.price }), cb = el('input', { type: 'checkbox', checked: !s.off, style: 'width:auto' });
      const saveS = async () => { try { await api('skills', { id: s.id, price: +price.value, off: !cb.checked }); ov = await api('overview'); toast('Збережено'); } catch (e) { fail(e); } };
      return el('div', { className: 'sw' }, el('span', { className: 'grow', textContent: `${s.icon} ${s.name} · ${fam[s.fam]} (стандарт ${s.basePrice}⭐)` }), price, el('label', { className: 'row' }, cb, 'увімкнено'), el('button', { className: 's', textContent: 'Зберегти', onclick: saveS }));
    }));
    const R = ov.rewards, inp = {};
    const rw = el('div', { className: 'card' }, el('b', { textContent: '⭐ Нагороди за гру' }), el('div', { className: 'mu', textContent: 'Проти бота нагорода вдвічі менша (ліміт 40⭐ на добу).' }),
      [['w', 'Перемога'], ['d', 'Нічия'], ['l', 'Поразка']].map(([k, t]) => { inp[k] = { stars: el('input', { className: 'num', type: 'number', min: 0, value: R[k].stars }), xp: el('input', { className: 'num', type: 'number', min: 0, value: R[k].xp }) };
        return el('div', { className: 'sw' }, el('span', { className: 'grow', textContent: t }), '⭐', inp[k].stars, 'XP', inp[k].xp); }),
      el('div', { className: 'row' }, el('button', { textContent: 'Зберегти', onclick: async () => { const o = {}; for (const k in inp) o[k] = { stars: +inp[k].stars.value, xp: +inp[k].xp.value }; try { await api('rewards', { rewards: o }); ov = await api('overview'); toast('Збережено'); } catch (e) { fail(e); } } }),
        el('button', { className: 'g', textContent: 'Скинути до стандартних', onclick: async () => { try { await api('rewards', { reset: true }); ov = await api('overview'); draw(); } catch (e) { fail(e); } } })));
    b.replaceChildren(sk, rw);
  }

  // ---------- Журнал ----------
  function drawLog() {
    $('#body').replaceChildren(el('div', { className: 'card' }, ov.log.length ? ov.log.map(l => el('div', { className: 'item' }, el('div', { className: 'mu', textContent: new Date(l.t).toLocaleString('uk-UA') + ' · ' + l.who }), el('div', { className: 't', textContent: l.text }))) : el('div', { className: 'mu', textContent: 'Змін поки немає' })));
  }

  if (code) load().catch(e => { if (e.status === 401) { delete sessionStorage.adm; code = ''; } login(e.message); }); else login();
})();
