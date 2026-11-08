// Episode 03: The Glowing Boy. "In this town, whenever you get scared, you glow."
// Places: TOWN street at x 0 (houses north, school at z -60 facing the street), HALL 300, CLASS 400, AUD 500 (school
// auditorium with a stage), BED 600. Rule made visible: scared people glow (emissive body + a warm point light).
import * as THREE from "three";
import { makeAvatar, poseAvatar, reachTo, SKIN, shirtArt } from "/kit/20_r6.js";
import * as T from "/kit/45_town.js";
import { baseplate } from "/kit/10_core.js";
import { ease } from "/kit/40_cam.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HALL = 300, CLASS = 400, AUD = 500, BED = 600, SW = 0.3;
const smooth = (a, b, t) => ease((t - a) / (b - a));
let W = {};
const tw = (i) => W[i];
export const coreOpts = {};
let C = {}, P = {}, roomLights = [], used = new Set(), dog, blanket, flash = 0;

// ------------------------------------------------------------------ glow
const glowOf = new Map();
function setGlow(av, k) {
  let g = glowOf.get(av);
  if (!g) {
    const mats = new Set(); av.root.traverse((o) => { if (o.isMesh && o.material && o.material.emissive) mats.add(o.material); });
    const light = new THREE.PointLight("#ffcf6a", 0, 16, 1.6); light.position.set(0, 3.2, 2.2); av.root.add(light);
    const head = av.j.head.material;
    g = { mats: [...mats], light, head }; glowOf.set(av, g);
  }
  for (const m of g.mats) { m.emissive.set("#ffb030"); m.emissiveIntensity = (m === g.head ? 0.12 : 0.32) * Math.min(k, 1.6); } // face kept readable
  g.light.intensity = 22 * k * k;
}

