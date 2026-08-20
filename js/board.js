/* ════════════════════════════════════════════════════════════
   BOARD — pin pictures with a short note.

   Design note: images are resized and compressed client-side
   before storage (max 900px wide, JPEG ~0.7 quality), then stored
   as plain base64 strings through the same Store/Sync path as
   everything else in the app. No separate Supabase Storage bucket,
   no signed URLs, no second sync system to configure or break —
   they ride the same kv table as your Atlas notes.

   Trade-off worth knowing: this is fine for a personal library of
   photos (each compressed image lands around 50–150KB). If this
   grows into hundreds of high-resolution images, moving to real
   object storage would be the next step — not needed for now.
   ════════════════════════════════════════════════════════════ */
const Board = (() => {
  const MAX_DIM = 900, QUALITY = 0.72;

  const images = () => Store.get('boardImages', []);
  const save = (l) => Store.set('boardImages', l);

  function render() {
    const host = document.getElementById('view-board');
    if (!host) return;
    host.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div class="card-b">
          <label class="btn grad file-btn">Add a picture
            <input type="file" id="bdFile" accept="image/*" hidden>
          </label>
          <span class="board-hint">Resized and compressed before it's stored, so your library stays light.</span>
        </div>
      </div>
      <div class="gal" id="boardGal"></div>`;
    document.getElementById('bdFile').onchange = e => { if (e.target.files[0]) addImage(e.target.files[0]); };
    renderGrid();
  }

  function renderGrid() {
    const host = document.getElementById('boardGal');
    if (!host) return;
    const imgs = images();
    if (!imgs.length) {
      host.innerHTML = `<div class="empty"><b>Nothing pinned yet.</b>Add a picture above.</div>`;
      return;
    }
    host.innerHTML = imgs.map(im => `
      <figure class="gcell" data-id="${im.id}">
        <img src="${im.data}" alt="${esc(im.note || '')}">
        <figcaption>
          <input class="gcap" data-note="${im.id}" value="${esc(im.note || '')}" placeholder="Add a note…">
          <button data-del="${im.id}">✕</button>
        </figcaption>
      </figure>`).join('');
    host.querySelectorAll('img').forEach(img => img.onclick = () => lightbox(img.src, img.alt));
    host.querySelectorAll('[data-note]').forEach(inp => {
      let t = null;
      inp.oninput = () => {
        clearTimeout(t);
        t = setTimeout(() => {
          const l = images();
          const im = l.find(x => x.id === inp.dataset.note);
          if (im) { im.note = inp.value; save(l); }
        }, 500);
      };
    });
    host.querySelectorAll('[data-del]').forEach(btn => btn.onclick = () => {
      save(images().filter(x => x.id !== btn.dataset.del));
      renderGrid();
    });
  }

  function addImage(file) {
    if (!file.type.startsWith('image/')) { toast('Not an image file.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const data = canvas.toDataURL('image/jpeg', QUALITY);
        const l = images();
        l.unshift({ id: uid(), data, note: '', at: Date.now() });
        save(l);
        renderGrid();
        toast('Pinned.');
      };
      img.onerror = () => toast('Could not read that image.');
      img.src = reader.result;
    };
    reader.onerror = () => toast('Could not read that file.');
    reader.readAsDataURL(file);
  }

  function lightbox(src, note) {
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.innerHTML = `<img src="${src}" alt="${esc(note || '')}">${note ? `<span>${esc(note)}</span>` : ''}`;
    lb.hidden = false;
    lb.onclick = () => { lb.hidden = true; lb.innerHTML = ''; };
  }

  function init() { /* nothing to wire ahead of render */ }

  return { init, render, images };
})();

/* ════════════════════════════════════════════════════════════
   GALLERY — a read-only browse of the same pictures Board
   manages. No upload here; this is the "just look at them" view.
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
