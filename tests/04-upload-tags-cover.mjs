// Upload flow B: tags + cover picker
import { chromium } from "playwright";

const results = { steps: [], errors: [], notes: [] };
const log = (name, ok, info = "") => {
  results.steps.push({ name, ok, info });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${info ? " | " + info : ""}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on("pageerror", e => results.errors.push("pageerror: " + String(e)));
page.on("console", m => { if (m.type() === "error") results.errors.push("console: " + m.text()); });

try {
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });

  // 1. Open FAB → demo file → wait for meta step
  await page.locator(".fab").click();
  await page.getByRole("button", { name: "Use demo file" }).click();
  // Wait for the meta step: tag pills are visible. The upload simulates ~1-3s.
  await page.waitForSelector("text=Add to library", { timeout: 15000 });
  log("MetaStep reached after demo file", true);

  // Scope all interactions to the upload sheet (avoid library filter pills underneath).
  const sheet = page.locator(".sheet-root.is-open .sheet");

  // 2. Toggle "Fiction" pill ON then OFF
  const fictionPill = sheet.locator(".pill", { hasText: "Fiction" }).first();
  const beforeClass = await fictionPill.getAttribute("class");
  await fictionPill.click();
  const activeClass = await fictionPill.getAttribute("class");
  const turnedOn = !beforeClass.includes("is-active") && activeClass.includes("is-active");
  log("Fiction pill toggle ON", turnedOn, `class: ${activeClass}`);

  // Visual style differs check (background-color computed)
  const activeStyle = await fictionPill.evaluate(el => getComputedStyle(el).backgroundColor);
  await fictionPill.click();
  const offClass = await fictionPill.getAttribute("class");
  const offStyle = await fictionPill.evaluate(el => getComputedStyle(el).backgroundColor);
  log("Fiction pill toggle OFF", !offClass.includes("is-active") && activeStyle !== offStyle,
    `activeBg=${activeStyle} offBg=${offStyle}`);

  // 3. New tag via Enter
  const newTagInput = sheet.getByPlaceholder("New tag…");
  await newTagInput.fill("MyNewTag");
  await newTagInput.press("Enter");
  const myNewPill = sheet.locator(".pill", { hasText: "MyNewTag" }).first();
  await myNewPill.waitFor({ timeout: 3000 });
  const myNewClass = await myNewPill.getAttribute("class");
  log("MyNewTag pill appears", true);
  log("MyNewTag is auto-applied (active)", myNewClass.includes("is-active"), `class: ${myNewClass}`);

  // 4. Another tag via Add button
  await newTagInput.fill("AnotherTag");
  await sheet.getByRole("button", { name: "Add", exact: true }).click();
  const anotherPill = sheet.locator(".pill", { hasText: "AnotherTag" }).first();
  await anotherPill.waitFor({ timeout: 3000 });
  const anotherClass = await anotherPill.getAttribute("class");
  log("AnotherTag pill appears via Add button", true);
  log("AnotherTag is auto-applied (active)", anotherClass.includes("is-active"));

  // 5. Click "Choose a different page"
  await sheet.getByRole("button", { name: /Choose a different page/ }).click();
  await sheet.getByText("Pick a cover page").waitFor({ timeout: 3000 });
  log("CoverPageStep heading appears", true);

  // Verify 12 thumb buttons. The page text labels are "p. 1" through "p. 12".
  const thumbCount = await sheet.locator("text=/^p\\. \\d+$/").count();
  log("12 thumb labels present", thumbCount === 12, `count=${thumbCount}`);

  // 6. Click thumb for page 7
  const thumb7 = sheet.locator("button", { has: page.locator("text=p. 7") }).first();
  await thumb7.click();
  await page.waitForTimeout(200);
  const thumb7Borders = await thumb7.locator("div").first().evaluate(el => getComputedStyle(el).borderColor);
  const thumb1 = sheet.locator("button", { has: page.locator("text=p. 1") }).first();
  const thumb1Borders = await thumb1.locator("div").first().evaluate(el => getComputedStyle(el).borderColor);
  const hasCheckBadge = await thumb7.locator("svg").count();
  log("Page 7 thumb shows active border + check badge",
    thumb7Borders !== thumb1Borders && hasCheckBadge >= 1,
    `p7border=${thumb7Borders} p1border=${thumb1Borders} svgs=${hasCheckBadge}`);

  // 7. Click Done → returns to MetaStep, page thumbnail says "page 7"
  await sheet.getByRole("button", { name: /^Done$/ }).click();
  await sheet.getByRole("button", { name: "Add to library" }).waitFor({ timeout: 3000 });
  const pageLabelText = await sheet.locator("text=/^page \\d+$/").first().textContent();
  log("Back on MetaStep with coverPage=7", pageLabelText.trim() === "page 7",
    `label="${pageLabelText}"`);

  // 8. Click "Upload an image" option
  const uploadOption = sheet.getByRole("button", { name: /Upload an image/ });
  const uploadBefore = await uploadOption.evaluate(el => getComputedStyle(el).backgroundColor);
  await uploadOption.click();
  await page.waitForTimeout(150);
  const uploadAfter = await uploadOption.evaluate(el => getComputedStyle(el).backgroundColor);
  log("Upload an image active state changes (coverMode='upload')",
    uploadBefore !== uploadAfter, `before=${uploadBefore} after=${uploadAfter}`);

  // Check for actual file picker — source shows onUploadCover only sets coverMode, no input.
  // Confirm no <input type="file"> in the visible sheet AFTER the FileStep is gone.
  const fileInputs = await sheet.locator('input[type="file"]').count();
  results.notes.push(`After clicking Upload an image: input[type=file] count = ${fileInputs}. ` +
    `Source confirms onUploadCover only toggles coverMode; no file picker dialog is wired.`);

  // 9. Save with Add to library, confirm book appears
  // The demo file is "Walden.pdf" → title becomes "Walden". Library may already have a Walden book in seed.
  // Count book-tile elements before and after.
  // The sheet is still open; need to capture tile count once it closes.
  // We can derive title from input field.
  const title = await sheet.locator(".input").first().inputValue();
  await sheet.getByRole("button", { name: "Add to library" }).click();
  await page.waitForSelector(".sheet-root.is-open", { state: "detached", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  // Find a book-tile with our title
  const tiles = await page.locator(".book-tile").allTextContents();
  const match = tiles.some(t => t.includes(title));
  log(`Book "${title}" appears in library`, match, `tiles=${tiles.length}`);

} catch (err) {
  results.errors.push("test error: " + String(err) + "\n" + err.stack);
  log("Test run threw", false, String(err));
} finally {
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}
