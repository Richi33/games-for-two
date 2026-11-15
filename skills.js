// Скіли: купуються за ⭐, вмикаються в лобі лише за згодою обох гравців, кожен — раз за гру.
const CATALOG = [
  { id: 'double', icon: '✨', name: 'Подвійний куш', fam: 'strong', price: 40, desc: 'Якщо виграєте цю гру — ⭐ за перемогу ×2.', when: 'play' },
  { id: 'respin', icon: '🎡', name: 'Перекрутити', fam: 'neutral', price: 15, desc: 'Перекрутити колесо покарань (лише поки колесо крутиться).', when: 'wheel' },
  { id: 'xp2', icon: '📚', name: 'Подвійний досвід', fam: 'neutral', price: 20, desc: 'XP за цю гру ×2.', when: 'play' },
  { id: 'shield', icon: '🛡', name: 'Щит', fam: 'soft', price: 30, desc: 'Якщо програєте — покарання не виконуєте.', when: 'play' },
  { id: 'comfort', icon: '🧸', name: 'Втіха', fam: 'soft', price: 20, desc: 'Якщо програєте — +10 ⭐.', when: 'play' },
];
const FAMS = { strong: 'Сильний', neutral: 'Нейтральний', soft: 'М’який' };
const byId = id => CATALOG.find(s => s.id === id);
module.exports = { CATALOG, FAMS, byId, MAX_OWN: 9, SLOTS: 2 };
