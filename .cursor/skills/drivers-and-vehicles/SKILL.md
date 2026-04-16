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
- `_buildTrexMesh()` — Anshul's secret T-Rex (leavemealone unlock) with animated legs, tail, and jaw
- `_buildCadillacMesh()` — Aubrey's secret pink Cadillac convertible (hollywood unlock) with tail fins and whitewall tires
- `_buildOgreMesh()` — Remy's secret ogre (quest unlock) with club, tusks, animated legs and arms
- `_buildCroonerMesh()` — Justin's secret Driving Crooner sedan (crooner unlock) with fedora/cigar window decals and crooner figure
- `_buildTimeTrainMesh()` — Roger's secret BTTF3 time-traveling train (crossfit unlock) with hover pads, flux capacitor, steam particles

## Adding a Secret Unlockable Mode

Secret modes swap a driver's default car to an alternate vehicle when the player types a keyword during a race.

### Standard rules for ALL secret characters

Every secret character mode MUST follow these rules:

1. **Smoke poof on transform** — Call `this._spawnTransformSmoke()` before `player.swapCar()`. This spawns a grey particle burst at the player's position that fades over 1.5 seconds. All secret modes use this.
2. **Indestructible** — Add the car type to `_isCheater()` in `Game.js`. The cheater handler in `_onHitObstacle()` and `_onHitRival()` explodes obstacles with no damage.
3. **No leaderboard** — `_isCheater()` returning `true` automatically blocks saving scores in both `saveLcScore()` and `saveScore()`. Add a custom message string for the car type in both methods.
4. **No quiz mode** — The `_isCheater()` check in the recovery prompt and boost token handler automatically skips quizzes. No extra code needed.
5. **Smash messages** — Add a `_myModeSmashLines` array and an `else if (this.player.carType === "my_secret")` branch in both `_onHitObstacle()` and `_onHitRival()` that shows +50k score and a random line.
6. **Level complete screen** — Add an `else if (cheaterType === "my_secret")` in `UI.setLevelCompleteStats()` with a themed title and message.
7. **Revert on back-to-menu** — Handled automatically (see below).

Exception: Matt's skateboard is the only secret mode where `_isCheater()` returns false — scores count normally.

### End-to-end flow

| Step | Where | What |
|------|-------|------|
| 1. Build the mesh | `Player.js` | Add `_buildMySecretMesh()` and register in `_buildCarForType()` |
| 2. Secret word detection | `Game._bindKeys()` | Check `currentDriver`, `player.carType`, and `_secretBuffer.endsWith("keyword")` |
| 3. Smoke + swap | `Game._bindKeys()` | Call `_spawnTransformSmoke()`, then `player.swapCar("my_secret")`, show announcement, play SFX, clear buffer |
| 4. Cheater/invincibility | `Game._isCheater()` | Add `this.player.carType === "my_secret"` |
| 5. Smash messages | `Game._onHitObstacle/Rival` | Add `else if` branch with themed `_smashLines` array, +50k score |
| 6. Leaderboard message | `Game.saveLcScore/saveScore` | Add `this.player.carType === "my_secret"` ternary with denial message |
| 7. Level complete | `UI.setLevelCompleteStats` | Add `else if (cheaterType === "my_secret")` with themed title/message |
| 8. Special behavior | `Player.js` + `Game.js` | Per-frame updates, click abilities, visual effects |

### Key detection pattern

The `_secretBuffer` is a rolling 12-character string built from keystrokes while `state === "running"`:

```js
this._secretBuffer = (this._secretBuffer + e.key.toLowerCase()).slice(-12);
if (this.currentDriver === "mydriver" &&
    this.player.carType !== "my_secret" &&
    this._secretBuffer.endsWith("keyword")) {
  this._spawnTransformSmoke();
  this.player.swapCar("my_secret");
  this.ui.showHippoCrush("🎉 SECRET MODE 🎉");
  play(SFX.MY_SOUND, 0.9);
  this._secretBuffer = "";
}
```

The buffer is 12 characters to accommodate the longest keyword ("leavemealone"). If you add a longer keyword, increase the `slice(-N)` value.

### Transform smoke effect

All secret modes trigger a grey smoke particle burst when the car transforms. This is handled by `Game._spawnTransformSmoke()`, which creates a `THREE.Points` cloud at the player's position. The particles are managed in `_transformSmoke[]` and updated each frame by `_updateTransformSmoke(dt)` in the game loop. Cleanup happens in `_cleanupTransformSmoke()` during `resetRun()`.

### Rainbow road (Cadillac / Hollywood mode)

When Aubrey's cadillac mode activates, `this._rainbowRoad = true` and `this.track.setRainbow(true)` are called. The `Track.setRainbow(on)` method stores the flag, and `Track.update()` cycles the road and edge materials through rainbow hues using `setHSL()` on each frame. The road hue cycles via `performance.now()` and the edge strips use the complementary hue. When returning to menu, `track.setRainbow(false)` restores original colors.

### Castle skyline (Ogre / Quest mode)

When Remy's ogre mode activates, `this.track.setCastle(true)` is called. `Track.setCastle(on)` saves the current skyline children, clears the skyline group, and builds a medieval castle skyline with a central keep, corner towers with purple roofs, battlements, lit windows, flags, a portcullis gate, and flanking torches. When returning to menu, `track.setCastle(false)` restores the original skyline.

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
| Anshul | `leavemealone` | `trex` | Yes — no leaderboard | Stomping legs/tail/jaw animation, smashes everything for +50k |
| Aubrey | `hollywood` | `cadillac` | Yes — no leaderboard | Pink Cadillac convertible, rainbow road, Hollywood smash lines |
| Remy | `quest` | `ogre` | Yes — no leaderboard | Green ogre with club, castle skyline, ogre/Shrek smash lines |
| Justin | `crooner` | `crooner` | Yes — no leaderboard | Dark sedan with fedora/cigar window decals, ITYSL Driving Crooner quotes |
| Roger | `crossfit` | `timetrain` | Yes — no leaderboard | BTTF3 Jules Verne train, hovers, steam particles, BTTF smash quotes |

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
| Cheater mode | `_isCheater()` | `hippo`, `semi_truck`, `scaloneta`, `f16`, `trex`, `cadillac`, `ogre`, `crooner` | Obstacle explodes, no damage; hippo/scaloneta/trex/cadillac/ogre/crooner get +50k score and crush lines |
| F-16 flyover | `carType === "f16"` | `f16` | Hovers 2 units above track, collision handlers return immediately (flies over everything) |
| T-Rex rampage | `_isCheater()` | `trex` | Smashes through everything with Jurassic Park-themed crush messages, +50k per hit |
| Hollywood cruise | `_isCheater()` | `cadillac` | Smashes through everything with Hollywood crush messages, +50k per hit, rainbow road |
| Ogre rampage | `_isCheater()` | `ogre` | Smashes through everything with ogre/Shrek crush messages, +50k per hit, castle skyline |
| Driving Crooner | `_isCheater()` | `crooner` | Smashes through everything with ITYSL Driving Crooner quotes, +50k per hit |
| Time Train | `_isCheater()` | `timetrain` | Hovers above track, smashes through everything with BTTF quotes, +50k per hit |
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
