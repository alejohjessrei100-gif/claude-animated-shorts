// Scenes for "Pick an Elevator". Each scene builds its world once and returns update(t, p).
// Option 1: a garden on a floating island above a sea of cloud (no way down; the clouds rise).
// Option 2: an empty mall at midnight where the escalators only go down, into identical floors.
const hero = { pack: '#3f6fa8', jacket: '#8a3a2e', pants: '#2f3540', hair: '#2a1a10' };

// ---- shared builders
function elevator(ctx, { c = '#b8bcc4', label = '1', lit = '#ffe7a8', open = 0 } = {}) {
  const { G, mat, tex } = ctx, g = G.group();
  const frame = mat('#4a4d55', { metal: 0.6, rough: 0.35 }), door = mat(c, { metal: 0.75, rough: 0.28 });
  g.add(G.box(2.3, 0.18, 0.3, frame, [0, 2.66, 0]), G.box(0.14, 2.75, 0.3, frame, [-1.08, 1.37, 0]), G.box(0.14, 2.75, 0.3, frame, [1.08, 1.37, 0]));
  g.add(G.plane(2.0, 2.56, mat('#fff4d4', { emit: 1.2, emitColor: lit }), [0, 1.28, -0.02])); // the lit car behind the doors
  const L = G.box(1.0, 2.56, 0.06, door, [-0.5, 1.28, 0.05]), R = G.box(1.0, 2.56, 0.06, door, [0.5, 1.28, 0.05]);
  g.add(L, R);
  const t = tex.label(label, { w: 64, h: 64, font: 'bold 44px monospace', bg: '#1b1b1b', fg: '#ffd27a' });
  g.add(G.plane(0.38, 0.38, mat(t, { emit: 0.6 }), [0, 3.05, 0.04]), G.box(0.46, 0.46, 0.04, frame, [0, 3.05, 0.01]));
  g.add(G.box(0.16, 0.36, 0.05, frame, [1.38, 1.25, 0.03]), G.ball(0.05, mat('#ffcf6a', { emit: 1.4 }), [1.38, 1.32, 0.07], 10));
  g.userData.open = (k) => { L.position.x = -0.5 - 0.95 * k; R.position.x = 0.5 + 0.95 * k; };
  g.userData.open(open);
  return g;
}

function sky(ctx, extra = {}) { // garden island on a cloud sea
  const { LOC, add, G, mat, tex, r, P, water } = ctx;
  const loc = LOC.sea({ light: 'day', colors: ['#ffffff', '#eef3f8', '#d8e3ee'], extra: { focus: [0, 0, 0], shadowSpan: 18, ...extra } });
  const grass = tex.grass(['#5aa83c', '#6dbb46', '#4c9433']); grass.repeat.set(4, 4);
  add(G.cyl(9, 7.2, 1.6, mat(grass, { rough: 0.95 }), [0, 0.9, 0], 14));
  add(G.cyl(7.2, 2.5, 4.5, mat(tex.rock(['#7a6a58', '#5e5040', '#8a7a66'])), [0, -2.1, 0], 12));
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3, b = add(P.bush({ s: r.range(0.7, 1.1) })); b.position.set(Math.cos(a) * 7, 1.7, Math.sin(a) * 7); }
  for (const [x, z] of [[-5, -4], [4.5, -5]]) add(P.tree({ h: 4.5 })).position.set(x, 1.7, z);
  const lift = add(elevator(ctx, { c: '#c9a24a', label: '1' })); lift.position.set(0, 1.7, -6.2);
  add(G.box(2.6, 4.2, 1.6, mat('#e8e2d2'), [0, 3.8, -7.1])); // the shaft box the doors sit in
  return { loc, lift, y: 1.7 };
}

