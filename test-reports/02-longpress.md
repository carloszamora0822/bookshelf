# Long-press / context menu — report

## Verdict: PASS

All four sub-flows passed end-to-end against the running dev server at http://localhost:5173 (desktop viewport 1280x900, Chromium).

## What worked

- **Step 1 — Right-click opens BottomSheet menu.** Right-clicking the first tile in the "All books" grid opens a `.sheet-root.is-open .sheet` dialog. All six expected menu items were detected via text match: "Continue from page N" / "Start reading", "Start from beginning", "Edit details", "Manage tags", "Change cover", "Delete book". (Tile used had `lastOpenedPage`, so the "Continue from page N" variant appeared.)
- **Step 2 — "Start from beginning" → reader.** Clicking the item closed the sheet and rendered the reader. `.reader`, `.reader-chrome-top`, and a `[aria-label="back to library"]` BACK icon button were all present. Clicking BACK returned to the library (`.book-tile` re-appeared).
- **Step 3 — List view delete.** After reload, switching to list view via the Segmented "List" button rendered `.book-list .book-row` (6 rows). Clicking the row's `[aria-label="more"]` icon opened the same BottomSheet. Clicking "Delete book" removed the row (6 → 5) and the toast "Book removed" appeared (`.toast.is-open` with matching text). The book deleted was "Meditations" (top of list under default "Recently opened" sort).
- **Step 4 — "Edit details" → BookDetail.** After reload, right-click → "Edit details" navigated to the detail screen. `.detail-hero` was rendered and `.detail-title` matched the originating tile's title exactly ("Meditations").

## What broke or was unexpected

- Nothing blocking. One non-fatal React dev warning was logged by the existing app code (not introduced by tests): `validateDOMNesting(...): <button> cannot appear as a descendant of <button>` — `TagPill` (a `<button>`) renders inside the `BookList` row `<button>` (`src/library.jsx` `BookList`, `src/components.jsx` `TagPill`). Pre-existing markup issue, does not affect this flow.

## Notes

- Sort defaults to "Recently opened", so the first tile/row is "Meditations" (has `lastOpenedPage`). The "Continue from page N" variant of the first menu item is therefore the one exercised in Step 1.
- The menu sheet does not auto-close on "Delete book" via an explicit `onClose` in `LongPressMenu`, but the `deleteBook` action in `app.jsx` clears `longPressBookId`, which closes it. Toast auto-dismisses after ~1800 ms; the test reads it within that window.
- React state is in-memory, so each `page.goto` reload restores the full 6-book seed — verified in Steps 3 and 4.
- Script: `/Users/carloszamora/Projects/bookshelf/tests/02-longpress.mjs`. No source files modified; dev server untouched.
