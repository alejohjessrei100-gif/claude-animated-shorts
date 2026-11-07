// "The Pigeons Who Flew a Bomb" as one three.js scene with six sets far apart: the sea test range (glide bomb + target
// raft), the cut-away nose cone (three pigeon stations, screens, lens, tail fins), Skinner's 1943 lab, the war room, a
// backyard, and the 2024 award stage. Lessons from the toast review are built in: every box is closed underneath, walls
// never cast shadows, nothing pops in, each scene re-applies its own light uniforms before rendering, hands that touch
// things are real 3D arms, and a peck is placed so the beak meets its screen.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, boxGeo, V, lam, Kit, prop, quad } from "./build";
import { ctex, cloudHD, grassHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, ArmPlace } from "./cast";
import { INK } from "./toon";
import { PSU } from "./birds";
import {
  boardsTex, plasterTex, booksTex, shipScreenTex, crossTex, pigeonChalkTex, mapTex, curtainTex, cagesTex, oliveTex, seaTex, bullseyeTex, nightWindowTex, heTex,
} from "./gfx";
import {
  FPS, SHOTS, camAt, ShotDef, RANGE, CONE, LAB, WAR, YARD, STAGE, TABLE_H, LAB_TABLE, TARGET, bombAt, STATION_X, STATION_FLOOR, SCREEN_Z, BIRD_Z, PECK_Y,
  LENS, TRAIN_BOX, TRAIN_SCREEN_X, CONE_ON_BENCH, PODIUM, DAUGHTER, driftAt, tiltAt, BEAT, smooth,
} from "./story";

