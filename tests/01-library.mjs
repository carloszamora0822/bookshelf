// Library landing flow test
import { chromium } from "playwright";

const results = [];
const errors = [];

function record(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

page.on("pageerror", e => errors.push("pageerror: " + String(e)));
page.on("console", m => { if (m.type() === "error") errors.push("console.error: " + m.text()); });

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

// 1. Title + >= 6 book tiles
try {
  const title = await page.title();
  const okTitle = title.includes("Bookshelf");
  record("1a. Page title contains 'Bookshelf'", okTitle, `title="${title}"`);

  await page.waitForSelector(".book-tile", { timeout: 5000 });
  const tileCount = await page.locator(".book-tile").count();
  record("1b. >= 6 book tiles present", tileCount >= 6, `count=${tileCount}`);
} catch (e) {
  record("1. Load + tiles", false, String(e));
}

// 2. Greeting heading
try {
  const headingText = await page.locator(".display-1, h1").first().innerText();
  const ok = /Good (morning|afternoon|evening|night)/i.test(headingText);
  record("2. Greeting heading present", ok, `heading="${headingText.replace(/\n/g, ' | ')}"`);
} catch (e) {
  record("2. Greeting heading", false, String(e));
}

// 3. Continue reading section appears with multiple tiles
try {
  const headings = await page.locator(".section-head h2").allInnerTexts();
  const hasContinue = headings.some(h => /Continue/i.test(h));
  const continueTiles = await page.locator(".continue-rail .book-tile").count();
  record("3. Continue reading section + multiple tiles", hasContinue && continueTiles >= 2,
    `hasContinueSection=${hasContinue}, tiles=${continueTiles}`);
} catch (e) {
  record("3. Continue reading", false, String(e));
}

// 4. All books section with all 6 seed books
try {
  const headings = await page.locator(".section-head h2").allInnerTexts();
  const hasAll = headings.some(h => /All/i.test(h) && /books/i.test(h));
  const gridTiles = await page.locator(".book-grid .book-tile").count();
  record("4. 'All books' section with 6 books", hasAll && gridTiles === 6,
    `hasAllSection=${hasAll}, gridTiles=${gridTiles}`);
} catch (e) {
  record("4. All books", false, String(e));
}

// 5. Search "walden" reduces All books tiles to 1; clearing restores
try {
  const searchInput = page.locator(".library-toolbar input").first();
  await searchInput.fill("walden");
  await page.waitForTimeout(300);
  const afterSearch = await page.locator(".book-grid .book-tile").count();
  await searchInput.fill("");
  await page.waitForTimeout(300);
  const afterClear = await page.locator(".book-grid .book-tile").count();
  record("5. Search 'walden' filters to 1; clear restores",
    afterSearch === 1 && afterClear === 6,
    `afterSearch=${afterSearch}, afterClear=${afterClear}`);
} catch (e) {
  record("5. Search filter", false, String(e));
}

// 6. Search "zzznomatch" -> empty state
try {
  const searchInput = page.locator(".library-toolbar input").first();
  await searchInput.fill("zzznomatch");
  await page.waitForTimeout(300);
  const emptyVisible = await page.locator(".empty").isVisible().catch(() => false);
  const emptyText = emptyVisible ? await page.locator(".empty").innerText() : "";
  const ok = emptyVisible && /Nothing matched/i.test(emptyText);
  record("6. Empty state for no matches", ok, `emptyVisible=${emptyVisible}, text="${emptyText.replace(/\n/g, ' | ')}"`);
  await searchInput.fill("");
  await page.waitForTimeout(200);
} catch (e) {
  record("6. Empty state", false, String(e));
}

// 8. View toggle (done before sort to keep menu interactions clean)
try {
  const listBtn = page.locator(".segmented button").filter({ hasText: "List" }).first();
  await listBtn.click();
  await page.waitForTimeout(300);
  const listVisible = await page.locator(".book-list").count();
  const gridVisible = await page.locator(".book-grid").count();
  const listOk = listVisible > 0 && gridVisible === 0;

  const gridBtn = page.locator(".segmented button").filter({ hasText: "Grid" }).first();
  await gridBtn.click();
  await page.waitForTimeout(300);
  const listAfter = await page.locator(".book-list").count();
  const gridAfter = await page.locator(".book-grid").count();
  const gridOk = gridAfter > 0 && listAfter === 0;

  record("8. View toggle Grid<->List", listOk && gridOk,
    `listMode: list=${listVisible} grid=${gridVisible}; gridMode: list=${listAfter} grid=${gridAfter}`);
} catch (e) {
  record("8. View toggle", false, String(e));
}

// 7. Sort by Title — first tile alphabetically first
try {
  const sortBtn = page.locator(".library-toolbar button").filter({ hasText: /Recently opened|Title|Author|Recently added/ }).first();
  await sortBtn.click();
  await page.waitForTimeout(250);
  // Dispatch click via JS to bypass scrim overlay intercept (React onClick listens on the button itself)
  const clicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".menu .menu-item"));
    const target = items.find(el => el.textContent.trim() === "Title");
    if (target) { target.click(); return true; }
    return false;
  });
  await page.waitForTimeout(400);

  const newSortLabel = await sortBtn.innerText().catch(() => "");
  const allGridTitles = await page.locator(".book-grid .book-tile .title").allInnerTexts();
  const firstTitle = (allGridTitles[0] || "").trim();
  const ok = firstTitle === "Frankenstein";
  record("7. Sort by Title — first tile is 'Frankenstein'", ok,
    `clicked=${clicked}, sortLabel="${newSortLabel.replace(/\n/g, ' ')}", firstTitle="${firstTitle}", allTitles=${JSON.stringify(allGridTitles)}`);
} catch (e) {
  record("7. Sort by Title", false, String(e));
}

