// "Why Toast Lands Butter-Side Down" as one three.js scene with four sets far apart: a kitchen (day / night), Matthews'
// lab at night, a 2001 classroom and a British street. Toast is real 3D (crust ring, crumb face, butter face) driven by the
// drop physics in story.ts. Walls never cast shadows (interiors stay lit, the camera never sees a ceiling); furniture,
// props and characters do. update(id, f, camera) poses everything for shot `id` at frame f.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, boxGeo, V, lam, Kit, Ray, prop, setSight, quad, house } from "./build";
import { ctex, cloudHD, grassHD, cobbleHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, ArmPlace } from "./cast";
import { INK } from "./toon";
import {
  checkerTex, subwayTex, plasterTex, boardsTex, chalkboardTex, booksTex, posterTex, clothTex, toastTex, nightWindowTex, dayWindowTex,
} from "./gfx";
import {
  FPS, SHOTS, camAt, ShotDef, KITCHEN, LAB, CLASS, STREET, TABLE_H, LAB_TABLE, DESK_ROWS, DROPS, dropAt, LAB_PILE, CLASS_PILE, Slice,
} from "./story";

// ---------------- assets ----------------
const KENNEY = ["tree_oak", "tree_default", "tree_fat", "plant_bushLarge", "plant_bushDetailed", "lantern", "car:sedan", "car:hatchback-sports", "car:van"];
const kenneyPath = (n: string) => {
  const m = /^(nature|car|town|buildings):(.+)$/.exec(n);
  if (m) return `kenney/${m[1]}/${m[2]}.glb`;
  return `kenney/${n.includes("_") ? "nature" : "town"}/${n}.glb`;
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
/** closed box: with a bottom face, so tables / desks / seats seen from below are solid (user review 2026-11-07) */
const boxB = (a: THREE.Vector3, b: THREE.Vector3, tile = 0) => boxGeo(a, b, tile, true);
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const glowTex = () => ctex("glow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, "rgba(255,230,170,0.9)"); gr.addColorStop(0.35, "rgba(255,200,120,0.35)"); gr.addColorStop(1, "rgba(255,190,110,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u = 1, v = 1) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
const cyl = (r0: number, r1: number, h: number, n = 20) => new THREE.CylinderGeometry(r0, r1, h, n);
const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(s, s, s));
/** a wall panel facing +z (or rotated), with u/v repeats per metre */
const wallZ = (x0: number, x1: number, y0: number, y1: number, z: number, tile = 1, facing = 1) =>
  facing > 0 ? quad(V(x0, y0, z), V(x1, y0, z), V(x1, y1, z), V(x0, y1, z), (x1 - x0) / tile, (y1 - y0) / tile)
    : quad(V(x1, y0, z), V(x0, y0, z), V(x0, y1, z), V(x1, y1, z), (x1 - x0) / tile, (y1 - y0) / tile);
const wallX = (z0: number, z1: number, y0: number, y1: number, x: number, tile = 1, facing = 1) =>
  facing > 0 ? quad(V(x, y0, z1), V(x, y0, z0), V(x, y1, z0), V(x, y1, z1), (z1 - z0) / tile, (y1 - y0) / tile)
    : quad(V(x, y0, z0), V(x, y0, z1), V(x, y1, z1), V(x, y1, z0), (z1 - z0) / tile, (y1 - y0) / tile);
const unlit = (map: THREE.Texture, k = 1) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(k, k, k), toneMapped: true });

// ---------------- toast ----------------
const SLICE_W = 0.17, SLICE_T = 0.018;
const sliceShape = () => {
  const s = new THREE.Shape(), w = SLICE_W / 2, h = SLICE_W * 0.52;
  s.moveTo(-w, -h); s.lineTo(w, -h); s.lineTo(w, h * 0.25);
  s.absarc(0, h * 0.25, w, 0, Math.PI, false);
  s.lineTo(-w, -h);
  return s;
};
type Toast = { g: THREE.Group; top: THREE.Mesh };
const TOAST_MATS = () => ({
  crust: lam("toastCrust", () => ({ color: "#b06a30" })),
  crumb: lam("toastCrumb", () => ({ map: toastTex("crumb") })),
  butter: lam("toastButter", () => ({ map: toastTex("butter") })),
  B: lam("toastB", () => ({ map: toastTex("B") })),
});
const SHAPE = sliceShape();
const capGeo = (() => { const g = new THREE.ShapeGeometry(SHAPE, 12); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / SLICE_W + 0.5, uv.getY(i) / SLICE_W + 0.5); return g; })();
const rimGeo = new THREE.ExtrudeGeometry(SHAPE, { depth: SLICE_T, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.004, bevelSegments: 2, curveSegments: 12 });
rimGeo.translate(0, 0, -SLICE_T / 2);
const makeToast = (M: ReturnType<typeof TOAST_MATS>): Toast => {
  const g = new THREE.Group(), inner = new THREE.Group();
  const rim = new THREE.Mesh(rimGeo, M.crust);
  const top = new THREE.Mesh(capGeo, M.butter); top.position.z = SLICE_T / 2 + 0.0045;
  const bot = new THREE.Mesh(capGeo, M.crumb); bot.position.z = -SLICE_T / 2 - 0.0045; bot.rotation.y = Math.PI;
  inner.add(rim, top, bot); inner.rotation.x = -Math.PI / 2; // lie flat: the +z cap faces up
  g.add(inner);
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.rotation.order = "XYZ";
  return { g, top };
};

