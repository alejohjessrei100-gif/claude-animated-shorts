// Effect cards and painted textures for "Why Toast Lands Butter-Side Down" (plum ink, flat fills, no words).
import * as THREE from "three";
import { Pen, INK } from "./toon";
import { ctex, rng } from "./paint";

type P2 = [number, number];
const ring = (cx: number, cy: number, rx: number, ry: number, n = 48, a0 = 0, a1 = Math.PI * 2): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });

/** butter splat seen from above (flat card, 400 x 400): a spiky yellow star with droplets, u = 0..1 grows in */
export const fxSplat = (p: Pen, u: number, col = "#f7d35a") => {
  const r = rng(7), s = 0.35 + 0.65 * Math.min(1, u * 1.6);
  const pts: P2[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, R = (i % 2 ? 95 : 150 + 40 * r()) * s;
    pts.push([200 + Math.cos(a) * R, 200 + Math.sin(a) * R]);
  }
  p.poly(pts, col, 7);
  for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, d = (165 + 25 * r()) * s; p.ell(200 + Math.cos(a) * d, 200 + Math.sin(a) * d, 13 * s, 13 * s, col, 5); }
};
/** impact star / "pow" burst (upright card, 500 x 500) */
export const fxPow = (p: Pen, u: number, col = "#fff3b0") => {
  const s = 0.5 + 0.5 * Math.min(1, u * 2), a = Math.max(0, 1 - u);
  p.g.globalAlpha = Math.min(1, a * 1.6);
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 + 0.2, r0 = 70 * s, r1 = (200 + (i % 2) * 40) * s;
    p.line([[250 + Math.cos(ang) * r0, 250 + Math.sin(ang) * r0], [250 + Math.cos(ang) * r1, 250 + Math.sin(ang) * r1]], col, 16, true);
  }
  p.g.globalAlpha = 1;
};
/** speed lines streaming behind a fast object (500 x 200), lines run along x */
export const fxSpeed = (p: Pen, seed: number) => {
  const r = rng(seed);
  for (let i = 0; i < 9; i++) { const y = 20 + r() * 160, x0 = r() * 120, x1 = 260 + r() * 220; p.line([[x0, y], [x1, y]], "#ffffff", 8 + r() * 6, true); }
};
/** sparkles (300 x 300), t animates the twinkle */
export const fxSparkle = (p: Pen, t: number) => {
  const r = rng(3);
  for (let i = 0; i < 6; i++) {
    const x = 40 + r() * 220, y = 40 + r() * 220, s = (18 + r() * 26) * (0.55 + 0.45 * Math.abs(Math.sin(t * 6 + i * 1.7)));
    p.poly([[x, y - s], [x + s * 0.28, y - s * 0.28], [x + s, y], [x + s * 0.28, y + s * 0.28], [x, y + s], [x - s * 0.28, y + s * 0.28], [x - s, y], [x - s * 0.28, y - s * 0.28]], "#fff6c2", 5);
  }
};
/** curved spin arrow around an object (400 x 400), sweep 0..1 */
export const fxSpin = (p: Pen, sweep: number, col = "#ffffff") => {
  const a0 = -Math.PI * 0.75, a1 = a0 + Math.PI * 1.5 * Math.max(0.05, sweep);
  const arc = ring(200, 200, 150, 150, 40, a0, a1);
  p.line(arc, col, 22, true);
  const [x, y] = arc[arc.length - 1], ang = a1 + Math.PI / 2;
  const tip = (dx: number, dy: number): P2 => [x + Math.cos(ang) * dx - Math.sin(ang) * dy, y + Math.sin(ang) * dx + Math.cos(ang) * dy];
  p.poly([tip(40, 0), tip(-10, -34), tip(-10, 34)], col, 7);
};
/** dashed arc showing the path of a falling, turning slice (side view, 500 x 600): from the table edge down */
export const fxPath = (p: Pen, u: number) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 30; i++) { const t = (i / 30) * u; pts.push([60 + 220 * t, 40 + 520 * t * t]); }
  for (let i = 0; i + 1 < pts.length; i += 2) p.line([pts[i], pts[i + 1]], "#ffffff", 9, false);
};
/** question / exclamation over a head (200 x 260) */
export const fxMark = (p: Pen, kind: "?" | "!") => {
  if (kind === "!") { p.line([[100, 30], [100, 170]], "#ffffff", 30, true); p.ell(100, 220, 18, 18, "#ffffff", 7); return; }
  p.line([[60, 80], [70, 40], [110, 25], [148, 48], [150, 90], [110, 120], [100, 160]], "#ffffff", 26, true);
  p.ell(100, 220, 18, 18, "#ffffff", 7);
};
/** sweat drop (120 x 160) */
export const fxDrop = (p: Pen) => p.poly([[60, 10], [100, 95], [92, 130], [60, 150], [28, 130], [20, 95]], "#9fd4ff", 7);
/** dust / smoke puff (300 x 300), u = age 0..1 */
export const fxDust = (p: Pen, u: number, col = "#d9d2c4") => {
  const s = 0.45 + 0.55 * u, a = Math.max(0, 1 - u);
  p.g.globalAlpha = a;
  for (const [x, y, r] of [[110, 190, 70], [170, 170, 80], [200, 210, 60], [140, 130, 60]] as const) p.ell(150 + (x - 150) * s, 150 + (y - 150) * s, r * s, r * s * 0.85, col, 0);
  p.g.globalAlpha = 1;
};
/** coin face (200 x 200): heads (a profile bump) or tails (a crown-ish mark) */
export const fxCoin = (p: Pen, heads: boolean) => {
  p.ell(100, 100, 88, 88, "#f2c84b", 9); p.ell(100, 100, 68, 68, null, 4);
  if (heads) { p.ell(108, 92, 30, 38, "#e0b23a", 5); p.ell(92, 128, 22, 14, "#e0b23a", 5); }
  else p.poly([[60, 120], [70, 72], [88, 100], [100, 62], [112, 100], [130, 72], [140, 120]], "#e0b23a", 5);
};
/** music-free "ding" ring for the scale stopping (300 x 300) */
export const fxRing = (p: Pen, u: number) => { p.g.globalAlpha = Math.max(0, 1 - u); p.ell(150, 150, 60 + 80 * u, 60 + 80 * u, null, 10); p.g.globalAlpha = 1; };

