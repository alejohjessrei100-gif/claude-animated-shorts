// Effect cards and painted textures for "The Gimli Glider" (ink style of toon.ts: plum ink, flat fills, no text).
import * as THREE from "three";
import { Pen, INK } from "./toon";
import { ctex, rng } from "./paint";

type P2 = [number, number];
const ring = (cx: number, cy: number, rx: number, ry: number, n = 48, a0 = 0, a1 = Math.PI * 2): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });

/** cast-iron weight (kettlebell-style) on a 400 x 400 canvas; s = size 0..1 of the canvas, ghost = outline only */
export const fxWeight = (p: Pen, s: number, ghost = false) => {
  const cx = 200, base = 380, r = 175 * s, top = base - 2 * r;
  const body: P2[] = [[cx - r * 0.95, base], [cx + r * 0.95, base], ...ring(cx, base - r, r, r, 40, 0.15 * Math.PI, -1.15 * Math.PI).slice(1, -1).reverse()];
  const handle = ring(cx, top + 0.15 * r, 0.62 * r, 0.62 * r, 30, Math.PI, 2 * Math.PI);
  if (ghost) {
    p.poly(body, null, 10 * s + 3);
    p.stroke(handle, 10 * s + 3);
    return;
  }
  p.stroke(handle, 34 * s + 6, INK);
  p.stroke(handle, 22 * s + 3, "#4a4e5a");
  p.poly(body, "#4a4e5a", 12 * s + 3);
  p.ell(cx - 0.35 * r, base - 1.25 * r, 0.22 * r, 0.32 * r, "#6f7484", 0, 0, 360, -25);
};

/** cut-away fuel tank in a wing (flat card, 600 x 360): metal frame, fuel at `level` (0..1) with a gentle slosh,
 *  dashed line where the fuel should reach */
export const fxTank = (p: Pen, level: number, wob: number) => {
  const x0 = 40, x1 = 560, y0 = 40, y1 = 320, w = x1 - x0, h = y1 - y0;
  p.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], "#2a2f3e", 12);
  const yl = y1 - h * level;
  const surf: P2[] = Array.from({ length: 21 }, (_, i) => [x0 + (w * i) / 20, yl + 9 * Math.sin(i * 0.7 + wob)] as P2);
  p.poly([...surf, [x1, y1], [x0, y1]], "#f2a03a", 0);
  p.poly(surf.map(([x, y]) => [x, y + 10] as P2).concat([[x1, y1], [x0, y1]]), "#e07f22", 0);
  p.line(surf, "#ffd27a", 8, false);
  const yn = y0 + 0.08 * h; // where it should be: full
  for (let x = x0 + 20; x < x1 - 30; x += 56) p.stroke([[x, yn], [x + 30, yn]], 8, "#ffffff");
  for (const [bx, by] of [[x0 + 14, y0 + 14], [x1 - 14, y0 + 14], [x0 + 14, y1 - 14], [x1 - 14, y1 - 14]]) p.dot(bx, by, 7, "#9aa2ad");
  p.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], null, 12);
};

/** thought bubble with a little sailplane (500 x 400) */
export const fxGlider = (p: Pen, t: number) => {
  for (const [x, y, r] of [[70, 370, 14], [110, 330, 22]] as const) p.ell(x, y, r, r, "#ffffff", 7);
  const cloud: P2[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2, bump = 1 + 0.09 * Math.cos(a * 7);
    cloud.push([280 + 195 * bump * Math.cos(a), 170 + 135 * bump * Math.sin(a)]);
  }
  p.poly(cloud, "#ffffff", 9);
  const dy = 8 * Math.sin(t * 3), cx = 280, cy = 170 + dy;
  p.line([[cx - 150, cy + 8], [cx + 150, cy - 6]], "#f2f2f4", 16); // long thin wing
  p.stroke([[cx - 150, cy + 8], [cx + 150, cy - 6]], 5);
  p.poly([[cx - 60, cy - 6], [cx + 70, cy - 12], [cx + 85, cy - 2], [cx + 70, cy + 10], [cx - 60, cy + 12], [cx - 105, cy + 4]], "#f2f2f4", 6);
  p.poly([[cx + 40, cy - 11], [cx + 72, cy - 12], [cx + 62, cy - 26]], "#7fc4f0", 5); // canopy
  p.poly([[cx - 100, cy + 2], [cx - 120, cy - 40], [cx - 96, cy - 40], [cx - 82, cy + 2]], "#e2453c", 6); // fin
  p.stroke([[cx - 128, cy - 4], [cx - 84, cy - 6]], 6);
};

