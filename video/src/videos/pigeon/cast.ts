// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, shoulderOf, armColour, SKINNER_O, general, BOY_O, DAUGHTER_O } from "./toon";
import {
  FPS, SHOTS, V3, clamp01, smooth, BEAT, LINES, CONE, STATION_X, STATION_FLOOR, BIRD_Z, peckAt, TRAIN_BOX, TRAIN_SCREEN_X, CONE_ON_BENCH,
  SKINNER, GENERALS, BOY, DOG, DAUGHTER, BIRD_STAGE, WAR, TABLE_H,
} from "./story";
import { fxSpeed, fxMark, fxDrop, fxDust, fxStamp, fxSeed, fxBiscuit, fxConfetti } from "./gfx";
import { pigeonSide, pigeonFront, pigeonBack, dogSide, pigeonTip, PSU, BirdOpts, BirdExpr } from "./birds";
import ENV from "./voiceEnv.json";
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
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing" | "bird" | "dog"; roll?: number; pitch?: number; size?: [number, number, number];
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
let LNAME: "day" | "golden" | "night" = "day";
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
/** expression swaps per shot (a blink hides each swap) */
/** expression swaps per shot (a blink hides each swap) */
const SWAPS: Record<number, number[]> = { 4: [BEAT.peck1], 8: [BEAT.pigeonsQ], 13: [BEAT.wrong, BEAT.outvote], 16: [BEAT.cancelled], 18: [BEAT.prize] };
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
const CONTACT: Record<"day" | "golden" | "night", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], night: [0.18, 0.18, 0.34] };
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

// ---------------- the pigeon short cast by shot ----------------
export type ArmPlace = { a: V3; b: V3; col: string; tool?: "stamp" };
export type Stage = { places: Place[]; fx: FxPlace[]; arms: ArmPlace[] };
const FRONT = { side: false, mirror: false };
const L2 = LEAD;
type Body = { i: number; o: Outfit; key: string; x: number; y?: number; z: number; expr: Expr; scale?: number; fo?: Partial<FrontOpts>; noBlob?: boolean };
const put = (cam: CamInfo, t: number, out: Stage, id: number, b: Body) => {
  const fo: FrontOpts = { mode: "stand", expr: b.expr, blink: lidAt(t, b.i, SWAPS[id]), look: 0, ...b.fo };
  out.places.push(person(cam, { i: b.i, o: b.o, okey: b.key }, b.x, b.y ?? 0, b.z, FRONT, fo, {}, b.scale ?? 1));
  if (!b.noBlob && fo.mode !== "sit") blob(out, b.x, b.y ?? 0, b.z, b.scale ?? 1);
};
const at = (t: number, beat: number) => t >= beat - L2;
const talkOf = (t: number) => {
  const l = LINES.find((x) => t >= x.a - L2 && t < x.b);
  if (!l) return 0;
  const f = Math.round(t * FPS + 1);
  return q((ENV as number[])[Math.min(ENV.length - 1, Math.max(0, f))] ?? 0, 12);
};
/** world point of a shoulder of a card standing at `at` facing the camera */
const shoulderW = (cam: CamInfo, at3: V3, o: Outfit, side: number, sc = 1): V3 => {
  const yaw = Math.atan2(cam.pos.x - at3[0], cam.pos.z - at3[2]), [sx, sy] = shoulderOf(o, side);
  const lx = (sx - 300) * SU * sc, ly = (975 - sy) * SU * sc;
  return [at3[0] + lx * Math.cos(yaw), at3[1] + ly, at3[2] - lx * Math.sin(yaw)];
};
const mark = (out: Stage, kind: "?" | "!", p: V3, key = "", s = 0.3) => out.fx.push({ key: `mark${kind}${key}`, cw: 200, ch: 260, draw: (pp) => fxMark(pp, kind), x: p[0], y: p[1], z: p[2], w: s, h: s * 1.3 });

/** a pigeon card at `p` (feet), facing world direction `dir` (x/z): side view (mirrored to face its way on screen) unless the
 *  lens is in front of the bird, then the front view. Canvas resolution follows the distance (sharp in close-ups). */
type View = "F" | "S" | "B";
/** which card a bird at p facing dir shows to this camera: front (faces the lens), back (faces away) or side */
const birdView = (cam: CamInfo, p: V3, dir: [number, number]): View => {
  const tx = cam.pos.x - p[0], tz = cam.pos.z - p[2], d = (tx * dir[0] + tz * dir[1]) / (Math.hypot(tx, tz) || 1);
  return d > 0.62 ? "F" : d < -0.7 ? "B" : "S";
};
/** a pigeon card. view: forced card (pilots share one so the row matches); lean: tip the card back toward a high camera
 *  (feet stay put) so a steep view does not squash the bird flat */
