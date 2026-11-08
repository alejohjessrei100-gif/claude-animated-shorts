// check.mjs: QA contact sheet: one frame per shot (at u = 0.02 / 0.5 / 0.98 with --all) + the caption word.
// node kit/check.mjs <episode dir> <out dir> [--all] [--times 1.2,3.4]
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { serve } from "./serve.mjs"; import { openPage } from "./browser.mjs";
const args = process.argv.slice(2);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."), ep = path.resolve(args[0]), out = path.resolve(args[1]);
fs.mkdirSync(out, { recursive: true });
const { srv, url } = await serve(ROOT);
const { browser, page } = await openPage(`${url}/${path.relative(ROOT, ep)}/ep.html`);
const shots = await page.evaluate(() => window.SHOT_TIMES);
let jobs = [];
const ti = args.indexOf("--times");
if (ti >= 0) jobs = args[ti + 1].split(",").map((x, i) => [Number(x), `t${x}`]);
else shots.forEach(([a, b, name, word], i) => { const us = args.includes("--all") ? [0.02, 0.5, 0.98] : [0.5]; for (const u of us) jobs.push([a + (b - a) * u, `s${String(i).padStart(2, "0")}_${Math.round(u * 100)}_${name || word}`]); });
const list = [];
for (const [t, name] of jobs) { const f = `${out}/${name.replace(/[^\w.-]/g, "")}.jpg`; await page.evaluate((x) => window.frameJPEG(x, 0.5), t); /* warm-up render */ fs.writeFileSync(f, Buffer.from(await page.evaluate((x) => window.frameJPEG(x, 0.85), t), "base64")); list.push([f, `${t.toFixed(2)}s ${name}`]); }
await browser.close(); srv.close();
fs.writeFileSync(`${out}/list.json`, JSON.stringify(list));
execFileSync("python3", [path.join(ROOT, "kit/sheet.py"), `${out}/list.json`, `${out}/sheet`], { stdio: "inherit" });
