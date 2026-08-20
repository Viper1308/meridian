/* ════════════════════════════════════════════════════════════
   STACKS — ordered task piles.

   Design note: the original was a free-form spatial "floor" you
   dragged piles around on, with a dramatic full-screen 3D detail
   panel. That was the single most fragile screen in the old app.
   This version is a plain card grid with up/down reordering
   instead of drag physics — less dramatic, considerably harder to
   break, and just as usable for "what's the next step."
   ════════════════════════════════════════════════════════════ */
const Stacks = (() => {
  let openId = null;

  const list = () => Store.get('stacks', []);
  const save = (l) => Store.set('stacks', l);

  function render() {
    const host = document.getElementById('view-stacks');
    if (!host) return;
    const stacks = list();

    host.innerHTML = `
      <div class="stk-toolbar">
        <input class="inp" id="stkNewName" placeholder="New stack name…" style="max-width:260px">
        <button class="btn grad" id="stkAddStack">New stack</button>
      </div>
      <div class="stk-grid" id="stkGrid"></div>`;

    document.getElementById('stkAddStack').onclick = addStack;
    document.getElementById('stkNewName').onkeydown = e => { if (e.key === 'Enter') addStack(); };
    renderGrid();
  }

  function renderGrid() {
    const grid = document.getElementById('stkGrid');
    if (!grid) return;
    const stacks = list();
    if (!stacks.length) {
      grid.innerHTML = `<div class="empty"><b>No stacks yet.</b>Name one above and start piling steps onto it.</div>`;
      return;
    }
    grid.innerHTML = stacks.map(s => {
      const steps = s.steps || [];
      const done = steps.filter(t => t.done).length;
      const pct = steps.length ? Math.round(done / steps.length * 100) : 0;
      const isOpen = openId === s.id;
      return `<div class="card stk-card">
        <div class="card-b">
          <div class="stk-head" data-open="${s.id}">
            <b>${esc(s.name)}</b>
            <span class="stk-count">${done}/${steps.length}</span>
          </div>
          <div class="btrack" style="margin:8px 0 0"><div class="bfill" style="width:${pct}%;background:var(--grad)"></div></div>
          ${isOpen ? renderSteps(s) : ''}
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('[data-open]').forEach(el => el.onclick = () => {
      openId = openId === el.dataset.open ? null : el.dataset.open;
      renderGrid();
    });
    wireStepControls();
  }

  function renderSteps(stack) {
    const steps = stack.steps || [];
    return `
      <div class="stk-steps">
        ${steps.map((t, i) => `
          <div class="stk-step${t.done ? ' done' : ''}" data-stack="${stack.id}" data-step="${t.id}">
            <button class="stk-tick" data-tick="${t.id}">${t.done ? '✓' : ''}</button>
            <span class="stk-step-text">${esc(t.text)}</span>
            <span class="stk-step-btns">
              <button data-up="${t.id}" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button data-down="${t.id}" ${i === steps.length - 1 ? 'disabled' : ''}>↓</button>
              <button data-rm="${t.id}">✕</button>
            </span>
          </div>`).join('')}
        <div class="stk-add-step">
          <input class="inp" id="stkNewStep_${stack.id}" placeholder="Next step…">
          <button class="btn" data-addstep="${stack.id}">Add</button>
        </div>
        <button class="btn" style="margin-top:10px" data-delstack="${stack.id}">Delete this stack</button>
      </div>`;
  }

  function wireStepControls() {
    document.querySelectorAll('[data-tick]').forEach(b => b.onclick = e => {
      e.stopPropagation(); toggleStep(b.dataset.tick);
    });
    document.querySelectorAll('[data-up]').forEach(b => b.onclick = e => {
      e.stopPropagation(); moveStep(b.dataset.up, -1);
    });
    document.querySelectorAll('[data-down]').forEach(b => b.onclick = e => {
      e.stopPropagation(); moveStep(b.dataset.down, 1);
    });
    document.querySelectorAll('[data-rm]').forEach(b => b.onclick = e => {
      e.stopPropagation(); removeStep(b.dataset.rm);
    });
    document.querySelectorAll('[data-addstep]').forEach(b => b.onclick = e => {
      e.stopPropagation(); addStep(b.dataset.addstep);
    });
    document.querySelectorAll('[data-delstack]').forEach(b => b.onclick = e => {
      e.stopPropagation(); delStack(b.dataset.delstack);
    });
    document.querySelectorAll('#stkGrid input').forEach(inp => inp.onkeydown = e => {
      if (e.key === 'Enter') { e.stopPropagation(); addStep(inp.id.replace('stkNewStep_', '')); }
    });
  }

  function addStack() {
    const inp = document.getElementById('stkNewName');
    const name = inp.value.trim();
    if (!name) return;
    const l = list();
    const s = { id: uid(), name, steps: [] };
    l.unshift(s);
    save(l);
    inp.value = '';
    openId = s.id;
    renderGrid();
  }
  function delStack(id) {
    save(list().filter(s => s.id !== id));
    if (openId === id) openId = null;
    renderGrid();
  }
  function findStep(id) {
    for (const s of list()) {
      const step = (s.steps || []).find(t => t.id === id);
      if (step) return { stack: s, step };
    }
    return null;
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
    s.steps.push({ id: uid(), text, done: false });
    save(l);
    renderGrid();
  }
  function toggleStep(id) {
    const l = list();
    const f = findStepIn(l, id);
    if (f) { f.step.done = !f.step.done; save(l); renderGrid(); }
  }
  function removeStep(id) {
    const l = list();
    const f = findStepIn(l, id);
    if (f) { f.stack.steps = f.stack.steps.filter(t => t.id !== id); save(l); renderGrid(); }
  }
  function moveStep(id, dir) {
    const l = list();
    const f = findStepIn(l, id);
    if (!f) return;
    const arr = f.stack.steps;
    const i = arr.findIndex(t => t.id === id);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    save(l); renderGrid();
  }
  function findStepIn(l, id) {
    for (const s of l) {
      const step = (s.steps || []).find(t => t.id === id);
      if (step) return { stack: s, step };
    }
    return null;
  }

  function init() { /* nothing to wire ahead of render */ }

  return { init, render };
})();
