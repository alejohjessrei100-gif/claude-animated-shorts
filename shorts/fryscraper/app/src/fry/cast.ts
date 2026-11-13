// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, fxBurst, fxSplash, fxShadow, fxContact, fxPuff,
  Outfit, Expr, FrontOpts, SideOpts, SUIT, REPORTER_O, OWNER_O, ARCHITECT_O, KID2, SWIM, londoner,
  fxMirror, fxBadge, fxBlister, fxThermo, fxPanEgg, fxShell, fxWisp, fxShimmer, fxSpoon, fxLeaf, fxGlow,
} from "./toon";
import {
  R, FPS, D0, SHOTS, V3, smooth, clamp01, lin, CAR, MAN_DOOR, MIRROR, BADGE, PANEL, THERMO, REPORTER, PAN, LEAF, PARK, STUDIO, VEGAS, STALL, BEAT, spotAt,
} from "./story";
import { LIGHTS } from "./lights";
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
const FOLK = [0, 1, 2, 3, 4, 5, 6, 7].map((v) => londoner(v));
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
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
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
const SWAPS: Record<number, number[]> = {};
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

// ---------------- the skyscraper short ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };

const front = { side: false, mirror: false };

/** someone walking from a to b between t0 and t1 (front view, stroll gait), holding prop */
const walker = (cam: CamInfo, out: Stage, t: number, who: Who, a: V3, b: V3, t0: number, t1: number, fo: FrontOpts, scale = 1) => {
  const u = clamp01((t - t0) / (t1 - t0)), x = a[0] + (b[0] - a[0]) * u, z = a[2] + (b[2] - a[2]) * u;
  const moving = t > t0 && t < t1, dist = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const phase = moving ? q((((t - t0) * dist) / (t1 - t0) / 1.4) % 1, 120) : 0;
  out.places.push(person(cam, who, x, 0, z, front, { mode: moving ? "stroll" : "stand", phase, ...fo }, {}, scale));
  blob(out, x, 0, z, scale);
  return [x, z] as const;
};
const stander = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, fo: FrontOpts, scale = 1, y = 0) => {
  out.places.push(person(cam, who, x, y, z, front, { mode: "stand", ...fo }, {}, scale));
  if (fo.mode !== "sit") blob(out, x, y, z, scale);
};
const fxAt = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: Partial<FxPlace> = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });

const MAN: Who = { i: 7, o: SUIT, okey: "man" };
const wisps = (out: Stage, t: number, x: number, y: number, z: number, n: number, size: number, seed = 0, col = "#9a96a2") => {
  for (let k = 0; k < n; k++) {
    const u = q(((t * 0.6 + k / n + hh(seed + k, 3)) % 1), 30), dx = (hh(seed + k, 4) - 0.5) * size;
    fxAt(out, `wisp${u}|${col}`, 300, 500, (p) => fxWisp(p, u, col), x + dx, y + size * (0.4 + 0.9 * u), z, size * 0.6, size, { soft: true });
  }
};
const shimmer = (out: Stage, t: number, x: number, y: number, z: number, s: number) => {
  const u = q((t * 1.3) % 1, 30);
  fxAt(out, `shim${u}`, 300, 300, (p) => fxShimmer(p, u), x, y, z, s, s, { soft: true });
};

/** crowd strolling along the pavements (background life) */
const pedestrians = (cam: CamInfo, out: Stage, t: number, n: number, x0: number, x1: number, avoid?: { x: number; z: number }) => {
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, z = side * (6.3 + hh(i, 2) * 2.2), dir = hh(i, 3) < 0.5 ? 1 : -1, sp = 0.9 + 0.5 * hh(i, 4);
    const span = x1 - x0;
    let x = x0 + (((hh(i, 5) * span + dir * sp * t) % span) + span) % span;
    const who: Who = { i: i + 100, o: FOLK[i % 8], okey: `f${i % 8}` };
    let hop = 0, expr: Expr = (["smile", "neutral", "smile_closed", "neutral"] as Expr[])[i % 4];
    if (avoid && Math.abs(x - avoid.x) < 2.2 && Math.abs(z - avoid.z) < 2.6) { hop = 0.25 * Math.abs(Math.sin(t * 9 + i)); expr = "shock"; x += Math.sign(x - avoid.x || 1) * 0.6; }
    const phase = q(((sp * t) / 1.4 + hh(i, 6)) % 1, 120);
    out.places.push(person(cam, who, x, hop, z, front, { mode: "stroll", phase, expr, blink: lidAt(t, i + 100) }, {}));
    blob(out, x, 0, z, 1, hop > 0.05 ? 0.6 : 1);
  }
};

