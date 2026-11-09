// Episode 04: The Heavy Shoes. "In this town, every time you do something kind, your shoes get heavier."
// Places: TOWN street at x 0 (school at z -46), PLAY playground east of the houses (x 60-110), HALL 300, CLASS 400.
// Rule made visible: kind people wear huge blocky shoes (size = kindness). The windstorm blows +x.
import * as THREE from "three";
import { makeAvatar, poseAvatar, reachTo, SKIN, shirtArt } from "/kit/20_r6.js";
import * as T from "/kit/45_town.js";
import { baseplate } from "/kit/10_core.js";
import { ease } from "/kit/40_cam.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HALL = 300, CLASS = 400, SW = 0.3, PX = 84, PZ = 34; // playground centre
const smooth = (a, b, t) => ease((t - a) / (b - a));
let W = {};
const tw = (i) => W[i];
export const coreOpts = {};
let C = {}, used = new Set(), leaves, trees = [];

// ------------------------------------------------------------------ shoes
const shoeOf = new Map();
function setShoes(av, s) { // s = 0 normal sneakers .. 1 huge
  let g = shoeOf.get(av);
  if (!g) {
    g = [];
    for (const leg of [av.j.lh, av.j.rh]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#e8e4dc", roughness: 0.6 }));
      const sole = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#c0392b", roughness: 0.7 }));
      m.castShadow = sole.castShadow = true; leg.add(m); leg.add(sole); g.push([m, sole]);
    }
    shoeOf.set(av, g);
  }
  s = Math.min(1, s); const w = 0.96, h = 0.45 + 0.55 * s, d = 1.3 + 1.1 * s; // each foot stays under its own leg
  for (const [m, sole] of g) {
    m.scale.set(w, h, d); m.position.set(0, -2 + h / 2 + 0.12, 0.15 + 0.35 * s);
    sole.scale.set(w + 0.06, 0.18, d + 0.06); sole.position.set(0, -2 + 0.09, 0.15 + 0.35 * s);
  }
  return 0.12; // lift so the soles sit on the ground
}

