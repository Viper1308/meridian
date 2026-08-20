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

## ⏳ Queued — not yet started

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

### Stacks — NOT STARTED
**Ask:** The spatial "floor" is back. Graphically, it resembles a messy
room where major tasks are literal stacks of books you can drag around.
The individual books represent subtasks. Mark a subtask complete, and that
specific book physically vanishes from the pile.

**Notes for implementation:** This explicitly reverses the Module 3
simplification — the README documents that the free-form spatial floor was
deliberately removed for fragility reasons ("the most fragile screen in
the old app"). Bringing it back means: draggable stack positions (x/y
persisted per stack, likely via pointer events, not native HTML5 drag-and-
drop given the earlier fragility note), a "messy room" visual treatment for
each stack (a pile of book-shaped subtask blocks, offset/rotated per
subtask to read as a physical stack rather than a list), and removing a
subtask's book from the pile (not just marking it done in a list) when
completed. Should be built carefully with simple, well-tested pointer-event
math given the prior fragility history on this exact feature.

### Board — NOT STARTED
**Ask:** The clunky toolbar is dead, replaced by a single, clean "add
picture" button on the periphery. The canvas is now an infinitely loading
plane you can pan endlessly in any direction. Backgrounds are fully
mutable (grid, lines, blank, specific colors, or custom image uploads).
Pictures can be arranged spatially with zero grid snapping. Added complex
clipboard support: box-select an arrangement of images, copy, and paste
the exact spatial configuration seamlessly, which persists even across
Polymath and Meridian.

**Notes for implementation:** Current `js/board.js` stores/renders pinned
images with captions (see README's account: compressed base64 in the same
`kv`/Store path as everything else). This ask replaces that with a true
infinite pannable canvas (no fixed bounds — needs a viewport-transform
approach, e.g. a translated/scaled inner layer, not a fixed-size scrollable
div), free-form absolute positioning per image (x/y, no grid snap),
selectable/mutable backgrounds (grid, lines, blank, solid color, or a
custom uploaded image), and box-select + copy/paste of a spatial
arrangement of images. The "persists even across Polymath and Meridian"
clause implies a shared clipboard mechanism outside this app's own
`Store` (Polymath is a separate app) — likely the OS clipboard via the
Clipboard API with a custom MIME type or JSON-in-text payload, which needs
confirming/scoping before implementation, since cross-app clipboard
behavior is the riskiest unknown in this whole spec.

---

## Suggested split for remaining batches

- **Batch 2:** Web (data authoring + panel/interaction changes) and
  Calendar (3-pane layout + `.ics` parsing + drag-to-pin) — both are
  self-contained rewrites of one screen's file, no shared risk.
- **Batch 3:** Stacks (spatial floor) and Board (infinite canvas +
  clipboard) — grouped together because both are pointer-driven,
  free-form-spatial rebuilds and benefit from being tested against each
  other's interaction patterns in the same pass.

This is a suggestion, not a constraint — say the word if a different split
or priority order is preferred.
