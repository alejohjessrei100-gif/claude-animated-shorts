// Draws one video frame. Every frame is a pure function of its number, so Remotion can ask for frames in any order.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {makeContext} from './kit.js';

// A 4x4 ordered dither, quantising to 40 levels per channel. Part of the look: do not remove.
const BAYER = {
  uniforms: {tDiffuse: {value: null}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    const float B[16] = float[16](0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.);
    const float L = 39.0;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
      float d = B[p.x + p.y * 4] / 16.0 - 0.47;
      gl_FragColor = vec4(clamp(floor(c.rgb * L + 0.5 + d) / L, 0.0, 1.0), 1.0);
    }`,
};

let renderer = null;
let owner = null;
let active = null;

function dispose(a) {
  a.scene.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [o.material].flat()) {
      if (!m) continue;
      for (const v of Object.values(m)) if (v?.isTexture) v.dispose();
      m.dispose();
    }
  });
  a.scene.environment?.dispose();
  if (a.scene.background?.isTexture) a.scene.background.dispose();
  a.composer.renderTarget1.dispose();
  a.composer.renderTarget2.dispose();
  a.composer.passes.forEach((p) => p.dispose?.());
  a.ctx.cleanup();
}

function mount(canvas, timeline, scenes, index) {
  if (owner !== canvas) {
    renderer?.dispose();
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true});
    renderer.setPixelRatio(1);
    renderer.setSize(timeline.width, timeline.height, false);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    owner = canvas;
    active = null;
  }
  if (active?.index === index && active.timeline === timeline) return active;
  if (active) dispose(active);

  const {width: W, height: H} = timeline;
  const shot = timeline.shots[index];
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 6000);
  const ctx = makeContext({renderer, scene, camera, W, H, shot});
  const build = scenes[shot.scene];
  if (!build) throw new Error(`scenes.js has no scene called "${shot.scene}"`);
  const update = build(ctx, shot.params ?? {}) ?? (() => {});

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, {type: THREE.HalfFloatType, samples: 4}));
  composer.addPass(new RenderPass(scene, camera));
  if (ctx.post.ao > 0) {
    const gtao = new GTAOPass(scene, camera, W, H);
    gtao.updateGtaoMaterial({radius: ctx.post.aoRadius, distanceExponent: 1.4, thickness: 1, scale: ctx.post.ao, samples: 12, screenSpaceRadius: false});
    gtao.blendIntensity = 1;
    composer.addPass(gtao);
  }
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), ctx.post.bloom, 0.55, ctx.post.bloomThreshold));
  composer.addPass(new OutputPass());
  composer.addPass(new ShaderPass(BAYER));
  active = {index, timeline, scene, camera, composer, update, ctx, shot};
  return active;
}

function shotIndex(shots, frame) {
  for (let i = 0; i < shots.length; i++) if (frame < shots[i].to) return i;
  return shots.length - 1;
}

export function renderFrame(canvas, timeline, scenes, frame) {
  const a = mount(canvas, timeline, scenes, shotIndex(timeline.shots, frame));
  const length = a.shot.to - a.shot.from;
  a.update((frame - a.shot.from) / timeline.fps, (frame - a.shot.from) / Math.max(length - 1, 1));
  a.composer.render();
}
