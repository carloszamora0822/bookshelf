# Book detail — report

## Verdict: PASS

11/11 checks passed against the running dev server at http://localhost:5173 (viewport 1280x900). No page or console errors emitted.

## What worked

- **Navigation into detail.** Clicking the Walden tile in `.book-grid` brings up `.detail-hero` with the title "Walden".
- **Hero contents.** Cover renders an SVG inside `.detail-hero .cover`, title is "Walden", `.detail-byline` reads `by Henry David Thoreau`, and the `.detail-tag-row` contains pills for Essays, Philosophy, and Classics.
- **Three primary actions.** `.detail-actions` exposes "Continue · p.142" (matches seed `lastOpenedPage=142`), "From beginning", and a kebab button via `[aria-label="more"]` in the top bar.
- **TOC section (Walden, hasOutline=true).** Open by default. Count badge shows **14** entries (matches `outlineCount` which recurses through children — 11 roots + 3 children). All four spot-check titles present (Economy, Reading, Solitude, Visitors). Hierarchy works: "On building a house" renders with class `outline-entry depth-1` (indented under Economy).
- **Bookmarks section.** Count badge 3, three `.bookmark-row`s, page tags exactly `84`, `142`, `270`.
- **Notes section.** Count badge 3, three `.note-row`s.
- **TOC -> reader.** Clicking the "Solitude" outline entry opens `.reader`; bottom-bar `.page-pill` reads `127 / 287`.
- **Bookmark -> reader.** Clicking the page-84 bookmark row opens reader at `84 / 287`.
- **Note -> reader.** Clicking the first note row (page 84) opens reader at `84 / 287`.
- **Self-Reliance (hasOutline=false).** No `.section-pane` containing "Table of"; the dashed empty-state block with "This PDF has no embedded outline." is shown instead.
- **Art of War (no bookmarks/notes).** Bookmarks count `0` with "No bookmarks yet." empty micro-text; Notes count `0` with "No notes yet." empty micro-text.
- **More menu.** Kebab in the detail top bar opens a Menu with four items: **Edit details**, **Change cover**, **Manage tags**, **Delete book** (last is marked danger).

## What broke or was unexpected

- Nothing functional broke. One initial test failure was tooling-only: my first selector matched the outline button text as `^Solitude$`, but the button content is "Solitude" + page-number "127" so an exact-match regex on the whole button didn't fit. Fixed by filtering with `has: .title { hasText: /^Solitude$/ }`. Not an app defect.

## Notes

- TOC count badge counts **all** entries including nested children (14, not 11). The task said ">=11" so this still passes, just noting the semantic.
- The detail top bar shows only a back button on the left and the kebab on the right — there is no third action there; the three primary actions live inside the hero's `.detail-actions`.
- Menu items in the more-menu are static (no-op apart from Delete) — Edit details / Change cover / Manage tags all just close the menu in the current source. Delete book wires to `app.deleteBook`. Worth flagging if those are meant to be functional.
- Detail "back" works via a `<button>` labeled "Library" (no `aria-label`), reader "back" via `[aria-label="back to library"]`. Used those for navigation in the test.

Script: `/Users/carloszamora/Projects/bookshelf/tests/05-book-detail.mjs`
