// Episode 01: The Floating Girl. "In this world, sadness makes you lighter."
// Places (world x): TOWN street at 0 (houses north, bus stop south, plateau hill east at x 100), HALL 300, CLASS 400,
// CAF 500, BED 600. Every shot names a scene; the scene function places the cast for that moment (others hidden).
// Rule made visible: sad people hover (shadow gap under the feet); Pip hovers ~1.2 studs on a string.
import * as THREE from "three";
import { makeAvatar, poseAvatar, reachTo, SKIN, shirtArt } from "/kit/20_r6.js";
import * as T from "/kit/45_town.js";
import { baseplate } from "/kit/10_core.js";
import { ease } from "/kit/40_cam.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HALL = 300, CLASS = 400, CAF = 500, BED = 600;
const SW = 0.3; // sidewalk top
const HILL = { x: 100, z: 0, top: 26, base: 40, h: 8 };
const hillY = (x, z) => { const d = Math.hypot(x - HILL.x, z - HILL.z); return d < HILL.top ? HILL.h : d < HILL.base ? HILL.h * (HILL.base - d) / (HILL.base - HILL.top) : 0; };
const smooth = (a, b, t) => ease((t - a) / (b - a));
const MEM = "grayscale(0.8) sepia(0.35) brightness(0.92) contrast(1.05)";

let W = {}; // word start times by index, filled in build
const tw = (i) => W[i];

// ------------------------------------------------------------------ flood state
const level = (t) => 3.0 * smooth(tw(118) - 0.3, tw(127), t) + 1.6 * smooth(tw(127), tw(146), t);
const storm = (t) => smooth(tw(113) - 0.2, tw(116), t);

export const coreOpts = {};
let C = {}, P = {}, ROPE, ROPE2, water, rainFx, truck, boatG, scoop, tape = [];

