/**
 * Tuning constants — Operations Highway MVP
 */
export const CONFIG = {
  // Lanes: world X positions (center = 0)
  LANES: [-3.2, 0, 3.2],
  LANE_INDEX: { LEFT: 0, CENTER: 1, RIGHT: 2 },

  // Movement
  BASE_SPEED: 28.2,
  /** Units per second²-ish scaling for forward speed over time */
  SPEED_RAMP: 0.161,
  /** Max multiplier on base speed from ramp + boosts */
  MAX_SPEED_MULT: 2.4,
  LANE_LERP: 8,

  // Player hitbox (forgiving, slightly smaller than mesh)
  PLAYER_HALF_WIDTH: 0.55,
  PLAYER_HALF_DEPTH: 0.9,
  PLAYER_Y: 0.6,

  // Spawning (Z is forward; obstacles start negative, move +Z)
  SPAWN_Z: -95,
  DESPAWN_Z: 12,
  /** Minimum |Δz| between two obstacles in the same lane (fairness) */
  MIN_OBSTACLE_ALONG_Z: 26,
  /** Base interval (seconds) — lowered after warmup */
  OBSTACLE_SPAWN_BASE: 2.1,
  OBSTACLE_SPAWN_MIN: 0.95,
  PICKUP_SPAWN_BASE: 2.8,
  PICKUP_SPAWN_MIN: 1.35,
  /** First ~25s: easier spawns */
  WARMUP_SECONDS: 28,

  // Single hazard type (MVP clarity)
  OBSTACLE_KIND: "OUTAGE",
  /** Display name for HUD legend */
  OBSTACLE_NAME: "Outage",
  OBSTACLE_DAMAGE: 25,

  // Health (run survival meter)
  STARTING_HEALTH: 100,
  REMEDIATION_WRONG_PENALTY: 5,
  REMEDIATION_RESTORE: 10,

  // Scoring (per second / tick feel)
  SCORE_PER_SECOND: 12,
  SCORE_PER_UNIT_DISTANCE: 0.35,
  PICKUP_SCORE: {
    PLAYBOOK: 100,
    COLLECTION: 150,
  },
  BOOST_QUIZ_CORRECT: 250,
  BOOST_QUIZ_WRONG: 25,
  REMEDIATION_CORRECT_STREAK: 1,

  // Boost token quiz (gameplay pauses while answering)
  MAX_REMEDIATIONS: 3,

  BOOST_DURATION: 5,
  /** Seconds added to an active boost when collecting a playbook/collection */
  BOOST_EXTEND_ON_PICKUP: 2,
  /** Speed multiplier during boost */
  BOOST_SPEED_MULT: 1.85,

  // Manual boost (W / Up)
  MANUAL_BOOST_DURATION: 2.5,
  MANUAL_BOOST_MULT: 1.4,
  MANUAL_BOOST_COOLDOWN: 8,

  // Brake (S / Down)
  BRAKE_SPEED_MULT: 0.45,

  // Crash recovery quiz (same — full pause)

  // Automation Flow (streak of 3 correct)
  STREAK_FOR_FLOW: 3,
  FLOW_DURATION: 8,
  FLOW_SCORE_MULT: 1.2,
  /** Pickup pull strength toward player X */
  FLOW_MAGNET: 2.8,

  // Combo multiplier
  COMBO_WINDOW: 3,
  COMBO_BONUS: 25,

  // Near-miss
  NEAR_MISS_MARGIN: 1.2,
  NEAR_MISS_BONUS: 25,

  // School bus (Level F only)
  BUS_SPEED_MULT: 1.2,
  BUS_DAMAGE: 35,

  // UI
  STATUS_MESSAGE_MS: 2200,
  STATUS_HIT_MS: 3800,
  /** How long CORRECT / WRONG result screen shows before applying & resuming */
  QUIZ_RESULT_DISPLAY_MS: 1000,
};

