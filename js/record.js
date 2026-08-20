/* ════════════════════════════════════════════════════════════
   RECORD — a professional ledger, structured like a LinkedIn
   profile. A headline card (name/role/place/bio), a live stats
   card pulled from the Atlas, then four dedicated, distinct
   sections underneath: Education, Experience, Awards & Honours,
   Skills. Each section is its own ledger — add, edit, remove —
   no free-form single textarea standing in for a resume.
   ════════════════════════════════════════════════════════════ */
const Record = (() => {
  const FIELDS = [
    { k: 'name', label: 'Name', placeholder: 'Your name' },
    { k: 'role', label: 'Role', placeholder: 'What you do' },
    { k: 'place', label: 'Location', placeholder: 'Where you are' },
  ];

  /* ---- section schema: each entry is its own small form ---- */
  const SECTIONS = [
    {
      key: 'education', title: 'Education',
      empty: 'No education added yet.',
      fields: [
        { k: 'degree', label: 'Degree / qualification', ph: 'B.Sc Computer Science' },
        { k: 'school', label: 'School / institution', ph: 'Institution name' },
        { k: 'start', label: 'Start', ph: '2019' },
        { k: 'end', label: 'End', ph: '2023 or Present' },
        { k: 'detail', label: 'Detail', ph: 'Coursework, honours, GPA…', area: true },
      ],
      line1: e => e.degree || 'Untitled',
      line2: e => e.school,
      line3: e => [e.start, e.end].filter(Boolean).join(' – '),
    },
    {
      key: 'experience', title: 'Experience',
      empty: 'No experience added yet.',
      fields: [
        { k: 'role', label: 'Title', ph: 'Product Designer' },
        { k: 'org', label: 'Company / organisation', ph: 'Company name' },
        { k: 'start', label: 'Start', ph: 'Jan 2022' },
        { k: 'end', label: 'End', ph: 'Present' },
        { k: 'detail', label: 'What you did', ph: 'A couple of lines…', area: true },
      ],
      line1: e => e.role || 'Untitled',
      line2: e => e.org,
      line3: e => [e.start, e.end].filter(Boolean).join(' – '),
    },
    {
      key: 'awards', title: 'Awards & Honours',
      empty: 'No awards added yet.',
      fields: [
        { k: 'name', label: 'Award', ph: "Dean's List" },
        { k: 'issuer', label: 'Issued by', ph: 'Issuing organisation' },
        { k: 'date', label: 'Date', ph: '2023' },
        { k: 'detail', label: 'Detail', ph: 'What it was for…', area: true },
      ],
      line1: e => e.name || 'Untitled',
      line2: e => e.issuer,
      line3: e => e.date,
    },
    {
      key: 'skills', title: 'Skills',
      empty: 'No skills added yet.',
      chip: true,
      fields: [
        { k: 'name', label: 'Skill', ph: 'Python' },
        { k: 'level', label: 'Level', select: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
      ],
      line1: e => e.name || 'Untitled',
      line2: e => e.level,
    },
  ];

  let openAdd = {};     // sectionKey -> bool, add-form open
  let editingId = {};   // sectionKey -> entry id being edited, or null

  function profile() { return Store.get('profile', {}); }
  function allSections() { return Store.get('rec_sections', {}); }
  function entriesFor(key) { return allSections()[key] || []; }
  function saveEntries(key, list) {
    const all = allSections();
    all[key] = list;
    Store.set('rec_sections', all);
  }

  function stats() {
    const P = Store.get('prog', {});
    const N = Store.get('note', {});
    const subjects = window.SUBJECTS || [];
    let mastered = 0, noted = 0;
    const bySubject = {};
    subjects.forEach(s => {
      let m = 0;
      s.sections.forEach(sec => sec.topics.forEach(t => {
        const key = Atlas.pkey(s.id, t[0]);
        if (P[key]) { mastered++; m++; }
        if ((N[key] || '').trim()) noted++;
      }));
      if (m > 0) bySubject[s.name] = m;
    });
    const topSubject = Object.entries(bySubject).sort((a, b) => b[1] - a[1])[0];
    return { mastered, noted, subjectsTouched: Object.keys(bySubject).length, topSubject };
  }

  function render() {
    const host = document.getElementById('view-record');
    if (!host) return;
    const p = profile();
    const s = stats();
    const memberSince = Store.get('memberSince', null) || (Store.set('memberSince', Date.now()), Date.now());

    host.innerHTML = `
      <div class="grid g5-7" style="align-items:start">
        <div class="card">
          <div class="card-b" id="recordCard">
            <div class="rec-avatar">${esc((p.name || '?').charAt(0).toUpperCase())}</div>
            <h2 class="rec-name" id="recName">${esc(p.name || 'Add your name')}</h2>
            <div class="rec-role" id="recRole">${esc(p.role || 'Add a role')}</div>
            <div class="rec-place" id="recPlace">${esc(p.place || '')}</div>
            <p class="rec-bio" id="recBio">${esc(p.bio || 'Write a line about yourself.')}</p>
            <button class="btn" id="recEdit">Edit</button>
            <div class="rec-since">On Meridian since ${new Date(memberSince).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-h"><div class="card-t">In numbers</div></div>
          <div class="card-b">
            <div class="rec-stats">
              <div class="rec-stat"><b>${s.mastered}</b><span>topics mastered</span></div>
              <div class="rec-stat"><b>${s.noted}</b><span>topics noted</span></div>
              <div class="rec-stat"><b>${s.subjectsTouched}</b><span>subjects touched</span></div>
            </div>
            ${s.topSubject ? `<div class="rec-lead">Strongest in <b>${esc(s.topSubject[0])}</b> — ${s.topSubject[1]} topics mastered.</div>` : `<div class="empty" style="padding:16px 0 0"><b>Nothing mastered yet.</b>Mark a topic in the Atlas and this fills in.</div>`}
            <button class="btn" id="recToAtlas" style="margin-top:14px">Go to the Atlas</button>
          </div>
        </div>
      </div>
      <div class="rec-sections grid g2" id="recSections">
        ${SECTIONS.map(sec => sectionCardHTML(sec)).join('')}
      </div>`;

    document.getElementById('recEdit').onclick = openEditor;
    document.getElementById('recToAtlas').onclick = () => App.go('atlas');
    wireSections();
  }

  /* ---- one ledger section (Education / Experience / Awards / Skills) ---- */
  function sectionCardHTML(sec) {
    const entries = entriesFor(sec.key);
    return `
      <div class="card rec-section" data-sec="${sec.key}">
        <div class="card-h">
          <div class="card-t">${esc(sec.title)}</div>
          <div class="card-x"><button class="btn" data-add="${sec.key}">${openAdd[sec.key] ? 'Cancel' : '+ Add'}</button></div>
        </div>
        <div class="card-b">
          ${openAdd[sec.key] ? sectionFormHTML(sec, null) : ''}
          <div class="rec-entries" id="recEntries-${sec.key}">
            ${sec.chip ? chipListHTML(sec, entries) : rowListHTML(sec, entries)}
          </div>
        </div>
      </div>`;
  }

  function fieldHTML(sec, f, entry) {
    const val = esc((entry && entry[f.k]) || '');
    const id = `rf_${sec.key}_${f.k}`;
    if (f.select) {
      return `<select class="inp" id="${id}">
        <option value="">${esc(f.label)}</option>
        ${f.select.map(o => `<option value="${esc(o)}"${val === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}
      </select>`;
    }
    if (f.area) return `<textarea class="inp" id="${id}" rows="2" placeholder="${esc(f.ph)}">${val}</textarea>`;
    return `<input class="inp" id="${id}" placeholder="${esc(f.ph)}" value="${val}">`;
  }

  function sectionFormHTML(sec, entry) {
    return `
      <div class="rec-add-form" data-form="${sec.key}">
        ${sec.fields.map(f => fieldHTML(sec, f, entry)).join('')}
        <div class="rd-bar" style="border:none;padding:0;margin-top:2px">
          <button class="btn grad" data-save="${sec.key}" data-eid="${entry ? entry.id : ''}">${entry ? 'Save' : 'Add'}</button>
          <button class="btn" data-cancel="${sec.key}">Cancel</button>
        </div>
      </div>`;
  }

  function rowListHTML(sec, entries) {
    if (!entries.length) return `<div class="empty" style="padding:14px 0 0"><b>${esc(sec.empty)}</b></div>`;
    return entries.map(e => {
      if (editingId[sec.key] === e.id) return sectionFormHTML(sec, e);
      const l3 = sec.line3 ? sec.line3(e) : '';
      return `
        <div class="rec-row" data-id="${e.id}">
          <div class="rec-row-top">
            <div>
              <div class="rec-row-t">${esc(sec.line1(e))}</div>
              ${sec.line2(e) ? `<div class="rec-row-s">${esc(sec.line2(e))}</div>` : ''}
            </div>
            ${l3 ? `<div class="rec-row-p">${esc(l3)}</div>` : ''}
          </div>
          ${e.detail ? `<p class="rec-row-d">${esc(e.detail)}</p>` : ''}
          <div class="rec-row-btns">
            <button data-edit="${sec.key}" data-id="${e.id}">Edit</button>
            <button data-del="${sec.key}" data-id="${e.id}">Remove</button>
          </div>
        </div>`;
    }).join('');
  }

  function chipListHTML(sec, entries) {
    if (!entries.length) return `<div class="empty" style="padding:14px 0 0"><b>${esc(sec.empty)}</b></div>`;
    return `<div class="rec-chips">${entries.map(e => {
      if (editingId[sec.key] === e.id) return sectionFormHTML(sec, e);
      return `<span class="rec-chip" data-id="${e.id}">
        <b>${esc(sec.line1(e))}</b>${e.level ? `<i>${esc(e.level)}</i>` : ''}
        <button data-edit="${sec.key}" data-id="${e.id}" title="Edit">✎</button>
        <button data-del="${sec.key}" data-id="${e.id}" title="Remove">×</button>
      </span>`;
    }).join('')}</div>`;
  }

  function wireSections() {
    const host = document.getElementById('recSections');
    if (!host) return;

    host.querySelectorAll('[data-add]').forEach(btn => btn.onclick = () => {
      const key = btn.dataset.add;
      openAdd[key] = !openAdd[key];
      editingId[key] = null;
      render();
    });

    host.querySelectorAll('[data-save]').forEach(btn => btn.onclick = () => {
      const key = btn.dataset.save;
      const sec = SECTIONS.find(s => s.key === key);
      const eid = btn.dataset.eid;
      const vals = {};
      let hasContent = false;
      sec.fields.forEach(f => {
        const el = document.getElementById(`rf_${key}_${f.k}`);
        const v = el ? el.value.trim() : '';
        vals[f.k] = v;
        if (v) hasContent = true;
      });
      if (!hasContent) { toast('Add at least one field.'); return; }
      const list = entriesFor(key);
      if (eid) {
        const idx = list.findIndex(x => x.id === eid);
        if (idx > -1) list[idx] = { ...list[idx], ...vals };
      } else {
        list.unshift({ id: uid(), ...vals, at: Date.now() });
      }
      saveEntries(key, list);
      openAdd[key] = false;
      editingId[key] = null;
      render();
      toast('Saved.');
    });

    host.querySelectorAll('[data-cancel]').forEach(btn => btn.onclick = () => {
      const key = btn.dataset.cancel;
      openAdd[key] = false;
      editingId[key] = null;
      render();
    });

    host.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => {
      const key = btn.dataset.edit;
      editingId[key] = btn.dataset.id;
      openAdd[key] = false;
      render();
    });

    host.querySelectorAll('[data-del]').forEach(btn => btn.onclick = () => {
      const key = btn.dataset.del;
      saveEntries(key, entriesFor(key).filter(x => x.id !== btn.dataset.id));
      render();
    });
  }

  /* ---- headline editor (unchanged behaviour) ---- */
  function openEditor() {
    const p = profile();
    const host = document.getElementById('recordCard');
    if (!host) return;
    host.innerHTML = `
      <div class="rec-avatar">${esc((p.name || '?').charAt(0).toUpperCase())}</div>
      <div class="rec-form">
        ${FIELDS.map(f => `<input class="inp" id="rf_${f.k}" placeholder="${esc(f.placeholder)}" value="${esc(p[f.k] || '')}">`).join('')}
        <textarea class="inp" id="rf_bio" rows="3" placeholder="A line about yourself">${esc(p.bio || '')}</textarea>
        <div class="rd-bar" style="border:none;padding:0;margin-top:6px">
          <button class="btn grad" id="rfSave">Save</button>
          <button class="btn" id="rfCancel">Cancel</button>
        </div>
      </div>`;
    document.getElementById('rfSave').onclick = () => {
      const next = { ...p };
      FIELDS.forEach(f => { next[f.k] = document.getElementById('rf_' + f.k).value.trim(); });
      next.bio = document.getElementById('rf_bio').value.trim();
      Store.set('profile', next);
      render();
      toast('Saved.');
    };
    document.getElementById('rfCancel').onclick = render;
  }

  function init() { /* nothing to wire ahead of render */ }

  return { init, render };
})();
