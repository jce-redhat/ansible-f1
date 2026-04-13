import * as THREE from "three";
import { CONFIG, LEVELS, DRIVERS } from "../data/config.js";
import { Player } from "./Player.js";
import { Track } from "./Track.js";
import { Spawner } from "./Spawner.js";
import { CollisionSystem } from "./CollisionSystem.js";
import { QuizSystem } from "./QuizSystem.js";
import {
  setBestScoreIfHigher,
  addTotalCorrectAnswers,
  incrementTotalRuns,
  getBestScore,
  hasSeenRecoveryTip,
  markRecoveryTipSeen,
  addLeaderboardEntry,
  getLastName,
  setLastName,
  getLastCountry,
  setLastCountry,
  setLastLevel,
  getLastDriver,
  setLastDriver,
  loadAchievements,
  unlockAchievement,
  ACHIEVEMENT_DEFS,
} from "../utils/storage.js";
import { preload, play, startLoop, stopLoop, startBgm } from "../utils/audio.js";
import { submitGlobalScore } from "../utils/firebase.js";

const SFX = {
  SHIELD_HIT: "./assets/audio/shield-hit.wav",
  SHIELD_ON: "./assets/audio/shield-on.wav",
  OBSTACLE_HIT: "./assets/audio/obstacle-hit.wav",
  BOOST_WHOOSH: "./assets/audio/boost-whoosh.wav",
  CORRECT: "./assets/audio/correct.m4a",
  WRONG: "./assets/audio/wrong.mp4",
  PICKUP: "./assets/audio/pickup.wav",
  GAME_OVER: "./assets/audio/game-over.wav",
  START_RUN: "./assets/audio/start-run.wav",
  HORN_ANDRIUS: "./assets/audio/horn-andrius.m4a",
  CROWD_CHEERS: "./assets/audio/crowd-cheers.mp4",
};

const ENGINE_LOOP = "./assets/audio/engine-loop.mp4";
const DEFAULT_BGM = "./assets/audio/bgm.m4a";

preload(Object.values(SFX));

/**
 * @typedef {'boot'|'main_menu'|'running'|'quiz'|'paused'|'game_over'|'billboard'} GameState
 */

export class Game {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   * @param {import('./UI.js').UI} ui
   */
  constructor(renderer, scene, camera, ui) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.ui = ui;

    this.state = /** @type {GameState} */ ("boot");
    this.quizMode = /** @type {'boost'|'recovery'|null} */ (null);
    this.currentQuestion = null;

    this.currentLevel = "A";
    this.currentDriver = getLastDriver();
    const carType = (DRIVERS[this.currentDriver] || DRIVERS.anshul).car;
    this.player = new Player(scene, carType);
    this.track = new Track(scene, this.currentLevel);
    this.spawner = new Spawner(scene);
    this.collision = new CollisionSystem(this.player);
    this.quiz = new QuizSystem();

    this.runTime = 0;
    this.health = CONFIG.STARTING_HEALTH;
    this.score = 0;
    this.streak = 0;
    this.worldSpeed = CONFIG.BASE_SPEED;

    this.shield = false;
    this.boostUntil = 0;
    this._boostStartedAt = 0;
    this.automationFlowUntil = 0;

    this.manualBoostUntil = 0;
    this.manualBoostCooldownUntil = 0;
    this.braking = false;

    this.obstaclesHit = 0;
    this.pickupsCollected = 0;
    this.sessionCorrect = 0;
    this.playbookCount = 0;
    this.playbookPts = 0;
    this.collectionCount = 0;
    this.collectionPts = 0;
    this.pickupSpeedMult = 1;

    this.recoveryPrompt = false;
    this.remediationsUsed = 0;
    this.timeScale = 1;

    // Combo multiplier
    this.comboCount = 0;
    this.comboTimer = 0;

    // Near-miss tracking
    this._nearMissChecked = new Set();

    // Quiz toggle
    this.quizEnabled = true;

    // Achievements
    this._achievements = loadAchievements();
    this._runBoostCount = 0;
    this._runMaxCombo = 0;

    // Speed tier FOV
    this._baseFov = 58;

    this.cameraBase = new THREE.Vector3(0, 5.2, 12);
    this.shakeUntil = 0;
    this.shakeAmp = 0;

    // Billboard interaction
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._dragMoved = false;
    this._pointerDown = null;
    this._hoveredBillboard = null;
    this._activeBillboard = null;
    this._bbTargetPos = new THREE.Vector3();
    this._bbTargetLook = new THREE.Vector3();
    this._bbCurrentLook = new THREE.Vector3(0, 1.2, -2);
    this._bbZooming = false;
    this._bbOverlayShown = false;
    this._bbReturning = false;
    this._bbLabel = "";

    // Level completion
    this._finishLineSpawned = false;
    this._finishing = false;
    this._finishCoastSpeed = 0;
    this._orbitStartTime = 0;
    this._orbitCenter = new THREE.Vector3();
    this._lcOverlayShown = false;
    this._celebCrowd = [];
    this._celebConfetti = [];

    // Attract mode (demo play behind main menu)
    this._attractActive = false;
    this._attractDodgeTimer = 0;
    this._attractSpeed = CONFIG.BASE_SPEED * 0.85;
    this._gameOverTimer = null;
    this._attractScoreFlashTimer = null;
    this._attractScoreShowing = false;

    this._lastTs = performance.now();

