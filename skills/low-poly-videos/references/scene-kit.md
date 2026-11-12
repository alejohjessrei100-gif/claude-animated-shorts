# Scene kit

Source: `src/three/kit.js`. If something below is unclear, read it; it is one file. New reusable props belong there.

```js
export const scenes = {
  meadow(ctx, params) {
    const { LOC, P, add, cam, person } = ctx;
    const loc = LOC.plains({ light: 'day' });
    const you = add(person({ pack: '#b0542e' }));
    return (t, p) => {
      you.pose({ walk: t * 6 });
      you.position.z = -t * 1.45;
      cam.set([0, 1.2, you.position.z + 9], [0, 5, you.position.z - 10], 40);
    };
  },
};
```

World units are metres. +Y is up. A character faces +Z; set `rotation.y = Math.PI` to walk away from a camera on the +Z side.

## Context

| Name | Purpose |
|---|---|
| `add(obj, ...)` | Add to the scene, returns the first object. |
| `r` | Seeded random: `r()`, `r.range(a, b)`, `r.pick(list)`. |
| `smooth(a, b, x)`, `lerp(a, b, t)` | Easing and interpolation. |
| `post` | `{ bloom, bloomThreshold, ao, aoRadius }`. Set while building, not in `update`. `ao: 0` turns ambient occlusion off. |
| `scene`, `camera`, `THREE` | Direct access. |

## Camera: `cam`

- `cam.set(pos, look, fov?)`
- `cam.move(p, fromPos, toPos, fromLook, toLook, ease = true)`
- `cam.orbit(p, center, radius, height, angle0, angle1)` with angles in degrees

## Locations: `LOC`

Each creates its ground and lighting, and returns `{ height(x, z), update? }`. Call `update(t)` every frame when present.

- `LOC.plains({ light, hilly, colors, tuftColors, extra })`
- `LOC.desert({ light, extra })`
- `LOC.snow({ light, extra })`
- `LOC.wasteland({ light, colors, extra })`
- `LOC.sea({ light, colors, extra })`
- `LOC.space({ extra })`
- `LOC.room({ w, d, h, floor, wall, ceil, lights, lightColor, lightPower, y })` returns `{ lights: [{ light, glow }], height }`. The room is centred on the origin. Animate `light.intensity` and `glow.emissiveIntensity` for flicker or blackout.

`extra` passes through to `setLight`: `{ sky: {...}, dir, focus, shadowSpan, env }`. `focus` and `shadowSpan` centre and size the shadow area, so set them when the action is far from the origin.

Or build from the parts directly: `setLight(preset, opts)` with presets `day`, `overcast`, `sunset`, `dusk`, `night`, `interior`, `space`; `terrain({ size, seg, height, texture, repeat, tint })`; `tufts({ count, spread, height, colors, len, avoid, center })`; `water({ size, y, colors, repeat, rough })`, which returns an `update(t)`; `heightNoise` is exported from the module for custom terrain.

## Props: `P`

All are `Group`s standing on y = 0, not yet added. Place with `add(P.tree()).position.set(x, y, z)`.

Nature: `tree({kind:'oak'|'pine', h, leaf})`, `bush({s, leaf})`, `rock({s, c})`

Buildings and street: `house({wall, roof, w, d, h, door, lit})`, `fence({len, c})`, `door({c, frame, glow, label})` (swing it with `userData.pivot.rotation.y`), `lampPost({glow, h})`, `road({len, w, lines})`, `sign({text, w, h, bg, fg, post, height})`, `car({c})`, `bench({c})`, `pylon({h})`, `column({h, c})`, `tank({c, h})`, `pipe({len, rad, c})`

Interior: `desk({c, w})`, `chair({c})`, `monitor({screen, text, emit})`, `keyboard()`, `cubicle({c, w})`, `shelf({c, w, h, items})`, `bed({sheet})`

Objects: `crate({s})`, `barrel({c})`, `lantern({glow, s})`, `boat({c})`, `rib({r, c})`

Anything else is built from `G`:

- `G.box(w, h, d, material, pos)`, `G.cyl(rTop, rBottom, h, material, pos, seg)`, `G.ball(r, material, pos, seg)`, `G.cone(r, h, material, pos, seg)`, `G.plane(w, h, material, pos)`
- `G.lathe([[radius, y], ...], material, pos, seg)`, `G.extrude([[x, y], ...], depth, material, pos)`, `G.group(pos, ...children)`

## Materials: `mat(colorOrTexture, opts)`

`opts`: `rough`, `metal`, `emit` (glow strength), `emitColor`, `coat` (clearcoat), `alpha`, `side: true` (two sided), `tint`, `repeat`.

## Textures: `tex`

`grass`, `dirt`, `rock`, `sand`, `snow`, `asphalt`, `concrete`, `metal`, `carpet`, `water`, `bark`, `leaves` take an optional colour list. Also `bricks(brick, mortar)`, `planks(a, b)`, `tiles(a, line, n)`, `ceiling()`, `wallpaper(a, b)`, `noisy(colors, {seed, base, size, contrast})`, `label(text, {w, h, bg, fg, font})`.

Planet surfaces: `planet(colors, {seed, polar, cracks})`, `gas(colors, {seed})`, `clouds(seed)`.

Set texture tiling through `texture.repeat.set(x, y)` before use.

## Characters: `person(opts)`

`{ skin, hair, hairStyle:'short'|'long', jacket, shirt, pants, shoes, pack, hat:'hardhat', chibi, vest }`

`character.pose({ walk, run, lookY, lookX, breathe, armL, armR, crouch })`

- `walk` is a phase, usually `t * 6.2`. Move position at about 1.45 m/s to match, or 4 m/s with `run: true` and `walk: t * 11`.
- `armL` and `armR` are `[rotX, rotY, rotZ, elbowX?]`. Raising forward is a negative `rotX`.
- Call `pose` every frame; it resets anything left unset.

`character.userData.J` exposes joints (`head`, `spine`, `hips`, `shoulderL`, `elbowL`, `hipL`, `kneeL` and the `R` versions) for custom animation after `pose`.

## Planets: `planet(opts)`

`{ radius, map, clouds, atmosphere, atmo, spin, tilt, emit, position }`. Call `planet.update(t)` every frame.

```js
const earthlike = add(planet({ radius: 10, map: tex.planet(['#123a66', '#2a7a44', '#c9b27c'], { polar: '#ffffff' }), clouds: tex.clouds(1) }));
```

## Particles: `particles(opts)`

`{ count, area: [x,y,z], center, velocity: [x,y,z], color, size, streak, opacity, additive }` returns `update(t)`, which must be called every frame after the camera moves.

Rain: `{ count: 900, velocity: [0, -28, 0], size: 0.01, streak: 0.35, opacity: 0.5, color: '#b8c8dc' }`. Snow: `{ velocity: [0.4, -1.4, 0], size: 0.03 }`. Embers: `{ velocity: [0.2, 2, 0], color: '#ffa040', additive: true, size: 0.03 }`.

## Watch out for

- A scene is rebuilt at each shot, and only one is alive at a time, so a bit of heavy setup per shot is fine.
- Shadow coverage is limited to `shadowSpan` around `focus`, 26 m by default. A walker moving far from the origin needs `focus` set near them.
- Custom `BufferGeometry` must have normals, or ambient occlusion renders it black.
- With the camera low inside a tight prop, geometry will block the view. Check stills.