export async function build(ctx) {
  const S = ctx.scene;
  ctx.words.forEach((w, i) => (W[i] = w.start));
  baseplate(ctx.core);
  // town street + school
  T.road(S, -140, -5, 140, 5); T.sidewalk(S, -140, -9, 140, -5); T.sidewalk(S, -140, 5, 140, 9);
  [[-52, "#f2d9a0", "#3b5a46"], [-30, "#e9e2cf", "#5a4a6a"], [14, "#f0c9c0", "#3d4f7a"], [36, "#d9e8c4", "#6a4a3a"]].forEach(([x, w, r]) => T.house(S, { x, z: -20, wall: w, roof: r }));
  T.house(S, { x: -40, z: 30, wall: "#e6d6f0", roof: "#4a4a5a", rot: Math.PI }); T.house(S, { x: -10, z: 30, wall: "#f2e6c4", roof: "#5a3b3b", rot: Math.PI }); T.house(S, { x: 20, z: 30, wall: "#cfe3f0", roof: "#3b5a46", rot: Math.PI });
  T.school(S, { x: -8, z: -46 });
  for (const x of [-41, -19, 25, 47]) T.tree(S, x, -12, 0.85);
  for (const x of [-36, -14, 8, 30]) T.lamp(S, x, 7.6);
  T.busStop(S, 20, 8, Math.PI); T.fence(S, 30, -12.5, 46);
  // interiors
  T.room(S, { x: HALL, z: 0, w: 14, d: 60, h: 11, floor: (r) => T.TEX.tile("#e9e9e4", "#c9ccd2", r), wall: "#e6e1d3", front: true });
  for (const [sx, rot, colr] of [[-6.4, Math.PI / 2, "#4f7fb8"], [6.4, -Math.PI / 2, "#c94f4f"]]) { const g = new THREE.Group(); g.position.set(HALL + sx, 0, sx < 0 ? -24 : 24); g.rotation.y = rot; S.add(g); T.lockers(g, 0, 0, 25, colr); }
  T.room(S, { x: CLASS, z: 0, w: 30, d: 26, h: 11, wall: "#f0e6cc", front: true, windows: [{ wall: "back", at: -9, w: 4, h: 4, y: 3.5 }, { wall: "back", at: 9, w: 4, h: 4, y: 3.5 }] });
  T.chalkboard(S, CLASS, 6, -12.6, 12, 5);
  for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) { T.desk(S, CLASS + c * 7, -1 + r * 6.5); T.chair(S, CLASS + c * 7, 1.5 + r * 6.5, Math.PI); }
  T.room(S, { x: AUD, z: 0, w: 40, d: 34, h: 13, wall: "#d9c8b0", front: true });
  T.block(S, [AUD - 16, 0, -17], [AUD + 16, 2.4, -6], new THREE.MeshStandardMaterial({ map: T.TEX.wood("#a8723f", [6, 2]), roughness: 0.7 })); // stage
  for (const s of [-1, 1]) T.block(S, [AUD + s * 16 - (s > 0 ? 4 : 0), 2.4, -16.8], [AUD + s * 16 + (s < 0 ? 4 : 0), 12.8, -14.5], T.col("#9a1f2a", 0.9)); // curtains
  T.block(S, [AUD - 16, 11, -16.8], [AUD + 16, 12.8, -14.5], T.col("#9a1f2a", 0.9));
  for (let r = 0; r < 3; r++) for (let c = -2; c <= 2; c++) T.chair(S, AUD + c * 4.5, 2 + r * 5, 0, "#6a2a3a");
  T.room(S, { x: BED, z: 0, w: 18, d: 16, h: 10, wall: "#cfe0f2", front: true, windows: [{ wall: "back", at: 3, w: 5, h: 4.5, y: 3.5 }] });
  T.bed(S, BED - 4, -2.5, 0);
  S.traverse((o) => { if (o.isPointLight) roomLights.push([o, o.intensity]); });
  // props: a blocky dog, the blanket, an EXIT sign, costumes
  dog = new THREE.Group(); S.add(dog);
  const fur = T.col("#8a5a34", 0.8);
  T.block(dog, [-0.7, 1.1, -1.4], [0.7, 2.2, 1.2], fur); T.block(dog, [-0.6, 1.8, 1.0], [0.6, 3.0, 2.2], fur); T.block(dog, [-0.35, 1.9, 2.2], [0.35, 2.4, 2.8], T.col("#6a4426", 0.8));
  T.block(dog, [-0.15, 2.25, 2.75], [0.15, 2.5, 2.9], T.col("#111", 0.4));
  for (const sx of [-0.45, 0.45]) for (const sz of [-1.1, 0.9]) T.block(dog, [sx - 0.18, 0, sz - 0.18], [sx + 0.18, 1.1, sz + 0.18], fur);
  for (const sx of [-0.6, 0.6]) T.block(dog, [sx - 0.12, 2.6, 1.3], [sx + 0.12, 3.3, 1.6], T.col("#6a4426", 0.8));
  T.block(dog, [-0.1, 1.8, -1.9], [0.1, 2.1, -1.3], fur);
  for (const sx of [-0.25, 0.25]) T.block(dog, [sx - 0.06, 2.55, 2.21], [sx + 0.06, 2.7, 2.23], T.col("#111", 0.3));
  dog.visible = false;
  blanket = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.6, 2.6), new THREE.MeshStandardMaterial({ color: "#5a6fb8", roughness: 0.95, emissive: "#ffc95a", emissiveIntensity: 0.0 }));
  blanket.castShadow = true; S.add(blanket); blanket.visible = false;
  P.exit = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshBasicMaterial({ color: "#d42a2a" })); P.exit.position.set(HALL, 9.2, 29.6); P.exit.rotation.y = Math.PI; S.add(P.exit);
  // cast (original characters)
  const A = (name, o) => { const av = makeAvatar(o); av.root.visible = false; S.add(av.root); C[name] = av; return av; };
  A("ollie", { skin: SKIN.light, shirt: "#3dbf7a", pants: "#2f3b52", hat: "hairShort", hatColor: "#6a3a1a", backpack: "#3d7be0", scale: 0.82, face: "nervous" });
  A("teacher", { skin: SKIN.tan, shirt: "#8a5ad6", pants: "#3a3f5a", hat: "bun", hatColor: "#3a2a20", glasses: true, face: "neutral" });
  A("man", { skin: SKIN.brown, shirt: "#4a7a9a", pants: "#2b2b33", hat: "cap", hatColor: "#3a3f4a", face: "shock" });
  A("girl", { skin: SKIN.dark, shirt: "#e05a8a", pants: "#3a3f5a", hat: "hairLong", hatColor: "#1e1a18", scale: 0.8, face: "nervous" });
  const kc = [["#d64545", "spiky", "#2a1c14"], ["#3d7be0", "cap", "#2c6e3f"], ["#f2a03a", "hairShort", "#1e1a18"], ["#8a5ad6", "hairLong", "#e0b23a"], ["#f2c230", "bun", "#5a3a22"], ["#e05a8a", "hairShort", "#c0592b"], ["#5a9a6a", "spiky", "#1e1a18"], ["#c94f4f", "cap", "#3a3f4a"]];
  kc.forEach(([sh, h, hc], i) => A(`kid${i}`, { skin: [SKIN.yellow, SKIN.tan, SKIN.light, SKIN.brown, SKIN.dark, SKIN.light, SKIN.tan, SKIN.brown][i], shirt: sh, pants: "#2f3b52", hat: h, hatColor: hc, scale: 0.82, face: "laugh", shirtArt: i % 2 ? shirtArt("stripes", "#ffffff") : null }));
}

