# MERIDIAN — Project Specification

## What it is

A single-page personal knowledge operating system combining Polymath OS's seven
utility screens with a study library, analytics dashboard, and a reserved AI
assistant layer. Deployable as static files on Vercel with optional Supabase
sync.

---

## Architecture

```
No build step. No framework. No npm.
Plain HTML + CSS + vanilla JS served as static files.
One index.html, one CSS file, 22 JS modules, 8 data files.
Optional: Vercel serverless function for AI (api/oracle.js)
Optional: Supabase for cross-device sync + shared storage with Polymath
```

---

## The 11 screens

| Tab | Module | Source | Status |
|---|---|---|---|
| Dashboard | `dashboard.js` | Meridian | ✅ Working — KPIs, area chart, donut, bars, activity feed |
| Atlas | `atlas.js` | Meridian | ✅ Working — 8 subjects, 885 topics, notes, mastery tracking |
| Record | `profile.js` | Polymath | ✅ Working — personal profile card |
| Web | `web.js` | Polymath | ✅ Working — subject knowledge graph |
| Books | `books.js` | Polymath | ✅ Working — reading shelf |
| Stacks | `stacks.js` | Polymath | ✅ Working — draggable task piles |
| Calendar | `calendar.js` | Polymath | ✅ Working — month/week/day views |
| Margin | `thoughts.js` | Polymath | ✅ Working — quick thoughts/quotes/notes |
| Board | `vision.js` | Polymath | ✅ Working — vision board with images |
| Gallery | `board-view.js` | Meridian | ✅ Working — reads Polymath's board images from Supabase |
| Oracle | `oracle.js` | Meridian | ⏸ Dormant — coming-soon screen with 4-phase roadmap |

## The 8 Atlas subjects (885 topics)

| Subject | Sections | Topics | Accent |
|---|---|---|---|
| Economics | 14 | 118 | blue |
| Finance | 12 | 103 | indigo |
| Law (Indian emphasis) | 11 | 123 | violet |
| Mathematics | 13 | 102 | sky |
| Physics | 11 | 114 | cyan |
| Business | 10 | 100 | teal |
| Politics (India/US/UK/major powers) | 10 | 104 | magenta |
| Computer Science | 12 | 121 | pink |

---

## 3 themes (toggleable)

| Theme | Aesthetic | Typography | Radii | Density |
|---|---|---|---|---|
| **Meridian** | Violet gradient, soft radial glows, raised cards | Inter sans-serif | 12px | Normal |
| **Academy** | Dark charcoal #1a1c1e, olive/green accents, flat cards | Inter sans-serif | 8px | Relaxed |
| **Command** | Near-black #050a12, ice-blue #3b9eff, scanline bg | JetBrains Mono | 3px clipped | Tight |

Toggled via the ☀ button in the toolbar. Stored in localStorage, persists
across sessions and syncs.

---

## Cross-device sync

- Uses Supabase (same project as Polymath)
- Login gate appears when Supabase is configured in config.js
- Same email + password as Polymath (same auth table)
- Meridian keys prefixed `mrd:` in the shared `kv` table — no collision
- Gallery reads Polymath's board images via signed URLs, no duplication
- If Supabase is not configured, everything works locally with no sign-in

### Login issue to be aware of

Supabase's default signUp flow sends an email confirmation link. For this to
work, the Supabase project's **Site URL** must be set:

> Supabase Dashboard → Authentication → URL Configuration → Site URL

Set it to your deployed URL (e.g. `https://meridian.datamotion.in`).

If you already have a Polymath account, you do NOT need to create a new one.
Just click "Log in" with the same email and password.

---

## Finance widget

Lives on the Dashboard. Shows live stock prices + market news.

- **Provider:** Finnhub.io (free tier, 60 calls/min, no card)
- **Setup:** Sign up at finnhub.io → copy API key → paste into config.js
- **Default tickers:** RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, SENSEX.BO
- **Indian stocks:** Use `.NS` (NSE) or `.BO` (BSE) suffix
- If no key is set, the card shows inline setup instructions

---

## Oracle (AI assistant) — future

Currently dormant. 4-phase roadmap displayed on the Oracle screen:

