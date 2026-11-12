// Scenes for "Pick a Door". Each scene builds its world once and returns update(t, p).
const hero = { pack: '#b0542e', jacket: '#2e5f83', pants: '#39424e', hair: '#3a2416' };

function meadow(ctx, extra = {}) {
  const { LOC, P, add, r } = ctx;
  const loc = LOC.plains({ light: 'day', hilly: 7, ...extra });
  for (let i = 0; i < 26; i++) {
    const a = r() * 6.28, d = r.range(60, 170), x = Math.cos(a) * d, z = Math.sin(a) * d;
    const t = add(P.tree({ h: r.range(6, 11) })); t.position.set(x, loc.height(x, z) - 0.2, z);
  }
  return loc;
}

function meadowHouse(ctx, loc, x, z) {
  const h = ctx.add(ctx.P.house({ wall: '#ddd5bd', roof: '#4d3226', door: '#101010' }));
  h.position.set(x, loc.height(x, z) - 0.05, z);
  return h;
}

function office(ctx, { d = 44, lights = 7, chairs = true } = {}) {
  const { LOC, P, add, tex } = ctx;
  const room = LOC.room({ w: 16, d, h: 3, lights, floor: tex.carpet(['#4d5560', '#5d6672', '#6d7784']), wall: tex.wallpaper('#a8a07a', '#9a926c') });
  for (let z = -d / 2 + 4; z < d / 2 - 3; z += 4) {
    for (const x of [-5, 5]) {
      add(P.cubicle({ w: 3 })).position.set(x, 0, z);
      const desk = add(P.desk({ w: 1.5 })); desk.position.set(x, 0, z - 0.5);
      const m = add(P.monitor({ screen: '#8dbfd9', emit: 1.2 })); m.position.set(x, 0.77, z - 0.6);
      if (chairs) add(P.chair()).position.set(x, 0, z + 0.3);
    }
  }
  return room;
}

