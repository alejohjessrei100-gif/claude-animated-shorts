// Episode 04 (v2, rebuilt on the detailed kit): The Heavy Shoes.
// Places: MAPLE ST (x 0: cottages / two-storey / modern houses north, shops south, street props, extras, traffic),
// the playground (PX, PZ: slide, swings, monkey bars, seesaw, sandbox, court, picnic tables), HALL 300, CLASS 400.
// Rule made visible: kind people's sneakers are bigger and heavier (setShoes 0..1.2); every character acts on keys.
import * as THREE from "three";
import { makeAvatar, poseAvatar, reachTo, SKIN, shirtArt } from "/kit/20_r6.js";
import { track, act } from "/kit/25_anim.js";
import * as T from "/kit/45_town.js";
import * as D from "/kit/46_detail.js";
import { baseplate } from "/kit/10_core.js";
import { ease } from "/kit/40_cam.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HALL = 300, CLASS = 400, SW = 0.3, PX = 84, PZ = 40;
const smooth = (a, b, t) => ease((t - a) / (b - a));
let W = {};
const tw = (i) => W[i];
export const coreOpts = {};
let C = {}, used = new Set(), leaves, trees = [], swingSet, seesawG, cloudsG, cars = [], extras = [];

export async function build(ctx) {
  const S = ctx.scene;
  ctx.words.forEach((w, i) => (W[i] = w.start));
  baseplate(ctx.core);
  // ---- Maple St
  T.road(S, -160, -5, 160, 5); T.sidewalk(S, -160, -9, 160, -5); T.sidewalk(S, -160, 5, 160, 9);
  D.cottage(S, { x: -50, z: -24, wall: "#f2d9a0", roof: "#3b5a46", shutter: "#3b5a46", door: "#2f5f9a" });
  D.twoStorey(S, { x: -28, z: -24, wall: "#cfe3f0", roof: "#3d4f7a" });
  D.cottage(S, { x: -4, z: -24, wall: "#f0c9c0", roof: "#6a4a3a", shutter: "#ffffff", door: "#3a3f4a", flowers: "#8a5ad6" });
  D.modern(S, { x: 20, z: -24 });
  D.twoStorey(S, { x: 42, z: -24, wall: "#d9e8c4", roof: "#5a4a6a", door: "#b5533c" });
  [["CRUMB & CO", "#c97a4a", "#2f5f9a", ["#d64545", "#ffffff"]], ["PET PALACE", "#7a8a9a", "#3dbf7a", ["#3dbf7a", "#ffffff"]], ["SCOOPS", "#e8b4c8", "#8a5ad6", ["#8a5ad6", "#ffffff"]], ["BOOK NOOK", "#a8723f", "#1e7a3a", ["#f2c230", "#3a2a20"]]]
    .forEach(([name, wall, sign, aw], i) => D.shop(S, { x: -36 + i * 15, z: 22, rot: Math.PI, name, wall, sign, awning: aw }));
  for (const [x, f] of [[-42, D.roundTree], [-16, D.roundTree], [8, D.pine], [32, D.roundTree], [54, D.roundTree]]) f(S, x, -12.5, 0.85);
  for (const x of [-36, -10, 14, 38]) T.lamp(S, x, 7.6);
  D.hydrant(S, -22, -7.2); D.trashCan(S, -12, -7.6); D.bench(S, 3, -7.6, Math.PI); D.bike(S, 12, -7.2, 0.15); D.streetSign(S, -26, 7.4, "MAPLE ST", "OAK AVE"); D.trashCan(S, 18, 7.6, "#3a5a8a");
  D.flowers(S, -6, -13.5, 14, 2.4); D.flowers(S, -48, -13.5, 12, 2);
  cloudsG = D.clouds(S, 10, 360, 75);
  cars = [T.car(S, -60, -2.5, Math.PI / 2, "#d64545"), T.car(S, 70, 2.5, -Math.PI / 2, "#2f6fd0")];
  // ---- the playground behind the school fence
  T.fence(S, PX - 34, PZ - 18, PX + 34);
  D.court(S, PX + 22, PZ + 8, 18, 26); D.hoop(S, PX + 22, PZ + 21, Math.PI);
  D.slide(S, PX - 20, PZ - 6, 0.4); swingSet = D.swings(S, PX + 30, PZ - 10); D.monkeyBars(S, PX - 22, PZ + 12, 0.2);
  seesawG = D.seesaw(S, PX - 6, PZ + 18); D.sandbox(S, PX + 8, PZ + 20); D.picnicTable(S, PX - 30, PZ - 10, 0.3); D.picnicTable(S, PX + 36, PZ - 6, -0.2);
  for (const [x, z] of [[PX + 40, PZ + 18], [PX - 40, PZ + 20], [PX + 44, PZ - 12]]) trees.push(D.roundTree(S, x, z, 1.05));
  trees.push(D.pine(S, PX - 42, PZ - 10, 1.2));
  D.flowers(S, PX - 10, PZ - 14, 16, 3);
  T.school(S, { x: PX, z: PZ + 46, rot: Math.PI });
  // ---- school hallway: lockers, doors, posters, trophy case, fountain, clock, lights
  T.room(S, { x: HALL, z: 0, w: 16, d: 64, h: 11, floor: (r) => T.TEX.tile("#e9e9e4", "#b9c6d6", r), wall: "#e6e1d3", front: true, ceiling: true });
  for (const [sx, rot, colr] of [[-7.4, Math.PI / 2, "#4f7fb8"], [7.4, -Math.PI / 2, "#c94f4f"]]) for (const [z0, n] of [[-30, 7], [0, 7]]) { const g = new THREE.Group(); g.position.set(HALL + sx, 0, sx < 0 ? z0 : z0 + 2 * 7 * 1.9 - 13.3); g.rotation.y = rot; S.add(g); T.lockers(g, 0, 0, n, colr); }
  D.classroomDoor(S, HALL - 7.6, -14, Math.PI / 2, "104"); D.classroomDoor(S, HALL + 7.6, -8, -Math.PI / 2, "107", "#3dbf7a"); D.classroomDoor(S, HALL - 7.6, 16, Math.PI / 2, "106", "#e8601c");
  D.trophyCase(S, HALL + 7.65, 18, -Math.PI / 2); D.fountain(S, HALL - 7.65, 24, Math.PI / 2);
  D.poster(S, HALL - 7.65, 6.5, -20, Math.PI / 2, "READ!"); D.poster(S, HALL + 7.65, 6.5, 6, -Math.PI / 2, "BE KIND", "#8fd0f0", "#3d7be0"); D.poster(S, HALL - 7.65, 6.5, 4, Math.PI / 2, "TEAM!", "#a0e0a0", "#1e7a3a");
  D.bulletin(S, HALL + 7.65, 5.6, 28, -Math.PI / 2); D.wallClock(S, HALL, 9, -31.6, 0);
  D.ceilingLights(S, HALL, HALL, -28, 28, 10.9, 8);
  // ---- classroom: desks, teacher desk, bookshelves, posters, clock, blinds, backpacks
  T.room(S, { x: CLASS, z: 0, w: 32, d: 28, h: 11, wall: "#f0e6cc", front: true, windows: [{ wall: "back", at: -10, w: 5, h: 4.5, y: 3.5 }, { wall: "back", at: 10, w: 5, h: 4.5, y: 3.5 }] });
  T.chalkboard(S, CLASS, 6, -13.6, 12, 5);
  for (const sx of [-10, 10]) D.windowBlinds(S, CLASS + sx, 6.4, -13.4, 0, 5, 2.6);
  D.teacherDesk(S, CLASS - 10, -9, 0.2); D.bookshelf(S, CLASS + 15.6, -4, -Math.PI / 2, 6); D.bookshelf(S, CLASS + 15.6, 4, -Math.PI / 2, 6);
  D.poster(S, CLASS - 15.65, 6, -4, Math.PI / 2, "MATH", "#f0a0c0", "#d64545"); D.poster(S, CLASS - 15.65, 6, 3, Math.PI / 2, "STARS", "#8fd0f0", "#2f5f9a"); D.wallClock(S, CLASS + 8, 9.4, -13.6, 0);
  for (let k = 0; k < 5; k++) D.backpackOnHook(S, CLASS - 15.6, 3.2, -10 + k * 2.2, Math.PI / 2, ["#d64545", "#3d7be0", "#f2c230", "#3dbf7a", "#8a5ad6"][k]);
  for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) { T.desk(S, CLASS + c * 7, -3 + r * 6.5); T.chair(S, CLASS + c * 7, -0.6 + r * 6.5, Math.PI); }
  D.ceilingLights(S, CLASS - 8, CLASS + 8, -6, 6, 10.9, 8);
  // flying leaves
  leaves = new THREE.Group(); S.add(leaves);
  for (let i = 0; i < 90; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.3), T.col(["#d9862a", "#c9502a", "#e0b23a", "#6a9a3a"][i % 4], 0.8)); l.userData.k = i; leaves.add(l); }
  leaves.visible = false;
  // ---- cast (original characters with layered outfits)
  const A = (name, o) => { const av = makeAvatar(o); av.root.visible = false; S.add(av.root); C[name] = av; return av; };
  A("theo", { skin: SKIN.tan, shirt: "#f2a03a", pants: "#3c5a8a", hat: "spiky", hatColor: "#3a2a20", top: "hoodie", outer: "#e8783a", scale: 0.84, face: "sad", sole: "#2f5f9a" });
  A("teacher", { skin: SKIN.light, shirt: "#ffffff", pants: "#3a3f5a", hat: "bun", hatColor: "#8a4a2a", glasses: true, top: "jacket", outer: "#5a9a6a", belt: "#3a2a20", face: "neutral" });
  A("coach", { skin: SKIN.brown, shirt: "#d64545", pants: "#2b2b33", hat: "cap", hatColor: "#2f5f9a", top: "long", outer: "#2f5f9a", face: "neutral" });
  A("lady", { skin: SKIN.light, shirt: "#b768c9", pants: "#5b4a6b", hat: "bun", hatColor: "#d9d9de", glasses: true, top: "long", outer: "#b768c9", face: "smile", sole: "#8a5ad6" });
  A("man", { skin: SKIN.tan, shirt: "#ffffff", pants: "#2b2b33", hat: "tophat", hatColor: "#1e1e24", top: "jacket", outer: "#2b2b33", face: "smirk", shirtArt: shirtArt("tie", "#c0303a", "#ffffff") });
  const kc = [["#d64545", "spiky", "#2a1c14", "tee"], ["#3d7be0", "cap", "#2c6e3f", "hoodie"], ["#3dbf7a", "hairShort", "#1e1a18", "jacket"], ["#8a5ad6", "hairLong", "#e0b23a", "tee"], ["#f2c230", "bun", "#5a3a22", "long"], ["#e05a8a", "hairShort", "#c0592b", "hoodie"], ["#5a9a6a", "spiky", "#1e1a18", "tee"], ["#c94f4f", "cap", "#3a3f4a", "jacket"]];
  kc.forEach(([sh, h, hc, top], i) => A(`kid${i}`, { skin: [SKIN.yellow, SKIN.tan, SKIN.light, SKIN.brown, SKIN.dark, SKIN.light, SKIN.tan, SKIN.brown][i], shirt: sh, pants: ["#2f3b52", "#3a3f5a", "#4a3a2a"][i % 3], hat: h, hatColor: hc, top, outer: ["#ffffff", "#2b2b33", "#e8b23a", "#3a6ea5"][i % 4], scale: 0.8, face: "laugh", shirtArt: top === "tee" && i % 2 ? shirtArt("stripes", "#ffffff") : null, sole: ["#d64545", "#2f5f9a", "#3dbf7a"][i % 3] }));
  // background extras on Maple St (walk loops)
  for (let i = 0; i < 6; i++) extras.push(A(`ex${i}`, { skin: [SKIN.light, SKIN.brown, SKIN.tan, SKIN.dark, SKIN.light, SKIN.yellow][i], shirt: ["#4a7a9a", "#d9a03a", "#9a5a8a", "#6a8a4a", "#c94f4f", "#3a6ab0"][i], pants: ["#2f3b52", "#3a3f4a", "#4a3a2a"][i % 3], hat: ["cap", "hairShort", "bun", "hairLong", "spiky", "hairShort"][i], hatColor: ["#3a3f4a", "#2a1c14", "#d9d9de", "#5a3a22", "#1e1a18", "#e0b23a"][i], top: ["long", "jacket", "tee", "hoodie", "tee", "jacket"][i], outer: ["#4a7a9a", "#6a4a2e", "#9a5a8a", "#e05a8a", "#c94f4f", "#2b2b33"][i], face: "smile" }));
}

