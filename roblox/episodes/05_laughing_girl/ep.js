// Episode 05: The Laughing Girl. "In this town, every time you laugh, flowers grow where you're standing."
// Places: MAPLE ST (Dot's cottage yard, sidewalk, a parked car, shops), then the FARM VALLEY (cracked dry fields, dead
// stalks, barn, silo, hills) that turns green when Dot laughs. Flowers are instanced and grow on spawn times tied to words.
import * as THREE from "three";
import { makeAvatar, poseAvatar, SKIN, shirtArt } from "/kit/20_r6.js";
import { track, act } from "/kit/25_anim.js";
import * as T from "/kit/45_town.js";
import * as D from "/kit/46_detail.js";
import { baseplate } from "/kit/10_core.js";
import { ease } from "/kit/40_cam.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SW = 0.3, DOT = [-4, -11], CAR = [12, 2.5], F = { x: 130, z: 110 }, C0 = [F.x, F.z + 6];
const smooth = (a, b, t) => ease((t - a) / (b - a));
let W = {};
const tw = (i) => W[i];
export const coreOpts = {};
let C = {}, used = new Set(), extras = [], cloudsG, drops = null, dryPlane, stalks, stalkData = [], vines = [], ticket, movers = [];

// ------------------------------------------------------------------ flowers (instanced, grow on spawn time)
const FLN = 1100; let flowers = [], fStem, fHead, fCen;
const KIND = { daisy: { h: 0.9, head: [0.34, 0.1, 0.34], cen: [0.14, 0.14, 0.14], cy: 0.1, cz: 0 }, tulip: { h: 1.5, head: [0.28, 0.46, 0.28], cen: [0, 0, 0], cy: 0, cz: 0 }, sun: { h: 5.0, head: [1.0, 1.0, 0.2], cen: [0.55, 0.55, 0.12], cy: 0, cz: 0.17 } };
const PAL = { daisy: ["#ffffff", "#fff3b0", "#ffd1e0"], tulip: ["#e0386b", "#f27a2a", "#8a5ad6", "#f2c230", "#ff7aa8"], sun: ["#f5c518", "#f0b400"] };
const addF = (x, z, spawn, kind, y = 0) => flowers.push({ x, z, y, spawn, kind, c: PAL[kind][flowers.length % PAL[kind].length], s: 0.85 + ((flowers.length * 37) % 30) / 100 });
function initFlowers(S) {
  fStem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.065, 1, 5), new THREE.MeshStandardMaterial({ color: "#3f8f3a", roughness: 0.8 }), FLN);
  fHead = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.6 }), FLN);
  fCen = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.7 }), FLN);
  const col = new THREE.Color();
  flowers.forEach((f, i) => { fHead.setColorAt(i, col.set(f.c)); fCen.setColorAt(i, col.set(f.kind === "sun" ? "#5a3a1a" : "#f2c230")); });
  for (const m of [fStem, fHead, fCen]) { m.frustumCulled = false; S.add(m); }
  fHead.instanceColor.needsUpdate = fCen.instanceColor.needsUpdate = true;
}
const dummy = new THREE.Object3D();
function updateFlowers(t) {
  for (let i = 0; i < FLN; i++) {
    const f = flowers[i];
    let g = 0;
    if (f) { const u = (t - f.spawn) / 0.55; g = u <= 0 ? 0 : Math.min(1, ease(Math.min(1, u))) * (1 + 0.12 * Math.sin(Math.min(1, u) * Math.PI)); }
    if (!f || g < 0.01) { dummy.position.set(0, -50, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); fStem.setMatrixAt(i, dummy.matrix); fHead.setMatrixAt(i, dummy.matrix); fCen.setMatrixAt(i, dummy.matrix); continue; }
    const k = KIND[f.kind], h = k.h * f.s * g, sw = 0.04 * Math.sin(t * 2 + i) * (f.kind === "sun" ? 0.3 : 1);
    dummy.rotation.set(0, 0, sw); dummy.position.set(f.x, f.y + h / 2, f.z); dummy.scale.set(f.kind === "sun" ? 3 : 1, h, f.kind === "sun" ? 3 : 1); dummy.updateMatrix(); fStem.setMatrixAt(i, dummy.matrix);
    dummy.position.set(f.x + sw * h, f.y + h, f.z); dummy.scale.set(k.head[0] * f.s * g, k.head[1] * f.s * g, k.head[2] * f.s * g); dummy.updateMatrix(); fHead.setMatrixAt(i, dummy.matrix);
    dummy.position.set(f.x + sw * h, f.y + h + k.cy * g, f.z + k.cz * f.s * g); dummy.scale.set(k.cen[0] * f.s * g, k.cen[1] * f.s * g, k.cen[2] * f.s * g || 0.0001); dummy.updateMatrix(); fCen.setMatrixAt(i, dummy.matrix);
  }
  fStem.instanceMatrix.needsUpdate = fHead.instanceMatrix.needsUpdate = fCen.instanceMatrix.needsUpdate = true;
}
let sd = 5; const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
const ring = (cx, cz, r0, r1, n, t0, t1, kinds, y = 0) => { for (let i = 0; i < n; i++) { const a = rr() * 6.283, d = r0 + rr() * (r1 - r0); addF(cx + Math.cos(a) * d, cz + Math.sin(a) * d, t0 + rr() * (t1 - t0), kinds[i % kinds.length], y); } };
const box = (cx, cz, w, d, n, t0, t1, kinds, y = 0) => { for (let i = 0; i < n; i++) addF(cx + (rr() - 0.5) * w, cz + (rr() - 0.5) * d, t0 + rr() * (t1 - t0), kinds[i % kinds.length], y); };

