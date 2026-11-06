// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, CAPTAIN, FIRST_OFFICER, BOSS, CREW, folk, kid } from "./toon";
import {
  FPS, SHOTS, V3, clamp01, smooth, PlaneState, planePoint, BEAT, COCKPIT, GRILL, PODIUM, APRON, HANGAR_SPOT, NOSE_GEAR, ENGINE_L, ENGINE_R, WING_TANK,
} from "./story";
import { fxWeight, fxTank, fxGlider, fxSparks, fxDust, fxConfetti, fxWarn } from "./gfx";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
export const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
/** expression swaps per shot (a blink hides each swap) */
const SWAPS: Record<number, number[]> = { 7: [BEAT.luckily + 0.05, BEAT.hobby], 9: [BEAT.glides], 11: [BEAT.stop, BEAT.barbecue], 13: [BEAT.pounds], 16: [BEAT.punished], 17: [BEAT.won] };
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- the Gimli Glider cast by shot ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const FRONT = { side: false, mirror: false };
const L2 = LEAD;
type Body = { i: number; o: Outfit; key: string; x: number; y?: number; z: number; expr: Expr; scale?: number; fo?: Partial<FrontOpts>; noBlob?: boolean };
const put = (cam: CamInfo, t: number, out: Stage, id: number, b: Body) => {
  const fo: FrontOpts = { mode: "stand", expr: b.expr, blink: lidAt(t, b.i, SWAPS[id]), look: 0, ...b.fo };
  out.places.push(person(cam, { i: b.i, o: b.o, okey: b.key }, b.x, b.y ?? 0, b.z, FRONT, fo, {}, b.scale ?? 1));
  if (!b.noBlob && fo.mode !== "sit") blob(out, b.x, b.y ?? 0, b.z, b.scale ?? 1);
};
const FOLKS = Array.from({ length: 12 }, (_, v) => folk(v));
const KIDS = Array.from({ length: 6 }, (_, v) => kid(v));
const wave = (t: number, i: number, rate = 9) => q(Math.sin(t * rate + i * 1.3), 30);
/** a cheering / watching crowd at fixed spots (adults and kids mixed); expr picks per person */
const crowd = (cam: CamInfo, t: number, out: Stage, id: number, spots: [number, number][], expr: (i: number) => Expr, waving: (i: number) => boolean, i0 = 0) =>
  spots.forEach(([x, z], j) => {
    const i = i0 + j, isKid = i % 4 === 2, o = isKid ? KIDS[i % 6] : FOLKS[i % 12], sc = isKid ? 0.72 : 1;
    const hop = isKid && waving(i) ? Math.max(0, Math.sin(t * 8 + i)) * 0.16 : 0;
    put(cam, t, out, id, { i, o, key: isKid ? `k${i % 6}` : `f${i % 12}`, x, y: hop, z, expr: expr(i), scale: sc, fo: { wave: waving(i) && i % 3 !== 1 ? wave(t, i) : undefined } });
  });
/** dark smoke puffs streaming back from a point (engine sputter / grill smoke) */
const puffs = (out: Stage, t: number, at: V3, dir: V3, n: number, life: number, size: number, col: string, t0 = -1e9, t1 = 1e9, key = "puff") => {
  for (let k = 0; k < n; k++) {
    const age = ((t - t0) / life + k / n) % 1;
    if (t < t0 || t > t1 + life || age < 0) continue;
    const born = t - age * life;
    if (born < t0 || born > t1) continue;
    const u = q(age, 24), s = size * (0.5 + 1.2 * age);
    out.fx.push({ key: `${key}${col}${u}`, cw: 300, ch: 300, draw: (p) => fxDust(p, u, col), x: at[0] + dir[0] * age, y: at[1] + dir[1] * age, z: at[2] + dir[2] * age, w: s, h: s, soft: true });
  }
};
const grillSmoke = (out: Stage, t: number) => puffs(out, t, [GRILL[0], 1.0, GRILL[2]], [0.4, 2.6, 0.2], 5, 2.4, 0.7, "#cfcac4", -1e9, 1e9, "grill");

/** spots in front of a lens: d metres along its view axis (x/z), lateral offset `lat` as a fraction of the half frame width there */
const fan = (pos: V3, look: V3, list: [number, number][], hfov = 0.21): [number, number][] => {
  const dx = look[0] - pos[0], dz = look[2] - pos[2], n = Math.hypot(dx, dz), fx = dx / n, fz = dz / n;
  return list.map(([d, lat]) => [pos[0] + fx * d - fz * lat * d * hfov, pos[2] + fz * d + fx * lat * d * hfov]);
};
const SURVIVORS = fan([2, 0, -66], [9, 0, -36], [[5.2, -0.62], [5.6, 0.55], [7.2, -0.1], [8.0, 0.75], [8.4, -0.85], [9.8, 0.25], [10.4, -0.5], [11.6, 0.85],
  [12.4, -0.95], [13.2, 0.05], [14.6, 0.55], [15.4, -0.6]]);
