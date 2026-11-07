// Timeline of "Why Toast Lands Butter-Side Down" (44.5 s, 1335 frames), timed to the voice (shorts/toast/voice/words.json,
// word onsets in frames noted per shot). Camera grammar from the 20-video reference study (references/reports/motion.md):
// the lens is almost never still (65 % of frames move), symmetric smootherstep glides of ~18-40 f (~6 per 10 s), slow
// push-ins in every hold (0.14-0.35 %/f, ~0.6 %/f on punch words), cuts only for big reframes, crossfades (6-8 f) between
// places, 6-7 f flip kicks on impacts, every action landing 0-3 f before its word.
export const FPS = 30;
export const TOTAL = 1335;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const F = (f: number) => f / FPS;

// ---------------- places (each set has its own origin, far apart) ----------------
export const KITCHEN: V3 = [0, 0, 0];
export const LAB: V3 = [60, 0, 0];
export const CLASS: V3 = [120, 0, 0];
export const STREET: V3 = [200, 0, 0];
export const TABLE_H = 0.76;     // a normal kitchen table
export const GIANT_H = 3.0;      // the table toast would need
export const TABLE_EDGE_Z = 0.85; // kitchen table: front edge (toward the lens), table centred at z 0.42
export const LAB_TABLE: V3 = [LAB[0], 0, 0.2];
/** classroom desk rows: front-edge-minus-0.3 z of each row of desks (desks face the lens, edges toward +z) */
export const DESK_ROWS = [-1.5, 0.1];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type Place = "kitchen" | "lab" | "class" | "street";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number; tableH?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 80, light: "day", place: "kitchen" }, // "A(3) physicist proved your toast lands butter-side down(71)"
  { id: 2, a: 80, b: 126, light: "day", place: "kitchen" }, // "because(83) of how tall(98) you are"
  { id: 3, a: 126, b: 165, light: "night", place: "lab" }, // "It's(126) 1995(130)"
  { id: 4, a: 165, b: 253, light: "night", place: "lab" }, // "and Robert(170) Matthews is pushing(196) buttered toast off(228) tables(236)"
  { id: 5, a: 253, b: 292, light: "night", place: "lab" }, // "over(255) and over(276)" top-down on the pile
  { id: 6, a: 292, b: 388, light: "night", place: "lab" }, // "His colleagues(295) think he's lost it. Robert(338), it's just bad luck(373)"
  { id: 7, a: 388, b: 431, light: "night", place: "lab" }, // "Then(388) why does it keep happening(412)?" iris CU
  { id: 8, a: 431, b: 513, light: "night", place: "lab" }, // "Wait(431), is the butter(449) making that side heavier(481)? Nope(498)."
  { id: 9, a: 513, b: 622, light: "day", place: "class" }, // "Years(513) later, British schoolkids(542) dropped almost ten thousand(578) slices(602)"
  { id: 10, a: 622, b: 693, light: "day", place: "class" }, // "Some(622) just had a letter(642) drawn on instead of butter"
  { id: 11, a: 693, b: 764, light: "day", place: "class" }, // "and most still landed(723) letter-side down(749)"
  { id: 12, a: 764, b: 846, light: "night", place: "kitchen" }, // "You see(764), toast tips(786) off the edge and starts to spin(829)"
  { id: 13, a: 846, b: 956, light: "night", place: "kitchen" }, // "From a normal table(861), ... half a turn(901) before it hits the floor(940)"
  { id: 14, a: 956, b: 1025, light: "day", place: "kitchen" }, // "Ever(956) caught a flipped coin(977) too early(986)? Same problem(1004)."
  { id: 15, a: 1025, b: 1127, light: "day", place: "kitchen", tableH: GIANT_H }, // "To land butter-up(1037), ... three metres(1090) tall(1112)"
  { id: 16, a: 1127, b: 1185, light: "day", place: "kitchen" }, // "And tables(1130) are only as tall as we are(1174)"
  { id: 17, a: 1185, b: 1293, light: "day", place: "kitchen" }, // "So there are two(1201) ways to save your breakfast: knock(1250) it off really fast(1276)"
  { id: 18, a: 1293, b: TOTAL, light: "golden", place: "street", sunAz: 120, sunEl: 16 }, // "or become a giant(1316)."
];
/** crossfades (frames) at place / time changes */
export const XFADE: Record<number, number> = { 3: 8, 9: 8, 12: 8, 14: 8, 18: 8 };
export const FLASH_AT = -100; // no flash in this short
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- toast physics ----------------
/** a slice in flight: position + rotation about its tipping axis (x). The slice slides along +z toward the edge, pivots
 *  on the edge (spin builds while it tips), then falls freely with the spin it picked up. slow = time scale. */