// ---------------- assets ----------------
const KENNEY = ["tree_oak", "tree_default", "plant_bushLarge", "plant_bushDetailed"];
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KENNEY.map((n) => loader.loadAsync(staticFile(`kenney/nature/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
  }
  return kitP;
};

// ---------------- helpers ----------------
const boxB = (a: THREE.Vector3, b: THREE.Vector3, tile = 0) => boxGeo(a, b, tile, true);
const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u = 1, v = 1) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
const cyl = (r0: number, r1: number, h: number, n = 20) => new THREE.CylinderGeometry(r0, r1, h, n);
const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(s, s, s));
const wallZ = (x0: number, x1: number, y0: number, y1: number, z: number, tile = 1) => quad(V(x0, y0, z), V(x1, y0, z), V(x1, y1, z), V(x0, y1, z), (x1 - x0) / tile, (y1 - y0) / tile);
const wallX = (z0: number, z1: number, y0: number, y1: number, x: number, tile = 1, facing = 1) =>
  facing > 0 ? quad(V(x, y0, z1), V(x, y0, z0), V(x, y1, z0), V(x, y1, z1), (z1 - z0) / tile, (y1 - y0) / tile)
    : quad(V(x, y0, z0), V(x, y0, z1), V(x, y1, z1), V(x, y1, z0), (z1 - z0) / tile, (y1 - y0) / tile);
const unlit = (map: THREE.Texture, k = 1) => new THREE.MeshBasicMaterial({ map, color: new THREE.Color(k, k, k), toneMapped: true });
const glowTex = () => ctex("glow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, "rgba(255,230,170,0.9)"); gr.addColorStop(0.35, "rgba(255,200,120,0.35)"); gr.addColorStop(1, "rgba(255,190,110,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const glow = (g: THREE.Object3D, x: number, y: number, z: number, s: number) => {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set(x, y, z); m.scale.setScalar(s); m.layers.set(NOINK); g.add(m); return m;
};
/** a half shell (left half, x <= 0) of a tube along z: the cut-away hull, seen from its open +x side */
const halfShell = (r: number, z0: number, z1: number, n = 24) => {
  const g = new THREE.BufferGeometry(), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / n, x = r * Math.cos(a), y = r * Math.sin(a);
    pos.push(x, y, z0, x, y, z1); uv.push(i / n * 2, 0, i / n * 2, (z1 - z0) / 0.5);
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};

// card shapes: pigeons (400 x 400 canvas, feet at y 380) and the dog (500 x 400, feet at 380)
export const DSU = 0.0016;
const BIRD_GEO = (() => { const g = new THREE.PlaneGeometry(400 * PSU, 400 * PSU); g.translate(0, (200 - 20) * PSU, 0); return g; })();
const DOG_GEO = (() => { const g = new THREE.PlaneGeometry(500 * DSU, 400 * DSU); g.translate(0, (200 - 20) * DSU, 0); return g; })();

/** the glide bomb (range shots): olive body along z (nose at -z), a lens in the nose, wings, four tail fins */
type Bomb = { g: THREE.Group; fins: THREE.Group[] };
const buildBomb = (): Bomb => {
  const g = new THREE.Group(), b = new Batch();
  const skin = lam("bombSkin", () => ({ map: oliveTex("bomb") })), dark = lam("bombDark", () => ({ color: "#3d4528" }));
  const prof: THREE.Vector2[] = [];
  prof.push(new THREE.Vector2(0.001, -1.6)); // closed tail
  for (let i = 0; i <= 30; i++) { const y = -1.6 + (3.2 * i) / 30; let r = 0.45; if (y > 0.8) r = 0.45 * Math.sqrt(Math.max(0.04, 1 - ((y - 0.8) / 0.85) ** 2)); if (y < -1.1) r = 0.45 - 0.2 * ((-1.1 - y) / 0.5); prof.push(new THREE.Vector2(r, y)); }
  const body = new THREE.LatheGeometry(prof, 28); body.rotateX(-Math.PI / 2); b.add(body, skin);
  b.add(boxB(V(-1.7, -0.05, -0.2), V(1.7, 0.05, 0.45)), dark); // wings
  b.build(g);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.8, 2.2) }));
  lens.position.set(0, 0, -1.62); lens.rotation.y = Math.PI; lens.layers.set(NOINK); g.add(lens);
  const fins: THREE.Group[] = [];
  for (let k = 0; k < 4; k++) {
    const f = new THREE.Group(), fb = new Batch();
    fb.add(boxB(V(-0.03, 0, -0.1), V(0.03, 0.55, 0.32)), dark); fb.build(f);
    f.position.set(0, 0, 1.25); f.rotation.z = (k * Math.PI) / 2; fins.push(f); g.add(f);
  }
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  g.rotation.order = "YXZ";
  return { g, fins };
};

/** a real 3D arm (shoulder -> hand), the hand an ink dot; tool "stamp" puts a rubber stamp in the hand */
class Arm3D {
  g = new THREE.Group(); private geo = new THREE.BufferGeometry(); private mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  private hand: THREE.Mesh; private stamp: THREE.Group;
  constructor(parent: THREE.Object3D) {
    this.geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3)); this.geo.setIndex([0, 1, 2, 0, 2, 3]);
    const rib = new THREE.Mesh(this.geo, this.mat); rib.frustumCulled = false;
    this.hand = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), new THREE.MeshBasicMaterial({ color: INK }));
    this.stamp = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.12, 12), new THREE.MeshBasicMaterial({ color: "#6b4426" }));
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.1), new THREE.MeshBasicMaterial({ color: "#2a2a30" }));
    handle.position.y = 0.0; base.position.y = -0.075; this.stamp.add(handle, base);
    this.g.add(rib, this.hand, this.stamp);
    this.g.traverse((o) => o.layers.set(NOINK)); this.g.visible = false;
    parent.add(this.g);
  }
  set(p: ArmPlace & { tool?: string }, cam: THREE.Vector3) {
    const A = new THREE.Vector3(...p.a), B = new THREE.Vector3(...p.b), mid = A.clone().add(B).multiplyScalar(0.5);
    const w = B.clone().sub(A).cross(cam.clone().sub(mid)).normalize().multiplyScalar(0.0135);
    const pos = this.geo.attributes.position as THREE.BufferAttribute;
    [A.clone().sub(w), A.clone().add(w), B.clone().add(w), B.clone().sub(w)].forEach((v, i) => pos.setXYZ(i, v.x, v.y, v.z));
    pos.needsUpdate = true; this.geo.computeBoundingSphere();
    this.mat.color.set(p.col); this.hand.position.copy(B);
    this.stamp.visible = p.tool === "stamp"; if (this.stamp.visible) this.stamp.position.copy(B);
    this.g.visible = true;
  }
}

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = []; private birds: Actor[] = []; private dogs: Actor[] = [];
  private fxs: Fx[] = []; private arms3: Arm3D[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunCache = new Map<number, THREE.Vector3>();
  private clouds: THREE.Mesh[] = [];
  private cloudMaps: Record<"day" | "golden" | "night", THREE.Texture[]>;
  private sets: Record<string, THREE.Group> = { range: new THREE.Group(), cone: new THREE.Group(), lab: new THREE.Group(), war: new THREE.Group(), yard: new THREE.Group(), stage: new THREE.Group() };
  private bomb!: Bomb;
  private screens: { g: THREE.Group; img: THREE.Texture }[] = [];
  private beam!: THREE.Mesh;
  private coneFins: THREE.Group[] = [];
  private seaTexture!: THREE.Texture;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)), night: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.night.cloud)) };
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }
    for (const k of Object.keys(this.sets)) R.add(this.sets[k]);
    this.buildRange(); this.buildCone(); this.buildLab(); this.buildWar(); this.buildYard(kit); this.buildStage();
  }

  // ---------------- the sea test range ----------------
  private buildRange() {
    const g = this.sets.range, b = new Batch();
    this.seaTexture = seaTex(); this.seaTexture.repeat.set(300, 300);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), lam("sea", () => ({ map: this.seaTexture })));
    sea.rotation.x = -Math.PI / 2; sea.position.set(RANGE[0], 0, RANGE[2]); sea.receiveShadow = true; g.add(sea);
    const [tx, , tz] = TARGET;
    b.add(boxB(V(tx - 4, 0, tz - 4), V(tx + 4, 0.6, tz + 4)), lam("raft", () => ({ color: "#8a5a34" })));
    b.add(flat(tx - 3.6, tx + 3.6, tz - 3.6, tz + 3.6, 0.61), lam("bull", () => ({ map: bullseyeTex() })));
    for (const [dx, dz] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) b.add(cyl(0.5, 0.5, 1.2, 14), lam("buoy", () => ({ color: "#e2453c" })), at(tx + dx, 0.3, tz + dz));
    b.build(g);
    this.bomb = buildBomb(); g.add(this.bomb.g);
  }

  // ---------------- inside the nose cone (cut-away) ----------------
  private buildCone() {
    const g = this.sets.cone, b = new Batch(), [X, , Z] = CONE, AX = 0.35, RAD = 0.62;
    const shellM = twoTone(new THREE.MeshLambertMaterial({ map: oliveTex("inside", "#6d7a48"), side: THREE.DoubleSide }));
    const shell = new THREE.Mesh(halfShell(RAD, -0.85, 1.35), shellM); shell.position.set(X, AX, Z); shell.receiveShadow = true; g.add(shell);
    // a cone-shaped nose ring and the lens at the front
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(RAD, 0.24, 0.3, 28, 1, true, Math.PI, Math.PI), shellM);
    nose.rotation.x = Math.PI / 2; nose.position.set(X, AX, Z - 1.0); g.add(nose);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.17, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.7, 2.1) }));
    lens.position.set(LENS[0], LENS[1], LENS[2]); lens.layers.set(NOINK); g.add(lens);
    b.add(new THREE.TorusGeometry(0.18, 0.025, 8, 28), lam("brass", () => ({ color: "#d9a640" })), at(LENS[0], LENS[1], LENS[2] + 0.005));
    glow(g, LENS[0], LENS[1], LENS[2] + 0.05, 0.9);
    // deck the stations stand on, ribs, and the three padded cradles
    b.add(boxB(V(X - 0.62, STATION_FLOOR - 0.04, Z - 0.8), V(X + 0.62, STATION_FLOOR, Z + 1.3)), lam("deck", () => ({ color: "#4a4f3a" })));
    for (const z of [-0.6, 0.2, 1.0]) b.add(new THREE.TorusGeometry(RAD - 0.01, 0.02, 6, 24, Math.PI), lam("rib", () => ({ color: "#4f5a32" })), at(X, AX, Z + z, 0, 0, Math.PI / 2));
    for (const sx of STATION_X) {
      b.add(boxB(V(X + sx - 0.13, STATION_FLOOR, Z + BIRD_Z + 0.06), V(X + sx + 0.13, STATION_FLOOR + 0.2, Z + BIRD_Z + 0.12)), lam("pad", () => ({ color: "#7a4a2a" }))); // back pad
      b.add(boxB(V(X + sx - 0.14, STATION_FLOOR, Z + BIRD_Z - 0.15), V(X + sx - 0.12, STATION_FLOOR + 0.12, Z + BIRD_Z + 0.12)), lam("pad", () => ({ color: "#7a4a2a" })));
      b.add(boxB(V(X + sx + 0.12, STATION_FLOOR, Z + BIRD_Z - 0.15), V(X + sx + 0.14, STATION_FLOOR + 0.12, Z + BIRD_Z + 0.12)), lam("pad", () => ({ color: "#7a4a2a" })));
      // the screen on a pivot (tilts in the explanation), its frame, the crosshair overlay, and a linkage rod aft
      const sg = new THREE.Group(), img = shipScreenTex().clone(); img.needsUpdate = true; img.wrapS = img.wrapT = THREE.ClampToEdgeWrapping; img.repeat.set(0.6, 0.6);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.19), new THREE.MeshBasicMaterial({ map: img })); scr.layers.set(NOINK);
      const cross = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshBasicMaterial({ map: crossTex(), transparent: true, depthWrite: false })); cross.position.z = 0.004; cross.layers.set(NOINK);
      const frame = new THREE.Mesh(boxB(V(-0.125, -0.11, -0.03), V(0.125, 0.11, -0.004)), lam("scrFrame", () => ({ color: "#2a2f3a" })));
      sg.add(scr, cross, frame); sg.position.set(X + sx, PECK_Y, Z + SCREEN_Z); g.add(sg);
      this.screens.push({ g: sg, img });
      b.add(cyl(0.012, 0.012, 0.35, 8), lam("rod", () => ({ color: "#9aa0a8" })), at(X + sx, PECK_Y - 0.12, Z + SCREEN_Z - 0.18, Math.PI / 2));
      b.add(boxB(V(X + sx - 0.02, STATION_FLOOR, Z + SCREEN_Z - 0.02), V(X + sx + 0.02, PECK_Y - 0.1, Z + SCREEN_Z + 0.02)), lam("rod", () => ({ color: "#9aa0a8" })));
    }
    // tail section + four fins (the explanation pulls back to them)
    for (let k = 0; k < 4; k++) {
      const f = new THREE.Group(), fb = new Batch();
      fb.add(boxB(V(-0.025, 0, -0.08), V(0.025, 0.42, 0.26)), lam("fin", () => ({ color: "#8a9a52" }))); fb.build(f);
      f.position.set(X, AX, Z + 1.5); f.rotation.z = Math.PI / 2 + (k * Math.PI) / 2; this.coneFins.push(f); g.add(f); // past the hull's end, in view
    }
    b.add(cyl(0.012, 0.012, 1.5, 8), lam("rod", () => ({ color: "#9aa0a8" })), at(X, PECK_Y - 0.12, Z + 0.75, Math.PI / 2)); // the linkage to the tail
    b.add(new THREE.ConeGeometry(0.3, 0.35, 20, 1, true), lam("tailCone", () => ({ color: "#6d7a48", side: THREE.DoubleSide })), at(X, AX, Z + 1.5, -Math.PI / 2)); // tail cone the fins sit on
    // the lens's light: a real 3D frustum from the lens to the three screens (additive, no ink), so it reads from any angle
    {
      const L0 = 0.07, y0 = LENS[1], z0 = LENS[2] + 0.02, z1 = Z + SCREEN_Z - 0.01, xs = 0.5, ya = PECK_Y - 0.09, yb = PECK_Y + 0.09;
      const P = [X - L0, y0 - L0, z0, X + L0, y0 - L0, z0, X + L0, y0 + L0, z0, X - L0, y0 + L0, z0,
        X - xs, ya, z1, X + xs, ya, z1, X + xs, yb, z1, X - xs, yb, z1];
      const C = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35];
      const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); bg.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
      bg.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
      this.beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.75, 1.0), vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      this.beam.layers.set(NOINK); this.beam.visible = false; g.add(this.beam);
    }
    // the warhead behind the pilots: olive drab with the yellow bands of a US high-explosive bomb, round end toward the birds
    const olive = lam("warhead", () => ({ color: "#5f6b3a" })), yel = lam("hebands", () => ({ color: "#e0b23a" }));
    b.add(cyl(0.27, 0.27, 0.78, 28), olive, at(X, 0.43, Z + 0.86, Math.PI / 2));
    b.add(new THREE.SphereGeometry(0.27, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), olive, at(X, 0.43, Z + 0.47, -Math.PI / 2));
    for (const dz of [0.6, 0.72]) b.add(cyl(0.276, 0.276, 0.05, 28), yel, at(X, 0.43, Z + dz, Math.PI / 2));
    b.add(boxB(V(X - 0.2, STATION_FLOOR, Z + 0.55), V(X + 0.2, 0.2, Z + 1.15)), lam("rod", () => ({ color: "#9aa0a8" }))); // its cradle
    const he = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.24), new THREE.MeshLambertMaterial({ map: heTex(), transparent: true, depthWrite: false }));
    he.position.set(X, 0.43 + 0.27 + 0.003, Z + 0.95); he.rotation.set(-Math.PI / 2, 0, Math.PI); g.add(he);
    glow(g, X - 0.3, 0.85, Z + 0.1, 1.3); // a small cabin lamp
    b.build(g);
  }

  // ---------------- Skinner's lab (night) ----------------
  private buildLab() {
    const g = this.sets.lab, b = new Batch(), wb = new Batch(), [X, , Z] = LAB;
    const boards = lam("labBoards", () => ({ map: boardsTex("#9a6a40") })), wall = lam("labWall", () => ({ map: plasterTex("lab", "#c9b8a0") }));
    const panel = lam("labPanel", () => ({ color: "#6b4a32" })), wood = lam("labWood", () => ({ color: "#8a5a34" })), metal = lam("labMetal", () => ({ color: "#9aa0a8" }));
    wb.add(flat(X - 4.5, X + 4.5, Z - 3.4, Z + 5, 0, 9 / 1.2, 8.4 / 1.2), boards);
    const backZ = Z - 3.2;
    wb.add(wallZ(X - 4.5, X + 4.5, 0, 3.4, backZ, 1), wall); wb.add(wallZ(X - 4.5, X + 4.5, 0, 0.9, backZ + 0.01, 0.6), panel);
    wb.add(wallX(Z - 3.4, Z + 5, 0, 3.4, X - 4.5, 1, 1), wall); wb.add(wallX(Z - 3.4, Z + 5, 0, 0.9, X - 4.49, 0.6, 1), panel);
    wb.add(wallX(Z - 3.4, Z + 5, 0, 3.4, X + 4.5, 1, -1), wall);
    const cb = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), lam("pchalk", () => ({ map: pigeonChalkTex() }))); cb.position.set(X + 0.4, 1.75, backZ + 0.03); g.add(cb);
    b.add(boxB(V(X - 1.05, 1.02, backZ), V(X + 1.85, 1.06, backZ + 0.08)), wood);
    const cages = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), lam("cages", () => ({ map: cagesTex() }))); cages.position.set(X - 2.85, 1.3, backZ + 0.32); g.add(cages);
    b.add(boxB(V(X - 3.8, 0, backZ + 0.02), V(X - 1.9, 0.4, backZ + 0.4)), wood); b.add(boxB(V(X - 3.8, 2.2, backZ + 0.02), V(X - 1.9, 2.26, backZ + 0.4)), wood);
    const books = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), lam("books", () => ({ map: booksTex() }))); books.position.set(X + 3.2, 1.1, backZ + 0.3); g.add(books);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), unlit(nightWindowTex(), 1.0)); win.position.set(X - 4.48, 1.75, Z - 0.6); win.rotation.y = Math.PI / 2; win.layers.set(NOINK); g.add(win);
    // desk lamp (glows) on a side desk
    b.add(boxB(V(X + 1.6, 0.72, backZ + 0.5), V(X + 3.0, 0.78, backZ + 1.3)), wood);
    for (const [lx, lz] of [[1.65, 0.55], [2.95, 0.55], [1.65, 1.25], [2.95, 1.25]]) b.add(boxB(V(X + lx - 0.03, 0, backZ + lz - 0.03), V(X + lx + 0.03, 0.72, backZ + lz + 0.03)), wood);
    b.add(new THREE.CylinderGeometry(0.06, 0.16, 0.12, 16, 1, true), lam("labGreen", () => ({ color: "#2f6a4a" })), at(X + 2.6, 1.14, backZ + 0.75));
    b.add(cyl(0.02, 0.02, 0.35, 8), metal, at(X + 2.6, 0.95, backZ + 0.75));
    glow(g, X + 2.6, 1.05, backZ + 0.78, 1.4);
    // the bench
    const tb = LAB_TABLE;
    b.add(boxB(V(tb[0] - 0.95, TABLE_H - 0.05, tb[2] - 0.45), V(tb[0] + 0.95, TABLE_H, tb[2] + 0.45)), wood);
    for (const [lx, lz] of [[-0.88, -0.38], [0.88, -0.38], [-0.88, 0.38], [0.88, 0.38]]) b.add(boxB(V(tb[0] + lx - 0.035, 0, tb[2] + lz - 0.035), V(tb[0] + lx + 0.035, TABLE_H - 0.05, tb[2] + lz + 0.035)), wood);
    // training box: open toward +z, a screen on its back wall, a seed hopper + tray beside the screen
    const [bx, by, bz] = TRAIN_BOX, boxW = 0.42, boxD = 0.4, boxH = 0.36;
    b.add(boxB(V(bx - boxW / 2, by, bz - boxD / 2), V(bx + boxW / 2, by + 0.02, bz + boxD / 2)), wood);
    b.add(boxB(V(bx - boxW / 2, by, bz - boxD / 2), V(bx + boxW / 2, by + boxH, bz - boxD / 2 + 0.02)), wood);
    for (const s of [-1, 1]) b.add(boxB(V(bx + s * boxW / 2 - 0.01, by, bz - boxD / 2), V(bx + s * boxW / 2 + 0.01, by + boxH, bz + boxD / 2)), wood);
    b.add(boxB(V(bx - boxW / 2, by + boxH, bz - boxD / 2), V(bx + boxW / 2, by + boxH + 0.02, bz + boxD / 2)), wood);
    // the screen on the left inner wall, facing +x (the bird pecks it in profile, seen from the front)
    const tScr = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.13), new THREE.MeshBasicMaterial({ map: shipScreenTex() }));
    tScr.position.set(TRAIN_SCREEN_X, by + 0.02 + (PECK_Y - STATION_FLOOR) + 0.02, bz - 0.04); tScr.rotation.y = Math.PI / 2; tScr.layers.set(NOINK); g.add(tScr);
    b.add(cyl(0.035, 0.015, 0.09, 12), metal, at(bx - boxW / 2 + 0.05, by + boxH - 0.06, bz + 0.1)); // hopper
    b.add(boxB(V(bx - boxW / 2 + 0.015, by + 0.02, bz + 0.06), V(bx - boxW / 2 + 0.09, by + 0.05, bz + 0.15)), metal); // seed tray
    // the cut-open nose section waiting for its pilots
    const [cx, cy, cz] = CONE_ON_BENCH;
    const miniM = twoTone(new THREE.MeshLambertMaterial({ map: oliveTex("mini", "#7a8a4a"), side: THREE.DoubleSide }));
    const mini = new THREE.Mesh(halfShell(0.24, -0.3, 0.3, 16), miniM); mini.position.set(cx, cy + 0.24, cz); mini.castShadow = true; g.add(mini);
    for (const ez of [-0.3, 0.3]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20, Math.PI / 2, Math.PI), miniM); cap.position.set(cx, cy + 0.24, cz + ez); g.add(cap); }
    b.add(boxB(V(cx - 0.22, cy, cz - 0.3), V(cx + 0.02, cy + 0.015, cz + 0.3)), lam("miniDeck", () => ({ color: "#4a4f3a" })));
    for (const dz of [-0.17, 0, 0.17]) b.add(boxB(V(cx - 0.12, cy, cz + dz - 0.06), V(cx + 0.02, cy + 0.04, cz + dz + 0.06)), lam("pad", () => ({ color: "#7a4a2a" })));
    b.build(g); wb.build(g, false);
  }

  // ---------------- war room (night, green lamps) ----------------
  private buildWar() {
    const g = this.sets.war, b = new Batch(), wb = new Batch(), [X, , Z] = WAR;
    const panel = lam("warPanel", () => ({ map: plasterTex("war", "#3e4a3a") })), floor = lam("warFloor", () => ({ map: boardsTex("#5a3a24") })), wood = lam("warWood", () => ({ color: "#5a3a24" }));
    wb.add(flat(X - 4.5, X + 4.5, Z - 3.4, Z + 5, 0, 9 / 1.2, 8.4 / 1.2), floor);
    wb.add(wallZ(X - 4.5, X + 4.5, 0, 3.4, Z - 3.2, 1), panel);
    wb.add(wallX(Z - 3.4, Z + 5, 0, 3.4, X - 4.5, 1, 1), panel); wb.add(wallX(Z - 3.4, Z + 5, 0, 3.4, X + 4.5, 1, -1), panel);
    const wallMap = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.1), lam("wallMap", () => ({ map: mapTex() }))); wallMap.position.set(X, 1.75, Z - 3.17); g.add(wallMap);
    b.add(boxB(V(X - 1.78, 0.68, Z - 3.18), V(X + 1.78, 0.72, Z - 3.1)), wood);
    // the map table
    b.add(boxB(V(X - 1.3, 0.76, Z - 0.75), V(X + 1.3, 0.82, Z + 0.75)), wood);
    b.add(flat(X - 1.22, X + 1.22, Z - 0.68, Z + 0.68, 0.825), lam("tableMap", () => ({ map: mapTex() })));
    for (const [lx, lz] of [[-1.2, -0.65], [1.2, -0.65], [-1.2, 0.65], [1.2, 0.65]]) b.add(boxB(V(X + lx - 0.05, 0, Z + lz - 0.05), V(X + lx + 0.05, 0.76, Z + lz + 0.05)), wood);
    // a file folder with a photo of a pigeon (the stamp lands on it)
    b.add(boxB(V(X - 0.2, 0.83, Z - 0.1), V(X + 0.2, 0.835, Z + 0.18)), lam("folder", () => ({ color: "#d9b46a" })));
    // green-shaded lamps hanging over the table
    for (const lx of [-0.65, 0.65]) {
      b.add(cyl(0.008, 0.008, 1.3, 6), lam("cord", () => ({ color: "#2a2a30" })), at(X + lx, 2.75, Z));
      b.add(new THREE.ConeGeometry(0.3, 0.18, 20, 1, true), lam("warShade", () => ({ color: "#2f6a4a" })), at(X + lx, 2.05, Z));
      glow(g, X + lx, 1.95, Z, 1.9);
    }
    b.build(g); wb.build(g, false);
  }

  // ---------------- backyard (day) ----------------
  private buildYard(kit: Kit) {
    const g = this.sets.yard, b = new Batch(), [X, , Z] = YARD;
    b.add(flat(X - 30, X + 30, Z - 30, Z + 30, 0, 30, 30), lam("grassHD", () => ({ map: grassHD() })));
    const fence = lam("fence", () => ({ color: "#e8dcc4" }));
    for (let x = -6; x <= 6; x += 0.45) b.add(boxB(V(X + x - 0.06, 0, Z - 2.6), V(X + x + 0.06, 1.2, Z - 2.55)), fence);
    for (const y of [0.35, 0.95]) b.add(boxB(V(X - 6.1, y, Z - 2.66), V(X + 6.1, y + 0.08, Z - 2.62)), fence);
    // doghouse
    const red = lam("dogRed", () => ({ color: "#c84a3a" })), roof = lam("dogRoof", () => ({ color: "#5a3a24" }));
    b.add(boxB(V(X + 1.3, 0, Z - 1.6), V(X + 2.3, 0.75, Z - 0.8)), red);
    for (const s of [-1, 1]) { const [a1, c1, d1, e1] = [V(X + 1.2, 0.75, Z - 1.7), V(X + 2.4, 0.75, Z - 1.7), V(X + 2.4, 1.2, Z - 1.2), V(X + 1.2, 1.2, Z - 1.2)]; if (s < 0) b.add(quad(a1, c1, d1, e1), roof); else b.add(quad(V(X + 2.4, 0.75, Z - 0.7), V(X + 1.2, 0.75, Z - 0.7), V(X + 1.2, 1.2, Z - 1.2), V(X + 2.4, 1.2, Z - 1.2)), roof); }
    b.add(boxB(V(X + 1.6, 0, Z - 0.81), V(X + 2.0, 0.5, Z - 0.79)), lam("doorHole", () => ({ color: "#2a1f1a" })));
    b.add(cyl(0.12, 0.1, 0.05, 18), lam("bowl", () => ({ color: "#3f8fd0" })), at(X + 1.0, 0.025, Z - 0.3));
    prop(b, kit, "tree_oak", X - 2.6, 0, Z - 4.2, 6.5, 0.3); prop(b, kit, "plant_bushLarge", X - 3.6, 0, Z - 2.9, 1.3, 0.4); prop(b, kit, "plant_bushDetailed", X + 3.4, 0, Z - 2.9, 1.1, 1.2);
    b.build(g);
  }

  // ---------------- 2024 award stage ----------------
  private buildStage() {
    const g = this.sets.stage, b = new Batch(), wb = new Batch(), [X, , Z] = STAGE, H = 0.6;
    wb.add(flat(X - 8, X + 8, Z - 4, Z + 8, 0, 8, 6), lam("hall", () => ({ color: "#2a2230" })));
    b.add(boxB(V(X - 3.2, 0, Z - 1.6), V(X + 3.2, H, Z + 1.2)), lam("stageWood", () => ({ map: boardsTex("#7a4a2a") })));
    const ct = curtainTex(); ct.repeat.set(3, 1);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 4.2), lam("curtain", () => ({ map: ct }))); back.position.set(X, H + 2.1, Z - 1.55); back.receiveShadow = true; g.add(back);
    for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4.2), lam("curtain", () => ({ map: ct }))); side.position.set(X + s * 3.1, H + 2.1, Z - 0.4); side.rotation.y = -s * 0.5; g.add(side); }
    const [px, py, pz] = PODIUM;
    b.add(boxB(V(px - 0.35, py, pz - 0.25), V(px + 0.35, py + 1.1, pz + 0.25)), lam("podium", () => ({ color: "#4a2c18" })));
    b.add(boxB(V(px - 0.4, py + 1.1, pz - 0.3), V(px + 0.4, py + 1.14, pz + 0.3)), lam("podiumTop", () => ({ color: "#6b4426" })));
    b.add(cyl(0.008, 0.008, 0.3, 6), lam("mic", () => ({ color: "#2a2a30" })), at(px + 0.1, py + 1.28, pz + 0.12, 0.5));
    // spotlight: a soft additive cone from above onto the daughter, and its pool on the stage
    const [dx, , dz] = DAUGHTER;
    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.5, 32, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.5, 0.38), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.set(dx, H + 2.25, dz); beam.layers.set(NOINK); g.add(beam);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, depthWrite: false, opacity: 0.6, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(dx, H + 0.012, dz); pool.layers.set(NOINK); g.add(pool);
    // audience silhouettes in the front rows
    const sil = lam("audience", () => ({ color: "#1a1622" }));
    for (let row = 0; row < 2; row++) for (let k = 0; k < 9; k++) {
      const x = X - 3.2 + k * 0.8 + (row ? 0.4 : 0), z = Z + 2.4 + row * 0.9;
      b.add(new THREE.SphereGeometry(0.17, 14, 10), sil, at(x, 1.05 + row * 0.05, z));
      b.add(boxB(V(x - 0.24, 0, z - 0.14), V(x + 0.24, 0.9 + row * 0.05, z + 0.14)), sil);
    }
    b.build(g); wb.build(g, false);
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
  private pick(pool: Actor[], i: number, geo?: THREE.BufferGeometry) { while (pool.length <= i) pool.push(new Actor(this.root, geo)); return pool[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], Lp = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = s.place === "cone" ? 0.02 : 0.04; cam.far = 3000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, Lp);
    this.hemi.color.set(Lp.sky); this.hemi.groundColor.set(Lp.ground); this.hemi.intensity = Lp.hemiI;
    this.sun.color.set(Lp.sunCol); this.sun.intensity = Lp.sunI;
    const Rr = s.place === "range" ? 30 : THREE.MathUtils.clamp(dist * 1.3 + 2, 2.5, 14);
    this.sun.position.copy(focus).addScaledVector(sunDir, 120); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 260; sc.updateProjectionMatrix();
    this.sun.shadow.bias = Lp.bias; this.sun.shadow.normalBias = Lp.normalBias * Math.max(0.2, Rr / 12);
    const applyGlobals = () => {
      TONE.uLitCol.value.set(...Lp.lit); TONE.uShadeCol.value.set(...Lp.shade); TONE.uShadeLift.value.set(...Lp.lift);
      TONE.uLambert.value = Lp.lambert; TONE.uSideK.value = Lp.sideK; TONE.uTerm.value = Lp.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
      CHAR.uCharTint.value.set(...Lp.charTint); CHAR.uCharShade.value = Lp.charShade; CHAR.uGrad.value = Lp.charGrad;
      CHAR.uBodyGrad.value = Lp.bodyGrad; CHAR.uSideTint.value.set(...Lp.sideTint);
    };
    applyGlobals();
    scene.onBeforeRender = applyGlobals; // each scene renders with its own light (crossfades)
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(Lp.fog, this.fog.color);
    const outdoor = s.place === "range" || s.place === "yard";
    this.fog.near = outdoor ? 80 : 40; this.fog.far = s.place === "range" ? 900 : 400;
    scene.fog = this.fog; scene.background = null;
    this.clouds.forEach((m, i) => {
      m.visible = outdoor;
      const a = (i / this.clouds.length) * Math.PI * 2 + 0.3, d = 650 + (i % 3) * 60, w = 160 + (i % 4) * 30;
      m.position.set(cam.position.x + Math.cos(a) * d, 90 + (i % 4) * 35, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    });
    for (const k of Object.keys(this.sets)) this.sets[k].visible = k === s.place;
    // ---- dynamic pieces ----
    if (s.place === "range") {
      const bs = bombAt(t);
      this.bomb.g.position.set(...bs.pos); this.bomb.g.rotation.set(bs.pitch, bs.yaw ?? 0, bs.roll);
      this.bomb.fins.forEach((fn, k) => { fn.rotation.x = k % 2 ? bs.fin : -bs.fin; });
      this.seaTexture.offset.set(0, (t * 0.002) % 1);
    }
    if (s.place === "cone") {
      const dr = driftAt(id, t), tl = tiltAt(id, t);
      this.screens.forEach((sc2, k) => {
        sc2.img.offset.set(0.2 + (k === 1 ? dr : dr * 0.6), 0.2 + (k === 1 ? dr * 0.5 : 0));
        sc2.g.rotation.x = -tl; sc2.g.rotation.y = k === 1 ? tl * 0.6 : 0;
      });
      this.coneFins.forEach((fn, k) => { fn.rotation.x = (k % 2 ? 1 : -1) * tl * 1.6; });
      const bk = id === 12 ? smooth((t - BEAT.lens) / 0.4) : 0;
      this.beam.visible = bk > 0.01; (this.beam.material as THREE.MeshBasicMaterial).opacity = 0.42 * bk;
    }
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right, sun: sunDir });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const counts = { body: 0, bird: 0, dog: 0 };
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1, kind = (p.geo as "bird" | "dog" | undefined) ?? "body";
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + (kind === "body" ? 1.1 : 0.2) * sc2, p.z), (kind === "body" ? 2.5 : 0.6) * sc2))) continue;
      const a = kind === "bird" ? this.pick(this.birds, counts.bird++, BIRD_GEO) : kind === "dog" ? this.pick(this.dogs, counts.dog++, DOG_GEO) : this.pick(this.actors, counts.body++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.order = "YXZ"; a.mesh.rotation.set(p.pitch ?? 0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = Lp.actorShadow;
      used.push(a);
    }
    for (let i = counts.body; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    for (let i = counts.bird; i < this.birds.length; i++) this.birds[i].mesh.visible = false;
    for (let i = counts.dog; i < this.dogs.length; i++) this.dogs[i].mesh.visible = false;
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
}
