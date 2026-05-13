// Test the reader bookmarks + notes flow against the running dev server.
// Target book: Walden (b-walden). Seed bookmarks at pages 84, 142, 270.

import { chromium } from "playwright";

const URL = "http://localhost:5173/";
const results = { steps: [], errors: [], consoleErrors: [] };

function record(name, ok, info = "") {
  results.steps.push({ name, ok, info });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

page.on("pageerror", (e) => results.errors.push("pageerror: " + String(e)));
page.on("console", (m) => {
  if (m.type() === "error") results.consoleErrors.push(m.text());
});

async function gotoLibrary() {
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".book-tile", { timeout: 5000 });
}

// The reader chrome auto-hides after 5s. Tap on the page (data-pagetap="1") to
// re-show it via the reader-stage onClick toggle.
async function ensureChromeVisible() {
  const hiddenTop = await page.locator(".reader-chrome-top.reader-chrome-hidden").count();
  const hiddenBot = await page.locator(".reader-chrome-bot.reader-chrome-hidden").count();
  if (!hiddenTop && !hiddenBot) return;
  await page.locator(".reader-stage").first().click({ position: { x: 640, y: 450 } });
  await page.waitForSelector(".reader-chrome-top:not(.reader-chrome-hidden)", { timeout: 2000 }).catch(() => {});
}

// Wait for `.toast.is-open` whose text matches the regex.
async function waitForToast(matchRegex, timeout = 2500) {
  try {
    await page.waitForFunction(
      (pattern) => {
        const el = document.querySelector(".toast");
        if (!el) return false;
        const open = el.classList.contains("is-open");
        const text = (el.textContent || "").trim();
        return open && new RegExp(pattern, "i").test(text);
      },
      matchRegex.source,
      { timeout }
    );
    return ((await page.locator(".toast").textContent()) || "").trim();
  } catch {
    return ((await page.locator(".toast").textContent().catch(() => "")) || "").trim();
  }
}

async function jumpToPage(n) {
  await ensureChromeVisible();
  await page.locator('[aria-label="reader menu"]').first().click();
  await page.getByText("Jump to page", { exact: false }).first().click();
  const jumpSheet = page.locator(".sheet-root.is-open .sheet");
  await jumpSheet.waitFor({ timeout: 3000 });
  const inp = jumpSheet.locator('input[inputmode="numeric"]').first();
  await inp.fill(String(n));
  await jumpSheet.getByText("Go to page", { exact: false }).first().click();
  await page.waitForFunction(
    (target) => {
      const el = document.querySelector(".page-pill");
      return el && new RegExp("^\\s*" + target + "\\s*\\/").test(el.textContent || "");
    },
    n,
    { timeout: 4000 }
  );
}

async function openBookmarksSheet() {
  await ensureChromeVisible();
  await page.locator('[aria-label="reader menu"]').first().click();
  await page.locator(".menu .menu-item", { hasText: /^\s*Bookmarks/ }).first().click();
  const sheet = page.locator(".sheet-root.is-open .sheet");
  await sheet.waitFor({ timeout: 3000 });
  return sheet;
}

async function openNotesSheet() {
  await ensureChromeVisible();
  await page.locator('[aria-label="notes for this page"]').first().click();
  const sheet = page.locator(".sheet-root.is-open .sheet");
  await sheet.waitFor({ timeout: 3000 });
  return sheet;
}

async function closeSheet() {
  const scrim = page.locator(".sheet-scrim");
  if (await scrim.count()) {
    // Click each scrim that's part of an open sheet root
    await page.evaluate(() => {
      document.querySelectorAll(".sheet-root.is-open .sheet-scrim").forEach((s) => s.click());
    });
    await page.waitForTimeout(250);
  }
}

