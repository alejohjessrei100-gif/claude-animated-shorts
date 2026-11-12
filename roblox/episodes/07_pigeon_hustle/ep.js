// Episode 07: The Pigeon Hustle. "In my town, every time you complain, a pigeon lands on you."
// Comedy, anti-hero narrator (12, sells compliments), no rescue: the twist is on him.
// All-new sets (no school, no Maple St): an old-town PLAZA (cobbles, stucco facades with arched windows, balconies,
// awnings, a clock tower, the founder's statue in a fountain, a park corner), the south ROAD with traffic, the BUS STOP +
// lemonade stand, the narrator's GARAGE across the road with Tessa's stand opposite, the town POOL, the ice-cream truck,
// and the KINDNESS WEEK stage. Pigeons are instanced (11 parts each) and land on whoever complains.
import * as THREE from "three";
import { makeAvatar, SKIN, shirtArt } from "/kit/20_r6.js";
import { track, act } from "/kit/25_anim.js";
import * as T from "/kit/45_town.js";
import { ease } from "/kit/40_cam.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (a, b, t) => ease((t - a) / (b - a));
let W = {};
const tw = (i) => W[i];
export const coreOpts = {};
let C = {}, used = new Set(), core, extras = [];
const M = (c, r = 0.7, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const add = (p, geo, m, x, y, z, o = {}) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = o.cast ?? true; k.receiveShadow = true; p.add(k); return k; };
const B = (p, a, b, m, o) => T.block(p, a, b, m, o);
const G = (p, x, y, z, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g); return g; };
let sd = 7; const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
const label = (text, bg, fg, w = 512, h = 128, font = "800 64px Poppins, sans-serif") => T.ctex(`lbl${text}${bg}${fg}${w}${h}`, w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 4); });
const sign = (p, text, x, y, z, w, h, bg = "#ffffff", fg = "#202228", ry = 0, font) => { const m = add(p, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: label(text, bg, fg, 512, Math.round(512 * h / w), font ?? `800 ${Math.round(300 * h / w)}px Poppins, sans-serif`), roughness: 0.6, side: THREE.DoubleSide }), x, y, z, { cast: false }); m.rotation.y = ry; return m; };

// ------------------------------------------------------------------ places
const GAR = [60, 52], TESS = [60, 29], BUS = [-20, 31], LEM = [-11, 31], STAGE = [24, -26], POOL = [-84, 58], AC = [-44.2, 0], TRUCK = [16, 36];
const PARK_BENCH = [-20, 14];

/** stucco facade building, front faces +z in local space */
function building(p, x, z, ry, { w = 14, d = 10, h = 13, wall = "#e8c9a0", trim = "#f6efe2", shutter = "#3f6a5a", awn = ["#c9573d", "#f6efe2"], floors = 2, roof = "#b5533c", balcony = true } = {}) {
  const g = G(p, x, 0, z, ry);
  B(g, [-w / 2, 0, -d], [w / 2, h, 0], new THREE.MeshStandardMaterial({ map: T.TEX.plaster(wall, [w / 6, h / 6]), roughness: 0.95 }));
  B(g, [-w / 2 - 0.3, h, -d - 0.3], [w / 2 + 0.3, h + 0.6, 0.35], M(trim, 0.6)); // cornice
  B(g, [-w / 2, 0, 0], [w / 2, 0.9, 0.15], M("#b8ad98", 0.9)); // stone base
  for (let k = 1; k < floors + 1; k++) B(g, [-w / 2, 4.6 * k - 0.2, 0], [w / 2, 4.6 * k + 0.1, 0.25], M(trim, 0.6)); // string course
  // pitched tile roof behind the parapet
  T.gableRoof(g, 0, -d / 2, w, d, h + 0.6, 3.2, roof);
  const glass = M("#2c3c4c", 0.15, { metalness: 0.4 }), glassLit = M("#ffd9a0", 0.4, { emissive: "#ffb060", emissiveIntensity: 0.25 });
  const nWin = Math.max(2, Math.round(w / 4.2));
  for (let f = 1; f <= floors; f++) for (let i = 0; i < nWin; i++) {
    const wx = -w / 2 + (i + 0.5) * (w / nWin), wy = 4.6 * f + 1.8;
    B(g, [wx - 0.8, wy - 1.4, 0.02], [wx + 0.8, wy + 0.9, 0.12], rr() < 0.25 ? glassLit : glass);
    const arch = add(g, new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16, 1, false, 0, Math.PI), rr() < 0.25 ? glassLit : glass, wx, wy + 0.9, 0.07); arch.rotation.x = Math.PI / 2; arch.rotation.y = Math.PI / 2; arch.rotation.z = Math.PI / 2;
    B(g, [wx - 1.0, wy - 1.6, 0.0], [wx + 1.0, wy - 1.4, 0.45], M(trim, 0.6)); // sill
    for (const s of [-1, 1]) { const sh = B(g, [wx + s * 0.85 - (s > 0 ? 0 : 0.75), wy - 1.4, 0.12], [wx + s * 0.85 + (s > 0 ? 0.75 : 0), wy + 1.0, 0.2], M(shutter, 0.7)); for (let q = 0; q < 6; q++) B(g, [sh.position.x - 0.3, wy - 1.2 + q * 0.4, 0.2], [sh.position.x + 0.3, wy - 1.1 + q * 0.4, 0.24], M(new THREE.Color(shutter).offsetHSL(0, 0, -0.06).getStyle(), 0.7)); }
    if (balcony && f === 1 && i % 2 === 0) { // little iron balcony with flower box
      B(g, [wx - 1.3, wy - 1.65, 0], [wx + 1.3, wy - 1.5, 1.2], M("#e8e2d6", 0.6));
      for (let q = 0; q <= 6; q++) B(g, [wx - 1.3 + q * 0.43, wy - 1.5, 1.1], [wx - 1.25 + q * 0.43, wy - 0.4, 1.18], M("#2b2b33", 0.4));
      B(g, [wx - 1.3, wy - 0.45, 1.1], [wx + 1.3, wy - 0.35, 1.2], M("#2b2b33", 0.4));
      B(g, [wx - 1.1, wy - 1.5, 0.2], [wx + 1.1, wy - 1.1, 0.6], M("#8a5a34", 0.8));
      for (let q = 0; q < 6; q++) add(g, new THREE.SphereGeometry(0.2, 8, 6), M(["#e05a8a", "#f2c230", "#ffffff", "#e8601c"][q % 4], 0.6), wx - 0.9 + q * 0.36, wy - 1.0, 0.4);
    }
  }
  // ground floor: door + shop window + striped awning
  B(g, [-1.1, 0.9, 0.02], [1.1, 4.0, 0.14], M("#4a2f22", 0.6)); B(g, [-1.4, 0.9, 0.0], [1.4, 4.4, 0.2], M(trim, 0.6), { cast: false });
  add(g, new THREE.SphereGeometry(0.1, 8, 6), M("#d9b24a", 0.3, { metalness: 0.7 }), 0.7, 2.4, 0.2);
  for (const s of [-1, 1]) { const sx = s * w / 4 + s * 0.8; B(g, [sx - 1.8, 1.2, 0.02], [sx + 1.8, 3.8, 0.12], glass); B(g, [sx - 2, 1.0, 0], [sx + 2, 1.2, 0.3], M(trim, 0.6)); }
  for (let q = 0; q < 10; q++) { const a = B(g, [-w / 2 + 0.5 + q * (w - 1) / 10, 4.1, 0], [-w / 2 + 0.5 + (q + 1) * (w - 1) / 10, 4.2, 2.2], M(awn[q % 2], 0.85)); a.rotation.x = 0.35; a.position.y = 4.6; a.position.z = 1.0; }
  return g;
}

function cobbles() {
  return T.ctex("cobbles", 512, 512, (g, r) => {
    g.fillStyle = "#8f8578"; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const ox = (y % 2) * 16; g.fillStyle = `hsl(${30 + r() * 12},${10 + r() * 10}%,${50 + r() * 16}%)`; g.beginPath(); g.roundRect(x * 32 + ox + 2, y * 32 + 2, 28, 28, 8); g.fill(); g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x * 32 + ox + 6, y * 32 + 5, 14, 4); }
  }, [16, 16]);
}

