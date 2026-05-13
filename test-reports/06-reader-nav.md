# Reader navigation — report

## Verdict: PASS

11 / 11 checks passed at 1280x900 desktop viewport. No console or page errors captured during the run.

## What worked

- **Entry flow**: Library → Walden tile → detail screen → "From beginning" button opened the reader at page 1. Indicator rendered `1 / 287`.
- **Keyboard navigation**: ArrowRight took page 1 → 2; Space took 2 → 3; ArrowLeft twice returned 3 → 1. All transitions reflected in `.page-pill` text within ~350ms.
- **Chrome auto-hide toggle**: Clicking the `.reader-stage` center toggled the `reader-chrome-hidden` class on `.reader-chrome-top` (visible → hidden → visible across two taps). Initial state was visible.
- **Jump-to-page**: Opening the kebab (`aria-label="reader menu"`) revealed the menu including "Jump to page…". The bottom sheet appeared with an `input[inputmode="numeric"]`; filling "50" + Enter landed on page 50.
- **Escape exits reader**: After Escape, `.reader` disappeared and the detail screen (`.detail-actions` visible) was shown — `goBack` returns to the previous route as expected.
- **Resume position via setResume**: Reopening Walden detail showed the primary CTA as `Continue · p.50` (in-memory state updated, overriding the initial mock `lastOpenedPage: 142`). Clicking it re-entered the reader at page 50.
- **Two-page spread breakpoint**: At 1280×900, each page wrapper inside `.reader-stage` contained 2 `.reader-page-card` elements (spread). At 700×900 each wrapper contained only 1 (single page). The threshold is `desktop && box.w > 980`, confirmed by DOM inspection.
- **Scrubber click**: Clicking the `.scrubber` at 25% across jumped page from 50 to 72, exactly matching the expected `round(0.25 * 287) = 72`.

## What broke or was unexpected

Nothing broke. Everything matched the spec.

## Notes

- Reader DOM hooks used: `.reader`, `.reader-stage`, `.reader-chrome-top`, `.reader-chrome-hidden` (toggle class), `.page-pill` (indicator text "N / total"), `.scrubber`, `.reader-page-card`, `[aria-label="reader menu"]`, `input[inputmode="numeric"]` for jump.
- The reader's auto-hide timer (5s) did not interfere — chrome state on entry was visible. The tap-toggle test asserts symmetric toggling rather than a specific final state.
- Spread detection used per-wrapper card count (counting `.reader-page-card` under each `translateX` container) instead of class names, since the layout uses inline styles for the spread.
- Test script: `/Users/carloszamora/Projects/bookshelf/tests/06-reader-nav.mjs`.
