// Episode 06: The Loud Heart. "In my town, when you get nervous, everyone can hear your heartbeat."
// Told by Rudy (first person). Places: CLASS (x 400), HALL (x 300), the SEA (ferry at the origin, cliffs + lighthouse to
// the west, rocks ahead-left, open water east), the HARBOR at dusk (x -400, a second, docked ferry).
// Rule made visible: every nervous heart throws pink "sound rings" from the chest (lub-dub), sized by how scared you are;
// Rudy's are huge. In the fog his rings run over the water, hit the cliffs and come back cyan (the echo); the east stays silent.
import * as THREE from "three";
import { makeAvatar, SKIN, shirtArt } from "/kit/20_r6.js";
import { track, act } from "/kit/25_anim.js";
import * as T from "/kit/45_town.js";
import * as D from "/kit/46_detail.js";
import { ease } from "/kit/40_cam.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CLASS = 400, HALL = 300, HX = -400, DECK = 2.4;
const smooth = (a, b, t) => ease((t - a) / (b - a));
let W = {};
const tw = (i) => W[i];
export const coreOpts = {};
let C = {}, used = new Set(), sea, seaG, ship, dock, ringsPool = [], flatPool = [], echoPool = [], lhLamp, lhBeam, lhLight, mist, lockerDoor, papers = [], harborLamps = [], gulls = [], rocksNear;
let core;

// ------------------------------------------------------------------ helpers
const M = (c, r = 0.7, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...o });
const add = (p, geo, m, x, y, z, o = {}) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = o.cast ?? true; k.receiveShadow = true; p.add(k); return k; };
let sd = 11; const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);

/** a ferry (bow toward -z), deck at y = DECK. Returns { g, wheel, stack } */
function ferry(parent, { name = "BAYRUNNER" } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const pts = [[-8, -20], [-8, 18], [-6.5, 21], [6.5, 21], [8, 18], [8, -20], [4.5, -27], [0, -30], [-4.5, -27]];
  const hullShape = (inset = 0) => { const s = new THREE.Shape(); pts.forEach(([x, z], i) => { const X = x * (1 - inset / 8), Z = z * (1 - inset / 30); i ? s.lineTo(X, -Z) : s.moveTo(X, -Z); }); return s; };
  const slab = (inset, y0, y1, m) => { const geo = new THREE.ExtrudeGeometry(hullShape(inset), { depth: y1 - y0, bevelEnabled: false }); geo.rotateX(-Math.PI / 2); const k = new THREE.Mesh(geo, m); k.position.y = y0; k.castShadow = k.receiveShadow = true; g.add(k); return k; };
  slab(0.35, -2.2, -0.4, M("#a8322c", 0.6)); // antifouling red below the waterline
  slab(0, -0.4, 1.7, M("#1f3a66", 0.45)); // navy hull
  slab(-0.05, 1.7, 2.15, M("#f4f1ea", 0.5)); // white sheer stripe
  slab(0.25, 2.15, DECK, new THREE.MeshStandardMaterial({ map: T.TEX.wood("#b98a58", [5, 8]), roughness: 0.75 }));
  // name on the bow, both sides
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.1), new THREE.MeshStandardMaterial({ map: D.signTex(name, "#1f3a66", "#ffffff", 512, 80, "800 52px Poppins, sans-serif"), roughness: 0.6 })); p.position.set(s * 7.25, 0.8, -16); p.rotation.y = s * Math.PI / 2 + s * 0.08; g.add(p); }
  // railing: posts + two rails along the outline (open at the stern gate)
  const RM = M("#e8e6e0", 0.35, { metalness: 0.5 });
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length]; if (i === 1 || i === 2 || i === 3) { if (i === 2) continue; }
    const A = V(ax * 0.97, 0, az * 0.985), B = V(bx * 0.97, 0, bz * 0.985), L = A.distanceTo(B), n = Math.max(1, Math.round(L / 2.2));
    for (let k = 0; k <= n; k++) { const P = A.clone().lerp(B, k / n); add(g, new THREE.CylinderGeometry(0.07, 0.07, 2.3, 6), RM, P.x, DECK + 1.15, P.z); }
    for (const y of [1.25, 2.3]) { const r = add(g, new THREE.CylinderGeometry(0.06, 0.06, L, 6), RM, (A.x + B.x) / 2, DECK + y, (A.z + B.z) / 2); r.rotation.z = Math.PI / 2; r.rotation.y = -Math.atan2(B.z - A.z, B.x - A.x); }
  }
  // main cabin with windows, doors, life rings
  const WH = M("#f6f4ee", 0.55), GL = M("#2a4a6a", 0.08, { metalness: 0.6 }), TR = M("#1f3a66", 0.5);
  T.block(g, [-6, DECK, -6], [6, DECK + 5.4, 12], WH);
  T.block(g, [-6.4, DECK + 5.4, -6.6], [6.4, DECK + 5.8, 12.6], TR);
  for (const s of [-1, 1]) for (let k = 0; k < 5; k++) T.block(g, [s * 6 - 0.05, DECK + 2.4, -4.6 + k * 3.3], [s * 6 + 0.05, DECK + 4.4, -2.4 + k * 3.3], GL);
  for (let k = 0; k < 3; k++) T.block(g, [-4.4 + k * 3.4, DECK + 2.4, -6.06], [-2.6 + k * 3.4, DECK + 4.4, -5.96], GL);
  T.block(g, [-1.1, DECK, 11.98], [1.1, DECK + 4, 12.1], M("#1f3a66", 0.5));
  for (const [x, z, ry] of [[-6.05, 8.5, -Math.PI / 2], [6.05, 8.5, Math.PI / 2], [-3.5, 12.05, 0], [3.5, 12.05, 0]]) {
    const ring = new THREE.Group(); ring.position.set(x, DECK + 3.4, z); ring.rotation.y = ry; g.add(ring);
    for (let q = 0; q < 4; q++) { const seg = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.2, 8, 12, Math.PI / 2), M(q % 2 ? "#ffffff" : "#e8601c", 0.5)); seg.rotation.z = q * Math.PI / 2; ring.add(seg); }
  }
  // wheelhouse (open back so the camera can sit inside): front glass, side windows, console, wheel
  const wh = new THREE.Group(); wh.position.set(0, DECK + 5.8, 0); g.add(wh);
  T.block(wh, [-4.2, 0, -4.4], [4.2, 1.6, -4.0], WH); T.block(wh, [-4.2, 5.6, -4.4], [4.2, 6.1, 3.2], WH);
  for (const s of [-1, 1]) { T.block(wh, [s * 4.2 - 0.2, 0, -4.4], [s * 4.2 + 0.2, 1.6, 3.2], WH); T.block(wh, [s * 4.2 - 0.2, 1.6, -4.4], [s * 4.2 + 0.2, 5.6, -3.9], WH); T.block(wh, [s * 4.2 - 0.2, 1.6, 2.8], [s * 4.2 + 0.2, 5.6, 3.2], WH); }
  for (const k of [-1, 1]) T.block(wh, [k * 2.8 - 0.12, 1.6, -4.3], [k * 2.8 + 0.12, 5.6, -4.1], WH);
  const glass = new THREE.MeshStandardMaterial({ color: "#bcd6e8", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false });
  T.block(wh, [-4.1, 1.6, -4.25], [4.1, 5.6, -4.15], glass, { cast: false });
  T.block(wh, [-4.4, 6.1, -4.8], [4.4, 6.35, 3.6], TR);
  T.block(wh, [-3.6, 0, -3.9], [3.6, 1.9, -3.0], M("#3a3f4a", 0.5)); // console
  for (let k = 0; k < 5; k++) add(wh, new THREE.BoxGeometry(0.4, 0.3, 0.05), M(["#3dbf7a", "#f2c230", "#d64545", "#8fd0f0", "#3dbf7a"][k], 0.3, { emissive: ["#3dbf7a", "#f2c230", "#d64545", "#8fd0f0", "#3dbf7a"][k], emissiveIntensity: 0.6 }), -2.4 + k * 0.6, 1.75, -3.0);
  const wheel = new THREE.Group(); wheel.position.set(0, 2.9, -2.75); wh.add(wheel);
  const WD = M("#7a4a2a", 0.5);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.09, 8, 24), WD));
  for (let k = 0; k < 8; k++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 6), WD); sp.rotation.z = (k * Math.PI) / 8; wheel.add(sp); }
  wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 10), M("#c9a040", 0.3, { metalness: 0.7 })).rotateX(Math.PI / 2));
  // mast, radar, horn, stack, flag
  T.block(wh, [-0.12, 6.35, 0.5], [0.12, 10.3, 0.74], M("#e8e6e0", 0.4));
  const radar = T.block(wh, [-1.4, 9.2, 0.5], [1.4, 9.4, 0.74], M("#3a3f4a", 0.4));
  add(wh, new THREE.SphereGeometry(0.2, 10, 8), M("#ff3030", 0.3, { emissive: "#ff2020", emissiveIntensity: 1.2 }), 0, 10.4, 0.62);
  const stack = add(g, new THREE.CylinderGeometry(1.3, 1.5, 5, 18), M("#d64545", 0.5), 0, DECK + 7.5, 8.5);
  add(g, new THREE.CylinderGeometry(1.32, 1.32, 0.9, 18), M("#1d1d22", 0.6), 0, DECK + 9.6, 8.5);
  const flag = add(g, new THREE.PlaneGeometry(1.8, 1.1), new THREE.MeshStandardMaterial({ color: "#3d7be0", side: THREE.DoubleSide, roughness: 0.8 }), 1, DECK + 11, 20.5);
  T.block(g, [-0.07, DECK, 20.4], [0.07, DECK + 11.6, 20.6], M("#e8e6e0", 0.4));
  flag.position.x = 0.95;
  // deck furniture: aft benches, life-jacket box, crates, a lifeboat on davits
  const deck = new THREE.Group(); deck.position.y = DECK - 0.3; g.add(deck);
  D.bench(deck, -3.6, 16, Math.PI); D.bench(deck, 3.6, 16, Math.PI); D.bench(deck, -3.2, -12, 0); D.bench(deck, 3.2, -12, 0);
  T.block(g, [-7.2, DECK, 13.5], [-5.4, DECK + 1.6, 16], M("#e8601c", 0.6)); add(g, new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshStandardMaterial({ map: D.signTex("LIFE JACKETS", "#e8601c", "#ffffff", 512, 128, "800 56px Poppins, sans-serif") }), -5.39, DECK + 1.1, 14.75).rotation.y = Math.PI / 2;
  for (const [x, z] of [[6.2, -15], [6.2, -17.2]]) T.block(g, [x - 0.9, DECK, z - 0.9], [x + 0.9, DECK + 1.8, z + 0.9], new THREE.MeshStandardMaterial({ map: T.TEX.wood("#9a7046", [1, 1]), roughness: 0.8 }));
  add(g, new THREE.CylinderGeometry(0.5, 0.5, 1.5, 12), M("#3a5a8a", 0.5), -6.4, DECK + 0.75, -15);
  const lb = new THREE.Group(); lb.position.set(7.3, DECK + 5, 4); g.add(lb);
  const lbh = add(lb, new THREE.CylinderGeometry(1.0, 1.0, 6, 14, 1, false, 0, Math.PI), M("#f2a03a", 0.5)); lbh.rotation.x = Math.PI / 2; lbh.rotation.y = Math.PI;
  T.block(lb, [-1, 0, -3], [1, 0.12, 3], M("#f6f4ee", 0.5));
  for (const z of [-2.6, 2.6]) T.block(g, [6.1, DECK + 5.4, 4 + z - 0.1], [7.6, DECK + 5.6, 4 + z + 0.1], M("#e8e6e0", 0.4));
  // the bow anchor + mooring bitts
  for (const [x, z] of [[-3, -24], [3, -24], [-5, 19], [5, 19]]) { add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.9, 10), M("#2b2b33", 0.4), x - 0.4, DECK + 0.45, z); add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.9, 10), M("#2b2b33", 0.4), x + 0.4, DECK + 0.45, z); }
  return { g, wheel, stack, flag, radar };
}

