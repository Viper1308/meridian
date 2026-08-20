/* ════════════════════════════════════════════════════════════
   BOOKS — a reading shelf. Title, author, status. No external
   API calls (no cover-fetching) — deliberately kept dependency-
   free so this screen can never break on a network failure.
   ════════════════════════════════════════════════════════════ */
const Books = (() => {
  const STATUSES = [
    { id: 'reading', label: 'Reading' },
    { id: 'read', label: 'Finished' },
    { id: 'want', label: 'Want to read' },
  ];
  let filter = 'all';

  const list = () => Store.get('books', []);
  const save = (l) => Store.set('books', l);

  function render() {
    const host = document.getElementById('view-books');
    if (!host) return;
    const books = list();

    host.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div class="card-b">
          <div class="shelf-form">
            <input class="inp" id="bkTitle" placeholder="Title">
            <input class="inp" id="bkAuthor" placeholder="Author">
            <select class="inp" id="bkStatus">${STATUSES.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}</select>
            <button class="btn grad" id="bkAdd">Shelve it</button>
          </div>
        </div>
      </div>
      <div class="sub-tabs" id="bkFilters">
        <button class="stab${filter === 'all' ? ' on' : ''}" data-f="all">All (${books.length})</button>
        ${STATUSES.map(s => {
          const n = books.filter(b => b.status === s.id).length;
          return `<button class="stab${filter === s.id ? ' on' : ''}" data-f="${s.id}">${s.label} (${n})</button>`;
        }).join('')}
      </div>
      <div id="bkShelf"></div>`;

    document.getElementById('bkAdd').onclick = add;
    document.getElementById('bkTitle').onkeydown = e => { if (e.key === 'Enter') add(); };
    host.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; render(); });

    renderShelf();
  }

  function renderShelf() {
    const host = document.getElementById('bkShelf');
    if (!host) return;
    const books = list().filter(b => filter === 'all' || b.status === filter);
    if (!books.length) {
      host.innerHTML = `<div class="empty"><b>Nothing here yet.</b>Add a book above.</div>`;
      return;
    }
    host.innerHTML = books.map(b => `
      <div class="book-row">
        <div class="book-info">
          <div class="book-title">${esc(b.title)}</div>
          <div class="book-author">${esc(b.author || 'Unknown author')}</div>
        </div>
        <select class="inp narrow" data-status="${b.id}">
          ${STATUSES.map(s => `<option value="${s.id}"${s.id === b.status ? ' selected' : ''}>${s.label}</option>`).join('')}
        </select>
        <button class="btn" data-del="${b.id}">Remove</button>
      </div>`).join('');

    host.querySelectorAll('[data-status]').forEach(sel => sel.onchange = () => {
      const l = list();
      const b = l.find(x => x.id === sel.dataset.status);
      if (b) { b.status = sel.value; save(l); render(); }
    });
    host.querySelectorAll('[data-del]').forEach(btn => btn.onclick = () => {
      save(list().filter(x => x.id !== btn.dataset.del));
      render();
    });
  }

  function add() {
    const title = document.getElementById('bkTitle').value.trim();
    if (!title) return;
    const author = document.getElementById('bkAuthor').value.trim();
    const status = document.getElementById('bkStatus').value;
    const l = list();
    l.unshift({ id: uid(), title, author, status, at: Date.now() });
    save(l);
    filter = 'all';
    render();
  }

  function init() { /* nothing to wire ahead of render */ }

  return { init, render };
})();