// ------------------------------------------------------------------ staging helpers
const show = (name, x, y, z, ry = 0, pose = "idle", face, t = 0, extra = {}) => {
  const av = C[name]; used.add(name);
  av.root.visible = true; av.root.position.set(x, y, z); av.root.rotation.set(extra.rx ?? 0, ry, extra.rz ?? 0);
  poseAvatar(av, pose, pose, 0, { t, face, blinkSeed: name.length * 1.3 + (extra.seed ?? 0), cycle: extra.cycle });
  if (extra.glow !== undefined) setGlow(av, extra.glow);
  return av;
};
const handW = (av, side = "rs") => { av.root.updateMatrixWorld(true); return av.hands[side].getWorldPosition(new THREE.Vector3()); };
const flick = (t, base) => base * (0.9 + 0.1 * Math.sin(t * 13) * Math.sin(t * 7.3));
/** night / blackout: k 0 = normal, 1 = pitch black (only glow lights are left) */
function darkness(ctx, k, outdoorNight = false) {
  const c = ctx.core;
  c.sun.intensity *= 1 - 0.97 * k; c.hemi.intensity *= 1 - 0.8 * k; c.fill.intensity = 0.45 * (1 - k);
  for (const [l, i0] of roomLights) l.intensity = i0 * (1 - k);
  if (outdoorNight || k > 0) {
    const u = c.sky.material.uniforms, n = outdoorNight ? 1 : k;
    u.top.value.lerp(new THREE.Color("#02040a"), n); u.hor.value.lerp(new THREE.Color("#0b1222"), n); c.scene.fog.color.lerp(new THREE.Color("#0b1222"), n);
  }
}