export async function build(ctx) {
  const S = ctx.scene;
  ctx.words.forEach((w, i) => (W[i] = w.start));
  baseplate(ctx.core);
  // ---- town
  T.road(S, -140, -5, 140, 5); T.sidewalk(S, -140, -9, 140, -5); T.sidewalk(S, -140, 5, 140, 9);
  T.house(S, { x: -52, z: -20, wall: "#f2d9a0", roof: "#3b5a46" });
  T.house(S, { x: -30, z: -20, wall: "#e9e2cf", roof: "#5a4a6a" });
  T.house(S, { x: -8, z: -20, wall: "#cfe3f0", roof: "#7a3b36", door: "#2f5f9a" }); // Pip's house
  T.house(S, { x: 14, z: -20, wall: "#f0c9c0", roof: "#3d4f7a" });
  T.house(S, { x: 36, z: -20, wall: "#d9e8c4", roof: "#6a4a3a" });
  for (const x of [-41, -19, 3, 25, 47]) T.tree(S, x, -12, 0.85);
  for (const x of [-36, -14, 8, 30]) T.lamp(S, x, 7.6);
  T.bush(S, -60, -13); T.bush(S, 45, -13);
  T.house(S, { x: -40, z: 30, wall: "#e6d6f0", roof: "#4a4a5a", rot: Math.PI }); T.house(S, { x: -10, z: 30, wall: "#f2e6c4", roof: "#5a3b3b", rot: Math.PI });
  T.house(S, { x: 45, z: 30, wall: "#cfe3f0", roof: "#3b5a46", rot: Math.PI });
  T.busStop(S, 20, 8, Math.PI);
  // the plateau hill (flat top) with a few trees
  const hm = new THREE.Mesh(new THREE.CylinderGeometry(HILL.top, HILL.base, HILL.h, 64, 1), T.col("#5fbf4a", 0.95));
  hm.position.set(HILL.x, HILL.h / 2, HILL.z); hm.receiveShadow = hm.castShadow = true; S.add(hm);
  for (const [x, z] of [[104, -14], [112, 8], [96, 16]]) { const tr = T.tree(S, x, z, 1.0); tr.position.y = HILL.h; }
  T.fence(S, 76, -18, 90).position.y = HILL.h;
  truck = T.fireTruck(S, 0, 0, 0, 0); truck.g.position.set(88, HILL.h, 12); truck.g.rotation.y = -Math.PI / 2; truck.turn.rotation.y = Math.PI; truck.ladder.rotation.x = 0.1;
  boatG = T.boat(S);
  C.car1 = T.car(S, -12, 2.5, Math.PI / 2, "#d64545"); C.car2 = T.car(S, 6, -2.5, -Math.PI / 2, "#3d7be0");
  water = T.water(S, -160, -60, 160, 50);
  rainFx = T.rain(S);
  // ---- interiors
  T.room(S, { x: HALL, z: 0, w: 14, d: 60, h: 11, floor: (r) => T.TEX.tile("#e9e9e4", "#c9ccd2", r), wall: "#e6e1d3" });
  T.lockers(S, HALL - 6.4, -24, 7, "#4f7fb8");
  for (const [sx, rot, colr] of [[-6.4, Math.PI / 2, "#4f7fb8"], [6.4, -Math.PI / 2, "#c94f4f"]]) { const g = new THREE.Group(); g.position.set(HALL + sx, 0, sx < 0 ? -24 : 24); g.rotation.y = rot; S.add(g); T.lockers(g, 0, 0, 25, colr); }
  T.room(S, { x: CLASS, z: 0, w: 30, d: 26, h: 11, wall: "#f0e6cc", windows: [{ wall: "back", at: -9, w: 4, h: 4, y: 3.5 }, { wall: "back", at: 9, w: 4, h: 4, y: 3.5 }] });
  T.chalkboard(S, CLASS, 6, -12.6, 12, 5);
  for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) { T.desk(S, CLASS + c * 7, -3 + r * 6.5); T.chair(S, CLASS + c * 7, -0.5 + r * 6.5, Math.PI); }
  T.room(S, { x: CAF, z: 0, w: 40, d: 30, h: 12, floor: (r) => T.TEX.tile("#f2f0ea", "#d9b9b0", r), wall: "#f2e6d0" });
  for (const z of [-7, 4]) for (const x of [-9, 9]) T.longTable(S, CAF + x, z, 14);
  T.room(S, { x: BED, z: 0, w: 18, d: 16, h: 10, wall: "#cfe0f2", windows: [{ wall: "back", at: 4, w: 4, h: 4, y: 3.5 }] });
  T.bed(S, BED - 3, -2.5, 0);
  // ---- props
  const prop = (fn) => { const g = new THREE.Group(); fn(g); S.add(g); g.visible = false; return g; };
  P.cone = prop((g) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 12), T.col("#d9a35a", 0.8)); c.rotation.x = Math.PI; c.position.y = -0.1; g.add(c); });
  scoop = prop((g) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), T.col("#f29ab8", 0.6)); b.castShadow = true; g.add(b); });
  P.collar = prop((g) => { g.add(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.08, 8, 20), T.col("#d43a3a", 0.5))); const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), T.col("#f2c230", 0.3)); tag.rotation.x = Math.PI / 2; tag.position.y = -0.45; g.add(tag); });
  P.bowl = prop((g) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 0.45, 18), T.col("#3d7be0", 0.5)); b.position.y = 0.22; g.add(b); });
  P.suitcase = prop((g) => { T.block(g, [-0.9, -1.6, -0.35], [0.9, -0.1, 0.35], T.col("#6a4a2e", 0.6)); T.block(g, [-0.3, -0.1, -0.08], [0.3, 0.15, 0.08], T.col("#2a2a30", 0.5)); });
  P.bricks = [0, 1, 2].map(() => prop((g) => T.block(g, [-0.45, -0.25, -0.22], [0.45, 0.25, 0.22], new THREE.MeshStandardMaterial({ map: T.TEX.brick("#a24b38", [0.3, 0.3]), roughness: 0.9 }))));
  for (let i = 0; i < 3; i++) tape.push(prop((g) => T.block(g, [-0.18, -0.02, -1.8], [0.18, 0.02, 1.8], T.col("#ece9df", 0.8))));
  P.leaves = prop((g) => { for (let i = 0; i < 18; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.25), T.col(["#d9862a", "#c9502a", "#e0b23a"][i % 3], 0.8)); l.userData.k = i; g.add(l); } });
  // ---- cast (original characters)
  const A = (name, o) => { const av = makeAvatar(o); av.root.visible = false; S.add(av.root); C[name] = av; return av; };
  A("pip", { skin: SKIN.light, shirt: "#7fb4e8", pants: "#3a4a6a", hat: "hairLong", hatColor: "#c0592b", backpack: "#e86a8a", shirtArt: shirtArt("star", "#ffffff"), scale: 0.86, face: "sad" });
  A("mom", { skin: SKIN.light, shirt: "#5a9a6a", pants: "#3a3f5a", hat: "bun", hatColor: "#8a4a2a", face: "worried" });
  A("dad", { skin: SKIN.light, shirt: "#8a8f9a", pants: "#2f3b52", hat: "hairShort", hatColor: "#5a3a22", face: "sad" });
  A("boy", { skin: SKIN.tan, shirt: "#f2c230", pants: "#3c5a8a", hat: "cap", hatColor: "#d43a3a", scale: 0.72, face: "shock" });
  A("kidIce", { skin: SKIN.brown, shirt: "#e8553d", pants: "#2f3b52", hat: "spiky", hatColor: "#1e1a18", scale: 0.8, face: "grin" });
  A("petKid", { skin: SKIN.yellow, shirt: "#9a6ad6", pants: "#3a3f5a", hat: "hairShort", hatColor: "#e0b23a", scale: 0.8, face: "cry" });
  A("sadMan", { skin: SKIN.tan, shirt: "#4a5a7a", pants: "#2b2b33", hat: "cap", hatColor: "#3a3f4a", face: "sad" });
  A("sadWoman", { skin: SKIN.dark, shirt: "#c96a8a", pants: "#3a3f5a", hat: "hairLong", hatColor: "#1e1a18", face: "cry" });
  A("happyKid", { skin: SKIN.light, shirt: "#3dbf7a", pants: "#2f3b52", hat: "spiky", hatColor: "#6a3a1a", scale: 0.78, face: "grin" });
  for (let i = 0; i < 3; i++) A(`fun${i}`, { skin: [SKIN.light, SKIN.brown, SKIN.tan][i], shirt: "#26262c", pants: "#1c1c22", hat: ["tophat", "hairShort", "bun"][i], hatColor: ["#1e1e24", "#3a2a20", "#c9c9cf"][i], face: "sad", shirtArt: shirtArt("tie", "#1a1a1e", "#e8e8e8") });
  const kidCols = [["#d64545", "spiky", "#2a1c14"], ["#3d7be0", "cap", "#2c6e3f"], ["#f2a03a", "hairShort", "#1e1a18"], ["#8a5ad6", "hairLong", "#e0b23a"], ["#3dbf7a", "bun", "#5a3a22"], ["#e05a8a", "hairShort", "#c0592b"]];
  kidCols.forEach(([sh, h, hc], i) => A(`kid${i}`, { skin: [SKIN.yellow, SKIN.tan, SKIN.light, SKIN.brown, SKIN.dark, SKIN.light][i], shirt: sh, pants: "#2f3b52", hat: h, hatColor: hc, scale: 0.84, face: "laugh", shirtArt: i % 2 ? shirtArt("stripes", "#ffffff") : null }));
  for (let i = 0; i < 7; i++) A(`town${i}`, { skin: [SKIN.light, SKIN.tan, SKIN.brown, SKIN.dark, SKIN.yellow, SKIN.light, SKIN.tan][i], shirt: ["#b5533c", "#4a7a9a", "#d9a03a", "#6a8a4a", "#9a5a8a", "#3a6ab0", "#c94f4f"][i], pants: ["#2f3b52", "#3a3f4a", "#4a3a2a"][i % 3], hat: ["cap", "hairShort", "bun", "hairLong", "spiky", "tophat", "hairShort"][i], hatColor: ["#3a3f4a", "#2a1c14", "#d9d9de", "#5a3a22", "#1e1a18", "#1e1e24", "#e0b23a"][i], face: "shock" });
  A("fireman", { skin: SKIN.tan, shirt: "#2b2b33", pants: "#2b2b33", hat: "cap", hatColor: "#d42a2a", face: "worried", shirtArt: shirtArt("stripes", "#f2d24a") });
  A("rower0", { skin: SKIN.light, shirt: "#e05a2a", pants: "#2f3b52", hat: "cap", hatColor: "#e05a2a", face: "determined" });
  A("rower1", { skin: SKIN.brown, shirt: "#e05a2a", pants: "#2f3b52", hat: "hairShort", hatColor: "#1e1a18", face: "worried" });
  ROPE = T.rope(S); ROPE2 = T.rope(S);
}

