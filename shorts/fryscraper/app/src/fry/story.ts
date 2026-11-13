// Timeline of "The Skyscraper That Cooked a Car": shots timed to the voice words (shorts/fryscraper/voice/words.json,
// frame = word start x 30). Camera grammar from the bridge short (motion.md): smootherstep glides 18-40 f, every hold
// creeps in, big reframes are cuts, impact kicks flip sign every frame and decay over 7 f, rolls of 4-5 deg.
import { R, invR } from "./timing";
export { R };
export const FPS = 30;
export const TOTAL = 1890;
export const D0 = 0; // street level
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- places ----------------
/** the Jaguar, parked on the south kerb of the street, nose toward +x */
export const CAR: V3 = [6, 0, 3.4];
export const CAR_YAW = 0; // body along +x
/** the tower: plot north of the street, concave south face toward +z (the street) */
export const TOWER = { x: 0, z: -44, H: 155, floors: 37 };
/** south face: depth of the face line at height y (leans out toward the street as it rises) and half width */
export const faceZ = (y: number) => -24 + 15 * Math.pow(clamp01(y / TOWER.H), 1.55);
export const faceW = (y: number) => 21 + 10 * Math.pow(clamp01(y / TOWER.H), 1.35);
export const FACE_DEPTH = 7; // centre of the face recessed by this much (the concave "spoon")
export const PARK: V3 = [320, 0, 0];
export const STUDIO: V3 = [-320, 0, 0];
export const VEGAS: V3 = [0, 0, 900];
export const STALL: V3 = [-13, 0, 7.2];

/** the hot spot on the street: centre (x, z) and strength 0..1 as a function of story time (s) */
export const spotAt = (t0: number): { x: number; z: number; k: number } => {
  const t = invR(t0 * FPS) / FPS; // the slide was timed on the first voice
  // on the car for the first half; "Luckily ... keeps moving": slides west along the street; "Unluckily": onto the stall
  const x = lin([[0, CAR[0] + 0.2], [32.5, CAR[0] + 0.2], [35.5, -1.5], [37.2, -4], [40.2, STALL[0] + 0.5], [42, STALL[0] + 0.5]], t);
  const z = lin([[0, CAR[2] - 0.2], [32.5, CAR[2] - 0.2], [36, 4.6], [40.2, STALL[2] - 0.8]], t);
  return { x, z, k: 1 };
};

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Set = "city" | "park" | "studio" | "vegas";
export type Crowd = "none" | "hook" | "locals" | "park" | "leave" | "back" | "mirror" | "badge" | "panel" | "thermo" | "reporter" | "spot" | "explain" | "owners" | "fins" | "architect" | "vegas";
export type ShotDef = { id: number; a: number; b: number; light: Light; set: Set; crowd: Crowd; fins?: boolean; crane?: boolean };
const SHOTS0: ShotDef[] = [
  { id: 1, a: 0, b: 130, light: "day", set: "city", crowd: "hook" },
  { id: 2, a: 130, b: 265, light: "day", set: "city", crowd: "none", crane: true },
  { id: 3, a: 265, b: 329, light: "day", set: "city", crowd: "locals", crane: true },
  { id: 4, a: 329, b: 474, light: "day", set: "city", crowd: "park" },
  { id: 5, a: 474, b: 533, light: "day", set: "city", crowd: "back" },
  { id: 6, a: 533, b: 602, light: "day", set: "city", crowd: "mirror" },
  { id: 7, a: 602, b: 656, light: "day", set: "city", crowd: "badge" },
  { id: 8, a: 656, b: 715, light: "day", set: "city", crowd: "panel" },
  { id: 9, a: 715, b: 815, light: "day", set: "city", crowd: "thermo" },
  { id: 10, a: 815, b: 964, light: "day", set: "city", crowd: "reporter" },
  { id: 11, a: 964, b: 1087, light: "day", set: "city", crowd: "spot" },
  { id: 12, a: 1087, b: 1212, light: "day", set: "city", crowd: "spot" },
  { id: 13, a: 1212, b: 1355, light: "day", set: "city", crowd: "explain" },
  { id: 14, a: 1355, b: 1567, light: "day", set: "park", crowd: "none" },
  { id: 15, a: 1567, b: 1704, light: "day", set: "city", crowd: "explain" },
  { id: 16, a: 1704, b: 1750, light: "day", set: "city", crowd: "owners", fins: true },
  { id: 17, a: 1750, b: 1870, light: "day", set: "city", crowd: "fins", fins: true },
  { id: 18, a: 1870, b: 1912, light: "day", set: "studio", crowd: "architect" },
  { id: 19, a: 1912, b: TOTAL, light: "golden", set: "vegas", crowd: "vegas" },
];
/** shot bounds laid out on the first voice, moved onto the final voice */
export const SHOTS: ShotDef[] = SHOTS0.map((x) => ({ ...x, a: R(x.a), b: x.b === TOTAL ? TOTAL : R(x.b) }));
/** crossfades (frames) at place/time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 5: 10, 14: 8, 15: 8, 16: 8, 18: 8, 19: 10 };
export const FLASH_AT = R(130);

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story beats (seconds, from the word timings) ----------------
const W = (f: number) => R(f) / FPS;
export const BEAT = {
  melted: W(61), skyscraper: W(42), without: W(93),
  parks: W(362), heads: W(438),
  back: W(514), drooped: W(551), slid: W(617), off: W(640), bubbling: W(691),
  thermo: W(716), hits: W(765), ninety: W(772),
  pan: W(840), cracks: W(868), fries: W(931),
  luckily: W(964), unluckily: W(1087),
  spoon: W(1333), leaf: W(1373), grabs: W(1438), squeezes: W(1498), tiny: W(1535),
  floors: W(1658), paid: W(1716), fins: W(1791), visor: W(1841),
  architect: W(1877), cooking: W(2015), pool: W(2051),
};
/** reactions land 0-3 frames before their word */
export const LEAD = 2 / FPS;

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const T = (f: number) => f / FPS;
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - R(f0));
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const [CX, , CZ] = CAR;
// where the man walks: parks, gets out on the pavement side, walks off to +x; comes back from +x
export const MAN_DOOR: V3 = [CX - 0.4, 0, CZ + 1.6];