// ───────── Step 1: navigate Library → Walden → "Start from beginning" → reader page 1
try {
  await gotoLibrary();

  const waldenTile = page.locator(".book-grid .book-tile", { hasText: "Walden" }).first();
  await waldenTile.waitFor({ timeout: 4000 });

  await waldenTile.click({ button: "right" });
  const sheet = page.locator(".sheet-root.is-open .sheet");
  await sheet.waitFor({ timeout: 3000 });
  await sheet.getByText("Start from beginning", { exact: false }).first().click();

  await page.waitForSelector(".reader", { timeout: 4000 });

  const pill = (await page.locator(".page-pill").first().textContent().catch(() => "")) || "";
  const ok = /^\s*1\s*\/\s*287/.test(pill.replace(/\s+/g, " "));
  record(
    "Step 1: Library → Walden → Start from beginning → reader page 1",
    ok,
    `pill="${pill.trim()}"`
  );
} catch (e) {
  record("Step 1: open reader at page 1", false, String(e.message || e));
}

// ───────── Step 2: Press "b" → toast "Bookmark added" + icon fills
try {
  await page.keyboard.press("b");
  const toast1 = await waitForToast(/Bookmark added/i, 2000);
  const ok1 = /Bookmark added/i.test(toast1);
  const isFilled = (await page.locator('[aria-label="remove bookmark"]').count()) > 0;
  record(
    "Step 2: press b → 'Bookmark added' + icon filled",
    ok1 && isFilled,
    `toast="${toast1}" filled=${isFilled}`
  );
} catch (e) {
  record("Step 2: press b → bookmark added", false, String(e.message || e));
}

await page.waitForTimeout(2000);

// ───────── Step 3: Press "b" again → toast "Bookmark removed" + icon unfills
try {
  await page.keyboard.press("b");
  const toast2 = await waitForToast(/Bookmark removed/i, 2500);
  const ok2 = /Bookmark removed/i.test(toast2);
  const isUnfilled = (await page.locator('[aria-label="add bookmark"]').count()) > 0;
  record(
    "Step 3: press b again → 'Bookmark removed' + icon unfilled",
    ok2 && isUnfilled,
    `toast="${toast2}" unfilled=${isUnfilled}`
  );
} catch (e) {
  record("Step 3: press b → bookmark removed", false, String(e.message || e));
}

await page.waitForTimeout(1500);

// ───────── Step 4: Jump to page 84 → bookmark icon already filled
try {
  await jumpToPage(84);
  const pill84 = (await page.locator(".page-pill").first().textContent().catch(() => "")) || "";
  const onPage84 = /^\s*84\s*\//.test(pill84.replace(/\s+/g, " "));
  await ensureChromeVisible();
  const filledOn84 = (await page.locator('[aria-label="remove bookmark"]').count()) > 0;
  record(
    "Step 4: jump to page 84 → bookmark icon already FILLED (seed)",
    onPage84 && filledOn84,
    `pill="${pill84.trim()}" filled=${filledOn84}`
  );
} catch (e) {
  record("Step 4: jump to page 84 + bookmark filled", false, String(e.message || e));
}

// ───────── Step 5: Open bookmarks side panel → list contains 84, 142, 270
let bookmarkSheetOk = false;
try {
  const bSheet = await openBookmarksSheet();
  const tagTexts = await bSheet.locator(".page-tag").allTextContents();
  const pages = tagTexts.map((t) => Number((t || "").trim())).filter((n) => !Number.isNaN(n));
  const has84 = pages.includes(84);
  const has142 = pages.includes(142);
  const has270 = pages.includes(270);
  bookmarkSheetOk = has84 && has142 && has270;
  record(
    "Step 5: bookmarks panel lists seed pages 84/142/270",
    bookmarkSheetOk,
    `pages=[${pages.join(",")}]`
  );
} catch (e) {
  record("Step 5: bookmarks panel content", false, String(e.message || e));
}

