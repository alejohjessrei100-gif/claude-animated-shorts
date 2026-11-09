// 46_detail.js: detailed set dressing. Varied houses (cottage with porch, two-storey with garage, modern flat-roof),
// shop fronts with awnings and painted signs, street furniture, a full playground, school-interior dressing, trees of
// several kinds, drifting clouds and birds. Everything is closed boxes / lathes + canvas textures; units are studs.
import * as THREE from "three";
import { block, col, TEX, ctex, windowZ, doorZ, gableRoof } from "./45_town.js";

const shade = (hex, k) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, k); return `#${c.getHexString()}`; };
const G = (parent, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; };
const cyl = (parent, r0, r1, h, m, x, y, z, seg = 16) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
const sph = (parent, r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };

/** a painted sign texture with words (original names only) */
export function signTex(text, bg = "#2f5f9a", fg = "#ffffff", w = 512, h = 128, font = "800 72px Poppins, sans-serif") {
  return ctex(`sign${text}${bg}${fg}${w}`, w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = shade(bg, -0.15); g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 4);
  });
}
const plane = (parent, w, h, mapOrMat, x, y, z, ry = 0) => { const m = mapOrMat.isMaterial ? mapOrMat : new THREE.MeshStandardMaterial({ map: mapOrMat, roughness: 0.7 }); const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.rotation.y = ry; o.receiveShadow = true; parent.add(o); return o; };