export const scenes = {
  doors(ctx, { ending = false }) {
    const { LOC, P, add, cam, tex, G, mat } = ctx;
    LOC.room({ w: 8, d: 16, h: 4.6, lights: 2, floor: tex.tiles('#3b3b42', '#29292e', 3), wall: tex.wallpaper('#3d4254', '#373c4d'), lightPower: 15 });
    const a = add(P.door({ c: '#2d6b38', label: '1', glow: '#a9e089' })); a.position.set(-1.45, 0, -7.5);
    const b = add(P.door({ c: '#a58a3f', label: '2', glow: '#f0e2a3' })); b.position.set(1.45, 0, -7.5);
    const you = add(ctx.person(hero)); you.position.set(0, 0, -2.4); you.rotation.y = Math.PI;
    add(G.box(0.02, 0.01, 0.02, mat('#000'), [0, 0, 0]));
    return (t, p) => {
      you.pose({ breathe: t, lookY: Math.sin(t * 0.9) * 0.55 });
      const open = ending ? ctx.smooth(0.2, 1, p) * 0.5 : 0;
      a.userData.pivot.rotation.y = -open; b.userData.pivot.rotation.y = open;
      cam.move(p, [0, 1.1, 6.6], [0, 1.1, 5.4], [0, 3.1, -7.5], [0, 3.0, -7.5]);
    };
  },

  card(ctx, { n, bg }) {
    const { LOC, P, add, cam, r } = ctx;
    LOC.space();
    ctx.post.bloom = 0.25;
    const pl = add(P.door({ c: bg, label: String(n), glow: '#fff2c0' }));
    pl.position.set(0, -1.1, 0);
    return (t, p) => {
      pl.rotation.y = -0.55 + p * 1.1;
      cam.set([0, 0.6, 12], [0, 2.1, 0], 34);
    };
  },

  meadow_wide(ctx) {
    const loc = meadow(ctx), { cam } = ctx;
    return (t, p) => cam.move(p, [0, loc.height(0, 22) + 2, 22], [0, loc.height(0, 22) + 2.6, 15], [0, 7, -30], [0, 8, -30]);
  },

  meadow_walker(ctx) {
    const loc = meadow(ctx), { cam, add, person } = ctx, you = add(person(hero));
    return (t, p) => {
      const z = -t * 1.45;
      you.position.set(0, loc.height(0, z), z); you.rotation.y = Math.PI;
      you.pose({ walk: t * 6.2 });
      cam.set([0.9, loc.height(0, z + 9) + 1.2, z + 9], [0, loc.height(0, z) + 5.5, z - 10], 40);
    };
  },

  meadow_house(ctx) {
    const loc = meadow(ctx), { cam, add, person } = ctx;
    meadowHouse(ctx, loc, 3, -38);
    const you = add(person(hero)); you.position.set(-0.8, loc.height(-0.8, 8), 8); you.rotation.y = Math.PI;
    return (t, p) => {
      you.pose({ breathe: t, lookY: 0.1 });
      cam.move(p, [-2.2, loc.height(0, 18) + 1.5, 18], [-2.1, loc.height(0, 16) + 1.6, 16], [1, 11, -38], [1, 11.4, -38]);
    };
  },

  meadow_door(ctx) {
    const loc = meadow(ctx, { light: 'overcast', colors: ['#3d5a28', '#587a33', '#79953f'] }), { cam, G, mat, add } = ctx;
    const h = meadowHouse(ctx, loc, 0, -2);
    add(G.plane(0.92, 1.98, mat('#000', { rough: 1 }), [0, loc.height(0, -2) + 1, 0.3]));
    h.position.y = loc.height(0, -2);
    return (t, p) => cam.move(p, [0.6, loc.height(0, 16) + 1.4, 17], [0.3, loc.height(0, 14) + 1.4, 13.5], [0, 6.2, -2], [0, 5.6, -2]);
  },

  meadow_figure(ctx) {
    const loc = meadow(ctx, { light: 'overcast', colors: ['#3d5a28', '#587a33', '#79953f'] }), { cam, G, mat, add, person } = ctx;
    const h = meadowHouse(ctx, loc, 0, -2), y = loc.height(0, -2);
    h.position.y = y;
    add(G.plane(0.92, 1.98, mat('#000', { rough: 1 }), [0, y + 1, 0.3]));
    const stranger = add(person({ jacket: '#141418', pants: '#0d0d10', shoes: '#050505', hair: '#050505', skin: '#a6a39a' }));
    stranger.position.set(0, y, 0.36);
    return (t, p) => {
      stranger.pose({ breathe: t * 0.3, lookX: 0.1 });
      cam.move(p, [0, y + 1.3, 7.2], [0, y + 1.35, 5.2], [0, y + 2.7, 0], [0, y + 2.3, 0]);
    };
  },

  office_wide(ctx) {
    office(ctx); const { cam } = ctx;
    return (t, p) => cam.move(p, [0, 1.65, 20], [0, 1.65, 17], [0, 1.55, -22], [0, 1.55, -22]);
  },

  office_desk(ctx) {
    office(ctx, { chairs: false }); const { cam, add, P, G, mat, tex } = ctx;
    const nameplate = add(G.box(0.34, 0.08, 0.05, mat(tex.label('YOU', { w: 128, h: 32, bg: '#20262c', fg: '#e8d8a0', font: 'bold 24px monospace' })), [4.98, 0.81, 2.08]));
    const cup = add(P.barrel({ c: '#e8e4d8' })); cup.scale.setScalar(0.13); cup.position.set(4.62, 0.77, 1.85);
    const steam = ctx.particles({ count: 26, area: [0.07, 0.42, 0.07], center: [4.62, 1.14, 1.85], velocity: [0.01, 0.16, 0], size: 0.0035, streak: 0.014, color: '#eeeeee', opacity: 0.16 });
    return (t, p) => {
      cam.move(p, [4.25, 1.42, 3.9], [4.45, 1.34, 3.5], [5.0, 1.05, 1.4], [5.0, 1.02, 1.4]);
      steam(t);
    };
  },

  office_hall(ctx) {
    office(ctx, { d: 90, lights: 12 }); const { cam, add, person } = ctx, you = add(person(hero));
    return (t, p) => {
      const z = 30 - t * 1.6;
      you.position.set(0, 0, z); you.rotation.y = Math.PI; you.pose({ walk: t * 6.2 });
      cam.set([0.3, 1.25, z + 7.2], [0, 2.1, z - 20], 40);
    };
  },

  office_lights(ctx) {
    const room = office(ctx, { d: 60, lights: 9 }), { cam, add, person, smooth } = ctx, you = add(person(hero));
    you.position.set(0, 0, 8); you.rotation.y = 0;
    return (t, p) => {
      room.lights.forEach(({ light, glow }, i) => {
        const on = 1 - smooth(0, 0.04, p - (0.28 + (i / room.lights.length) * 0.7));
        light.intensity = 11 * on; glow.emissiveIntensity = 1.25 * on;
      });
      you.pose({ breathe: t, lookY: Math.sin(t * 1.3) * 0.18 });
      cam.move(p, [0, 1.3, 1.2], [0, 1.3, 2.2], [0, 2.1, 28], [0, 2.1, 28]);
    };
  },
};
