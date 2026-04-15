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
- `_buildScalonetaMesh()` — Leo's secret Argentina flag bus (scaloneta unlock)
- `_buildF16Mesh()` — Alex's secret F-16 fighter jet (topgun unlock) with jet flame particles

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

The `_secretBuffer` is a rolling 9-character string built from keystrokes while `state === "running"`:

```js
this._secretBuffer = (this._secretBuffer + e.key.toLowerCase()).slice(-9);
if (this.currentDriver === "mydriver" &&
    this.player.carType !== "my_secret" &&
    this._secretBuffer.endsWith("keyword")) {
  this.player.swapCar("my_secret");
  this.ui.showHippoCrush("🎉 SECRET MODE 🎉");
  play(SFX.MY_SOUND, 0.9);
  this._secretBuffer = "";
}
```

The buffer is 9 characters to accommodate the longest keyword ("scaloneta"). If you add a longer keyword, increase the `slice(-N)` value.

### Secret mode revert on back-to-menu

All secret modes automatically revert when the player returns to the main menu. In `backToMenu()`:

```js
const d = DRIVERS[this.currentDriver];
if (d && this.player.carType !== d.car) {
  this.player.swapCar(d.car);
}
this.ui.setScalonetaHud(false);
```

This means each player has to type the secret code themselves — it doesn't persist across sessions or between players.

### Current secret modes

| Driver | Keyword | Car Type | Cheater? | Special |
|--------|---------|----------|----------|---------|
| Nuno | `hippo` | `hippo` | Yes — no leaderboard | Crush messages, victory dance |
| Andrius | `chunky` | `semi_truck` | Yes — no leaderboard | Custom horn |
| Matt | `matt` | `skateboard` | No — scores count | Click to jump (airborne invincibility) |
| Leo | `scaloneta` | `scaloneta` | Yes — no leaderboard | Full Spanish UI, Argentine catchphrases, custom SFX |
| Alex | `topgun` | `f16` | Yes — no leaderboard | Hovers above track, flies over everything, click to drop bombs |

### Spanish UI mode (Scaloneta)

When scaloneta mode activates, the entire in-game UI flips to Spanish. This is driven by:

1. **`ES` translation map** (top of `Game.js`): Maps English strings to Spanish equivalents for simple lookups.
2. **`Game._t(text)`**: Returns `ES[text]` when `_isScaloneta` is true, otherwise returns the original text. Use this for simple string translations.
3. **`Game._isScaloneta`** (getter): Returns `true` when `player.carType === "scaloneta"`.
4. **`UI.setScalonetaHud(on)`**: Swaps all static HTML labels (Health→Salud, Score→Puntos, etc.), field guide legend, pause menu, game over/level complete screens, quiz prompts, and recovery dialog. Called when activating scaloneta and when returning to menu (`on=false`).
5. **Inline ternaries** in `Game.js`: For dynamic strings with interpolated values (e.g. damage messages), use `this._isScaloneta ? spanishVersion : englishVersion` directly.

When adding new status messages or UI text, always wrap them with `this._t()` or add an inline scaloneta check so the Spanish experience stays complete.

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
| Cheater mode | `_isCheater()` | `hippo`, `semi_truck`, `scaloneta`, `f16` | Obstacle explodes, no damage; hippo/scaloneta get +50k score and crush lines |
| F-16 flyover | `carType === "f16"` | `f16` | Hovers 2 units above track, collision handlers return immediately (flies over everything) |
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
} else if (this.player.carType === "scaloneta") {
  play(SFX.SCALONETA, 0.8);
} else if (this.currentDriver === "andrius") {
  play(SFX.HORN_ANDRIUS, 0.8);
} else {
  play(SFX.HORN, 0.8);
}
```

To add a driver-specific horn:
1. Place audio file in `assets/audio/`
2. Add to the `SFX` object at the top of `Game.js`
3. Add an `else if` branch — check `carType` for secret mode sounds or `currentDriver` for default driver sounds
4. Place the branch **before** the default `play(SFX.HORN)` fallback

Secret mode sounds (checked by `carType`) should also be used in the smash hit handlers (`_onHitObstacle`, `_onHitRival`) for consistency.
