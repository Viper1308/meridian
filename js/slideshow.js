/* ════════════════════════════════════════════════════════════
   SLIDESHOW — the empty space next to Markets on the dashboard.
   Pulls a handful of pictures from the shared Board (same source
   as the Gallery tab) and autoplays through them.

   Needs Supabase configured + signed in, same as Gallery. Without
   that it shows a short explanation instead of staying blank.
   ════════════════════════════════════════════════════════════ */
const Slideshow = (() => {
  let imgs = [], idx = 0, timer = null;

  async function render(hostId, dotsId) {
    const host = document.getElementById(hostId);
    const dots = document.getElementById(dotsId);
    if (!host) return;
    clearInterval(timer);

    if (!Sync.enabled) {
      host.innerHTML = `<div class="empty" style="padding:34px 12px"><b>No board connected</b>
        Set up Supabase sync to see your Board pictures cycle through here.</div>`;
      if (dots) dots.textContent = '';
      return;
    }
    if (!Sync.currentUser()) {
      host.innerHTML = `<div class="empty" style="padding:34px 12px"><b>Sign in to see this</b>
        Your Board pictures live in your account.</div>`;
      if (dots) dots.textContent = '';
      return;
    }

    host.innerHTML = `<div class="empty" style="padding:34px 12px">Loading pictures…</div>`;
    imgs = await Gallery.randomImages(8);

    if (!imgs.length) {
      host.innerHTML = `<div class="empty" style="padding:34px 12px"><b>Nothing pinned yet</b>
        Add a picture to a Board and it will show up here.</div>`;
      if (dots) dots.textContent = '';
      return;
    }

    idx = 0;
    host.innerHTML = `<div class="slide-frame">
      ${imgs.map((im, i) => `<img class="slide-img${i === 0 ? ' on' : ''}" src="${im.url}" alt="${esc(im.note)}">`).join('')}
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