export const DRIVERS = {
  anshul: {
    id: "anshul",
    name: "Anshul Behl",
    car: "f1",
    photo: "./assets/anshul_tron.png",
    origin: "Toronto, Canada",
    bio: "Former neural-net architect turned full-stack automation overlord. By day, Anshul codes sentient CI/CD pipelines for Red Hat. By night, he BASE-jumps off the CN Tower and trains for competitive high diving. Father of two future cyborg engineers, husband to the only person who can beat him at chess. Once automated an entire datacenter migration during a 14-hour flight from Toronto to Tokyo — and still had time to land a perfect reverse 3.5 somersault at the hotel pool. His enemies call him 'The Optimizer.' His daughters call him dad. The grid calls him inevitable.",
  },
  nuno: {
    id: "nuno",
    name: "Nuno Martins",
    car: "truck",
    photo: "./assets/nuno_tron.png",
    origin: "Johannesburg, South Africa",
    bio: "Part security researcher, part mad scientist, fully unhinged. Nuno reverse-engineers malware before breakfast and builds Faraday cages out of braai grills for fun. When he's not dissecting zero-days, he's riding wild hippos through the Kruger bushveld — the only man the hippos respect. Father of three junior hackers, connoisseur of obscure horror films (the gorier the better), and proud owner of the most heavily fortified home lab in the Southern Hemisphere. His truck runs on diesel, paranoia, and pure adrenaline. The dark web fears him. The hippos obey him.",
  },
};

export const PICKUP_TYPES = [
  "PLAYBOOK",
  "CERTIFIED_COLLECTION",
  "POLICY_SHIELD",
  "BOOST_TOKEN",
];

