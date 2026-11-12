// Renders the middle frame of every shot, or the frames you name, to out/SLUG/stills/.
//   node tools/stills.mjs SLUG            node tools/stills.mjs SLUG 12,90,300
// On a machine with no GPU, set GL=swangle first.
import {readFileSync, mkdirSync, rmSync} from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const [slug, list] = process.argv.slice(2);
if (!slug) {
  console.error('usage: node tools/stills.mjs SLUG [frame,frame,...]');
  process.exit(1);
}
const timeline = JSON.parse(readFileSync(`src/videos/${slug}/timeline.json`, 'utf8'));
const frames = list ? list.split(',').map(Number) : timeline.shots.map((s) => Math.floor((s.from + s.to) / 2));
const dir = path.resolve('out', slug, 'stills');
rmSync(dir, {recursive: true, force: true});
mkdirSync(dir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.resolve('src/index.js')});
const chromiumOptions = {gl: process.env.GL ?? 'angle'};
const timeoutInMilliseconds = 120000;
const composition = await selectComposition({serveUrl, id: slug, chromiumOptions, timeoutInMilliseconds});
const start = Date.now();
for (const frame of frames) {
  const output = path.join(dir, `${String(frame).padStart(5, '0')}.png`);
  await renderStill({composition, serveUrl, frame, output, chromiumOptions, timeoutInMilliseconds});
  console.log(output);
}
console.log(`${frames.length} stills in ${((Date.now() - start) / 1000).toFixed(1)} s`);