const RACE_L: [number, number][] = [[-24.5, -96], [-23.2, -90.5], [-24.8, -85], [-23.4, -79.5], [-24.6, -73], [-23.1, -66.5], [-24.4, -60], [-23.3, -54],
  [-24.9, -48.5], [-23.0, -43]];
const RACE_R: [number, number][] = [[2.2, -84], [3.6, -79], [2.4, -74], [3.8, -69.5], [2.1, -64.6], [3.4, -59.8], [5.6, -66.5], [5.2, -76.5]];
const AWARD: [number, number][] = [[28.2, -26.6], [27, -24.8], [26.4, -22.6], [27.2, -20.2], [28.4, -18.4], [33.8, -27.4], [35.2, -25.6], [36, -23.4],
  [35.6, -20.6], [34.2, -18.4], [30.6, -28.6], [31.8, -16.6], [29.6, -30.4], [33, -30.6]];

export const stage = (id: number, t: number, ps: PlaneState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const P = (l: V3) => planePoint(ps, l);
  switch (id) {
    case 2: { // the engines splutter on "fuel": a few dark puffs stream back
      for (const e of [ENGINE_L, ENGINE_R]) puffs(out, t, P([e[0], e[1], e[2] + 3.6]), [0, 0.6, 9], 4, 0.9, 1.6, "#6e6a72", BEAT.sputter - 0.05, BEAT.sputter + 0.45, "sput");
      break;
    }
    case 5: { // last cough on "quiet"
      puffs(out, t, P([ENGINE_R[0], ENGINE_R[1], ENGINE_R[2] + 3.6]), [0, 0.8, 8], 4, 1.0, 1.4, "#6e6a72", BEAT.engines, BEAT.quiet, "sput");
      break;
    }
    case 3: { // flash-forward: everyone made it
      crowd(cam, t, out, id, SURVIVORS, (i) => (["laugh", "grin", "relief_open", "grin"] as Expr[])[i % 4], () => true);
      const [c1, c2] = fan([2, 0, -66], [9, 0, -36], [[11.0, -0.28], [11.4, 0.42]]);
      put(cam, t, out, id, { i: 90, o: CAPTAIN, key: "cap", x: c1[0], z: c1[1], expr: "relief", fo: { wave: wave(t, 3, 6) } });
      put(cam, t, out, id, { i: 91, o: FIRST_OFFICER, key: "fo", x: c2[0], z: c2[1], expr: "relief_open" });
      grillSmoke(out, t);
      break;
    }
    case 6: { // master warning flashing over dead screens
      const on = Math.floor(t * 4) % 2 === 0;
      out.fx.push({ key: `warn${on}`, cw: 200, ch: 200, draw: (p) => fxWarn(p, on), x: COCKPIT[0] - 0.02, y: COCKPIT[1] + 0.93, z: COCKPIT[2] - 1.035, w: 0.07, h: 0.07 });
      break;
    }
    case 7: { // the two pilots seated, facing the windshield (the lens)
      const lucky = t >= BEAT.luckily + 0.05 - L2, hobby = t >= BEAT.hobby - L2;
      const capExpr: Expr = !lucky ? "shock" : hobby ? "grin" : "smile_closed";
      put(cam, t, out, id, { i: 90, o: CAPTAIN, key: "cap", x: COCKPIT[0] - 0.62, y: COCKPIT[1] + 0.3, z: COCKPIT[2] + 0.38, expr: capExpr, fo: { mode: "sit" }, noBlob: true });
      put(cam, t, out, id, { i: 91, o: FIRST_OFFICER, key: "fo", x: COCKPIT[0] + 0.62, y: COCKPIT[1] + 0.3, z: COCKPIT[2] + 0.38, expr: t < BEAT.hobby ? "nervous" : "shock", fo: { mode: "sit", look: -1 }, noBlob: true });
      const on = Math.floor(t * 4) % 2 === 0;
      out.fx.push({ key: `warn${on}`, cw: 200, ch: 200, draw: (p) => fxWarn(p, on), x: COCKPIT[0] - 0.05, y: COCKPIT[1] + 1.1, z: COCKPIT[2] - 1.0, w: 0.09, h: 0.09 });
      if (t >= BEAT.gliders - L2) { // the thought bubble pops up beside the captain
        const pop = smooth((t - (BEAT.gliders - L2)) / 0.2), u = q(t, 10);
        out.fx.push({ key: `glider${u}`, cw: 500, ch: 400, draw: (p) => fxGlider(p, u), x: COCKPIT[0] - 0.93, y: COCKPIT[1] + 1.6, z: COCKPIT[2] + 0.3, w: 0.46 * pop, h: 0.37 * pop });
      }
      break;
    }
    case 8: { // race day: spectators both sides of the kart lanes, a dad at the grill
      crowd(cam, t, out, id, RACE_L, (i) => (["grin", "laugh", "smile", "grin"] as Expr[])[i % 4], (i) => i % 2 === 0);
      crowd(cam, t, out, id, RACE_R, (i) => (["laugh", "grin", "smile_closed"] as Expr[])[i % 3], (i) => i % 2 === 1, 20);
      put(cam, t, out, id, { i: 60, o: FOLKS[3], key: "dad", x: -26.4, z: -78.4, expr: "smile", fo: { prop: "spatula" } });
      puffs(out, t, [-28.5, 1.0, -77], [0.4, 2.6, 0.2], 5, 2.4, 0.7, "#cfcac4", -1e9, 1e9, "grill");
      break;
    }
    case 9: { // a family on the strip looks up as the jet slides in
      const shock = t >= BEAT.glides - L2;
      const [d1, d2, d3] = fan([21, 0, -64], [16, 0, 0], [[4.2, 0.7], [3.2, -0.62], [5.6, -0.15]], 0.27);
      put(cam, t, out, id, { i: 61, o: FOLKS[0], key: "f0", x: d1[0], z: d1[1], expr: shock ? "shock" : "smile", fo: { prop: "spatula" } });
      put(cam, t, out, id, { i: 62, o: KIDS[1], key: "k1", x: d2[0], z: d2[1], expr: shock ? "shock" : "grin", scale: 0.72 });
      put(cam, t, out, id, { i: 63, o: FOLKS[7], key: "f7", x: d3[0], z: d3[1], expr: shock ? "nervous" : "smile" });
      break;
    }
    case 10: { // sparks + dust where the folded nose meets the asphalt
      if (ps.spark > 0.02) {
        const n = P([NOSE_GEAR[0], -3.9, NOSE_GEAR[2] - 1.5]), u = q(t, 30);
        out.fx.push({ key: `spark${u}`, cw: 500, ch: 300, draw: (p) => fxSparks(p, u, 3), x: n[0], y: Math.max(0.5, n[1] + 0.7), z: n[2] + 0.4, w: 3.2 * ps.spark, h: 1.9 * ps.spark });
        if (t >= BEAT.collapse && t < BEAT.collapse + 6 / FPS) {
          const b = q((t - BEAT.collapse) / (6 / FPS), 30);
          out.fx.push({ key: `burst${b}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, b), x: n[0], y: 1.0, z: n[2], w: 2.6, h: 2.6 });
        }
        puffs(out, t, [n[0], 0.5, n[2] + 1], [0, 1.2, 9], 5, 0.8, 1.6, "#c9b49a", BEAT.collapse, 99, "dust");
      }
      break;
    }
    case 11: { // the slide toward the barbecue; everyone frozen, then relief
      const stopped = t >= BEAT.stop - L2, bbq = t >= BEAT.barbecue - L2;
      const ex = (calm: Expr): Expr => (!stopped ? "shock" : bbq ? calm : "nervous");
      put(cam, t, out, id, { i: 64, o: FOLKS[0], key: "f0", x: 13.3, z: -50.4, expr: ex("relief_open"), fo: { prop: "spatula" } });
      put(cam, t, out, id, { i: 65, o: FOLKS[7], key: "f7", x: 10.3, z: -51.4, expr: ex("relief") });
      put(cam, t, out, id, { i: 66, o: KIDS[1], key: "k1", x: 11.0, z: -52.6, expr: ex("grin"), scale: 0.72 });
      put(cam, t, out, id, { i: 67, o: FOLKS[10], key: "f10", x: 15.0, z: -54.6, expr: ex("relief") });
      put(cam, t, out, id, { i: 68, o: FOLKS[5], key: "f5", x: 9.2, z: -47.8, expr: ex("smile_closed") });
      grillSmoke(out, t);
      if (ps.spark > 0.02) {
        const n = P([0, -3.9, -21.5]), u = q(t, 30);
        out.fx.push({ key: `spark${u}`, cw: 500, ch: 300, draw: (p) => fxSparks(p, u, 5), x: n[0], y: 0.75, z: n[2] - 0.2, w: 3.0 * ps.spark, h: 1.8 * ps.spark });
        puffs(out, t, [n[0], 0.5, n[2] + 1.5], [0, 1.4, 8], 6, 0.9, 2.2, "#c9b49a", BEAT.collapse, BEAT.stop, "dust");
      }
      break;
    }
    case 12: { // refuelling in Montreal: the crewman checks his sums, the big weight = "kilograms"
      put(cam, t, out, id, { i: 70, o: CREW, key: "crew", x: APRON[0] - 12.2, z: APRON[2] - 9.6, expr: "smile", fo: { prop: "clipboard" } });
      if (t >= BEAT.kilo - L2) {
        const pop = Math.min(1, smooth((t - (BEAT.kilo - L2)) / 0.16) * 1.12 - 0.12 * smooth((t - (BEAT.kilo - L2) - 0.16) / 0.12) + 0.12 * smooth((t - (BEAT.kilo - L2)) / 0.16));
        const r = cam.right, bx = APRON[0] - 12.2 - r.x * 1.5, bz = APRON[2] - 9.6 - r.z * 1.5;
        out.fx.push({ key: "weightBig", cw: 400, ch: 400, draw: (p) => fxWeight(p, 1), x: bx, y: 3.2, z: bz, w: 2.4 * pop, h: 2.4 * pop });
      }
      break;
    }
    case 13: { // ... but the crew used pounds: the small weight next to the ghost of the big one
      const pd = t >= BEAT.pounds - L2;
      put(cam, t, out, id, { i: 70, o: CREW, key: "crew", x: APRON[0] - 12.2, z: APRON[2] - 9.6, expr: pd ? "grin" : "smile", fo: { prop: "clipboard" } });
      const r = cam.right, wx = APRON[0] - 12.2 - r.x * 0.82, wz = APRON[2] - 9.6 - r.z * 0.82;
      out.fx.push({ key: "weightGhost", cw: 400, ch: 400, draw: (p) => fxWeight(p, 1, true), x: wx, y: 2.3, z: wz, w: 1.0, h: 1.0 });
      if (pd) {
        const pop = smooth((t - (BEAT.pounds - L2)) / 0.14);
        out.fx.push({ key: "weightSmall", cw: 400, ch: 400, draw: (p) => fxWeight(p, 0.46), x: wx, y: 2.3, z: wz, w: 1.0 * pop, h: 1.0 * pop });
      }
      break;
    }
    case 15: { // the wing tank, less than half full
      const w = P(WING_TANK), lvl = 0.42 + 0.03 * Math.sin(t * 2.4), u = q(t * 3, 8);
      out.fx.push({ key: `tank${q(lvl, 60)}_${u}`, cw: 600, ch: 360, draw: (p) => fxTank(p, lvl, u), x: w[0], y: w[1] + 1.05, z: w[2], w: 2.7, h: 1.62 });
      break;
    }
    case 16: { // the airline boss wags a finger; the pilots look at their shoes
      const scold = t >= BEAT.punished - L2;
      const [hx, , hz] = HANGAR_SPOT;
      put(cam, t, out, id, { i: 80, o: BOSS, key: "boss", x: hx - 0.2, z: hz + 0.75, expr: scold ? "stern" : "neutral", fo: { wave: scold ? wave(t, 1, 14) : undefined, facing: -1 } });
      put(cam, t, out, id, { i: 90, o: CAPTAIN, key: "cap", x: hx + 0.25, z: hz - 0.55, expr: scold ? "pained" : "nervous", fo: { headTilt: 6 } });
      put(cam, t, out, id, { i: 91, o: FIRST_OFFICER, key: "fo", x: hx + 0.5, z: hz - 1.4, expr: "nervous", fo: { headTilt: -5 } });
      break;
    }
    case 17: { // the award: medals on, confetti, everyone clapping
      const won = t >= BEAT.won - L2, medal = t >= BEAT.award - L2;
      const cap: Outfit = { ...CAPTAIN, medal }, fo2: Outfit = { ...FIRST_OFFICER, medal };
      put(cam, t, out, id, { i: 90, o: cap, key: medal ? "capM" : "cap", x: PODIUM[0] - 0.36, y: 1.0, z: PODIUM[2] - 0.5, expr: won ? "laugh" : "smile_closed", fo: { wave: won ? wave(t, 2, 7) : undefined } });
      put(cam, t, out, id, { i: 91, o: fo2, key: medal ? "foM" : "fo", x: PODIUM[0] + 0.36, y: 1.0, z: PODIUM[2] + 0.5, expr: won ? "grin" : "smile" });
      crowd(cam, t, out, id, AWARD, (i) => (won ? (["laugh", "grin", "relief_open"] as Expr[])[i % 3] : "smile"), () => won, 40);
      if (won) for (let k = 0; k < 7; k++) {
        const u = t - BEAT.won, seed = k * 13 + 1, y = 5.2 - ((u * 0.9 + k * 0.37) % 4.6);
        out.fx.push({ key: `conf${seed}_${q(u % 4, 15)}`, cw: 400, ch: 400, draw: (p) => fxConfetti(p, q(u % 4, 15), seed), x: PODIUM[0] - 1.6 + (k % 4) * 1.1, y, z: PODIUM[2] - 3.4 + k * 1.1, w: 2.4, h: 2.4 });
      }
      break;
    }
  }
  return out;
};
export { FPS, bodySide, clamp01 };