/** an animated low-poly sea (flat-shaded facets that roll) */
function makeSea(parent, cx, cz, size = 900, seg = 140, colr = "#2d6a96") {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo.toNonIndexed(), new THREE.MeshStandardMaterial({ color: colr, roughness: 0.35, metalness: 0.1, flatShading: true }));
  m.position.set(cx, 0, cz); m.receiveShadow = true; parent.add(m);
  const p = m.geometry.attributes.position, base = Float32Array.from(p.array);
  m.tick = (t, amp = 1) => {
    for (let i = 0; i < p.count; i++) { const x = base[i * 3] + cx, z = base[i * 3 + 2] + cz; p.array[i * 3 + 1] = amp * (0.32 * Math.sin(x * 0.11 + t * 1.3) + 0.22 * Math.sin(z * 0.17 - t * 1.7) + 0.12 * Math.sin((x + z) * 0.31 + t * 2.3)); }
    p.needsUpdate = true; m.geometry.computeVertexNormals();
  };
  return m;
}

function rock(parent, x, y, z, r, sy = 1, colr = "#6b665e") {
  const geo = new THREE.DodecahedronGeometry(r, 1), a = geo.attributes.position;
  for (let i = 0; i < a.count; i++) { const k = 0.8 + 0.4 * Math.abs(Math.sin(a.getX(i) * 3.1 + a.getY(i) * 1.7 + a.getZ(i) * 2.3)); a.setXYZ(i, a.getX(i) * k, a.getY(i) * k * sy, a.getZ(i) * k); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colr, roughness: 0.95, flatShading: true }));
  m.position.set(x, y, z); m.rotation.y = rr() * 6; m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}

