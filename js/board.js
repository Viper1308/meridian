/* ════════════════════════════════════════════════════════════
   BOARD — an infinite pannable plane you pin pictures to.

   Design notes:
   - "Infinite" is done the cheap, robust way: images sit at
     absolute plane-space (x, y) coordinates with no bounds at
     all, and panning just translates a single wrapper div. There
     is no fixed-size canvas to run out of, so nothing needs
     re-bounding as you pan further out. There's no zoom — the
     original ask only asked for panning, so that's all this does.
   - The background (grid / lines / blank / color / image) is
     painted on the fixed viewport, not the moving plane, so it
     doesn't need to track pan math. It reads as "the floor under
     the glass" rather than literal infinite wallpaper, which is a
     reasonable trade for not having another moving part to break.
   - Images are still resized/compressed client-side before
     storage (max 900px, JPEG ~0.7 quality) and still ride the
     same Store/Sync path as everything else — no separate object
     storage, same trade-off as before: fine for a personal
     library, not a photo host.
   - Copy/paste of a spatial selection goes through the real OS
     clipboard as text — a small JSON payload behind a version
     marker (`MERIDIAN_BOARD_CLIP_V1:`) — rather than an in-app
     mechanism, which is the only way it could plausibly survive
     a paste into a different app (Polymath) as the spec asked
     for. Anything reading that same marker/schema could
     interoperate; this file only implements Meridian's side of it.
   ════════════════════════════════════════════════════════════ */
