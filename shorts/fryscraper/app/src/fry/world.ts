// The whole film as one three.js scene with four sets far apart: the City street under the Walkie-Talkie tower
// (origin), a park lawn (PARK), the architect's studio (STUDIO) and the Las Vegas pool (VEGAS). update(id, f, cam)
// poses everything for shot `id` at frame f (a pure function of id + f): sky, camera-relative frozen sun, the beam and
// its hot spot, the rays of the explanation, the tower's fins, the Jaguar, the cast cards and the effect cards.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Batch, boxGeo, V, lam, Kit, Ray, kitClone, prop, setSight, inTheWay, quad, roofMat } from "./build";
import { rep, ctex, stoneHD, cobbleHD, grassHD, cloudHD, facadeHD, rng, brick } from "./paint";
import { Pen, fxGlow, fxSpoon } from "./toon";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, parkStage, Stage } from "./cast";
import {
  FPS, SHOTS, V3, ShotDef, camAt, TOWER, faceZ, faceW, FACE_DEPTH, CAR, PARK, STUDIO, VEGAS, STALL, LEAF, BEAT, spotAt, carX, meltAt, R, clamp01, smooth,
} from "./story";
import { asset } from "./assets";

// ---------------- assets ----------------
export const KENNEY = ["car/taxi", "car/van", "car/delivery", "car/sedan", "car/suv", "car/hatchback-sports", "car/police", "car/cone",
  "mod/building-sample-tower-a", "mod/building-sample-tower-b", "mod/building-sample-tower-c", "mod/building-sample-tower-d",
  "town/lantern", "town/stall-red", "town/stall-green", "town/stall-bench", "nat/tree_palmTall", "nat/tree_palmDetailedTall", "nat/tree_palm",
  "nat/plant_bushLarge", "nat/flower_redA", "nat/flower_yellowA"];
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KENNEY.map((n) => loader.loadAsync(asset(`fry/kenney/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
  }
  return kitP;
};

// ---------------- painted textures ----------------
const asphalt = () => ctex("asphaltHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#6c6a72"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { const v = 90 + r() * 40; g.fillStyle = `rgba(${v},${v - 4},${v + 6},0.35)`; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
  for (let i = 0; i < 18; i++) { g.fillStyle = "rgba(40,36,48,0.08)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 40 + r() * 90, 20 + r() * 50, r() * 3, 0, 7); g.fill(); }
});
/** road markings strip: dashed centre line + the yellow double lines by both kerbs; u along x (8 m), v across (10 m) */
const roadTex = () => ctex("roadHD", 1024, 1280, (g, r) => {
  g.drawImage(asphalt().image as CanvasImageSource, 0, 0, 1024, 1280);
  const m = 128; // px per metre
  g.fillStyle = "#f3efe2"; for (let x = 0; x < 1024; x += 4 * m) g.fillRect(x + 0.5 * m, 5 * m - 6, 2.5 * m, 12); // dashed centre
  g.fillStyle = "#e8b43a"; for (const y of [0.3, 0.45, 9.55, 9.7]) g.fillRect(0, y * m - 5, 1024, 10);
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(r() * 1024, r() * 1280, 30, 2); }
});
const slabs = () => ctex("slabHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#cbc3b4"; g.fillRect(0, 0, 1024, 1024);
  const s = 1024 / 6; // 6 slabs of 0.6 m per 3.6 m tile
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
    const v = 196 + Math.floor(r() * 20); g.fillStyle = `rgb(${v},${v - 6},${v - 18})`; g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
  }
  g.strokeStyle = "rgba(90,80,70,0.55)"; g.lineWidth = 4;
  for (let i = 0; i <= 6; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 1024); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(1024, i * s); g.stroke(); }
});
/** the tower's curtain wall: 6 m wide x full height; 37 floors of glass with white slab bands, mullions every 1.5 m */
const glassTex = () => ctex("glassHD", 512, 2048, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 2048);
  gr.addColorStop(0, "#9fc2c0"); gr.addColorStop(0.35, "#6f9fa6"); gr.addColorStop(0.7, "#4f7f8e"); gr.addColorStop(1, "#3f6a7c");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 2048);
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,255,255,${0.05 + 0.08 * r()})`; g.beginPath(); g.ellipse(r() * 512, r() * 2048, 60 + r() * 120, 30 + r() * 80, 0.4, 0, 7); g.fill(); }
  const fl = 2048 / 37;
  for (let k = 0; k < 37; k++) { g.fillStyle = "#eef1f2"; g.fillRect(0, k * fl, 512, 11); g.fillStyle = "rgba(40,60,90,0.25)"; g.fillRect(0, k * fl + 7, 512, 3); }
  for (let x = 0; x < 512; x += 128) { g.fillStyle = "#dfe6e8"; g.fillRect(x, 0, 9, 2048); }
  for (let i = 0; i < 60; i++) { g.fillStyle = "rgba(255,255,255,0.35)"; const x = Math.floor(r() * 4) * 128 + 12, y = Math.floor(r() * 37) * fl + 14; g.fillRect(x, y, 22, fl - 20); }
});
const sandTex = () => ctex("sandHD", 512, 512, (g, r) => {
  g.fillStyle = "#e5c79a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,240,210,0.35)" : "rgba(170,120,80,0.18)"; g.fillRect(r() * 512, r() * 512, 3, 3); }
});
const tileTex = () => ctex("poolDeck", 512, 512, (g) => {
  g.fillStyle = "#efe6d6"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(150,130,110,0.5)"; g.lineWidth = 3;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); }
});
const poolTex = () => ctex("poolWater", 512, 512, (g, r) => {
  g.fillStyle = "#3fb6e0"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(220,250,255,0.55)"; g.lineWidth = 5;
  for (let i = 0; i < 30; i++) { const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 20, y - 14, x + 40, y + 14, x + 70, y); g.stroke(); }
});
const deskTex = () => ctex("studioWall", 512, 512, (g) => { g.fillStyle = "#e8e0d2"; g.fillRect(0, 0, 512, 512); g.fillStyle = "rgba(0,0,0,0.05)"; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 2, 512); });
const blueprintTex = () => ctex("blueprint", 512, 380, (g) => {
  g.fillStyle = "#2f5f9a"; g.fillRect(0, 0, 512, 380);
  g.strokeStyle = "#dfeaff"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(150, 340); g.bezierCurveTo(140, 200, 120, 90, 90, 40); g.lineTo(420, 40); g.bezierCurveTo(390, 90, 370, 200, 360, 340); g.closePath(); g.stroke();
  for (let y = 70; y < 340; y += 22) { g.beginPath(); g.moveTo(130 - (340 - y) * 0.1, y); g.lineTo(380 + (340 - y) * 0.1, y); g.lineWidth = 1.5; g.stroke(); }
});
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
const glowTex = () => ctex("glowSpot", 256, 256, (g) => fxGlow(new Pen(g)));
const shaftTex = () => ctex("shaft", 64, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
});

