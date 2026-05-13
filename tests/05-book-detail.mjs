// Book detail flow test
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

async function openBookFromLibrary(title) {
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForSelector(".book-tile", { timeout: 5000 });
  // Click a tile whose .title matches exactly. Use grid tiles, the more reliable surface.
  const tile = page.locator(".book-grid .book-tile").filter({
    has: page.locator(".title", { hasText: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }),
  }).first();
  await tile.waitFor({ state: "visible", timeout: 4000 });
  await tile.click();
  await page.waitForSelector(".detail-hero", { timeout: 5000 });
}

async function goBackToLibrary() {
  // Click the "Library" back button at the top of detail screen
  const back = page.locator("button").filter({ hasText: /^Library$/ }).first();
  if (await back.count()) {
    await back.click();
  } else {
    await page.goBack();
  }
  await page.waitForSelector(".book-tile", { timeout: 5000 });
}

async function goBackFromReader() {
  // Reader has back button (aria-label "back to library"). Click it.
  const back = page.locator('[aria-label="back to library"]').first();
  if (await back.count()) {
    await back.click();
  } else {
    await page.keyboard.press("Escape");
  }
  // Should return to detail
  await page.waitForSelector(".detail-hero, .book-tile", { timeout: 5000 });
}

// ---- 1. Open Walden from library, verify hero ----
try {
  await openBookFromLibrary("Walden");
  const heroVisible = await page.locator(".detail-hero").isVisible();
  const titleText = (await page.locator(".detail-hero .detail-title").innerText()).trim();
  record("1. Walden detail loads with hero", heroVisible && titleText === "Walden",
    `heroVisible=${heroVisible}, title="${titleText}"`);
} catch (e) {
  record("1. Walden detail loads", false, String(e));
}

// ---- 2. Hero shows cover + title + author + tag pills ----
try {
  const coverHas = await page.locator(".detail-hero .cover").count();
  const coverInnerHtml = coverHas ? await page.locator(".detail-hero .cover").first().innerHTML() : "";
  const hasArt = /<svg|<img/i.test(coverInnerHtml);
  const titleText = (await page.locator(".detail-hero .detail-title").innerText()).trim();
  const byline = (await page.locator(".detail-hero .detail-byline").innerText()).trim();
  const tagTexts = await page.locator(".detail-hero .detail-tag-row .pill, .detail-hero .detail-tag-row .tag-pill").allInnerTexts().catch(() => []);
  // Try generic .pill if specific class not present
  const tagTextsFallback = tagTexts.length ? tagTexts : await page.locator(".detail-tag-row > *").allInnerTexts();
  const joined = tagTextsFallback.join("|").toLowerCase();
  const tagsOk = /essays/.test(joined) && /philosophy/.test(joined) && /classics/.test(joined);
  const authorOk = /Henry David Thoreau/.test(byline);
  const ok = coverHas && hasArt && titleText === "Walden" && authorOk && tagsOk;
  record("2. Hero shows cover, title, author, tag pills",
    ok,
    `cover=${coverHas}/${hasArt}, title="${titleText}", byline="${byline}", tags="${tagTextsFallback.join(",")}"`);
} catch (e) {
  record("2. Hero contents", false, String(e));
}

// ---- 3. Three primary action buttons (Continue, beginning, more/kebab) ----
try {
  const actionsScope = page.locator(".detail-actions");
  const continueBtn = await actionsScope.locator("button").filter({ hasText: /Continue/i }).count();
  const beginningBtn = await actionsScope.locator("button").filter({ hasText: /beginning/i }).count();
  const moreBtn = await page.locator('[aria-label="more"]').count();
  // Walden has lastOpenedPage=142, so "Continue · p.142" expected
  const continueText = continueBtn ? (await actionsScope.locator("button").filter({ hasText: /Continue/i }).first().innerText()).trim() : "";
  const ok = continueBtn >= 1 && beginningBtn >= 1 && moreBtn >= 1;
  record("3. Three action buttons present (Continue / From beginning / more)",
    ok,
    `continue=${continueBtn}("${continueText}"), beginning=${beginningBtn}, more=${moreBtn}`);
} catch (e) {
  record("3. Action buttons", false, String(e));
}