function mall(ctx, { lights = 6, d = 40 } = {}) {
  const { LOC, add, G, mat, tex, r } = ctx;
  const room = LOC.room({ w: 18, d, h: 6, lights, floor: tex.tiles('#d9d6cc', '#b8b4a8', 4), wall: tex.wallpaper('#3a3f4c', '#343846'), lightPower: 13 });
  const names = ['SHOES', 'TOYS', 'MUSIC', 'SNACKS', 'BOOKS', 'GIFTS', 'TECH', 'HATS'];
  const cols = ['#c8463a', '#3a7ac8', '#c89a3a', '#5aa84a', '#a84aa0', '#3ab0a8', '#e0703a', '#7a5ac8'];
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, z = -d / 2 + 5 + Math.floor(i / 2) * 8.5;
    const f = ctx.G.group([side * 8.6, 0, z]);
    f.add(G.box(0.3, 4.4, 7, mat('#2a2d36'), [0, 2.2, 0]));
    f.add(G.box(0.06, 2.9, 5.4, mat('#a9d4f0', { emit: 0.55, emitColor: '#ffe8b8', rough: 0.1 }), [-side * 0.18, 1.6, 0])); // lit shop window
    const t = tex.label(names[i], { w: 256, h: 64, bg: cols[i], fg: '#ffffff', font: 'bold 44px monospace' });
    f.add(G.box(2.6, 0.9, 0.08, mat('#1a1a1e'), [-side * 1.5, 4.3, 0]), G.plane(2.4, 0.75, mat(t, { emit: 1.0 }), [-side * 1.5, 4.3, 0.05]));
    add(f);
  }
  for (let i = 0; i < 6; i++) add(G.box(0.5, 0.9, 0.5, mat('#4a8a4a'), [r.range(-3, 3), 0.45, -d / 2 + 4 + i * 6])).scale.set(1, 1, 1); // planters
  return room;
}

function bags(ctx, you) { // three shopping bags held at the sides
  const { G, mat } = ctx, J = you.userData.J, out = [];
  for (const [side, c, dx] of [['L', '#d64545', 0], ['R', '#3a7ac8', 0], ['R', '#f2c230', 0.18]]) {
    const b = G.group(); b.add(G.box(0.28, 0.34, 0.12, mat(c)), G.box(0.2, 0.08, 0.02, mat('#222'), [0, 0.22, 0]));
    b.position.set(dx, -0.62, 0); J[`elbow${side}`]?.add(b); out.push(b);
  }
  return out;
}