// ------------------------------------------------------------------ staging helpers
let used = new Set();
const show = (name, x, y, z, ry = 0, pose = "idle", face, t = 0, extra = {}) => {
  const av = C[name]; used.add(name);
  av.root.visible = true; av.root.position.set(x, y, z); av.root.rotation.set(extra.rx ?? 0, ry, extra.rz ?? 0);
  poseAvatar(av, pose, extra.pose2 ?? pose, extra.k ?? 0, { t, face, blinkSeed: name.length * 1.3 + (extra.seed ?? 0), cycle: extra.cycle });
  return av;
};
const hover = (t, base = 1.2, amp = 0.15, ph = 0) => base + amp * Math.sin(t * 2.1 + ph);
const handW = (av, side = "rs") => { av.root.updateMatrixWorld(true); return av.hands[side].getWorldPosition(new THREE.Vector3()); };
const loopW = (av) => { av.root.updateMatrixWorld(true); return av.loop.getWorldPosition(new THREE.Vector3()); };
const attach = (prop, av, side = "rs", off = [0, 0, 0]) => { const p = handW(av, side); prop.position.set(p.x + off[0], p.y + off[1], p.z + off[2]); prop.visible = true; };
const facing = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]); // yaw that faces (x,z) `to`

// ------------------------------------------------------------------ scenes
const SC = {
  openTown(t) { // sad people hover; a happy kid walks on the ground
    show("sadMan", -23.5, SW + hover(t, 1.0, 0.12), 7.2, 0.4, "sad", "sad", t);
    show("sadWoman", -18.5, SW + hover(t, 1.5, 0.18, 1) + 1.2 * smooth(tw(3), tw(7), t), 7.6, -0.3, "sad", "cry", t);
    show("happyKid", -10 + 1.2 * t, SW, 6.6, Math.PI / 2, "walk", "grin", t, { cycle: "walk" });
  },
  badDay(t) {
    const drop = tw(9) + 0.05, lift = tw(14);
    const sad = t > drop + 0.35;
    const av = show("kidIce", 0, SW + 0.35 * smooth(lift - 0.1, lift + 0.35, t), 7, -0.25, sad ? "sad" : "talk", sad ? (t > lift ? "cry" : "sad") : "grin", t);
    if (t < drop) { attach(P.cone, av, "rs", [0, 0.35, 0]); scoop.position.copy(P.cone.position).add(V(0, 0.5, 0)); scoop.visible = true; }
    else { attach(P.cone, av, "rs", [0, 0.35, 0]); const u = Math.min(1, (t - drop) / 0.35); scoop.visible = true; scoop.position.copy(P.cone.position).add(V(0.3 * u, 0.5 - (P.cone.position.y + 0.5 - SW - 0.2) * u * u, 0.2 * u)); scoop.scale.set(1 + 0.6 * (u >= 1), 1 - 0.55 * (u >= 1), 1 + 0.6 * (u >= 1)); }
  },
  pet(t) {
    const fl = tw(23);
    if (t < fl) { const av = show("petKid", BED + 2, 0, 1.5, -0.5, "sad", "cry", t); attach(P.collar, av, "rs", [0, 0.1, 0.2]); P.bowl.position.set(BED + 3.5, 0, 3); P.bowl.visible = true; }
    else { const u = smooth(fl - 0.05, fl + 0.6, t); show("petKid", BED - 3, 2.9 + 1.4 * u + 0.12 * Math.sin(t * 2), -1.6, 0, "idle", "cry", t, { rx: -Math.PI / 2 * u }); P.bowl.position.set(BED + 3.5, 0, 3); P.bowl.visible = true; }
  },
  funeral(t) {
    const pos = [[-48, 7.6], [-45, 6.8], [-42, 7.4]];
    pos.forEach(([x, z], i) => {
      const up = i === 2 ? 1.4 * Math.sin(Math.min(1, Math.max(0, (t - tw(38)) / 1.2)) * Math.PI) : 0; // the third one drifts up, the brick pulls him down
      const av = show(`fun${i}`, x, SW + 0.05 + up, z, (1 - i) * 0.25, i === 1 && t > tw(35) ? "idle" : "talk", "sad", t, { seed: i });
      if (i === 1 && t > tw(35)) { const hp = handW(av); P.bricks[i].position.set(hp.x + 0.35, Math.max(SW + 1.6, hp.y - 0.2), hp.z + 0.3); P.bricks[i].visible = true; reachTo(av, "rs", P.bricks[i].position); }
      else attach(P.bricks[i], av, "rs", [0, 0.05, 0.2]);
    });
  },
  hallReveal(t) {
    show("pip", HALL, hover(t), 4, 0, "sad", "sad", t);
    show("kid0", HALL - 3.5, 0, 9, 2.6, "idle", "smirk", t); show("kid1", HALL + 3.8, 0, 10, -2.5, "idle", "neutral", t);
    ROPE.set(loopW(C.pip), V(HALL + 0.6, 0.06, 4.6), 0.4);
  },
  dadLeft(t, s) {
    const u = Math.min(1, (t - s.t0) / (s.t1 - s.t0 + 0.6));
    const dad = show("dad", -4 + 7 * u, SW, -7.2, Math.PI / 2, "walk", "sad", t, { cycle: "walk" });
    attach(P.suitcase, dad, "rs", [0, 0.1, 0]);
    show("pip", -8, 0.35 + hover(t, 1.2), -12.2, 0.35, "sad", "cry", t);
  },
  porchFloat(t) { show("pip", -8, 0.35 + hover(t, 1.25, 0.12), -11.5, 0.2, "sad", "sad", t); },
  momTie(t) {
    const pip = show("pip", -6, SW + hover(t, 1.2, 0.08), 6.8, 0.6, "sad", "sad", t);
    const lp = loopW(pip);
    const mom = show("mom", -6 - 2.4 * Math.sin(0.6), SW, 6.8 - 2.4 * Math.cos(0.6), 0.6, "idle", "worried", t);
    reachTo(mom, "rs", lp.clone().add(V(0.12, -0.05, -0.12))); reachTo(mom, "ls", lp.clone().add(V(-0.12, 0.02, -0.12)));
    ROPE.set(lp, lp.clone().add(V(-0.1, -0.9, -0.15)), 0.1); // the knot being tied: a short tail hangs from the loop
  },
  windy(t) {
    const gust = 0.5 + 0.5 * Math.sin(t * 3.1), lean = 0.35 + 0.2 * gust;
    const mom = show("mom", -2, SW, 7.2, -Math.PI / 2 + 0.3, "idle", "worried", t);
    const hpos = V(-2.0, SW + 3.6, 7.2);
    const pip = show("pip", 1.4 + 0.8 * gust, SW + 2.6 + 0.6 * gust, 7.0, -Math.PI / 2, "scared", "nervous", t, { rz: -lean });
    const lp = loopW(pip);
    reachTo(mom, "rs", lp); const hp = handW(mom, "rs");
    ROPE.set(hp, lp, 0.05);
    P.leaves.visible = true; P.leaves.children.forEach((l) => { const k = l.userData.k, ph = (t * 0.9 + k * 0.137) % 1; l.position.set(-12 + 26 * ph, SW + 1 + 5 * ((k * 0.31) % 1) + Math.sin(t * 5 + k), 4 + (k % 5) * 1.2); l.rotation.set(t * 6 + k, t * 4 + k, 0); });
  },
  hallBully(t, s) {
    const tug = s.tug ? Math.max(0, Math.sin((t - s.t0) * 7)) : 0;
    const pip = show("pip", HALL, hover(t, 1.3, 0.12) - 0.9 * tug + (s.bob ? 0.6 * Math.sin(t * 7) : 0), 2, 0.1, "scared", "worried", t);
    const laugh = (n, x, z, ry, pose = "point") => show(n, HALL + x, 0, z, ry, t % 0.6 < 0.3 ? pose : "cheer", "laugh", t, { seed: x });
    if (s.tug) { laugh("kid0", -3.6, -0.8, 2.3); laugh("kid2", 3.8, -1.2, -2.4, "facepalm"); }
    else { laugh("kid0", -3.2, 5.5, 2.6); laugh("kid2", 3.4, 5.0, -2.5, "facepalm"); }
    const tugger = show("kid1", HALL + 1.6, 0, 4.4, -2.7, "idle", "laugh", t);
    const lp = loopW(pip), floor = V(HALL + 1.2, 0.06, 3.6);
    if (s.tug || s.bob) { const hp = V(HALL + 1.4, 2.1 - 0.5 * tug, 3.4); reachTo(tugger, "rs", hp); ROPE.set(lp, handW(tugger, "rs"), 0.02); }
    else ROPE.set(lp, floor, 0.3);
  },
  ceiling(t) {
    const pip = show("pip", CLASS, 10.0, 3.0, 0, "armsUp", "cry", t, { rx: Math.PI / 2 });
    tape.forEach((tp, i) => { tp.visible = true; tp.rotation.set(0, Math.PI / 2, 0); tp.position.set(CLASS, 9.5, 3.0 + [1.0, 2.6, 5.2][i]); }); // bands across legs, waist, chest
    const seats = [[-7, 9.6], [7, 9.6], [-7, 3.1], [7, 3.1], [-3.5, 16], [3.5, 16]];
    seats.forEach(([x, z], i) => show(`kid${i}`, CLASS + x, 0, z - 0.2, Math.PI, t > tw(106) - 0.2 ? (i % 2 ? "cheer" : "lookUp") : "lookUp", t > tw(103) ? "laugh" : "grin", t, { seed: i }));
    ROPE.set(V(CLASS + 0.2, 10.6, 5.0), V(CLASS + 0.5, 6.4, 5.2), 0.2); // the string dangles from her backpack
  },
  recess(t) {
    show("pip", CLASS + 9, hover(t, 1.1, 0.08), -9.2, Math.PI - 0.15, "sad", "sad", t);
    ROPE.set(loopW(C.pip), V(CLASS + 8.4, 0.06, -8.0), 0.25);
  },
  lunch(t) {
    show("pip", CAF - 9, 1.0 + hover(t, 0.55, 0.06), 6.6, Math.PI, "sit", "sad", t);
    for (const [x, z, i] of [[9, -4.4, 0], [11, -4.4, 1], [7.5, -9.6, 2], [10.5, -9.6, 3]]) show(`kid${i}`, CAF + x, 0, z, z > -7 ? Math.PI : 0, "sit", "laugh", t, { seed: i });
  },
  flood(t, s) {
    // the hill crowd, the boy on the bus stop, the fire truck, the boat; Pip with mom until she unties the string
    const L = level(t), stopX = 20, stopZ = 8;
    // boy
    const climbA = tw(130), climbB = tw(136) + 0.2;
    if (t < tw(233)) {
      if (t < climbB) { const u = smooth(climbA, climbB, t); show("boy", stopX + 0.5, SW + 1.6 * u + 3.5 * u * u, stopZ - 2.2 + 1.2 * u, Math.PI, "climb", "nervous", t); }
      else show("boy", stopX + 0.3, 5.4, stopZ - 0.2, Math.PI - 0.2 + 0.15 * Math.sin(t * 2), t > tw(161) ? "wave" : "scared", "shock", t);
    }
    // crowd on the hill (edge at x ~ 74): faces the town (-x)
    const crowd = [[77, -8], [78.5, -4], [77.5, 6.5], [80, 9], [81, -11], [82, -1.5], [79.5, 12]];
    const hug = t > tw(250) - 0.1;
    crowd.forEach(([x, z], i) => {
      if (hug && i < 5) { const a = (i / 5) * Math.PI * 2 + 0.6, rr = 2.6 + 2.4 * smooth(tw(257), tw(258) + 0.3, t), px = 79 + rr * Math.cos(a), pz = 3 + rr * Math.sin(a); show(`town${i}`, px, HILL.h, pz, facing([px, pz], [79, 3]), "hug", "happy", t, { seed: i }); return; }
      const cheer = t > tw(245) - 0.1;
      show(`town${i}`, x, HILL.h, z, -Math.PI / 2 + (i - 3) * 0.08, cheer ? "cheer" : t > tw(160) ? (i % 2 ? "point" : "scared") : "idle", cheer ? "laugh" : "shock", t, { seed: i });
    });
    // fire truck ladder + fireman
    truck.setLen(10 + 18 * smooth(tw(146), tw(149) + 0.3, t));
    show("fireman", 88, HILL.h + 6.0, 12.5, -Math.PI / 2, t > tw(150) ? "facepalm" : "point", "worried", t);
    // the boat: pushes toward the stop, the current shoves it back and spins it
    const bu = smooth(tw(153), tw(156) + 0.1, t), bb = smooth(tw(156), tw(160), t);
    const bx = 56 - 14 * bu + 16 * bb, by = Math.max(0, L - 0.35) + 0.12 * Math.sin(t * 3);
    boatG.visible = L > 0.5; boatG.position.set(bx, by, 0.5); boatG.rotation.set(0.05 * Math.sin(t * 2.3), Math.PI / 2 + 2.6 * bb + 0.1 * Math.sin(t), 0.06 * Math.sin(t * 1.7));
    if (boatG.visible) { show("rower0", bx - 1.5, by + 0.4, 0.5, -Math.PI / 2 + 2.6 * bb, "point", "determined", t); show("rower1", bx + 1.8, by + 0.4, 0.8, -Math.PI / 2 + 2.6 * bb, "scared", "worried", t); }
    // cars float off down the street
    for (const [car, x0, z0, rot] of [[C.car1, -12, 2.5, Math.PI / 2], [C.car2, 6, -2.5, -Math.PI / 2]]) {
      const f = Math.max(0, t - tw(127)); car.position.set(x0 + 3.2 * f, Math.max(0, L - 1.1) + (f > 0 ? 0.15 * Math.sin(t * 2 + x0) : 0), z0 + 0.4 * Math.sin(f)); car.rotation.set(0.04 * Math.sin(t * 1.9 + x0), rot + 0.25 * f, 0.05 * Math.sin(t * 2.4));
    }
    // Pip + mom on the hill edge
    const momX = 76.4, momZ = 2.2;
    const flyA = tw(213), rise = tw(218), toStop = tw(228), grab = tw(233), back = tw(238), home = tw(245), land = tw(265);
    let px = 75.8, pz = 0.6, py = HILL.h + hover(t, 1.2, 0.12), face = "sad", pose = "sad", ry = -Math.PI / 2 + 0.2;
    if (t >= tw(170) && t < tw(199)) { face = t < tw(182) ? "worried" : "sad"; pose = t < tw(175) ? "idle" : "lookUp"; }
    if (t >= tw(199) && t < flyA) { face = "cry"; pose = "sad"; py += 0.6 * smooth(tw(199), tw(209), t); }
    const untie = t >= tw(209) - 0.15 && t < flyA;
    if (t >= flyA) {
      face = t < grab ? "determined" : t < home ? "happy" : "laugh";
      const p0 = V(75.8, HILL.h + 1.8, 0.6), pHigh = V(48, 22, 4), pStop = V(stopX + 2.6, 6.3, stopZ - 0.4), pUp = V(46, 13, 5), pHome = V(79, HILL.h + 1.4, 3);
      let p;
      if (t < rise) p = p0.clone().add(V(0, 2.2 * smooth(flyA, rise, t), 0));
      else if (t < toStop) p = p0.clone().add(V(0, 2.2, 0)).lerp(pHigh, smooth(rise, toStop, t));
      else if (t < back) p = pHigh.clone().lerp(pStop, smooth(toStop, grab + 0.25, t));
      else if (t < home) { const u = smooth(back, home, t); p = (u < 0.5 ? pStop.clone().lerp(pUp, u * 2) : pUp.clone().lerp(pHome, u * 2 - 1)); }
      else p = pHome.clone().setY(HILL.h + Math.max(0, 1.4 * (1 - smooth(land - 0.5, land + 0.45, t))) + (t < land ? 0.08 * Math.sin(t * 2) : 0));
      px = p.x; py = p.y; pz = p.z; ry = t < back ? -Math.PI / 2 : t < home ? Math.PI / 2 : -Math.PI / 2 + 0.4;
      pose = t < grab ? "armsUp" : t < home ? "wave" : "idle";
      if (t >= tw(250) && t < tw(258)) pose = "cheer";
      if (t >= tw(258)) pose = "idle";
    }
    const pip = show("pip", px, py, pz, ry, pose, face, t);
    show("mom", momX, HILL.h, momZ, -Math.PI / 2 - 0.5, t > tw(245) ? "cheer" : t > tw(213) ? "lookUp" : "talk", t > tw(245) ? "laugh" : t > tw(213) ? "surprised" : "worried", t);
    if (untie) reachTo(pip, "rs", loopW(pip), 0.95); // her hand goes back over her shoulder to the knot
    const mh = handW(C.mom, "rs");
    if (t < tw(210) + 0.3) ROPE.set(loopW(pip), mh, 0.15);
    else { ROPE.set(mh, V(mh.x - 0.4, HILL.h + 0.05, mh.z + 0.6), 0.2); } // untied: it hangs from mom's hand
    if (t >= grab && t < back) { // hand in hand: he reaches up from the roof, she reaches down
      const boy = show("boy", stopX + 0.3, 5.4, stopZ - 0.2, Math.PI / 2 + 0.3, "idle", "surprised", t);
      reachTo(pip, "ls", handW(boy, "ls").add(V(0, 0.9, 0))); reachTo(boy, "ls", handW(pip, "ls"));
    } else if (t >= back && t < home) { // the boy hangs from Pip's hand
      const hp = handW(pip, "ls");
      const boy = show("boy", hp.x, hp.y - 5.2 * 0.72 + 0.1, hp.z, t < back ? Math.PI : Math.PI / 2, "wave", t < back ? "shock" : "happy", t);
      reachTo(boy, "ls", hp); reachTo(pip, "ls", handW(boy, "ls"), 0.6);
    } else if (t >= home) show("boy", 81.2, HILL.h, 4.5, -Math.PI / 2 - 0.6, "cheer", "laugh", t);
  },
};