// heart rings: billboarded pink circles out of the chest (lub-dub), and flat rings on the water for the big boom
function ringPools(S) {
  const geo = new THREE.RingGeometry(0.86, 1, 64);
  for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: "#ff5a8a", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); m.visible = false; m.renderOrder = 5; S.add(m); ringsPool.push(m); }
  const fgeo = new THREE.RingGeometry(0.985, 1, 160); fgeo.rotateX(-Math.PI / 2);
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(fgeo, new THREE.MeshBasicMaterial({ color: "#ff6a9a", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); m.visible = false; S.add(m); flatPool.push(m); }
  const clip = [new THREE.Plane(V(1, 0, 0), 62)]; // echo rings only exist east of the cliff face (x > -62)
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(fgeo, new THREE.MeshBasicMaterial({ color: "#5fe0ff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, clippingPlanes: clip })); m.visible = false; S.add(m); echoPool.push(m); }
}
let ringN = 0;
/** throw chest rings for a character: bpm, size (1 = normal nervous), life in s */
function heart(av, t, { bpm = 100, size = 1, life = 0.9, color = "#ff5a8a", t0 = -99, t1 = 99 } = {}) {
  if (t < t0 || t > t1) return;
  av.root.updateMatrixWorld(true); const c = av.j.torso.getWorldPosition(new THREE.Vector3()).add(V(0, 1.0 * av.root.scale.y, 0));
  const per = 60 / bpm;
  for (let k = 0; k < Math.ceil(life / per) + 1; k++) for (const off of [0, 0.2]) {
    const tb = (Math.floor(t / per) - k) * per + off, age = t - tb;
    if (age < 0 || age > life || tb < t0) continue;
    const m = ringsPool[ringN++ % ringsPool.length]; m.visible = true; m.position.copy(c); m.quaternion.copy(core.camera.quaternion);
    const s = size * (0.9 + age * 4.2 * (off ? 0.85 : 1)); m.scale.setScalar(s);
    m.material.color.set(color); m.material.opacity = (off ? 0.55 : 0.85) * Math.pow(1 - age / life, 1.4);
  }
}

// ------------------------------------------------------------------ build
export async function build(ctx) {
  const S = ctx.scene; core = ctx.core;
  core.renderer.localClippingEnabled = true;
  ctx.words.forEach((w, i) => (W[i] = w.start));
  // ================= CLASSROOM (x 400): warm morning light, green chalkboard, posters, plants, globe, fish tank
  T.room(S, { x: CLASS, z: 0, w: 32, d: 30, h: 11, wall: "#efe2c4", front: true, windows: [{ wall: "back", at: -11, w: 5, h: 4.5, y: 3.5 }, { wall: "back", at: 11, w: 5, h: 4.5, y: 3.5 }] });
  T.chalkboard(S, CLASS, 6, -14.6, 12, 5);
  const chalk = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.4), new THREE.MeshBasicMaterial({ map: D.signTex("My Pet Turtle", "rgba(0,0,0,0)", "#f4f1ea", 1024, 380, "700 92px Poppins, sans-serif"), transparent: true })); chalk.position.set(CLASS, 6.4, -14.33); S.add(chalk);
  for (const sx of [-11, 11]) D.windowBlinds(S, CLASS + sx, 6.4, -14.4, 0, 5, 2.6);
  D.teacherDesk(S, CLASS - 10, -10, 0.2); D.bookshelf(S, CLASS + 15.6, -5, -Math.PI / 2, 6); D.bookshelf(S, CLASS + 15.6, 3, -Math.PI / 2, 6);
  D.poster(S, CLASS - 15.65, 6, -6, Math.PI / 2, "BE BRAVE", "#f0a0c0", "#d64545"); D.poster(S, CLASS - 15.65, 6, 2, Math.PI / 2, "OCEANS", "#8fd0f0", "#1f3a66"); D.poster(S, CLASS + 6.5, 9, -14.65, 0, "A+", "#a0e0a0", "#1e7a3a", 1.6, 1.6);
  D.wallClock(S, CLASS - 6, 9.4, -14.6, 0); D.bulletin(S, CLASS - 15.65, 5.6, 9, Math.PI / 2);
  for (let k = 0; k < 6; k++) D.backpackOnHook(S, CLASS + 15.6, 3.2, 8 + k * 1.6 - 4, -Math.PI / 2, ["#d64545", "#3d7be0", "#f2c230", "#3dbf7a", "#8a5ad6", "#e8601c"][k]);
  for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) { T.desk(S, CLASS + c * 7, -3 + r * 6.5, 0, ["#c8a06a", "#b8905a"][(r + c + 2) % 2]); T.chair(S, CLASS + c * 7, -0.4 + r * 6.5, Math.PI, ["#3f6fb0", "#d9a03a", "#3dbf7a"][r]); }
  for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) { add(S, new THREE.BoxGeometry(1.1, 0.06, 1.4), M("#f4f1ea", 0.9), CLASS + c * 7 - 0.4, 2.74, -3 + r * 6.5); add(S, new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), M("#f2c230", 0.5), CLASS + c * 7 + 0.8, 2.77, -3 + r * 6.5).rotation.z = Math.PI / 2; }
  // windowsill plants + globe + fish tank
  for (const x of [-13, -9, 9, 13]) { add(S, new THREE.CylinderGeometry(0.45, 0.35, 0.8, 10), M("#c0592b", 0.8), CLASS + x, 3.5 - 0.6, -13.9); for (let k = 0; k < 4; k++) add(S, new THREE.SphereGeometry(0.42, 8, 6), M("#3f9a3a", 0.8), CLASS + x + (k % 2 - 0.5) * 0.4, 3.5 + 0.2 * k, -13.9 + (k > 1 ? 0.25 : -0.2)); }
  T.block(S, [CLASS - 14, 2.4, -14.4], [CLASS + 14, 2.6, -13.4], M("#e8e2d6", 0.6));
  add(S, new THREE.SphereGeometry(0.7, 16, 12), M("#3d7be0", 0.4), CLASS - 8.2, 4.5, -9.6); add(S, new THREE.CylinderGeometry(0.1, 0.3, 0.6, 8), M("#c9a040", 0.3, { metalness: 0.6 }), CLASS - 8.2, 3.6, -9.6);
  T.block(S, [CLASS + 12, 0, 10], [CLASS + 15.4, 2.6, 12.4], M("#5a3a22", 0.6));
  T.block(S, [CLASS + 12.2, 2.6, 10.2], [CLASS + 15.2, 4.8, 12.2], new THREE.MeshStandardMaterial({ color: "#7fd0ff", roughness: 0.1, transparent: true, opacity: 0.45 }), { cast: false });
  for (let k = 0; k < 3; k++) add(S, new THREE.BoxGeometry(0.35, 0.22, 0.08), M(["#f2a03a", "#e8601c", "#f2c230"][k], 0.4), CLASS + 12.9 + k * 0.8, 3.3 + k * 0.4, 11.2);
  D.ceilingLights(S, CLASS - 8, CLASS + 8, -6, 6, 10.9, 8);
  papers = []; for (let k = 0; k < 10; k++) { const p = add(S, new THREE.PlaneGeometry(0.8, 1.0), new THREE.MeshStandardMaterial({ color: "#fbfaf4", side: THREE.DoubleSide, roughness: 0.9 }), 0, -50, 0, { cast: false }); papers.push(p); }
  // ================= HALLWAY (x 300): teal + mustard lockers, trip poster, trophy case, fountain, clock, banners
  T.room(S, { x: HALL, z: 0, w: 16, d: 64, h: 11, floor: (r) => T.TEX.tile("#ece9e0", "#c9b48a", r), wall: "#e4ead9", front: true, ceiling: true });
  for (const [sx, rot, colr] of [[-7.4, Math.PI / 2, "#2f8f8a"], [7.4, -Math.PI / 2, "#d9a03a"]]) for (const [z0, n] of [[-30, 7], [0, 7]]) { const g = new THREE.Group(); g.position.set(HALL + sx, 0, sx < 0 ? z0 : z0 + 2 * 7 * 1.9 - 13.3); g.rotation.y = rot; S.add(g); T.lockers(g, 0, 0, n, colr); }
  for (let z = -29; z < 28; z += 1.9) for (const sx of [-1, 1]) { add(S, new THREE.BoxGeometry(0.05, 0.6, 0.12), M("#2b2b33", 0.4), HALL + sx * 5.98, 4.2, z + 0.95, { cast: false }); for (let v = 0; v < 3; v++) add(S, new THREE.BoxGeometry(0.04, 0.06, 1.1), M("#1d1d22", 0.6), HALL + sx * 5.98, 6.6 + v * 0.25, z + 0.95, { cast: false }); }
  lockerDoor = new THREE.Group(); lockerDoor.position.set(HALL - 6.0, 0.6, 4.75); S.add(lockerDoor); // hinge at the locker's -z edge, swings out into the hall
  T.block(lockerDoor, [0, 0, 0], [0.1, 6.8, 1.82], new THREE.MeshStandardMaterial({ map: T.TEX.metal("#2f8f8a", [1, 1]), roughness: 0.45, metalness: 0.2 }));
  for (let v = 0; v < 3; v++) T.block(lockerDoor, [0.1, 5.8 + v * 0.25, 0.35], [0.14, 5.86 + v * 0.25, 1.45], M("#1d1d22", 0.6));
  T.block(lockerDoor, [0.1, 3.4, 1.5], [0.2, 3.9, 1.65], M("#c9ccd2", 0.3, { metalness: 0.7 }));
  D.classroomDoor(S, HALL - 7.6, -16, Math.PI / 2, "201", "#8a5ad6"); D.classroomDoor(S, HALL + 7.6, -6, -Math.PI / 2, "204", "#2f5f9a"); D.classroomDoor(S, HALL + 7.6, 22, -Math.PI / 2, "206", "#e8601c");
  D.trophyCase(S, HALL - 7.65, 22, Math.PI / 2); D.fountain(S, HALL + 7.65, 12, -Math.PI / 2);
  D.poster(S, HALL - 7.65, 6.8, -22, Math.PI / 2, "FERRY TRIP!", "#8fd0f0", "#1f3a66", 3.2, 2.4); D.poster(S, HALL + 7.65, 6.5, 2, -Math.PI / 2, "QUIET", "#f2efe8", "#2b2b33"); D.poster(S, HALL + 7.65, 6.5, 30, -Math.PI / 2, "GO TEAM", "#f2c230", "#d64545");
  D.bulletin(S, HALL - 7.65, 5.6, 12, Math.PI / 2); D.wallClock(S, HALL, 9, -31.6, 0);
  for (let k = 0; k < 6; k++) { const p = add(S, new THREE.ConeGeometry(0.5, 1.0, 3), M(["#d64545", "#f2c230", "#3d7be0", "#3dbf7a", "#8a5ad6", "#e8601c"][k], 0.8), HALL - 6 + k * 2.4, 9.8, -8); p.rotation.x = Math.PI; }
  T.block(S, [HALL - 7, 10.25, -8.05], [HALL + 7, 10.32, -7.95], M("#3a3f4a", 0.5));
  D.trashCan(S, HALL + 6.6, -12); D.ceilingLights(S, HALL, HALL, -28, 28, 10.9, 8);
  // ================= SEA: the ferry, cliffs + lighthouse (west), rocks ahead-left, open water east, gulls, mist
  seaG = new THREE.Group(); S.add(seaG);
  sea = makeSea(seaG, 0, -60, 500, 120);
  ship = ferry(seaG);
  // cliffs: a long wall of stacked rocks at x ~ -70, grass on top
  for (let z = -230; z <= 90; z += 14) { const x = -84 - rr() * 8; rock(seaG, x, 6 + rr() * 4, z, 16 + rr() * 6, 1.6, "#7a7064"); rock(seaG, x + 12, 0, z + 6, 8 + rr() * 4, 1.0, "#6b665e"); }
  for (let z = -220; z <= 80; z += 22) { const h = add(seaG, new THREE.SphereGeometry(18, 12, 8, 0, 6.28, 0, Math.PI / 2), M("#5f8a3f", 0.95), -96 - rr() * 6, 26, z); h.scale.set(1, 0.25, 1); }
  // lighthouse on the cliff top
  const LH = new THREE.Group(); LH.position.set(-78, 28, -120); seaG.add(LH);
  for (let k = 0; k < 6; k++) add(LH, new THREE.CylinderGeometry(3.0 - k * 0.22, 3.2 - k * 0.22, 3, 20), M(k % 2 ? "#f4f1ea" : "#c62828", 0.5), 0, 1.5 + k * 3, 0);
  add(LH, new THREE.CylinderGeometry(2.6, 2.6, 0.5, 20), M("#2b2b33", 0.5), 0, 18.2, 0);
  for (let k = 0; k < 10; k++) { const a = (k / 10) * 6.28; add(LH, new THREE.CylinderGeometry(0.06, 0.06, 1.2, 4), M("#2b2b33", 0.4), Math.cos(a) * 2.5, 19, Math.sin(a) * 2.5); }
  lhLamp = add(LH, new THREE.CylinderGeometry(1.4, 1.4, 2.4, 16), new THREE.MeshStandardMaterial({ color: "#fff6c8", emissive: "#ffe28a", emissiveIntensity: 3, roughness: 0.2 }), 0, 19.8, 0);
  add(LH, new THREE.ConeGeometry(1.9, 1.8, 16), M("#c62828", 0.5), 0, 21.9, 0); add(LH, new THREE.SphereGeometry(0.3, 8, 6), M("#2b2b33", 0.4), 0, 23, 0);
  lhBeam = add(LH, new THREE.ConeGeometry(5, 60, 24, 1, true), new THREE.MeshBasicMaterial({ color: "#fff2b0", transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), 0, 19.8, 0, { cast: false });
  lhBeam.geometry.translate(0, -30, 0); lhBeam.rotation.z = Math.PI / 2;
  lhLight = new THREE.PointLight("#ffe28a", 60, 60, 1.6); lhLight.position.set(0, 19.8, 0); LH.add(lhLight);
  T.house(LH, { x: 9, z: -2, w: 8, d: 6, h: 5, wall: "#f4f1ea", roof: "#c62828" }); // the keeper's cottage
  // rocks in the water ahead-left (the danger), a few sharp stacks
  rocksNear = new THREE.Group(); seaG.add(rocksNear);
  for (const [x, z, r, sy] of [[-22, -70, 5, 1.8], [-30, -62, 7, 1.2], [-18, -92, 4, 2.4], [-36, -84, 6, 1.4], [-26, -110, 5, 2], [-14, -52, 3, 1.6], [-40, -40, 6, 1.3]]) rock(rocksNear, x, 0, z, r, sy, "#4a4844");
  // buoys + gulls
  for (const [x, z] of [[18, -40], [24, -110]]) { add(seaG, new THREE.CylinderGeometry(0.8, 1.1, 2.4, 10), M("#d64545", 0.5), x, 0.8, z); add(seaG, new THREE.ConeGeometry(0.5, 1.2, 10), M("#f4f1ea", 0.5), x, 2.6, z); }
  for (let k = 0; k < 6; k++) { const g = new THREE.Group(), w = M("#f4f1ea", 0.6); const l = add(g, new THREE.BoxGeometry(1.1, 0.06, 0.35), w, -0.55, 0, 0), r2 = add(g, new THREE.BoxGeometry(1.1, 0.06, 0.35), w, 0.55, 0, 0); add(g, new THREE.BoxGeometry(0.25, 0.22, 0.7), w, 0, 0, 0); g.userData = { l, r: r2, o: [rr() * 60 - 30, 16 + rr() * 8, -20 - rr() * 60], ph: rr() * 6 }; seaG.add(g); gulls.push(g); }
  // mist: big soft billboards that drift past (visible only in the fog shots)
  mist = new THREE.Group(); seaG.add(mist);
  const mt = T.ctex("mist", 256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  for (let k = 0; k < 40; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mt, color: "#dfe5ea", transparent: true, opacity: 0.0, depthWrite: false })); s.position.set(rr() * 120 - 60, 2 + rr() * 10, -rr() * 160 + 40); s.scale.set(30, 14, 1); s.userData.v = 0.5 + rr(); mist.add(s); }
  // ================= HARBOR at dusk (x -400): long dock, bollards, lamps, sheds, houses on the hill, small boats, docked ferry
  const H = new THREE.Group(); H.position.set(HX, 0, 0); S.add(H);
  makeSea(H, 0, 0, 500, 60, "#2a5a80").tick(0, 0.4);
  dock = ferry(H, { name: "BAYRUNNER" }); dock.g.position.set(14, 0, -6); dock.g.rotation.y = 0;
  const DW = new THREE.MeshStandardMaterial({ map: T.TEX.wood("#9a7046", [6, 2]), roughness: 0.85 });
  T.block(H, [-6, 1.6, -60], [5, 2.2, 40], DW); // pier along z, the ferry ties up on its east side
  for (let z = -58; z <= 38; z += 4) for (const x of [-5.6, 4.6]) add(H, new THREE.CylinderGeometry(0.35, 0.35, 5, 8), M("#5a3a22", 0.9), x, -0.6, z);
  for (const z of [-30, -10, 10]) { add(H, new THREE.CylinderGeometry(0.5, 0.6, 1.0, 10), M("#2b2b33", 0.4), 4, 2.7, z); add(H, new THREE.CylinderGeometry(0.75, 0.75, 0.2, 10), M("#2b2b33", 0.4), 4, 3.2, z); }
  for (const z of [-40, -20, 0, 20]) { const g = new THREE.Group(); g.position.set(-5, 2.2, z); H.add(g); T.block(g, [-0.15, 0, -0.15], [0.15, 6, 0.15], M("#22242a", 0.5)); T.block(g, [-0.15, 6, -0.15], [1.2, 6.25, 0.15], M("#22242a", 0.5)); const b = add(g, new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshStandardMaterial({ color: "#ffd28a", emissive: "#ffb85a", emissiveIntensity: 3 }), 1.05, 5.75, 0); const L = new THREE.PointLight("#ffb85a", 40, 22, 1.7); L.position.set(1.05, 5.4, 0); g.add(L); harborLamps.push(b); }
  for (const [x, z, c] of [[-12, -20, "#9a5a3a"], [-12, 2, "#3a6a8a"], [-12, 24, "#7a8a5a"]]) { const g = new THREE.Group(); g.position.set(x, 0, z); H.add(g); T.block(g, [-7, 0, -9], [7, 8, 9], new THREE.MeshStandardMaterial({ map: T.TEX.siding(c, [3, 2]), roughness: 0.8 })); T.gableRoof(g, 0, 0, 14, 18, 8, 3.4, "#4a3a32"); for (let k = -1; k <= 1; k++) T.block(g, [6.95, 3.4, k * 5 - 1.2], [7.05, 5.6, k * 5 + 1.2], new THREE.MeshStandardMaterial({ color: "#ffd28a", emissive: "#ffb060", emissiveIntensity: 1.6 })); }
  T.block(H, [-20, 0, -60], [-6, 1.8, 50], new THREE.MeshStandardMaterial({ map: T.TEX.concrete("#b8b2a6", [6, 20]), roughness: 0.9 }));
  for (const [x, z, w, r] of [[-34, -30, "#e9e2cf", "#5a4a6a"], [-40, -6, "#cfe3f0", "#3d4f7a"], [-36, 18, "#f2d9a0", "#3b5a46"], [-46, 34, "#f0c9c0", "#6a4a3a"], [-50, -44, "#d9e8c4", "#5a4a6a"]]) T.house(H, { x, z, wall: w, roof: r, rot: Math.PI / 2 });
  T.hill(H, -60, 0, 60, 0.35, -2, "#5f8a3f");
  for (const [z, c] of [[-46, "#d64545"], [26, "#f2c230"]]) { const b = new THREE.Group(); b.position.set(-9, 0.3, z); H.add(b); T.boat(b); b.scale.setScalar(0.8); }
  for (let k = 0; k < 6; k++) T.block(H, [-4.6 + (k % 3) * 1.4, 2.2, -16 - (k >> 1) * 1.4], [-3.4 + (k % 3) * 1.4, 3.4, -15 - (k >> 1) * 1.4], new THREE.MeshStandardMaterial({ map: T.TEX.wood("#9a7046", [1, 1]), roughness: 0.8 }));
  const banner = add(H, new THREE.PlaneGeometry(8, 1.6), new THREE.MeshStandardMaterial({ map: D.signTex("WELCOME HOME!", "#f2c230", "#d64545", 1024, 200, "800 120px Poppins, sans-serif"), side: THREE.DoubleSide }), -2, 8.4, -2); banner.rotation.y = Math.PI / 2;
  for (const z of [-6.2, 2.2]) T.block(H, [-2.1, 2.2, z - 0.1], [-1.9, 9.2, z + 0.1], M("#5a3a22", 0.8));
  ringPools(S);
  // ---- cast (original characters)
  const A = (name, o) => { const av = makeAvatar(o); av.root.visible = false; S.add(av.root); C[name] = av; return av; };
  A("rudy", { skin: SKIN.light, shirt: "#ffffff", pants: "#2f3b52", hat: "hairShort", hatColor: "#8a3a1c", top: "hoodie", outer: "#d9a03a", scale: 0.84, face: "nervous", sole: "#d64545", shoes: "#f2f0ea", backpack: "#3d7be0" });
  A("mom", { skin: SKIN.light, shirt: "#3dbf7a", pants: "#3a3f5a", hat: "hairLong", hatColor: "#8a3a1c", top: "long", outer: "#3dbf7a", face: "worried", sole: "#8a5ad6" });
  A("captain", { skin: SKIN.brown, shirt: "#ffffff", pants: "#1e2a4a", hat: "cap", hatColor: "#1e2a4a", top: "jacket", outer: "#1e2a4a", face: "neutral", belt: "#2a1c14", shirtArt: shirtArt("badge", "#f2c230") });
  A("teacher", { skin: SKIN.tan, shirt: "#ffffff", pants: "#3a3f5a", hat: "bun", hatColor: "#2a1c14", glasses: true, top: "jacket", outer: "#8a3a5a", face: "neutral", belt: "#3a2a20" });
  const kc = [["#d64545", "spiky", "#2a1c14", "hoodie", "#b03030"], ["#3d7be0", "cap", "#2c6e3f", "tee", "#3d7be0"], ["#3dbf7a", "hairShort", "#1e1a18", "jacket", "#e8b23a"], ["#8a5ad6", "hairLong", "#e0b23a", "tee", "#8a5ad6"], ["#f2c230", "bun", "#5a3a22", "long", "#f2c230"], ["#e05a8a", "hairShort", "#c0592b", "hoodie", "#2b2b33"], ["#5a9a6a", "spiky", "#1e1a18", "tee", "#5a9a6a"], ["#c94f4f", "hairLong", "#3a2a20", "jacket", "#3a6ea5"]];
  kc.forEach(([sh, h, hc, top, out], i) => A(`kid${i}`, { skin: [SKIN.yellow, SKIN.tan, SKIN.light, SKIN.brown, SKIN.dark, SKIN.light, SKIN.tan, SKIN.brown][i], shirt: sh, pants: ["#2f3b52", "#3a3f5a", "#4a3a2a"][i % 3], hat: h, hatColor: hc, top, outer: out, scale: 0.8, face: "smile", shirtArt: top === "tee" && i % 2 ? shirtArt("stripes", "#ffffff") : null, sole: ["#d64545", "#2f5f9a", "#3dbf7a"][i % 3] }));
  for (let i = 0; i < 6; i++) A(`par${i}`, { skin: [SKIN.tan, SKIN.dark, SKIN.light, SKIN.brown, SKIN.yellow, SKIN.light][i], shirt: ["#4a7a9a", "#d9a03a", "#9a5a8a", "#6a8a4a", "#c94f4f", "#3a6ab0"][i], pants: ["#2f3b52", "#3a3f4a", "#4a3a2a"][i % 3], hat: ["cap", "hairShort", "bun", "hairLong", "spiky", "hairShort"][i], hatColor: ["#3a3f4a", "#2a1c14", "#d9d9de", "#5a3a22", "#1e1a18", "#e0b23a"][i], top: ["long", "jacket", "tee", "hoodie", "tee", "jacket"][i], outer: ["#4a7a9a", "#6a4a2e", "#9a5a8a", "#e05a8a", "#c94f4f", "#2b2b33"][i], face: "worried" });
}