export const scenes = {
  lobby(ctx, { ending = false }) {
    const { LOC, add, cam, tex, person } = ctx;
    LOC.room({ w: 9, d: 16, h: 4.6, lights: 2, floor: tex.tiles('#3b3b42', '#29292e', 3), wall: tex.wallpaper('#4a4458', '#423d50'), lightPower: 15 });
    const a = add(elevator(ctx, { c: '#c9a24a', label: '1' })); a.position.set(-1.7, 0, -7.6);
    const b = add(elevator(ctx, { c: '#8a96a6', label: '2', lit: '#bfe0ff' })); b.position.set(1.7, 0, -7.6);
    const you = add(person(hero)); you.position.set(0, 0, -2.4); you.rotation.y = Math.PI;
    return (t, p) => {
      you.pose({ breathe: t, lookY: Math.sin(t * 0.9) * 0.55 });
      const k = ending ? ctx.smooth(0.15, 0.9, p) : 0;
      a.userData.open(k); b.userData.open(k);
      cam.move(p, [0, 1.25, 8.6], [0, 1.25, 7.4], [0, 3.0, -7.6], [0, 2.9, -7.6]);
    };
  },

  card(ctx, { n, c }) {
    const { LOC, add, cam } = ctx;
    LOC.space(); ctx.post.bloom = 0.25;
    const e = add(elevator(ctx, { c, label: String(n), lit: n === 1 ? '#ffe7a8' : '#bfe0ff' })); e.position.set(0, -1.1, 0);
    return (t, p) => { e.rotation.y = -0.55 + p * 1.1; cam.set([0, 0.6, 12], [0, 2.1, 0], 34); };
  },

  garden_wide(ctx) {
    const { loc, lift } = sky(ctx), { cam } = ctx;
    return (t, p) => { loc.update?.(t); lift.userData.open(ctx.smooth(0, 0.6, p)); cam.move(p, [0, 3.2, 24], [0, 3.5, 19], [0, 9, -10], [0, 9.6, -10]); };
  },

  garden_walk(ctx) {
    const { loc } = sky(ctx), { cam, add, person } = ctx, you = add(person(hero));
    return (t, p) => {
      loc.update?.(t);
      const z = -4.5 + t * 1.1; you.position.set(0.4, 1.7, z); you.rotation.y = 0.25; you.pose({ walk: t * 6.2 });
      cam.set([-2.5, 2.6, z + 7.5], [0.5, 4.2, z - 6], 40);
    };
  },

  garden_picnic(ctx) {
    const s = sky(ctx), { cam, add, G, mat, tex } = ctx;
    const check = tex.tiles('#d64545', '#f4f1ea', 4); check.repeat.set(2, 2);
    add(G.box(2.4, 0.02, 1.8, mat(check, { rough: 1 }), [1.5, 1.71, 1.5]));
    for (const x of [0.9, 2.1]) add(G.cyl(0.22, 0.22, 0.03, mat('#f4f4f2'), [x, 1.74, 1.5], 14));
    add(G.box(0.6, 0.4, 0.4, mat(tex.planks('#a8723f', '#7a5230')), [1.5, 1.92, 0.9]));
    add(G.cyl(0.08, 0.08, 0.32, mat('#7a2f3a', { rough: 0.3 }), [1.8, 1.88, 1.9], 8));
    return (t, p) => { s.loc.update?.(t); cam.move(p, [4.6, 3.4, 6.2], [4.0, 3.1, 5.4], [1.5, 1.7, 1.4], [1.5, 1.7, 1.4]); };
  },

  garden_figure(ctx) { // someone stands at the island's far edge, facing away, perfectly still
    const s = sky(ctx, { focus: [0, 0, -2] }), { cam, add, person } = ctx;
    const you = add(person(hero)); you.position.set(2.6, 1.7, 4.2); you.rotation.y = Math.PI + 0.35;
    const them = add(person({ jacket: '#1e1e24', pants: '#141418', shoes: '#0a0a0c', hair: '#0a0a0c', skin: '#b8b4aa' }));
    them.position.set(-1.2, 1.7, -3.5); them.rotation.y = Math.PI;
    return (t, p) => {
      s.loc.update?.(t); you.pose({ breathe: t }); them.pose({ breathe: t * 0.2 });
      cam.move(p, [4.6, 2.7, 10.5], [4.2, 2.7, 9.2], [-1.2, 2.9, -3.5], [-1.2, 2.9, -3.5]);
    };
  },

  panel(ctx) { // inside the car: a brass panel with only up arrows and a rooftop button
    const { LOC, add, cam, G, mat, tex } = ctx;
    LOC.room({ w: 2.2, d: 2.2, h: 2.6, lights: 1, floor: tex.carpet(['#5a2a2a', '#6a3232', '#4a2222']), wall: tex.wallpaper('#c9b48a', '#bba67c'), lightPower: 6 });
    add(G.box(0.7, 1.3, 0.04, mat('#b8933f', { metal: 0.8, rough: 0.3 }), [0.6, 1.35, -1.08]));
    const labels = ['R', '9', '8', '7', '6'];
    labels.forEach((l, i) => { const t = tex.label(l, { w: 64, h: 64, bg: '#2a2418', fg: '#ffe7a8', font: 'bold 40px monospace' }); add(G.plane(0.15, 0.15, mat(t, { emit: i === 0 ? 1.2 : 0.4 }), [0.6, 1.85 - i * 0.2, -1.05])); });
    const up = tex.label('▲', { w: 64, h: 64, bg: '#2a2418', fg: '#9fe08a', font: 'bold 44px monospace' });
    add(G.plane(0.17, 0.17, mat(up, { emit: 1.0 }), [0.6, 0.85, -1.05]));
    add(G.box(0.2, 0.2, 0.02, mat('#3a3428'), [0.6, 0.6, -1.06])); // the empty spot where a down button should be
    return (t, p) => cam.move(p, [0.45, 1.3, 0.25], [0.52, 1.25, -0.1], [0.6, 1.25, -1.08], [0.6, 1.2, -1.08]);
  },

  garden_rise(ctx) { // the cloud sea climbs toward the island under a darkening sky
    const { LOC, add, G, mat, tex, cam } = ctx;
    const loc = LOC.sea({ light: 'sunset', colors: ['#f6e6e0', '#e6cfc8', '#cbb2b0'], extra: { focus: [0, 0, 0], shadowSpan: 18 } });
    const grass = tex.grass(['#4a8a34', '#5a9a3c', '#3e7a2c']); grass.repeat.set(4, 4);
    const isl = G.group(); isl.add(G.cyl(9, 7.2, 1.6, mat(grass), [0, 0.9, 0], 14), G.cyl(7.2, 2.5, 4.5, mat(tex.rock(['#7a6a58', '#5e5040'])), [0, -2.1, 0], 12));
    const lift = elevator(ctx, { c: '#c9a24a', label: '1' }); lift.position.set(0, 1.7, -6.2); isl.add(lift, G.box(2.6, 4.2, 1.6, mat('#e8e2d2'), [0, 3.8, -7.1]));
    add(isl);
    return (t, p) => { loc.update?.(t); isl.position.y = 4 - 4.6 * p; cam.set([14, 5, 22], [0, 2, -2], 42); };
  },

  mall_wide(ctx) {
    mall(ctx); const { cam, add } = ctx;
    const lift = add(elevator(ctx, { c: '#8a96a6', label: '2', lit: '#bfe0ff', open: 1 })); lift.position.set(0, 0, 19.7); lift.rotation.y = Math.PI;
    return (t, p) => cam.move(p, [0, 1.6, 18], [0, 1.6, 15], [0, 2.2, -20], [0, 2.2, -20]);
  },

  mall_free(ctx) {
    mall(ctx); const { cam, add, P } = ctx;
    for (const z of [-9, -6]) add(P.sign({ text: 'FREE', w: 1.6, h: 0.7, bg: '#d62a2a', fg: '#ffffff', height: 1.6 })).position.set(6.6, 0, z);
    add(P.sign({ text: 'TAKE ALL', w: 2.2, h: 0.7, bg: '#2a8a3a', fg: '#ffffff', height: 2.2 })).position.set(-6.6, 0, -2);
    for (const z of [-10, -4]) add(P.shelf({ w: 2.4 })).position.set(5, 0, z);
    return (t, p) => cam.move(p, [-1, 1.8, 6], [-0.6, 1.8, 3.5], [5, 1.6, -9], [5, 1.6, -9]);
  },

  mall_music(ctx) {
    mall(ctx); const { cam, add, person, G, mat } = ctx;
    for (const z of [-6, 0, 6]) add(G.cyl(0.35, 0.35, 0.12, mat('#d8d8d8'), [0, 5.93, z], 14), G.cyl(0.24, 0.24, 0.02, mat('#2a2a2a'), [0, 5.86, z], 14));
    const you = add(person(hero)); you.position.set(0, 0, 3); you.rotation.y = Math.PI;
    return (t, p) => { you.pose({ breathe: t, lookX: -0.55 }); cam.move(p, [0.8, 1.5, 9.5], [0.6, 1.5, 8.6], [0, 3.6, -4], [0, 3.9, -4]); };
  },

  mall_bags(ctx) {
    mall(ctx); const { cam, add, person } = ctx, you = add(person(hero));
    you.position.set(0, 0, 0); you.rotation.y = 0;
    bags(ctx, you);
    return (t, p) => {
      you.pose({ breathe: t, armL: [0.08, 0, -0.18, -0.2], armR: [0.08, 0, 0.18, -0.2], lookY: ctx.smooth(0.55, 0.9, p) * 0.9 });
      cam.move(p, [0.6, 1.4, 5.2], [0.4, 1.4, 4.2], [0, 1.2, 0], [0, 1.25, 0]);
    };
  },

  mall_escalator(ctx) { // two escalators, both going down, from the landing into the floor below
    const { add, G, mat, tex, cam, setLight, P } = ctx;
    setLight('interior');
    const tiles = tex.tiles('#d9d6cc', '#b8b4a8', 4); tiles.repeat.set(4, 4);
    add(G.box(14, 0.4, 10, mat(tiles), [0, -0.2, 7])); add(G.box(14, 0.4, 24, mat(tiles), [0, -6.2, -12]));
    for (const x of [-7, 7]) add(G.box(0.3, 14, 34, mat('#343846'), [x, -1, -5]));
    add(G.box(14, 14, 0.3, mat('#2a2d36'), [0, -1, -22]));
    const steps = [];
    for (const x of [-1.2, 1.2]) {
      for (let i = 0; i < 26; i++) { const st = add(G.box(1.4, 0.3, 0.55, mat('#b8bec8', { metal: 0.4, rough: 0.35 }))); st.userData = { x, i }; steps.push(st); }
    }
    for (let i = 0; i < 4; i++) add(G.box(1.6, 0.05, 0.6, mat('#fff9e6', { emit: 1.25 }), [0, 5.9 - (i > 1 ? 6 : 0), 6 - i * 7]));
    const L1 = new ctx.THREE.PointLight('#fff3d8', 14, 22, 1.4); L1.position.set(0, 4, 4); add(L1);
    for (const [z, y] of [[-4, -1], [-12, -2], [-19, -2]]) { const L2 = new ctx.THREE.PointLight('#ffe0b0', 16, 24, 1.3); L2.position.set(0, y, z); add(L2); }
    add(P.sign({ text: 'DOWN', w: 2.6, h: 0.8, bg: '#1a1a1a', fg: '#ff4a3a', post: false, height: 3.6 })).position.set(0, 0, 2.2);
    return (t, p) => {
      steps.forEach((st) => { const u = ((st.userData.i / 26 + t * 0.1) % 1); st.position.set(st.userData.x, -u * 6 + 0.05, 1.5 - u * 9); });
      cam.move(p, [0, 3.0, 5.4], [0, 2.8, 4.4], [0, -5.5, -9], [0, -6, -9]);
    };
  },

  mall_floors(ctx) { // over the railing: the same floor, again and again, all the way down
    const { add, G, mat, tex, cam, setLight, person, THREE } = ctx;
    setLight('interior');
    const tiles = tex.tiles('#d9d6cc', '#b8b4a8', 4); tiles.repeat.set(3, 10);
    const cols = ['#c8463a', '#3a7ac8', '#c89a3a', '#5aa84a'];
    for (let k = 0; k < 10; k++) {
      const y = -k * 6;
      for (const sx of [-1, 1]) {
        add(G.box(5, 0.4, 30, mat(tiles), [sx * 6.5, y - 0.2, 0]));
        add(G.box(0.08, 1.0, 30, mat('#cfd6de', { metal: 0.5, rough: 0.2 }), [sx * 4.1, y + 0.6, 0]));
        add(G.box(0.3, 5.6, 30, mat('#343846'), [sx * 9.1, y + 2.8, 0]));
        for (let i = 0; i < 3; i++) { add(G.box(0.06, 2.2, 4, mat('#ffe8b8', { emit: 0.9 }), [sx * 8.9, y + 1.6, -10 + i * 10])); add(G.box(0.06, 0.6, 3, mat(cols[(i + k) % 4], { emit: 1.1 }), [sx * 8.9, y + 3.4, -10 + i * 10])); }
      }
      if (k < 5) { const L = new THREE.PointLight('#fff1d0', 9, 16, 1.5); L.position.set(0, y + 4, 0); add(L); }
    }
    const you = add(person(hero)); you.position.set(-5.2, 0, 4); you.rotation.y = Math.PI / 2 + 0.3;
    return (t, p) => { you.pose({ breathe: t, lookX: 0.6 }); cam.move(p, [-2.2, 3.2, 9], [-2.0, 3.0, 7.8], [0.8, -26, -9], [0.8, -29, -9]); };
  },
};
