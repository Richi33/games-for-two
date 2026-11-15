// Сховище ключ→рядок. Upstash Redis (HTTPS REST, без бібліотек) або файл (локально / запасний варіант).
const fs = require('fs');
const path = require('path');

function fileStore(dir) {
  const file = path.join(dir, 'profiles.json');
  let data = {}, timer = null;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* порожнє сховище */ }
  const flush = () => {
    timer = null;
    try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file + '.tmp', JSON.stringify(data)); fs.renameSync(file + '.tmp', file); }
    catch (e) { console.error('Не вдалося записати профілі:', e.message); }
  };
  return {
    kind: 'file',
    async get(k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    async set(k, v) { data[k] = v; if (!timer) timer = setTimeout(flush, 400); },
    flush() { if (timer) { clearTimeout(timer); flush(); } },
  };
}

function upstashStore(url, token) {
  url = url.replace(/\/+$/, '');
  const hdr = { Authorization: 'Bearer ' + token };
  const sig = () => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined);
  return {
    kind: 'upstash',
    async get(k) {
      const r = await fetch(`${url}/get/${encodeURIComponent(k)}`, { headers: hdr, signal: sig() });
      if (!r.ok) throw new Error('Upstash GET ' + r.status);
      const j = await r.json(); return j.result == null ? null : String(j.result);
    },
    async set(k, v) {
      const r = await fetch(url, { method: 'POST', headers: { ...hdr, 'Content-Type': 'application/json' }, body: JSON.stringify(['SET', k, v]), signal: sig() });
      if (!r.ok) throw new Error('Upstash SET ' + r.status);
    },
    flush() {},
  };
}

function createStore(env = process.env) {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) return upstashStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  return fileStore(env.DATA_DIR || path.join(__dirname, 'data'));
}
module.exports = { createStore, fileStore, upstashStore };
