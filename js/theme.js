/* ════════════════════════════════════════════════════════════
   THEME — toggling between the three built-in aesthetics.
   Pure CSS custom properties on [data-theme]; this file only
   flips the attribute and remembers the choice.
   ════════════════════════════════════════════════════════════ */
const Theme = (() => {
  const LIST = [
    { id: 'meridian', name: 'Meridian', desc: 'Violet gradient · soft glow' },
    { id: 'academy',  name: 'Academy',  desc: 'Charcoal · green, Notion-like' },
    { id: 'command',  name: 'Command',  desc: 'Ice-blue HUD · monospace' },
  ];

  function current() {
    return Store.get('theme', 'meridian');
  }

  function apply(id) {
    if (!LIST.find(t => t.id === id)) id = 'meridian';
    document.documentElement.setAttribute('data-theme', id);
    Store.set('theme', id);
  }

  function cycle() {
    const ids = LIST.map(t => t.id);
    const next = ids[(ids.indexOf(current()) + 1) % ids.length];
    apply(next);
    return LIST.find(t => t.id === next);
  }

  function init() { apply(current()); }

  return { LIST, current, apply, cycle, init };
})();
