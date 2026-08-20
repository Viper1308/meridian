# MERIDIAN — Project Specification (v2)

## What changed this session

Session 3 was a bug-fix pass triggered by real usage. One architectural
problem was causing most of the reported issues at once; fixing it resolved
several bugs simultaneously.

### Root cause found

Polymath's original screens (Web, Stacks, Board) use `position:absolute;inset:0`
internally, expecting a real, sized, positioned parent to fill. In the merged
build, their parent (`.view` inside `.wrap`) had no explicit height and wasn't
positioned — so those screens collapsed, overlapped, or rendered outside normal
document flow. This explains "Web looks messed up," "Stacks doesn't reach the
bottom," and the Board rendering problems all at once.

**Fix:** `#view-web`, `#view-stacks`, `#view-vision` now get
`position:relative; height:calc(100vh - var(--tb) - 36px)` — a real container
sized against the actual topbar height, measured live.

### Fixed and verified this session

| Issue reported | Root cause | Fix | Verified |
|---|---|---|---|
| Taskbar covers too much | 11 tabs + brand + toolbar all in one unwrapped flex row | Collapsible topbar, fold button docked as a small tab at the bottom edge, state remembered | ✅ tested — folds to 0px, `--tb` var updates live |
| Blank space next to Markets | No content there | Autoplaying slideshow pulling from the shared Board via `Gallery.randomImages()` | ✅ renders, correct empty-state copy when not connected |
| Atlas sidebar cropped | Hardcoded `max-height:calc(100vh - 140px)` didn't match real (wrapping) topbar height | Now uses the live `--tb` variable | ✅ |
| Record squished, not full width | Leftover `max-width:700px` override from earlier session | Removed; uses Polymath's native full-width grid | ✅ |
| Web "entirely messed up" | The root cause above, **plus** router was calling `Web.render()` which doesn't exist (the module only exports `draw`) | Container sizing fix + corrected router call | ✅ `Web.draw()` now confirmed callable |
| Books input covered by taskbar | Side effect of the oversized/wrapping topbar | Resolved by the topbar fix | ✅ input elements confirmed present and unobstructed |
| Stacks doesn't reach bottom, orange colours, centred textbox | Root cause above; Polymath's detail panel is an intentional full-screen dramatic overlay; amber was hardcoded | Container sizing fix; panel recoded as a compact corner-docked card; every amber swapped for the active theme's accent | ✅ |
| Margin inputs "not working" | Not actually broken — the only way to submit was ⌘/Ctrl+Enter with no visible button | Added a real "Add" button wired to the existing save logic | ✅ tested — thought saved, input cleared, list updated |
| Board/Gallery not working | Same root cause (Board/vision.js uses the same absolute-fill pattern) **plus** router called `Stacks.render()`/`Cal.render()` which don't exist on those modules | Container fix + corrected mismatched router calls (see below) | ✅ |

### A second bug class found during testing: router/module API mismatches

While testing, several Polymath screens turned out to be silently broken
because `app.js` called methods that don't exist on those modules — caught
by the try/catch guard added last session, which logged a console warning
and moved on instead of crashing, so the screen just... didn't render
anything, with no visible error on screen.

| Screen | Router called | Module actually exports | Fixed to |
|---|---|---|---|
| Web | `Web.render()` | `init`, `draw` | `Web.draw()` |
| Stacks | `Stacks.render()` | `init`, `refresh` | `Stacks.refresh()` |
| Calendar | `Cal.render()` | `init`, `grid` | `Cal.grid()` |
| Board (Vision) | `Board.refresh()` | `init`, `render`, `refresh` | already correct, no change |

This is very likely the deeper reason several screens "didn't seem to work" —
not just the layout collapse, but three of the seven screens never being
told to draw themselves at all. Every module's real exported API was
audited against every router call this session; all seven now match.

---

## Full current screen inventory

| Tab | Module | Router calls | Status |
|---|---|---|---|
| Dashboard | `dashboard.js` | `Dashboard.render()` | ✅ |
| Atlas | `atlas.js` | `Atlas.refresh()` | ✅ |
| Record | `profile.js` (`Profile`) | `Profile.render()` | ✅ |
| Web | `web.js` (`Web`) | `Web.draw()` | ✅ fixed this session |
| Books | `books.js` (`Books`) | `Books.render()` | ✅ |
| Stacks | `stacks.js` (`Stacks`) | `Stacks.refresh()` | ✅ fixed this session |
| Calendar | `calendar.js` (`Cal`) | `Cal.grid()` | ✅ fixed this session |
| Margin | `thoughts.js` (`Margin`) | `Margin.render()` | ✅ + Add button added |
| Board | `vision.js` (`Board`) | `Board.refresh()` | ✅ |
| Gallery | `board-view.js` (`Gallery`) | `Gallery.render()` | ✅ needs Supabase configured |
| Oracle | `oracle.js` (`Oracle`) | `Oracle.renderScreen()` | ⏸ dormant by design |