export const LEVELS = {
  A: {
    id: "A",
    name: "Level A",
    subtitle: "Neon City",
    road:     0x121520,
    roadEmissive: 0x020408,
    edge:     0x1a1a2e,
    edgeEmissive: 0x220044,
    laneMarker: 0x00ffcc,
    side:     0x0a0e18,
    sideEmissive: 0x0c1830,
    fog:      0x0a0e18,
    sky:      0x050510,
    sceneBg:  0x0a0e18,
    scenery: "city",
    billboards: [
      { id: "demo1", label: "Demo 1", accent: 0x00c8ea },
      { id: "demo2", label: "Demo 2", accent: 0xff6644 },
      { id: "demo3", label: "Demo 3", accent: 0x66ffcc },
    ],
  },
  B: {
    id: "B",
    name: "Level B",
    subtitle: "Alpine Rally",
    road:     0x555960,
    roadEmissive: 0x0a0a0c,
    edge:     0x446633,
    edgeEmissive: 0x112200,
    laneMarker: 0xffffff,
    side:     0x2a5520,
    sideEmissive: 0x0a2200,
    fog:      0x88aacc,
    sky:      0x6699bb,
    sceneBg:  0x7799aa,
    scenery: "forest",
    music: "./assets/audio/bgm-alpine.m4a",
    billboards: [
      { id: "demo4", label: "Demo 4", accent: 0x44bb66 },
      { id: "demo5", label: "Demo 5", accent: 0xddaa22 },
      { id: "demo6", label: "Demo 6", accent: 0x8866dd },
    ],
  },
  C: {
    id: "C",
    name: "Level C",
    subtitle: "Desert Run",
    road:     0x8b7355,
    roadEmissive: 0x1a1208,
    edge:     0xc4a84a,
    edgeEmissive: 0x332800,
    laneMarker: 0xffeecc,
    side:     0xd4b85a,
    sideEmissive: 0x332800,
    fog:      0xd4c09a,
    sky:      0xccaa77,
    sceneBg:  0xc4a870,
    scenery: "desert",
    music: "./assets/audio/bgm-desert.m4a",
    billboards: [
      { id: "demo7", label: "Demo 7", accent: 0xff8844 },
      { id: "demo8", label: "Demo 8", accent: 0xcc4466 },
      { id: "demo9", label: "Demo 9", accent: 0x44ccaa },
    ],
  },
  D: {
    id: "D",
    name: "Level D",
    subtitle: "Bayou Swamp",
    road:     0x3a3828,
    roadEmissive: 0x0a0a04,
    edge:     0x4a5530,
    edgeEmissive: 0x1a2200,
    laneMarker: 0x88cc66,
    side:     0x2a3a1a,
    sideEmissive: 0x0a1a04,
    fog:      0x4a5a3a,
    sky:      0x556644,
    sceneBg:  0x3a4a2a,
    scenery: "swamp",
    music: "./assets/audio/bgm-swamp.m4a",
    billboards: [
      { id: "demo10", label: "Demo 10", accent: 0x66aa44 },
      { id: "demo11", label: "Demo 11", accent: 0xaacc22 },
      { id: "demo12", label: "Demo 12", accent: 0x44aa88 },
    ],
  },
  E: {
    id: "E",
    name: "Level E",
    subtitle: "Arctic Freeze",
    road:     0x667788,
    roadEmissive: 0x0a0c10,
    edge:     0x8899aa,
    edgeEmissive: 0x112244,
    laneMarker: 0xccddff,
    side:     0xdde8f0,
    sideEmissive: 0x2a3040,
    fog:      0xc8d8e8,
    sky:      0xaabbcc,
    sceneBg:  0xbccada,
    scenery: "snow",
    music: "./assets/audio/bgm-snow.m4a",
    billboards: [
      { id: "demo13", label: "Demo 13", accent: 0x44aaff },
      { id: "demo14", label: "Demo 14", accent: 0xaaddff },
      { id: "demo15", label: "Demo 15", accent: 0x6688cc },
    ],
  },
  F: {
    id: "F",
    name: "Level F",
    subtitle: "Ocean Drive",
    road:     0x445566,
    roadEmissive: 0x060810,
    edge:     0x3388aa,
    edgeEmissive: 0x0a2244,
    laneMarker: 0xffffff,
    side:     0x2266aa,
    sideEmissive: 0x0a1844,
    fog:      0x6699bb,
    sky:      0x4488bb,
    sceneBg:  0x5599bb,
    scenery: "water",
    music: "./assets/audio/bgm-ocean.m4a",
    billboards: [
      { id: "demo16", label: "Demo 16", accent: 0x22ccff },
      { id: "demo17", label: "Demo 17", accent: 0x44ffcc },
      { id: "demo18", label: "Demo 18", accent: 0x88aaff },
    ],
  },
  G: {
    id: "G",
    name: "Level G",
    subtitle: "Pacific Coast",
    road:     0x555555,
    roadEmissive: 0x080808,
    edge:     0xcc8844,
    edgeEmissive: 0x331800,
    laneMarker: 0xffdd44,
    side:     0x7a6a50,
    sideEmissive: 0x1a1408,
    fog:      0x8aAAcc,
    sky:      0x6699cc,
    sceneBg:  0x88aacc,
    scenery: "coast",
    music: "./assets/audio/bgm-coast.m4a",
    curve: { amplitude: 5, frequency: 0.018 },
    billboards: [
      { id: "demo19", label: "Demo 19", accent: 0xff8822 },
      { id: "demo20", label: "Demo 20", accent: 0xffcc44 },
      { id: "demo21", label: "Demo 21", accent: 0x44aacc },
    ],
  },
  H: {
    id: "H",
    name: "Level H",
    subtitle: "Durham, NC",
    road:     0x2a2a30,
    roadEmissive: 0x040408,
    edge:     0x1a1a2e,
    edgeEmissive: 0x110022,
    laneMarker: 0xffcc00,
    side:     0x1a2218,
    sideEmissive: 0x0a1208,
    fog:      0x2a3548,
    sky:      0x182840,
    sceneBg:  0x1a2838,
    scenery: "durham",
    music: "./assets/audio/bgm-durham.m4a",
    billboards: [
      { id: "demo22", label: "Demo 22", accent: 0xee1100 },
      { id: "demo23", label: "Demo 23", accent: 0x00bbff },
      { id: "demo24", label: "Demo 24", accent: 0xffaa22 },
    ],
  },
};