1. **Entry writer** — 5-pass written entries for any topic (built, dormant)
2. **Conversational recall** — ask questions against your own notes
3. **Socratic mode** — examines you on mastered topics
4. **Ambient** — voice briefings on study gaps

### Activation (when ready)

1. Get free API key from aistudio.google.com
2. Vercel env vars: `AI_API_KEY`, `AI_PROVIDER=gemini`, `AI_MODEL=gemini-2.5-flash`
3. Set `oracle: true` in config.js
4. Redeploy

---

## File inventory (41 files)

```
index.html                 Shell — 11 tabs, all screen DOM
css/meridian.css            Theme engine + all Meridian styles + Polymath bridge
css/polymath.css            Polymath's original styles
js/config.js                Single configuration file
js/store.js                 localStorage layer + helpers
js/sync.js                  Supabase auth + push/pull
js/core.js                  Chart library (SVG)
js/theme-engine.js          Theme toggling
js/app.js                   Router, boot, auth gate
js/atlas.js                 Study library screen
js/dashboard.js             Analytics overview
js/finance.js               Stock prices + news widget
js/board-view.js             Gallery (Polymath images)
js/oracle.js                AI writer (dormant)
js/profile.js               Record
js/web.js                   Knowledge graph
js/books.js                 Book shelf
js/stacks.js                Task stacks
js/calendar.js              Calendar
js/thoughts.js              Margin
js/vision.js                Vision board
js/connections.js            Subject graph data
js/themes.js                Polymath theme data
js/gestures.js              Touch handling
js/mobile.js                Mobile adaptations
data/economics.js           118 topics
data/finance.js             103 topics
data/law.js                 123 topics
data/mathematics.js         102 topics
data/physics.js             114 topics
data/business.js            100 topics
data/politics.js            104 topics
data/computer-science.js    121 topics
api/oracle.js               Serverless AI proxy (Vercel)
supabase-setup.sql          Database schema
README.md                   Deployment guide
```

---

## What remains to be built

### Priority 1 — Visual polish (next session)

- [ ] **Theme 4: JARVIS holographic** — animated concentric SVG rings,
  translucent glass panels, particle drift, radial HUD elements
- [ ] **Layout density per theme** — `--density` variable is wired but needs
  tuning: Command should tighten gaps, Academy should add whitespace
- [ ] **Polymath screen deep styling** — the 7 Polymath screens now adopt theme
  colours via CSS variable bridging, but some inner elements (calendar cells,
  book cards, stack tiles) need per-theme treatment for full visual coherence
- [ ] **Mobile responsive pass** — tab bar needs hamburger/drawer on narrow
  screens; atlas needs swipe-to-go-back; dashboard cards need single-column
  stacking below 600px

### Priority 2 — Functional

- [ ] **Supabase Site URL documentation** — add to README: the exact dashboard
  path for setting the redirect URL so email confirmation links work
- [ ] **Oracle Phase 1 activation** — test the entry writer end-to-end with a
  real Gemini key once deployed
- [ ] **Export/import Atlas notes** — the backup button captures everything, but
  a focused "export my Law notes as markdown" would be useful
- [ ] **Search across all screens** — the dashboard search only covers Atlas
  topics; extend it to Books, Margin, Calendar

### Priority 3 — Enhancements

- [ ] **More subjects** — adding one is: create `data/name.js`, add a
  `<script>` tag. Candidates: Philosophy, History, Psychology
- [ ] **Polymath ↔ Atlas cross-link** — marking a topic mastered in Atlas could
  populate a node in the Web knowledge graph
- [ ] **Pomodoro / focus timer** — on the Dashboard or as a floating widget
- [ ] **Spaced repetition** — Atlas tracks when you marked each topic; a
  scheduler that resurfaces them at increasing intervals

---

## Deployment checklist

1. [ ] Unzip — files must be at repo root, not in a subfolder
2. [ ] Push to GitHub (private repo)
3. [ ] Vercel → import → Framework: Other, Build/Output: blank
4. [ ] Deploy
5. [ ] (Optional) config.js → supabase url + anonKey → commit → redeploy
6. [ ] (Optional) Supabase → Auth → URL Config → Site URL = your domain
7. [ ] (Optional) finnhub.io → get key → config.js → finance.key
8. [ ] (Optional) Custom domain: Vercel Domains + Cloudflare CNAME