// ------------------------------------------------------------------ scenes
const line = (t, n, from, dir, gap, pose = "walk") => { // kids following in a line behind a leader at `from`, heading along `dir`
  for (let i = 0; i < n; i++) { const p = from.clone().addScaledVector(dir, -(i + 1) * gap); show(`kid${i}`, p.x + (i % 2 ? 0.6 : -0.6), 0, p.z, Math.atan2(dir.x, dir.z), pose, i % 3 ? "nervous" : "surprised", t, { cycle: "walk", seed: i, glow: 0.04 }); }
};
const SC = {
  rule(t) { // three people on the street glowing by how scared they are
    show("girl", -3, SW, 7, 0.3, "idle", "nervous", t, { glow: 0.35 });
    show("man", 2.5, SW, 6.6, -0.3, "scared", "shock", t, { glow: 0.9 });
    show("kid0", -7, SW, 7.4, 0.2, "idle", "smile", t, { glow: 0 });
    dog.visible = true; dog.position.set(5.5, SW, 9.5); dog.rotation.y = -2.2;
  },
  fingers(t) { const g = show("girl", -3, SW, 7, 0.3, "think", "nervous", t, { glow: 0.3 + 0.1 * Math.sin(t * 6) }); },
  lamp(t) {
    show("man", 2.5, SW + 0.25 * Math.max(0, Math.sin((t - tw(17)) * 12)) * (t < tw(17) + 0.26 ? 1 : 0), 6.6, -0.3, "scared", "shock", t, { glow: Math.min(1.6, 0.3 + 1.4 * smooth(tw(16), tw(20), t)) });
    dog.visible = true; dog.position.set(5.5, SW, 9.5); dog.rotation.y = -2.2; dog.position.y = SW + 0.2 * Math.abs(Math.sin(t * 9));
  },
  reveal(t) {
    show("ollie", HALL, 0, 6, 0, "scared", "nervous", t, { glow: flick(t, 1.6) });
    show("kid1", HALL - 3.5, 0, 11, 2.6, "point", "surprised", t, { glow: 0 }); show("kid2", HALL + 3.6, 0, 12, -2.5, "idle", "smirk", t, { glow: 0 });
  },
  dogs(t) {
    show("ollie", -3, SW, 7, Math.PI / 2, "scared", "shock", t, { glow: flick(t, 1.4) });
    dog.visible = true; dog.position.set(2.2, SW + 0.25 * Math.abs(Math.sin(t * 10)), 7); dog.rotation.y = -Math.PI / 2;
  },
  thunder(t) {
    flash = Math.max(0, 1 - ((t - tw(36) - 0.05) % 0.9) / 0.18) * (t > tw(36) ? 1 : 0);
    show("ollie", BED - 4, 2.6, -2.2, 0.3, "duck", "shock", t, { glow: flick(t, 1.3) });
  },
  talking(t) {
    show("ollie", CLASS - 1, 0, -10.2, 0.15, "talk", "nervous", t, { glow: flick(t, 1.2) });
    show("teacher", CLASS + 7, 0, -9.6, -0.9, "idle", "neutral", t, { glow: 0 });
    [[-7, 1.2], [0, 1.2], [7, 1.2], [-7, 7.7], [7, 7.7]].forEach(([x, z], i) => show(`kid${i}`, CLASS + x, 1.0, z + 0.3, Math.PI, "sit", "smirk", t, { glow: 0, seed: i }));
  },
  everyDay(t, s) {
    const x = -11 + 2.6 * (t - s.t0);
    show("ollie", x, SW, 6.8, Math.PI / 2, "walk", "nervous", t, { cycle: "walk", glow: flick(t, 1.1) });
    show("kid3", x + 6, SW, 7.6, -1.6, "point", "laugh", t, { glow: 0 }); show("kid4", x + 7.2, SW, 6.4, -1.8, "cheer", "laugh", t, { glow: 0 });
  },
  nightlight(t) { // school yard: kids point and laugh at the glowing kid
    show("ollie", -8, SW, -30, 0, "sad", "sad", t, { glow: flick(t, 1.1) });
    [[-12, -26], [-4, -26.5], [-10.5, -23], [-5.5, -22.5]].forEach(([x, z], i) => show(`kid${i}`, x, SW, z, Math.atan2(-8 - x, -30 - z), t % 0.5 < 0.25 ? "point" : "cheer", "laugh", t, { glow: 0, seed: i }));
  },
  blankets(t) {
    const drop = smooth(tw(53), tw(54) + 0.1, t);
    show("ollie", -8, SW, -30, 0, "scared", "cry", t, { glow: flick(t, 1.3) });
    blanket.visible = true; blanket.position.set(-8, SW + 2.3 + 4 * (1 - drop), -30); blanket.material.emissiveIntensity = 0.25 * drop + 0.05 * Math.sin(t * 9);
    [[-11, -27.5], [-5, -27.5], [-9.5, -25]].forEach(([x, z], i) => show(`kid${i}`, x, SW, z, Math.atan2(-8 - x, -30 - z), i === 0 ? "armsUp" : "cheer", "laugh", t, { glow: 0, seed: i }));
  },
  schoolNight(t, s, ctx) { // the school at night: windows lit, then the power goes out
    const out = smooth(tw(64), tw(65), t);
    darkness(ctx, 0, true); ctx.core.sun.intensity *= 0.05; ctx.core.hemi.intensity *= 0.25;
    P.winGlow = out;
    for (const [l, i0] of roomLights) l.intensity = 0;
    show("kid5", -8, SW, -40, Math.PI, "idle", "neutral", t, { glow: 0 });
  },
  townNight(t, s, ctx) { darkness(ctx, 0.6, true); ctx.core.sun.intensity *= 0.05; },
  play(t, s, ctx) { // the school play: kids on stage, then the lights die
    const k = smooth(tw(73), tw(73) + 0.2, t); darkness(ctx, k * 0.97);
    [[-4, -11], [0, -10.5], [4, -11]].forEach(([x, z], i) => show(`kid${i}`, AUD + x, 2.4, z, 0, k > 0.5 ? "scared" : ["wave", "cheer", "point"][i], k > 0.5 ? "shock" : "grin", t, { glow: 0.05 * k, seed: i }));
    for (let i = 3; i < 7; i++) show(`kid${i}`, AUD - 7 + (i - 3) * 4.5, 1.0, 7.3 + (i % 2) * 5, Math.PI, "sit", k > 0.5 ? "shock" : "smile", t, { glow: 0.04 * k, seed: i });
    show("ollie", AUD + 4.5, 1.0, 2.3, Math.PI, "sit", k > 0.5 ? "nervous" : "smile", t, { glow: 0.15 * k });
  },
  halls(t, s, ctx) { darkness(ctx, 0.97); [[-2, 4], [2.5, 8], [-1, 14]].forEach(([x, z], i) => show(`kid${i}`, HALL + x, 0, z, Math.PI + (i - 1) * 0.6, "scared", "shock", t, { glow: 0.1, seed: i })); },
  screamed(t, s, ctx) { darkness(ctx, 0.95); [[-3, -8], [0, -9], [3, -8]].forEach(([x, z], i) => show(`kid${i}`, AUD + x, 2.4, z + 2, 0.2 * (i - 1), "scared", "shock", t, { glow: 0.12, seed: i })); },
  tripped(t, s, ctx) {
    darkness(ctx, 0.95); const f = smooth(tw(82), tw(84), t);
    show("teacher", AUD - 2, 0, 9.6 + 0.6 * f, 0, "scared", "shock", t, { rx: 1.3 * f, glow: 0.8 });
  },
  exits(t, s, ctx) { darkness(ctx, 0.97); P.exitDark = true; [[-3, 2], [3, -2], [0, 6]].forEach(([x, z], i) => show(`kid${i + 3}`, HALL + x, 0, z, (t * 0.8 + i) % 6.3, "walk", "worried", t, { cycle: "walk", glow: 0.1, seed: i })); },
  terrified(t, s, ctx) { darkness(ctx, 0.97); show("ollie", HALL, 0, 4, 0, "scared", "cry", t, { glow: flick(t, 0.4 + 0.8 * smooth(tw(91), tw(95), t)) }); },
  brighter(t, s, ctx) {
    darkness(ctx, 0.97); const g = 1.2 + 1.6 * smooth(tw(96), tw(100), t);
    show("ollie", HALL, 0, 4, 0, "armsUp", "determined", t, { glow: flick(t, g) });
    [[-3, 8], [3, 9], [-1.5, 13], [2, 15]].forEach(([x, z], i) => show(`kid${i}`, HALL + x, 0, z, Math.atan2(-x, 4 - z), "idle", "surprised", t, { glow: 0.05, seed: i }));
  },
  hand(t, s, ctx) {
    darkness(ctx, 0.97);
    const o = show("ollie", HALL - 0.8, 0, 4, 0.4, "idle", "determined", t, { glow: flick(t, 2.4) });
    const k = show("kid0", HALL + 1.6, 0, 4.6, -0.6, "idle", "nervous", t, { glow: 0.1 });
    const m = handW(o, "ls").lerp(handW(k, "rs"), 0.5); m.y = 2.6;
    reachTo(o, "ls", m); reachTo(k, "rs", m);
  },
  walkOut(t, s, ctx) { // down the dark hall toward the camera, the line following
    darkness(ctx, 0.97);
    const z = -20 + 3.0 * (t - s.t0), o = show("ollie", HALL, 0, z, 0, "walk", "determined", t, { cycle: "walk", glow: flick(t, 2.4) });
    line(t, 7, V(HALL, 0, z), V(0, 0, 1), 3.0);
  },
  outside(t, s, ctx) { // out of the school doors into the night, then home along the street
    darkness(ctx, 0.6, true); ctx.core.sun.intensity *= 0.05; ctx.core.hemi.intensity *= 0.6;
    const u = t - s.t0, z = -34 + 2.6 * u;
    show("ollie", -8 + (s.street ? 2.6 * u : 0), SW, s.street ? 6.8 : z, s.street ? Math.PI / 2 : 0, "walk", "happy", t, { cycle: "walk", glow: flick(t, 2.0) });
    line(t, 7, s.street ? V(-8 + 2.6 * u, 0, 6.8) : V(-8, 0, z), s.street ? V(1, 0, 0) : V(0, 0, 1), 2.8);
    for (let i = 0; i < 7; i++) C[`kid${i}`].root.position.y = SW, C[`kid${i}`].setFace("happy");
  },
  callback(t, s, ctx) {
    darkness(ctx, 0.6, true); ctx.core.sun.intensity *= 0.05; ctx.core.hemi.intensity *= 0.6;
    show("ollie", -8, SW, -24, 0, "idle", "proud", t, { glow: flick(t, 1.6) });
    for (let i = 0; i < 6; i++) { const a = -1.3 + i * 0.52, x = -8 + 4 * Math.sin(a), z = -24 - 3.5 * Math.cos(a); show(`kid${i}`, x, SW, z, Math.atan2(-8 - x, -24 - z), i % 2 ? "cheer" : "idle", "happy", t, { glow: 0, seed: i }); }
  },
};