// ------------------------------------------------------------------ staging helpers
const place = (name, x, y, z, ry = 0) => { const av = C[name]; used.add(name); av.root.visible = true; av.root.position.set(x, y, z); av.root.rotation.set(0, ry, 0); return av; };
const actor = (name, x, y, z, ry, keys, t, o = {}) => { const av = place(name, x, y, z, ry); act(av, keys, t, { t, blinkSeed: name.length * 1.3 + (o.seed ?? 0), cycle: o.cycle, speed: o.speed, talk: o.talk, look: o.look, add: o.add }); return av; };
const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const bob = (t) => 0.12 * Math.sin(t * 1.3);

// seats (desk z0, chair z0 + 2.6 -> kid hips over the seat at z0 + 2.7, thighs resting on the seat top y 1.85)
const SEAT = (r, c) => [CLASS + c * 7, -3 + r * 6.5 + 2.7];
const SY = (av) => 1.86 - 0.5 * av.root.scale.y; // root height so a "sit" pose rests on the seat
const COVER = { rs: [-2.5, 0, -0.5], ls: [-2.5, 0, 0.5], torso: [0.35, 0, 0], neck: [0.3, 0, 0] }; // seated, arms over the head
const RUDY_SEAT = SEAT(2, 1), K1 = SEAT(1, -1), K2 = SEAT(1, 0);

