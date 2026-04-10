import * as THREE from "three";
import { CONFIG, LEVELS } from "../data/config.js";
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
} from "../utils/storage.js";
import { preload, play, startLoop, stopLoop, startBgm } from "../utils/audio.js";

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
    this.player = new Player(scene);
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
    this.timeScale = 1;

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

    this._lastTs = performance.now();

    this._bindKeys();
    this._bindQuizUi();
    this._bindBillboardInput();
    this._bindTouch();
    this._quizBusy = false;
    /** @type {'question'|'result'} */
    this._quizPhase = "question";
  }

  _bindKeys() {
    window.addEventListener("keydown", (e) => {
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
    this.resetRun();
    this.state = "running";
    this.ui.showMainMenu(false);
    this.ui.showGameOver(false);
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
    this.runTime = 0;
    this.health = CONFIG.STARTING_HEALTH;
    this.score = 0;
    this.streak = 0;
    this.worldSpeed = CONFIG.BASE_SPEED;
    this.shield = false;
    this.player.setShieldActive(false);
    this.boostUntil = 0;
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
    this.timeScale = 1;
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
    stopLoop();
    this.ui.showBillboard(false);
    this.ui.showGameOver(false);
    this.ui.showPause(false);
    this.ui.showQuiz(false);
    this.ui.showRecovery(false, false);
    this.ui.showLevelSelect(false);
    this.ui.showHud(false);
    this.ui.showMainMenu(true);
    this.ui.updateMenuBest(getBestScore());
  }

  switchLevel(levelId, returnTo = "main_menu") {
    if (!LEVELS[levelId]) return;
    this.currentLevel = levelId;

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

    if (ok) play(SFX.CORRECT, 0.8);
    else play(SFX.WRONG, 0.8);

    const { title, lines } = this._quizResultCopy(ok);

    if (!ok) {
      const correctText = q.options[q.answer];
      lines.push(`Correct answer: ${correctText}`);
    }

    this.ui.showQuizResult(ok, title, lines, q.explanation);

    const displayMs = ok ? CONFIG.QUIZ_RESULT_DISPLAY_MS : 3000;
    clearTimeout(this._quizResultTimer);
    this._quizResultTimer = setTimeout(() => {
      this._finishQuiz(ok);
      this._quizBusy = false;
      this._quizPhase = "question";
      clearTimeout(this._quizSafetyTimer);
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
        this.boostUntil = performance.now() + CONFIG.BOOST_DURATION * 1000;
        play(SFX.BOOST_WHOOSH, 0.85);
        this.ui.setStatus("Correct: Speed Boost", CONFIG.STATUS_MESSAGE_MS);
        this._checkStreakAutomation();
      } else {
        this.streak = 0;
        this.score += CONFIG.BOOST_QUIZ_WRONG * this._flowMult();
        this.ui.setStatus("Wrong answer", CONFIG.STATUS_MESSAGE_MS);
      }
    } else if (mode === "recovery") {
      if (correct) {
        this.health = Math.min(
          CONFIG.STARTING_HEALTH,
          this.health + CONFIG.REMEDIATION_RESTORE
        );
        this.streak += CONFIG.REMEDIATION_CORRECT_STREAK;
        this.sessionCorrect += 1;
        addTotalCorrectAnswers(1);
        this.ui.setStatus("Health restored", CONFIG.STATUS_MESSAGE_MS);
        this._checkStreakAutomation();
      } else {
        this.streak = 0;
        this.health -= CONFIG.REMEDIATION_WRONG_PENALTY;
        this.ui.setStatus("Remediation failed", CONFIG.STATUS_MESSAGE_MS);
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
    this.ui.resetGameOver(getLastName());
    this.ui.showHud(false);
    this.ui.showGameOver(true);
  }

  saveScore() {
    const name = this.ui.getEnteredName() || "AAA";
    setLastName(name);
    const { rank, board } = addLeaderboardEntry(name, this.score);
    this.ui.showLeaderboard(board, rank);
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
    this.recoveryPrompt = false;
    this.ui.showRecovery(false, false);
    this.timeScale = 1;
    this.ui.setStatus(
      "Skipped remediation — no extra penalty. Keep driving!",
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

    if (this.state === "boot" || this.state === "main_menu") {
      this._updateCamera(dt, now);
      return;
    }

    if (this.state === "paused" || this.state === "game_over") {
      this._updateCamera(dt, now);
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
    const ws = CONFIG.BASE_SPEED * speedMult;
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
      boostTotal: CONFIG.BOOST_DURATION * 1000,
      playbooks: this.playbookCount,
      playbookPts: this.playbookPts,
      collections: this.collectionCount,
      collectionPts: this.collectionPts,
      mbState,
      mbProgress,
      braking: this.braking,
    });
  }

  _updateRun(effDt, now, rawDt, spawnScale) {
    this.runTime += effDt;
    this.track.update(effDt, this.worldSpeed);

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

    const ws = CONFIG.BASE_SPEED * speedMult;
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
      boostTotal: CONFIG.BOOST_DURATION * 1000,
      playbooks: this.playbookCount,
      playbookPts: this.playbookPts,
      collections: this.collectionCount,
      collectionPts: this.collectionPts,
      mbState,
      mbProgress,
      braking: this.braking,
    });
  }

  _onHitObstacle(e) {
    this.spawner.removeEntity(e);
    if (this.shield) {
      this.shield = false;
      this.player.setShieldActive(false);
      play(SFX.SHIELD_HIT, 0.7);
      this.ui.setStatus(
        "Obstacle hit — shield blocked it! (Shield used up)",
        CONFIG.STATUS_HIT_MS
      );
      return;
    }

    const dmg = CONFIG.OBSTACLE_DAMAGE;
    this.health -= dmg;
    this.obstaclesHit += 1;
    play(SFX.OBSTACLE_HIT, 0.8);
    this.ui.flashDamage();
    this.ui.showDamagePopup(dmg);
    this.ui.shake();
    this.shakeUntil = performance.now() + 200;
    this.shakeAmp = 0.35;
    this.ui.setStatus(
      `Obstacle hit! −${dmg} health (Outage). You’re at ${Math.max(0, Math.floor(this.health))}.`,
      CONFIG.STATUS_HIT_MS
    );

    if (this.health <= 0) {
      this._gameOver();
      return;
    }

    this.recoveryPrompt = true;
    const showTip = !hasSeenRecoveryTip();
    this.ui.showRecovery(true, showTip, () => {
      play(SFX.WRONG, 0.8);
      this.onRecoveryNo();
    });
  }

  _onHitRival(e) {
    this.spawner.explodeRival(e);
    if (this.shield) {
      this.shield = false;
      this.player.setShieldActive(false);
      play(SFX.SHIELD_HIT, 0.7);
      this.ui.setStatus(
        "Rival car hit — shield absorbed the crash!",
        CONFIG.STATUS_HIT_MS
      );
      return;
    }

    const dmg = CONFIG.OBSTACLE_DAMAGE;
    this.health -= dmg;
    this.obstaclesHit += 1;
    play(SFX.OBSTACLE_HIT, 0.8);
    this.ui.flashDamage();
    this.ui.showDamagePopup(dmg);
    this.ui.shake();
    this.shakeUntil = performance.now() + 200;
    this.shakeAmp = 0.35;
    this.ui.setStatus(
      `Rival car crash! −${dmg} health. You're at ${Math.max(0, Math.floor(this.health))}.`,
      CONFIG.STATUS_HIT_MS
    );

    if (this.health <= 0) {
      this._gameOver();
      return;
    }

    this.recoveryPrompt = true;
    const showTip = !hasSeenRecoveryTip();
    this.ui.showRecovery(true, showTip, () => {
      play(SFX.WRONG, 0.8);
      this.onRecoveryNo();
    });
  }

  _onPickup(e) {
    const t = e.subtype;
    this.spawner.removeEntity(e);
    this.pickupsCollected += 1;

    if (t !== "POLICY_SHIELD") play(SFX.PICKUP, 0.6);

    if (t === "PLAYBOOK") {
      const pts = Math.floor(CONFIG.PICKUP_SCORE.PLAYBOOK * this._flowMult());
      this.score += pts;
      this.playbookCount += 1;
      this.playbookPts += pts;
      this.ui.showPickupPopup(`Playbook +${pts}`);
      if (this.playbookCount % 3 === 0) {
        this._applyPickupSpeedUp("Playbook", this.playbookCount);
      } else {
        this.ui.setStatus(`Pickup: Playbook — +${pts} score`, CONFIG.STATUS_HIT_MS);
      }
    } else if (t === "CERTIFIED_COLLECTION") {
      const pts = Math.floor(CONFIG.PICKUP_SCORE.COLLECTION * this._flowMult());
      this.score += pts;
      this.collectionCount += 1;
      this.collectionPts += pts;
      this.ui.showPickupPopup(`Collection +${pts}`);
      if (this.collectionCount % 3 === 0) {
        this._applyPickupSpeedUp("Collection", this.collectionCount);
      } else {
        this.ui.setStatus(`Pickup: Certified Collection — +${pts} score`, CONFIG.STATUS_HIT_MS);
      }
    } else if (t === "POLICY_SHIELD") {
      this.shield = true;
      this.player.setShieldActive(true);
      play(SFX.SHIELD_ON, 0.75);
      this.ui.showPickupPopup("Shield Active!");
      this.ui.setStatus(
        "Pickup: Policy Shield — next obstacle hit won’t cost health",
        CONFIG.STATUS_HIT_MS
      );
    } else if (t === "BOOST_TOKEN") {
      this._openBoostQuiz();
    }
  }

  _applyPickupSpeedUp(type, count) {
    this.pickupSpeedMult += 0.15;
    const pct = Math.round((this.pickupSpeedMult - 1) * 100);
    this.ui.setStatus(
      `${count} ${type}s collected! Speed +15% (total +${pct}%)`,
      CONFIG.STATUS_HIT_MS
    );
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
