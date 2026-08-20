/* ════════════════════════════════════════════════════════════
   STORE — localStorage only. No Supabase, no auth, no network.
   Sync is added in a later module, layered on top of this without
   changing this file's API.

   Every method is wrapped so a storage failure (private browsing,
   full quota, disabled storage) degrades to an in-memory fallback
   instead of throwing and taking the app down.
   ════════════════════════════════════════════════════════════ */
const Store = (() => {
  const PREFIX = 'mrd:';
  const mem = {};
  let usable = true;
  try {
    localStorage.setItem(PREFIX + '_t', '1');
    localStorage.removeItem(PREFIX + '_t');
  } catch (e) { usable = false; }

  function get(key, fallback) {
    try {
      const raw = usable ? localStorage.getItem(PREFIX + key) : mem[key];
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function set(key, value, opts) {
    const raw = JSON.stringify(value);
    try {
      if (usable) localStorage.setItem(PREFIX + key, raw);
      else mem[key] = raw;
    } catch (e) {
      // quota exceeded or storage disabled mid-session — fall back silently
      mem[key] = raw;
    }
    if (!(opts && opts.skipPush) && typeof Sync !== 'undefined' && Sync.enabled) {
      Sync.queuePush(key, value);
    }
    return value;
  }

  function dump() {
    const out = {};
    if (usable) {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => { out[k.slice(PREFIX.length)] = get(k.slice(PREFIX.length), null); });
    } else {
      Object.keys(mem).forEach(k => { out[k] = get(k, null); });
    }
    return out;
  }

  function load(obj) {
    Object.entries(obj || {}).forEach(([k, v]) => set(k, v));
  }

  return { get, set, dump, load, get usable() { return usable; } };
})();

/* ---- small shared helpers, used everywhere ---- */
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast'; t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, 2600);
}
