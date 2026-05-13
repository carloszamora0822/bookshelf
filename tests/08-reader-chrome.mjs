// Reader chrome controls flow test — Walden + Self-Reliance
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
await page.waitForSelector(".book-tile", { timeout: 5000 });

// ── Helpers ──
async function openBookFromBeginning(matchTitle) {
  // Long-press / right-click the tile whose title matches
  const tile = page.locator(".book-grid .book-tile").filter({ hasText: matchTitle }).first();
  await tile.scrollIntoViewIfNeeded();
  await tile.click({ button: "right" });
  // BottomSheet should appear with "Start from beginning"
  await page.locator(".sheet .menu-item").filter({ hasText: "Start from beginning" }).first().click();
  await page.waitForSelector(".reader", { timeout: 4000 });
}

async function revealChrome() {
  // Loop a couple of times in case timing races
  for (let i = 0; i < 4; i++) {
    const hidden = await page.locator(".reader-chrome-top.reader-chrome-hidden").count();
    if (hidden === 0) return;
    // Click somewhere on the page surface — data-pagetap toggles chromeVisible
    await page.locator('.reader-stage').first().click({ position: { x: 640, y: 450 }, force: true }).catch(() => {});
    await page.waitForTimeout(350);
  }
}

async function openReaderMenu() {
  await revealChrome();
  const btn = page.locator('.reader-chrome-top [aria-label="reader menu"]').first();
  // Try a few times in case of re-renders
  for (let i = 0; i < 3; i++) {
    await btn.click({ force: true }).catch(() => {});
    try {
      await page.waitForSelector(".menu", { timeout: 1500 });
      return;
    } catch {
      // not visible yet, try again
      await revealChrome();
    }
  }
  throw new Error("openReaderMenu: menu did not appear after retries");
}

async function closeMenuIfOpen() {
  const scrim = page.locator(".menu-scrim").first();
  if (await scrim.count() > 0 && await scrim.isVisible().catch(() => false)) {
    await scrim.click({ force: true }).catch(() => {});
    await page.waitForTimeout(150);
  }
}

