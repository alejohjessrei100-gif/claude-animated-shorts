// 25_anim.js: keyframed acting. A track is a list of keys { t, pose, face?, look?, lean?, ease?, add? } sorted by time;
// act(av, track, t, extra) blends the two keys around t with an ease (default "inout"; "back" overshoots for snappy
// anticipation/settle; "hold" jumps), then hands the result to poseAvatar so breathing, blinking and talk stay alive.
import { poseAvatar } from "./20_r6.js";

const E = {
  inout: (u) => u * u * (3 - 2 * u),
  out: (u) => 1 - (1 - u) * (1 - u),
  in: (u) => u * u,
  back: (u) => { const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
  hold: (u) => (u < 1 ? 0 : 1),
};
/** keys given as [t, pose, face, opts] tuples or objects */
export const track = (...keys) => keys.map((k) => (Array.isArray(k) ? { t: k[0], pose: k[1], face: k[2], ...(k[3] ?? {}) } : k)).sort((a, b) => a.t - b.t);
export function act(av, keys, t, extra = {}) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1] ?? a;
  const dur = b.dur ?? Math.min(0.35, (b.t - a.t) || 1); // move into the next key over its last `dur` seconds
  const u = b === a ? 0 : Math.min(1, Math.max(0, (t - (b.t - dur)) / dur));
  const k = (E[b.ease ?? "inout"] ?? E.inout)(u);
  const mix = (x, y) => (x || y ? [(x?.[0] ?? 0) + ((y?.[0] ?? 0) - (x?.[0] ?? 0)) * k, (x?.[1] ?? 0) + ((y?.[1] ?? 0) - (x?.[1] ?? 0)) * k] : undefined);
  const face = k > 0.5 ? b.face ?? a.face : a.face ?? b.face;
  poseAvatar(av, a.pose, b.pose, k, { ...extra, face: extra.face ?? face, look: mix(a.look, b.look) ?? extra.look, lean: mix(a.lean, b.lean) ?? extra.lean, add: extra.add });
}