// ------------------------------------------------------------------ houses
/** cottage: porch with posts + railing + steps, shutters, window boxes with flowers, trim, gutters, chimney, path, mailbox */
export function cottage(parent, { x = 0, z = 0, w = 16, d = 12, h = 8, wall = "#e9e2cf", roof = "#5a4a6a", trim = "#ffffff", shutter = "#2f5f9a", door = "#b5533c", rot = 0, flowers = "#e05a8a" } = {}) {
  const g = G(parent, x, 0, z, rot), T = col(trim, 0.5);
  block(g, [-w / 2, 0.6, -d / 2], [w / 2, h, d / 2], new THREE.MeshStandardMaterial({ map: TEX.siding(wall, [w / 6, h / 6]), roughness: 0.85 }));
  block(g, [-w / 2 - 0.3, 0, -d / 2 - 0.3], [w / 2 + 0.3, 0.6, d / 2 + 0.3], new THREE.MeshStandardMaterial({ map: TEX.brick("#8d8a84", [w / 4, 0.3]), roughness: 0.9 }));
  for (const sx of [-1, 1]) block(g, [sx * w / 2 - 0.25, 0.6, d / 2 - 0.05], [sx * w / 2 + 0.25, h, d / 2 + 0.2], T); // corner boards
  block(g, [-w / 2 - 0.2, h - 0.35, d / 2 - 0.05], [w / 2 + 0.2, h, d / 2 + 0.25], T);
  gableRoof(g, 0, 0, w, d, h, h * 0.55, roof);
  for (const sz of [-1, 1]) block(g, [-w / 2 - 0.8, h - 0.25, sz * (d / 2 + 0.6) - 0.15], [w / 2 + 0.8, h, sz * (d / 2 + 0.6) + 0.15], col("#d9d9d9", 0.4)); // gutters
  block(g, [w / 2 + 0.6, 0.6, d / 2 + 0.45], [w / 2 + 0.85, h, d / 2 + 0.7], col("#d9d9d9", 0.4)); // downpipe
  block(g, [-w * 0.3, h, -d * 0.15], [-w * 0.3 + 1.8, h + h * 0.65, -d * 0.15 + 1.8], new THREE.MeshStandardMaterial({ map: TEX.brick("#a24b38", [0.6, 1.2]), roughness: 0.9 }));
  block(g, [-w * 0.3 - 0.15, h + h * 0.65, -d * 0.15 - 0.15], [-w * 0.3 + 1.95, h + h * 0.65 + 0.3, -d * 0.15 + 1.95], col("#6a6a6a", 0.8));
  // porch: deck, posts, railing, roof, steps
  const pd = 3.6, pw = w * 0.62;
  block(g, [-pw / 2, 0, d / 2], [pw / 2, 0.9, d / 2 + pd], new THREE.MeshStandardMaterial({ map: TEX.wood("#b98a5a", [2, 1]), roughness: 0.8 }));
  for (const sx of [-pw / 2 + 0.3, pw / 2 - 0.3]) block(g, [sx - 0.18, 0.9, d / 2 + pd - 0.5], [sx + 0.18, h * 0.7, d / 2 + pd - 0.14], T);
  block(g, [-pw / 2 - 0.3, h * 0.7, d / 2 - 0.1], [pw / 2 + 0.3, h * 0.7 + 0.35, d / 2 + pd + 0.3], col(roof, 0.8));
  for (const sx of [-1, 1]) { block(g, [sx > 0 ? 1.8 : -pw / 2 + 0.3, 1.95, d / 2 + pd - 0.4], [sx > 0 ? pw / 2 - 0.3 : -1.8, 2.15, d / 2 + pd - 0.25], T); for (let px = 0.4; px < pw / 2 - 2; px += 0.55) block(g, [sx * (1.8 + px) - 0.06, 0.9, d / 2 + pd - 0.37], [sx * (1.8 + px) + 0.06, 1.95, d / 2 + pd - 0.28], T); }
  for (let i = 0; i < 3; i++) block(g, [-1.6, 0, d / 2 + pd + i * 0.5], [1.6, 0.9 - i * 0.3, d / 2 + pd + 0.5 + i * 0.5], col("#b9b5ab", 0.9));
  doorZ(g, 0, d / 2, 2.2, 4.2, door);
  // windows with shutters + window boxes
  for (const sx of [-1, 1]) {
    const wx = sx * w * 0.32;
    windowZ(g, wx, h * 0.5, d / 2, 2.4, 2.8, 1, trim);
    for (const ss of [-1, 1]) { block(g, [wx + ss * 1.45 - 0.35, h * 0.5 - 1.5, d / 2], [wx + ss * 1.45 + 0.35, h * 0.5 + 1.5, d / 2 + 0.12], col(shutter, 0.6)); for (let k = 0; k < 6; k++) block(g, [wx + ss * 1.45 - 0.3, h * 0.5 - 1.3 + k * 0.48, d / 2 + 0.12], [wx + ss * 1.45 + 0.3, h * 0.5 - 1.22 + k * 0.48, d / 2 + 0.16], col(shade(shutter, -0.08), 0.6)); }
    block(g, [wx - 1.4, h * 0.5 - 2.1, d / 2], [wx + 1.4, h * 0.5 - 1.6, d / 2 + 0.6], col("#8a5a3c", 0.8));
    for (let k = 0; k < 6; k++) sph(g, 0.22, col(k % 2 ? flowers : "#f2c230", 0.7), wx - 1.1 + k * 0.44, h * 0.5 - 1.45, d / 2 + 0.3);
    for (let k = 0; k < 5; k++) sph(g, 0.25, col("#3f9a3a", 0.8), wx - 1.0 + k * 0.5, h * 0.5 - 1.55, d / 2 + 0.25, 1, 0.7, 1);
  }
  // side windows
  for (const sz of [-0.2, 0.25]) { const w2 = G(g, -w / 2, 0, sz * d, -Math.PI / 2); windowZ(w2, 0, h * 0.5, 0, 2.2, 2.6, 1, trim); }
  // front path, mailbox, hedges
  block(g, [-1.2, 0, d / 2 + pd + 1.5], [1.2, 0.08, d / 2 + pd + 9], col("#c9c6bd", 0.9));
  const mb = G(g, 2.6, 0, d / 2 + pd + 8); block(mb, [-0.08, 0, -0.08], [0.08, 2.6, 0.08], col("#6a4a2e", 0.8)); block(mb, [-0.35, 2.6, -0.6], [0.35, 3.2, 0.6], col("#3a3f4a", 0.5)); block(mb, [0.35, 2.9, 0.1], [0.42, 3.5, 0.18], col("#d43a3a", 0.5));
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) sph(g, 0.9, col("#3f8f3a", 0.85), sx * (pw / 2 + 1.2 + k * 1.4), 0.75, d / 2 + 0.9, 1, 0.8, 1);
  return g;
}
/** two-storey with an attached garage, dormer and bay window */
export function twoStorey(parent, { x = 0, z = 0, w = 14, d = 12, h = 14, wall = "#cfe3f0", roof = "#3d4f7a", trim = "#ffffff", door = "#2f5f9a", garage = "#f2efe8", rot = 0 } = {}) {
  const g = G(parent, x, 0, z, rot), T = col(trim, 0.5);
  block(g, [-w / 2, 0, -d / 2], [w / 2, h, d / 2], new THREE.MeshStandardMaterial({ map: TEX.siding(wall, [w / 6, h / 6]), roughness: 0.85 }));
  block(g, [-w / 2 - 0.2, h / 2 - 0.25, d / 2 - 0.05], [w / 2 + 0.2, h / 2 + 0.15, d / 2 + 0.25], T); // floor band
  gableRoof(g, 0, 0, w, d, h, 5, roof);
  for (const sx of [-1, 1]) for (const fy of [h * 0.25, h * 0.73]) if (!(sx < 0 && fy < h / 2)) windowZ(g, sx * w * 0.27, fy, d / 2, 2.4, 2.8, 1, trim);
  doorZ(g, -w * 0.27, d / 2, 2.2, 4.4, door);
  block(g, [-w * 0.27 - 1.6, 4.6, d / 2], [-w * 0.27 + 1.6, 4.9, d / 2 + 1.3], col(roof, 0.8)); // door canopy
  // garage wing with a ribbed door
  const gw = 8;
  block(g, [w / 2, 0, -d / 2 + 1], [w / 2 + gw, 7, d / 2], new THREE.MeshStandardMaterial({ map: TEX.siding(wall, [gw / 6, 7 / 6]), roughness: 0.85 }));
  block(g, [w / 2 - 0.2, 7, -d / 2 + 0.8], [w / 2 + gw + 0.4, 7.4, d / 2 + 0.4], col(roof, 0.8));
  block(g, [w / 2 + 0.8, 0, d / 2], [w / 2 + gw - 0.8, 5.6, d / 2 + 0.08], col(garage, 0.6));
  for (let k = 0; k < 6; k++) block(g, [w / 2 + 0.8, 0.4 + k * 0.9, d / 2 + 0.08], [w / 2 + gw - 0.8, 0.5 + k * 0.9, d / 2 + 0.14], col(shade(garage, -0.1), 0.6));
  block(g, [w / 2 + 0.6, 0, d / 2], [w / 2 + gw - 0.6, 0.06, d / 2 + 10], col("#9a978f", 0.9)); // driveway
  block(g, [-w / 2 - 0.3, 0, d / 2 + 4], [-w / 2 + 3, 1.2, d / 2 + 5.2], col("#3f8f3a", 0.85)); // hedge
  return g;
}
/** modern: flat roof with a parapet, big glass, wood cladding panel, planters */
export function modern(parent, { x = 0, z = 0, w = 16, d = 12, h = 10, wall = "#f2f0ea", wood = "#a8723f", rot = 0 } = {}) {
  const g = G(parent, x, 0, z, rot);
  block(g, [-w / 2, 0, -d / 2], [w / 2, h, d / 2], col(wall, 0.7));
  block(g, [-w / 2 - 0.3, h, -d / 2 - 0.3], [w / 2 + 0.3, h + 0.7, d / 2 + 0.3], col("#3a3f4a", 0.6));
  block(g, [w * 0.1, 0.4, d / 2], [w / 2 - 0.4, h - 0.6, d / 2 + 0.15], new THREE.MeshStandardMaterial({ map: TEX.wood(wood, [2, 3]), roughness: 0.7 }));
  windowZ(g, -w * 0.22, h * 0.3, d / 2, 5, 3.4, 1, "#3a3f4a"); windowZ(g, -w * 0.22, h * 0.75, d / 2, 5, 2.6, 1, "#3a3f4a"); windowZ(g, w * 0.3, h * 0.72, d / 2 + 0.15, 3, 2.4, 1, "#3a3f4a");
  doorZ(g, w * 0.3, d / 2 + 0.15, 2.2, 4.4, "#3a3f4a");
  for (const sx of [-w / 2 + 1, -w / 2 + 3.4]) { block(g, [sx - 0.8, 0, d / 2 + 1], [sx + 0.8, 1.2, d / 2 + 2.6], col("#6a6a6a", 0.8)); sph(g, 0.9, col("#4aa043", 0.8), sx, 1.7, d / 2 + 1.8, 1, 1.2, 1); }
  return g;
}

