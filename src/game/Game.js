import * as THREE from "three";
import { CONFIG } from "../data/config.js";
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
} from "../utils/storage.js";

/**
 * @typedef {'boot'|'main_menu'|'running'|'quiz'|'paused'|'game_over'} GameState
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

    this.player = new Player(scene);
    this.track = new Track(scene);
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

    this.obstaclesHit = 0;
    this.pickupsCollected = 0;
    this.sessionCorrect = 0;

    this.recoveryPrompt = false;
    this.timeScale = 1;

    this.cameraBase = new THREE.Vector3(0, 5.2, 12);
    this.shakeUntil = 0;
    this.shakeAmp = 0;

    this._lastTs = performance.now();

    this._bindKeys();
    this._bindQuizUi();
    this._quizBusy = false;
    /** @type {'question'|'result'} */
    this._quizPhase = "question";
  }

  _bindKeys() {
    window.addEventListener("keydown", (e) => {
      if (this.state === "main_menu" || this.state === "game_over") return;

      if (
        this.state === "quiz" &&
        this._quizPhase === "question" &&
        this.currentQuestion
      ) {
        const k = e.key;
        if (k >= "1" && k <= "4") {
          this._answerQuiz(Number(k) - 1);
          e.preventDefault();
        }
        return;
      }

      if (this.state === "quiz") return;

      if (e.code === "Escape") {
        if (this.state === "paused") {
          this.state = "running";
          this.ui.showPause(false);
        } else if (this.state === "running" && !this.recoveryPrompt) {
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

  startFromMenu() {
    this.resetRun();
    this.state = "running";
    this.ui.showMainMenu(false);
    this.ui.showGameOver(false);
    this.ui.showPause(false);
    this.ui.showHud(true);
    this.ui.setStatus("Go!", 1500);
  }

  resetRun() {
    incrementTotalRuns();
    this.quiz.resetPool();
    this.spawner.reset();
    this.runTime = 0;
    this.health = CONFIG.STARTING_HEALTH;
    this.score = 0;
    this.streak = 0;
    this.worldSpeed = CONFIG.BASE_SPEED;
    this.shield = false;
    this.boostUntil = 0;
    this.automationFlowUntil = 0;
    this.obstaclesHit = 0;
    this.pickupsCollected = 0;
    this.sessionCorrect = 0;
    this.recoveryPrompt = false;
    this.timeScale = 1;
    this.player.targetLaneIndex = 1;
    this.player.laneIndex = 1;
    this.player.mesh.position.x = CONFIG.LANES[1];
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
    this.ui.showGameOver(false);
    this.ui.showPause(false);
    this.ui.showQuiz(false);
    this.ui.showRecovery(false, false);
    this.ui.showHud(false);
    this.ui.showMainMenu(true);
    this.ui.updateMenuBest(getBestScore());
  }

  /**
   * Emergency un-stick: tears down whatever overlay is blocking and returns to running.
   * Bound to the persistent escape-hatch button in the bottom-right.
   */
  forceUnstick() {
    if (this.state === "main_menu" || this.state === "game_over") return;
    this.recoveryPrompt = false;
    this.timeScale = 1;
    this._quizBusy = false;
    this._quizPhase = "question";
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
    const q = this.currentQuestion;
    const ok = this.quiz.isCorrect(q, optionIndex);

    const { title, lines } = this._quizResultCopy(ok);
    this.ui.showQuizResult(ok, title, lines, q.explanation);

    window.setTimeout(() => {
      this._finishQuiz(ok);
      this._quizBusy = false;
      this._quizPhase = "question";
    }, CONFIG.QUIZ_RESULT_DISPLAY_MS);
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

  _gameOver() {
    this.state = "game_over";
    this.timeScale = 1;
    this.recoveryPrompt = false;
    this.ui.showRecovery(false, false);
    this.player.setAutomationFlowActive(false);
    const best = getBestScore();
    setBestScoreIfHigher(this.score);
    this.ui.setGameOverStats({
      score: this.score,
      best: Math.max(best, this.score),
      hits: this.obstaclesHit,
      pickups: this.pickupsCollected,
      correct: this.sessionCorrect,
    });
    this.ui.showHud(false);
    this.ui.showGameOver(true);
  }

  /** Recovery prompt */
  onRecoveryYes() {
    if (!this.recoveryPrompt) return;
    markRecoveryTipSeen();
    this.recoveryPrompt = false;
    this.ui.showRecovery(false, false);
    this.currentQuestion = this.quiz.nextQuestion();
    this.quizMode = "recovery";
    this.state = "quiz";
    this._quizPhase = "question";
    this.ui.renderQuizQuestion(this.currentQuestion);
    this.ui.showQuiz(true);
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
    let speedMult = ramp;
    if (now < this.boostUntil) {
      speedMult *= CONFIG.BOOST_SPEED_MULT;
    }
    const ws = CONFIG.BASE_SPEED * speedMult;
    const flowActive = now < this.automationFlowUntil;
    this.ui.updateHud({
      health: this.health,
      score: this.score,
      speed: ws,
      streak: this.streak,
      shield: this.shield,
      automationFlow: flowActive,
      boostRemaining: Math.max(0, this.boostUntil - now),
      boostTotal: CONFIG.BOOST_DURATION * 1000,
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

    if (now < this.boostUntil) {
      speedMult *= CONFIG.BOOST_SPEED_MULT;
    }

    const ws = CONFIG.BASE_SPEED * speedMult;
    this.worldSpeed = ws;

    const flowActive = now < this.automationFlowUntil;
    this.player.setAutomationFlowActive(flowActive);

    const fm = flowActive ? CONFIG.FLOW_SCORE_MULT : 1;
    this.score +=
      (CONFIG.SCORE_PER_SECOND * fm + CONFIG.SCORE_PER_UNIT_DISTANCE * ws * fm) *
      effDt;

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
    const pickupHits = hits.filter((h) => h.entity.kind === "pickup");

    // Process one collision per frame: obstacles take priority, and skip
    // pickups while recovery prompt is open (prevents boost-quiz getting stuck).
    if (obstacleHits.length && !this.recoveryPrompt) {
      this._onHitObstacle(obstacleHits[0].entity);
    } else if (pickupHits.length && !this.recoveryPrompt) {
      this._onPickup(pickupHits[0].entity);
    }

    this.ui.updateHud({
      health: this.health,
      score: this.score,
      speed: ws,
      streak: this.streak,
      shield: this.shield,
      automationFlow: flowActive,
      boostRemaining: Math.max(0, this.boostUntil - now),
      boostTotal: CONFIG.BOOST_DURATION * 1000,
    });
  }

  _onHitObstacle(e) {
    this.spawner.removeEntity(e);
    if (this.shield) {
      this.shield = false;
      this.ui.setStatus(
        "Obstacle hit — shield blocked it! (Shield used up)",
        CONFIG.STATUS_HIT_MS
      );
      return;
    }

    const dmg = CONFIG.OBSTACLE_DAMAGE;
    this.health -= dmg;
    this.obstaclesHit += 1;
    this.ui.flashDamage();
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
    this.ui.showRecovery(true, showTip);
  }

  _onPickup(e) {
    const t = e.subtype;
    this.spawner.removeEntity(e);
    this.pickupsCollected += 1;

    if (t === "PLAYBOOK") {
      const pts = Math.floor(CONFIG.PICKUP_SCORE.PLAYBOOK * this._flowMult());
      this.score += pts;
      this.ui.setStatus(
        `Pickup: Playbook — +${pts} score`,
        CONFIG.STATUS_HIT_MS
      );
    } else if (t === "CERTIFIED_COLLECTION") {
      const pts = Math.floor(CONFIG.PICKUP_SCORE.COLLECTION * this._flowMult());
      this.score += pts;
      this.ui.setStatus(
        `Pickup: Certified Collection — +${pts} score`,
        CONFIG.STATUS_HIT_MS
      );
    } else if (t === "POLICY_SHIELD") {
      this.shield = true;
      this.ui.setStatus(
        "Pickup: Policy Shield — next obstacle hit won’t cost health",
        CONFIG.STATUS_HIT_MS
      );
    } else if (t === "BOOST_TOKEN") {
      this._openBoostQuiz();
    }
  }

  _updateCamera(dt, now) {
    const px = this.player.mesh.position.x;
    const target = new THREE.Vector3(
      px * 0.35,
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
    this.camera.lookAt(px * 0.2, 1.2, -2);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
