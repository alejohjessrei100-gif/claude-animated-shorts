// 50_runtime.js: boots an episode page. The episode module exports { build(ctx), update(ctx, t), SHOTS }.
// Renders the 3D scene into a WebGL canvas, composites it + the one-word caption into a 2D canvas, and exposes
// window.frameJPEG(t) for render.mjs / check.mjs, window.DURATION, window.SHOT_TIMES and window.READY.
import * as THREE from "three";
import { makeCore, W, H } from "./10_core.js";
import { timeline, shotAt, camPose, applyCam, wordAt, drawCaption } from "./40_cam.js";

export async function boot(ep, { words: wordsUrl, tail = 0.45, captions = true } = {}) {
  const gl = document.createElement("canvas"); gl.width = W; gl.height = H;
  const out = document.getElementById("c"); out.width = W; out.height = H;
  const g = out.getContext("2d");
  const font = new FontFace("Poppins", "url(/node_modules/@fontsource/poppins/files/poppins-latin-800-normal.woff2)", { weight: "800" });
  await font.load(); document.fonts.add(font);
  const words = await (await fetch(wordsUrl)).json();
  const total = words[words.length - 1].end + tail;
  const core = makeCore({ canvas: gl, ...(ep.coreOpts ?? {}) });
  const ctx = { THREE, core, scene: core.scene, camera: core.camera, words, total, W: (word) => words.findIndex((w) => w.word.toLowerCase().replace(/[^a-z']/g, "") === word) };
  await ep.build(ctx);
  const tl = timeline(ep.SHOTS(ctx), words, total);
  ctx.tl = tl;
  const render = (t) => {
    const s = shotAt(tl, t);
    ctx.shot = s;
    ep.update(ctx, t, s);
    const p = camPose(s, t); applyCam(core.camera, p);
    core.followShadow(p.tgt.clone().setY(0));
    if (ep.beforeRender) ep.beforeRender(ctx, t, s);
    core.render();
    g.filter = s.filter ?? "none"; g.drawImage(gl, 0, 0); g.filter = "none";
    if (ep.overlay) ep.overlay(ctx, g, t, s);
    if (captions) drawCaption(g, wordAt(words, t)?.word);
  };
  window.renderAt = render;
  window.frameJPEG = (t, q = 0.93) => { render(t); return out.toDataURL("image/jpeg", q).split(",")[1]; };
  window.DURATION = total;
  window.SHOT_TIMES = tl.map((s) => [s.t0, s.t1, s.name ?? "", words[s.w]?.word ?? ""]);
  window.READY = true;
}