// ------------------------------------------------------------------ shops
/** shop front: shop window with goods behind it, striped awning, painted sign, cornice, flat upstairs with windows */
export function shop(parent, { x = 0, z = 0, w = 14, d = 12, h = 13, wall = "#c97a4a", name = "BAKERY", sign = "#2f5f9a", awning = ["#d64545", "#ffffff"], goods = "#f2c84b", rot = 0 } = {}) {
  const g = G(parent, x, 0, z, rot);
  block(g, [-w / 2, 0, -d / 2], [w / 2, h, d / 2], new THREE.MeshStandardMaterial({ map: TEX.brick(wall, [w / 5, h / 5]), roughness: 0.9 }));
  block(g, [-w / 2 - 0.3, h - 0.3, -d / 2 - 0.3], [w / 2 + 0.3, h + 0.6, d / 2 + 0.4], col("#e8e2d6", 0.7)); // cornice
  block(g, [-w / 2, 0, d / 2], [w / 2, 6, d / 2 + 0.2], col(shade(sign, -0.05), 0.6)); // shop front frame
  plane(g, w - 1, 1.6, signTex(name, sign, "#ffffff", 640, 128), 0, 6.9, d / 2 + 0.26);
  block(g, [-w / 2 + 0.2, 6.05, d / 2], [w / 2 - 0.2, 7.75, d / 2 + 0.22], col(shade(sign, -0.2), 0.6));
  // big window: glass + display shelf with goods inside
  const glass = new THREE.MeshStandardMaterial({ color: "#a9d4f0", roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false });
  block(g, [-w / 2 + 0.6, 1.2, d / 2 + 0.05], [w * 0.15, 5.2, d / 2 + 0.25], glass);
  block(g, [-w / 2 + 0.6, 0.2, d / 2 - 1.2], [w * 0.15, 1.2, d / 2 + 0.2], col("#f2efe8", 0.6));
  plane(g, w * 0.65 - 0.6, 4, col("#3a2a20", 1), -w * 0.175 + 0.3, 3.2, d / 2 - 1.5);
  for (let k = 0; k < 7; k++) sph(g, 0.35, col(k % 2 ? goods : shade(goods, -0.15), 0.6), -w / 2 + 1.2 + k * ((w * 0.65 - 1.6) / 6), 1.55, d / 2 - 0.5, 1.2, 0.8, 1);
  doorZ(g, w * 0.33, d / 2 + 0.2, 2.4, 4.6, "#3a3f4a");
  // awning: striped slope
  const stripes = ctex(`awn${awning}`, 256, 64, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = awning[i % 2]; c.fillRect(i * 32, 0, 32, 64); } }, [w / 6, 1]);
  const aw = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, 0.12, 2.6), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.8 }));
  aw.position.set(0, 5.6, d / 2 + 1.4); aw.rotation.x = 0.35; aw.castShadow = true; g.add(aw);
  for (let k = 0; k < 8; k++) block(g, [-w / 2 + 0.2 + k * (w - 0.4) / 8, 4.6, d / 2 + 2.55], [-w / 2 + 0.2 + (k + 1) * (w - 0.4) / 8 - 0.05, 5.05, d / 2 + 2.62], col(awning[k % 2], 0.8));
  for (const sx of [-1, 1]) { windowZ(g, sx * w * 0.25, 10, d / 2, 2.6, 3, 1, "#f4f1ea"); block(g, [sx * w * 0.25 - 1.5, 8.3, d / 2], [sx * w * 0.25 + 1.5, 8.5, d / 2 + 0.4], col("#f4f1ea", 0.6)); }
  return g;
}

