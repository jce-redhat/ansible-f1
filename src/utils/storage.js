const KEYS = {
  BEST_SCORE: "builtToAutomate_bestScore",
  TOTAL_CORRECT: "builtToAutomate_totalCorrect",
  TOTAL_RUNS: "builtToAutomate_totalRuns",
  RECOVERY_TIP: "builtToAutomate_recoveryTipSeen",
  LEADERBOARD: "builtToAutomate_leaderboard",
  LAST_NAME: "builtToAutomate_lastName",
  LAST_COUNTRY: "builtToAutomate_lastCountry",
  LAST_LEVEL: "builtToAutomate_lastLevel",
  LAST_DRIVER: "builtToAutomate_lastDriver",
  ACHIEVEMENTS: "builtToAutomate_achievements",
};

function readNumber(key, fallback = 0) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function writeNumber(key, n) {
  try {
    localStorage.setItem(key, String(Math.floor(n)));
  } catch {
    /* ignore */
  }
}

export function getBestScore() {
  return readNumber(KEYS.BEST_SCORE, 0);
}

export function setBestScoreIfHigher(score) {
  const best = getBestScore();
  if (score > best) {
    writeNumber(KEYS.BEST_SCORE, score);
    return true;
  }
  return false;
}

export function getTotalCorrectAnswers() {
  return readNumber(KEYS.TOTAL_CORRECT, 0);
}

export function addTotalCorrectAnswers(delta) {
  const n = getTotalCorrectAnswers() + delta;
  writeNumber(KEYS.TOTAL_CORRECT, n);
}

export function getTotalRuns() {
  return readNumber(KEYS.TOTAL_RUNS, 0);
}

export function incrementTotalRuns() {
  writeNumber(KEYS.TOTAL_RUNS, getTotalRuns() + 1);
}

export function hasSeenRecoveryTip() {
  try {
    return localStorage.getItem(KEYS.RECOVERY_TIP) === "1";
  } catch {
    return true;
  }
}

export function markRecoveryTipSeen() {
  try {
    localStorage.setItem(KEYS.RECOVERY_TIP, "1");
  } catch {
    /* ignore */
  }
}

const MAX_LEADERBOARD = 50;

export function getLeaderboard() {
  try {
    const raw = localStorage.getItem(KEYS.LEADERBOARD);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, MAX_LEADERBOARD);
  } catch {
    return [];
  }
}

/**
 * @returns {{ rank: number, board: Array<{name:string, score:number, ts:number}> }}
 */
export function addLeaderboardEntry(name, score, country = "US", level = "A") {
  const board = getLeaderboard();
  const entry = { name, score: Math.floor(score), country, level, ts: Date.now() };
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  if (board.length > MAX_LEADERBOARD) board.length = MAX_LEADERBOARD;
  try {
    localStorage.setItem(KEYS.LEADERBOARD, JSON.stringify(board));
  } catch { /* ignore */ }
  const rank = board.indexOf(entry);
  return { rank, board };
}

export function getLastName() {
  try {
    return localStorage.getItem(KEYS.LAST_NAME) || "";
  } catch {
    return "";
  }
}

export function setLastName(name) {
  try {
    localStorage.setItem(KEYS.LAST_NAME, name);
  } catch { /* ignore */ }
}

export function getLastCountry() {
  try {
    return localStorage.getItem(KEYS.LAST_COUNTRY) || "US";
  } catch {
    return "US";
  }
}

export function setLastCountry(code) {
  try {
    localStorage.setItem(KEYS.LAST_COUNTRY, code);
  } catch { /* ignore */ }
}

export function getLastLevel() {
  try {
    return localStorage.getItem(KEYS.LAST_LEVEL) || "A";
  } catch {
    return "A";
  }
}

export function setLastLevel(id) {
  try {
    localStorage.setItem(KEYS.LAST_LEVEL, id);
  } catch { /* ignore */ }
}

export function getLastDriver() {
  try {
    return localStorage.getItem(KEYS.LAST_DRIVER) || "anshul";
  } catch {
    return "anshul";
  }
}

export function setLastDriver(id) {
  try {
    localStorage.setItem(KEYS.LAST_DRIVER, id);
  } catch { /* ignore */ }
}

// --- Achievements ---

export const ACHIEVEMENT_DEFS = [
  { id: "score_10k", name: "10K Club", desc: "Score 10,000 in a single run" },
  { id: "score_50k", name: "50K Legend", desc: "Score 50,000 in a single run" },
  { id: "combo_5", name: "Combo x5", desc: "Reach a 5x pickup combo" },
  { id: "combo_10", name: "Combo x10", desc: "Reach a 10x pickup combo" },
  { id: "streak_5", name: "Quiz Master", desc: "5 correct quiz answers in a row" },
  { id: "boost_5", name: "Boost Hog", desc: "Use 5 boosts in one run" },
  { id: "playbooks_20", name: "Bookworm", desc: "Collect 20 playbooks in one run" },
  { id: "collections_15", name: "Curator", desc: "Collect 15 collections in one run" },
  { id: "survive_60", name: "Endurance", desc: "Survive 60 seconds" },
  { id: "survive_120", name: "Iron Will", desc: "Survive 120 seconds" },
  { id: "near_miss_10", name: "Daredevil", desc: "10 near-misses in one run" },
  { id: "no_damage", name: "Untouchable", desc: "Score 5,000+ without taking damage" },
];

export function loadAchievements() {
  try {
    const raw = localStorage.getItem(KEYS.ACHIEVEMENTS);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function unlockAchievement(id) {
  const all = loadAchievements();
  if (all[id]) return false;
  all[id] = Date.now();
  try {
    localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(all));
  } catch { /* ignore */ }
  return true;
}
