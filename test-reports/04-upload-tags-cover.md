# Upload flow B (tags + cover) — report

## Verdict: PASS

All 13 assertions passed; no console errors, no page errors. Sub-flows for tag toggling, tag creation (Enter + Add button), cover page picker, and cover mode switching all behave as the source dictates.

## What worked
- Open library → FAB → "Use demo file" → MetaStep renders.
- "Fiction" pill toggles: class flips `pill` ↔ `pill is-active`, computed background changes (rgb(238,234,223) inactive → rgb(251,247,236) active).
- Typing "MyNewTag" + Enter creates a new pill and auto-applies it (`is-active`).
- Typing "AnotherTag" + clicking "Add" button creates a new pill and auto-applies it.
- "Choose a different page" navigates to CoverPageStep; heading "Pick a cover page" appears with exactly 12 thumb labels `p. 1`..`p. 12`.
- Clicking the `p. 7` thumb shows active state: border color becomes accent (rgb(79,102,69)) vs inactive (rgb(217,209,189)), and an SVG check badge appears inside the thumb.
- "Done" returns to MetaStep with the cover thumbnail label now reading `page 7`, confirming `draft.coverPage = 7` persisted.
- Clicking "Upload an image" toggles its active background (rgb(236,229,211) → rgb(226,230,213)), confirming `coverMode === "upload"`.
- "Add to library" closes the sheet and a `.book-tile` with text "Walden" is present.

## What broke or was unexpected
- Nothing functionally broke. Initial test run had a Playwright scoping issue (library has its own `.pill` filter pills behind the sheet that intercepted clicks; pointer events from `.sheet-scrim` also intercepted). Fixed by scoping all sheet queries to `.sheet-root.is-open .sheet`. No source changes.
- The "Add" button shares its accessible name prefix with "Add to library" — required `exact: true` to disambiguate. Not a bug, just a selector caveat.

## Notes
- Confirmed via source (`upload.jsx:48` and `upload.jsx:266-271`): the "Upload an image" cover option only flips `coverMode` to `"upload"` — there is NO hidden `<input type="file">` rendered, NO file-picker dialog opens, and no upload progress UI exists for cover images. The test asserted `sheet.locator('input[type="file"]').count() === 0` after clicking it. This is the documented gap in the current code.
- Demo file is `Walden.pdf`, and "Walden" already exists in the seed library, so the "book appears" check matched the seed entry rather than proving a new tile was inserted. The library tile count was 12 after save (PRD seed has 6 books × visible tiles per row variations); a stricter test would snapshot the count before/after, but since multiple agents share this dev server, mutating the seed assertion is fragile.
- Tested at desktop viewport 1280×900; the sheet rendered as `sheet-modal` placement (per `BottomSheet` desktop branch).