function lampPost(p, x, z) { // ornate cast-iron lamp, a favourite perch
  const g = G(p, x, 0, z), I = M("#22262c", 0.4, { metalness: 0.5 });
  add(g, new THREE.CylinderGeometry(0.45, 0.6, 0.8, 10), I, 0, 0.4, 0); add(g, new THREE.CylinderGeometry(0.12, 0.18, 6.4, 8), I, 0, 3.8, 0);
  for (const s of [-1, 1]) { B(g, [s > 0 ? 0 : -1.4, 6.8, -0.06], [s > 0 ? 1.4 : 0, 6.95, 0.06], I); add(g, new THREE.CylinderGeometry(0.35, 0.22, 0.8, 8), M("#fff3d0", 0.3, { emissive: "#ffe0a0", emissiveIntensity: 0.4 }), s * 1.35, 6.4, 0); add(g, new THREE.ConeGeometry(0.45, 0.4, 8), I, s * 1.35, 7.0, 0); }
  add(g, new THREE.SphereGeometry(0.2, 8, 6), I, 0, 7.3, 0);
  return g;
}
function parkBench(p, x, z, ry) {
  const g = G(p, x, 0, z, ry), Wd = M("#7a4a2a", 0.7), I = M("#22262c", 0.4, { metalness: 0.5 });
  for (let k = 0; k < 4; k++) B(g, [-2.4, 1.6, -0.6 + k * 0.32], [2.4, 1.75, -0.38 + k * 0.32], Wd);
  for (let k = 0; k < 3; k++) { const b = B(g, [-2.4, 2.1 + k * 0.42, -0.85], [2.4, 2.35 + k * 0.42, -0.72], Wd); b.rotation.x = -0.12; }
  for (const sx of [-2.1, 2.1]) { B(g, [sx - 0.08, 0, -0.7], [sx + 0.08, 1.6, -0.5], I); B(g, [sx - 0.08, 0, 0.4], [sx + 0.08, 1.6, 0.6], I); B(g, [sx - 0.08, 1.6, -0.9], [sx + 0.08, 3.4, -0.75], I); B(g, [sx - 0.08, 2.4, -0.7], [sx + 0.08, 2.55, 0.5], I); }
  return g;
}
function tree(p, x, z, s = 1, leaf = "#4f8f3a") {
  const g = G(p, x, 0, z); g.scale.setScalar(s);
  B(g, [-1.6, 0, -1.6], [1.6, 1.1, 1.6], M("#b8ad98", 0.9)); B(g, [-1.4, 1.1, -1.4], [1.4, 1.2, 1.4], M("#5a3a22", 1));
  add(g, new THREE.CylinderGeometry(0.35, 0.5, 5, 8), M("#6a4a2e", 0.9), 0, 3.5, 0);
  for (let k = 0; k < 6; k++) add(g, new THREE.IcosahedronGeometry(1.6 + rr() * 0.8, 1), M(new THREE.Color(leaf).offsetHSL(0, 0, (rr() - 0.5) * 0.1).getStyle(), 0.85, { flatShading: true }), (rr() - 0.5) * 2.4, 6.4 + rr() * 1.6, (rr() - 0.5) * 2.4);
  return g;
}
function convertible(p, x, z, ry, c) {
  const g = G(p, x, 0, z, ry), body = M(c, 0.3, { metalness: 0.3 }), chrome = M("#d9dce2", 0.2, { metalness: 0.9 });
  B(g, [-1.1, 0.5, -2.4], [1.1, 1.4, 2.4], body); B(g, [-1.05, 1.4, 0.9], [1.05, 1.6, 2.4], body); B(g, [-1.05, 1.4, -2.4], [1.05, 1.6, -1.4], body);
  B(g, [-1.15, 0.45, -2.5], [1.15, 0.6, 2.5], chrome);
  const ws = B(g, [-1.0, 1.6, 0.75], [1.0, 2.5, 0.85], new THREE.MeshStandardMaterial({ color: "#bcd6e8", transparent: true, opacity: 0.35, roughness: 0.05 })); ws.rotation.x = -0.3;
  B(g, [-0.9, 1.0, -0.4], [0.9, 1.5, 0.2], M("#efe6d2", 0.6)); B(g, [-0.9, 1.5, -0.6], [0.9, 2.4, -0.4], M("#efe6d2", 0.6));
  const wheel = add(g, new THREE.CylinderGeometry(0.15, 0.15, 0.3, 10), M("#202228", 0.5), 0.35, 1.9, 0.55); wheel.rotation.x = 1.2; // steering wheel
  for (const [wx, wz] of [[-1.1, 1.6], [1.1, 1.6], [-1.1, -1.6], [1.1, -1.6]]) { const w = add(g, new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14), M("#1a1a1e", 0.6), wx, 0.5, wz); w.rotation.z = Math.PI / 2; const h = add(g, new THREE.CylinderGeometry(0.25, 0.25, 0.37, 10), chrome, wx, 0.5, wz); h.rotation.z = Math.PI / 2; }
  for (const s of [-0.7, 0.7]) add(g, new THREE.SphereGeometry(0.18, 8, 6), M("#fff6d0", 0.3, { emissive: "#fff0b0", emissiveIntensity: 0.6 }), s, 1.05, 2.5);
  return g;
}
function iceTruck(p, x, z, ry) {
  const g = G(p, x, 0, z, ry), wh = M("#f6f4ee", 0.5), pink = M("#f08ab0", 0.5);
  B(g, [-1.6, 0.8, -4], [1.6, 4.8, 2], wh); B(g, [-1.6, 0.8, 2], [1.6, 3.2, 4.4], wh); B(g, [-1.5, 2.4, 3.2], [1.5, 3.1, 4.42], M("#2c3c4c", 0.15, { metalness: 0.4 }));
  for (let k = 0; k < 6; k++) B(g, [1.6, 1.0 + k * 0.6, -4], [1.65, 1.3 + k * 0.6, 2], k % 2 ? wh : pink, { cast: false });
  B(g, [1.62, 2.4, -2.6], [1.7, 3.9, 0.6], M("#3a2a2a", 0.5)); B(g, [1.6, 2.2, -2.8], [2.6, 2.35, 0.8], M("#d9dce2", 0.3, { metalness: 0.6 }));
  sign(g, "SOLD OUT", 1.75, 3.15, -1, 3, 1.1, "#d42a2a", "#ffffff", Math.PI / 2);
  const cone = new THREE.Group(); cone.position.set(0, 4.8, -1); g.add(cone);
  add(cone, new THREE.ConeGeometry(0.8, 2.2, 10), M("#d9a050", 0.7), 0, 1.1, 0).rotation.x = Math.PI; cone.children[0].position.y = 1.2;
  add(cone, new THREE.SphereGeometry(0.95, 14, 10), pink, 0, 2.5, 0); add(cone, new THREE.SphereGeometry(0.3, 8, 6), M("#d42a2a", 0.4), 0, 3.4, 0);
  for (const [wx, wz] of [[-1.6, 3], [1.6, 3], [-1.6, -2.8], [1.6, -2.8]]) { const w = add(g, new THREE.CylinderGeometry(0.75, 0.75, 0.4, 14), M("#1a1a1e", 0.6), wx, 0.75, wz); w.rotation.z = Math.PI / 2; }
  return g;
}
function bike(p, { c = "#3d7be0", s = 1, chrome = false, streamers = false } = {}) {
  const g = new THREE.Group(); p.add(g); g.scale.setScalar(s);
  const F = chrome ? M("#e8ebf0", 0.15, { metalness: 0.95 }) : M(c, 0.35, { metalness: 0.4 }), K = M("#1a1a1e", 0.6);
  for (const z of [-1.3, 1.3]) { const w = add(g, new THREE.TorusGeometry(0.85, 0.12, 8, 24), K, 0, 0.95, z); w.rotation.y = Math.PI / 2; for (let q = 0; q < 6; q++) { const sp = add(g, new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4), M("#c9ccd2", 0.3, { metalness: 0.8 }), 0, 0.95, z); sp.rotation.x = (q * Math.PI) / 6; } }
  const tube = (a, b, r = 0.08) => { const A = V(...a), Bv = V(...b), L = A.distanceTo(Bv); const m = add(g, new THREE.CylinderGeometry(r, r, L, 8), F, (A.x + Bv.x) / 2, (A.y + Bv.y) / 2, (A.z + Bv.z) / 2); m.quaternion.setFromUnitVectors(V(0, 1, 0), Bv.clone().sub(A).normalize()); return m; };
  tube([0, 0.95, -1.3], [0, 2.0, -0.3]); tube([0, 0.95, -1.3], [0, 1.1, 0.2]); tube([0, 1.1, 0.2], [0, 2.0, -0.3]); tube([0, 2.0, -0.3], [0, 2.1, 0.9]); tube([0, 1.1, 0.2], [0, 2.1, 0.9]); tube([0, 2.1, 0.9], [0, 0.95, 1.3]); tube([0, 2.1, 0.9], [0, 2.7, 1.0]);
  tube([-0.7, 2.7, 1.0], [0.7, 2.7, 1.0], 0.06);
  B(g, [-0.25, 2.1, -0.75], [0.25, 2.25, 0.05], M("#2b2b33", 0.6));
  if (streamers) for (const s2 of [-1, 1]) for (let q = 0; q < 4; q++) { const st = B(g, [s2 * 0.7 - 0.02, 2.0 - q * 0.05, 1.0], [s2 * 0.7 + 0.02, 2.7, 1.04], M(["#e05a8a", "#f2c230", "#3dbf7a", "#3d7be0"][q], 0.6), { cast: false }); st.rotation.x = 0.4 + q * 0.12; }
  if (streamers) { tube([0, 2.0, -0.8], [0, 4.6, -1.3], 0.03); sign(g, "★", 0.05, 4.3, -1.3, 0.8, 0.6, "#f2c230", "#d42a2a", Math.PI / 2); }
  return g;
}

