// 45_town.js: blocky town + interiors, all boxes + canvas textures (brick, siding, shingle, wood, tile, plaster, asphalt).
// Units are studs (an avatar is ~5.2 tall). Every builder returns a Group already added to `parent`.
// Rules learned on the cartoon shorts: boxes are closed on all sides (nothing see-through from low angles), windows are
// frames + glass panes (never a solid box), coplanar decals sit 0.02 off their surface (no z-fighting).
import * as THREE from "three";

// ------------------------------------------------------------------ textures (canvas, cached)
const texCache = new Map();
export function ctex(key, w, h, draw, repeat = [1, 1]) {
  let t = texCache.get(key);
  if (!t) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); let s = key.length * 977; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    draw(g, r, w, h);
    t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    texCache.set(key, t);
  }
  const t2 = t.clone(); t2.needsUpdate = true; t2.repeat.set(...repeat); return t2;
}
const shade = (hex, k) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return `#${c.getHexString()}`; };
export const TEX = {
  brick: (col = "#b5533c", rep) => ctex(`brick${col}`, 256, 256, (g, r) => {
    g.fillStyle = shade(col, 0.12); g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) { g.fillStyle = shade(col, (r() - 0.5) * 0.08); g.fillRect(x * 64 + (y % 2) * 32 + 3, y * 32 + 3, 58, 26); }
  }, rep),
  siding: (col = "#e9e2cf", rep) => ctex(`siding${col}`, 256, 256, (g) => {
    g.fillStyle = col; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) { g.fillStyle = shade(col, -0.1); g.fillRect(0, y + 26, 256, 6); g.fillStyle = shade(col, 0.04); g.fillRect(0, y, 256, 4); }
  }, rep),
  shingle: (col = "#5a4a6a", rep) => ctex(`shingle${col}`, 256, 256, (g, r) => {
    g.fillStyle = shade(col, -0.08); g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) for (let x = -1; x < 9; x++) { g.fillStyle = shade(col, (r() - 0.5) * 0.1); g.fillRect(x * 32 + (y % 2) * 16 + 1, y * 32 + 1, 30, 27); }
  }, rep),
  wood: (col = "#b5814e", rep) => ctex(`wood${col}`, 256, 256, (g, r) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = shade(col, (r() - 0.5) * 0.1); g.fillRect(0, i * 32, 256, 31); g.fillStyle = shade(col, -0.15); g.fillRect((r() * 256) | 0, i * 32, 3, 32); }
  }, rep),
  tile: (a = "#e9e9e4", b = "#c9ccd2", rep) => ctex(`tile${a}${b}`, 256, 256, (g) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * 64, y * 64, 64, 64); } g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); } }, rep),
  plaster: (col = "#e8dcc8", rep) => ctex(`plaster${col}`, 256, 256, (g, r) => { g.fillStyle = col; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.03})`; g.fillRect(r() * 256, r() * 256, 2 + r() * 4, 2 + r() * 4); } }, rep),
  asphalt: (rep) => ctex("asphalt", 256, 256, (g, r) => { g.fillStyle = "#4a4d55"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 2, 2); } }, rep),
  concrete: (rep) => ctex("concrete", 256, 256, (g) => { g.fillStyle = "#c9c6bd"; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, 0, 256, 3); g.fillRect(0, 0, 3, 256); }, rep),
  metal: (col = "#4f7fb8", rep) => ctex(`metal${col}`, 128, 256, (g) => { g.fillStyle = col; g.fillRect(0, 0, 128, 256); g.fillStyle = shade(col, -0.15); for (let y = 30; y < 90; y += 12) g.fillRect(30, y, 68, 5); g.fillStyle = "#d9d9d9"; g.fillRect(96, 130, 10, 26); g.strokeStyle = shade(col, -0.25); g.lineWidth = 4; g.strokeRect(2, 2, 124, 252); }, rep),
};

// ------------------------------------------------------------------ primitives
const MAT = new Map();
export const mat = (key, make) => { if (!MAT.has(key)) MAT.set(key, make()); return MAT.get(key); };
export const col = (c, rough = 0.7) => mat(`c${c}${rough}`, () => new THREE.MeshStandardMaterial({ color: c, roughness: rough }));
export const texMat = (key, tex, rough = 0.85) => mat(key, () => new THREE.MeshStandardMaterial({ map: tex, roughness: rough }));
/** a closed box from min corner to max corner */
export function block(parent, [x0, y0, z0], [x1, y1, z1], m, { cast = true, receive = true } = {}) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m);
  o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); o.castShadow = cast; o.receiveShadow = receive; parent.add(o); return o;
}
/** textured box whose texture repeats per `unit` studs on its largest faces */
export function tblock(parent, a, b, texFn, unit = 4, rough = 0.85) {
  const w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]), d = Math.abs(b[2] - a[2]);
  const t = texFn([Math.max(w, d) / unit, h / unit]);
  return block(parent, a, b, new THREE.MeshStandardMaterial({ map: t, roughness: rough }));
}
const glassM = () => mat("glass", () => new THREE.MeshStandardMaterial({ color: "#9fd0f0", roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }));
/** window in a wall plane facing +z (wall surface at z): a frame, sill and glass pane (see-through, not a solid box) */
export function windowZ(parent, x, y, z, w = 2.4, h = 2.4, dir = 1, frame = "#ffffff", backing = true) {
  const F = col(frame, 0.5), t = 0.18, g = new THREE.Group(); parent.add(g);
  g.position.set(x, y, z); g.rotation.y = dir > 0 ? 0 : Math.PI;
  block(g, [-w / 2, -h / 2, 0.0], [w / 2, -h / 2 + t, 0.18], F); block(g, [-w / 2, h / 2 - t, 0.0], [w / 2, h / 2, 0.18], F);
  block(g, [-w / 2, -h / 2, 0.0], [-w / 2 + t, h / 2, 0.18], F); block(g, [w / 2 - t, -h / 2, 0.0], [w / 2, h / 2, 0.18], F);
  block(g, [-0.06, -h / 2, 0.02], [0.06, h / 2, 0.14], F); block(g, [-w / 2, -0.06, 0.02], [w / 2, 0.06, 0.14], F);
  block(g, [-w / 2 - 0.15, -h / 2 - 0.2, 0], [w / 2 + 0.15, -h / 2, 0.35], F);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * t, h - 2 * t), glassM()); p.position.z = 0.04; g.add(p);
  // a dark interior behind the glass so windows read as openings into a room
  if (backing) { const back = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * t, h - 2 * t), col("#2b3346", 1)); back.position.z = 0.025; g.add(back); }
  return g;
}
export function doorZ(parent, x, z, w = 2.2, h = 4, color = "#7a4a2e", dir = 1) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z); g.rotation.y = dir > 0 ? 0 : Math.PI;
  block(g, [-w / 2 - 0.2, 0, 0], [w / 2 + 0.2, h + 0.2, 0.12], col("#f2efe8", 0.5));
  block(g, [-w / 2, 0, 0.04], [w / 2, h, 0.2], col(color, 0.6));
  for (const [y0, y1] of [[0.4, h * 0.45], [h * 0.55, h - 0.4]]) block(g, [-w / 2 + 0.3, y0, 0.2], [w / 2 - 0.3, y1, 0.26], col(shade(color, 0.06), 0.6));
  const k = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), col("#e0b53a", 0.3)); k.position.set(w / 2 - 0.4, h * 0.48, 0.32); g.add(k);
  return g;
}

// ------------------------------------------------------------------ outdoor pieces
export function road(parent, x0, z0, x1, z1, { dashes = true } = {}) {
  const g = new THREE.Group(); parent.add(g);
  const w = x1 - x0, d = z1 - z0;
  block(g, [x0, 0, z0], [x1, 0.06, z1], new THREE.MeshStandardMaterial({ map: TEX.asphalt([w / 8, d / 8]), roughness: 0.95 }), { cast: false });
  if (dashes) { const along = Math.abs(w) > Math.abs(d), L = along ? w : d; for (let s = 2; s < L - 2; s += 6) { if (along) block(g, [x0 + s, 0.06, (z0 + z1) / 2 - 0.15], [x0 + s + 3, 0.08, (z0 + z1) / 2 + 0.15], col("#f2d24a", 0.6), { cast: false }); else block(g, [(x0 + x1) / 2 - 0.15, 0.06, z0 + s], [(x0 + x1) / 2 + 0.15, 0.08, z0 + s + 3], col("#f2d24a", 0.6), { cast: false }); } }
  return g;
}
export function sidewalk(parent, x0, z0, x1, z1) { return block(parent, [x0, 0, z0], [x1, 0.3, z1], new THREE.MeshStandardMaterial({ map: TEX.concrete([(x1 - x0) / 4, (z1 - z0) / 4]), roughness: 0.9 }), { cast: false }); }
export function tree(parent, x, z, s = 1, leaf = "#3f9a3a") {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z); g.scale.setScalar(s);
  block(g, [-0.6, 0, -0.6], [0.6, 5, 0.6], col("#7a5232", 0.9));
  block(g, [-2.6, 4.2, -2.6], [2.6, 8.2, 2.6], col(leaf, 0.8)); block(g, [-1.8, 8.2, -1.8], [1.8, 10, 1.8], col(shade(leaf, 0.05), 0.8));
  return g;
}
export function bush(parent, x, z, s = 1) { const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z); g.scale.setScalar(s); block(g, [-1.2, 0, -0.9], [1.2, 1.6, 0.9], col("#4aa043", 0.85)); return g; }
export function lamp(parent, x, z) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z);
  block(g, [-0.2, 0, -0.2], [0.2, 9, 0.2], col("#3a3f4a", 0.5)); block(g, [-0.2, 8.8, -0.2], [1.8, 9.1, 0.2], col("#3a3f4a", 0.5));
  block(g, [1.2, 8.3, -0.4], [2.2, 8.8, 0.4], col("#fff2c0", 0.3)); return g;
}
export function fence(parent, x0, z, x1, colr = "#f4f1ea") {
  const g = new THREE.Group(); parent.add(g);
  for (let x = x0; x <= x1; x += 1.6) block(g, [x - 0.15, 0, z - 0.15], [x + 0.15, 2.6, z + 0.15], col(colr, 0.6));
  for (const y of [0.8, 1.9]) block(g, [x0, y, z - 0.08], [x1, y + 0.3, z + 0.08], col(colr, 0.6));
  return g;
}
export function car(parent, x, z, rot = 0, body = "#d64545") {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z); g.rotation.y = rot;
  block(g, [-2.2, 0.8, -4.2], [2.2, 2.6, 4.2], col(body, 0.4)); block(g, [-1.9, 2.6, -2.2], [1.9, 4.2, 1.8], col(body, 0.4));
  for (const [a, b] of [[[-1.95, 2.8, -2.0], [1.95, 4.0, -1.95]], [[-1.95, 2.8, 1.55], [1.95, 4.0, 1.6]]]) block(g, a, b, glassM());
  for (const sx of [-1, 1]) for (const sz of [-2.6, 2.6]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.6, 18), col("#202228", 0.8)); w.rotation.z = Math.PI / 2; w.position.set(sx * 2.05, 0.85, sz); w.castShadow = true; g.add(w); }
  return g;
}
/** gable roof (closed prism) over a w x d footprint at height y, ridge along x */
export function gableRoof(parent, cx, cz, w, d, y, rise, color) {
  const s = new THREE.Shape(); s.moveTo(-d / 2 - 0.6, 0); s.lineTo(0, rise); s.lineTo(d / 2 + 0.6, 0); s.lineTo(-d / 2 - 0.6, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: w + 1.2, bevelEnabled: false }); geo.translate(0, 0, -(w + 1.2) / 2);
  const t = TEX.shingle(color, [w / 6, rise / 4]);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
  m.rotation.y = Math.PI / 2; m.position.set(cx, y, cz); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
/** a house: siding walls, gable roof, door + windows on the front (+z), chimney. Footprint centred on (x, z). */
export function house(parent, { x = 0, z = 0, w = 16, d = 12, h = 9, wall = "#e9e2cf", roof = "#5a4a6a", door = "#7a4a2e", rot = 0 } = {}) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z); g.rotation.y = rot;
  tblock(g, [-w / 2, 0, -d / 2], [w / 2, h, d / 2], (rep) => TEX.siding(wall, rep), 6);
  block(g, [-w / 2 - 0.2, 0, -d / 2 - 0.2], [w / 2 + 0.2, 0.6, d / 2 + 0.2], col("#8d8a84", 0.9));
  gableRoof(g, 0, 0, w, d, h, h * 0.55, roof);
  doorZ(g, 0, d / 2);
  for (const sx of [-1, 1]) windowZ(g, sx * w * 0.3, h * 0.48, d / 2);
  block(g, [w * 0.25, h, -d * 0.2], [w * 0.25 + 1.6, h + h * 0.6, -d * 0.2 + 1.6], new THREE.MeshStandardMaterial({ map: TEX.brick("#a24b38", [0.6, 1]), roughness: 0.9 }));
  block(g, [-1.8, 0, d / 2], [1.8, 0.35, d / 2 + 2.2], col("#b9b5ab", 0.9)); // step
  return g;
}
/** a two-storey brick school with a sign panel, entrance and window rows (front +z) */
export function school(parent, { x = 0, z = 0, w = 44, d = 20, h = 18, brick = "#b5533c", rot = 0 } = {}) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z); g.rotation.y = rot;
  tblock(g, [-w / 2, 0, -d / 2], [w / 2, h, d / 2], (rep) => TEX.brick(brick, rep), 5);
  block(g, [-w / 2 - 0.4, h, -d / 2 - 0.4], [w / 2 + 0.4, h + 0.8, d / 2 + 0.4], col("#e8e2d6", 0.7));
  block(g, [-6, h - 0.2, d / 2 - 1], [6, h + 4.5, d / 2], col("#e8e2d6", 0.7)); // pediment
  block(g, [-4.5, h + 0.6, d / 2], [4.5, h + 3.4, d / 2 + 0.1], col("#2f5f9a", 0.6)); // sign panel (episodes can paint it)
  for (const fy of [h * 0.28, h * 0.72]) for (let i = -3; i <= 3; i++) if (!(fy < h / 2 && Math.abs(i) < 1)) windowZ(g, i * 6, fy, d / 2, 3.2, 3.6, 1, "#f4f1ea");
  doorZ(g, -1.3, d / 2, 2.4, 5, "#2f5f9a"); doorZ(g, 1.3, d / 2, 2.4, 5, "#2f5f9a");
  block(g, [-5, 0, d / 2], [5, 0.4, d / 2 + 3], col("#c9c6bd", 0.9)); block(g, [-5, 0.4, d / 2], [5, 0.8, d / 2 + 1.5], col("#c9c6bd", 0.9));
  return g;
}

// ------------------------------------------------------------------ interiors
/** a room shell: floor, 4 walls (closed, thick), ceiling with a light panel. Openings: list of {wall:'back'|'left'|'right'|'front', at, w, h, y} for windows/doors.
 *  The front wall is left open by default (the camera's side); set front:true to close it (for reverse shots). */
export function room(parent, { x = 0, z = 0, w = 24, d = 18, h = 11, floor = (rep) => TEX.wood("#b5814e", rep), wall = "#e8dcc8", trim = "#8a5a3c", front = false, ceiling = true, windows = [] } = {}) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z);
  block(g, [-w / 2, -0.4, -d / 2], [w / 2, 0, d / 2], new THREE.MeshStandardMaterial({ map: floor([w / 6, d / 6]), roughness: 0.8 }), { cast: false });
  const WM = new THREE.MeshStandardMaterial({ map: TEX.plaster(wall, [w / 8, h / 8]), roughness: 0.95 }), T = 0.6;
  const wallZ = (zw, sign) => { // wall along x at z = zw with window holes (built as pieces around them)
    const ws = windows.filter((o) => o.wall === (sign < 0 ? "back" : "front")).sort((a, b) => a.at - b.at);
    let cx = -w / 2;
    for (const o of ws) { block(g, [cx, 0, zw - T / 2], [o.at - o.w / 2, h, zw + T / 2], WM); block(g, [o.at - o.w / 2, 0, zw - T / 2], [o.at + o.w / 2, o.y, zw + T / 2], WM); block(g, [o.at - o.w / 2, o.y + o.h, zw - T / 2], [o.at + o.w / 2, h, zw + T / 2], WM);
      if (o.kind !== "door") windowZ(g, o.at, o.y + o.h / 2, zw + (sign < 0 ? T / 2 : -T / 2), o.w, o.h, sign < 0 ? 1 : -1, "#ffffff", false); cx = o.at + o.w / 2; }
    block(g, [cx, 0, zw - T / 2], [w / 2, h, zw + T / 2], WM);
  };
  wallZ(-d / 2, -1); if (front) wallZ(d / 2, 1);
  for (const s of [-1, 1]) block(g, [s * w / 2 - T / 2, 0, -d / 2], [s * w / 2 + T / 2, h, d / 2], WM);
  block(g, [-w / 2, 0, -d / 2 + T / 2], [w / 2, 1.0, -d / 2 + T / 2 + 0.15], col(trim, 0.7)); // skirting
  if (ceiling) { block(g, [-w / 2, h, -d / 2], [w / 2, h + 0.4, d / 2], col("#f2efe8", 0.95)); block(g, [-3, h - 0.1, -2], [3, h, 2], new THREE.MeshBasicMaterial({ color: "#fffbe8" }), { cast: false }); }
  const bulb = new THREE.PointLight("#fff2d8", 30, w * 1.6, 1.6); bulb.position.set(0, h - 1, 0); g.add(bulb);
  return g;
}
export function desk(parent, x, z, rot = 0, top = "#c8a06a") {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z); g.rotation.y = rot;
  block(g, [-1.6, 2.4, -1.1], [1.6, 2.7, 1.1], col(top, 0.6));
  for (const sx of [-1.35, 1.35]) for (const sz of [-0.85, 0.85]) block(g, [sx - 0.12, 0, sz - 0.12], [sx + 0.12, 2.4, sz + 0.12], col("#5a5f6a", 0.5));
  return g;
}
export function chair(parent, x, z, rot = 0, seat = "#3f6fb0") {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z); g.rotation.y = rot;
  block(g, [-0.9, 1.6, -0.9], [0.9, 1.85, 0.9], col(seat, 0.6)); block(g, [-0.9, 1.85, -0.95], [0.9, 3.6, -0.75], col(seat, 0.6));
  for (const sx of [-0.75, 0.75]) for (const sz of [-0.75, 0.75]) block(g, [sx - 0.1, 0, sz - 0.1], [sx + 0.1, 1.6, sz + 0.1], col("#5a5f6a", 0.5));
  return g;
}
export function lockers(parent, x0, z, n, colr = "#4f7fb8", dir = 1) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x0, 0, z); g.rotation.y = dir > 0 ? 0 : Math.PI;
  const M = new THREE.MeshStandardMaterial({ map: TEX.metal(colr, [1, 1]), roughness: 0.45, metalness: 0.2 });
  for (let i = 0; i < n; i++) block(g, [i * 1.9, 0.6, -1.4], [i * 1.9 + 1.85, 7.4, 0], M);
  block(g, [0, 0, -1.4], [n * 1.9, 0.6, 0], col("#3a3f4a", 0.6));
  return g;
}
export function chalkboard(parent, x, y, z, w = 12, h = 5, dir = 1) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, y, z); g.rotation.y = dir > 0 ? 0 : Math.PI;
  block(g, [-w / 2 - 0.3, -h / 2 - 0.3, 0], [w / 2 + 0.3, h / 2 + 0.3, 0.2], col("#8a5a3c", 0.7));
  block(g, [-w / 2, -h / 2, 0.2], [w / 2, h / 2, 0.24], col("#2f4f3f", 0.95));
  block(g, [-w / 2, -h / 2 - 0.3, 0.2], [w / 2, -h / 2, 0.6], col("#8a5a3c", 0.7));
  return g;
}
export function longTable(parent, x, z, len = 12, rot = 0, top = "#e8e4dc") {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z); g.rotation.y = rot;
  block(g, [-len / 2, 2.5, -1.6], [len / 2, 2.8, 1.6], col(top, 0.5));
  for (const sx of [-len / 2 + 0.6, len / 2 - 0.6]) block(g, [sx - 0.2, 0, -1.2], [sx + 0.2, 2.5, 1.2], col("#5a5f6a", 0.5));
  for (const sz of [-2.6, 2.6]) block(g, [-len / 2 + 0.4, 1.5, sz - 0.6], [len / 2 - 0.4, 1.8, sz + 0.6], col("#3f6fb0", 0.6)), block(g, [-len / 2 + 1, 0, sz - 0.2], [-len / 2 + 1.4, 1.5, sz + 0.2], col("#5a5f6a")), block(g, [len / 2 - 1.4, 0, sz - 0.2], [len / 2 - 1, 1.5, sz + 0.2], col("#5a5f6a"));
  return g;
}
export function bed(parent, x, z, rot = 0, sheet = "#6a8fd6") {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z); g.rotation.y = rot;
  block(g, [-2.2, 0, -4], [2.2, 1.6, 4], col("#8a5a3c", 0.7)); block(g, [-2.1, 1.6, -3.9], [2.1, 2.3, 3.9], col("#f4f1ea", 0.9));
  block(g, [-2.15, 2.3, -1], [2.15, 2.55, 3.9], col(sheet, 0.9)); block(g, [-1.6, 2.3, -3.7], [1.6, 2.9, -2.4], col("#ffffff", 0.9));
  block(g, [-2.2, 0, -4.4], [2.2, 4.2, -4], col("#8a5a3c", 0.7));
  return g;
}

// ------------------------------------------------------------------ flood-story pieces
/** a grass mound (squashed sphere cap) + its height function */
export function hill(parent, cx, cz, r = 40, sy = 0.3, base = -3, colr = "#5fbf4a") {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), col(colr, 0.95));
  m.scale.set(1, sy, 1); m.position.set(cx, base, cz); m.receiveShadow = true; m.castShadow = true; parent.add(m);
  return (x, z) => { const d2 = (x - cx) ** 2 + (z - cz) ** 2; return d2 >= r * r ? 0 : Math.max(0, base + sy * Math.sqrt(r * r - d2)); };
}
export function busStop(parent, x, z, rot = 0) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, 0, z); g.rotation.y = rot;
  const metal = col("#4a5260", 0.4);
  for (const sx of [-3.4, 3.4]) for (const sz of [-1.2, 1.2]) block(g, [sx - 0.15, 0, sz - 0.15], [sx + 0.15, 5, sz + 0.15], metal);
  block(g, [-3.8, 5, -1.7], [3.8, 5.4, 1.7], col("#d9483b", 0.5)); // roof
  block(g, [-3.4, 0.4, -1.3], [3.4, 4.6, -1.2], glassM()); // back glass
  block(g, [-2.6, 1.6, -1.0], [2.6, 1.9, 0.0], col("#8a5a3c", 0.7)); // bench
  block(g, [3.6, 0, 1.5], [3.8, 7, 1.7], metal); block(g, [3.2, 6.2, 1.45], [4.6, 7.4, 1.75], col("#2f6fd0", 0.5)); // sign
  return g;
}
export function fireTruck(parent, x, y, z, rot = 0) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, y, z); g.rotation.y = rot;
  const red = col("#d42a2a", 0.45);
  block(g, [-2.6, 1, -7], [2.6, 4.6, 5], red); block(g, [-2.6, 1, 5], [2.6, 6, 8.5], red); // body + cab
  block(g, [-2.4, 3.8, 7.2], [2.4, 5.6, 8.55], glassM());
  block(g, [-2.6, 4.6, -7], [2.6, 4.9, 5], col("#c9ccd2", 0.4));
  for (const sx of [-1, 1]) for (const sz of [-4.5, 0, 6]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.8, 18), col("#202228", 0.8)); w.rotation.z = Math.PI / 2; w.position.set(sx * 2.6, 1.1, sz); w.castShadow = true; g.add(w); }
  block(g, [-1.4, 6, 6.8], [1.4, 6.5, 7.6], col("#3d7be0", 0.3)); // light bar
  // turntable + ladder (group `ladder`: extend along its local -z; set ladder.userData.len)
  const turn = new THREE.Group(); turn.position.set(0, 5.2, -2); g.add(turn);
  block(turn, [-1, 0, -1], [1, 0.8, 1], col("#c9ccd2", 0.4));
  const ladder = new THREE.Group(); ladder.position.set(0, 0.8, 0); turn.add(ladder);
  const rails = [], rungs = [];
  for (const sx of [-0.6, 0.6]) { const r = block(ladder, [sx - 0.1, 0, -1], [sx + 0.1, 0.25, 0], col("#c9ccd2", 0.35)); rails.push(r); }
  for (let i = 0; i < 40; i++) rungs.push(block(ladder, [-0.6, 0.05, -i - 0.6], [0.6, 0.2, -i - 0.5], col("#c9ccd2", 0.35)));
  const setLen = (L) => { for (const r of rails) { r.scale.z = L; r.position.z = -L / 2; } rungs.forEach((k, i) => (k.visible = i + 0.6 < L)); };
  setLen(10);
  return { g, turn, ladder, setLen };
}
export function boat(parent) {
  const g = new THREE.Group(); parent.add(g);
  const hull = col("#e8e4dc", 0.5), trim = col("#e05a2a", 0.5);
  block(g, [-2, 0, -4], [2, 0.4, 4], hull); // floor
  for (const sx of [-1, 1]) block(g, [sx * 2 - 0.2, 0, -4], [sx * 2 + 0.2, 1.6, 4], hull);
  block(g, [-2, 0, 3.8], [2, 1.6, 4.2], hull); block(g, [-2, 0, -4.2], [2, 1.6, -3.8], hull);
  block(g, [-2.25, 1.5, -4.3], [2.25, 1.8, 4.3], trim);
  return g;
}
/** flood water: a wide translucent plane with a scrolling ripple texture; set level + flow each frame */
export function water(parent, x0, z0, x1, z1) {
  const t = ctex("ripples", 256, 256, (g, r) => {
    g.fillStyle = "#3f78a8"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(220,240,255,${0.15 + r() * 0.35})`; g.lineWidth = 2 + r() * 3; const y = r() * 256, x = r() * 256, L = 20 + r() * 60; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + L / 2, y - 6, x + L, y); g.stroke(); }
  }, [(x1 - x0) / 14, (z1 - z0) / 14]);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, 1), new THREE.MeshStandardMaterial({ map: t, color: "#cfe6ff", roughness: 0.62, metalness: 0.0, transparent: true, opacity: 0.9 }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, -1, (z0 + z1) / 2); m.receiveShadow = true; parent.add(m);
  return { mesh: m, set(level, t2, flow = 0.6) { m.position.y = level; m.visible = level > 0.02; t.offset.set((-t2 * flow) % 1, (t2 * 0.03) % 1); } };
}
/** rain: thin streaks (instanced) in a box around a moving centre */
export function rain(parent, n = 1400, size = 70, height = 40) {
  const geo = new THREE.BoxGeometry(0.04, 1.6, 0.04), m = new THREE.MeshBasicMaterial({ color: "#d6e4f2", transparent: true, opacity: 0.45, depthWrite: false, fog: true });
  const inst = new THREE.InstancedMesh(geo, m, n); inst.frustumCulled = false; parent.add(inst);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const seeds = Array.from({ length: n }, () => [r() * size - size / 2, r() * height, r() * size - size / 2, 0.7 + r() * 0.6]);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.18));
  return { mesh: inst, set(on, t, c) {
    inst.visible = on; if (!on) return;
    seeds.forEach(([x, y, z, sp], i) => {
      const yy = ((y - t * 38 * sp) % height + height) % height;
      let dx = x, dz = z; const d = Math.hypot(dx, dz), near = 6; // no streak closer than `near` to the lens (they read as white bars)
      if (d < near) { const k = near / Math.max(d, 1e-3); dx *= k; dz *= k; }
      M.compose(new THREE.Vector3(c.x + dx, yy, c.z + dz), q, new THREE.Vector3(1, 1, 1)); inst.setMatrixAt(i, M);
    });
    inst.instanceMatrix.needsUpdate = true;
  } };
}
/** a string: a thin tube from a to b that sags by `sag` (0 = taut); rebuilt each frame */
export function rope(parent, colr = "#f4f1ea") {
  const m = new THREE.Mesh(new THREE.BufferGeometry(), col(colr, 0.6)); m.castShadow = true; m.frustumCulled = false; parent.add(m);
  return { mesh: m, set(a, b, sag = 0.4, segs = 24) {
    const pts = []; for (let i = 0; i <= segs; i++) { const u = i / segs; const p = a.clone().lerp(b, u); p.y -= sag * 4 * u * (1 - u); pts.push(p); }
    m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segs, 0.065, 6, false); m.visible = true;
  } };
}