    this._bindKeys();
    this._bindQuizUi();
    this._bindBillboardInput();
    this._bindTouch();
    this._bindHorn();
    this._quizBusy = false;
    /** @type {'question'|'result'} */
    this._quizPhase = "question";
  }

  _bindKeys() {
    window.addEventListener("keydown", (e) => {
      if (this.state === "main_menu" && this._attractScoreShowing) {
        this._attractScoreShowing = false;
        this.ui.showAttractScores(false);
        return;
      }
      if (this.state === "main_menu" || this.state === "game_over") return;

      if (this.state === "billboard") {
        if (e.code === "Escape" || e.code === "Space") {
          this.closeBillboard();
          e.preventDefault();
        }
        return;
      }

      if (
        this.state === "quiz" &&
        this._quizPhase === "question" &&
        this.currentQuestion
      ) {
        if (e.code === "Escape") {
          this.skipQuiz();
          e.preventDefault();
          return;
        }
        const k = e.key;
        if (k >= "1" && k <= "4") {
          this._answerQuiz(Number(k) - 1);
          e.preventDefault();
        }
        return;
      }

      if (this.state === "quiz" && this._quizPhase === "result") {
        if (e.code === "Escape") {
          this._dismissResult(this._lastAnswerCorrect);
          e.preventDefault();
        }
        return;
      }

      if (this.state === "quiz") return;

      if (e.code === "Escape" || e.code === "Space") {
        if (this.recoveryPrompt) {
          this.onRecoveryNo();
        } else if (this.state === "paused") {
          this.state = "running";
          this.ui.showPause(false);
        } else if (this.state === "running") {
          this.state = "paused";
          this.ui.showPause(true);
        }
        e.preventDefault();
      }

      if (this.state !== "running" || this.recoveryPrompt) return;
      if (e.code === "KeyA" || e.code === "ArrowLeft") {
        this.player.moveLeft();
        e.preventDefault();
      }
      if (e.code === "KeyD" || e.code === "ArrowRight") {
        this.player.moveRight();
        e.preventDefault();
      }
      if (e.code === "KeyW" || e.code === "ArrowUp") {
        this._activateManualBoost();
        e.preventDefault();
      }
      if (e.code === "KeyS" || e.code === "ArrowDown") {
        this.braking = true;
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "KeyS" || e.code === "ArrowDown") {
        this.braking = false;
      }
    });
  }

  _bindQuizUi() {
    const opts = this.ui.el.quizOpts;
    if (opts) {
      opts.addEventListener("click", (ev) => {
        if (
          this.state !== "quiz" ||
          this._quizPhase !== "question" ||
          !this.currentQuestion
        ) {
          return;
        }
        const t = /** @type {HTMLElement} */ (ev.target);
        if (t && t.dataset && t.dataset.index !== undefined) {
          this._answerQuiz(Number(t.dataset.index));
        }
      });
    }
  }

  _bindBillboardInput() {
    const c = this.renderer.domElement;
    c.addEventListener("pointerdown", (e) => {
      this._pointerDown = { x: e.clientX, y: e.clientY };
      this._dragMoved = false;
    });
    c.addEventListener("pointermove", (e) => {
      this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      if (this._pointerDown) {
        const dx = e.clientX - this._pointerDown.x;
        const dy = e.clientY - this._pointerDown.y;
        if (dx * dx + dy * dy > 25) this._dragMoved = true;
      }
      this._checkBillboardHover();
    });
    c.addEventListener("pointerup", () => {
      if (!this._dragMoved && this._hoveredBillboard && this.state === "running" && !this.recoveryPrompt) {
        this._openBillboard(this._hoveredBillboard);
      }
      this._pointerDown = null;
    });
  }

  _bindHorn() {
    this.renderer.domElement.addEventListener("click", () => {
      if (this.state === "running" && this.currentDriver === "andrius") {
        play(SFX.HORN_ANDRIUS, 0.8);
      }
    });
  }

  _bindTouch() {
    if (!("ontouchstart" in window)) return;

    const canvas = this.renderer.domElement;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartTime = performance.now();
    }, { passive: true });

    canvas.addEventListener("touchend", (e) => {
      if (e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const elapsed = performance.now() - touchStartTime;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Swipe detection: > 30px and faster than 300ms
      if (dist > 30 && elapsed < 300) {
        if (this.state === "running" && !this.recoveryPrompt) {
          if (Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx < 0) this.player.moveLeft();
            else this.player.moveRight();
          } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
            if (dy < 0) this._activateManualBoost();
          }
        }
        e.preventDefault();
        return;
      }

      // Tap detection: short distance, quick tap
      if (dist < 15 && elapsed < 250) {
        if (this.state === "running" && !this.recoveryPrompt) {
          const half = window.innerWidth / 2;
          if (t.clientX < half) this.player.moveLeft();
          else this.player.moveRight();
        } else if (this.state === "running" && this.recoveryPrompt) {
          // ignore taps during recovery
        } else if (this.state === "paused") {
          this.state = "running";
          this.ui.showPause(false);
        }
      }
    }, { passive: false });
  }

  _checkBillboardHover() {
    if (this.state !== "running" || this.recoveryPrompt) {
      this.renderer.domElement.style.cursor = "";
      this._hoveredBillboard = null;
      return;
    }
    this._raycaster.setFromCamera(this._mouse, this.camera);
    const meshes = this.track.getBillboardMeshes();
    const hits = this._raycaster.intersectObjects(meshes, false);
    if (hits.length) {
      this._hoveredBillboard = hits[0].object.userData._billboardId || null;
      this.renderer.domElement.style.cursor = "pointer";
    } else {
      this._hoveredBillboard = null;
      this.renderer.domElement.style.cursor = "";
    }
  }

  _openBillboard(id) {
    this._activeBillboard = id;
    this.state = "billboard";
    this._bbZooming = true;
    this._bbOverlayShown = false;
    this._bbReturning = false;

    const bb = this.track.billboards[id];
    if (!bb) return;

    const pos = bb.position;
    const faceDir = pos.x < 0 ? 1 : -1;
    this._bbTargetPos.set(
      pos.x + faceDir * 4,
      pos.y + 8,
      pos.z + 10
    );
    this._bbTargetLook.set(pos.x, pos.y + 7.5, pos.z);
    this._bbCurrentLook.set(
      this.camera.position.x * 0.2,
      1.2,
      -2
    );

    const theme = LEVELS[this.currentLevel];
    const bbDef = theme && theme.billboards.find((b) => b.id === id);
    this._bbLabel = bbDef ? bbDef.label : id;
  }

  closeBillboard() {
    if (this._bbReturning) return;
    this.ui.showBillboard(false);
    this._bbReturning = true;
    this._bbOverlayShown = false;

    const px = this.player.mesh.position.x;
    this._bbTargetPos.set(px * 0.35, this.cameraBase.y, this.cameraBase.z);
    this._bbTargetLook.set(px * 0.2, 1.2, -2);
  }

  startFromMenu() {
    this._stopAttractMode();
    clearTimeout(this._gameOverTimer);
    this.resetRun();
    this.state = "running";
    this.ui.showMainMenu(false);
    this.ui.showGameOver(false);
    this.ui.showLevelComplete(false);
    this.ui.showPause(false);
    this.ui.showHud(true);
    this.ui.setStatus("Go!", 1500);
    play(SFX.START_RUN, 0.75);
    startLoop(ENGINE_LOOP, 0.2);
  }

  resetRun() {
    incrementTotalRuns();
    this._resetQuizFlags();
    this.quizMode = null;
    this.currentQuestion = null;
    this.quiz.resetPool();
    this.spawner.reset();
    this.spawner.levelId = this.currentLevel;
    this.runTime = 0;
    this.health = CONFIG.STARTING_HEALTH;
    this.score = 0;
    this.streak = 0;
    this.worldSpeed = CONFIG.BASE_SPEED;
    this.shield = false;
    this.player.setShieldActive(false);
    this.boostUntil = 0;
    this._boostStartedAt = 0;
    this.automationFlowUntil = 0;
    this.manualBoostUntil = 0;
    this.manualBoostCooldownUntil = 0;
    this.braking = false;
    this.obstaclesHit = 0;
    this.pickupsCollected = 0;
    this.sessionCorrect = 0;
    this.playbookCount = 0;
    this.playbookPts = 0;
    this.collectionCount = 0;
    this.collectionPts = 0;
    this.pickupSpeedMult = 1;
    this.recoveryPrompt = false;
    this.remediationsUsed = 0;
    this.timeScale = 1;
    this.comboCount = 0;
    this.comboTimer = 0;
    this._nearMissChecked.clear();
    this._runBoostCount = 0;
    this._runMaxCombo = 0;
    this._finishLineSpawned = false;
    this._finishing = false;
    this._finishCoastSpeed = 0;
    this._cleanupCelebration();
    this.track.removeFinishLine();
    this.player.targetLaneIndex = 1;
    this.player.laneIndex = 1;
    this.player.mesh.position.x = CONFIG.LANES[1];
    this.player.mesh.visible = true;
    this.player._curveX = 0;
  }

  resume() {
    this.state = "running";
    this.ui.showPause(false);
  }

  restartFromPause() {
    this.ui.showPause(false);
    this.startFromMenu();
  }

  backToMenu() {
    this.state = "main_menu";
    this.recoveryPrompt = false;
    this.timeScale = 1;
    this._activeBillboard = null;
    clearTimeout(this._gameOverTimer);
    this._cleanupCelebration();
    stopLoop();
    this.ui.showBillboard(false);
    this.ui.showGameOver(false);
    this.ui.showLevelComplete(false);
    this.ui.showPause(false);
    this.ui.showQuiz(false);
    this.ui.showRecovery(false, false);
    this.ui.showLevelSelect(false);
    this.ui.showDriverSelect(false);
    this.ui.showHud(false);
    this.ui.showMainMenu(true);
    this.ui.updateMenuBest(getBestScore());
    this._startAttractMode();
  }

  switchLevel(levelId, returnTo = "main_menu") {
    if (!LEVELS[levelId]) return;
    this.currentLevel = levelId;
    setLastLevel(levelId);

    this.track.dispose();
    this.track = new Track(this.scene, levelId);

    const theme = LEVELS[levelId];
    if (theme) {
      this.scene.background = new THREE.Color(theme.sceneBg);
      this.scene.fog = new THREE.Fog(theme.fog, 48, 175);
    }

    startBgm(theme.music || DEFAULT_BGM, 0.1);

    this.ui.setActiveLevel(levelId);
    this.backToMenu();
  }

  selectDriver(driverId) {
    const d = DRIVERS[driverId];
    if (!d) return;
    this.currentDriver = driverId;
    setLastDriver(driverId);
    this.player.swapCar(d.car);
    this.ui.setActiveDriver(driverId);
  }

  /**
   * Emergency un-stick: tears down whatever overlay is blocking and returns to running.
   * Bound to the persistent escape-hatch button in the bottom-right.
   */
  forceUnstick() {
    if (this.state === "main_menu" || this.state === "game_over") return;
    if (this.state === "billboard") { this.closeBillboard(); return; }
    this.recoveryPrompt = false;
    this.timeScale = 1;
    this._resetQuizFlags();
    this.quizMode = null;
    this.currentQuestion = null;
    this.ui.showQuiz(false);
    this.ui.showRecovery(false, false);
    this.ui.showPause(false);
    this.state = "running";
    this.ui.setStatus("Resumed — keep driving!", CONFIG.STATUS_MESSAGE_MS);
  }

  _answerQuiz(optionIndex) {
    if (
      this.state !== "quiz" ||
      this._quizPhase !== "question" ||
      !this.currentQuestion ||
      this._quizBusy
    ) {
      return;
    }
    this._quizBusy = true;
    this._quizPhase = "result";
    this.ui.stopQuizCountdown();
    const q = this.currentQuestion;
    const ok = this.quiz.isCorrect(q, optionIndex);
    this._lastAnswerCorrect = ok;

    if (ok) play(SFX.CORRECT, 0.8);
    else play(SFX.WRONG, 0.8);

    const { title, lines } = this._quizResultCopy(ok);

    if (!ok) {
      const correctText = q.options[q.answer];
      lines.push(`Correct answer: ${correctText}`);
    }

    this.ui.showQuizResult(ok, title, lines, q.explanation);

    const displayMs = ok ? CONFIG.QUIZ_RESULT_DISPLAY_MS : 3000;
    if (!ok) {
      this.ui.startResultCountdown(3);
    }
    clearTimeout(this._quizResultTimer);
    this._quizResultTimer = setTimeout(() => {
      this._dismissResult(ok);
    }, displayMs);
  }

  /**
   * Reward copy shown on result screen (gameplay still paused until _finishQuiz).
   */
  _quizResultCopy(ok) {
    const mode = this.quizMode;
    const fm = this._flowMult();
    const lines = [];

    if (mode === "boost") {
      if (ok) {
        const pts = Math.floor(CONFIG.BOOST_QUIZ_CORRECT * fm);
        const nextStreak = this.streak + 1;
        lines.push(
          `${CONFIG.BOOST_DURATION}s speed boost — you move forward faster (watch the Speed readout)`
        );
        lines.push(`+${pts} score${fm > 1 ? " (Automation Flow ×1.2 applied)" : ""}`);
        lines.push(`Streak → ${nextStreak} (3 correct triggers Automation Flow)`);
        if (nextStreak >= CONFIG.STREAK_FOR_FLOW) {
          lines.push(
            "Next: Automation Flow — 8s score ×1.2 + pickup magnet + glow"
          );
        }
        return { title: "CORRECT!", lines };
      }
      const cons = Math.floor(CONFIG.BOOST_QUIZ_WRONG * fm);
      lines.push(`+${cons} consolation score only`);
      lines.push("No speed boost this time");
      lines.push("Streak reset to 0");
      return { title: "WRONG", lines };
    }

    if (mode === "recovery") {
      if (ok) {
        const nextStreak = this.streak + CONFIG.REMEDIATION_CORRECT_STREAK;
        lines.push(`+${CONFIG.REMEDIATION_RESTORE} health (toward max 100)`);
        lines.push(`Streak → ${nextStreak}`);
        if (nextStreak >= CONFIG.STREAK_FOR_FLOW) {
          lines.push(
            "Automation Flow will trigger — 8s score ×1.2 + pickup magnet"
          );
        }
        return { title: "CORRECT!", lines };
      }
      const after = this.health - CONFIG.REMEDIATION_WRONG_PENALTY;
      lines.push(`−${CONFIG.REMEDIATION_WRONG_PENALTY} health`);
      lines.push("Streak reset to 0");
      if (after <= 0) {
        lines.push("Health at 0 — run ends after this screen");
      }
      return { title: "WRONG", lines };
    }

    return { title: ok ? "CORRECT!" : "WRONG", lines };
  }

  _dismissResult(ok) {
    clearTimeout(this._quizResultTimer);
    this.ui.stopResultCountdown();
    this._finishQuiz(ok);
    this._quizBusy = false;
    this._quizPhase = "question";
    clearTimeout(this._quizSafetyTimer);
  }

  _finishQuiz(correct) {
    const mode = this.quizMode;
    this.ui.showQuiz(false);
    this.state = "running";
    this.quizMode = null;
    this.currentQuestion = null;
    this.timeScale = 1;

    if (mode === "boost") {
      if (correct) {
        this.streak += 1;
        this.score += CONFIG.BOOST_QUIZ_CORRECT * this._flowMult();
        this.sessionCorrect += 1;
        addTotalCorrectAnswers(1);
        const now = performance.now();
        const stacking = now < this.boostUntil;
        const base = stacking ? this.boostUntil : now;
        if (!stacking) this._boostStartedAt = now;
        this.boostUntil = base + CONFIG.BOOST_DURATION * 1000;
        this._runBoostCount += 1;
        play(SFX.BOOST_WHOOSH, 0.85);
        this.ui.setStatus(
          stacking ? "Boost extended! Keep it going!" : "Correct: Speed Boost",
          CONFIG.STATUS_MESSAGE_MS
        );
        this._checkStreakAutomation();
      } else {
        this.streak = 0;
        this.score += CONFIG.BOOST_QUIZ_WRONG * this._flowMult();
        this.ui.setStatus("Wrong answer", CONFIG.STATUS_MESSAGE_MS);
      }
    } else if (mode === "recovery") {
      this.remediationsUsed += 1;
      const left = CONFIG.MAX_REMEDIATIONS - this.remediationsUsed;
      if (correct) {
        this.health = Math.min(
          CONFIG.STARTING_HEALTH,
          this.health + CONFIG.REMEDIATION_RESTORE
        );
        this.streak += CONFIG.REMEDIATION_CORRECT_STREAK;
        this.sessionCorrect += 1;
        addTotalCorrectAnswers(1);
        this.ui.setStatus(
          `Health restored! (${left} remediation${left !== 1 ? "s" : ""} left)`,
          CONFIG.STATUS_MESSAGE_MS
        );
        this._checkStreakAutomation();
      } else {
        this.streak = 0;
        this.health -= CONFIG.REMEDIATION_WRONG_PENALTY;
        this.ui.setStatus(
          `Remediation failed (${left} left)`,
          CONFIG.STATUS_MESSAGE_MS
        );
        if (this.health <= 0) {
          this._gameOver();
          return;
        }
      }
    }
  }

  _checkStreakAutomation() {
    if (this.streak >= CONFIG.STREAK_FOR_FLOW) {
      this.streak = 0;
      this.automationFlowUntil = performance.now() + CONFIG.FLOW_DURATION * 1000;
      this.player.setAutomationFlowActive(true);
      this.ui.setStatus("Automation Flow active", CONFIG.STATUS_MESSAGE_MS);
    }
  }

  _flowMult() {
    const now = performance.now();
    const flow =
      now < this.automationFlowUntil ? CONFIG.FLOW_SCORE_MULT : 1;
    return flow;
  }

  _activateManualBoost() {
    const now = performance.now();
    if (now < this.manualBoostCooldownUntil) return;
    if (now < this.manualBoostUntil) return;
    this.manualBoostUntil = now + CONFIG.MANUAL_BOOST_DURATION * 1000;
    this.manualBoostCooldownUntil =
      this.manualBoostUntil + CONFIG.MANUAL_BOOST_COOLDOWN * 1000;
    play(SFX.BOOST_WHOOSH, 0.6);
    this.ui.setStatus("Manual boost!", CONFIG.STATUS_MESSAGE_MS);
  }

  _manualBoostHud(now) {
    if (now < this.manualBoostUntil) {
      const total = CONFIG.MANUAL_BOOST_DURATION * 1000;
      const rem = this.manualBoostUntil - now;
      return { mbState: "active", mbProgress: rem / total };
    }
    if (now < this.manualBoostCooldownUntil) {
      const cdTotal = CONFIG.MANUAL_BOOST_COOLDOWN * 1000;
      const elapsed = now - this.manualBoostUntil;
      return { mbState: "cooldown", mbProgress: elapsed / cdTotal };
    }
    return { mbState: "ready", mbProgress: 1 };
  }

  _gameOver() {
    this.state = "game_over";
    this.timeScale = 1;
    this.recoveryPrompt = false;
    this.braking = false;
    this.ui.showRecovery(false, false);
    this.player.setAutomationFlowActive(false);
    this.player.explode();
    stopLoop();
    play(SFX.GAME_OVER, 0.8);
    setBestScoreIfHigher(this.score);
    this.ui.setGameOverStats({
      score: this.score,
      hits: this.obstaclesHit,
      pickups: this.pickupsCollected,
      correct: this.sessionCorrect,
    });
    this.ui.resetGameOver(getLastName(), getLastCountry());
    this.ui.showHud(false);
    this.ui.showGameOver(true);

    clearTimeout(this._gameOverTimer);
    this._gameOverTimer = setTimeout(() => {
      if (this.state === "game_over") {
        this.backToMenu();
      }
    }, 30000);
  }

  _levelComplete() {
    this.state = "level_complete";
    this.timeScale = 1;
    this.recoveryPrompt = false;
    this.braking = false;
    this.ui.showRecovery(false, false);
    this.player.setAutomationFlowActive(false);
    stopLoop();
    play(SFX.CORRECT, 0.9);
    play(SFX.CROWD_CHEERS, 0.7);

    const finishBonus = 5000;
    this.score += finishBonus;
    setBestScoreIfHigher(this.score);

    this._orbitStartTime = performance.now();
    this._orbitCenter = this.player.mesh.position.clone();
    this._spawnCelebration(this._orbitCenter);

    const isCheater = this._isSemiTruck();
    this.ui.setLevelCompleteStats({
      score: this.score,
      hits: this.obstaclesHit,
      pickups: this.pickupsCollected,
      correct: this.sessionCorrect,
      finishBonus,
    }, isCheater);
    if (!isCheater) {
      this.ui.resetLevelComplete(getLastName(), getLastCountry());
    }
    this.ui.showHud(false);

    // Brief camera orbit before showing the overlay
    this._lcOverlayShown = false;
  }

  async saveLcScore() {
    if (this._isSemiTruck()) {
      this.ui.setStatus("Nice try, but you can't set a high score as Andrius. Too easy!", 4000);
      return;
    }
    const name = this.ui.getLcEnteredName() || "AAA";
    const country = this.ui.getLcSelectedCountry() || "US";
    setLastName(name);
    setLastCountry(country);
    const { rank, board } = addLeaderboardEntry(name, this.score, country, this.currentLevel);
    await submitGlobalScore(name, this.score, this.currentLevel, country);
    this.ui.showLcLeaderboard(board, rank, name, this.score);
  }

  async saveScore() {
    if (this._isSemiTruck()) {
      this.ui.setStatus("Nice try, but you can't set a high score as Andrius. Too easy!", 4000);
      return;
    }
    const name = this.ui.getEnteredName() || "AAA";
    const country = this.ui.getSelectedCountry() || "US";
    setLastName(name);
    setLastCountry(country);
    const { rank, board } = addLeaderboardEntry(name, this.score, country, this.currentLevel);
    await submitGlobalScore(name, this.score, this.currentLevel, country);
    this.ui.showLeaderboard(board, rank, name, this.score);
  }

  /** Recovery prompt */
  onRecoveryYes() {
    if (!this.recoveryPrompt) return;
    markRecoveryTipSeen();
    this.recoveryPrompt = false;
    this._resetQuizFlags();
    this.ui.showRecovery(false, false);
    this.currentQuestion = this.quiz.nextQuestion();
    this.quizMode = "recovery";
    this.state = "quiz";
    this._quizPhase = "question";
    this.ui.renderQuizQuestion(this.currentQuestion);
    this.ui.showQuiz(true);
    this.ui.startQuizCountdown(() => this.skipQuiz());
    this._startQuizSafetyTimer();
  }

  onRecoveryNo() {
    if (!this.recoveryPrompt) return;
    markRecoveryTipSeen();
    this.remediationsUsed += 1;
    this.recoveryPrompt = false;
    this.ui.showRecovery(false, false);
    this.timeScale = 1;
    const left = CONFIG.MAX_REMEDIATIONS - this.remediationsUsed;
    this.ui.setStatus(
      `Skipped remediation (${left} remaining). Keep driving!`,
      CONFIG.STATUS_HIT_MS
    );
  }

  _openBoostQuiz() {
    this._resetQuizFlags();
    this.currentQuestion = this.quiz.nextQuestion();
    this.quizMode = "boost";
    this.state = "quiz";
    this._quizPhase = "question";
    this.ui.renderQuizQuestion(this.currentQuestion);
    this.ui.showQuiz(true);
    this.ui.setStatus(
      "Pickup: Boost token — highway paused for skill quiz",
      CONFIG.STATUS_HIT_MS
    );
    this.ui.startQuizCountdown(() => this.skipQuiz());
    this._startQuizSafetyTimer();
  }

  devSkipToFinish() {
    if (this.state !== "running") return;
    const dur = CONFIG.LEVEL_DURATION;
    this.runTime = Math.max(this.runTime, dur - 10);
    this.ui.setStatus("Dev: skipped to last 10 seconds", 2000);
  }

  skipQuiz() {
    if (this.state !== "quiz" || this._quizPhase !== "question") return;
    play(SFX.WRONG, 0.8);
    this.ui.stopQuizCountdown();
    this.ui.showQuiz(false);
    this.state = "running";
    this.quizMode = null;
    this.currentQuestion = null;
    this.timeScale = 1;
    this._resetQuizFlags();
    this.ui.setStatus("Quiz skipped — no boost, no penalty.", CONFIG.STATUS_MESSAGE_MS);
  }

  _resetQuizFlags() {
    this._quizBusy = false;
    this._quizPhase = "question";
    clearTimeout(this._quizResultTimer);
    clearTimeout(this._quizSafetyTimer);
    this.ui.stopResultCountdown();
  }

  _startQuizSafetyTimer() {
    clearTimeout(this._quizSafetyTimer);
    this._quizSafetyTimer = setTimeout(() => {
      if (this.state === "quiz") {
        this.forceUnstick();
      }
    }, 30000);
  }

  update() {
    const now = performance.now();
    let dt = Math.min(0.05, (now - this._lastTs) / 1000);
    this._lastTs = now;

    if (this.state === "boot") {
      this._updateCamera(dt, now);
      return;
    }

    if (this.state === "main_menu") {
      if (this._attractActive) {
        this._updateAttract(dt, now);
      }
      this._updateCamera(dt, now);
      return;
    }

    if (this.state === "paused" || this.state === "game_over") {
      this._updateCamera(dt, now);
      return;
    }

    if (this.state === "level_complete") {
      this._updateOrbitCamera(dt, now);
      this._updateCelebration(dt, now);
      if (!this._lcOverlayShown && now - this._orbitStartTime > 3000) {
        this._lcOverlayShown = true;
        this.ui.showLevelComplete(true);
      }
      if (now - this._orbitStartTime > 30000) {
        this.backToMenu();
      }
      return;
    }

    if (this.state === "billboard") {
      this._updateBillboardCamera(dt);
      return;
    }

    // Full pause during skill checks — no movement, spawns, collisions, or score clock
    if (this.state === "quiz") {
      this._updateCamera(0, now);
      this._refreshHudOnly(now);
      return;
    }

    const ts = this.recoveryPrompt ? 0 : 1;
    const effDt = dt * ts;

    if (this.state === "running") {
      this._updateRun(effDt, now, dt, ts);
    }

    this._updateCamera(dt, now);
  }

  _refreshHudOnly(now) {
    const ramp = Math.min(
      CONFIG.MAX_SPEED_MULT,
      1 + this.runTime * CONFIG.SPEED_RAMP * 0.02
    );
    let speedMult = ramp * this.pickupSpeedMult;
    if (now < this.boostUntil) {
      speedMult *= CONFIG.BOOST_SPEED_MULT;
    }
    const driverMult = (DRIVERS[this.currentDriver] || {}).speedMult || 1;
    const ws = CONFIG.BASE_SPEED * speedMult * driverMult;
    const flowActive = now < this.automationFlowUntil;
    const { mbState, mbProgress } = this._manualBoostHud(now);
    this.ui.updateHud({
      health: this.health,
      score: this.score,
      speed: ws,
      streak: this.streak,
      shield: this.shield,
      automationFlow: flowActive,
      boostRemaining: Math.max(0, this.boostUntil - now),
      boostTotal: this.boostUntil > this._boostStartedAt ? this.boostUntil - this._boostStartedAt : CONFIG.BOOST_DURATION * 1000,
      playbooks: this.playbookCount,
      playbookPts: this.playbookPts,
      collections: this.collectionCount,
      collectionPts: this.collectionPts,
      mbState,
      mbProgress,
      braking: this.braking,
      remediationsUsed: this.remediationsUsed,
      maxRemediations: CONFIG.MAX_REMEDIATIONS,
      finishProgress: this.runTime / CONFIG.LEVEL_DURATION,
      finishTimeLeft: CONFIG.LEVEL_DURATION - this.runTime,
    });
  }

  _updateRun(effDt, now, rawDt, spawnScale) {
    this.runTime += effDt;

    const dur = CONFIG.LEVEL_DURATION;
    const warnTime = dur - 10;
    if (this.runTime >= warnTime && !this._finishLineSpawned) {
      this._finishLineSpawned = true;
      const timeLeft = dur - this.runTime;
      this.track.spawnFinishLine(this.player.mesh.position.z, this.worldSpeed, timeLeft);
      this.ui.setStatus("Checkered flag ahead — finish is near!", 3000);
    }

    const finishZ = this.track.getFinishZ();
    if (!this._finishing && this._finishLineSpawned && finishZ !== null && finishZ >= this.player.mesh.position.z) {
      this._finishing = true;
      this._finishCoastSpeed = this.worldSpeed;
      this.spawner.reset();
    }

    if (this._finishing) {
      this._finishCoastSpeed *= Math.pow(0.15, effDt);
      this.worldSpeed = this._finishCoastSpeed;
      this.track.update(effDt, this._finishCoastSpeed);
      this.spawner.update(rawDt, this._finishCoastSpeed, this.runTime, 0);
      this.player.update(effDt);
      this._updateCamera(effDt, now);
      if (this._finishCoastSpeed < 1.5) {
        this._levelComplete();
      }
      return;
    }

    this.track.update(effDt, this.worldSpeed);

    if (this.runTime >= dur + 15) {
      this._levelComplete();
      return;
    }

    const ramp = Math.min(
      CONFIG.MAX_SPEED_MULT,
      1 + this.runTime * CONFIG.SPEED_RAMP * 0.02
    );
    let speedMult = ramp;

    speedMult *= this.pickupSpeedMult;

    if (now < this.boostUntil) {
      speedMult *= CONFIG.BOOST_SPEED_MULT;
    }

    if (now < this.manualBoostUntil) {
      speedMult *= CONFIG.MANUAL_BOOST_MULT;
    }

    if (this.braking && this.state === "running") {
      speedMult *= CONFIG.BRAKE_SPEED_MULT;
    }

    const driverMult = (DRIVERS[this.currentDriver] || {}).speedMult || 1;
    const ws = CONFIG.BASE_SPEED * speedMult * driverMult;
    this.worldSpeed = ws;

    const flowActive = now < this.automationFlowUntil;
    this.player.setAutomationFlowActive(flowActive);

    const fm = flowActive ? CONFIG.FLOW_SCORE_MULT : 1;
    this.score +=
      (CONFIG.SCORE_PER_SECOND * fm + CONFIG.SCORE_PER_UNIT_DISTANCE * ws * fm) *
      effDt;

    // Strip curve offsets before game logic so collision uses straight positions
    this._stripCurve();

    if (flowActive) {
      this.spawner.applyMagnet(
        this.player.mesh.position.x,
        CONFIG.FLOW_MAGNET,
        effDt
      );
    }

    const scale = this.recoveryPrompt ? 0 : spawnScale;
    this.spawner.update(rawDt, ws, this.runTime, scale);

    this.player.update(effDt);

    // Combo timer countdown
    if (this.comboTimer > 0) {
      this.comboTimer -= effDt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.comboTimer = 0;
        this.ui.showCombo(0);
      }
    }

    const entities = this.spawner.getAllCollidable();
    const hits = this.collision.testEntities(entities);
    const obstacleHits = hits.filter((h) => h.entity.kind === "obstacle");
    const rivalHits = hits.filter((h) => h.entity.kind === "rival");
    const pickupHits = hits.filter((h) => h.entity.kind === "pickup");

    if (obstacleHits.length && !this.recoveryPrompt) {
      this._onHitObstacle(obstacleHits[0].entity);
    } else if (rivalHits.length && !this.recoveryPrompt) {
      this._onHitRival(rivalHits[0].entity);
    } else if (pickupHits.length && !this.recoveryPrompt) {
      this._onPickup(pickupHits[0].entity);
    }

    // Near-miss detection
    this._checkNearMisses(entities);

    // Achievement check (periodic, not every frame)
    this._achievementClock = (this._achievementClock || 0) + effDt;
    if (this._achievementClock > 1) {
      this._achievementClock = 0;
      this._checkAchievements();
    }

    // Speed tier FOV
    this._updateSpeedFov(ws);

    // Re-apply curve offsets for rendering
    this._applyCurve();

    const { mbState, mbProgress } = this._manualBoostHud(now);
    this.ui.updateHud({
      health: this.health,
      score: this.score,
      speed: ws,
      streak: this.streak,
      shield: this.shield,
      automationFlow: flowActive,
      boostRemaining: Math.max(0, this.boostUntil - now),
      boostTotal: this.boostUntil > this._boostStartedAt ? this.boostUntil - this._boostStartedAt : CONFIG.BOOST_DURATION * 1000,
      playbooks: this.playbookCount,
      playbookPts: this.playbookPts,
      collections: this.collectionCount,
      collectionPts: this.collectionPts,
      mbState,
      mbProgress,
      braking: this.braking,
      comboCount: this.comboCount,
      comboTimer: this.comboTimer,
      remediationsUsed: this.remediationsUsed,
      maxRemediations: CONFIG.MAX_REMEDIATIONS,
      finishProgress: this.runTime / CONFIG.LEVEL_DURATION,
      finishTimeLeft: CONFIG.LEVEL_DURATION - this.runTime,
    });
  }

  _isSemiTruck() {
    const d = DRIVERS[this.currentDriver];
    return d && d.car === "semi_truck";
  }

  _onHitObstacle(e) {
    if (this._isSemiTruck()) {
      this.spawner.explodeObstacle(e);
      play(SFX.OBSTACLE_HIT, 0.6);
      this.ui.shake();
      this.shakeUntil = performance.now() + 100;
      this.shakeAmp = 0.15;
      this.ui.setStatus("Smashed right through it!", 1200);
      return;
    }
    const isGator = e.subtype === "GATOR";
    if (this.shield) {
      this.spawner.explodeObstacle(e);
      this.shield = false;
      this.player.setShieldActive(false);
      play(SFX.SHIELD_HIT, 0.7);
      this.ui.setStatus(
        isGator ? "Gator smashed -- shield blocked it!" : "Obstacle hit -- shield blocked it! (Shield used up)",
        CONFIG.STATUS_HIT_MS
      );
      return;
    }
    this.spawner.explodeObstacle(e);

    const dmg = CONFIG.OBSTACLE_DAMAGE;
    this.health -= dmg;
    this.obstaclesHit += 1;
    play(SFX.OBSTACLE_HIT, 0.8);
    this.ui.flashDamage();
    this.ui.showDamagePopup(dmg);
    this.ui.shake();
    this.shakeUntil = performance.now() + (isGator ? 300 : 200);
    this.shakeAmp = isGator ? 0.45 : 0.35;
    this.ui.setStatus(
      isGator
        ? `Gator attack! -${dmg} health. You're at ${Math.max(0, Math.floor(this.health))}.`
        : `Obstacle hit! -${dmg} health (Outage). You're at ${Math.max(0, Math.floor(this.health))}.`,
      CONFIG.STATUS_HIT_MS
    );

    if (this.health <= 0) {
      this._gameOver();
      return;
    }

    if (this.quizEnabled && this.remediationsUsed < CONFIG.MAX_REMEDIATIONS) {
      this.recoveryPrompt = true;
      const showTip = !hasSeenRecoveryTip();
      this.ui.showRecovery(true, showTip, () => {
        play(SFX.WRONG, 0.8);
        this.onRecoveryNo();
      });
    }
  }

  _onHitRival(e) {
    if (this._isSemiTruck()) {
      this.spawner.explodeRival(e);
      play(SFX.OBSTACLE_HIT, 0.6);
      this.ui.shake();
      this.shakeUntil = performance.now() + 100;
      this.shakeAmp = 0.15;
      this.ui.setStatus("Plowed right through!", 1200);
      return;
    }
    const isBus = e.subtype === "SCHOOL_BUS";
    this.spawner.explodeRival(e);
    if (this.shield) {
      this.shield = false;
      this.player.setShieldActive(false);
      play(SFX.SHIELD_HIT, 0.7);
      this.ui.setStatus(
        isBus ? "School bus hit — shield absorbed the crash!" : "Rival car hit — shield absorbed the crash!",
        CONFIG.STATUS_HIT_MS
      );
      return;
    }

    const dmg = isBus ? CONFIG.BUS_DAMAGE : CONFIG.OBSTACLE_DAMAGE;
    this.health -= dmg;
    this.obstaclesHit += 1;
    play(SFX.OBSTACLE_HIT, 0.8);
    this.ui.flashDamage();
    this.ui.showDamagePopup(dmg);
    this.ui.shake();
    this.shakeUntil = performance.now() + (isBus ? 350 : 200);
    this.shakeAmp = isBus ? 0.5 : 0.35;
    this.ui.setStatus(
      isBus
        ? `School bus crash! −${dmg} health. You're at ${Math.max(0, Math.floor(this.health))}.`
        : `Rival car crash! −${dmg} health. You're at ${Math.max(0, Math.floor(this.health))}.`,
      CONFIG.STATUS_HIT_MS
    );

    if (this.health <= 0) {
      this._gameOver();
      return;
    }

    if (this.quizEnabled && this.remediationsUsed < CONFIG.MAX_REMEDIATIONS) {
      this.recoveryPrompt = true;
      const showTip = !hasSeenRecoveryTip();
      this.ui.showRecovery(true, showTip, () => {
        play(SFX.WRONG, 0.8);
        this.onRecoveryNo();
      });
    }
  }

  _onPickup(e) {
    const t = e.subtype;
    this.spawner.removeEntity(e);
    this.pickupsCollected += 1;

    if (t !== "POLICY_SHIELD") play(SFX.PICKUP, 0.6);

    // Combo multiplier
    const isScoring = t === "PLAYBOOK" || t === "CERTIFIED_COLLECTION";
    let comboMult = 1;
    if (isScoring) {
      if (this.comboTimer > 0) {
        this.comboCount += 1;
      } else {
        this.comboCount = 1;
      }
      this.comboTimer = CONFIG.COMBO_WINDOW;
      comboMult = this.comboCount;
      if (this.comboCount > this._runMaxCombo) this._runMaxCombo = this.comboCount;
      if (this.comboCount >= 2) {
        this.ui.showCombo(this.comboCount);
      }
    }

    if (t === "PLAYBOOK") {
      const base = Math.floor(CONFIG.PICKUP_SCORE.PLAYBOOK * this._flowMult());
      const pts = base * comboMult;
      this.score += pts;
      this.playbookCount += 1;
      this.playbookPts += pts;
      const extended = this._extendBoostOnPickup();
      let label = comboMult > 1 ? `Playbook +${pts} (x${comboMult})` : `Playbook +${pts}`;
      if (extended) label += " ⚡+boost";
      this.ui.showPickupPopup(label);
      if (this.playbookCount % 3 === 0) {
        this._applyPickupSpeedUp("Playbook", this.playbookCount);
      } else {
        this.ui.setStatus(`Pickup: Playbook — +${pts} score`, CONFIG.STATUS_HIT_MS);
      }
    } else if (t === "CERTIFIED_COLLECTION") {
      const base = Math.floor(CONFIG.PICKUP_SCORE.COLLECTION * this._flowMult());
      const pts = base * comboMult;
      this.score += pts;
      this.collectionCount += 1;
      this.collectionPts += pts;
      const extended = this._extendBoostOnPickup();
      let label = comboMult > 1 ? `Collection +${pts} (x${comboMult})` : `Collection +${pts}`;
      if (extended) label += " ⚡+boost";
      this.ui.showPickupPopup(label);
      if (this.collectionCount % 3 === 0) {
        this._applyPickupSpeedUp("Collection", this.collectionCount);
      } else {
        this.ui.setStatus(`Pickup: Certified Collection — +${pts} score`, CONFIG.STATUS_HIT_MS);
      }
    } else if (t === "POLICY_SHIELD") {
      if (this._isSemiTruck()) {
        this.score += 50;
        this.ui.showPickupPopup("+50");
        this.ui.setStatus("Shield? You ARE the shield. +50 score", CONFIG.STATUS_HIT_MS);
      } else {
        this.shield = true;
        this.player.setShieldActive(true);
        play(SFX.SHIELD_ON, 0.75);
        this.ui.showPickupPopup("Shield Active!");
        this.ui.setStatus(
          "Pickup: Policy Shield — next obstacle hit won’t cost health",
          CONFIG.STATUS_HIT_MS
        );
      }
    } else if (t === "BOOST_TOKEN") {
      if (this.quizEnabled) {
        this._openBoostQuiz();
      } else {
        const now = performance.now();
        const stacking = now < this.boostUntil;
        const base = stacking ? this.boostUntil : now;
        if (!stacking) this._boostStartedAt = now;
        this.boostUntil = base + CONFIG.BOOST_DURATION * 1000;
        this._runBoostCount += 1;
        play(SFX.BOOST_WHOOSH, 0.85);
        this.ui.showPickupPopup(stacking ? "Boost Extended!" : "Speed Boost!");
        this.ui.setStatus("Boost token: Speed Boost!", CONFIG.STATUS_MESSAGE_MS);
      }
    }
  }

  _extendBoostOnPickup() {
    const now = performance.now();
    if (now >= this.boostUntil) return false;
    this.boostUntil += CONFIG.BOOST_EXTEND_ON_PICKUP * 1000;
    return true;
  }

  _applyPickupSpeedUp(type, count) {
    this.pickupSpeedMult += 0.15;
    const pct = Math.round((this.pickupSpeedMult - 1) * 100);
    this.ui.setStatus(
      `${count} ${type}s collected! Speed +15% (total +${pct}%)`,
      CONFIG.STATUS_HIT_MS
    );
  }

  // Near-miss detection
  _nearMissCount = 0;

  _checkNearMisses(entities) {
    const px = this.player.mesh.position.x;
    const pz = this.player.mesh.position.z;
    const margin = CONFIG.NEAR_MISS_MARGIN;

    for (const e of entities) {
      if (e.kind !== "obstacle" && e.kind !== "rival") continue;
      if (!e.active) continue;
      const eid = e.mesh.uuid;
      if (this._nearMissChecked.has(eid)) continue;

      const ez = e.mesh.position.z;
      // Entity just passed the player (moved behind)
      if (ez > pz + 1 && ez < pz + 4) {
        const dx = Math.abs(e.mesh.position.x - px);
        if (dx < margin + 1.2 && dx > 0.3) {
          this._nearMissChecked.add(eid);
          this._nearMissCount += 1;
          this.score += CONFIG.NEAR_MISS_BONUS;
          this.ui.showPickupPopup(`CLOSE CALL! +${CONFIG.NEAR_MISS_BONUS}`);
          this._checkAchievements();
        } else {
          // Mark as checked once past to avoid repeat checks
          if (ez > pz + 3) this._nearMissChecked.add(eid);
        }
      }
    }
  }

  // Achievement checking
  _checkAchievements() {
    const checks = [
      { id: "score_10k", test: () => this.score >= 10000 },
      { id: "score_50k", test: () => this.score >= 50000 },
      { id: "combo_5", test: () => this._runMaxCombo >= 5 },
      { id: "combo_10", test: () => this._runMaxCombo >= 10 },
      { id: "streak_5", test: () => this.streak >= 5 },
      { id: "boost_5", test: () => this._runBoostCount >= 5 },
      { id: "playbooks_20", test: () => this.playbookCount >= 20 },
      { id: "collections_15", test: () => this.collectionCount >= 15 },
      { id: "survive_60", test: () => this.runTime >= 60 },
      { id: "survive_120", test: () => this.runTime >= 120 },
      { id: "near_miss_10", test: () => this._nearMissCount >= 10 },
      { id: "no_damage", test: () => this.score >= 5000 && this.obstaclesHit === 0 },
    ];
    for (const c of checks) {
      if (this._achievements[c.id]) continue;
      if (c.test()) {
        const unlocked = unlockAchievement(c.id);
        if (unlocked) {
          this._achievements[c.id] = Date.now();
          const def = ACHIEVEMENT_DEFS.find((d) => d.id === c.id);
          if (def) this.ui.showAchievement(def.name, def.desc);
        }
      }
    }
  }

  // Speed tier FOV
  _updateSpeedFov(ws) {
    const ratio = ws / CONFIG.BASE_SPEED;
    const targetFov = this._baseFov + Math.min(12, (ratio - 1) * 10);
    this.camera.fov += (targetFov - this.camera.fov) * 0.05;
    this.camera.updateProjectionMatrix();
  }

  _updateBillboardCamera(dt) {
    const lerpSpeed = dt * 2.0;
    this.camera.position.lerp(this._bbTargetPos, lerpSpeed);
    this._bbCurrentLook.lerp(this._bbTargetLook, lerpSpeed);
    this.camera.lookAt(this._bbCurrentLook);

    const dist = this.camera.position.distanceTo(this._bbTargetPos);

    if (!this._bbReturning && !this._bbOverlayShown && dist < 3) {
      this._bbOverlayShown = true;
      this.ui.showBillboard(true, this._bbLabel);
    }

    if (this._bbReturning && dist < 1.5) {
      this._activeBillboard = null;
      this._bbZooming = false;
      this._bbReturning = false;
      this.state = "running";
      this.renderer.domElement.style.cursor = "";
    }
  }

  _stripCurve() {
    if (!this.track._curve) return;
    const p = this.player;
    p.mesh.position.x -= p._curveX || 0;
    p._curveX = 0;
    for (const e of this.spawner.getAllCollidable()) {
      e.mesh.position.x -= e._curveX || 0;
      e._curveX = 0;
    }
  }

  _applyCurve() {
    if (!this.track._curve) return;
    const p = this.player;
    const pcx = this.track.getCurveX(p.mesh.position.z);
    p._curveX = pcx;
    p.mesh.position.x += pcx;

    for (const e of this.spawner.getAllCollidable()) {
      const ecx = this.track.getCurveX(e.mesh.position.z);
      e._curveX = ecx;
      e.mesh.position.x += ecx;
    }
  }

  // ── Attract mode (demo play behind main menu) ──

  _startAttractMode() {
    this._attractActive = true;
    this._attractDodgeTimer = 0;
    this.spawner.reset();
    this.player.mesh.visible = true;
    this.player.targetLaneIndex = 1;
    this.player.laneIndex = 1;
    this.player.mesh.position.set(CONFIG.LANES[1], CONFIG.PLAYER_Y, 0);
    this.player._curveX = 0;
    this._attractSpeed = CONFIG.BASE_SPEED * 0.85;

    this._attractScoreShowing = false;
    this.ui.showAttractScores(false);
    clearInterval(this._attractScoreFlashTimer);
    this._attractScoreFlashTimer = setInterval(() => {
      if (!this._attractActive || this.state !== "main_menu") return;
      if (this.ui.isDriverSelectVisible()) return;
      this._attractScoreShowing = true;
      this.ui.showAttractScores(true);
      setTimeout(() => {
        this._attractScoreShowing = false;
        this.ui.showAttractScores(false);
      }, 10000);
    }, 30000);
  }

  _stopAttractMode() {
    this._attractActive = false;
    this.spawner.reset();
    this.ui.showAttractScores(false);
    clearInterval(this._attractScoreFlashTimer);
    this._attractScoreFlashTimer = null;
  }

  _updateAttract(dt, now) {
    this.track.update(dt, this._attractSpeed);
    this.spawner.update(dt, this._attractSpeed, 15, 1);

    // AI dodge logic — look ahead for obstacles and switch lanes
    this._attractDodgeTimer -= dt;
    if (this._attractDodgeTimer <= 0) {
      this._attractDodgeTimer = 0.25;
      const lane = this.player.targetLaneIndex;
      const blocked = [false, false, false];
      for (const o of this.spawner.obstacles) {
        if (!o.active) continue;
        const dz = o.mesh.position.z - this.player.mesh.position.z;
        if (dz > -35 && dz < -5) {
          blocked[o.lane] = true;
        }
      }
      for (const r of this.spawner.rivals) {
        if (!r.active) continue;
        const dz = r.mesh.position.z - this.player.mesh.position.z;
        if (dz > -25 && dz < -3) {
          blocked[r.targetLane] = true;
        }
      }
      if (blocked[lane]) {
        const adj = [0, 1, 2].filter((l) => !blocked[l] && Math.abs(l - lane) === 1);
        const any = [0, 1, 2].filter((l) => !blocked[l]);
        const pick = adj.length > 0 ? adj : any;
        if (pick.length > 0) {
          this.player.targetLaneIndex = pick[Math.floor(Math.random() * pick.length)];
        }
      } else if (Math.random() < 0.03) {
        // Occasional random lane change for visual interest
        const dir = Math.random() < 0.5 ? -1 : 1;
        const nl = lane + dir;
        if (nl >= 0 && nl <= 2) this.player.targetLaneIndex = nl;
      }
    }

    this.player.update(dt);

    // Auto-collect pickups (pass through them), remove obstacles that pass the player
    const entities = this.spawner.getAllCollidable();
    for (const e of entities) {
      if (e.mesh.position.z > CONFIG.DESPAWN_Z) {
        this.spawner.removeEntity(e);
      }
    }
  }

  _updateOrbitCamera(dt, now) {
    const elapsed = (now - this._orbitStartTime) / 1000;
    const angle = elapsed * 0.5;
    const radius = 8;
    const height = 4;
    const center = this._orbitCenter;
    this.camera.position.set(
      center.x + Math.sin(angle) * radius,
      center.y + height + Math.sin(elapsed * 0.3) * 0.5,
      center.z + Math.cos(angle) * radius
    );
    this.camera.lookAt(center.x, center.y + 1.2, center.z);
  }

  // ── Celebration crowd + confetti ──

  _buildCheeringPerson(shirtColor) {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xf4c18a });
    const shirt = new THREE.MeshStandardMaterial({ color: shirtColor });
    const pants = new THREE.MeshStandardMaterial({ color: 0x334466 });
    const shoe = new THREE.MeshStandardMaterial({ color: 0x222222 });

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), skin);
    head.position.y = 1.55;
    g.add(head);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.22), shirt);
    torso.position.y = 1.1;
    g.add(torso);

    // Arms raised in a V
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), skin);
      arm.position.set(side * 0.32, 1.45, 0);
      arm.rotation.z = side * -0.6;
      g.add(arm);
    }

    // Legs
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), pants);
      leg.position.set(side * 0.1, 0.5, 0);
      g.add(leg);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.2), shoe);
      s.position.set(side * 0.1, 0.22, 0.03);
      g.add(s);
    }

    g.traverse((c) => {
      if (c.isMesh) {
        c.material.transparent = true;
        c.material.opacity = 0;
      }
    });

    return g;
  }

  _spawnCelebration(center) {
    this._cleanupCelebration();

    const shirtColors = [
      0xee1133, 0x2288ff, 0x22cc55, 0xffaa00, 0xcc44ff,
      0xff6622, 0x00ccbb, 0xff2288, 0x8855ff, 0xffdd00,
    ];

    const crowdRadius = 4.5;
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const person = this._buildCheeringPerson(shirtColors[i]);
      person.position.set(
        center.x + Math.sin(angle) * crowdRadius,
        CONFIG.PLAYER_Y,
        center.z + Math.cos(angle) * crowdRadius
      );
      person.lookAt(center.x, CONFIG.PLAYER_Y + 1, center.z);
      person.userData.phase = Math.random() * Math.PI * 2;
      person.userData.baseY = CONFIG.PLAYER_Y;
      this.scene.add(person);
      this._celebCrowd.push(person);
    }

    // Confetti burst
    const confettiColors = [0xff2255, 0x22ccff, 0xffdd00, 0x44ff66, 0xff8800, 0xcc44ff, 0xffffff];
    for (let i = 0; i < 80; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: confettiColors[i % confettiColors.length],
        transparent: true,
        opacity: 0,
      });
      const size = 0.06 + Math.random() * 0.08;
      const geo = new THREE.BoxGeometry(size, size * 0.3, size);
      const c = new THREE.Mesh(geo, mat);
      const spread = 5;
      c.position.set(
        center.x + (Math.random() - 0.5) * spread * 2,
        CONFIG.PLAYER_Y + 6 + Math.random() * 6,
        center.z + (Math.random() - 0.5) * spread * 2
      );
      c.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      c.userData.vy = -(1.0 + Math.random() * 1.5);
      c.userData.vx = (Math.random() - 0.5) * 1.2;
      c.userData.vz = (Math.random() - 0.5) * 1.2;
      c.userData.spin = (Math.random() - 0.5) * 6;
      this.scene.add(c);
      this._celebConfetti.push(c);
    }
  }

  _updateCelebration(dt, now) {
    const elapsed = (now - this._orbitStartTime) / 1000;
    const fadeIn = Math.min(1, elapsed / 1.5);

    for (const person of this._celebCrowd) {
      person.traverse((c) => {
        if (c.isMesh) c.material.opacity = fadeIn;
      });
      const bounce = Math.abs(Math.sin((elapsed * 5) + person.userData.phase)) * 0.2;
      person.position.y = person.userData.baseY + bounce;
      // Arms pump: vary the arm rotation with time
      const children = person.children;
      for (const child of children) {
        if (child.rotation && Math.abs(child.rotation.z) > 0.3) {
          const side = child.rotation.z < 0 ? -1 : 1;
          child.rotation.z = side * -(0.4 + Math.sin((elapsed * 6) + person.userData.phase) * 0.3);
        }
      }
    }

    for (const c of this._celebConfetti) {
      c.material.opacity = fadeIn;
      c.position.y += c.userData.vy * dt;
      c.position.x += c.userData.vx * dt;
      c.position.z += c.userData.vz * dt;
      c.rotation.x += c.userData.spin * dt;
      c.rotation.z += c.userData.spin * 0.7 * dt;
      if (c.position.y < CONFIG.PLAYER_Y) {
        c.position.y = CONFIG.PLAYER_Y + 8 + Math.random() * 4;
      }
    }
  }

  _cleanupCelebration() {
    for (const p of this._celebCrowd) {
      this.scene.remove(p);
      p.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
    }
    this._celebCrowd = [];
    for (const c of this._celebConfetti) {
      this.scene.remove(c);
      c.geometry.dispose();
      c.material.dispose();
    }
    this._celebConfetti = [];
  }

  _updateCamera(dt, now) {
    const px = this.player.mesh.position.x;
    const target = new THREE.Vector3(
      px * 0.3,
      this.cameraBase.y,
      this.cameraBase.z
    );
    this.camera.position.lerp(target, 1 - Math.exp(-4 * dt));

    let shake = 0;
    if (now < this.shakeUntil) {
      shake =
        this.shakeAmp *
        Math.sin(now * 0.08) *
        ((this.shakeUntil - now) / 200);
    }
    this.camera.position.x += shake;
    this.camera.lookAt(px * 0.15, 1.2, -2);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