// ------------------------------------------------------------------ pigeons (instanced: 11 parts each)
const PN = 700; let parts = [], pig = [];
const PART = [ // [name, geometry, material, local matrix maker, isHead]
];
function initPigeons(S) {
  const body = M("#7d8796", 0.75), head = M("#6b7585", 0.7), neck = new THREE.MeshStandardMaterial({ color: "#3f8a7a", roughness: 0.35, metalness: 0.45 }), dark = M("#2a2a2e", 0.5), orange = M("#e8742a", 0.3), pink = M("#d86a7a", 0.6), wing = M("#97a0ad", 0.75), tail = M("#4d5563", 0.7);
  const mk = (geo, mat, pos, rot = [0, 0, 0], scl = [1, 1, 1], kind = "fixed") => { const im = new THREE.InstancedMesh(geo, mat, PN); im.frustumCulled = false; im.castShadow = true; S.add(im); const L = new THREE.Matrix4().compose(V(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), V(...scl)); parts.push({ im, L, kind }); };
  mk(new THREE.SphereGeometry(0.32, 12, 8), body, [0, 0.42, 0], [0, 0, 0], [0.85, 0.8, 1.25]);
  mk(new THREE.SphereGeometry(0.2, 10, 8), neck, [0, 0.62, 0.22], [0, 0, 0], [1, 1.1, 1], "head");
  mk(new THREE.SphereGeometry(0.17, 10, 8), head, [0, 0.82, 0.32], [0, 0, 0], [1, 1, 1], "head");
  mk(new THREE.ConeGeometry(0.05, 0.16, 6), dark, [0, 0.8, 0.51], [Math.PI / 2, 0, 0], [1, 1, 1], "head");
  mk(new THREE.SphereGeometry(0.045, 6, 4), orange, [0.11, 0.86, 0.42], [0, 0, 0], [1, 1, 1], "head");
  mk(new THREE.SphereGeometry(0.045, 6, 4), orange, [-0.11, 0.86, 0.42], [0, 0, 0], [1, 1, 1], "head");
  mk(new THREE.BoxGeometry(0.28, 0.05, 0.42), tail, [0, 0.42, -0.5], [-0.25, 0, 0]);
  mk(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 5), pink, [0.09, 0.11, 0.05]);
  mk(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 5), pink, [-0.09, 0.11, 0.05]);
  const wg = (s) => { const g = new THREE.BoxGeometry(0.7, 0.06, 0.44); g.translate(s * 0.35, 0, 0); return g; };
  mk(wg(1), wing, [0.2, 0.5, -0.02], [0, 0, 0], [1, 1, 1], "wingR");
  mk(wg(-1), wing, [-0.2, 0.5, -0.02], [0, 0, 0], [1, 1, 1], "wingL");
}
/** pigeon record: { kind, x,y,z, yaw, s, show(t)->bool, at(t)->{p,yaw,fly,peck} } */
const _m = new THREE.Matrix4(), _h = new THREE.Matrix4(), _w = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), HID = new THREE.Matrix4().makeScale(0, 0, 0);
let turnTo = null; // world point all pigeons turn to face at the end
function drawPigeons(t) {
  const k = turnTo ? smooth(tw(208), tw(211), t) : 0;
  for (let i = 0; i < PN; i++) {
    const P = pig[i], st = P && P.at(t);
    if (!st) { for (const pt of parts) pt.im.setMatrixAt(i, HID); continue; }
    let yaw = st.yaw;
    if (k > 0 && !st.fly) { const ty = Math.atan2(turnTo.x - st.p.x, turnTo.z - st.p.z); let d = ((ty - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; yaw += d * Math.min(1, k * (1 + (i % 7) * 0.1)); }
    _m.compose(st.p, _q.setFromEuler(_e.set(st.pitch ?? 0, yaw, 0)), _s.setScalar(P.s));
    const pk = st.fly ? 0 : st.peck ?? 0;
    _h.makeTranslation(0, -0.28 * pk, 0.12 * pk);
    const flap = st.fly ? Math.sin(t * 24 + i) * 0.7 : 0, fold = st.fly ? 0 : 1;
    for (const pt of parts) {
      if (pt.kind === "head") _w.multiplyMatrices(_m, _h).multiply(pt.L);
      else if (pt.kind === "wingR" || pt.kind === "wingL") { const sgn = pt.kind === "wingR" ? 1 : -1; _w.copy(_m).multiply(pt.L).multiply(new THREE.Matrix4().makeRotationZ(sgn * (flap - fold * 1.35))); if (fold) _w.multiply(new THREE.Matrix4().makeScale(0.75, 1, 1)); }
      else _w.multiplyMatrices(_m, pt.L);
      pt.im.setMatrixAt(i, _w);
    }
  }
  for (const pt of parts) pt.im.instanceMatrix.needsUpdate = true;
}
const groundPigeon = (x, z, y = 0, t0 = 0, t1 = 999, s = 1) => { const yaw0 = rr() * 6.28, ph = rr() * 10; pig.push({ s, at: (t) => t < t0 || t > t1 ? null : { p: V(x + 0.15 * Math.sin(t * 0.7 + ph), y, z + 0.15 * Math.cos(t * 0.5 + ph)), yaw: yaw0 + 0.4 * Math.sin(t * 0.6 + ph), peck: Math.max(0, Math.sin(t * 3 + ph)) ** 6 } }); };
const flyIn = (from, to, t0, dur = 0.7) => (t) => { const u = Math.min(1, (t - t0) / dur), e = ease(u); return { p: V(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e + Math.sin(u * Math.PI) * 1.5, from.z + (to.z - from.z) * e), yaw: Math.atan2(to.x - from.x, to.z - from.z), fly: u < 0.92, pitch: u < 0.92 ? 0.25 : 0 }; };
/** a pigeon that flies in at t0 and rides a character's head (or any anchor fn) until t1, then flies off */
function lander(anchor, t0, t1 = 999, { off = V(0, 0, 0), yawOff = 0, s = 1 } = {}) {
  const dir = rr() * 6.28, from = V(Math.cos(dir) * 14, 14, Math.sin(dir) * 14);
  pig.push({ s, at: (t) => {
    if (t < t0 || t > t1 + 1.2) return null;
    const a = anchor(t); if (!a) return null;
    const tgt = a.p.clone().add(off);
    if (t < t0 + 0.7) { const f = flyIn(tgt.clone().add(from), tgt, t0)(t); return f; }
    if (t > t1) { const u = (t - t1) / 1.2; return { p: tgt.clone().add(V(u * 6, u * u * 10, -u * 4)), yaw: a.yaw + yawOff, fly: true, pitch: -0.3 }; }
    return { p: tgt, yaw: a.yaw + yawOff + 0.2 * Math.sin(t * 1.3 + dir), peck: Math.max(0, Math.sin(t * 2 + dir)) ** 10 * 0.6 };
  } });
}
const headOf = (name, dy = 0) => (t) => { const av = C[name]; if (!av || !av.root.visible) return null; av.root.updateMatrixWorld(true); const p = av.j.head.getWorldPosition(new THREE.Vector3()); return { p: p.add(V(0, 0.62 * av.root.scale.y + dy, 0)), yaw: av.root.rotation.y }; };
const shoulderOf = (name, side) => (t) => { const av = C[name]; if (!av || !av.root.visible) return null; av.root.updateMatrixWorld(true); const p = av.j.torso.localToWorld(V(side * 1.0, 2.0, 0)); return { p, yaw: av.root.rotation.y }; };
const fixed = (x, y, z, yaw = 0) => () => ({ p: V(x, y, z), yaw });

// ------------------------------------------------------------------ build
let money = [], cashPile, helmet, medal, bike1, bike2, flyCards = [], lemonPitcher, lemons = [], acFan, smoke = [], heatSun, statueAv;
export async function build(ctx) {
  const S = ctx.scene; core = ctx.core;
  ctx.words.forEach((w, i) => (W[i] = w.start));
  // ground: grass everywhere, cobbled plaza, road, sidewalks
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), M("#6aa84a", 0.95)); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; S.add(grass);
  const cb = new THREE.Mesh(new THREE.PlaneGeometry(112, 76), new THREE.MeshStandardMaterial({ map: cobbles(), roughness: 0.9 })); cb.rotation.x = -Math.PI / 2; cb.position.set(0, 0.02, -8); cb.receiveShadow = true; S.add(cb);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(260, 8), new THREE.MeshStandardMaterial({ map: T.TEX.asphalt([60, 2]), roughness: 0.9 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.03, 36); road.receiveShadow = true; S.add(road);
  for (let x = -128; x < 130; x += 6) B(S, [x, 0.04, 35.9], [x + 3, 0.05, 36.1], M("#f2e6b0", 0.6), { cast: false });
  for (const z of [31, 41]) B(S, [-130, 0, z - 1.6], [130, 0.3, z + 1.6], new THREE.MeshStandardMaterial({ map: T.TEX.concrete([60, 1]), roughness: 0.9 }));
  // north / west / east facades
  const palette = [["#e8c9a0", "#3f6a5a"], ["#e8a890", "#2f4f7a"], ["#f2dfa6", "#8a3a2a"], ["#b8d4c0", "#5a3a22"], ["#f0d0d8", "#3f6a5a"], ["#d9b48a", "#2f4f7a"], ["#c8d8e8", "#8a3a2a"], ["#f6e8c8", "#3f6a5a"]];
  [-49, -35, -21, 21, 35, 49].forEach((x, i) => building(S, x, -46, 0, { wall: palette[i][0], shutter: palette[i][1], h: 12 + (i % 3) * 2.5, floors: 2, awn: [["#c9573d", "#f6efe2"], ["#2f6a8a", "#f6efe2"], ["#3f7a4a", "#f6efe2"]][i % 3] }));
  [-34, -20, -6, 8].forEach((z, i) => building(S, -56, z, Math.PI / 2, { wall: palette[(i + 3) % 8][0], shutter: palette[(i + 3) % 8][1], h: 11 + (i % 2) * 3, awn: [["#8a5ad6", "#f6efe2"], ["#c9573d", "#f6efe2"]][i % 2] }));
  [-34, -20].forEach((z, i) => building(S, 56, z, -Math.PI / 2, { wall: palette[(i + 5) % 8][0], shutter: palette[(i + 5) % 8][1], h: 13 }));
  sign(S, "CAFÉ", -21, 5.6, -44.8, 3, 0.9, "#2f6a8a", "#ffffff"); sign(S, "BAKERY", 21, 5.6, -44.8, 3.4, 0.9, "#c9573d", "#ffffff"); sign(S, "FLOWERS", -54.8, 5.4, -20, 3.4, 0.9, "#3f7a4a", "#ffffff", Math.PI / 2);
  // café tables under the awning
  for (const x of [-25, -18]) { add(S, new THREE.CylinderGeometry(0.9, 0.9, 0.1, 14), M("#f6efe2", 0.5), x, 2.4, -42); add(S, new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), M("#22262c", 0.4), x, 1.2, -42); add(S, new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8), M("#f6f4ee", 0.4), x + 0.3, 2.65, -42); }
  // clock tower (north centre)
  const CT = G(S, 0, 0, -48);
  B(CT, [-5, 0, -5], [5, 26, 5], new THREE.MeshStandardMaterial({ map: T.TEX.brick("#c9845a", [3, 7]), roughness: 0.9 }));
  B(CT, [-5.6, 26, -5.6], [5.6, 27, 5.6], M("#f6efe2", 0.6)); B(CT, [-4.6, 27, -4.6], [4.6, 31, 4.6], M("#f6efe2", 0.6));
  for (let k = -1; k <= 1; k += 2) B(CT, [k * 3.5 - 0.6, 27, 4.55], [k * 3.5 + 0.6, 31, 4.7], M("#2c3c4c", 0.2));
  add(CT, new THREE.ConeGeometry(6.6, 7, 4), M("#3f6a5a", 0.6), 0, 34.5, 0).rotation.y = Math.PI / 4;
  const face = add(CT, new THREE.CylinderGeometry(3, 3, 0.3, 32), new THREE.MeshStandardMaterial({ map: T.ctex("clockface", 256, 256, (g) => { g.fillStyle = "#fbf6e8"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.strokeStyle = "#2b2b33"; g.lineWidth = 10; g.stroke(); g.fillStyle = "#2b2b33"; for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; g.fillRect(124 + Math.sin(a) * 100, 120 - Math.cos(a) * 100, 8, 16); } }), roughness: 0.4 }), 0, 20, 5.1); face.rotation.x = Math.PI / 2; face.rotation.y = Math.PI;
  const hand1 = B(CT, [-0.12, 0, 5.3], [0.12, 2.3, 5.4], M("#2b2b33", 0.4)); hand1.position.y = 20; hand1.geometry.translate(0, 1.1, 0); const hand2 = B(CT, [-0.1, 0, 5.32], [0.1, 1.6, 5.42], M("#2b2b33", 0.4)); hand2.position.y = 20; hand2.geometry.translate(0, 0.8, 0); hand2.rotation.z = -2;
  // founder statue in a fountain (centre)
  add(S, new THREE.CylinderGeometry(7, 7.4, 1.2, 32), M("#d8d2c4", 0.7), 0, 0.6, 0); const water = add(S, new THREE.CylinderGeometry(6.4, 6.4, 0.2, 32), M("#5ab0d8", 0.15, { metalness: 0.2 }), 0, 1.05, 0, { cast: false });
  add(S, new THREE.CylinderGeometry(1.8, 2.2, 4, 12), M("#d8d2c4", 0.7), 0, 3, 0); add(S, new THREE.BoxGeometry(4.6, 0.5, 4.6), M("#c8c0b0", 0.7), 0, 5.2, 0);
  sign(S, "OUR FOUNDER", 0, 3.4, 2.15, 2.6, 0.5, "#c8b46a", "#3a2a1a");
  statueAv = makeAvatar({ grey: true, hat: "tophat", scale: 1.2 }); statueAv.root.position.set(0, 5.45, 0); S.add(statueAv.root);
  const stm = M("#b8b4aa", 0.8); statueAv.root.traverse((o) => { if (o.isMesh) o.material = stm; });
  // park corner: lawn, hedges, trees, benches, flower beds
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), M("#5f9f3f", 0.95)); lawn.rotation.x = -Math.PI / 2; lawn.position.set(-30, 0.05, 16); lawn.receiveShadow = true; S.add(lawn);
  for (const [a, b] of [[[-42.5, 0, 6.6], [-17.5, 1.6, 7.6]], [[-42.5, 0, 7.6], [-41.5, 1.6, 25]]]) B(S, a, b, M("#3f7a32", 0.9));
  tree(S, -38, 12, 1.1); tree(S, -27, 22, 1.0, "#5a9a3a"); tree(S, 40, 10, 1.1, "#4f8f3a"); tree(S, 36, 18, 0.9);
  parkBench(S, PARK_BENCH[0], PARK_BENCH[1] - 0.6, 0); parkBench(S, -33, 18, Math.PI / 2);
  for (let k = 0; k < 40; k++) add(S, new THREE.SphereGeometry(0.25, 6, 5), M(["#e05a8a", "#f2c230", "#ffffff", "#8a5ad6"][k % 4], 0.6), -40 + (k % 20) * 1.1, 0.3, 24.5 + (k > 19 ? 0.7 : 0));
  for (const [x, z] of [[-14, 26], [14, 26], [-44, -12], [44, -12], [-14, -30], [14, -30], [44, 14]]) lampPost(S, x, z);
  for (const [x, z, ry] of [[10, 10, -0.6], [-8, -14, 0.5]]) parkBench(S, x, z, ry);
  // the stage (Kindness Week)
  const ST = G(S, STAGE[0], 0, STAGE[1]);
  B(ST, [-9, 0, -4], [9, 2.4, 4], new THREE.MeshStandardMaterial({ map: T.TEX.wood("#a8723f", [4, 2]), roughness: 0.8 }));
  B(ST, [-9.1, 0, 3.9], [9.1, 2.4, 4.1], M("#2f4f7a", 0.7));
  for (let k = 0; k < 4; k++) B(ST, [-2 + 0, 0, 4 + k * 0.6], [2, 2.4 - k * 0.6, 4.6 + k * 0.6], M("#8a5a34", 0.8));
  for (const s of [-1, 1]) B(ST, [s * 8.5 - 0.2, 2.4, -3.8], [s * 8.5 + 0.2, 11, -3.4], M("#e8e2d6", 0.6));
  sign(ST, "KINDNESS WEEK", 0, 9.4, -3.5, 16, 2.4, "#f2c230", "#c9573d");
  for (let k = 0; k < 18; k++) { const f = add(ST, new THREE.ConeGeometry(0.45, 0.9, 3), M(["#d64545", "#f2c230", "#3d7be0", "#3dbf7a", "#8a5ad6"][k % 5], 0.8), -8.2 + k * 0.97, 7.8 - 0.4 * Math.sin((k / 17) * Math.PI), -3.4); f.rotation.x = Math.PI; }
  B(ST, [-0.9, 2.4, 0.4], [0.9, 4.6, 1.4], M("#5a3a22", 0.6)); add(ST, new THREE.CylinderGeometry(0.03, 0.03, 1.2, 5), M("#22262c", 0.4), 0, 5.2, 1.2); add(ST, new THREE.SphereGeometry(0.14, 8, 6), M("#22262c", 0.4), 0, 5.8, 1.25);
  sign(ST, "★", 0, 3.6, 1.42, 1.2, 1.2, "#5a3a22", "#f2c230");
  // bus stop + lemonade stand (north sidewalk of the road)
  const BS = G(S, BUS[0], 0.3, BUS[1]);
  for (const x of [-3.5, 3.5]) B(BS, [x - 0.12, 0, -1.2], [x + 0.12, 5.5, -1.0], M("#3a3f4a", 0.4, { metalness: 0.5 }));
  B(BS, [-4, 5.5, -1.6], [4, 5.8, 1.4], M("#3a3f4a", 0.4, { metalness: 0.5 })); B(BS, [-3.5, 0.6, -1.15], [3.5, 5.4, -1.05], new THREE.MeshStandardMaterial({ color: "#cfe8ff", transparent: true, opacity: 0.3, roughness: 0.05 }), { cast: false });
  B(BS, [-3, 1.5, -0.9], [3, 1.7, 0.2], M("#8a5a34", 0.7)); sign(BS, "BUS 7", 2.8, 6.4, 1.2, 1.6, 0.8, "#2f5f9a", "#ffffff");
  sign(BS, "BE NICE!", -1.5, 3.6, -0.98, 2.4, 2.6, "#f2c230", "#c9573d");
  const LS = G(S, LEM[0], 0.3, LEM[1], 0);
  B(LS, [-1.6, 0, -0.7], [1.6, 2.4, 0.7], new THREE.MeshStandardMaterial({ map: T.TEX.wood("#e8c070", [1, 1]), roughness: 0.8 }));
  sign(LS, "LEMONADE 50¢", 0, 1.5, 0.72, 3.0, 0.9, "#f2e050", "#c9573d");
  for (const x of [-1.5, 1.5]) B(LS, [x - 0.08, 2.4, -0.6], [x + 0.08, 5.0, -0.45], M("#e8c070", 0.7));
  sign(LS, "NO SUGAR!", 0, 4.5, -0.5, 3.2, 0.8, "#ffffff", "#d42a2a");
  lemonPitcher = add(LS, new THREE.CylinderGeometry(0.35, 0.4, 0.9, 12), new THREE.MeshStandardMaterial({ color: "#f8f080", transparent: true, opacity: 0.8, roughness: 0.1 }), -0.7, 2.85, 0.1);
  for (let k = 0; k < 4; k++) add(LS, new THREE.CylinderGeometry(0.15, 0.12, 0.35, 8), M("#f6f4ee", 0.5), 0.3 + k * 0.35, 2.58, 0.25);
  for (let k = 0; k < 5; k++) lemons.push(add(LS, new THREE.SphereGeometry(0.2, 8, 6), M("#f2e030", 0.5), 0.9 + (k % 3) * 0.3, 2.6, -0.3 - (k > 2 ? 0.3 : 0)));
  add(LS, new THREE.CylinderGeometry(0.25, 0.25, 0.5, 10), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4 }), -1.3, 2.65, -0.3); // the sugar jar (pushed away)
  // the narrator's garage (south of the road, open to the road)
  const GA = G(S, GAR[0], 0, GAR[1]);
  B(GA, [-8, 0, -5], [8, 0.1, 6], M("#9a9a92", 0.9));
  B(GA, [-8, 0, 5], [8, 7, 6], new THREE.MeshStandardMaterial({ map: T.TEX.siding("#d8e0e8", [3, 2]), roughness: 0.85 })); // back wall
  for (const s of [-1, 1]) B(GA, [s * 8 - 0.5, 0, -5], [s * 8 + 0.5, 7, 6], new THREE.MeshStandardMaterial({ map: T.TEX.siding("#d8e0e8", [3, 2]), roughness: 0.85 }));
  B(GA, [-8.5, 7, -5.5], [8.5, 7.5, 6.5], M("#5a4a6a", 0.7)); B(GA, [-8, 6, -5.2], [8, 7, -4.8], M("#f6f4ee", 0.6)); // header with the rolled-up door
  B(GA, [-7.8, 6.2, -4.4], [7.8, 6.9, -3.6], M("#e8e6e0", 0.5));
  sign(GA, "COMPLIMENTS $1", 0, 5.3, -4.75, 7, 1.3, "#ffffff", "#2f6a8a", Math.PI);
  B(GA, [-6, 2.4, 4.9], [6, 6, 5], M("#c8a070", 0.8)); // pegboard
  for (let k = 0; k < 8; k++) B(GA, [-5.4 + k * 1.5, 3.2 + (k % 2) * 1.2, 4.7], [-5.1 + k * 1.5, 4.6 + (k % 2) * 1.2, 4.88], M(["#d64545", "#3a3f4a", "#f2c230", "#3d7be0"][k % 4], 0.5));
  B(GA, [5, 0, 1], [7.5, 6, 4.8], M("#7a5a3a", 0.8)); for (let k = 0; k < 4; k++) { B(GA, [5, 1.4 * k + 0.6, 1], [7.5, 1.4 * k + 0.75, 4.8], M("#6a4a2a", 0.8)); for (let q = 0; q < 3; q++) add(GA, new THREE.CylinderGeometry(0.35, 0.35, 0.8, 10), M(["#d64545", "#3dbf7a", "#f6f4ee", "#3d7be0"][(k + q) % 4], 0.5), 5.6 + q * 0.8, 1.4 * k + 1.2, 3); }
  for (let k = 0; k < 3; k++) B(GA, [-7.2, k * 1.6, 1 + k * 0.3], [-5.2, k * 1.6 + 1.6, 3 + k * 0.3], new THREE.MeshStandardMaterial({ map: T.TEX.wood("#c8a070", [1, 1]), roughness: 0.9 }));
  add(GA, new THREE.SphereGeometry(0.3, 10, 8), M("#fff6d0", 0.3, { emissive: "#ffe8a0", emissiveIntensity: 1.5 }), 0, 6.4, 1);
  { const L1 = new THREE.PointLight("#fff0d8", 30, 20, 1.6); L1.position.set(0, 6, 0); GA.add(L1); const L2 = new THREE.PointLight("#fff4e0", 18, 16, 1.7); L2.position.set(0, 4.5, -4.5); GA.add(L2); }
  const tbl = G(GA, 0, 0, -3.4); B(tbl, [-2.6, 2.3, -1.1], [2.6, 2.5, 1.1], M("#2f6a8a", 0.6)); for (const [x, z] of [[-2.3, -0.8], [2.3, -0.8], [-2.3, 0.8], [2.3, 0.8]]) B(tbl, [x - 0.06, 0, z - 0.06], [x + 0.06, 2.3, z + 0.06], M("#3a3f4a", 0.4));
  cashPile = G(GA, 1.6, 2.5, -3.4); B(cashPile, [-0.6, 0, -0.4], [0.6, 0.5, 0.4], M("#3a5a8a", 0.4, { metalness: 0.4 }));
  for (let k = 0; k < 60; k++) { const b = add(cashPile, new THREE.BoxGeometry(0.55, 0.03, 0.25), M("#7ab870", 0.7), (rr() - 0.5) * 0.9, 0.52 + k * 0.03, (rr() - 0.5) * 0.5, { cast: false }); b.rotation.y = rr() * 0.6; money.push(b); }
  for (let k = 0; k < 5; k++) add(GA, new THREE.BoxGeometry(0.5, 0.02, 0.7), M("#fffaf0", 0.8), -1.8 + k * 0.4, 2.52, -3.2 + (k % 2) * 0.2);
  for (let k = 0; k < 6; k++) { const c = add(S, new THREE.BoxGeometry(0.5, 0.02, 0.7), M("#fffaf0", 0.8), 0, -50, 0, { cast: false }); flyCards.push(c); }
  B(GA, [-7.6, 0, -2], [-7.0, 2.6, -1.4], M("#3a5a8a", 0.5)); // mailbox-ish recycling bin
  // Tessa's free stand across the road (north sidewalk)
  const TS = G(S, TESS[0], 0.3, TESS[1], Math.PI);
  B(TS, [-1.8, 0, -0.7], [1.8, 2.3, 0.7], M("#f6c8d8", 0.7)); sign(TS, "FREE COMPLIMENTS ♥", 0, 1.4, -0.72, 3.4, 0.8, "#ffffff", "#e05a8a", Math.PI);
  for (let k = 0; k < 7; k++) { const h = add(TS, new THREE.SphereGeometry(0.35, 10, 8), M(["#e05a8a", "#f2c230", "#8fd0f0"][k % 3], 0.4), -1.5 + k * 0.5, 3.6 + 0.4 * Math.sin(k), 0); add(TS, new THREE.CylinderGeometry(0.01, 0.01, 1.4, 3), M("#ffffff", 0.5), -1.5 + k * 0.5, 2.9, 0); }
  // traffic: a jam of cars on the road east of the plaza + the dad's convertible
  for (let k = 0; k < 6; k++) { const g = convertible(S, 70 + k * 7, 34, -Math.PI / 2, ["#3d7be0", "#3dbf7a", "#f2c230", "#8a5ad6", "#f6f4ee", "#e8601c"][k]); }
  convertible(S, 44, 34, -Math.PI / 2, "#d64545");
  // the pool (west, beyond the road)
  const PL = G(S, POOL[0], 0, POOL[1]);
  B(PL, [-12, 0, -8], [12, 0.4, 8], new THREE.MeshStandardMaterial({ map: T.TEX.tile("#f2f0ea", "#d8e6ee", [6, 4]), roughness: 0.6 }));
  add(PL, new THREE.BoxGeometry(18, 0.1, 10), M("#3aa8d8", 0.1, { metalness: 0.2 }), 0, 0.42, 0, { cast: false });
  B(PL, [-9, 0.4, -5.2], [9, 0.6, -5], M("#2f6a8a", 0.5)); B(PL, [-9, 0.4, 5], [9, 0.6, 5.2], M("#2f6a8a", 0.5));
  const board = B(PL, [-1, 1.4, -8], [1, 1.6, -3.4], M("#f2f0ea", 0.5)); B(PL, [-0.4, 0, -8], [0.4, 1.4, -7.2], M("#c9ccd2", 0.4));
  for (let x = -12; x <= 12; x += 1.2) B(PL, [x - 0.05, 0, 8.2], [x + 0.05, 3.2, 8.3], M("#9aa0a8", 0.4, { metalness: 0.6 }));
  B(PL, [-12, 3.1, 8.2], [12, 3.25, 8.3], M("#9aa0a8", 0.4, { metalness: 0.6 }));
  sign(PL, "POOL CLOSED", 0, 2.2, 8.36, 5, 1.4, "#d42a2a", "#ffffff");
  for (let k = 0; k < 4; k++) { const u = G(PL, -9 + k * 6, 0.4, -6.6); add(u, new THREE.CylinderGeometry(0.06, 0.06, 4, 6), M("#f2f0ea", 0.5), 0, 2, 0); add(u, new THREE.ConeGeometry(2, 1, 10, 1, true), M(k % 2 ? "#e05a8a" : "#f2c230", 0.7, { side: THREE.DoubleSide }), 0, 4, 0); }
  // the broken air conditioner on the flower shop wall + a thermometer
  const ACg = G(S, AC[0], 6.2, AC[1], Math.PI / 2);
  B(ACg, [-1.4, -0.9, 0], [1.4, 0.9, 1.6], M("#d8dce2", 0.5, { metalness: 0.3 })); for (let k = 0; k < 6; k++) B(ACg, [-1.2, -0.7 + k * 0.28, 1.6], [1.2, -0.6 + k * 0.28, 1.65], M("#7a7f88", 0.5));
  acFan = add(ACg, new THREE.BoxGeometry(1.6, 0.12, 0.05), M("#3a3f4a", 0.5), 0, 0, 1.68);
  B(ACg, [-1.0, -1.3, 0.2], [-0.8, -0.9, 0.4], M("#3a3f4a", 0.5));
  const th = G(S, -44.8, 2.6, 3, Math.PI / 2); B(th, [-0.35, 0, 0], [0.35, 3, 0.15], M("#f6f4ee", 0.5)); add(th, new THREE.SphereGeometry(0.28, 10, 8), M("#d42a2a", 0.4), 0, 0.3, 0.2); B(th, [-0.07, 0.4, 0.15], [0.07, 2.8, 0.22], M("#d42a2a", 0.4)); sign(th, "105°", 0, 3.4, 0.1, 1.2, 0.5, "#f6f4ee", "#d42a2a");
  for (let k = 0; k < 14; k++) { const s2 = new THREE.Sprite(new THREE.SpriteMaterial({ color: "#6a6a6a", transparent: true, opacity: 0, depthWrite: false })); s2.scale.setScalar(1.2); S.add(s2); smoke.push(s2); }
  // ice-cream truck
  iceTruck(S, TRUCK[0], TRUCK[1], Math.PI / 2);
  // bikes, helmet with spikes, medal
  bike1 = G(S, 0, 0, 0); bike(bike1, { c: "#3d7be0" }); bike1.visible = false;
  bike2 = G(S, 0, 0, 0); bike(bike2, { chrome: true, s: 1.3, streamers: true }); bike2.visible = false;
  // ---- cast (original characters)
  const A = (name, o) => { const av = makeAvatar(o); av.root.visible = false; S.add(av.root); C[name] = av; return av; };
  A("me", { skin: SKIN.light, shirt: "#f2a03a", pants: "#3a3f5a", hat: "cap", hatColor: "#2f6a8a", top: "tee", outer: "#f2a03a", scale: 0.84, face: "smirk", sole: "#2f6a8a", shoes: "#ffffff", shirtArt: shirtArt("star", "#ffffff") });
  A("tessa", { skin: SKIN.brown, shirt: "#f6c8d8", pants: "#5a7aa8", hat: "hairLong", hatColor: "#2a1c14", top: "long", outer: "#f6c8d8", scale: 0.84, face: "smile", sole: "#e05a8a" });
  A("grump", { skin: SKIN.tan, shirt: "#8a8f9a", pants: "#3a3f4a", hat: "hairShort", hatColor: "#c9ccd2", shoes: "#3a2a20", sole: "#1a1a1e", top: "jacket", outer: "#5a5f6a", face: "angry", belt: "#2a1c14" });
  A("broc", { skin: SKIN.yellow, shirt: "#3dbf7a", pants: "#2f3b52", hat: "spiky", hatColor: "#c0592b", top: "tee", outer: "#3dbf7a", scale: 0.78, face: "angry" });
  A("dad", { shoes: "#2b2b33", sole: "#1a1a1e", skin: SKIN.light, shirt: "#ffffff", pants: "#2b2b33", hat: "hairShort", hatColor: "#5a3a22", top: "jacket", outer: "#3a5a8a", face: "angry", shirtArt: shirtArt("tie", "#c0303a", "#ffffff") });
  A("mayor", { skin: SKIN.dark, shirt: "#ffffff", pants: "#2b2b33", hat: "tophat", hatColor: "#1e1e24", top: "jacket", outer: "#6a2a3a", face: "happy", shirtArt: shirtArt("tie", "#f2c230", "#ffffff"), belt: "#2a1c14" });
  A("busA", { skin: SKIN.light, shirt: "#b768c9", pants: "#5b4a6b", hat: "bun", hatColor: "#d9d9de", glasses: true, top: "long", outer: "#b768c9", face: "smile" });
  A("busB", { skin: SKIN.brown, shirt: "#e8601c", pants: "#2f3b52", hat: "cap", hatColor: "#3a3f4a", top: "hoodie", outer: "#e8601c", face: "smile" });
  A("busC", { skin: SKIN.tan, shirt: "#3d7be0", pants: "#3a3f4a", hat: "hairShort", hatColor: "#1e1a18", top: "jacket", outer: "#2b2b33", face: "smile", shirtArt: shirtArt("tie", "#3d7be0", "#ffffff") });
  A("hot", { skin: SKIN.light, shirt: "#ffffff", pants: "#7a5a3a", hat: "hairShort", hatColor: "#d9d9de", top: "tee", outer: "#ffffff", face: "worried" });
  for (let i = 0; i < 14; i++) extras.push(A(`ex${i}`, { skin: [SKIN.light, SKIN.brown, SKIN.tan, SKIN.dark, SKIN.yellow][i % 5], shirt: ["#4a7a9a", "#d9a03a", "#9a5a8a", "#6a8a4a", "#c94f4f", "#3a6ab0", "#e8b4c8"][i % 7], pants: ["#2f3b52", "#3a3f4a", "#4a3a2a", "#5a7aa8"][i % 4], hat: ["cap", "hairShort", "bun", "hairLong", "spiky"][i % 5], hatColor: ["#3a3f4a", "#2a1c14", "#d9d9de", "#5a3a22", "#1e1a18", "#e0b23a"][i % 6], top: ["long", "jacket", "tee", "hoodie"][i % 4], outer: ["#4a7a9a", "#6a4a2e", "#9a5a8a", "#e05a8a", "#c94f4f", "#2b2b33", "#3dbf7a"][i % 7], scale: i % 3 === 0 ? 0.8 : 1, face: "smile" }));
  // helmet with spikes + medal (children of the narrator's joints)
  helmet = new THREE.Group(); const hm = M("#2b2b33", 0.3, { metalness: 0.5 });
  const dome = add(helmet, new THREE.SphereGeometry(0.78, 18, 10, 0, 6.283, 0, Math.PI / 2), M("#d64545", 0.35)); dome.position.y = 0;
  for (let k = 0; k < 9; k++) { const a = (k / 9) * 6.283, el = k % 2 ? 0.5 : 1.0; const sp = add(helmet, new THREE.ConeGeometry(0.11, 0.55, 6), hm, Math.cos(a) * 0.7 * Math.cos(el * 0.6), 0.25 + Math.sin(el) * 0.4, Math.sin(a) * 0.7 * Math.cos(el * 0.6)); sp.lookAt(Math.cos(a) * 3, 2, Math.sin(a) * 3); sp.rotateX(Math.PI / 2); }
  add(helmet, new THREE.ConeGeometry(0.12, 0.6, 6), hm, 0, 1.0, 0);
  helmet.position.set(0, 1.0, 0); C.me.j.neck.add(helmet); helmet.visible = false;
  medal = new THREE.Group(); const rib = M("#2f6a8a", 0.7);
  for (const s of [-1, 1]) { const r = add(medal, new THREE.BoxGeometry(0.22, 1.0, 0.04), rib, s * 0.35, 0.45, 0); r.rotation.z = s * 0.35; }
  const disc = add(medal, new THREE.CylinderGeometry(0.32, 0.32, 0.08, 20), M("#e0b23a", 0.3, { metalness: 0.8 }), 0, -0.1, 0.03); disc.rotation.x = Math.PI / 2;
  medal.position.set(0, 1.0, 0.56); C.me.j.torso.add(medal); medal.visible = false;
  // ---- pigeons: plaza flock grows through the story; rooftops fill by Friday
  initPigeons(S);
  const fri = tw(126);
  for (let k = 0; k < 36; k++) { const a = rr() * 6.28, d = 9 + rr() * 30; groundPigeon(Math.cos(a) * d, Math.sin(a) * d * 0.8 - 6, 0.02); }
  for (let k = 0; k < 220; k++) { const a = rr() * 6.28, d = 8 + rr() * 38; groundPigeon(Math.cos(a) * d, Math.sin(a) * d * 0.7 - 6, 0.02, fri + rr() * 2); }
  for (let k = 0; k < 120; k++) { const bx = [-49, -35, -21, 21, 35, 49][k % 6] + (rr() - 0.5) * 12; groundPigeon(bx, 12 + (k % 3) * 2.5 + 0.6, -46.2 + 0.1, k < 30 ? 0 : fri + rr() * 2); }
  for (let k = 0; k < 16; k++) { const a = (k / 16) * 6.28; groundPigeon(Math.cos(a) * 6.9, 1.22, Math.sin(a) * 6.9, k < 8 ? 0 : fri); }
  for (const [x, z] of [[-14, 26], [14, 26], [-44, -12], [44, -12], [-14, -30], [14, -30], [44, 14]]) { groundPigeon(x - 1.35, 7.2, z, 0); groundPigeon(x + 1.35, 7.2, z, fri); groundPigeon(x, 7.5, z, fri); }
  for (let k = 0; k < 30; k++) groundPigeon(GAR[0] - 7 + rr() * 14, 7.5, GAR[1] - 5 + rr() * 11, fri + rr());
  for (let k = 0; k < 24; k++) groundPigeon(STAGE[0] - 8 + rr() * 16, 11.05, STAGE[1] - 3.6, tw(159));
  for (let k = 0; k < 30; k++) groundPigeon(TRUCK[0] - 1.5 + rr() * 3, 4.85, TRUCK[1] - 4 + rr() * 6, tw(117) + rr());
  for (let k = 0; k < 20; k++) groundPigeon(POOL[0] - 11 + rr() * 22, 3.3, POOL[1] + 8.25, tw(114) + rr());
  // statue: pigeons all over the founder
  for (const [x, y, z] of [[0, 12.4, 0], [1.5, 9.6, 0.2], [-1.5, 9.6, 0], [0.6, 5.7, 1.6], [-1.6, 5.7, -1.2], [1.8, 5.7, -1.4]]) groundPigeon(x, y, z, 0);
  // landers on the people who complain
  lander(headOf("grump"), tw(8) - 0.1, tw(20) + 0.2);
  for (const [n, k] of [["ex0", 0], ["ex1", 1], ["ex2", 2]]) { lander(headOf(n), 0, 999); lander(shoulderOf(n, 1), 0, 999); lander(shoulderOf(n, -1), 0, 999); }
  lander(headOf("ex3"), 0, tw(53)); // the customer whose pigeon flies away on "flies away"
  lander(headOf("broc"), 0, 999); lander(headOf("dad"), 0, 999);
  lander(headOf("busA"), tw(102), 999); lander(headOf("busB"), tw(103), 999); lander(headOf("busC"), tw(104), 999);
  lander(shoulderOf("busA", 1), tw(104) + 0.3, 999);
  lander(headOf("hot"), tw(112), 999);
  for (let i = 4; i < 14; i++) { lander(headOf(`ex${i}`), tw(114) + (i % 5) * 0.15, 999); if (i % 2) lander(shoulderOf(`ex${i}`, 1), tw(126), 999); }
  lander(headOf("tessa"), 99, 999); // never: Tessa is nice
  // the circling flock over the plaza (always some in the air)
  for (let k = 0; k < 18; k++) { const r0 = 18 + rr() * 16, h = 18 + rr() * 10, ph = rr() * 6.28, sp = 0.25 + rr() * 0.2; pig.push({ s: 1, at: (t) => { const a = ph + t * sp; return { p: V(Math.cos(a) * r0, h + Math.sin(t + ph) * 1.5, Math.sin(a) * r0 - 10), yaw: a + Math.PI, fly: true }; } }); }
}