// ───────── Step 6: Click "page 270" row → reader jumps to page 270
try {
  const bSheet = page.locator(".sheet-root.is-open .sheet");
  const row270 = bSheet
    .locator("button", { has: page.locator(".page-tag", { hasText: /^\s*270\s*$/ }) })
    .first();
  await row270.click();

  await page.waitForFunction(
    () => {
      const el = document.querySelector(".page-pill");
      return el && /^\s*270\s*\//.test(el.textContent || "");
    },
    null,
    { timeout: 4000 }
  );

  const pill270 = (await page.locator(".page-pill").first().textContent().catch(() => "")) || "";
  const onPage270 = /^\s*270\s*\//.test(pill270.replace(/\s+/g, " "));
  record(
    "Step 6: click page-270 bookmark row → reader jumps to 270",
    onPage270,
    `pill="${pill270.trim()}"`
  );
} catch (e) {
  record("Step 6: jump from bookmark row", false, String(e.message || e));
}

// ───────── Step 7: Delete one bookmark from the bookmarks panel
try {
  const bSheet = await openBookmarksSheet();
  const beforeCount = await bSheet.locator(".page-tag").count();
  const delBtn = bSheet.locator('[aria-label="delete bookmark"]').first();
  await delBtn.waitFor({ timeout: 3000 });
  await delBtn.click();

  await page.waitForTimeout(300);
  const afterCount = await bSheet.locator(".page-tag").count();
  record(
    "Step 7: delete bookmark removes row",
    afterCount === beforeCount - 1,
    `before=${beforeCount} after=${afterCount}`
  );

  await closeSheet();
} catch (e) {
  record("Step 7: delete bookmark", false, String(e.message || e));
}

// ───────── Step 8: Notes sheet on page 270 → seed note body visible
try {
  const pillNow = (await page.locator(".page-pill").first().textContent().catch(() => "")) || "";
  if (!/^\s*270\s*\//.test(pillNow.replace(/\s+/g, " "))) {
    await jumpToPage(270);
  }

  const notesSheet = await openNotesSheet();
  const sheetText = (await notesSheet.textContent()) || "";
  const hasSeed = /If a man does not keep pace with his companions/i.test(sheetText);
  record(
    "Step 8: notes sheet on p.270 shows seed note text",
    hasSeed,
    hasSeed ? "seed visible" : `body excerpt="${sheetText.slice(0, 120).replace(/\s+/g, " ")}"`
  );
} catch (e) {
  record("Step 8: open notes sheet on 270", false, String(e.message || e));
}

// ───────── Step 9: Add a new note — type then BLUR (per brief: notes save on blur)
let blurSavedOk = false;
let didFallbackSave = false;
try {
  const notesSheet = page.locator(".sheet-root.is-open .sheet");
  // The draft textarea is the LAST one — existing NoteRows render above the input box.
  // But none of the existing notes is in edit-mode, so only the draft textarea exists.
  const textarea = notesSheet.locator("textarea").first();
  await textarea.waitFor({ timeout: 3000 });
  await textarea.click();
  await textarea.fill("My fresh test note 12345");

  const beforeRows = await notesSheet.locator('[aria-label="edit note"]').count();

  // Blur — Tab away + click the sheet title (a non-input region)
  await page.keyboard.press("Tab");
  await notesSheet.locator(".sheet-title").first().click().catch(() => {});
  await page.waitForTimeout(400);

  let afterRows = await notesSheet.locator('[aria-label="edit note"]').count();
  blurSavedOk = afterRows === beforeRows + 1;

  if (!blurSavedOk) {
    didFallbackSave = true;
    await textarea.click();
    const draftVal = await textarea.inputValue();
    if (!draftVal) await textarea.fill("My fresh test note 12345");
    await notesSheet.getByText("Save note", { exact: false }).first().click();
    await page.waitForTimeout(400);
    afterRows = await notesSheet.locator('[aria-label="edit note"]').count();
  }

  const visiblyContains = ((await notesSheet.textContent()) || "").includes("My fresh test note 12345");
  record(
    "Step 9: add note via blur (design intent)",
    blurSavedOk && visiblyContains,
    `blurSaved=${blurSavedOk} fallbackUsed=${didFallbackSave} visible=${visiblyContains} rows ${beforeRows}→${afterRows}`
  );
} catch (e) {
  record("Step 9: add note via blur", false, String(e.message || e));
}

