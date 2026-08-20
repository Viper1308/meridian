# MERIDIAN — Module 4, batch 1 of 2–3 (redesign in progress)

Every screen is live: Dashboard, Atlas, Record, Books, Calendar, Margin, Web,
Stacks, Board, Gallery. Oracle stays intentionally dormant. Module 4 is a
targeted redesign pass over seven screens per a new spec — see
`spec.md` for the full running status (what's done, what's still queued).

## What's new in this batch (Module 4, part 1 of 2–3)

- **Record** — rebuilt as a structured, LinkedIn-style ledger. The headline
  card (name/role/place/bio/avatar) stays at the top, but underneath it now
  has four dedicated, distinct sections — **Education**, **Experience**,
  **Awards & Honours**, **Skills** — each with its own add/edit/remove
  ledger instead of one free-form bio field standing in for a resume.
  Skills render as scannable chips; the other three render as dated rows.
- **Books** — now supports bulk import from an Excel sheet (`.xlsx`/`.xls`/
  `.csv`, matched on Title/Author/Status columns, case-insensitive, Status
  optional). The parser (SheetJS) loads lazily from a CDN only when Import
  is actually clicked, so the default path stays exactly as offline as it
  always was. Every book also now has a dedicated, collapsible note-taking
  space attached to it, saved independently of the shelf entry.
- **Margin** — full-width single-column cards are gone. The feed is now a
  masonry, Pinterest-style layout of small, post-it sized cards (CSS
  multi-column, 1–4 columns depending on width) — denser and more scannable
  at a glance. Search, tagging, and the thought/quote toggle are unchanged.

## What's new in Module 3 (previous)

- **Web** — recoded from scratch. The old version broke because it used
  `position:absolute;inset:0` expecting a parent with real height, and the
  parent never had one. This version never uses that pattern — the graph
  lives in a normal-flow div with an explicit height. Drag a node to move
  it, drag empty space to pan, scroll to zoom, click a node to open that
  subject in the Atlas. Node size reflects how much of that subject you've
  mastered.
- **Stacks** — deliberately simplified from the original. The old version
  was a free-form spatial "floor" you dragged piles around on, with a
  dramatic full-screen 3D detail panel — the most fragile screen in the old
  app. This version is a plain card grid with up/down reordering. Less
  dramatic, considerably harder to break.
- **Board** — pin pictures with a note. Images are resized and compressed
  client-side (max 900px, JPEG ~0.7 quality) before storage, so a real photo
  library stays light.
- **Gallery** — a read-only browse of the same pictures Board manages.
- **Finance widget** — live stock prices + market news on the dashboard.
  Free key from finnhub.io, no card needed.
- **Slideshow** — the dashboard widget next to Markets, cycling through your
  Board pictures. Reads local data directly — no network dependency, can't
  fail even if you've never touched Board.
- **Cross-device sync** — optional. Fill in Supabase details and a login
  gate appears automatically; leave it blank and nothing changes.

## Design choices worth knowing about

**Board/Gallery images ride the same sync path as everything else** — no
separate Supabase Storage bucket, no signed URLs, no second system to
configure or break. They're stored as compressed base64 strings in the same
`kv` table as your Atlas notes. Fine for a personal library (each image
lands around 50–150KB); if this grows into hundreds of full-resolution
photos, moving to real object storage would be the next step, but wasn't
needed to ship this.

**Stacks lost its spatial "floor" and dramatic reveal panel.** If you want
that back, it's a distinct feature request, not a bug — the current version
is simpler on purpose.

**Calendar (from Module 2) is still month-view only.** Unchanged this
module — still flagged as a known scope reduction from the original spec.

## Setting up sync (optional)

1. Create a Supabase project if you don't have one
2. SQL Editor → run everything in `supabase-setup.sql`
3. **Authentication → URL Configuration → Site URL** → set to your deployed
   URL. This step is easy to miss and is why confirmation emails failed in
   an earlier version of this app — without it, the link in the email
   points to `localhost` and does nothing.
4. `js/config.js` → fill in `supabase.url` and `supabase.anonKey`
5. Deploy. A login gate now appears. Sign up, confirm your email, log in.

Leave `js/config.js` blank and the gate never appears — everything stays
local to the browser, which is a completely reasonable way to run this.

## Setting up live market data (optional)

1. finnhub.io → sign up free, no card
2. Copy your API key into `js/config.js` → `finance.key`
3. Adjust `finance.symbols` if you want different tickers — `.NS` for NSE,
   `.BO` for BSE

## How this was tested

Two full passes, both loading the real `index.html` with real script tags
(not eval-concatenation, which is how the original API-mismatch bugs slipped
through unnoticed):

1. **Default path** (no Supabase configured) — every screen clicked through,
   a stack created with a step added and marked done, an image pinned and
   confirmed to appear in both Gallery and the dashboard Slideshow, a graph
   node clicked and confirmed to open the right subject in Atlas, theme
   cycling and topbar folding both re-verified. Zero uncaught errors.
2. **Sync path** (mocked Supabase client) — gate correctly appears when
   configured, rejects a wrong password with a clear message, accepts a
   correct one, dismisses, pulls remote data into the local store, shows the
   signed-in email and a working sign-out button.

One real bug was caught and fixed during this second pass: after a
successful gate login, the "signed in as…" indicator and sign-out button
never appeared — they were only wired for the "already had a session" boot
path, not the "just logged in through the gate" path. Fixed by having the
shared `start()` function always check the current session rather than
relying on whichever path called it to remember to do so.

## Deploy

Same as every module — unzip, `index.html` at repo root, GitHub, Vercel
(Framework: Other, Build/Output: blank). No environment variables needed
unless you're using sync or finance, both of which are configured entirely
in `js/config.js`, not in Vercel's dashboard.

## What's genuinely finished vs. what's dormant

**Finished:** every screen listed above, tested end to end.

**Dormant by design:** Oracle. The roadmap card explains why and what the
four phases are. Nothing about this module changes that.

**Known limitations, stated plainly:**
- Calendar is month-view only
- Stacks has no spatial/drag layout (by design, see above)
- Board images are capped by what's reasonable in a Postgres `jsonb` column
  — a personal library, not a photo-hosting service
- Real pointer/drag interactions (Web's node dragging, in particular)
  couldn't be fully verified in headless testing — the click-to-open-Atlas
  path was verified, the drag-to-reposition path was not, since jsdom
  doesn't implement real pointer capture physics
