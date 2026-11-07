// browser.mjs: headless Chromium with software WebGL (no GPU in the container) + helpers to grab the canvas.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // global install: require() finds it, ESM import does not
export async function openPage(url, { w = 1080, h = 1920 } = {}) {
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(`[page ${m.type()}]`, m.text()); });
  page.on("pageerror", (e) => console.log("[page error]", e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  return { browser, page };
}
/** the canvas as PNG/JPEG bytes (the canvas keeps its drawing buffer) */
export async function grab(page, type = "image/png", q = 0.92) {
  const b64 = await page.evaluate(([t, qq]) => document.querySelector("canvas").toDataURL(t, qq).split(",")[1], [type, q]);
  return Buffer.from(b64, "base64");
}
