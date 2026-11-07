// 20_r6.js: the blocky R6-style avatar (original design): head, torso, 2 arms, 2 legs.
// Units are studs: legs 2 tall, torso 2x2x1, arms 1x2x1, a rounded-cylinder head ~1.25 wide. The figure faces +z.
// Joints are groups so poses are plain rotations: hip (whole body), neck, shoulders (L at +x, R at -x), hips.
// Faces are canvas textures wrapped on the head (u = 0.5 is the front), ~20 expressions with a talking-mouth variant.
// POSES are joint rotations; poseAvatar() blends two poses and adds life (breathing, blinks, talk flaps, walk/run cycles).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// ------------------------------------------------------------------ colours
export const SKIN = { yellow: "#f2c94c", light: "#f6d7b8", tan: "#d9a273", brown: "#a8714a", dark: "#6b4429", grey: "#a3a3a3" };
const mat = (color, rough = 0.55) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });

// ------------------------------------------------------------------ faces (canvas 1024 x 512 wrapped round the head)
const FACE_W = 1024, FACE_H = 512, FC = { x: 512, y: 250 }; // face centre on the canvas (front of the head)
const faceCache = new Map();
/** draw one face: e = eyes, b = brows, m = mouth, open = talking mouth, extras */
function drawFace(g, skin, f, open) {
  g.fillStyle = skin; g.fillRect(0, 0, FACE_W, FACE_H);
  const ink = "#1d1a1a", { x, y } = FC;
  g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = ink; g.fillStyle = ink;
  const eye = (ex, ey, kind) => {
    g.save(); g.translate(ex, ey);
    if (kind === "dot") { g.beginPath(); g.ellipse(0, 0, 13, 22, 0, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.ellipse(-4, -9, 4, 5, 0, 0, 7); g.fill(); }
    else if (kind === "big") { g.fillStyle = "#fff"; g.lineWidth = 6; g.beginPath(); g.ellipse(0, 0, 24, 30, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = ink; g.beginPath(); g.ellipse(0, 2, 10, 13, 0, 0, 7); g.fill(); }
    else if (kind === "happy") { g.lineWidth = 9; g.beginPath(); g.arc(0, 10, 17, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else if (kind === "closed") { g.lineWidth = 8; g.beginPath(); g.moveTo(-16, 2); g.quadraticCurveTo(0, 10, 16, 2); g.stroke(); }
    else if (kind === "squint") { g.lineWidth = 9; g.beginPath(); g.moveTo(-17, -8); g.lineTo(14, 2); g.lineTo(-17, 12); g.stroke(); }
    else if (kind === "half") { g.beginPath(); g.ellipse(0, 6, 13, 13, 0, Math.PI, 0, true); g.fill(); g.lineWidth = 6; g.beginPath(); g.moveTo(-18, 2); g.lineTo(18, 2); g.stroke(); }
    else if (kind === "heart") { g.fillStyle = "#e0384b"; g.beginPath(); g.moveTo(0, 18); g.bezierCurveTo(-30, -2, -14, -26, 0, -10); g.bezierCurveTo(14, -26, 30, -2, 0, 18); g.fill(); }
    else if (kind === "spiral") { g.lineWidth = 5; g.beginPath(); for (let a = 0; a < 14; a += 0.2) g.lineTo(Math.cos(a) * a * 1.6, Math.sin(a) * a * 1.6); g.stroke(); }
    g.restore();
  };
  const L = x + 62, R = x - 62; // L eye at +u (the figure's left = viewer's right)
  const ek = f.e ?? "dot";
  if (f.wink) { eye(L, y, ek); eye(R, y, "closed"); } else { eye(L, y, ek); eye(R, y, ek); }
  // brows: [lift, tilt] tilt > 0 = angry (inner ends down)
  if (f.b) {
    const [lift, tilt] = f.b; g.lineWidth = 9;
    for (const s of [1, -1]) { g.beginPath(); g.moveTo(x + s * 38, y - 48 - lift + tilt * 10); g.lineTo(x + s * 88, y - 48 - lift - tilt * 10); g.stroke(); }
  }
  // mouth
  const my = y + 78, mk = f.m ?? "smile";
  g.lineWidth = 9;
  const filled = (path, tongue = true, teeth = false) => {
    g.fillStyle = "#5a1d22"; g.beginPath(); path(); g.fill();
    g.save(); g.beginPath(); path(); g.clip();
    if (tongue) { g.fillStyle = "#e0606e"; g.beginPath(); g.ellipse(x, my + 34, 30, 16, 0, 0, 7); g.fill(); }
    if (teeth) { g.fillStyle = "#fff"; g.fillRect(x - 70, my - 20, 140, 22); }
    g.restore(); g.strokeStyle = ink; g.lineWidth = 7; g.beginPath(); path(); g.stroke();
  };
  if (open) { // the talking variant of any expression
    const sad = mk === "frown" || mk === "wobble";
    filled(() => sad ? g.ellipse(x, my + 8, 26, 18, 0, 0, 7) : (g.moveTo(x - 44, my - 6), g.quadraticCurveTo(x, my - 2, x + 44, my - 6), g.quadraticCurveTo(x, my + 52, x - 44, my - 6)));
  } else if (mk === "smile") { g.beginPath(); g.arc(x, my - 46, 52, Math.PI * 0.28, Math.PI * 0.72); g.stroke(); }
  else if (mk === "grin") filled(() => { g.moveTo(x - 56, my - 12); g.quadraticCurveTo(x, my - 4, x + 56, my - 12); g.quadraticCurveTo(x, my + 58, x - 56, my - 12); }, true, true);
  else if (mk === "laugh") filled(() => { g.moveTo(x - 58, my - 14); g.quadraticCurveTo(x, my - 6, x + 58, my - 14); g.quadraticCurveTo(x, my + 70, x - 58, my - 14); });
  else if (mk === "o") filled(() => g.ellipse(x, my + 10, 20, 26, 0, 0, 7), false);
  else if (mk === "O") filled(() => g.ellipse(x, my + 14, 30, 40, 0, 0, 7));
  else if (mk === "frown") { g.beginPath(); g.arc(x, my + 40, 44, Math.PI * 1.25, Math.PI * 1.75); g.stroke(); }
  else if (mk === "flat") { g.beginPath(); g.moveTo(x - 36, my + 6); g.lineTo(x + 36, my + 6); g.stroke(); }
  else if (mk === "smirk") { g.beginPath(); g.moveTo(x - 36, my + 8); g.quadraticCurveTo(x + 10, my + 14, x + 42, my - 8); g.stroke(); }
  else if (mk === "wobble") { g.beginPath(); for (let i = 0; i <= 8; i++) g.lineTo(x - 40 + i * 10, my + 8 + (i % 2 ? -7 : 7)); g.stroke(); }
  else if (mk === "teeth") { g.fillStyle = "#fff"; g.beginPath(); g.roundRect(x - 50, my - 10, 100, 34, 10); g.fill(); g.lineWidth = 7; g.stroke(); g.lineWidth = 4; for (const dx of [-25, 0, 25]) { g.beginPath(); g.moveTo(x + dx, my - 10); g.lineTo(x + dx, my + 24); g.stroke(); } }
  else if (mk === "ah") filled(() => g.ellipse(x, my + 6, 24, 30, 0, 0, 7));
  // extras
  if (f.sweat) { g.fillStyle = "#7fc8ff"; g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 120, y - 70); g.quadraticCurveTo(x + 138, y - 36, x + 120, y - 26); g.quadraticCurveTo(x + 102, y - 36, x + 120, y - 70); g.fill(); g.stroke(); }
  if (f.tears) { g.fillStyle = "#7fc8ff"; for (const s of [1, -1]) { g.beginPath(); g.roundRect(x + s * 62 - 8, y + 20, 16, 70, 8); g.fill(); } }
  if (f.blush) { g.fillStyle = "rgba(240,90,110,0.35)"; for (const s of [1, -1]) { g.beginPath(); g.ellipse(x + s * 95, y + 40, 26, 14, 0, 0, 7); g.fill(); } }
  if (f.zzz) { g.fillStyle = ink; g.font = "bold 44px sans-serif"; g.fillText("z", x + 110, y - 60); g.font = "bold 30px sans-serif"; g.fillText("z", x + 140, y - 90); }
}

/** expressions: e eyes, b brows [lift, tilt], m mouth, extras */
export const FACES = {
  smile: { e: "dot", m: "smile" }, grin: { e: "dot", m: "grin" }, happy: { e: "happy", m: "smile" }, laugh: { e: "happy", m: "laugh", b: [6, 0] },
  shock: { e: "big", m: "O", b: [16, -0.4] }, surprised: { e: "big", m: "o", b: [12, -0.3] }, sad: { e: "dot", m: "frown", b: [4, -0.8] },
  cry: { e: "closed", m: "wobble", b: [4, -0.9], tears: true }, angry: { e: "dot", m: "teeth", b: [0, 1.0] }, worried: { e: "dot", m: "wobble", b: [8, -0.9], sweat: true },
  smirk: { e: "half", m: "smirk", b: [4, 0.3] }, wink: { e: "dot", m: "grin", wink: true }, sleepy: { e: "half", m: "flat", zzz: true },
  determined: { e: "dot", m: "flat", b: [0, 0.7] }, nervous: { e: "big", m: "wobble", sweat: true, b: [10, -0.6] }, sneeze: { e: "squint", m: "ah", b: [2, 0.4] },
  blink: { e: "closed", m: "smile" }, love: { e: "heart", m: "grin", blush: true }, dizzy: { e: "spiral", m: "wobble" }, proud: { e: "happy", m: "smile", b: [10, 0], blush: true },
  neutral: { e: "dot", m: "flat" },
};

function faceTexture(skin, name, open = false) {
  const key = `${skin}|${name}|${open}`;
  let t = faceCache.get(key);
  if (!t) {
    const c = document.createElement("canvas"); c.width = FACE_W; c.height = FACE_H;
    drawFace(c.getContext("2d"), skin, FACES[name] ?? FACES.smile, open);
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    faceCache.set(key, t);
  }
  return t;
}

// ------------------------------------------------------------------ geometry
const box = (w, h, d, r = 0.06) => new RoundedBoxGeometry(w, h, d, 3, r);
const LIMB = box(1, 2, 1), TORSO = box(2, 2, 1, 0.07);
/** classic rounded-cylinder head (lathe), UV u = 0.5 at the front (+z) */
const HEAD = (() => {
  const pts = [], r = 0.62, h = 1.22, e = 0.2;
  pts.push(new THREE.Vector2(0.001, -h / 2));
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(r - e + e * Math.cos(a), -h / 2 + e + e * Math.sin(a))); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(r - e + e * Math.cos(a), h / 2 - e + e * Math.sin(a))); }
  pts.push(new THREE.Vector2(0.001, h / 2));
  const g = new THREE.LatheGeometry(pts, 48, Math.PI, Math.PI * 2);
  // remap v so the face band (the straight side) fills the canvas height
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) { const y = pos.getY(i); uv.setY(i, THREE.MathUtils.clamp(0.5 + y / (h * 0.92), 0, 1)); }
  return g;
})();

