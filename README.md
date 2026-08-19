# MERIDIAN

All 10 screens in one app. Polymath's seven (Record, Web, Books, Stacks,
Calendar, Margin, Board) plus Meridian's three (Dashboard, Atlas, Oracle).
Three toggleable themes, a finance widget, cross-device sync, login gate.

**No build step.** Plain HTML, CSS, JavaScript. Drag into GitHub, point Vercel
at it.

---

## ⚠ The one thing that breaks deployments

The files inside the zip must sit at the **root** of your repo.

```
WRONG: your-repo/meridian/index.html
RIGHT: your-repo/index.html
```

On GitHub, open the unzipped folder, select everything inside, drag that in.

---

## Deploy (10 minutes)

1. GitHub → new private repo
2. Drag contents of zip into the repo, commit
3. Vercel → Add New → Project → import repo
   - Framework Preset: **Other**
   - Build/Output: **leave blank**
4. Deploy → you get a `.vercel.app` URL
5. Custom domain: Settings → Domains → `meridian.datamotion.in`

---

## Cross-device sync

In `js/config.js`, fill in your Supabase project:

```js
supabase: {
  url: 'https://yourproject.supabase.co',
  anonKey: 'eyJhbGci...'
}
```

Same project as Polymath. Same email, same password. A login gate appears
automatically. Your Polymath Board pictures show up in the Gallery tab.

---

## Themes

Three built-in, toggled from the sun icon in the top bar or the theme picker
on the dashboard:

- **Meridian** — violet gradient, soft glow, rounded cards
- **Academy** — charcoal ground, olive/green accents, Notion density
- **Command** — ice-blue HUD, monospace type, sharp clipped corners

Adding a new theme = a CSS `[data-theme="name"]` block + an entry in
`js/theme-engine.js`.

---

## Finance widget

1. Sign up at **finnhub.io** (free, no card)
2. Copy your API key
3. In `js/config.js`: `finance: { key: 'your-key', symbols: [...] }`

Indian tickers use `.NS` (NSE) or `.BO` (BSE): `RELIANCE.NS`, `TCS.NS`.
The widget shows live prices + market news on the dashboard.

---

## Adding a subject

Create `data/yoursubject.js`:

```js
SUBJECTS.push({
  id: 'chemistry', name: 'Chemistry', short: 'Chem',
  accent: 'green', level: 'Undergraduate',
  blurb: 'One or two sentences.',
  sections: [
    { title: 'Section name', note: '', topics: [
      ['Topic name', 'one-line gloss'],
    ]},
  ]
});
```

Add `<script src="data/yoursubject.js"></script>` to index.html.
It appears everywhere automatically.

Available accents: cyan sky blue indigo violet magenta pink teal green amber rose.

---

## Oracle (AI entries)

Dormant by default. To switch on:

1. Get a free key at **aistudio.google.com**
2. Vercel env vars: `AI_API_KEY`, `AI_PROVIDER=gemini`
3. `js/config.js`: `oracle: true`
4. Redeploy

---

## Files

```
index.html              shell — 11 tabs, 10 screens
css/meridian.css         theme engine + Meridian styles
css/polymath.css         Polymath's original styles
js/config.js             the one file you edit
js/store.js              localStorage + sync
js/sync.js               Supabase auth + push/pull
js/core.js               Chart library + helpers
js/theme-engine.js       theme toggling
js/app.js                router + boot + auth gate
js/atlas.js              the study library
js/dashboard.js          the overview
js/finance.js            stock prices + news
js/board-view.js         Gallery (Polymath images)
js/oracle.js             AI writer (dormant)
js/profile.js            Record (from Polymath)
js/web.js                The Web (from Polymath)
js/books.js              Books (from Polymath)
js/stacks.js             Stacks (from Polymath)
js/calendar.js           Calendar (from Polymath)
js/thoughts.js           Margin (from Polymath)
js/vision.js             Board (from Polymath)
js/connections.js         subject graph data
js/themes.js             Polymath theme data
js/gestures.js           touch/pointer handling
js/mobile.js             mobile adaptations
data/*.js                8 subject files (885 topics)
api/oracle.js            serverless AI proxy
supabase-setup.sql       database schema
```