// 1: hook. Low 3/4 on the car glowing in the spot -> look up past the car at the tower ("skyscraper") -> push ("without")
const S1a = (f: number) => dolly([CX + 4.6, 0.75, CZ + 5.2], [CX + 0.4, 0.75, CZ], pushK(f, 0, 0.003), { fov: 42 });
const S1b = (f: number) => zoom([CX + 3.5, 0.55, CZ + 5.3], [CX - 3, 46, TOWER.z + 6], 58, pushK(f, 40, 0.0025), { roll: -0.04 });
const S1c = (f: number) => dolly([CX + 2.8, 1.25, CZ + 3.4], [CX + 0.6, 0.85, CZ], pushK(f, 88, 0.0022, 0.006, 30), { fov: 38, roll: 0.035 });
// 2: aerial of the City with the tower rising (crane), "middle of London" punch
const S2a = (f: number) => zoom([150, 120, 230], [0, 60, -40], 44, pushK(f, 126, 0.0018));
const S2b = (f: number) => zoom([95, 75, 150], [0, 70, -40], 42, pushK(f, 228, 0.0015, 0.005, 30));
// 3: locals on the pavement looking up (low), the tower above them
const S3a = (f: number) => dolly([-6, 1.0, 8.8], [-3.5, 8.5, 2], pushK(f, 265, 0.0025), { fov: 52, roll: 0.03 });
const S3b = (f: number) => zoom([-4.5, 0.6, 8.7], [0, 70, TOWER.z + 10], 56, pushK(f, 293, 0.002, 0.005, 30), { roll: -0.04 });
// 4: wide on the street: the car rolls in and parks, the man gets out and walks off
const S4a = (f: number) => dolly([CX + 12, 1.7, 8.4], [CX - 3, 1.0, CZ], pushK(f, 329, 0.002), { fov: 42 });
const S4b = (f: number) => dolly([CX + 6.5, 1.6, 8.6], [CX + 2.2, 1.35, CZ + 1.2], pushK(f, 430, 0.0025), { fov: 40, roll: -0.03 });
// 5: he comes back: his POV-ish MS walking in from +x, stops on "back"
const S5a = (f: number) => dolly([CX + 10.5, 1.65, CZ + 3.2], [CX + 4, 1.4, CZ + 1.8], pushK(f, 474, 0.0022), { fov: 38 });
// 6: mirror insert (near side mirror at the A-pillar, pavement side)
export const MIRROR: V3 = [CX + 1.0, 1.0, CZ + 0.98];
const S6a = (f: number) => dolly(add(MIRROR, [0.55, 0.12, 1.2]), add(MIRROR, [-0.05, -0.06, 0]), pushK(f, 533, 0.0025, 0.007, 30), { fov: 34, roll: -0.04 });
// 7: bonnet badge insert, from the front quarter
export const BADGE: V3 = [CX + 2.2, 0.99, CZ];
const S7a = (f: number) => dolly(add(BADGE, [1.35, 0.55, 0.75]), add(BADGE, [0.02, -0.12, 0]), pushK(f, 602, 0.0025), { fov: 32, roll: 0.04 });
// 8: the man's shock MS, then the bubbling door panel
const S8a = (f: number) => dolly([CX + 2.4, 1.6, CZ + 4.9], [CX + 1.4, 1.5, CZ + 2.2], pushK(f, 656, 0.003, 0.008, 25), { fov: 36 });
export const PANEL: V3 = [CX - 0.3, 0.62, CZ + 0.98];
const S8b = (f: number) => dolly(add(PANEL, [0.4, 0.3, 2.1]), add(PANEL, [0, 0, 0]), pushK(f, 688, 0.0025), { fov: 38, roll: -0.03 });
// 9: thermometer on the pavement, feet of the crowd around it
export const THERMO: V3 = [CX - 1.6, 0, CZ + 2.3];
const S9a = (f: number) => dolly(add(THERMO, [0.6, 0.55, 2.3]), add(THERMO, [0, 0.32, 0]), pushK(f, 715, 0.0025), { fov: 40 });
const S9b = (f: number) => dolly(add(THERMO, [0.25, 0.42, 1.05]), add(THERMO, [0, 0.42, 0]), pushK(f, 763, 0.002, 0.007, 28), { fov: 36, roll: 0.04 });
// 10: the reporter with the frying pan; egg CU
export const REPORTER: V3 = [CX - 2.6, 0, CZ + 2.0];
export const PAN: V3 = [CX - 2.0, 0.03, CZ + 1.4];
const S10a = (f: number) => dolly(add(REPORTER, [1.2, 1.6, 3.2]), add(REPORTER, [0.2, 1.25, 0]), pushK(f, 815, 0.0025), { fov: 40 });
const S10b = (f: number) => dolly(add(PAN, [0.35, 0.62, 0.75]), add(PAN, [0, 0.02, 0]), pushK(f, 900, 0.002, 0.007, 30), { fov: 36, roll: -0.04 });
// 11-12: high angle on the street, the spot slides away from the car ... onto the stall (one camera, no visible cut)
const S11a = (f: number) => zoom([5, 14, 8.6], [-2, 0, 2], 56, pushK(f, 964, 0.0012));
const S12a = (f: number) => zoom([-1, 11, 8.6], [STALL[0] + 2.5, 0.6, 4], 52, pushK(f, 1087, 0.0016, 0.004, 30), { roll: 0.03 });
// 13: profile of the tower (from the west), rays converging on the street; "giant spoon" punch
const S13a = (f: number) => zoom([-215, 70, -6], [0, 62, -14], 50, pushK(f, 1212, 0.0015));
const S13b = (f: number) => zoom([-215, 70, -6], [0, 60, -14], 50, pushK(f, 1290, 0.0015, 0.004, 32) * 0.92, { roll: 0.035 });
// 14: park: kid with a magnifying glass over a leaf
export const LEAF: V3 = [PARK[0] + 0.15, 0.03, PARK[2] + 0.25];
const S14a = (f: number) => dolly([PARK[0] + 2.2, 1.05, PARK[2] + 3.4], [PARK[0] + 0.1, 0.55, PARK[2] + 0.2], pushK(f, 1355, 0.0022), { fov: 40 });
const S14b = (f: number) => dolly([LEAF[0] + 0.8, 0.42, LEAF[2] + 0.95], [LEAF[0] - 0.02, 0.2, LEAF[2]], pushK(f, 1434, 0.002), { fov: 38, roll: 0.03 });
const S14c = (f: number) => dolly([LEAF[0] + 0.3, 0.2, LEAF[2] + 0.5], [LEAF[0], 0.05, LEAF[2]], pushK(f, 1520, 0.002, 0.008, 30), { fov: 34, roll: -0.04 });
// 15: low wide from the street up the whole face (rays), tilt up the floors ("thirty-seven floors tall")
const S15a = (f: number) => zoom([8, 1.4, 8.4], [0, 40, TOWER.z], 66, pushK(f, 1567, 0.0015));
const S15b = (f: number) => zoom([8, 1.4, 8.4], [0, 120, TOWER.z], 66, pushK(f, 1650, 0.0012));
// 16: the owners pay the man (MS on the pavement)
const S16a = (f: number) => dolly([CX + 2.2, 1.55, 8.6], [CX + 0.6, 1.45, CZ + 2.6], pushK(f, 1704, 0.0025), { fov: 38 });
// 17: the tower in fins (3/4 from the south-east), "giant sun visor" punch
const S17a = (f: number) => zoom([120, 40, 120], [0, 85, -30], 44, pushK(f, 1750, 0.0016));
const S17b = (f: number) => zoom([120, 40, 120], [0, 95, -30], 44, pushK(f, 1820, 0.0012, 0.005, 30), { roll: -0.03 });
// 18: the architect in his studio, turns to us
const S18a = (f: number) => dolly([STUDIO[0] + 0.4, 1.6, STUDIO[2] + 3.4], [STUDIO[0] + 0.1, 1.45, STUDIO[2]], pushK(f, 1870, 0.0035, 0.008, 25), { fov: 38, roll: 0.03 });
// 19: Las Vegas: the curved hotel over the pool, golden; the sunbathers; the leap
const S19a = (f: number) => zoom([VEGAS[0] + 26, 5, VEGAS[2] + 120], [VEGAS[0], 38, VEGAS[2] - 30], 50, pushK(f, 1912, 0.0016));
const S19b = (f: number) => dolly([VEGAS[0] + 4, 1.6, VEGAS[2] + 13], [VEGAS[0] - 1, 0.7, VEGAS[2] + 6], pushK(f, 2005, 0.0025), { fov: 40, roll: 0.03 });
const S19c = (f: number) => dolly([VEGAS[0] + 7, 2.4, VEGAS[2] + 16], [VEGAS[0] - 1, 0.6, VEGAS[2] + 6], pushK(f, 2048, 0.002), { fov: 44 });

