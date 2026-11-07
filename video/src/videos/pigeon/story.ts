// Timeline of "The Pigeons Who Flew a Bomb" (44.5 s, 1335 frames), timed to the voice (shorts/pigeon/voice/words.json).
// Camera grammar from the 20-video reference study (references/reports/motion.md): the lens almost never holds still,
// smootherstep glides of ~18-40 f, slow push-ins in holds, cuts for big reframes, 8 f crossfades between places, flip kicks
// on impacts, actions landing 0-3 f before their word. Every frame is reviewed before delivery (SKILL.md step 10b).
import { pigeonTip, PSU } from "./birds";
export const FPS = 30;
export const TOTAL = 1335;
export const D0 = 0;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const F = (f: number) => f / FPS;
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- places ----------------
export const RANGE: V3 = [0, 0, 0];      // sea test range (bomb + target raft)
export const CONE: V3 = [100, 0, 0];     // inside the nose cone (cut-away), three pigeon stations
export const LAB: V3 = [60, 0, 0];       // Skinner's lab, 1943 (night, lamps)
export const WAR: V3 = [140, 0, 0];      // war room
export const YARD: V3 = [180, 0, 0];     // backyard (dog + treats)
export const STAGE: V3 = [220, 0, 0];    // 2024 award stage
export const TABLE_H = 0.76;
export const LAB_TABLE: V3 = [LAB[0], 0, 0.2];
export const DESK_ROWS = [-1.5, 0.1]; // (engine compatibility)

// nose-cone stations: pigeons face -z toward their screens; a full peck puts the beak tip on the screen surface
export const STATION_X = [-0.36, 0, 0.36];
export const STATION_FLOOR = 0.12;               // the cradle floor the birds stand on
export const SCREEN_Z = -0.2;                      // screen plane (faces +z, toward the birds)
const TIP1 = pigeonTip(1);                         // beak tip at a full peck (canvas units)
export const BIRD_Z = SCREEN_Z + (TIP1[0] - 200) * PSU; // card centre z so that the full-peck tip lands on the screen
export const PECK_Y = STATION_FLOOR + (380 - TIP1[1]) * PSU; // height where the beak meets the screen
export const LENS: V3 = [CONE[0], 0.42, -0.95];