// ------------------------------------------------------------------ staging
const place = (name, x, y, z, ry = 0) => { const av = C[name]; used.add(name); av.root.visible = true; av.root.position.set(x, y, z); av.root.rotation.set(0, ry, 0); return av; };
const actor = (name, x, y, z, ry, keys, t, o = {}) => { const av = place(name, x, y, z, ry); act(av, keys, t, { t, blinkSeed: name.length * 1.3 + (o.seed ?? 0), cycle: o.cycle, speed: o.speed, talk: o.talk, look: o.look, add: o.add }); return av; };
const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const talking = (t, a, b) => (t > tw(a) && t < tw(b) ? 0.6 + 0.4 * Math.sin(t * 17) : 0);
const clap = (t, k = 1) => ({ rs: [0, 0.35 * Math.max(0, Math.sin(t * 14)) * k, 0], ls: [0, -0.35 * Math.max(0, Math.sin(t * 14)) * k, 0] });
const SIT = (av) => 1.75 - 0.5 * av.root.scale.y;

function crowdWalkers(t, list, cx, cz, r) { list.forEach((n, i) => { const a = (i / list.length) * 6.28 + t * 0.05 * (i % 2 ? 1 : -1), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.6; actor(n, x, 0, z, a + (i % 2 ? Math.PI / 2 : -Math.PI / 2), track([0, "walk", "smile"]), t, { cycle: "walk", seed: i, speed: 0.7 }); }); }