// ------------------------------------------------------------------ accessories (hats, hair, glasses)
function accessory(kind, color = "#3b2a20") {
  const g = new THREE.Group(), M = mat(color, 0.7);
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
  /** a hair cap: the top of a sphere (radius r) squashed to height h, its rim at y0 (head centre = 0, head top = 0.61) */
  const cap = (r, h, y0) => { const o = add(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), M, 0, y0, -0.03); o.scale.set(1, h / r, 1); return o; };
  /** a fringe of n rounded bangs across the forehead */
  const bangs = (n) => { for (let i = 0; i < n; i++) { const u = (i + 0.5) / n - 0.5, a = u * 1.6; add(box(0.46, 0.2, 0.12, 0.08), M, Math.sin(a) * 0.64, 0.31 - Math.abs(u) * 0.04, Math.cos(a) * 0.64, -0.15, a, u * 0.25); } };
  switch (kind) {
    case "hairShort": cap(0.68, 0.5, 0.26); bangs(3); break;
    case "hairLong": cap(0.68, 0.5, 0.26); bangs(3); add(box(1.3, 1.1, 0.34, 0.14), M, 0, -0.12, -0.5); for (const s2 of [-1, 1]) add(box(0.24, 0.95, 0.85, 0.1), M, s2 * 0.62, -0.05, -0.12); break;
    case "spiky": cap(0.68, 0.5, 0.25); for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; add(new THREE.ConeGeometry(0.2, 0.55, 5), M, Math.sin(a) * 0.38, 0.78, Math.cos(a) * 0.38 - 0.05, Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5); } add(new THREE.ConeGeometry(0.24, 0.6, 5), M, 0, 0.92, -0.05); break;
    case "bun": cap(0.68, 0.5, 0.25); add(new THREE.SphereGeometry(0.32, 18, 12), M, 0, 0.66, -0.44); break;
    case "cap": add(new THREE.SphereGeometry(0.66, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M, 0, 0.42, 0); add(box(0.9, 0.06, 0.6, 0.03), M, 0, 0.44, 0.72); break;
    case "tophat": add(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 32), M, 0, 0.63, 0); add(new THREE.CylinderGeometry(0.42, 0.44, 0.9, 32), M, 0, 1.1, 0); add(new THREE.CylinderGeometry(0.445, 0.445, 0.14, 32), mat("#b0282e"), 0, 0.75, 0); break;
    case "chef": add(new THREE.CylinderGeometry(0.6, 0.55, 0.5, 24), mat("#ffffff", 0.9), 0, 0.82, 0); add(new THREE.SphereGeometry(0.72, 20, 12), mat("#ffffff", 0.9), 0, 1.2, 0); break;
    case "crown": { const gold = new THREE.MeshStandardMaterial({ color: "#f2c230", roughness: 0.3, metalness: 0.6 }); add(new THREE.CylinderGeometry(0.58, 0.58, 0.3, 24, 1, true), gold, 0, 0.72, 0); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(new THREE.ConeGeometry(0.11, 0.3, 4), gold, Math.sin(a) * 0.56, 1.0, Math.cos(a) * 0.56); } break; }
    case "glasses": { const k = mat("#1d1a1a", 0.4); for (const s of [-1, 1]) { const o = add(new THREE.TorusGeometry(0.15, 0.03, 8, 20), k, s * 0.23, 0.06, 0.62); o.scale.set(1, 0.85, 1); } add(box(0.12, 0.03, 0.03, 0.01), k, 0, 0.08, 0.66); break; }
  }
  return g;
}