// ------------------------------------------------------------------ update per frame
export function update(ctx, t, s) {
  for (const k of used) C[k].root.visible = false; used = new Set();
  for (const p of [P.cone, scoop, P.collar, P.bowl, P.suitcase, P.leaves, ...P.bricks, ...tape]) p.visible = false;
  scoop.scale.set(1, 1, 1);
  ROPE.mesh.visible = false; ROPE2.mesh.visible = false;
  const inTown = ["openTown", "badDay", "funeral", "dadLeft", "porchFloat", "momTie", "windy", "flood"].includes(s.scene) && !s.memory;
  const isFlood = s.scene === "flood";
  ctx.core.setMood(isFlood ? storm(t) : 0, !inTown && !s.memory ? true : ["hallBully", "lunch"].includes(s.scene));
  water.set(isFlood ? level(t) : 0, t, 0.55);
  rainFx.set(isFlood && storm(t) > 0.3, t, ctx.camera.position);
  // cars: parked unless the flood moves them
  if (!isFlood) { C.car1.position.set(-12, 0, 2.5); C.car1.rotation.set(0, Math.PI / 2, 0); C.car2.position.set(6, 0, -2.5); C.car2.rotation.set(0, -Math.PI / 2, 0); }
  boatG.visible = false; truck.setLen(10);
  SC[s.scene](t, s);
}

