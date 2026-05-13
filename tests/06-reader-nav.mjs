// Reader navigation flow test
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

async function readPageIndicator() {
  // .page-pill in the bottom chrome
  return await page.locator(".page-pill").first().innerText().catch(() => "");
}

async function readPageNumber() {
  const txt = await readPageIndicator();
  const m = txt.match(/^\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

async function waitFor(predicate, { timeout = 3000, interval = 50 } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const v = await predicate().catch(() => null);
    if (v) return v;
    await page.waitForTimeout(interval);
  }
  return null;
}

// 1. Open library, open Walden detail, click Start reading.
try {
  await page.waitForSelector(".book-tile", { timeout: 5000 });
  // Find Walden tile
  const waldenTile = page.locator(".book-grid .book-tile").filter({ hasText: "Walden" }).first();
  await waldenTile.click();
  await page.waitForTimeout(400);

  // Detail screen: click "From beginning" since Walden has lastOpenedPage (142)
  // Button text patterns: "Continue · p.142" (accent) and "From beginning" (ghost)
  const fromBeginningBtn = page.locator("button").filter({ hasText: /From beginning/i }).first();
  const hasFromBeginning = await fromBeginningBtn.isVisible().catch(() => false);
  if (hasFromBeginning) {
    await fromBeginningBtn.click();
  } else {
    // fallback: click any "Start reading" or "Continue"
    await page.locator("button").filter({ hasText: /Start reading|Continue/i }).first().click();
  }
  await page.waitForTimeout(500);

  // Reader should now be open
  const readerVisible = await page.locator(".reader").isVisible().catch(() => false);
  const pageNum = await readPageNumber();
  record("1. Open Walden reader from beginning", readerVisible && pageNum === 1,
    `readerVisible=${readerVisible}, page=${pageNum}, indicator="${await readPageIndicator()}"`);
} catch (e) {
  record("1. Open reader", false, String(e));
}

// 2. Verify page indicator shows page 1 ("1 / 287")
try {
  const txt = await readPageIndicator();
  const ok = /^\s*1\s*\/\s*287/.test(txt);
  record("2. Page indicator shows '1 / 287'", ok, `indicator="${txt}"`);
} catch (e) {
  record("2. Page indicator", false, String(e));
}

// 3. ArrowRight → page 2
try {
  await page.locator(".reader").focus().catch(() => {});
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(350);
  const n = await readPageNumber();
  record("3. ArrowRight advances to page 2", n === 2, `page=${n}`);
} catch (e) {
  record("3. ArrowRight", false, String(e));
}

// 4. Space → page 3
try {
  await page.keyboard.press("Space");
  await page.waitForTimeout(350);
  const n = await readPageNumber();
  record("4. Space advances to page 3", n === 3, `page=${n}`);
} catch (e) {
  record("4. Space", false, String(e));
}

// 5. ArrowLeft twice → page 1
try {
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(350);
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(350);
  const n = await readPageNumber();
  record("5. ArrowLeft x2 returns to page 1", n === 1, `page=${n}`);
} catch (e) {
  record("5. ArrowLeft x2", false, String(e));
}

// 6. Tap page area toggles chrome visibility
try {
  // Chrome is auto-hidden after 5 seconds. We check class on .reader-chrome-top.
  const initialHidden = await page.locator(".reader-chrome-top").evaluate(
    el => el.classList.contains("reader-chrome-hidden")
  ).catch(() => null);

  // Click on the reading area — find a data-pagetap="1" element NOT in the chrome.
  // Click the center of the .reader-stage.
  const stage = page.locator(".reader-stage").first();
  const stageBox = await stage.boundingBox();
  // Click somewhere mid-stage but well below top chrome area
  await page.mouse.click(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
  await page.waitForTimeout(350);

  const afterClick1 = await page.locator(".reader-chrome-top").evaluate(
    el => el.classList.contains("reader-chrome-hidden")
  ).catch(() => null);

  // Click again — should toggle back
  await page.mouse.click(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
  await page.waitForTimeout(350);

  const afterClick2 = await page.locator(".reader-chrome-top").evaluate(
    el => el.classList.contains("reader-chrome-hidden")
  ).catch(() => null);

  // Toggle: afterClick1 !== initialHidden, then afterClick2 toggled back
  const toggled = (afterClick1 !== initialHidden) && (afterClick2 !== afterClick1);
  record("6. Tap reading area toggles chrome", toggled,
    `initialHidden=${initialHidden}, afterTap1=${afterClick1}, afterTap2=${afterClick2}`);
} catch (e) {
  record("6. Tap toggles chrome", false, String(e));
}

// Make sure chrome is visible before continuing
try {
  const hidden = await page.locator(".reader-chrome-top").evaluate(
    el => el.classList.contains("reader-chrome-hidden")
  ).catch(() => null);
  if (hidden) {
    // Tap stage to bring back
    const stage = page.locator(".reader-stage").first();
    const stageBox = await stage.boundingBox();
    await page.mouse.click(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
    await page.waitForTimeout(300);
  }
} catch {}

// 7. Jump to page via kebab → "Jump to page…" → enter 50
try {
  // Open kebab (reader menu) — IconButton with aria-label "reader menu"
  const kebab = page.locator('[aria-label="reader menu"]').first();
  await kebab.click();
  await page.waitForTimeout(300);

  // Click "Jump to page…" in the menu
  const jumpItem = page.locator(".menu .menu-item, .menu-item").filter({ hasText: /Jump to page/i }).first();
  await jumpItem.click();
  await page.waitForTimeout(400);

  // Type 50 into the input + Enter
  const jumpInput = page.locator('input[inputmode="numeric"]').first();
  await jumpInput.click();
  // Clear and type 50
  await page.keyboard.press("Control+A").catch(() => {});
  await jumpInput.fill("50");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);

  const n = await readPageNumber();
  record("7. Jump to page 50 via menu input", n === 50, `page=${n}`);
} catch (e) {
  record("7. Jump to page", false, String(e));
}

// 8. Escape exits reader
try {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const readerVisible = await page.locator(".reader").isVisible().catch(() => false);
  // Should be back on detail or library — look for either detail-actions or .book-grid
  const onDetail = await page.locator(".detail-actions, .detail-progress").first().isVisible().catch(() => false);
  const onLibrary = await page.locator(".book-grid, .library-toolbar").first().isVisible().catch(() => false);
  record("8. Escape exits reader", !readerVisible && (onDetail || onLibrary),
    `readerStillVisible=${readerVisible}, onDetail=${onDetail}, onLibrary=${onLibrary}`);
} catch (e) {
  record("8. Escape exits", false, String(e));
}

// 9. Reopen Walden detail, click Continue, verify resume page
try {
  // We might be on the detail page already. If not, navigate.
  let onDetail = await page.locator(".detail-actions").first().isVisible().catch(() => false);
  if (!onDetail) {
    // Navigate from library
    const walden = page.locator(".book-grid .book-tile").filter({ hasText: "Walden" }).first();
    await walden.click();
    await page.waitForTimeout(400);
  }
  // Click "Continue · p.X"
  const continueBtn = page.locator("button").filter({ hasText: /Continue/i }).first();
  const continueText = await continueBtn.innerText().catch(() => "");
  await continueBtn.click();
  await page.waitForTimeout(500);

  const n = await readPageNumber();
  // Should be 50 since setResume was called when we jumped
  const ok = n === 50;
  record("9. Continue reading resumes at page 50", ok, `page=${n}, button="${continueText}"`);
} catch (e) {
  record("9. Continue reading", false, String(e));
}

// 10. Two-page spread test at 1280×900 vs 700×900
try {
  // Currently in reader at viewport 1280x900. Check for spread.
  // The HorizontalPages renders two PdfPage components in one wrapper when isSpread.
  // We can count .reader-page-card elements in the active stage frame.
  await page.waitForTimeout(300);

  // Wait for at least one page-card
  await page.waitForSelector(".reader-page-card", { timeout: 3000 }).catch(() => {});

  // In spread mode, each visible page wrapper contains 2 reader-page-cards.
  // Read the active page wrapper to see if there are 2 cards inside.
  const spreadInfoWide = await page.evaluate(() => {
    const stage = document.querySelector(".reader-stage");
    if (!stage) return { stageFound: false };
    // Find direct page wrappers — they have data-pagetap=1 and contain .reader-page-card
    const wrappers = stage.querySelectorAll('[data-pagetap="1"]');
    let maxCards = 0;
    wrappers.forEach(w => {
      const cards = w.querySelectorAll(":scope > [data-pagetap='1'] > .reader-page-card, :scope > [data-pagetap='1']");
      // Simpler: count .reader-page-card descendants direct
    });
    const allCards = stage.querySelectorAll(".reader-page-card");
    // Count cards per direct child wrapper that contains them
    const parents = new Set();
    allCards.forEach(c => {
      // walk up until find element with translateX style (the per-page container)
      let p = c.parentElement;
      while (p && !(p.style && p.style.transform && p.style.transform.includes("translateX"))) {
        p = p.parentElement;
      }
      if (p) parents.add(p);
    });
    let maxPerParent = 0;
    parents.forEach(p => {
      const cnt = p.querySelectorAll(".reader-page-card").length;
      if (cnt > maxPerParent) maxPerParent = cnt;
    });
    return {
      stageFound: true,
      totalCards: allCards.length,
      parentGroups: parents.size,
      maxCardsPerParent: maxPerParent,
      stageWidth: stage.getBoundingClientRect().width,
    };
  });

  const isSpreadWide = spreadInfoWide.maxCardsPerParent >= 2;

  // Resize to narrower
  await page.setViewportSize({ width: 700, height: 900 });
  await page.waitForTimeout(500);

  const spreadInfoNarrow = await page.evaluate(() => {
    const stage = document.querySelector(".reader-stage");
    if (!stage) return { stageFound: false };
    const allCards = stage.querySelectorAll(".reader-page-card");
    const parents = new Set();
    allCards.forEach(c => {
      let p = c.parentElement;
      while (p && !(p.style && p.style.transform && p.style.transform.includes("translateX"))) {
        p = p.parentElement;
      }
      if (p) parents.add(p);
    });
    let maxPerParent = 0;
    parents.forEach(p => {
      const cnt = p.querySelectorAll(".reader-page-card").length;
      if (cnt > maxPerParent) maxPerParent = cnt;
    });
    return {
      stageFound: true,
      totalCards: allCards.length,
      parentGroups: parents.size,
      maxCardsPerParent: maxPerParent,
      stageWidth: stage.getBoundingClientRect().width,
    };
  });

  const isSpreadNarrow = spreadInfoNarrow.maxCardsPerParent >= 2;

  record("10. Two-page spread on wide, single on narrow",
    isSpreadWide && !isSpreadNarrow,
    `wide=${JSON.stringify(spreadInfoWide)}, narrow=${JSON.stringify(spreadInfoNarrow)}`);

  // Restore wide viewport for scrubber test
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(400);
} catch (e) {
  record("10. Two-page spread", false, String(e));
}

// 11. Scrubber click jumps pages
try {
  // Ensure chrome visible — tap once if needed
  const hidden = await page.locator(".reader-chrome-top").evaluate(
    el => el.classList.contains("reader-chrome-hidden")
  ).catch(() => null);
  if (hidden) {
    const stage = page.locator(".reader-stage").first();
    const stageBox = await stage.boundingBox();
    await page.mouse.click(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
    await page.waitForTimeout(300);
  }

  const scrubber = page.locator(".scrubber").first();
  const exists = await scrubber.isVisible().catch(() => false);
  if (!exists) {
    record("11. Scrubber click jumps pages", false, "scrubber not visible");
  } else {
    const box = await scrubber.boundingBox();
    const beforePage = await readPageNumber();
    // Click at 25% across — should land near page 0.25 * 287 ≈ 72
    const targetClickX = box.x + box.width * 0.25;
    const targetClickY = box.y + box.height / 2;
    await page.mouse.click(targetClickX, targetClickY);
    await page.waitForTimeout(500);
    const afterPage = await readPageNumber();
    // Expected ~72 (round(0.25 * 287) = 72)
    const expected = Math.round(0.25 * 287);
    const ok = afterPage != null && Math.abs(afterPage - expected) <= 3 && afterPage !== beforePage;
    record("11. Scrubber click jumps pages", ok,
      `beforePage=${beforePage}, afterPage=${afterPage}, expected~${expected}`);
  }
} catch (e) {
  record("11. Scrubber click", false, String(e));
}

// Capture any runtime errors
if (errors.length) {
  console.log("\nRUNTIME ERRORS:");
  errors.forEach(e => console.log("  " + e));
}

await browser.close();

const passed = results.filter(r => r.passed).length;
const total = results.length;
console.log(`\nSummary: ${passed}/${total} passed`);

console.log("\nJSON_RESULTS=" + JSON.stringify({ results, errors }));
