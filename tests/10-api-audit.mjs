// Test 10 — API / network audit
// Goal: prove (or disprove) that the frontend talks to its backend at all.
// Listens to EVERY request fired during a representative end-to-end session.
// Does NOT modify any source.

import { chromium } from "playwright";

const BASE = "http://localhost:5173/";

// Resource types we treat as static / framework noise.
const STATIC_TYPES = new Set(["script", "stylesheet", "image", "font", "media"]);
// We keep "document" and "fetch"/"xhr"/"websocket"/"other" out of STATIC_TYPES
// so they're surfaced. (HMR pings come through as "other" / websocket.)

function isViteHmr(url) {
  // Vite's HMR + dev-server internals
  return (
    url.includes("/@vite/") ||
    url.includes("/@react-refresh") ||
    url.includes("/@fs/") ||
    url.includes("/@id/") ||
    url.includes("/node_modules/.vite/") ||
    url.endsWith("/__vite_ping") ||
    url.includes("?import") ||
    url.includes("?t=") ||
    url.includes("?v=")
  );
}

const requests = []; // full log
function record(action, req) {
  requests.push({
    action,
    method: req.method(),
    url: req.url(),
    resourceType: req.resourceType(),
    status: null,
  });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

let currentAction = "initial-load";

page.on("request", (req) => record(currentAction, req));
page.on("response", (res) => {
  // augment matching request entries with status
  const u = res.url();
  const m = res.request().method();
  // attach status to the LAST matching un-statused entry
  for (let i = requests.length - 1; i >= 0; i--) {
    if (requests[i].url === u && requests[i].method === m && requests[i].status === null) {
      requests[i].status = res.status();
      break;
    }
  }
});

const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

async function step(label, fn) {
  currentAction = label;
  try {
    await fn();
    console.log("OK   " + label);
  } catch (e) {
    console.log("FAIL " + label + " — " + String(e));
  }
}

try {
  await step("1-load-library", async () => {
    await page.goto(BASE, { waitUntil: "networkidle" });
  });

  await step("2-open-detail", async () => {
    const firstTile = page.locator(".book-tile").first();
    await firstTile.waitFor({ state: "visible", timeout: 5000 });
    await firstTile.click();
    // detail screen
    await page.waitForTimeout(400);
  });

  await step("3-open-reader", async () => {
    const cont = page.getByRole("button", { name: /continue reading|start reading|read/i }).first();
    await cont.waitFor({ state: "visible", timeout: 4000 });
    await cont.click();
    await page.waitForTimeout(500);
  });

  await step("4a-page-right", async () => {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(120);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(120);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
  });

  await step("4b-bookmark", async () => {
    await page.keyboard.press("b");
    await page.waitForTimeout(200);
  });

  await step("5-add-note", async () => {
    // Try to open a notes sheet — UI may use a button labeled "Notes" or an icon.
    const notesBtn = page.getByRole("button", { name: /notes?/i }).first();
    let opened = false;
    try {
      await notesBtn.waitFor({ state: "visible", timeout: 1500 });
      await notesBtn.click();
      opened = true;
    } catch {
      // try keyboard shortcut "n"
      await page.keyboard.press("n");
      await page.waitForTimeout(300);
    }
    // find a textarea / input
    const noteField = page
      .locator('textarea, input[type="text"]')
      .filter({ hasNot: page.locator(".upload-sheet") })
      .first();
    try {
      await noteField.waitFor({ state: "visible", timeout: 1500 });
      await noteField.click();
      await noteField.fill("audit note");
      // blur — press Tab to commit
      await page.keyboard.press("Tab");
      await page.waitForTimeout(300);
    } catch {
      // ignore — note UI may not exist
    }
    if (opened) {
      // close sheet via Esc so reader stays focused
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
  });

  await step("6-exit-reader", async () => {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    // some apps need a second Escape from detail too — we want to be back at library
    const fab = page.locator("button.fab").first();
    let backAtLibrary = false;
    try {
      await fab.waitFor({ state: "visible", timeout: 1500 });
      backAtLibrary = true;
    } catch {}
    if (!backAtLibrary) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
  });

  await step("7-open-upload-fab", async () => {
    const fab = page.locator('button.fab, button[aria-label*="upload" i]').first();
    await fab.waitFor({ state: "visible", timeout: 4000 });
    await fab.click();
    await page.waitForTimeout(300);
  });

  await step("8a-use-demo-file", async () => {
    const demoBtn = page.getByRole("button", { name: /use demo file/i });
    await demoBtn.waitFor({ state: "visible", timeout: 3000 });
    await demoBtn.click();
    // wait for MetaStep — title input appears
    const titleInput = page.locator(".sheet input.input").first();
    await titleInput.waitFor({ state: "visible", timeout: 8000 });
    await page.waitForTimeout(300);
  });

  await step("8b-add-to-library", async () => {
    const addBtn = page.getByRole("button", { name: /add to library/i });
    await addBtn.waitFor({ state: "visible", timeout: 3000 });
    await addBtn.click();
    await page.waitForTimeout(500);
  });

  await step("9-settings-dark", async () => {
    // find settings — usually a gear icon button
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button[title*="settings" i]')
      .first();
    let opened = false;
    try {
      await settingsBtn.waitFor({ state: "visible", timeout: 1500 });
      await settingsBtn.click();
      opened = true;
    } catch {
      // try a button labeled Settings
      const txt = page.getByRole("button", { name: /settings/i }).first();
      await txt.click({ timeout: 1500 }).catch(() => {});
      opened = true;
    }
    await page.waitForTimeout(300);
    // try clicking a Dark control
    const dark = page.getByRole("button", { name: /^dark$/i }).first();
    try {
      await dark.click({ timeout: 1500 });
    } catch {
      // try a generic theme toggle
      const toggle = page.getByText(/dark/i).first();
      await toggle.click({ timeout: 1500 }).catch(() => {});
    }
    await page.waitForTimeout(300);
  });

  await step("10-settings-light", async () => {
    const light = page.getByRole("button", { name: /^light$/i }).first();
    try {
      await light.click({ timeout: 1500 });
    } catch {
      await page.getByText(/light/i).first().click({ timeout: 1500 }).catch(() => {});
    }
    await page.waitForTimeout(300);
  });

  await step("11-page-mode-vertical", async () => {
    // settings sheet may still be open; if not, reopen
    const stillOpen = await page.locator(".sheet-root.is-open").count();
    if (stillOpen === 0) {
      const settingsBtn = page
        .locator('button[aria-label*="settings" i], button[title*="settings" i]')
        .first();
      await settingsBtn.click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(300);
    }
    const vertical = page.getByRole("button", { name: /vertical/i }).first();
    try {
      await vertical.click({ timeout: 1500 });
    } catch {
      await page.getByText(/vertical/i).first().click({ timeout: 1500 }).catch(() => {});
    }
    await page.waitForTimeout(300);
  });

  // small settle window for any deferred fetches
  currentAction = "post-flow-settle";
  await page.waitForTimeout(800);
} catch (err) {
  console.log("UNCAUGHT " + String(err));
}

// ---------- Analysis ----------
function categorize(r) {
  const u = r.url;
  if (isViteHmr(u)) return "vite-hmr";
  if (u.startsWith("ws://") || u.startsWith("wss://")) return "websocket";
  if (STATIC_TYPES.has(r.resourceType)) return "static";
  if (r.resourceType === "document") return "document";
  // Treat .pdf / blob: as upload-asset noise (the demo PDF lives at /test-fixtures)
  if (u.endsWith(".pdf") || u.startsWith("blob:") || u.startsWith("data:")) return "asset";
  return "candidate";
}

for (const r of requests) r.category = categorize(r);

const apiHits = requests.filter(
  (r) => r.url.includes("/api/") || r.url.includes("/internal/")
);
const supabaseHits = requests.filter((r) => /supabase\.co|supabase\.in/.test(r.url));
const externalHits = requests.filter((r) => {
  try {
    const host = new URL(r.url).hostname;
    return host && host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return false;
  }
});
const candidates = requests.filter((r) => r.category === "candidate");

const summary = {
  totalRequests: requests.length,
  candidateNonStatic: candidates.length,
  apiRequests: apiHits.length,
  supabaseRequests: supabaseHits.length,
  externalRequests: externalHits.length,
  pageErrors,
};

console.log("\n=== SUMMARY ===");
console.log(JSON.stringify(summary, null, 2));

console.log("\n=== CANDIDATE NON-STATIC REQUESTS ===");
for (const r of candidates) {
  console.log(`[${r.action}] ${r.method} ${r.url} (${r.resourceType}) -> ${r.status}`);
}

console.log("\n=== /api/* + /internal/* ===");
for (const r of apiHits) {
  console.log(`[${r.action}] ${r.method} ${r.url} -> ${r.status}`);
}

console.log("\n=== SUPABASE / EXTERNAL ===");
for (const r of externalHits) {
  console.log(`[${r.action}] ${r.method} ${r.url} -> ${r.status}`);
}

await browser.close();

process.stdout.write(
  "\n__RESULTS_JSON__" +
    JSON.stringify({ requests, apiHits, supabaseHits, externalHits, candidates, summary, pageErrors }) +
    "__END__\n"
);
