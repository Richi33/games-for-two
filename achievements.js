// Досягнення: рівні 🥉🥈🥇 (tiers — пороги) або одноразові (tiers: [1], метрика з «фактів» останньої гри).
const TIER_STARS = [15, 40, 100];
const ONE = 30;
const T = (id, icon, name, desc, tiers, metric) => ({ id, icon, name, desc, tiers, metric });
const F = (id, icon, name, desc, test) => ({ id, icon, name, desc, tiers: [1], metric: (p, f) => (f && test(f) ? 1 : 0), one: true });

const DEFS = [
  T('games', '🎮', 'Ігроман', 'Зіграйте ігор', [10, 50, 200], p => p.tot.p),
  T('wins', '🏆', 'Переможець', 'Перемог', [1, 10, 50], p => p.tot.w),
  T('streak', '🔥', 'Серія', 'Перемог поспіль', [3, 5, 8], p => p.best),
  T('variety', '🧭', 'Мандрівник', 'Різних ігор', [5, 12, 23], p => Object.keys(p.games).length),
  T('human', '👥', 'Живе спілкування', 'Ігор із живою людиною', [5, 25, 100], p => p.tot.human),
  T('chat', '💬', 'Балакун', 'Повідомлень у чаті', [10, 50, 200], p => p.tot.chat),
  T('react', '😂', 'Емоційний', 'Реакцій надіслано', [10, 50, 200], p => p.tot.react),
  T('marathon', '🏁', 'Марафонець', 'Марафонів завершено', [1, 5, 15], p => p.tot.mar),
  T('daily', '📅', 'Постійний гравець', 'Днів поспіль у грі', [3, 7, 30], p => p.days.best),
  T('punished', '😈', 'Піддослідний', 'Покарань отримано', [1, 5, 15], p => p.tot.pun),
  F('wordle_fast', '🟩', 'Снайпер слів', 'Wordle: вгадайте слово за 1–2 спроби', f => f.game === 'wordle' && f.result === 'w' && f.guesses <= 2),
  F('wordle_long', '🔤', 'Словесний марафон', 'Wordle: вгадайте слово з 8 літер', f => f.game === 'wordle' && f.result === 'w' && f.len === 8),
  F('bs_clean', '⚓', 'Без промаху', 'Морський бій: виграйте, жодного разу не схибивши', f => f.game === 'bs' && f.result === 'w' && f.misses === 0),
  F('luck_rare', '🎰', 'Улюбленець долі', 'Фортуна: вгадайте рідкісну подію (шанс до 10%)', f => f.game === 'luck' && f.rareHit),
  F('luck_sweep', '🍀', 'Щасливчик', 'Фортуна: виграйте 5 раундів із 7', f => f.game === 'luck' && f.luckWins >= 5),
  F('ttt_quick', '❌', 'Блискавка', 'Хрестики-нулики: виграйте за 3 ходи', f => f.game === 'ttt' && f.result === 'w' && f.marks === 3),
  F('mem_hard', '🧠', 'Слон', "Пам'ять: виграйте на складному рівні (проти людини чи бота)", f => f.game === 'mem' && f.result === 'w' && f.diff === 'hard'),
  F('bot_hard', '🤖', 'Переможець машин', 'Переможіть складного бота', f => f.bot && f.diff === 'hard' && f.result === 'w'),
];

// Повертає нові розблокування й оновлює p.ach (id → найвищий отриманий рівень).
function evaluate(p, facts) {
  const out = [];
  for (const d of DEFS) {
    const m = d.metric(p, facts) || 0, have = p.ach[d.id] || 0;
    let tier = 0; d.tiers.forEach((t, i) => { if (m >= t) tier = i + 1; });
    for (let t = have + 1; t <= tier; t++) out.push({ id: d.id, icon: d.icon, name: d.name, desc: d.desc, tier: t, of: d.tiers.length, stars: d.one ? ONE : TIER_STARS[t - 1] });
    if (tier > have) p.ach[d.id] = tier;
  }
  return out;
}
const publicDefs = () => DEFS.map(d => ({ id: d.id, icon: d.icon, name: d.name, desc: d.desc, tiers: d.tiers, one: !!d.one }));

// Факти про щойно завершену гру (з її стану), потрібні для досягнень.
function gameFacts(game, s, p, room) {
  const f = {};
  if (game === 'wordle') { f.guesses = s.g[p].length; f.len = s.len; }
  if (game === 'bs') f.misses = s.shots[p].filter(x => x === 1).length;
  if (game === 'luck') { f.rareHit = s.hist.some(h => h.by === p && h.pts >= 5); f.luckWins = s.hist.filter(h => h.by === p).length; }
  if (game === 'ttt') f.marks = s.b.filter(x => x === p).length;
  return f;
}
module.exports = { DEFS, evaluate, publicDefs, gameFacts };