// ---------------- shots ----------------
export type Light = "day" | "golden" | "night";
export type Place = "range" | "cone" | "lab" | "war" | "yard" | "stage";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 90, light: "golden", place: "range", sunAz: 95, sunEl: 14 }, // "During World War Two, America built a guided missile(75)"
  { id: 2, a: 90, b: 144, light: "night", place: "cone" },   // "and the pilots were pigeons(120)."
  { id: 3, a: 144, b: 208, light: "night", place: "lab" },   // "It's 1943(149), and psychologist"
  { id: 4, a: 208, b: 316, light: "night", place: "lab" },   // "B. F. Skinner(220) is training pigeons to peck(262) at a picture of an enemy ship(302)."
  { id: 5, a: 316, b: 367, light: "night", place: "lab" },   // "Every good peck(329) gets a seed(349)."
  { id: 6, a: 367, b: 433, light: "night", place: "lab" },   // "He straps(369) three of them into the nose of a bomb(416),"
  { id: 7, a: 433, b: 480, light: "night", place: "cone" },  // "each facing a tiny screen(462)."
  { id: 8, a: 480, b: 556, light: "night", place: "war" },   // "The generals laugh(500). 'Pigeons(516)? Really(539)?'"
  { id: 9, a: 556, b: 615, light: "golden", place: "range", sunAz: 95, sunEl: 14 }, // "But in the tests(565), the birds"
  { id: 10, a: 615, b: 647, light: "night", place: "cone" }, // "keep the bomb locked(615) on target(630)."
  { id: 11, a: 647, b: 711, light: "night", place: "cone" }, // "Wait(647), how does a bird steer a bomb?" (iris)
  { id: 12, a: 711, b: 848, light: "night", place: "cone" }, // "You see(711), a lens(726) ... drifts(793), the pecks(814) tilt(826) the screen,"
  { id: 13, a: 890, b: 976, light: "night", place: "cone" }, // "And if one pigeon gets it wrong(919), the other two outvote(954) it."
  { id: 14, a: 976, b: 1043, light: "day", place: "yard" },  // "Ever trained a dog(989) with treats(1004)? Same idea(1021),"
  { id: 15, a: 1043, b: 1076, light: "night", place: "cone" }, // "but with explosives(1053)."
  { id: 16, a: 1076, b: 1122, light: "night", place: "war" }, // "The military cancelled(1091) it anyway."
  { id: 17, a: 1122, b: 1203, light: "night", place: "lab" }, // "Skinner said the problem was that nobody took them seriously(1180)."
  { id: 18, a: 1203, b: TOTAL, light: "night", place: "stage" }, // "Eighty years later ... a prize(1263) for it: the Ig Nobel Peace Prize(1308)."
  { id: 19, a: 848, b: 890, light: "golden", place: "range", sunAz: 95, sunEl: 14 }, // "and that steers(863) the bomb." (outside: the fins swing, the bomb banks)
];
export const XFADE: Record<number, number> = { 3: 8, 8: 8, 9: 6, 14: 8, 16: 8, 17: 8, 18: 8 };
export const FLASH_AT = -100;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the bomb in flight (range shots) ----------------
export type BombState = { pos: V3; pitch: number; roll: number; fin: number; yaw?: number };
export const TARGET: V3 = [RANGE[0], 0, -300];
/** glide path toward the raft: shot 1 high and far, shot 9 low and close; fins twitch with the pecks */
export const bombAt = (t: number): BombState => {
  if (t >= F(840) && t < F(895)) { // shot 19: the screen tilt reaches the fins; the bomb banks and turns toward the raft
    const s = t - F(848), turn = smooth((t - F(856)) / 0.8), bump = smooth((t - F(850)) / 0.25) * (1 - smooth((t - F(874)) / 0.35));
    return { pos: [RANGE[0] + 20 - 7 * turn * Math.max(0, s), 45 - 3 * s, -40 - 40 * s], pitch: -0.1, roll: 0.38 * bump, yaw: 0.32 * turn, fin: 0.5 * bump };
  }
  const u = t < F(300) ? clamp01(t / F(90)) * 0.35 : 0.55 + 0.45 * clamp01((t - F(556)) / F(59));
  const z = 120 - 380 * u, y = 70 - 58 * u;
  return { pos: [RANGE[0] + 6 * Math.sin(t * 0.7), y, z], pitch: -0.12, roll: 0.05 * Math.sin(t * 1.3), fin: 0.18 * Math.sin(t * 9) };
};

