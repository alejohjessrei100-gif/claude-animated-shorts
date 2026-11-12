// The building kit: seeded textures, skies, lighting, terrain, props, characters and planets.
// Everything is deliberately low detail with modern lighting on top; that contrast is the look.
import * as THREE from 'three';

export { THREE };
const TAU = Math.PI * 2;

export function rng(seed) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}

export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
const hashStr = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rgb = (c) => { const k = new THREE.Color(c); return [k.r, k.g, k.b].map((v) => Math.pow(v, 1 / 2.2) * 255); };
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// ---------------------------------------------------------------- noise
function valueNoise(seed, period) {
  const r = rng(seed), g = new Float32Array(period * period).map(() => r());
  const at = (x, y) => g[((y % period) + period) % period * period + ((x % period) + period) % period];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return lerp(lerp(at(xi, yi), at(xi + 1, yi), u), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), u), v);
  };
}
function fbm(seed, base = 4, oct = 4) {
  const ns = [...Array(oct)].map((_, i) => valueNoise(seed + i * 31, base << i));
  return (u, v) => { let s = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { s += ns[i](u * (base << i), v * (base << i)) * a; n += a; a *= 0.5; } return s / n; };
}
export function heightNoise(seed) {
  const n = fbm(seed, 4, 4);
  return (x, z, scale = 40) => n(x / scale + 500, z / scale + 500);
}

// ---------------------------------------------------------------- textures
function canvasTexture(size, paint, opts = {}) {
  const w = Array.isArray(size) ? size[0] : size, h = Array.isArray(size) ? size[1] : size;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  paint(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = opts.smooth ? THREE.LinearFilter : THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.anisotropy = 2;
  return t;
}
function pixels(size, fn, opts) {
  return canvasTexture(size, (g, w, h) => {
    const im = g.createImageData(w, h);
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
      const c = fn(x / w, y / h, x, y);
      im.data[i] = c[0]; im.data[i + 1] = c[1]; im.data[i + 2] = c[2]; im.data[i + 3] = c[3] ?? 255;
    }
    g.putImageData(im, 0, 0);
  }, opts);
}

function textures(seedBase) {
  const noisy = (cols, { seed = 1, base = 8, size = 128, contrast = 1.5 } = {}) => {
    const n = fbm(seedBase + seed, base, 4), p = cols.map(rgb);
    return pixels(size, (u, v) => {
      const t = Math.min(0.999, Math.max(0, (n(u, v) - 0.5) * contrast + 0.5)) * (p.length - 1);
      const i = Math.floor(t);
      return mix3(p[i], p[i + 1], t - i);
    });
  };
  const block = (draw, size = 128) => canvasTexture(size, draw);
  return {
    noisy,
    grass: (c = ['#2f5a1c', '#4f8a2a', '#7fb13a']) => noisy(c, { seed: 2, base: 16 }),
    dirt: (c = ['#4a3322', '#73543a', '#94744f']) => noisy(c, { seed: 3, base: 12 }),
    rock: (c = ['#3a3b40', '#6b6c70', '#94938f']) => noisy(c, { seed: 4, base: 6, contrast: 2 }),
    sand: (c = ['#b8955a', '#d6b87c', '#ead3a0']) => noisy(c, { seed: 5, base: 16 }),
    snow: () => noisy(['#b5c4d8', '#e4ebf5', '#ffffff'], { seed: 6, base: 8 }),
    asphalt: () => noisy(['#26272b', '#3b3c41', '#54555a'], { seed: 7, base: 24 }),
    concrete: (c = ['#7e7e7b', '#a4a39e', '#bdbcb6']) => noisy(c, { seed: 8, base: 8 }),
    metal: (c = ['#5a6068', '#868d96', '#a7adb4']) => noisy(c, { seed: 9, base: 5, contrast: 1 }),
    carpet: (c = ['#46505c', '#5e6a78', '#74818f']) => noisy(c, { seed: 10, base: 32, contrast: 2 }),
    water: (c = ['#123a55', '#1f6688', '#58a4b8']) => noisy(c, { seed: 11, base: 6, contrast: 2 }),
    bark: () => noisy(['#2c1f15', '#4b3626', '#6a4e36'], { seed: 12, base: 10 }),
    leaves: (c = ['#1f3f16', '#35691f', '#5c9331']) => noisy(c, { seed: 13, base: 10, contrast: 2.2 }),
    bricks: (brick = '#8a4a36', mortar = '#b3a892') => block((g, w) => {
      g.fillStyle = mortar; g.fillRect(0, 0, w, w);
      const r = rng(seedBase + 20), rows = 8, bh = w / rows, bw = w / 4;
      for (let y = 0; y < rows; y++) for (let x = -1; x < 5; x++) {
        const k = new THREE.Color(brick).offsetHSL(0, 0, r.range(-0.06, 0.06));
        g.fillStyle = '#' + k.getHexString();
        g.fillRect(x * bw + (y % 2) * bw / 2 + 1, y * bh + 1, bw - 2, bh - 2);
      }
    }),
    planks: (a = '#6a4a2c', b = '#3b2817') => block((g, w) => {
      const r = rng(seedBase + 21), n = 6;
      for (let i = 0; i < n; i++) {
        g.fillStyle = '#' + new THREE.Color(a).offsetHSL(0, 0, r.range(-0.05, 0.05)).getHexString();
        g.fillRect(i * w / n, 0, w / n, w);
        g.fillStyle = b; g.fillRect(i * w / n, 0, 1, w);
      }
    }),
    tiles: (a = '#c9c5b6', line = '#8b8778', n = 4) => block((g, w) => {
      g.fillStyle = a; g.fillRect(0, 0, w, w);
      g.fillStyle = line;
      for (let i = 0; i < n; i++) { g.fillRect(i * w / n, 0, 1, w); g.fillRect(0, i * w / n, w, 1); }
    }),
    ceiling: () => block((g, w) => {
      g.fillStyle = '#bdb9a9'; g.fillRect(0, 0, w, w);
      const r = rng(seedBase + 22);
      g.fillStyle = '#9d998a'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, w);
      g.fillStyle = '#a8a494';
      for (let i = 0; i < 90; i++) g.fillRect(r() * w, r() * w, 2, 1);
    }),
    wallpaper: (a = '#a9a57f', b = '#99956f') => block((g, w) => {
      g.fillStyle = a; g.fillRect(0, 0, w, w);
      g.fillStyle = b; for (let i = 0; i < 8; i++) g.fillRect(i * w / 8, 0, 3, w);
    }),
    label: (text, { w = 256, h = 64, bg = '#1a5c34', fg = '#f1f1e4', font = 'bold 30px monospace' } = {}) => canvasTexture([w, h], (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2);
    }, { clamp: true }),
    planet: (cols, { seed = 1, polar = null, cracks = false, size = 512 } = {}) => {
      const n = fbm(seedBase + seed, 4, 5), n2 = fbm(seedBase + seed + 9, 16, 3), p = cols.map(rgb);
      const polarC = polar && rgb(polar);
      return pixels([size, size / 2], (u, v) => {
        let t = n(u, v * 0.5);
        if (cracks) t = Math.abs(t - 0.5) < 0.012 + n2(u, v) * 0.02 ? 1 : t * 0.75;
        t = Math.min(0.999, Math.max(0, (t - 0.5) * 2.1 + 0.5)) * (p.length - 1);
        const i = Math.floor(t);
        let c = mix3(p[i], p[i + 1], t - i);
        if (polarC) c = mix3(c, polarC, smooth(0.12, 0.05, Math.min(v, 1 - v) - n2(u, v) * 0.03));
        return c;
      }, { smooth: true });
    },
    gas: (cols, { seed = 1, size = 512 } = {}) => {
      const n = fbm(seedBase + seed, 4, 4), p = cols.map(rgb);
      return pixels([size, size / 2], (u, v) => {
        const t = (v * 5 + n(u, v * 0.5) * 1.1) % 1 * (p.length - 1), i = Math.floor(t);
        return mix3(p[i], p[Math.min(p.length - 1, i + 1)], t - i);
      }, { smooth: true });
    },
    clouds: (seed = 1) => {
      const n = fbm(seedBase + seed + 300, 4, 5);
      return pixels([512, 256], (u, v) => [255, 255, 255, 255 * smooth(0.52, 0.72, n(u, v * 0.5))], { smooth: true });
    },
  };
}