const SC = {
  class(t) {
    const nervousK1 = t < tw(23);
    // the kids at their desks: heads turn to whoever's heart is loudest
    const seats = [[0, -1, "kid4"], [0, 0, "kid5"], [0, 1, "kid6"], [1, 1, "kid7"], [2, -1, "kid0"], [2, 0, "kid2"]];
    const tgt = t < tw(23) ? K1 : t < tw(30) ? [CLASS, -12] : RUDY_SEAT;
    seats.forEach(([r, c, n], i) => {
      const [x, z] = SEAT(r, c), turn = t > tw(7) + 0.2 ? Math.max(-1.2, Math.min(1.2, face(x, z, tgt[0], tgt[1]) - Math.PI)) : 0;
      const look = [-(((turn + Math.PI) % (2 * Math.PI)) - Math.PI) * 0.5, 0];
      const fc = t < tw(7) ? "neutral" : t < tw(37) ? "surprised" : t < tw(43) ? "smirk" : "shock";
      const cov = smooth(tw(43), tw(43) + 0.3, t), add = cov > 0 ? Object.fromEntries(Object.entries(COVER).map(([k, v]) => [k, v.map((q) => q * cov)])) : undefined;
      actor(n, x, SY(C[n]), z, Math.PI, track([0, "sitWrite", fc], [tw(43), "sit", "shock"]), t, { seed: i, look: [turn * 0.8 * (1 - cov), 0], add });
    });
    // kid1: a little nervous (small fast rings), kid2 leans in to hear
    actor("kid1", K1[0], SY(C.kid1), K1[1], Math.PI, track([0, "sit", "nervous"], [tw(14), "sit", "worried"]), t, { seed: 1 });
    if (t < tw(23)) heart(C.kid1, t, { bpm: 130, size: 0.6, life: 0.7 });
    actor("kid3", K2[0], SY(C.kid3), K2[1], Math.PI, track([0, "sit", "neutral"], [tw(15), "sit", "surprised", { ease: "back" }], [tw(21), "sit", "smirk"]), t, { seed: 3, look: [t > tw(15) ? -0.9 : 0, 0] });
    // the presenter at the board: really scared, rings fill the room
    if (t >= tw(23) && t < tw(30)) { actor("kid6", CLASS + 1.5, 0, -11.2, 0.15, track([0, "scared", "nervous"], [tw(26), "hold", "worried"]), t, { seed: 6 }); heart(C.kid6, t, { bpm: 150, size: 1.6, life: 1.2 }); }
    // the teacher
    actor("teacher", CLASS - 9, 0, -7, face(CLASS - 9, -7, RUDY_SEAT[0], RUDY_SEAT[1]), track([0, "idle", "neutral"], [tw(39), "talk", "smile"], [tw(41), "point", "smile", { ease: "back" }], [tw(43) + 0.3, "scared", "shock", { ease: "back" }]), t, { talk: t > tw(40) && t < tw(43) ? 0.6 : 0 });
    // Rudy at the back
    const big = t >= tw(43);
    const rc = smooth(tw(44), tw(44) + 0.3, t);
    actor("rudy", RUDY_SEAT[0], SY(C.rudy), RUDY_SEAT[1], Math.PI, track([0, "sit", "neutral"], [tw(30), "sit", "nervous"], [tw(41) + 0.1, "sit", "shock", { ease: "back" }], [tw(44), "sit", "worried"]), t, { add: rc > 0 ? Object.fromEntries(Object.entries(COVER).map(([k, v]) => [k, v.map((q) => q * rc)])) : undefined });
    heart(C.rudy, t, big ? { bpm: 140, size: 3.4, life: 1.6, t0: tw(43) } : { bpm: 110, size: 0.55, life: 0.7, t0: tw(30) });
    // papers lift off the desks when it booms
    papers.forEach((p, k) => { const on = big && t < tw(46); p.visible = on; if (!on) return; const u = t - tw(43), r = k % 3, c = (k % 3) - 1; p.position.set(CLASS + c * 7 + Math.sin(k) * 1.5 + u * (k % 2 ? 2 : -2), 2.9 + u * (3 + k * 0.3) - u * u * 1.4, -3 + (k % 3) * 6.5 + Math.cos(k) * 1.2); p.rotation.set(u * (2 + k), u * 3, u * (1 + k * 0.4)); });
  },
  hall(t) {
    // Rudy walks the hall; the bully slams a locker; everyone laughs "Drum"
    const z = 10 - 2.2 * (t - tw(46)), walking = t < tw(51);
    actor("rudy", HALL + 1.2, 0, walking ? z : 10 - 2.2 * (tw(51) - tw(46)), Math.PI, walking ? track([0, "walk", "sad"]) : track([0, "walk", "sad"], [tw(51) + 0.12, "scared", "shock", { ease: "back", dur: 0.12 }], [tw(54), "sad", "cry"]), t, { cycle: walking ? "walk" : null, speed: 0.8 });
    heart(C.rudy, t, t < tw(51) ? { bpm: 120, size: 0.8, life: 0.8 } : { bpm: 160, size: 1.5, life: 1.1 });
    const rz = walking ? z : 10 - 2.2 * (tw(51) - tw(46));
    actor("kid0", HALL - 4.8, 0, 3.4, face(HALL - 4.8, 3.4, HALL + 1.2, rz), track([0, "laughPoint", "smirk"], [tw(50), "reachOut", "smirk", { ease: "back" }], [tw(51) + 0.15, "bellyLaugh", "laugh", { ease: "back" }]), t);
    const open = 1 - smooth(tw(50) + 0.15, tw(51), t); lockerDoor.rotation.y = -1.7 * open;
    [["kid1", HALL + 5, -2, 0], ["kid7", HALL + 4.6, -4.6, 1], ["kid4", HALL - 4.2, -6, 2], ["kid5", HALL + 5.2, 4, 3]].forEach(([n, x, zz, i]) => actor(n, x, 0, zz, face(x, zz, HALL + 1.2, rz), track([0, "laughPoint", "laugh"], [tw(47) + i * 0.1, "bellyLaugh", "laugh", { ease: "back" }], [tw(52) + i * 0.1, "laughPoint", "grin"]), t, { seed: i }));
  },
  sea(t, s) {
    const b = bob(t);
    const foggy = t >= tw(64);
    // kids at the bow rail, teacher with them; Rudy alone on the aft bench
    const huddle = t >= tw(88);
    const kids = ["kid0", "kid1", "kid2", "kid3", "kid4", "kid5", "kid6", "kid7"];
    kids.forEach((n, i) => {
      if (!huddle) { const x = -5 + (i % 4) * 3.3, z = -19 - (i >> 2) * 2.6; actor(n, x, DECK + b, z, Math.PI + (i % 2 ? 0.2 : -0.2), track([0, i % 3 ? "cheer" : "point", "happy"], [tw(64) + i * 0.05, "idle", "surprised"], [tw(70) + i * 0.07, "lookUp", "worried"], [tw(80) + i * 0.05, "scared", "nervous", { ease: "back" }]), t, { seed: i }); }
      else { const a = -1.4 + i * 0.4, x = 0 + 4.6 * Math.sin(a), z = -12 + 2.2 * Math.cos(a); actor(n, x, DECK + b, z, face(x, z, 0, -13), track([0, "scared", "nervous"], [tw(93) + i * 0.05, "scared", "shock", { ease: "back" }], [tw(104), "lookUp", "surprised"], [tw(110), "hold", "worried"]), t, { seed: i, look: [t > tw(95) ? 0.6 : 0, 0] }); }
      if (foggy && t < tw(88) && t > tw(70)) heart(C[n], t, { bpm: 120 + i * 6, size: 0.4, life: 0.6 });
    });
    actor("teacher", huddle ? 0 : 3.5, DECK + b, huddle ? -13.2 : -15, huddle ? Math.PI : Math.PI - 0.4, track([0, "talk", "smile"], [tw(70), "hold", "worried"], [tw(88), "hugBig", "worried"]), t);
    // Rudy: aft bench, alone; in the fog, at the rail
    const atRail = t >= tw(91);
    if (!atRail) actor("rudy", -3.6, DECK + b, 15.7, Math.PI, track([0, "sit", "sad"], [tw(64), "sit", "nervous"], [tw(78), "sit", "worried"]), t);
    else actor("rudy", -7, DECK + b, -2, -Math.PI / 2, track([0, "scared", "nervous"], [tw(93), "brace", "worried", { ease: "back" }], [tw(104), "lookUp", "surprised"], [tw(110), "idle", "determined"]), t);
    if (foggy && t < tw(91)) heart(C.rudy, t, { bpm: 120, size: 0.9, life: 0.8 });
    if (atRail) heart(C.rudy, t, { bpm: 96, size: 4.2, life: 2.0, t0: tw(91) });
    // the captain at the wheel
    const turn = smooth(tw(109), tw(112), t);
    actor("captain", 0, DECK + 5.8 + b, -1.4, Math.PI, track([0, "hold", "neutral"], [tw(78), "hold", "worried"], [tw(84), "hold", "nervous"], [tw(104) + 0.15, "hold", "surprised", { ease: "back" }], [tw(108), "hold", "determined"]), t, { look: [t > tw(104) && t < tw(109) ? 0.7 : 0, 0] });
    ship.wheel.rotation.z = -3.2 * turn + 0.05 * Math.sin(t * 1.7);
    // boom rings over the water, echoes come back from the cliffs (only from the west)
    for (const m of flatPool) m.visible = false; for (const m of echoPool) m.visible = false;
    if (t >= tw(93) && t < tw(114)) {
      const per = 60 / 96, n0 = Math.floor((t - tw(93)) / per);
      for (let k = 0; k < 6; k++) {
        const tb = tw(93) + (n0 - k) * per; if (tb < tw(93)) continue; const age = t - tb, R = 6 + age * 34;
        const m = flatPool[k]; m.visible = R < 170; m.position.set(-7, 0.4 + b, -2); m.scale.setScalar(R); m.material.opacity = 0.9 * Math.max(0, 1 - R / 170);
        const e = echoPool[k], rEcho = R; if (rEcho > 2 * 55) { e.visible = rEcho < 230; e.position.set(-7 - 2 * 55, 0.5 + b, -2); e.scale.setScalar(rEcho); e.material.opacity = 0.9 * Math.max(0, 1 - (rEcho - 110) / 120); }
      }
    }
    // the ship drifts east of the rocks once he steers (rocks slide past on the left)
    rocksNear.position.x = -8 * turn; rocksNear.position.z = 30 * turn + 6 * Math.max(0, t - tw(112));
  },
  harbor(t) {
    const P = (x, z) => [HX + x, z];
    const k = smooth(tw(120), tw(121), t);
    // Rudy steps off the ferry onto the pier; kids hug him; mom runs in
    const [rx, rz] = P(1.2, -4);
    actor("rudy", rx, 2.2, rz, Math.PI, track([0, "walk", "neutral"], [tw(120), "idle", "surprised", { ease: "back" }], [tw(124), "idle", "happy"], [tw(128), "hugBig", "proud", { ease: "back" }], [tw(133), "cheer", "laugh", { ease: "back" }]), t, { cycle: t < tw(119) ? "walk" : null });
    heart(C.rudy, t, { bpm: 80, size: 1.2, life: 1.4, color: "#ffb0c8" });
    ["kid0", "kid1", "kid2", "kid3", "kid5", "kid7"].forEach((n, i) => { const a = -1.15 + i * 0.46, x = rx + 3.8 * Math.sin(a), z = rz + 3.2 * Math.cos(a); actor(n, x, 2.2, z, face(x, z, rx, rz), track([0, "idle", "surprised"], [tw(120) + i * 0.08, i % 2 ? "hugBig" : "cheer", "happy", { ease: "back" }], [tw(133) + i * 0.05, "cheer", "laugh", { ease: "back" }]), t, { seed: i }); });
    const mx = rx + 1.8 + 7 * (1 - smooth(tw(124), tw(127) + 0.3, t)), mz = rz - 0.3;
    actor("mom", mx, 2.2, mz, face(mx, mz, rx, rz), track([0, "run", "worried"], [tw(127), "hugBig", "happy", { ease: "back" }]), t, { cycle: t < tw(127) + 0.3 ? "run" : null });
    for (let i = 0; i < 6; i++) { const x = HX - 3.6 + (i % 3) * 2.6, z = rz + 7 + (i >> 1) * 1.8; if (i === 2) continue; actor(`par${i}`, x, 2.2, z, face(x, z, rx, rz), track([0, "wave", "happy"], [tw(124) + i * 0.1, "cheer", "laugh", { ease: "back" }]), t, { seed: i }); }
    actor("teacher", HX + 4.4, 2.2, rz + 3.4, face(HX + 4.4, rz + 3.4, rx, rz), track([0, "idle", "smile"], [tw(124), "cheer", "happy", { ease: "back" }]), t);
    actor("captain", HX + 14, DECK + 5.8, -7.4, Math.PI - 0.9, track([0, "wave", "smile"], [tw(130), "cheer", "happy"]), t);
  },
};