export async function build(ctx) {
  const S = ctx.scene;
  ctx.words.forEach((w, i) => (W[i] = w.start));
  baseplate(ctx.core);
  T.road(S, -140, -5, 140, 5); T.sidewalk(S, -140, -9, 140, -5); T.sidewalk(S, -140, 5, 140, 9);
  [[-52, "#f2d9a0", "#3b5a46"], [-30, "#e9e2cf", "#5a4a6a"], [14, "#f0c9c0", "#3d4f7a"], [36, "#d9e8c4", "#6a4a3a"]].forEach(([x, w, r]) => T.house(S, { x, z: -20, wall: w, roof: r }));
  T.house(S, { x: -40, z: 30, wall: "#e6d6f0", roof: "#4a4a5a", rot: Math.PI }); T.house(S, { x: -10, z: 30, wall: "#f2e6c4", roof: "#5a3b3b", rot: Math.PI });
  T.school(S, { x: -8, z: -46 });
  for (const x of [-41, -19, 25]) T.tree(S, x, -12, 0.85);
  for (const x of [-36, -14, 8, 30]) T.lamp(S, x, 7.6);
  // playground: a fence along the back, a running track, swings frame, trees that bend in the wind
  T.fence(S, PX - 26, PZ - 14, PX + 26);
  const track = new THREE.Mesh(new THREE.RingGeometry(14, 17, 64), T.col("#c9573d", 0.9)); track.rotation.x = -Math.PI / 2; track.position.set(PX, 0.03, PZ + 4); track.receiveShadow = true; S.add(track);
  const sw = new THREE.Group(); sw.position.set(PX - 18, 0, PZ - 6); S.add(sw);
  for (const sx of [-3, 3]) T.block(sw, [sx - 0.2, 0, -0.2], [sx + 0.2, 6, 0.2], T.col("#3d7be0", 0.4));
  T.block(sw, [-3.2, 5.8, -0.25], [3.2, 6.2, 0.25], T.col("#3d7be0", 0.4));
  for (const [x, z] of [[PX + 22, PZ - 10], [PX - 24, PZ + 12], [PX + 26, PZ + 14]]) trees.push(T.tree(S, x, z, 1));
  // interiors
  T.room(S, { x: HALL, z: 0, w: 14, d: 60, h: 11, floor: (r) => T.TEX.tile("#e9e9e4", "#c9ccd2", r), wall: "#e6e1d3", front: true });
  for (const [sx, rot, colr] of [[-6.4, Math.PI / 2, "#4f7fb8"], [6.4, -Math.PI / 2, "#c94f4f"]]) { const g = new THREE.Group(); g.position.set(HALL + sx, 0, sx < 0 ? -24 : 24); g.rotation.y = rot; S.add(g); T.lockers(g, 0, 0, 25, colr); }
  T.room(S, { x: CLASS, z: 0, w: 30, d: 26, h: 11, wall: "#f0e6cc", front: true, windows: [{ wall: "back", at: -9, w: 4, h: 4, y: 3.5 }, { wall: "back", at: 9, w: 4, h: 4, y: 3.5 }] });
  T.chalkboard(S, CLASS, 6, -12.6, 12, 5);
  for (let r = 0; r < 2; r++) for (let c = -1; c <= 1; c++) { T.desk(S, CLASS + c * 7, -1 + r * 7); T.chair(S, CLASS + c * 7, 1.5 + r * 7, Math.PI); }
  // flying leaves (windstorm)
  leaves = new THREE.Group(); S.add(leaves);
  for (let i = 0; i < 70; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.3), T.col(["#d9862a", "#c9502a", "#e0b23a", "#6a9a3a"][i % 4], 0.8)); l.userData.k = i; leaves.add(l); }
  leaves.visible = false;
  // cast
  const A = (name, o) => { const av = makeAvatar(o); av.root.visible = false; S.add(av.root); C[name] = av; return av; };
  A("theo", { skin: SKIN.tan, shirt: "#f2a03a", pants: "#3c5a8a", hat: "spiky", hatColor: "#3a2a20", scale: 0.84, face: "sad", shirtArt: shirtArt("star", "#ffffff") });
  A("teacher", { skin: SKIN.light, shirt: "#5a9a6a", pants: "#3a3f5a", hat: "bun", hatColor: "#8a4a2a", glasses: true, face: "neutral" });
  A("teacher2", { skin: SKIN.brown, shirt: "#4a7a9a", pants: "#2b2b33", hat: "hairShort", hatColor: "#1e1a18", face: "neutral" });
  A("lady", { skin: SKIN.light, shirt: "#b768c9", pants: "#5b4a6b", hat: "bun", hatColor: "#d9d9de", glasses: true, face: "smile" });
  A("man", { skin: SKIN.tan, shirt: "#2b2b33", pants: "#2b2b33", hat: "tophat", hatColor: "#1e1e24", face: "smirk", shirtArt: shirtArt("tie", "#c0303a", "#ffffff") });
  const kc = [["#d64545", "spiky", "#2a1c14"], ["#3d7be0", "cap", "#2c6e3f"], ["#3dbf7a", "hairShort", "#1e1a18"], ["#8a5ad6", "hairLong", "#e0b23a"], ["#f2c230", "bun", "#5a3a22"], ["#e05a8a", "hairShort", "#c0592b"], ["#5a9a6a", "spiky", "#1e1a18"], ["#c94f4f", "cap", "#3a3f4a"]];
  kc.forEach(([sh, h, hc], i) => A(`kid${i}`, { skin: [SKIN.yellow, SKIN.tan, SKIN.light, SKIN.brown, SKIN.dark, SKIN.light, SKIN.tan, SKIN.brown][i], shirt: sh, pants: "#2f3b52", hat: h, hatColor: hc, scale: 0.8, face: "laugh", shirtArt: i % 2 ? shirtArt("stripes", "#ffffff") : null }));
}

// ------------------------------------------------------------------ helpers
const show = (name, x, y, z, ry = 0, pose = "idle", face, t = 0, extra = {}) => {
  const av = C[name]; used.add(name);
  const lift = setShoes(av, extra.shoes ?? 0) * av.root.scale.x;
  av.root.visible = true; av.root.position.set(x, y + (extra.air ? 0 : lift), z); av.root.rotation.set(extra.rx ?? 0, ry, extra.rz ?? 0);
  poseAvatar(av, pose, extra.pose2 ?? pose, extra.k ?? 0, { t, face, blinkSeed: name.length * 1.3 + (extra.seed ?? 0), cycle: extra.cycle });
  return av;
};
const handW = (av, side = "rs") => { av.root.updateMatrixWorld(true); return av.hands[side].getWorldPosition(new THREE.Vector3()); };
const wind = (t) => smooth(tw(69), tw(72), t) * (1 - smooth(tw(116), tw(118), t));
const THEO = [PX - 6, PZ + 2];