// ------------------------------------------------------------------ street furniture
export function hydrant(parent, x, z) { const g = G(parent, x, 0.3, z); const R = col("#d42a2a", 0.4); cyl(g, 0.4, 0.45, 1.6, R, 0, 0.8, 0); sph(g, 0.42, R, 0, 1.6, 0); cyl(g, 0.15, 0.15, 1.2, R, 0, 1.1, 0).rotation.z = Math.PI / 2; cyl(g, 0.55, 0.55, 0.2, R, 0, 0.1, 0); return g; }
export function trashCan(parent, x, z, c = "#3f6a4a") { const g = G(parent, x, 0.3, z); cyl(g, 0.7, 0.6, 2.2, col(c, 0.5), 0, 1.1, 0, 14); cyl(g, 0.78, 0.78, 0.2, col(shade(c, -0.1), 0.5), 0, 2.3, 0, 14); for (let k = 0; k < 3; k++) cyl(g, 0.72, 0.72, 0.08, col(shade(c, -0.15), 0.5), 0, 0.5 + k * 0.7, 0, 14); return g; }
export function bench(parent, x, z, ry = 0) { const g = G(parent, x, 0.3, z, ry); const W = col("#8a5a34", 0.7), M = col("#3a3f4a", 0.4); for (let k = 0; k < 3; k++) block(g, [-2.4, 1.5, -0.6 + k * 0.42], [2.4, 1.65, -0.3 + k * 0.42], W); for (let k = 0; k < 2; k++) block(g, [-2.4, 2.1 + k * 0.5, -0.75], [2.4, 2.4 + k * 0.5, -0.62], W); for (const sx of [-2, 2]) { block(g, [sx - 0.1, 0, -0.6], [sx + 0.1, 1.5, -0.4], M); block(g, [sx - 0.1, 0, 0.4], [sx + 0.1, 1.5, 0.6], M); block(g, [sx - 0.1, 1.5, -0.8], [sx + 0.1, 2.9, -0.65], M); } return g; }
export function streetSign(parent, x, z, a = "MAPLE ST", b = "3RD AVE") { const g = G(parent, x, 0.3, z); block(g, [-0.1, 0, -0.1], [0.1, 9, 0.1], col("#5a6070", 0.4)); plane(g, 3.2, 0.7, signTex(a, "#1e7a3a", "#fff", 512, 112, "800 64px Poppins, sans-serif"), 0, 8.4, 0.12); const s2 = plane(g, 3.2, 0.7, signTex(b, "#1e7a3a", "#fff", 512, 112, "800 64px Poppins, sans-serif"), 0.12, 7.6, 0, Math.PI / 2); s2.material.side = THREE.DoubleSide; return g; }
export function stopSign(parent, x, z, ry = 0) { const g = G(parent, x, 0.3, z, ry); block(g, [-0.08, 0, -0.08], [0.08, 7, 0.08], col("#5a6070", 0.4)); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 8), new THREE.MeshStandardMaterial({ map: signTex("STOP", "#c62828", "#fff", 256, 256, "900 80px Poppins, sans-serif"), roughness: 0.5 })); s.rotation.x = Math.PI / 2; s.rotation.y = Math.PI / 8; s.position.set(0, 6.8, 0.1); s.castShadow = true; g.add(s); return g; }
export function bike(parent, x, z, ry = 0, c = "#2f6fd0") { const g = G(parent, x, 0.3, z, ry); const F = col(c, 0.4), K = col("#202228", 0.8); for (const sx of [-1.1, 1.1]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.1, 8, 24), K); w.position.set(sx, 0.85, 0); w.castShadow = true; g.add(w); } const bar = (a, b) => { const v = new THREE.Vector3().subVectors(b, a); const o = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, v.length(), 8), F); o.position.copy(a).add(b).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); o.castShadow = true; g.add(o); }; const V3 = (a, b, c2) => new THREE.Vector3(a, b, c2); bar(V3(-1.1, 0.85, 0), V3(0, 0.95, 0)); bar(V3(0, 0.95, 0), V3(0.9, 1.9, 0)); bar(V3(-0.2, 1.9, 0), V3(0.9, 1.9, 0)); bar(V3(-1.1, 0.85, 0), V3(-0.2, 1.9, 0)); bar(V3(0.9, 1.9, 0), V3(1.1, 0.85, 0)); bar(V3(0.9, 1.9, 0), V3(0.8, 2.4, 0)); block(g, [0.5, 2.35, -0.6], [0.6, 2.45, 0.6], K); block(g, [-0.45, 1.95, -0.2], [0.05, 2.1, 0.2], K); return g; }
export function cone(parent, x, z) { const g = G(parent, x, 0.3, z); block(g, [-0.5, 0, -0.5], [0.5, 0.12, 0.5], col("#e8601c", 0.6)); cyl(g, 0.08, 0.42, 1.3, col("#e8601c", 0.6), 0, 0.75, 0, 12); cyl(g, 0.24, 0.3, 0.25, col("#ffffff", 0.5), 0, 0.85, 0, 12); return g; }
export function newsBox(parent, x, z, c = "#2f5f9a") { const g = G(parent, x, 0.3, z); block(g, [-0.7, 0.8, -0.6], [0.7, 2.8, 0.6], col(c, 0.4)); block(g, [-0.55, 1.8, 0.6], [0.55, 2.6, 0.65], new THREE.MeshStandardMaterial({ color: "#cfe8ff", roughness: 0.1 })); for (const sx of [-0.55, 0.55]) block(g, [sx - 0.08, 0, -0.5], [sx + 0.08, 0.8, 0.5], col("#3a3f4a", 0.5)); return g; }

