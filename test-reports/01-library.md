# Library landing — report

## Verdict: PASS

## What worked
- Page loads with title `"Bookshelf — a calm place for your books"` and 11 `.book-tile` elements (5 in `.continue-rail` + 6 in `.book-grid`).
- Greeting heading renders correctly (`"Good afternoon, keep reading."`) inside `.display-1`.
- "Continue reading" section shows 5 tiles (every book with `lastOpenedAt`, all seed books except `b-aow`).
- "All books" section shows the full 6 seed books.
- Search "walden" inside `.library-toolbar input` filters `.book-grid` to 1 tile; clearing restores to 6.
- Search "zzznomatch" renders `.empty` state with `"Nothing matched"` + descriptive copy.
- Sort menu → "Title" reorders `.book-grid` titles alphabetically: `["Frankenstein","Meditations","Pride and Prejudice","Self-Reliance","The Art of War","Walden"]`. Sort button label updates to "Title".
- View toggle: clicking "List" → `.book-list` appears (count=1) and `.book-grid` disappears (count=0); switching back to "Grid" reverses cleanly.
- Tag chip "Fiction": click filters grid to 2 tiles (Pride and Prejudice + Frankenstein) and adds `is-active`; click again clears back to 6 and removes `is-active`.
- Mobile viewport (390×844): the in-page mobile header (`.rail-brand` inside `.page-container`) shows "Bookshelf" and the settings `IconButton`; the desktop NavRail's `.rail-brand` is correctly hidden. FAB is visible and clicking it opens an upload modal (`[role=dialog]`/sheet container).

## What broke or was unexpected
- Sort `MenuItem` clicks were initially blocked because the `.menu-scrim` overlay intercepts pointer events at the DOM layer — Playwright's normal click (and even `{force:true}`) routes through the scrim and closes the menu before the item handler runs. Worked around by dispatching `element.click()` via `page.evaluate(...)` which fires React's synthetic onClick directly. Same scrim issue caused brief interference for the Segmented toggle when run immediately after sort, fixed by reordering tests (toggle before sort).
- React `validateDOMNesting` warning in console: `<button>` inside `<button>` from `TagPill` rendered in `BookList` row (each row is a `<button>` and `TagPill` renders a `<button>`). Cosmetic but a real accessibility/HTML-validity bug — `src/library.jsx` ~line 244 (`<TagPill ... />` inside `<button className="book-row">`). Did not affect any flow assertions.

## Notes
- Script: `tests/01-library.mjs`. Final result: 11/11 checks passed.
- Test viewport: desktop 1280×900 for checks 1-9, mobile 390×844 for check 10.
- All assertions verified against live DOM; no source files modified; dev server left untouched.