const Board = (() => {
  const MAX_DIM = 900, QUALITY = 0.72;
  const BG_MAX_DIM = 1600, BG_QUALITY = 0.6;
  const CLIP_MARK = 'MERIDIAN_BOARD_CLIP_V1:';
  const ITEM_W = 180;

  let pan = Store.get('boardPan', { x: 0, y: 0 });
  let bg = Store.get('boardBg', { type: 'grid' });
  let selected = new Set();
  let bgPanelOpen = false;
  let addedThisSession = 0;

  const images = () => Store.get('boardImages', []);
  const save = (l) => Store.set('boardImages', l);
  const savePan = () => Store.set('boardPan', pan, { skipPush: true });
  const saveBg = () => Store.set('boardBg', bg);

  function render() {
    const host = document.getElementById('view-board');
    if (!host) return;
    selected = new Set();
    host.innerHTML = `
      <div class="bd-stage" id="bdStage">
        <div class="bd-viewport" id="bdViewport">
          <div class="bd-plane" id="bdPlane" style="transform:translate(${pan.x}px,${pan.y}px)"></div>
        </div>

        <label class="btn grad bd-fab" title="Add a picture">+ picture
          <input type="file" id="bdFile" accept="image/*" hidden>
        </label>

        <div class="bd-periphery">
          <button class="bd-icon" id="bdBgToggle" title="Background">🎨</button>
          <button class="bd-icon" id="bdCopy" title="Copy selection (⌘/Ctrl C)" disabled>⧉</button>
          <button class="bd-icon" id="bdPaste" title="Paste (⌘/Ctrl V)">📋</button>
          <button class="bd-icon" id="bdReset" title="Back to center">⌖</button>
        </div>

        <div class="bd-bgpanel" id="bdBgPanel" hidden>
          <div class="bd-bgrow">
            <button class="bd-swatch" data-bg="grid" title="Grid">▦</button>
            <button class="bd-swatch" data-bg="lines" title="Lines">☰</button>
            <button class="bd-swatch" data-bg="blank" title="Blank">▢</button>
            <label class="bd-swatch" title="Color"><input type="color" id="bdColor" value="#15122a" style="opacity:0;position:absolute;width:1px;height:1px">🎨</label>
            <label class="bd-swatch" title="Image"><input type="file" id="bdBgFile" accept="image/*" hidden>🖼</label>
          </div>
        </div>

        <div class="bd-hint">Drag empty space to pan · Shift+drag to box-select · Shift+click to multi-select</div>
      </div>`;

    applyBg();
    document.getElementById('bdFile').onchange = e => { if (e.target.files[0]) addImage(e.target.files[0]); };
    document.getElementById('bdBgToggle').onclick = () => { bgPanelOpen = !bgPanelOpen; document.getElementById('bdBgPanel').hidden = !bgPanelOpen; };
    document.getElementById('bdReset').onclick = () => { pan = { x: 0, y: 0 }; savePan(); applyPan(); };
    document.getElementById('bdCopy').onclick = copySelection;
    document.getElementById('bdPaste').onclick = pasteSelection;
    document.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => setBg({ type: b.dataset.bg }));
    document.getElementById('bdColor').oninput = e => setBg({ type: 'color', value: e.target.value });
    document.getElementById('bdBgFile').onchange = e => { if (e.target.files[0]) addBgImage(e.target.files[0]); };

    wireCanvas();
    renderPlane();
  }

  /* ---- background ---- */
  function setBg(next) {
    bg = next;
    saveBg();
    applyBg();
    bgPanelOpen = false;
    const panel = document.getElementById('bdBgPanel');
    if (panel) panel.hidden = true;
  }
  function addBgImage(file) {
    if (!file.type.startsWith('image/')) { toast('Not an image file.'); return; }
    compressImage(file, BG_MAX_DIM, BG_QUALITY, data => setBg({ type: 'image', value: data }));
  }
  function applyBg() {
    const vp = document.getElementById('bdViewport');
    if (!vp) return;
    vp.style.backgroundImage = '';
    vp.style.backgroundColor = '';
    vp.style.backgroundSize = '';
    vp.classList.remove('bd-bg-grid', 'bd-bg-lines');
    if (bg.type === 'grid') vp.classList.add('bd-bg-grid');
    else if (bg.type === 'lines') vp.classList.add('bd-bg-lines');
    else if (bg.type === 'color') vp.style.backgroundColor = bg.value || '#15122a';
    else if (bg.type === 'image') {
      vp.style.backgroundImage = `url(${bg.value})`;
      vp.style.backgroundSize = 'cover';
    }
    // blank: nothing to set
  }

  /* ---- plane rendering ---- */
  function renderPlane() {
    const plane = document.getElementById('bdPlane');
    if (!plane) return;
    const imgs = images();
    plane.innerHTML = imgs.map(im => `
      <div class="bd-item${selected.has(im.id) ? ' sel' : ''}" data-item="${im.id}"
           style="left:${im.x}px;top:${im.y}px">
        <img src="${im.data}" alt="${esc(im.note || '')}" draggable="false">
        <div class="bd-item-cap">
          <input class="gcap" data-note="${im.id}" value="${esc(im.note || '')}" placeholder="Add a note…">
          <button data-del="${im.id}">✕</button>
        </div>
      </div>`).join('');

    document.getElementById('bdCopy').disabled = selected.size === 0;

    plane.querySelectorAll('.bd-item').forEach(el => {
      el.addEventListener('pointerdown', onItemPointerDown);
      const img = el.querySelector('img');
      img.ondblclick = () => lightbox(img.src, img.alt);
    });
    plane.querySelectorAll('[data-note]').forEach(inp => {
      let t = null;
      inp.onpointerdown = e => e.stopPropagation();
      inp.oninput = () => {
        clearTimeout(t);
        t = setTimeout(() => {
          const l = images();
          const im = l.find(x => x.id === inp.dataset.note);
          if (im) { im.note = inp.value; save(l); }
        }, 500);
      };
    });
    plane.querySelectorAll('[data-del]').forEach(btn => {
      btn.onpointerdown = e => e.stopPropagation();
      btn.onclick = () => {
        selected.delete(btn.dataset.del);
        save(images().filter(x => x.id !== btn.dataset.del));
        renderPlane();
      };
    });

    if (imgs.length === 0) {
      plane.innerHTML = `<div class="bd-empty">Nothing pinned yet — use the + picture button.</div>`;
    }
  }

  function applyPan() {
    const plane = document.getElementById('bdPlane');
    if (plane) plane.style.transform = `translate(${pan.x}px,${pan.y}px)`;
  }

  /* ---- adding a picture ---- */
  function addImage(file) {
    if (!file.type.startsWith('image/')) { toast('Not an image file.'); return; }
    compressImage(file, MAX_DIM, QUALITY, data => {
      const vp = document.getElementById('bdViewport');
      const cascade = (addedThisSession++ % 6) * 18;
      const cx = vp ? -pan.x + vp.clientWidth / 2 - ITEM_W / 2 : 0;
      const cy = vp ? -pan.y + vp.clientHeight / 2 - 90 : 0;
      const l = images();
      l.push({ id: uid(), data, note: '', x: Math.round(cx + cascade), y: Math.round(cy + cascade), at: Date.now() });
      save(l);
      renderPlane();
      toast('Pinned.');
    });
  }

  function compressImage(file, maxDim, quality, cb) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => toast('Could not read that image.');
      img.src = reader.result;
    };
    reader.onerror = () => toast('Could not read that file.');
    reader.readAsDataURL(file);
  }

  /* ---- panning + box-select on empty canvas ---- */
  let mode = null; // 'pan' | 'select' | null
  let moveState = null;

  function wireCanvas() {
    const vp = document.getElementById('bdViewport');
    if (!vp) return;
    vp.addEventListener('pointerdown', e => {
      if (e.target.closest('.bd-item')) return;
      if (!e.shiftKey) selected.clear();
      renderPlane();
      if (e.shiftKey) startBoxSelect(e, vp);
      else startPan(e, vp);
    });
  }

  function startPan(e, vp) {
    mode = 'pan';
    moveState = { startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y };
    vp.setPointerCapture(e.pointerId);
    vp.classList.add('panning');
    window.addEventListener('pointermove', onCanvasMove);
    window.addEventListener('pointerup', onCanvasUp, { once: true });
  }

  function startBoxSelect(e, vp) {
    mode = 'select';
    const rect = document.createElement('div');
    rect.className = 'bd-selrect';
    vp.appendChild(rect);
    const box = vp.getBoundingClientRect();
    moveState = { startX: e.clientX, startY: e.clientY, box, rectEl: rect, vp };
    window.addEventListener('pointermove', onCanvasMove);
    window.addEventListener('pointerup', onCanvasUp, { once: true });
  }

  function onCanvasMove(e) {
    if (mode === 'pan') {
      pan = { x: moveState.origX + (e.clientX - moveState.startX), y: moveState.origY + (e.clientY - moveState.startY) };
      applyPan();
    } else if (mode === 'select') {
      const x1 = Math.min(moveState.startX, e.clientX) - moveState.box.left;
      const y1 = Math.min(moveState.startY, e.clientY) - moveState.box.top;
      const x2 = Math.max(moveState.startX, e.clientX) - moveState.box.left;
      const y2 = Math.max(moveState.startY, e.clientY) - moveState.box.top;
      Object.assign(moveState.rectEl.style, {
        left: x1 + 'px', top: y1 + 'px', width: (x2 - x1) + 'px', height: (y2 - y1) + 'px'
      });
      moveState.rect = { x1, y1, x2, y2 };
    }
  }

  function onCanvasUp() {
    window.removeEventListener('pointermove', onCanvasMove);
    const vp = document.getElementById('bdViewport');
    if (mode === 'pan') {
      savePan();
      if (vp) vp.classList.remove('panning');
    } else if (mode === 'select' && moveState) {
      const r = moveState.rect;
      if (r) {
        document.querySelectorAll('.bd-item').forEach(el => {
          const b = el.getBoundingClientRect();
          const box = moveState.box;
          const ix1 = b.left - box.left, iy1 = b.top - box.top, ix2 = b.right - box.left, iy2 = b.bottom - box.top;
          const overlaps = ix1 < r.x2 && ix2 > r.x1 && iy1 < r.y2 && iy2 > r.y1;
          if (overlaps) selected.add(el.dataset.item);
        });
      }
      if (moveState.rectEl) moveState.rectEl.remove();
      renderPlane();
    }
    mode = null; moveState = null;
  }

  /* ---- moving / selecting individual images ---- */
  function onItemPointerDown(e) {
    if (e.target.closest('input') || e.target.closest('button')) return;
    e.stopPropagation();
    const el = e.currentTarget;
    const id = el.dataset.item;

    if (e.shiftKey) {
      selected.has(id) ? selected.delete(id) : selected.add(id);
      renderPlane();
      return;
    }
    if (!selected.has(id)) { selected = new Set([id]); renderPlane(); }

    const ids = Array.from(selected);
    const l = images();
    const origins = {};
    ids.forEach(iid => { const im = l.find(x => x.id === iid); if (im) origins[iid] = { x: im.x, y: im.y }; });
    const startX = e.clientX, startY = e.clientY;
    let moved = false;

    function onMove(ev) {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      ids.forEach(iid => {
        const node = document.querySelector(`.bd-item[data-item="${iid}"]`);
        const o = origins[iid];
        if (node && o) { node.style.left = (o.x + dx) + 'px'; node.style.top = (o.y + dy) + 'px'; }
      });
    }
    function onUp(ev) {
      window.removeEventListener('pointermove', onMove);
      if (moved) {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        const list = images();
        ids.forEach(iid => {
          const im = list.find(x => x.id === iid);
          const o = origins[iid];
          if (im && o) { im.x = Math.round(o.x + dx); im.y = Math.round(o.y + dy); }
        });
        save(list);
      }
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  }

  /* ---- clipboard copy/paste of a spatial selection ---- */
  function onKeyDown(e) {
    const host = document.getElementById('view-board');
    if (!host || !host.closest('.view.on')) return;
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelection(); }
    if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteSelection(); }
  }

  async function copySelection() {
    if (!selected.size) { toast('Nothing selected — shift+drag or shift+click some pictures first.'); return; }
    const l = images();
    const picked = l.filter(im => selected.has(im.id));
    if (!picked.length) return;
    const minX = Math.min(...picked.map(im => im.x)), minY = Math.min(...picked.map(im => im.y));
    const payload = {
      v: 1, app: 'meridian-board',
      items: picked.map(im => ({ data: im.data, note: im.note || '', dx: im.x - minX, dy: im.y - minY }))
    };
    try {
      await navigator.clipboard.writeText(CLIP_MARK + JSON.stringify(payload));
      toast(`Copied ${picked.length} picture${picked.length > 1 ? 's' : ''}.`);
    } catch (e) {
      toast('Clipboard access blocked — check your browser permissions.');
    }
  }

  async function pasteSelection() {
    let text;
    try { text = await navigator.clipboard.readText(); }
    catch (e) { toast('Clipboard access blocked — check your browser permissions.'); return; }
    if (!text || !text.startsWith(CLIP_MARK)) { toast('Nothing to paste — copy a selection first.'); return; }
    let payload;
    try { payload = JSON.parse(text.slice(CLIP_MARK.length)); }
    catch (e) { toast('Clipboard contents look corrupted.'); return; }
    if (!payload || !Array.isArray(payload.items) || !payload.items.length) { toast('Nothing to paste.'); return; }

    const vp = document.getElementById('bdViewport');
    const anchorX = vp ? -pan.x + vp.clientWidth / 2 - ITEM_W / 2 : 0;
    const anchorY = vp ? -pan.y + vp.clientHeight / 2 - 90 : 0;
    const l = images();
    const newIds = [];
    payload.items.forEach(it => {
      const id = uid();
      newIds.push(id);
      l.push({ id, data: it.data, note: it.note || '', x: Math.round(anchorX + (it.dx || 0)), y: Math.round(anchorY + (it.dy || 0)), at: Date.now() });
    });
    save(l);
    selected = new Set(newIds);
    renderPlane();
    toast(`Pasted ${payload.items.length} picture${payload.items.length > 1 ? 's' : ''}.`);
  }

  function lightbox(src, note) {
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.innerHTML = `<img src="${src}" alt="${esc(note || '')}">${note ? `<span>${esc(note)}</span>` : ''}`;
    lb.hidden = false;
    lb.onclick = () => { lb.hidden = true; lb.innerHTML = ''; };
  }

  function init() { window.addEventListener('keydown', onKeyDown); }

  return { init, render, images };
})();