/** per-shot sun (camera-relative az/el in degrees); the tower shots keep the sun behind the lens so the concave face is lit */
const SUN_SHOT: Record<number, { az?: number; el?: number }> = {
  1: { az: 120, el: 40 }, 2: { az: 150, el: 35 }, 3: { az: 160, el: 38 }, 11: { az: 150, el: 45 }, 12: { az: 150, el: 45 },
  13: { az: 90, el: 35 }, 15: { az: 165, el: 40 }, 17: { az: 140, el: 32 }, 18: { az: 60, el: 30 }, 19: { az: 155, el: 18 },
};

// ---------------- geometry helpers ----------------
/** a grid surface P(u, v), u, v in 0..1, with smooth normals; uv scaled by (su, sv) */
const surface = (nu: number, nv: number, P: (u: number, v: number) => THREE.Vector3, su = 1, sv = 1, flip = false) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const p = P(i / nu, j / nv); pos.push(p.x, p.y, p.z); uv.push((i / nu) * su, (j / nv) * sv);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
/** rounded box (unit radii per axis in metres), centred, smooth normals */
const roundBox = (w: number, h: number, d: number, r: number, seg = 10) => {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
  const half = [w / 2, h / 2, d / 2], v = new THREE.Vector3(), q = [0, 0, 0], e = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    for (let a = 0; a < 3; a++) { const c = v.getComponent(a), lim = half[a] - r; q[a] = THREE.MathUtils.clamp(c, -lim, lim); e.setComponent(a, c - q[a]); }
    const L = e.length();
    if (L < 1e-6) continue;
    e.divideScalar(L);
    p.setXYZ(i, q[0] + e.x * r, q[1] + e.y * r, q[2] + e.z * r); n.setXYZ(i, e.x, e.y, e.z);
  }
  return g;
};
const M4 = (x: number, y: number, z: number, ry = 0, s: V3 = [1, 1, 1]) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(...s));

// ---------------- the tower ----------------
/** south face point at (u across 0..1 west->east, v up 0..1) */
const southPt = (u: number, v: number, inset = 0) => {
  const y = v * TOWER.H, w = faceW(y), x = TOWER.x + (u * 2 - 1) * w, k = (u * 2 - 1);
  return V(x, y, TOWER.z + 44 + faceZ(y) - FACE_DEPTH * (1 - k * k) - inset);
};
const northZ = (y: number) => TOWER.z + 44 + faceZ(y) - 36 - 4 * Math.pow(clamp01(y / TOWER.H), 1.2);
const northPt = (u: number, v: number) => {
  const y = v * TOWER.H, w = faceW(y) * 0.98, x = TOWER.x + (u * 2 - 1) * w, k = (u * 2 - 1);
  return V(x, y, northZ(y) - 4 * (1 - k * k));
};
/** the beam source on the face: where the reflection is focused from (mid face, lower third) */
export const FOCUS_SRC: V3 = [TOWER.x, 52, TOWER.z + 44 + faceZ(52) - FACE_DEPTH + 1];