// ------------------------------------------------------------------ scenes
const SC = {
  rule(t) {
    show("lady", -4, SW, 7, 0.3, "walk", "smile", t, { shoes: 0.75, cycle: "walk" });
    show("man", 2, SW, 6.6, -0.4, "idle", "smirk", t, { shoes: 0 });
    show("kid0", 6, SW, 7.4, -0.2, "wave", "grin", t, { shoes: 0.25 });
  },
  homework(t) { // helping with homework: the helper's shoes grow
    const g = 0.1 + 0.4 * smooth(tw(17), tw(23) + 0.2, t);
    const h = show("kid2", CLASS + 1.4, 0, -0.2, -0.6, "point", "smile", t, { shoes: g });
    show("kid3", CLASS - 0.4, 1.0, 1.6, Math.PI, "sit", "surprised", t, { shoes: 0 });
  },
  everyDay(t) {
    const x = -2 + 0.6 * (t - tw(24));
    show("lady", x, SW, 7, Math.PI / 2, "walk", "worried", t, { shoes: 1.0, cycle: "walk" });
    C.lady.j.lh.rotation.x *= 0.3; C.lady.j.rh.rotation.x *= 0.3;
  },
  reveal(t) {
    show("theo", HALL, 0, 6, 0, "idle", "sad", t, { shoes: 1.6 });
    show("kid1", HALL - 3.5, 0, 11, 2.6, "point", "laugh", t); show("kid2", HALL + 3.6, 0, 12, -2.5, "idle", "smirk", t);
  },
  stomp(t, s) {
    const u = t - s.t0, step = Math.floor(u * 2.2), ph = (u * 2.2) % 1;
    const theo = show("theo", HALL, 0, -6 + 1.6 * u, 0, "idle", "determined", t, { shoes: 1.6 });
    const up = Math.sin(Math.PI * ph) * 0.7;
    (step % 2 ? theo.j.lh : theo.j.rh).rotation.x = -up; theo.j.rs.rotation.x = 0.5 * (step % 2 ? 1 : -1); theo.j.ls.rotation.x = -0.5 * (step % 2 ? 1 : -1);
    s.shakeT = ph < 0.12 ? 1 : 0;
  },
  race(t, s) {
    const u = t - s.t0;
    for (let i = 0; i < 4; i++) { const a = -0.4 + (u * (0.42 + 0.03 * i)); show(`kid${i}`, PX + 15.5 * Math.cos(a), 0, PZ + 4 + 15.5 * Math.sin(a), Math.PI - a, "run", "grin", t, { cycle: "run", shoes: 0, seed: i }); }
    const b = -0.55 + u * 0.06; show("theo", PX + 15.5 * Math.cos(b), 0, PZ + 4 + 15.5 * Math.sin(b), Math.PI - b, "walk", "sad", t, { cycle: "walk", shoes: 1.6 });
  },
  bricks(t) {
    const f = smooth(tw(64), tw(65) + 0.2, t);
    show("theo", PX, 0, PZ, 0.2, f > 0.5 ? "scared" : "walk", f > 0.5 ? "cry" : "sad", t, { shoes: 1.6, rx: 1.35 * f });
    if (f > 0) C.theo.root.position.y = Math.max(0.4, C.theo.root.position.y) + 0.0;
    [[-3.5, -3.5], [3.5, -3], [0, -5.5]].forEach(([dx, dz], i) => show(`kid${i}`, PX + dx, 0, PZ + dz, Math.atan2(-dx, -dz), t % 0.5 < 0.25 ? "point" : "cheer", "laugh", t, { seed: i }));
  },
  storm(t, s, ctx) { // the wind arrives: leaves blow +x, kids slide, then lift off
    const w = wind(t), slide = smooth(tw(75), tw(81), t), lift = smooth(tw(82), tw(86), t);
    for (let i = 0; i < 6; i++) {
      const bx = PX - 12 + (i % 3) * 5, bz = PZ + 4 + Math.floor(i / 3) * 5;
      const x = bx + 6 * slide + 9 * lift * (1 + i * 0.2), y = lift * (2 + i * 0.8 + 0.6 * Math.sin(t * 3 + i));
      show(`kid${i}`, x, y, bz, -Math.PI / 2, lift > 0.2 ? "armsUp" : "scared", "shock", t, { rz: -0.35 * slide - 1.0 * lift, seed: i, air: lift > 0.05 });
    }
    show("theo", THEO[0], 0, THEO[1], 0.5, "scared", "worried", t, { shoes: 1.6 });
  },
  fence(t) {
    const off = smooth(tw(93), tw(94) + 0.15, t);
    show("teacher", PX + 4 + 10 * off, 1.2 * Math.sin(t * 9) * (1 - off) + off * 4, PZ - 13, 0, off > 0.1 ? "armsUp" : "hug", "shock", t, { rz: -1.2 * off, rx: -0.3, air: true });
    show("teacher2", PX + 9 + 13 * off, 0.8 * Math.sin(t * 8) * (1 - off) + off * 5.5, PZ - 13, 0, off > 0.1 ? "armsUp" : "hug", "shock", t, { rz: -1.3 * off, rx: -0.3, air: true });
  },
  planted(t) { show("theo", THEO[0], 0, THEO[1], 0.3, "idle", "determined", t, { shoes: 1.6 }); },
  grab(t) { // he grabs one kid, then another: a chain streaming out downwind (+x)
    const theo = show("theo", THEO[0], 0, THEO[1], -0.3, "idle", "determined", t, { shoes: 1.6 });
    const n = t < tw(106) ? 1 : t < tw(108) ? 2 : 6;
    chain(t, theo, n);
  },
  chainWide(t) { const theo = show("theo", THEO[0], 0, THEO[1], -0.3, "idle", "determined", t, { shoes: 1.6 }); chain(t, theo, 6); },
  calm(t, s) { // the storm is over: everyone on the ground round Theo
    show("theo", THEO[0], 0, THEO[1], 0, "idle", "proud", t, { shoes: 1.6 });
    for (let i = 0; i < 6; i++) { const a = -1.4 + i * 0.56, x = THEO[0] + 4.2 * Math.sin(a), z = THEO[1] - 4.2 * Math.cos(a); show(`kid${i}`, x, 0, z, Math.atan2(THEO[0] - x, THEO[1] - z), i % 2 ? "hug" : "cheer", "happy", t, { seed: i }); }
    show("teacher", THEO[0] - 6, 0, THEO[1] - 2, 1.2, "cheer", "laugh", t);
  },
};
function chain(t, theo, n) { // kids stream up and out downwind, head toward Theo, each holding the next one's ankles
  const h0 = handW(theo, "rs"), dir = V(0.55, 0.83, 0), base = V(h0.x + 0.4, h0.y + 0.4, h0.z), rz = Math.PI - Math.atan2(0.55, 0.83);
  for (let i = 0; i < n; i++) {
    const sway = 0.35 * Math.sin(t * 7 + i * 0.9) * (0.4 + 0.2 * i);
    const p = base.clone().addScaledVector(dir, (i + 1) * 4.3); p.x += sway;
    show(`kid${i}`, p.x, p.y, p.z, 0, "armsUp", i ? "nervous" : "shock", t, { rz: rz + 0.05 * Math.sin(t * 9 + i), seed: i, air: true });
  }
  reachTo(theo, "rs", base.clone().addScaledVector(dir, 0.6));
}