export type Slice = { pos: V3; rot: number; yaw: number; butter: "butter" | "B" | "plain"; splat: number; visible: boolean };
const G = 9.8;
export type Drop = {
  t0: number;          // push starts (s)
  from: V3;            // slice centre on the table top at the push
  edgeZ: number;       // table edge z (world)
  h: number;           // table top height
  dir?: 1 | -1;        // slide direction along z
  slow?: number;       // time scale (0.4 = slow motion)
  push?: number;       // slide speed m/s
  spin?: number;       // angular speed after leaving the edge (rad/s); default fits a half turn from h
  flat?: boolean;      // knocked off fast: flies flat, barely turns (lands butter-up)
  butter?: "butter" | "B" | "plain";
  fullTurn?: boolean;  // the 3 m table: a whole turn
};
export const dropAt = (d: Drop, t: number): Slice => {
  const s = d.slow ?? 1, tt = (t - d.t0) * s, dir = d.dir ?? 1, v = d.push ?? 0.35;
  const butter = d.butter ?? "butter";
  if (tt < 0) return { pos: [...d.from] as V3, rot: 0, yaw: 0, butter, splat: 0, visible: true };
  const slideDist = Math.abs(d.edgeZ - d.from[2]) + 0.03, tSlide = slideDist / v;
  const tFall = Math.sqrt((2 * (d.h - 0.01)) / G);
  if (d.flat) { // swatted: horizontal flight, a quarter-wobble, lands face-up after a long arc
    const vx = 4.5, tf = Math.sqrt((2 * d.h) / G);
    const u = Math.min(tt, tf);
    const y = d.h - 0.5 * G * u * u, z = d.from[2] + dir * vx * u;
    return { pos: [d.from[0], Math.max(0.012, y), z], rot: 0.25 * Math.sin(u * 9), yaw: 0, butter, splat: tt > tf ? clamp01((tt - tf) / 0.15) : 0, visible: true };
  }
  if (tt < tSlide) return { pos: [d.from[0], d.from[1], d.from[2] + dir * v * tt], rot: 0, yaw: 0, butter, splat: 0, visible: true };
  const tf = tt - tSlide;
  const turns = d.fullTurn ? 2 * Math.PI : Math.PI;
  const w = d.spin ?? turns / tFall; // spin that lands it after half a turn (whole turn from the giant table)
  if (tf < tFall) {
    const y = d.h - 0.5 * G * tf * tf, z = d.edgeZ + dir * (v * tf + 0.04);
    return { pos: [d.from[0], Math.max(0.012, y), z], rot: dir * w * tf, yaw: 0, butter, splat: 0, visible: true };
  }
  const z = d.edgeZ + dir * (v * tFall + 0.04);
  return { pos: [d.from[0], 0.012, z], rot: dir * turns, yaw: 0, butter, splat: clamp01((tf - tFall) / 0.12), visible: true };
};
/** when a drop lands (s, story time) */
export const landT = (d: Drop) => {
  const s = d.slow ?? 1, v = d.push ?? 0.35;
  if (d.flat) return d.t0 + Math.sqrt((2 * d.h) / G) / s;
  return d.t0 + (Math.abs(d.edgeZ - d.from[2]) + 0.03) / v / s + Math.sqrt((2 * (d.h - 0.01)) / G) / s;
};
/** pick t0 so that the slice lands exactly at frame fLand */
export const timed = (d: Omit<Drop, "t0">, fLand: number): Drop => {
  const probe = landT({ ...d, t0: 0 });
  return { ...d, t0: F(fLand) - probe };
};