// ------------------------------------------------------------------ per frame
let winMats = null;
export function update(ctx, t, s) {
  for (const k of used) { const av = C[k]; av.root.visible = false; setGlow(av, 0); }
  used = new Set(); dog.visible = false; blanket.visible = false; flash = 0; P.winGlow = 0; P.exitDark = false;
  const inside = ["reveal", "thunder", "talking", "play", "halls", "screamed", "tripped", "exits", "terrified", "brighter", "hand", "walkOut"].includes(s.scene);
  ctx.core.setMood(s.scene === "thunder" ? 1 : 0, inside);
  ctx.core.fill.intensity = 0.45;
  for (const [l, i0] of roomLights) l.intensity = i0;
  SC[s.scene](t, s, ctx);
  if (flash) { ctx.core.hemi.intensity += 3 * flash; }
  // lit windows at night on the school (window backing planes): brighter before the blackout
  if (!winMats) { winMats = []; ctx.scene.traverse((o) => { if (o.isMesh && o.material?.color && o.material.color.getHexString() === "2b3346") winMats.push(o.material); }); winMats = [...new Set(winMats)]; }
  const lit = s.scene === "schoolNight" ? 1 - P.winGlow : 0;
  for (const m of winMats) { m.emissive = m.emissive ?? new THREE.Color(); m.emissive.set("#ffd27a"); m.emissiveIntensity = 0.9 * lit; }
  P.exit.material.color.set(P.exitDark ? "#3a0a0e" : "#d42a2a");
}

