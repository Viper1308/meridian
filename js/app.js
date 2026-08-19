/* ════════════════════════════════════════════════════════════
   APP — the router for all 10 screens.
   ════════════════════════════════════════════════════════════ */
const App = (() => {
  const VIEWS = ['profile','web','books','stacks','calendar','thoughts','vision',
                 'dashboard','atlas','board','oracle'];
  let current = null;

  function go(v) {
    if (!VIEWS.includes(v)) v = 'dashboard';
    current = v;
    VIEWS.forEach(s => {
      const el = document.getElementById('view-' + s);
      if (el) el.classList.toggle('on', s === v);
    });
    document.querySelectorAll('[data-view]').forEach(b => {
      b.classList.toggle('on', b.dataset.view === v ||
        (b.classList.contains('tab') && b.dataset.view === v));
    });
    // highlight active tab
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.view === v));
    document.querySelectorAll('.pill[data-view]').forEach(p => p.classList.toggle('on', p.dataset.view === v));

    Store.set('lastView', v);

    // refresh the target screen — guarded so missing DOM doesn't crash
    try {
      if (v === 'profile' && typeof Profile !== 'undefined') Profile.render();
      if (v === 'web' && typeof Web !== 'undefined') Web.render();
      if (v === 'books' && typeof Books !== 'undefined') Books.render();
      if (v === 'stacks' && typeof Stacks !== 'undefined') Stacks.render();
      if (v === 'calendar' && typeof Calendar !== 'undefined') Calendar.render();
      if (v === 'thoughts' && typeof Margin !== 'undefined') Margin.render();
      if (v === 'vision' && typeof Vision !== 'undefined') Vision.refresh();
    } catch(e) { console.warn('render ' + v + ':', e.message); }
    if (v === 'dashboard') {
      Dashboard.render();
      Finance.render('financeCard');
      ThemeEngine.renderPicker('themePicker');
    }
    if (v === 'atlas') Atlas.refresh();
    if (v === 'board') Gallery.render();
    if (v === 'oracle') Oracle.renderScreen();

    window.scrollTo({ top: 0 });
    // close the mobile nav if open
    const mn = document.getElementById('mobileNav');
    if (mn) mn.classList.remove('open');
  }

  function search(term) {
    const q = term.toLowerCase();
    for (const s of window.SUBJECTS) {
      for (let si = 0; si < s.sections.length; si++) {
        const ti = s.sections[si].topics.findIndex(t =>
          (t[0] + ' ' + (t[1] || '')).toLowerCase().includes(q));
        if (ti > -1) { Atlas.open(s.id, si, ti); go('atlas'); return; }
      }
    }
    toast('Nothing matches "' + term + '".');
  }

  function backup() {
    const blob = new Blob([JSON.stringify({
      v: 1, at: Date.now(), app: 'meridian', data: Store.dump()
    }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'meridian-' + today() + '.json';
    a.click(); URL.revokeObjectURL(a.href);
    toast('Backed up.');
  }

  function restore(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const j = JSON.parse(fr.result);
        if (!j.data) throw 0;
        Store.load(j.data);
        toast('Restored. Reloading…');
        setTimeout(() => location.reload(), 700);
      } catch (e) { toast('Not a valid backup file.'); }
    };
    fr.readAsText(file);
  }

  async function boot() {
    // Wire all tab/monitor clicks
    document.querySelectorAll('[data-view]').forEach(el => {
      el.addEventListener('click', () => go(el.dataset.view));
    });
    document.getElementById('btnBackup').onclick = backup;
    const fr = document.getElementById('fileRestore');
    if (fr) fr.onchange = e => { if (e.target.files[0]) restore(e.target.files[0]); };
    const bo = document.getElementById('btnOut');
    if (bo) bo.onclick = async () => { await Sync.signOut(); location.reload(); };

    // Theme engine
    ThemeEngine.init();
    const thBtn = document.getElementById('btnTheme');
    if (thBtn) {
      thBtn.onclick = () => {
        const themes = ThemeEngine.THEMES;
        const cur = ThemeEngine.current();
        const idx = themes.findIndex(t => t.id === cur);
        ThemeEngine.apply(themes[(idx + 1) % themes.length].id);
        toast('Theme: ' + ThemeEngine.THEMES.find(t => t.id === ThemeEngine.current()).name);
      };
    }

    // Init Polymath's modules
    // Polymath modules may need specific DOM; guard each one
    const safeInit = (name, mod) => {
      try { if (typeof mod !== 'undefined' && mod && mod.init) mod.init(); }
      catch(e) { console.warn(name + '.init() skipped:', e.message); }
    };
    safeInit('Profile', typeof Profile!=='undefined'&&Profile);
    safeInit('Web', typeof Web!=='undefined'&&Web);
    safeInit('Books', typeof Books!=='undefined'&&Books);
    safeInit('Margin', typeof Margin!=='undefined'&&Margin);
    safeInit('Calendar', typeof Calendar!=='undefined'&&Calendar);
    safeInit('Stacks', typeof Stacks!=='undefined'&&Stacks);
    safeInit('Vision', typeof Vision!=='undefined'&&Vision);

    // Sync
    if (Sync.enabled) {
      const res = await Sync.init();
      if (res.enabled && res.user) {
        // already signed in
        start(true);
        return;
      } else if (res.enabled && !res.user) {
        // show gate
        showGate();
        return;
      }
    }
    // local-only mode
    start(false);
  }

  function showGate() {
    const gate = document.getElementById('gate');
    gate.hidden = false;
    document.body.classList.add('locked');
    let isSignup = false;

    function paintGate() {
      document.getElementById('gateBtn').textContent = isSignup ? 'Create account' : 'Log in';
      document.getElementById('gateSwitch').innerHTML = isSignup
        ? 'Already have an account? <a href="#" id="gateLink">Log in</a>'
        : 'Same credentials as Polymath. <a href="#" id="gateLink">Or create account</a>';
      document.getElementById('gateLink').onclick = e => { e.preventDefault(); isSignup = !isSignup; paintGate(); };
    }
    paintGate();

    document.getElementById('gateBtn').onclick = async () => {
      const email = document.getElementById('gateUser').value.trim();
      const pass = document.getElementById('gatePass').value;
      const errEl = document.getElementById('gateErr');
      if (!email || !pass) { errEl.textContent = 'Email and password, please.'; return; }
      if (pass.length < 6) { errEl.textContent = 'At least 6 characters.'; return; }
      const btn = document.getElementById('gateBtn');
      btn.disabled = true; btn.textContent = isSignup ? 'Creating…' : 'Signing in…';
      try {
        if (isSignup) {
          const r = await Sync.signUp(email, pass);
          if (r.needsConfirm) { errEl.textContent = 'Check your email to confirm.'; btn.disabled = false; paintGate(); return; }
        } else {
          await Sync.signIn(email, pass);
        }
        await Sync.pullAll();
        gate.hidden = true;
        document.body.classList.remove('locked');
        start(true);
      } catch (e) {
        errEl.textContent = e.message || 'Sign in failed.';
        btn.disabled = false; paintGate();
      }
    };
    document.getElementById('gatePass').onkeydown = e => { if (e.key === 'Enter') document.getElementById('gateBtn').click(); };
    document.getElementById('gateSkip').onclick = () => {
      gate.hidden = true; document.body.classList.remove('locked');
      toast('Working offline.'); start(false);
    };
  }

  function start(synced) {
    if (synced && Sync.currentUser()) {
      const el = document.getElementById('whoami');
      if (el) { el.textContent = (Sync.currentUser().email || '').split('@')[0]; el.parentElement.hidden = false; }
      document.getElementById('btnOut').hidden = false;
    }

    // Set subtitle
    const n = window.SUBJECTS.reduce((a, s) => a + s.sections.reduce((b, x) => b + x.topics.length, 0), 0);
    const sub = document.getElementById('brandSub');
    if (sub) sub.textContent = window.SUBJECTS.length + ' subjects · ' + n.toLocaleString('en-IN') + ' topics';

    Atlas.snapshot();
    go(Store.get('lastView', 'dashboard'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    boot().catch(err => {
      console.error(err);
      const b = document.getElementById('bootErr');
      if (b) { b.hidden = false; b.innerHTML = '<b>Startup failed.</b><span>' + String(err.message) + '</span>'; }
    });
  });

  return { go, search, backup, start };
})();