// ------------------------------------------------------------------ staging helpers
const place = (name, x, y, z, ry = 0, shoes = 0, rot = {}) => {
  const av = C[name]; used.add(name);
  const lift = av.setShoes(shoes) * av.root.scale.x;
  av.root.visible = true; av.root.position.set(x, y + (rot.air ? 0 : lift), z); av.root.rotation.set(rot.rx ?? 0, ry, rot.rz ?? 0);
  return av;
};
const show = (name, x, y, z, ry, pose, face, t, o = {}) => { const av = place(name, x, y, z, ry, o.shoes ?? 0, o); poseAvatar(av, pose, o.pose2 ?? pose, o.k ?? 0, { t, face, blinkSeed: name.length * 1.3 + (o.seed ?? 0), cycle: o.cycle, heavy: o.heavy, look: o.look, lean: o.lean, speed: o.speed, add: o.add }); return av; };
const actor = (name, x, y, z, ry, keys, t, o = {}) => { const av = place(name, x, y, z, ry, o.shoes ?? 0, o); act(av, keys, t, { t, blinkSeed: name.length * 1.3 + (o.seed ?? 0), cycle: o.cycle, heavy: o.heavy, speed: o.speed }); return av; };
const handW = (av, side = "rs") => { av.root.updateMatrixWorld(true); return av.hands[side].getWorldPosition(new THREE.Vector3()); };
const wind = (t) => smooth(tw(69), tw(72), t) * (1 - smooth(tw(116), tw(117) + 0.2, t));
const THEO = [PX - 4, PZ + 4];
function street(t) { // extras walk the sidewalks, cars drive by
  extras.forEach((e, i) => { const dir = i % 2 ? 1 : -1, z = -7.2 - (i % 2) * 0.9, x = ((i * 23 + dir * t * 2.4) % 120 + 180) % 120 - 60; show(`ex${i}`, x, SW, z + (i % 3) * 0.5, dir > 0 ? Math.PI / 2 : -Math.PI / 2, "walk", "smile", t, { cycle: "walk", seed: i }); });
  cars[0].position.x = ((t * 9 + 60) % 200) - 100; cars[1].position.x = 100 - ((t * 7 + 40) % 200);
}