const SC = {
  park(t) { // the rule: a grump complains on a bench, a pigeon lands, he says something nice, it leaves; statues of grumps
    actor("grump", PARK_BENCH[0], SIT(C.grump), PARK_BENCH[1] - 0.3, 0, track([0, "sit", "angry"], [tw(12), "sit", "angry"], [tw(17), "sit", "worried"], [tw(19), "sit", "happy", { ease: "back" }]), t, { talk: talking(t, 3, 7) + talking(t, 17, 21), add: t > tw(12) && t < tw(16) ? { rs: [-2 - 0.4 * Math.sin(t * 16), 0, -0.4], ls: [-2 + 0.4 * Math.sin(t * 16), 0, 0.4] } : undefined });
    [["ex0", -28, 10, 0.5], ["ex1", -24.5, 9.5, -0.3], ["ex2", -13, 12, -0.8]].forEach(([n, x, z, ry], i) => actor(n, x, 0, z, ry, track([0, "idle", "angry"]), t, { seed: i }));
    crowdWalkers(t, ["ex7", "ex8", "ex9"], -6, 14, 8);
  },
  garage(t) { // the compliment business
    const [gx, gz] = GAR;
    const intro = t < tw(41);
    actor("me", gx, 0, gz - 1.6, Math.PI, intro ? track([0, "idle", "smirk"], [tw(36), "point", "wink", { ease: "back" }]) : t < tw(56) ? track([0, "armsUp", "grin", { ease: "back" }], [tw(45), "reachOut", "smile"], [tw(48), "talk", "happy"], [tw(52), "cheer", "grin"]) : t < tw(69) ? track([0, "think", "sleepy"], [tw(59), "talk", "smile"], [tw(64), "point", "smirk"]) : t < tw(78) ? track([0, "idle", "shock"], [tw(75), "point", "angry", { ease: "back" }]) : track([0, "think", "smirk"]), t, { talk: talking(t, 48, 51) + talking(t, 59, 63) });
    if (t >= tw(45) && t < tw(56)) actor("ex3", gx - 0.6, 0, gz - 5.6, 0, track([0, "idle", "worried"], [tw(45), "reachOut", "worried"], [tw(48), "idle", "worried"], [tw(53), "cheer", "happy", { ease: "back" }]), t);
    if (t >= tw(59) && t < tw(64)) actor("broc", gx - 0.4, 0, gz - 5.4, 0, track([0, "point", "angry"], [tw(62), "stomp", "angry"]), t, { talk: talking(t, 61, 64) });
    // the card flies from the narrator's hand to the customer at "read out loud"
    flyCards.forEach((c, k) => { const u = (t - tw(45) - k * 0.08) / 0.5; c.visible = k === 0 && u > 0 && u < 1 && t < tw(48); if (c.visible) { c.position.set(gx + 0.2 - 0.6 * u, 2.7 + Math.sin(u * Math.PI) * 0.6, gz - 3.4 - 2.2 * u); c.rotation.set(u * 2, u, 0); } });
    money.forEach((b, k) => (b.visible = k < 6 + Math.floor(54 * smooth(tw(56), tw(141), t))));
  },
  traffic(t) { actor("dad", 44.1, 1.0, 34, -Math.PI / 2, track([0, "sit", "angry"], [tw(67), "sit", "angry", { add: undefined }]), t, { talk: talking(t, 65, 69), add: { rs: [-1.3 + 0.15 * Math.sin(t * 9), 0, 0], ls: [-1.3, 0, 0] } }); },
  tessa(t) { // across the road: free compliments, a line of happy customers, pigeons leaving
    const [tx, tz] = TESS;
    actor("tessa", tx, 0.3, tz - 1.4, 0, track([0, "wave", "happy"], [tw(73), "talk", "smile"], [tw(76), "hugBig", "happy", { ease: "back" }]), t, { talk: talking(t, 73, 77) });
    ["ex4", "ex5", "ex6"].forEach((n, i) => actor(n, tx + 2.6 + i * 1.5, 0.3, tz + 0.6 + i * 0.5, -Math.PI / 2 - 0.3, track([0, "idle", "smile"], [tw(73) + i * 0.2, "cheer", "happy", { ease: "back" }]), t, { seed: i }));
    actor("me", GAR[0], 0, GAR[1] - 1.6, Math.PI, track([0, "idle", "shock"], [tw(75), "point", "angry", { ease: "back" }]), t);
  },
  bus(t) { // the sour lemonade at the bus stop
    const [lx, lz] = LEM, [bx, bz] = BUS;
    actor("me", lx, 0.3, lz - 1.5, 0, track([0, "idle", "smirk"], [tw(93), "reachOut", "smirk"], [tw(95), "point", "grin"], [tw(100), "laughPoint", "laugh", { ease: "back" }]), t, { talk: talking(t, 93, 97) });
    const sour = (i) => track([0, "idle", "smile"], [tw(97) + i * 0.15, "hold", "neutral"], [tw(99) + i * 0.15, "shrug", "angry", { ease: "back" }], [tw(102 + i), "facepalm", "angry"]);
    [["busA", bx - 2, bz + 1.2], ["busB", bx + 0.5, bz + 1.4], ["busC", bx + 3, bz + 1.1]].forEach(([n, x, z], i) => actor(n, x, 0.3, z, 0.7, sour(i), t, { seed: i, talk: talking(t, 99, 102) }));
    lemons.forEach((l, k) => { const u = smooth(tw(95) + k * 0.08, tw(95) + k * 0.08 + 0.3, t); l.position.set(0.9 + (k % 3) * 0.3 - 1.6 * u, 2.6 + Math.sin(u * Math.PI) * 0.8 + 0.3 * u, -0.3 - (k > 2 ? 0.3 : 0) + 0.4 * u); l.visible = u < 0.98; });
  },
  heat(t) { // heat wave montage: the AC dies, the pool closes, the truck runs out
    const [ax, az] = AC;
    actor("hot", ax + 3, 0, az + 0.5, -Math.PI / 2 + 0.6, track([0, "lookUp", "worried"], [tw(112), "shrug", "angry", { ease: "back" }]), t, { talk: talking(t, 112, 114), add: { ls: [-2.4 + 0.3 * Math.sin(t * 20), 0, 0.3] } });
    acFan.rotation.z = t < tw(113) ? t * 30 : tw(113) * 30 + 0.3 * Math.sin(t * 40) * Math.max(0, 1 - (t - tw(113)));
    smoke.forEach((s, k) => { const age = ((t - tw(113)) * 0.9 + k * 0.17) % 2.2; s.visible = t > tw(113); s.position.set(ax + 1.2 + age * 0.6, 6.8 + age * 2.2, az + Math.sin(k) * 0.4); s.scale.setScalar(0.8 + age * 1.4); s.material.opacity = 0.55 * (1 - age / 2.2); });
    [["ex4", POOL[0] - 7.5, POOL[1] + 10, 0], ["ex5", POOL[0] - 5, POOL[1] + 10.6, 1], ["ex6", POOL[0] + 5.5, POOL[1] + 10.2, 2]].forEach(([n, x, z, i]) => actor(n, x, 0, z, Math.PI, track([0, "sad", "sad"], [tw(115) + i * 0.1, "shrug", "angry", { ease: "back" }]), t, { seed: i }));
    [["ex10", TRUCK[0] + 3, TRUCK[1] - 6, 0], ["ex11", TRUCK[0] + 0.2, TRUCK[1] - 6.6, 1], ["ex12", TRUCK[0] - 2.4, TRUCK[1] - 6.2, 2]].forEach(([n, x, z, i]) => actor(n, x, 0.3, z, face(x, z, TRUCK[0] + 2.5, TRUCK[1]), track([0, "idle", "surprised"], [tw(121) + i * 0.1, "stomp", "angry", { ease: "back" }]), t, { seed: i, talk: talking(t, 121, 126) }));
  },
  friday(t) { // the town covered in birds; counting money; then the bikes
    const k = smooth(tw(126), tw(127), t);
    [["ex4", -10, 12], ["ex5", 12, 14], ["ex6", -18, -16], ["ex10", 16, -8], ["ex11", -4, -22], ["ex12", 6, 20], ["ex13", -30, 0], ["ex7", 30, 4], ["ex8", -12, -4], ["ex9", 20, 22]].forEach(([n, x, z], i) => actor(n, x, 0, z, i * 1.3, track([0, "sad", "angry"]), t, { seed: i }));
    if (t < tw(142)) actor("me", GAR[0], 0, GAR[1] - 1.6, Math.PI, track([0, "cheer", "laugh"], [tw(138), "armsUp", "grin", { ease: "back" }]), t);
    money.forEach((b, i) => (b.visible = true));
  },
  bikes(t) {
    const ride = (bk, x0, sp) => { const x = x0 + sp * (t - tw(142)); bk.visible = true; bk.position.set(x, 0, -10.5); bk.rotation.y = Math.PI / 2; return x; };
    let x;
    if (t < tw(147)) { bike2.visible = false; x = ride(bike1, 8, 5); }
    else { bike1.visible = false; x = ride(bike2, -6, 6); }
    const big = t >= tw(147), h = big ? 2.5 : 1.83;
    actor("me", x - (big ? 0.45 : 0.35), h, -10.5, Math.PI / 2, track([0, "sit", "grin"], [tw(147), "sit", "laugh"], [tw(151), "sit", "determined"], [tw(156), "sit", "smirk"]), t, { add: { rs: [-1.45, 0, -0.1], ls: [-1.45, 0, 0.1], torso: [0.35, 0, 0] } });
    helmet.visible = t >= tw(151);
  },
  stage(t) {
    const [sx, sz] = STAGE;
    const climb = smooth(tw(163), tw(166), t), across = smooth(tw(166), tw(168), t), onStage = t >= tw(168);
    const mx = sx + 2.4 * across, mz = sz + 7.4 - 3.8 * climb - 2.7 * across, my = 2.4 * climb;
    actor("me", mx, my, mz, onStage ? -0.25 : t < tw(163) ? 0.4 : t < tw(166) ? Math.PI : Math.PI * 0.7, onStage ? track([0, "idle", "proud"], [tw(184), "wave", "happy"], [tw(193), "idle", "neutral"], [tw(200), "shrug", "smirk", { ease: "back" }], [tw(207), "idle", "smirk"], [tw(209), "scared", "shock", { ease: "back" }]) : t < tw(163) ? track([0, "idle", "surprised"], [tw(161), "point", "grin", { ease: "back" }]) : track([0, "walk", "grin"]), t, { cycle: onStage || t < tw(163) ? null : "walk", talk: talking(t, 199, 206), look: t > tw(193) && t < tw(200) ? [0, 0.5] : t > tw(208) ? [0.6 * Math.sin(t * 3), -0.2] : undefined });
    medal.visible = t >= tw(183) + 0.2; helmet.visible = true;
    actor("mayor", sx - 1.4, 2.4, sz + 0.2, 0.3, track([0, "wave", "happy"], [tw(168), "talk", "happy"], [tw(180), "reachOut", "proud", { ease: "back" }], [tw(184), "cheer", "laugh"], [tw(200), "idle", "surprised"], [tw(205), "facepalm", "shock"]), t, { talk: talking(t, 160, 168) + talking(t, 168, 184) });
    // the crowd below the stage, facing it
    const crowd = ["ex4", "ex5", "ex6", "ex7", "ex8", "ex9", "ex10", "ex11", "ex12", "ex13", "busA", "busB", "busC", "grump"];
    crowd.forEach((n, i) => { const x = sx - 9 + (i % 7) * 3, z = sz + 9 + Math.floor(i / 7) * 3.2 + (i % 2) * 0.5; actor(n, x, 0, z, Math.PI + (x - sx) * -0.03, track([0, "idle", "smile"], [tw(184) + (i % 5) * 0.06, "hug", "happy", { ease: "back" }], [tw(190), "idle", "smile"], [tw(202) + (i % 4) * 0.1, "idle", "shock"]), t, { seed: i, add: t > tw(184) && t < tw(190) ? clap(t + i, 1) : undefined }); });
    actor("tessa", sx + 4.5, 0, sz + 7.6, Math.PI - 0.2, track([0, "idle", "neutral"], [tw(188), "idle", "determined"], [tw(206), "idle", "smirk"]), t);
    turnTo = V(mx, my + 3, mz);
  },
};

