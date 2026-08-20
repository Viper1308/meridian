/* ════════════════════════════════════════════════════════════
   FINANCE — stock ticker + news card on the dashboard.
   Uses Finnhub (free tier: 60 calls/min, no card needed).
   If no key is set, shows setup instructions instead of failing.
   ════════════════════════════════════════════════════════════ */
const Finance = (() => {
  const cfg = () => (window.MERIDIAN_CONFIG || {}).finance || {};
  const KEY = () => cfg().key || '';
  const SYMS = () => cfg().symbols || ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS'];

  let cache = null, cacheAt = 0;
  const TTL = 5 * 60 * 1000;

  async function fetchQuotes() {
    if (cache && Date.now() - cacheAt < TTL) return cache;
    if (!KEY()) return null;
    const out = [];
    for (const sym of SYMS().slice(0, 6)) {
      try {
        const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${KEY()}`);
        if (!r.ok) continue;
        const d = await r.json();
        if (d && d.c) out.push({ symbol: sym.replace(/\.(NS|BO)$/, ''), price: d.c, change: d.dp, up: d.dp >= 0 });
      } catch (e) { /* skip this ticker */ }
    }
    cache = out; cacheAt = Date.now();
    return out;
  }

  async function fetchNews() {
    if (!KEY()) return [];
    try {
      const r = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${KEY()}`);
      if (!r.ok) return [];
      const data = await r.json();
      return (data || []).slice(0, 5).map(n => ({
        headline: n.headline, source: n.source, url: n.url,
        time: n.datetime ? new Date(n.datetime * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''
      }));
    } catch (e) { return []; }
  }

  async function render(hostId) {
    const host = document.getElementById(hostId);
    if (!host) return;

    if (!KEY()) {
      host.innerHTML = `
        <div class="card-h"><div class="card-t">Markets</div><div class="card-x"><span class="chip">setup needed</span></div></div>
        <div class="card-b"><div class="empty" style="text-align:left">
          <b>Live market data in 3 steps</b>
          <p style="margin:8px 0 0;line-height:1.7">1. Sign up free at <b>finnhub.io</b> — no card needed<br>
          2. Copy your API key<br>
          3. Paste it into <code>js/config.js</code> → <code>finance.key</code></p>
        </div></div>`;
      return;
    }

    host.innerHTML = `<div class="card-h"><div class="card-t">Markets</div><div class="card-x"><span class="chip">live</span></div></div>
      <div class="card-b"><div class="empty">Loading…</div></div>`;

    const [quotes, news] = await Promise.all([fetchQuotes(), fetchNews()]);
    let h = '<div class="card-h"><div class="card-t">Markets</div><div class="card-x"><span class="chip">live</span></div></div><div class="card-b">';
    if (quotes && quotes.length) {
      h += '<div class="fin-grid">';
      quotes.forEach(q => {
        const col = q.up ? 'var(--green)' : 'var(--rose)';
        h += `<div class="fin-tick"><div class="fin-sym">${esc(q.symbol)}</div>
          <div class="fin-price">${q.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div class="fin-chg" style="color:${col}">${q.up ? '↑' : '↓'} ${Math.abs(q.change || 0).toFixed(2)}%</div></div>`;
      });
      h += '</div>';
    }
    if (news && news.length) {
      h += '<div class="fin-news">';
      news.forEach(n => {
        h += `<a class="fin-item" href="${esc(n.url)}" target="_blank" rel="noopener">
          <span class="fin-hl">${esc(n.headline)}</span><span class="fin-src">${esc(n.source)} · ${esc(n.time)}</span></a>`;
      });
      h += '</div>';
    }
    if ((!quotes || !quotes.length) && (!news || !news.length)) h += '<div class="empty">Could not fetch data.</div>';
    h += '</div>';
    host.innerHTML = h;
  }

  return { render };
})();
