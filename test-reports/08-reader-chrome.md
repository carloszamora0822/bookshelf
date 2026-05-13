# Reader chrome controls — report

## Verdict: PARTIAL

8/9 checks passed. The current-chapter highlighting in the TOC is the only failure
and appears to be a genuine missing-feature, not a test artifact.

## What worked

- Walden opens from "Start from beginning" via the long-press (right-click) menu and lands in the reader.
- `<html data-theme>` is set to `"light"` on entry. Tapping the theme menu item in the kebab menu flips
  `data-theme` between `"light"` and `"dark"` cleanly; menu label updates ("Dark theme" ↔ "Light theme").
- Brightness sheet opens from the menu. Setting the range slider to 40 yields a brightness overlay
  inside `.reader-stage` with `background: rgba(0, 0, 0, 0.4)` (transparent before). Confirmed via
  inline style on the last child of `.reader-stage`.
- Page mode toggle flips between horizontal (overflow:hidden grab-cursor wrap, "swipe" label) and
  vertical (overflow:auto column-flex scroller, "scroll" label) with the DOM and label both updating.
- TOC sheet shows all 14 expected Walden entries — including top-level "Economy",
  "Where I Lived, and What I Lived For", "Reading", and 3 indented depth-1 nested children
  (`.outline-entry.depth-1`).
- Jump-to-page (127) actually moves to page 127 (page-pill reads "127 / 287").
- Tapping "Reading" in the TOC navigates to page 95 (page-pill reads "95 / 287").
- For Self-Reliance (`hasOutline=false`) the "Table of contents" menu item renders with hint "none"
  and clicking it does NOT open the TOC sheet — clean empty-state handling.

## What broke or was unexpected

- **Current chapter is NOT highlighted in the TOC.** After jumping to page 127, the "Solitude" entry
  (which begins at page 127 per the seed data) has the same styling as every other entry: no
  `is-active` / `is-current` class, no `aria-current`, transparent background
  (`rgba(0,0,0,0)`), regular `font-weight: 400`, default ink color. Confirmed by inspecting the
  computed styles of the matching `.outline-entry`. The `OutlineTree` component in
  `src/detail.jsx` (also used by the reader) takes only `entries` and `onJump` — there is no
  `currentPage`/`activeEntry` prop wired through, so highlighting cannot work in either the detail
  view or the reader's TOC sheet. This is a real product gap relative to spec.
- The reader's theme toggle is binary (light ↔ dark) — there is no system / 3-state cycling from
  the kebab menu. The 3-way segmented control (System / Light / Dark) lives inside the Brightness
  sheet's `BrightnessControl`, not in the kebab itself.

## Notes

- Auto-hide chrome (5s) interfered with clicks; helper `revealChrome` clicks the page surface
  (via `data-pagetap`) and retries until `.reader-chrome-top.reader-chrome-hidden` is gone before
  opening the menu.
- React-controlled `<input type="range">` ignored direct `el.value =` assignments — used
  `HTMLInputElement.prototype value` native setter + `input` event to drive the brightness slider.
- No console / page errors thrown throughout the run.
