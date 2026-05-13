# Settings + persistence — report

## Verdict: PASS

All 11 checks passed across desktop (1280×900) and mobile (390×844). No console errors or page errors during the run.

## What worked

- **Fresh-storage defaults.** Before the app boots `localStorage["bookshelf:prefs"]` is `null`; immediately after mount the app writes `{"theme":"light","defaultPageMode":"horizontal"}` (matches OS scheme — emulated light at this point).
- **Entry points.** Desktop nav rail (`.rail .rail-item` "Settings") and mobile top-right gear (`[aria-label="settings"]` in `.rail-brand` header) both open the Settings screen.
- **Sections render.** Account, Reading, Library, About all present (note: a Library section also exists in addition to the three the spec listed).
- **Account.** Shows `adanzamora2005@gmail.com` (hard-coded in `settings.jsx`), Display name "—", and a "Sign out" `PrimaryBtn`. Clicking Sign out is a no-op (no `onClick` is wired) — user remains on Settings. Expected per spec.
- **Theme = Dark.** `<html data-theme>` flips to `"dark"` and `localStorage.bookshelf:prefs.theme === "dark"`.
- **Theme = Light.** Both update to `"light"`.
- **Theme = System.** localStorage records the literal string `"system"`; with `page.emulateMedia({ colorScheme: "dark" })` + reload, `data-theme` resolves to `"dark"`; flipping emulation to `light` + reload resolves to `"light"`. Resolution logic in `app.jsx` lines 29-35 works correctly.
- **Default page mode = vertical.** Clicking "Scroll" persists `defaultPageMode: "vertical"`.
- **Round-trip via state.** Navigated Settings → Library → opened a book → back to Settings; both segmented controls retain their selections (`Dark` + `Scroll` still active).
- **Hard reload.** After `page.reload()`, localStorage values survive and the active segmented buttons reflect them.
- **Fresh incognito + prefers-color-scheme: dark.** New browser context with `colorScheme: "dark"` and empty storage → on first load `data-theme="dark"` AND the app immediately writes `{"theme":"dark", ...}` (literal, not `"system"`) — this is the `matchMedia` branch in the initializer.

## What broke or was unexpected

- Nothing broke. One small spec deviation worth noting: when the user has never set a preference and the OS prefers dark, the app stores the resolved string `"dark"` rather than `"system"`. Re-reading later will still show dark, but the user never explicitly chose System, so subsequent OS changes won't follow. Not a bug per se — just behavior to be aware of.
- "Sign out" button is purely cosmetic (no handler attached). Expected, but it would normally at least toast.

## Notes

- Script: `/Users/carloszamora/Projects/bookshelf/tests/09-settings-persistence.mjs`
- Settings markup lives at `/Users/carloszamora/Projects/bookshelf/src/settings.jsx`; persistence effect at `src/app.jsx` lines 28-35.
- Section labels in DOM are rendered uppercase via CSS (`text-transform`) but the source strings are mixed-case; the test matches case-insensitively.
- No source files modified. Dev server not touched.
