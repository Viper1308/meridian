/* ════════════════════════════════════════════════════════════
   APP — router and boot.

   Module 1 only knows about two real screens: Dashboard and Atlas.
   Every other tab renders a "coming in module 2/3" stub instead of
   pretending to be a working screen — no silent failures.

   Boot is wrapped so that if any single step throws, the person
   sees exactly what failed instead of a blank page.
   ════════════════════════════════════════════════════════════ */
const App = (() => {
  const LIVE = ['dashboard', 'atlas', 'record', 'books', 'calendar', 'margin', 'web', 'stacks', 'board', 'gallery'];
  const STUBS = {
    oracle: 'The AI assistant layer. Dormant by design — see the roadmap once it lands.',
  };
  let current = null;

  function go(v) {
    const isLive = LIVE.includes(v);
    const isStub = Object.prototype.hasOwnProperty.call(STUBS, v);
    if (!isLive && !isStub) v = 'dashboard';
    current = v;

    document.querySelectorAll('.view').forEach(el => {
      el.classList.toggle('on', el.id === 'view-' + v);
    });
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.view === v));

    Store.set('lastView', v);

    try {
      if (v === 'dashboard') { Dashboard.render(); Finance.render('financeCard'); Slideshow.render('slideBody', 'slideDots'); }
      else { Slideshow.stop(); }
      if (v === 'atlas') Atlas.refresh();
      if (v === 'record') Record.render();
      if (v === 'books') Books.render();
      if (v === 'calendar') Cal.render();
      if (v === 'margin') Margin.render();
      if (v === 'web') Web.render();
      if (v === 'stacks') Stacks.render();
      if (v === 'board') Board.render();
      if (v === 'gallery') Gallery.render();
      if (STUBS[v]) renderStub(v);
    } catch (err) {
      showError('Rendering "' + v + '" failed.', err);
    }

    window.scrollTo({ top: 0 });
  }

  function renderStub(v) {
    const host = document.getElementById('view-' + v);
    if (!host) return;
    const title = v.charAt(0).toUpperCase() + v.slice(1);
    host.innerHTML = `<div class="card stub">
      <h2>${esc(title)}</h2>
      <p>${esc(STUBS[v])}</p>
      <div class="soon-tag">Coming soon</div>
    </div>`;
  }

  function search(term) {
    const q = term.toLowerCase();
    for (const s of (window.SUBJECTS || [])) {
      for (let si = 0; si < s.sections.length; si++) {
        const ti = s.sections[si].topics.findIndex(t =>
          (t[0] + ' ' + (t[1] || '')).toLowerCase().includes(q));
        if (ti > -1) { Atlas.open(s.id, si, ti); go('atlas'); return; }
      }
    }
    toast('Nothing matches "' + term + '".');
  }

  function backup() {
    try {
      const blob = new Blob([JSON.stringify({
        v: 1, at: Date.now(), app: 'meridian', data: Store.dump()
      }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'meridian-' + today() + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Backed up.');
    } catch (e) { toast('Backup failed: ' + e.message); }
  }

  function restore(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const j = JSON.parse(fr.result);
        if (!j.data) throw new Error('no data field');
        Store.load(j.data);
        toast('Restored. Reloading…');
        setTimeout(() => location.reload(), 700);
      } catch (e) { toast('Not a valid backup file.'); }
    };
    fr.onerror = () => toast('Could not read that file.');
    fr.readAsText(file);
  }

  function showError(headline, err) {
    const b = document.getElementById('bootErr');
    if (!b) { console.error(headline, err); return; }
    b.hidden = false;
    b.innerHTML = '<b>' + esc(headline) + '</b>' +
      '<span>' + esc((err && err.message) || String(err)) + '</span>' +
      '<span>Check the browser console for the full trace. The rest of the app should still work — try another tab.</span>';
    console.error(headline, err);
  }

  function step(label, fn) {
    try {
      const r = fn();
      if (r && typeof r.catch === 'function') {
        r.catch(e => showError('Startup step failed: ' + label, e));
      }
    } catch (e) { showError('Startup step failed: ' + label, e); }
  }

  function boot() {
    step('theme', () => Theme.init());

    step('topbar fold button', () => {
      const tb = document.getElementById('topbar');
      const foldBtn = document.getElementById('btnFold');
      if (!tb || !foldBtn) return;
      foldBtn.onclick = () => {
        tb.classList.toggle('folded');
        document.body.classList.toggle('topbar-folded', tb.classList.contains('folded'));
        Store.set('topbarFolded', tb.classList.contains('folded'));
      };
      if (Store.get('topbarFolded', false)) {
        tb.classList.add('folded');
        document.body.classList.add('topbar-folded');
      }
    });

    step('theme toggle button', () => {
      const btn = document.getElementById('btnTheme');
      if (btn) btn.onclick = () => {
        const t = Theme.cycle();
        toast('Theme: ' + t.name);
      };
    });

    step('backup/restore buttons', () => {
      const bb = document.getElementById('btnBackup');
      if (bb) bb.onclick = backup;
      const fr = document.getElementById('fileRestore');
      if (fr) fr.onchange = e => { if (e.target.files[0]) restore(e.target.files[0]); };
    });

    step('tab clicks', () => {
      document.querySelectorAll('.tab[data-view]').forEach(el => {
        el.addEventListener('click', () => go(el.dataset.view));
      });
    });

    step('module init', () => {
      if (typeof Record !== 'undefined') Record.init();
      if (typeof Books !== 'undefined') Books.init();
      if (typeof Cal !== 'undefined') Cal.init();
      if (typeof Margin !== 'undefined') Margin.init();
      if (typeof Web !== 'undefined') Web.init();
      if (typeof Stacks !== 'undefined') Stacks.init();
      if (typeof Board !== 'undefined') Board.init();
      if (typeof Gallery !== 'undefined') Gallery.init();
    });

    step('sign-out button', () => {
      const bo = document.getElementById('btnOut');
      if (bo) bo.onclick = async () => {
        try { await Sync.signOut(); } catch (e) {}
        location.reload();
      };
    });

    step('sync + gate', async () => {
      if (!Sync.enabled) { start(); return; }
      const res = await Sync.init();
      if (res.enabled && res.user) {
        await Sync.pullAll();
        start();
      } else if (res.enabled) {
        Gate.show();
      } else {
        toast('Cloud sync unavailable — working locally.');
        start();
      }
    });
  }

  function showWho(user) {
    const w = document.getElementById('whoBox');
    const bo = document.getElementById('btnOut');
    if (w && user) { w.hidden = false; document.getElementById('whoami').textContent = (user.email || '').split('@')[0]; }
    if (bo) bo.hidden = false;
  }

  function start() {
    step('who indicator', () => {
      const user = (typeof Sync !== 'undefined' && Sync.currentUser) ? Sync.currentUser() : null;
      if (user) showWho(user);
    });
    step('subject count in masthead', () => {
      const n = (window.SUBJECTS || []).reduce((a, s) => a + Atlas.nTopics(s), 0);
      const sub = document.getElementById('brandSub');
      if (sub) sub.textContent = (window.SUBJECTS || []).length + ' subjects · ' + n.toLocaleString('en-IN') + ' topics';
    });
    step('initial view', () => {
      const last = Store.get('lastView', 'dashboard');
      go(LIVE.includes(last) ? last : 'dashboard');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    try { boot(); }
    catch (err) { showError('Startup failed entirely.', err); }
  });

  return { go, search, backup, start };
})();