const CAMS0: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 40, cut: true, s: S1b }, { f: 88, cut: true, s: S1c }],
  2: [{ f: 126, s: S2a }, { f: 220, dur: 30, s: S2b }],
  3: [{ f: 265, s: S3a }, { f: 293, cut: true, s: S3b }],
  4: [{ f: 329, s: S4a }, { f: 430, cut: true, s: S4b }],
  5: [{ f: 469, s: S5a }],
  6: [{ f: 533, s: S6a }],
  7: [{ f: 602, s: S7a }],
  8: [{ f: 656, s: S8a }, { f: 688, cut: true, s: S8b }],
  9: [{ f: 715, s: S9a }, { f: 763, cut: true, s: S9b }],
  10: [{ f: 815, s: S10a }, { f: 900, cut: true, s: S10b }],
  11: [{ f: 964, s: S11a }, { f: 1075, dur: 26, s: S12a }],
  13: [{ f: 1208, s: S13a }, { f: 1290, dur: 30, s: S13b }],
  14: [{ f: 1351, s: S14a }, { f: 1434, cut: true, s: S14b }, { f: 1520, cut: true, s: S14c }],
  15: [{ f: 1563, s: S15a }, { f: 1640, dur: 40, s: S15b }],
  16: [{ f: 1700, s: S16a }],
  17: [{ f: 1750, s: S17a }, { f: 1806, dur: 30, s: S17b }],
  18: [{ f: 1866, s: S18a }, { f: 1874, dur: 20, s: rolled(S18a, -0.035) }],
  19: [{ f: 1907, s: S19a }, { f: 2005, cut: true, s: S19b }, { f: 2048, cut: true, s: S19c }],
};
const CAMS: Record<number, Key[]> = Object.fromEntries(Object.entries(CAMS0).map(([k, v]) => [k, v.map((key) => ({ ...key, f: R(key.f) }))]));
CAMS[12] = CAMS[11];

