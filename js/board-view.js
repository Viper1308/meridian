/* ════════════════════════════════════════════════════════════
   BOARD — your Polymath vision boards, read in place.

   Nothing is copied or migrated. Polymath keeps its board layout in
   the shared kv table (vb.boards, vb.items:<id>) and the pictures in
   the shared "images" storage bucket at {user_id}/vb:{itemId}.
   Because Meridian signs in as the same user, row level security
   lets it read exactly the same rows and files.

   Consequence worth knowing: this is a live view, not a copy. Delete
   a picture in Polymath and it disappears here too.
   ════════════════════════════════════════════════════════════ */
const Gallery = (() => {

  /* read from Polymath's keys in the same kv table */
  async function foreign(key, fb) {
    const sb = Sync.client(), u = Sync.currentUser();
    if (!sb || !u) return fb;
    const { data } = await sb.from('kv').select('v').eq('user_id', u.id).eq('k', key).maybeSingle();
    return (data && data.v != null) ? data.v : fb;
  }
  async function foreignLike(pattern) {
    const sb = Sync.client(), u = Sync.currentUser();
    if (!sb || !u) return {};
    const { data } = await sb.from('kv').select('k,v').eq('user_id', u.id).like('k', pattern);
    return (data || []).reduce((o, r) => { o[r.k] = r.v; return o; }, {});
  }
  async function imageUrl(name, secs) {
    const sb = Sync.client(), u = Sync.currentUser();
    if (!sb || !u) return null;
    try {
      const { data, error } = await sb.storage.from('images')
        .createSignedUrl(u.id + '/' + name, secs || 3600);
      return error ? null : data.signedUrl;
    } catch (e) { return null; }
  }

  let boards = [], active = null, items = {}, urls = {}, loaded = false;

  async function pull() {
    if (!Sync.currentUser()) return;
    const rows = await foreignLike('vb.%');
    boards = rows['vb.boards'] || [];
    active = rows['vb.active'] || (boards[0] && boards[0].id) || null;
    items = {};
    boards.forEach(b => { items[b.id] = rows['vb.items:' + b.id] || []; });

    /* the pre-multi-board layer, if it is still there */
    const legacy = await foreign('board', []);
    if (legacy && legacy.length) {
      boards = boards.concat([{ id: '__legacy', name: 'Board (original)', bg: {} }]);
      items['__legacy'] = legacy;
    }
    loaded = true;
  }

  async function render() {
    const host = document.getElementById('boardBody');

    if (!Sync.enabled) {
      host.innerHTML = `<div class="empty"><b>Not connected</b>
        Fill in the Supabase details in js/config.js to read your Polymath boards here.</div>`;
      return;
    }
    if (!Sync.currentUser()) {
      host.innerHTML = `<div class="empty"><b>Sign in to see your boards</b>
        These pictures live in your Supabase project, not in this browser.</div>`;
      return;
    }
    if (!loaded) {
      host.innerHTML = `<div class="empty"><b>Reading your boards…</b>From the shared project.</div>`;
      await pull();
    }

    const withImgs = boards.filter(b => (items[b.id] || []).some(i => i.type === 'img'));
    if (!withImgs.length) {
      host.innerHTML = `<div class="empty"><b>No pictures found</b>
        Signed in as ${esc((Sync.currentUser().email) || '')}. If your boards live under a different
        account, sign in with that one instead.</div>`;
      return;
    }
    if (!withImgs.find(b => b.id === active)) active = withImgs[0].id;

    const total = withImgs.reduce((n, b) => n + (items[b.id] || []).filter(i => i.type === 'img').length, 0);
    host.innerHTML = `
      <div class="sub-tabs" id="boardTabs">${withImgs.map(b =>
        `<button class="stab${b.id === active ? ' on' : ''}" data-b="${esc(b.id)}">
          <i style="background:var(--violet)"></i>${esc(b.name || 'Untitled')}
          <span style="color:var(--faint)">${(items[b.id] || []).filter(i => i.type === 'img').length}</span>
        </button>`).join('')}</div>
      <div class="board-note">Live view of your Polymath boards — ${total} pictures across
        ${withImgs.length} boards, read from the shared Supabase project. Nothing was copied.</div>
      <div class="gal" id="gal"></div>`;

    host.querySelectorAll('[data-b]').forEach(btn => btn.onclick = () => {
      active = btn.dataset.b; render();
    });
    paint();
  }

  async function paint() {
    const gal = document.getElementById('gal');
    if (!gal) return;
    const list = (items[active] || []).filter(i => i.type === 'img');
    gal.innerHTML = list.map(i =>
      `<figure class="gcell" data-id="${esc(i.id)}">
         <div class="gskel"></div>
         ${i.note ? `<figcaption>${esc(i.note)}</figcaption>` : ''}
       </figure>`).join('');

    /* sign the URLs a few at a time so one big board does not stampede */
    for (let k = 0; k < list.length; k += 4) {
      await Promise.all(list.slice(k, k + 4).map(async it => {
        /* the pre-migration board may have stored pictures under the bare
           id rather than the vb: form, so try both before giving up */
        const tries = active === '__legacy' ? [it.id, 'vb:' + it.id] : ['vb:' + it.id];
        const name = tries[0];
        if (!urls[name]) {
          for (const t of tries) {
            const u = await imageUrl(t, 3600);
            if (u) { urls[name] = u; break; }
          }
        }
        const cell = gal.querySelector(`[data-id="${it.id}"]`);
        if (!cell) return;
        const sk = cell.querySelector('.gskel');
        if (!urls[name]) { if (sk) sk.classList.add('missing'); return; }
        const im = document.createElement('img');
        im.loading = 'lazy'; im.alt = it.note || '';
        im.onload = () => { if (sk) sk.remove(); };
        im.onerror = () => { if (sk) sk.classList.add('missing'); };
        im.src = urls[name];
        im.onclick = () => lightbox(urls[name], it.note);
        cell.insertBefore(im, cell.firstChild);
      }));
    }
  }

  function lightbox(src, note) {
    const lb = document.getElementById('lightbox');
    lb.innerHTML = `<img src="${src}" alt="${esc(note || '')}">${note ? `<span>${esc(note)}</span>` : ''}`;
    lb.hidden = false;
    lb.onclick = () => { lb.hidden = true; lb.innerHTML = ''; };
  }

  function invalidate() { loaded = false; urls = {}; }

  /* used by the dashboard slideshow — a handful of signed URLs from
     across every board, doesn't touch the gallery's own render state */
  async function randomImages(n) {
    if (!Sync.enabled || !Sync.currentUser()) return [];
    if (!loaded) await pull();
    const all = [];
    Object.entries(items).forEach(([bid, list]) =>
      (list || []).forEach(it => { if (it.type === 'img') all.push({ bid, it }); }));
    if (!all.length) return [];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    const picked = all.slice(0, n);
    const out = [];
    for (const { bid, it } of picked) {
      const tries = bid === '__legacy' ? [it.id, 'vb:' + it.id] : ['vb:' + it.id];
      let url = null;
      for (const t of tries) { url = await imageUrl(t, 3600); if (url) break; }
      if (url) out.push({ url, note: it.note || '' });
    }
    return out;
  }

  return { render, invalidate, randomImages };
})();
