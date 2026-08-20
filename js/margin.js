/* ════════════════════════════════════════════════════════════
   MARGIN — quick thoughts and quotes. A visible Add button from
   the start (the old version relied only on ⌘/Ctrl+Enter, which
   read as broken because there was nothing to click).

   Layout: a masonry, Pinterest-style feed of small post-it sized
   cards (CSS multi-column, see .mg-masonry) instead of a single
   full-width stacked list — denser, more scannable at a glance.
   ════════════════════════════════════════════════════════════ */
const Margin = (() => {
  let kind = 'thought', q = '';

  const list = () => Store.get('thoughts', []);
  const save = (l) => Store.set('thoughts', l);

  function render() {
    const host = document.getElementById('view-margin');
    if (!host) return;
    host.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div class="card-b">
          <textarea class="inp" id="mgInput" rows="2" placeholder="A thought, half-formed. ⌘/Ctrl+Enter or the button below."></textarea>
          <div class="mg-controls">
            <div class="seg" id="mgKind">
              <button data-k="thought" class="${kind === 'thought' ? 'on' : ''}">Thought</button>
              <button data-k="quote" class="${kind === 'quote' ? 'on' : ''}">Quote</button>
            </div>
            <input class="inp" id="mgWho" placeholder="Said by…" ${kind === 'quote' ? '' : 'hidden'}>
            <button class="btn grad" id="mgAdd">Add</button>
          </div>
        </div>
      </div>
      <div class="find" style="margin:0 0 14px">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="mgSearch" placeholder="Search / #tag" value="${esc(q)}">
      </div>
      <div id="mgList" class="mg-masonry"></div>`;

    document.getElementById('mgAdd').onclick = add;
    document.getElementById('mgInput').onkeydown = e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); add(); }
    };
    host.querySelectorAll('#mgKind button').forEach(b => b.onclick = () => {
      kind = b.dataset.k; render();
      document.getElementById('mgInput').focus();
    });
    document.getElementById('mgSearch').oninput = e => { q = e.target.value.trim(); renderList(); };

    renderList();
  }

  function renderList() {
    const host = document.getElementById('mgList');
    if (!host) return;
    const needle = q.toLowerCase();
    const items = list().filter(i => !needle || (i.text + ' ' + (i.who || '')).toLowerCase().includes(needle));
    if (!items.length) {
      host.innerHTML = `<div class="empty"><b>${list().length ? 'Nothing matches that.' : 'Empty.'}</b>${list().length ? '' : 'Type something above and press Add.'}</div>`;
      return;
    }
    host.innerHTML = items.map(i => {
      const body = esc(i.text).replace(/#([\w-]+)/g, '<span class="mg-tag">#$1</span>');
      return `<div class="card mg-card${i.kind === 'quote' ? ' mg-quote' : ''}" data-id="${i.id}">
        <div class="card-b">
          <p class="mg-text">${body}</p>
          ${i.who ? `<div class="mg-who">— ${esc(i.who)}</div>` : ''}
          <div class="mg-foot"><span>${new Date(i.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            <button data-del="${i.id}">Remove</button></div>
        </div>
      </div>`;
    }).join('');

    host.querySelectorAll('.mg-tag').forEach(t => t.onclick = () => {
      q = t.textContent; document.getElementById('mgSearch').value = q; renderList();
    });
    host.querySelectorAll('[data-del]').forEach(btn => btn.onclick = () => {
      save(list().filter(x => x.id !== btn.dataset.del));
      renderList();
    });
  }

  function add() {
    const ta = document.getElementById('mgInput');
    const text = ta.value.trim();
    if (!text) return;
    const who = document.getElementById('mgWho').value.trim();
    const l = list();
    l.unshift({ id: uid(), text, kind, who, at: Date.now() });
    save(l);
    ta.value = '';
    document.getElementById('mgWho').value = '';
    renderList();
  }

  function init() { /* nothing to wire ahead of render */ }

  return { init, render };
})();