// ------------------------------------------------------------------ the avatar
/**
 * makeAvatar({ skin, shirt, pants, hat, hatColor, shirtArt, face, scale })
 * returns { root, j: {hip, torso, neck, head, rs, ls, rh, lh}, setFace(name, open), meta }
 */
export function makeAvatar(o = {}) {
  const skin = o.skin ?? SKIN.yellow, shirt = o.shirt ?? "#3d7be0", pants = o.pants ?? "#2f3b52", grey = !!o.grey;
  const mSkin = mat(grey ? "#9a9a9a" : skin), mShirt = mat(grey ? "#9a9a9a" : shirt), mPants = mat(grey ? "#9a9a9a" : pants);
  const mHead = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.55, map: grey ? null : faceTexture(skin, o.face ?? "smile") });
  if (grey) mHead.color.set("#9a9a9a");
  const root = new THREE.Group(), hip = new THREE.Group(); hip.position.y = 2; root.add(hip);
  const mesh = (geo, m, parent, x, y, z) => { const o2 = new THREE.Mesh(geo, m); o2.position.set(x, y, z); o2.castShadow = true; o2.receiveShadow = true; parent.add(o2); return o2; };
  const torso = new THREE.Group(); hip.add(torso);
  mesh(TORSO, mShirt, torso, 0, 1, 0);
  if (o.shirtArt && !grey) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshStandardMaterial({ map: o.shirtArt, transparent: true, roughness: 0.6 })); p.position.set(0, 1, 0.503); torso.add(p); }
  const neck = new THREE.Group(); neck.position.y = 2; torso.add(neck);
  const head = mesh(HEAD, mHead, neck, 0, 0.62, 0);
  if (o.hat && !grey) { const a = accessory(o.hat, o.hatColor); a.position.y = 0.62; neck.add(a); }
  if (o.glasses && !grey) { const a = accessory("glasses"); a.position.y = 0.62; neck.add(a); }
  const limb = (parent, x, y, m, armSide) => { const j = new THREE.Group(); j.position.set(x, y, 0); parent.add(j); mesh(LIMB, m, j, 0, armSide ? -0.5 : -1, 0); return j; };
  const ls = limb(torso, 1.5, 1.5, mSkin, true), rs = limb(torso, -1.5, 1.5, mSkin, true);
  // short sleeves: shirt colour on the top half of each arm
  if (!grey) for (const s of [ls, rs]) mesh(box(1.02, 0.9, 1.02, 0.06), mShirt, s, 0, 0.05, 0);
  const lh = limb(hip, 0.5, 0, mPants, false), rh = limb(hip, -0.5, 0, mPants, false);
  const sc = o.scale ?? 1; root.scale.setScalar(sc);
  let faceName = o.face ?? "smile", faceOpen = false;
  const setFace = (name, open = false) => { if (grey || (name === faceName && open === faceOpen)) return; faceName = name; faceOpen = open; mHead.map = faceTexture(skin, name, open); mHead.needsUpdate = true; };
  return { root, j: { hip, torso, neck, head, ls, rs, lh, rh }, setFace, meta: o, get face() { return faceName; } };
}