// ------------------------------------------------------------------ per frame
export function update(ctx, t, s) {
  for (const k of used) C[k].root.visible = false; used = new Set();
  for (const m of ringsPool) m.visible = false; for (const m of flatPool) m.visible = false; for (const m of echoPool) m.visible = false; ringN = 0;
  for (const p of papers) p.visible = false;
  const c = ctx.core, u = c.sky.material.uniforms, sc = s.scene;
  const tint = (top, hor) => { u.top.value.set(top); u.hor.value.set(hor); c.scene.fog.color.set(hor); };
  // lighting per place
  if (sc === "class" || sc === "hall") { c.setMood(0, true); tint("#4f9cf0", "#bfe3ff"); c.sun.color.set("#fff1d8"); }
  else if (sc === "sea") {
    const f = smooth(tw(64), tw(70), t) * (1 - 0.65 * smooth(tw(113), tw(119), t)), f2 = s.fog ?? 1;
    c.setMood(0.75 * f, false); c.sun.color.set("#fff1d8");
    u.top.value.set("#4f9cf0").lerp(new THREE.Color("#8d969e"), f); u.hor.value.set("#bfe3ff").lerp(new THREE.Color("#c9cfd4"), f); c.scene.fog.color.copy(u.hor.value);
    c.scene.fog.near = THREE.MathUtils.lerp(80, s.fogNear ?? 2, f); c.scene.fog.far = THREE.MathUtils.lerp(420, 34 * f2, f);
    sea.tick(t, 1 + 0.4 * f);
    sea.material.color.set("#2d6a96").lerp(new THREE.Color("#4a5a66"), f);
    mist.children.forEach((m, i) => { m.material.opacity = 0.55 * f; m.position.x = ((m.position.x + 60 + 0.02 * m.userData.v) % 120) - 60; });
    const lit = 1 - smooth(tw(80), tw(81), t);
    lhLamp.material.emissiveIntensity = 3 * lit + 0.02; lhBeam.visible = lit > 0.02; lhBeam.material.opacity = 0.18 * lit; lhLight.intensity = 60 * lit; lhBeam.rotation.y = t * 1.6;
    ship.flag.rotation.y = 0.25 * Math.sin(t * 5); ship.radar.rotation.y = t * 2.4;
    ship.g.position.y = bob(t); ship.g.rotation.z = 0.012 * Math.sin(t * 1.1);
    gulls.forEach((g) => { const d = g.userData, fl = Math.sin(t * 8 + d.ph) * 0.5; d.l.rotation.z = fl; d.r.rotation.z = -fl; g.position.set(d.o[0] + Math.sin(t * 0.4 + d.ph) * 14, d.o[1] + Math.sin(t + d.ph), d.o[2] + Math.cos(t * 0.4 + d.ph) * 10); g.rotation.y = t * 0.4 + d.ph; g.visible = t < tw(66); });
  } else if (sc === "harbor") {
    c.setMood(0.1, false); tint("#3a4a8a", "#ffb07a"); c.sun.color.set("#ffb070"); c.sun.intensity *= 0.75; c.hemi.intensity *= 0.8;
    c.scene.fog.near = 30; c.scene.fog.far = 240;
    dock.flag.rotation.y = 0.25 * Math.sin(t * 5); dock.radar.rotation.y = t * 2.4;
  }
  SC[sc](t, s, ctx);
}