// ------------------------------------------------------------------ per frame
export function update(ctx, t, s) {
  for (const k of used) C[k].root.visible = false; used = new Set();
  bike1.visible = bike2.visible = false; if (!(s.scene === "bikes" || s.scene === "stage")) helmet.visible = false; medal.visible = false;
  for (const c of flyCards) c.visible = false; for (const s2 of smoke) s2.visible = false;
  turnTo = null;
  const c = ctx.core, u = c.sky.material.uniforms;
  const heat = smooth(tw(104), tw(105) + 0.3, t) * (1 - smooth(tw(126), tw(127), t));
  c.setMood(0, false);
  u.top.value.set("#4f9cf0").lerp(new THREE.Color("#f0a040"), heat); u.hor.value.set("#bfe3ff").lerp(new THREE.Color("#ffe0a0"), heat); c.scene.fog.color.copy(u.hor.value);
  c.sun.color.set("#fff1d8").lerp(new THREE.Color("#ffd080"), heat); c.sun.intensity *= 1 + 0.35 * heat;
  if (t > tw(206)) { const d = smooth(tw(207), tw(212), t); c.sun.intensity *= 1 - 0.45 * d; c.hemi.intensity *= 1 - 0.3 * d; u.top.value.lerp(new THREE.Color("#3a4a6a"), d * 0.7); }
  SC[s.scene](t, s, ctx);
  drawPigeons(t);
}

