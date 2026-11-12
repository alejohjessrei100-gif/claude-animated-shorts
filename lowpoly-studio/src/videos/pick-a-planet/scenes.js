// Scenes for "Pick a Planet". Four worlds, each appealing, each with a late, specific catch:
// 1 endless summer (the sun keeps coming closer), 2 warm ocean (no land, something huge below),
// 3 snow cabin (footprints at the door, bigger each morning), 4 golden desert city (the dunes bury it, and your ship).
const hero = { pack: '#c9573d', jacket: '#2f5f8a', pants: '#39424e', hair: '#2a1a10' };

const WORLD = [ // planet looks for the overview and the cards
  { colors: ['#3f8a3a', '#6aa84a', '#2f6aa0'], atmo: '#9fd8ff' },
  { colors: ['#1d4f8a', '#2a6aa8', '#3a8ac0'], atmo: '#6fb5ff' },
  { colors: ['#e8eef4', '#c8d4e0', '#a8b8c8'], atmo: '#cfe6ff' },
  { colors: ['#d8a650', '#c08a3a', '#e8c070'], atmo: '#ffd08a' },
];
const mkPlanet = (ctx, i, radius, position) => { const w = WORLD[i]; return ctx.add(ctx.planet({ radius, map: ctx.tex.planet(w.colors, { seed: i * 7 + 3, polar: i === 2 ? '#ffffff' : null }), clouds: i < 3 ? ctx.tex.clouds(i + 1) : null, atmosphere: w.atmo, position })); };

// ---- detail helpers
const ring = (r, a, b, cx = 0, cz = 0) => { const ang = r() * 6.28, d = r.range(a, b); return [cx + Math.cos(ang) * d, cz + Math.sin(ang) * d]; };
function scatter(ctx, loc, n, a, b, make, cz = 0) { const { add, r } = ctx; for (let i = 0; i < n; i++) { const [x, z] = ring(r, a, b, 0, cz); const o = add(make(i)); o.position.set(x, loc.height(x, z), z); o.rotation.y = r() * 6.28; } }
function flowers(ctx, loc, n, a, b, cz = 0, cols = ['#f2e14a', '#e85a8a', '#ffffff', '#b07ae8', '#ff8a3a']) {
  const { G, mat, r } = ctx; const ms = cols.map((c) => mat(c, { emit: 0.15 })), stem = mat('#3f7a2a');
  scatter(ctx, loc, n, a, b, () => { const g = G.group(), h = r.range(0.25, 0.5); g.add(G.cyl(0.015, 0.015, h, stem, [0, h / 2, 0], 4), G.ball(r.range(0.06, 0.1), r.pick(ms), [0, h, 0], 6)); return g; }, cz);
}
function clouds(ctx, n, y, spread, cz = -60, c = '#ffffff') {
  const { G, mat, r, add } = ctx, m = mat(c, { rough: 1, emit: 0.25, emitColor: c }), out = [];
  for (let i = 0; i < n; i++) { const g = G.group([r.range(-spread, spread), y + r.range(-6, 6), cz + r.range(-40, 30)]); for (let k = 0; k < 5; k++) g.add(G.ball(r.range(2.5, 5), m, [k * 3 - 6 + r.range(-1, 1), r.range(-0.6, 1.2), r.range(-1.5, 1.5)], 8)); g.scale.y = 0.55; out.push(add(g)); }
  return (t) => out.forEach((g, i) => (g.position.x += 0.004 * (1 + (i % 3))));
}
function birds(ctx, n, center, c = '#2a2a2e') { // little flapping V shapes drifting across
  const { G, mat, r, add } = ctx, m = mat(c), bs = [];
  for (let i = 0; i < n; i++) { const g = G.group(), l = G.box(0.5, 0.04, 0.14, m, [-0.24, 0, 0]), rr = G.box(0.5, 0.04, 0.14, m, [0.24, 0, 0]); g.add(l, rr); g.userData = { l, rr, o: [center[0] + r.range(-10, 10), center[1] + r.range(-2, 3), center[2] + r.range(-6, 6)], ph: r() * 6 }; bs.push(add(g)); }
  return (t) => bs.forEach((g) => { const u = g.userData, f = Math.sin(t * 9 + u.ph) * 0.5; u.l.rotation.z = f; u.rr.rotation.z = -f; g.position.set(u.o[0] + t * 1.6, u.o[1] + Math.sin(t + u.ph) * 0.3, u.o[2]); });
}
function reeds(ctx, n, cx, cz, rad, y = 0) {
  const { G, mat, r, add } = ctx, m = mat('#5a7a2a'), tip = mat('#6a4a2a');
  for (let i = 0; i < n; i++) { const [x, z] = ring(r, rad * 0.8, rad, cx, cz), h = r.range(0.8, 1.6), g = G.group([x, y, z]); g.add(G.cyl(0.02, 0.03, h, m, [0, h / 2, 0], 4)); if (r() > 0.5) g.add(G.cyl(0.05, 0.05, 0.22, tip, [0, h, 0], 6)); g.rotation.z = r.range(-0.15, 0.15); add(g); }
}
function logs(ctx, pos, n = 9) { // stacked firewood
  const { G, mat, add } = ctx, m = mat('#6a4428', { rough: 0.9 }), end = mat('#c8a070'), g = G.group(pos);
  let k = 0; for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row && k < n; i++, k++) { const l = G.cyl(0.16, 0.16, 1.4, m, [(i - (3 - row) / 2) * 0.34, 0.16 + row * 0.29, 0], 7); l.rotation.x = Math.PI / 2; g.add(l, G.cyl(0.13, 0.13, 0.02, end, [(i - (3 - row) / 2) * 0.34, 0.16 + row * 0.29, 0.71], 7).rotateX(Math.PI / 2)); }
  return add(g);
}
function palm(ctx, h = 6) {
  const { G, mat } = ctx, g = G.group(), trunk = mat('#8a6a3a'), leaf = mat('#3f7a2a', { rough: 0.8 });
  for (let i = 0; i < 6; i++) g.add(G.cyl(0.18 - i * 0.015, 0.2 - i * 0.015, h / 6, trunk, [i * 0.08, h / 12 + i * h / 6, 0], 6));
  for (let i = 0; i < 7; i++) { const f = G.box(2.6, 0.05, 0.5, leaf, [0, 0, 0]), a = i / 7 * 6.28, p = G.group([0.48 + Math.cos(a) * 1.1, h, Math.sin(a) * 1.1]); f.rotation.z = -0.45; p.rotation.y = -a; p.add(f); g.add(p); }
  return g;
}
function stall(ctx, cloth = '#c9573d') { // market stall: counter, poles, striped awning, goods
  const { G, mat, r } = ctx, g = G.group(), wood = mat('#7a5a32'), cm = mat(cloth, { rough: 0.9 }), cm2 = mat('#f0e2c0', { rough: 0.9 });
  g.add(G.box(2.4, 0.9, 1, wood, [0, 0.45, 0]));
  for (const x of [-1.15, 1.15]) for (const z of [-0.45, 0.45]) g.add(G.cyl(0.05, 0.05, 2.4, wood, [x, 1.2, z], 5));
  for (let i = 0; i < 6; i++) { const a = G.box(0.42, 0.05, 1.4, i % 2 ? cm : cm2, [-1.05 + i * 0.42, 2.45, 0.1]); a.rotation.x = 0.2; g.add(a); }
  for (let i = 0; i < 6; i++) g.add(G.ball(0.13, mat(r.pick(['#e8a03a', '#c83a2a', '#7ab84a', '#e8d070'])), [-0.9 + i * 0.36, 1.0, 0.1], 6));
  return g;
}
function dome(ctx, rad, c = '#e0b84a') { const { G, mat, THREE } = ctx, g = G.group(); const m = new THREE.Mesh(new THREE.SphereGeometry(rad, 14, 8, 0, 6.28, 0, Math.PI / 2), mat(c, { metal: 0.7, rough: 0.3 })); g.add(G.cyl(rad, rad, rad * 1.2, mat('#d8b878'), [0, rad * 0.6, 0], 14), m); m.position.y = rad * 1.2; g.add(G.cone(0.15, rad * 0.8, mat(c, { metal: 0.8, rough: 0.3 }), [0, rad * 2.5, 0], 6)); return g; }
function banner(ctx, c = '#8a2a3a', h = 3) { const { G, mat } = ctx, g = G.group(); g.add(G.cyl(0.04, 0.04, h + 1, mat('#3a2a1c'), [0, (h + 1) / 2, 0], 5), G.box(0.9, h * 0.55, 0.03, mat(c, { rough: 0.9 }), [0.48, h * 0.7, 0]), G.ball(0.08, mat('#e0b84a', { metal: 0.8 }), [0, h + 1, 0], 6)); return g; }
function snowman(ctx) { const { G, mat } = ctx, w = mat('#f4f7fa'), g = G.group(); g.add(G.ball(0.55, w, [0, 0.5, 0], 10), G.ball(0.4, w, [0, 1.25, 0], 10), G.ball(0.28, w, [0, 1.8, 0], 10), G.cone(0.05, 0.3, mat('#e8742a'), [0, 1.8, 0.4], 6).rotateX(Math.PI / 2)); for (const x of [-0.1, 0.1]) g.add(G.ball(0.035, mat('#111'), [x, 1.88, 0.25], 4)); g.add(G.box(0.95, 0.12, 0.12, mat('#b8322a'), [0, 1.55, 0])); return g; }

