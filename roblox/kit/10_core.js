// 10_core.js: renderer, light, sky, 1080x1920 canvas.
// Bright toy-plastic daylight: a warm key sun with soft shadows, a sky/ground hemisphere fill, a gradient sky dome and a
// little aerial haze so distant blocks fall back. Everything renders into one fixed-size canvas the recorder reads.
import * as THREE from "three";

export const W = 1080, H = 1920;

/** sky dome: vertical gradient (horizon -> zenith) with a soft sun glow */
function skyDome(top = "#4f9cf0", horizon = "#bfe3ff", sunDir = new THREE.Vector3(0.4, 0.6, 0.5)) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(horizon) }, sun: { value: sunDir.clone().normalize() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sun; varying vec3 vDir;
      void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(h, 0.55));
        float s = max(dot(normalize(vDir), sun), 0.0); c += vec3(1.0,0.92,0.75) * pow(s, 60.0) * 0.6 + vec3(1.0,0.95,0.85) * pow(s, 6.0) * 0.12;
        if (vDir.y < 0.0) c = hor; gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
  m.renderOrder = -1;
  return m;
}

/** core: { renderer, scene, camera, sun, canvas, render() } */
export function makeCore({ canvas, pixelRatio = 1, shadows = true, skyTop, skyHorizon } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const sunDir = new THREE.Vector3(0.45, 0.75, 0.5).normalize();
  const sky = skyDome(skyTop, skyHorizon, sunDir);
  scene.add(sky);
  scene.fog = new THREE.Fog(new THREE.Color(skyHorizon ?? "#bfe3ff"), 60, 260);

  const hemi = new THREE.HemisphereLight("#dbefff", "#8a9a6a", 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff3df", 2.3);
  sun.position.copy(sunDir).multiplyScalar(60);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  const S = 30; Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 160 });
  scene.add(sun, sun.target);

  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 2000);
  camera.position.set(0, 4, 14);

  /** keep the shadow box centred on what the camera is looking at */
  const followShadow = (target) => { sun.target.position.copy(target); sun.position.copy(target).addScaledVector(sunDir, 60); sun.target.updateMatrixWorld(); };

  const DAY = { top: new THREE.Color(skyTop ?? "#4f9cf0"), hor: new THREE.Color(skyHorizon ?? "#bfe3ff"), sun: 2.3, hemi: 1.15, ground: new THREE.Color("#8a9a6a") };
  /** mood: 0 = sunny day, 1 = storm (grey sky, dim sun, close fog); interior: neutral bounce (no green tint on ceilings) */
  const setMood = (storm = 0, interior = false) => {
    const grey = new THREE.Color("#5d6672"), greyH = new THREE.Color("#8d96a0");
    sky.material.uniforms.top.value.copy(DAY.top).lerp(grey, storm); sky.material.uniforms.hor.value.copy(DAY.hor).lerp(greyH, storm);
    scene.fog.color.copy(DAY.hor).lerp(greyH, storm); scene.fog.near = 60 - 30 * storm; scene.fog.far = 260 - 140 * storm;
    sun.intensity = DAY.sun * (1 - 0.6 * storm); hemi.intensity = DAY.hemi * (1 - 0.25 * storm);
    hemi.groundColor.copy(interior ? new THREE.Color("#c9b49a") : DAY.ground);
  };
  return { THREE, renderer, scene, camera, sun, hemi, sky, sunDir, followShadow, setMood, render: () => renderer.render(scene, camera) };
}

/** a simple ground: grass baseplate with a subtle stud-grid texture (canvas) */
export function baseplate(core, { size = 400, color = "#5fbf4a" } = {}) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = color; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "0,40,0" : "255,255,200"},0.05)`; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); }
  g.strokeStyle = "rgba(0,0,0,0.06)"; g.lineWidth = 2; g.strokeRect(1, 1, 254, 254);
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(size / 4, size / 4);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
  core.scene.add(m);
  return m;
}