/* ════════════════════════════════════════════════════════════
   GALLERY — a read-only browse of the same pictures Board
   manages. No upload here, no canvas; this is the "just look at
   them" view, and is unaffected by Board's spatial arrangement.
   ════════════════════════════════════════════════════════════ */
const Gallery = (() => {
  function render() {
    const host = document.getElementById('view-gallery');
    if (!host) return;
    const imgs = Board.images();
    if (!imgs.length) {
      host.innerHTML = `<div class="empty"><b>Nothing pinned yet.</b>Add pictures from the Board tab and they'll show up here too.</div>`;
      return;
    }
    host.innerHTML = `<div class="gal">${imgs.map(im => `
      <figure class="gcell">
        <img src="${im.data}" alt="${esc(im.note || '')}">
        ${im.note ? `<figcaption class="gcap-static">${esc(im.note)}</figcaption>` : ''}
      </figure>`).join('')}</div>`;
    host.querySelectorAll('img').forEach(img => img.onclick = () => {
      const lb = document.getElementById('lightbox');
      lb.innerHTML = `<img src="${img.src}" alt="${esc(img.alt)}">${img.alt ? `<span>${esc(img.alt)}</span>` : ''}`;
      lb.hidden = false;
      lb.onclick = () => { lb.hidden = true; lb.innerHTML = ''; };
    });
  }
  function init() { /* nothing to wire ahead of render */ }
  return { init, render };
})();
