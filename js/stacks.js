/* ════════════════════════════════════════════════════════════
   STACKS — the spatial floor, back by request.

   Design note: this reverses the Module 3 simplification on
   purpose. The floor is a plain relatively-positioned surface
   (not an infinite canvas — Board owns that pattern) that each
   stack sits on at a persisted x/y, moved with pointer events
   (not native HTML5 drag-and-drop, which is what made the
   original version fragile). A stack renders as a messy little
   pile of book-shaped subtask blocks, each offset and rotated by
   its index so it reads as a physical stack instead of a list.
   Completing a subtask removes its book from the pile outright —
   it doesn't linger struck-through, it's just gone, the way a
   book physically leaves a pile when you take it off.
   ════════════════════════════════════════════════════════════ */
const Stacks = (() => {
  const BOOK_COLORS = ['accent', 'accent2', 'accent3', 'teal', 'amber', 'rose', 'green'];
  const PILE_W = 172;

  let openAdd = null;   // stack id whose "add subtask" mini-form is open
  let editingName = null; // stack id whose name is being renamed
  let drag = null;      // { id, startX, startY, origX, origY, moved }

  const list = () => migrate(Store.get('stacks', []));
  const save = (l) => Store.set('stacks', l);

  /* Old batch-1 shape was { id, name, steps:[{id,text,done}] } with no
     position. Bring that forward: drop already-done steps (they'd have
     vanished under the new model anyway), keep the rest as open books,
     and hand out a cascaded floor position to anything that doesn't
     have one yet. */
  function migrate(l) {
    let changed = false;
    let cascade = 0;
    l.forEach(s => {
      if (typeof s.x !== 'number' || typeof s.y !== 'number') {
        s.x = 24 + (cascade % 4) * 200;
        s.y = 24 + Math.floor(cascade / 4) * 210;
        cascade++;
        changed = true;
      }
      if (typeof s.completed !== 'number') { s.completed = 0; changed = true; }
      const steps = s.steps || [];
      const hadDone = steps.some(t => 'done' in t);
      if (hadDone) {
        s.completed += steps.filter(t => t.done).length;
        s.steps = steps.filter(t => !t.done).map(t => ({ id: t.id, text: t.text }));
        changed = true;
      }
    });
    if (changed) save(l);
    return l;
  }

  function render() {
    const host = document.getElementById('view-stacks');
    if (!host) return;
    host.innerHTML = `
      <div class="stk-toolbar">
        <input class="inp" id="stkNewName" placeholder="New stack name…" style="max-width:260px">
        <button class="btn grad" id="stkAddStack">Drop a new stack</button>
        <span class="stk-hint">Drag a pile by its header to move it around the floor. Click a book to knock that subtask off.</span>
      </div>
      <div class="stk-floor" id="stkFloor"></div>`;

    document.getElementById('stkAddStack').onclick = addStack;
    document.getElementById('stkNewName').onkeydown = e => { if (e.key === 'Enter') addStack(); };
    renderFloor();
  }

  function renderFloor() {
    const floor = document.getElementById('stkFloor');
    if (!floor) return;
    const stacks = list();
    if (!stacks.length) {
      floor.innerHTML = `<div class="empty"><b>The floor is empty.</b>Drop a stack above and start piling subtasks onto it.</div>`;
      return;
    }
    floor.innerHTML = stacks.map(pileHtml).join('');
    wirePile();
  }

  function pileHtml(s) {
    const steps = s.steps || [];
    return `<div class="stk-pile" data-pile="${s.id}" style="left:${s.x}px;top:${s.y}px">
      <div class="stk-pile-head" data-drag="${s.id}">
        ${editingName === s.id
          ? `<input class="inp stk-rename" id="stkRename_${s.id}" value="${esc(s.name)}">`
          : `<b class="stk-pile-name" data-rename="${s.id}" title="Double-click to rename">${esc(s.name)}</b>`}
        <button class="stk-pile-del" data-del="${s.id}" title="Delete this stack">✕</button>
      </div>
      <div class="stk-books" data-books="${s.id}">
        ${steps.length ? steps.map((t, i) => bookHtml(s.id, t, i)).join('') :
          `<div class="stk-empty-pile">Empty pile.</div>`}
      </div>
      <div class="stk-pile-foot">
        ${openAdd === s.id
          ? `<div class="stk-add-step">
               <input class="inp" id="stkNewStep_${s.id}" placeholder="Next subtask…" autofocus>
               <button class="btn" data-addstep="${s.id}">Add</button>
             </div>`
          : `<button class="stk-pile-add" data-openadd="${s.id}">+ subtask</button>
             <span class="stk-pile-meta">${s.completed} knocked off</span>`}
      </div>
    </div>`;
  }

  function bookHtml(stackId, step, i) {
    const color = BOOK_COLORS[i % BOOK_COLORS.length];
    // deterministic "messy" jitter from index, not Math.random(), so it
    // doesn't reshuffle on every re-render
    const rot = ((i * 37) % 9) - 4;               // -4..4deg
    const nudge = ((i * 17) % 11) - 5;             // -5..5px
    return `<div class="stk-book" data-tone="${color}" data-tick="${step.id}"
      style="transform:translateX(${nudge}px) rotate(${rot}deg);z-index:${i}"
      title="Click to mark done">
      <span>${esc(step.text)}</span>
    </div>`;
  }

  function wirePile() {
    // header drag
    document.querySelectorAll('[data-drag]').forEach(el => {
      el.addEventListener('pointerdown', startDrag);
    });
    // rename
    document.querySelectorAll('[data-rename]').forEach(el => {
      el.ondblclick = () => { editingName = el.dataset.rename; renderFloor(); };
    });
    document.querySelectorAll('.stk-rename').forEach(inp => {
      inp.focus(); inp.select();
      const commit = () => { renameStack(inp.id.replace('stkRename_', ''), inp.value); };
      inp.onblur = commit;
      inp.onkeydown = e => {
        if (e.key === 'Enter') inp.blur();
        if (e.key === 'Escape') { editingName = null; renderFloor(); }
      };
    });
    // delete stack
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = e => {
      e.stopPropagation(); delStack(b.dataset.del);
    });
    // knock a book off
    document.querySelectorAll('[data-tick]').forEach(b => b.onclick = e => {
      e.stopPropagation(); completeSubtask(b);
    });
    // add-subtask affordance
    document.querySelectorAll('[data-openadd]').forEach(b => b.onclick = e => {
      e.stopPropagation(); openAdd = b.dataset.openadd; renderFloor();
      const inp = document.getElementById('stkNewStep_' + openAdd);
      if (inp) inp.focus();
    });
    document.querySelectorAll('[data-addstep]').forEach(b => b.onclick = e => {
      e.stopPropagation(); addStep(b.dataset.addstep);
    });
    document.querySelectorAll('.stk-add-step input').forEach(inp => {
      inp.onkeydown = e => {
        if (e.key === 'Enter') { e.stopPropagation(); addStep(inp.id.replace('stkNewStep_', '')); }
        if (e.key === 'Escape') { openAdd = null; renderFloor(); }
      };
    });
  }

  /* ---- dragging a pile around the floor ---- */
  function startDrag(e) {
    if (e.target.closest('.stk-pile-del') || e.target.closest('.stk-rename')) return;
    const id = e.currentTarget.dataset.drag;
    const s = list().find(x => x.id === id);
    if (!s) return;
    const floor = document.getElementById('stkFloor');
    const pileEl = document.querySelector(`.stk-pile[data-pile="${id}"]`);
    if (!floor || !pileEl) return;
    drag = { id, startX: e.clientX, startY: e.clientY, origX: s.x, origY: s.y, moved: false, floor, pileEl };
    pileEl.classList.add('dragging');
    pileEl.style.zIndex = 100;
    e.currentTarget.setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag, { once: true });
  }
  function onDrag(e) {
    if (!drag) return;
    const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true;
    const fw = drag.floor.clientWidth, fh = Math.max(drag.floor.clientHeight, 560);
    const nx = clamp(drag.origX + dx, 0, Math.max(0, fw - PILE_W));
    const ny = clamp(drag.origY + dy, 0, Math.max(0, fh - 60));
    drag.pileEl.style.left = nx + 'px';
    drag.pileEl.style.top = ny + 'px';
    drag.nx = nx; drag.ny = ny;
  }
  function endDrag() {
    window.removeEventListener('pointermove', onDrag);
    if (!drag) return;
    drag.pileEl.classList.remove('dragging');
    drag.pileEl.style.zIndex = '';
    if (drag.moved && typeof drag.nx === 'number') {
      const l = list();
      const s = l.find(x => x.id === drag.id);
      if (s) { s.x = Math.round(drag.nx); s.y = Math.round(drag.ny); save(l); }
    }
    drag = null;
  }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  /* ---- stack + subtask mutations ---- */
  function addStack() {
    const inp = document.getElementById('stkNewName');
    const name = inp.value.trim();
    if (!name) return;
    const l = list();
    const n = l.length;
    const s = {
      id: uid(), name, steps: [], completed: 0,
      x: 24 + (n % 4) * 200, y: 24 + Math.floor(n / 4) * 210
    };
    l.push(s);
    save(l);
    inp.value = '';
    renderFloor();
  }
  function renameStack(id, name) {
    name = (name || '').trim();
    editingName = null;
    if (!name) { renderFloor(); return; }
    const l = list();
    const s = l.find(x => x.id === id);
    if (s) { s.name = name; save(l); }
    renderFloor();
  }
  function delStack(id) {
    save(list().filter(s => s.id !== id));
    if (openAdd === id) openAdd = null;
    renderFloor();
  }
  function addStep(stackId) {
    const inp = document.getElementById('stkNewStep_' + stackId);
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    const l = list();
    const s = l.find(x => x.id === stackId);
    if (!s) return;
    s.steps = s.steps || [];
    s.steps.push({ id: uid(), text });
    save(l);
    renderFloor();
    const again = document.getElementById('stkNewStep_' + stackId);
    if (again) again.focus();
  }
  function completeSubtask(bookEl) {
    const id = bookEl.dataset.tick;
    // pop the book off visually, then remove the data once the animation lands
    bookEl.classList.add('stk-book-pop');
    setTimeout(() => {
      const l = list();
      for (const s of l) {
        const i = (s.steps || []).findIndex(t => t.id === id);
        if (i > -1) {
          s.steps.splice(i, 1);
          s.completed = (s.completed || 0) + 1;
          save(l);
          renderFloor();
          return;
        }
      }
    }, 190);
  }

  function init() { /* nothing to wire ahead of render */ }

  return { init, render };
})();