export function SHOTS(ctx) {
  const ol = (dy = 2.3) => () => { const p = C.ollie.root.position; return [p.x, p.y + dy, p.z]; };
  return [
    { w: 0, scene: "rule", at: [0, 3.2, 7.4], dist: 22, yaw: 8, pitch: 8, move: "push", K: 0.25, name: "rule" },
    { w: 9, scene: "fingers", at: [-3, 3.2, 7], dist: 6, yaw: 20, pitch: 4, move: "push", K: 0.2, name: "fingers" },
    { w: 16, scene: "lamp", at: [3.4, 3.0, 7.4], dist: 12, yaw: -20, pitch: 6, move: "shake", K: 0.3, name: "lamp" },
    { w: 25, scene: "reveal", at: [HALL, 2.6, 7], dist: 13, yaw: 0, pitch: 4, move: "push", K: 0.35, name: "nobody" },
    { w: 31, scene: "dogs", at: [-0.5, 2.6, 7], dist: 11, yaw: 15, pitch: 6, move: "shake", K: 0.25, name: "dogs" },
    { w: 36, scene: "thunder", at: [BED - 4, 4.4, -2.2], dist: 9, yaw: 20, pitch: 10, move: "push", K: 0.2, name: "thunder" },
    { w: 37, scene: "talking", at: [CLASS - 1, 3.4, -8], dist: 14, yaw: 0, pitch: 14, move: "push", K: 0.2, name: "class" },
    { w: 41, scene: "everyDay", follow: ol(2.4), dist: 15, yaw: 20, pitch: 8, move: "slideR", K: 0.15, name: "everyDay" },
    { w: 48, scene: "nightlight", at: [-8, 2.6, -27], dist: 14, yaw: 0, pitch: 12, move: "push", K: 0.25, name: "nightlight" },
    { w: 52, scene: "blankets", at: [-8, 2.6, -28], dist: 12, yaw: 15, pitch: 10, move: "push", K: 0.2, name: "blankets" },
    { w: 59, scene: "schoolNight", at: [-8, 9, -46], dist: 62, yaw: 10, pitch: 10, move: "push", K: 0.2, name: "schoolNight" },
    { w: 66, scene: "townNight", at: [0, 4, -10], dist: 50, yaw: 25, pitch: 14, move: "pull", K: 0.2, name: "townNight" },
    { w: 70, scene: "play", at: [AUD, 4.2, -8], dist: 22, yaw: 0, pitch: 6, move: "push", K: 0.2, name: "play" },
    { w: 74, scene: "halls", at: [HALL, 3, 8], dist: 16, yaw: 0, pitch: 4, move: "push", K: 0.25, name: "halls" },
    { w: 79, scene: "screamed", at: [AUD, 5, -7], dist: 10, yaw: 0, pitch: 4, move: "shake", K: 0.3, name: "screamed" },
    { w: 81, scene: "tripped", at: [AUD - 2, 2, 10.5], dist: 13, yaw: 90, pitch: 18, move: "push", K: 0.2, name: "tripped" },
    { w: 85, scene: "exits", at: [HALL, 4, 2], dist: 14, yaw: 0, pitch: 12, move: "orbitL", K: 0.2, name: "exits" },
    { w: 90, scene: "terrified", at: [HALL, 3.6, 4], dist: 6, yaw: 0, pitch: 2, move: "push", K: 0.2, name: "terrified" },
    { w: 96, scene: "brighter", at: [HALL, 3.4, 8], dist: 18, yaw: 180, pitch: 8, move: "pull", K: 0.25, name: "brighter" },
    { w: 102, scene: "hand", at: [HALL + 0.4, 2.8, 4.3], dist: 9, yaw: 0, pitch: 6, move: "push", K: 0.15, name: "hand" },
    { w: 108, scene: "walkOut", follow: ol(2.2), dist: 13, yaw: 0, pitch: 8, move: "push", K: 0.1, name: "walkOut" },
    { w: 114, scene: "walkOut", follow: ol(1.0), dist: 10, yaw: 35, pitch: 4, move: "slideR", K: 0.15, name: "step" },
    { w: 117, scene: "outside", follow: ol(2.4), dist: 18, yaw: 25, pitch: 18, move: "push", K: 0.15, name: "outside" },
    { w: 121, scene: "callback", at: [-8, 2.6, -24], dist: 12, yaw: 0, pitch: 12, move: "orbitR", K: 0.2, name: "callback" },
    { w: 126, scene: "outside", street: true, follow: () => { const p = C.ollie.root.position; return [p.x - 3, 3, p.z]; }, dist: 17, yaw: 15, pitch: 20, move: "pull", K: 0.15, name: "home" },
  ];
}
