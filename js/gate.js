/* ════════════════════════════════════════════════════════════
   GATE — the login screen. Only shown when Sync.enabled is true.
   ════════════════════════════════════════════════════════════ */
const Gate = (() => {
  let mode = 'login';

  function pretty(e) {
    const m = String((e && e.message) || '').toLowerCase();
    if (m.includes('invalid login')) return 'Wrong email or password.';
    if (m.includes('already registered')) return 'That email already has an account — switch to Log in.';
    if (m.includes('rate')) return 'Too many attempts. Wait a minute and try again.';
    if (m.includes('fetch') || m.includes('network')) return 'Cannot reach the server. Check your connection.';
    if (m.includes('email')) return 'That email address was not accepted.';
    return (e && e.message) || 'Something went wrong.';
  }

  function show() {
    const el = document.getElementById('gate');
    if (!el) return;
    el.hidden = false;
    document.body.classList.add('locked');
    paint();
    wire();
  }
  function hide() {
    const el = document.getElementById('gate');
    if (el) el.hidden = true;
    document.body.classList.remove('locked');
  }

  function paint() {
    document.getElementById('gateBtn').textContent = mode === 'signup' ? 'Create account' : 'Log in';
    document.getElementById('gateSwitch').innerHTML = mode === 'signup'
      ? 'Already have an account? <a href="#" id="gateLink">Log in instead</a>'
      : 'New here? <a href="#" id="gateLink">Create an account</a>';
    const link = document.getElementById('gateLink');
    if (link) link.onclick = e => { e.preventDefault(); mode = mode === 'signup' ? 'login' : 'signup'; err(''); paint(); wire(); };
  }

  function err(msg) {
    const e = document.getElementById('gateErr');
    if (e) e.textContent = msg || '';
  }

  function wire() {
    const btn = document.getElementById('gateBtn');
    btn.onclick = submit;
    document.getElementById('gatePass').onkeydown = e => { if (e.key === 'Enter') submit(); };
    document.getElementById('gateUser').onkeydown = e => { if (e.key === 'Enter') document.getElementById('gatePass').focus(); };
    document.getElementById('gateSkip').onclick = () => {
      hide();
      toast('Working offline — nothing will sync.');
      App.start();
    };
  }

  async function submit() {
    const email = document.getElementById('gateUser').value.trim();
    const pass = document.getElementById('gatePass').value;
    if (!email || !pass) { err('Email and password, please.'); return; }
    if (pass.length < 6) { err('Password must be at least 6 characters.'); return; }
    const btn = document.getElementById('gateBtn');
    btn.disabled = true;
    btn.textContent = mode === 'signup' ? 'Creating…' : 'Signing in…';
    try {
      if (mode === 'signup') {
        const r = await Sync.signUp(email, pass);
        if (r.needsConfirm) {
          err('Check your email for a confirmation link, then come back and log in. (If the link fails, your Supabase project needs its Site URL set — see the README.)');
          mode = 'login'; btn.disabled = false; paint(); wire();
          return;
        }
      } else {
        await Sync.signIn(email, pass);
      }
      const res = await Sync.pullAll();
      hide();
      if (res.count > 0) toast('Synced ' + res.count + ' items from your account.');
      App.start();
    } catch (e) {
      err(pretty(e));
      btn.disabled = false; paint(); wire();
    }
  }

  return { show, hide };
})();
