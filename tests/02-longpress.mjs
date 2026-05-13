// Test long-press / context menu flow against running dev server.
import { chromium } from "playwright";

const URL = "http://localhost:5173/";
const results = {
  steps: [],
  errors: [],
  consoleErrors: [],
};

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

// ───────── Step 1: right-click on first .book-tile → menu w/ all 6 items
try {
  await gotoLibrary();

  // The first .book-tile may be in continue rail; target "All books" section.
  // The All books section contains a .book-grid > .book-tile.
  const tile = page.locator(".book-grid .book-tile").first();
  await tile.waitFor({ timeout: 5000 });
  await tile.click({ button: "right" });

  // Menu = BottomSheet with class .sheet
  const sheet = page.locator(".sheet-root.is-open .sheet");
  await sheet.waitFor({ timeout: 3000 });

  const sheetText = await sheet.textContent();
  const expectedItems = [
    /Continue from page \d+|Start reading/,
    /Start from beginning/,
    /Edit details/,
    /Manage tags/,
    /Change cover/,
    /Delete book/,
  ];
  const missing = expectedItems.filter((r) => !r.test(sheetText || ""));
  record(
    "Step 1: right-click opens sheet with 6 expected items",
    missing.length === 0,
    missing.length === 0 ? "all items present" : `missing: ${missing.map(String).join(", ")}`
  );
} catch (e) {
  record("Step 1: right-click opens sheet", false, String(e.message || e));
}

// ───────── Step 2: Click "Start from beginning" → reader chrome
try {
  // sheet should still be open from step 1
  const sheet = page.locator(".sheet-root.is-open .sheet");
  const startBtn = sheet.getByText("Start from beginning", { exact: false }).first();
  await startBtn.click();

  // Wait for reader chrome
  await page.waitForSelector(".reader-chrome-top, .reader-chrome-bot, .reader", { timeout: 4000 });
  const hasReader = (await page.locator(".reader").count()) > 0;
  const hasChromeTop = (await page.locator(".reader-chrome-top").count()) > 0;
  // BACK button — aria-label "back to library"
  const backBtn = page.locator('[aria-label="back to library"]');
  const hasBack = (await backBtn.count()) > 0;
  record(
    "Step 2: Start from beginning navigates to reader",
    hasReader && (hasChromeTop || hasBack),
    `reader=${hasReader} chromeTop=${hasChromeTop} back=${hasBack}`
  );

  // Go back to library
  if (hasBack) {
    await backBtn.first().click();
    await page.waitForSelector(".book-tile", { timeout: 4000 });
  }
} catch (e) {
  record("Step 2: Start from beginning navigates to reader", false, String(e.message || e));
}

// ───────── Step 3: Reload, switch to LIST view, click more icon, Delete book
try {
  await gotoLibrary();

  // Switch to list view: segmented option "List"
  const listBtn = page.locator(".segmented button", { hasText: "List" });
  await listBtn.click();
  await page.waitForSelector(".book-list .book-row", { timeout: 4000 });

  // Read initial row titles to detect removal
  const rowsBefore = await page.locator(".book-list .book-row").count();
  const firstTitle = await page
    .locator(".book-list .book-row .title")
    .first()
    .textContent();

  // Click the "more" icon button on the first row.
  const moreBtn = page
    .locator('.book-list .book-row [aria-label="more"]')
    .first();
  await moreBtn.click();

  // Wait for sheet
  const sheet = page.locator(".sheet-root.is-open .sheet");
  await sheet.waitFor({ timeout: 3000 });

  // Click "Delete book"
  await sheet.getByText("Delete book", { exact: false }).first().click();

  // Wait for toast or row count decrease
  await page.waitForTimeout(400);
  const rowsAfter = await page.locator(".book-list .book-row").count();
  const toastText = await page.locator(".toast").textContent().catch(() => "");
  const toastVisible = await page.locator(".toast.is-open").count();

  const removed = rowsAfter === rowsBefore - 1;
  const toastOk = /book removed/i.test(toastText || "") || toastVisible > 0;
  record(
    "Step 3: Delete book removes row + shows toast",
    removed && toastOk,
    `rowsBefore=${rowsBefore} rowsAfter=${rowsAfter} removedTitle="${firstTitle}" toast="${toastText}" toastOpen=${toastVisible}`
  );
} catch (e) {
  record("Step 3: List view delete", false, String(e.message || e));
}

// ───────── Step 4: Reload, right-click → Edit details → BookDetail
try {
  await gotoLibrary();

  const tile = page.locator(".book-grid .book-tile").first();
  await tile.waitFor({ timeout: 5000 });
  const expectedTitle = (await tile.locator(".title").first().textContent()) || "";

  await tile.click({ button: "right" });
  const sheet = page.locator(".sheet-root.is-open .sheet");
  await sheet.waitFor({ timeout: 3000 });

  await sheet.getByText("Edit details", { exact: false }).first().click();

  // Wait for detail-hero
  await page.waitForSelector(".detail-hero", { timeout: 4000 });
  const heroVisible = (await page.locator(".detail-hero").count()) > 0;
  const detailTitle = (await page.locator(".detail-hero .detail-title").first().textContent()) || "";
  const titleMatches =
    !!expectedTitle && detailTitle.trim() === expectedTitle.trim();

  record(
    "Step 4: Edit details navigates to detail screen",
    heroVisible && titleMatches,
    `hero=${heroVisible} expectedTitle="${expectedTitle}" detailTitle="${detailTitle}"`
  );
} catch (e) {
  record("Step 4: Edit details navigates to detail", false, String(e.message || e));
}

console.log("\n--- SUMMARY ---");
console.log(JSON.stringify(results, null, 2));

await browser.close();
