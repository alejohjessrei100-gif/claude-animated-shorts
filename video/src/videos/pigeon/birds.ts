// Pigeons and a dog for "The Pigeons Who Flew a Bomb", drawn with the toon.ts Pen in the same plum-ink style as the cast.
// Pigeon canvas: 400 x 400 design units, feet on y = 380; 1 unit = PSU metres (a pigeon is ~0.33 m tall).
// Side view faces screen-right; the card is mirrored when the bird faces screen-left. pigeonTip() gives the beak tip in
// canvas units for a peck amount, so world.ts / cast.ts can place a bird so its peck lands exactly on its screen.
import { Pen, INK } from "./toon";

type P2 = [number, number];
export const PSU = 0.00085; // metres per pigeon design unit
export type BirdExpr = "neutral" | "happy" | "shock" | "stern" | "nervous" | "curious" | "proud" | "sad";
export type BirdGear = null | "cap" | "helmet";
export type BirdOpts = { peck?: number; expr?: BirdExpr; blink?: number; gear?: BirdGear; harness?: boolean; flap?: number; tint?: number };

const GREY = "#9aa3b5", LIGHT = "#bec5d3", DARK = "#5d6475", HEAD = "#8b94a7", FOOT = "#d9606a", BEAK = "#3a3436";
const rot = (p: P2, a: number, c: P2): P2 => [c[0] + (p[0] - c[0]) * Math.cos(a) - (p[1] - c[1]) * Math.sin(a), c[1] + (p[0] - c[0]) * Math.sin(a) + (p[1] - c[1]) * Math.cos(a)];
const ring = (cx: number, cy: number, rx: number, ry: number, n = 40, a0 = 0, a1 = Math.PI * 2): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as P2; });

/** head centre + rotation for a peck amount (0 = upright, 1 = beak on the screen ahead) */
const headPose = (peck: number) => {
  const k = Math.max(0, Math.min(1, peck));
  return { c: [272 + 66 * k, 150 + 78 * k] as P2, a: 0.62 * k };
};
/** beak tip in canvas units (side view, facing right) */
export const pigeonTip = (peck: number): P2 => { const h = headPose(peck); return rot([h.c[0] + 70, h.c[1] + 14], h.a, h.c); };

const eye = (p: Pen, x: number, y: number, expr: BirdExpr, blink: number, r = 11) => {
  if (blink >= 1 || expr === "happy" || expr === "proud") { p.arc(x, y + 2, r, r * 0.7, 200, 340, 4.5); return; }
  const rr = expr === "shock" ? r * 1.35 : r, pupil = expr === "shock" ? 3.5 : 5.5;
  p.ell(x, y, rr, blink > 0 ? rr * 0.45 : rr, "#f08a2c", 4);
  p.ell(x + 1.5, y, pupil, blink > 0 ? pupil * 0.5 : pupil, INK, 0);
  if (expr === "stern" || expr === "sad") p.stroke(expr === "stern" ? [[x - 14, y - 20], [x + 12, y - 12]] : [[x - 12, y - 12], [x + 12, y - 20]], 4.5);
  if (expr === "curious") p.stroke([[x - 10, y - 24], [x + 8, y - 28]], 4.5);
  if (expr === "nervous") p.ell(x + 26, y - 26, 4, 7, "#9fd4ff", 2.5);
};

const gearSide = (p: Pen, hx: number, hy: number, gear: BirdGear) => {
  if (gear === "cap") { // leather flying cap + goggles on the forehead
    p.poly([...ring(hx, hy - 4, 44, 40, 24, Math.PI * 1.05, Math.PI * 1.95)], "#7a4a2a", 5);
    p.poly([[hx - 40, hy - 4], [hx - 46, hy + 22], [hx - 30, hy + 20]], "#7a4a2a", 4);
    p.ell(hx + 10, hy - 30, 13, 10, "#cfe8ff", 4); p.ell(hx - 14, hy - 33, 12, 9, "#cfe8ff", 4);
  } else if (gear === "helmet") {
    p.poly(ring(hx, hy - 6, 48, 44, 24, Math.PI, Math.PI * 2), "#4f6a3a", 5);
    p.stroke([[hx - 54, hy - 6], [hx + 54, hy - 6]], 6, "#3d5530");
  }
};