// ---- 4. TOC section exists and has expected entries ----
let walden_tocEntries = 0;
try {
  // Find TOC details/section by summary text
  const tocDetails = page.locator(".section-pane").filter({ hasText: /Table of/i }).first();
  const exists = await tocDetails.count();
  const countText = exists ? (await tocDetails.locator(".count").first().innerText()).trim() : "";
  const tocCount = parseInt(countText, 10) || 0;
  walden_tocEntries = tocCount;

  // Read outline entries (buttons inside outline-tree)
  const outlineButtons = exists ? tocDetails.locator(".outline-entry") : null;
  const outlineCount = outlineButtons ? await outlineButtons.count() : 0;
  const titles = outlineButtons ? await outlineButtons.locator(".title").allInnerTexts() : [];
  const titlesJoined = titles.join("|").toLowerCase();
  const hasExpected = /economy/.test(titlesJoined) && /reading/.test(titlesJoined) && /solitude/.test(titlesJoined) && /visitors/.test(titlesJoined);

  // Verify hierarchy: "On building a house" should exist as a child (depth-1)
  const childExists = outlineButtons
    ? await outlineButtons.filter({ hasText: /On building a house/i }).count()
    : 0;
  const childDepthClass = childExists
    ? await outlineButtons.filter({ hasText: /On building a house/i }).first().getAttribute("class")
    : "";
  const childIndented = /depth-1/.test(childDepthClass || "");

  const ok = exists > 0 && tocCount >= 11 && hasExpected && childIndented;
  record("4. TOC section exists with >=11 entries, hierarchy correct",
    ok,
    `count=${tocCount}, outlineButtons=${outlineCount}, expectedTitles=${hasExpected}, childIndented=${childIndented}(class="${childDepthClass}")`);
} catch (e) {
  record("4. TOC section", false, String(e));
}

// ---- 5. Bookmarks (3) + Notes (3) sections ----
try {
  const bmPane = page.locator(".section-pane").filter({ has: page.locator("h3", { hasText: /Bookmarks/i }) }).first();
  const bmCount = (await bmPane.locator(".count").first().innerText()).trim();
  const bmRows = await bmPane.locator(".bookmark-row").count();
  const bmPages = await bmPane.locator(".bookmark-row .page-tag").allInnerTexts();

  const notesPane = page.locator(".section-pane").filter({ has: page.locator("h3", { hasText: /^Notes/i }) }).first();
  const notesCount = (await notesPane.locator(".count").first().innerText()).trim();
  const noteRows = await notesPane.locator(".note-row").count();

  const expectedPages = ["84", "142", "270"];
  const pagesOk = expectedPages.every(p => bmPages.map(x => x.trim()).includes(p));

  const ok = bmCount === "3" && bmRows === 3 && pagesOk && notesCount === "3" && noteRows === 3;
  record("5. Bookmarks (3, pages 84/142/270) + Notes (3) sections",
    ok,
    `bmCount=${bmCount}, bmRows=${bmRows}, bmPages=[${bmPages.map(x => x.trim()).join(",")}], notesCount=${notesCount}, noteRows=${noteRows}`);
} catch (e) {
  record("5. Bookmarks/Notes sections", false, String(e));
}

// ---- 6. Click a TOC entry (Solitude -> page 127) ----
try {
  const tocDetails = page.locator(".section-pane").filter({ hasText: /Table of/i }).first();
  const solitudeBtn = tocDetails.locator(".outline-entry").filter({
    has: page.locator(".title", { hasText: /^Solitude$/ }),
  }).first();
  await solitudeBtn.click({ timeout: 5000 });
  // Wait for reader
  await page.waitForSelector(".reader", { timeout: 5000 });
  // Page indicator
  const pillText = (await page.locator(".page-pill").innerText()).trim().replace(/\s+/g, " ");
  // Should contain "127" as current page
  const ok = /^127\b/.test(pillText) || /\b127\s*\//.test(pillText);
  record("6. Click TOC 'Solitude' opens reader at page 127", ok, `pageIndicator="${pillText}"`);
  await goBackFromReader();
  // Make sure we're back on detail
  await page.waitForSelector(".detail-hero", { timeout: 5000 });
} catch (e) {
  record("6. TOC entry navigation", false, String(e));
  // Try to recover
  try { await page.goto("http://localhost:5173/", { waitUntil: "networkidle" }); await openBookFromLibrary("Walden"); } catch {}
}

// ---- 7. Click a bookmark (page 84) ----
try {
  const bmPane = page.locator(".section-pane").filter({ has: page.locator("h3", { hasText: /Bookmarks/i }) }).first();
  const bm84 = bmPane.locator(".bookmark-row").filter({ has: page.locator(".page-tag", { hasText: /^84$/ }) }).first();
  await bm84.click();
  await page.waitForSelector(".reader", { timeout: 5000 });
  const pillText = (await page.locator(".page-pill").innerText()).trim().replace(/\s+/g, " ");
  const ok = /^84\b/.test(pillText) || /\b84\s*\//.test(pillText);
  record("7. Click bookmark (page 84) opens reader at page 84", ok, `pageIndicator="${pillText}"`);
  await goBackFromReader();
  await page.waitForSelector(".detail-hero", { timeout: 5000 });
} catch (e) {
  record("7. Bookmark navigation", false, String(e));
  try { await page.goto("http://localhost:5173/", { waitUntil: "networkidle" }); await openBookFromLibrary("Walden"); } catch {}
}

