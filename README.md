# MERIDIAN — Module 2 of 3

Adds Record, Books, Calendar, and Margin — written fresh against Module 1's
shell and conventions, not ported from any earlier codebase.

## What's live now

- **Dashboard, Atlas** — unchanged from Module 1
- **Record** — editable profile card (name, role, location, bio) plus a live
  "in numbers" panel pulled from your actual Atlas progress
- **Books** — a reading shelf: title, author, status, filterable. No external
  API calls (no cover-fetching) — kept dependency-free on purpose
- **Calendar** — month view, click a day to add or remove events
- **Margin** — thoughts and quotes, with a visible Add button this time
  (the old version only accepted ⌘/Ctrl+Enter with nothing to click, which
  is why it read as broken)

## What's still a placeholder

Web, Stacks, Board, Gallery, Oracle — module 3.

## Scope note on Calendar

The original spec described month/week/day views. This ships month view
only. Events are already keyed by plain ISO date strings, so week/day views
can be added later reading the same data — but three thin, undertested view
modes seemed like a worse use of the remaining budget than one solid one.

## Tested

Same method as Module 1: real script-tag loading, a full click-through of
every new screen, actual data written and read back from storage, zero
uncaught errors. Full transcript available on request.

## Deploy

Same as before — unzip, root of repo, GitHub, Vercel (Framework: Other,
Build/Output: blank). Still no environment variables needed.

## Next

Module 3: Web (recoded from scratch), Stacks, Board/Gallery, Supabase sync,
the login gate, the finance widget, the slideshow.