/** side view, facing right */
export const pigeonSide = (p: Pen, o: BirdOpts) => {
  const { peck = 0, expr = "neutral", blink = 0, gear = null, harness = false, flap = 0 } = o;
  // tail + far leg
  p.poly([[118, 268], [40, 300], [48, 318], [130, 300]], DARK, 6);
  p.stroke([[205, 330], [212, 376]], 6, FOOT); p.stroke([[198, 378], [232, 378]], 6, FOOT);
  // body
  const body = ring(190, 268, 98, 70, 48);
  p.poly(body.map((q) => rot(q, -0.12, [190, 268])), GREY, 7);
  p.poly(ring(215, 292, 62, 34, 30, 0.1, Math.PI * 0.95).map((q) => rot(q, -0.12, [190, 268])), LIGHT, 0); // breast
  // wing (raises with flap)
  const wa = -0.12 - 0.7 * flap;
  const wing = ring(170, 252, 76, 42, 36).map((q) => rot(q, wa, [225, 245]));
  p.poly(wing, LIGHT, 6);
  for (const k of [0.35, 0.55]) p.stroke([rot([120 + 70 * k, 236], wa, [225, 245]), rot([150 + 70 * k, 268], wa, [225, 245])], 7, "#3a3f4c");
  if (harness) { p.band([[150, 205], [168, 335]], "#6b4a2a", 12, 3); p.band([[235, 205], [246, 330]], "#6b4a2a", 12, 3); p.ell(200, 214, 9, 7, "#d9b24a", 3); }
  // near leg
  p.stroke([[180, 334], [176, 378]], 6, FOOT); p.stroke([[160, 380], [196, 380]], 6, FOOT);
  // neck + head
  const h = headPose(peck), R = (q: P2) => rot(q, h.a, h.c);
  p.poly([[236, 212], [h.c[0] - 26, h.c[1] + 18], [h.c[0] + 18, h.c[1] + 30], [266, 244]], "#5f8a7a", 5); // iridescent neck
  p.poly([[244, 220], [h.c[0] - 14, h.c[1] + 26], [h.c[0] + 10, h.c[1] + 32], [258, 238]], "#8a6aa8", 0);
  p.poly(ring(h.c[0], h.c[1], 42, 40, 36).map(R), HEAD, 6);
  const tip = R([h.c[0] + 70, h.c[1] + 14]);
  p.poly([R([h.c[0] + 34, h.c[1] - 2]), tip, R([h.c[0] + 36, h.c[1] + 16])], BEAK, 4);
  const [cx, cy] = R([h.c[0] + 36, h.c[1] - 3]); p.ell(cx, cy, 8, 6, "#f2efe6", 3); // cere
  const [ex, ey] = R([h.c[0] + 12, h.c[1] - 8]);
  eye(p, ex, ey, expr, blink);
  gearSide(p, ...R([h.c[0] - 2, h.c[1] - 6]), gear);
};

/** front view (facing the lens): plump body, head on top, eyes either side of the beak */
export const pigeonFront = (p: Pen, o: BirdOpts) => {
  const { expr = "neutral", blink = 0, gear = null, harness = false, flap = 0, peck = 0 } = o;
  const hy = 52 * Math.max(0, Math.min(1, peck)); // a front-view peck: the head bobs down onto the screen top
  for (const s of [-1, 1]) { p.stroke([[200 + s * 22, 330], [200 + s * 26, 376]], 6, FOOT); p.stroke([[200 + s * 10, 378], [200 + s * 42, 378]], 6, FOOT); }
  for (const s of [-1, 1]) p.poly(ring(200 + s * (62 + 14 * flap), 262 - 26 * flap, 34, 58, 30).map((q) => rot(q, s * (0.25 + 0.6 * flap), [200 + s * 62, 230])), LIGHT, 6); // wings
  p.poly(ring(200, 268, 78, 76, 48), GREY, 7);
  p.poly(ring(200, 292, 52, 44, 30, 0.2, Math.PI - 0.2), LIGHT, 0);
  if (harness) for (const s of [-1, 1]) p.band([[200 + s * 50, 210], [200 + s * 30, 330]], "#6b4a2a", 12, 3);
  p.poly(ring(200, 196 + hy * 0.4, 46, 26, 30, 0, Math.PI), "#5f8a7a", 5); // neck ring
  p.poly(ring(200, 150 + hy, 48, 46, 40), HEAD, 6);
  for (const s of [-1, 1]) eye(p, 200 + s * 24, 142 + hy, expr, blink, 10);
  p.poly([[188, 160 + hy], [212, 160 + hy], [200, 184 + hy]], BEAK, 4); p.ell(200, 160 + hy, 9, 5, "#f2efe6", 3);
  if (expr === "shock") p.ell(200, 196 + hy, 8, 6, "#5a1e28", 3);
  gearSide(p, 200, 144 + hy, gear);
};

/** back view (facing away from the lens, toward its screen): tail fan, folded wings with their two dark bars, the back of
 *  the head. A peck dips the head forward and down onto the screen in front of it (the head shrinks a little as it goes). */
