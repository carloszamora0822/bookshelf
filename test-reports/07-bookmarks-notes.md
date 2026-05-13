# Bookmarks + notes — report

## Verdict: PARTIAL

## What worked
- Step 1: Library -> Walden -> "Start from beginning" -> reader opens at page 1/287.
- Step 2: Pressing `b` adds a bookmark; toast reads "Bookmark added" and the icon flips to `aria-label="remove bookmark"`.
- Step 4: Jump-to-page sheet navigates to page 84, where the seed bookmark icon is already filled.
- Step 5: Bookmarks side panel lists the seed pages exactly `[84, 142, 270]`.
- Step 6: Clicking the page-270 row in the bookmarks panel jumps the reader to 270 (pill = "270 / 287").
- Step 7: Deleting a bookmark from the panel drops the row count from 3 to 2.

## What broke or was unexpected
- Step 3 FAIL — pressing `b` a second time did not toggle the bookmark off. Toast was still "Bookmark added" (expected "Bookmark removed"), though the `add bookmark`/`remove bookmark` aria swap was inconsistent (script reported `unfilled=true`, suggesting state vs. toast desync). Likely the second `b` keystroke either did not reach the reader handler or the toggle path emits the wrong toast / re-adds rather than removes.
- Step 8 FAIL — after Step 7 closed the bookmarks sheet, the reader menu button `[aria-label="reader menu"]` was reported by Playwright as "element is outside of the viewport" through 60+ retries (30s timeout). The top reader chrome appears to have auto-hidden and the `page.mouse.move(640, 50)` nudge no longer revealed it after the prior sheet interaction. The notes sheet on p.270 was never opened.
- Steps 9, 10, 11, 12, 12b — never executed meaningfully. Step 9 was reached but its `textarea` waitFor timed out at 3s (no notes sheet open) and the parent timeout killed the process at 90s before later steps could run. Steps 10, 11, and 12/12b produced no output. The final "Design intent: notes save on blur" annotation also did not print.

## Notes
- The script was killed by the 90s wall-clock timeout (`EXIT=137`), so its `--- SUMMARY ---` JSON block and the final design-intent record were never emitted.
- The hang was on Step 8's `[aria-label="reader menu"]` click — reader chrome was off-screen / auto-hidden. Future runs may need to force chrome visibility (e.g., move mouse, press a key, or click the stage) before clicking menu items.
- Confirmed bugs to surface to devs: (a) `b`-key toggle on an already-bookmarked page does not remove (Step 3); (b) reader chrome visibility after sheet close is flaky enough to block downstream automation (Step 8).