// ------------------------------------------------------------------ poses
// angles in radians; arms/legs: [rx, ry, rz] (rx < 0 swings forward); torso: [rx, ry, rz]; neck: [rx, ry, rz]; y: hip drop
const P = Math.PI;
export const POSES = {
  idle: {},
  talk: { rs: [-0.35, 0, -0.1], ls: [0.05, 0, 0.08], neck: [0.05, 0, 0] },
  point: { rs: [-1.5, 0.1, 0], neck: [0, -0.15, 0], torso: [0, -0.15, 0] },
  wave: { ls: [-0.2, 0, 2.6], neck: [0, 0.1, 0.08] },
  armsUp: { rs: [-P + 0.25, 0, -0.25], ls: [-P + 0.25, 0, 0.25], neck: [-0.25, 0, 0] },
  kick: { rh: [-1.3, 0, 0], lh: [0.2, 0, 0], rs: [0.5, 0, -0.3], ls: [-0.6, 0, 0.3], torso: [0.12, 0, 0] },
  sneeze: { torso: [0.35, 0, 0], neck: [0.35, 0, 0], rs: [-1.9, 0.6, 0], ls: [-1.9, -0.6, 0] },
  shrug: { rs: [-0.5, 0, -0.75], ls: [-0.5, 0, 0.75], neck: [0, 0, 0.18] },
  hug: { rs: [-1.4, -0.6, 0], ls: [-1.4, 0.6, 0], torso: [0.1, 0, 0] },
  climb: { rs: [-2.8, 0, -0.1], ls: [-2.2, 0, 0.1], rh: [-1.0, 0, 0], lh: [-0.2, 0, 0], neck: [-0.3, 0, 0] },
  sit: { rh: [-P / 2, 0, 0], lh: [-P / 2, 0, 0], y: -1.0, rs: [-0.4, 0, 0], ls: [-0.4, 0, 0] },
  lookUp: { neck: [-0.5, 0, 0], torso: [-0.1, 0, 0] },
  duck: { torso: [0.6, 0, 0], neck: [-0.4, 0, 0], rh: [-0.9, 0, 0], lh: [-0.9, 0, 0], y: -0.7, rs: [-1.2, 0, -0.2], ls: [-1.2, 0, 0.2] },
  facepalm: { rsAim: [-0.1, 2.75, 0.75], neck: [0.25, 0, 0] },
  cheer: { rs: [-P + 0.15, 0, -0.5], ls: [-P + 0.15, 0, 0.5], neck: [-0.2, 0, 0], y: 0.25 },
  think: { rsAim: [-0.05, 2.25, 0.75], ls: [-0.6, -0.5, 0], neck: [0, 0.15, 0.12] },
  scared: { rs: [-1.7, 0.5, 0], ls: [-1.7, -0.5, 0], torso: [-0.15, 0, 0], neck: [-0.1, 0, 0], y: -0.15 },
  sad: { neck: [0.4, 0, 0], torso: [0.12, 0, 0], rs: [0.05, 0, -0.05], ls: [0.05, 0, 0.05] },
  run: {}, walk: {}, // procedural (cycle)
};
const J = ["torso", "neck", "rs", "ls", "rh", "lh"];
const SH = { rs: new THREE.Vector3(-1.5, 1.5, 0), ls: new THREE.Vector3(1.5, 1.5, 0) }; // shoulder pivots, torso space
const DOWN = new THREE.Vector3(0, -1, 0), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3();
/** Euler (torso space) that points an arm from its shoulder at a torso-space target (the hand end is 1.5 from the pivot) */
export function aimEuler(side, target) {
  _v.set(...target).sub(SH[side]).normalize(); _q.setFromUnitVectors(DOWN, _v); _e.setFromQuaternion(_q, "XYZ");
  return [_e.x, _e.y, _e.z];
}
const get = (p, k) => (k === "rs" && p.rsAim ? aimEuler("rs", p.rsAim) : k === "ls" && p.lsAim ? aimEuler("ls", p.lsAim) : p[k] ?? [0, 0, 0]);