const buildTower = (b: Batch, scale = 1, at: V3 = [0, 0, 0], crown = true) => {
  const glass = lam("towerGlass", () => ({ map: rep(glassTex(), 1, 1) }));
  const roof = lam("towerRoof", () => ({ color: "#d9e6ef" }));
  const core = lam("towerCore", () => ({ map: stoneHD("towerBase", ["#c7c2b8", "#bdb8ae", "#cfcac0", "#b6b0a6"], "#8f8a82") }));
  // points are built in world space; the desk model is moved from the tower's footprint centre to `at`
  const m = scale === 1 ? new THREE.Matrix4() : new THREE.Matrix4().compose(V(...at), new THREE.Quaternion(), V(scale, scale, scale)).multiply(new THREE.Matrix4().makeTranslation(-TOWER.x, 0, -(faceZ(0) - 18)));
  const S = (P: (u: number, v: number) => THREE.Vector3, su: number, flip = false) => surface(24, 40, P, su, 1, flip);
  const width0 = faceW(0) * 2;
  b.add(S((u, v) => southPt(u, v), width0 / 6), glass, m);
  b.add(S((u, v) => northPt(1 - u, v), width0 / 6), glass, m);
  // sides: from the south face edge to the north face edge
  for (const side of [0, 1]) b.add(surface(8, 40, (u, v) => { const a = southPt(side, v), c = northPt(side, v); return side ? c.lerp(a, u) : a.lerp(c, u); }, 6, 1), glass, m);
  // sloping glass crown (sky garden): from the south roof edge up to a higher north edge
  const top = (u: number, w: number) => { const s = southPt(u, 1), n = northPt(u, 1); return s.lerp(n, w).add(V(0, crown ? 9 * w : 0, 0)); };
  b.add(surface(16, 6, (u, w) => top(u, w), 6, 1, true), crown ? glass : roof, m);
  // crown side gables
  for (const side of [0, 1]) for (let k = 0; k < 6; k++) {
    const a = top(side, k / 6), c = top(side, (k + 1) / 6), a0 = a.clone().setY(TOWER.H), c0 = c.clone().setY(TOWER.H);
    b.add(side ? quad(a0, c0, c, a) : quad(c0, a0, a, c), glass, m);
  }
  // stone base + entrance canopy
  b.add(boxGeo(V(TOWER.x - 22, 0, TOWER.z + 44 + faceZ(0) - 34), V(TOWER.x + 22, 4.2, TOWER.z + 44 + faceZ(0) + 0.6), 3), core, m);
  b.add(boxGeo(V(TOWER.x - 8, 4.0, TOWER.z + 44 + faceZ(0)), V(TOWER.x + 8, 4.4, TOWER.z + 44 + faceZ(0) + 4), 0, true), roof, m);
};
/** horizontal fins (the permanent fix) over the whole south face: one ribbon per two floors, 1.2 m deep */
const buildFins = (parent: THREE.Object3D) => {
  const b = new Batch(), mat = lam("fins", () => ({ color: "#c8ccd4" }));
  for (let k = 2; k < TOWER.floors; k += 1) {
    const v = k / TOWER.floors;
    b.add(surface(30, 1, (u, w) => { const p = southPt(u, v), dz = 0.3 + 1.2 * w; return p.add(V(0, -0.15 * w, dz)); }, 1, 1), mat);
  }
  const g = new THREE.Group(); b.build(g); parent.add(g); return g;
};
/** tower crane on the roof (the tower was still being finished in 2013) */
const buildCrane = (parent: THREE.Object3D) => {
  const b = new Batch(), y0 = TOWER.H + 4, x = TOWER.x + 12, z = TOWER.z + 6, mat = lam("crane", () => ({ color: "#f0b43c" })), dark = lam("craneDark", () => ({ color: "#4a4a56" }));
  b.add(boxGeo(V(x - 1, y0 - 10, z - 1), V(x + 1, y0 + 26, z + 1)), mat);
  b.add(boxGeo(V(x - 40, y0 + 24, z - 0.7), V(x + 14, y0 + 26, z + 0.7)), mat);
  b.add(boxGeo(V(x + 6, y0 + 18, z - 1.5), V(x + 14, y0 + 23.8, z + 1.5)), dark);
  b.add(boxGeo(V(x - 2, y0 + 22, z - 1.6), V(x + 2, y0 + 25, z + 1.6)), dark);
  b.add(boxGeo(V(x - 30.1, y0 + 4, z - 0.06), V(x - 29.9, y0 + 24, z + 0.06)), dark);
  const g = new THREE.Group(); b.build(g); parent.add(g); return g;
};