const KT: V3 = [KITCHEN[0] + 0.15, TABLE_H + 0.012, 0.62]; // the hook slice on the kitchen table, near the front edge
/** every falling slice in the film, per shot */
export const DROPS: Record<number, Drop[]> = {
  1: [timed({ from: KT, edgeZ: TABLE_EDGE_Z, h: TABLE_H, slow: 0.42, push: 0.3 }, 70)], // lands on "down" (71)
  4: [196, 228, 246].map((fl, k) => timed({ from: [LAB_TABLE[0] - 0.3 + k * 0.3, TABLE_H + 0.012, LAB_TABLE[2] + 0.2], edgeZ: LAB_TABLE[2] + 0.45, h: TABLE_H, push: 0.6 }, fl + 14)),
  5: [256, 262, 268, 277, 283, 289].map((fl, k) => timed({ from: [LAB_TABLE[0] - 0.4 + (k % 3) * 0.4, TABLE_H + 0.012, LAB_TABLE[2] + 0.25], edgeZ: LAB_TABLE[2] + 0.45, h: TABLE_H, push: 0.8 }, fl)),
  9: Array.from({ length: 14 }, (_, k) => timed({ from: [CLASS[0] - 2.4 + (k % 7) * 0.8, 0.76, DESK_ROWS[Math.floor(k / 7)] + 0.15], edgeZ: DESK_ROWS[Math.floor(k / 7)] + 0.3, h: 0.75, push: 0.5 }, 540 + k * 5 + (k % 3) * 4)),
  11: [timed({ from: [CLASS[0] + 0.1, 0.762, 0.2], edgeZ: 0.4, h: 0.75, push: 0.4, butter: "B" }, 748)], // B-side down on "down" (749)
  12: [timed({ from: [KITCHEN[0] + 0.0, TABLE_H + 0.012, 0.42], edgeZ: TABLE_EDGE_Z, h: TABLE_H, slow: 0.3, push: 0.35 }, 1200)], // slow: tips on "tips" (786), spins on "spin" (829), never lands in shot 12
  13: [timed({ from: [KITCHEN[0] + 0.0, TABLE_H + 0.012, 0.42], edgeZ: TABLE_EDGE_Z, h: TABLE_H, slow: 0.4, push: 0.35 }, 939)], // half a turn, splat on "floor" (940)
  15: [timed({ from: [KITCHEN[0] + 0.0, GIANT_H + 0.012, 0.42], edgeZ: TABLE_EDGE_Z, h: GIANT_H, slow: 0.55, push: 0.35, fullTurn: true }, 1111)], // butter-up on "tall" (1112)
  17: [{ t0: F(1272), from: [KITCHEN[0] + 0.2, TABLE_H + 0.012, 0.55], edgeZ: TABLE_EDGE_Z, h: TABLE_H, flat: true, slow: 0.75 }],
};
// shots 2 and 10 show slices already in place: the hook slice on the floor, the girl's B slice on her desk
DROPS[2] = DROPS[1];
DROPS[10] = DROPS[11];
// shot 12: very slow motion, starting near the edge: it tips on "tips" (786) and is mid-spin on "spin" (829), lands after the shot
DROPS[12] = [{ t0: F(735), from: [KITCHEN[0], TABLE_H + 0.012, TABLE_EDGE_Z - 0.06], edgeZ: TABLE_EDGE_Z, h: TABLE_H, slow: 0.15, push: 0.35 }];

