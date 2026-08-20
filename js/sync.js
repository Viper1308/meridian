/* ════════════════════════════════════════════════════════════
   SYNC — optional Supabase auth + cross-device data mirroring.

   Store.get/set keep working exactly as before, instantly, from
   localStorage — this file only adds a background mirror on top.
   If config.supabase is blank, `enabled` is false and every other
   function in this file is a safe no-op. Nothing else in the app
   needs to check that before calling Store — Store already checks
   Sync internally.
   ════════════════════════════════════════════════════════════ */
const Sync = (() => {
  const cfg = (window.MERIDIAN_CONFIG || {}).supabase || { url: '', anonKey: '' };
  const enabled = !!(cfg.url && cfg.anonKey);

  let sb = null, user = null, ready = false;
  const pending = {};
  let flushTimer = null;

  async function loadClient() {
    if (window.supabase) return true;
    try {
      await new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
        el.onload = resolve;
        el.onerror = () => reject(new Error('Could not load the Supabase client library.'));
        document.head.appendChild(el);
      });
      return true;
    } catch (e) { return false; }
  }

  async function init() {
    if (!enabled) return { enabled: false };
    const loaded = await loadClient();
    if (!loaded || !window.supabase) return { enabled: false, error: 'library failed to load' };
    try {
      sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
      const { data } = await sb.auth.getSession();
      user = (data && data.session && data.session.user) || null;
      ready = true;
      return { enabled: true, user };
    } catch (e) { return { enabled: false, error: e.message }; }
  }

  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    user = data.user;
    return user;
  }
  async function signUp(email, password) {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) throw error;
    user = data.user;
    return { user, needsConfirm: !data.session };
  }
  async function signOut() {
    if (sb) await sb.auth.signOut();
    user = null;
  }

  /* ---- push: debounced, batches whatever changed since the last flush ---- */
  function queuePush(key, value) {
    if (!enabled || !sb || !user) return;
    pending[key] = value;
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 900);
  }
  async function flush() {
    if (!sb || !user) return;
    const rows = Object.entries(pending).map(([k, v]) => ({
      user_id: user.id, k, v, updated_at: new Date().toISOString()
    }));
    Object.keys(pending).forEach(k => delete pending[k]);
    if (!rows.length) return;
    try { await sb.from('kv').upsert(rows, { onConflict: 'user_id,k' }); }
    catch (e) { console.warn('sync push failed:', e.message); }
  }

  /* ---- pull: called once right after sign-in ---- */
  async function pullAll() {
    if (!sb || !user) return { ok: false, count: 0 };
    try {
      const { data, error } = await sb.from('kv').select('k,v').eq('user_id', user.id);
      if (error) return { ok: false, count: 0, error };
      (data || []).forEach(row => Store.set(row.k, row.v, { skipPush: true }));
      return { ok: true, count: (data || []).length };
    } catch (e) { return { ok: false, count: 0, error: e }; }
  }

  return {
    init, signIn, signUp, signOut, pullAll, queuePush,
    get enabled() { return enabled; },
    get ready() { return ready; },
    currentUser: () => user,
  };
})();