// Ensure no menu/scrim is up before further interactions
await page.locator(".menu-scrim").first().click({ force: true }).catch(() => {});
await page.waitForTimeout(150);

// 9. Tag filter chips
try {
  const tagStrip = page.locator(".tag-strip");
  const fictionChip = tagStrip.locator(".pill").filter({ hasText: "Fiction" }).first();
  const before = await page.locator(".book-grid .book-tile").count();
  await fictionChip.click();
  await page.waitForTimeout(300);
  const afterClick = await page.locator(".book-grid .book-tile").count();
  const isActive = await fictionChip.evaluate(el => el.classList.contains("is-active")).catch(() => false);

  // Books with t-fiction: Pride and Prejudice, Frankenstein -> expect 2
  const filterOk = afterClick === 2 && isActive;

  await fictionChip.click();
  await page.waitForTimeout(300);
  const afterClear = await page.locator(".book-grid .book-tile").count();
  const isActiveAfter = await fictionChip.evaluate(el => el.classList.contains("is-active")).catch(() => false);
  const clearOk = afterClear === before && !isActiveAfter;

  record("9. Tag filter (Fiction) toggles", filterOk && clearOk,
    `before=${before}, afterClick=${afterClick} active=${isActive}, afterClear=${afterClear} active=${isActiveAfter}`);
} catch (e) {
  record("9. Tag filter", false, String(e));
}

// 10. Mobile viewport — mobile header (in .page-container) + FAB
try {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  // The mobile header is inside .page-container as a top div with .rail-brand span.
  // The desktop NavRail also uses .rail-brand but is hidden at mobile widths.
  // Find the .rail-brand that is actually visible.
  const allBrands = page.locator(".rail-brand");
  const brandCount = await allBrands.count();
  let visibleBrandText = "";
  let brandVisible = false;
  for (let i = 0; i < brandCount; i++) {
    const el = allBrands.nth(i);
    const isVis = await el.isVisible().catch(() => false);
    if (isVis) {
      brandVisible = true;
      visibleBrandText = await el.innerText();
      break;
    }
  }

  // Settings icon-button on mobile header (inside .page-container, before library-head)
  const settingsBtn = page.locator('.page-container [aria-label="settings"]').first();
  const settingsVisible = await settingsBtn.isVisible().catch(() => false);

  // FAB visible + clickable
  const fab = page.locator(".fab");
  const fabVisible = await fab.isVisible().catch(() => false);
  let fabWorks = false;
  if (fabVisible) {
    await fab.click();
    await page.waitForTimeout(500);
    // Upload opens a sheet/modal. Look for common containers.
    const sheetVisible = await page.locator(".sheet, .bottom-sheet, [role=dialog], .modal, .drawer").first().isVisible().catch(() => false);
    fabWorks = sheetVisible;
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(300);
  }

  const brandOk = brandVisible && /Bookshelf/i.test(visibleBrandText);
  record("10. Mobile header (brand + settings) + FAB", brandOk && settingsVisible && fabVisible && fabWorks,
    `brandVisible=${brandVisible} text="${visibleBrandText}", settings=${settingsVisible}, fab=${fabVisible}, fabWorks=${fabWorks}`);
} catch (e) {
  record("10. Mobile viewport", false, String(e));
}

// Capture runtime errors
if (errors.length) {
  console.log("\nRUNTIME ERRORS:");
  errors.forEach(e => console.log("  " + e));
}

await browser.close();

const passed = results.filter(r => r.passed).length;
const total = results.length;
console.log(`\nSummary: ${passed}/${total} passed`);

console.log("\nJSON_RESULTS=" + JSON.stringify({ results, errors }));