// ---------------- pecking (cone shots): every bird's peck 0..1 per frame ----------------
const pulse = (t: number, t0: number, dur = 0.16) => { const u = (t - t0) / dur; return u < 0 || u > 1 ? 0 : Math.sin(Math.PI * u); };
/** a peck train: pecks every `gap` s from t0 (phase-shifted per bird) */
const train = (t: number, t0: number, t1: number, gap: number, ph = 0) => {
  if (t < t0 || t > t1) return 0;
  const k = Math.floor((t - t0 - ph) / gap);
  return pulse(t, t0 + ph + k * gap);
};
export const peckAt = (id: number, bird: number, t: number) => {
  switch (id) {
    case 2: return train(t, F(96), F(144), 0.42, bird * 0.13);
    case 7: return train(t, F(455), F(480), 0.35, bird * 0.1);
    case 10: return train(t, F(612), F(647), 0.22, bird * 0.07); // furious pecking, locked on target
    case 11: return 0; // the curious pause (iris)
    case 12: return bird === 1 ? pulse(t, F(806), 0.2) + pulse(t, F(840), 0.2) : 0; // the peck that tilts the screen
    case 13: return bird === 1 ? pulse(t, F(912), 0.2) : t > F(950) ? pulse(t, F(950), 0.22) : 0; // the wrong one, then the outvote
    case 15: return bird === 1 ? pulse(t, F(1048), 0.2) : 0;
    default: return 0;
  }
};
/** screen image drift (shot 12: drifts on "drifts", the pecks pull it back) */
export const driftAt = (id: number, t: number) => (id === 12 ? 0.22 * smooth((t - F(788)) / 0.4) * (1 - smooth((t - F(812)) / 0.35)) : id === 13 ? (t > F(912) && t < F(952) ? -0.12 : 0) : 0);
/** screen tilt (shot 12, "tilt") and tail-fin angle ("steers") */
export const tiltAt = (id: number, t: number) => (id === 12 ? 0.25 * smooth((t - F(818)) / 0.25) * (1 - smooth((t - F(870)) / 0.4)) : 0);

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
const Co = (x: number, y: number, z: number): V3 => add(CONE, [x, y, z]);
const Lb = (x: number, y: number, z: number): V3 => add(LAB, [x, y, z]);
const Wr = (x: number, y: number, z: number): V3 => add(WAR, [x, y, z]);
const Yd = (x: number, y: number, z: number): V3 => add(YARD, [x, y, z]);
const Sg = (x: number, y: number, z: number): V3 => add(STAGE, [x, y, z]);
const B = (f: number) => bombAt(F(f)).pos;

// cast spots
export const SKINNER: V3 = Lb(0.0, 0, -0.6);
export const SKINNER_BOX: V3 = Lb(-0.3, 0, -0.6);        // shots 3-4: right behind the training box (then he walks to the bench nose)
export const TRAIN_BOX: V3 = Lb(-0.35, TABLE_H, 0.12);      // training box on the bench (open toward +z / the lens)
/** the training screen hangs on the box's left inner wall, facing +x: the bird faces -x and pecks it in profile */
export const TRAIN_SCREEN_X = TRAIN_BOX[0] - 0.21 + 0.022;
export const CONE_ON_BENCH: V3 = Lb(0.45, TABLE_H, 0.22);   // the cut-open nose section on the bench
export const GENERALS: V3[] = [Wr(-0.9, 0, -0.75), Wr(0.0, 0, -0.95), Wr(0.9, 0, -0.75), Wr(1.45, 0, 0.1)];
export const BOY: V3 = Yd(-0.45, 0, 0.0), DOG: V3 = Yd(0.38, 0, 0.15);
export const DAUGHTER: V3 = Sg(0.15, 0.6, -0.45);           // standing on the stage (stage top at 0.6)
export const PODIUM: V3 = Sg(-0.55, 0.6, -0.15);
export const BIRD_STAGE: V3 = Sg(-0.55, 0.6 + 1.12, -0.12); // a pigeon perched on the podium top