// ------------------------------------------------------------------ trees + nature
export function roundTree(parent, x, z, s = 1, leaf = "#3f9a3a") { const g = G(parent, x, 0, z); g.scale.setScalar(s); const L = col(leaf, 0.85), L2 = col(shade(leaf, 0.06), 0.85), L3 = col(shade(leaf, -0.06), 0.85); cyl(g, 0.45, 0.65, 5, col("#7a5232", 0.9), 0, 2.5, 0, 10); cyl(g, 0.18, 0.22, 2, col("#7a5232", 0.9), 0.6, 4.6, 0, 8).rotation.z = -0.6; sph(g, 2.6, L, 0, 6.6, 0); sph(g, 1.9, L2, 1.6, 7.6, 0.6); sph(g, 1.8, L3, -1.5, 7.3, -0.5); sph(g, 1.6, L2, 0.2, 8.6, -0.9); return g; }
export function pine(parent, x, z, s = 1) { const g = G(parent, x, 0, z); g.scale.setScalar(s); cyl(g, 0.35, 0.45, 2.5, col("#6a4426", 0.9), 0, 1.25, 0, 8); for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(3 - k * 0.6, 3, 10), col(k % 2 ? "#2e7a3e" : "#337f42", 0.85)); c.position.set(0, 3 + k * 1.6, 0); c.castShadow = true; g.add(c); } return g; }
export function flowers(parent, x, z, n = 10, r = 2, cols = ["#e05a8a", "#f2c230", "#ffffff", "#8a5ad6"]) { const g = G(parent, x, 0, z); let sd = Math.abs(Math.round(x * 13 + z * 7)) + 3; const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); for (let k = 0; k < n; k++) { const a = rr() * 6.28, d = rr() * r; cyl(g, 0.04, 0.04, 0.8, col("#3f8f3a", 0.8), Math.cos(a) * d, 0.4, Math.sin(a) * d, 5); sph(g, 0.2, col(cols[k % cols.length], 0.7), Math.cos(a) * d, 0.85, Math.sin(a) * d); } return g; }
/** drifting clouds (call .tick(t)) */
export function clouds(parent, n = 9, spread = 300, y = 70) {
  const g = G(parent); const M = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, emissive: "#ffffff", emissiveIntensity: 0.35, fog: false });
  const items = []; let sd = 11; const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) { const c = G(g, (rr() - 0.5) * spread, y + rr() * 25, -60 - rr() * spread * 0.5); for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(10 + rr() * 8, 3 + rr() * 3, 6 + rr() * 4), M); b.position.set(k * 6 - 9, rr() * 2, (rr() - 0.5) * 3); c.add(b); } items.push([c, c.position.x, 1 + rr()]); }
  g.tick = (t) => items.forEach(([c, x0, sp]) => { c.position.x = ((x0 + t * sp * 1.5 + spread / 2) % spread) - spread / 2; });
  return g;
}

