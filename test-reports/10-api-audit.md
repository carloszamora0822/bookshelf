# API / network audit — report

## Headline finding
**The frontend made 0 requests to `/api/*` (and 0 to any backend) across every flow exercised: library load, book detail, reader paging, bookmark, note, settings theme toggle, and page-mode change. The only external network traffic was Google Fonts.**

## Methodology
Single Playwright session (Chromium, 1280x900) loading `http://localhost:5173/` with `page.on("request")` capturing every request fired, including resource type, method, and URL. Each request is tagged with the user action that was in flight when it fired. After the flow, requests are categorised as `static` (script/stylesheet/image/font/media), `document`, `vite-hmr` (Vite dev-server internals), or `candidate` (anything else — i.e. genuine app-driven network traffic).

Script: `/Users/carloszamora/Projects/bookshelf/tests/10-api-audit.mjs`

Totals: 31 requests total, **0 candidate non-static requests**, 0 to `/api/*`, 0 to `/internal/*`, 0 to Supabase.

Note: steps 7–8 (FAB → upload sheet → demo file → Add to library) failed to locate the FAB because Escape from the notes interaction did not return the view to the library (the detail view stayed in focus). This is a UI quirk, not a confound: every other completed step that should have triggered backend traffic in a real app (initial load, detail open, reader open, paging, bookmark, note save, theme change, page-mode change) produced **zero** backend calls. Steps 9-11 (settings) also completed without a single backend request.

## Request inventory (non-static)
| URL | Method | Triggering action | Status |
|-----|--------|-------------------|--------|
| _(none — every recorded request was either a static asset, the initial HTML document, or Vite HMR/dev-server internals)_ | — | — | — |

For reference, the 31 captured requests break down as:
- 1 document (`GET /`)
- ~17 `static` (CSS/JS modules served by Vite from `src/`)
- 6 `vite-hmr` (`@vite/client`, `@react-refresh`, `.vite/deps/*`)
- 7 external Google Fonts (CSS + woff2)

## /api/* requests
**none**

No request URL contained `/api/` or `/internal/` during any of: initial load, opening a book detail, opening the reader, ArrowRight x3, pressing `b` (bookmark), opening notes / typing / blurring, exiting reader, opening settings, toggling theme dark, toggling theme light, switching page mode to vertical.

## Supabase / external calls
**none to Supabase.**

External hosts contacted (all static asset CDNs):
- `fonts.googleapis.com` — 1 CSS request (initial load)
- `fonts.gstatic.com` — 6 woff2 font files (initial load + one during detail navigation as a font variant resolves)

No `*.supabase.co`, no `*.supabase.in`, no other backend host.

## Conclusion
The frontend is **not wired to the backend at all**. The Node API under `api/_lib/routes/` and the Supabase database described in the PRD exist on disk but are completely orphaned from the running app. The library, detail, reader, upload, and settings flows are all driven entirely by:

- In-memory React state in `src/app.jsx`
- Hard-coded mock data in `src/data.jsx`

This empirically confirms the static-code observation: `confirmUpload(draft)` in `src/app.jsx` synthesises a fake book from existing mock content (`pageSrc: "walden"`, `coverKey: "selfreliance"`) and appends it to React state, with no fetch, XHR, WebSocket, or `navigator.sendBeacon` call anywhere in the bundle. `grep -r "fetch\|XMLHttpRequest\|axios\|supabase" src/` returns zero matches.

**What is missing:**
1. A client-side API module (e.g. `src/api.js`) wrapping `fetch("/api/...")` for books, pages, bookmarks, notes, and uploads.
2. Replacement of `useState(books)` seeding from `data.jsx` with a `useEffect` that hydrates from `GET /api/books`.
3. Real upload pipeline: `POST /api/uploads` (or signed-URL flow to Supabase Storage) instead of the simulated 5-tick progress bar in `src/upload.jsx`.
4. Mutations on bookmark / note / settings changes — currently all local-only.
