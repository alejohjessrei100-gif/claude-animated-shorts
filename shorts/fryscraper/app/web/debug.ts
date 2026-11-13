// frames of the world with a plain WebGLRenderer (no Remotion, no post): ?f=20,200,400 -> window.SHOTS (data URLs)
(globalThis as { FRY_BASE?: string }).FRY_BASE = new URL("./", location.href).href;
import * as THREE from "three";
import { World, loadKit } from "../src/fry/world";
import { shotAt } from "../src/fry/story";
const w = window as unknown as { DONE?: string; ERR?: string; SHOTS?: string[] };
(async () => {
  try {
    const frames = (new URLSearchParams(location.search).get("f") ?? "20").split(",").map(Number);
    const kit = await loadKit();
    const cv = document.getElementById("c") as HTMLCanvasElement;
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
    r.shadowMap.enabled = true; r.toneMapping = THREE.NeutralToneMapping;
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 540 / 960, 0.05, 2200);
    const world = new World(kit);
    scene.add(world.root);
    w.SHOTS = [];
    for (const f of frames) {
      cam.layers.enableAll();
      world.update(shotAt(f).id, f, cam, scene);
      r.render(scene, cam);
      const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(0, 0), cam); rc.layers.set(0);
      const hit = rc.intersectObjects(world.root.children, true).find((h) => h.object.visible && (h.object as THREE.Mesh).material && h.object.parent?.visible !== false);
      const m = hit ? ((hit.object as THREE.Mesh).material as THREE.Material) : null;
      (w as { LOG?: string[] }).LOG = [...((w as { LOG?: string[] }).LOG ?? []), `${f} shot ${shotAt(f).id} cam ${cam.position.toArray().map((v) => v.toFixed(1))} hit ${hit ? hit.distance.toFixed(1) + " " + (m?.name || (m as THREE.MeshLambertMaterial)?.color?.getHexString()) + " at " + hit.point.toArray().map((v) => v.toFixed(1)) : "none"}`];
      w.SHOTS.push(cv.toDataURL("image/jpeg", 0.85));
    }
    w.DONE = "ok";
  } catch (e) { w.ERR = String((e as Error).stack ?? e); }
})();
