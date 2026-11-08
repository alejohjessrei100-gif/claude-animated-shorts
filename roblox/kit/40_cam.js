// 40_cam.js: camera moves pinned to the voice + one-word captions.
// A shot = { w: word index (or t: seconds) where it starts, at: [x,y,z] look target, dist, yaw (deg, 0 = camera on +z
// looking -z), pitch (deg, + = camera above), fov, move: 'push'|'pull'|'slideL'|'slideR'|'orbitL'|'orbitR'|'rise'|'drop'|'hold'|'shake',
// K: move strength (0..1, default 0.18), follow: fn(t) -> [x,y,z] (track a moving subject), roll }.
// Shots run until the next one starts (cut). Moves are smootherstep eased over the shot, so the camera never stops dead.
import * as THREE from "three";

export const ease = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * x * (x * (6 * x - 15) + 10); };

/** resolve shots against words.json: each gets t0/t1 in seconds */
export function timeline(shots, words, total) {
  const t = shots.map((s) => (s.t ?? (words[s.w]?.start ?? 0) - (s.lead ?? 0.03)));
  return shots.map((s, i) => ({ ...s, t0: Math.max(0, t[i]), t1: i + 1 < shots.length ? t[i + 1] : total }));
}
export const shotAt = (tl, t) => { let i = 0; while (i + 1 < tl.length && t >= tl[i + 1].t0) i++; return tl[i]; };

const D2R = Math.PI / 180;
/** camera pose for shot s at time t */
export function camPose(s, t) {
  const u = ease((t - s.t0) / Math.max(0.05, s.t1 - s.t0)), K = s.K ?? 0.18;
  const tgt = new THREE.Vector3(...(s.follow ? s.follow(t) : s.at));
  let dist = s.dist ?? 12, yaw = (s.yaw ?? 0) * D2R, pitch = (s.pitch ?? 8) * D2R, fov = s.fov ?? 42, lift = 0;
  const m = s.move ?? "push";
  if (m === "push") dist *= 1 - K * u;
  else if (m === "pull") dist *= 1 - K + K * u;
  else if (m === "orbitL") yaw += K * 1.4 * (u - 0.5);
  else if (m === "orbitR") yaw -= K * 1.4 * (u - 0.5);
  else if (m === "rise") { pitch += K * 0.8 * (u - 0.5); lift = K * dist * 0.25 * (u - 0.5); }
  else if (m === "drop") { pitch -= K * 0.8 * (u - 0.5); lift = -K * dist * 0.25 * (u - 0.5); }
  const pos = new THREE.Vector3(tgt.x + dist * Math.sin(yaw) * Math.cos(pitch), tgt.y + dist * Math.sin(pitch) + lift, tgt.z + dist * Math.cos(yaw) * Math.cos(pitch));
  if (m === "slideL" || m === "slideR") { // truck sideways along the camera's right vector, target moves with it
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar((m === "slideL" ? -1 : 1) * K * dist * 0.6 * (u - 0.5));
    pos.add(right); tgt.add(right);
  }
  let roll = (s.roll ?? 0) * D2R;
  if (m === "shake") { const a = 0.06 * (1 - u); pos.x += a * Math.sin(t * 61); pos.y += a * Math.sin(t * 47 + 1); roll += 0.01 * Math.sin(t * 37) * (1 - u); }
  return { pos, tgt, fov, roll };
}
export function applyCam(camera, p) {
  camera.position.copy(p.pos); camera.up.set(0, 1, 0); camera.lookAt(p.tgt);
  if (p.roll) camera.rotateZ(p.roll);
  if (camera.fov !== p.fov) { camera.fov = p.fov; camera.updateProjectionMatrix(); }
}

// ------------------------------------------------------------------ captions (skill spec)
// Poppins 800, 112 px, baseline y ~1222 of 1920, black stroke 13 px drawn twice, soft shadow rgba(0,0,0,.55) blur 14, white.
export const captionWord = (w) => w.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "");
export function wordAt(words, t) {
  let cur = null;
  for (const w of words) { if (w.start - 0.02 <= t) cur = w; else break; }
  if (!cur) return null;
  return t <= cur.end + 0.35 ? cur : null; // hold through tiny gaps, clear in real pauses
}
export function drawCaption(g, word, { y = 1222, size = 112, W = 1080 } = {}) {
  if (!word) return;
  const txt = captionWord(word);
  if (!txt) return;
  g.save();
  g.font = `800 ${size}px Poppins`; g.textAlign = "center"; g.textBaseline = "alphabetic"; g.lineJoin = "round";
  let s = size; while (g.measureText(txt).width > W - 120 && s > 60) { s -= 4; g.font = `800 ${s}px Poppins`; }
  g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = 14; g.shadowOffsetY = 4;
  g.strokeStyle = "#000"; g.lineWidth = 13 * (s / size); g.strokeText(txt, W / 2, y);
  g.shadowColor = "transparent"; g.strokeText(txt, W / 2, y);
  g.fillStyle = "#fff"; g.fillText(txt, W / 2, y);
  g.restore();
}