// ------------------------------------------------------------------ shots (one per noun / beat, pinned to word indices)
export function SHOTS(ctx) {
  const pip = () => C.pip.root.position;
  const pipAt = (dy = 2.6) => (t) => { const p = C.pip.root.position; return [p.x, p.y + dy, p.z]; };
  return [
    { w: 0, scene: "openTown", at: [-18, 3.4, 7], dist: 24, yaw: 28, pitch: 10, move: "push", K: 0.3, fov: 44, name: "rule" },
    { w: 3, scene: "openTown", at: [-18.5, 5.0, 7.6], dist: 12, yaw: -20, pitch: 4, move: "rise", K: 0.25, name: "lighter" },
    { w: 7, scene: "badDay", at: [0, 3.6, 7], dist: 7.5, yaw: 15, pitch: 6, move: "push", K: 0.22, name: "badDay" },
    { w: 12, scene: "badDay", at: [0, 0.9, 7], dist: 6.5, yaw: -10, pitch: 2, move: "slideR", K: 0.25, name: "feetLift" },
    { w: 20, scene: "pet", at: [BED + 2, 3.4, 1.5], dist: 9.5, yaw: -25, pitch: 8, move: "push", K: 0.2, name: "pet" },
    { w: 23, scene: "pet", at: [BED - 3, 3.6, -3.6], dist: 9, yaw: 15, pitch: 30, move: "orbitL", K: 0.2, name: "bedFloat" },
    { w: 32, scene: "funeral", at: [-45, 3.3, 7.2], dist: 9, yaw: 5, pitch: 6, move: "push", K: 0.2, name: "bricks" },
    { w: 38, scene: "funeral", at: [-45, 3.6, 7.2], dist: 15, yaw: -25, pitch: 10, move: "pull", K: 0.2, name: "stayDown" },
    { w: 44, scene: "hallReveal", at: [HALL, 2.2, 4], dist: 15, yaw: 0, pitch: 4, move: "rise", K: 0.35, name: "nobody" },
    { w: 49, scene: "hallReveal", at: [HALL, 4.9, 4], dist: 6.5, yaw: 8, pitch: -4, move: "push", K: 0.12, name: "Pip" },
    { w: 50, scene: "dadLeft", at: [-4.5, 3.4, -9.5], dist: 19, yaw: 4, pitch: 8, move: "slideR", K: 0.2, name: "dadLeft" },
    { w: 55, scene: "porchFloat", at: [-8, 2.4, -11.5], dist: 9, yaw: 20, pitch: 0, move: "rise", K: 0.2, name: "foot" },
    { w: 63, scene: "momTie", at: [-6.8, 3.3, 5.6], dist: 11, yaw: 124, pitch: 20, move: "push", K: 0.15, name: "tie" },
    { w: 71, scene: "windy", at: [-0.3, 3.6, 7], dist: 17, yaw: 10, pitch: 6, move: "shake", K: 0.2, name: "windy" },
    { w: 79, scene: "hallBully", at: [HALL, 3.6, 4], dist: 13, yaw: 10, pitch: 14, move: "push", K: 0.2, name: "balloonGirl" },
    { w: 84, scene: "hallBully", tug: true, at: [HALL + 0.8, 2.8, 3.2], dist: 9, yaw: -50, pitch: 10, move: "push", K: 0.15, name: "tug" },
    { w: 91, scene: "hallBully", bob: true, at: [HALL, 3.4, 2], dist: 8, yaw: -20, pitch: 4, move: "orbitR", K: 0.2, name: "bob" },
    { w: 95, scene: "ceiling", at: [CLASS, 9.6, 5.5], dist: 8.5, yaw: -30, pitch: -60, move: "push", K: 0.15, fov: 50, name: "ceiling" },
    { w: 102, scene: "ceiling", at: [CLASS - 2, 5, 6], dist: 17, yaw: 160, pitch: 16, move: "pull", K: 0.2, name: "classLaughs" },
    { w: 107, scene: "recess", at: [CLASS + 9, 4.2, -10], dist: 12, yaw: 20, pitch: 6, move: "push", K: 0.18, name: "recess" },
    { w: 113, scene: "flood", at: [10, 5, 0], dist: 55, yaw: 15, pitch: 18, move: "push", K: 0.25, fov: 46, name: "storm" },
    { w: 116, scene: "flood", at: [0, 2, 0], dist: 22, yaw: 25, pitch: 8, move: "shake", K: 0.3, name: "flooded" },
    { w: 119, scene: "flood", at: [-25, 2.2, 0], dist: 18, yaw: 100, pitch: 8, move: "slideR", K: 0.3, name: "rushed" },
    { w: 126, scene: "flood", follow: () => [C.car2.position.x - 4, 3, 0], dist: 26, yaw: 30, pitch: 18, move: "push", K: 0.15, name: "cars" },
    { w: 130, scene: "flood", at: [20, 5, 8], dist: 16, yaw: -30, pitch: 8, move: "rise", K: 0.2, name: "busStop" },
    { w: 141, scene: "flood", at: [20, 5.5, 8], dist: 14, yaw: 20, pitch: 2, move: "push", K: 0.2, name: "rising" },
    { w: 146, scene: "flood", at: [50, 7, 9], dist: 50, yaw: 95, pitch: 25, move: "push", K: 0.15, name: "ladder" },
    { w: 153, scene: "flood", follow: () => [boatG.position.x, 3.0, boatG.position.z], dist: 22, yaw: 25, pitch: 18, move: "shake", K: 0.25, name: "boat" },
    { w: 160, scene: "flood", at: [79, HILL.h + 3, -3], dist: 14, yaw: -95, pitch: 8, move: "push", K: 0.2, name: "hill" },
    { w: 165, scene: "flood", at: [20, 5.5, 8], dist: 30, yaw: 30, pitch: 20, move: "pull", K: 0.3, name: "reach" },
    { w: 170, scene: "flood", follow: pipAt(2.6), dist: 7, yaw: -75, pitch: 4, move: "push", K: 0.18, name: "looked" },
    { w: 175, scene: "flood", follow: () => { const p = loopW(C.pip); return [p.x, p.y - 0.2, p.z]; }, dist: 4.5, yaw: 100, pitch: 12, move: "push", K: 0.15, name: "string" },
    { w: 182, scene: "dadLeft", memory: true, filter: MEM, at: [-4.5, 3.4, -9.5], dist: 17, yaw: 4, pitch: 8, move: "push", K: 0.2, name: "memDad" },
    { w: 187, scene: "lunch", memory: true, filter: MEM, at: [CAF - 9, 3, 6.6], dist: 11, yaw: 200, pitch: 12, move: "pull", K: 0.2, name: "memLunch" },
    { w: 193, scene: "hallBully", memory: true, tug: true, filter: MEM, at: [HALL + 0.8, 2.8, 3.2], dist: 9, yaw: -50, pitch: 10, move: "push", K: 0.2, name: "memTug" },
    { w: 199, scene: "flood", follow: pipAt(3.0), dist: 4.6, yaw: -80, pitch: 4, move: "push", K: 0.2, name: "feel" },
    { w: 209, scene: "flood", follow: () => { const p = loopW(C.pip); return [p.x, p.y, p.z]; }, dist: 5.5, yaw: 115, pitch: 16, move: "push", K: 0.12, name: "untie" },
    { w: 213, scene: "flood", follow: () => [C.pip.root.position.x, C.pip.root.position.y + 1.2, C.pip.root.position.z], dist: 12, yaw: -100, pitch: 2, move: "rise", K: 0.2, name: "feetLeft" },
    { w: 218, scene: "flood", follow: pipAt(1.5), dist: 26, yaw: -60, pitch: -4, move: "pull", K: 0.2, fov: 48, name: "rose" },
    { w: 228, scene: "flood", follow: pipAt(1.8), dist: 14, yaw: 40, pitch: 10, move: "push", K: 0.15, name: "straight" },
    { w: 233, scene: "flood", at: [21.4, 6.6, 7.7], dist: 12, yaw: 10, pitch: 8, move: "push", K: 0.15, name: "grab" },
    { w: 238, scene: "flood", follow: pipAt(-0.6), dist: 18, yaw: 20, pitch: 10, move: "orbitL", K: 0.2, name: "floatBack" },
    { w: 245, scene: "flood", at: [79, HILL.h + 3, 2], dist: 18, yaw: -100, pitch: 12, move: "push", K: 0.2, name: "town" },
    { w: 250, scene: "flood", at: [79, HILL.h + 3.2, 3], dist: 10, yaw: -80, pitch: 18, move: "orbitR", K: 0.25, name: "hug" },
    { w: 258, scene: "flood", follow: pipAt(2.6), dist: 5.5, yaw: -60, pitch: 15, move: "push", K: 0.15, name: "firstTime" },
    { w: 265, scene: "flood", follow: () => [C.pip.root.position.x, HILL.h + 0.9, C.pip.root.position.z], dist: 6, yaw: -45, pitch: 6, move: "push", K: 0.12, name: "touched" },
  ];
}