// ------------------------------------------------------------------ scenes
const SC = {
  rule(t) { // three neighbours: the kindest one has the biggest shoes
    street(t);
    actor("lady", -6 + 0.9 * (t - tw(0)), SW, 6.6, Math.PI / 2, track([0, "walk", "smile"]), t, { shoes: 0.8, cycle: "walk", heavy: 0.6, speed: 0.8 });
    actor("man", 3, SW, 6.2, -0.5, track([0, "idle", "smirk"], [tw(5), "shrug", "smirk"], [tw(9), "idle", "smirk"]), t, { shoes: 0 });
    actor("kid0", 8, SW, 7.0, -0.8, track([0, "wave", "grin"], [tw(6), "idle", "smile"]), t, { shoes: 0.35 });
  },
  shoesClose(t) { street(t); actor("lady", -2 + 0.7 * (t - tw(9)), SW, 6.6, Math.PI / 2, track([0, "walk", "smile"]), t, { shoes: 0.8, cycle: "walk", heavy: 0.6, speed: 0.8 }); },
  homework(t) { // Juno leans over to help with homework; her sneakers swell on "pound"
    const g = 0.1 + 0.6 * smooth(tw(21), tw(23) + 0.25, t);
    actor("kid4", CLASS + 1.8, 0, -0.4, -0.9, track([0, "helpDesk", "smile"], [tw(17), "point", "grin", { ease: "back" }], [tw(19), "helpDesk", "happy"], [tw(22), "lookUp", "surprised", { ease: "back" }]), t, { shoes: g });
    actor("kid3", CLASS, 0, 0.5, Math.PI, track([0, "sitWrite", "worried"], [tw(19), "sitWrite", "surprised"], [tw(21), "sitWrite", "happy"]), t);
    actor("teacher", CLASS - 10, 0, -6.5, 0.6, track([0, "idle", "neutral"], [tw(15), "think", "smile"]), t);
    for (let i = 5; i < 8; i++) actor(`kid${i}`, CLASS + [-7, 7, -7][i - 5], 0, [0.5, 0.5, 7][i - 5], Math.PI, track([0, "sitWrite", "neutral"]), t, { seed: i });
  },
  heavyWalk(t) { // every day: she can barely lift her feet
    street(t);
    actor("lady", -4 + 0.45 * (t - tw(24)), SW, 6.6, Math.PI / 2, track([0, "walk", "worried"], [tw(31), "walk", "nervous"]), t, { shoes: 1.15, cycle: "walk", heavy: 1, speed: 0.6 });
  },
  reveal(t) { // the hallway parts; the camera finds Theo's shoes, then Theo
    actor("theo", HALL, 0, 6, 0, track([0, "idle", "sad"], [tw(39), "idle", "sad", { look: [0.2, 0.1] }], [tw(41), "idle", "nervous", { look: [-0.15, 0] }]), t, { shoes: 1.2 });
    actor("kid1", HALL - 4.5, 0, 3.5, 1.2, track([0, "idle", "smirk"], [tw(38), "laughPoint", "laugh", { ease: "back" }]), t, { seed: 1 });
    actor("kid2", HALL + 4.5, 0, 4, -1.2, track([0, "idle", "neutral"], [tw(40), "bellyLaugh", "laugh", { ease: "back" }]), t, { seed: 2 });
    actor("kid5", HALL - 6.2, 0, -6, Math.PI / 2, track([0, "reachOut", "neutral"]), t); // background kid at a locker
  },
  stomp(t, s) { // Theo stomps down the hall like a robot: stiff arms, each step slams down (camera shakes per step)
    const u = t - s.t0, ph = (u * 1.8) % 1, step = Math.floor(u * 1.8);
    const theo = actor("theo", HALL, 0, -8 + 1.4 * u, 0, track([0, "stomp", "determined"]), t, { shoes: 1.2 });
    const lift = Math.sin(Math.PI * Math.min(1, ph / 0.75)) * 0.65;
    (step % 2 ? theo.j.lh : theo.j.rh).rotation.x = -lift; theo.root.position.y += 0.18 * lift;
    theo.j.rs.rotation.x = (step % 2 ? 0.45 : -0.45); theo.j.ls.rotation.x = -(step % 2 ? 0.45 : -0.45);
    actor("kid6", HALL + 6.4, 0, 2 + 0.2 * u, -Math.PI / 2, track([0, "idle", "surprised"], [s.t0 + 0.5, "scared", "shock", { ease: "back" }]), t, { seed: 6 });
    actor("kid7", HALL - 6.4, 0, 6, Math.PI / 2, track([0, "reachOut", "neutral"], [s.t0 + 0.8, "idle", "shock", { look: [0.6, 0] }]), t, { seed: 7 });
  },
  race(t, s) { // sports day: the class laps the track, Theo plods far behind
    const u = t - s.t0;
    for (let i = 0; i < 5; i++) { const x = PX - 26 + (u * (6.5 + 0.4 * i)) + i * 1.6; show(`kid${i}`, x, 0, PZ + 2 + (i % 3) * 1.6, Math.PI / 2, "run", "grin", t, { cycle: "run", seed: i }); }
    show("theo", PX - 32 + 1.4 * u, 0, PZ + 3, Math.PI / 2, "walk", "sad", t, { shoes: 1.2, cycle: "walk", heavy: 1, speed: 0.7 });
    actor("coach", PX + 4, 0, PZ - 3, 0.3, track([0, "idle", "neutral"], [s.t0 + 0.6, "shrug", "worried"]), t);
  },
  bricks(t) { // "Bricks": he trips, the kids point and laugh
    const f = smooth(tw(65) - 0.1, tw(65) + 0.25, t);
    const theo = actor("theo", PX - 2, 0.5 * f, PZ + 6 + 0.8 * f, 0.2, track([0, "walk", "sad"], [tw(65), "fallen", "shock", { ease: "back", dur: 0.25 }]), t, { shoes: 1.2, rx: 1.4 * f, cycle: f < 0.1 ? "walk" : null, heavy: 1 });
    actor("kid0", PX - 5, 0, PZ - 1.5, 0.6, track([0, "idle", "smirk"], [tw(58), "laughPoint", "laugh", { ease: "back" }], [tw(62), "bellyLaugh", "laugh"]), t);
    actor("kid1", PX + 1, 0, PZ - 2.5, -0.5, track([0, "idle", "grin"], [tw(60), "laughPoint", "laugh", { ease: "back" }]), t, { seed: 1 });
    actor("kid3", PX - 2, 0, PZ - 3.5, 0.1, track([0, "idle", "smile"], [tw(61), "bellyLaugh", "laugh", { ease: "back" }], [tw(65) + 0.1, "laughPoint", "laugh"]), t, { seed: 3 });
  },
  storm(t, s) { // the wind arrives: leaves stream, the swings fly up, kids slide and then lift off the grass
    const slide = smooth(tw(76), tw(81), t), lift = smooth(tw(82), tw(86), t);
    for (let i = 0; i < 7; i++) {
      const bx = PX - 12 + (i % 4) * 4.5, bz = PZ + 2 + Math.floor(i / 4) * 5;
      const x = bx + 7 * slide + (8 + 3 * i) * lift, y = lift * (2 + i * 0.7 + 0.5 * Math.sin(t * 3 + i));
      actor(`kid${i}`, x, y, bz, -Math.PI / 2 + 0.3, track([0, "idle", "surprised"], [tw(72), "scared", "shock", { ease: "back" }], [tw(76), "brace", "worried"], [tw(82), "flail", "shock", { ease: "back" }]), t, { seed: i, air: lift > 0.02, rz: -0.25 * slide * (1 - lift) - 0.9 * lift });
    }
    actor("theo", THEO[0], 0, THEO[1], Math.PI - 0.6, track([0, "idle", "worried"], [tw(72), "brace", "worried"]), t, { shoes: 1.2 });
  },
  fence(t) { // teachers cling to the fence, then lose their grip
    const off = (k) => smooth(tw(93) + k * 0.15, tw(94) + 0.2 + k * 0.15, t);
    [["teacher", PX + 2, 0], ["coach", PX + 8, 1]].forEach(([n, x, k]) => {
      const o = off(k);
      actor(n, x + 12 * o, 0.6 * Math.sin(t * 11 + k) * (1 - o) + 5 * o, PZ - 17.3, Math.PI, track([0, "hold", "shock"], [tw(93) + k * 0.15, "flail", "shock", { ease: "back" }]), t, { air: true, rz: -1.3 * o, rx: 0.25 * (1 - o) });
    });
  },
  planted(t) { actor("theo", THEO[0], 0, THEO[1], Math.PI - 0.3, track([0, "brace", "determined"]), t, { shoes: 1.2 }); },
  grab(t) { const theo = actor("theo", THEO[0], 0, THEO[1], Math.PI + 0.9, track([0, "brace", "determined"], [tw(103), "reachOut", "determined", { ease: "back" }]), t, { shoes: 1.2 }); chain(t, theo, t < tw(106) ? 1 : t < tw(108) ? 2 : 7); },
  chainWide(t) { const theo = actor("theo", THEO[0], 0, THEO[1], Math.PI + 0.9, track([0, "reachOut", "determined"]), t, { shoes: 1.2 }); chain(t, theo, 7); },
  calm(t, s) { // the wind drops, everyone lands, they crowd round Theo
    actor("theo", THEO[0], 0, THEO[1], Math.PI, track([0, "idle", "surprised"], [tw(119), "idle", "happy"], [tw(124), "hugBig", "proud", { ease: "back" }]), t, { shoes: 1.2 });
    for (let i = 0; i < 7; i++) { const a = -1.5 + i * 0.5, x = THEO[0] + 4.4 * Math.sin(a), z = THEO[1] + 3.6 * Math.cos(a); actor(`kid${i}`, x, 0, z, Math.atan2(THEO[0] - x, THEO[1] - z), track([0, "idle", "surprised"], [tw(118) + i * 0.08, i % 2 ? "hugBig" : "cheer", "happy", { ease: "back" }]), t, { seed: i }); }
    actor("teacher", THEO[0] - 7, 0, THEO[1] + 2, 2.2, track([0, "idle", "smile"], [tw(120), "cheer", "laugh", { ease: "back" }]), t);
  },
};
function chain(t, theo, n) { // kids stream up and out downwind, head toward Theo, each holding the next one's ankles
  const h0 = handW(theo, "rs"), dir = V(0.55, 0.83, 0), base = V(h0.x + 0.4, h0.y + 0.4, h0.z), rz = Math.PI - Math.atan2(0.55, 0.83);
  for (let i = 0; i < n; i++) {
    const sway = 0.35 * Math.sin(t * 7 + i * 0.9) * (0.4 + 0.2 * i);
    const p = base.clone().addScaledVector(dir, (i + 1) * 4.3); p.x += sway;
    show(`kid${i}`, p.x, p.y, p.z, 0, "armsUp", i ? "nervous" : "shock", t, { rz: rz + 0.05 * Math.sin(t * 9 + i), seed: i, air: true, add: { rh: [0.3 * Math.sin(t * 8 + i), 0, 0], lh: [-0.3 * Math.sin(t * 8 + i), 0, 0] } });
  }
  reachTo(theo, "rs", base.clone().addScaledVector(dir, 0.6));
}