// 1 the bomb over the sea: a chase lens beside it, gliding back to reveal the raft far ahead
const S1a = (f: number) => { // a slow orbit + push round the whole bomb (behind-right quarter, swinging toward its side)
  const b = B(f), th = 0.55 + 0.006 * f, R = 9.5 - 0.03 * f;
  return { pos: [b[0] + R * Math.sin(th), b[1] + 2.0 - 0.006 * f, b[2] + R * Math.cos(th)] as V3, look: [b[0], b[1] - 0.1, b[2] - 0.3] as V3, fov: 40, roll: -0.05 };
};
const S1b = (f: number) => { const b = B(f); return { pos: [b[0] + 4.2, b[1] + 0.8, b[2] - 6.5] as V3, look: [b[0], b[1], b[2] + 0.3] as V3, fov: 42, roll: 0.04 }; };
// 2 inside the nose: 3/4 from the front, above the screens: three heads over three screens
const S2a = (f: number) => dolly(Co(1.12, 0.74, -1.02), Co(0.07, 0.27, BIRD_Z - CONE[2]), pushK(f, 90, 0.002, 0.005, 28), { fov: 52, roll: 0.04 }); // front quarter: three faces over their screens, in a row
// 3 lab wide (night), 4 Skinner at the training box, 5 insert peck + seed, 6 strapping into the cone
const S3a = (f: number) => dolly(Lb(-2.4, 2.0, 4.2), Lb(0.0, 1.0, -0.4), pushK(f, 140, 0.0035), { fov: 46 });
const S4a = (f: number) => dolly(Lb(-1.25, 1.45, 2.1), Lb(-0.15, 1.1, -0.1), pushK(f, 208, 0.0025), { fov: 42, roll: 0.03 });
const S4b = (f: number) => dolly(add(TRAIN_BOX, [0.45, 0.55, 1.35]), add(TRAIN_BOX, [-0.05, 0.38, -0.15]), pushK(f, 250, 0.0018), { fov: 44, roll: -0.03 }); // the ship screen face-on, Skinner above
const S5a = (f: number) => dolly(add(TRAIN_BOX, [0.3, 0.3, 0.95]), add(TRAIN_BOX, [-0.08, 0.13, 0.0]), pushK(f, 316, 0.002, 0.006, 24), { fov: 40, roll: 0.04 }); // bird, screen and seed tray all in
const S6a = (f: number) => dolly(Lb(1.65, 1.55, 0.95), Lb(0.3, 1.02, -0.02), pushK(f, 367, 0.0018), { fov: 46, roll: -0.03 }); // from the open side: into the nose section, Skinner behind it
// 7 the three screens light up (low, along the row of stations)
const S7a = (f: number) => dolly(Co(0.85, 0.62, 0.6), Co(0, 0.24, -0.16), pushK(f, 433, 0.004), { fov: 44, roll: -0.04 }); // behind and above: birds + lit screens
// 8 war room: generals laughing round the map table; then the doubter
const S8a = (f: number) => dolly(Wr(0.27, 2.0, 5.2), Wr(0.27, 1.1, -0.6), pushK(f, 476, 0.0015), { fov: 50 }); // all four generals
const S8b = (f: number) => dolly(Wr(0.5, 1.6, 0.9), add(GENERALS[1], [0, 1.5, 0]), pushK(f, 512, 0.0025, 0.007, 25), { fov: 40, roll: 0.04 });
// 9 the test: the bomb dives on the raft
const S9a = (f: number) => { // behind and above the bomb, down its line: the bomb low in frame, the raft ahead of it
  const b = B(f), d = [TARGET[0] - b[0], 0, TARGET[2] - b[2]], n = Math.hypot(d[0], d[2]), u = [d[0] / n, 0, d[2] / n];
  const pos: V3 = [b[0] - u[0] * 8 + u[2] * 0.3, b[1] + 2.8, b[2] - u[2] * 8 - u[0] * 0.3];
  const look: V3 = [b[0] + (TARGET[0] - b[0]) * 0.3, b[1] + (TARGET[1] - b[1]) * 0.3, b[2] + (TARGET[2] - b[2]) * 0.3];
  return { pos, look, fov: 48, roll: 0.04 };
};
// 10 inside: furious pecking, locked on (side view)
const S10a = (f: number) => dolly(Co(0.75, 0.6, 0.5), Co(0, 0.24, -0.16), pushK(f, 615, 0.0045), { fov: 44, roll: 0.04 }); // behind and above: all three pecking their screens
// 11 iris close-up on the middle bird ("Wait")
const S11a = (f: number) => dolly(Co(0.2, 0.52, -0.5), Co(0, 0.36, BIRD_Z - CONE[2]), pushK(f, 647, 0.003, 0.008, 24), { fov: 38 });
// 12 the explanation: side-on cut-away from the lens back to the fins
const S12a = (f: number) => dolly(Co(0.55, 1.95, 0.55), Co(-0.02, 0.28, -0.5), pushK(f, 711, 0.0025), { fov: 52 }); // high: the lens at the top, its light down to the screens, the birds below
const S12b = (f: number) => dolly(Co(0.95, 0.5, 0.25), Co(0, 0.24, -0.16), pushK(f, 780, 0.003), { fov: 42 });
const S19a = (f: number) => { const b = B(f); return { pos: [b[0] + 3.0, b[1] + 1.4, b[2] + 6.4] as V3, look: [b[0] - 0.3, b[1] - 0.1, b[2] - 1.0] as V3, fov: 42, roll: 0.03 }; }; // chase: the fins swing and the bomb banks
// 13 the outvote: front 3/4 above the screens
const S13a = (f: number) => dolly(Co(0.45, 0.52, -0.62), Co(0, 0.3, BIRD_Z - CONE[2]), pushK(f, 890, 0.003), { fov: 44, roll: 0.03 }); // close: the middle bird pecks wrong, nervous
const S13b = (f: number) => dolly(Co(1.1, 0.8, -1.0), Co(-0.02, 0.27, BIRD_Z - CONE[2]), pushK(f, 936, 0.0015), { fov: 52, roll: 0.02 }); // pull out: the other two glare, then outvote it
// 14 the yard: boy + dog
const S14a = (f: number) => dolly(Yd(0.0, 1.05, 3.9), Yd(-0.02, 0.62, 0.0), pushK(f, 972, 0.002, 0.005, 24), { fov: 44, roll: -0.03 }); // the boy and the dog both whole
// 15 the pigeon in a helmet, pull back to the cone ("explosives")
const S15a = (f: number) => dolly(Co(0.45, 0.52, -0.62), Co(0, 0.3, BIRD_Z - CONE[2]), 1, { fov: 40 }); // close: the helmeted pilot gets its seed
const S15b = (f: number) => dolly(Co(0.9, 2.2, -0.95), Co(0, 0.3, 0.45), pushK(f, 1066, 0.002), { fov: 50, roll: 0.03 }); // pull up and back: the pilots sit right in front of the warhead
// 16 the stamp
const S16a = (f: number) => dolly(Wr(0.25, 1.75, 1.3), Wr(0.0, 0.8, -0.05), pushK(f, 1072, 0.003, 0.008, 22), { fov: 42, roll: 0.03 });
// 17 Skinner, deflated, a pigeon on his shoulder (iris)
const S17a = (f: number) => dolly(Lb(-0.2, 1.55, 1.5), add(SKINNER, [0.05, 1.5, 0]), pushK(f, 1118, 0.0025, 0.006, 26), { fov: 40, roll: -0.02 });
// 18 the stage: wide, then in on the trophy
const S18a = (f: number) => dolly(Sg(0.4, 1.7, 5.2), Sg(-0.1, 1.4, -0.3), pushK(f, 1199, 0.003), { fov: 46 });
const S18b = (f: number) => dolly(Sg(0.25, 2.0, 3.0), Sg(-0.08, 1.65, -0.3), pushK(f, 1262, 0.001, 0.0035, 30), { fov: 46, roll: 0.03 }); // the raised trophy and the podium pigeon together

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 52, dur: 34, s: S1b }],
  2: [{ f: 90, s: S2a }],
  3: [{ f: 140, s: S3a }],
  4: [{ f: 208, s: S4a }, { f: 250, dur: 30, s: S4b }],
  5: [{ f: 316, s: S5a }],
  6: [{ f: 367, s: S6a }],
  7: [{ f: 433, s: S7a }],
  8: [{ f: 476, s: S8a }, { f: 508, dur: 22, s: S8b }],
  9: [{ f: 553, s: S9a }],
  10: [{ f: 615, s: S10a }],
  11: [{ f: 647, s: S11a }],
  12: [{ f: 711, s: S12a }, { f: 786, cut: true, s: S12b }],
  19: [{ f: 848, s: S19a }],
  13: [{ f: 890, s: S13a }, { f: 934, dur: 18, s: S13b }],
  14: [{ f: 972, s: S14a }],
  15: [{ f: 1043, s: S15a }, { f: 1053, dur: 18, s: S15b }],
  16: [{ f: 1072, s: S16a }],
  17: [{ f: 1118, s: S17a }],
  18: [{ f: 1199, s: S18a }, { f: 1255, dur: 30, s: S18b }],
};
const KICKS: [number, number][] = [[F(1091), 1.2], [F(349), 0.3], [F(630), 0.5]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) { const n = Math.floor((t - t0) * FPS + 1e-6); if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
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
export const keyEnd = (id: number, f: number) => { let e = 0; for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24); return Math.max(f, e); };

