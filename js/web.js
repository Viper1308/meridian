/* ════════════════════════════════════════════════════════════
   WEB — a knowledge graph of the 8 subjects. Recoded from scratch.

   The previous version broke because it used position:absolute;
   inset:0 expecting a parent with real, explicit height — and the
   parent never had one. This version never uses that pattern: the
   SVG lives in a normal-flow div with an explicit height, and pan/
   zoom happen via an SVG transform on a <g>, not via repositioning
   the container itself. There is no ancestor-sizing dependency to
   get wrong.

   Interaction: drag a node to move it (position saved), drag empty
   space to pan, wheel to zoom, click a node to open that subject
   in the Atlas.
   ════════════════════════════════════════════════════════════ */
const Web = (() => {
  const W = 900, H = 560; // internal SVG coordinate space
  const R = Math.min(W, H) * 0.32;

  // Meaningful cross-subject connections, not arbitrary.
  const EDGES = [
    ['economics', 'finance'], ['economics', 'business'], ['economics', 'politics'],
    ['finance', 'business'], ['business', 'politics'], ['politics', 'law'],
    ['law', 'business'], ['mathematics', 'physics'], ['mathematics', 'computer-science'],
    ['physics', 'computer-science'], ['computer-science', 'business'],
    ['computer-science', 'politics'], ['physics', 'economics'],
  ];

  let view = { x: 0, y: 0, k: 1 };
  let drag = null; // { type:'node'|'pan', id, startX, startY, ... }

  function positions() { return Store.get('webPositions', {}); }
  function savePositions(p) { Store.set('webPositions', p); }

  function defaultLayout() {
    const subjects = window.SUBJECTS || [];
    const pos = {};
    subjects.forEach((s, i) => {
      const a = (i / subjects.length) * Math.PI * 2 - Math.PI / 2;
      pos[s.id] = { x: W / 2 + R * Math.cos(a), y: H / 2 + R * Math.sin(a) };
    });
    return pos;
  }

  function mastery(subjectId) {
    const s = (window.SUBJECTS || []).find(x => x.id === subjectId);
    if (!s) return 0;
    const P = Store.get('prog', {});
    let m = 0;
    s.sections.forEach(sec => sec.topics.forEach(t => { if (P[Atlas.pkey(s.id, t[0])]) m++; }));
    return m;
  }

  function render() {
    const host = document.getElementById('view-web');
    if (!host) return;
    view = Store.get('webView', { x: 0, y: 0, k: 1 });
    host.innerHTML = `
      <div class="web-toolbar">
        <button class="btn" id="webReset">Re-ring</button>
        <span class="web-hint">Drag a node to move it · drag empty space to pan · scroll to zoom · click a node to open it</span>
      </div>
      <div class="web-canvas-wrap" id="webCanvasWrap">
        <svg id="webSvg" class="web-svg" viewBox="0 0 ${W} ${H}"></svg>
      </div>`;
    document.getElementById('webReset').onclick = () => {
      savePositions({});
      Store.set('webView', { x: 0, y: 0, k: 1 });
      view = { x: 0, y: 0, k: 1 };
      draw();
    };
    wireInteraction();
    draw();
  }

  function draw() {
    const svg = document.getElementById('webSvg');
    if (!svg) return;
    const subjects = window.SUBJECTS || [];
    const saved = positions();
    const dflt = defaultLayout();
    const pos = {};
    subjects.forEach(s => { pos[s.id] = saved[s.id] || dflt[s.id]; });

    const ACCENT = { blue:'#4f7dfa', indigo:'#6366f1', violet:'#8b5cf6', magenta:'#d946ef',
      sky:'#38bdf8', cyan:'#38bdf8', pink:'#ec4899', teal:'#2dd4bf' };

    let edges = '';
    EDGES.forEach(([a, b]) => {
      if (!pos[a] || !pos[b]) return;
      edges += `<line x1="${pos[a].x}" y1="${pos[a].y}" x2="${pos[b].x}" y2="${pos[b].y}" class="web-edge"/>`;
    });

    let nodes = '';
    subjects.forEach(s => {
      const p = pos[s.id];
      if (!p) return;
      const m = mastery(s.id);
      const r = 26 + Math.min(m, 40) * 0.6;
      const c = ACCENT[s.accent] || ACCENT.violet;
      nodes += `<g class="web-node" data-id="${esc(s.id)}" transform="translate(${p.x},${p.y})">
        <circle r="${r}" fill="${c}" fill-opacity=".16" stroke="${c}" stroke-width="2"/>
        <circle r="4" fill="${c}"/>
        <text class="web-label" y="${r + 16}" text-anchor="middle">${esc(s.short || s.name)}</text>
        ${m > 0 ? `<text class="web-count" y="4" text-anchor="middle">${m}</text>` : ''}
      </g>`;
    });

    svg.innerHTML = `<g id="webPlane" transform="translate(${view.x},${view.y}) scale(${view.k})">${edges}${nodes}</g>`;

    svg.querySelectorAll('.web-node').forEach(n => {
      n.addEventListener('pointerdown', e => startNodeDrag(e, n.dataset.id, pos));
      n.addEventListener('click', e => {
        if (drag && drag.moved) return; // suppress click after a real drag
        Atlas.open(n.dataset.id);
        App.go('atlas');
      });
    });
  }

  function wireInteraction() {
    const wrap = document.getElementById('webCanvasWrap');
    const svg = document.getElementById('webSvg');
    if (!wrap || !svg) return;

    svg.addEventListener('pointerdown', e => {
      if (e.target.closest('.web-node')) return; // node handler takes it
      drag = { type: 'pan', startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y, moved: false };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      if (drag.type === 'pan') {
        view.x = drag.ox + dx; view.y = drag.oy + dy;
        document.getElementById('webPlane').setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.k})`);
      } else if (drag.type === 'node') {
        const rect = svg.getBoundingClientRect();
        const scaleX = W / rect.width, scaleY = H / rect.height;
        const svgX = (e.clientX - rect.left) * scaleX;
        const svgY = (e.clientY - rect.top) * scaleY;
        // convert from svg-space back through the pan/zoom transform
        const x = (svgX - view.x) / view.k;
        const y = (svgY - view.y) / view.k;
        drag.pos[drag.id] = { x, y };
        const g = svg.querySelector(`.web-node[data-id="${drag.id}"]`);
        if (g) g.setAttribute('transform', `translate(${x},${y})`);
        const edges = svg.querySelectorAll('.web-edge');
        // cheap redraw of edges touching this node
        redrawEdgesFor(drag.id, drag.pos);
      }
    });
    const end = () => {
      if (drag && drag.type === 'pan') Store.set('webView', view);
      if (drag && drag.type === 'node') savePositions(drag.pos);
      drag = null;
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);

    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      view.k = Math.max(0.4, Math.min(2.5, view.k * factor));
      document.getElementById('webPlane').setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.k})`);
      Store.set('webView', view);
    }, { passive: false });
  }

  function startNodeDrag(e, id, currentPos) {
    e.stopPropagation();
    const svg = document.getElementById('webSvg');
    svg.setPointerCapture(e.pointerId);
    drag = { type: 'node', id, pos: { ...currentPos }, moved: false };
  }

  function redrawEdgesFor(id, pos) {
    const svg = document.getElementById('webSvg');
    if (!svg) return;
    EDGES.forEach(([a, b], i) => {
      if (a !== id && b !== id) return;
      const line = svg.querySelectorAll('.web-edge')[i];
      if (!line || !pos[a] || !pos[b]) return;
      line.setAttribute('x1', pos[a].x); line.setAttribute('y1', pos[a].y);
      line.setAttribute('x2', pos[b].x); line.setAttribute('y2', pos[b].y);
    });
  }

  function init() { /* nothing to wire ahead of render */ }

  return { init, render, draw };
})();