// ------------------------------------------------------------------ playground
export function slide(parent, x, z, ry = 0) {
  const g = G(parent, x, 0, z, ry), P = col("#3d7be0", 0.4), S = col("#f2c230", 0.35);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) block(g, [sx * 1.4 - 0.15, 0, sz * 1.4 - 0.15], [sx * 1.4 + 0.15, 7.5, sz * 1.4 + 0.15], P);
  block(g, [-1.5, 5, -1.5], [1.5, 5.3, 1.5], col("#d64545", 0.5));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.6, 4), col("#d64545", 0.5)); roof.position.set(0, 8.3, 0); roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
  for (let k = 0; k < 7; k++) block(g, [-0.9, 0.7 * k + 0.6, -1.5 - 0.3 * k - 0.6], [0.9, 0.7 * k + 0.75, -1.5 - 0.3 * k - 0.3], P); // ladder rungs
  for (const sx of [-1, 1]) { const r = block(g, [sx * 0.95 - 0.1, 0, -4.2], [sx * 0.95 + 0.1, 5.6, -4.0], P); r.rotation.x = -0.35; r.position.z = -2.9; }
  const ch = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 7.2), S); ch.position.set(0, 2.7, 4.6); ch.rotation.x = 0.68; ch.castShadow = true; g.add(ch);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 7.2), S); w.position.set(sx * 0.95, 2.95, 4.6); w.rotation.x = 0.68; w.castShadow = true; g.add(w); }
  return g;
}
export function swings(parent, x, z, ry = 0, n = 3) {
  const g = G(parent, x, 0, z, ry), F = col("#3d7be0", 0.4), ch = col("#a0a6b0", 0.3), seat = col("#202228", 0.7);
  const W = n * 3 + 1;
  for (const sx of [-1, 1]) { const l1 = block(g, [sx * W / 2 - 0.15, 0, -1.8], [sx * W / 2 + 0.15, 8, -1.5], F); l1.rotation.x = 0.22; l1.position.z = -0.85; const l2 = block(g, [sx * W / 2 - 0.15, 0, 1.5], [sx * W / 2 + 0.15, 8, 1.8], F); l2.rotation.x = -0.22; l2.position.z = 0.85; }
  block(g, [-W / 2 - 0.3, 7.6, -0.2], [W / 2 + 0.3, 8.0, 0.2], F);
  g.seats = [];
  for (let i = 0; i < n; i++) { const s = G(g, -W / 2 + 2 + i * 3, 7.6, 0); for (const sx of [-0.55, 0.55]) block(s, [sx - 0.04, -5.6, -0.04], [sx + 0.04, 0, 0.04], ch); block(s, [-0.7, -5.75, -0.4], [0.7, -5.55, 0.4], seat); g.seats.push(s); }
  return g;
}
export function monkeyBars(parent, x, z, ry = 0) { const g = G(parent, x, 0, z, ry), F = col("#3dbf7a", 0.4); for (const sx of [-4, 4]) for (const sz of [-1, 1]) block(g, [sx - 0.12, 0, sz - 0.12], [sx + 0.12, 6.5, sz + 0.12], F); for (const sz of [-1, 1]) block(g, [-4, 6.4, sz - 0.1], [4, 6.6, sz + 0.1], F); for (let k = -3; k <= 3; k++) block(g, [k - 0.06, 6.4, -1], [k + 0.06, 6.6, 1], col("#f2c230", 0.3)); return g; }
export function seesaw(parent, x, z, ry = 0) { const g = G(parent, x, 0, z, ry); block(g, [-0.4, 0, -0.4], [0.4, 1.2, 0.4], col("#d64545", 0.4)); const b = G(g, 0, 1.3, 0); block(b, [-5, -0.12, -0.5], [5, 0.12, 0.5], col("#f2c230", 0.5)); for (const sx of [-4.4, 4.4]) block(b, [sx - 0.06, 0.12, -0.5], [sx + 0.06, 0.9, 0.5], col("#3a3f4a", 0.4)); b.rotation.z = 0.18; g.board = b; return g; }
export function sandbox(parent, x, z, w = 8, d = 6) { const g = G(parent, x, 0, z); for (const [a, b] of [[[-w / 2, -d / 2], [w / 2, -d / 2 + 0.4]], [[-w / 2, d / 2 - 0.4], [w / 2, d / 2]], [[-w / 2, -d / 2], [-w / 2 + 0.4, d / 2]], [[w / 2 - 0.4, -d / 2], [w / 2, d / 2]]]) block(g, [a[0], 0, a[1]], [b[0], 0.8, b[1]], new THREE.MeshStandardMaterial({ map: TEX.wood("#b98a5a", [1, 1]), roughness: 0.8 })); block(g, [-w / 2 + 0.4, 0, -d / 2 + 0.4], [w / 2 - 0.4, 0.5, d / 2 - 0.4], col("#e8cf8a", 1)); block(g, [1, 0.5, 0.5], [1.8, 1.0, 1.1], col("#d64545", 0.5)); return g; }
export function hoop(parent, x, z, ry = 0) { const g = G(parent, x, 0, z, ry); block(g, [-0.2, 0, -0.2], [0.2, 10, 0.2], col("#3a3f4a", 0.4)); block(g, [-2, 9, 0.2], [2, 12, 0.4], col("#ffffff", 0.5)); block(g, [-0.8, 9.4, 0.4], [0.8, 10.6, 0.45], col("#d64545", 0.5)); const r = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 8, 24), col("#e8601c", 0.4)); r.rotation.x = Math.PI / 2; r.position.set(0, 9.6, 1.3); g.add(r); return g; }
export function picnicTable(parent, x, z, ry = 0) { const g = G(parent, x, 0, z, ry), W = new THREE.MeshStandardMaterial({ map: TEX.wood("#a8723f", [1, 1]), roughness: 0.8 }); block(g, [-3, 2.4, -1.1], [3, 2.6, 1.1], W); for (const sz of [-2, 2]) block(g, [-3, 1.4, sz - 0.5], [3, 1.6, sz + 0.5], W); for (const sx of [-2.4, 2.4]) { block(g, [sx - 0.12, 0, -2.3], [sx + 0.12, 2.4, -2.1], W); block(g, [sx - 0.12, 0, 2.1], [sx + 0.12, 2.4, 2.3], W); } return g; }
/** painted court lines on the ground */
export function court(parent, x, z, w = 20, d = 28) { const t = ctex(`court${w}${d}`, 256, 360, (g) => { g.fillStyle = "#3a6ea5"; g.fillRect(0, 0, 256, 360); g.strokeStyle = "#ffffff"; g.lineWidth = 5; g.strokeRect(10, 10, 236, 340); g.beginPath(); g.moveTo(10, 180); g.lineTo(246, 180); g.stroke(); g.beginPath(); g.arc(128, 180, 34, 0, 7); g.stroke(); for (const y of [10, 350]) { g.beginPath(); g.arc(128, y, 70, y < 100 ? 0 : Math.PI, y < 100 ? Math.PI : 2 * Math.PI); g.stroke(); } }); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z); m.receiveShadow = true; parent.add(m); return m; }

