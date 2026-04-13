# Built to Automate

A retro-arcade racing game built with Three.js, themed around Ansible and IT automation. Dodge outages, collect playbooks and collections, answer skill-check quizzes, and race your way up the leaderboard.

**[Play it live on GitHub Pages](https://ansible-tmm.github.io/ansible-f1/)**

![Built to Automate — gameplay screenshot](assets/screenshots/gameplay.png)

## Gameplay

- **Move:** Arrow keys (← / →) or A / D
- **Boost:** Arrow Up or W (manual boost when available)
- **Brake:** Arrow Down or S
- **Pause:** Escape or Space
- **Horn:** Mouse click
- **Dodge** Outage obstacles that drain your health
- **Collect** Ansible Playbooks (+100 pts), Collections (+150 pts), Policy Shields, and Boost Tokens
- **Answer** Ansible skill-check quizzes to recover health or earn speed boosts
- **Achieve** Automation Flow by getting 3 correct answers in a row (1.2× score + pickup magnet)

Health starts at 100. Four unshielded hits ends the run. Race to the finish line, coast to a stop, and enter your score on the global leaderboard.

## Drivers

Choose from a roster of drivers, each with a unique car and personality:

| Driver | Car |
|--------|-----|
| Andrius Benokraitis | 18-Wheeler |
| Justin Braun | Black & Gold F1 |
| Michele Kelley | Pink & Gold F1 |
| Roger Lopez | Pickup Truck |
| Nuno Martins | Red & Silver F1 |
| Craig Brandt | Blue & Cyan F1 |
| Sean Cavanaugh | DeLorean |
| Colin McNaughton | Orange & White F1 |

> *Some drivers may have hidden abilities. Some vehicles aren't what they seem. Read the source if you're curious.*

## Project Structure

```
ansible-f1/
├── index.html              # Single-page entry point (all UI overlays)
├── style.css               # Full styling (neon arcade aesthetic)
├── src/
│   ├── main.js             # Three.js init, render loop, UI wiring
│   ├── data/
│   │   ├── config.js       # All tuning constants (speed, scoring, spawning)
│   │   └── questions.js    # Ansible quiz question bank
│   ├── game/
│   │   ├── Game.js         # Core game loop, state machine, scoring, collisions
│   │   ├── Player.js       # Car models, lane movement, visual effects
│   │   ├── Track.js        # Road, lane markers, side props, skyline, finish line
│   │   ├── Spawner.js      # Obstacle & pickup generation, mesh builders
│   │   ├── CollisionSystem.js  # AABB collision detection
│   │   ├── QuizSystem.js   # Question pool management
│   │   └── UI.js           # HTML overlay management (HUD, menus, quiz, leaderboard)
│   └── utils/
│       ├── audio.js        # Web Audio API + HTML audio for SFX, BGM, engine loop
│       └── storage.js      # localStorage wrapper (scores, leaderboard, settings)
└── assets/
    ├── audio/              # Sound effects and background music
    ├── screenshots/        # Game screenshots
    ├── playbook-icon.png   # Ansible Playbook pickup texture
    └── collection-icon.png # Ansible Collections pickup texture
```

## Tech Stack

- **Three.js** (r160) via CDN import map — no build step
- **Plain JavaScript modules** (ES2020+)
- **Web Audio API** for sound effects; HTML `<audio>` for music/loops
- **localStorage** for persistence
- **GitHub Pages** for hosting (static files only)

## Running Locally

No build step or package manager required. Just serve the files:

```bash
# Any static file server works:
npx serve .
# or
python3 -m http.server 8000
```

Then open `http://localhost:8000` (or whichever port your server uses).

## Contributing

Contributions are welcome! Here's how to get started:

### Setting Up

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/ansible-f1.git
   cd ansible-f1
   ```
3. Serve locally (see above) and open in a browser

### Development Guidelines

- **No build tools** — this project intentionally has zero build step. All JS uses native ES modules loaded via import map.
- **Three.js r160** — imported from CDN. Don't add a `package.json` or bundler unless absolutely necessary.
- **`config.js` is the tuning hub** — game balance constants (speed, damage, scoring, timing) all live in `src/data/config.js`. Change values there instead of scattering magic numbers.
- **Fair spawning** — obstacles must always leave at least two lanes free. See `_pickLaneForObstacle()` in `Spawner.js`.
- **Quiz questions** — live in `src/data/questions.js`. Add new ones following the same `{ q, options, answer, explain }` format.
- **Audio** — sound effects go in `assets/audio/`. Wire them through `src/utils/audio.js` using `preload()` and `play()`. Background music uses `startBgm()`.
- **State machine** — game states are `boot → main_menu → running → quiz → paused → game_over → level_complete`. State transitions happen in `Game.js`.

### Making Changes

1. Create a feature branch: `git checkout -b feature/my-change`
2. Make your changes and test in-browser
3. Commit with a clear message describing the "why"
4. Push and open a Pull Request against `main`

### Good First Contributions

- Add more Ansible quiz questions to `src/data/questions.js`
- Improve the pixel-art skyline buildings in `Track.js` `_skyline()`
- Add new pickup types (follow the `PICKUP_TYPES` pattern in `config.js` and `Spawner.js`)
- Add new driver characters and car designs
- Improve mobile touch controls
- Accessibility improvements (screen reader hints, reduced-motion support)

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

Maintained by the Ansible TMM team.