// ------------------------------------------------------------------ per frame
export function update(ctx, t, s) {
  for (const k of used) C[k].root.visible = false; used = new Set();
  const w = ["storm", "fence", "planted", "grab", "chainWide"].includes(s.scene) ? wind(t) : 0;
  const inside = ["homework", "reveal", "stomp"].includes(s.scene);
  ctx.core.setMood(0.7 * w, inside);
  cloudsG.tick(t * (1 + 8 * w));
  SC[s.scene](t, s, ctx);
  leaves.visible = w > 0.05;
  if (leaves.visible) leaves.children.forEach((l) => { const k = l.userData.k, ph = (t * 1.6 + k * 0.073) % 1; l.position.set(PX - 45 + 90 * ph, 0.5 + 10 * ((k * 0.37) % 1) + Math.sin(t * 6 + k), PZ - 14 + (k % 11) * 3); l.rotation.set(t * 9 + k, t * 7 + k, 0); });
  trees.forEach((tr, i) => (tr.rotation.z = -0.1 * w * (1 + 0.5 * Math.sin(t * 5 + i))));
  swingSet.seats.forEach((sd, i) => (sd.rotation.x = 0.15 * Math.sin(t * 2 + i) * (1 - w) + w * (0.9 + 0.25 * Math.sin(t * 6 + i))));
  seesawG.board.rotation.z = 0.18 * Math.sin(t * 1.3) * (1 - w) - 0.18 * w;
}