// ---- 8. Click a note row ----
try {
  const notesPane = page.locator(".section-pane").filter({ has: page.locator("h3", { hasText: /^Notes/i }) }).first();
  // Pick the first note (page 84 expected per seed data)
  const firstNote = notesPane.locator(".note-row").first();
  // Read its page-tag to know what page we expect
  const expectedPage = (await firstNote.locator(".page-tag").innerText()).trim();
  await firstNote.click();
  await page.waitForSelector(".reader", { timeout: 5000 });
  const pillText = (await page.locator(".page-pill").innerText()).trim().replace(/\s+/g, " ");
  const ok = new RegExp(`^${expectedPage}\\b|\\b${expectedPage}\\s*\\/`).test(pillText);
  record("8. Click note row opens reader at note's page", ok, `expected=${expectedPage}, pageIndicator="${pillText}"`);
  await goBackFromReader();
  await page.waitForSelector(".detail-hero", { timeout: 5000 });
} catch (e) {
  record("8. Note navigation", false, String(e));
  try { await page.goto("http://localhost:5173/", { waitUntil: "networkidle" }); await openBookFromLibrary("Walden"); } catch {}
}

// ---- 9. Self-Reliance (hasOutline=false) — TOC absent ----
try {
  await goBackToLibrary();
  await openBookFromLibrary("Self-Reliance");
  // hasOutline=false renders a dashed empty-state, not a .section-pane with "Table of"
  const tocPaneCount = await page.locator(".section-pane").filter({ hasText: /Table of/i }).count();
  // The empty state text from detail.jsx says "This PDF has no embedded outline."
  const emptyHasText = await page.locator("text=no embedded outline").count();
  const ok = tocPaneCount === 0 && emptyHasText >= 1;
  record("9. Self-Reliance: TOC section absent (no embedded outline state shown)",
    ok,
    `tocPane=${tocPaneCount}, emptyStateMatches=${emptyHasText}`);
} catch (e) {
  record("9. Self-Reliance no-TOC state", false, String(e));
}

// ---- 10. Art of War — bookmarks/notes count 0 ----
try {
  await goBackToLibrary();
  await openBookFromLibrary("The Art of War");
  const bmPane = page.locator(".section-pane").filter({ has: page.locator("h3", { hasText: /Bookmarks/i }) }).first();
  const bmCount = (await bmPane.locator(".count").first().innerText()).trim();
  const notesPane = page.locator(".section-pane").filter({ has: page.locator("h3", { hasText: /^Notes/i }) }).first();
  const notesCount = (await notesPane.locator(".count").first().innerText()).trim();
  // Empty micro text
  const bmEmpty = await bmPane.locator("text=No bookmarks yet").count();
  const notesEmpty = await notesPane.locator("text=No notes yet").count();
  const ok = bmCount === "0" && notesCount === "0" && bmEmpty >= 1 && notesEmpty >= 1;
  record("10. Art of War: bookmarks=0, notes=0 with empty states",
    ok,
    `bmCount=${bmCount}(empty=${bmEmpty}), notesCount=${notesCount}(empty=${notesEmpty})`);
} catch (e) {
  record("10. Art of War empty counts", false, String(e));
}

// ---- 11. More menu on Walden detail ----
let moreMenuItems = [];
try {
  await goBackToLibrary();
  await openBookFromLibrary("Walden");
  const moreBtn = page.locator('[aria-label="more"]').first();
  await moreBtn.click();
  await page.waitForTimeout(250);
  // Menu items
  const menuItems = await page.locator(".menu .menu-item").allInnerTexts();
  moreMenuItems = menuItems.map(s => s.replace(/\s+/g, " ").trim());
  const joined = moreMenuItems.join(" | ").toLowerCase();
  const hasEdit = /edit details/.test(joined);
  const hasCover = /change cover/.test(joined);
  const hasTags = /manage tags/.test(joined);
  const hasDelete = /delete book/.test(joined);
  const ok = moreMenuItems.length >= 4 && hasEdit && hasCover && hasTags && hasDelete;
  record("11. More menu opens with edit/cover/tags/delete items",
    ok,
    `items=[${moreMenuItems.join(" | ")}]`);
  // Close menu
  await page.keyboard.press("Escape").catch(() => {});
} catch (e) {
  record("11. More menu", false, String(e));
}

if (errors.length) {
  console.log("\nRUNTIME ERRORS:");
  errors.forEach(e => console.log("  " + e));
}

await browser.close();

const passed = results.filter(r => r.passed).length;
const total = results.length;
console.log(`\nSummary: ${passed}/${total} passed`);

console.log("\nJSON_RESULTS=" + JSON.stringify({ results, errors, moreMenuItems, walden_tocEntries }));