const bird = (cam: CamInfo, out: Stage, t: number, i: number, p: V3, dir: [number, number], o: BirdOpts, sc = 1, forceFront = false, view?: View, lean = false) => {
  const v: View = forceFront ? "F" : view ?? birdView(cam, p, dir);
  const mirror = v === "S" && dir[0] * cam.right.x + dir[1] * cam.right.z < 0;
  const d = cam.pos.distanceTo(tmp.set(p[0], p[1] + 0.17 * sc, p[2])) / sc;
  const [w, h, k] = d < 0.9 ? [1200, 1200, 3] : d < 2.2 ? [800, 800, 2] : [400, 400, 1];
  const blink = lidAt(t, 300 + i);
  const oo: BirdOpts = { ...o, blink, peck: q(o.peck ?? 0, 24), flap: q(o.flap ?? 0, 12) };
  const el = Math.atan2(cam.pos.y - (p[1] + 0.17 * sc), Math.hypot(cam.pos.x - p[0], cam.pos.z - p[2]));
  out.places.push({ key: `bird|${v}|${JSON.stringify(oo)}`, draw: (pp) => (v === "F" ? pigeonFront(pp, oo) : v === "B" ? pigeonBack(pp, oo) : pigeonSide(pp, oo)),
    x: p[0], y: p[1], z: p[2], geo: "bird", mirror, scale: sc, size: [w, h, k], pitch: lean ? -Math.min(0.5, Math.max(0, 0.55 * el)) : 0 });
};
/** the three pilots at their stations in the nose cone (one card view for the row, taken from the middle bird) */
const pilots = (cam: CamInfo, out: Stage, id: number, t: number, ex: (k: number) => BirdExpr, gear: (k: number) => BirdOpts["gear"] = () => "cap") => {
  const v = birdView(cam, [CONE[0], STATION_FLOOR, CONE[2] + BIRD_Z], [0, -1]);
  STATION_X.forEach((sx, k) => bird(cam, out, t, k, [CONE[0] + sx, STATION_FLOOR, CONE[2] + BIRD_Z], [0, -1], { peck: peckAt(id, k, t), expr: ex(k), gear: gear(k), harness: true }, 1, false, v, true));
};
const head = (p: V3, h = 1.48): V3 => [p[0], p[1] + h, p[2]];

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [], arms: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const trainBird = (expr: BirdExpr, peck: number, flap = 0) => { // the bird in the training box: its peck meets the box's screen
    const bx = TRAIN_SCREEN_X + (pigeonTip(1)[0] - 200) * PSU; // full peck = beak on the screen
    bird(cam, out, t, 9, [bx, TRAIN_BOX[1] + 0.02, TRAIN_BOX[2] - 0.04], [-1, 0], { peck, expr, flap });
  };
  switch (id) {
    case 2: pilots(cam, out, id, t, (k) => (t > BEAT.pigeons1 - L2 ? (k === 1 ? "proud" : "happy") : "neutral")); break;
    case 3: case 4: { // Skinner at the bench, a pigeon pecking the ship in the training box
      const pk = Math.max(0, ...[BEAT.peck1, BEAT.peck1 + 0.5, BEAT.ship].map((tp) => (t >= tp - 0.08 && t < tp + 0.12 ? Math.sin(Math.PI * (t - tp + 0.08) / 0.2) : 0)));
      trainBird("curious", pk);
      put(cam, t, out, id, { i: 1, o: SKINNER_O, key: "skinner", x: SKINNER[0], z: SKINNER[2], expr: at(t, BEAT.skinner) ? "smile_closed" : "smile", fo: { reach: [372, 610] } });
      break;
    }
    case 5: { // peck -> a seed drops from the hopper into the tray -> a happy flap
      const pk = t >= BEAT.peck2 - 0.08 && t < BEAT.peck2 + 0.12 ? Math.sin(Math.PI * (t - BEAT.peck2 + 0.08) / 0.2) : 0;
      const fed = at(t, BEAT.seed);
      trainBird(fed ? "happy" : "curious", pk, fed ? 0.5 + 0.5 * Math.sin(t * 22) : 0);
      const u = clamp01((t - (BEAT.seed - 0.25)) / 0.25), [bx, by, bz] = TRAIN_BOX;
      if (t > BEAT.seed - 0.25) out.fx.push({ key: "seed", cw: 120, ch: 80, draw: fxSeed, x: bx - 0.16, y: by + 0.28 - 0.22 * u * u, z: bz + 0.1, w: 0.045, h: 0.03 });
      break;
    }
    case 6: { // Skinner lowers a pigeon into the cut-open nose: a real 3D arm, the bird in his hand
      const [cx, cy, cz] = CONE_ON_BENCH, u = smooth((t - BEAT.straps) / 1.1);
      const S = shoulderW(cam, SKINNER, SKINNER_O, 1);
      const from: V3 = [S[0] + 0.1, S[1] + 0.05, S[2] + 0.35], to: V3 = [cx - 0.04, cy + 0.12, cz];
      const H: V3 = [from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u, from[2] + (to[2] - from[2]) * u];
      out.arms.push({ a: S, b: H, col: armColour(SKINNER_O) });
      bird(cam, out, t, 20, [H[0], H[1] - 0.1, H[2] + 0.02], [0, 1], { expr: u < 1 ? "nervous" : "neutral", flap: u < 0.9 ? 0.4 + 0.4 * Math.sin(t * 20) : 0, harness: true }, 0.75, true);
      for (const [k, dz] of [[21, -0.17], [22, 0.17]] as const) bird(cam, out, t, k, [cx - 0.04, cy + 0.04, cz + dz], [1, 0], { expr: "neutral", harness: true }, 0.75);
      put(cam, t, out, id, { i: 1, o: SKINNER_O, key: "skinner", x: SKINNER[0], z: SKINNER[2], expr: "smile_closed", fo: { hideArm: 1, reachL: [228, 600] } });
      break;
    }
    case 7: pilots(cam, out, id, t, () => "curious"); break;
    case 8: { // generals laughing; the middle one: "Pigeons? Really?"
      const line = at(t, BEAT.pigeonsQ);
      GENERALS.forEach((p, k) => put(cam, t, out, id, { i: 10 + k, o: general(k), key: `gen${k}`, x: p[0], z: p[2],
        expr: k === 1 && line ? "stern" : (["laugh", "grin", "laugh", "grin"] as Expr[])[k], fo: k === 1 ? { talk: talkOf(t), reach: line ? [430, 560] : undefined } : { up: k === 2 && !line } }));
      for (let n = 0; n < 3; n++) { const age = ((t * 0.5 + n / 3) % 1); out.fx.push({ key: `smoke${q(age, 20)}`, cw: 300, ch: 300, draw: (pp) => fxDust(pp, q(age, 20), "#bdb8c6"), x: GENERALS[0][0] + 0.25, y: 1.6 + age * 0.9, z: GENERALS[0][2] + 0.2, w: 0.4 + age * 0.4, h: 0.4 + age * 0.4, soft: true }); }
      break;
    }
    case 10: pilots(cam, out, id, t, () => "stern"); break; // furious pecking, locked on
    case 11: pilots(cam, out, id, t, (k) => (k === 1 ? "curious" : "neutral")); mark(out, "?", [CONE[0] + 0.06, STATION_FLOOR + 0.42, CONE[2] + BIRD_Z], "m", 0.1); break;
    case 12: { // the explanation: the lens's light to the screens, the peck, the tilt
      pilots(cam, out, id, t, (k) => (k === 1 ? "stern" : "neutral"));
      break;
    }
    case 13: { // the outvote: the middle bird pecks wrong, the other two glare, then peck it right
      const wrong = at(t, BEAT.wrong), vote = at(t, BEAT.outvote);
      pilots(cam, out, id, t, (k) => (k === 1 ? (vote ? "sad" : wrong ? "nervous" : "neutral") : wrong ? "stern" : "neutral"));
      if (wrong && !vote) mark(out, "!", [CONE[0] + 0.05, STATION_FLOOR + 0.29, CONE[2] + BIRD_Z + 0.05], "l", 0.05); // uh-oh, over the wrong one
      break;
    }
    case 14: { // the boy tosses a biscuit, the dog catches it
      const toss = at(t, BEAT.treats), u = clamp01((t - BEAT.treats) / 0.38);
      put(cam, t, out, id, { i: 30, o: BOY_O, key: "boy", x: BOY[0], z: BOY[2], expr: toss ? "laugh" : "smile", scale: 1,
        fo: toss ? { reach: [430, 520] } : { held: "biscuit", reach: [420, 600] } });
      const caught = u >= 1, open = toss && !caught ? 0.4 + 0.6 * u : 0;
      out.places.push({ key: `dog|${q(Math.sin(t * 14), 6)}|${q(open, 6)}|${caught}`, draw: (pp) => dogSide(pp, { sit: true, wag: t * 14, mouth: open, expr: caught ? "happy" : "neutral" }),
        x: DOG[0], y: 0, z: DOG[2], geo: "dog", mirror: true, size: [1000, 800, 2] });
      blob(out, DOG[0], 0, DOG[2], 0.8);
      if (toss && !caught) { const sx = BOY[0] + 0.25, sy = 0.95; out.fx.push({ key: "biscuit", cw: 160, ch: 100, draw: fxBiscuit, x: sx + (DOG[0] - 0.12 - sx) * u, y: sy + 0.35 * Math.sin(Math.PI * u) - 0.25 * u, z: (BOY[2] + DOG[2]) / 2, w: 0.09, h: 0.06, rot: u * 6 }); }
      break;
    }
    case 15: { // the pilot in a helmet gets its seed ... inside a bomb
      pilots(cam, out, id, t, (k) => (k === 1 ? "happy" : "neutral"), (k) => (k === 1 ? "helmet" : "cap"));
      const u = clamp01((t - 1046 / FPS) / 0.2);
      out.fx.push({ key: "seed", cw: 120, ch: 80, draw: fxSeed, x: CONE[0] + 0.05, y: STATION_FLOOR + 0.3 - 0.18 * u * u, z: CONE[2] + BIRD_Z - 0.02, w: 0.035, h: 0.024 });
      break;
    }
    case 16: { // "cancelled": the stamp comes down on the pigeon file (a real 3D arm with the stamp in its hand)
      const gp: V3 = [WAR[0], 0, WAR[2] - 0.95], slam = BEAT.cancelled;
      const S = shoulderW(cam, gp, general(1), 1);
      const up = t < slam - 0.35 ? smooth((t - (slam - 1.0)) / 0.5) : t < slam ? 1 - smooth((t - (slam - 0.12)) / 0.12) : 0;
      const tgt: V3 = [WAR[0] + 0.02, 0.835 + 0.11, WAR[2] + 0.04];
      const H: V3 = [tgt[0], tgt[1] + 0.45 * up, tgt[2] - 0.1 * up];
      out.arms.push({ a: S, b: H, col: armColour(general(1)), tool: "stamp" });
      put(cam, t, out, id, { i: 11, o: general(1), key: "gen1", x: gp[0], z: gp[2], expr: at(t, slam) ? "stern" : "neutral", fo: { hideArm: 1 } });
      for (const [k, dx] of [[0, -0.85], [2, 0.85]] as const) put(cam, t, out, id, { i: 10 + k, o: general(k), key: `gen${k}`, x: WAR[0] + dx, z: WAR[2] - 0.8, expr: at(t, slam) ? "stern" : "neutral" });
      if (t >= slam) { const u = q(Math.min(1, (t - slam) / 0.1), 10); out.fx.push({ key: `stamp${u}`, cw: 400, ch: 300, draw: (pp) => fxStamp(pp, u), x: WAR[0] + 0.02, y: 0.838, z: WAR[2] + 0.04, w: 0.26, h: 0.2, flat: true }); }
      break;
    }
    case 17: { // Skinner deflated, a pigeon on his shoulder sighs with him
      const sad = at(t, BEAT.seriously);
      put(cam, t, out, id, { i: 1, o: SKINNER_O, key: "skinner", x: SKINNER[0], z: SKINNER[2], expr: sad ? "pained" : "nervous", fo: { headTilt: sad ? 7 : 3 } });
      const S = shoulderW(cam, SKINNER, SKINNER_O, -1);
      bird(cam, out, t, 40, [S[0], S[1] + 0.02, S[2] + 0.04], [1, 0], { expr: "sad" }, 0.85, true);
      break;
    }
    case 18: { // 2024: the daughter raises the trophy; a pigeon struts on the podium; confetti
      const prize = at(t, BEAT.prize), peace = at(t, BEAT.peace);
      put(cam, t, out, id, { i: 50, o: DAUGHTER_O, key: "daughter", x: DAUGHTER[0], y: DAUGHTER[1], z: DAUGHTER[2], expr: prize ? "laugh" : "smile",
        fo: { held: "trophy", reach: prize ? [470, 250] : [380, 560] } });
      bird(cam, out, t, 41, BIRD_STAGE, [1, 0], { expr: "proud", flap: peace ? 0.5 + 0.5 * Math.sin(t * 18) : 0 }, 1.1, true);
      if (peace) for (let k = 0; k < 6; k++) {
        const u = t - BEAT.peace, sd = k * 13 + 1, y = DAUGHTER[1] + 3.0 - ((u * 0.8 + k * 0.33) % 2.6);
        out.fx.push({ key: `conf${sd}_${q(u % 4, 15)}`, cw: 400, ch: 400, draw: (pp) => fxConfetti(pp, q(u % 4, 15), sd), x: DAUGHTER[0] - 1.4 + (k % 3) * 1.2, y, z: DAUGHTER[2] + 0.4 + (k >> 1) * 0.3, w: 1.4, h: 1.4 });
      }
      break;
    }
  }
  return out;
};
export { FPS, bodySide, clamp01, smooth, TABLE_H, fxSpeed, fxDrop, head };