export async function build(ctx) {
  const S = ctx.scene;
  ctx.words.forEach((w, i) => (W[i] = w.start));
  baseplate(ctx.core, { size: 640 });
  // ---- Maple St
  T.road(S, -160, -5, 160, 5); T.sidewalk(S, -160, -9, 160, -5); T.sidewalk(S, -160, 5, 160, 9);
  D.cottage(S, { x: -50, z: -24, wall: "#f2d9a0", roof: "#3b5a46", shutter: "#3b5a46", door: "#2f5f9a" });
  D.twoStorey(S, { x: -28, z: -24, wall: "#cfe3f0", roof: "#3d4f7a" });
  D.cottage(S, { x: -4, z: -24, wall: "#f0c9c0", roof: "#6a4a3a", shutter: "#ffffff", door: "#3a3f4a", flowers: "#8a5ad6" });
  D.modern(S, { x: 20, z: -24 }); D.twoStorey(S, { x: 42, z: -24, wall: "#d9e8c4", roof: "#5a4a6a", door: "#b5533c" });
  [["CRUMB & CO", "#c97a4a", "#2f5f9a", ["#d64545", "#ffffff"]], ["PET PALACE", "#7a8a9a", "#3dbf7a", ["#3dbf7a", "#ffffff"]], ["SCOOPS", "#e8b4c8", "#8a5ad6", ["#8a5ad6", "#ffffff"]], ["BOOK NOOK", "#a8723f", "#1e7a3a", ["#f2c230", "#3a2a20"]]]
    .forEach(([name, wall, sign, aw], i) => D.shop(S, { x: -36 + i * 15, z: 22, rot: Math.PI, name, wall, sign, awning: aw }));
  const sp = (w, h, text, bg, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: D.signTex(text, bg, "#ffffff", 512, 128), roughness: 0.6 })); m.position.set(x, y, z); m.rotation.y = Math.PI; S.add(m); };
  sp(2.4, 0.9, "CLOSED", "#c62828", -40.6, 3.5, 15.6); sp(6.4, 1.6, "SOLD OUT", "#c62828", -33.9, 3.2, 15.55);
  for (const x of [-42, -16, 32, 54]) D.roundTree(S, x, -12.5, 0.85); D.pine(S, 8, -12.5, 0.85);
  for (const x of [-36, -10, 14, 38]) T.lamp(S, x, 7.6);
  D.hydrant(S, -22, -7.2); D.trashCan(S, -12, -7.6); D.bench(S, 3, -7.6, Math.PI); D.bike(S, 24, -7.2, 0.15); D.streetSign(S, -26, 7.4, "MAPLE ST", "OAK AVE");
  cloudsG = D.clouds(S, 10, 360, 75);
  T.car(S, CAR[0], CAR[1], Math.PI / 2, "#d64545");
  // vines on the car (grow from tw(45))
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 5.2), T.col(i % 3 ? "#3f9a3a" : "#2f7a32", 0.8)); m.position.set(CAR[0] - 3 + i * 0.75, 4.4, CAR[1]); m.castShadow = true; S.add(m); vines.push({ m, kind: "roof", t0: tw(45) + i * 0.12 }); }
  for (let i = 0; i < 6; i++) { const sgn = i % 2 ? 1 : -1; const m = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1, 0.28), T.col("#3f9a3a", 0.8)); m.position.set(CAR[0] - 2.5 + (i >> 1) * 2.2, 3, CAR[1] + sgn * 2.3); S.add(m); vines.push({ m, kind: "hang", sgn, t0: tw(46) + i * 0.15 }); }
  // ---- flowers: Dot's laughs
  ring(DOT[0], DOT[1], 0.8, 2.4, 11, tw(6), tw(10), ["daisy"]);
  addF(DOT[0] + 0.9, DOT[1] + 0.9, tw(18), "daisy");
  ring(DOT[0], DOT[1], 0.9, 1.9, 16, tw(19), tw(28), ["tulip"]);
  box(DOT[0], DOT[1] - 1, 17, 7, 48, tw(29), tw(40), ["daisy", "tulip", "daisy"]);
  for (let i = 0; i < 9; i++) addF(DOT[0] - 8 + i * 2, DOT[1] - 4.6 + (i % 3) * 0.7, tw(35) + i * 0.15, "sun");
  for (let i = 0; i < 7; i++) addF(-2 + i * 0.85, -6.4 + (i % 2) * 0.5, tw(40) + i * 0.08, "sun", SW);
  box(DOT[0] + 5, -8.6, 18, 2, 14, tw(36), tw(40), ["daisy", "tulip"], 0);
  // ---- the farm valley
  dryPlane = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ map: T.ctex("cracks", 512, 512, (g, r) => { g.fillStyle = "#b8975f"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "90,60,30" : "230,205,150"},0.08)`; g.fillRect(r() * 512, r() * 512, 3, 2); } g.strokeStyle = "rgba(60,36,16,0.65)"; g.lineWidth = 3; for (let i = 0; i < 90; i++) { let x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 70; y += (r() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); } }, [5, 5]), roughness: 1, transparent: true, depthWrite: false }));
  dryPlane.rotation.x = -Math.PI / 2; dryPlane.position.set(F.x, 0.04, F.z); dryPlane.receiveShadow = true; S.add(dryPlane);
  stalks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), T.col("#8a6a3a", 1), 520); stalks.frustumCulled = false; S.add(stalks);
  for (let i = 0; i < 520; i++) stalkData.push([F.x + (rr() - 0.5) * 170, F.z + (rr() - 0.5) * 170, (rr() - 0.5) * 0.5, rr() * 6.28]);
  for (const [x, z, s] of [[-30, -10, 1], [34, 24, 1.1], [-8, 38, 0.9], [44, -26, 1]]) { const g = new THREE.Group(); g.position.set(F.x + x, 0, F.z + z); g.scale.setScalar(s); S.add(g); T.block(g, [-0.5, 0, -0.5], [0.5, 7, 0.5], T.col("#5a4a3a", 0.95)); for (const [a, b, c] of [[1.5, 5, 0.5], [-1.4, 4.2, -0.6], [0.6, 6.2, -1.2]]) { const br = T.block(g, [-0.15, 0, -0.15], [0.15, 2.4, 0.15], T.col("#5a4a3a", 0.95)); br.position.set(a * 0.6, b, c * 0.5); br.rotation.z = a > 0 ? -0.9 : 0.9; } }
  // barn, silo, fences, hills
  const barn = new THREE.Group(); barn.position.set(F.x - 52, 0, F.z - 34); S.add(barn);
  T.block(barn, [-9, 0, -7], [9, 9, 7], T.col("#a8322c", 0.85)); T.gableRoof(barn, 0, 0, 18, 14, 9, 5, "#6a3a2e"); T.block(barn, [-3, 0, 7], [3, 7.5, 7.15], T.col("#f2efe8", 0.7)); T.block(barn, [-2.6, 0.2, 7.15], [2.6, 7.3, 7.25], T.col("#8a2a24", 0.85));
  for (const k of [-1, 1]) { const x = T.block(barn, [-3, 0, 7.3], [3, 0.35, 7.4], T.col("#f2efe8", 0.7)); x.rotation.z = k * 0.95; x.position.set(0, 3.7, 0); }
  const silo = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 15, 20), T.col("#c9ccd2", 0.5)); silo.position.set(F.x - 66, 7.5, F.z - 34); silo.castShadow = true; S.add(silo); const cap = new THREE.Mesh(new THREE.SphereGeometry(3, 18, 10, 0, 6.283, 0, 1.57), T.col("#8a8f9a", 0.4)); cap.position.set(F.x - 66, 15, F.z - 34); S.add(cap);
  T.fence(S, F.x - 80, F.z + 78, F.x + 80); T.fence(S, F.x - 80, F.z - 78, F.x + 80);
  T.hill(S, F.x + 120, F.z - 20, 60, 0.4, -4, "#7fa84a"); T.hill(S, F.x - 110, F.z - 90, 70, 0.35, -4, "#7fa84a"); T.hill(S, F.x + 40, F.z - 140, 80, 0.38, -4, "#6f9a42");
  // the valley blooms outward from where Dot laughs
  for (let i = 0; i < 640; i++) { const a = rr() * 6.283, d = 2 + Math.sqrt(rr()) * 82, k = rr(); addF(C0[0] + Math.cos(a) * d, C0[1] + Math.sin(a) * d, tw(112) + (d / 82) * (tw(121) - tw(112)) + rr() * 0.5, k < 0.5 ? "daisy" : k < 0.92 ? "tulip" : "sun"); }
  initFlowers(S);
  ticket = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.05), T.col("#fff7d6", 0.8)); S.add(ticket); ticket.visible = false;
  // ---- cast
  const A = (name, o) => { const av = makeAvatar(o); av.root.visible = false; S.add(av.root); C[name] = av; return av; };
  A("dot", { skin: SKIN.tan, shirt: "#f2c230", pants: "#8a5ad6", hat: "hairLong", hatColor: "#2a1c14", top: "hoodie", outer: "#f2c230", scale: 0.84, face: "laugh", sole: "#e05a8a" });
  A("milo", { skin: SKIN.light, shirt: "#3d7be0", pants: "#3a3f5a", hat: "cap", hatColor: "#d64545", top: "jacket", outer: "#3dbf7a", scale: 0.84, face: "grin" });
  A("mayor", { skin: SKIN.brown, shirt: "#ffffff", pants: "#2b2b33", hat: "tophat", hatColor: "#1e1e24", top: "jacket", outer: "#2b2b33", face: "neutral", shirtArt: shirtArt("tie", "#c0303a", "#ffffff") });
  A("farmer", { skin: SKIN.light, shirt: "#c94f4f", pants: "#3a5a8a", hat: "cap", hatColor: "#d9b24a", top: "long", outer: "#c94f4f", belt: "#3a2a20", face: "worried" });
  A("neighbor", { skin: SKIN.tan, shirt: "#4a7a9a", pants: "#2f3b52", hat: "hairShort", hatColor: "#3a2a20", top: "hoodie", outer: "#4a7a9a", face: "smile" });
  A("lady", { skin: SKIN.light, shirt: "#b768c9", pants: "#5b4a6b", hat: "bun", hatColor: "#d9d9de", glasses: true, top: "long", outer: "#b768c9", face: "worried" });
  const kc = [["#d64545", "spiky", "#2a1c14", "tee"], ["#3d7be0", "cap", "#2c6e3f", "hoodie"], ["#3dbf7a", "hairShort", "#1e1a18", "jacket"], ["#8a5ad6", "hairLong", "#e0b23a", "tee"]];
  kc.forEach(([sh, h, hc, top], i) => A(`kid${i}`, { skin: [SKIN.yellow, SKIN.tan, SKIN.light, SKIN.brown][i], shirt: sh, pants: "#2f3b52", hat: h, hatColor: hc, top, outer: ["#ffffff", "#2b2b33", "#e8b23a", "#3a6ea5"][i], scale: 0.8, face: "laugh" }));
  for (let i = 0; i < 4; i++) extras.push(A(`ex${i}`, { skin: [SKIN.light, SKIN.brown, SKIN.tan, SKIN.dark][i], shirt: ["#4a7a9a", "#d9a03a", "#9a5a8a", "#6a8a4a"][i], pants: "#2f3b52", hat: ["cap", "hairShort", "bun", "hairLong"][i], hatColor: ["#3a3f4a", "#2a1c14", "#d9d9de", "#5a3a22"][i], top: ["long", "jacket", "tee", "hoodie"][i], outer: ["#4a7a9a", "#6a4a2e", "#9a5a8a", "#e05a8a"][i], face: "smile" }));
}

// ------------------------------------------------------------------ staging helpers
const place = (name, x, y, z, ry = 0, rot = {}) => { const av = C[name]; used.add(name); av.root.visible = true; av.root.position.set(x, y, z); av.root.rotation.set(rot.rx ?? 0, ry, rot.rz ?? 0); return av; };
const show = (name, x, y, z, ry, pose, face, t, o = {}) => { const av = place(name, x, y, z, ry, o); poseAvatar(av, pose, pose, 0, { t, face, blinkSeed: name.length * 1.3 + (o.seed ?? 0), cycle: o.cycle, speed: o.speed }); return av; };
const actor = (name, x, y, z, ry, keys, t, o = {}) => { const av = place(name, x, y, z, ry, o); act(av, keys, t, { t, blinkSeed: name.length * 1.3 + (o.seed ?? 0), cycle: o.cycle, speed: o.speed }); return av; };
const handW = (av, side = "rs") => { av.root.updateMatrixWorld(true); return av.hands[side].getWorldPosition(new THREE.Vector3()); };
function street(t) { extras.forEach((e, i) => { const dir = i % 2 ? 1 : -1, x = (((i * 31 + dir * t * 2.4) % 120) + 180) % 120 - 60; show(`ex${i}`, x, SW, 7.8 + (i % 2) * 0.9, dir > 0 ? Math.PI / 2 : -Math.PI / 2, "walk", "smile", t, { cycle: "walk", seed: i }); }); }

// ------------------------------------------------------------------ scenes (state chosen by time inside each)
const dotTown = track([0, "bellyLaugh", "laugh"], [tw(12) - 0.2, "laughPoint", "grin"], [tw(19) - 0.1, "bellyLaugh", "laugh", { ease: "back" }], [tw(29), "talk", "happy"], [tw(35), "bellyLaugh", "laugh"], [tw(51) + 0.2, "shrug", "worried", { ease: "back" }], [tw(53), "idle", "nervous"], [tw(59), "sad", "sad"], [tw(64), "sad", "cry"], [tw(66), "sad", "sad"]);
const SC = {
  town(t, s) {
    street(t);
    actor("dot", DOT[0], 0, DOT[1], 0, dotTown, t);
    const nx = Math.max(5, 11 - 3.5 * (t - tw(40)));
    if (t >= tw(40) && t < tw(45)) actor("neighbor", nx, SW, -7.2, nx > 5.05 ? Math.PI / 2 : 0.4, track([0, "walk", "smile"], [tw(40) + 1.7, "shrug", "worried", { ease: "back" }]), t, { cycle: nx > 5.05 ? "walk" : null, speed: 1.2 });
    if (t >= tw(45) && t < tw(51)) actor("neighbor", CAR[0] + 5, SW + 4.2, 7.2, Math.PI, track([0, "idle", "shock"], [tw(48), "facepalm", "angry", { ease: "back" }]), t);
    if (t >= tw(51) && t < tw(59)) {
      actor("mayor", -6.5, 0, -7.7, Math.PI - 0.5, track([0, "idle", "angry"], [tw(54), "point", "angry", { ease: "back" }], [tw(57), "idle", "smirk"]), t);
      const k = smooth(tw(54), tw(55) + 0.2, t); const m = handW(C.mayor, "rs"), d = V(DOT[0] + 0.5, 1.7, DOT[1] + 0.9);
      ticket.visible = true; ticket.position.copy(m).lerp(d, k).add(V(0, 0.2, 0)); ticket.rotation.set(0, 0.3, 0.2);
    } else ticket.visible = false;
    if (t >= tw(59) && t < tw(67)) [[-12, 0], [-10.2, 1], [-8.4, 2], [-6.6, 3]].forEach(([x, i]) => actor(`kid${i}`, x, SW, -7.4, Math.PI - 0.45, track([0, "idle", "grin"], [tw(59) + i * 0.1, "laughPoint", "laugh", { ease: "back" }], [tw(63), "bellyLaugh", "laugh"], [tw(64) + 0.2, "idle", "smirk"]), t, { seed: i }));
  },
  shop(t) {
    street(t);
    [["lady", -39, 13.6], ["kid0", -36.5, 14], ["kid1", -34, 13.4], ["neighbor", -31.5, 14]].forEach(([n, x, z], i) => actor(n, x, SW, z, Math.PI + (i - 1.5) * 0.15, track([0, "idle", "surprised"], [tw(86) + i * 0.1, "shrug", "worried", { ease: "back" }], [tw(89), "facepalm", "sad"]), t, { seed: i }));
  },
  field(t) {
    const CX = C0[0], CZ = C0[1];
    if (t < tw(91)) { // the dried-out farm
      actor("farmer", F.x, 0, F.z, -0.2, track([0, "lookUp", "worried"], [tw(75), "shrug", "worried", { ease: "back" }], [tw(79), "sad", "sad"], [tw(85), "idle", "nervous"]), t);
    } else if (t < tw(104)) { // Dot and Milo walk into the dead fields
      const z = CZ + 6 + 2.4 * (tw(104) - t);
      actor("dot", CX - 1.2, 0, z, Math.PI, track([0, "walk", "neutral"]), t, { cycle: "walk", speed: 0.9 }); actor("milo", CX + 1.2, 0, z - 0.2, Math.PI, track([0, "walk", "smile"]), t, { cycle: "walk", speed: 0.9, seed: 3 });
    } else if (t < tw(112)) { // the worst jokes
      actor("milo", CX + 1.6, 0, CZ, -Math.PI / 2, track([0, "talk", "grin"], [tw(106), "laughPoint", "wink", { ease: "back" }], [tw(109), "bellyLaugh", "laugh", { ease: "back" }], [tw(111), "talk", "grin"]), t);
      actor("dot", CX - 1.6, 0, CZ, Math.PI / 2, track([0, "idle", "neutral"], [tw(109), "idle", "smirk"], [tw(111) + 0.1, "think", "smirk"]), t);
    } else if (t < tw(123)) { // she laughs until sunset; by morning the valley is green
      actor("dot", CX, 0, CZ, 0, track([0, "bellyLaugh", "laugh"], [tw(116), "armsUp", "happy", { ease: "back" }], [tw(120), "cheer", "laugh"]), t);
      actor("milo", CX + 2.6, 0, CZ + 0.4, -0.5, track([0, "bellyLaugh", "laugh"], [tw(116), "cheer", "happy", { ease: "back" }]), t, { seed: 3 });
    } else { // everyone tells Dot jokes
      actor("dot", CX, 0, CZ, 0, track([0, "bellyLaugh", "laugh"], [tw(127), "laughPoint", "grin"], [tw(130), "bellyLaugh", "laugh", { ease: "back" }]), t);
      ["milo", "mayor", "lady", "farmer", "kid0", "kid1", "kid2", "kid3"].forEach((n, i) => { const a = (i / 8) * 6.283 + 0.4, x = CX + 4.4 * Math.sin(a), z = CZ + 4.4 * Math.cos(a); actor(n, x, 0, z, Math.atan2(CX - x, CZ - z), track([0, "idle", "grin"], [tw(123) + i * 0.18, i % 2 ? "laughPoint" : "talk", "wink", { ease: "back" }], [tw(129) + i * 0.1, "bellyLaugh", "laugh", { ease: "back" }]), t, { seed: i }); });
    }
  },
};

// ------------------------------------------------------------------ per frame
export function update(ctx, t, s) {
  for (const k of used) C[k].root.visible = false; used = new Set();
  const c = ctx.core, u = c.sky.material.uniforms;
  const dry = smooth(tw(66), tw(68), t) * (1 - smooth(tw(111), tw(112), t)), sun = smooth(tw(112), tw(113), t) * (1 - smooth(tw(115), tw(116), t));
  c.sun.color.set("#fff1d8"); c.setMood(0.22 * dry, false);
  const tint = (top, hor, k) => { u.top.value.lerp(new THREE.Color(top), k); u.hor.value.lerp(new THREE.Color(hor), k); c.scene.fog.color.lerp(new THREE.Color(hor), k); };
  if (dry > 0) { tint("#d7b277", "#f4e3bd", dry); c.sun.color.lerp(new THREE.Color("#ffd9a0"), dry); }
  if (sun > 0) { tint("#3a2f6a", "#ff8a4a", sun); c.sun.color.lerp(new THREE.Color("#ff9a5a"), sun); c.sun.intensity *= 1 - 0.3 * sun; c.hemi.intensity *= 1 - 0.3 * sun; }
  cloudsG.visible = dry < 0.5; cloudsG.tick(t);
  const g = smooth(tw(112) + 0.4, tw(121), t);
  dryPlane.material.opacity = 1 - g;
  stalkData.forEach(([x, z, tilt, a], i) => { dummy.position.set(x, 1.1 * (1 - g), z); dummy.rotation.set(tilt, a, tilt); dummy.scale.set(1, Math.max(0.001, 1 - g), 1); dummy.updateMatrix(); stalks.setMatrixAt(i, dummy.matrix); });
  stalks.instanceMatrix.needsUpdate = true;
  for (const v of vines) { const k = Math.min(1, Math.max(0.001, smooth(v.t0, v.t0 + 0.6, t))); if (v.kind === "roof") v.m.scale.z = k; else { v.m.scale.y = 2.4 * k; v.m.position.y = 4.2 - 1.2 * k; } v.m.visible = t >= v.t0; }
  updateFlowers(t);
  SC[s.scene](t, s, ctx);
}

export function SHOTS(ctx) {
  const dot = (dy = 2.4) => () => { const p = C.dot.root.position; return [p.x, p.y + dy, p.z]; };
  const mid = (dy) => () => { const a = C.dot.root.position, b = C.milo.root.position; return [(a.x + b.x) / 2, dy, (a.z + b.z) / 2]; };
  const [CX, CZ] = C0;
  return [
    { w: 0, scene: "town", at: [DOT[0], 3.2, DOT[1]], dist: 15, yaw: 6, pitch: 8, move: "push", K: 0.22, name: "rule" },
    { w: 7, scene: "town", at: [DOT[0], 1.4, DOT[1]], dist: 8, yaw: -14, pitch: 14, move: "rise", K: 0.2, name: "flowers" },
    { w: 12, scene: "town", at: [DOT[0] + 0.6, 1.2, DOT[1] + 0.4], dist: 5.5, yaw: 25, pitch: 10, move: "push", K: 0.15, name: "giggle" },
    { w: 19, scene: "town", at: [DOT[0], 2.4, DOT[1]], dist: 9, yaw: -22, pitch: 12, move: "orbitL", K: 0.25, name: "minute" },
    { w: 29, scene: "town", at: [DOT[0], 5, DOT[1] - 3], dist: 30, yaw: 18, pitch: 12, move: "push", K: 0.2, name: "nobody" },
    { w: 35, scene: "town", at: [DOT[0], 3, DOT[1] - 2], dist: 17, yaw: -28, pitch: 14, move: "slideR", K: 0.2, name: "jungle" },
    { w: 41, scene: "town", at: [-4, 3.2, -6], dist: 14, yaw: 30, pitch: 8, move: "push", K: 0.18, name: "sunflowers" },
    { w: 45, scene: "town", at: [CAR[0], 3.4, CAR[1]], dist: 12, yaw: -30, pitch: 12, move: "slideR", K: 0.2, name: "vines" },
    { w: 51, scene: "town", at: [-5.4, 3, -9.4], dist: 10, yaw: -35, pitch: 8, move: "push", K: 0.18, name: "mayor" },
    { w: 59, scene: "town", at: [-7.5, 3, -9], dist: 14, yaw: -40, pitch: 10, move: "push", K: 0.2, name: "weed" },
    { w: 64, scene: "town", at: [DOT[0], 3.6, DOT[1]], dist: 6.5, yaw: 14, pitch: 4, move: "push", K: 0.18, name: "stopped" },
    { w: 68, scene: "field", at: [F.x, 4.5, F.z], dist: 10, yaw: 20, pitch: -12, fov: 52, move: "push", K: 0.15, name: "rain" },
    { w: 75, scene: "field", at: [F.x - 20, 5, F.z - 10], dist: 62, yaw: 28, pitch: 14, move: "push", K: 0.15, name: "farm" },
    { w: 79, scene: "field", at: [F.x + 4, 1.2, F.z + 2], dist: 9, yaw: -20, pitch: 22, move: "push", K: 0.2, name: "dust" },
    { w: 85, scene: "shop", at: [-38, 3.6, 13.6], dist: 15, yaw: 192, pitch: 6, move: "push", K: 0.2, name: "stores" },
    { w: 91, scene: "field", follow: mid(2.8), dist: 14, yaw: 0, pitch: 8, move: "pull", K: 0.15, name: "dead" },
    { w: 100, scene: "field", follow: mid(2.4), dist: 10, yaw: 62, pitch: 6, move: "push", K: 0.15, name: "friend" },
    { w: 104, scene: "field", at: [CX, 2.8, CZ], dist: 10, yaw: 28, pitch: 6, move: "push", K: 0.15, name: "jokes" },
    { w: 112, scene: "field", at: [CX, 2.4, CZ], dist: 9, yaw: -22, pitch: 8, move: "orbitR", K: 0.25, name: "laughed" },
    { w: 114, scene: "field", at: [CX, 4, CZ + 4], dist: 52, yaw: 30, pitch: 10, move: "pull", K: 0.15, name: "sunset" },
    { w: 116, scene: "field", at: [CX, 6, CZ - 10], dist: 72, yaw: 24, pitch: 14, fov: 46, move: "push", K: 0.12, name: "morning" },
    { w: 119, scene: "field", at: [CX, 8, CZ], dist: 66, yaw: 0, pitch: 34, move: "rise", K: 0.3, name: "valley" },
    { w: 123, scene: "field", at: [CX, 2.6, CZ], dist: 15, yaw: 22, pitch: 12, move: "orbitL", K: 0.25, name: "everyone" },
    { w: 127, scene: "field", at: [CX, 2.6, CZ], dist: 8, yaw: -10, pitch: 6, move: "push", K: 0.15, name: "tells" },
    { w: 130, scene: "field", at: [CX, 2.6, CZ], dist: 5.6, yaw: 8, pitch: 4, move: "push", K: 0.12, name: "best" },
  ];
}
