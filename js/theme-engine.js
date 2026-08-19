/* ════════════════════════════════════════════════════════════
   THEME ENGINE — toggling aesthetic + layout density.
   Themes are pure CSS custom properties on [data-theme].
   Adding a new theme = adding a block to themes.css + an entry here.
   ════════════════════════════════════════════════════════════ */
const ThemeEngine = (() => {
  const THEMES = [
    { id: 'meridian',  name: 'Meridian',  desc: 'Violet gradient · soft glow' },
    { id: 'academy',   name: 'Academy',   desc: 'Dark charcoal · green Notion' },
    { id: 'command',   name: 'Command',   desc: 'Ice-blue HUD · Batcomputer' },
  ];

  function current() { return Store.get('ui.theme', (window.MERIDIAN || {}).defaultTheme || 'meridian'); }

  function apply(id) {
    if (!THEMES.find(t => t.id === id)) id = 'meridian';
    document.documentElement.setAttribute('data-theme', id);
    Store.set('ui.theme', id);
    // layout density class
    document.body.classList.toggle('dense', id === 'command');
    document.body.classList.toggle('breathe', id === 'academy');
  }

  function init() { apply(current()); }

  function renderPicker(hostId) {
    const host = document.getElementById(hostId);
    if (!host) return;
    const cur = current();
    host.innerHTML = THEMES.map(t =>
      `<button class="th-opt${t.id === cur ? ' on' : ''}" data-theme="${t.id}">
         <span class="th-swatch" data-s="${t.id}"></span>
         <span><b>${esc(t.name)}</b><br><small>${esc(t.desc)}</small></span>
       </button>`
    ).join('');
    host.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => {
      apply(b.dataset.theme); renderPicker(hostId);
    });
  }

  return { THEMES, current, apply, init, renderPicker };
})();