export function SHOTS(ctx) {
  const at = (name, dy = 2.6) => () => { const p = C[name].root.position; return [p.x, p.y + dy, p.z]; };
  const [rx, rz] = RUDY_SEAT, HR = [HX + 1.2, -4];
  return [
    // classroom: the rule
    { w: 0, scene: "class", at: [K1[0], 3.9, K1[1]], dist: 6.5, yaw: 200, pitch: 8, move: "push", K: 0.22, name: "hook" },
    { w: 7, scene: "class", at: [CLASS - 1, 3.2, 5], dist: 15, yaw: 186, pitch: 16, move: "pull", K: 0.15, name: "everyone" },
    { w: 12, scene: "class", at: [(K1[0] + K2[0]) / 2, 3.7, K1[1]], dist: 15, yaw: 192, pitch: 9, move: "slideL", K: 0.18, name: "neighbor" },
    { w: 23, scene: "class", at: [CLASS + 1.5, 4, -11], dist: 13, yaw: 8, pitch: 4, move: "push", K: 0.2, name: "scared" },
    { w: 27, scene: "class", at: [CLASS, 2.8, 6], dist: 18, yaw: 180, pitch: 22, move: "push", K: 0.15, name: "room" },
    { w: 30, scene: "class", at: [rx, 3.9, rz], dist: 6.5, yaw: 200, pitch: 8, move: "push", K: 0.22, name: "mine" },
    { w: 38, scene: "class", at: [CLASS - 9, 4.8, -7], dist: 8, yaw: 32, pitch: 2, move: "push", K: 0.18, name: "teacher" },
    { w: 43, scene: "class", at: [rx - 1, 4, rz - 2], dist: 15, yaw: 205, pitch: 10, move: "shake", K: 0.2, name: "BOOM" },
    // hallway
    { w: 46, scene: "hall", follow: (t) => [HALL + 0.6, 3.6, 10 - 2.2 * (Math.min(t, tw(51)) - tw(46)) - 2], dist: 12, yaw: 186, pitch: 14, move: "pull", K: 0.15, name: "drum" },
    { w: 50, scene: "hall", at: [HALL - 3, 3.8, 4], dist: 10, yaw: 120, pitch: 4, move: "push", K: 0.18, name: "slam" },
    { w: 55, scene: "hall", follow: at("rudy", 3.4), dist: 6.5, yaw: 168, pitch: 2, move: "push", K: 0.18, name: "pound" },
    // the ferry trip (sunny)
    { w: 58, scene: "sea", at: [0, 4, -4], dist: 70, yaw: 40, pitch: 22, move: "push", K: 0.2, name: "ferry" },
    { w: 62, scene: "sea", at: [-0.5, DECK + 3, -20], dist: 18, yaw: 200, pitch: 16, move: "orbitL", K: 0.2, name: "trip" },
    // the fog
    { w: 64, scene: "sea", at: [0, 5, -6], dist: 44, yaw: 120, pitch: 10, move: "pull", K: 0.15, fog: 2.2, name: "fog" },
    { w: 70, scene: "sea", at: [0, DECK + 3.5, -21], dist: 12, yaw: 0, pitch: 6, move: "push", K: 0.12, fog: 0.75, name: "front" },
    { w: 78, scene: "sea", at: [-78, 46, -120], dist: 36, yaw: 60, pitch: -6, move: "push", K: 0.2, fog: 2.4, name: "lighthouse" },
    { w: 82, scene: "sea", at: [0, DECK + 10.4, -1.4], dist: 4.8, yaw: 200, pitch: -2, fov: 50, move: "push", K: 0.12, fog: 1, name: "captain" },
    { w: 85, scene: "sea", at: [-22, 3, -66], dist: 20, yaw: 80, pitch: 4, move: "slideR", K: 0.2, fog: 3, name: "rocks" },
    { w: 88, scene: "sea", at: [0, DECK + 3, -12.5], dist: 13, yaw: 196, pitch: 22, move: "push", K: 0.15, fog: 1.2, name: "quiet" },
    { w: 91, scene: "sea", at: [-7, DECK + 4.2, -2], dist: 5.2, yaw: 255, pitch: 0, move: "push", K: 0.2, fog: 1.2, name: "exceptme" },
    { w: 93, scene: "sea", at: [-7, DECK + 3, -2], dist: 24, yaw: 250, pitch: 30, move: "pull", K: 0.3, fog: 3, name: "pounding" },
    { w: 99, scene: "sea", at: [-52, 0, -10], dist: 150, yaw: 180, pitch: 62, fov: 46, move: "push", K: 0.1, fog: 9, fogNear: 40, name: "cliffs" },
    { w: 104, scene: "sea", at: [0, DECK + 10.4, -1.4], dist: 5, yaw: 205, pitch: 0, fov: 48, move: "push", K: 0.15, fog: 1, name: "heard" },
    { w: 109, scene: "sea", at: [0, DECK + 9.6, -2.2], dist: 5.6, yaw: 200, pitch: 6, fov: 48, move: "orbitR", K: 0.25, fog: 1, name: "steered" },
    { w: 112, scene: "sea", at: [-4, 4, -10], dist: 46, yaw: 300, pitch: 12, move: "slideL", K: 0.2, fog: 2.6, name: "silence" },
    // home
    { w: 114, scene: "harbor", at: [HX + 4, 6, -6], dist: 64, yaw: 140, pitch: 12, move: "push", K: 0.18, name: "harbor" },
    { w: 120, scene: "harbor", at: [HR[0], 4.8, HR[1] + 1], dist: 14, yaw: 168, pitch: 12, move: "orbitL", K: 0.2, name: "turnsout" },
    { w: 128, scene: "harbor", at: [HR[0] - 0.6, 5.4, HR[1]], dist: 7.5, yaw: 200, pitch: 4, move: "push", K: 0.15, name: "onlyone" },
    { w: 133, scene: "harbor", at: [HR[0], 4.6, HR[1] + 2], dist: 18, yaw: 160, pitch: 20, move: "rise", K: 0.3, name: "home" },
  ];
}