// ---------------- lens: subject always sharp, mild blur on close shots only ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: 90, cInf: 4, focus: () => Co(0, 0.3, BIRD_Z - CONE[2]) },
  { f: 144, cInf: 0 },
  { f: 208, cInf: 4, focus: () => add(SKINNER_BOX, [0, 1.4, 0.2]) },
  { f: 250, dur: 30, cInf: 4, focus: () => add(TRAIN_BOX, [0, 0.18, 0]) },
  { f: 316, cInf: 5, focus: () => add(TRAIN_BOX, [0, 0.14, 0]) },
  { f: 367, cInf: 3, focus: () => add(CONE_ON_BENCH, [0, 0.15, 0]) },
  { f: 433, cInf: 3, focus: () => Co(0, 0.2, -0.1) },
  { f: 480, cInf: 0 },
  { f: 508, dur: 22, cInf: 5, focus: () => add(GENERALS[1], [0, 1.5, 0]) },
  { f: 556, cInf: 0 },
  { f: 615, cInf: 3, focus: () => Co(0, 0.24, BIRD_Z - CONE[2]) },
  { f: 647, cInf: 5, focus: () => Co(0, 0.32, BIRD_Z - CONE[2]) },
  { f: 711, cInf: 0 },
  { f: 890, cInf: 4, focus: () => Co(0, 0.27, BIRD_Z - CONE[2]) },
  { f: 934, dur: 18, cInf: 1.5, focus: () => Co(0, 0.27, BIRD_Z - CONE[2]) },
  { f: 976, cInf: 4, focus: () => Yd(0, 0.6, 0) },
  { f: 1043, cInf: 0 },
  { f: 1076, cInf: 3, focus: () => Wr(0, 0.8, -0.05) },
  { f: 1122, cInf: 5, focus: () => add(SKINNER, [0.05, 1.5, 0]) },
  { f: 1203, cInf: 0 },
  { f: 1255, dur: 30, cInf: 4, focus: () => add(DAUGHTER, [-0.2, 1.4, 0]) },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => { const d = dofAt(f); return d.focus ? d.focus(f) : camAt(id, f).look; };
export const IRIS: { a: number; b: number; cx: number; cy: number; r: number }[] = [
  { a: 647, b: 711, cx: 0.5, cy: 0.5, r: 0.52 },
  { a: 1140, b: 1203, cx: 0.5, cy: 0.5, r: 0.56 },
];
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];

export const BEAT = {
  missile: F(75), pigeons1: F(120), y1943: F(149), skinner: F(220), peck1: F(262), ship: F(302), peck2: F(329), seed: F(349),
  straps: F(369), bomb: F(416), screen: F(462), laugh: F(500), pigeonsQ: F(516), really: F(539), tests: F(565), locked: F(615),
  target: F(630), wait: F(647), lens: F(726), drifts: F(793), pecks: F(814), tilt: F(826), steers: F(863), wrong: F(919),
  outvote: F(954), dog: F(989), treats: F(1004), idea: F(1021), explosives: F(1053), cancelled: F(1091), seriously: F(1180),
  eighty: F(1203), prize: F(1263), ig: F(1293), peace: F(1308),
};
/** quoted line: the doubting general mouths "Pigeons? Really?" */
export const LINES: { who: "general"; a: number; b: number }[] = [{ who: "general", a: F(516), b: F(553) }];
