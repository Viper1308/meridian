# MERIDIAN — Module 4 spec & running status

This file is the single source of truth for the Module 4 redesign: what the
original ask was, what's been built, and exactly what's left. Each future
batch should read this file first, implement the next unchecked item(s),
then replace this file with an updated version — same format, statuses
flipped, notes added.

Codebase this applies to: the Module 3 app (`index.html` at repo root,
`js/`, `css/app.css`, `data/`). Nothing about the file layout or the
Store/App architecture changes — every item below is a redesign of an
existing screen's markup, styling, and/or client logic, not a rewrite of
the app shell.

---

## ✅ Done — Batch 1

### Record — DONE
**Original ask:** Structured like a LinkedIn profile. Dedicated, distinct
sections for education, experience, awards & honours, and skills. No
free-form chaos here, just a clean, scannable professional ledger.

**Implementation:** `js/record.js` rewritten. Headline card (name / role /
place / bio / avatar, editable) unchanged at the top — that's the LinkedIn
"header," not the chaos being replaced. Below it, four dedicated section
cards, each independently add/edit/remove:
- **Education** — degree, school, start, end, detail
- **Experience** — title, org, start, end, detail
- **Awards & Honours** — award name, issuer, date, detail
- **Skills** — name + level (Beginner/Intermediate/Advanced/Expert),
  rendered as chips rather than rows since skills don't carry dates/detail

Data lives in `Store` under `rec_sections` (`{ education: [...], experience:
[...], awards: [...], skills: [...] }`), separate from the existing
`profile` key so the headline and the ledger sections don't collide.
CSS added under `/* ═══ RECORD ═══ */` in `css/app.css`
(`.rec-sections`, `.rec-row`, `.rec-chip`, `.rec-add-form`, etc).

### Books — DONE
**Original ask:** Now supports bulk imports. Drop an Excel sheet in and it
populates the library automatically. We've also wired up a dedicated
note-taking space attached to every single book in the collection.

