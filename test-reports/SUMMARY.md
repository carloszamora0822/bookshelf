# Bookshelf — End-to-End Test Summary

Ten Playwright agents tested every user route in parallel against the running dev server (http://localhost:5173). Full per-flow reports live alongside this file as `01-…md` through `10-…md`. Test scripts live in `/tests`.

## Headline finding

**The frontend is not wired to the backend at all.**

API audit (`10-api-audit.md`) recorded every network request across the full session: 0 calls to `/api/*`, 0 to `/internal/*`, 0 to Supabase. Every flow — library, detail, reader paging, bookmark, note save, upload, settings — is driven by in-memory React state seeded from `src/data.jsx`. The Node API under `api/_lib/routes/` and the Supabase schema in `supabase/` are orphaned from the running app. `grep -r "fetch\|XMLHttpRequest\|axios\|supabase" src/` → zero hits.

The user's observation is confirmed: when you "upload a PDF" the app inserts a synthetic record with `pageSrc: "walden"` / `coverKey: "selfreliance"`, so the new book's pages render Walden text. There is no real upload, no extraction, no signed URL, no API call.

## Verdict matrix

| # | Flow | Verdict | Checks |
|---|------|---------|--------|
| 1 | Library landing (search, sort, view, tag chips, continue rail) | PASS | 11/11 |
| 2 | Book tile long-press / context menu | PASS | 4/4 |
| 3 | Upload A — file pick → meta → save | PASS | 20/20 |
| 4 | Upload B — tags + cover picker | PASS | 13/13 |
| 5 | Book detail screen | PASS | 11/11 |
| 6 | Reader navigation (keyboard, scrubber, jump, spread) | PASS | 11/11 |
| 7 | Reader bookmarks + notes | **PARTIAL** | 6/12, 2 explicit fails + hang |
| 8 | Reader chrome (theme, brightness, page mode, TOC) | **PARTIAL** | 8/9 |
| 9 | Settings + persistence (localStorage, prefers-color-scheme) | PASS | 11/11 |
| 10 | API / network audit (the meta-test) | — | 0 backend calls |

## Real bugs uncovered

1. **`b` key fails to toggle a bookmark off.** Second press still shows "Bookmark added" toast, state desyncs from aria label. (`07-bookmarks-notes.md`, Step 3)
2. **TOC current chapter is never highlighted.** `OutlineTree` in `src/detail.jsx` takes only `entries`/`onJump` — no `currentPage` prop. Spec calls for highlighting based on current page. (`08-reader-chrome.md`)
3. **Reader chrome auto-hide blocks downstream UI access.** After closing a side sheet, the kebab menu sits off-viewport and only a `data-pagetap` click on the stage brings it back. Real users will see this as "the menu isn't there." (`07`, `08`)
4. **`<button>` inside `<button>` DOM nesting warning.** `TagPill` (`<button>`) renders inside `BookList`'s row `<button>` (`src/library.jsx` ~line 244). React `validateDOMNesting` warning; an accessibility/HTML-validity issue. (`01`, `02`)

## Cosmetic / wired-but-no-op UI

- **More-menu on book detail**: Edit details / Change cover / Manage tags items render but only close the menu — no handlers attached. Only Delete is wired. (`05`)
- **"Upload an image" cover option**: toggles `coverMode` but renders no `<input type="file">`, so there's no way to actually pick an image. (`04`)
- **"Sign out" in Settings**: button has no `onClick`. (`09`)
- **Theme System state edge case**: when first load picks up `prefers-color-scheme: dark` with empty storage, the app writes the resolved string (`"dark"`) instead of `"system"`, so subsequent OS changes don't follow. (`09`)

## What's solid

- Library: search, sort, grid/list toggle, tag chips, continue rail all work cleanly.
- Long-press / right-click menu fires across all six items including a clean delete + toast.
- Upload happy-path UI (FAB → file step → uploading → meta step → save) is fully functional UI-wise — it just never reaches a backend.
- Book detail hero / TOC / Bookmarks / Notes sections render correctly with correct counts; empty states handled for no-outline and no-bookmark books.
- Reader keyboard navigation (← → space), Escape exit, jump-to-page, two-page spread breakpoint at desktop width, scrubber drag — all behave to spec.
- Theme, brightness slider, page-mode toggle all flip state and DOM correctly.
- Settings + localStorage persistence (including across hard reload) is correct; `prefers-color-scheme` initial-load branch works.

## Recommended next steps (in priority order)

1. **Wire the frontend to the backend.** This is the actual blocker for the user's complaint about "fake text from existing books." Build a `src/api.js` (or hooks) that calls `/api/books`, `/api/books/upload-url`, `/api/books/:id/bookmarks`, etc. Replace the `useState(BOOKS)` seed with a real fetch.
2. **Real upload pipeline.** Hook the upload sheet to `POST /api/books/upload-url`, do the direct-to-Supabase PUT, then `POST /api/books` with the file_path; poll/subscribe for extraction completion. Render the book in the library only after the API responds.
3. **Fix the `b`-key toggle.** It's a small handler bug in the reader's keydown logic — likely calls `addBookmark` unconditionally instead of `toggleBookmark`.
4. **Wire `currentPage` through to `OutlineTree`** for TOC active-chapter highlighting.
5. **Wire the more-menu actions on book detail** (Edit details, Change cover, Manage tags) — or remove them until they're real.
6. **Hidden file input for "Upload an image"** cover mode.
7. **Fix `<button>`-in-`<button>` nesting** in `BookList` rows.

---
*Generated by 10 parallel Playwright agents on 2026-05-13. All scripts at `/tests/*.mjs`, full reports at `/test-reports/*.md`.*