// ---------------- city blocks ----------------
const BLOCK_STYLES = [
  { wall: "#d8c7a6", shutter: "#3b3f52" }, { wall: "#c47a5c", shutter: "#2f5f6a", brick: true }, { wall: "#e2d6bc", shutter: "#2f3f63" },
  { wall: "#b9a48a", shutter: "#3b3f52" }, { wall: "#d9b47a", shutter: "#5a3b2a" }, { wall: "#cfc8bb", shutter: "#2f5f6a" },
];
/** flat-roofed City office block: front facade on local +z, w x d x h, cornice + parapet */
const block = (b: Batch, x: number, z: number, yaw: number, w: number, d: number, h: number, si: number) => {
  const across = Math.abs(Math.sin(yaw)) > 0.5, hx = (across ? d : w) / 2 + 0.5, hz = (across ? w : d) / 2 + 0.5;
  if (inTheWay(x - hx, x + hx, 0, h + 1.5, z - hz, z + hz)) return;
  const st = BLOCK_STYLES[si % BLOCK_STYLES.length], hw = w / 2, hd = d / 2;
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0, z);
  const front = lam(`bf${si}_${w}_${h}`, () => ({ map: facadeHD(`bf${si}_${w}_${h}`, w, h, { ...st, door: true }) }));
  const side = lam(`bs${si}_${d}_${h}`, () => ({ map: facadeHD(`bs${si}_${d}_${h}`, d, h, st) }));
  b.add(quad(V(-hw, 0, hd), V(hw, 0, hd), V(hw, h, hd), V(-hw, h, hd)), front, m);
  b.add(quad(V(hw, 0, -hd), V(-hw, 0, -hd), V(-hw, h, -hd), V(hw, h, -hd)), front, m);
  b.add(quad(V(-hw, 0, -hd), V(-hw, 0, hd), V(-hw, h, hd), V(-hw, h, -hd)), side, m);
  b.add(quad(V(hw, 0, hd), V(hw, 0, -hd), V(hw, h, -hd), V(hw, h, hd)), side, m);
  const trim = lam("blockTrim", () => ({ color: "#efe6d2" })), roofM = lam("flatRoof", () => ({ color: "#8f8a94" }));
  b.add(boxGeo(V(-hw, h - 0.05, -hd), V(hw, h + 0.05, hd)), roofM, m);
  b.add(boxGeo(V(-hw - 0.25, h - 0.9, -hd - 0.25), V(hw + 0.25, h - 0.55, hd + 0.25), 0, true), trim, m);
  for (const [x0, x1, z0, z1] of [[-hw, hw, hd - 0.3, hd], [-hw, hw, -hd, -hd + 0.3], [-hw, -hw + 0.3, -hd, hd], [hw - 0.3, hw, -hd, hd]])
    b.add(boxGeo(V(x0, h, z0), V(x1, h + 1.0, z1)), trim, m);
  b.add(boxGeo(V(-hw - 0.05, 0, hd - 0.02), V(hw + 0.05, 3.6, hd + 0.08)), lam("shopfront", () => ({ color: si % 2 ? "#2f3f63" : "#3b3f52" })), m);
  b.add(boxGeo(V(-hw * 0.8, 0.3, hd + 0.08), V(hw * 0.8, 3.2, hd + 0.1)), lam("shopGlass", () => ({ color: "#9fc4e2" })), m);
};

const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    if (s.set !== "city") continue;
    for (let f = s.a - 8; f < s.b + 8; f += 2) {
      const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
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

// ---------------- the Jaguar (our own long, low saloon) ----------------
export const CAR_BODY = "#5b1d2c";
type CarParts = { root: THREE.Group; mirrorN: THREE.Object3D; badge: THREE.Object3D };
const buildCar = (): CarParts => {
  const root = new THREE.Group();
  const paint = twoTone(new THREE.MeshPhongMaterial({ color: CAR_BODY, specular: "#ffffff", shininess: 70 }), 0.6);
  const glass = twoTone(new THREE.MeshPhongMaterial({ color: "#2f3f5a", specular: "#cfe0ff", shininess: 90 }), 0.6);
  const chrome = twoTone(new THREE.MeshPhongMaterial({ color: "#c9ced8", specular: "#ffffff", shininess: 90 }), 0.6);
  const tyre = lam("tyre", () => ({ color: "#2b2a33" })), lightM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3) });
  const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; root.add(o); return o; };
  add(roundBox(5.0, 0.62, 1.86, 0.22), paint, 0, 0.62, 0);                // lower body
  add(roundBox(1.9, 0.18, 1.8, 0.09), paint, 1.45, 0.86, 0);              // bonnet crown
  add(roundBox(2.5, 0.56, 1.62, 0.26), glass, -0.25, 1.15, 0);             // glasshouse
  add(roundBox(2.3, 0.12, 1.6, 0.06), paint, -0.25, 1.42, 0);              // roof
  for (const s of [-1, 1]) add(roundBox(0.12, 0.5, 0.08, 0.03), paint, 0.95, 1.12, s * 0.79); // A pillars
  for (const [x, z] of [[1.6, 0.86], [1.6, -0.86], [-1.6, 0.86], [-1.6, -0.86]]) {
    const w = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 20); w.rotateX(Math.PI / 2);
    add(w, tyre, x, 0.36, z);
    const h = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 16); h.rotateX(Math.PI / 2);
    add(h, chrome, x, 0.36, z * 1.01);
  }
  for (const s of [-1, 1]) add(roundBox(0.06, 0.12, 0.34, 0.03), lightM, 2.5, 0.72, s * 0.62);       // headlights
  for (const s of [-1, 1]) add(roundBox(0.06, 0.12, 0.34, 0.03), new THREE.MeshBasicMaterial({ color: "#c0353a" }), -2.5, 0.75, s * 0.62);
  add(roundBox(0.05, 0.22, 0.9, 0.04), chrome, 2.52, 0.55, 0);              // grille
  const mirrorN = add(roundBox(0.24, 0.13, 0.12, 0.05), paint, 1.0, 1.0, 0.98);
  add(roundBox(0.24, 0.13, 0.12, 0.05), paint, 1.0, 1.0, -0.98);
  const bd = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16); bd.rotateZ(Math.PI / 2 - 0.35);
  const badge = add(bd, chrome, 2.2, 0.99, 0);
  return { root, mirrorN, badge };
};