**Implementation:** `js/books.js` rewritten.
- **Bulk import** — "Import Excel" button next to the existing add form,
  accepts `.xlsx`/`.xls`/`.csv`. Matches a Title column (also accepts
  "Book"/"Name"), an Author column ("Writer"/"By"), and an optional Status
  column (maps loosely to Reading/Finished/Want to read; defaults to "Want
  to read" if missing or unrecognised). Parser is SheetJS, loaded from a
  CDN lazily — only when Import is clicked — so the screen has zero network
  dependency until that moment, same philosophy as the rest of Books always
  had.
- **Per-book notes** — every book row has a "Notes" toggle that expands a
  textarea underneath it, saved to `Store` under `book_notes` (keyed by
  book id, independent of the `books` list itself). A small dot on the
  title indicates a book already has a note.

### Margin — DONE
**Original ask:** Full-width notes are gone. The UI is refactored into a
masonry-style Pinterest feed of tiny, post-it sized cards. Much denser,
highly scannable information architecture.

**Implementation:** `js/margin.js` — one-line change, wrapping the existing
card list in a `.mg-masonry` container. `css/app.css` — that container is a
CSS multi-column layout (1 column on phones, up to 4 on wide desktops),
cards use `break-inside:avoid` so no card splits across columns, and card
padding/font-size were tightened for a genuine "post-it" feel. All existing
behaviour (thought/quote toggle, tagging, search, ⌘/Ctrl+Enter, remove) is
unchanged — this was a layout pass, not a logic change.

---

## ✅ Done — Batch 3

### Stacks — DONE
**Original ask:** The spatial "floor" is back. Graphically, it resembles a
messy room where major tasks are literal stacks of books you can drag
around. The individual books represent subtasks. Mark a subtask complete,
and that specific book physically vanishes from the pile.

**Implementation:** `js/stacks.js` rewritten. `#view-stacks` is now a
`.stk-floor` — a relatively-positioned surface with a faint dot-grid
texture — instead of a `.stk-grid` card grid. Each stack renders as a
`.stk-pile` absolutely positioned at a persisted `{x, y}`, dragged by its
header via pointer events (`pointerdown`/`pointermove`/`pointerup`, with
`setPointerCapture`, not native HTML5 drag-and-drop) — the exact fragility
the original spec warned about. Positions are clamped to the floor's
current bounds on every move and only written to `Store` on `pointerup`,
not on every frame.

Each open subtask renders as a `.stk-book` — a small colored block inside
the pile, given a deterministic (index-derived, not random) rotation and
horizontal nudge so the pile reads as messy without reshuffling on every
re-render. Clicking a book completes that subtask: it plays a brief
pop/fade transition, then is spliced out of the stack's `steps` array
entirely — it doesn't linger struck-through the way it used to, it's just
gone, same as a book leaving a physical pile. A per-stack `completed`
counter persists the historical count since the steps themselves no longer
carry a `done` flag.

Renaming (double-click the pile name) and deleting a stack are unchanged
in spirit from batch 1, just moved onto the pile itself instead of a card
header. Old batch-1 data (`{id, name, steps:[{id,text,done}]}`, no
position) is migrated on first load: already-done steps are dropped and
folded into the new `completed` counter, remaining steps keep their
`id`/`text`, and every stack without a position is handed one via a
cascade so nothing loads stacked on top of itself.

Data still lives in `Store` under `stacks` — same key, new shape.
CSS added/rewritten under `/* ═══ STACKS — the spatial floor ═══ */` in
`css/app.css` (`.stk-floor`, `.stk-pile`, `.stk-book`, etc); the old
`.stk-grid`/`.stk-step` card-list rules are gone.

### Board — DONE
**Original ask:** The clunky toolbar is dead, replaced by a single, clean
"add picture" button on the periphery. The canvas is now an infinitely
loading plane you can pan endlessly in any direction. Backgrounds are
fully mutable (grid, lines, blank, specific colors, or custom image
uploads). Pictures can be arranged spatially with zero grid snapping.
Added complex clipboard support: box-select an arrangement of images,
copy, and paste the exact spatial configuration seamlessly, which persists
even across Polymath and Meridian.

**Implementation:** `js/board.js` rewritten (Gallery, at the bottom of the
same file, is untouched — it just lists `Board.images()` and doesn't care
about position). The old inline card + `.gal` masonry grid is replaced
with a `.bd-stage` containing a fixed `.bd-viewport` and a `.bd-plane`
that's translated by a persisted `{x, y}` pan offset. "Infinite" is done
the deliberately cheap way: images sit at absolute plane-space coordinates
with no canvas bounds at all — there's nothing to run out of, so panning
never needs re-bounding math, only the translate value changes. There's no
zoom; the original ask only mentioned panning.

- **Add picture** — a single floating pill button (`.bd-fab`, top-right of
  the stage) replaces the old inline form. Same client-side resize/
  compress pipeline as before (max 900px, JPEG ~0.72 quality), same
  `Store`/Sync path, same trade-off noted previously (fine for a personal
  library, not a photo host).
- **Backgrounds** — a small popover (toggled from a peripheral icon
  cluster, top-left) offers Grid / Lines / Blank / a native color picker /
  a custom image upload. Stored as `{type, value?}` under `boardBg`,
  painted on the *viewport* (fixed) rather than the plane (moving) — a
  deliberate simplification so the background doesn't need to track pan
  math; it reads as "the floor under the glass" rather than literal
  infinite wallpaper. Background images are compressed too (max 1600px,
  JPEG ~0.6 quality) since they're viewed larger than a pinned photo.
- **Free-form placement, zero snapping** — every image carries its own
  `{x, y}` in plane space, set on drop (roughly centered on whatever's
  currently in view, with a small per-session cascade so repeated adds
  don't stack exactly on top of each other) and updated by dragging the
  image directly. No grid, no snap-to.
- **Box-select + clipboard** — holding Shift and dragging on empty canvas
  draws a selection rectangle (in screen space, tested against each
  image's `getBoundingClientRect()` — deliberately avoided doing this in
  plane/transform space, since screen-space intersection needs no math
  beyond a rectangle-overlap check). Shift-click toggles individual
  images in/out of the selection. Selected images get a highlighted
  outline. Copying (a peripheral icon button, or ⌘/Ctrl+C) serializes the
  selection — each image's data URL, note, and *offset from the
  selection's own top-left* — into JSON behind a version marker
  (`MERIDIAN_BOARD_CLIP_V1:`) and writes it to the real OS clipboard via
  `navigator.clipboard.writeText`. Pasting (icon button or ⌘/Ctrl+V) reads
  the clipboard, checks for that marker, and re-creates every image at the
  current view's center plus its original relative offset — the spatial
  arrangement survives the round trip. This is the only mechanism that
  could plausibly satisfy "persists even across Polymath and Meridian," as
  called out as the riskiest unknown in the original notes: it's real OS
  clipboard text, not an in-app buffer, so any app reading the same
  marker/schema could interoperate. This file only implements Meridian's
  side of that contract — Polymath would need to speak the same format.
  Clipboard permission failures are caught and surfaced as a toast rather
  than thrown.

Data lives in `Store` under `boardImages` (now with `x`/`y` per image,
otherwise unchanged shape), `boardPan` (pan offset, pushed to Sync with
`skipPush` so continuous panning doesn't spam remote writes), and
`boardBg` (background choice). CSS added/rewritten under
`/* ═══ BOARD — infinite pannable plane ═══ */` in `css/app.css`; Gallery
kept its own untouched `/* ═══ GALLERY ═══ */` block right after it.

---

## ⏳ Queued — not yet started

*(Batch 3 was done out of the suggested order — Stacks and Board, above —
at the person's explicit request, so Calendar and Web below are still
exactly as queued after batch 1.)*

### Calendar — NOT STARTED
**Ask:** Completely re-architected spatial layout. The main calendar grid
is locked dead-center. The left pane handles calendar toggling and `.ics`
file parsing. The right pane is a scratchpad — write a note, grab it, and
physically drag-and-drop it onto a specific day to pin it.

**Notes for implementation:** Current `js/calendar.js` (`Cal` module) is a
single-column month grid with an inline add-event form — no side panes, no
`.ics` import, no drag-and-drop. This is a full re-architecture: a 3-pane
layout (left pane / center grid / right pane), an `.ics` parser (no
existing dependency for this — will need either a small hand-rolled
parser, since `.ics` is a fairly simple line-based format, or a lightweight
CDN library, lazy-loaded the same way the Books importer now is), and real
drag-and-drop from scratchpad notes onto specific day cells, persisted so a
pinned note reappears on that day on reload.

### Web — NOT STARTED
**Ask:** Total overhaul of node structure and interaction. It's now a
strictly defined complete graph: exactly 13 subjects, fully interconnected
by 78 links. Clicking a subject slides in a 1/3-width right-side panel to
enter topics. Clicking a link exposes the cross-pollination: how the two
subjects correlate, prominent shared ideas, and fusion project concepts.

**Notes for implementation:** `13 choose 2 = 78`, so "exactly 13 subjects,
78 links" just means every subject is connected to every other — a
complete graph K₁₃, not a curated subset of links. `data/` currently ships
8 subject files (economics, finance, law, mathematics, physics, business,
politics, computer-science) — **5 more subject data files need to be
authored** to reach 13, following the existing per-file shape (see any
current `data/*.js` for the section/topic schema `SUBJECTS` expects,
consumed via `Atlas.pkey`). Current `js/web.js` already renders nodes/edges
on an SVG canvas with drag/pan/zoom (see README's account of the Module 3
Web rewrite) — clicking a node currently jumps straight to the Atlas. That
needs to change to a slide-in 1/3-width right panel showing that subject's
topics without leaving Web, and edges need click handlers that open a
cross-pollination panel — new content per subject-pair (correlation, shared
ideas, fusion project ideas) which, at 78 pairs, is either hand-authored in
a new data file or generated programmatically from existing subject data
plus a per-pair template; worth a product decision before writing code.

---

## Suggested split for remaining batches

- **Batch 2 (still queued):** Web (data authoring + panel/interaction
  changes) and Calendar (3-pane layout + `.ics` parsing + drag-to-pin) —
  both are self-contained rewrites of one screen's file, no shared risk.

Batch 3 (Stacks + Board, above) is done. Batch 2 remains exactly as
originally suggested — say the word to pick it up next, or to reorder
again.
