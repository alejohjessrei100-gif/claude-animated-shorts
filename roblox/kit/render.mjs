// render.mjs: headless frame render -> MP4 (video only; mux audio after).
// node kit/render.mjs <episode dir> <out.mp4> [--fps 60] [--from F] [--to F]   (frames inclusive; default whole video)
import fs from "node:fs"; import path from "node:path"; import { spawn } from "node:child_process";
import { serve } from "./serve.mjs"; import { openPage } from "./browser.mjs";
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."), ep = path.resolve(args[0]), outp = path.resolve(args[1]);
const fps = Number(opt("--fps", 60));
const { srv, url } = await serve(ROOT);
const { browser, page } = await openPage(`${url}/${path.relative(ROOT, ep)}/ep.html`);
const dur = await page.evaluate(() => window.DURATION), N = Math.round(dur * fps);
const f0 = Number(opt("--from", 0)), f1 = Math.min(N - 1, Number(opt("--to", N - 1)));
const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", String(fps), outp], { stdio: ["pipe", "inherit", "inherit"] });
await page.evaluate((t) => window.frameJPEG(t, 0.5), f0 / fps); // warm-up: objects first shown on a fresh page skip their first frame
const t0 = Date.now();
for (let f = f0; f <= f1; f++) {
  const b64 = await page.evaluate((t) => window.frameJPEG(t, 0.94), f / fps);
  if (!ff.stdin.write(Buffer.from(b64, "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
  if ((f - f0) % 60 === 0) { const el = (Date.now() - t0) / 1000, done = f - f0 + 1; console.log(`frame ${f}/${f1}  ${(el / done).toFixed(2)} s/frame  eta ${((f1 - f) * el / done / 60).toFixed(1)} min`); }
}
ff.stdin.end(); await new Promise((r) => ff.on("close", r));
await browser.close(); srv.close();
console.log(`done ${outp} frames ${f0}-${f1} (${N} total at ${fps} fps, ${dur.toFixed(2)} s)`);