// ------------------------------------------------------------------ school interior dressing
export function poster(parent, x, y, z, ry, text = "READ!", bg = "#f2c230", fg = "#d64545", w = 2.4, h = 3.2) {
  const t = ctex(`poster${text}${bg}${fg}`, 256, 340, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 256, 340); g.fillStyle = fg; g.beginPath(); g.arc(128, 140, 70, 0, 7); g.fill(); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(108, 120, 18, 0, 7); g.fill(); g.fillStyle = fg; g.font = "900 54px Poppins, sans-serif"; g.textAlign = "center"; g.fillText(text, 128, 290); });
  return plane(parent, w, h, t, x, y, z, ry);
}
export function bulletin(parent, x, y, z, ry, w = 6, h = 3.6) { const g = G(parent, x, y, z, ry); block(g, [-w / 2 - 0.2, -h / 2 - 0.2, 0], [w / 2 + 0.2, h / 2 + 0.2, 0.15], col("#8a5a3c", 0.7)); block(g, [-w / 2, -h / 2, 0.15], [w / 2, h / 2, 0.2], col("#c9965a", 0.95)); const cs = ["#ffffff", "#f2c230", "#8fd0f0", "#f0a0c0", "#a0e0a0"]; for (let k = 0; k < 7; k++) { const p = plane(g, 0.9 + (k % 3) * 0.2, 1.1, col(cs[k % cs.length], 0.9), -w / 2 + 0.8 + (k % 4) * 1.45, (k < 4 ? 0.7 : -0.8), 0.22); p.rotation.z = (k % 2 ? 0.06 : -0.05); sph(g, 0.07, col("#d42a2a", 0.4), p.position.x, p.position.y + 0.45, 0.25); } return g; }
export function wallClock(parent, x, y, z, ry) { const g = G(parent, x, y, z, ry); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.12, 24), col("#ffffff", 0.4)); f.rotation.x = Math.PI / 2; f.position.z = 0.06; g.add(f); const r = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.08, 8, 24), col("#202228", 0.4)); r.position.z = 0.1; g.add(r); block(g, [-0.03, 0, 0.13], [0.03, 0.5, 0.15], col("#202228", 0.4)); const m2 = block(g, [-0.03, 0, 0.13], [0.03, 0.35, 0.15], col("#202228", 0.4)); m2.rotation.z = -2.1; return g; }
export function trophyCase(parent, x, z, ry) { const g = G(parent, x, 0, z, ry); block(g, [-3, 0, -0.8], [3, 7, 0], col("#6a4a2e", 0.7)); block(g, [-2.8, 0.4, -0.6], [2.8, 6.8, -0.5], col("#2a1e14", 0.9)); for (const y of [2.2, 4.2]) block(g, [-2.8, y, -0.7], [2.8, y + 0.1, 0], col("#cfe8ff", 0.2)); for (let k = 0; k < 6; k++) { const gold = new THREE.MeshStandardMaterial({ color: "#f2c230", roughness: 0.25, metalness: 0.7 }); const sx = -2 + (k % 3) * 2, sy = k < 3 ? 2.3 : 4.3; cyl(g, 0.25, 0.35, 0.3, gold, sx, sy + 0.15, -0.35); cyl(g, 0.4, 0.15, 0.8, gold, sx, sy + 0.7, -0.35); } block(g, [-2.85, 0.3, -0.05], [2.85, 6.85, 0.02], new THREE.MeshStandardMaterial({ color: "#cfe8ff", roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false })); return g; }
export function classroomDoor(parent, x, z, ry, num = "104", c = "#2f5f9a") { const g = G(parent, x, 0, z, ry); block(g, [-1.5, 0, 0], [1.5, 5.4, 0.1], col("#f2efe8", 0.5)); block(g, [-1.25, 0, 0.05], [1.25, 5.1, 0.22], col(c, 0.6)); block(g, [-0.5, 3, 0.2], [0.5, 4.4, 0.24], new THREE.MeshStandardMaterial({ color: "#cfe8ff", roughness: 0.1 })); plane(g, 1, 0.45, signTex(num, "#ffffff", "#202228", 256, 112, "800 70px Poppins, sans-serif"), 0, 5.7, 0.12); sph(g, 0.12, col("#d9d9d9", 0.3), 0.9, 2.5, 0.3); return g; }
export function fountain(parent, x, z, ry) { const g = G(parent, x, 0, z, ry); block(g, [-0.9, 0, -0.7], [0.9, 2.8, 0], col("#c9ccd2", 0.3)); block(g, [-1, 2.8, -0.8], [1, 3.1, 0.5], col("#d9dce2", 0.25)); return g; }
export function bookshelf(parent, x, z, ry, w = 5) { const g = G(parent, x, 0, z, ry); const W = col("#8a5a3c", 0.7); block(g, [-w / 2, 0, -0.8], [w / 2, 6, 0], W); const cs = ["#d64545", "#3d7be0", "#3dbf7a", "#f2c230", "#8a5ad6", "#e8601c", "#2a2f3a"]; for (let r = 0; r < 4; r++) { block(g, [-w / 2 + 0.15, 0.3 + r * 1.45, -0.75], [w / 2 - 0.15, 0.4 + r * 1.45, 0.05], W); let bx = -w / 2 + 0.25, k = r * 3; while (bx < w / 2 - 0.5) { const bw = 0.2 + ((k * 7) % 5) * 0.06, bh = 0.85 + ((k * 3) % 4) * 0.1; block(g, [bx, 0.4 + r * 1.45, -0.65], [bx + bw, 0.4 + r * 1.45 + bh, 0.0], col(cs[k % cs.length], 0.7)); bx += bw + 0.03; k++; } } return g; }
export function teacherDesk(parent, x, z, ry) { const g = G(parent, x, 0, z, ry); const W = col("#8a5a3c", 0.6); block(g, [-3, 2.6, -1.4], [3, 2.9, 1.4], W); block(g, [-3, 0, -1.3], [-1.6, 2.6, 1.3], W); block(g, [1.6, 0, -1.3], [3, 2.6, 1.3], W); block(g, [-1.6, 1.2, -1.3], [1.6, 2.6, -1.1], W); sph(g, 0.3, col("#d42a2a", 0.4), 2.2, 3.2, 0.4); block(g, [-2.4, 2.9, -0.6], [-1.2, 3.0, 0.3], col("#f4f1ea", 0.8)); cyl(g, 0.25, 0.22, 0.6, col("#3d7be0", 0.5), 1, 3.2, -0.5); return g; }
export function windowBlinds(parent, x, y, z, ry, w = 4, h = 4) { const g = G(parent, x, y, z, ry); for (let k = 0; k < 10; k++) { const s = block(g, [-w / 2, k * h / 10 - h / 2, 0], [w / 2, k * h / 10 - h / 2 + 0.14, 0.1], col("#f2efe8", 0.6)); s.rotation.x = 0.4; } return g; }
export function ceilingLights(parent, x0, x1, z0, z1, y, step = 8) { const M = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#fffbe8", emissiveIntensity: 1 }); for (let x = x0; x <= x1; x += step) for (let z = z0; z <= z1; z += step) block(parent, [x - 0.8, y - 0.15, z - 2], [x + 0.8, y, z + 2], M, { cast: false }); }
export function backpackOnHook(parent, x, y, z, ry, c = "#d64545") { const g = G(parent, x, y, z, ry); block(g, [-0.6, -0.8, 0], [0.6, 0.6, 0.5], col(c, 0.7)); block(g, [-0.4, -0.6, 0.5], [0.4, 0, 0.7], col(shade(c, -0.08), 0.7)); return g; }