function summer(ctx, { light = 'day', extra = {} } = {}) {
  const { LOC, P, add, r, G, mat, water } = ctx;
  const loc = LOC.plains({ light, hilly: 5, extra });
  const lake = () => {};
  for (let i = 0; i < 30; i++) { const a = r() * 6.28, d = r.range(35, 150), x = Math.cos(a) * d, z = Math.sin(a) * d - 40; add(P.tree({ h: r.range(6, 10) })).position.set(x, loc.height(x, z) - 0.2, z); }
  scatter(ctx, loc, 26, 12, 70, () => P.bush({ s: r.range(0.8, 1.6) }), -10);
  scatter(ctx, loc, 14, 10, 60, () => P.rock({ s: r.range(0.4, 1.2) }), -10);
  flowers(ctx, loc, 260, 2, 34, 8);
  const fl = add(P.fence({ len: 14 })); fl.position.set(-9, loc.height(-9, 4), 4); fl.rotation.y = 1.2;
  const cl = clouds(ctx, 7, 38, 90), bd = birds(ctx, 5, [-14, 16, -40]);
  const bf = ctx.particles({ count: 40, area: [16, 2, 16], center: [0, 1.5, 6], velocity: [0.6, 0.2, 0.3], color: '#ffe680', size: 0.06 });
  return { loc, lake: (t) => { lake(t); cl(t); bd(t); bf(t); } };
}