export function SHOTS(ctx) {
  const th = (dy = 2.3) => () => { const p = C.theo.root.position; return [p.x, p.y + dy, p.z]; };
  const la = (dy) => () => { const p = C.lady.root.position; return [p.x, dy, p.z]; };
  return [
    { w: 0, scene: "rule", at: [2, 3.6, 6.5], dist: 24, yaw: 72, pitch: 8, move: "push", K: 0.25, name: "rule" },
    { w: 9, scene: "shoesClose", follow: la(1.9), dist: 10, yaw: 72, pitch: 4, move: "slideR", K: 0.12, name: "shoes" },
    { w: 13, scene: "homework", at: [CLASS + 1, 3, 0], dist: 13, yaw: 25, pitch: 14, move: "push", K: 0.2, name: "homework" },
    { w: 20, scene: "homework", at: [CLASS + 1.8, 1.4, -0.4], dist: 9, yaw: 70, pitch: 8, move: "push", K: 0.15, name: "sneakers" },
    { w: 24, scene: "heavyWalk", follow: la(2.6), dist: 12, yaw: 70, pitch: 4, move: "slideR", K: 0.12, name: "barely" },
    { w: 31, scene: "heavyWalk", follow: la(1.6), dist: 9, yaw: 60, pitch: 4, move: "push", K: 0.1, name: "lift" },
    { w: 35, scene: "reveal", at: [HALL, 2.6, 8], dist: 16, yaw: 0, pitch: 4, move: "push", K: 0.35, name: "nobody" },
    { w: 39, scene: "reveal", at: [HALL, 1.6, 6.5], dist: 9, yaw: 18, pitch: 6, move: "rise", K: 0.3, name: "Theo" },
    { w: 42, scene: "stomp", follow: th(2.4), dist: 13, yaw: 8, pitch: 4, move: "pull", K: 0.12, name: "stomp" },
    { w: 47, scene: "stomp", follow: th(1.4), dist: 9, yaw: 60, pitch: 4, move: "push", K: 0.1, name: "robot" },
    { w: 50, scene: "race", follow: () => [C.kid2.root.position.x - 4, 2.2, PZ + 3], dist: 26, yaw: 20, pitch: 14, move: "slideR", K: 0.1, name: "race" },
    { w: 53, scene: "race", follow: th(2.2), dist: 9, yaw: 35, pitch: 4, move: "push", K: 0.15, name: "last" },
    { w: 56, scene: "bricks", at: [PX - 2.5, 2.6, PZ + 2.5], dist: 23, yaw: 62, pitch: 12, move: "push", K: 0.2, name: "bricks" },
    { w: 63, scene: "bricks", at: [PX - 2, 1.6, PZ + 6.5], dist: 13, yaw: 80, pitch: 10, move: "shake", K: 0.2, name: "tripped" },
    { w: 66, scene: "storm", at: [PX - 2, 6, PZ + 2], dist: 44, yaw: 200, pitch: 12, move: "shake", K: 0.15, name: "windstorm" },
    { w: 75, scene: "storm", at: [PX - 4, 2.4, PZ + 5], dist: 20, yaw: 190, pitch: 8, move: "slideR", K: 0.25, name: "sliding" },
    { w: 81, scene: "storm", at: [PX + 4, 6, PZ + 5], dist: 24, yaw: 185, pitch: -6, move: "shake", K: 0.3, name: "feetLeft" },
    { w: 87, scene: "fence", at: [PX + 9, 3.5, PZ - 17], dist: 18, yaw: 190, pitch: 6, move: "shake", K: 0.25, name: "fence" },
    { w: 96, scene: "planted", at: [THEO[0], 1.6, THEO[1]], dist: 10, yaw: 195, pitch: 4, move: "push", K: 0.15, name: "inch" },
    { w: 99, scene: "planted", at: [THEO[0], 3.3, THEO[1]], dist: 9, yaw: 175, pitch: 2, move: "push", K: 0.15, name: "move" },
    { w: 102, scene: "grab", at: [THEO[0] + 4, 7, THEO[1]], dist: 30, yaw: 186, pitch: 4, move: "shake", K: 0.2, name: "grab" },
    { w: 108, scene: "chainWide", at: [THEO[0] + 8, 13, THEO[1]], dist: 52, yaw: 186, pitch: 6, move: "pull", K: 0.12, name: "class" },
    { w: 116, scene: "calm", at: [THEO[0], 2.8, THEO[1]], dist: 17, yaw: 180, pitch: 14, move: "orbitL", K: 0.2, name: "kindness" },
    { w: 125, scene: "calm", at: [THEO[0], 2.2, THEO[1]], dist: 12, yaw: 185, pitch: 8, move: "pull", K: 0.2, name: "ground" },
  ];
}
