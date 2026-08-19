/* ════════════════════════════════════════════════════════════
   AUTH — the login gate.

   Only appears when js/config.js has Supabase filled in. Leave it
   blank and this file does nothing at all: the app runs local-only
   with no sign-in, exactly as before.

   It uses the same Supabase project as Polymath, so the same email
   and password work, and both apps see the same account.
   ════════════════════════════════════════════════════════════ */
const Auth = (() => {
  let signup = false, ready = false;

  const gate = () => document.getElementById('gate');
  const err = m => {
    const e = document.getElementById('gateErr');
    e.textContent = m || '';
    if (m) { const p = document.getElementById('gatePass'); p.value = ''; p.focus(); }
  };

  function pretty(e) {
    const m = String((e && e.message) || '').toLowerCase();
    if (m.includes('invalid login')) return 'Wrong email or password.';
    if (m.includes('already registered')) return 'That email already has an account — log in instead.';
    if (m.includes('rate')) return 'Too many attempts. Wait a minute.';
    if (m.includes('fetch') || m.includes('network')) return 'Cannot reach the server. Check your connection.';
    if (m.includes('email')) return 'That email address was not accepted.';
    return (e && e.message) || 'Something went wrong.';
  }

  function paint() {
    document.getElementById('gateBtn').textContent = signup ? 'Create account' : 'Log in';
    document.getElementById('gateSwitch').innerHTML = signup
      ? 'Already have an account? <a href="#" id="gateLink">Log in</a>'
      : 'Using Polymath already? Same details. <a href="#" id="gateLink">Or create an account</a>';
    document.getElementById('gateLink').onclick = e => {
      e.preventDefault(); signup = !signup; err(''); paint();
    };
  }

  async function submit() {
    const email = document.getElementById('gateUser').value.trim();
    const pass = document.getElementById('gatePass').value;
    if (!email || !pass) { err('Email and password, please.'); return; }
    if (pass.length < 6) { err('Password must be at least 6 characters.'); return; }
    const btn = document.getElementById('gateBtn');
    btn.disabled = true; btn.textContent = signup ? 'Creating…' : 'Signing in…';
    try {
      if (signup) {
        const { needsConfirm } = await Sync.signUp(email, pass);
        if (needsConfirm) {
          err('Check your email to confirm, then log in.');
          signup = false; btn.disabled = false; paint(); return;
        }
      } else {
        await Sync.signIn(email, pass);
      }
      await enter();
    } catch (e) {
      err(pretty(e)); btn.disabled = false; paint();
    }
  }

  /* pull cloud data down, then hand control to the app */
  async function enter() {
    document.getElementById('gateSub').textContent = 'syncing…';
    let n = 0;
    try { res = await Sync.pullAll(); n = res.count || 0; } catch (e) { }
    gate().hidden = true;
    document.body.classList.remove('locked');
    const who = Sync.currentUser();
    const el = document.getElementById('whoami');
    if (el && who) { el.textContent = (who.email || '').split('@')[0]; el.parentElement.hidden = false; }
    if (n > 0 && !sessionStorage.getItem('mrd_pulled')) {
      /* modules already read localStorage at load; one reload makes them
         see the freshly pulled data. The session survives it. */
      sessionStorage.setItem('mrd_pulled', '1');
      location.reload(); return;
    }
    App.start();
  }

  async function out() {
    await Sync.signOut();
    sessionStorage.removeItem('mrd_pulled');
    location.reload();
  }

  /* returns true if the app may start now, false if the gate is up */
  async function init() {
    if (!Sync.enabled) return true;          // local-only mode
    const res = ({ enabled: Sync.enabled, user: Sync.currentUser() });
    if (!res.enabled) {
      toast('Cloud sync unavailable — running locally.');
      return true;
    }
    ready = true;
    document.getElementById('btnOut').hidden = false;
    if (Sync.currentUser()) { await enter(); return false; }
    gate().hidden = false;
    document.body.classList.add('locked');
    paint();
    document.getElementById('gateBtn').onclick = submit;
    document.getElementById('gatePass').onkeydown = e => { if (e.key === 'Enter') submit(); };
    document.getElementById('gateUser').onkeydown = e => {
      if (e.key === 'Enter') document.getElementById('gatePass').focus();
    };
    document.getElementById('gateSkip').onclick = () => {
      gate().hidden = true;
      document.body.classList.remove('locked');
      toast('Working offline. Nothing will sync.');
      App.start();
    };
    return false;
  }

  return { init, out, get ready() { return ready; } };
})();