export const scenes = {
  planets(ctx, { ending = false }) {
    const { LOC, cam } = ctx;
    LOC.space(); ctx.post.bloom = 0.35;
    const pos = [[-2.4, 3.0, 0], [2.4, -2.6, 0], [-2.4, -8.2, 0], [2.4, -13.8, 0]];
    const ps = pos.map((p, i) => mkPlanet(ctx, i, 2.3, p));
    const lab = (n, p) => { const t = ctx.tex.label(String(n), { w: 64, h: 64, bg: '#1b1b1b', fg: '#ffd27a', font: 'bold 44px monospace' }); ctx.add(ctx.G.plane(1.2, 1.2, ctx.mat(t, { emit: 0.8 }), [p[0] + (p[0] < 0 ? 3.9 : -3.9), p[1], p[2] + 1])); };
    pos.forEach((p, i) => lab(i + 1, p));
    return (t, p) => { ps.forEach((pl) => pl.update(t)); cam.move(p, [0, -1, ending ? 40 : 44], [0, -1, ending ? 38 : 41], [0, -1, 0], [0, -1, 0]); };
  },

  card(ctx, { n }) {
    const { LOC, cam } = ctx;
    LOC.space(); ctx.post.bloom = 0.3;
    const pl = mkPlanet(ctx, n - 1, 5, [0, -1, 0]);
    return (t, p) => { pl.update(t * 3); cam.set([0, 1, 18], [0, 1.6, 0], 34); };
  },

  // ---- 1: endless summer
  summer_wide(ctx) {
    const { loc, lake } = summer(ctx), { cam } = ctx;
    return (t, p) => { lake(t); cam.move(p, [0, loc.height(0, 30) + 2.2, 30], [0, loc.height(0, 25) + 2.4, 25], [0, 6, -30], [0, 6.6, -30]); };
  },
  summer_walk(ctx) {
    const { loc, lake } = summer(ctx), { cam, add, person } = ctx, you = add(person(hero));
    const ly = Math.max(loc.height(-10, -12), loc.height(10, -12), loc.height(0, -30)) + 0.65;
    add(ctx.G.box(34, 0.06, 26, ctx.mat('#3aa8d8', { rough: 0.08, metal: 0.2, alpha: 0.85 }), [0, ly, -20]));
    for (let i = 0; i < 18; i++) { const x = -17 + i * 2 + ctx.r.range(-0.6, 0.6); ctx.add(ctx.P.rock({ s: ctx.r.range(0.3, 0.7), c: ['#6a6a62', '#8a8a80', '#a8a69a'] })).position.set(x, ly - 0.25, -7 + ctx.r.range(-0.4, 0.4)); }
    reeds(ctx, 40, -14, -8, 3, ly - 0.3); reeds(ctx, 30, 13, -9, 2.5, ly - 0.3);
    return (t, p) => {
      lake(t);
      const z = 26 - t * 1.45; you.position.set(-1.5, loc.height(-1.5, z), z); you.rotation.y = Math.PI; you.pose({ walk: t * 6.2 });
      cam.set([0.2, loc.height(0, z + 9) + 1.4, z + 9], [-1.5, 3.5, z - 12], 40);
    };
  },
  summer_dock(ctx) {
    const { loc } = summer(ctx), { cam, add, P, G, mat, tex } = ctx, lake = ctx.water({ size: 80, y: 0.35, colors: ['#3a9ac8', '#5ab8d8', '#2a7ab0'] });
    const plank = tex.planks('#a8763f', '#7a5230');
    add(G.box(2, 0.2, 9, mat(plank), [3, 0.6, 18]));
    for (const z of [14, 18, 22]) for (const x of [2.1, 3.9]) add(G.cyl(0.12, 0.12, 1.4, mat('#5a3a20'), [x, 0, z], 6));
    const b = add(P.boat({ c: '#c9573d' })); b.position.set(5.2, 0.2, 13.5);
    const pad = mat('#4a8a3a', { rough: 0.7 }), bloom = mat('#f2a0c0', { emit: 0.2 });
    for (let i = 0; i < 16; i++) { const [x, z] = ring(ctx.r, 3, 9, -3, 12); add(G.cyl(0.35, 0.35, 0.03, pad, [x, 0.38, z], 9)); if (i % 3 === 0) add(G.ball(0.1, bloom, [x, 0.45, z], 6)); }
    reeds(ctx, 50, -6, 20, 4, 0); reeds(ctx, 30, 10, 22, 3, 0);
    const lan = add(P.lantern({ glow: '#ffd27a', s: 0.5 })); lan.position.set(3.7, 0.7, 14.2);
    add(G.cyl(0.2, 0.16, 0.35, mat('#5a6a7a', { metal: 0.6 }), [2.4, 0.88, 16.5], 10));
    const rod = add(G.cyl(0.015, 0.025, 3, mat('#3a2a1c'), [2.4, 1.6, 15.4], 4)); rod.rotation.x = -0.9;
    const you = add(ctx.person(hero)); you.position.set(3, 0.7, 20.5); you.rotation.y = Math.PI + 0.5;
    return (t, p) => { lake(t); b.rotation.z = Math.sin(t * 1.4) * 0.03; you.pose({ breathe: t, lookY: -0.3 }); cam.move(p, [-2, 2.6, 28], [-1.4, 2.4, 26], [4, 1.2, 14], [4, 1.2, 14]); };
  },
  summer_sun(ctx) { // the sun hangs in the same place, a little too big
    const { loc, lake } = summer(ctx, { light: 'sunset', extra: { dir: [0, 0.35, -1] } }), { cam, add, G, mat } = ctx;
    add(G.ball(14, mat('#fff0b0', { emit: 3.5, emitColor: '#ffd070' }), [0, 30, -140], 24));
    const you = add(ctx.person(hero)); you.position.set(0, loc.height(0, 6), 6); you.rotation.y = Math.PI;
    return (t, p) => { lake(t); you.pose({ breathe: t, lookX: -0.15 }); cam.move(p, [1, loc.height(0, 14) + 1.5, 14], [0.8, loc.height(0, 13) + 1.5, 13], [0, 14, -60], [0, 15, -60]); };
  },
  summer_close(ctx) { // closer every day: the sun fills the sky, the grass browns
    const { loc, lake } = summer(ctx, { light: 'sunset', extra: { dir: [0, 0.3, -1] } }), { cam, add, G, mat } = ctx;
    const sun = add(G.ball(14, mat('#fff4c0', { emit: 4.5, emitColor: '#ffb050' }), [0, 30, -140], 28));
    ctx.post.bloom = 0.6;
    return (t, p) => { lake(t); sun.scale.setScalar(1 + 2.4 * p); sun.position.y = 30 + 18 * p; cam.set([0, loc.height(0, 18) + 1.6, 18], [0, 18, -60], 46); };
  },

  // ---- 2: warm ocean
  ocean_wide(ctx) {
    const { LOC, cam } = ctx, loc = LOC.sea({ light: 'day', colors: ['#2a8ac0', '#3aa8d8', '#1a6aa0'] });
    const cl = clouds(ctx, 8, 30, 80), bd = birds(ctx, 6, [-8, 9, -24], '#f4f4f0');
    const sp = ctx.particles({ count: 300, area: [30, 0.2, 30], center: [0, 0.4, -6], velocity: [0.3, 0.05, 0], color: '#ffffff', size: 0.04, additive: true, opacity: 0.8 });
    return (t, p) => { loc.update(t); cl(t); bd(t); sp(t); cam.move(p, [0, 3, 14], [0, 2.6, 11], [0, 4, -40], [0, 4.4, -40]); };
  },
  ocean_boat(ctx) {
    const { LOC, cam, add, P, person } = ctx, loc = LOC.sea({ light: 'dusk', colors: ['#1a3a6a', '#24508a', '#122a50'] });
    const b = add(P.boat({ c: '#c9573d' })), you = add(person(hero)); b.add(you); you.position.set(0, 0.25, 0.4); you.rotation.y = Math.PI;
    const lan = P.lantern({ glow: '#ffc070', s: 0.45 }); lan.position.set(0, 0.3, -1.1); b.add(lan);
    for (const s of [-1, 1]) { const o = ctx.G.box(0.08, 0.06, 2.6, ctx.mat('#7a5a32'), [s * 0.75, 0.35, 0.3]); o.rotation.y = s * 0.5; o.rotation.z = s * 0.3; b.add(o); }
    const stars = ctx.particles({ count: 500, area: [120, 30, 10], center: [0, 34, -70], velocity: [0, 0, 0], color: '#fff8e0', size: 0.12, additive: true });
    const tw = ctx.particles({ count: 60, area: [3, 0.1, 3], center: [0, 0.1, 0], velocity: [0.1, 0, 0.05], color: '#ffd08a', size: 0.04, additive: true, opacity: 0.6 });
    return (t, p) => { loc.update(t); stars(t); tw(t); b.position.y = 0.1 * Math.sin(t * 1.3); b.rotation.z = Math.sin(t * 1.1) * 0.05; you.pose({ breathe: t, crouch: 0.6, lookX: -0.45 }); cam.move(p, [2.6, 2.4, 8], [2.2, 2.2, 6.8], [0, 3, -6], [0, 3.6, -6]); };
  },
  ocean_glow(ctx) { // bioluminescent ripples round a trailing hand
    const { LOC, cam, add, P, person, particles } = ctx, loc = LOC.sea({ light: 'night', colors: ['#0a1a3a', '#10284a', '#081428'] });
    ctx.post.bloom = 0.6;
    const b = add(P.boat({ c: '#c9573d' })), you = add(person(hero)); b.add(you); you.position.set(0.3, 0.25, 0); you.rotation.y = -Math.PI / 2;
    const fish = particles({ count: 40, area: [8, 0.6, 8], center: [3, -0.6, 0], velocity: [0.8, 0, 0.4], color: '#4fd0ff', size: 0.09, additive: true, opacity: 0.7 });
    const stars = particles({ count: 400, area: [80, 20, 10], center: [0, 20, -40], velocity: [0, 0, 0], color: '#e8f0ff', size: 0.1, additive: true });
    const lan = P.lantern({ glow: '#ffb060', s: 0.4 }); lan.position.set(-0.6, 0.3, 0.6); b.add(lan);
    const glow = particles({ count: 260, area: [3, 0.1, 3], center: [1.6, 0.05, 0], velocity: [0.15, 0.02, 0.05], color: '#5ff0ff', size: 0.05, additive: true });
    return (t, p) => { loc.update(t); you.pose({ breathe: t, crouch: 0.6, armL: [-0.9, 0, 0.6, 0] }); cam.move(p, [4.6, 2.2, 3.4], [4.0, 2, 3.0], [1.2, 0.4, 0], [1.2, 0.4, 0]); glow(t); fish(t); stars(t); };
  },
  ocean_empty(ctx) {
    const { LOC, cam, add, P } = ctx, loc = LOC.sea({ light: 'overcast', colors: ['#3a5a72', '#4a6a82', '#2a4a62'] });
    const b = add(P.boat({ c: '#c9573d' })), you = ctx.person(hero); b.add(you); you.position.set(0, 0.25, 0.3); you.rotation.y = Math.PI;
    const cl = clouds(ctx, 10, 26, 70, -30, '#c8d0d8'), bd = birds(ctx, 3, [-6, 8, -4], '#e8e8e4');
    const foam = ctx.particles({ count: 400, area: [60, 0.2, 60], center: [0, 0.3, 0], velocity: [0.6, 0, 0.2], color: '#dfe8ee', size: 0.05, opacity: 0.7 });
    return (t, p) => { loc.update(t); cl(t); bd(t); foam(t); you.pose({ breathe: t, crouch: 0.6, lookY: Math.sin(t * 0.7) * 0.7 }); b.position.y = 0.1 * Math.sin(t * 1.3); cam.move(p, [0, 14, 22], [0, 18, 26], [0, 0, 0], [0, 0, 0]); };
  },
  ocean_thing(ctx) { // a vast dark back breaks the surface beside the boat
    const { LOC, cam, add, P, G, mat } = ctx, loc = LOC.sea({ light: 'overcast', colors: ['#2a4a62', '#3a5a72', '#1a3a52'] });
    const b = add(P.boat({ c: '#c9573d' }));
    const back = add(G.ball(9, mat('#0e1418', { rough: 0.35 }), [10, -9, -6], 20)); back.scale.set(2.2, 1, 1);
    const fin = add(G.cone(1.6, 4, mat('#0e1418', { rough: 0.35 }), [10, -2, -6], 4));
    const you = ctx.person(hero); b.add(you); you.position.set(0, 0.25, 0.3); you.rotation.y = Math.PI / 2;
    for (let i = 0; i < 5; i++) back.add(G.ball(0.5, mat('#3a4a52', { rough: 0.6 }), [ctx.r.range(-4, 4), 8.6, ctx.r.range(-3, 3)], 6));
    const spray = ctx.particles({ count: 500, area: [16, 3, 8], center: [10, 0.8, -6], velocity: [0.4, 1.2, 0], color: '#e8f0f4', size: 0.05, opacity: 0.7 });
    const cl = clouds(ctx, 8, 24, 60, -40, '#7a8a96');
    return (t, p) => { loc.update(t); const k = ctx.smooth(0.2, 0.9, p); back.position.y = -9 + 7.4 * k; fin.position.y = -2 + 4.8 * k; b.position.y = 0.15 * Math.sin(t * 2.2); b.rotation.z = Math.sin(t * 1.9) * 0.1; you.pose({ crouch: 0.6, lookY: 0.4 * k }); spray(t); cl(t); cam.set([-6, 3, 13], [4, 1.5, -4], 44); };
  },

  // ---- 3: snow cabin
  snow_cabin(ctx) {
    const { LOC, cam, add, P, r } = ctx, loc = LOC.snow({ light: 'dusk' });
    const h = add(P.house({ wall: '#7a4a2e', roof: '#e8eef4', door: '#3a2a1c', lit: true })); h.position.set(0, loc.height(0, -4), -4);
    logs(ctx, [4.4, loc.height(4.4, -1.6), -1.6]); logs(ctx, [-4.4, loc.height(-4.4, -1.6), -1.6], 6);
    const fn = add(P.fence({ len: 10 })); fn.position.set(-8, loc.height(-8, 3), 3); fn.rotation.y = 1.5;
    const lp = add(P.lampPost({ glow: '#ffcf85', h: 3 })); lp.position.set(2.2, loc.height(2.2, 2), 2);
    const sm = add(snowman(ctx)); sm.position.set(-3.6, loc.height(-3.6, 4), 4); sm.rotation.y = 0.4;
    scatter(ctx, loc, 10, 7, 30, () => P.rock({ s: ctx.r.range(0.4, 1), c: ['#d8e0e8', '#a8b0b8', '#f0f4f8'] }));
    const smoke = ctx.particles({ count: 120, area: [0.6, 5, 0.6], center: [1.9, 7.8, -4], velocity: [0.3, 0.8, 0], color: '#c8ccd4', size: 0.12, opacity: 0.5 });
    const stars = ctx.particles({ count: 300, area: [120, 20, 10], center: [0, 40, -80], velocity: [0, 0, 0], color: '#fff', size: 0.1, additive: true });
    for (let i = 0; i < 30; i++) { const a = r() * 6.28, d = r.range(16, 90), x = Math.cos(a) * d, z = Math.sin(a) * d - 10; add(P.tree({ kind: 'pine', h: r.range(6, 11) })).position.set(x, loc.height(x, z) - 0.2, z); }
    const snow = ctx.particles({ count: 1200, area: [40, 20, 40], center: [0, 8, 4], velocity: [0.4, -1.4, 0], size: 0.03 });
    return (t, p) => { cam.move(p, [2, loc.height(0, 16) + 2, 16], [1.6, loc.height(0, 14) + 2, 14], [0, 3, -4], [0, 3, -4]); snow(t); smoke(t); stars(t); };
  },
  snow_inside(ctx) {
    const { LOC, cam, add, P, G, mat, tex, person } = ctx;
    LOC.room({ w: 6, d: 6, h: 3, lights: 1, floor: tex.planks('#7a5232', '#5a3a22'), wall: tex.planks('#8a5a34', '#6a4426'), lightPower: 4, lightColor: '#ffb070' });
    add(G.box(1.6, 1.4, 0.6, mat(tex.bricks('#7a3a2a', '#3a2a22')), [0, 0.7, -2.7]));
    const fire = add(P.lantern({ glow: '#ff8a3a', s: 0.7 })); fire.position.set(0, 0.25, -2.5);
    const you = add(person(hero)); you.position.set(0.6, 0, -0.4); you.rotation.y = Math.PI + 0.3;
    add(G.cyl(0.07, 0.06, 0.14, mat('#e8e2d2'), [0.2, 0.92, -0.2], 10));
    add(G.box(2.2, 0.1, 0.3, mat('#5a3a22'), [0, 1.45, -2.55]));
    for (let i = 0; i < 5; i++) add(G.box(0.14, 0.24, 0.1, mat(ctx.r.pick(['#c83a2a', '#e8d070', '#3a6a9a', '#7ab84a'])), [-0.8 + i * 0.4, 1.62, -2.55]));
    add(G.box(2.6, 0.02, 1.8, mat('#9a2a2a', { rough: 1 }), [0, 0.01, -0.8])); add(G.box(2.2, 0.025, 1.4, mat('#d8b878', { rough: 1 }), [0, 0.012, -0.8]));
    const ch = add(P.chair({ c: '#6a3a22' })); ch.position.set(0.6, 0, -0.1); ch.rotation.y = Math.PI + 0.3;
    add(G.box(0.6, 0.5, 0.6, mat('#6a4428'), [0.2, 0.25, -0.2])); add(G.box(0.6, 0.06, 0.6, mat('#7a5232'), [0.2, 0.53, -0.2]));
    const sh = add(P.shelf({ c: '#5a3a22', w: 1.4, h: 1.8 })); sh.position.set(2.7, 0, -1.5); sh.rotation.y = -Math.PI / 2;
    const bd = add(P.bed({ sheet: '#a83a3a' })); bd.position.set(-2.1, 0, -1.6);
    add(G.box(1.2, 0.9, 0.04, mat('#1a2a4a', { emit: 0.4, emitColor: '#3a5a8a' }), [-1.2, 1.7, -2.97])); add(G.box(1.3, 0.08, 0.1, mat('#5a3a22'), [-1.2, 1.24, -2.95]));
    logs(ctx, [1.3, 0, -2.6], 6);
    const flk = ctx.particles({ count: 40, area: [0.6, 0.6, 0.3], center: [0, 0.7, -2.45], velocity: [0, 0.6, 0], color: '#ffb050', size: 0.03, additive: true });
    const steam = ctx.particles({ count: 20, area: [0.08, 0.4, 0.08], center: [0.2, 1.2, -0.2], velocity: [0, 0.2, 0], color: '#ffffff', size: 0.02, opacity: 0.4 });
    return (t, p) => { fire.children[0].scale.setScalar(1 + 0.06 * Math.sin(t * 13)); you.pose({ breathe: t, crouch: 0.35, armR: [-0.9, 0, -0.2, -1.4] }); flk(t); steam(t); cam.move(p, [-2.4, 1.7, 2.6], [-2.1, 1.65, 2.2], [0.4, 0.9, -1.2], [0.4, 0.9, -1.2]); };
  },
  snow_window(ctx) {
    const { LOC, cam, add, P } = ctx, loc = LOC.snow({ light: 'night' });
    const h = add(P.house({ wall: '#7a4a2e', roof: '#e8eef4', door: '#3a2a1c', lit: true })); h.position.set(0, loc.height(0, -4), -4);
    logs(ctx, [4.4, loc.height(4.4, -1.6), -1.6]); logs(ctx, [-4.4, loc.height(-4.4, -1.6), -1.6], 6);
    const fn = add(P.fence({ len: 10 })); fn.position.set(-8, loc.height(-8, 3), 3); fn.rotation.y = 1.5;
    const lp = add(P.lampPost({ glow: '#ffcf85', h: 3 })); lp.position.set(2.2, loc.height(2.2, 2), 2);
    const sm = add(snowman(ctx)); sm.position.set(-3.6, loc.height(-3.6, 4), 4); sm.rotation.y = 0.4;
    scatter(ctx, loc, 10, 7, 30, () => P.rock({ s: ctx.r.range(0.4, 1), c: ['#d8e0e8', '#a8b0b8', '#f0f4f8'] }));
    const smoke = ctx.particles({ count: 120, area: [0.6, 5, 0.6], center: [1.9, 7.8, -4], velocity: [0.3, 0.8, 0], color: '#c8ccd4', size: 0.12, opacity: 0.5 });
    for (let i = 0; i < 20; i++) { const [x, z] = ring(ctx.r, 14, 60, 0, -10); add(P.tree({ kind: 'pine', h: ctx.r.range(6, 11) })).position.set(x, loc.height(x, z) - 0.2, z); }
    const snow = ctx.particles({ count: 1800, area: [30, 18, 30], center: [0, 7, 2], velocity: [0.5, -1.6, 0], size: 0.035 });
    return (t, p) => { cam.move(p, [5, loc.height(0, 10) + 1.6, 10], [4.4, loc.height(0, 9) + 1.6, 9], [0, 2.4, -4], [0, 2.4, -4]); snow(t); smoke(t); };
  },
  snow_prints(ctx, big = 1) {
    const { LOC, cam, add, P, G, mat } = ctx, loc = LOC.snow({ light: 'overcast' });
    const h = add(P.house({ wall: '#7a4a2e', roof: '#e8eef4', door: '#3a2a1c' })); h.position.set(0, loc.height(0, -4), -4);
    const M = mat('#8a96a8', { rough: 1 });
    for (let i = 0; i < 16; i++) { const [x, z] = ring(ctx.r, 16, 70, 0, -10); add(P.tree({ kind: 'pine', h: ctx.r.range(6, 11) })).position.set(x, loc.height(x, z) - 0.2, z); }
    logs(ctx, [4.4, loc.height(4.4, -1.6), -1.6]); const lp = add(P.lampPost({ glow: '#ffcf85', h: 3 })); lp.position.set(2.2, loc.height(2.2, 2), 2);
    const fn = add(P.fence({ len: 10 })); fn.position.set(-8, loc.height(-8, 3), 3); fn.rotation.y = 1.5;
    add(G.box(1.6, 0.04, 0.9, mat('#6a4428'), [0, loc.height(0, -1.4) + 0.02, -1.4]));
    const drift = ctx.particles({ count: 300, area: [20, 1, 20], center: [0, 0.5, 8], velocity: [1.5, 0, 0], color: '#ffffff', size: 0.025, opacity: 0.7 });
    for (let i = 0; i < 14; i++) { const z = 1.6 + i * 1.3 * big, x = (i % 2 ? 0.35 : -0.35) * big; add(G.box(0.32 * big, 0.04, 0.62 * big, M, [x, loc.height(x, z) + 0.02, z])); }
    return (t, p) => { drift(t); cam.move(p, [2.6, loc.height(0, 22) + 3, 22], [2.2, loc.height(0, 20) + 2.8, 19.5], [0, 1, 4], [0, 1, 4]); };
  },
  snow_prints_big(ctx) { return scenes.snow_prints(ctx, 2.6); },

  // ---- 4: golden desert city
  desert_city(ctx) {
    const { LOC, cam, add, P } = ctx, loc = LOC.desert({ light: 'day' });
    bazaar(ctx, loc);
    const cl = clouds(ctx, 5, 40, 80, -80, '#fff6e8'), bd = birds(ctx, 4, [-10, 14, -30]);
    const ship = add(spaceship(ctx)); ship.position.set(9, loc.height(9, 10) + 0.8, 10);
    return (t, p) => { cl(t); bd(t); cam.move(p, [0, 6, 24], [0, 7, 20], [0, 4, -30], [0, 4.5, -30]); };
  },
  desert_walk(ctx) {
    const { LOC, cam, add, P, person } = ctx, loc = LOC.desert({ light: 'day' });
    bazaar(ctx, loc, 12);
    const dust = ctx.particles({ count: 200, area: [10, 3, 40], center: [0, 1.5, -20], velocity: [0.3, 0.1, 0], color: '#f0d8a0', size: 0.03, opacity: 0.5 });
    const you = add(person(hero));
    return (t, p) => { const z = 6 - t * 1.45; you.position.set(0, loc.height(0, z), z); you.rotation.y = Math.PI; you.pose({ walk: t * 6.2 }); dust(t); cam.set([0.6, loc.height(0, z + 8) + 1.3, z + 8], [0, 5, z - 14], 42); };
  },
  desert_sunset(ctx) {
    const { LOC, cam, add, P, person } = ctx, loc = LOC.desert({ light: 'sunset', extra: { sky: { horizon: '#ffb25e', top: '#3b2a6b' } } });
    const gold = ['#c89a3a', '#e0b84a', '#a87a2a'];
    for (let i = 0; i < 6; i++) add(P.column({ h: 8 + (i % 3) * 3, c: gold })).position.set(-6 + i * 2.6, loc.height(-6 + i * 2.6, -14), -14);
    for (const [x, z, rr] of [[-10, -22, 3.4], [9, -24, 2.8], [0, -30, 4], [-16, -30, 2.4], [15, -32, 3]]) add(dome(ctx, rr)).position.set(x, loc.height(x, z) - 0.3, z);
    for (const [x, z] of [[-4, -6], [5, -8], [-8, -10], [8, -12]]) add(palm(ctx, 6.5)).position.set(x, loc.height(x, z), z);
    const ls = []; for (let i = 0; i < 6; i++) { const l = add(P.lantern({ glow: '#ffa040', s: 0.6 })); l.position.set(-6 + i * 2.6, 2.6, -13.2); ls.push(l); }
    const bd = birds(ctx, 5, [-10, 12, -30], '#2a1a2a'), cl = clouds(ctx, 5, 28, 70, -90, '#ff9a7a');
    add(ctx.G.ball(8, ctx.mat('#ffd08a', { emit: 3, emitColor: '#ff9040' }), [6, 10, -120], 20));
    const you = add(person(hero)); you.position.set(1, loc.height(1, 4), 4); you.rotation.y = Math.PI;
    return (t, p) => { you.pose({ breathe: t }); bd(t); cl(t); cam.move(p, [2.4, loc.height(0, 12) + 1.4, 12], [2.2, loc.height(0, 11) + 1.4, 11], [0, 5, -30], [0, 5.4, -30]); };
  },
  desert_dunes(ctx) { // sand slides over the columns
    const { LOC, cam, add, P, G, mat, tex } = ctx, loc = LOC.desert({ light: 'overcast' });
    const gold = ['#c89a3a', '#e0b84a', '#a87a2a'];
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) add(P.column({ h: 9, c: gold })).position.set(s * 5, 0, -i * 8);
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) add(dome(ctx, 2.4)).position.set(s * 11, -0.3, -i * 8 - 3);
    for (let i = 0; i < 4; i++) { const st = add(stall(ctx, ['#c9573d', '#2a6a8a', '#7a3a8a', '#3a8a5a'][i])); st.position.set(i % 2 ? 3.2 : -3.2, 0, -i * 8 - 4); st.rotation.y = i % 2 ? -Math.PI / 2 : Math.PI / 2; }
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) add(palm(ctx, 6)).position.set(s * 7.4, 0, -i * 8 - 1);
    const dn2 = add(G.ball(22, mat(tex.sand(), { rough: 1 }), [-44, -17, 4], 20)); dn2.scale.set(1, 0.5, 1.2);
    const dune = add(G.ball(30, mat(tex.sand(), { rough: 1 }), [-40, -26, -18], 24)); dune.scale.set(1, 0.6, 1.4);
    const dust = ctx.particles({ count: 900, area: [50, 6, 50], center: [0, 2, -10], velocity: [6, 0.4, 0], color: '#e0c48a', size: 0.03, streak: 0.12, opacity: 0.6 });
    return (t, p) => { dune.position.x = -40 + 26 * p; dn2.position.x = -44 + 20 * p; cam.set([12, 6, 18], [0, 3, -16], 44); dust(t); };
  },
  desert_gone(ctx) { // by morning: only dunes, the tip of one column, no ship
    const { LOC, cam, add, P } = ctx, loc = LOC.desert({ light: 'day' });
    const tip = add(P.column({ h: 9, c: ['#c89a3a', '#e0b84a', '#a87a2a'] })); tip.position.set(2, loc.height(2, -10) - 8.2, -10);
    const you = add(ctx.person(hero)); you.position.set(-1, loc.height(-1, 4), 4); you.rotation.y = Math.PI;
    const d2 = add(dome(ctx, 2.6)); d2.position.set(-7, loc.height(-7, -16) - 4.6, -16);
    for (const [x, z, rot] of [[5, -6, 0.6], [-4, -3, 2], [8, -14, 1.2]]) { const pt = add(palm(ctx, 6)); pt.position.set(x, loc.height(x, z) - 4.4, z); pt.rotation.z = rot * 0.25; }
    const bn = add(banner(ctx, '#7a3a8a')); bn.position.set(1.5, loc.height(1.5, -2) - 2.6, -2); bn.rotation.z = 0.5;
    for (let i = 0; i < 4; i++) { const pr = add(ctx.G.box(0.28, 0.03, 0.5, ctx.mat('#c8a060'), [0, 0, 0])); const z = 6 - i * 1.1, x = -1 + (i % 2 ? 0.3 : -0.3); pr.position.set(x, loc.height(x, z) + 0.01, z); }
    const dust = ctx.particles({ count: 500, area: [40, 2, 40], center: [0, 0.6, -6], velocity: [3, 0.2, 0], color: '#f0d8a0', size: 0.025, streak: 0.08, opacity: 0.5 });
    return (t, p) => { dust(t); you.pose({ breathe: t, lookY: Math.sin(t * 0.8) * 0.6 }); cam.move(p, [0, loc.height(0, 14) + 2, 14], [0, loc.height(0, 18) + 3, 18], [0, 2, -10], [0, 2, -10]); };
  },
};