/** after poseAvatar: point an arm at a WORLD position (holding / pushing props). k blends from the posed arm (0) to the aim (1).
 *  Returns the gap between the hand end and the target (> 0: out of reach, move the character closer). */
export function reachTo(av, side, world, k = 1) {
  const j = av.j[side], torso = av.j.torso;
  torso.updateWorldMatrix(true, false);
  const local = torso.worldToLocal(_v.copy(world));
  const dist = local.distanceTo(SH[side]);
  const [x, y, z] = aimEuler(side, [local.x, local.y, local.z]);
  const q0 = j.quaternion.clone(); _q.setFromEuler(_e.set(x, y, z, "XYZ"));
  j.quaternion.copy(q0.slerp(_q, k));
  return dist - 1.5 * av.root.scale.x;
}

/**
 * pose the avatar: blend pose a -> b by k, then add life.
 * opts: { t (s), talk (0..1 mouth open), blinkSeed, cycle: 'walk'|'run', speed, face }
 */
export function poseAvatar(av, a, b = a, k = 0, opts = {}) {
  const A = POSES[a] ?? {}, B = POSES[b] ?? {}, t = opts.t ?? 0;
  const out = {};
  for (const n of J) out[n] = get(A, n).map((v, i) => v + (get(B, n)[i] - v) * k);
  let y = (A.y ?? 0) + ((B.y ?? 0) - (A.y ?? 0)) * k;
  // life: breathing + a slow head drift
  const br = Math.sin(t * 2.2 + (opts.blinkSeed ?? 0));
  out.torso[0] += 0.015 * br; out.neck[1] += 0.06 * Math.sin(t * 0.7 + (opts.blinkSeed ?? 0) * 3); out.neck[0] += 0.02 * br;
  // talk: head nods with the voice
  if (opts.talk) { out.neck[0] += 0.07 * opts.talk; out.neck[2] += 0.03 * Math.sin(t * 9); }
  // walk / run cycle
  const cyc = opts.cycle === "run" || a === "run" ? "run" : opts.cycle === "walk" || a === "walk" ? "walk" : null;
  if (cyc) {
    const sp = cyc === "run" ? 11 : 7, amp = cyc === "run" ? 1.0 : 0.55, ph = t * sp;
    out.rs[0] += amp * Math.sin(ph); out.ls[0] -= amp * Math.sin(ph);
    out.rh[0] -= amp * Math.sin(ph); out.lh[0] += amp * Math.sin(ph);
    out.torso[0] += cyc === "run" ? 0.2 : 0.04;
    y += (cyc === "run" ? 0.22 : 0.1) * Math.abs(Math.sin(ph));
  }
  const { j } = av;
  j.torso.rotation.set(...out.torso); j.neck.rotation.set(...out.neck);
  j.rs.rotation.set(...out.rs); j.ls.rotation.set(...out.ls); j.rh.rotation.set(...out.rh); j.lh.rotation.set(...out.lh);
  j.hip.position.y = 2 + y;
  // face: blink every ~3.4 s for 3 frames (unless the expression already has closed eyes), mouth open while talking
  if (opts.face) {
    const seed = opts.blinkSeed ?? 0, ph2 = (t + seed * 1.7) % 3.4;
    const closedEyes = ["happy", "laugh", "cry", "blink", "sneeze", "proud"].includes(opts.face);
    if (!closedEyes && ph2 < 0.1) av.setFace("blink");
    else av.setFace(opts.face, (opts.talk ?? 0) > 0.35);
  }
}