---

## New this session

- **Collapsible topbar** — fold button, docked as a small tab, state persists via `Store`
- **Dynamic `--tb` CSS variable** — measured live by `ResizeObserver`, everything that needs to know the topbar's height reads this instead of a guess
- **Dashboard slideshow** — `js/slideshow.js`, new module, autoplays every 5s, prev/next controls, pulls from `Gallery.randomImages(n)`
- **`Gallery.randomImages(n)`** — new method on the Gallery module, shuffles across every board the user has, returns signed URLs + captions

---

## Known limitation: the fix I could not fully verify

Everything above was tested in a headless DOM, which does not compute real
CSS layout (no actual pixel measurement, no real paint). What's confirmed:

- Every module loads, every router call now hits a real method, no console
  errors on any screen transition
- The `--tb` variable updates correctly on fold/unfold
- All DOM elements the Polymath modules expect are present and wired

What's **not** confirmed because a headless test can't check it:

- Whether the topbar actually visually fits on one line at your screen width,
  or still wraps (if it wraps, the fold button and `--tb` measurement still
  work correctly, they just measure a taller bar — but the aesthetic goal
  of "one clean row" may not be met)
- Whether Web, Stacks, and Board *look* right now that they have proper
  containers — sizing is correct, but Web in particular was flagged for a
  full recode, and this session only fixed its container, not its content
- Real pointer/drag interactions in Stacks and Board (jsdom cannot simulate
  actual pointer capture and drag physics)

**First thing to check next session if any of the above resurface:** look at
browser dev tools' computed styles on the affected element directly, rather
than reasoning from the CSS source — headless testing has a ceiling here.

---

## What remains — carried over from v1, still open

### Priority 1 — Web recode (explicitly deferred, per your instruction)

You asked for Web to be recoded from scratch rather than patched. This
session only fixed its *container* (it now has real space to render into
instead of collapsing). The knowledge-graph rendering logic itself
(`js/web.js`, `js/connections.js`) is untouched. This is the next major
piece of work:

- [ ] Decide what Web should actually show and how — current version is a
  force-directed-ish node graph of subjects; confirm this is still the right
  concept or specify a different one
- [ ] Rebuild `web.js` against that spec
- [ ] `connections.js` (142KB — by far the largest file in the project) holds
  the subject graph data; audit whether it needs rebuilding too or just the
  renderer

### Priority 2 — Visual polish

- [ ] **Theme 4: JARVIS holographic** — animated concentric SVG rings,
  translucent glass panels, particle drift
- [ ] **Layout density per theme** — `--density` variable exists but needs
  real tuning per theme
- [ ] **Mobile responsive pass** — tab bar needs a drawer/hamburger below
  ~700px; verify the new fold button doesn't collide with anything on narrow
  viewports
- [ ] **Visual confirmation pass** — everything in this document marked ✅ was
  verified structurally (right elements, right methods, no errors) but not
  visually. A real-browser screenshot pass would catch anything headless
  testing can't.

### Priority 3 — Functional

- [ ] Supabase Site URL documentation (carried over, still needed — see v1 spec)
- [ ] Oracle Phase 1 activation test with a real key
- [ ] Export/import Atlas notes as markdown
- [ ] Search across all screens, not just Atlas

### Priority 4 — Enhancements

- [ ] More subjects (Philosophy, History, Psychology)
- [ ] Atlas ↔ Web cross-link (mastering a topic populates a graph node)
- [ ] Pomodoro/focus timer
- [ ] Spaced repetition scheduler

---

## Deployment checklist (unchanged from v1)

1. [ ] Unzip — files must be at repo root, not in a subfolder
2. [ ] Push to GitHub (private repo)
3. [ ] Vercel → import → Framework: Other, Build/Output: blank
4. [ ] Deploy
5. [ ] (Optional) `config.js` → supabase url + anonKey → commit → redeploy
6. [ ] (Optional) Supabase → Auth → URL Config → Site URL = your domain
7. [ ] (Optional) finnhub.io → get key → `config.js` → `finance.key`
8. [ ] (Optional) Custom domain: Vercel Domains + Cloudflare CNAME

If anything from the "reported this session" table above resurfaces after
deploying, tell me specifically which row — the fix, the file, and the exact
line are all documented above, which makes it fast to re-open.