/** sparks fanning from a scrape point (500 x 300, origin bottom-centre); t animates */
export const fxSparks = (p: Pen, t: number, seed = 1) => {
  const r = rng(seed + Math.floor(t * 30) * 7);
  for (let i = 0; i < 16; i++) {
    const a = Math.PI * (0.06 + 0.88 * r()), L = 60 + 190 * r(), s = 40 + 40 * r();
    const x0 = 250 + Math.cos(a) * s * 0.3, y0 = 290 - Math.sin(a) * s * 0.3, x1 = 250 + Math.cos(a) * L, y1 = 290 - Math.sin(a) * L * 0.9;
    p.line([[x0, y0], [x1, y1]], i % 3 ? "#ffd84a" : "#fff7c2", 7 + 5 * r(), false);
  }
  p.ell(250, 285, 60, 22, "#fff3b0", 0);
};

/** dust / smoke puff (300 x 300), u = age 0..1 */
export const fxDust = (p: Pen, u: number, col = "#c9b49a") => {
  const s = 0.45 + 0.55 * u, a = Math.max(0, 1 - u);
  p.g.globalAlpha = a;
  for (const [x, y, r] of [[110, 190, 70], [170, 170, 80], [200, 210, 60], [140, 130, 60]] as const) p.ell(150 + (x - 150) * s, 150 + (y - 150) * s, r * s, r * s * 0.85, col, 0);
  p.g.globalAlpha = 1;
};

/** confetti (400 x 400): flakes falling and flipping; t in seconds */
export const fxConfetti = (p: Pen, t: number, seed: number) => {
  const r = rng(seed), cols = ["#e2453c", "#f2c14e", "#3f8fd0", "#5fae6a", "#c86fb0", "#ffffff"];
  for (let i = 0; i < 26; i++) {
    const x = 400 * r(), y0 = 400 * r(), sp = 60 + 60 * r(), y = (y0 + sp * t) % 400, w = 10 + 8 * r(), flip = Math.abs(Math.cos(t * (3 + 4 * r()) + i));
    p.poly([[x - w, y - w * 0.5 * flip], [x + w, y - w * 0.5 * flip], [x + w, y + w * 0.5 * flip], [x - w, y + w * 0.5 * flip]], cols[i % 6], 0);
  }
};

/** red master-warning light (200 x 200) */
export const fxWarn = (p: Pen, on: boolean) => {
  p.ell(100, 100, 80, 80, on ? "#ff3b30" : "#5a1e22", 10);
  if (on) p.ell(80, 78, 26, 18, "#ffb3a8", 0);
};

// ---------------- painted textures ----------------
/** jet fuselage skin. Lathe uv: u around the body (0 = top, .25 = left side, .5 = belly, .75 = right side), v nose(1) -> tail(0).
 *  White crown, grey belly, a red cheat line under the window rows, cockpit glass at the nose. No livery, no logo. */