function bazaar(ctx, loc, depth = 9) { // a golden street: columns, domes, stalls, palms, banners, lanterns, crates
  const { add, P, r } = ctx, gold = ['#c89a3a', '#e0b84a', '#a87a2a'], cloths = ['#c9573d', '#2a6a8a', '#7a3a8a', '#3a8a5a'];
  for (let i = 0; i < depth; i++) for (const s of [-1, 1]) add(P.column({ h: 8 + (i % 3) * 3, c: gold })).position.set(s * 5, loc.height(s * 5, -i * 8), -i * 8);
  for (let i = 0; i < depth; i++) for (const s of [-1, 1]) { const x = s * r.range(10, 14), z = -i * 8 - 3; add(dome(ctx, r.range(1.8, 3.2), r.pick(['#e0b84a', '#f0d070', '#d8a040']))).position.set(x, loc.height(x, z) - 0.3, z); }
  for (let i = 0; i < depth - 2; i++) { const s = i % 2 ? 1 : -1, z = -i * 8 - 4; const st = add(stall(ctx, cloths[i % 4])); st.position.set(s * 3.2, loc.height(s * 3.2, z), z); st.rotation.y = -s * Math.PI / 2; }
  for (let i = 0; i < depth; i++) for (const s of [-1, 1]) { const x = s * 7.4, z = -i * 8 - 1; add(palm(ctx, r.range(5, 7.5))).position.set(x, loc.height(x, z), z); }
  for (let i = 0; i < depth; i++) for (const s of [-1, 1]) { const x = s * 4.3, z = -i * 8 + 3; add(banner(ctx, cloths[(i + (s > 0)) % 4])).position.set(x, loc.height(x, z), z); }
  for (let i = 0; i < 14; i++) { const x = r.range(-4, 4) * (r() > 0.5 ? 1 : -1), z = -r.range(0, depth * 8); if (Math.abs(x) < 2) continue; add(r() > 0.5 ? P.crate({ s: r.range(0.5, 0.8) }) : P.barrel({ c: '#8a5a2a' })).position.set(x, loc.height(x, z), z); }
  for (let i = 0; i < 6; i++) { const z = -i * 12 - 2, l = add(P.lantern({ glow: '#ffc060', s: 0.6 })); l.position.set(0, 6.5, z); }
  scatter(ctx, loc, 16, 30, 100, () => P.rock({ s: r.range(0.6, 2), c: ['#a87a4a', '#c89a6a', '#8a6a3a'] }), -20);
}

function spaceship(ctx) { // a small landed shuttle: hull, cockpit, fins, legs
  const { G, mat } = ctx, g = G.group(), hull = mat('#d8dce2', { metal: 0.5, rough: 0.35 }), acc = mat('#c9573d');
  const body = G.cyl(1.2, 1.6, 6, hull, [0, 2.2, 0], 12); body.rotation.x = Math.PI / 2; g.add(body);
  const nose = G.cone(1.2, 2.2, hull, [0, 2.2, -4.1], 12); nose.rotation.x = -Math.PI / 2; g.add(nose);
  g.add(G.ball(0.7, mat('#7ac0e8', { rough: 0.1, emit: 0.3 }), [0, 3.1, -2.4], 12));
  for (const s of [-1, 1]) g.add(G.box(2.4, 0.15, 1.6, acc, [s * 1.9, 2.0, 2.2]), G.cyl(0.08, 0.08, 1.6, mat('#555'), [s * 1.1, 0.8, 1.5], 6));
  g.add(G.box(0.15, 1.6, 1.4, acc, [0, 3.6, 2.4]));
  return g;
}
