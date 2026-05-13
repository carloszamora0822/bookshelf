// Test 03 — Upload flow A: FAB → file pick → meta → save
// Verifies the fake upload pipeline end-to-end. No source changes.

import { chromium } from "playwright";

const BASE = "http://localhost:5173/";
const results = {
  steps: [],
  apiRequests: [],
  pageErrors: [],
  consoleErrors: [],
};

function log(label, ok, detail = "") {
  results.steps.push({ label, ok, detail });
  console.log(`${ok ? "OK  " : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// Network listener — record any /api/* request
page.on("request", (req) => {
  const url = req.url();
  if (url.includes("/api/")) {
    results.apiRequests.push({ url, method: req.method() });
  }
});
page.on("pageerror", (e) => results.pageErrors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") results.consoleErrors.push(m.text());
});

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  log("loaded library", true);

  // 1. Find & click the FAB
  const fab = page.locator('button.fab, button[aria-label*="upload" i]').first();
  await fab.waitFor({ state: "visible", timeout: 5000 });
  await fab.click();
  log("clicked FAB", true);

  // Verify upload sheet open with "Add a book" title
  const sheet = page.locator('.sheet-root.is-open');
  await sheet.waitFor({ state: "attached", timeout: 3000 });
  const sheetTitle = await page.locator('.sheet-title').first().textContent();
  log("sheet open with title 'Add a book'", sheetTitle?.trim() === "Add a book", `got "${sheetTitle?.trim()}"`);

  // 2. Verify FileStep elements
  const dropText = await page.getByText("Drop a PDF here").isVisible();
  log("FileStep: drop zone text visible", dropText);

  const demoBtn = page.getByRole("button", { name: /use demo file/i });
  const demoVisible = await demoBtn.isVisible();
  log("FileStep: 'Use demo file' button visible", demoVisible);

  const cancelBtn = page.locator('.sheet').getByRole("button", { name: /^cancel$/i }).first();
  const cancelVisible = await cancelBtn.isVisible();
  log("FileStep: 'Cancel' button visible", cancelVisible);

  // 3. Click "Use demo file"
  await demoBtn.click();
  log("clicked 'Use demo file'", true);

  // Wait for UploadingStep to appear (it may flash quickly — try both indicators)
  let sawUploading = false;
  try {
    await page.getByText(/uploading to private storage/i).waitFor({ timeout: 1500 });
    sawUploading = true;
  } catch {
    // Try seeing the filename or a percentage instead
    try {
      await page.getByText(/walden\.pdf/i).waitFor({ timeout: 1500 });
      sawUploading = true;
    } catch {}
  }
  log("UploadingStep appeared", sawUploading);

  // 4. Wait for MetaStep — Title field should appear and be pre-filled
  const titleInput = page.locator('.sheet input.input').first();
  await titleInput.waitFor({ state: "visible", timeout: 6000 });
  // small wait to let the value settle (it's set during simulateUpload)
  await page.waitForTimeout(200);
  const titleValue = await titleInput.inputValue();
  log("MetaStep: title pre-filled with 'Walden'", titleValue === "Walden", `got "${titleValue}"`);

  // Author input is the 2nd .input in the sheet
  const authorInput = page.locator('.sheet input.input').nth(1);
  const authorValue = await authorInput.inputValue();
  log("MetaStep: author input empty", authorValue === "", `got "${authorValue}"`);

  // Tag pills visible
  const tagPillCount = await page.locator('.sheet .pill, .sheet [class*="tag-pill" i]').count();
  // The TagPill component uses .pill — let's just count buttons in tags section
  const anyTagButtons = await page.locator('.sheet button').filter({ hasText: /Fiction|Philosophy|Essays|Classics/i }).count();
  log("MetaStep: tag pills visible", anyTagButtons > 0, `found ${anyTagButtons} tag pills`);

  // "Add to library" button exists
  const addBtn = page.getByRole("button", { name: /add to library/i });
  const addVisible = await addBtn.isVisible();
  log("MetaStep: 'Add to library' button exists", addVisible);

  // 5. Change title to "My Test Book"
  await titleInput.click();
  await titleInput.fill("");
  await titleInput.fill("My Test Book");
  log("set title to 'My Test Book'", true);

  await authorInput.click();
  await authorInput.fill("Test Author");
  log("set author to 'Test Author'", true);

  // 6. Click "Add to library"
  await addBtn.click();
  log("clicked 'Add to library'", true);

  // Verify sheet closes
  await page.waitForTimeout(400);
  const sheetStillOpen = await page.locator('.sheet-root.is-open').count();
  log("sheet closed after save", sheetStillOpen === 0, `is-open count=${sheetStillOpen}`);

  // Toast appears
  const toast = page.locator('.toast.is-open');
  let toastText = "";
  try {
    await toast.waitFor({ state: "visible", timeout: 2000 });
    toastText = (await toast.textContent())?.trim() || "";
  } catch {}
  log("toast appears with 'Book added' text", /book added/i.test(toastText), `toast="${toastText}"`);

  // Book appears in library
  const bookTitle = page.locator('.book-tile .title', { hasText: "My Test Book" }).first();
  await bookTitle.waitFor({ state: "visible", timeout: 3000 });
  log("'My Test Book' appears in library", true);

  // 7. Wait ~3s for extraction to flip; then click the new book
  await page.waitForTimeout(3000);

  // re-query to get fresh node
  const newTile = page.locator('.book-tile', { has: page.locator('.title', { hasText: "My Test Book" }) }).first();
  await newTile.click();
  log("clicked the new book tile", true);

  // Detail screen opens — look for the title prominently displayed
  await page.waitForTimeout(600);
  const detailHasTitle = await page.getByText("My Test Book").count();
  log("detail screen shows 'My Test Book'", detailHasTitle > 0, `occurrences=${detailHasTitle}`);

} catch (err) {
  log("UNCAUGHT ERROR", false, String(err));
}

// Final report dump
console.log("\n=== RESULTS ===");
console.log(JSON.stringify({
  passed: results.steps.filter(s => s.ok).length,
  failed: results.steps.filter(s => !s.ok).length,
  apiRequests: results.apiRequests,
  pageErrors: results.pageErrors,
  consoleErrors: results.consoleErrors,
}, null, 2));

await browser.close();

// Export the results for the report generator (callers can parse stdout)
process.stdout.write("\n__RESULTS_JSON__" + JSON.stringify(results) + "__END__\n");