export function SHOTS(ctx) {
  const me = (dy = 3.4) => () => { const p = C.me.root.position; return [p.x, p.y + dy, p.z]; };
  const [gx, gz] = GAR, [sx, sz] = STAGE;
  return [
    // the rule (park)
    { w: 0, scene: "park", at: [-6, 6, -6], dist: 70, yaw: 20, pitch: 18, move: "push", K: 0.2, name: "town" },
    { w: 3, scene: "park", at: [PARK_BENCH[0], 3.6, PARK_BENCH[1]], dist: 12, yaw: 14, pitch: 8, move: "push", K: 0.18, name: "complain" },
    { w: 7, scene: "park", at: [PARK_BENCH[0], 5.6, PARK_BENCH[1]], dist: 7, yaw: -18, pitch: 8, move: "push", K: 0.15, name: "lands" },
    { w: 12, scene: "park", at: [PARK_BENCH[0], 4.2, PARK_BENCH[1]], dist: 7, yaw: 22, pitch: 4, move: "orbitR", K: 0.2, name: "leave" },
    { w: 16, scene: "park", at: [PARK_BENCH[0], 4.4, PARK_BENCH[1]], dist: 6, yaw: -4, pitch: 6, move: "pull", K: 0.15, name: "nice" },
    { w: 21, scene: "park", at: [-23, 4, 10.5], dist: 16, yaw: 12, pitch: 8, move: "slideR", K: 0.2, name: "grumpy" },
    { w: 27, scene: "park", at: [0, 8, 0], dist: 15, yaw: 30, pitch: 4, move: "push", K: 0.18, name: "statue" },
    // the hustle (garage)
    { w: 31, scene: "garage", at: [gx, 4.2, gz - 1.6], dist: 8, yaw: 172, pitch: 4, move: "push", K: 0.18, name: "twelve" },
    { w: 36, scene: "garage", at: [gx, 4, gz - 1.6], dist: 5.4, yaw: 190, pitch: 2, move: "push", K: 0.12, name: "smart" },
    { w: 41, scene: "garage", at: [gx, 4.6, gz - 2], dist: 16, yaw: 180, pitch: 10, move: "pull", K: 0.18, name: "selling" },
    { w: 45, scene: "garage", at: [gx - 0.3, 3.4, gz - 3.4], dist: 5, yaw: 250, pitch: 14, move: "slideL", K: 0.2, name: "dollar" },
    { w: 48, scene: "garage", at: [gx - 0.3, 4, gz - 3.6], dist: 8.5, yaw: 240, pitch: 6, move: "orbitL", K: 0.2, name: "loud" },
    { w: 51, scene: "garage", at: [gx - 0.6, 6.4, gz - 5.6], dist: 10, yaw: 250, pitch: 6, move: "rise", K: 0.25, name: "flies" },
    { w: 56, scene: "garage", at: [gx, 3.8, gz - 2], dist: 12, yaw: 168, pitch: 2, move: "push", K: 0.1, name: "slow" },
    { w: 59, scene: "garage", at: [gx - 0.4, 3.8, gz - 5.4], dist: 6, yaw: 30, pitch: 4, move: "push", K: 0.18, name: "broccoli" },
    { w: 64, scene: "traffic", at: [44, 3, 34], dist: 13, yaw: 230, pitch: 12, move: "slideR", K: 0.2, name: "traffic" },
    { w: 69, scene: "tessa", at: [TESS[0], 4, TESS[1] - 1], dist: 9, yaw: -40, pitch: 6, move: "push", K: 0.18, name: "tessa" },
    { w: 75, scene: "tessa", at: [gx, 4, gz - 1.6], dist: 6, yaw: 196, pitch: 2, move: "push", K: 0.2, name: "free" },
    { w: 78, scene: "garage", at: [gx, 4.1, gz - 1.6], dist: 4.2, yaw: 180, pitch: 0, move: "push", K: 0.15, name: "needed" },
    // the lemonade
    { w: 83, scene: "bus", at: [-15, 3.6, 31], dist: 18, yaw: 10, pitch: 8, move: "push", K: 0.15, name: "lemonade" },
    { w: 93, scene: "bus", at: [LEM[0] - 0.4, 3, LEM[1]], dist: 6, yaw: 60, pitch: 28, move: "push", K: 0.2, name: "sugar" },
    { w: 97, scene: "bus", at: [BUS[0] - 2, 4.6, BUS[1] + 1.2], dist: 5, yaw: 20, pitch: 2, move: "push", K: 0.15, name: "sip" },
    { w: 100, scene: "bus", at: [BUS[0] + 0.5, 4.2, BUS[1] + 1.2], dist: 12, yaw: 14, pitch: 4, move: "pull", K: 0.15, name: "complained" },
    { w: 102, scene: "bus", at: [BUS[0] - 2, 5.4, BUS[1] + 1.2], dist: 4.4, yaw: 24, pitch: 6, move: "shake", K: 0.15, name: "p1" },
    { w: 103, scene: "bus", at: [BUS[0] + 0.5, 5.4, BUS[1] + 1.4], dist: 4.4, yaw: 40, pitch: 6, move: "shake", K: 0.15, name: "p2" },
    { w: 104, scene: "bus", at: [BUS[0] + 3, 5.4, BUS[1] + 1.1], dist: 4.4, yaw: 30, pitch: 6, move: "shake", K: 0.15, name: "p3" },
    // heat wave
    { w: 105, scene: "heat", at: [-10, 10, 8], dist: 60, yaw: 330, pitch: 6, move: "push", K: 0.15, filter: "saturate(1.25) contrast(1.05)", name: "heat" },
    { w: 110, scene: "heat", at: [AC[0] + 1.5, 5, AC[1] + 0.5], dist: 10, yaw: 70, pitch: 6, move: "push", K: 0.2, filter: "saturate(1.25)", name: "ac" },
    { w: 114, scene: "heat", at: [POOL[0], 3, POOL[1] + 9], dist: 15, yaw: 10, pitch: 10, move: "push", K: 0.18, filter: "saturate(1.25)", name: "pool" },
    { w: 117, scene: "heat", at: [TRUCK[0], 3.8, TRUCK[1] - 4.5], dist: 13, yaw: 280, pitch: 8, move: "slideL", K: 0.2, filter: "saturate(1.25)", name: "truck" },
    // Friday: covered in birds
    { w: 126, scene: "friday", at: [0, 4, -12], dist: 84, yaw: 10, pitch: 30, move: "push", K: 0.15, name: "covered" },
    { w: 135, scene: "friday", at: [gx + 0.8, 3.6, gz - 2.6], dist: 7, yaw: 150, pitch: 16, move: "push", K: 0.2, name: "sold" },
    { w: 142, scene: "bikes", follow: me(2.6), dist: 11, yaw: 20, pitch: 6, move: "hold", K: 0, name: "bike" },
    { w: 147, scene: "bikes", follow: me(3), dist: 13, yaw: 330, pitch: 8, move: "hold", K: 0, name: "better" },
    { w: 151, scene: "bikes", follow: me(4.3), dist: 5.5, yaw: 60, pitch: 6, move: "hold", K: 0, name: "spikes" },
    // Saturday: the stage
    { w: 159, scene: "stage", at: [sx, 5, sz + 2], dist: 34, yaw: 8, pitch: 10, move: "push", K: 0.18, name: "saturday" },
    { w: 168, scene: "stage", at: [sx - 1.4, 6.6, sz + 0.2], dist: 6, yaw: 20, pitch: 2, move: "push", K: 0.12, name: "kinder" },
    { w: 178, scene: "stage", at: [sx + 2, 6.2, sz + 0.8], dist: 6.5, yaw: 40, pitch: 4, move: "push", K: 0.18, name: "medal" },
    { w: 184, scene: "stage", at: [sx, 4, sz + 10], dist: 9, yaw: 180, pitch: 20, move: "pull", K: 0.15, name: "clapped" },
    { w: 188, scene: "stage", at: [sx + 4.5, 4.3, sz + 7.6], dist: 5.5, yaw: 190, pitch: 4, move: "push", K: 0.2, name: "stared" },
    { w: 193, scene: "stage", at: [sx + 2.4, 5.8, sz + 0.9], dist: 4.6, yaw: 340, pitch: 10, move: "push", K: 0.12, name: "looked" },
    { w: 200, scene: "stage", at: [sx + 2.4, 6.4, sz + 0.9], dist: 5, yaw: 10, pitch: 2, move: "push", K: 0.2, name: "really" },
    { w: 206, scene: "stage", at: [sx - 8, 8, sz + 2], dist: 46, yaw: 20, pitch: 18, move: "push", K: 0.2, name: "every" },
    { w: 210, scene: "stage", at: [sx + 2.4, 6.2, sz + 0.9], dist: 7.5, yaw: 0, pitch: 4, move: "push", K: 0.3, name: "turned" },
  ];
}
