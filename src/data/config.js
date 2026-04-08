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
  BOOST_DURATION: 5,
  /** Speed multiplier during boost */
  BOOST_SPEED_MULT: 1.85,

  // Crash recovery quiz (same — full pause)

  // Automation Flow (streak of 3 correct)
  STREAK_FOR_FLOW: 3,
  FLOW_DURATION: 8,
  FLOW_SCORE_MULT: 1.2,
  /** Pickup pull strength toward player X */
  FLOW_MAGNET: 2.8,

  // UI
  STATUS_MESSAGE_MS: 2200,
  STATUS_HIT_MS: 3800,
  /** How long CORRECT / WRONG result screen shows before applying & resuming */
  QUIZ_RESULT_DISPLAY_MS: 1000,
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
    billboards: [
      { id: "demo7", label: "Demo 7", accent: 0xff8844 },
      { id: "demo8", label: "Demo 8", accent: 0xcc4466 },
      { id: "demo9", label: "Demo 9", accent: 0x44ccaa },
    ],
  },
};