/** pile of fallen slices (lab floor), growing through shots 4-6: count at time t */
/** fallen slices already on the floor, fixed per shot (nothing pops in while we watch; new ones arrive by falling) */
export const LAB_PILE: Record<number, number> = { 3: 14, 4: 14, 5: 26, 6: 34, 7: 34, 8: 34 };
export const CLASS_PILE: Record<number, number> = { 9: 40, 10: 80, 11: 80 };

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixCam(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const K = (x: number, y: number, z: number): V3 => add(KITCHEN, [x, y, z]);
const L = (x: number, y: number, z: number): V3 => add(LAB, [x, y, z]);
const Cl = (x: number, y: number, z: number): V3 => add(CLASS, [x, y, z]);
const St = (x: number, y: number, z: number): V3 => add(STREET, [x, y, z]);
const sliceAt = (id: number, k: number, f: number) => dropAt(DROPS[id][k], F(f)).pos;

// cast spots the camera frames (cast.ts reads them too)
export const DAD: V3 = K(0.55, 0, 1.2);            // stands just in front of the table, right of the splat
export const DAD_BEHIND: V3 = K(0.45, 0, -0.42);     // shots 1-2: behind the table on the hook lens's axis, pushing the slice toward it
export const MATT_LAB: V3 = L(0.0, 0, -0.55);       // behind the lab table, facing the lens
export const COLL_A: V3 = L(2.55, 0, -1.6), COLL_B: V3 = L(3.15, 0, -1.25); // in the doorway (right wall)
export const KID_B: V3 = Cl(0.1, 0, -0.5);          // the girl with the marker, behind her desk
export const MATT_KITCHEN: V3 = K(-0.35, 0, -0.1);   // behind the kitchen table (shots 17)
export const GIANT_AT: V3 = St(0, 0, -15.6);         // the giant standing in the far row of houses
export const GIANT_SCALE = 11;

// 1 hook: low at the table edge, follow the slice down to the floor
const S1a = (f: number) => { const p = sliceAt(1, 0, Math.min(f, 40)); return dolly(K(-0.25, TABLE_H + 0.12, 1.55), [p[0], p[1] + 0.02, p[2]], pushK(f, 0, 0.003), { fov: 38, roll: -0.05 }); };
const S1b = (f: number) => { const p = sliceAt(1, 0, f); return { pos: K(-0.15, Math.max(0.16, p[1] * 0.7 + 0.08), 1.75) as V3, look: [p[0], Math.max(0.03, p[1] - 0.05), p[2]] as V3, fov: 40, roll: 0.04 }; };
// 2 crane up from the splat to the dad's face ("how tall you are")
const S2a = (f: number) => dolly(K(0.1, 0.25, 2.0), K(0.3, 0.05, 1.05), pushK(f, 80, 0.002), { fov: 44 });
const S2b = (f: number) => dolly(K(0.3, 1.55, 2.6), add(DAD_BEHIND, [0, 1.38, 0]), pushK(f, 90, 0.0025, 0.006, 25), { fov: 42, roll: -0.04 }); // up over the table edge to his face
// 3 lab wide (night)
const S3a = (f: number) => dolly(L(-2.6, 2.0, 4.6), L(0.2, 1.0, -0.6), pushK(f, 126, 0.0035), { fov: 46 });
// 4 Matthews pushing toast off (MS, 3/4 from the front-left)
const S4a = (f: number) => dolly(L(-1.35, 1.45, 2.35), L(0.05, 1.05, -0.1), pushK(f, 165, 0.0025), { fov: 42, roll: 0.03 });
const S4b = (f: number) => dolly(L(-0.75, 0.75, 1.75), L(0.0, 0.55, 0.3), pushK(f, 214, 0.0025), { fov: 44, roll: -0.04 }); // down to the edge as they fall
// 5 top-down on the pile (cut on "over")
const S5a = (f: number) => dolly(L(0.05, 3.1, 1.25), L(0.0, 0.0, 0.85), pushK(f, 253, 0.004, 0.008, 30), { fov: 50, roll: 0.25 });
// 6 colleagues in the doorway, then the talker
const S6a = (f: number) => dolly(L(0.7, 1.55, 1.3), add(COLL_A, [0.3, 1.35, 0.2]), pushK(f, 292, 0.0025), { fov: 42 });
const S6b = (f: number) => dolly(L(1.55, 1.6, 0.25), add(COLL_A, [0, 1.55, 0]), pushK(f, 334, 0.0025, 0.006, 25), { fov: 40, roll: 0.04 });
// 7 Matthews close-up in the iris
const S7a = (f: number) => dolly(L(-0.1, 1.55, 1.6), add(MATT_LAB, [0, 1.58, 0]), pushK(f, 388, 0.003, 0.009, 24), { fov: 38, roll: -0.03 });
// 8 the balance scale (two slices), Matthews behind it with a magnifier
const S8a = (f: number) => dolly(L(0.5, 1.3, 1.75), L(0.05, 1.18, -0.1), pushK(f, 431, 0.0028), { fov: 42 });
const S8b = (f: number) => dolly(L(0.3, 1.25, 1.35), L(0.0, 1.15, -0.1), pushK(f, 490, 0.002, 0.007, 22), { fov: 40, roll: 0.03 });
// 9 classroom wide, then the crane back on "ten thousand"
const S9a = (f: number) => dolly(Cl(-0.4, 1.7, 4.6), Cl(-0.4, 1.2, -0.6), pushK(f, 513, 0.0025), { fov: 46 });
const S9b = (f: number) => ({ pos: Cl(0.6, 3.1, 7.2) as V3, look: Cl(-0.3, 0.6, -0.8) as V3, fov: 52, roll: -0.02 }); // stays below the wall tops
// 10 the girl draws a B (high angle onto the desk + her face)
const S10a = (f: number) => dolly(Cl(0.55, 1.75, 1.35), add(KID_B, [0, 0.95, 0.45]), pushK(f, 622, 0.003, 0.007, 25), { fov: 42, roll: 0.04 });
// 11 the drop: low by the desk edge, then her shocked face
const S11a = (f: number) => { const p = sliceAt(11, 0, f); return dolly(Cl(0.85, 1.05, 1.55), [p[0], Math.max(0.1, p[1] * 0.7), 0.45], pushK(f, 693, 0.0045), { fov: 44, roll: -0.04 + 0.0008 * (f - 693) }); }; // slow push + roll creep: never a dead hold
const S11b = (f: number) => dolly(Cl(0.05, 0.95, 1.35), add(KID_B, [0, 0.95, 0]), pushK(f, 751, 0.004, 0.01, 12), { fov: 40, roll: 0.05 });
// 12-13 the explanation, side-on (lens on +x looking -x at the table edge)
const S12a = (f: number) => dolly(K(1.75, TABLE_H + 0.12, 0.85), K(0, TABLE_H + 0.02, 0.8), pushK(f, 764, 0.0025, 0.006, 25), { fov: 36 });
const S13a = (f: number) => dolly(K(2.5, 0.98, 1.05), K(0, 0.45, 0.95), pushK(f, 846, 0.0018), { fov: 42 });
const S13b = (f: number) => dolly(K(1.55, 0.18, 1.05), K(0, 0.06, 1.12), pushK(f, 930, 0.003, 0.008, 20), { fov: 40, roll: 0.05 }); // down to the floor for the splat
// 14 coin flip (dad CU, coin above)
const S14a = (f: number) => dolly(K(0.6, 1.6, 3.8), add(DAD, [0.15, 1.6, 0]), pushK(f, 956, 0.0028, 0.006, 24), { fov: 42, roll: 0.03 });
// 15 the giant table: low, looking up; then follow the slice down
const S15a = (f: number) => dolly(K(1.7, 0.6, 4.4), K(0.1, 2.3, 0.6), pushK(f, 1025, 0.0025), { fov: 52, roll: -0.03 });
const S15b = (f: number) => { const p = sliceAt(15, 0, f); return { pos: K(1.4, Math.max(0.35, p[1] * 0.55 + 0.25), 3.0) as V3, look: [p[0], Math.max(0.05, p[1]), p[2]] as V3, fov: 46, roll: 0.03 }; };
// 16 the dad beside a normal table, table edge at his hip
const S16a = (f: number) => dolly(K(1.9, 1.1, 3.6), add(DAD, [-0.35, 0.95, -0.3]), pushK(f, 1127, 0.0025, 0.005, 25), { fov: 44, roll: -0.02 });
// 17 Matthews in the kitchen ("two ways"), then the swat
const S17a = (f: number) => dolly(K(0.4, 1.45, 2.6), add(MATT_KITCHEN, [0, 1.5, 0]), pushK(f, 1185, 0.0028, 0.006, 25), { fov: 40 });
const S17b = (f: number) => dolly(K(1.95, 1.3, 3.0), K(0.1, 0.72, 1.25), pushK(f, 1246, 0.002), { fov: 52, roll: 0.05 }); // Matthews, the slice and where it lands
// 18 the giant over the rooftops: crane up and back
const S18a = (f: number) => dolly(St(4.0, 1.6, 12.5), add(GIANT_AT, [0, 12.5, 0]), pushK(f, 1293, 0.0015), { fov: 56, roll: 0.02 });
const S18b = (f: number) => ({ pos: St(6.0, 3.0, 19) as V3, look: add(GIANT_AT, [0, 13.5, 0]), fov: 58, roll: -0.02 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 34, dur: 30, s: S1b }],
  2: [{ f: 80, s: S2a }, { f: 88, dur: 30, s: S2b }],
  3: [{ f: 122, s: S3a }],
  4: [{ f: 165, s: S4a }, { f: 208, dur: 26, s: S4b }],
  5: [{ f: 253, s: S5a }],
  6: [{ f: 292, s: S6a }, { f: 326, dur: 22, s: S6b }],
  7: [{ f: 388, s: S7a }],
  8: [{ f: 431, s: S8a }, { f: 482, dur: 22, s: S8b }],
  9: [{ f: 509, s: S9a }, { f: 570, dur: 40, s: S9b }],
  10: [{ f: 622, s: S10a }],
  11: [{ f: 693, s: S11a }, { f: 751, cut: true, s: S11b }],
  12: [{ f: 760, s: S12a }],
  13: [{ f: 846, s: S13a }, { f: 918, dur: 24, s: S13b }],
  14: [{ f: 952, s: S14a }],
  15: [{ f: 1025, s: S15a }, { f: 1075, dur: 24, s: S15b }],
  16: [{ f: 1127, s: S16a }],
  17: [{ f: 1185, s: S17a }, { f: 1244, cut: true, s: S17b }],
  18: [{ f: 1289, s: S18a }, { f: 1305, dur: 30, s: S18b }],
};