// ---------------- painted textures ----------------
const rep = (t: THREE.Texture, x: number, y: number) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); t.anisotropy = 16; return t; };
/** kitchen floor: big checker tiles with soft grout */
export const checkerTex = () => rep(ctex("checker", 512, 512, (g, r) => {
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const v = (x + y) % 2 ? 232 + r() * 10 : 70 + r() * 10;
    g.fillStyle = (x + y) % 2 ? `rgb(${v},${v - 6},${v - 18})` : `rgb(${v + 20},${v + 26},${v + 60})`;
    g.fillRect(x * 128, y * 128, 128, 128);
  }
  g.fillStyle = "rgba(60,50,60,0.35)"; for (let i = 0; i <= 4; i++) { g.fillRect(i * 128 - 2, 0, 4, 512); g.fillRect(0, i * 128 - 2, 512, 4); }
}), 1, 1);
/** white subway tiles (kitchen splashback) */
export const subwayTex = () => rep(ctex("subway", 512, 512, (g, r) => {
  g.fillStyle = "#c9cdd2"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) for (let c = -1; c < 9; c++) {
    const x = c * 64 + (row % 2) * 32, y = row * 32, v = 236 + r() * 14;
    g.fillStyle = `rgb(${v},${v},${v - 4})`; g.fillRect(x + 2, y + 2, 60, 28);
    g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(x + 6, y + 5, 30, 4);
  }
}), 1, 1);
/** painted plaster wall with faint mottling */
export const plasterTex = (key: string, col: string) => rep(ctex("plaster" + key, 512, 512, (g, r) => {
  g.fillStyle = col; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},0.035)`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 50, 12 + r() * 30, r() * 3, 0, Math.PI * 2); g.fill(); }
}), 1, 1);
/** wooden floor boards */
export const boardsTex = (col = "#a8723f") => rep(ctex("boards" + col, 512, 512, (g, r) => {
  const base = new THREE.Color(col);
  for (let i = 0; i < 8; i++) {
    const c = base.clone().offsetHSL(0, 0, (r() - 0.5) * 0.08);
    g.fillStyle = `#${c.getHexString()}`; g.fillRect(i * 64, 0, 64, 512);
    g.fillStyle = "rgba(40,20,10,0.55)"; g.fillRect(i * 64, 0, 3, 512);
    const cut = r() * 512; g.fillRect(i * 64, cut, 64, 3);
    for (let k = 0; k < 6; k++) { g.strokeStyle = "rgba(60,30,10,0.18)"; g.lineWidth = 2; g.beginPath(); const x = i * 64 + 8 + r() * 48; g.moveTo(x, 0); g.bezierCurveTo(x + 6, 170, x - 6, 340, x + 4, 512); g.stroke(); }
  }
}), 1, 1);
/** chalkboard with chalk drawings: toast tumbling off a table with a dashed arc, spin arrows, a coin, a stick figure (no words) */
export const chalkboardTex = () => ctex("chalkboard", 1024, 512, (g, r) => {
  g.fillStyle = "#24443a"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 200; i++) { g.fillStyle = "rgba(255,255,255,0.03)"; g.fillRect(r() * 1024, r() * 512, 40 + r() * 80, 8); }
  g.strokeStyle = "rgba(240,240,230,0.85)"; g.lineWidth = 6; g.lineCap = "round";
  const line = (pts: number[][]) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); };
  line([[80, 300], [330, 300]]); line([[110, 300], [110, 460]]); line([[300, 300], [300, 460]]); // table
  g.setLineDash([14, 14]); g.beginPath(); g.moveTo(330, 290); g.quadraticCurveTo(470, 300, 520, 470); g.stroke(); g.setLineDash([]);
  for (const [x, y, a] of [[340, 280, 0.2], [430, 330, 1.2], [500, 420, 2.6]]) { g.save(); g.translate(x, y); g.rotate(a); g.strokeRect(-28, -6, 56, 12); g.restore(); }
  g.beginPath(); g.arc(700, 190, 70, -2.4, 1.6); g.stroke(); line([[700 + 70 * Math.cos(1.6), 190 + 70 * Math.sin(1.6)], [690, 290], [730, 268]]); // spin arrow
  g.beginPath(); g.arc(880, 380, 50, 0, Math.PI * 2); g.stroke(); // coin
  g.beginPath(); g.arc(880, 120, 26, 0, Math.PI * 2); g.stroke(); line([[880, 146], [880, 240]]); line([[880, 170], [840, 210]]); line([[880, 170], [920, 210]]); line([[880, 240], [850, 300]]); line([[880, 240], [910, 300]]);
  line([[600, 420], [640, 380], [680, 420]]); line([[600, 470], [690, 470]]);
  g.fillStyle = "#c9b08a"; g.fillRect(0, 490, 1024, 22); // chalk tray
});
/** bookshelf face: rows of coloured spines */
export const booksTex = () => ctex("books", 512, 1024, (g, r) => {
  g.fillStyle = "#6b4426"; g.fillRect(0, 0, 512, 1024);
  const cols = ["#b5423a", "#2f5f9a", "#e2b64a", "#3f7a4a", "#7a4a8a", "#d9824a", "#e8e0cf", "#2a3346"];
  for (let shelf = 0; shelf < 5; shelf++) {
    const y1 = 190 + shelf * 200; let x = 14;
    g.fillStyle = "#4a2c18"; g.fillRect(0, y1, 512, 18);
    while (x < 490) {
      const w = 16 + r() * 22, h = 110 + r() * 60, c = cols[Math.floor(r() * cols.length)];
      g.fillStyle = c; g.fillRect(x, y1 - h, w, h);
      g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x + 3, y1 - h + 14, w - 6, 5); g.fillRect(x + 3, y1 - 28, w - 6, 5);
      x += w + 2;
      if (r() < 0.08) x += 30;
    }
  }
});
/** classroom poster: a solar system or a world map (pictures only) */
export const posterTex = (kind: number) => ctex("poster" + kind, 256, 340, (g, r) => {
  g.fillStyle = kind ? "#1c2a5a" : "#f2ead6"; g.fillRect(0, 0, 256, 340);
  g.strokeStyle = "#2a2230"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 332);
  if (kind) { g.fillStyle = "#ffd25a"; g.beginPath(); g.arc(40, 170, 44, 0, 7); g.fill(); const cs = ["#c96f4a", "#d9b06a", "#4a8ad9", "#d9624a", "#e2c48a"]; cs.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(100 + i * 32, 170 + (i % 2 ? -30 : 30), 8 + (i % 3) * 5, 0, 7); g.fill(); }); }
  else { g.fillStyle = "#7fb7e0"; g.fillRect(20, 40, 216, 260); g.fillStyle = "#6fae5a"; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(40 + r() * 176, 60 + r() * 220, 18 + r() * 34, 12 + r() * 26, r() * 3, 0, 7); g.fill(); } }
});
/** checked tablecloth */
export const clothTex = () => rep(ctex("cloth", 256, 256, (g) => {
  g.fillStyle = "#f6f1e6"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(214,60,60,0.55)"; for (let i = 0; i < 8; i += 2) { g.fillRect(i * 32, 0, 32, 256); g.fillRect(0, i * 32, 256, 32); }
}), 3, 2);
/** toast faces: crumb (with a toasted rim), butter on top, or a drawn letter */
export const toastTex = (kind: "crumb" | "butter" | "B") => ctex("toast_" + kind, 256, 256, (g, r) => {
  const crumbCol = kind === "butter" ? "#f2cf5a" : "#e9c48a";
  g.fillStyle = "#b8743a"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = crumbCol; g.beginPath(); g.roundRect(18, 18, 220, 220, 40); g.fill();
  for (let i = 0; i < 220; i++) { g.fillStyle = kind === "butter" ? "rgba(255,240,170,0.5)" : "rgba(170,110,50,0.35)"; g.beginPath(); g.ellipse(30 + r() * 196, 30 + r() * 196, 2 + r() * 4, 1.5 + r() * 3, r() * 3, 0, 7); g.fill(); }
  if (kind === "butter") { g.fillStyle = "rgba(255,248,200,0.8)"; g.beginPath(); g.ellipse(110, 100, 60, 28, -0.4, 0, 7); g.fill(); }
  if (kind === "B") { g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(96, 60); g.lineTo(96, 196); g.moveTo(96, 60); g.bezierCurveTo(190, 60, 190, 126, 96, 126); g.moveTo(96, 126); g.bezierCurveTo(205, 126, 205, 196, 96, 196); g.stroke(); }
});
/** night window: deep blue with stars and a moon (emissive) */
export const nightWindowTex = () => ctex("nightWin", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#0e1438"); gr.addColorStop(1, "#2c3a7a"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) { g.fillStyle = "rgba(255,255,230,0.8)"; g.fillRect(r() * 512, r() * 380, 2 + r() * 2, 2 + r() * 2); }
  g.fillStyle = "#fff4cf"; g.beginPath(); g.arc(360, 140, 52, 0, 7); g.fill();
  g.fillStyle = "#1a2350"; for (let i = 0; i < 9; i++) { const x = i * 64; g.fillRect(x, 400 - r() * 90, 56, 200); }
  g.fillStyle = "#ffd27a"; for (let i = 0; i < 14; i++) g.fillRect(r() * 512, 340 + r() * 140, 8, 10);
});
/** day window view: sky, a garden hedge and trees (painted, used behind glassless windows) */
export const dayWindowTex = () => ctex("dayWin", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#5e93d9"); gr.addColorStop(0.7, "#b8d0ec"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#ffffff"; for (const [x, y] of [[90, 90], [330, 140]]) for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 34, y + (k % 2) * 8, 40, 26, 0, 0, 7); g.fill(); }
  g.fillStyle = "#4c9a37"; for (let i = 0; i < 8; i++) { g.beginPath(); g.ellipse(i * 70 + r() * 20, 380 + r() * 30, 60, 70, 0, 0, 7); g.fill(); }
  g.fillStyle = "#69b545"; g.fillRect(0, 430, 512, 82);
});