// ------------------------------------------------------------------ per frame
export function update(ctx, t, s) {
  for (const k of used) C[k].root.visible = false; used = new Set();
  const w = ["storm", "fence", "planted", "grab", "chainWide"].includes(s.scene) ? wind(t) : 0;
  const inside = ["homework", "reveal", "stomp"].includes(s.scene);
  ctx.core.setMood(0.75 * w, inside);
  s.shakeT = 0;
  SC[s.scene](t, s, ctx);
  leaves.visible = w > 0.05;
  if (leaves.visible) leaves.children.forEach((l) => { const k = l.userData.k, ph = (t * 1.6 + k * 0.073) % 1; l.position.set(PX - 40 + 80 * ph, 0.5 + 9 * ((k * 0.37) % 1) + Math.sin(t * 6 + k), PZ - 10 + (k % 9) * 3); l.rotation.set(t * 9 + k, t * 7 + k, 0); });
  for (const [i, tr] of trees.entries()) tr.rotation.z = -0.12 * w * (1 + 0.4 * Math.sin(t * 5 + i));
}

export function SHOTS(ctx) {
  const th = (dy = 2.3) => () => { const p = C.theo.root.position; return [p.x, p.y + dy, p.z]; };
  return [
    { w: 0, scene: "rule", at: [1, 3, 7.2], dist: 20, yaw: 8, pitch: 6, move: "push", K: 0.25, name: "rule" },
    { w: 9, scene: "rule", at: [-4, 1.2, 7], dist: 7, yaw: 20, pitch: 4, move: "slideR", K: 0.2, name: "shoes" },
    { w: 13, scene: "homework", at: [CLASS + 0.5, 2.6, 0.6], dist: 11, yaw: 20, pitch: 10, move: "push", K: 0.2, name: "homework" },
    { w: 18, scene: "homework", at: [CLASS + 1.4, 0.8, -0.2], dist: 6, yaw: 30, pitch: 6, move: "push", K: 0.2, name: "sneakers" },
    { w: 24, scene: "everyDay", follow: () => { const p = C.lady.root.position; return [p.x, 1.8, p.z]; }, dist: 10, yaw: 25, pitch: 4, move: "slideR", K: 0.15, name: "everyDay" },
    { w: 35, scene: "reveal", at: [HALL, 2.4, 7], dist: 13, yaw: 0, pitch: 4, move: "push", K: 0.35, name: "nobody" },
    { w: 41, scene: "reveal", at: [HALL, 0.9, 6.5], dist: 6, yaw: 15, pitch: 6, move: "push", K: 0.15, name: "Theo" },
    { w: 42, scene: "stomp", follow: th(2.2), dist: 12, yaw: 10, pitch: 4, move: "pull", K: 0.15, name: "stomp" },
    { w: 50, scene: "race", at: [PX + 11, 2, PZ + 4], dist: 30, yaw: 20, pitch: 22, move: "push", K: 0.15, name: "race" },
    { w: 56, scene: "bricks", at: [PX, 2.4, PZ + 3], dist: 14, yaw: 15, pitch: 14, move: "push", K: 0.2, name: "bricks" },
    { w: 66, scene: "storm", at: [PX - 4, 4, PZ + 4], dist: 34, yaw: 25, pitch: 10, move: "shake", K: 0.2, name: "windstorm" },
    { w: 75, scene: "storm", at: [PX - 6, 2.5, PZ + 6], dist: 20, yaw: 15, pitch: 8, move: "slideR", K: 0.3, name: "sliding" },
    { w: 81, scene: "storm", at: [PX + 2, 6, PZ + 6], dist: 24, yaw: 10, pitch: -4, move: "shake", K: 0.3, name: "feetLeft" },
    { w: 87, scene: "fence", at: [PX + 10, 3.5, PZ - 13], dist: 18, yaw: 10, pitch: 6, move: "shake", K: 0.25, name: "fence" },
    { w: 96, scene: "planted", at: [THEO[0], 1.2, THEO[1]], dist: 8, yaw: 30, pitch: 4, move: "push", K: 0.15, name: "inch" },
    { w: 99, scene: "planted", at: [THEO[0], 3.6, THEO[1]], dist: 7, yaw: 20, pitch: 2, move: "push", K: 0.15, name: "move" },
    { w: 102, scene: "grab", at: [THEO[0] + 4, 7, THEO[1]], dist: 30, yaw: 8, pitch: 4, move: "shake", K: 0.2, name: "grab" },
    { w: 108, scene: "chainWide", at: [THEO[0] + 8, 13, THEO[1]], dist: 50, yaw: 8, pitch: 6, move: "pull", K: 0.12, name: "class" },
    { w: 116, scene: "calm", at: [THEO[0], 2.6, THEO[1]], dist: 16, yaw: 10, pitch: 14, move: "orbitL", K: 0.2, name: "kindness" },
    { w: 125, scene: "calm", at: [THEO[0], 2.0, THEO[1] - 1], dist: 13, yaw: 5, pitch: 10, move: "pull", K: 0.2, name: "ground" },
  ];
}
