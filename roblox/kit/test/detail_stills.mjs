import fs from "node:fs"; import path from "node:path";
import { serve } from "../serve.mjs"; import { openPage, grab } from "../browser.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../.."), out = path.resolve(process.argv[2] ?? "out/detail");
fs.mkdirSync(out, { recursive: true });
const { srv, url } = await serve(ROOT); const { browser, page } = await openPage(`${url}/kit/test/detail.html`);
for (const k of ["houses", "shops", "props", "cast", "play"]) { await page.evaluate((x) => window.shot(x), k); await page.evaluate((x) => window.shot(x), k); fs.writeFileSync(`${out}/${k}.png`, await grab(page)); }
await browser.close(); srv.close();
