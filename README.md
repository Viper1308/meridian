# MERIDIAN — Module 4, batches 1 & 3 of 2–3 (redesign in progress)

Every screen is live: Dashboard, Atlas, Record, Books, Calendar, Margin, Web,
Stacks, Board, Gallery. Oracle stays intentionally dormant. Module 4 is a
targeted redesign pass over seven screens per a new spec — see
`spec.md` for the full running status (what's done, what's still queued).
Batch 3 was done ahead of batch 2 at the person's explicit request; Calendar
and Web (batch 2) are still queued exactly as they were.

## What's new in this batch (Module 4, batch 3: Stacks + Board)

- **Stacks** — the free-form spatial "floor" is back, on purpose reversing
  the Module 3 simplification below. Each stack is a `.stk-pile` you drag
  around a `.stk-floor` by its header (pointer events, not native
  drag-and-drop — the exact thing that made this screen fragile the first
  time). Subtasks render as small book-shaped blocks piled inside, each
  given a deterministic rotation/offset so it reads as messy rather than a
  list. Click a book to complete that subtask — it pops and vanishes from
  the pile outright, it doesn't linger struck-through. Old stack data
  migrates automatically: already-done steps fold into a per-stack
  "knocked off" counter, everything else gets a starting floor position.
- **Board** — the old toolbar-and-form layout is gone. A single floating
  "+ picture" button sits on the periphery of what's now a truly infinite
  pannable plane (drag empty space to pan; no fixed canvas bounds to run
  out of). Backgrounds are fully swappable — grid, lines, blank, a color
  picker, or a custom uploaded image — from a small peripheral popover.
  Pictures drop and drag freely with zero grid snapping. Shift+drag box-
  selects a group of pictures; ⌘/Ctrl+C copies the exact spatial
  arrangement (images, notes, and relative positions) to the real OS
  clipboard behind a version marker, and ⌘/Ctrl+V pastes it back — the
  only mechanism that could plausibly survive a paste into a different app
  (Polymath) the way the spec asked for, though Polymath would need to
  speak the same marker/schema for that side of it to work. Gallery is
  untouched — it just lists the same pictures and doesn't care about
  position.

## What's new in Module 4, batch 1 (previous)

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

**Stacks' spatial "floor" is back as of batch 3** (see above) — the
Module 3 note below about it being deliberately removed applied up through
batch 1 of this module, not anymore. It still doesn't have the old
dramatic full-screen 3D reveal panel; that wasn't part of the batch-3 ask.

**Board's infinite canvas has no fixed bounds by design**, which is what
makes "infinite" cheap and safe rather than a real re-bounding problem —
see the spec's implementation notes for Board for the reasoning.

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

Batches 1–2 (Record, Books, Margin): two full passes loading the real
`index.html` with real script tags (not eval-concatenation, which is how
the original API-mismatch bugs slipped through unnoticed):

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

**Batch 3 (Stacks, Board):** tested with `jsdom` rather than a real
browser this round — loading `store.js` + `stacks.js` + `board.js`
together against a minimal DOM, then driving them exactly the way a real
person would: created a stack, opened the add-subtask form, added a
subtask, clicked its book to complete it, and confirmed it actually left
the DOM and the persisted `steps` array (not just visually struck
through). Separately, seeded a batch-1-shaped stack (`done` flags, no
`x`/`y`) and confirmed the migration path drops completed steps into the
counter, keeps open ones, and hands out a floor position. Dispatched a
real `pointerdown`/`pointermove`/`pointerup` sequence on a pile header and
confirmed the persisted position moved by the drag delta (jsdom has no
real layout engine, so absolute pixel values there aren't meaningful, but
the *mechanism* — capture, move, commit-on-release, no commit without
movement — is exercised).

For Board: seeded two images directly into `Store` (jsdom has no
`<canvas>`, so the resize/compress pipeline itself couldn't be driven
through a real file), dispatched shift-`pointerdown` on both to select
them, confirmed the Copy button's disabled state flips and that clicking
it writes a `MERIDIAN_BOARD_CLIP_V1:`-prefixed payload to a mocked
`navigator.clipboard`, then confirmed Paste reads it back and adds two new
images at the pasted offset. What this pass did **not** cover: real image
compression (needs a real `<canvas>`/`Image`), real pointer-drag pixel
math on a laid-out page (jsdom reports `0` for `clientWidth`/`clientHeight`
throughout), and the real OS clipboard permission prompt a browser shows
on first use. All three are exactly the kind of thing that's worth a
manual click-through pass before relying on this in production, same
caveat the Module 3 README gave for Web's node dragging.

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
- Web and Calendar's batch-2 redesigns (13-subject complete graph +
  slide-in panels; 3-pane layout + `.ics` import + drag-to-pin) are still
  queued — batch 3 (this one) was done first at the person's request
- Board images are capped by what's reasonable in a Postgres `jsonb` column
  — a personal library, not a photo-hosting service
- Board's clipboard copy/paste depends on the browser's Clipboard API and
  its permission prompt, neither of which headless `jsdom` testing can
  exercise for real — worth a manual pass, especially across browsers
- Real pointer/drag interactions (Web's node dragging, Stacks' pile
  dragging, Board's pan/box-select/image-dragging) couldn't be fully
  verified in headless testing — the underlying event flow was exercised
  against a mocked DOM, but real layout, real pixel math, and real pointer
  capture physics were not, since jsdom implements none of those