export const fuselageTex = () => ctex("fuselage", 1024, 2048, (g) => {
  const W = 1024, Hh = 2048;
  g.fillStyle = "#f4f4f2"; g.fillRect(0, 0, W, Hh);
  g.fillStyle = "#b9bec8"; g.fillRect(W * 0.38, 0, W * 0.24, Hh); // belly
  for (const side of [0.25, 0.75]) {
    const cx = side * W, dir = side < 0.5 ? 1 : -1; // toward the belly
    g.fillStyle = "#d8312f"; g.fillRect(cx + dir * 40 - 18, Hh * 0.1, 36, Hh * 0.76); // cheat line
    g.fillStyle = "#2b3346";
    for (let y = Hh * 0.18; y < Hh * 0.8; y += 34) { g.beginPath(); g.ellipse(cx - dir * 6, y, 9, 12, 0, 0, Math.PI * 2); g.fill(); } // windows
    for (const y of [Hh * 0.2, Hh * 0.55, Hh * 0.82]) { g.fillStyle = "#c9cdd4"; g.fillRect(cx - dir * 6 - 22, y - 36, 44, 72); g.strokeStyle = "#7d828c"; g.lineWidth = 4; g.strokeRect(cx - dir * 6 - 22, y - 36, 44, 72); } // doors
  }
  // cockpit glass: a dark band wrapping the upper nose
  g.fillStyle = "#1f2638";
  g.fillRect(0, Hh * 0.088, W * 0.38, Hh * 0.02); g.fillRect(W * 0.62, Hh * 0.088, W * 0.38, Hh * 0.02);
  g.strokeStyle = "#f4f4f2"; g.lineWidth = 6;
  for (const x of [0.06, 0.18, 0.3, 0.7, 0.82, 0.94]) { g.beginPath(); g.moveTo(W * x, Hh * 0.088); g.lineTo(W * x, Hh * 0.108); g.stroke(); }
  // panel seams
  g.strokeStyle = "rgba(90,96,110,0.35)"; g.lineWidth = 2;
  for (let y = Hh * 0.08; y < Hh; y += Hh * 0.06) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
});
/** runway asphalt with a painted centre line and edge stripes (tiled along z every 60 m; u across 46 m) */
export const runwayTex = () => {
  const t = ctex("runway", 1024, 1024, (g, r) => {
    g.fillStyle = "#5d5f66"; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 2600; i++) { const v = 80 + r() * 30; g.fillStyle = `rgba(${v},${v + 2},${v + 8},0.35)`; g.fillRect(r() * 1024, r() * 1024, 3 + r() * 5, 3 + r() * 5); }
    for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(40,42,48,${0.12 + r() * 0.1})`; g.fillRect(r() * 1024, 0, 18 + r() * 40, 1024); } // tyre marks
    g.fillStyle = "#e9e6dc";
    g.fillRect(16, 0, 18, 1024); g.fillRect(1024 - 34, 0, 18, 1024); // edges
    for (let y = 40; y < 1024; y += 340) g.fillRect(256 - 7, y, 14, 200); // drag lane lines (left half)
    for (let y = 40; y < 1024; y += 340) g.fillRect(768 - 7, y, 14, 200);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16;
  return t;
};
/** cockpit screens: lit (green/amber lines on dark blue) or dead (black glass with a faint reflection) */
export const screenTex = (on: boolean, seed: number) => ctex(`screen${on ? 1 : 0}_${seed}`, 256, 256, (g) => {
  g.fillStyle = on ? "#0f1f3a" : "#07080b"; g.fillRect(0, 0, 256, 256);
  if (on) {
    g.strokeStyle = "#5fe08a"; g.lineWidth = 6;
    g.beginPath(); g.arc(128, 140, 80, Math.PI, 2 * Math.PI); g.stroke();
    g.strokeStyle = "#f2b233"; g.beginPath(); g.moveTo(128, 140); g.lineTo(128 + 70 * Math.cos(-2.2 + seed), 140 + 70 * Math.sin(-2.2 + seed)); g.stroke();
    g.fillStyle = "#5fe08a"; for (let i = 0; i < 4; i++) g.fillRect(40 + i * 48, 200, 30, 10);
    g.strokeStyle = "#7fd6ff"; g.lineWidth = 4; g.beginPath(); g.moveTo(20, 60 + seed * 10); g.lineTo(236, 50 + seed * 14); g.stroke();
  } else {
    const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, "rgba(120,130,150,0.18)"); gr.addColorStop(0.4, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
});
/** sea of cloud tops seen from above (alpha cut-out, tiled), drawn with the light's cloud palette */
export const cloudSeaTex = (pal: { lit: string; mid: string; shade: string }, seed: number) => {
  const t = ctex(`cloudSea_${pal.lit}_${seed}`, 1024, 1024, (g, r) => {
    for (let pass = 0; pass < 3; pass++) {
      const col = [pal.shade, pal.mid, pal.lit][pass];
      for (let i = 0; i < 70; i++) {
        const x = r() * 1024, y = r() * 1024, rad = (60 + r() * 90) * (1 - pass * 0.22);
        for (const dx of [-1024, 0, 1024]) for (const dy of [-1024, 0, 1024]) {
          g.fillStyle = col; g.beginPath(); g.ellipse(x + dx + pass * 6, y + dy - pass * 10, rad, rad * 0.8, 0, 0, Math.PI * 2); g.fill();
        }
      }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16;
  return t;
};
