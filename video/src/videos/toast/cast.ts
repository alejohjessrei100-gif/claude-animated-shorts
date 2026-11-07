// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, MATTHEWS, COLLEAGUE_A, COLLEAGUE_B, pupil } from "./toon";
import {
  FPS, SHOTS, V3, clamp01, smooth, BEAT, DROPS, dropAt, landT, DAD, MATT_LAB, COLL_A, COLL_B, KID_B, MATT_KITCHEN, GIANT_AT, GIANT_SCALE,
  CLASS, KITCHEN, DESK_ROWS, LINES, TABLE_EDGE_Z, TABLE_H,
} from "./story";
import { fxSplat, fxPow, fxSpeed, fxSparkle, fxSpin, fxPath, fxMark, fxDrop, fxDust, fxCoin, fxRing } from "./gfx";
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
const SWAPS: Record<number, number[]> = { 2: [BEAT.tall], 6: [BEAT.lost, BEAT.robertLine], 8: [BEAT.nope], 9: [BEAT.tenK], 11: [BEAT.lsDown], 14: [BEAT.early, BEAT.same], 15: [BEAT.tallest], 17: [BEAT.knock] };
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

// ---------------- the toast cast by shot ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const FRONT = { side: false, mirror: false };
const L2 = LEAD;
type Body = { i: number; o: Outfit; key: string; x: number; y?: number; z: number; expr: Expr; scale?: number; fo?: Partial<FrontOpts>; noBlob?: boolean };
const put = (cam: CamInfo, t: number, out: Stage, id: number, b: Body) => {
  const fo: FrontOpts = { mode: "stand", expr: b.expr, blink: lidAt(t, b.i, SWAPS[id]), look: 0, ...b.fo };
  out.places.push(person(cam, { i: b.i, o: b.o, okey: b.key }, b.x, b.y ?? 0, b.z, FRONT, fo, {}, b.scale ?? 1));
  if (!b.noBlob && fo.mode !== "sit") blob(out, b.x, b.y ?? 0, b.z, b.scale ?? 1);
};
const at = (t: number, beat: number) => t >= beat - L2;
/** voice envelope -> talking mouth (only inside a quoted line of this speaker) */
const talkOf = (t: number, who: "collA" | "matt") => {
  const l = LINES.find((x) => x.who === who && t >= x.a - L2 && t < x.b);
  if (!l) return 0;
  const f = Math.round(t * FPS + 1); // the mouth leads the voice by ~1 f (reference)
  return q((ENV as number[])[Math.min(ENV.length - 1, Math.max(0, f))] ?? 0, 12);
};
/** a reach that goes out and comes back around each action time (hand target in canvas units) */
const reachCycle = (t: number, times: number[], rest: [number, number], out: [number, number], lead = 0.2, hold = 0.18): [number, number] => {
  let k = 0;
  for (const tt of times) {
    const u = t - (tt - lead);
    if (u >= 0 && u < lead + hold + 0.2) k = Math.max(k, u < lead ? smooth(u / lead) : u < lead + hold ? 1 : 1 - smooth((u - lead - hold) / 0.2));
  }
  return [rest[0] + (out[0] - rest[0]) * k, rest[1] + (out[1] - rest[1]) * k];
};
const qq = (p: [number, number]): [number, number] => [Math.round(p[0] / 4) * 4, Math.round(p[1] / 4) * 4];
/** the splat / impact effects of every slice in this shot */
const sliceFx = (id: number, t: number, out: Stage) => {
  for (const d of DROPS[id] ?? []) {
    const s = dropAt(d, t), tl = landT(d);
    if (s.splat <= 0 || t < tl) continue;
    const age = t - tl, [x, , z] = s.pos;
    const up = d.flat || d.fullTurn;
    if (!up && d.butter !== "B") {
      const u = q(Math.min(1, age / 0.12), 12);
      out.fx.push({ key: `splat${u}`, cw: 400, ch: 400, draw: (p) => fxSplat(p, u), x, y: 0.006, z, w: 0.46, h: 0.46, flat: true, rot: 0.4 });
    }
    if (age < 7 / FPS) { const u = q(age / (7 / FPS), 14); out.fx.push({ key: `pow${u}`, cw: 500, ch: 500, draw: (p) => fxPow(p, u), x, y: 0.12, z, w: 0.7, h: 0.7 }); }
    if (age < 0.9) { const u = q(age / 0.9, 20); out.fx.push({ key: `dust${u}`, cw: 300, ch: 300, draw: (p) => fxDust(p, u), x: x + 0.06, y: 0.1, z, w: 0.5, h: 0.5, soft: true }); }
    if (up && age < 1.6) { const u = q(t, 15); out.fx.push({ key: `spark${u}`, cw: 300, ch: 300, draw: (p) => fxSparkle(p, u), x, y: 0.22, z, w: 0.62, h: 0.62 }); }
  }
};
const head = (pos: V3, sc = 1, kid = false): V3 => [pos[0], pos[1] + (kid ? 1.02 : 1.48) * sc, pos[2]];
const mark = (out: Stage, kind: "?" | "!", p: V3, key = "", s = 0.3) => out.fx.push({ key: `mark${kind}${key}`, cw: 200, ch: 260, draw: (pp) => fxMark(pp, kind), x: p[0] + 0.22 * s / 0.3, y: p[1] + 0.32 * s / 0.3, z: p[2], w: s, h: s * 1.3 });
const PUPILS = Array.from({ length: 14 }, (_, v) => pupil(v));
const DADO: Outfit = { jacket: "#4f6fa6", pants: "#3b3f52", boots: "#3a2a22", hat: "hair", hair: "#5a3b2a", moustache: "#5a3b2a", collar: "#f4f4f2", skin: "#f6e7d8" };

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  sliceFx(id, t, out);
  switch (id) {
    case 2: { // the dad looks down at his breakfast on the floor ("how tall you are")
      const tall = at(t, BEAT.tall);
      put(cam, t, out, id, { i: 1, o: DADO, key: "dad", x: DAD[0], z: DAD[2], expr: tall ? "pained" : "shock", fo: { held: "plate", reach: [372, 640], headTilt: 4 } });
      if (tall) out.fx.push({ key: "drop", cw: 120, ch: 160, draw: fxDrop, x: DAD[0] + 0.24, y: 1.62, z: DAD[2], w: 0.09, h: 0.12 });
      break;
    }
    case 3: case 4: { // Matthews shoving slice after slice off the lab table
      const pushes = [BEAT.pushing, BEAT.off, 246 / FPS, 165 / FPS, 140 / FPS];
      const r = qq(reachCycle(t, pushes, [356, 600], [452, 676], 0.18, 0.12));
      const ex: Expr = at(t, BEAT.robert) ? (Math.floor(t * 2) % 2 ? "grin" : "smile_closed") : "smile";
      put(cam, t, out, id, { i: 2, o: MATTHEWS, key: "matt", x: MATT_LAB[0], z: MATT_LAB[2], expr: ex, fo: { reach: r } });
      break;
    }
    case 6: { // colleagues in the doorway: laughing, "he's lost it" (finger at the temple), then the line
      const lost = at(t, BEAT.lost), line = at(t, BEAT.robertLine);
      const twirl: [number, number] = [196 + 10 * Math.cos(t * 14), 296 + 10 * Math.sin(t * 14)];
      put(cam, t, out, id, { i: 3, o: COLLEAGUE_A, key: "collA", x: COLL_A[0], z: COLL_A[2], expr: line ? "smile" : "laugh",
        fo: { talk: talkOf(t, "collA"), reachL: lost && !line ? qq(twirl) : undefined, reach: line ? [430, 560] : undefined, facing: -1 } });
      put(cam, t, out, id, { i: 4, o: COLLEAGUE_B, key: "collB", x: COLL_B[0], z: COLL_B[2], expr: line ? "grin" : "laugh", fo: { facing: -1 } });
      put(cam, t, out, id, { i: 2, o: MATTHEWS, key: "matt", x: MATT_LAB[0], z: MATT_LAB[2], expr: lost ? "stern" : "nervous", fo: { held: "toast", reach: [430, 520] } });
      break;
    }
    case 7: { // Matthews in the iris: "Then why does it keep happening?" shaking a slice
      const shake: [number, number] = [440 + 14 * Math.sin(t * 22), 440 + 10 * Math.sin(t * 17)];
      put(cam, t, out, id, { i: 2, o: MATTHEWS, key: "matt", x: MATT_LAB[0], z: MATT_LAB[2], expr: at(t, BEAT.happening) ? "shock" : "stern",
        fo: { talk: talkOf(t, "matt"), held: "toast", reach: qq(shake) } });
      break;
    }
    case 8: { // squinting through a magnifier at the scale ... "Nope" (deadpan)
      const nope = at(t, BEAT.nope);
      put(cam, t, out, id, { i: 2, o: MATTHEWS, key: "matt", x: MATT_LAB[0], z: MATT_LAB[2] - 0.1, expr: nope ? "neutral" : "nervous",
        fo: { held: "magnifier", reach: nope ? [380, 600] : [360, 470], look: nope ? 0 : 1 } });
      if (at(t, BEAT.butter) && !nope) mark(out, "?", head(MATT_LAB), "m");
      if (nope && t < BEAT.nope + 0.5) { const u = q((t - BEAT.nope) / 0.5, 15); out.fx.push({ key: `ring${u}`, cw: 300, ch: 300, draw: (p) => fxRing(p, u), x: MATT_LAB[0] + 0.05, y: TABLE_H + 0.45, z: MATT_LAB[2] + 0.55, w: 0.5, h: 0.5 }); }
      break;
    }
    case 9: { // 2001: a classroom of kids pushing toast off their desks
      DROPS[9].forEach((d, k) => {
        const row = Math.floor(k / 7), x = d.from[0], z = DESK_ROWS[row] - 0.58 + CLASS[2];
        const tl = landT(d), push = tl - 0.35, cheer = t > tl + 0.1 && k % 3 === 0;
        const r = qq(reachCycle(t, [push], [348, 600], [420, 640], 0.15, 0.15));
        put(cam, t, out, id, { i: 20 + k, o: PUPILS[k % 14], key: `p${k % 14}`, x, z, expr: t > tl ? (k % 2 ? "laugh" : "grin") : "smile_closed", scale: 1,
          fo: cheer ? { up: true } : { reach: r } });
      });
      break;
    }
    case 10: case 11: { // the girl draws a B, drops it ... B-side down
      const shock = id === 11 && at(t, BEAT.lsDown);
      const scrib: [number, number] = [334 + 8 * Math.sin(t * 25), 690 + 6 * Math.cos(t * 19)];
      put(cam, t, out, id, { i: 40, o: PUPILS[3], key: "girl", x: KID_B[0], z: KID_B[2], expr: shock ? "shock" : id === 10 ? "smile_closed" : "smile",
        fo: id === 10 ? { held: "marker", reach: qq(scrib), headTilt: 7 } : shock ? { up: true } : { reach: [420, 640] } });
      for (const [k, dx] of [[41, -0.8], [42, 0.8]] as const)
        put(cam, t, out, id, { i: k, o: PUPILS[(k * 3) % 14], key: `p${(k * 3) % 14}`, x: KID_B[0] + dx, z: KID_B[2] - 0.05, expr: shock ? "shock" : "grin", fo: { facing: dx < 0 ? 1 : -1 } });
      if (shock) mark(out, "!", head(KID_B, 1, true), "girl", 0.26);
      break;
    }
    case 12: { // the explanation: a spin arrow wraps the tipping slice
      const d = DROPS[12][0], sl = dropAt(d, t);
      if (at(t, BEAT.tips)) { const u = q(Math.min(1, (t - BEAT.tips) / 1.2), 20); out.fx.push({ key: `spin${u}`, cw: 400, ch: 400, draw: (p) => fxSpin(p, u), x: sl.pos[0] + 0.02, y: sl.pos[1] + 0.02, z: sl.pos[2], w: 0.42, h: 0.42 }); }
      break;
    }
    case 13: { // "half a turn before it hits the floor": the dashed path from the edge to the floor
      const u = q(clamp01((t - BEAT.normal) / 1.4), 20);
      out.fx.push({ key: `path${u}`, cw: 500, ch: 600, draw: (p) => fxPath(p, u), x: KITCHEN[0] + 0.01, y: TABLE_H / 2 + 0.02, z: TABLE_EDGE_Z + 0.12, w: -0.36, h: TABLE_H * 1.02 });
      break;
    }
    case 14: { // flip a coin, catch it too early, wrong side
      const tFlip = BEAT.coin - 0.25, early = at(t, BEAT.early), same = at(t, BEAT.same);
      const up = t > tFlip && t < BEAT.early;
      put(cam, t, out, id, { i: 1, o: DADO, key: "dad", x: DAD[0], z: DAD[2], expr: same ? "pained" : early ? "nervous" : "smile",
        fo: { held: !up && t > tFlip ? "coin" : t <= tFlip ? "coin" : null, reach: up ? [372, 470] : early ? [392, 560] : [372, 560] } });
      if (up) {
        const u = (t - tFlip) / (BEAT.early - tFlip), y = 1.35 + 1.15 * Math.sin(Math.PI * Math.min(1, u * 0.85)), sp = Math.abs(Math.cos(t * 26));
        const heads = Math.cos(t * 26) > 0;
        out.fx.push({ key: `coin${heads}`, cw: 200, ch: 200, draw: (p) => fxCoin(p, heads), x: DAD[0] + 0.32, y, z: DAD[2] + 0.05, w: 0.16 * Math.max(0.08, sp), h: 0.16 });
      }
      if (same) out.fx.push({ key: "coinT", cw: 200, ch: 200, draw: (p) => fxCoin(p, false), x: DAD[0] + 0.36, y: 1.3, z: DAD[2] + 0.12, w: 0.2, h: 0.2 });
      if (same) out.fx.push({ key: "drop", cw: 120, ch: 160, draw: fxDrop, x: DAD[0] - 0.2, y: 1.66, z: DAD[2], w: 0.09, h: 0.12 });
      break;
    }
    case 15: { // the 3 m table: the dad gapes up the ladder ... butter-up!
      const yes = at(t, BEAT.tallest);
      put(cam, t, out, id, { i: 1, o: DADO, key: "dad", x: KITCHEN[0] - 0.75, z: 1.25, expr: yes ? "laugh" : "shock", fo: yes ? { up: true } : { look: 0 } });
      break;
    }
    case 16: { // "only as tall as we are": hand flat at the table top, then at his hip
      const atHip = at(t, BEAT.we);
      put(cam, t, out, id, { i: 1, o: DADO, key: "dad", x: DAD[0], z: DAD[2], expr: atHip ? "grin" : "smile",
        fo: { reach: atHip ? [356, 664] : [452, 620], reachL: atHip ? [232, 664] : undefined } });
      break;
    }
    case 17: { // "two ways": a raised hand; then the swat, fast
      const knock = at(t, BEAT.knock), swing = t > 1272 / FPS - 0.1;
      const r: [number, number] = !knock ? (at(t, BEAT.two) ? [384, 400] : [356, 600]) : swing ? [520, 640] : [300, 560];
      put(cam, t, out, id, { i: 2, o: MATTHEWS, key: "matt", x: MATT_KITCHEN[0], z: MATT_KITCHEN[2], expr: swing ? "laugh" : knock ? "stern" : "grin", fo: { reach: r } });
      const d = DROPS[17][0], sl = dropAt(d, t);
      if (t > d.t0 && t < landT(d) + 0.1) out.fx.push({ key: `speed${Math.floor(t * 10)}`, cw: 500, ch: 200, draw: (p) => fxSpeed(p, Math.floor(t * 10)), x: sl.pos[0], y: sl.pos[1] + 0.05, z: sl.pos[2] - 0.3, w: 0.7, h: 0.22, rot: 0 });
      break;
    }
    case 18: { // ... or become a giant: munching toast over the rooftops
      const chew = Math.floor(t * 4) % 2 === 0;
      put(cam, t, out, id, { i: 2, o: MATTHEWS, key: "matt", x: GIANT_AT[0], z: GIANT_AT[2], expr: at(t, BEAT.giant) ? (chew ? "grin" : "smile_closed") : "smile",
        scale: GIANT_SCALE, fo: { held: "toast", reach: [334, 420] }, noBlob: true });
      break;
    }
  }
  return out;
};
export { FPS, bodySide, clamp01 };