export const pigeonBack = (p: Pen, o: BirdOpts) => {
  const { expr = "neutral", gear = null, harness = false, flap = 0, peck = 0 } = o;
  const k = Math.max(0, Math.min(1, peck)), hy = 58 * k + (expr === "sad" ? 10 : 0), hs = 1 - 0.18 * k;
  for (const s of [-1, 1]) p.stroke([[200 + s * 24, 336], [200 + s * 22, 378]], 6, FOOT);
  p.poly([[176, 300], [224, 300], [246, 374], [154, 374]], DARK, 6); // tail fan
  p.stroke([[160, 358], [240, 358]], 8, "#3a3f4c"); // dark tail band
  p.poly(ring(200, 262, 80, 74, 48), GREY, 7);
  // neck: stretches toward the screen on a peck
  p.poly([[166, 214], [200 - 30 * hs, 168 + hy], [200 + 30 * hs, 168 + hy], [234, 214]], "#5f8a7a", 5);
  p.poly([[176, 214], [200 - 18 * hs, 176 + hy], [200 + 18 * hs, 176 + hy], [224, 214]], "#8a6aa8", 0);
  // head (no face: we see the back of it)
  p.poly(ring(200, 150 + hy, 46 * hs, 44 * hs, 40), HEAD, 6);
  if (gear === "cap") {
    p.poly(ring(200, 146 + hy, 48 * hs, 44 * hs, 24, Math.PI, Math.PI * 2), "#7a4a2a", 5);
    p.stroke([[200 - 47 * hs, 150 + hy], [200 + 47 * hs, 150 + hy]], 7, "#3a2a20"); // goggle strap round the back
    for (const s of [-1, 1]) p.poly([[200 + s * 38 * hs, 150 + hy], [200 + s * 46 * hs, 178 + hy], [200 + s * 30 * hs, 176 + hy]], "#7a4a2a", 4); // ear flaps
  } else if (gear === "helmet") {
    p.poly(ring(200, 146 + hy, 50 * hs, 46 * hs, 24, Math.PI, Math.PI * 2), "#4f6a3a", 5);
    p.stroke([[200 - 56 * hs, 146 + hy], [200 + 56 * hs, 146 + hy]], 6, "#3d5530");
  }
  // folded wings meet along the spine; they lift and spread on a flap
  for (const s of [-1, 1]) {
    const c: P2 = [200 + s * (36 + 30 * flap), 262 - 18 * flap], a = s * (0.12 + 0.7 * flap);
    p.poly(ring(c[0], c[1], 40, 70, 32).map((q) => rot(q, a, [200 + s * 20, 210])), LIGHT, 6);
    for (const dy of [12, 34]) p.stroke([rot([c[0] - 26, c[1] + dy], a, [200 + s * 20, 210]), rot([c[0] + 26, c[1] + dy + 8 * s], a, [200 + s * 20, 210])], 7, "#3a3f4c");
  }
  if (harness) { for (const s of [-1, 1]) p.band([[200 + s * 34, 212], [200 + s * 40, 312]], "#6b4a2a", 11, 3); p.band([[150, 300], [250, 300]], "#6b4a2a", 11, 3); p.ell(200, 300, 9, 7, "#d9b24a", 3); }
  if (expr === "nervous") p.ell(200 + 58, 120 + hy, 5, 9, "#9fd4ff", 2.5);
};

/** the dog (side view facing right, 500 x 400, feet on 380): sits, wags, catches a treat */
export const dogSide = (p: Pen, o: { sit?: boolean; wag?: number; mouth?: number; expr?: "happy" | "neutral" | "shock" }) => {
  const { sit = true, wag = 0, mouth = 0, expr = "happy" } = o;
  const FUR = "#d9a05a", EAR = "#8a5a34";
  const tailA = -0.6 + 0.5 * Math.sin(wag);
  p.stroke([[150, 300], [150 + 80 * Math.cos(Math.PI + tailA), 300 + 80 * Math.sin(Math.PI + tailA)]], 18, INK);
  p.stroke([[150, 300], [150 + 78 * Math.cos(Math.PI + tailA), 300 + 78 * Math.sin(Math.PI + tailA)]], 11, FUR);
  p.poly(ring(220, sit ? 300 : 290, 95, sit ? 70 : 58, 40), FUR, 7);
  for (const x of sit ? [270, 300] : [170, 200, 270, 300]) p.poly([[x - 14, 320], [x + 14, 320], [x + 14, 378], [x - 18, 378]], FUR, 6);
  const hx = 320, hy = sit ? 190 : 205;
  p.poly(ring(hx, hy, 62, 56, 36), FUR, 7);
  p.poly(ring(hx + 58, hy + 18, 38, 26, 30), "#e8be86", 6); // snout
  p.ell(hx + 92, hy + 6, 11, 9, INK, 0); // nose
  if (mouth > 0.05) { p.poly([[hx + 50, hy + 36], [hx + 94, hy + 30], [hx + 88, hy + 36 + 26 * mouth], [hx + 56, hy + 40 + 18 * mouth]], "#5a1e28", 4); p.ell(hx + 74, hy + 46 + 12 * mouth, 12, 7, "#e86e78", 0); }
  else p.arc(hx + 70, hy + 34, 16, 8, 20, 160, 4);
  p.poly([[hx - 30, hy - 40], [hx - 70, hy + 20], [hx - 40, hy + 40], [hx - 10, hy - 20]], EAR, 6); // ear
  if (expr === "happy") p.arc(hx + 20, hy - 10, 11, 8, 200, 340, 5);
  else { p.ell(hx + 20, hy - 12, expr === "shock" ? 11 : 8, expr === "shock" ? 11 : 9, INK, 0); }
};