async function closeSheetIfOpen() {
  // Close any open sheet by clicking its scrim and waiting for it to fully close
  const scrim = page.locator(".sheet-scrim");
  const count = await scrim.count();
  for (let i = 0; i < count; i++) {
    const s = scrim.nth(i);
    if (await s.isVisible().catch(() => false)) {
      await s.click({ force: true }).catch(() => {});
    }
  }
  // Wait for is-open to drop
  await page.waitForFunction(() => {
    return document.querySelectorAll(".sheet-root.is-open").length === 0;
  }, null, { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(200);
}

async function getTheme() {
  return await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

// ── 1. Open Walden from beginning ──
try {
  await openBookFromBeginning("Walden");
  const ok = await page.locator(".reader").count() > 0;
  record("1. Walden reader opens", ok);
} catch (e) {
  record("1. Walden reader opens", false, String(e));
}

// ── 2. Initial data-theme ──
let initialTheme = null;
try {
  initialTheme = await getTheme();
  const ok = initialTheme === "light" || initialTheme === "dark";
  record("2. <html> has data-theme attribute", ok, `initialTheme="${initialTheme}"`);
} catch (e) {
  record("2. data-theme readable", false, String(e));
}

// ── 3. Theme toggle via kebab menu ──
try {
  await openReaderMenu();
  // The toggle is the menu item containing "theme" (label is "Light theme" or "Dark theme")
  const themeItem = page.locator(".menu .menu-item").filter({ hasText: /theme/i }).first();
  const labelBefore = await themeItem.innerText();
  await themeItem.click();
  await page.waitForTimeout(300);
  const afterFirst = await getTheme();
  const expectedFirst = initialTheme === "dark" ? "light" : "dark";
  const firstOk = afterFirst === expectedFirst;

  // Toggle back
  await openReaderMenu();
  const themeItem2 = page.locator(".menu .menu-item").filter({ hasText: /theme/i }).first();
  await themeItem2.click();
  await page.waitForTimeout(300);
  const afterSecond = await getTheme();
  const secondOk = afterSecond === initialTheme;

  record("3. Theme toggle flips data-theme",
    firstOk && secondOk,
    `before=${initialTheme}, labelBefore="${labelBefore.replace(/\n/g, " ")}", afterFirst=${afterFirst}, afterSecond=${afterSecond}`);
} catch (e) {
  record("3. Theme toggle", false, String(e));
}

// ── 4. Brightness slider ──
try {
  await openReaderMenu();
  await page.locator(".menu .menu-item").filter({ hasText: /^Brightness/i }).first().click();
  // Brightness sheet opens
  await page.waitForSelector('.sheet input[type="range"]', { timeout: 2000 });

  // Sample overlay before
  const overlayBefore = await page.evaluate(() => {
    const stage = document.querySelector(".reader-stage");
    if (!stage) return null;
    const kids = Array.from(stage.children).filter(c => c.tagName === "DIV");
    const last = kids[kids.length - 1];
    return last ? last.style.background : null;
  });

  // React-controlled input: use native setter so React picks up the change
  const slider = page.locator('.sheet input[type="range"]').first();
  await slider.evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, "40");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(400);

  const overlayAfter = await page.evaluate(() => {
    const stage = document.querySelector(".reader-stage");
    if (!stage) return null;
    const kids = Array.from(stage.children).filter(c => c.tagName === "DIV");
    const last = kids[kids.length - 1];
    return last ? last.style.background : null;
  });

  const overlayPresent = overlayAfter && /rgba\(0\s*,\s*0\s*,\s*0\s*,\s*0?\.\d+/.test(overlayAfter);
  record("4. Brightness slider sets overlay background",
    overlayPresent,
    `before="${overlayBefore}", after="${overlayAfter}"`);

  await closeSheetIfOpen();
} catch (e) {
  record("4. Brightness slider", false, String(e));
  await closeSheetIfOpen();
}

// ── 5. Page mode toggle ──
try {
  await openReaderMenu();
  // Look for menu item with "Page mode:" prefix
  const labelBefore = await page.locator(".menu .menu-item").filter({ hasText: /Page mode:/i }).first().innerText();
  // initial: horizontal -> "swipe"; vertical -> "scroll"
  const wasHorizontal = /swipe/i.test(labelBefore);

  // Sample DOM: in horizontal there's a wrap with onMouseDown etc. In vertical there's an overflow-auto scroller.
  const beforeDom = await page.evaluate(() => {
    const stage = document.querySelector(".reader-stage");
    if (!stage) return null;
    return Array.from(stage.children).map(c => ({
      tag: c.tagName.toLowerCase(),
      overflow: c.style.overflow || null,
      cursor: c.style.cursor || null,
      flexDir: c.style.flexDirection || null,
    }));
  });

  await page.locator(".menu .menu-item").filter({ hasText: /Page mode:/i }).first().click();
  await page.waitForTimeout(400);

  const afterDom = await page.evaluate(() => {
    const stage = document.querySelector(".reader-stage");
    if (!stage) return null;
    return Array.from(stage.children).map(c => ({
      tag: c.tagName.toLowerCase(),
      overflow: c.style.overflow || null,
      cursor: c.style.cursor || null,
      flexDir: c.style.flexDirection || null,
    }));
  });

  // Vertical mode container uses overflow: auto and flexDirection: column.
  // Horizontal uses overflow: hidden and cursor grab.
  const hasVertical = afterDom?.some(c => c.overflow === "auto" && c.flexDir === "column");
  const hadHorizontal = beforeDom?.some(c => c.overflow === "hidden");

  // Re-open menu, check label flipped
  await openReaderMenu();
  const labelAfter = await page.locator(".menu .menu-item").filter({ hasText: /Page mode:/i }).first().innerText();
  const labelFlipped = wasHorizontal ? /scroll/i.test(labelAfter) : /swipe/i.test(labelAfter);

  record("5. Page mode toggle changes layout",
    hasVertical && hadHorizontal && labelFlipped,
    `before="${labelBefore.replace(/\n/g, " ")}", after="${labelAfter.replace(/\n/g, " ")}", verticalDom=${hasVertical}, hadHorizontal=${hadHorizontal}`);

  // Flip back to horizontal for subsequent tests
  await page.locator(".menu .menu-item").filter({ hasText: /Page mode:/i }).first().click();
  await page.waitForTimeout(300);
} catch (e) {
  record("5. Page mode toggle", false, String(e));
  await closeMenuIfOpen();
}

// ── 6. TOC panel — entries appear ──
try {
  await closeMenuIfOpen();
  await openReaderMenu();
  await page.locator(".menu .menu-item").filter({ hasText: /Table of contents/i }).first().click();
  await page.waitForSelector(".sheet .outline-tree, .sheet-root.is-open .outline-tree", { timeout: 2000 });

  const entries = await page.locator(".sheet .outline-entry").allInnerTexts();
  const titles = entries.map(t => t.split("\n")[0].trim());
  const hasEconomy = titles.includes("Economy");
  const hasWhereILived = titles.some(t => /Where I Lived/i.test(t));
  const hasReading = titles.includes("Reading");

  // Depth check: presence of depth-1 indented entries (e.g., "On building a house")
  const indentedCount = await page.locator(".sheet .outline-entry.depth-1, .sheet .outline-entry.depth-2").count();

  record("6. TOC shows Walden chapters incl. nested entries",
    hasEconomy && hasWhereILived && hasReading && indentedCount >= 1,
    `Economy=${hasEconomy}, WhereILived=${hasWhereILived}, Reading=${hasReading}, indented=${indentedCount}, totalEntries=${titles.length}`);

  await closeSheetIfOpen();
} catch (e) {
  record("6. TOC entries", false, String(e));
  await closeSheetIfOpen();
}

// ── 7. Jump to page 127, verify Solitude highlighted in TOC ──
try {
  await openReaderMenu();
  await page.locator(".menu .menu-item").filter({ hasText: /Jump to page/i }).first().click();
  await page.waitForSelector('.sheet input[inputmode="numeric"], .sheet input[type="text"]', { timeout: 2000 });
  const inp = page.locator('.sheet input').first();
  await inp.fill("127");
  await inp.press("Enter");
  await page.waitForTimeout(500);

  // Check page indicator
  const pageText = await page.locator(".page-pill").first().innerText().catch(() => "");
  const pageOk = /\b127\b/.test(pageText);

  // Reopen TOC
  await openReaderMenu();
  await page.locator(".menu .menu-item").filter({ hasText: /Table of contents/i }).first().click();
  await page.waitForSelector(".sheet .outline-tree", { timeout: 2000 });

  // Inspect: find Solitude entry — does it have any "current-chapter" / is-active / aria-current style?
  const solitudeInfo = await page.evaluate(() => {
    const entries = Array.from(document.querySelectorAll(".sheet .outline-entry"));
    const sol = entries.find(e => /Solitude/i.test(e.innerText));
    if (!sol) return { found: false };
    const cs = getComputedStyle(sol);
    return {
      found: true,
      className: sol.className,
      ariaCurrent: sol.getAttribute("aria-current"),
      background: cs.backgroundColor,
      color: cs.color,
      fontWeight: cs.fontWeight,
    };
  });

  // We don't know which marker is used — accept if any class hints at active/current, or aria-current, or non-default background
  const highlighted = solitudeInfo.found && (
    /(active|current|is-current|highlight)/i.test(solitudeInfo.className) ||
    solitudeInfo.ariaCurrent ||
    (solitudeInfo.background && solitudeInfo.background !== "rgba(0, 0, 0, 0)" && solitudeInfo.background !== "transparent")
  );

  record("7. Jump to 127 + Solitude highlighted in TOC",
    pageOk && solitudeInfo.found && highlighted,
    `pageText="${pageText.replace(/\n/g, " ")}", solitude=${JSON.stringify(solitudeInfo)}`);
} catch (e) {
  record("7. Jump to 127 + Solitude highlight", false, String(e));
}

// ── 8. Tap Reading (page 95) ──
try {
  // Ensure TOC is open — close any stale sheet, then re-open via menu
  await closeSheetIfOpen();
  await closeMenuIfOpen();
  await openReaderMenu();
  await page.locator(".menu .menu-item").filter({ hasText: /Table of contents/i }).first().click();
  await page.waitForSelector(".sheet-root.is-open .outline-tree", { timeout: 2000 });

  // Click the "Reading" entry — page-num child contains "95"
  const readingEntry = page.locator(".sheet-root.is-open .outline-entry").filter({ hasText: /Reading/ }).filter({ hasText: /^(?!.*locomotive)/ }).first();
  await readingEntry.click({ force: true });
  await page.waitForTimeout(500);

  const pageText = await page.locator(".page-pill").first().innerText().catch(() => "");
  const ok = /\b95\b/.test(pageText);
  record("8. Tapping Reading jumps to page 95", ok, `pageText="${pageText.replace(/\n/g, " ")}"`);
} catch (e) {
  record("8. Tap Reading entry", false, String(e));
}

// ── 9. Self-Reliance — TOC absent / empty ──
try {
  await closeSheetIfOpen();
  await closeMenuIfOpen();
  // Exit reader: reveal chrome and click back button
  await revealChrome();
  await page.locator('.reader-chrome-top [aria-label="back to library"]').first().click({ force: true });
  await page.waitForTimeout(500);
  await page.waitForSelector(".book-tile", { timeout: 4000 });

  await openBookFromBeginning("Self-Reliance");

  await openReaderMenu();
  // Find the TOC menu item. It should exist but be disabled / show "none" hint and not open a sheet on click.
  const tocItem = page.locator(".menu .menu-item").filter({ hasText: /Table of contents/i }).first();
  const tocText = await tocItem.innerText();
  const showsNone = /none/i.test(tocText);

  await tocItem.click();
  await page.waitForTimeout(400);
  // Sheet with outline-tree should NOT have opened
  const tocSheetOpened = await page.locator(".sheet .outline-tree").count();

  record("9. Self-Reliance TOC absent or empty (hasOutline=false)",
    showsNone && tocSheetOpened === 0,
    `menuLabel="${tocText.replace(/\n/g, " ")}", tocSheet=${tocSheetOpened}`);
} catch (e) {
  record("9. Self-Reliance TOC absent", false, String(e));
}

if (errors.length) {
  console.log("\nRUNTIME ERRORS:");
  errors.forEach(e => console.log("  " + e));
}

await browser.close();

const passed = results.filter(r => r.passed).length;
const total = results.length;
console.log(`\nSummary: ${passed}/${total} passed`);
console.log("\nJSON_RESULTS=" + JSON.stringify({ results, errors }));
