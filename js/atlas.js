/* ════════════════════════════════════════════════════════════
   ATLAS — the library. Index on the left, topic on the right.
   No AI dependency: read the gloss, write your own notes, mark
   what you've mastered.
   ════════════════════════════════════════════════════════════ */
const Atlas = (() => {
  let sheet = null, sel = null, openSec = { 0: true }, q = '';

  const sheets = () => window.SUBJECTS || [];
  const tid = (a, b) => a + '-' + b;
  const nTopics = s => s.sections.reduce((n, x) => n + x.topics.length, 0);
  const prog = () => Store.get('prog', {});
  const notes = () => Store.get('note', {});
  const pkey = (sid, name) => sid + '::' + name;

  function logActivity(kind, subject, topic) {
    const a = Store.get('activity', []);
    a.unshift({ id: uid(), at: Date.now(), kind, subject, topic });
    Store.set('activity', a.slice(0, 60));
  }
  function snapshot() {
    const h = Store.get('history', {});
    h[today()] = Object.keys(prog()).length;
    Store.set('history', h);
  }

  function boot() {
    if (!sheets().length) return;
    const ui = Store.get('atlas.ui', {});
    sheet = sheets().find(s => s.id === ui.sheet) || sheets()[0];
    if (ui.si != null && sheet && sheet.sections[ui.si]) {
      sel = { si: ui.si, ti: ui.ti || 0 };
      openSec[ui.si] = true;
    }
  }

  function refresh() {
    if (!sheet) boot();
    if (!sheet) { renderEmpty(); return; }
    render();
  }

  function renderEmpty() {
    const host = document.getElementById('atlasIdx');
    if (host) host.innerHTML = '<div class="empty"><b>No subjects loaded</b>Check that the data files are present.</div>';
  }

  function open(id, si, ti) {
    const s = sheets().find(x => x.id === id);
    if (!s) return false;
    sheet = s;
    sel = (si != null) ? { si, ti: ti || 0 } : null;
    openSec = si != null ? { [si]: true } : { 0: true };
    q = '';
    Store.set('atlas.ui', { sheet: id, si: sel && sel.si, ti: sel && sel.ti });
    render();
    return true;
  }

  function render() {
    renderTabs();
    renderIndex();
    renderReader();
  }

  function renderTabs() {
    const host = document.getElementById('atlasTabs');
    if (!host) return;
    host.innerHTML = sheets().map(s =>
      `<button class="stab${s.id === sheet.id ? ' on' : ''}" data-sheet="${esc(s.id)}">
        <i style="background:var(--accent)"></i>${esc(s.short || s.name)}</button>`).join('');
    host.querySelectorAll('[data-sheet]').forEach(b => b.onclick = () => open(b.dataset.sheet));
  }

  function renderIndex() {
    const host = document.getElementById('atlasIdx');
    if (!host) return;
    const P = prog(), N = notes();
    const total = nTopics(sheet);
    let done = 0, noted = 0;
    sheet.sections.forEach(s => s.topics.forEach(t => {
      if (P[pkey(sheet.id, t[0])]) done++;
      if ((N[pkey(sheet.id, t[0])] || '').trim()) noted++;
    }));
    const pct = total ? Math.round(done / total * 100) : 0;

    let h = `<div class="sheet-n">${esc(sheet.name)}</div>
      <div class="sheet-l">${esc(sheet.level)}</div>
      <div class="mini">
        <div class="mini-t"><span>mastered</span><b>${pct}%</b></div>
        <div class="btrack"><div class="bfill" style="width:${pct}%;background:var(--grad)"></div></div>
        <div class="mini-t" style="margin:6px 0 0"><span>${done} / ${total} topics</span><span>${noted} noted</span></div>
      </div>
      <div class="find">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="atlasFind" placeholder="find a topic" value="${esc(q)}">
      </div>`;

    sheet.sections.forEach((sec, si) => {
      const items = sec.topics.map((t, ti) => ({ t, ti })).filter(({ t }) =>
        !q || (t[0] + ' ' + (t[1] || '') + ' ' + sec.title).toLowerCase().includes(q.toLowerCase()));
      if (!items.length) return;
      const isOpen = q ? true : !!openSec[si];
      const w = sec.topics.filter(t => P[pkey(sheet.id, t[0])]).length;
      h += `<div class="sec">
        <button class="sec-h" data-sec="${si}">
          <span class="sec-i">${String(si + 1).padStart(2, '0')}</span>
          <span class="sec-t">${esc(sec.title)}</span>
          <span class="sec-n">${w}/${sec.topics.length}</span>
        </button>`;
      if (isOpen) {
        h += '<div class="tops">';
        items.forEach(({ t, ti }) => {
          const cls = ['top-i'];
          if (sel && sel.si === si && sel.ti === ti) cls.push('on');
          if (P[pkey(sheet.id, t[0])]) cls.push('done');
          else if ((N[pkey(sheet.id, t[0])] || '').trim()) cls.push('noted');
          h += `<button class="${cls.join(' ')}" data-si="${si}" data-ti="${ti}"><i></i><span>${esc(t[0])}</span></button>`;
        });
        h += '</div>';
      }
      h += '</div>';
    });
    host.innerHTML = h;

    const f = document.getElementById('atlasFind');
    if (f) f.oninput = e => {
      q = e.target.value; renderIndex();
      const nf = document.getElementById('atlasFind');
      if (nf) { nf.focus(); nf.setSelectionRange(nf.value.length, nf.value.length); }
    };
    host.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => {
      const i = +b.dataset.sec; openSec[i] = !openSec[i]; renderIndex();
    });
    host.querySelectorAll('[data-si]').forEach(b => b.onclick = () => {
      sel = { si: +b.dataset.si, ti: +b.dataset.ti };
      Store.set('atlas.ui', { sheet: sheet.id, si: sel.si, ti: sel.ti });
      renderIndex(); renderReader();
    });
  }

  function renderReader() {
    const host = document.getElementById('atlasRead');
    if (!host) return;
    if (!sel) {
      const total = nTopics(sheet);
      host.innerHTML = `<div class="crumb">Sheet</div>
        <h2 class="rd-t">${esc(sheet.name)}</h2>
        <p class="rd-g">${esc(sheet.blurb)}</p>
        <div class="empty" style="text-align:left;padding:26px 0 0">
          <b>${sheet.sections.length} sections · ${total} topics</b>
          Pick a topic from the index. Each one carries a short definition, a
          space for your own notes, and a mastery mark that feeds the dashboard.
        </div>`;
      return;
    }
    const sec = sheet.sections[sel.si], topic = sec.topics[sel.ti];
    const key = pkey(sheet.id, topic[0]);
    const isDone = !!prog()[key];
    const note = notes()[key] || '';

    const flat = [];
    sheet.sections.forEach((s, si) => s.topics.forEach((t, ti) => flat.push({ si, ti, name: t[0] })));
    const pos = flat.findIndex(f => f.si === sel.si && f.ti === sel.ti);

    host.innerHTML = `
      <div class="crumb">${esc(sheet.name)} <b>/ ${esc(sec.title)}</b></div>
      <h2 class="rd-t">${esc(topic[0])}</h2>
      ${topic[1] ? `<p class="rd-g">${esc(topic[1])}</p>` : ''}
      <div class="rd-bar">
        <button class="btn ${isDone ? 'on' : 'grad'}" id="rdDone">${isDone ? '✓ Mastered' : 'Mark mastered'}</button>
        <button class="btn" id="rdCopy">Copy topic</button>
      </div>
      <div class="notes">
        <div class="notes-l">Your notes</div>
        <textarea id="rdNote" placeholder="What is the actual idea here? Write it in your own words.">${esc(note)}</textarea>
        <div class="notes-f"><span id="rdSaved">${note ? 'Saved' : 'Not written yet'}</span>
          <span>·</span><span>${note.trim() ? note.trim().split(/\s+/).length : 0} words</span></div>
      </div>
      <div class="rd-nav">
        ${pos > 0 ? `<button class="navb" data-go="${pos - 1}"><span>‹ Previous</span><b>${esc(flat[pos - 1].name)}</b></button>` : '<span></span>'}
        ${pos < flat.length - 1 ? `<button class="navb r" data-go="${pos + 1}"><span>Next ›</span><b>${esc(flat[pos + 1].name)}</b></button>` : '<span></span>'}
      </div>`;

    document.getElementById('rdDone').onclick = () => {
      const p = prog();
      if (p[key]) delete p[key];
      else { p[key] = 1; logActivity('mastered', sheet.name, topic[0]); }
      Store.set('prog', p); snapshot();
      renderIndex(); renderReader();
    };
    document.getElementById('rdCopy').onclick = () => {
      const txt = `${topic[0]}\n${sheet.name} · ${sec.title}\n${topic[1] || ''}\n\n${notes()[key] || ''}`;
      if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
      toast('Copied.');
    };
    const ta = document.getElementById('rdNote');
    let saveTimer = null;
    ta.oninput = () => {
      clearTimeout(saveTimer);
      const savedEl = document.getElementById('rdSaved');
      if (savedEl) savedEl.textContent = 'Saving…';
      saveTimer = setTimeout(() => {
        const n = notes(); const had = !!(n[key] || '').trim();
        n[key] = ta.value; Store.set('note', n);
        if (!had && ta.value.trim()) logActivity('noted', sheet.name, topic[0]);
        const s2 = document.getElementById('rdSaved');
        if (s2) { s2.textContent = 'Saved'; s2.className = 'saved'; }
        renderIndex();
      }, 700);
    };
    host.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
      const f = flat[+b.dataset.go];
      sel = { si: f.si, ti: f.ti }; openSec[f.si] = true;
      Store.set('atlas.ui', { sheet: sheet.id, si: sel.si, ti: sel.ti });
      renderIndex(); renderReader();
      host.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  return { refresh, open, logActivity, snapshot, nTopics, pkey };
})();
