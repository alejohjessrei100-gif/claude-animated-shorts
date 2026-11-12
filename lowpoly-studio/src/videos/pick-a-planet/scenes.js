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

function summer(ctx, { light = 'day', extra = {} } = {}) {
  const { LOC, P, add, r, G, mat, water } = ctx;
  const loc = LOC.plains({ light, hilly: 5, extra });
  const lake = () => {};
  for (let i = 0; i < 22; i++) { const a = r() * 6.28, d = r.range(45, 150), x = Math.cos(a) * d, z = Math.sin(a) * d - 40; add(P.tree({ h: r.range(6, 10) })).position.set(x, loc.height(x, z) - 0.2, z); }
  return { loc, lake };
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
    return (t, p) => { loc.update(t); cam.move(p, [0, 3, 14], [0, 2.6, 11], [0, 4, -40], [0, 4.4, -40]); };
  },
  ocean_boat(ctx) {
    const { LOC, cam, add, P, person } = ctx, loc = LOC.sea({ light: 'dusk', colors: ['#1a3a6a', '#24508a', '#122a50'] });
    const b = add(P.boat({ c: '#c9573d' })), you = add(person(hero)); b.add(you); you.position.set(0, 0.25, 0.4); you.rotation.y = Math.PI;
    return (t, p) => { loc.update(t); b.position.y = 0.1 * Math.sin(t * 1.3); b.rotation.z = Math.sin(t * 1.1) * 0.05; you.pose({ breathe: t, crouch: 0.6, lookX: -0.45 }); cam.move(p, [2.6, 2.4, 8], [2.2, 2.2, 6.8], [0, 3, -6], [0, 3.6, -6]); };
  },
  ocean_glow(ctx) { // bioluminescent ripples round a trailing hand
    const { LOC, cam, add, P, person, particles } = ctx, loc = LOC.sea({ light: 'night', colors: ['#0a1a3a', '#10284a', '#081428'] });
    ctx.post.bloom = 0.6;
    const b = add(P.boat({ c: '#c9573d' })), you = add(person(hero)); b.add(you); you.position.set(0.3, 0.25, 0); you.rotation.y = -Math.PI / 2;
    const glow = particles({ count: 260, area: [3, 0.1, 3], center: [1.6, 0.05, 0], velocity: [0.15, 0.02, 0.05], color: '#5ff0ff', size: 0.05, additive: true });
    return (t, p) => { loc.update(t); you.pose({ breathe: t, crouch: 0.6, armL: [-0.9, 0, 0.6, 0] }); cam.move(p, [4.6, 2.2, 3.4], [4.0, 2, 3.0], [1.2, 0.4, 0], [1.2, 0.4, 0]); glow(t); };
  },
  ocean_empty(ctx) {
    const { LOC, cam, add, P } = ctx, loc = LOC.sea({ light: 'overcast', colors: ['#3a5a72', '#4a6a82', '#2a4a62'] });
    const b = add(P.boat({ c: '#c9573d' }));
    return (t, p) => { loc.update(t); b.position.y = 0.1 * Math.sin(t * 1.3); cam.move(p, [0, 14, 22], [0, 18, 26], [0, 0, 0], [0, 0, 0]); };
  },
  ocean_thing(ctx) { // a vast dark back breaks the surface beside the boat
    const { LOC, cam, add, P, G, mat } = ctx, loc = LOC.sea({ light: 'overcast', colors: ['#2a4a62', '#3a5a72', '#1a3a52'] });
    const b = add(P.boat({ c: '#c9573d' }));
    const back = add(G.ball(9, mat('#0e1418', { rough: 0.35 }), [10, -9, -6], 20)); back.scale.set(2.2, 1, 1);
    const fin = add(G.cone(1.6, 4, mat('#0e1418', { rough: 0.35 }), [10, -2, -6], 4));
    return (t, p) => { loc.update(t); const k = ctx.smooth(0.2, 0.9, p); back.position.y = -9 + 7.4 * k; fin.position.y = -2 + 4.8 * k; b.position.y = 0.15 * Math.sin(t * 2.2); b.rotation.z = Math.sin(t * 1.9) * 0.1; cam.set([-6, 3, 13], [4, 1.5, -4], 44); };
  },

  // ---- 3: snow cabin
  snow_cabin(ctx) {
    const { LOC, cam, add, P, r } = ctx, loc = LOC.snow({ light: 'dusk' });
    const h = add(P.house({ wall: '#7a4a2e', roof: '#e8eef4', door: '#3a2a1c', lit: true })); h.position.set(0, loc.height(0, -4), -4);
    for (let i = 0; i < 18; i++) { const a = r() * 6.28, d = r.range(16, 90), x = Math.cos(a) * d, z = Math.sin(a) * d - 10; add(P.tree({ kind: 'pine', h: r.range(6, 11) })).position.set(x, loc.height(x, z) - 0.2, z); }
    const snow = ctx.particles({ count: 1200, area: [40, 20, 40], center: [0, 8, 4], velocity: [0.4, -1.4, 0], size: 0.03 });
    return (t, p) => { cam.move(p, [2, loc.height(0, 16) + 2, 16], [1.6, loc.height(0, 14) + 2, 14], [0, 3, -4], [0, 3, -4]); snow(t); };
  },
  snow_inside(ctx) {
    const { LOC, cam, add, P, G, mat, tex, person } = ctx;
    LOC.room({ w: 6, d: 6, h: 3, lights: 1, floor: tex.planks('#7a5232', '#5a3a22'), wall: tex.planks('#8a5a34', '#6a4426'), lightPower: 4, lightColor: '#ffb070' });
    add(G.box(1.6, 1.4, 0.6, mat(tex.bricks('#7a3a2a', '#3a2a22')), [0, 0.7, -2.7]));
    const fire = add(P.lantern({ glow: '#ff8a3a', s: 0.7 })); fire.position.set(0, 0.25, -2.5);
    const you = add(person(hero)); you.position.set(0.6, 0, -0.4); you.rotation.y = Math.PI + 0.3;
    add(G.cyl(0.07, 0.06, 0.14, mat('#e8e2d2'), [0.2, 0.92, -0.2], 10));
    return (t, p) => { fire.children[0].scale.setScalar(1 + 0.06 * Math.sin(t * 13)); you.pose({ breathe: t, crouch: 0.35, armR: [-0.9, 0, -0.2, -1.4] }); cam.move(p, [-2.4, 1.7, 2.6], [-2.1, 1.65, 2.2], [0.4, 0.9, -1.2], [0.4, 0.9, -1.2]); };
  },
  snow_window(ctx) {
    const { LOC, cam, add, P } = ctx, loc = LOC.snow({ light: 'night' });
    const h = add(P.house({ wall: '#7a4a2e', roof: '#e8eef4', door: '#3a2a1c', lit: true })); h.position.set(0, loc.height(0, -4), -4);
    const snow = ctx.particles({ count: 1800, area: [30, 18, 30], center: [0, 7, 2], velocity: [0.5, -1.6, 0], size: 0.035 });
    return (t, p) => { cam.move(p, [5, loc.height(0, 10) + 1.6, 10], [4.4, loc.height(0, 9) + 1.6, 9], [0, 2.4, -4], [0, 2.4, -4]); snow(t); };
  },
  snow_prints(ctx, big = 1) {
    const { LOC, cam, add, P, G, mat } = ctx, loc = LOC.snow({ light: 'overcast' });
    const h = add(P.house({ wall: '#7a4a2e', roof: '#e8eef4', door: '#3a2a1c' })); h.position.set(0, loc.height(0, -4), -4);
    const M = mat('#8a96a8', { rough: 1 });
    for (let i = 0; i < 14; i++) { const z = 1.6 + i * 1.3 * big, x = (i % 2 ? 0.35 : -0.35) * big; add(G.box(0.32 * big, 0.04, 0.62 * big, M, [x, loc.height(x, z) + 0.02, z])); }
    return (t, p) => cam.move(p, [2.6, loc.height(0, 22) + 3, 22], [2.2, loc.height(0, 20) + 2.8, 19.5], [0, 1, 4], [0, 1, 4]);
  },
  snow_prints_big(ctx) { return scenes.snow_prints(ctx, 2.6); },

  // ---- 4: golden desert city
  desert_city(ctx) {
    const { LOC, cam, add, P } = ctx, loc = LOC.desert({ light: 'day' });
    const gold = ['#c89a3a', '#e0b84a', '#a87a2a'];
    for (let i = 0; i < 9; i++) for (const s of [-1, 1]) add(P.column({ h: 8 + (i % 3) * 3, c: gold })).position.set(s * 5, loc.height(s * 5, -i * 8), -i * 8);
    const ship = add(spaceship(ctx)); ship.position.set(9, loc.height(9, 10) + 0.8, 10);
    return (t, p) => cam.move(p, [0, 6, 24], [0, 7, 20], [0, 4, -30], [0, 4.5, -30]);
  },
  desert_walk(ctx) {
    const { LOC, cam, add, P, person } = ctx, loc = LOC.desert({ light: 'day' });
    const gold = ['#c89a3a', '#e0b84a', '#a87a2a'];
    for (let i = 0; i < 9; i++) for (const s of [-1, 1]) add(P.column({ h: 8 + (i % 3) * 3, c: gold })).position.set(s * 5, loc.height(s * 5, -i * 8), -i * 8);
    const you = add(person(hero));
    return (t, p) => { const z = 6 - t * 1.45; you.position.set(0, loc.height(0, z), z); you.rotation.y = Math.PI; you.pose({ walk: t * 6.2 }); cam.set([0.6, loc.height(0, z + 8) + 1.3, z + 8], [0, 5, z - 14], 42); };
  },
  desert_sunset(ctx) {
    const { LOC, cam, add, P, person } = ctx, loc = LOC.desert({ light: 'sunset', extra: { sky: { horizon: '#ffb25e', top: '#3b2a6b' } } });
    const gold = ['#c89a3a', '#e0b84a', '#a87a2a'];
    for (let i = 0; i < 6; i++) add(P.column({ h: 8 + (i % 3) * 3, c: gold })).position.set(-6 + i * 2.6, loc.height(-6 + i * 2.6, -14), -14);
    const you = add(person(hero)); you.position.set(1, loc.height(1, 4), 4); you.rotation.y = Math.PI;
    return (t, p) => { you.pose({ breathe: t }); cam.move(p, [2.4, loc.height(0, 12) + 1.4, 12], [2.2, loc.height(0, 11) + 1.4, 11], [0, 5, -30], [0, 5.4, -30]); };
  },
  desert_dunes(ctx) { // sand slides over the columns
    const { LOC, cam, add, P, G, mat, tex } = ctx, loc = LOC.desert({ light: 'overcast' });
    const gold = ['#c89a3a', '#e0b84a', '#a87a2a'];
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) add(P.column({ h: 9, c: gold })).position.set(s * 5, 0, -i * 8);
    const dune = add(G.ball(30, mat(tex.sand(), { rough: 1 }), [-40, -26, -18], 24)); dune.scale.set(1, 0.6, 1.4);
    const dust = ctx.particles({ count: 900, area: [50, 6, 50], center: [0, 2, -10], velocity: [6, 0.4, 0], color: '#e0c48a', size: 0.03, streak: 0.12, opacity: 0.6 });
    return (t, p) => { dune.position.x = -40 + 26 * p; cam.set([12, 6, 18], [0, 3, -16], 44); dust(t); };
  },
  desert_gone(ctx) { // by morning: only dunes, the tip of one column, no ship
    const { LOC, cam, add, P } = ctx, loc = LOC.desert({ light: 'day' });
    const tip = add(P.column({ h: 9, c: ['#c89a3a', '#e0b84a', '#a87a2a'] })); tip.position.set(2, loc.height(2, -10) - 8.2, -10);
    const you = add(ctx.person(hero)); you.position.set(-1, loc.height(-1, 4), 4); you.rotation.y = Math.PI;
    return (t, p) => { you.pose({ breathe: t, lookY: Math.sin(t * 0.8) * 0.6 }); cam.move(p, [0, loc.height(0, 14) + 2, 14], [0, loc.height(0, 18) + 3, 18], [0, 2, -10], [0, 2, -10]); };
  },
};

function spaceship(ctx) { // a small landed shuttle: hull, cockpit, fins, legs
  const { G, mat } = ctx, g = G.group(), hull = mat('#d8dce2', { metal: 0.5, rough: 0.35 }), acc = mat('#c9573d');
  const body = G.cyl(1.2, 1.6, 6, hull, [0, 2.2, 0], 12); body.rotation.x = Math.PI / 2; g.add(body);
  const nose = G.cone(1.2, 2.2, hull, [0, 2.2, -4.1], 12); nose.rotation.x = -Math.PI / 2; g.add(nose);
  g.add(G.ball(0.7, mat('#7ac0e8', { rough: 0.1, emit: 0.3 }), [0, 3.1, -2.4], 12));
  for (const s of [-1, 1]) g.add(G.box(2.4, 0.15, 1.6, acc, [s * 1.9, 2.0, 2.2]), G.cyl(0.08, 0.08, 1.6, mat('#555'), [s * 1.1, 0.8, 1.5], 6));
  g.add(G.box(0.15, 1.6, 1.4, acc, [0, 3.6, 2.4]));
  return g;
}
