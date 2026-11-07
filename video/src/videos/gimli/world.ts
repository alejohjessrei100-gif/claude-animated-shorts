// "The Gimli Glider" as one three.js scene: sky + clouds (a sea of cloud tops under the cruising jet), the Boeing 767
// (procedural, no livery), the cockpit set, the Gimli strip on race day (asphalt, guard rail, karts, tents, grills,
// parked cars, trees), the Montreal apron (fuel truck), a hangar and the award podium. update(id, f, camera) poses
// everything for shot `id` at frame f (pure function of id + f). Sky, light rig, fog and the cast plumbing follow
// the bridge template (lighting / ink / lens / grade unchanged).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, boxGeo, V, lam, Kit, Ray, kitClone, prop, setSight, quad } from "./build";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex, cloudHD, grassHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { fuselageTex, runwayTex, screenTex, cloudSeaTex } from "./gfx";
import {
  FPS, SHOTS, camAt, planeAt, PlaneState, V3, FOREGROUND, ShotDef, COCKPIT, APRON, GRILL, PODIUM, SKY, smooth,
} from "./story";

// ---------------- assets ----------------
const KENNEY = ["tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree_cone", "plant_bushLarge", "plant_bushDetailed", "plant_bush",
  "stall-red", "stall-green", "stall-bench", "car:kart-oobi", "car:kart-oodi", "car:kart-ooli", "car:kart-oopi", "car:sedan", "car:suv",
  "car:van", "car:hatchback-sports", "car:sedan-sports", "car:truck", "car:cone", "car:delivery-flat", "car:ambulance", "car:firetruck"];
/** Kenney kits live in public/kenney/<kit>/. Names with "kit:" pick the kit; Nature Kit names use "_", Fantasy Town "-". */
const kenneyPath = (n: string) => {
  const m = /^(nature|car|town|buildings):(.+)$/.exec(n);
  if (m) return `kenney/${m[1]}/${m[2]}.glb`;
  const kit = n.includes("_") || n === "canoe" || n === "grass" ? "nature" : "town";
  return `kenney/${kit}/${n}.glb`;
};
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KENNEY.map((n) => loader.loadAsync(staticFile(kenneyPath(n))).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
  }
  return kitP;
};

// ---------------- helpers ----------------
const rr = (i: number, k: number) => { const v = Math.sin(i * 91.7 + k * 271.3) * 43758.5453; return v - Math.floor(v); };
/** ground height: flat airfield (|x| < 240, |z| < 760), rolling hills beyond */
export const hillY = (x: number, z: number) => {
  const k = Math.max((Math.abs(x) - 240) / 220, (Math.abs(z) - 780) / 260);
  if (k <= 0) return 0;
  const ramp = Math.min(1, k) ** 2 * (3 - 2 * Math.min(1, k));
  return ramp * (16 + 11 * Math.sin(x * 0.0105 + 1.3) * Math.cos(z * 0.0085 - 0.4) + 7 * Math.sin(x * 0.023 + z * 0.017) + 4 * Math.cos(z * 0.031 - x * 0.012));
};
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});
const doorTex = () => ctex("hangarDoor", 1024, 512, (g, r) => {
  g.fillStyle = "#b9c0c4"; g.fillRect(0, 0, 1024, 512);
  for (let x = 0; x < 1024; x += 128) {
    g.fillStyle = r() < 0.5 ? "#b2b9be" : "#c0c7cb"; g.fillRect(x + 3, 0, 122, 512);
    g.fillStyle = "#7f878d"; g.fillRect(x, 0, 6, 512);
    for (let y = 16; y < 512; y += 22) { g.fillStyle = "rgba(120,128,134,0.35)"; g.fillRect(x + 6, y, 122, 3); }
  }
  g.fillStyle = "#e9c46a"; g.fillRect(0, 470, 1024, 42);
});
const concreteTex = () => {
  const t = ctex("apronConcrete", 512, 512, (g, r) => {
    g.fillStyle = "#a9a7a1"; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) { const v = 150 + r() * 40; g.fillStyle = `rgba(${v},${v - 2},${v - 8},0.4)`; g.fillRect(r() * 512, r() * 512, 3, 3); }
    g.fillStyle = "#8a8882"; g.fillRect(0, 0, 512, 4); g.fillRect(0, 0, 4, 512);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
/** horizontal quad at height y covering x0..x1, z0..z1 with uv repeats (u, v) */
const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u = 1, v = 1) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
const cyl = (r0: number, r1: number, h: number, n = 20) => new THREE.CylinderGeometry(r0, r1, h, n);
const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(s, s, s));

