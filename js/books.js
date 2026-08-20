/* ════════════════════════════════════════════════════════════
   BOOKS — a reading shelf. Title, author, status, plus:
   - bulk import from an Excel sheet (columns: Title / Author /
     Status — matched case-insensitively, Status optional)
   - a dedicated note-taking space attached to every book

   The XLSX parser (SheetJS) is loaded lazily, only when Import is
   actually clicked — the default path stays fully offline, same
   as the rest of this screen always has.
   ════════════════════════════════════════════════════════════ */
const Books = (() => {
  const STATUSES = [
    { id: 'reading', label: 'Reading' },
    { id: 'read', label: 'Finished' },
    { id: 'want', label: 'Want to read' },
  ];
  const XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  let filter = 'all';
  let openNotes = new Set();
  let xlsxLoading = null;

  const list = () => Store.get('books', []);
  const save = (l) => Store.set('books', l);
  const notes = () => Store.get('book_notes', {});
  const noteFor = (id) => notes()[id] || '';
  const saveNote = (id, text) => {
    const n = notes();
    if (text.trim()) n[id] = text; else delete n[id];
    Store.set('book_notes', n);
  };

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
          <div class="shelf-import">
            <label class="btn file-btn" id="bkImportBtn">
              <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2"><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>
              Import Excel
              <input type="file" id="bkImportFile" accept=".xlsx,.xls,.csv" hidden>
            </label>
            <span class="board-hint">Bulk-add from a sheet with Title / Author / Status columns.</span>
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
    document.getElementById('bkImportFile').onchange = e => handleImport(e.target.files[0]);
    host.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; render(); });

    renderShelf();
  }

  function renderShelf() {
    const host = document.getElementById('bkShelf');
    if (!host) return;
    const books = list().filter(b => filter === 'all' || b.status === filter);
    if (!books.length) {
      host.innerHTML = `<div class="empty"><b>Nothing here yet.</b>Add a book above, or import a sheet.</div>`;
      return;
    }
    host.innerHTML = books.map(b => {
      const hasNote = !!noteFor(b.id).trim();
      const open = openNotes.has(b.id);
      return `
      <div class="book-row-wrap">
        <div class="book-row">
          <div class="book-info">
            <div class="book-title">${esc(b.title)}${hasNote ? '<span class="book-note-dot" title="Has a note"></span>' : ''}</div>
            <div class="book-author">${esc(b.author || 'Unknown author')}</div>
          </div>
          <select class="inp narrow" data-status="${b.id}">
            ${STATUSES.map(s => `<option value="${s.id}"${s.id === b.status ? ' selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <button class="btn" data-note="${b.id}">${open ? 'Hide notes' : (hasNote ? 'Notes ●' : 'Notes')}</button>
          <button class="btn" data-del="${b.id}">Remove</button>
        </div>
        <div class="book-notes"${open ? '' : ' hidden'} id="bn-${b.id}">
          <textarea class="inp" id="bnText-${b.id}" rows="3" placeholder="Notes on this book…">${esc(noteFor(b.id))}</textarea>
          <div class="book-notes-f">
            <button class="btn grad" data-note-save="${b.id}">Save note</button>
            <span class="book-notes-hint">Saved locally, attached to this book.</span>
          </div>
        </div>
      </div>`;
    }).join('');

    host.querySelectorAll('[data-status]').forEach(sel => sel.onchange = () => {
      const l = list();
      const b = l.find(x => x.id === sel.dataset.status);
      if (b) { b.status = sel.value; save(l); render(); }
    });
    host.querySelectorAll('[data-del]').forEach(btn => btn.onclick = () => {
      save(list().filter(x => x.id !== btn.dataset.del));
      const n = notes(); delete n[btn.dataset.del]; Store.set('book_notes', n);
      openNotes.delete(btn.dataset.del);
      render();
    });
    host.querySelectorAll('[data-note]').forEach(btn => btn.onclick = () => {
      const id = btn.dataset.note;
      if (openNotes.has(id)) openNotes.delete(id); else openNotes.add(id);
      renderShelf();
    });
    host.querySelectorAll('[data-note-save]').forEach(btn => btn.onclick = () => {
      const id = btn.dataset.noteSave;
      const ta = document.getElementById('bnText-' + id);
      saveNote(id, ta ? ta.value : '');
      toast('Note saved.');
      renderShelf();
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

  /* ---- bulk import ---- */
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxLoading) return xlsxLoading;
    xlsxLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = XLSX_CDN;
      s.onload = () => resolve(window.XLSX);
      s.onerror = () => reject(new Error('Could not load the spreadsheet reader — check your connection.'));
      document.head.appendChild(s);
    });
    return xlsxLoading;
  }

  function statusFromValue(raw) {
    const v = String(raw || '').trim().toLowerCase();
    if (!v) return 'want';
    const hit = STATUSES.find(s => s.id === v || s.label.toLowerCase() === v || s.label.toLowerCase().startsWith(v));
    return hit ? hit.id : 'want';
  }

  function pick(row, names) {
    const keys = Object.keys(row);
    for (const name of names) {
      const k = keys.find(k => k.trim().toLowerCase() === name);
      if (k && String(row[k] || '').trim()) return String(row[k]).trim();
    }
    return '';
  }

  function handleImport(file) {
    if (!file) return;
    toast('Reading sheet…');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await loadXLSX();
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!rows.length) { toast('That sheet looks empty.'); return; }

        const l = list();
        let added = 0;
        rows.forEach(row => {
          const title = pick(row, ['title', 'book', 'name']);
          if (!title) return;
          const author = pick(row, ['author', 'writer', 'by']);
          const status = statusFromValue(pick(row, ['status', 'shelf', 'progress']));
          l.unshift({ id: uid(), title, author, status, at: Date.now() });
          added++;
        });
        if (!added) { toast('No Title column found in that sheet.'); return; }
        save(l);
        filter = 'all';
        render();
        toast(`Imported ${added} book${added === 1 ? '' : 's'}.`);
      } catch (err) {
        toast(err.message || 'Import failed.');
      } finally {
        const input = document.getElementById('bkImportFile');
        if (input) input.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function init() { /* nothing to wire ahead of render */ }

  return { init, render };
})();
