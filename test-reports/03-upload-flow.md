# Upload flow A — report

## Verdict: PASS

20/20 steps passed. End-to-end fake upload (FAB → file pick → uploading → meta → save → detail) works exactly as designed.

## What worked

- **FAB discovery**: `button.fab` with `aria-label="upload book"` opens the bottom sheet titled "Add a book".
- **FileStep**: Drop zone with "Drop a PDF here", "Use demo file", and "Cancel" buttons all visible.
- **UploadingStep**: After clicking "Use demo file", the "Uploading to private storage…" indicator appears, and the simulated progress bar advances over ~2 s before auto-advancing to MetaStep.
- **MetaStep pre-fill**: Title input is correctly pre-filled with "Walden" (stripped from `Walden.pdf`). Author input is empty. Six tag pills (Fiction, Philosophy, Essays, Classics, Re-read, Short) render. "Add to library" button is visible.
- **Edit + save**: Replacing the title with "My Test Book" and entering author "Test Author" works. Clicking "Add to library" closes the sheet, fires the toast `"Book added — preparing…"`, and the new tile appears at the top of the grid.
- **Detail navigation**: Clicking the new tile opens the detail screen with "My Test Book" rendered (two occurrences — title + breadcrumb/heading).
- **Extraction-status flip**: After the ~2.4 s timer in `confirmUpload`, the book's `extractionStatus` flips from `processing` → `completed` and `hasOutline` → `true`. The test waits 3 s before clicking, so the detail screen loads the completed state without shimmer.

## What broke or was unexpected

Nothing broke. One minor observation: the `UploadingStep` is very brief (~2 s) — the test had to use a fallback selector (`page.getByText("Walden.pdf")`) in case the "Uploading to private storage…" text is missed, but in practice the primary selector hit every run.

## Network observations

- **Any `/api/*` requests during upload? No.**
- API request list: `[]` (empty).
- Page errors: none. Console errors: none.

This confirms the upload pipeline is entirely client-side mock — `confirmUpload` only mutates local React state, fires the toast, and sets a `setTimeout` to flip extraction status. No fetch/XHR is issued to any `/api/*` endpoint at any point in the flow (FAB click, demo-file pick, uploading simulation, save, or detail open).

## Notes

- Test file: `/Users/carloszamora/Projects/bookshelf/tests/03-upload-flow.mjs`
- Viewport: 1280×900 desktop, single Chromium context.
- Network listener attached via `page.on("request")` before navigation; filtered for URLs containing `/api/`.
- No source files were modified.