/** a canvas shirt graphic (original): kinds 'stripes' | 'tie' | 'apron' | 'overalls' | 'star' | 'badge' */
export function shirtArt(kind, col = "#ffffff", col2 = "#1d1a1a") {
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  if (kind === "stripes") { g.fillStyle = col; for (let i = 0; i < 4; i++) g.fillRect(0, 30 + i * 60, 256, 22); }
  else if (kind === "tie") { g.fillStyle = col; g.beginPath(); g.moveTo(108, 0); g.lineTo(148, 0); g.lineTo(140, 30); g.lineTo(160, 190); g.lineTo(128, 230); g.lineTo(96, 190); g.lineTo(116, 30); g.fill(); g.fillStyle = col2; g.beginPath(); g.moveTo(70, 0); g.lineTo(128, 50); g.lineTo(186, 0); g.fill(); }
  else if (kind === "apron") { g.fillStyle = col; g.beginPath(); g.roundRect(40, 60, 176, 200, 20); g.fill(); g.fillRect(70, 0, 116, 70); g.fillStyle = col2; g.fillRect(80, 150, 96, 40); }
  else if (kind === "overalls") { g.fillStyle = col; g.fillRect(60, 120, 136, 136); g.fillRect(60, 0, 26, 130); g.fillRect(170, 0, 26, 130); g.fillStyle = "#f2c230"; for (const x of [73, 183]) { g.beginPath(); g.arc(x, 128, 9, 0, 7); g.fill(); } }
  else if (kind === "star") { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 34 : 80, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(128 + r * Math.cos(a), 128 + r * Math.sin(a)); } g.fill(); }
  else if (kind === "badge") { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 12; i++) { const r = i % 2 ? 22 : 40, a = (i * Math.PI) / 6; g.lineTo(80 + r * Math.cos(a), 80 + r * Math.sin(a)); } g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
