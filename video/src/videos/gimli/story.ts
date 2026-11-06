// Timeline of "The Gimli Glider" (29.9 s, 897 frames): shots timed to the voice (shorts/gimli/voice/words.json,
// word onsets in frames are noted next to each cut), the jet's pose per shot, the camera grammar of the bridge short
// (smootherstep glides 18-40 f, cuts on big reframes, every hold creeps in, flip kicks on impacts) and the lens table.
export const FPS = 30;
export const TOTAL = 897;
export const D0 = 0; // ground height (m); build.ts / the template helpers read it
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;
const F = (f: number) => f / FPS; // frame -> seconds

// ---------------- places ----------------
/** where the jet cruises (local nose toward -z), the cockpit set, the Gimli strip, the Montreal apron, the hangar */
export const SKY: V3 = [0, 600, 0];
export const COCKPIT: V3 = [0, 640, -700];
export const REST: V3 = [11, 4.05, -16]; // jet centre after the stop at Gimli (nose at z ~ -40)
export const APRON: V3 = [-160, 4.3, 140];
export const GRILL: V3 = [11.6, 0, -49.5];
export const PODIUM: V3 = [31, 0, -22];
export const HANGAR_SPOT: V3 = [-50, 0, -130];
export const NOSE_DOWN = -0.085; // pitch after the nose gear folds (nose on the asphalt)

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Place = "sky" | "cockpit" | "gimli" | "apron" | "runway" | "hangar";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 58, light: "day", place: "sky" }, // "In 1983, a passenger jet"
  { id: 2, a: 58, b: 130, light: "day", place: "sky" }, // "ran(59) out of fuel(72) at forty-one thousand feet"
  { id: 3, a: 130, b: 168, light: "golden", place: "gimli", sunAz: 105, sunEl: 14 }, // "and everyone survived" (flash-forward)
  { id: 4, a: 168, b: 203, light: "day", place: "sky" }, // "Halfway(168) across Canada"
  { id: 5, a: 203, b: 226, light: "day", place: "sky" }, // "both engines go quiet(225)"
  { id: 6, a: 226, b: 243, light: "day", place: "cockpit" }, // screens go black
  { id: 7, a: 243, b: 315, light: "day", place: "cockpit" }, // "Luckily(243), the captain(261) flies gliders(281) as a hobby(300)"
  { id: 8, a: 315, b: 406, light: "golden", place: "gimli" }, // "Unluckily(315) ... family(372) car race(393)"
  { id: 9, a: 406, b: 441, light: "golden", place: "gimli" }, // "He glides(408) in"
  { id: 10, a: 441, b: 469, light: "golden", place: "gimli", sunAz: -95, sunEl: 16 }, // "the nose wheel(441) collapses(446)"
  { id: 11, a: 469, b: 537, light: "golden", place: "gimli", sunAz: -100, sunEl: 14 }, // "and it scrapes(474) to a stop(491) ... barbecues(515)"
  { id: 12, a: 537, b: 605, light: "day", place: "apron" }, // "You see(537), the plane measured fuel in kilograms(583)"
  { id: 13, a: 605, b: 663, light: "day", place: "apron" }, // "but(605) the crew did the sums in pounds(645)"
  { id: 14, a: 663, b: 697, light: "day", place: "runway" }, // "So it took off(670)"
  { id: 15, a: 697, b: 735, light: "day", place: "sky" }, // "with less than half(697) the fuel it needed"
  { id: 16, a: 735, b: 789, light: "day", place: "hangar" }, // "The airline punished(750) both pilots"
  { id: 17, a: 789, b: TOTAL, light: "golden", place: "gimli", sunAz: 70, sunEl: 12 }, // "Then(789) they won(805) an award(813) ... seen"
];
/** crossfades (frames) at place / time changes; a white 4-frame flash ends the hook */
export const XFADE: Record<number, number> = { 6: 6, 8: 8, 12: 8, 16: 8, 17: 8 };
export const FLASH_AT = 168;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
/** layers to draw at frame f: base shot, plus the next shot fading in during a crossfade */
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the jet ----------------
export type PlaneState = {
  visible: boolean; pos: V3; yaw: number; pitch: number; roll: number;
  gear: number;   // 1 = down, 0 = up
  nose: number;   // nose gear 0 = standing .. 1 = folded
  fan: number;    // fan rotation angle (rad)
  spark: number;  // 0..1 sparks + dust under the nose
};
/** fan speed (rad/s) at time t in a sky shot: full until "engines" (212), windmilling to a stop by "quiet" (225) */
const FAN = 38;
const fanSpeed = (t: number) => FAN * (1 - 0.93 * smooth((t - F(212)) / (F(226) - F(212))));
const fanAngle = (t: number) => { let a = 0; const n = 40; for (let i = 0; i < n; i++) a += fanSpeed((t * (i + 0.5)) / n) * (t / n); return a; };
/** slide along -z after the nose folds: centre z from z0 to the rest stop, easing out to zero speed at "stop" (491) */
const slideZ = (t: number) => { const u = clamp01((t - F(469)) / (F(492) - F(469))); return REST[2] + 40 * (1 - u) ** 2; };
export const planeAt = (id: number, t: number): PlaneState => {
  const base: PlaneState = { visible: true, pos: [...SKY] as V3, yaw: 0, pitch: 0, roll: 0, gear: 0, nose: 0, fan: fanAngle(t), spark: 0 };
  const s = SHOTS[id - 1];
  if (s.place === "sky") {
    base.pos = [SKY[0], SKY[1] + 0.35 * Math.sin(t * 0.9), SKY[2]];
    base.roll = 0.025 * Math.sin(t * 0.6); base.pitch = 0.01 * Math.sin(t * 0.7);
    return base;
  }
  if (s.place === "cockpit" || s.place === "hangar") return { ...base, visible: false };
  if (s.place === "apron") return { ...base, pos: [...APRON] as V3, gear: 1, fan: 0 };
  if (s.place === "runway") {
    // takeoff roll from z 560 at 70 m/s, rotation on "off" (676), climbing away
    const tt = t - F(663), z = 560 - 70 * tt - 4 * tt * tt, lift = Math.max(0, t - F(667));
    return { ...base, pos: [11, 4.3 + 6 * lift * lift + 2 * lift, z], pitch: 0.16 * smooth(lift / 0.6), gear: 1 - clamp01((t - F(688)) / 0.4), fan: t * FAN };
  }
  // Gimli
  if (id === 8) return { ...base, visible: false };
  if (id === 9) { // the glide in: sideslipping (wings tilted, nose off-axis) down toward the strip
    const u = clamp01((t - F(400)) / (F(445) - F(400)));
    return { ...base, pos: [11 + 6 * (1 - u), 56 - 46 * u, 300 - 200 * u], yaw: 0.22 * (1 - 0.3 * u), roll: -0.33 * (1 - 0.2 * u), pitch: 0.03, gear: 1, fan: 0.6 * t };
  }
  if (id === 10) { // rolling out on the strip; the nose gear folds on "collapses" (446)
    const tt = t - F(441), k = smooth((t - F(445)) / (5 / FPS));
    return { ...base, pos: [11, 4.3 - 0.25 * k, 108 - 38 * tt], pitch: NOSE_DOWN * k, gear: 1, nose: k, fan: 0.4 * t, spark: k };
  }
  if (id === 11) { // scraping to a stop just short of the barbecue
    const sp = clamp01(1 - (t - F(469)) / (F(495) - F(469)));
    return { ...base, pos: [REST[0], REST[1], slideZ(t)], pitch: NOSE_DOWN, gear: 1, nose: 1, fan: 0.2 * t, spark: sp };
  }
  return { ...base, pos: [...REST] as V3, pitch: NOSE_DOWN, gear: 1, nose: 1, fan: 0 }; // shots 3, 8 (not shown), 17
};
/** world position of a point given in jet-local metres (x right wing, y up, z toward the tail; nose at z -24) */
export const planePoint = (s: PlaneState, l: V3): V3 => {
  const [x0, y0, z0] = l;
  // roll about z, pitch about x, yaw about y (same order as the three.js Euler "YXZ" world.ts uses)
  const cr = Math.cos(s.roll), sr = Math.sin(s.roll), cp = Math.cos(s.pitch), sp = Math.sin(s.pitch), cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
  const x1 = x0 * cr - y0 * sr, y1 = x0 * sr + y0 * cr, z1 = z0;
  const y2 = y1 * cp - z1 * sp, z2 = y1 * sp + z1 * cp, x2 = x1;
  const x3 = x2 * cy + z2 * sy, z3 = -x2 * sy + z2 * cy;
  return [s.pos[0] + x3, s.pos[1] + y2, s.pos[2] + z3];
};
export const NOSE_GEAR: V3 = [0, -2.3, -19.2];
export const ENGINE_L: V3 = [-8.6, -1.6, -6.2];
export const ENGINE_R: V3 = [8.6, -1.6, -6.2];
export const WING_TANK: V3 = [-9.5, -0.5, -1.2]; // on the left wing's top skin, mid-chord

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
/** push-in factor since f0: the subject grows ~rate per frame; `punch` raises it (8 f soft edges) for n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const C = (x: number, y: number, z: number) => add(COCKPIT, [x, y, z]);
const P = (id: number, f: number) => planeAt(id, F(f));

// sky: the jet flies toward -z, so the lens on the -z side sees its front
const S1a = (f: number) => dolly([-52, 609, -60], [2, 600.5, 1], pushK(f, 0, 0.0028), { fov: 42, roll: -0.03 });
const S2a = (f: number) => dolly([-17, 597.2, -19], [-8.6, 598.2, -6], pushK(f, 58, 0.0025), { fov: 38, roll: 0.03 }); // left engine
const S2b = (f: number) => ({ pos: [-120, 650, -170] as V3, look: [0, 596, 0] as V3, fov: 36, roll: 0.02 }); // pull far back and up: tiny jet over the cloud sea
const S4a = (f: number) => dolly([34, 590, -78], [0, 601, -2], pushK(f, 168, 0.0025), { fov: 42, roll: 0.04 });
const S5a = (f: number) => dolly([15.5, 597.6, -18.5], [8.6, 598.4, -6.2], pushK(f, 203, 0.003, 0.006, 22), { fov: 36, roll: -0.04 });
const S15a = (f: number) => dolly([-14.5, 606.2, 8.5], [-9.5, 599.5, -1.2], pushK(f, 697, 0.0028), { fov: 42, roll: 0.03 });
// cockpit (pilots sit facing -z; captain left seat x -0.62, first officer x +0.62)
const S6a = (f: number) => dolly(C(0.32, 0.98, -0.42), C(-0.05, 0.74, -1.05), pushK(f, 226, 0.004), { fov: 50, roll: -0.04 });
const S7a = (f: number) => dolly(C(0, 1.32, -1.32), C(0, 1.12, 0.4), pushK(f, 243, 0.0022), { fov: 50 });
const S7b = (f: number) => dolly(C(-0.3, 1.36, -1.12), C(-0.7, 1.32, 0.38), pushK(f, 262, 0.002, 0.006, 30), { fov: 46, roll: 0.04 });
// Gimli
const S3a = (f: number) => dolly([2, 1.6, -66], [9, 3.0, -36], pushK(f, 130, 0.003), { fov: 46, roll: 0.03 });
const S8a = (f: number) => dolly([-42, 10, -128], [-6, 1.2, -46], pushK(f, 315, 0.0018), { fov: 44 });
const S8b = (f: number) => dolly([-6.5, 0.7, -86], [-10.5, 0.8, -52], pushK(f, 370, 0.0025), { fov: 40, roll: -0.04 });
const S9a = (f: number) => {
  const p = planePoint(P(9, f), [0, 0, 0]);
  return { pos: [21, 1.35, -64] as V3, look: [p[0] * 0.6 + 14 * 0.4, p[1] * 0.75 + 3, p[2] * 0.75 - 64 * 0.25] as V3, fov: 50, roll: 0.05 };
};
const S10a = (f: number) => {
  const s = P(10, f), n = planePoint(s, NOSE_GEAR);
  return { pos: [n[0] - 9.5, 1.3, n[2] - 6.5] as V3, look: [n[0], 1.1, n[2] + 1.2] as V3, fov: 44, roll: -0.03 };
};
const S11a = (f: number) => dolly([14.6, 1.25, -61], [11, 2.4, -30], pushK(f, 469, 0.0018), { fov: 46 });
const S11b = (f: number) => dolly([13.2, 1.5, -56.2], [11.7, 1.0, -49.4], pushK(f, 512, 0.002, 0.006, 25), { fov: 40, roll: 0.04 }); // the grill ("barbecues")
const S17a = (f: number) => dolly([45, 2.0, -40], [PODIUM[0], 2.1, PODIUM[2]], pushK(f, 789, 0.0022), { fov: 44, roll: -0.03 });
const S17b = (f: number) => dolly([37.5, 2.6, -30.5], [PODIUM[0], 2.5, PODIUM[2]], pushK(f, 836, 0.002, 0.005, 30), { fov: 40, roll: 0.03 });
// Montreal apron (jet parked at APRON, nose toward -z; refuelling point under the left wing)
const A = (x: number, y: number, z: number) => add([APRON[0], 0, APRON[2]], [x, y, z]);
const S12a = (f: number) => dolly(A(-20.5, 2.1, -22.5), A(-11.6, 2.4, -9.6), pushK(f, 537, 0.0022), { fov: 46 });
const S13a = (f: number) => dolly(A(-15.0, 1.8, -16.2), A(-12.2, 1.7, -10.0), pushK(f, 605, 0.0025, 0.006, 30), { fov: 38, roll: 0.03 });
// takeoff: a panning lens beside the runway
const S14a = (f: number) => {
  const p = planePoint(P(14, f), [0, 0, 0]);
  return { pos: [48, 7.5, 452] as V3, look: [p[0], p[1] + 1.5, p[2]] as V3, fov: 40, roll: 0.02 };
};
// hangar (lens looks -x: screen right = -z)
const H = (x: number, y: number, z: number) => add(HANGAR_SPOT, [x, y, z]);
const S16a = (f: number) => dolly(H(9.0, 1.7, -0.25), H(0, 1.4, -0.25), pushK(f, 735, 0.0025, 0.006, 30), { fov: 42 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }],
  2: [{ f: 58, s: S2a }, { f: 84, dur: 40, s: S2b }], // pull back across "forty-one thousand feet"
  3: [{ f: 130, s: S3a }],
  4: [{ f: 168, s: S4a }],
  5: [{ f: 203, s: S5a }],
  6: [{ f: 226, s: S6a }],
  7: [{ f: 243, s: S7a }, { f: 254, dur: 26, s: S7b }], // glide onto the captain, centred on "captain" (261)
  8: [{ f: 315, s: S8a }, { f: 370, cut: true, s: S8b }], // cut down to the kart lane on "family" (372)
  9: [{ f: 406, s: S9a }],
  10: [{ f: 441, s: S10a }],
  11: [{ f: 469, s: S11a }, { f: 512, cut: true, s: S11b }],
  12: [{ f: 537, s: S12a }],
  13: [{ f: 605, s: S13a }],
  14: [{ f: 663, s: S14a }],
  15: [{ f: 697, s: S15a }],
  16: [{ f: 735, s: S16a }],
  17: [{ f: 789, s: S17a }, { f: 824, dur: 30, s: S17b }],
};

// impact kicks: image offset flips sign every frame, decays over 7 f (seconds, strength)
const KICKS: [number, number][] = [[F(225), 0.5], [F(446), 1.4], [F(474), 0.7], [F(491), 1.0]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
/** a slow hand-free shake while the jet scrapes along (shot 11, until the stop) */
const rumble = (f: number) => (f >= 469 && f < 492 ? 0.35 * (1 - (f - 469) / 23) * (f % 2 ? -1 : 1) : 0);
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(F(f)) + rumble(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
/** cInf = blur-disc radius in px at 1080x1920 for things at infinity (0 = sharp); focus = world point (else the look point) */
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 }, // cruise wide
  { f: 58, cInf: 8 }, // engine (focus = look)
  { f: 84, dur: 40, cInf: 0 }, // pull-back: sharp
  { f: 130, cInf: 12, focus: () => [3.8, 1.5, -58.3] }, // survivors cheering, jet soft behind
  { f: 168, cInf: 0 },
  { f: 203, cInf: 10 }, // engine CU
  { f: 226, cInf: 12 }, // screens
  { f: 243, cInf: 10, focus: () => C(0, 1.25, 0.35) }, // both pilots
  { f: 254, dur: 26, cInf: 11, focus: () => C(-0.62, 1.3, 0.38) }, // captain
  { f: 315, cInf: 0 }, // race wide
  { f: 370, cInf: 10, focus: () => [-9.2, 0.8, -74] }, // kart lane
  { f: 406, cInf: 0 }, // glide in (the jet must read)
  { f: 441, cInf: 9 }, // nose gear (focus = look)
  { f: 469, cInf: 0 },
  { f: 512, cInf: 12 }, // grill CU
  { f: 537, cInf: 0 }, // apron
  { f: 605, cInf: 12, focus: () => A(-12.2, 1.6, -9.6) }, // crew MS
  { f: 663, cInf: 0 }, // takeoff
  { f: 697, cInf: 6 }, // wing tank
  { f: 735, cInf: 10, focus: () => H(0, 1.55, -0.25) }, // boss + pilots
  { f: 789, cInf: 6, focus: () => [PODIUM[0], 2.3, PODIUM[2]] }, // podium
  { f: 824, dur: 30, cInf: 11, focus: () => [PODIUM[0], 2.5, PODIUM[2]] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => { const d = dofAt(f); return d.focus ? d.focus(f) : camAt(id, f).look; };
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};

/** near framing objects (kit = a GLB name accepted by kitClone): visible while a <= f < b inside their own shot */
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 315, b: 370, kit: "plant_bushDetailed", pos: [-33.5, 0, -116], s: 2.2, yaw: 0.3 }, // race wide: bush bottom-left
  { a: 537, b: 605, kit: "car:cone", pos: [-178.6, 0, 120.8], s: 0.75, yaw: 0.2 }, // apron: a traffic cone bottom-left
];

// ---------------- story beats (seconds) the cast and effects read ----------------
export const BEAT = {
  sputter: F(72), engines: F(212), quiet: F(225), luckily: F(243), gliders: F(281), hobby: F(300),
  family: F(372), glides: F(408), collapse: F(446), scrape: F(474), stop: F(491), barbecue: F(515),
  kilo: F(583), pounds: F(645), off: F(676), half: F(697), punished: F(750), won: F(805), award: F(813),
};