// ---------------- the jet (local: nose toward -z, x = right wing, y up, centre 4.05 m over the wheels) ----------------
type Jet = { root: THREE.Group; noseGear: THREE.Group; mains: THREE.Group[]; fans: THREE.Group[] };
const WHITE = () => twoTone(new THREE.MeshPhongMaterial({ color: "#f4f4f2", specular: "#9a9a9a", shininess: 50 }), 0.3);
const buildJet = (): Jet => {
  const root = new THREE.Group(), b = new Batch();
  const skin = twoTone(new THREE.MeshPhongMaterial({ color: "#ffffff", map: fuselageTex(), specular: "#8a8a8a", shininess: 45 }), 0.3);
  const white = WHITE(), grey = lam("jetGrey", () => ({ color: "#c3c8d0" })), dark = lam("jetDark", () => ({ color: "#2a2e38" }));
  const red = lam("jetRed", () => ({ color: "#d6352f" })), metal = lam("jetMetal", () => ({ color: "#8d939c" })), tyre = lam("tyre", () => ({ color: "#23242a" }));
  // fuselage: lathe profile tail (-24) .. nose (+24) in lathe y, turned so lathe +y = local -z
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 60; i++) {
    const y = -24 + (48 * i) / 60;
    let r = 2.5;
    if (y < -11) { const u = (y + 24) / 13; r = 0.35 + 2.15 * Math.sin((u * Math.PI) / 2) ** 0.9; }
    if (y > 13) { const u = (y - 13) / 11; r = 2.5 * Math.sqrt(Math.max(0, 1 - u ** 2.2)); }
    prof.push(new THREE.Vector2(Math.max(0.02, r), y));
  }
  const fus = new THREE.LatheGeometry(prof, 40);
  fus.rotateX(-Math.PI / 2);
  fus.translate(0, 0.25, 0); // tail upsweep is in the profile; lift the body a touch
  b.add(fus, skin);
  // wings (low, swept, dihedral): top/bottom/front/back/tip quads per side
  const wingY = (x: number) => -1.35 + 0.085 * Math.max(0, Math.abs(x) - 2.3);
  for (const s of [-1, 1]) {
    const R = { x: 2.3, le: -10, te: 2.2, t: 0.62 }, T = { x: 23.6, le: 2.4, te: 5.6, t: 0.16 };
    const p = (q: typeof R, z: number, top: boolean) => V(s * q.x, wingY(q.x) + (top ? q.t / 2 : -q.t / 2), z);
    const faces = [
      [p(R, R.le, true), p(T, T.le, true), p(T, T.te, true), p(R, R.te, true)],
      [p(R, R.te, false), p(T, T.te, false), p(T, T.le, false), p(R, R.le, false)],
      [p(R, R.le, false), p(T, T.le, false), p(T, T.le, true), p(R, R.le, true)],
      [p(R, R.te, true), p(T, T.te, true), p(T, T.te, false), p(R, R.te, false)],
      [p(T, T.le, false), p(T, T.te, false), p(T, T.te, true), p(T, T.le, true)],
    ];
    for (const f of faces) { const [a, c, d, e] = s > 0 ? f : [f[0], f[3], f[2], f[1]]; b.add(quad(a, c, d, e), white); }
    // horizontal tail
    const hr = { x: 0.8, le: 16.6, te: 22.2, t: 0.36 }, ht = { x: 9.2, le: 22.0, te: 24.4, t: 0.1 };
    const hp = (q: typeof hr, z: number, top: boolean) => V(s * q.x, 0.9 + 0.06 * q.x + (top ? q.t / 2 : -q.t / 2), z);
    const hf = [
      [hp(hr, hr.le, true), hp(ht, ht.le, true), hp(ht, ht.te, true), hp(hr, hr.te, true)],
      [hp(hr, hr.te, false), hp(ht, ht.te, false), hp(ht, ht.le, false), hp(hr, hr.le, false)],
      [hp(hr, hr.le, false), hp(ht, ht.le, false), hp(ht, ht.le, true), hp(hr, hr.le, true)],
      [hp(ht, ht.le, false), hp(ht, ht.te, false), hp(ht, ht.te, true), hp(ht, ht.le, true)],
    ];
    for (const f of hf) { const [a, c, d, e] = s > 0 ? f : [f[0], f[3], f[2], f[1]]; b.add(quad(a, c, d, e), white); }
    // engine nacelle, intake lip, exhaust cone, pylon
    const ex = s * 8.6, ey = -1.6;
    const nac = cyl(1.35, 1.12, 5.4, 28); nac.rotateX(Math.PI / 2); b.add(nac, white, at(ex, ey, -6.2 + 0.5));
    const lip = new THREE.TorusGeometry(1.33, 0.12, 8, 28); b.add(lip, metal, at(ex, ey, -9.15));
    const back = cyl(0.75, 0.35, 1.4, 20); back.rotateX(Math.PI / 2); b.add(back, metal, at(ex, ey, -2.4));
    const inside = new THREE.CircleGeometry(1.25, 28); b.add(inside, dark, at(ex, ey, -8.7, 0, Math.PI));
    b.add(boxGeo(V(ex - 0.18, ey + 0.9, -7.2), V(ex + 0.18, wingY(8.6) - 0.1, -1.5)), white);
  }
  // fin
  const fin = (y: number, le: number, te: number, t: number) => ({ y, le, te, t });
  const f0 = fin(2.0, 12.5, 23.6, 0.42), f1 = fin(11.2, 21.0, 24.6, 0.14);
  const fp = (q: ReturnType<typeof fin>, z: number, s: number) => V(s * q.t / 2, q.y, z);
  for (const s of [-1, 1]) {
    const [a, c, d, e] = [fp(f0, f0.le, s), fp(f1, f1.le, s), fp(f1, f1.te, s), fp(f0, f0.te, s)];
    b.add(s > 0 ? quad(e, d, c, a) : quad(a, c, d, e), red);
  }
  b.add(quad(fp(f0, f0.le, -1), fp(f1, f1.le, -1), fp(f1, f1.le, 1), fp(f0, f0.le, 1)), red);
  b.add(quad(fp(f1, f1.le, -1), fp(f1, f1.te, -1), fp(f1, f1.te, 1), fp(f1, f1.le, 1)), red);
  // wing-to-body fairing + belly
  b.add(boxGeo(V(-2.6, -2.3, -9.5), V(2.6, -1.0, 3.5)), grey);
  b.build(root);
  // fans (spin), gear (fold / retract)
  const fans: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * 8.6, -1.6, -8.75);
    const fb = new Batch();
    for (let k = 0; k < 14; k++) fb.add(boxGeo(V(-0.07, 0.25, -0.02), V(0.07, 1.22, 0.02)), metal, at(0, 0, 0, 0, 0, (k / 14) * Math.PI * 2 + 0.3));
    const spin = new THREE.ConeGeometry(0.34, 0.7, 16); spin.rotateX(-Math.PI / 2);
    fb.add(spin, lam("spinner", () => ({ color: "#e9eaee" })), at(0, 0, -0.25));
    fb.build(g, false);
    fans.push(g); root.add(g);
  }
  const wheel = (gb: Batch, x: number, y: number, z: number) => {
    const w = cyl(0.56, 0.56, 0.38, 18); w.rotateZ(Math.PI / 2); gb.add(w, tyre, at(x, y, z));
    const hub = cyl(0.28, 0.28, 0.4, 12); hub.rotateZ(Math.PI / 2); gb.add(hub, metal, at(x, y, z));
  };
  const noseGear = new THREE.Group(); noseGear.position.set(0, -2.15, -19.2);
  { const gb = new Batch(); gb.add(cyl(0.12, 0.12, 1.45, 10), metal, at(0, -0.72, 0)); wheel(gb, -0.28, -1.34, 0); wheel(gb, 0.28, -1.34, 0); gb.build(noseGear); }
  root.add(noseGear);
  const mains: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * 4.7, -1.5, 1.6);
    const gb = new Batch();
    gb.add(cyl(0.2, 0.2, 2.05, 10), metal, at(0, -1.0, 0));
    for (const dz of [-0.75, 0.75]) for (const dx of [-0.32, 0.32]) wheel(gb, dx, -2.0, dz);
    gb.add(boxGeo(V(-0.12, -2.08, -0.85), V(0.12, -1.95, 0.85)), metal);
    gb.build(g);
    mains.push(g); root.add(g);
  }
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  root.rotation.order = "YXZ";
  return { root, noseGear, mains, fans };
};
const poseJet = (j: Jet, s: PlaneState) => {
  j.root.visible = s.visible;
  if (!s.visible) return;
  j.root.position.set(...s.pos);
  j.root.rotation.set(s.pitch, s.yaw, s.roll);
  for (const f of j.fans) f.rotation.z = s.fan;
  j.noseGear.rotation.x = -1.35 * s.nose; // folds back into the bay
  j.noseGear.visible = s.gear > 0.02;
  for (const m of j.mains) { m.visible = s.gear > 0.02; m.scale.y = Math.max(0.02, s.gear); }
  j.root.updateMatrixWorld(true);
};