// impact kicks (s, strength): splats and the swat
const KICKS: [number, number][] = [[F(71), 0.9], [F(940), 1.1], [F(749), 0.7], [F(1276), 0.6], [F(1112), 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(F(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const Ln = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * Ln * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

// ---------------- lens: subject always sharp, mild background blur on close shots only ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 5, focus: (f) => sliceAt(1, 0, f) }, // the falling slice
  { f: 80, cInf: 3, focus: () => K(0.2, 0.02, 1.0) },
  { f: 88, dur: 30, cInf: 4, focus: () => add(DAD_BEHIND, [0, 1.38, 0]) },
  { f: 126, cInf: 0 }, // lab wide
  { f: 165, cInf: 4, focus: () => add(MATT_LAB, [0, 1.3, 0.3]) },
  { f: 253, cInf: 0 }, // top-down
  { f: 292, cInf: 5, focus: () => add(COLL_A, [0.3, 1.5, 0.2]) },
  { f: 388, cInf: 6, focus: () => add(MATT_LAB, [0, 1.58, 0]) },
  { f: 431, cInf: 4, focus: () => L(0.05, 1.0, 0.15) },
  { f: 513, cInf: 0 }, // classroom wide + crane
  { f: 622, cInf: 5, focus: () => add(KID_B, [0, 0.95, 0.4]) },
  { f: 693, cInf: 3, focus: (f) => sliceAt(11, 0, f) },
  { f: 751, cInf: 5, focus: () => add(KID_B, [0, 0.95, 0]) },
  { f: 764, cInf: 4, focus: () => K(0, TABLE_H, 0.8) },
  { f: 846, cInf: 0 },
  { f: 956, cInf: 4, focus: () => add(DAD, [0.15, 1.6, 0]) },
  { f: 1025, cInf: 0 },
  { f: 1127, cInf: 3, focus: () => add(DAD, [-0.2, 1.0, -0.2]) },
  { f: 1185, cInf: 5, focus: () => add(MATT_KITCHEN, [0, 1.5, 0]) },
  { f: 1244, cInf: 0 },
  { f: 1293, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => { const d = dofAt(f); return d.focus ? d.focus(f) : camAt(id, f).look; };

/** spotlight iris (reference close-ups): screen-space circle (centre x/y as fractions, radius as a fraction of the width) */
export const IRIS: { a: number; b: number; cx: number; cy: number; r: number }[] = [
  { a: 388, b: 431, cx: 0.5, cy: 0.52, r: 0.5 },
  { a: 990, b: 1025, cx: 0.5, cy: 0.5, r: 0.56 },
];

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];

// ---------------- story beats (seconds) ----------------
export const BEAT = {
  down: F(71), tall: F(98), y1995: F(130), robert: F(170), pushing: F(196), off: F(228), over1: F(255), over2: F(276),
  colleagues: F(295), lost: F(318), robertLine: F(338), luck: F(373), then: F(388), happening: F(412), wait: F(431), butter: F(449),
  heavier: F(481), nope: F(498), years: F(513), kids: F(542), tenK: F(578), slices: F(602), some: F(622), letter: F(642),
  instead: F(666), landed: F(723), lsDown: F(749), see: F(764), tips: F(786), spin: F(829), normal: F(861), half: F(901), floor: F(940),
  ever: F(956), coin: F(977), early: F(986), same: F(1004), up: F(1037), three: F(1090), tallest: F(1112), tables: F(1130), we: F(1169),
  two: F(1201), save: F(1222), knock: F(1250), fast: F(1276), giant: F(1316),
};
/** quoted lines: who speaks and when (lip sync from the voice envelope) */
export const LINES: { who: "collA" | "matt"; a: number; b: number }[] = [
  { who: "collA", a: F(338), b: F(385) },
  { who: "matt", a: F(388), b: F(429) },
];
