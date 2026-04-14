---
name: drivers-and-vehicles
description: >-
  Patterns for adding new drivers, custom car types, secret unlockable modes,
  and special vehicle click abilities. Use when adding a new driver, creating a
  custom car mesh, implementing secret modes, or adding click-to-activate abilities.
---

# Drivers & Vehicles

## Adding a New Driver

1. **Add the driver entry** in `src/data/config.js` inside the `DRIVERS` object:

```js
mydriver: {
  id: "mydriver",
  name: "Display Name",
  car: "f1_custom",       // car type string → dispatched in Player._buildCarForType()
  country: "US",           // country code for leaderboard flag
  photo: "./assets/mydriver_tron.png",
  origin: "City, State",
  bio: "Driver bio text...",
  // speedMult: 1.1,       // optional — only Remy uses this currently
},
```

2. **Add a portrait photo** at `assets/mydriver_tron.png`
3. **Define the car type** (see below) — or reuse an existing one like `"f1"` for the default cyan/red scheme

## Adding a New F1 Color Scheme

The cheapest way to give a driver a unique car. No new mesh code needed.

1. Pick a new car type string (e.g. `f1_custom`)
2. Set `car: "f1_custom"` in the driver's config entry
3. Add a branch in `Player._buildCarForType()`:

```js
if (type === "f1_custom") return this._buildF1({
  livery: 0x003366, liveryEmit: 0x001122,    // body color + emissive
  accent: 0xff9900, accentEmit: 0x331100,    // stripe/wing color + emissive
  rim: 0xcccccc, glow: 0x0066ff,             // wheel rim + underglow
});
```

`_buildF1(scheme)` uses defaults (cyan/red) for any omitted keys, so you only need to specify what differs.

Unknown car type strings that aren't special-cased fall through to `return this._buildF1()` (default scheme).

## Adding a Completely New Car Type Mesh

For non-F1 vehicles (trucks, DeLorean, light cycles, etc.):

1. **Dispatch** in `_buildCarForType()`: `if (type === "my_car") return this._buildMyCarMesh();`
2. **Implement** `_buildMyCarMesh()` returning a `THREE.Group` containing all child meshes
3. **swapCar()** handles cleanup automatically — it calls `dispose()`, clears particle references (`_smokeParticles`, `_truckExhaust`), rebuilds the mesh, and re-adds flow glow / shield ring
4. If the new car has **per-frame animation** (particles, moving parts), add update logic in `Player.update()` gated on `carType`
5. If you store particle systems or animation state, **reset them in `swapCar()`** (set to `null`)

Existing custom meshes to reference:
- `_buildTruckMesh()` — Nuno's pickup truck with exhaust particle system
- `_buildDeloreanMesh()` — Roger's DeLorean with time travel fire trails
- `_buildSemiTruckMesh()` — Andrius's 18-wheeler (chunky mode unlock)
- `_buildLightcycleMesh()` — Hicham's Tron-style light cycle
- `_buildHippoMesh()` — Nuno's secret hippo with rider
- `_buildSkateboardMesh()` — Matt's secret skateboard with articulated rider

## Adding a Secret Unlockable Mode

Secret modes swap a driver's default car to an alternate vehicle when the player types a keyword during a race.

### End-to-end flow

| Step | Where | What |
|------|-------|------|
| 1. Build the mesh | `Player.js` | Add `_buildMySecretMesh()` and register in `_buildCarForType()` |
| 2. Secret word detection | `Game._bindKeys()` | Check `currentDriver`, `player.carType`, and `_secretBuffer.endsWith("keyword")` |
| 3. Swap the car | `Game._bindKeys()` | Call `player.swapCar("my_secret")`, show announcement, play SFX, clear buffer |
| 4. Special behavior | `Player.js` + `Game.js` | Per-frame updates, click abilities, collision overrides |
| 5. Leaderboard exclusion | `Game._isCheater()` | Add `this.player.carType === "my_secret"` if it should block scoring |

### Key detection pattern

The `_secretBuffer` is a rolling 6-character string built from keystrokes while `state === "running"`:

```js
this._secretBuffer = (this._secretBuffer + e.key.toLowerCase()).slice(-6);
if (this.currentDriver === "mydriver" &&
    this.player.carType !== "my_secret" &&
    this._secretBuffer.endsWith("keyword")) {
  this.player.swapCar("my_secret");
  this.ui.showHippoCrush("🎉 SECRET MODE 🎉");
  play(SFX.CORRECT, 0.9);
  this._secretBuffer = "";
}
```

If your keyword is longer than 6 characters, increase the `slice(-N)` value.

### Current secret modes

| Driver | Keyword | Car Type | Cheater? |
|--------|---------|----------|----------|
| Nuno | `hippo` | `hippo` | Yes — no leaderboard |
| Andrius | `chunky` | `semi_truck` | Yes — no leaderboard |
| Matt | `matt` | `skateboard` | No — scores count |

## Adding a Special Click Ability

Click abilities replace the horn for specific car types. They're dispatched in `Game._bindHorn()`:

```js
this.renderer.domElement.addEventListener("click", () => {
  if (this.state !== "running") return;

  // Each car type with a special ability gets an early return:
  if (this.player.carType === "skateboard") {
    this.player.skateJump();
    play(SFX.BOOST_WHOOSH, 0.6);
    return;
  }
  if (this.player.carType === "delorean") {
    // time travel logic with cooldown...
    return;
  }
  // ... fall through to generic horn
});
```

**Pattern for a new ability:**
1. Add `if (this.player.carType === "newtype") { ...; return; }` **before** the generic horn block
2. Implement the ability method on `Player` (e.g. `Player.myAbility()`)
3. If it has a cooldown, add state tracking in `Player` and show status text via `this.ui.setStatus()`
4. If it needs a HUD element (like the DeLorean cooldown bar), add HTML/CSS/UI.js updates

## Invincibility States

Multiple systems can make the player invincible. All are checked at the top of `_onHitObstacle()` and `_onHitRival()`:

| State | Getter | Car Type | Effect |
|-------|--------|----------|--------|
| Skateboard airborne | `player.isAirborne` | `skateboard` | Obstacle explodes, no damage, "jumped over it" status |
| DeLorean time travel | `player.isTimeTravelInvisible` | `delorean` | Obstacle explodes, no damage, phases through silently |
| Cheater mode | `_isCheater()` | `hippo`, `semi_truck` | Obstacle explodes, no damage; hippo gets +50k score and crush lines |
| Shield active | `this.shield > 0` | any | Obstacle hit absorbed, shield decremented, no health loss |

When adding a new invincibility state:
1. Add a getter on `Player` (e.g. `get isMyInvincible()`)
2. Add an early-return check in both `_onHitObstacle()` and `_onHitRival()` in `Game.js`
3. Decide whether obstacles should visually explode or pass through silently

## Horn Sounds

Horn sounds are dispatched in `_bindHorn()` after all special abilities return:

```js
if (this.player.carType === "hippo") {
  play(SFX.HIPPO_MODE, 0.9);
} else if (this.currentDriver === "andrius") {
  play(SFX.HORN_ANDRIUS, 0.8);
} else {
  play(SFX.HORN, 0.8);
}
```

To add a driver-specific horn:
1. Place audio in `assets/audio/`
2. Add to the `SFX` object in `Game.js`
3. Add an `else if (this.currentDriver === "mydriver")` branch before the default `play(SFX.HORN)`