/** every lens of the ground shots (trees and props are left out where they would block one) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    if (s.place === "sky" || s.place === "cockpit") continue;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(s.id, f), o = V(...c.pos), look = V(...c.look);
      const fw = look.clone().sub(o), len = Math.min(fw.length(), 60);
      fw.normalize();
      const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
      const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
      for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
        out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
    }
  }
  return out;
};

// karts on race day: two lanes left of the guard rail, driving toward -z (past the low lens of shot 8b)
const KARTS: { kit: string; x: number; t0: number; v: number; park: V3 }[] = [
  { kit: "car:kart-oobi", x: -9.2, t0: 367 / FPS, v: 9, park: [-13.5, 0, -63] }, // passes the low lens (z -88) at f400
  { kit: "car:kart-oodi", x: -11.6, t0: 379 / FPS, v: 9, park: [-17.2, 0, -66] },
  { kit: "car:kart-ooli", x: -10.4, t0: 392 / FPS, v: 10, park: [-26.5, 0, -88] },
  { kit: "car:kart-oopi", x: -13.6, t0: 352 / FPS, v: 8, park: [-24.8, 0, -91] },
];

const SUN_SHOT: Record<number, { az?: number; el?: number }> = {
  6: { az: 150, el: 35 }, 7: { az: -40, el: 25 }, // cockpit: light through the side windows
  9: { az: 160, el: 9 }, // glide in: low sun behind the lens lights the jet's belly and the family
  14: { az: 120, el: 30 }, 16: { az: 120, el: 40 },
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private sea: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; k: number }[] = [];
  private seaTex: Record<"day" | "golden", THREE.Texture[]>;
  private puffs: { g: THREE.Mesh; x: number; z: number; y: number }[] = [];
  private fgs: { o: THREE.Object3D; a: number; b: number }[] = [];
  private jet: Jet;
  private race = new THREE.Group(); private podium = new THREE.Group(); private cockpit = new THREE.Group();
  private karts: { o: THREE.Object3D; k: (typeof KARTS)[number] }[] = [];
  private screens: THREE.MeshBasicMaterial[] = []; private screenOn: THREE.Texture[] = []; private screenOff: THREE.Texture[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky + light (as the bridge template) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, depthTest: true,
      transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    // sea of clouds under the cruising jet: two scrolling layers (the jet flies toward -z, so the clouds stream to +z)
    this.seaTex = { day: [cloudSeaTex(LOOK.day.cloud, 1), cloudSeaTex(LOOK.day.cloud, 2)], golden: [cloudSeaTex(LOOK.golden.cloud, 1), cloudSeaTex(LOOK.golden.cloud, 2)] };
    for (const [k, y] of [[0, 536], [1, 526]] as const) {
      const mat = new THREE.MeshBasicMaterial({ map: this.seaTex.day[k], transparent: true, alphaTest: 0.5, depthWrite: true, fog: true, side: THREE.DoubleSide });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(5200, 5200), mat);
      m.rotation.x = -Math.PI / 2; m.position.set(SKY[0], y, SKY[2]); m.layers.set(NOINK); m.frustumCulled = false;
      this.sea.push({ m, mat, k }); R.add(m);
    }

    // ---- 3D cumulus under the jet: lit, outlined sphere clusters drifting toward +z (the flat sea fills the gaps) ----
    const puffMat = lam("cloudPuff", () => ({ color: "#ffffff" }));
    for (let i = 0; i < 64; i++) {
      const parts: THREE.BufferGeometry[] = [], n = 5 + Math.floor(rr(i, 1) * 5), big = 9 + rr(i, 2) * 10;
      for (let k = 0; k < n; k++) {
        const s = big * (0.55 + 0.5 * rr(i * 7 + k, 3)), sg = new THREE.SphereGeometry(s, 22, 14);
        sg.scale(1, 0.72, 1);
        sg.translate((k - n / 2) * big * 0.75 + rr(i, k + 4) * 4, s * 0.25 + (k % 2) * big * 0.18, (rr(i, k + 9) - 0.5) * big);
        parts.push(sg);
      }
      const geo = mergeGeometries(parts, false); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, puffMat);
      m.rotation.y = rr(i, 20) * Math.PI; m.castShadow = false; m.receiveShadow = false;
      this.puffs.push({ g: m, x: (rr(i, 21) - 0.5) * 900, z: (rr(i, 22) - 0.5) * 1700, y: 540 + rr(i, 23) * 18 }); R.add(m);
    }
    // ---- ground: grass, runway, apron, guard rail, hangars, tower, trees (static batch) ----
    const r = (i: number, k: number) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
    const TREES0 = ["tree_oak", "tree_default", "tree_fat", "tree_detailed", "tree_cone"];
    setSight(sightLines());
    const b = new Batch();
    const grass = lam("grassHD", () => ({ map: grassHD() }));
    const rw = runwayTex(), runway = lam("runway", () => ({ map: rw }));
    const conc = concreteTex(), apron = lam("apron", () => ({ map: conc }));
    // ground: flat airfield, then rolling hills (user review: "make the world more 3D")
    const terrain = new THREE.PlaneGeometry(3000, 3000, 150, 150);
    terrain.rotateX(-Math.PI / 2);
    const tp = terrain.attributes.position as THREE.BufferAttribute, tuv = terrain.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < tp.count; i++) { tp.setY(i, hillY(tp.getX(i), tp.getZ(i))); tuv.setXY(i, tuv.getX(i) * 750, tuv.getY(i) * 750); }
    terrain.computeVertexNormals();
    b.add(terrain, grass);
    b.add(flat(-23, 23, -770, 770, 0.01, 1, 1540 / 60), runway);
    b.add(flat(-215, -105, 80, 215, 0.02, 110 / 8, 135 / 8), apron);
    b.add(flat(-105, -23, 110, 150, 0.015, 82 / 8, 40 / 8), apron); // taxiway
    b.add(flat(-110, -40, -175, -100, 0.02, 70 / 8, 75 / 8), apron); // hangar apron
    const rail = lam("guardRail", () => ({ color: "#c9cdd2" })), post = lam("railPost", () => ({ color: "#8d939c" }));
    for (let z = -96; z < 640; z += 4) b.add(boxGeo(V(-0.06, 0, z - 0.06), V(0.06, 0.75, z + 0.06)), post);
    b.add(boxGeo(V(-0.1, 0.48, -96), V(0.1, 0.72, 640)), rail);
    // hangars: walls, a low-pitched roof, a big sliding door facing +x
    const wall = lam("hangarWall", () => ({ color: "#d8d2c4" })), roofM = lam("hangarRoof", () => ({ color: "#8f5a46" }));
    const door = lam("hangarDoor", () => ({ map: doorTex() }));
    for (const [x0, z0, w, d, h] of [[-104, -158, 44, 52, 11], [-104, -96, 40, 44, 10], [-104, -224, 40, 50, 10]] as const) {
      const x1 = x0 + w, z1 = z0 + d;
      b.add(boxGeo(V(x0, 0, z0), V(x1, h, z1)), wall);
      b.add(quad(V(x1 + 0.05, 0, z1 - 3), V(x1 + 0.05, 0, z0 + 3), V(x1 + 0.05, h - 1.2, z0 + 3), V(x1 + 0.05, h - 1.2, z1 - 3), 1, 1), door);
      const ridge = h + 3.2;
      for (const s of [-1, 1]) {
        const zc = (z0 + z1) / 2, ze = s < 0 ? z0 - 0.6 : z1 + 0.6;
        const [a, c, d2, e] = [V(x0 - 0.6, h, ze), V(x1 + 0.6, h, ze), V(x1 + 0.6, ridge, zc), V(x0 - 0.6, ridge, zc)];
        b.add(s < 0 ? quad(a, c, d2, e) : quad(c, a, e, d2), roofM);
      }
      for (const xe of [x0, x1]) b.add(new THREE.BufferGeometry().setFromPoints([V(xe, h, z0), V(xe, h, z1), V(xe, ridge, (z0 + z1) / 2)]).setIndex(xe === x1 ? [0, 2, 1] : [0, 1, 2]), wall);
    }
    // control tower
    const towerM = lam("tower", () => ({ color: "#e6e1d6" })), glass = lam("towerGlass", () => ({ color: "#2b3a4f" }));
    b.add(boxGeo(V(-74, 0, -44), V(-69, 15, -39)), towerM);
    b.add(boxGeo(V(-75.5, 15, -45.5), V(-67.5, 18.2, -37.5)), glass);
    b.add(boxGeo(V(-76, 18.2, -46), V(-67, 18.8, -37)), towerM);
    // trees on the hills: clumps and single trees, so every wide shot has layers of depth
    for (let i = 0; i < 260; i++) {
      const a = r(i, 11) * Math.PI * 2, d = 300 + r(i, 12) * 700, x = Math.cos(a) * d * 1.1, z = Math.sin(a) * d * 1.25;
      const y = hillY(x, z);
      if (y < 2) continue;
      prop(b, kit, TREES0[i % 5], x, y - 0.4, z, 9 + r(i, 13) * 9, r(i, 14) * 6);
    }
    // trees around the field (left out wherever a lens looks through them)
    const TREES = ["tree_oak", "tree_default", "tree_fat", "tree_detailed", "tree_cone"];
    for (let i = 0; i < 140; i++) {
      const side = i % 2 ? 1 : -1, x = side * (58 + r(i, 1) * 70), z = -420 + i * 7.5 + r(i, 2) * 6;
      if (side < 0 && x > -115 && z > -235 && z < -40) continue; // hangars
      if (side < 0 && x > -220 && z > 70 && z < 225) continue; // apron
      prop(b, kit, TREES[i % 5], x, 0, z, 7 + r(i, 3) * 6, r(i, 4) * 6);
    }
    for (let i = 0; i < 26; i++) prop(b, kit, "plant_bushLarge", 26 + r(i, 5) * 30, 0, -120 + i * 5.5, 1.6 + r(i, 6), r(i, 7) * 6);
    // apron: fuel truck beside the left wing, an airline van
    const truckBody = lam("fuelTruckCab", () => ({ color: "#e9e6dc" })), tank = twoTone(new THREE.MeshPhongMaterial({ color: "#d9dde2", specular: "#aaaaaa", shininess: 60 }), 0.3);
    const tx = APRON[0] - 16.5, tz = APRON[2] - 6;
    b.add(boxGeo(V(tx - 1.3, 0.55, tz - 6), V(tx + 1.3, 3.1, tz - 3.6)), truckBody);
    const tk = cyl(1.25, 1.25, 7.2, 24); tk.rotateX(Math.PI / 2); b.add(tk, tank, at(tx, 2.05, tz + 0.4));
    b.add(boxGeo(V(tx - 1.2, 0.5, tz - 3.6), V(tx + 1.2, 0.8, tz + 4.2)), lam("chassis", () => ({ color: "#3a3d45" })));
    for (const wz of [tz - 4.8, tz + 1.2, tz + 2.8]) for (const s of [-1, 1]) { const w = cyl(0.55, 0.55, 0.4, 16); w.rotateZ(Math.PI / 2); b.add(w, lam("tyre", () => ({ color: "#23242a" })), at(tx + s * 1.25, 0.55, wz)); }
    b.add(boxGeo(V(tx - 1.32, 1.9, tz - 5.4), V(tx + 1.32, 2.6, tz - 4.0)), lam("truckGlass", () => ({ color: "#2b3a4f" })));
    // fuel hose from the truck to the wing's refuelling point
    const hose = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(tx + 1.2, 1.4, tz + 2), V(tx + 3.5, 0.15, tz + 4), V(APRON[0] - 9.5, 0.4, APRON[2] + 1.0), V(APRON[0] - 9.5, 2.1, APRON[2] + 1.5)]), 24, 0.09, 8);
    b.add(hose, lam("hose", () => ({ color: "#222228" })));
    prop(b, kit, "car:van", APRON[0] + 22, 0, APRON[2] - 26, 2.3, 0.8);
    // terminal building behind the apron (Montreal): long low block, a glass band, roof edge, a little tower
    const term = lam("terminal", () => ({ color: "#e8e2d4" })), tglass = lam("termGlass", () => ({ color: "#3b5a7a" }));
    b.add(boxGeo(V(-262, 0, 222), V(-96, 11, 240)), term);
    b.add(boxGeo(V(-260, 4.2, 221.7), V(-98, 8.6, 222.1)), tglass);
    b.add(boxGeo(V(-264, 11, 220.5), V(-94, 12, 241.5)), lam("termRoof", () => ({ color: "#9a9ea6" })));
    b.add(boxGeo(V(-128, 0, 214), V(-120, 22, 222)), term);
    b.add(boxGeo(V(-129.5, 22, 212.5), V(-118.5, 25.5, 223.5)), tglass);
    for (let k = 0; k < 6; k++) prop(b, kit, "car:truck", -250 + k * 26, 0, 205, 2.6, Math.PI / 2);
    prop(b, kit, "car:delivery-flat", APRON[0] + 18, 0, APRON[2] + 22, 2.0, -0.6);
    b.build(R);

    // ---- race day at Gimli (only in Gimli shots) ----
    const rb = new Batch();
    for (const [x, z, k, yaw] of [[-31, -98, "stall-red", 1.57], [-31, -84, "stall-green", 1.57], [-31, -70, "stall-red", 1.57], [-31, -56, "stall-green", 1.57],
      [30, -66, "stall-green", -1.57], [30, -52, "stall-red", -1.57], [-31, -42, "stall-red", 1.57]] as const) prop(rb, kit, k, x, 0, z, 3.4, yaw);
    for (const [x, z] of [[-27, -91], [-27, -63], [26.5, -60], [-27, -49]] as const) prop(rb, kit, "stall-bench", x, 0, z, 0.9, 1.57);
    const cars = ["car:sedan", "car:suv", "car:van", "car:hatchback-sports", "car:sedan-sports"];
    for (let i = 0; i < 18; i++) prop(rb, kit, cars[i % 5], -42 - (i % 2) * 6.5, 0, -118 + i * 6.2, 1.7, 1.57 + (i % 3 - 1) * 0.06);
    for (let i = 0; i < 6; i++) prop(rb, kit, cars[(i + 2) % 5], 40 + (i % 2) * 6, 0, -96 + i * 7, 1.7, -1.57);
    prop(rb, kit, "car:ambulance", -36, 0, -22, 2.4, 1.2);
    // start lights pole at the line
    const pole = lam("pole", () => ({ color: "#3a3d45" }));
    rb.add(boxGeo(V(-1.0, 0, -100.2), V(-0.7, 3.4, -99.9)), pole);
    rb.add(boxGeo(V(-1.3, 2.4, -100.3), V(-0.4, 3.6, -99.8)), pole);
    const lampOn = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.3) });
    for (let k = 0; k < 3; k++) rb.add(new THREE.SphereGeometry(0.12, 10, 8), lampOn, at(-0.85, 2.65 + k * 0.33, -100.35));
    // start line + chequered banner over the lanes
    const chk = lam("chequer", () => ({ map: ctex("chequer", 256, 64, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? "#1d1d22" : "#f4f4f2"; g.fillRect(x * 16, y * 16, 16, 16); } }) }));
    rb.add(flat(-22, -0.5, -100.6, -99.4, 0.03, 1, 1), chk);
    // barbecue grills (kettle on three legs, grate, sausages)
    const kettle = lam("kettle", () => ({ color: "#2a2b31" })), steel = lam("grate", () => ({ color: "#9aa0a8" })), sausage = lam("sausage", () => ({ color: "#b5532f" }));
    for (const [gx, gz] of [[GRILL[0], GRILL[2]], [-28.5, -77], [27.5, -58.5]] as const) {
      const bowl = new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      rb.add(bowl, kettle, at(gx, 0.85, gz));
      for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; rb.add(cyl(0.025, 0.025, 0.9, 6), steel, at(gx + 0.3 * Math.cos(a), 0.42, gz + 0.3 * Math.sin(a), 0.2 * Math.sin(a), 0, -0.2 * Math.cos(a))); }
      const grate = new THREE.CircleGeometry(0.4, 18); grate.rotateX(-Math.PI / 2); rb.add(grate, steel, at(gx, 0.86, gz));
      for (let k = 0; k < 4; k++) { const sg = new THREE.CapsuleGeometry(0.035, 0.3, 4, 8); sg.rotateZ(Math.PI / 2); rb.add(sg, sausage, at(gx - 0.05, 0.9, gz - 0.2 + k * 0.13, 0, 0.2 * (k % 2 ? 1 : -1))); }
      rb.add(boxGeo(V(gx + 0.5, 0, gz - 0.35), V(gx + 1.15, 0.8, gz + 0.35)), lam("cooler", () => ({ color: "#d8473b" })));
    }
    // hay bales along the lanes
    const hay = lam("hay", () => ({ color: "#d9b35a" }));
    for (let z = -94; z < -30; z += 9) for (const x of [-21.6]) { const hb = cyl(0.6, 0.6, 1.1, 14); hb.rotateZ(Math.PI / 2); rb.add(hb, hay, at(x, 0.6, z)); }
    rb.build(this.race);
    for (const k of KARTS) { const o = kitClone(kit, k.kit, 1.1); if (o) { this.karts.push({ o, k }); this.race.add(o); } }
    R.add(this.race);

    // ---- podium (shot 17) ----
    const pb = new Batch(), [px, , pz] = PODIUM;
    pb.add(boxGeo(V(px - 1.3, 0, pz - 0.7), V(px + 1.3, 1.0, pz + 0.7)), lam("gold", () => ({ color: "#f2c14e" })));
    pb.add(boxGeo(V(px - 1.2, 0, pz - 2.6), V(px + 1.2, 0.6, pz - 0.7)), lam("silver", () => ({ color: "#cfd5dc" })));
    pb.add(boxGeo(V(px - 1.2, 0, pz + 0.7), V(px + 1.2, 0.4, pz + 2.6)), lam("bronze", () => ({ color: "#d08a4a" })));
    const bunt = lam("bunting", () => ({ color: "#3f8fd0" }));
    for (const s of [-1, 1]) pb.add(boxGeo(V(px - 2.6, 0, pz + s * 4.2 - 0.06), V(px - 2.48, 4.2, pz + s * 4.2 + 0.06)), pole);
    pb.add(boxGeo(V(px - 2.6, 3.9, pz - 4.2), V(px - 2.5, 4.0, pz + 4.2)), bunt);
    for (let i = 0; i < 12; i++) {
      const zz = pz - 4 + i * 0.72, col = ["#e2453c", "#f2c14e", "#3f8fd0", "#5fae6a"][i % 4];
      pb.add(new THREE.BufferGeometry().setFromPoints([V(px - 2.55, 3.92, zz), V(px - 2.55, 3.92, zz + 0.6), V(px - 2.55, 3.4, zz + 0.3)]), lam("pennant" + col, () => ({ color: col, side: THREE.DoubleSide })));
    }
    pb.build(this.podium);
    R.add(this.podium);

    // ---- cockpit set (high in the sky, so the windows show sky and the cloud sea) ----
    this.buildCockpit();
    R.add(this.cockpit);

    // ---- the jet ----
    this.jet = buildJet();
    R.add(this.jet.root);

    for (const fg of FOREGROUND) {
      const o = kitClone(kit, fg.kit, fg.s ?? 1);
      if (!o) continue;
      o.position.set(...fg.pos); o.rotation.y = fg.yaw ?? 0; o.visible = false;
      this.fgs.push({ o, a: fg.a, b: fg.b }); R.add(o);
    }
  }

  private buildCockpit() {
    const g = this.cockpit, b = new Batch(), [cx, cy, cz] = COCKPIT;
    const B = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: THREE.Material) => b.add(boxGeo(V(cx + x0, cy + y0, cz + z0), V(cx + x1, cy + y1, cz + z1)), m);
    const wall = lam("ckWall", () => ({ color: "#d4d6d8" })), panel = lam("ckPanel", () => ({ color: "#4f5664" })), dash = lam("ckDash", () => ({ color: "#5a6170" }));
    const seat = lam("ckSeat", () => ({ color: "#5a4636" })), floor = lam("ckFloor", () => ({ color: "#4a4f5a" })), frame = lam("ckFrame", () => ({ color: "#b9bcc2" }));
    B(-1.7, -0.1, -1.7, 1.7, 0, 1.5, floor);
    B(-1.7, 2.1, -1.7, 1.7, 2.2, 1.5, wall);
    B(-1.2, 1.88, -1.3, 1.2, 2.1, 0.2, panel); // overhead panel
    B(-1.7, 0, 1.4, 1.7, 2.2, 1.5, wall); // back wall
    B(-0.45, 0, 1.38, 0.45, 1.9, 1.42, lam("ckDoor", () => ({ color: "#bfc2c7" })));
    for (const s of [-1, 1]) { // side walls with a window opening (z -1.45 .. -0.35, y 1.0 .. 1.6)
      const x0 = s < 0 ? -1.7 : 1.6, x1 = s < 0 ? -1.6 : 1.7;
      B(x0, 0, -1.7, x1, 1.0, 1.5, wall); B(x0, 1.6, -1.7, x1, 2.2, 1.5, wall);
      B(x0, 1.0, -0.35, x1, 1.6, 1.5, wall); B(x0, 1.0, -1.7, x1, 1.6, -1.45, wall);
    }
    // windshield: frame posts around four panes (front at z -1.6)
    B(-1.7, 0, -1.72, 1.7, 1.05, -1.6, dash); B(-1.7, 1.78, -1.72, 1.7, 2.2, -1.6, wall);
    for (const x of [-1.7, -0.86, -0.06, 0.76, 1.6]) B(x, 1.05, -1.72, x + 0.1, 1.78, -1.6, frame); // window posts
    // dashboard + glareshield + centre pedestal + yokes
    B(-1.6, 0, -1.6, 1.6, 0.98, -1.05, dash);
    B(-1.6, 0.98, -1.6, 1.6, 1.08, -0.95, panel);
    B(-0.2, 0, -1.05, 0.2, 0.78, 0.3, panel);
    for (const s of [-1, 1]) {
      B(s * 0.62 - 0.03, 0.4, -0.78, s * 0.62 + 0.03, 0.82, -0.72, dash);
      b.add(new THREE.TorusGeometry(0.16, 0.025, 6, 16, Math.PI), dash, at(cx + s * 0.62, cy + 0.84, cz - 0.75));
      // seat: base, back, headrest
      B(s * 0.62 - 0.3, 0.32, 0.12, s * 0.62 + 0.3, 0.48, 0.66, seat);
      B(s * 0.62 - 0.3, 0.48, 0.62, s * 0.62 + 0.3, 1.32, 0.78, seat);
      B(s * 0.62 - 0.17, 1.32, 0.64, s * 0.62 + 0.17, 1.55, 0.76, seat);
      B(s * 0.62 - 0.08, 0, 0.3, s * 0.62 + 0.08, 0.32, 0.5, panel);
    }
    b.build(g, false);
    g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.receiveShadow = false; });
    // screens (unlit, swap to black when the power goes)
    [-1.05, -0.45, 0.45, 1.05].forEach((x, i) => {
      this.screenOn.push(screenTex(true, i)); this.screenOff.push(screenTex(false, i));
      const mat = new THREE.MeshBasicMaterial({ map: this.screenOn[i], toneMapped: true });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.36), mat);
      m.position.set(cx + x, cy + 0.72, cz - 1.045); m.rotation.x = -0.12; m.layers.set(NOINK);
      this.screens.push(mat); g.add(m);
    });
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const high = s.place === "sky" || s.place === "cockpit";
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = s.place === "cockpit" ? 0.05 : 0.2; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 95);
    if (s.light === "golden") Rr = Math.max(Rr, 34);
    if (s.place === "sky") Rr = Math.max(Rr, 34); // the whole jet
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    this.fog.near = high ? 300 : L.fogNear; this.fog.far = high ? 2600 : L.fogFar; // up high the air is clear to the cloud horizon
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    this.clouds.forEach((m, i) => {
      const a = (i / this.clouds.length) * Math.PI * 2 + 0.3, d = 820 + (i % 3) * 80, w = 170 + (i % 4) * 40;
      const y = high ? cam.position.y + (i % 3 === 0 ? -30 : 25 + (i % 4) * 30) : 120 + (i % 4) * 38;
      m.position.set(cam.position.x + Math.cos(a) * d, y, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    });
    for (const p of this.puffs) {
      p.g.visible = high;
      const z = ((((p.z + 30 * t + 850) % 1700) + 1700) % 1700) - 850; // drift toward +z at 30 m/s, wrapped
      p.g.position.set(SKY[0] + p.x, p.y, SKY[2] + z);
    }
    for (const c2 of this.sea) {
      c2.m.visible = high;
      c2.mat.map = this.seaTex[s.light][c2.k];
      c2.mat.map.repeat.set(9, 9);
      c2.mat.map.offset.set(0.002 * c2.k, -((t * (c2.k ? 0.0105 : 0.0072)) % 1)); // stream toward +z
    }
    // ---- set dressing per place ----
    const gimli = s.place === "gimli";
    this.race.visible = gimli; this.podium.visible = id === 17;
    this.cockpit.visible = s.place === "cockpit";
    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;
    for (const { o, k } of this.karts) {
      if (id === 8) { o.position.set(k.x, 0, -78 + k.v * (k.t0 - t)); o.rotation.y = Math.PI; } // nose toward -z (the way they drive)
      else { o.position.set(...k.park); o.rotation.y = 0.5 + k.x * 0.1; }
    }
    const dead = f >= 233 || id > 6;
    this.screens.forEach((m, i) => { m.map = dead ? this.screenOff[i] : this.screenOn[i]; });
    // ---- the jet ----
    const ps = planeAt(id, t);
    poseJet(this.jet, ps);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, ps, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow && s.place !== "cockpit";
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}
export { smooth };