/** the water of the pool (simple animated painted texture) */
type Sets = { city: THREE.Group; park: THREE.Group; studio: THREE.Group; vegas: THREE.Group };

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
  private sets: Sets;
  private car: CarParts;
  private fins: THREE.Group; private crane: THREE.Group;
  private spot: THREE.Mesh; private shaft: THREE.Mesh; private glare: THREE.Sprite; private spotSmall: THREE.Mesh;
  private rays: THREE.Mesh[] = [];
  private spoon: THREE.Mesh;
  private lensCone: THREE.Mesh; private magnifier: THREE.Group;
  private poolTex: THREE.Texture;
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R0 = this.root;
    // ---- sky + light (as in the bridge short) ----
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
    R0.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R0.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    R0.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); this.clouds.push(m); R0.add(m);
    }
    this.sets = { city: new THREE.Group(), park: new THREE.Group(), studio: new THREE.Group(), vegas: new THREE.Group() };
    for (const g of Object.values(this.sets)) R0.add(g);

    // ---- CITY ----
    const C = this.sets.city;
    setSight(sightLines());
    const b = new Batch();
    const road = lam("road", () => ({ map: roadTex() })), slab = lam("slab", () => ({ map: rep(slabs(), 1, 1) }));
    const kerb = lam("kerb", () => ({ map: stoneHD("kerbHD", ["#d6d0c4", "#cdc6b8", "#ddd6ca", "#c4bcae"], "#9a9288") }));
    b.add(quadUpG(-260, 260, -5, 5, 520 / 8, 1), road);
    b.add(quadUpG(-260, 260, 5.15, 60, 520 / 3.6, 54.85 / 3.6, 0.15), slab);
    b.add(quadUpG(-260, 260, -60, -5.15, 520 / 3.6, 54.85 / 3.6, 0.15), slab);
    b.add(quadUpG(-600, 600, -600, -60, 60, 27, 0.05), lam("cityFar", () => ({ color: "#a9a3a0" })));
    b.add(quadUpG(-600, 600, 60, 600, 60, 27, 0.05), lam("cityFar", () => ({ color: "#a9a3a0" })));
    for (const s of [-1, 1]) b.add(boxGeo(V(-260, 0, s < 0 ? -5.2 : 5), V(260, 0.15, s < 0 ? -5 : 5.2), 1.5), kerb);
    // the tower + its plaza
    buildTower(b);
    // street walls: south side fronts at z = 9; north side fronts at z = -9 except the tower plot
    const r = rng(23);
    const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length) % a.length];
    for (const side of [-1, 1]) {
      let x = -200;
      while (x < 200) {
        const w = pick([12, 16, 20, 24]), h = pick([16, 19, 22, 26, 30]);
        const cx = x + w / 2;
        if (!(side < 0 && Math.abs(cx) < 26 + w / 2)) block(b, cx, side * (9 + 9), side > 0 ? Math.PI : 0, w, 18, h, Math.floor(r() * 6));
        x += w + (r() < 0.15 ? 6 : 0);
      }
      for (let k = 0; k < 2; k++) { // back rows
        let x2 = -220 + r() * 10;
        while (x2 < 220) {
          const w = pick([16, 20, 26]), h = pick([24, 30, 38, 46]), cx = x2 + w / 2, cz = side * (44 + 30 * k + r() * 4);
          if (!(Math.abs(cx - TOWER.x) < 40 && side < 0 && k === 0)) block(b, cx, cz, side > 0 ? Math.PI : 0, w, 22, h, Math.floor(r() * 6));
          x2 += w + 4 + r() * 6;
        }
      }
    }
    // skyline towers (Kenney samples, recoloured by its atlas) far behind
    for (let i = 0; i < 18; i++) {
      const a = -Math.PI + (i / 18) * Math.PI * 2, d = 230 + r() * 140;
      prop(b, kit, pick(["mod/building-sample-tower-a", "mod/building-sample-tower-b", "mod/building-sample-tower-c", "mod/building-sample-tower-d"]), Math.cos(a) * d, 0, Math.sin(a) * d - 60, 50 + r() * 70, r() * 6);
    }
    // street furniture: lamps, plane trees, bollards, parked cars, the stall
    for (let x = -120; x <= 120; x += 15) for (const s of [-1, 1]) if (!(Math.abs(x - CAR[0]) < 4 && s > 0)) prop(b, kit, "town/lantern", x + 3, 0.15, s * 5.7, 4.2);
    for (let x = -110; x <= 110; x += 22) for (const s of [-1, 1]) if (Math.abs(x) > 30 || s > 0) if (Math.abs(x - CAR[0]) > 5) prop(b, kit, "tree_default", x + 9, 0.15, s * 6.8, 8 + r() * 2);
    for (let x = -60; x <= 60; x += 2.2) if (Math.abs(x) < 26) b.add(new THREE.CylinderGeometry(0.11, 0.13, 0.9, 10).translate(0, 0.45, 0), lam("bollard", () => ({ color: "#2b2a33" })), M4(x, 0.15, -5.6));
    const cars = ["car/taxi", "car/van", "car/delivery", "car/sedan", "car/suv", "car/hatchback-sports"];
    for (const [x, z, yaw, n] of [[-22, 3.4, 0, 0], [-31, 3.4, 0, 3], [19, 3.4, 0, 1], [28, 3.4, 0, 4], [-12, -3.3, Math.PI, 2], [36, -3.3, Math.PI, 5], [-44, -3.3, Math.PI, 0]] as const)
      prop(b, kit, cars[n], x, 0, z, 1.6, yaw + Math.PI / 2);
    prop(b, kit, "town/stall-red", STALL[0], 0.15, STALL[2], 3.0, Math.PI);
    b.build(C);
    setSight([]);
    this.fins = buildFins(C);
    this.crane = buildCrane(C);
    this.car = buildCar(); C.add(this.car.root);

    // the beam: shaft from the face to the street, the hot spot, the glare on the glass
    const add = new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(2.4, 2.0, 1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.spot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), add); this.spot.rotation.x = -Math.PI / 2; this.spot.layers.set(NOINK); this.spot.renderOrder = 3;
    this.spotSmall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), add.clone()); this.spotSmall.rotation.x = -Math.PI / 2; this.spotSmall.layers.set(NOINK);
    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0),
      new THREE.MeshBasicMaterial({ map: shaftTex(), color: new THREE.Color(0.32, 0.28, 0.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    this.shaft.layers.set(NOINK); this.shaft.renderOrder = 4;
    this.glare = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(2.2, 2.0, 1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.glare.layers.set(NOINK);
    C.add(this.spot, this.shaft, this.glare);
    // explanation rays: sun -> face, face -> focus
    const rayM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 1.1), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0), rayM); m.layers.set(NOINK); m.renderOrder = 4; this.rays.push(m); C.add(m); }
    this.spoon = new THREE.Mesh(new THREE.PlaneGeometry(1, 3), new THREE.MeshBasicMaterial({ map: ctex("spoon", 300, 900, (g) => fxSpoon(new Pen(g))), transparent: true, alphaTest: 0.5, fog: false }));
    this.spoon.layers.set(NOINK); C.add(this.spoon);

    // ---- PARK ----
    {
      const P = this.sets.park, pb = new Batch();
      pb.add(quadUpG(PARK[0] - 300, PARK[0] + 300, PARK[2] - 300, PARK[2] + 300, 120, 120, 0), lam("grassHD", () => ({ map: grassHD() })));
      for (const [dx, dz, h, n] of [[-9, -12, 9, "tree_oak"], [7, -15, 10, "tree_fat"], [-16, -4, 8, "tree_detailed"], [14, -6, 9, "tree_default"], [-4, -24, 11, "tree_oak"], [22, -20, 10, "tree_detailed"]] as const)
        prop(pb, kit, n, PARK[0] + dx, 0, PARK[2] + dz, h, dx);
      for (const [dx, dz] of [[-3, -4], [3.5, -5], [-6, 1]]) prop(pb, kit, "plant_bushLarge", PARK[0] + dx, 0, PARK[2] + dz, 1.2);
      prop(pb, kit, "town/stall-bench", PARK[0] + 2.4, 0, PARK[2] - 2.6, 1.0, 0.3);
      for (let i = 0; i < 18; i++) { const a = i * 2.4, d = 2 + (i % 5) * 1.3; prop(pb, kit, i % 2 ? "nat/flower_redA" : "nat/flower_yellowA", PARK[0] + Math.cos(a) * d, 0, PARK[2] + Math.sin(a) * d - 2, 0.4); }
      // distant City skyline behind the park
      for (let i = 0; i < 10; i++) prop(pb, kit, ["mod/building-sample-tower-a", "mod/building-sample-tower-c"][i % 2], PARK[0] - 120 + i * 26, 0, PARK[2] - 160 - (i % 3) * 20, 40 + (i % 4) * 15, i);
      pb.build(P);
      this.magnifier = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 10, 32), lam("magRing", () => ({ color: "#3b3f52" })));
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.088, 32), new THREE.MeshPhongMaterial({ color: "#cfe6f5", transparent: true, opacity: 0.45, shininess: 100, specular: "#ffffff" }));
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.16, 10).translate(0, -0.17, 0), lam("magHandle", () => ({ color: "#5a3b2a" })));
      for (const o of [ring, lens, handle]) { o.rotation.x = 0; this.magnifier.add(o); }
      this.magnifier.rotation.x = -Math.PI / 2 + 0.25;
      this.magnifier.position.set(LEAF[0] - 0.03, 0.34, LEAF[2] + 0.02);
      P.add(this.magnifier);
      this.lensCone = new THREE.Mesh(new THREE.ConeGeometry(0.088, 0.3, 32, 1, true).translate(0, -0.15, 0),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.8, 0.45), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      this.lensCone.rotation.x = Math.PI; this.lensCone.position.set(LEAF[0], 0.03, LEAF[2]); this.lensCone.layers.set(NOINK);
      // cone apex at the leaf: geometry points up from y=-0.3..0 after the flip
      this.lensCone.position.set(LEAF[0] - 0.02, 0.33, LEAF[2] + 0.01); this.lensCone.rotation.x = 0;
      P.add(this.lensCone);
      this.spotSmall.position.set(LEAF[0], LEAF[1] + 0.012, LEAF[2]); P.add(this.spotSmall);
    }

    // ---- STUDIO ----
    {
      const S = this.sets.studio, sb = new Batch(), [x, , z] = STUDIO;
      const wall = lam("studioWall", () => ({ map: deskTex() })), floor = lam("studioFloor", () => ({ map: rep(slabs(), 3, 3), color: "#d9b98f" }));
      sb.add(quadUpG(x - 8, x + 8, z - 8, z + 8, 3, 3, 0), floor);
      sb.add(quad(V(x - 8, 0, z - 2.2), V(x + 8, 0, z - 2.2), V(x + 8, 4, z - 2.2), V(x - 8, 4, z - 2.2), 4, 1), wall);
      sb.add(boxGeo(V(x - 1.6, 1.2, z - 2.18), V(x + 1.6, 3.2, z - 2.12)), lam("studioWindow", () => ({ color: "#aed0ee" })));
      sb.add(boxGeo(V(x + 0.6, 0.74, z - 1.5), V(x + 2.4, 0.8, z - 0.5)), lam("desk", () => ({ color: "#8a5a3c" })));
      for (const [dx, dz] of [[0.7, -1.45], [2.3, -1.45], [0.7, -0.55], [2.3, -0.55]]) sb.add(boxGeo(V(x + dx - 0.04, 0, z + dz - 0.04), V(x + dx + 0.04, 0.74, z + dz + 0.04)), lam("desk", () => ({ color: "#8a5a3c" })));
      sb.add(quad(V(x - 2.4, 1.0, z - 2.1), V(x - 0.9, 1.0, z - 2.1), V(x - 0.9, 2.1, z - 2.1), V(x - 2.4, 2.1, z - 2.1)), lam("blueprint", () => ({ map: blueprintTex() })));
      buildTower(sb, 0.0032, [x + 1.5, 0.8, z - 1.0]); // the model on the desk
      sb.build(S);
    }

    // ---- VEGAS ----
    {
      const Vg = this.sets.vegas, vb = new Batch(), [x, , z] = VEGAS;
      vb.add(quadUpG(x - 500, x + 500, z - 500, z + 500, 200, 200, 0), lam("sand", () => ({ map: sandTex() })));
      vb.add(quadUpG(x - 14, x + 14, z - 4, z + 14, 28 / 1.6, 18 / 1.6, 0.02), lam("deck", () => ({ map: tileTex() })));
      // curved hotel: a crescent in plan, concave toward the pool, 120 m
      const hotel = lam("vegasGlass", () => ({ map: rep(glassTex(), 1, 1), color: "#d7c9b8" }));
      const cres = (u: number, v: number, back = 0) => { const a = (u - 0.5) * 1.6, Rr = 70 + back; return V(x + Rr * Math.sin(a), v * 120, z - 30 - Rr * (1 - Math.cos(a)) * -1 - back * 0); };
      vb.add(surface(30, 30, (u, v) => cres(u, v), 10, 1), hotel);
      vb.add(surface(30, 30, (u, v) => cres(1 - u, v).add(V(0, 0, -14)), 10, 1), hotel);
      for (const s of [0, 1]) vb.add(surface(2, 30, (u, v) => cres(s, v).add(V(0, 0, s ? -14 * u : -14 * (1 - u))), 2, 1), hotel);
      vb.add(surface(30, 2, (u, w) => cres(u, 1).add(V(0, 0, -14 * w)), 10, 1, true), lam("vegasRoof", () => ({ color: "#cfc4b6" })));
      for (const [dx, dz, n] of [[-12, 1, "nat/tree_palmTall"], [12, 2, "nat/tree_palmDetailedTall"], [-15, 12, "nat/tree_palm"], [15, 12, "nat/tree_palmTall"], [-8, -8, "nat/tree_palmDetailedTall"], [9, -9, "nat/tree_palmTall"]] as const)
        prop(vb, kit, n, x + dx, 0, z + dz, 9, dx);
      for (let i = 0; i < 6; i++) { // loungers
        const lx = x - 6 + i * 2.1, lz = z + 6 + (i % 2) * 0.4;
        vb.add(roundBox(0.7, 0.12, 1.9, 0.05).translate(0, 0.35, 0), lam("lounger", () => ({ color: "#f5f2e8" })), M4(lx, 0, lz));
        vb.add(roundBox(0.7, 0.1, 0.8, 0.04).rotateX(-0.9).translate(0, 0.62, -0.75), lam("lounger", () => ({ color: "#f5f2e8" })), M4(lx, 0, lz));
      }
      for (const [dx, dz, c] of [[-10, 8, "#e2453c"], [10, 9, "#2f8fc8"]] as const) {
        vb.add(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8).translate(0, 1.2, 0), lam("pole", () => ({ color: "#d9d4ca" })), M4(x + dx, 0, z + dz));
        vb.add(new THREE.ConeGeometry(1.4, 0.5, 12).translate(0, 2.5, 0), lam("umb" + c, () => ({ color: c })), M4(x + dx, 0, z + dz));
      }
      vb.build(Vg);
      this.poolTex = poolTex(); this.poolTex.wrapS = this.poolTex.wrapT = THREE.RepeatWrapping; this.poolTex.repeat.set(3, 2);
      const water = new THREE.Mesh(new THREE.PlaneGeometry(20, 7), new THREE.MeshBasicMaterial({ map: this.poolTex, color: new THREE.Color(0.95, 1, 1) }));
      water.rotation.x = -Math.PI / 2; water.position.set(x, 0.04, z + 0.8); water.layers.set(NOINK); Vg.add(water);
    }
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    for (const [k, g] of Object.entries(this.sets)) g.visible = k === s.set;
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 2200; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 8, 140);
    this.sun.position.copy(focus).addScaledVector(sunDir, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 700; sc.updateProjectionMatrix();
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
    const far = s.set === "city" && dist > 60;
    this.fog.near = far ? 120 : L.fogNear; this.fog.far = far ? 900 : L.fogFar + 120;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      const a = (i / this.clouds.length) * Math.PI * 2 + 0.3 + t * 0.002, d = 700 + (i % 3) * 80, w = 150 + (i % 4) * 40;
      m.position.set(cam.position.x + Math.cos(a) * d, 150 + (i % 4) * 45, cam.position.z + Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- city dynamics: car, melt, fins, crane, beam, rays ----
    if (s.set === "city") {
      this.car.root.position.set(id === 4 ? carX(t) : CAR[0], 0, CAR[2]);
      const melt = meltAt(t);
      this.car.mirrorN.visible = !(id === 6 || (id > 6 && melt.mirror > 0.5));
      this.car.badge.visible = !(id === 7 || id > 7);
      this.fins.visible = !!s.fins; this.crane.visible = !s.fins;
      const beamOn = id <= 12 && id !== 4 || id === 13 || id === 15;
      const sp = spotAt(t), r = 2.2 + (id >= 11 && id <= 12 ? 0.4 : 0);
      this.spot.visible = this.shaft.visible = beamOn;
      this.glare.visible = beamOn && (id === 1 || id === 2 || id === 3 || id === 13 || id === 15);
      if (beamOn) {
        this.spot.position.set(sp.x, 0.17, sp.z); this.spot.scale.set(r * 2.2, r * 1.6, 1);
        const src = V(...FOCUS_SRC), dst = V(sp.x, 0.2, sp.z), d = dst.clone().sub(src);
        this.shaft.position.copy(src); this.shaft.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
        this.shaft.scale.set(1.2, d.length(), 1.2);
        (this.shaft.material as THREE.MeshBasicMaterial).opacity = id === 13 || id === 15 ? 0.0 : 0.5;
        this.shaft.visible = id !== 13 && id !== 15;
        this.glare.position.set(FOCUS_SRC[0], FOCUS_SRC[1], FOCUS_SRC[2] + 3); this.glare.scale.setScalar(id === 1 || id === 3 ? 40 : 70);
      }
      const explain = id === 13 || id === 15;
      const grow = explain ? clamp01((f - s.a - 6) / 40) : 0;
      this.rays.forEach((m, i) => {
        m.visible = explain && grow > 0;
        if (!m.visible) return;
        const half = i % 2, k = i >> 1, u = 0.12 + (k / 8) * 0.76, v = 0.12 + ((k * 5) % 9) / 9 * 0.7;
        const hit = southPt(u, v).add(V(0, 0, 0.4)), sunFrom = hit.clone().add(V(0, 0.57, 0.82).multiplyScalar(260));
        const spot = V(spotAt(t).x, 0.2, spotAt(t).z);
        const [a0, b0] = half ? [hit, spot] : [sunFrom, hit];
        const kk = half ? clamp01(grow * 2 - 1) : clamp01(grow * 2);
        const d = b0.clone().sub(a0), len = d.length() * kk;
        m.position.copy(a0); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
        const th = id === 13 ? 0.6 : 0.35;
        m.scale.set(th, Math.max(0.01, len), th);
      });
      this.spoon.visible = id === 13 && t > BEAT.spoon - 0.15;
      if (this.spoon.visible) {
        const pop = smooth((t - BEAT.spoon + 0.15) / 0.3);
        this.spoon.position.set(0, 70, -84); this.spoon.rotation.set(0, -Math.PI / 2, 0.15); this.spoon.scale.setScalar(55 * pop);
      }
    }
    if (s.set === "park") {
      const wide = f < R(1434);
      this.magnifier.visible = this.lensCone.visible = this.spotSmall.visible = !wide;
      const sq = smooth((t - BEAT.squeezes) / 1.2);
      (this.lensCone.material as THREE.MeshBasicMaterial).opacity = 0.1 + 0.22 * sq;
      this.spotSmall.scale.setScalar(0.14 - 0.1 * sq); (this.spotSmall.material as THREE.MeshBasicMaterial).color.setRGB(1.5 + 2 * sq, 1.3 + 1.6 * sq, 0.9 + sq);
    }
    if (s.set === "vegas") { this.poolTex.offset.set(t * 0.03, t * 0.015); }

    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const info = { pos: cam.position, right, sun: sunDir };
    const st: Stage = s.set === "park" ? parkStage(t, info, f < R(1434)) : stage(id, t, info);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
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
      a.mesh.castShadow = L.actorShadow;
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (let i = 0; i < fi; i++) this.fxs[i].bind();
    return focus;
  }
}

/** horizontal quad facing up at height dy covering x0..x1, z0..z1 */
function quadUpG(x0: number, x1: number, z0: number, z1: number, u: number, v: number, dy = 0) {
  const y = dy, g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
void roofMat; void brick; void cobbleHD; void kitClone;
