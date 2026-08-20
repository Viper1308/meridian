/* ════════════════════════════════════════════════════════════
   SLIDESHOW — the dashboard widget next to Markets. Cycles
   through your own Board pictures. Reads straight from Board's
   local data — no network, no sync dependency, can't fail.
   ════════════════════════════════════════════════════════════ */
const Slideshow = (() => {
  let imgs = [], idx = 0, timer = null;

  function render(hostId, dotsId) {
    const host = document.getElementById(hostId);
    const dots = document.getElementById(dotsId);
    if (!host) return;
    clearInterval(timer);

    imgs = (Board.images() || []).slice(0, 10);
    if (!imgs.length) {
      host.innerHTML = `<div class="empty" style="padding:34px 12px"><b>Nothing pinned yet</b>Add a picture on the Board tab and it'll cycle through here.</div>`;
      if (dots) dots.textContent = '';
      return;
    }
    idx = 0;
    host.innerHTML = `<div class="slide-frame">
      ${imgs.map((im, i) => `<img class="slide-img${i === 0 ? ' on' : ''}" src="${im.data}" alt="${esc(im.note || '')}">`).join('')}
      ${imgs.some(i => i.note) ? `<div class="slide-cap" id="slideCap">${esc(imgs[0].note || '')}</div>` : ''}
      <button class="slide-nav prev" id="slidePrev">‹</button>
      <button class="slide-nav next" id="slideNext">›</button>
    </div>`;
    if (dots) dots.textContent = imgs.length + ' pictures';
    document.getElementById('slidePrev').onclick = () => go(idx - 1);
    document.getElementById('slideNext').onclick = () => go(idx + 1);
    timer = setInterval(() => go(idx + 1), 5000);
  }

  function go(n) {
    const frame = document.querySelector('.slide-frame');
    if (!frame) return;
    idx = (n + imgs.length) % imgs.length;
    frame.querySelectorAll('.slide-img').forEach((im, i) => im.classList.toggle('on', i === idx));
    const cap = document.getElementById('slideCap');
    if (cap) cap.textContent = imgs[idx].note || '';
  }

  function stop() { clearInterval(timer); }

  return { render, stop };
})();