/** impact kicks: the image offset flips sign every frame and decays to 0 in 7 f */
const KICKS: [number, number][] = [[BEAT.drooped, 0.6], [BEAT.off + 0.25, 0.8], [BEAT.ninety, 0.7], [BEAT.fries, 0.5], [BEAT.unluckily + 2.0, 0.6], [BEAT.pool + 0.45, 1.0]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const DOF0: Dof[] = [
  { f: 0, cInf: 14 }, // car glowing in the spot
  { f: 40, cInf: 0 }, // up at the tower
  { f: 88, cInf: 13 },
  { f: 130, cInf: 0 }, // aerial
  { f: 265, cInf: 8 }, // locals
  { f: 293, cInf: 0 },
  { f: 329, cInf: 0 }, // parking wide
  { f: 430, cInf: 8 },
  { f: 474, cInf: 10 }, // he comes back
  { f: 533, cInf: 15 }, // mirror insert
  { f: 602, cInf: 15 }, // badge insert
  { f: 656, cInf: 12 }, // shock MS
  { f: 688, cInf: 14 }, // panel
  { f: 715, cInf: 13 }, // thermometer
  { f: 815, cInf: 10 }, // reporter MS
  { f: 900, cInf: 15 }, // egg CU
  { f: 964, cInf: 0 }, // high angle
  { f: 1212, cInf: 0 }, // profile
  { f: 1355, cInf: 9 }, // park
  { f: 1434, cInf: 14 },
  { f: 1520, cInf: 16 },
  { f: 1567, cInf: 0 },
  { f: 1704, cInf: 11 }, // owners MS
  { f: 1750, cInf: 0 }, // fins
  { f: 1870, cInf: 12 }, // architect
  { f: 1912, cInf: 0 }, // Vegas wide
  { f: 2005, cInf: 10 }, // sunbathers
  { f: 2048, cInf: 6 },
];
export const DOF: Dof[] = DOF0.map((d) => ({ ...d, f: R(d.f) }));
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => {
  const d = dofAt(f);
  return d.focus ? d.focus(f) : camAt(id, f).look;
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};
/** near framing objects (none yet) */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];

/** the Jaguar's x along the street: it rolls in during shot 4 and stops on "parks" */
export const carX = (t: number) => {
  const t0 = R(329) / FPS, t1 = BEAT.parks + 0.2;
  if (t < t0) return CAR[0];
  if (t >= t1) return CAR[0];
  const u = (t - t0) / (t1 - t0);
  return CAR[0] - 26 * (1 - u) * (1 - u); // decelerating to a stop
};
/** melt progress of the car parts (0..1) */
export const meltAt = (t: number) => ({
  mirror: clamp01((t - (BEAT.drooped - 0.5)) / 1.0),
  badge: clamp01((t - (BEAT.slid - 0.3)) / ((BEAT.off - BEAT.slid) + 0.5)),
  panel: t >= BEAT.bubbling - 0.4,
});