// ================= pigeon short additions =================
/** the screen image the birds peck at: an enemy ship on the sea, seen from above-ahead (large, so it can drift) */
export const shipScreenTex = () => ctex("shipScreen", 512, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#9fd0e8"); gr.addColorStop(0.42, "#cfe6f0"); gr.addColorStop(0.43, "#2f6fa0"); gr.addColorStop(1, "#1d4a78");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#4a4f5c"; g.beginPath(); g.moveTo(170, 300); g.lineTo(350, 300); g.lineTo(330, 330); g.lineTo(190, 330); g.closePath(); g.fill(); // hull
  g.fillRect(230, 262, 50, 38); g.fillRect(250, 236, 12, 26); g.fillRect(205, 280, 22, 20); g.fillRect(292, 280, 26, 20); // superstructure
  g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(150, 332, 220, 5);
});
/** crosshair overlay for a screen (transparent) */
export const crossTex = () => ctex("crosshair", 256, 256, (g) => {
  g.strokeStyle = "rgba(255,80,60,0.95)"; g.lineWidth = 7;
  g.beginPath(); g.arc(128, 128, 40, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(128, 70); g.lineTo(128, 106); g.moveTo(128, 150); g.lineTo(128, 186); g.moveTo(70, 128); g.lineTo(106, 128); g.moveTo(150, 128); g.lineTo(186, 128); g.stroke();
});
/** chalkboard: pigeon, a glide bomb with a lens, arrows, a seed (no words) */
export const pigeonChalkTex = () => ctex("pigeonChalk", 1024, 512, (g, r) => {
  g.fillStyle = "#24443a"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 200; i++) { g.fillStyle = "rgba(255,255,255,0.03)"; g.fillRect(r() * 1024, r() * 512, 40 + r() * 80, 8); }
  g.strokeStyle = "rgba(240,240,230,0.85)"; g.lineWidth = 6; g.lineCap = "round";
  g.beginPath(); g.ellipse(200, 260, 90, 60, -0.1, 0, 7); g.stroke(); g.beginPath(); g.arc(285, 180, 38, 0, 7); g.stroke(); // pigeon
  g.beginPath(); g.moveTo(320, 180); g.lineTo(355, 192); g.lineTo(320, 198); g.stroke(); g.beginPath(); g.moveTo(110, 270); g.lineTo(60, 300); g.stroke();
  g.beginPath(); g.ellipse(640, 250, 210, 52, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(430, 250, 30, 0, 7); g.stroke(); // bomb + lens
  g.beginPath(); g.moveTo(820, 210); g.lineTo(880, 160); g.moveTo(820, 290); g.lineTo(880, 340); g.stroke();
  g.setLineDash([14, 12]); g.beginPath(); g.moveTo(430, 250); g.lineTo(540, 250); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.moveTo(560, 400); g.quadraticCurveTo(640, 340, 720, 400); g.stroke(); g.beginPath(); g.moveTo(705, 385); g.lineTo(722, 402); g.lineTo(700, 410); g.stroke();
  g.beginPath(); g.ellipse(900, 420, 16, 10, 0.4, 0, 7); g.stroke(); // seed
  g.fillStyle = "#c9b08a"; g.fillRect(0, 490, 1024, 22);
});
/** war-room map: ocean with coasts, convoy tokens, grid (no words) */
export const mapTex = () => ctex("warMap", 1024, 640, (g, r) => {
  g.fillStyle = "#3f7aa6"; g.fillRect(0, 0, 1024, 640);
  g.strokeStyle = "rgba(255,255,255,0.15)"; g.lineWidth = 2; for (let x = 0; x < 1024; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 640); g.stroke(); } for (let y = 0; y < 640; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  g.fillStyle = "#d9c08a"; g.strokeStyle = "#6b5a3a"; g.lineWidth = 5;
  for (const [cx, cy, rx, ry] of [[120, 120, 200, 140], [900, 520, 260, 200], [820, 80, 180, 90]]) { g.beginPath(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2, k = 1 + 0.18 * Math.sin(a * 5 + cx) + 0.08 * Math.sin(a * 11); g.lineTo(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k); } g.fill(); g.stroke(); }
  for (let i = 0; i < 9; i++) { g.fillStyle = i % 3 ? "#2a2f3a" : "#b5423a"; g.fillRect(380 + r() * 300, 220 + r() * 260, 26, 12); }
  g.strokeStyle = "#f2c14e"; g.setLineDash([16, 12]); g.beginPath(); g.moveTo(300, 500); g.quadraticCurveTo(520, 300, 690, 330); g.stroke(); g.setLineDash([]);
});
/** red stage curtain with folds */
export const curtainTex = () => { const t = ctex("curtain", 512, 512, (g) => {
  for (let x = 0; x < 512; x++) { const k = 0.55 + 0.45 * Math.cos((x / 512) * Math.PI * 16); g.fillStyle = `rgb(${Math.round(120 + 80 * k)},${Math.round(18 + 20 * k)},${Math.round(30 + 20 * k)})`; g.fillRect(x, 0, 1, 512); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
/** a rack of pigeon cages (bars over shadowed boxes, a few birds' shapes inside) */
export const cagesTex = () => ctex("cages", 512, 512, (g, r) => {
  g.fillStyle = "#6b4426"; g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 3; row++) for (let c = 0; c < 3; c++) {
    const x = 14 + c * 166, y = 14 + row * 166;
    g.fillStyle = "#2a2230"; g.fillRect(x, y, 152, 152);
    if (r() < 0.75) { g.fillStyle = "#9aa3b5"; g.beginPath(); g.ellipse(x + 76, y + 110, 40, 28, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x + 104, y + 78, 18, 0, 7); g.fill(); g.fillStyle = "#f08a2c"; g.beginPath(); g.arc(x + 108, y + 75, 4, 0, 7); g.fill(); }
    g.fillStyle = "#c9cdd4"; for (let k = 0; k < 9; k++) g.fillRect(x + 6 + k * 17, y, 4, 152);
  }
});
/** riveted olive-drab metal (bomb skin, nose-cone interior) */
export const oliveTex = (key: string, base = "#5d6a3a") => { const t = ctex("olive" + key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 8 + r() * 30, 2); }
  g.strokeStyle = "rgba(20,20,10,0.5)"; g.lineWidth = 3; for (let y = 0; y < 512; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.fillStyle = "rgba(230,230,200,0.35)"; for (let y = 10; y < 512; y += 128) for (let x = 8; x < 512; x += 24) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
/** sea surface (tiled) */
export const seaTex = () => { const t = ctex("sea", 512, 512, (g, r) => {
  g.fillStyle = "#2a6fa8"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? "190,225,255" : "20,60,110"},0.35)`; g.lineWidth = 3; const x = r() * 512, y = r() * 512, w = 14 + r() * 30; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 5, x + w, y); g.stroke(); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; return t; };
/** archery-style target on the raft */
export const bullseyeTex = () => ctex("bullseye", 256, 256, (g) => { for (const [rr, c] of [[120, "#f4f2ec"], [96, "#d8473b"], [72, "#f4f2ec"], [48, "#d8473b"], [24, "#f4f2ec"]] as const) { g.fillStyle = c; g.beginPath(); g.arc(128, 128, rr, 0, 7); g.fill(); } });

/** rubber stamp mark: a pigeon picture struck through with a big red X (flat card, 400 x 300; no words) */
export const fxStamp = (p: Pen, u: number) => {
  const a = Math.min(1, u * 3);
  p.g.globalAlpha = a;
  p.poly([[20, 20], [380, 20], [380, 280], [20, 280]], "#f4f1e6", 6);
  p.ell(170, 170, 70, 46, "#9aa3b5", 5); p.ell(240, 120, 32, 30, "#8b94a7", 5); p.poly([[268, 118], [298, 126], [268, 134]], "#3a3436", 4);
  p.line([[60, 50], [340, 250]], "#d23b3b", 26, false); p.line([[340, 50], [60, 250]], "#d23b3b", 26, false);
  p.g.globalAlpha = 1;
};
/** the lens's image travelling to the screen: a soft light cone (upright card, 400 x 200), points from left to right */
export const fxBeam = (p: Pen, k: number) => {
  p.g.globalAlpha = 0.45 * k;
  p.poly([[10, 90], [10, 110], [390, 190], [390, 10]], "#cfe8ff", 0);
  p.g.globalAlpha = 1;
};
/** a sunflower seed (120 x 80) */
export const fxSeed = (p: Pen) => { p.ell(60, 40, 40, 20, "#3a3030", 5); p.stroke([[35, 34], [85, 40]], 4, "#d9d2c4"); };
/** a dog biscuit (160 x 100) */
export const fxBiscuit = (p: Pen) => p.poly([[30, 30], [55, 18], [80, 30], [105, 18], [130, 30], [130, 70], [105, 82], [80, 70], [55, 82], [30, 70]], "#c98a46", 6);
/** confetti (400 x 400), t in seconds */
export const fxConfetti = (p: Pen, t: number, seed: number) => {
  const r = rng(seed), cols = ["#e2453c", "#f2c14e", "#3f8fd0", "#5fae6a", "#c86fb0", "#ffffff"];
  for (let i = 0; i < 26; i++) {
    const x = 400 * r(), y0 = 400 * r(), sp = 60 + 60 * r(), y = (y0 + sp * t) % 400, w = 10 + 8 * r(), flip = Math.abs(Math.cos(t * (3 + 4 * r()) + i));
    p.poly([[x - w, y - w * 0.5 * flip], [x + w, y - w * 0.5 * flip], [x + w, y + w * 0.5 * flip], [x - w, y + w * 0.5 * flip]], cols[i % 6], 0);
  }
};
