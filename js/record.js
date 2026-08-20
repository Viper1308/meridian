/* ════════════════════════════════════════════════════════════
   RECORD — a personal profile card. Editable fields, plus a live
   summary pulled from what you've actually done in the Atlas
   (topics mastered, notes written, subjects touched).
   ════════════════════════════════════════════════════════════ */
const Record = (() => {
  const FIELDS = [
    { k: 'name', label: 'Name', placeholder: 'Your name' },
    { k: 'role', label: 'Role', placeholder: 'What you do' },
    { k: 'place', label: 'Location', placeholder: 'Where you are' },
  ];

  function profile() { return Store.get('profile', {}); }

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
      </div>`;

    document.getElementById('recEdit').onclick = openEditor;
    document.getElementById('recToAtlas').onclick = () => App.go('atlas');
  }

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