/** every lens of the street shot (houses are left out where they would block it) */
const streetRays = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    if (s.place !== "street") continue;
    for (let f = s.a - 4; f < s.b; f += 3) {
      const c = camAt(s.id, f), o = V(...c.pos), look = V(...c.look);
      const fw = look.clone().sub(o), len = Math.min(fw.length(), 40);
      fw.normalize();
      out.push({ o, d: fw, len, core: true });
    }
  }
  return out;
};

/** pile fill order: random, so a smaller count still looks scattered */
const order60 = Array.from({ length: 60 }, (_, i) => i).sort((a, b) => Math.sin(a * 12.9) - Math.sin(b * 12.9));
const order140 = Array.from({ length: 140 }, (_, i) => i).sort((a, b) => Math.sin(a * 7.3) - Math.sin(b * 7.3));
/** a real 3D arm (user review: "the people don't even touch the bread"): a camera-facing ribbon from the shoulder to the
 *  hand in the arm colour, an ink hand dot, and an optional marker in the hand. Unlit like the drawn arms, no world ink. */
class Arm3D {
  g = new THREE.Group(); private geo = new THREE.BufferGeometry(); private mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  private hand: THREE.Mesh; private marker: THREE.Group;
  constructor(parent: THREE.Object3D) {
    this.geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
    this.geo.setIndex([0, 1, 2, 0, 2, 3]);
    const rib = new THREE.Mesh(this.geo, this.mat); rib.frustumCulled = false;
    this.hand = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshBasicMaterial({ color: INK }));
    this.marker = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.1, 12), new THREE.MeshBasicMaterial({ color: "#2f6fbf" }));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.025, 10), new THREE.MeshBasicMaterial({ color: INK })); tip.position.y = -0.062; tip.rotation.x = Math.PI;
    this.marker.add(body, tip);
    this.g.add(rib, this.hand, this.marker);
    this.g.traverse((o) => { o.layers.set(NOINK); });
    this.g.renderOrder = 2; this.g.visible = false;
    parent.add(this.g);
  }
  set(p: ArmPlace, cam: THREE.Vector3) {
    const A = new THREE.Vector3(...p.a), B = new THREE.Vector3(...p.b), mid = A.clone().add(B).multiplyScalar(0.5);
    const w = B.clone().sub(A).cross(cam.clone().sub(mid)).normalize().multiplyScalar(0.0135);
    const pos = this.geo.attributes.position as THREE.BufferAttribute;
    [A.clone().sub(w), A.clone().add(w), B.clone().add(w), B.clone().sub(w)].forEach((v, i) => pos.setXYZ(i, v.x, v.y, v.z));
    pos.needsUpdate = true; this.geo.computeBoundingSphere();
    this.mat.color.set(p.col);
    this.hand.position.copy(B);
    this.marker.visible = p.tool === "marker";
    if (p.tool === "marker") { this.marker.position.copy(B).add(new THREE.Vector3(-0.005, -0.045, 0.01)); this.marker.rotation.set(0.15, 0, 0.1); }
    this.g.visible = true;
  }
}
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private arms3: Arm3D[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private clouds: THREE.Mesh[] = [];
  private cloudMaps: Record<"day" | "golden" | "night", THREE.Texture[]>;
  private sets: Record<string, THREE.Group> = { kitchen: new THREE.Group(), lab: new THREE.Group(), class: new THREE.Group(), street: new THREE.Group() };
  private table = new THREE.Group(); private ladder = new THREE.Group(); private pendant = new THREE.Group(); private plate!: THREE.Mesh;
  private kWinDay!: THREE.Mesh; private kWinNight!: THREE.Mesh; private lampGlow!: THREE.Sprite; private bulb!: THREE.MeshBasicMaterial;
  private toasts: Toast[] = []; private TM: ReturnType<typeof TOAST_MATS>;
  private labPile!: THREE.InstancedMesh; private classPile!: THREE.InstancedMesh; private scale = new THREE.Group(); private beam!: THREE.Group;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky + light ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)), night: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.night.cloud)) };
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    this.TM = TOAST_MATS();
    for (const k of Object.keys(this.sets)) R.add(this.sets[k]);
    this.buildKitchen(kit);
    this.buildLab();
    this.buildClass(kit);
    this.buildStreet(kit);
    for (let i = 0; i < 20; i++) { const t = makeToast(this.TM); t.g.visible = false; this.toasts.push(t); R.add(t.g); }
  }

  // ---------------- kitchen ----------------
  private buildKitchen(kit: Kit) {
    const g = this.sets.kitchen, b = new Batch(), wb = new Batch(), [X, , Z] = KITCHEN;
    const tile = lam("checker", () => ({ map: checkerTex() })), sub = lam("subway", () => ({ map: subwayTex() }));
    const paint = lam("kPaint", () => ({ map: plasterTex("kitchen", "#f3dd9b") })), white = lam("kWhite", () => ({ color: "#f4f2ec" }));
    const wood = lam("kWood", () => ({ color: "#b5774a" })), top = lam("kTop", () => ({ color: "#e9e4d8" })), chrome = twoTone(new THREE.MeshPhongMaterial({ color: "#c9cdd4", specular: "#ffffff", shininess: 80 }), 0.25);
    const red = lam("kRed", () => ({ color: "#d8473b" })), teal = lam("kTeal", () => ({ color: "#3fa6a0" }));
    wb.add(flat(X - 4.5, X + 4.5, Z - 3.2, Z + 5, 0, 9 / 1.0, 8.2 / 1.0), tile);
    // back wall (z -3) with a window x -1.1..1.1, y 1.15..2.35: splashback tiles below 1.6, paint above
    const backZ = Z - 3;
    for (const [x0, x1] of [[-4.5, -1.1], [1.1, 4.5]]) { wb.add(wallZ(X + x0, X + x1, 0, 1.6, backZ, 0.5), sub); wb.add(wallZ(X + x0, X + x1, 1.6, 3.2, backZ, 1), paint); }
    wb.add(wallZ(X - 1.1, X + 1.1, 0, 1.15, backZ, 0.5), sub); wb.add(wallZ(X - 1.1, X + 1.1, 2.35, 3.2, backZ, 1), paint);
    // window frame + sill + the view
    for (const x of [-1.15, 1.05]) b.add(boxB(V(X + x, 1.1, backZ), V(X + x + 0.1, 2.4, backZ + 0.08)), white);
    b.add(boxB(V(X - 1.15, 2.33, backZ), V(X + 1.15, 2.42, backZ + 0.08)), white);
    b.add(boxB(V(X - 1.25, 1.08, backZ), V(X + 1.25, 1.16, backZ + 0.22)), white);
    b.add(boxB(V(X - 0.04, 1.15, backZ), V(X + 0.04, 2.35, backZ + 0.05)), white);
    this.kWinDay = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.3), unlit(dayWindowTex(), 1.05)); this.kWinDay.position.set(X, 1.75, backZ - 0.05);
    this.kWinNight = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.3), unlit(nightWindowTex(), 1.0)); this.kWinNight.position.set(X, 1.75, backZ - 0.05);
    for (const m of [this.kWinDay, this.kWinNight]) { m.layers.set(NOINK); g.add(m); }
    // left wall (x -4.5) and right wall (x 4.5)
    wb.add(wallX(Z - 3.2, Z + 5, 0, 3.2, X - 4.5, 1, 1), paint);
    wb.add(wallX(Z - 3.2, Z + 5, 0, 3.2, X + 4.5, 1, -1), paint);
    wb.add(wallX(Z - 3.2, Z + 5, 0, 0.12, X - 4.49, 0.5, 1), wood); // skirting
    // counter along the back wall: cupboards, worktop, upper cupboards, toaster, kettle, fruit bowl
    for (const [x0, x1] of [[-4.4, -1.35], [1.35, 4.4]]) {
      b.add(boxB(V(X + x0, 0, backZ + 0.02), V(X + x1, 0.86, backZ + 0.62)), teal);
      b.add(boxB(V(X + x0 - 0.02, 0.86, backZ + 0.02), V(X + x1 + 0.02, 0.92, backZ + 0.66)), top);
      b.add(boxB(V(X + x0, 1.75, backZ + 0.02), V(X + x1, 2.55, backZ + 0.36)), teal);
      for (let x = x0 + 0.5; x < x1; x += 0.75) { b.add(boxB(V(X + x - 0.03, 0.62, backZ + 0.62), V(X + x + 0.03, 0.66, backZ + 0.66)), chrome); b.add(boxB(V(X + x - 0.03, 1.8, backZ + 0.36), V(X + x + 0.03, 1.84, backZ + 0.4)), chrome); }
    }
    b.add(boxB(V(X + 2.0, 0.92, backZ + 0.18), V(X + 2.36, 1.14, backZ + 0.4)), chrome); // toaster
    for (const dx of [2.1, 2.24]) b.add(boxB(V(X + dx, 1.139, backZ + 0.22), V(X + dx + 0.04, 1.142, backZ + 0.36)), lam("slot", () => ({ color: "#2a2a30" })));
    b.add(cyl(0.09, 0.11, 0.24, 18), red, at(X + 3.0, 1.04, backZ + 0.3)); // kettle
    b.add(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), white, at(X - 2.4, 1.08, backZ + 0.32)); // bowl
    for (const [dx, c] of [[-0.06, "#f2c14e"], [0.06, "#d8473b"], [0, "#6fae5a"]] as const) b.add(new THREE.SphereGeometry(0.06, 12, 8), lam("fruit" + c, () => ({ color: c })), at(X - 2.4 + dx, 1.1, backZ + 0.32 + (c === "#6fae5a" ? 0.05 : 0)));
    // fridge on the left wall
    b.add(boxB(V(X - 4.45, 0, Z - 1.6), V(X - 3.7, 1.95, Z - 0.8)), lam("fridge", () => ({ color: "#e6f0f2" })));
    b.add(boxB(V(X - 3.71, 0.9, Z - 1.0), V(X - 3.66, 1.6, Z - 0.95)), chrome);
    // shelf with jars on the left wall (seen in the side-on shots)
    b.add(boxB(V(X - 4.45, 1.5, Z + 0.2), V(X - 4.15, 1.54, Z + 1.8)), wood);
    for (let k = 0; k < 5; k++) b.add(cyl(0.07, 0.07, 0.2, 12), lam("jar" + k, () => ({ color: ["#e2b64a", "#d9624a", "#6fae5a", "#c86fb0", "#4c6fbf"][k] })), at(X - 4.3, 1.64, Z + 0.4 + k * 0.3));
    // a picture frame and a wall clock
    b.add(boxB(V(X - 4.46, 1.9, Z + 2.3), V(X - 4.42, 2.5, Z + 3.1)), wood);
    b.add(cyl(0.22, 0.22, 0.04, 24), white, at(X + 4.47, 2.3, Z - 1.4, 0, 0, Math.PI / 2));
    // chairs
    for (const [cx, cz, ry] of [[-0.95, 0.42, Math.PI / 2], [0.95, 0.0, -Math.PI / 2]] as const) {
      const ch = new Batch();
      ch.add(boxB(V(-0.22, 0.44, -0.22), V(0.22, 0.48, 0.22)), wood);
      for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) ch.add(boxB(V(lx - 0.02, 0, lz - 0.02), V(lx + 0.02, 0.44, lz + 0.02)), wood);
      ch.add(boxB(V(-0.22, 0.48, -0.22), V(-0.18, 1.0, 0.22)), wood);
      const cg = new THREE.Group(); ch.build(cg); cg.position.set(X + cx, 0, Z + cz); cg.rotation.y = ry; g.add(cg);
    }
    // the table (its height changes for the 3 m shot): top + cloth + legs, scaled in update()
    const tb = new Batch();
    tb.add(boxB(V(-0.7, -0.05, -0.43), V(0.7, 0, 0.43)), wood);
    tb.add(boxB(V(-0.72, -0.002, -0.45), V(0.72, 0.004, 0.45)), lam("cloth", () => ({ map: clothTex() })));
    for (const [lx, lz] of [[-0.62, -0.36], [0.62, -0.36], [-0.62, 0.36], [0.62, 0.36]]) tb.add(boxB(V(lx - 0.035, -1, lz - 0.035), V(lx + 0.035, -0.05, lz + 0.035)), wood);
    tb.build(this.table);
    this.table.position.set(X, TABLE_H, Z + 0.42); g.add(this.table);
    this.plate = new THREE.Mesh(cyl(0.14, 0.1, 0.02, 28), white); this.plate.castShadow = true; g.add(this.plate);
    // ladder for the giant table
    const lb = new Batch();
    for (const s of [-1, 1]) lb.add(boxB(V(s * 0.24 - 0.03, 0, -0.03), V(s * 0.24 + 0.03, 3.2, 0.03)), wood);
    for (let k = 0; k < 10; k++) lb.add(boxB(V(-0.24, 0.3 + k * 0.3, -0.025), V(0.24, 0.33 + k * 0.3, 0.025)), wood);
    lb.build(this.ladder); this.ladder.position.set(X + 0.95, 0, Z + 0.95); this.ladder.rotation.set(-0.12, -0.35, 0); g.add(this.ladder);
    // pendant lamp over the table (on at night)
    this.bulb = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.5, 0.5) });
    const pb = new Batch();
    pb.add(cyl(0.008, 0.008, 1.0, 6), lam("cord", () => ({ color: "#2a2a30" })), at(X, 2.75, Z + 0.42));
    pb.add(new THREE.ConeGeometry(0.26, 0.2, 24, 1, true), red, at(X, 2.2, Z + 0.42));
    pb.build(this.pendant);
    const bulbM = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), this.bulb); bulbM.position.set(X, 2.12, Z + 0.42); bulbM.layers.set(NOINK); this.pendant.add(bulbM); g.add(this.pendant);
    this.lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.lampGlow.position.set(X, 2.1, Z + 0.42); this.lampGlow.scale.setScalar(1.6); this.lampGlow.layers.set(NOINK); g.add(this.lampGlow);
    // garden behind the window: a hedge and trees (seen through the glassless window)
    prop(b, kit, "plant_bushLarge", X - 1.5, 0, backZ - 3, 1.6, 0.3); prop(b, kit, "tree_oak", X + 1.5, 0, backZ - 7, 6, 0.2);
    b.build(g); wb.build(g, false);
  }

  // ---------------- lab (night) ----------------
  private buildLab() {
    const g = this.sets.lab, b = new Batch(), wb = new Batch(), [X, , Z] = LAB;
    const boards = lam("labBoards", () => ({ map: boardsTex("#9a6a40") })), wall = lam("labWall", () => ({ map: plasterTex("lab", "#c9b8a0") }));
    const panel = lam("labPanel", () => ({ color: "#6b4a32" })), wood = lam("labWood", () => ({ color: "#8a5a34" })), metal = lam("labMetal", () => ({ color: "#9aa0a8" }));
    const green = lam("labGreen", () => ({ color: "#2f6a4a" })), paper = lam("paper", () => ({ color: "#f4f1e6" }));
    wb.add(flat(X - 4.5, X + 4.5, Z - 3.4, Z + 5, 0, 9 / 1.2, 8.4 / 1.2), boards);
    b.add(flat(X - 1.6, X + 1.6, Z - 0.9, Z + 1.7, 0.006, 1, 1), lam("rug", () => ({ map: ctex("rug", 256, 256, (gg) => { gg.fillStyle = "#8a2f3a"; gg.fillRect(0, 0, 256, 256); gg.strokeStyle = "#e2b64a"; gg.lineWidth = 10; gg.strokeRect(18, 18, 220, 220); gg.strokeStyle = "#2a3f7a"; gg.strokeRect(40, 40, 176, 176); }) })));
    const backZ = Z - 3.2;
    wb.add(wallZ(X - 4.5, X + 4.5, 0, 3.4, backZ, 1), wall);
    wb.add(wallZ(X - 4.5, X + 4.5, 0, 0.9, backZ + 0.01, 0.6), panel);
    wb.add(wallX(Z - 3.4, Z + 5, 0, 3.4, X - 4.5, 1, 1), wall);
    wb.add(wallX(Z - 3.4, Z + 5, 0, 0.9, X - 4.49, 0.6, 1), panel);
    // chalkboard
    const cb = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), lam("chalk", () => ({ map: chalkboardTex() }))); cb.position.set(X + 0.2, 1.75, backZ + 0.03); cb.receiveShadow = true; g.add(cb);
    b.add(boxB(V(X - 1.25, 1.02, backZ), V(X + 1.65, 1.06, backZ + 0.08)), wood); b.add(boxB(V(X - 1.25, 2.44, backZ), V(X + 1.65, 2.48, backZ + 0.06)), wood);
    // bookshelves (left of the board) and a filing cabinet
    const books = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.5), lam("books", () => ({ map: booksTex() }))); books.position.set(X - 2.85, 1.25, backZ + 0.36); g.add(books);
    b.add(boxB(V(X - 3.8, 0, backZ + 0.02), V(X - 1.9, 2.55, backZ + 0.08)), wood);
    for (const x of [-3.8, -1.96]) b.add(boxB(V(X + x, 0, backZ + 0.02), V(X + x + 0.06, 2.55, backZ + 0.4)), wood);
    b.add(boxB(V(X - 3.8, 2.5, backZ + 0.02), V(X - 1.9, 2.56, backZ + 0.4)), wood);
    b.add(boxB(V(X + 2.9, 0, backZ + 0.05), V(X + 3.5, 1.3, backZ + 0.65)), metal);
    // window on the left wall (night)
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), unlit(nightWindowTex(), 1.0)); win.position.set(X - 4.48, 1.75, Z - 0.6); win.rotation.y = Math.PI / 2; win.layers.set(NOINK); g.add(win);
    for (const dz of [-1.45, 0.25]) b.add(boxB(V(X - 4.5, 1.05, Z + dz), V(X - 4.42, 2.45, Z + dz + 0.1)), wood);
    b.add(boxB(V(X - 4.5, 1.05, Z - 1.45), V(X - 4.35, 1.12, Z + 0.35)), wood); b.add(boxB(V(X - 4.5, 2.38, Z - 1.45), V(X - 4.42, 2.45, Z + 0.35)), wood);
    // right wall with a lit doorway (z -2.3..-0.9)
    wb.add(wallX(Z - 3.4, Z - 2.3, 0, 3.4, X + 4.5, 1, -1), wall); wb.add(wallX(Z - 0.9, Z + 5, 0, 3.4, X + 4.5, 1, -1), wall);
    wb.add(wallX(Z - 2.3, Z - 0.9, 2.2, 3.4, X + 4.5, 1, -1), wall);
    const hall = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.92, 0.62) })); hall.position.set(X + 4.75, 1.1, Z - 1.6); hall.rotation.y = -Math.PI / 2; hall.layers.set(NOINK); g.add(hall);
    for (const dz of [-2.36, -0.9]) b.add(boxB(V(X + 4.4, 0, Z + dz), V(X + 4.55, 2.26, Z + dz + 0.06)), wood);
    // desk + green banker's lamp (glowing), papers, mug
    b.add(boxB(V(X + 1.6, 0.72, backZ + 0.5), V(X + 3.0, 0.78, backZ + 1.3)), wood);
    for (const [lx, lz] of [[1.65, 0.55], [2.95, 0.55], [1.65, 1.25], [2.95, 1.25]]) b.add(boxB(V(X + lx - 0.03, 0, backZ + lz - 0.03), V(X + lx + 0.03, 0.72, backZ + lz + 0.03)), wood);
    b.add(cyl(0.02, 0.02, 0.35, 8), metal, at(X + 2.6, 0.95, backZ + 0.75));
    const shade = new THREE.CylinderGeometry(0.06, 0.16, 0.12, 16, 1, true); b.add(shade, green, at(X + 2.6, 1.14, backZ + 0.75));
    const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); lampGlow.position.set(X + 2.6, 1.05, backZ + 0.78); lampGlow.scale.setScalar(1.4); lampGlow.layers.set(NOINK); g.add(lampGlow);
    const lb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.4) })); lb.position.set(X + 2.6, 1.08, backZ + 0.75); lb.layers.set(NOINK); g.add(lb);
    for (let k = 0; k < 4; k++) b.add(boxB(V(X + 1.8 + k * 0.08, 0.78 + k * 0.004, backZ + 0.7 + k * 0.05), V(X + 2.1 + k * 0.08, 0.782 + k * 0.004, backZ + 1.0 + k * 0.05)), paper);
    b.add(cyl(0.05, 0.05, 0.11, 14), lam("mug", () => ({ color: "#d8473b" })), at(X + 2.25, 0.84, backZ + 1.1));
    // the lab table: top, legs, toaster, a loaf, a stack of plates
    const tb = LAB_TABLE;
    b.add(boxB(V(tb[0] - 0.85, TABLE_H - 0.05, tb[2] - 0.45), V(tb[0] + 0.85, TABLE_H, tb[2] + 0.45)), wood);
    for (const [lx, lz] of [[-0.78, -0.38], [0.78, -0.38], [-0.78, 0.38], [0.78, 0.38]]) b.add(boxB(V(tb[0] + lx - 0.035, 0, tb[2] + lz - 0.035), V(tb[0] + lx + 0.035, TABLE_H - 0.05, tb[2] + lz + 0.035)), wood);
    const chrome = twoTone(new THREE.MeshPhongMaterial({ color: "#c9cdd4", specular: "#ffffff", shininess: 80 }), 0.25);
    b.add(boxB(V(tb[0] - 0.75, TABLE_H, tb[2] - 0.38), V(tb[0] - 0.42, TABLE_H + 0.2, tb[2] - 0.18)), chrome);
    const loaf = new THREE.CapsuleGeometry(0.1, 0.22, 6, 12); loaf.rotateZ(Math.PI / 2); b.add(loaf, lam("loaf", () => ({ color: "#c98a46" })), at(tb[0] + 0.55, TABLE_H + 0.09, tb[2] - 0.25));
    for (let k = 0; k < 4; k++) b.add(cyl(0.13, 0.1, 0.018, 24), lam("plateW", () => ({ color: "#f4f4f2" })), at(tb[0] + 0.62, TABLE_H + 0.01 + k * 0.02, tb[2] + 0.15));
    // ceiling lamp glow pool on the floor (fake light pool, multiply-free: a soft additive decal)
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, depthWrite: false, opacity: 0.35, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(X, 0.012, Z + 0.4); pool.layers.set(NOINK); g.add(pool);
    b.build(g); wb.build(g, false);
    // fallen slices on the floor (butter-down: the dry face up), shown as the pile grows
    const geo = new THREE.BoxGeometry(SLICE_W, SLICE_T, SLICE_W * 1.0);
    this.labPile = new THREE.InstancedMesh(geo, [this.TM.crust, this.TM.crust, this.TM.crumb, this.TM.butter, this.TM.crust, this.TM.crust], 60);
    const r = (i: number, k: number) => { const v = Math.sin(i * 77.7 + k * 13.1) * 43758.5; return v - Math.floor(v); };
    for (let i = 0; i < 60; i++) { // 10 x 6 grid, 0.22 m apart, jittered: slices never overlap
      const gx = (i % 10) - 4.5, gz = Math.floor(i / 10);
      this.m4.compose(V(LAB_TABLE[0] + gx * 0.22 + (r(i, 1) - 0.5) * 0.04, 0.012, LAB_TABLE[2] + 0.7 + gz * 0.22 + (r(i, 2) - 0.5) * 0.04),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (r(i, 3) - 0.5) * 0.9, 0)), V(1, 1, 1));
      this.labPile.setMatrixAt(order60[i], this.m4);
    }
    this.labPile.castShadow = true; this.labPile.receiveShadow = true; g.add(this.labPile);
    // balance scale (shot 8): post, beam, two pans, a slice on each (butter vs plain)
    const sb = new Batch(), brass = twoTone(new THREE.MeshPhongMaterial({ color: "#d9a640", specular: "#fff0b0", shininess: 70 }), 0.25);
    sb.add(cyl(0.12, 0.14, 0.04, 20), brass, at(0, 0.02, 0)); sb.add(cyl(0.015, 0.015, 0.42, 10), brass, at(0, 0.23, 0));
    sb.build(this.scale);
    this.beam = new THREE.Group(); const bb = new Batch();
    bb.add(boxB(V(-0.32, -0.012, -0.012), V(0.32, 0.012, 0.012)), brass);
    for (const s of [-1, 1]) { bb.add(cyl(0.004, 0.004, 0.16, 6), brass, at(s * 0.3, -0.08, 0)); bb.add(cyl(0.12, 0.1, 0.012, 24), brass, at(s * 0.3, -0.16, 0)); }
    bb.build(this.beam); this.beam.position.y = 0.44; this.scale.add(this.beam);
    for (const [s, kind] of [[-1, "butter"], [1, "plain"]] as const) {
      const t = makeToast(this.TM); t.top.material = kind === "butter" ? this.TM.butter : this.TM.crumb;
      t.g.position.set(s * 0.3, -0.145, 0); t.g.scale.setScalar(0.85); this.beam.add(t.g);
    }
    this.scale.position.set(LAB_TABLE[0] + 0.05, TABLE_H, LAB_TABLE[2] - 0.05);
    this.scale.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
    g.add(this.scale);
  }

  // ---------------- classroom (day) ----------------
  private buildClass(kit: Kit) {
    const g = this.sets.class, b = new Batch(), wb = new Batch(), [X, , Z] = CLASS;
    const boards = lam("clBoards", () => ({ map: boardsTex("#c9965a") })), upper = lam("clUpper", () => ({ map: plasterTex("class", "#f1e6c8") }));
    const lower = lam("clLower", () => ({ color: "#7fae8a" })), wood = lam("clWood", () => ({ color: "#b8844e" })), metal = lam("clMetal", () => ({ color: "#5a6170" }));
    wb.add(flat(X - 4.6, X + 4.6, Z - 3.6, Z + 8, 0, 9.2 / 1.2, 11.6 / 1.2), boards);
    const backZ = Z - 3.5;
    wb.add(wallZ(X - 4.6, X + 4.6, 1.0, 3.6, backZ, 1), upper); wb.add(wallZ(X - 4.6, X + 4.6, 0, 1.0, backZ + 0.01, 1), lower);
    wb.add(wallX(Z - 3.6, Z + 8, 1.0, 3.6, X + 4.6, 1, -1), upper); wb.add(wallX(Z - 3.6, Z + 8, 0, 1.0, X + 4.59, 1, -1), lower);
    // left wall: three tall windows (day view) between panels
    const winTex = dayWindowTex();
    for (const zc of [-2.2, -0.1, 2.0]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.6), unlit(winTex, 1.08)); w.position.set(X - 4.62, 1.85, Z + zc); w.rotation.y = Math.PI / 2; w.layers.set(NOINK); g.add(w);
      b.add(boxB(V(X - 4.6, 1.0, Z + zc - 0.8), V(X - 4.45, 1.06, Z + zc + 0.8)), lam("sill", () => ({ color: "#f4f2ec" })));
      b.add(boxB(V(X - 4.6, 1.82, Z + zc - 0.8), V(X - 4.5, 1.88, Z + zc + 0.8)), lam("sill", () => ({ color: "#f4f2ec" })));
    }
    for (const [z0, z1] of [[-3.6, -2.95], [-1.45, -0.85], [0.65, 1.25], [2.75, 8]]) { wb.add(wallX(Z + z0, Z + z1, 1.0, 3.6, X - 4.6, 1, 1), upper); }
    wb.add(wallX(Z - 3.6, Z + 8, 0, 1.0, X - 4.6, 1, 1), lower); wb.add(wallX(Z - 3.6, Z + 8, 2.65, 3.6, X - 4.6, 1, 1), upper);
    // chalkboard + teacher's desk + posters + a clock
    const cb = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.3), lam("chalk", () => ({ map: chalkboardTex() }))); cb.position.set(X, 1.85, backZ + 0.03); g.add(cb);
    b.add(boxB(V(X - 1.85, 1.16, backZ), V(X + 1.85, 1.2, backZ + 0.1)), wood);
    b.add(boxB(V(X + 1.6, 0, backZ + 0.6), V(X + 3.0, 0.78, backZ + 1.3)), wood);
    for (const [k, zc] of [[0, -1.6], [1, 0.6]] as const) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.06), lam("poster" + k, () => ({ map: posterTex(k) }))); p.position.set(X + 4.57, 1.9, Z + zc); p.rotation.y = -Math.PI / 2; g.add(p); }
    b.add(cyl(0.2, 0.2, 0.04, 24), lam("clock", () => ({ color: "#f4f2ec" })), at(X - 2.6, 2.9, backZ + 0.03, Math.PI / 2));
    // two rows of long desks (top 0.75) with chairs behind
    for (const rz of DESK_ROWS) {
      b.add(boxB(V(X - 3.0, 0.72, Z + rz - 0.3), V(X + 3.0, 0.76, Z + rz + 0.3)), wood);
      for (const lx of [-2.9, -1.0, 1.0, 2.9]) for (const lz of [-0.25, 0.25]) b.add(boxB(V(X + lx - 0.03, 0, Z + rz + lz - 0.03), V(X + lx + 0.03, 0.72, Z + rz + lz + 0.03)), metal);
      for (let k = 0; k < 7; k++) {
        const cx = X - 2.4 + k * 0.8, cz = Z + rz - 1.0; // pushed back: the kids stand between desk and chair
        b.add(boxB(V(cx - 0.18, 0.42, cz - 0.18), V(cx + 0.18, 0.46, cz + 0.18)), lam("chairSeat", () => ({ color: "#d8473b" })));
        b.add(boxB(V(cx - 0.18, 0.46, cz - 0.2), V(cx + 0.18, 0.82, cz - 0.16)), lam("chairSeat", () => ({ color: "#d8473b" })));
        for (const [lx, lz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) b.add(boxB(V(cx + lx - 0.015, 0, cz + lz - 0.015), V(cx + lx + 0.015, 0.42, cz + lz + 0.015)), metal);
      }
    }
    // a pot plant by the window
    prop(b, kit, "plant_bushDetailed", X - 4.0, 0, Z + 3.4, 1.0, 0.4);
    b.build(g); wb.build(g, false);
    // slices on the floor (the whole class has been dropping toast): grows through shot 9
    const geo = new THREE.BoxGeometry(SLICE_W, SLICE_T, SLICE_W * 1.0);
    this.classPile = new THREE.InstancedMesh(geo, [this.TM.crust, this.TM.crust, this.TM.crumb, this.TM.butter, this.TM.crust, this.TM.crust], 140);
    const r = (i: number, k: number) => { const v = Math.sin(i * 51.3 + k * 17.9) * 43758.5; return v - Math.floor(v); };
    for (let i = 0; i < 140; i++) { // 14 x 10 grid over the floor, 0.6 m apart, jittered (no overlaps)
      const gx = i % 14, gz = Math.floor(i / 14), up = i % 9 === 4; // a few landed butter-up
      const x = X - 4.0 + gx * 0.6 + (r(i, 1) - 0.5) * 0.3, z = Z - 3.0 + gz * 0.65 + (r(i, 2) - 0.5) * 0.3;
      this.m4.compose(V(x, 0.012, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(up ? Math.PI : 0, r(i, 3) * 6, 0)), V(1, 1, 1));
      this.classPile.setMatrixAt(order140[i], this.m4);
    }
    this.classPile.castShadow = true; this.classPile.receiveShadow = true; g.add(this.classPile);
  }

  // ---------------- street (the giant) ----------------
  private buildStreet(kit: Kit) {
    const g = this.sets.street, [X, , Z] = STREET;
    setSight(streetRays());
    const b = new Batch();
    b.add(flat(X - 120, X + 120, Z - 60, Z + 60, 0, 60, 30), lam("grassHD", () => ({ map: grassHD() })));
    b.add(flat(X - 120, X + 120, Z - 4, Z + 4, 0.01, 60, 2), lam("cobbleHD", () => ({ map: cobbleHD() })));
    b.add(flat(X - 120, X + 120, Z - 6.5, Z - 4, 0.02, 60, 1), lam("pave", () => ({ color: "#b9b2a6" })));
    b.add(flat(X - 120, X + 120, Z + 4, Z + 6.5, 0.02, 60, 1), lam("pave", () => ({ color: "#b9b2a6" })));
    let x = -40, si = 0;
    while (x < 40) { const w = [6.5, 7, 7.5][si % 3], h = [7.6, 8.4, 9.2][(si * 7) % 3]; house(b, X + x + w / 2, Z - 10.5, 0, w, 8, h, si % 8, 0); x += w + 0.2; si++; }
    x = -40; si = 3;
    while (x < 40) { const w = [6.5, 7, 7.5][si % 3], h = [7.6, 8.4, 9.2][(si * 5) % 3]; house(b, X + x + w / 2, Z + 10.5, Math.PI, w, 8, h, si % 8, 0); x += w + 0.2; si++; }
    for (let k = 0; k < 6; k++) prop(b, kit, "lantern", X - 25 + k * 10, 0, Z - 5.2, 3.2, 0);
    for (const [cx, cn] of [[-8, "car:sedan"], [5, "car:hatchback-sports"], [17, "car:van"]] as const) prop(b, kit, cn, X + cx, 0, Z - 3.0, 1.5, Math.PI / 2);
    for (let k = 0; k < 10; k++) prop(b, kit, ["tree_oak", "tree_default", "tree_fat"][k % 3], X - 50 + k * 11, 0, Z - 26 - (k % 3) * 6, 9 + (k % 4) * 2, k);
    b.build(g);
  }

  private shotSun(id: number, s: ShotDef, Lp: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? Lp.az), el = THREE.MathUtils.degToRad(s.sunEl ?? Lp.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private poseSlice(t: Toast, s: Slice) {
    t.g.visible = s.visible;
    t.g.position.set(s.pos[0], s.pos[1] + SLICE_T / 2, s.pos[2]);
    t.g.rotation.set(s.rot, s.yaw, 0);
    t.top.material = s.butter === "B" ? this.TM.B : s.butter === "plain" ? this.TM.crumb : this.TM.butter;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], Lp = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.04; cam.far = 2000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, Lp);
    this.hemi.color.set(Lp.sky); this.hemi.groundColor.set(Lp.ground); this.hemi.intensity = Lp.hemiI;
    this.sun.color.set(Lp.sunCol); this.sun.intensity = Lp.sunI;
    const Rr = s.place === "street" ? 40 : THREE.MathUtils.clamp(dist * 1.3 + 3, 5, 14);
    this.sun.position.copy(focus).addScaledVector(sunDir, 120); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 260; sc.updateProjectionMatrix();
    this.sun.shadow.bias = Lp.bias; this.sun.shadow.normalBias = Lp.normalBias * Math.max(0.3, Rr / 12);
    const applyGlobals = () => {
      TONE.uLitCol.value.set(...Lp.lit); TONE.uShadeCol.value.set(...Lp.shade); TONE.uShadeLift.value.set(...Lp.lift);
      TONE.uLambert.value = Lp.lambert; TONE.uSideK.value = Lp.sideK; TONE.uTerm.value = Lp.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
      CHAR.uCharTint.value.set(...Lp.charTint); CHAR.uCharShade.value = Lp.charShade; CHAR.uGrad.value = Lp.charGrad;
      CHAR.uBodyGrad.value = Lp.bodyGrad; CHAR.uSideTint.value.set(...Lp.sideTint);
    };
    applyGlobals();
    scene.onBeforeRender = applyGlobals; // every render of THIS scene (ink, lens and main passes) uses its own light
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(Lp.fog, this.fog.color); this.fog.near = s.place === "street" ? 60 : 40; this.fog.far = s.place === "street" ? 420 : 400;
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.place === "street";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    this.clouds.forEach((m, i) => {
      m.visible = s.place === "street";
      const a = (i / this.clouds.length) * Math.PI * 2 + 0.3, d = 600 + (i % 3) * 60, w = 150 + (i % 4) * 30;
      m.position.set(cam.position.x + Math.cos(a) * d, 110 + (i % 4) * 30, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    });
    // ---- sets ----
    for (const k of Object.keys(this.sets)) this.sets[k].visible = k === s.place;
    const night = s.light === "night";
    this.kWinDay.visible = !night; this.kWinNight.visible = night;
    this.lampGlow.visible = night; this.bulb.color.setScalar(night ? 3.2 : 0.55);
    const th = s.tableH ?? TABLE_H;
    this.setTableHeight(th);
    this.ladder.visible = id === 15; this.pendant.visible = id !== 15;
    this.plate.visible = s.place === "kitchen" && (id === 1 || id === 2 || id === 17);
    this.plate.position.set(KITCHEN[0] - 0.32, th + 0.01, 0.55); // beside the slice's path (they used to intersect)
    this.labPile.count = s.place === "lab" ? (LAB_PILE[id] ?? 0) : 0;
    this.classPile.count = s.place === "class" ? (CLASS_PILE[id] ?? 0) : 0;
    this.scale.visible = id === 8;
    if (id === 8) this.beam.rotation.z = 0.05 * Math.sin(t * 6) * Math.exp(-Math.max(0, t - 15.2) * 3) * (t < 16.6 ? 1 : 0.2); // wobbles, settles level ("Nope")
    // ---- toast in flight ----
    const drops = DROPS[id] ?? [];
    this.toasts.forEach((tt, i) => {
      if (i < drops.length) this.poseSlice(tt, dropAt(drops[i], t));
      else tt.g.visible = false;
    });
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 2.5 * sc2))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = Lp.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    st.arms.forEach((p, i) => { while (this.arms3.length <= i) this.arms3.push(new Arm3D(this.root)); this.arms3[i].set(p, cam.position); });
    for (let i = st.arms.length; i < this.arms3.length; i++) this.arms3[i].g.visible = false;
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

  /** the table top sits at h; legs (built 0.95 m long below the top) stretch to the floor by scaling the group in y */
  private setTableHeight(h: number) {
    this.table.position.y = h;
    this.table.scale.y = h / TABLE_H;
  }
}