// ---------------------------------------------------------------- context
export function makeContext({ renderer, scene, camera, W, H, shot }) {
  const seed = hashStr(shot.id);
  const r = rng(seed);
  const tex = textures(seed & 0xffff);
  const post = { bloom: 0.35, bloomThreshold: 1.0, ao: 1.25, aoRadius: 0.35 };
  const cleanups = [];
  const shadow = (o) => { o.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; }); return o; };

  const mat = (c, o = {}) => {
    const p = { roughness: o.rough ?? 0.8, metalness: o.metal ?? 0 };
    if (c?.isTexture) { p.map = c; if (o.repeat) { c.repeat.set(...[o.repeat].flat(), [o.repeat].flat()[0]); c.repeat.set([o.repeat].flat()[0], [o.repeat].flat().at(-1)); } } else p.color = new THREE.Color(c);
    if (o.tint) p.color = new THREE.Color(o.tint);
    if (o.emit !== undefined) { p.emissive = new THREE.Color(o.emitColor ?? (c?.isTexture ? '#ffffff' : c)); p.emissiveIntensity = o.emit; if (c?.isTexture) p.emissiveMap = c; }
    if (o.coat) { p.clearcoat = o.coat; p.clearcoatRoughness = 0.2; }
    if (o.alpha !== undefined) { p.transparent = true; p.opacity = o.alpha; p.depthWrite = false; }
    if (o.side) p.side = THREE.DoubleSide;
    return o.coat ? new THREE.MeshPhysicalMaterial(p) : new THREE.MeshStandardMaterial(p);
  };
  const place = (m, p) => { if (p) m.position.set(...p); return m; };
  const mesh = (g, m, p) => { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return place(o, p); };
  const G = {
    box: (w, h, d, m, p) => mesh(new THREE.BoxGeometry(w, h, d), m, p),
    cyl: (rt, rb, h, m, p, seg = 12) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, p),
    ball: (rad, m, p, seg = 16) => mesh(new THREE.SphereGeometry(rad, seg, Math.max(6, seg - 4)), m, p),
    cone: (rad, h, m, p, seg = 10) => mesh(new THREE.ConeGeometry(rad, h, seg), m, p),
    plane: (w, h, m, p) => mesh(new THREE.PlaneGeometry(w, h), m, p),
    lathe: (pts, m, p, seg = 16) => mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), m, p),
    extrude: (pts, depth, m, p) => {
      const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      return mesh(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), m, p);
    },
    group: (p, ...kids) => { const g = new THREE.Group(); place(g, p); if (kids.length) g.add(...kids); return g; },
  };

  // ---- sky and light
  function skyTexture({ top, mid, horizon, ground, stars = 0, clouds = 0, cloudColor = '#ffffff', sunDir = null, sunColor = '#fff2d0', sunSize = 0.03, midAt = 0.3, nebula = null }) {
    const [t, m, h, gnd] = [top, mid, horizon, ground ?? horizon].map(rgb);
    const n = fbm(seed + 77, 4, 5), n2 = fbm(seed + 78, 3, 4), cc = rgb(cloudColor), sc = rgb(sunColor), neb = nebula && nebula.map(rgb);
    const R = rng(seed + 5), starMap = new Map(), SW = stars ? 2048 : 1024;
    for (let i = 0; i < stars; i++) starMap.set(Math.floor(R() * SW) + Math.floor(R() * SW / 2) * SW, R.range(0.3, 1));
    const sd = sunDir && new THREE.Vector3(...sunDir).normalize();
    const tx = pixels([SW, SW / 2], (u, v, x, y) => {
      const e = 1 - v * 2;
      let c;
      if (e < 0) c = mix3(h, gnd, smooth(0, 0.06, -e));
      else if (e < midAt) c = mix3(h, m, smooth(0, midAt, e));
      else c = mix3(m, t, smooth(midAt, 1, e));
      if (neb) {
        const nv = n2(u, v * 0.5);
        c = mix3(c, neb[0], smooth(0.5, 0.75, nv) * 0.55);
        c = mix3(c, neb[1], smooth(0.58, 0.8, n(u + 0.3, v * 0.5)) * 0.5);
      }
      const s = starMap.get(x + y * SW);
      if (s && e > -0.02) c = mix3(c, [255, 255, 245], s);
      if (clouds > 0 && e > 0.015) {
        const nv = n(u * 2, v);
        const k = smooth(0.6 - clouds * 0.22, 0.68 - clouds * 0.2, nv) * smooth(0.015, 0.14, e);
        c = mix3(c, mix3(cc, mix3(c, [120, 130, 150], 0.5), 0.55 * (1 - smooth(0.58, 0.74, nv))), k * 0.95);
      }
      if (sd) {
        const a = u * TAU - Math.PI, cosE = Math.sqrt(1 - e * e);
        const dx = cosE * Math.sin(a) * sd.x + e * sd.y + cosE * -Math.cos(a) * sd.z;
        c = mix3(c, sc, smooth(1 - sunSize * 7, 1, dx) * 0.55);
        c = mix3(c, sc, smooth(1 - sunSize * 0.06, 1 - sunSize * 0.03, dx));
      }
      return c;
    }, { smooth: true });
    tx.mapping = THREE.EquirectangularReflectionMapping;
    tx.wrapT = THREE.ClampToEdgeWrapping;
    return tx;
  }

  const LIGHT = {
    day: { sky: { top: '#2a6bc4', mid: '#6ea8df', horizon: '#d7e6ee', clouds: 0.55 }, sun: ['#fff0d2', 3.1], dir: [-0.5, 0.8, 0.4], hemi: ['#b9d6ff', '#58603a', 1.1], fog: ['#c5dbe9', 40, 420] },
    overcast: { sky: { top: '#5d6670', mid: '#8b949c', horizon: '#b4b9bb', clouds: 0.9, cloudColor: '#cfd3d6' }, sun: ['#e8ecf0', 1.2], dir: [-0.3, 0.9, 0.3], hemi: ['#c7cdd3', '#55554e', 1.8], fog: ['#a7adb1', 20, 220] },
    sunset: { sky: { top: '#3b2a6b', mid: '#c95a78', horizon: '#ffb25e', clouds: 0.4, cloudColor: '#ff9c86' }, sun: ['#ffcfa0', 3.3], dir: [-0.6, 0.28, 0.7], hemi: ['#b185c4', '#4a2c30', 0.9], fog: ['#d27a78', 25, 300] },
    dusk: { sky: { top: '#141b4e', mid: '#59408f', horizon: '#e0838c', stars: 900 }, sun: ['#c4a8ff', 1.4], dir: [0.4, 0.35, 0.6], hemi: ['#7a78c9', '#25213f', 1.0], fog: ['#6d5592', 25, 260] },
    night: { sky: { top: '#03050f', mid: '#0a1230', horizon: '#1d2748', stars: 2600 }, sun: ['#8fa6e6', 0.9], dir: [0.4, 0.7, 0.4], hemi: ['#37487e', '#0c0d14', 0.8], fog: ['#121a33', 15, 180] },
    interior: { sky: { top: '#404040', mid: '#404040', horizon: '#404040' }, hemi: ['#fff7e4', '#4a463c', 1.2], fog: null, hideSky: '#000000' },
    space: { sky: { top: '#02030a', mid: '#040614', horizon: '#050714', stars: 5200, nebula: ['#2a1b5e', '#0f3a5c'] }, sun: ['#fff4de', 3.4], dir: [-0.8, 0.35, 0.55], hemi: ['#1b2238', '#000000', 0.18], fog: null },
  };

  function setLight(preset, o = {}) {
    const L = { ...LIGHT[preset], ...o, sky: { ...LIGHT[preset].sky, ...(o.sky ?? {}) } };
    const dir = o.dir ?? L.dir;
    const sky = skyTexture({ ...L.sky, sunDir: L.sun && dir && !L.noSunDisc ? dir : null });
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(sky).texture;
    pm.dispose();
    scene.environment = env;
    scene.environmentIntensity = o.env ?? (preset === 'interior' ? 0.25 : 0.7);
    scene.background = L.hideSky ? new THREE.Color(L.hideSky) : sky;
    if (L.fog) scene.fog = new THREE.Fog(L.fog[0], L.fog[1], L.fog[2]);
    if (L.hemi) scene.add(new THREE.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2]));
    if (L.sun && dir) {
      const s = new THREE.DirectionalLight(L.sun[0], L.sun[1]);
      const span = o.shadowSpan ?? 26, at = new THREE.Vector3(...(o.focus ?? [0, 0, 0]));
      s.position.copy(at).add(new THREE.Vector3(...dir).normalize().multiplyScalar(90));
      s.target.position.copy(at);
      s.castShadow = true;
      s.shadow.mapSize.set(2048, 2048);
      Object.assign(s.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 220 });
      s.shadow.bias = -0.0005; s.shadow.normalBias = 0.03; s.shadow.radius = 2.5;
      scene.add(s, s.target);
      return s;
    }
    return null;
  }

  // ---- ground
  function terrain({ size = 400, seg = 180, height = () => 0, texture, repeat = 40, tint = null, rough = 0.95 } = {}) {
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    const a = g.attributes.position, colors = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i), z = a.getZ(i);
      a.setY(i, height(x, z));
      const c = tint ? tint(x, z) : [1, 1, 1];
      colors.set(c, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    if (texture) { texture.repeat.set(repeat, repeat); }
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: texture ?? null, vertexColors: true, roughness: rough }));
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  function tufts({ count = 5000, spread = 80, height = () => 0, colors = ['#4f8a2a', '#6fa436', '#3b6d22'], len = [0.14, 0.38], avoid = null, center = [0, 0] }) {
    const pos = [], col = [], cs = colors.map((c) => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      const x = center[0] + (r() - 0.5) * spread, z = center[1] + (r() - 0.5) * spread;
      if (avoid?.(x, z)) continue;
      const y = height(x, z), a = r() * TAU, w = 0.03 + r() * 0.035, h = r.range(len[0], len[1]), lean = r() * 0.25;
      const dx = Math.cos(a) * w, dz = Math.sin(a) * w, c = cs[Math.floor(r() * cs.length)];
      pos.push(x - dx, y, z - dz, x + dx, y, z + dz, x + Math.sin(a) * lean, y + h, z + Math.cos(a) * lean);
      for (const k of [0.6, 0.6, 1.25]) col.push(c.r * k, c.g * k, c.b * k);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }));
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  function water({ size = 800, y = 0, colors, repeat = 60, rough = 0.18 } = {}) {
    const t = tex.water(colors);
    t.repeat.set(repeat, repeat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshPhysicalMaterial({ map: t, roughness: rough, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true;
    scene.add(m);
    return (time) => { t.offset.set(time * 0.012, time * 0.02); };
  }

  // ---- locations: quick starting points; each returns { height, update }
  const LOC = {
    plains({ light = 'day', hilly = 5, colors, tuftColors, extra = {} } = {}) {
      setLight(light, { focus: [0, 0, 0], ...extra });
      const n = heightNoise(seed), height = (x, z) => (n(x, z, 90) - 0.5) * hilly * 2 * smooth(6, 60, Math.hypot(x, z)) + (n(x + 40, z, 18) - 0.5) * 0.5;
      terrain({ height, texture: tex.grass(colors), repeat: 90 });
      tufts({ height, count: 26000, spread: 64, colors: tuftColors });
      return { height };
    },
    desert({ light = 'day', extra = {} } = {}) {
      setLight(light, { sky: { horizon: '#efd9a8', top: '#3f7fc8', clouds: 0.15 }, ...extra });
      const n = heightNoise(seed), height = (x, z) => (n(x, z, 60) - 0.5) * 14 * smooth(8, 70, Math.hypot(x, z));
      terrain({ height, texture: tex.sand(), repeat: 90 });
      return { height };
    },
    snow({ light = 'overcast', extra = {} } = {}) {
      setLight(light, extra);
      const n = heightNoise(seed), height = (x, z) => (n(x, z, 70) - 0.5) * 12 * smooth(8, 70, Math.hypot(x, z));
      terrain({ height, texture: tex.snow(), repeat: 60 });
      return { height };
    },
    wasteland({ light = 'sunset', extra = {}, colors = ['#3a2626', '#5a3a30', '#7d5a42'] } = {}) {
      setLight(light, extra);
      const n = heightNoise(seed), height = (x, z) => (n(x, z, 40) - 0.5) * 7 * smooth(5, 50, Math.hypot(x, z));
      terrain({ height, texture: tex.dirt(colors), repeat: 80 });
      tufts({ height, count: 3000, spread: 60, colors: ['#8b7a3a', '#a8913f', '#6b5e30'], len: [0.2, 0.7] });
      return { height };
    },
    sea({ light = 'overcast', colors, extra = {} } = {}) {
      setLight(light, extra);
      const update = water({ colors });
      return { height: () => 0, update };
    },
    space({ extra = {} } = {}) {
      setLight('space', { ...extra });
      post.ao = 0; post.bloom = 0.5; post.bloomThreshold = 0.92;
      return {};
    },
    // A box room. Camera goes inside; walls face inward. Returns the materials so scenes can dress it.
    room({ w = 10, d = 14, h = 3, floor, wall, ceil, lights = 3, lightColor = '#fff3d8', lightPower = 11, y = 0 } = {}) {
      setLight('interior');
      const f = floor ?? tex.carpet(), wl = wall ?? tex.wallpaper(), c = ceil ?? tex.ceiling();
      f.repeat.set(w / 2, d / 2); wl.repeat.set(d / 2, h / 2); c.repeat.set(w / 1.2, d / 1.2);
      const fm = mat(f, { rough: 0.9 }), wm = mat(wl, { rough: 0.85, side: true }), cm = mat(c, { rough: 0.9, tint: '#6d6a60' });
      const fl = G.plane(w, d, fm, [0, y, 0]); fl.rotation.x = -Math.PI / 2;
      const ce = G.plane(w, d, cm, [0, y + h, 0]); ce.rotation.x = Math.PI / 2;
      const walls = [[0, d / 2, 0, w], [0, -d / 2, Math.PI, w], [w / 2, 0, -Math.PI / 2, d], [-w / 2, 0, Math.PI / 2, d]].map(([x, z, ry, len]) => {
        const m = G.plane(len, h, wm, [x, y + h / 2, z]); m.rotation.y = ry + Math.PI; return m;
      });
      scene.add(fl, ce, ...walls);
      const pan = [];
      for (let i = 0; i < lights; i++) {
        const z = lights === 1 ? 0 : lerp(-d / 2 + 2.4, d / 2 - 2.4, i / (lights - 1));
        const glow = mat('#fff9e6', { emit: 1.25, emitColor: '#fff4d6' });
        scene.add(G.box(1.5, 0.05, 0.6, glow, [0, y + h - 0.03, z]));
        const L = new THREE.PointLight(lightColor, lightPower, 16, 1.6);
        L.position.set(0, y + h - 0.9, z);
        if (i === Math.floor(lights / 2)) { L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.002; L.shadow.radius = 4; }
        scene.add(L);
        pan.push({ light: L, glow });
      }
      post.aoRadius = 0.5; post.ao = 1.5; post.bloom = 0.18;
      return { lights: pan, height: () => y };
    },
  };

  // ---- props: each returns a Group standing on y = 0, not yet added to the scene
  const P = {
    tree({ kind = 'oak', h = 6, leaf } = {}) {
      const g = G.group();
      const bark = mat(tex.bark());
      g.add(G.cyl(0.14 * h / 6, 0.27 * h / 6, h * 0.55, bark, [0, h * 0.27, 0], 8));
      if (kind === 'pine') {
        const m = mat(tex.leaves(leaf ?? ['#132c17', '#1f4522', '#2e5e2c']));
        for (let i = 0; i < 4; i++) g.add(G.cone((1.9 - i * 0.38) * h / 6, h * 0.42, m, [0, h * (0.4 + i * 0.17), 0], 9));
      } else {
        const m = mat(tex.leaves(leaf));
        for (let i = 0; i < 6; i++) {
          const a = r() * TAU, d = i ? r.range(0.5, 1.1) * h / 6 : 0;
          g.add(G.ball((i ? r.range(0.8, 1.2) : 1.6) * h / 6, m, [Math.cos(a) * d, h * 0.68 + r.range(-0.3, 0.5) * h / 6, Math.sin(a) * d], 9));
        }
      }
      return g;
    },
    bush({ s = 1, leaf } = {}) {
      const m = mat(tex.leaves(leaf)), g = G.group();
      for (let i = 0; i < 3; i++) g.add(G.ball(r.range(0.35, 0.6) * s, m, [r.range(-0.4, 0.4) * s, 0.3 * s, r.range(-0.4, 0.4) * s], 8));
      return g;
    },
    rock({ s = 1, c } = {}) {
      const geo = new THREE.IcosahedronGeometry(s, 1), a = geo.attributes.position, mem = new Map();
      for (let i = 0; i < a.count; i++) {
        const k = `${a.getX(i).toFixed(2)},${a.getY(i).toFixed(2)},${a.getZ(i).toFixed(2)}`;
        if (!mem.has(k)) mem.set(k, r.range(0.72, 1.18));
        const f = mem.get(k);
        a.setXYZ(i, a.getX(i) * f, a.getY(i) * f * 0.72, a.getZ(i) * f);
      }
      geo.computeVertexNormals();
      const t = tex.rock(c); t.repeat.set(2, 2);
      return G.group(null, mesh(geo, mat(t, { rough: 0.92 }), [0, s * 0.35, 0]));
    },
    house({ wall = '#e6dfc9', roof = '#54362a', w = 6, d = 4.5, h = 3, door = '#3f5f43', lit = false } = {}) {
      const g = G.group(), wm = mat(wall, { rough: 0.9 }), rm = mat(roof, { rough: 0.8 });
      g.add(G.box(w, h, d, wm, [0, h / 2, 0]));
      const rh = d * 0.42;
      const prism = new THREE.BufferGeometry();
      const hw = w / 2 + 0.25, hd = d / 2 + 0.3;
      const v = [-hw, 0, hd, hw, 0, hd, hw, rh, 0, -hw, 0, hd, hw, rh, 0, -hw, rh, 0, hw, 0, -hd, -hw, 0, -hd, -hw, rh, 0, hw, 0, -hd, -hw, rh, 0, hw, rh, 0, -hw, 0, -hd, -hw, 0, hd, -hw, rh, 0, hw, 0, hd, hw, 0, -hd, hw, rh, 0];
      prism.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      prism.computeVertexNormals();
      g.add(mesh(prism, rm, [0, h, 0]));
      g.add(G.box(0.7, rh + 1, 0.7, mat('#8b8378'), [w * 0.32, h + rh * 0.6, 0]));
      const glass = lit ? mat('#ffd98a', { emit: 3 }) : mat('#23303a', { rough: 0.15, metal: 0.4 });
      for (const x of [-w * 0.3, w * 0.3]) {
        g.add(G.box(1, 1.1, 0.06, glass, [x, h * 0.6, d / 2 + 0.02]), G.box(1.2, 0.1, 0.1, mat('#f0ece0'), [x, h * 0.6 - 0.6, d / 2 + 0.05]));
      }
      g.add(G.box(0.95, 2, 0.08, mat(door), [0, 1, d / 2 + 0.03]));
      return g;
    },
    fence({ len = 8, c = '#7a6248' } = {}) {
      const m = mat(c), g = G.group();
      for (let x = 0; x <= len; x += 2) g.add(G.box(0.12, 1.1, 0.12, m, [x - len / 2, 0.55, 0]));
      g.add(G.box(len, 0.08, 0.05, m, [0, 0.85, 0]), G.box(len, 0.08, 0.05, m, [0, 0.5, 0]));
      return g;
    },
    door({ c = '#6e4a2b', frame = '#3a2a1c', glow = null, label = null } = {}) {
      const g = G.group(), pivot = G.group([-0.5, 0, 0.02]);
      g.add(G.box(0.14, 2.3, 0.2, mat(frame), [-0.58, 1.15, 0]), G.box(0.14, 2.3, 0.2, mat(frame), [0.58, 1.15, 0]), G.box(1.3, 0.14, 0.2, mat(frame), [0, 2.3, 0]));
      if (glow) { const q = mat(glow, { emit: 2.5 }); g.add(G.plane(0.96, 2.14, q, [0, 1.08, -0.04])); }
      pivot.add(G.box(1, 2.2, 0.07, mat(c, { rough: 0.6 }), [0.5, 1.1, 0]), G.ball(0.05, mat('#d8b95a', { metal: 1, rough: 0.3 }), [0.88, 1.05, 0.06], 8));
      g.add(pivot);
      if (label) { const t = tex.label(label, { w: 64, h: 64, font: 'bold 44px monospace', bg: '#1b1b1b' }); g.add(G.plane(0.34, 0.34, mat(t, { emit: 0.4 }), [0, 2.62, 0.04])); }
      g.userData.pivot = pivot;
      return g;
    },
    lampPost({ glow = '#ffcf85', h = 4.5 } = {}) {
      const g = G.group(), m = mat('#22242a', { metal: 0.5, rough: 0.5 });
      g.add(G.cyl(0.05, 0.09, h, m, [0, h / 2, 0], 7), G.ball(0.19, mat(glow, { emit: 4 }), [0, h + 0.05, 0], 10));
      const L = new THREE.PointLight(glow, 40, 14, 1.8); L.position.set(0, h, 0); g.add(L);
      return g;
    },
    desk({ c = '#8b6d4b', w = 1.6 } = {}) {
      const g = G.group(), m = mat(tex.planks(c, '#5d452e'), { rough: 0.6 });
      g.add(G.box(w, 0.06, 0.8, m, [0, 0.74, 0]));
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(G.box(0.06, 0.74, 0.06, mat('#3a3a3e'), [x * (w / 2 - 0.08), 0.37, z * 0.32]));
      return g;
    },
    chair({ c = '#2a3442' } = {}) {
      const g = G.group(), m = mat(c), f = mat('#26262a', { metal: 0.6, rough: 0.4 });
      g.add(G.box(0.5, 0.08, 0.5, m, [0, 0.5, 0]), G.box(0.5, 0.55, 0.08, m, [0, 0.82, -0.22]), G.cyl(0.03, 0.03, 0.45, f, [0, 0.27, 0], 6), G.cyl(0.3, 0.3, 0.03, f, [0, 0.06, 0], 8));
      return g;
    },
    monitor({ screen = '#7fb6d6', text = null, emit = 1.4 } = {}) {
      const g = G.group();
      const face = text ? tex.label(text, { w: 128, h: 96, bg: screen, fg: '#10222c', font: 'bold 16px monospace' }) : screen;
      g.add(G.box(0.56, 0.42, 0.05, mat('#26272b'), [0, 0.3, 0]), G.plane(0.5, 0.36, mat(face, { emit, emitColor: text ? '#ffffff' : screen, rough: 0.2 }), [0, 0.3, 0.03]), G.cyl(0.03, 0.03, 0.12, mat('#26272b'), [0, 0.07, 0], 6), G.box(0.24, 0.02, 0.18, mat('#26272b'), [0, 0.01, 0]));
      return g;
    },
    keyboard: () => G.group(null, G.box(0.42, 0.02, 0.14, mat('#c9c6bc'), [0, 0.01, 0])),
    cubicle({ c = '#858a8f', w = 2.2 } = {}) {
      const m = mat(tex.noisy([c, new THREE.Color(c).offsetHSL(0, 0, 0.05).getStyle()], { seed: 40, base: 32 })), g = G.group();
      g.add(G.box(w, 1.5, 0.06, m, [0, 0.75, -w / 2]), G.box(0.06, 1.5, w, m, [-w / 2, 0.75, 0]), G.box(0.06, 1.5, w, m, [w / 2, 0.75, 0]));
      return g;
    },
    shelf({ c = '#5a4632', w = 2, h = 2.2, items = true } = {}) {
      const g = G.group(), m = mat(c);
      for (let i = 0; i < 5; i++) g.add(G.box(w, 0.05, 0.4, m, [0, 0.03 + i * (h / 4), 0]));
      g.add(G.box(0.05, h, 0.4, m, [-w / 2, h / 2, 0]), G.box(0.05, h, 0.4, m, [w / 2, h / 2, 0]));
      if (items) for (let i = 0; i < 4; i++) for (let k = 0; k < 8; k++) if (r() > 0.3) g.add(G.box(0.14, r.range(0.25, 0.42), 0.26, mat(r.pick(['#7a2f2f', '#2f4f7a', '#3f6a3f', '#b08a3f', '#555'])), [-w / 2 + 0.2 + k * 0.22, 0.05 + i * (h / 4) + 0.18, 0]));
      return g;
    },
    crate: ({ s = 1 } = {}) => G.group(null, G.box(s, s, s, mat(tex.planks('#8a6a42', '#4e3a22')), [0, s / 2, 0])),
    barrel: ({ c = '#7a2d22' } = {}) => G.group(null, G.cyl(0.32, 0.32, 0.95, mat(c, { metal: 0.3, rough: 0.5 }), [0, 0.475, 0], 12)),
    bench: ({ c = '#6e5235' } = {}) => {
      const g = G.group(), m = mat(c);
      g.add(G.box(1.8, 0.06, 0.45, m, [0, 0.48, 0]), G.box(1.8, 0.4, 0.05, m, [0, 0.76, -0.2]));
      for (const x of [-0.8, 0.8]) g.add(G.box(0.06, 0.48, 0.45, mat('#2b2b2f'), [x, 0.24, 0]));
      return g;
    },
    bed: ({ sheet = '#b4c2d3' } = {}) => {
      const g = G.group();
      g.add(G.box(1.5, 0.3, 2.1, mat('#6b4a2e'), [0, 0.2, 0]), G.box(1.42, 0.2, 2, mat(sheet), [0, 0.45, 0]), G.box(1, 0.12, 0.45, mat('#ece7da'), [0, 0.62, -0.72]));
      return g;
    },
    sign({ text = 'WELCOME', w = 3, h = 0.8, bg = '#1a5c34', fg = '#f1f1e4', post: hasPost = true, height: y = 3 } = {}) {
      const g = G.group(), t = tex.label(text, { w: 320, h: Math.round(320 * h / w), bg, fg, font: `bold ${Math.round(150 * h / w)}px monospace` });
      g.add(G.box(w + 0.1, h + 0.1, 0.08, mat('#26272b'), [0, y, 0]), G.plane(w, h, mat(t, { emit: 0.25, rough: 0.5 }), [0, y, 0.05]));
      if (hasPost) g.add(G.cyl(0.06, 0.06, y, mat('#26272b'), [0, y / 2, 0], 6));
      return g;
    },
    car({ c = '#b53a2c' } = {}) {
      const g = G.group(), body = mat(c, { rough: 0.3, coat: 0.7 }), glass = mat('#1c2630', { rough: 0.1, metal: 0.5 });
      g.add(G.box(1.75, 0.5, 4.1, body, [0, 0.55, 0]), G.box(1.5, 0.48, 2, glass, [0, 1.02, -0.2]), G.box(1.54, 0.08, 2.05, body, [0, 1.28, -0.2]));
      for (const [x, z] of [[-0.88, 1.35], [0.88, 1.35], [-0.88, -1.35], [0.88, -1.35]]) { const w = G.cyl(0.33, 0.33, 0.22, mat('#17171a'), [x, 0.33, z], 12); w.rotation.z = Math.PI / 2; g.add(w); }
      for (const x of [-0.6, 0.6]) g.add(G.box(0.3, 0.14, 0.04, mat('#ffe9bb', { emit: 2 }), [x, 0.62, 2.06]));
      return g;
    },
    road({ len = 200, w = 7, lines = true } = {}) {
      const t = tex.asphalt(); t.repeat.set(w / 3, len / 3);
      const g = G.group(), m = G.plane(w, len, mat(t, { rough: 0.9 }), [0, 0.02, 0]); m.rotation.x = -Math.PI / 2; g.add(m);
      if (lines) for (let z = -len / 2; z < len / 2; z += 6) { const l = G.plane(0.14, 2.6, mat('#d8d3b8'), [0, 0.03, z]); l.rotation.x = -Math.PI / 2; g.add(l); }
      return g;
    },
    column({ h = 7, c } = {}) {
      const t = tex.rock(c ?? ['#7c6a58', '#a18d76', '#bda98f']), m = mat(t), g = G.group();
      g.add(G.cyl(0.55, 0.65, h, m, [0, h / 2, 0], 9), G.box(1.7, 0.4, 1.7, m, [0, 0.2, 0]), G.box(1.6, 0.4, 1.6, m, [0, h + 0.2, 0]));
      return g;
    },
    pylon({ h = 22 } = {}) {
      const m = mat('#50545a', { metal: 0.7, rough: 0.45 }), g = G.group();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, b = G.cyl(0.08, 0.16, h, m, [Math.cos(a) * 1.3, h / 2, Math.sin(a) * 1.3], 5); b.rotation.set(Math.sin(a) * -0.06, 0, Math.cos(a) * 0.06); g.add(b); }
      for (const y of [h * 0.6, h * 0.8, h * 0.97]) g.add(G.box(8 - y / h * 3, 0.14, 0.14, m, [0, y, 0]));
      return g;
    },
    lantern({ glow = '#ffb656', s = 1 } = {}) {
      const g = G.group();
      g.add(G.lathe([[0.02, 0], [0.45, 0.1], [0.62, 0.65], [0.5, 1.05], [0.08, 1.2]].map(([x, y]) => [x * s, y * s]), mat(glow, { emit: 2.8, rough: 0.5, side: true }), null, 14));
      const L = new THREE.PointLight(glow, 9 * s, 12); L.position.y = 0.6 * s; g.add(L);
      return g;
    },
    rib: ({ r: rad = 8, c = '#e0d7c2' } = {}) => {
      const m = mesh(new THREE.TorusGeometry(rad, rad * 0.05, 8, 24, Math.PI), mat(c));
      return G.group(null, m);
    },
    boat: ({ c = '#7d4b2a' } = {}) => {
      const g = G.group(), m = mat(tex.planks(c, '#3f2715'));
      const s = G.ball(1, m, [0, 0.4, 0], 12); s.scale.set(0.9, 0.5, 2.4); g.add(s, G.box(1.6, 0.05, 4, mat('#4e351f'), [0, 0.68, 0]));
      return g;
    },
    tank: ({ c = '#6f7d86', h = 7 } = {}) => {
      const g = G.group(), m = mat(c, { metal: 0.6, rough: 0.4 });
      g.add(G.cyl(2.2, 2.2, h, m, [0, h / 2, 0], 16), G.lathe([[2.2, 0], [1.6, 0.8], [0.2, 1.2]], m, [0, h, 0], 16));
      return g;
    },
    pipe({ len = 20, rad = 0.4, c = '#7c5238' } = {}) {
      const p = G.cyl(rad, rad, len, mat(c, { metal: 0.6, rough: 0.5 }), null, 12); p.rotation.x = Math.PI / 2;
      return G.group(null, p);
    },
  };

  // ---- a character with joints. Hidden small or from behind most of the time, like the references.
  function person({ skin = '#e0a982', hair = '#3a2416', hairStyle = 'short', jacket = '#2e5f83', shirt = '#cfc8b2', pants = '#39424e', shoes = '#22201e', pack = null, hat = null, chibi = false, vest = null } = {}) {
    const headR = chibi ? 0.2 : 0.125;
    const limb = (rt, rb, l, m) => {
      const pts = [[0.0001, 0.0]];
      for (let i = 0; i <= 8; i++) { const t = i / 8, a = t * Math.PI / 2; pts.push([rt * Math.sin(a), rt - rt * Math.cos(a)]); }
      for (let i = 1; i <= 4; i++) { const t = i / 4; pts.push([lerp(rt, rb, t), rt + (l - rt - rb) * t]); }
      for (let i = 1; i <= 6; i++) { const a = i / 6 * Math.PI / 2; pts.push([rb * Math.cos(a), l - rb + rb * Math.sin(a)]); }
      const k = G.lathe(pts, m, null, 10);
      k.rotation.x = Math.PI;
      return k;
    };
    const mj = mat(jacket, { rough: 0.8 }), mp = mat(pants, { rough: 0.85 }), ms = mat(skin, { rough: 0.6 }), mh = mat(hair, { rough: 0.7 });
    const root = G.group(), hips = G.group([0, 0.92, 0]), spine = G.group([0, 0.04, 0]);
    root.add(hips); hips.add(spine);
    const torso = G.lathe([[0.0001, -0.11], [0.15, -0.1], [0.158, 0.0], [0.16, 0.1], [0.19, 0.33], [0.195, 0.42], [0.12, 0.5], [0.05, 0.53], [0.0001, 0.53]], mj, null, 18);
    torso.scale.z = 0.72; spine.add(torso);
    const pelvis = G.ball(0.165, mp, [0, -0.02, 0], 12);
    pelvis.scale.set(1, 0.7, 0.75);
    hips.add(pelvis);
    const neck = G.group([0, 0.53, 0]);
    spine.add(neck);
    neck.add(G.cyl(0.05, 0.055, 0.09, ms, [0, 0.03, 0], 8));
    const head = G.group([0, 0.07, 0]);
    neck.add(head);
    const faceT = canvasTexture([128, 128], (g, w) => {
      g.fillStyle = skin; g.fillRect(0, 0, w, w);
      const cx = 32, y = chibi ? 74 : 66; // u = 0.25 is the +z side of a sphere, which is the way the body faces
      for (const s of [-1, 1]) {
        g.fillStyle = '#ffffff'; g.fillRect(cx + s * 14 - (chibi ? 7 : 5), y - (chibi ? 7 : 3), chibi ? 14 : 10, chibi ? 14 : 6);
        g.fillStyle = '#2a2018'; g.fillRect(cx + s * 14 - 3, y - (chibi ? 5 : 3), 6, chibi ? 11 : 6);
        g.fillStyle = hair; g.fillRect(cx + s * 14 - 7, y - (chibi ? 12 : 8), 14, 2);
      }
      g.fillStyle = '#b5705c'; g.fillRect(cx - 7, y + (chibi ? 20 : 16), 14, 2);
    }, { clamp: false });
    head.add(G.ball(headR, mat(faceT, { rough: 0.6 }), [0, headR * 0.85, 0], 16));
    const hairCap = mesh(new THREE.SphereGeometry(headR * 1.05, 16, 10, 0, TAU, 0, Math.PI * 0.6), mh, [0, headR * 0.86, -headR * 0.05]);
    hairCap.rotation.x = -0.5;
    head.add(hairCap);
    if (hairStyle === 'long') head.add(G.box(headR * 1.5, headR * 1.7, headR * 0.5, mh, [0, -headR * 0.05, -headR * 0.7]));
    if (hat === 'hardhat') {
      const c = mat('#e8751f', { rough: 0.35 });
      const dome = mesh(new THREE.SphereGeometry(headR * 1.14, 16, 8, 0, TAU, 0, Math.PI / 2), c, [0, headR * 1.15, 0]);
      head.add(dome, G.cyl(headR * 1.32, headR * 1.32, 0.02, c, [0, headR * 1.15, 0.02], 16));
    }
    if (vest) {
      const v = G.lathe([[0.17, 0.12], [0.2, 0.33], [0.205, 0.42], [0.14, 0.48]], mat(vest, { rough: 0.6, side: true }), [0, 0, 0], 14);
      v.scale.set(1.03, 1, 0.76);
      spine.add(v);
    }
    if (pack) {
      spine.add(G.box(0.3, 0.42, 0.17, mat(pack, { rough: 0.75 }), [0, 0.28, -0.22]), G.box(0.24, 0.16, 0.05, mat(new THREE.Color(pack).multiplyScalar(0.7).getStyle()), [0, 0.2, -0.32]));
    }
    const J = {};
    for (const [side, s] of [['L', 1], ['R', -1]]) {
      const shoulder = G.group([s * 0.22, 0.43, 0]); spine.add(shoulder);
      shoulder.add(limb(0.066, 0.052, 0.32, mj), G.ball(0.07, mj, [0, -0.02, 0], 10));
      const elbow = G.group([0, -0.29, 0]); shoulder.add(elbow);
      elbow.add(limb(0.052, 0.042, 0.3, mj), G.ball(0.052, mj, [0, 0, 0], 8), G.ball(0.045, ms, [0, -0.31, 0], 8));
      const hip = G.group([s * 0.09, -0.03, 0]); hips.add(hip);
      hip.add(limb(0.095, 0.07, 0.46, mp), G.ball(0.1, mp, [0, -0.03, 0], 10));
      const knee = G.group([0, -0.42, 0]); hip.add(knee);
      knee.add(limb(0.07, 0.05, 0.44, mp), G.ball(0.072, mp, [0, 0, 0], 10));
      knee.add(G.box(0.1, 0.075, 0.25, mat(shoes, { rough: 0.7 }), [0, -0.43, 0.06]));
      J[`shoulder${side}`] = shoulder; J[`elbow${side}`] = elbow; J[`hip${side}`] = hip; J[`knee${side}`] = knee;
    }
    Object.assign(J, { hips, spine, neck, head });
    const pose = ({ walk = null, run = false, lookY = 0, lookX = 0, breathe = 0, armL = null, armR = null, crouch = 0 } = {}) => {
      hips.position.y = 0.92 - crouch * 0.25;
      head.rotation.set(lookX, lookY, 0);
      spine.rotation.set(run ? 0.22 : 0.02 + Math.sin(breathe * 1.6) * 0.012, 0, 0);
      J.shoulderL.rotation.set(0, 0, 0.09); J.shoulderR.rotation.set(0, 0, -0.09);
      J.elbowL.rotation.set(-0.2, 0, 0); J.elbowR.rotation.set(-0.2, 0, 0);
      J.hipL.rotation.set(-crouch * 0.7, 0, 0.02); J.hipR.rotation.set(-crouch * 0.7, 0, -0.02);
      J.kneeL.rotation.set(crouch * 1.3, 0, 0); J.kneeR.rotation.set(crouch * 1.3, 0, 0);
      if (walk !== null) {
        const amp = run ? 0.95 : 0.55, s = Math.sin(walk), c = Math.cos(walk);
        J.hipL.rotation.x = s * amp; J.hipR.rotation.x = -s * amp;
        J.kneeL.rotation.x = Math.max(0, -c) * amp * 1.3 + 0.08; J.kneeR.rotation.x = Math.max(0, c) * amp * 1.3 + 0.08;
        J.shoulderL.rotation.x = -s * amp * 0.75; J.shoulderR.rotation.x = s * amp * 0.75;
        J.elbowL.rotation.x = -0.25 - (run ? 0.9 : 0); J.elbowR.rotation.x = -0.25 - (run ? 0.9 : 0);
        hips.position.y += Math.abs(Math.sin(walk)) * 0.025;
      }
      if (armL) { J.shoulderL.rotation.set(...armL.slice(0, 3)); if (armL[3] !== undefined) J.elbowL.rotation.x = armL[3]; }
      if (armR) { J.shoulderR.rotation.set(...armR.slice(0, 3)); if (armR[3] !== undefined) J.elbowR.rotation.x = armR[3]; }
    };
    pose();
    root.userData = { J, pose };
    root.pose = pose;
    return root;
  }

  // ---- planets
  function planet({ radius = 10, map, clouds = null, atmosphere = '#6fb5ff', atmo = 1, spin = 0.12, tilt = 0.32, emit = null, position = [0, 0, 0] } = {}) {
    const g = G.group(position);
    const m = new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
    if (emit) { m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = map; m.emissiveIntensity = emit; }
    const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), m);
    const axis = G.group(); axis.rotation.z = tilt; axis.add(body); g.add(axis);
    let c = null;
    if (clouds) {
      c = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.012, 48, 32), new THREE.MeshStandardMaterial({ map: clouds, alphaMap: null, transparent: true, depthWrite: false, roughness: 1 }));
      axis.add(c);
    }
    if (atmo > 0) {
      const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.09, 48, 32), new THREE.ShaderMaterial({
        transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { c: { value: new THREE.Color(atmosphere) }, a: { value: atmo } },
        vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix*normal); vec4 p = modelViewMatrix*vec4(position,1.); v = normalize(p.xyz); gl_Position = projectionMatrix*p; }',
        fragmentShader: 'uniform vec3 c; uniform float a; varying vec3 n; varying vec3 v; void main(){ float k = pow(clamp(1.0 + dot(n, v) * 0.95, 0.0, 1.0), 3.0) * clamp(dot(-n, v) * 6.0, 0.0, 1.0); gl_FragColor = vec4(c, 1.0) * k * a; }',
      }));
      g.add(halo);
    }
    const start = r() * TAU;
    g.update = (t) => { body.rotation.y = start + t * spin; if (c) c.rotation.y = start + t * spin * 1.25; };
    g.update(0);
    return g;
  }

  // ---- falling, rising or drifting particles
  function particles({ count = 800, area = [30, 20, 30], center = [0, 8, 0], velocity = [0, -6, 0], color = '#ffffff', size = 0.08, streak = 0, opacity = 1, additive = false } = {}) {
    const base = new Float32Array(count * 3), R = rng(seed + 3);
    for (let i = 0; i < count; i++) base.set([R() * area[0], R() * area[1], R() * area[2]], i * 3);
    const verts = new Float32Array(count * 6 * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    const normals = new Float32Array(verts.length); // the ambient occlusion pass turns normal-less geometry black
    for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, fog: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    const o = new THREE.Mesh(g, m);
    o.frustumCulled = false;
    scene.add(o);
    const v = new THREE.Vector3(...velocity), up = v.clone().normalize(), side = new THREE.Vector3();
    return (t) => {
      camera.getWorldDirection(side).cross(up).normalize();
      if (side.lengthSq() === 0) side.set(1, 0, 0);
      const wrap = (x, a) => ((x % a) + a) % a;
      const sx = side.x * size, sy = side.y * size, sz = side.z * size, lx = up.x * (size + streak), ly = up.y * (size + streak), lz = up.z * (size + streak);
      for (let i = 0; i < count; i++) {
        const x = center[0] - area[0] / 2 + wrap(base[i * 3] + v.x * t, area[0]), y = center[1] - area[1] / 2 + wrap(base[i * 3 + 1] + v.y * t, area[1]), z = center[2] - area[2] / 2 + wrap(base[i * 3 + 2] + v.z * t, area[2]);
        verts.set([x - sx - lx, y - sy - ly, z - sz - lz, x + sx - lx, y + sy - ly, z + sz - lz, x + sx + lx, y + sy + ly, z + sz + lz, x - sx - lx, y - sy - ly, z - sz - lz, x + sx + lx, y + sy + ly, z + sz + lz, x - sx + lx, y - sy + ly, z - sz + lz], i * 18);
      }
      g.attributes.position.needsUpdate = true;
    };
  }

  // ---- camera moves: small, slow, deliberate
  const cam = {
    set(pos, look, fov) { camera.position.set(...pos); camera.lookAt(...look); if (fov) { camera.fov = fov; camera.updateProjectionMatrix(); } },
    move(p, from, to, fromLook, toLook, ease = true) {
      const k = ease ? smooth(0, 1, p) : p;
      camera.position.set(...from.map((v, i) => lerp(v, to[i], k)));
      camera.lookAt(...fromLook.map((v, i) => lerp(v, toLook[i], k)));
    },
    orbit(p, center, radius, height, a0, a1) {
      const a = lerp(a0, a1, p) * Math.PI / 180;
      camera.position.set(center[0] + Math.sin(a) * radius, center[1] + height, center[2] + Math.cos(a) * radius);
      camera.lookAt(...center);
    },
  };

  return {
    THREE, scene, camera, W, H, shot, seed, r, tex, mat, G, P, LOC, post, cam, person, planet, particles, terrain, tufts, water, setLight, smooth, lerp, shadow,
    add: (...o) => { scene.add(...o); return o[0]; },
    cleanup: () => cleanups.forEach((f) => f()),
  };
}
