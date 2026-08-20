# MERIDIAN — Module 1 of 3

A complete rewrite from scratch, not a patch on the old code. This module is
Dashboard and Atlas, fully working, zero dependencies, zero external
services. Every other tab is a labelled placeholder rather than a
half-working screen — no more silent failures.

## Why a rewrite

The previous version merged two separate codebases (Polymath + Meridian)
whose modules disagreed with each other about method names — the router
called `Web.render()` on a module that only exported `draw()`, and three
other screens had the same class of bug. Layered fixes across sessions kept
finding new instances of the same problem. Starting clean removes the
mismatch entirely: this module has one codebase, one set of conventions, and
every screen was tested end-to-end before being called done.

## What's live

- **Dashboard** — KPI cards, mastery trend chart, subject donut, bar charts,
  activity feed, search. All numbers are real, computed from your own data.
- **Atlas** — all 8 subjects, 885 topics, your own notes with autosave,
  mastery tracking, search, subject switching.
- **Theme toggle** — cycle through Meridian / Academy / Command from the
  toolbar button. (Per your instruction: no picker card on the dashboard —
  toolbar only.)
- **Collapsible top bar** — fold button docked at the bottom edge.
- **Backup / restore** — download everything as JSON, restore it later.

## What's a placeholder

Record, Web, Books, Stacks, Calendar, Margin, Board, Gallery, Oracle. Click
any of these tabs and you'll see exactly what's coming and in which module —
never a blank or broken screen.

## Deploy this now

It's a complete, working site on its own. Same process as before:

1. Unzip — `index.html` must sit at the repo root
2. Push to GitHub, import into Vercel (Framework: Other, Build/Output: blank)
3. Deploy

No environment variables needed for this module. No Supabase, no API keys.

## Testing note

This was tested with `runScripts:'dangerously'` in a headless DOM loading
the actual files exactly as a browser would (not by concatenating scripts
and eval-ing them together, which is how earlier sessions tested and how
the API-mismatch bugs slipped through). Every tab was clicked, every stub
confirmed to render instead of silently failing, mastery marking was
confirmed to persist and update the dashboard, and zero uncaught errors were
recorded across the full pass.

What I still can't confirm from here: real visual layout on your actual
screen size, and real pointer/drag interaction (irrelevant to this module —
nothing here uses drag).

## Next

Reply and I'll build Module 2 — Record, Books, Calendar, Margin, written
fresh against this same shell.
