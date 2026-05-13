// Settings + persistence flow test
import { chromium } from "playwright";

const results = [];
const errors = [];

function record(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`);
}

const PREFS_KEY = "bookshelf:prefs";

async function readPrefs(page) {
  return await page.evaluate((k) => localStorage.getItem(k), PREFS_KEY);
}
async function readDataTheme(page) {
  return await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

const browser = await chromium.launch();

// ─────────── Desktop context (1280×900) ───────────
const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctxDesktop.newPage();
page.on("pageerror", e => errors.push("pageerror: " + String(e)));
page.on("console", m => { if (m.type() === "error") errors.push("console.error: " + m.text()); });

// 1. Fresh context — read localStorage BEFORE app initializes via init script, then load
let initialPrefs = null;
await page.addInitScript(() => {
  // capture what's there pre-app
  window.__pre = localStorage.getItem("bookshelf:prefs");
});
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
try {
  initialPrefs = await page.evaluate(() => window.__pre);
  // After load, app should have written defaults
  const afterLoad = await readPrefs(page);
  const parsed = afterLoad ? JSON.parse(afterLoad) : null;
  const ok = initialPrefs === null && parsed && "theme" in parsed && "defaultPageMode" in parsed;
  record("1. Fresh storage null pre-app; app writes defaults",
    ok, `pre=${initialPrefs} after=${afterLoad}`);
} catch (e) {
  record("1. Fresh storage", false, String(e));
}

// 2. Open Settings via desktop nav rail
try {
  await page.waitForSelector(".rail", { timeout: 3000 });
  // Find "Settings" rail-item button
  const railSettings = page.locator(".rail .rail-item").filter({ hasText: /^Settings$/ }).first();
  await railSettings.click();
  await page.waitForTimeout(400);
  // Section labels
  const sectionLabels = await page.locator(".settings-section .label").allInnerTexts();
  const hasAccount = sectionLabels.some(l => /Account/i.test(l));
  const hasReading = sectionLabels.some(l => /Reading/i.test(l));
  const hasAbout   = sectionLabels.some(l => /About/i.test(l));
  record("2. Settings opens with Account/Reading/About sections (desktop nav rail)",
    hasAccount && hasReading && hasAbout,
    `labels=${JSON.stringify(sectionLabels)}`);
} catch (e) {
  record("2. Open Settings desktop", false, String(e));
}

// 3. Account section: email + Sign out button (UI only)
try {
  const accountSection = page.locator(".settings-section").filter({ hasText: "Account" }).first();
  const text = await accountSection.innerText();
  const hasEmail = /@/.test(text);
  const signOutBtn = accountSection.locator("button").filter({ hasText: /Sign out/i }).first();
  const hasSignOut = await signOutBtn.count() > 0;
  // Click sign out and note behavior
  let signOutBehavior = "no-op (still on Settings)";
  if (hasSignOut) {
    const beforeRoute = await page.locator(".display-1").first().innerText().catch(() => "");
    await signOutBtn.click();
    await page.waitForTimeout(300);
    const afterRoute = await page.locator(".display-1").first().innerText().catch(() => "");
    if (beforeRoute !== afterRoute) signOutBehavior = `changed: "${beforeRoute}" -> "${afterRoute}"`;
  }
  record("3. Account section has email + Sign out (UI-only)",
    hasEmail && hasSignOut, `hasEmail=${hasEmail} hasSignOut=${hasSignOut} signOut=${signOutBehavior}`);
} catch (e) {
  record("3. Account section", false, String(e));
}

// 4. Theme = Dark
try {
  const themeRow = page.locator(".settings-row").filter({ hasText: /^Theme/ }).first();
  await themeRow.locator(".segmented button").filter({ hasText: "Dark" }).click();
  await page.waitForTimeout(300);
  const dataTheme = await readDataTheme(page);
  const stored = JSON.parse(await readPrefs(page) || "{}");
  const ok = dataTheme === "dark" && stored.theme === "dark";
  record("4. Switch to Dark — data-theme=dark + localStorage.theme=dark",
    ok, `data-theme=${dataTheme} stored=${JSON.stringify(stored)}`);
} catch (e) {
  record("4. Theme Dark", false, String(e));
}

// 5. Theme = Light
try {
  const themeRow = page.locator(".settings-row").filter({ hasText: /^Theme/ }).first();
  await themeRow.locator(".segmented button").filter({ hasText: "Light" }).click();
  await page.waitForTimeout(300);
  const dataTheme = await readDataTheme(page);
  const stored = JSON.parse(await readPrefs(page) || "{}");
  const ok = dataTheme === "light" && stored.theme === "light";
  record("5. Switch to Light — data-theme=light + localStorage.theme=light",
    ok, `data-theme=${dataTheme} stored=${JSON.stringify(stored)}`);
} catch (e) {
  record("5. Theme Light", false, String(e));
}

// 6. Theme = System — should record "system"; data-theme should resolve based on prefers
try {
  const themeRow = page.locator(".settings-row").filter({ hasText: /^Theme/ }).first();
  await themeRow.locator(".segmented button").filter({ hasText: "System" }).click();
  await page.waitForTimeout(200);
  const storedSys = JSON.parse(await readPrefs(page) || "{}");
  const recordedSystem = storedSys.theme === "system";

  // Now emulate dark scheme and reload — verify resolved theme follows
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const themeAfterDarkReload = await readDataTheme(page);
  const storedAfter = JSON.parse(await readPrefs(page) || "{}");

  // Emulate light and reload
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const themeAfterLightReload = await readDataTheme(page);

  const ok = recordedSystem
    && storedAfter.theme === "system"
    && themeAfterDarkReload === "dark"
    && themeAfterLightReload === "light";
  record("6. System theme — localStorage='system' + resolves to OS scheme on reload",
    ok, `stored=${storedSys.theme} darkResolve=${themeAfterDarkReload} lightResolve=${themeAfterLightReload} storedAfter=${storedAfter.theme}`);
} catch (e) {
  record("6. Theme System", false, String(e));
}

// 7. Default page mode = vertical
try {
  // We may have reloaded — re-open Settings
  await page.emulateMedia({ colorScheme: "light" });
  // Click rail-item Settings if not already
  const onSettings = await page.locator(".settings-section").count();
  if (!onSettings) {
    await page.locator(".rail .rail-item").filter({ hasText: /^Settings$/ }).first().click();
    await page.waitForTimeout(300);
  }
  const pmRow = page.locator(".settings-row").filter({ hasText: /Default page mode/ }).first();
  await pmRow.locator(".segmented button").filter({ hasText: "Scroll" }).click();
  await page.waitForTimeout(250);
  const stored = JSON.parse(await readPrefs(page) || "{}");
  const ok = stored.defaultPageMode === "vertical";
  record("7. Default page mode -> vertical persisted in localStorage",
    ok, `stored=${JSON.stringify(stored)}`);
} catch (e) {
  record("7. Page mode vertical", false, String(e));
}

// 8. Navigate away (library + open a book) then back — selections persist via state
try {
  // Set theme to dark first so we can verify visually
  const themeRow = page.locator(".settings-row").filter({ hasText: /^Theme/ }).first();
  await themeRow.locator(".segmented button").filter({ hasText: "Dark" }).click();
  await page.waitForTimeout(250);

  // Go to library via nav rail
  await page.locator(".rail .rail-item").filter({ hasText: /^Library$/ }).first().click();
  await page.waitForTimeout(300);
  // Open first book tile
  await page.waitForSelector(".book-tile", { timeout: 3000 });
  await page.locator(".book-tile").first().click();
  await page.waitForTimeout(400);

  // Back to settings
  await page.locator(".rail .rail-item").filter({ hasText: /^Settings$/ }).first().click();
  await page.waitForTimeout(400);

  const themeBtnActive = await page.locator(".settings-row")
    .filter({ hasText: /^Theme/ }).first()
    .locator(".segmented button.is-active").innerText();
  const pmBtnActive = await page.locator(".settings-row")
    .filter({ hasText: /Default page mode/ }).first()
    .locator(".segmented button.is-active").innerText();

  const ok = /Dark/i.test(themeBtnActive) && /Scroll/i.test(pmBtnActive);
  record("8. Round-trip via state — selections retained after navigation",
    ok, `themeActive="${themeBtnActive}" pmActive="${pmBtnActive}"`);
} catch (e) {
  record("8. Round-trip nav", false, String(e));
}

// 9. Hard reload — read from localStorage AND visual state
try {
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const stored = JSON.parse(await readPrefs(page) || "{}");
  const dataTheme = await readDataTheme(page);

  // Open settings again to check active button reflects stored value
  await page.locator(".rail .rail-item").filter({ hasText: /^Settings$/ }).first().click();
  await page.waitForTimeout(300);
  const themeBtnActive = await page.locator(".settings-row")
    .filter({ hasText: /^Theme/ }).first()
    .locator(".segmented button.is-active").innerText();
  const pmBtnActive = await page.locator(".settings-row")
    .filter({ hasText: /Default page mode/ }).first()
    .locator(".segmented button.is-active").innerText();

  const ok = stored.theme === "dark"
    && stored.defaultPageMode === "vertical"
    && dataTheme === "dark"
    && /Dark/i.test(themeBtnActive)
    && /Scroll/i.test(pmBtnActive);
  record("9. Hard reload — stored prefs + active UI restored",
    ok, `stored=${JSON.stringify(stored)} data-theme=${dataTheme} themeActive="${themeBtnActive}" pmActive="${pmBtnActive}"`);
} catch (e) {
  record("9. Hard reload", false, String(e));
}

// ─────────── Mobile entry point: gear icon in top header ───────────
try {
  // Clear storage and switch to mobile viewport on the same page (fresh-ish)
  await page.evaluate(() => localStorage.removeItem("bookshelf:prefs"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  // Mobile: settings IconButton at top-right of library page
  const settingsBtn = page.locator('[aria-label="settings"]').first();
  const visible = await settingsBtn.isVisible();
  await settingsBtn.click();
  await page.waitForTimeout(400);
  const labels = await page.locator(".settings-section .label").allInnerTexts();
  const ok = visible && labels.some(l => /Account/i.test(l)) && labels.some(l => /Reading/i.test(l));
  record("10. Mobile gear icon opens Settings", ok,
    `iconVisible=${visible} labels=${JSON.stringify(labels)}`);
} catch (e) {
  record("10. Mobile gear", false, String(e));
}

await ctxDesktop.close();

// ─────────── Fresh incognito context with colorScheme dark ───────────
try {
  const ctxFresh = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: "dark",
  });
  const page2 = await ctxFresh.newPage();
  await page2.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page2.waitForTimeout(400);
  const dataTheme = await page2.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const stored = await page2.evaluate(() => localStorage.getItem("bookshelf:prefs"));
  const parsed = stored ? JSON.parse(stored) : null;
  // App reads matchMedia first-load -> sets theme to "dark" (literal, not "system")
  const ok = dataTheme === "dark" && parsed && parsed.theme === "dark";
  record("11. Fresh incognito + colorScheme:dark — data-theme=dark on first load",
    ok, `data-theme=${dataTheme} stored=${stored}`);
  await ctxFresh.close();
} catch (e) {
  record("11. Fresh incognito dark", false, String(e));
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
