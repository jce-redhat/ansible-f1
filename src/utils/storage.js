const KEYS = {
  BEST_SCORE: "builtToAutomate_bestScore",
  TOTAL_CORRECT: "builtToAutomate_totalCorrect",
  TOTAL_RUNS: "builtToAutomate_totalRuns",
  RECOVERY_TIP: "builtToAutomate_recoveryTipSeen",
  LEADERBOARD: "builtToAutomate_leaderboard",
  LAST_NAME: "builtToAutomate_lastName",
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
export function addLeaderboardEntry(name, score) {
  const board = getLeaderboard();
  const entry = { name, score: Math.floor(score), ts: Date.now() };
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
