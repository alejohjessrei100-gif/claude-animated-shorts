// node kit/test/avatar_stills.mjs out/avatar  -> stage PNGs + contact sheets for the avatar build order
import fs from "node:fs";
import path from "node:path";
import { serve } from "../serve.mjs";
import { openPage, grab } from "../browser.mjs";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../.."), out = path.resolve(process.argv[2] ?? "out/avatar");
fs.mkdirSync(out, { recursive: true });
const { srv, url } = await serve(ROOT);
const { browser, page } = await openPage(`${url}/kit/test/avatar.html`);
const save = async (name, kind, arg) => { const t = Date.now(); await page.evaluate(([k, a]) => window.shot(k, a), [kind, arg]); fs.writeFileSync(`${out}/${name}.png`, await grab(page)); console.log(name, Date.now() - t, "ms"); };
await save("1_grey", "grey");
await save("2_colors", "colors");
const faces = ["smile", "grin", "happy", "laugh", "shock", "surprised", "sad", "cry", "angry", "worried", "smirk", "wink", "sleepy", "determined", "nervous", "sneeze", "love", "dizzy", "proud", "neutral"];
for (const f of faces) await save(`3_face_${f}`, "face", [f, false]);
await save("3_face_talk", "face", ["smile", true]);
const poses = [["idle", "smile"], ["talk", "grin"], ["point", "determined"], ["wave", "happy"], ["armsUp", "laugh"], ["kick", "angry"], ["sneeze", "sneeze"], ["shrug", "neutral"], ["hug", "love"], ["climb", "determined"], ["sit", "sleepy"], ["lookUp", "surprised"], ["duck", "nervous"], ["facepalm", "sad"], ["cheer", "laugh"], ["think", "smirk"], ["scared", "shock"], ["sad", "cry"]];
for (const [p, f] of poses) await save(`4_pose_${p}`, "pose", [p, f]);
await browser.close(); srv.close();
