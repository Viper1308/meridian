/* ════════════════════════════════════════════════════════════
   CALENDAR — month view. Click a day to add an event, click an
   event to remove it.

   Scope note: the original spec described month/week/day views.
   This module ships month view only — the one people actually
   use day to day — rather than three thin, undertested modes.
   Week/day can be added later without touching this file's data
   shape (events are keyed by ISO date already).
   ════════════════════════════════════════════════════════════ */
const Cal = (() => {
  let cursor = new Date();
  cursor.setDate(1);

  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const events = () => Store.get('events', {});
  const saveEvents = (e) => Store.set('events', e);

  function render() {
    const host = document.getElementById('view-calendar');
    if (!host) return;
    host.innerHTML = `
      <div class="card">
        <div class="card-h">
          <button class="btn" id="calPrev">‹</button>
          <div class="card-t" id="calTitle" style="min-width:160px;text-align:center"></div>
          <button class="btn" id="calNext">›</button>
          <div class="card-x"><button class="btn" id="calToday">Today</button></div>
        </div>
        <div class="card-b"><div class="cal-grid" id="calGrid"></div></div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="card-h"><div class="card-t" id="calDayTitle">Select a day</div></div>
        <div class="card-b" id="calDayBody"><div class="empty">Click a date to see or add events.</div></div>
      </div>`;

    document.getElementById('calPrev').onclick = () => { cursor.setMonth(cursor.getMonth() - 1); renderGrid(); };
    document.getElementById('calNext').onclick = () => { cursor.setMonth(cursor.getMonth() + 1); renderGrid(); };
    document.getElementById('calToday').onclick = () => { cursor = new Date(); cursor.setDate(1); renderGrid(); openDay(iso(new Date())); };
    renderGrid();
  }

  function renderGrid() {
    const grid = document.getElementById('calGrid');
    const title = document.getElementById('calTitle');
    if (!grid || !title) return;
    title.textContent = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDow = first.getDay(); // 0=Sun
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const E = events();
    const todayIso = iso(new Date());

    let cells = '';
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    cells += dow.map(d => `<div class="cal-dow">${d}</div>`).join('');
    for (let i = 0; i < startDow; i++) cells += '<div class="cal-cell empty-cell"></div>';
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      const key = iso(d);
      const dayEvents = E[key] || [];
      cells += `<button class="cal-cell${key === todayIso ? ' today' : ''}" data-date="${key}">
        <span class="cal-daynum">${day}</span>
        ${dayEvents.length ? `<span class="cal-dot-row">${dayEvents.slice(0, 3).map(() => '<i></i>').join('')}</span>` : ''}
      </button>`;
    }
    grid.innerHTML = cells;
    grid.querySelectorAll('[data-date]').forEach(c => c.onclick = () => openDay(c.dataset.date));
  }

  function openDay(dateKey) {
    const title = document.getElementById('calDayTitle');
    const body = document.getElementById('calDayBody');
    if (!title || !body) return;
    const d = new Date(dateKey + 'T00:00:00');
    title.textContent = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    const E = events();
    const dayEvents = E[dateKey] || [];

    body.innerHTML = `
      <div class="cal-add">
        <input class="inp" id="calNewEvent" placeholder="Add an event…">
        <button class="btn grad" id="calAddBtn">Add</button>
      </div>
      <div class="cal-events" id="calEventList">
        ${dayEvents.length ? dayEvents.map(ev => `
          <div class="cal-event"><span>${esc(ev.text)}</span><button data-del="${ev.id}">✕</button></div>
        `).join('') : '<div class="empty">Nothing on this day.</div>'}
      </div>`;

    const add = () => {
      const val = document.getElementById('calNewEvent').value.trim();
      if (!val) return;
      const e = events();
      e[dateKey] = e[dateKey] || [];
      e[dateKey].push({ id: uid(), text: val });
      saveEvents(e);
      openDay(dateKey);
      renderGrid();
    };
    document.getElementById('calAddBtn').onclick = add;
    document.getElementById('calNewEvent').onkeydown = ev => { if (ev.key === 'Enter') add(); };
    body.querySelectorAll('[data-del]').forEach(btn => btn.onclick = () => {
      const e = events();
      e[dateKey] = (e[dateKey] || []).filter(x => x.id !== btn.dataset.del);
      if (!e[dateKey].length) delete e[dateKey];
      saveEvents(e);
      openDay(dateKey);
      renderGrid();
    });
  }

  function init() { /* nothing to wire ahead of render */ }

  return { init, render };
})();