/** everything with a face (and every hand-drawn effect) in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], L = 2 / FPS;
  LNAME = s.light;
  findSun(cam, SUN);
  const [CX, , CZ] = CAR;
  switch (s.crowd) {
    case "hook": {
      wisps(out, t, CX + 0.2, 1.3, CZ, 5, 1.1, 1);
      shimmer(out, t, CX - 0.6, 1.6, CZ + 0.4, 1.6);
      pedestrians(cam, out, t, 6, -40, 40);
      break;
    }
    case "locals": {
      const who = (i: number): Who => ({ i: i + 20, o: FOLK[(i * 3) % 8], okey: `f${(i * 3) % 8}` });
      stander(cam, out, who(0), -3.4, 6.4, { expr: "smile", look: 0, blink: lidAt(t, 20), wave: 1 });
      stander(cam, out, who(1), -4.6, 5.9, { expr: t > BEAT.parks ? "grin" : "smile_closed", blink: lidAt(t, 21) });
      stander(cam, out, who(2), -2.3, 5.6, { expr: "neutral", blink: lidAt(t, 22), prop: "coffee" });
      pedestrians(cam, out, t, 8, -40, 40);
      break;
    }
    case "park": {
      if (t > R(395) / FPS) walker(cam, out, t, MAN, MAN_DOOR, [CX + 16, 0, CZ + 3.2], R(405) / FPS, R(474) / FPS, { expr: "smile", prop: "briefcase", blink: lidAt(t, 7) });
      pedestrians(cam, out, t, 8, -40, 40);
      break;
    }
    case "back": {
      const [x] = walker(cam, out, t, MAN, [CX + 9, 0, CZ + 3.0], [CX + 3.6, 0, CZ + 2.2], R(474) / FPS, BEAT.back, {
        expr: t < BEAT.back - L ? "smile" : "nervous", prop: "coffee", blink: lidAt(t, 7, [BEAT.back]),
      });
      void x;
      wisps(out, t, CX + 0.4, 1.3, CZ, 3, 0.9, 2);
      pedestrians(cam, out, t, 4, -30, 30);
      break;
    }
    case "mirror": {
      const k = q(clamp01((t - (BEAT.drooped - 0.5)) / 1.0), 30);
      fxAt(out, `mirror${k}`, 400, 500, (p) => fxMirror(p, k), MIRROR[0], MIRROR[1] - 0.1, MIRROR[2] + 0.12, 0.34, 0.42);
      wisps(out, t, MIRROR[0], MIRROR[1] + 0.05, MIRROR[2], 2, 0.35, 5, "#b4b0ba");
      shimmer(out, t, MIRROR[0] - 0.3, MIRROR[1] + 0.2, MIRROR[2] - 0.2, 0.6);
      break;
    }
    case "badge": {
      const k = q(clamp01((t - (BEAT.slid - 0.3)) / (BEAT.off - BEAT.slid + 0.5)), 30), fall = Math.max(0, t - BEAT.off);
      const x = BADGE[0] + 0.32 * k + 0.1 * fall, y = BADGE[1] - 0.08 * k - Math.min(0.75, 4.9 * fall * fall);
      fxAt(out, `badge${q(k * 0.6 + (fall > 0 ? 0.4 : 0), 30)}`, 300, 300, (p) => fxBadge(p, Math.min(1, k * 0.6 + (fall > 0 ? 0.4 : 0))), x, y, BADGE[2] + 0.02, 0.16, 0.16,
        { rot: -0.4 * k - 3 * fall });
      wisps(out, t, BADGE[0] - 0.3, BADGE[1] + 0.05, BADGE[2], 3, 0.45, 9, "#b4b0ba");
      break;
    }
    case "panel": {
      if (t < R(688) / FPS) {
        stander(cam, out, MAN, CX + 1.4, CZ + 2.2, { expr: "shock", prop: "coffee", blink: lidAt(t, 7, [R(656) / FPS + L]), headTilt: -3 });
      } else {
        const u = q((t * 0.8) % 1, 30);
        fxAt(out, `blister${u}`, 300, 300, (p) => fxBlister(p, u), PANEL[0], PANEL[1], PANEL[2] + 0.03, 0.8, 0.8);
        fxAt(out, `blister${q((t * 0.8 + 0.5) % 1, 30)}b`, 300, 300, (p) => fxBlister(p, q((t * 0.8 + 0.5) % 1, 30)), PANEL[0] - 0.9, PANEL[1] + 0.05, PANEL[2] + 0.03, 0.6, 0.6);
        wisps(out, t, PANEL[0], PANEL[1] + 0.3, PANEL[2] + 0.1, 3, 0.7, 11);
      }
      break;
    }
    case "thermo": {
      const v = q(lin([[R(715) / FPS, 0.25], [BEAT.hits, 0.55], [BEAT.ninety - L, 0.92], [BEAT.ninety + 0.2, 0.96]], t), 60);
      fxAt(out, `thermo${v}`, 200, 600, (p) => fxThermo(p, v), THERMO[0], THERMO[1] + 0.33, THERMO[2], 0.2, 0.6);
      if (t >= BEAT.ninety - L && t < BEAT.ninety + 0.3) {
        const u = q((t - BEAT.ninety + L) / 0.32, 30);
        fxAt(out, `burst${u}`, 500, 500, (p) => fxBurst(p, u, "#ffe28a"), THERMO[0], THERMO[1] + 0.62, THERMO[2] - 0.02, 0.45, 0.45);
      }
      const ring: [number, number, Expr][] = [[-0.9, -0.5, "shock"], [0.85, -0.6, "grin"], [-0.4, -1.1, "nervous"], [0.5, -1.2, "shock"]];
      ring.forEach(([dx, dz, e], i) => stander(cam, out, { i: 40 + i, o: FOLK[(i * 5 + 1) % 8], okey: `f${(i * 5 + 1) % 8}` }, THERMO[0] + dx, THERMO[2] + dz,
        { expr: t > BEAT.ninety - L ? e : "neutral", blink: lidAt(t, 40 + i, [BEAT.ninety]) }));
      shimmer(out, t, THERMO[0] + 0.3, 0.5, THERMO[2] - 0.3, 1.0);
      break;
    }
    case "reporter": {
      const cracked = t >= BEAT.cracks + 0.35;
      stander(cam, out, { i: 60, o: REPORTER_O, okey: "rep" }, REPORTER[0], REPORTER[2], {
        expr: t < BEAT.cracks ? "smile" : t < BEAT.fries - L ? "neutral" : "shock", prop: cracked ? "mic" : "egg", blink: lidAt(t, 60, [BEAT.fries]),
      });
      const egg = cracked ? q(clamp01((t - BEAT.cracks - 0.35) / (BEAT.fries - BEAT.cracks - 0.2)), 30) : 0;
      fxAt(out, `pan${egg}`, 600, 600, (p) => fxPanEgg(p, egg), PAN[0], PAN[1], PAN[2], 0.62, 0.62, { flat: true, rot: 0.5 });
      if (t > BEAT.cracks && t < BEAT.cracks + 0.6) {
        const u = q((t - BEAT.cracks) / 0.6, 30);
        fxAt(out, `shell${u}`, 300, 300, (p) => fxShell(p, u), PAN[0], 0.35 - 0.3 * u, PAN[2], 0.22, 0.22);
      }
      if (egg > 0.3) { shimmer(out, t, PAN[0], 0.25, PAN[2], 0.45); wisps(out, t, PAN[0], 0.08, PAN[2], 2, 0.3, 21, "#f2f0ea"); }
      for (let i = 0; i < 3; i++) stander(cam, out, { i: 61 + i, o: FOLK[(i * 3 + 2) % 8], okey: `f${(i * 3 + 2) % 8}` }, REPORTER[0] + 1.6 + i * 0.9, REPORTER[2] - 1.4 - 0.4 * i,
        { expr: t > BEAT.fries - L ? (i % 2 ? "grin" : "shock") : "smile", blink: lidAt(t, 61 + i) });
      break;
    }
    case "spot": {
      const sp = spotAt(t);
      pedestrians(cam, out, t, 12, -30, 30, sp);
      // the stall vendor: fine until the spot arrives
      const hot = t > BEAT.unluckily + 2.2;
      stander(cam, out, { i: 80, o: FOLK[3], okey: "f3" }, STALL[0] + 0.3, STALL[2] + 0.9, { expr: hot ? "shock" : "smile", blink: lidAt(t, 80, [BEAT.unluckily + 2.2]), headTilt: hot ? -4 : 0 }, 1, hot ? 0.18 * Math.abs(Math.sin(t * 8)) : 0);
      if (hot) wisps(out, t, STALL[0], 2.6, STALL[2], 4, 1.4, 31);
      if (t < BEAT.luckily + 1) wisps(out, t, CAR[0], 1.3, CAR[2], 3, 1.0, 33);
      break;
    }
    case "owners": {
      const paid = t > BEAT.paid - L;
      stander(cam, out, MAN, CAR[0] + 0.2, CAR[2] + 2.5, { expr: paid ? "grin" : "nervous", prop: paid ? "cheque" : null, blink: lidAt(t, 7, [BEAT.paid]) });
      stander(cam, out, { i: 90, o: OWNER_O, okey: "own" }, CAR[0] + 1.5, CAR[2] + 2.9, { expr: "smile_closed", blink: lidAt(t, 90), facing: -1 });
      break;
    }
    case "architect": {
      stander(cam, out, { i: 95, o: ARCHITECT_O, okey: "arch" }, STUDIO[0] + 0.1, STUDIO[2], { expr: t < BEAT.architect - L ? "neutral" : "nervous", look: t < BEAT.architect ? -1 : 0, blink: lidAt(t, 95, [BEAT.architect]) });
      break;
    }
    case "vegas": {
      const cook = t > BEAT.cooking - L;
      for (let i = 0; i < 6; i++) {
        const x = VEGAS[0] - 6 + i * 2.1, z = VEGAS[2] + 6 + (i % 2) * 0.4;
        const jump = i === 3 ? clamp01((t - (BEAT.pool - 0.25)) / 0.75) : 0;
        if (jump >= 1) continue;
        const jx = x - 0.6 * jump, jy = 0.42 + 1.6 * Math.sin(Math.PI * jump) - 0.9 * jump * jump, jz = z - 2.6 * jump;
        out.places.push(person(cam, { i: 110 + i, o: SWIM(i), okey: `swim${i}` }, jump > 0 ? jx : x, jump > 0 ? jy : 0.42, jump > 0 ? jz : z, front,
          { mode: jump > 0 ? "fall" : "sit", expr: !cook ? (i % 2 ? "smile_closed" : "relief") : i % 3 === 0 ? "pained" : "shock", blink: lidAt(t, 110 + i, [BEAT.cooking]), tilt: jump * 30 }, {}));
        if (cook) wisps(out, t, x, 1.2, z, 2, 0.9, 40 + i);
      }
      const u = (t - (BEAT.pool + 0.5)) / 1.1;
      if (u >= 0 && u < 1) fxAt(out, `splash${q(u, 30)}`, 800, 800, (p) => fxSplash(p, q(u, 30)), VEGAS[0] + 0.1, 1.5, VEGAS[2] + 3.2, 4, 4);
      break;
    }
    default: break;
  }
  return out;
};

/** the magnifier scene (shot 14): the kid, the leaf, the burn */
export const parkStage = (t: number, cam: CamInfo, wide: boolean): Stage => {
  const out: Stage = { places: [], fx: [] };
  LNAME = "day"; findSun(cam, SUN);
  const burn = q(clamp01((t - (BEAT.tiny - 0.4)) / 0.9), 30);
  out.places.push(person(cam, { i: 70, o: KID2, okey: "kid" }, PARK[0] - 0.45, 0.02, PARK[2] - 0.2, front,
    { mode: "sit", expr: burn > 0.3 ? "laugh" : "grin", prop: wide ? "magnifier" : null, blink: lidAt(t, 70) }, {}, 0.8));
  blob(out, PARK[0] - 0.45, 0, PARK[2] - 0.2, 0.8);
  fxAt(out, `leaf${burn}`, 300, 300, (p) => fxLeaf(p, burn), LEAF[0], LEAF[1], LEAF[2], 0.24, 0.24, { flat: true, rot: 0.6 });
  if (burn > 0.25) wisps(out, t, LEAF[0], 0.06, LEAF[2], 3, 0.22, 51);
  if (burn > 0.6 && burn < 1) { const u = q(clamp01((burn - 0.6) / 0.4), 30); fxAt(out, `burst${u}`, 500, 500, (p) => fxBurst(p, u, "#ffe28a"), LEAF[0], 0.08, LEAF[2], 0.3, 0.3); }
  return out;
};
export { fxGlow, fxSpoon, fxPuff, smooth };