// ───────── Step 10: Edit an existing note — change body, save
try {
  const notesSheet = page.locator(".sheet-root.is-open .sheet");
  const editBtns = notesSheet.locator('[aria-label="edit note"]');
  const editCountBefore = await editBtns.count();
  await editBtns.first().click();

  // In edit mode, the FIRST textarea in the sheet is the edit-mode one.
  const editArea = notesSheet.locator("textarea").first();
  await editArea.waitFor({ timeout: 3000 });
  await editArea.fill("EDITED note body XYZ");

  // PrimaryBtn with exact text "Save"
  await notesSheet.locator("button", { hasText: /^\s*Save\s*$/ }).first().click();
  await page.waitForTimeout(400);

  const updatedText = (await notesSheet.textContent()) || "";
  const hasEdit = updatedText.includes("EDITED note body XYZ");
  const editCountAfter = await notesSheet.locator('[aria-label="edit note"]').count();
  record(
    "Step 10: edit an existing note updates body",
    hasEdit && editCountAfter === editCountBefore,
    `hasEdit=${hasEdit} editButtons ${editCountBefore}→${editCountAfter}`
  );
} catch (e) {
  record("Step 10: edit note", false, String(e.message || e));
}

// ───────── Step 11: Delete a note — click delete affordance
try {
  const notesSheet = page.locator(".sheet-root.is-open .sheet");
  const beforeDel = await notesSheet.locator('[aria-label="delete note"]').count();
  const beforeRows = await notesSheet.locator('[aria-label="edit note"]').count();
  await notesSheet.locator('[aria-label="delete note"]').first().click();
  await page.waitForTimeout(400);
  const afterRows = await notesSheet.locator('[aria-label="edit note"]').count();
  record(
    "Step 11: delete note removes row",
    afterRows === beforeRows - 1,
    `before=${beforeRows} after=${afterRows} delBtnsBefore=${beforeDel}`
  );
} catch (e) {
  record("Step 11: delete note", false, String(e.message || e));
}

// ───────── Step 12: Exit reader, open Walden detail, verify counts
try {
  await closeSheet();
  await page.keyboard.press("Escape");
  await page.waitForSelector(".book-tile", { timeout: 4000 });

  const waldenTile = page.locator(".book-grid .book-tile", { hasText: "Walden" }).first();
  await waldenTile.click();
  await page.waitForSelector(".detail-hero", { timeout: 4000 });

  const noteCountText = await page
    .locator(".stats-strip .stat", { hasText: "Notes" })
    .locator(".value")
    .first()
    .textContent()
    .catch(() => null);
  const noteCount = Number((noteCountText || "").trim());
  const expectedNotes = 3; // started 3, +1 added, -1 deleted
  record(
    "Step 12: Walden detail Notes count reflects add+delete",
    noteCount === expectedNotes,
    `count=${noteCount} expected=${expectedNotes}`
  );

  const bmCountText = await page
    .locator(".stats-strip .stat", { hasText: "Bookmarks" })
    .locator(".value")
    .first()
    .textContent()
    .catch(() => null);
  const bmCount = Number((bmCountText || "").trim());
  record(
    "Step 12b: Walden detail Bookmarks count reflects deletion",
    bmCount === 2,
    `count=${bmCount} expected=2 (3 seed - 1 deleted; toggles in steps 2/3 cancel)`
  );
} catch (e) {
  record("Step 12: detail counts", false, String(e.message || e));
}

// Design-intent check: brief says notes save on blur.
record(
  "Design intent: notes save on blur (per brief)",
  blurSavedOk,
  blurSavedOk
    ? "auto-saved on blur"
    : "DID NOT auto-save on blur — required explicit 'Save note' click / Cmd+Enter"
);

console.log("\n--- SUMMARY ---");
console.log(JSON.stringify(results, null, 2));

await browser.close();
