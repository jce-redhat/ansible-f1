import { getLeaderboard } from "../utils/storage.js";

/**
 * DOM overlays + HUD updates (Built to Automate)
 */
export class UI {
  constructor() {
    this.el = {
      mainMenu: document.getElementById("main-menu"),
      pauseMenu: document.getElementById("pause-menu"),
      gameOver: document.getElementById("game-over"),
      quiz: document.getElementById("quiz-overlay"),
      recovery: document.getElementById("recovery-overlay"),
      recoveryFirstTip: document.getElementById("recovery-first-tip"),
      recoveryCountdown: document.getElementById("recovery-countdown"),
      recoveryNo: document.getElementById("recovery-no"),
      hud: document.getElementById("hud"),
      flash: document.getElementById("screen-flash"),
      canvasWrap: document.getElementById("game-root"),

      health: document.getElementById("hud-health"),
      score: document.getElementById("hud-score"),
      speed: document.getElementById("hud-speed"),
      streak: document.getElementById("hud-streak"),
      playbookCount: document.getElementById("hud-playbooks"),
      playbookPts: document.getElementById("hud-playbook-pts"),
      collectionCount: document.getElementById("hud-collections"),
      collectionPts: document.getElementById("hud-collection-pts"),
      shield: document.getElementById("hud-shield"),
      flow: document.getElementById("hud-flow"),
      status: document.getElementById("hud-status"),
      boostBar: document.getElementById("boost-bar"),
      boostFill: document.getElementById("boost-fill"),

      bestScoreMenu: document.getElementById("menu-best"),
      goScore: document.getElementById("go-score"),
      goHits: document.getElementById("go-hits"),
      goPickups: document.getElementById("go-pickups"),
      goCorrect: document.getElementById("go-correct"),
      goEntry: document.getElementById("go-entry"),
      goNameInput: document.getElementById("go-name-input"),
      goLeaderboard: document.getElementById("go-leaderboard"),
      lbBody: document.getElementById("lb-body"),
      lbScroll: document.getElementById("lb-scroll"),

      quizPrompt: document.getElementById("quiz-prompt"),
      quizOpts: document.getElementById("quiz-options"),
      quizQuestionPanel: document.getElementById("quiz-question-panel"),
      quizResultPanel: document.getElementById("quiz-result-panel"),
      quizResultTitle: document.getElementById("quiz-result-title"),
      quizResultLines: document.getElementById("quiz-result-lines"),
      quizResultExplain: document.getElementById("quiz-result-explain"),

      billboardOverlay: document.getElementById("billboard-overlay"),
      billboardLabel: document.getElementById("billboard-label"),
      billboardContent: document.getElementById("billboard-content"),

      levelSelect: document.getElementById("level-select"),
      hudLevelName: document.getElementById("hud-level-name"),

      quizCountdown: document.getElementById("quiz-countdown"),
      damagePopup: document.getElementById("damage-popup"),
      pickupPopup: document.getElementById("pickup-popup"),

      manualBoost: document.getElementById("hud-manual-boost"),
      mbFill: document.getElementById("mb-fill"),
      brakeVignette: document.getElementById("brake-vignette"),
    };

    this._statusTimer = null;
    this._recoveryCountdownId = null;
    this._recoveryAutoTimer = null;
    this._quizCountdownId = null;
    this._quizAutoTimer = null;
    this._levelSelectReturnTo = "main_menu";
    this._bindButtons();
    this._drawLevelPreviews();
  }

  _bindButtons() {
    const on = (id, fn) => {
      const b = document.getElementById(id);
      if (b) b.addEventListener("click", fn);
    };
    on("btn-start", () => this.onStart && this.onStart());
    on("btn-highscores", () => this._showMenuLeaderboard());
    on("btn-lb-back", () => this._hideMenuLeaderboard());
    on("btn-resume", () => this.onResume && this.onResume());
    on("btn-restart-pause", () => this.onRestart && this.onRestart());
    on("btn-menu-pause", () => this.onMenu && this.onMenu());
    on("btn-restart-go", () => this.onRestart && this.onRestart());
    on("btn-menu-go", () => this.onMenu && this.onMenu());
    on("btn-save-score", () => this.onSaveScore && this.onSaveScore());
    const nameInput = document.getElementById("go-name-input");
    if (nameInput) {
      nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (this.onSaveScore) this.onSaveScore();
        }
      });
    }
    on("recovery-yes", () => this.onRecoveryYes && this.onRecoveryYes());
    on("recovery-no", () => this.onRecoveryNo && this.onRecoveryNo());
    on("btn-unstick", () => this.onUnstick && this.onUnstick());
    on("btn-billboard-close", () => this.onBillboardClose && this.onBillboardClose());
    on("btn-touch-pause", () => this.onTouchPause && this.onTouchPause());

    on("btn-quiz-skip", () => this.onQuizSkip && this.onQuizSkip());
    on("btn-choose-level-pause", () => this._openLevelSelect("running"));
    on("btn-choose-level-menu", () => this._openLevelSelect("main_menu"));
    on("btn-choose-level-go", () => this._openLevelSelect("game_over"));
    on("btn-level-back", () => this._closeLevelSelect());

    document.querySelectorAll(".level-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.level;
        if (id && this.onLevelSelect) {
          this.onLevelSelect(id, this._levelSelectReturnTo);
        }
        this.showLevelSelect(false);
      });
    });
  }

  setHandlers(h) {
    this.onStart = h.onStart;
    this.onResume = h.onResume;
    this.onRestart = h.onRestart;
    this.onMenu = h.onMenu;
    this.onSaveScore = h.onSaveScore;
    this.onRecoveryYes = h.onRecoveryYes;
    this.onRecoveryNo = h.onRecoveryNo;
    this.onUnstick = h.onUnstick;
    this.onBillboardClose = h.onBillboardClose;
    this.onTouchPause = h.onTouchPause;
    this.onLevelSelect = h.onLevelSelect;
    this.onQuizSkip = h.onQuizSkip;
  }

  showMainMenu(visible) {
    this.el.mainMenu.classList.toggle("hidden", !visible);
  }

  showPause(visible) {
    this.el.pauseMenu.classList.toggle("hidden", !visible);
  }

  showGameOver(visible) {
    this.el.gameOver.classList.toggle("hidden", !visible);
  }

  showQuiz(visible) {
    this.el.quiz.classList.toggle("hidden", !visible);
    if (!visible) {
      this.resetQuizOverlay();
      this.stopQuizCountdown();
    }
  }

  resetQuizOverlay() {
    const q = this.el.quizQuestionPanel;
    const r = this.el.quizResultPanel;
    if (q) q.classList.remove("hidden");
    if (r) {
      r.classList.add("hidden");
      r.classList.remove("is-correct", "is-wrong");
    }
  }

  startQuizCountdown(onExpire) {
    this.stopQuizCountdown();
    let remaining = 10;
    const cd = this.el.quizCountdown;
    if (cd) {
      cd.textContent = String(remaining);
      cd.classList.remove("urgent");
    }
    this._quizCountdownId = setInterval(() => {
      remaining--;
      if (cd) {
        cd.textContent = String(Math.max(0, remaining));
        cd.classList.toggle("urgent", remaining <= 3);
      }
      if (remaining <= 0) {
        this.stopQuizCountdown();
        if (onExpire) onExpire();
      }
    }, 1000);
  }

  stopQuizCountdown() {
    clearInterval(this._quizCountdownId);
    this._quizCountdownId = null;
    if (this.el.quizCountdown) {
      this.el.quizCountdown.classList.remove("urgent");
    }
  }

  showDamagePopup(amount) {
    const el = this.el.damagePopup;
    if (!el) return;
    el.classList.remove("show");
    el.textContent = `−${amount}`;
    void el.offsetWidth;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1500);
  }

  showPickupPopup(text) {
    const el = this.el.pickupPopup;
    if (!el) return;
    el.classList.remove("show");
    el.textContent = text;
    void el.offsetWidth;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1700);
  }

  /**
   * @param {boolean} correct
   * @param {string} title
   * @param {string[]} lines
   * @param {string} [explanation]
   */
  showQuizResult(correct, title, lines, explanation) {
    if (this.el.quizQuestionPanel) {
      this.el.quizQuestionPanel.classList.add("hidden");
    }
    const r = this.el.quizResultPanel;
    if (!r) return;
    r.classList.remove("hidden");
    r.classList.toggle("is-correct", correct);
    r.classList.toggle("is-wrong", !correct);

    if (this.el.quizResultTitle) {
      this.el.quizResultTitle.textContent = title;
    }
    if (this.el.quizResultLines) {
      this.el.quizResultLines.innerHTML = "";
      for (const line of lines) {
        const li = document.createElement("li");
        li.textContent = line;
        if (line.startsWith("Correct answer:")) {
          li.classList.add("correct-answer-reveal");
        }
        this.el.quizResultLines.appendChild(li);
      }
    }
    if (this.el.quizResultExplain) {
      const ex = explanation || "";
      this.el.quizResultExplain.textContent = ex;
      this.el.quizResultExplain.style.display = ex ? "block" : "none";
    }

    void r.offsetWidth;
  }

  /**
   * @param {boolean} visible
   * @param {boolean} [showFirstTimeTip]
   * @param {function} [onAutoNo] — called when the 5-second countdown expires
   */
  showRecovery(visible, showFirstTimeTip = false, onAutoNo = null) {
    this.stopRecoveryCountdown();
    this.el.recovery.classList.toggle("hidden", !visible);
    if (this.el.recoveryFirstTip) {
      this.el.recoveryFirstTip.classList.toggle(
        "hidden",
        !visible || !showFirstTimeTip
      );
    }
    if (this.el.recoveryNo) {
      this.el.recoveryNo.classList.remove("auto-selected");
    }

    if (visible) {
      this._startRecoveryCountdown(onAutoNo);
    }
  }

  _startRecoveryCountdown(onAutoNo) {
    const cd = this.el.recoveryCountdown;
    if (!cd) return;
    let remaining = 10;
    cd.textContent = String(remaining);
    cd.classList.remove("hidden", "urgent");

    this._recoveryCountdownId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        this._autoSelectNo(onAutoNo);
        return;
      }
      cd.textContent = String(remaining);
      if (remaining <= 3) {
        cd.classList.add("urgent");
      }
    }, 1000);
  }

  _autoSelectNo(onAutoNo) {
    this.stopRecoveryCountdown();
    const cd = this.el.recoveryCountdown;
    if (cd) {
      cd.textContent = "0";
      cd.classList.add("urgent");
    }
    const noBtn = this.el.recoveryNo;
    if (noBtn) {
      noBtn.classList.add("auto-selected");
    }
    this._recoveryAutoTimer = setTimeout(() => {
      if (noBtn) noBtn.classList.remove("auto-selected");
      if (onAutoNo) onAutoNo();
    }, 900);
  }

  stopRecoveryCountdown() {
    clearInterval(this._recoveryCountdownId);
    this._recoveryCountdownId = null;
    clearTimeout(this._recoveryAutoTimer);
    this._recoveryAutoTimer = null;
    const cd = this.el.recoveryCountdown;
    if (cd) cd.classList.remove("urgent");
  }

  showHud(visible) {
    this.el.hud.classList.toggle("hidden", !visible);
  }

  updateMenuBest(score) {
    if (this.el.bestScoreMenu) {
      this.el.bestScoreMenu.textContent = String(Math.floor(score));
    }
  }

  updateHud(data) {
    const {
      health,
      score,
      speed,
      streak,
      shield,
      automationFlow,
      boostRemaining,
      boostTotal,
      playbooks,
      playbookPts,
      collections,
      collectionPts,
    } = data;
    if (this.el.health) {
      const hp = Math.max(0, Math.floor(health));
      this.el.health.textContent = `${hp}`;
      const row = this.el.health.parentElement;
      if (row) row.classList.toggle("danger", hp <= 25 && hp > 0);
    }
    if (this.el.score) this.el.score.textContent = `${Math.floor(score)}`;
    if (this.el.speed)
      this.el.speed.textContent = `${speed.toFixed(1)}`;
    if (this.el.streak) this.el.streak.textContent = `${streak}`;
    for (let i = 0; i < 3; i++) {
      const pip = document.getElementById(`flow-pip-${i}`);
      if (pip) {
        const filled = i < streak;
        pip.classList.toggle("filled", filled && !automationFlow);
        pip.classList.toggle("all-filled", automationFlow);
      }
    }
    if (this.el.playbookCount)
      this.el.playbookCount.textContent = `${playbooks || 0}`;
    if (this.el.playbookPts)
      this.el.playbookPts.textContent = `${playbookPts || 0} pts`;
    if (this.el.collectionCount)
      this.el.collectionCount.textContent = `${collections || 0}`;
    if (this.el.collectionPts)
      this.el.collectionPts.textContent = `${collectionPts || 0} pts`;
    if (this.el.shield) {
      this.el.shield.textContent = shield ? "Shield: ON" : "Shield: —";
      this.el.shield.classList.toggle("active", !!shield);
    }
    if (this.el.flow) {
      this.el.flow.textContent = automationFlow
        ? "⚡ Flow active — 1.2× score"
        : "Flow: —";
      this.el.flow.classList.toggle("active", !!automationFlow);
    }
    if (this.el.boostBar && this.el.boostFill) {
      const active = boostTotal > 0 && boostRemaining > 0;
      this.el.boostBar.classList.toggle("hidden", !active);
      if (active) {
        const t = boostRemaining / boostTotal;
        this.el.boostFill.style.transform = `scaleX(${Math.max(0, Math.min(1, t))})`;
      }
    }

    if (this.el.manualBoost && this.el.mbFill) {
      const { mbState, mbProgress } = data;
      this.el.manualBoost.classList.remove("ready", "active", "cooldown");
      this.el.manualBoost.classList.add(mbState || "ready");
      this.el.mbFill.style.transform = `scaleX(${Math.max(0, Math.min(1, mbProgress ?? 1))})`;
    }
    if (this.el.brakeVignette) {
      this.el.brakeVignette.classList.toggle("active", !!data.braking);
    }
  }

  setStatus(text, ms = 2200) {
    if (!this.el.status) return;
    this.el.status.textContent = text;
    clearTimeout(this._statusTimer);
    this._statusTimer = setTimeout(() => {
      this.el.status.textContent = "";
    }, ms);
  }

  renderQuizQuestion(q) {
    this.resetQuizOverlay();
    if (!this.el.quizPrompt || !this.el.quizOpts) return;
    this.el.quizPrompt.textContent = q.prompt;
    this.el.quizOpts.innerHTML = "";
    q.options.forEach((opt, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-opt";
      b.textContent = `${i + 1}. ${opt}`;
      b.dataset.index = String(i);
      this.el.quizOpts.appendChild(b);
    });
  }

  flashDamage() {
    if (!this.el.flash) return;
    this.el.flash.classList.remove("flash-hit");
    void this.el.flash.offsetWidth;
    this.el.flash.classList.add("flash-hit");
    setTimeout(() => this.el.flash.classList.remove("flash-hit"), 120);
  }

  setGameOverStats(stats) {
    if (this.el.goScore) this.el.goScore.textContent = String(Math.floor(stats.score));
    if (this.el.goHits) this.el.goHits.textContent = String(stats.hits);
    if (this.el.goPickups) this.el.goPickups.textContent = String(stats.pickups);
    if (this.el.goCorrect) this.el.goCorrect.textContent = String(stats.correct);
  }

  /** Reset game over screen to entry mode (name input visible, leaderboard hidden). */
  resetGameOver(lastName) {
    if (this.el.goEntry) this.el.goEntry.classList.remove("hidden");
    if (this.el.goLeaderboard) this.el.goLeaderboard.classList.add("hidden");
    if (this.el.goNameInput) {
      this.el.goNameInput.value = lastName || "";
      setTimeout(() => this.el.goNameInput.focus(), 80);
    }
  }

  getEnteredName() {
    return this.el.goNameInput ? this.el.goNameInput.value.trim() : "";
  }

  /** Switch from entry to leaderboard view and render the table. */
  showLeaderboard(board, highlightRank) {
    if (this.el.goEntry) this.el.goEntry.classList.add("hidden");
    const lb = this.el.goLeaderboard;
    if (lb) lb.classList.remove("hidden");

    const body = this.el.lbBody;
    if (!body) return;
    body.innerHTML = "";
    board.forEach((entry, i) => {
      const tr = document.createElement("tr");
      if (i === highlightRank) tr.classList.add("lb-current");
      const tdRank = document.createElement("td");
      tdRank.textContent = String(i + 1);
      const tdName = document.createElement("td");
      tdName.textContent = entry.name || "???";
      const tdScore = document.createElement("td");
      tdScore.textContent = String(entry.score);
      tr.append(tdRank, tdName, tdScore);
      body.appendChild(tr);
    });

    if (this.el.lbScroll && highlightRank >= 0) {
      const rows = body.querySelectorAll("tr");
      if (rows[highlightRank]) {
        setTimeout(() => rows[highlightRank].scrollIntoView({ block: "center" }), 100);
      }
    }
  }

  showBillboard(visible, label = "") {
    if (this.el.billboardOverlay) {
      this.el.billboardOverlay.classList.toggle("hidden", !visible);
    }
    if (this.el.billboardLabel && label) {
      this.el.billboardLabel.textContent = label;
    }
  }

  shake() {
    if (!this.el.canvasWrap) return;
    this.el.canvasWrap.classList.remove("shake");
    void this.el.canvasWrap.offsetWidth;
    this.el.canvasWrap.classList.add("shake");
  }

  _showMenuLeaderboard() {
    const lb = document.getElementById("menu-leaderboard");
    if (!lb) return;
    const board = getLeaderboard();
    const body = document.getElementById("menu-lb-body");
    if (body) {
      body.innerHTML = "";
      if (board.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 3;
        td.textContent = "No scores yet — play a round!";
        td.style.textAlign = "center";
        td.style.color = "var(--muted)";
        td.style.padding = "1.5rem 0.5rem";
        tr.appendChild(td);
        body.appendChild(tr);
      } else {
        board.forEach((entry, i) => {
          const tr = document.createElement("tr");
          const tdRank = document.createElement("td");
          tdRank.textContent = String(i + 1);
          const tdName = document.createElement("td");
          tdName.textContent = entry.name || "???";
          const tdScore = document.createElement("td");
          tdScore.textContent = String(entry.score);
          tr.append(tdRank, tdName, tdScore);
          body.appendChild(tr);
        });
      }
    }
    lb.classList.remove("hidden");
  }

  _hideMenuLeaderboard() {
    const lb = document.getElementById("menu-leaderboard");
    if (lb) lb.classList.add("hidden");
  }

  // --- Level select ---

  showLevelSelect(visible) {
    if (this.el.levelSelect) {
      this.el.levelSelect.classList.toggle("hidden", !visible);
    }
  }

  setActiveLevel(levelId) {
    document.querySelectorAll(".level-card").forEach((card) => {
      card.classList.toggle("active", card.dataset.level === levelId);
    });
    if (this.el.hudLevelName) {
      this.el.hudLevelName.textContent = `Level ${levelId}`;
    }
  }

  _openLevelSelect(returnTo) {
    this._levelSelectReturnTo = returnTo;
    this.el.mainMenu.classList.add("hidden");
    if (this.el.gameOver) this.el.gameOver.classList.add("hidden");
    if (this.el.pauseMenu) this.el.pauseMenu.classList.add("hidden");
    this.showLevelSelect(true);
  }

  _closeLevelSelect() {
    this.showLevelSelect(false);
    if (this._levelSelectReturnTo === "main_menu") {
      this.el.mainMenu.classList.remove("hidden");
    } else if (this._levelSelectReturnTo === "game_over") {
      if (this.el.gameOver) this.el.gameOver.classList.remove("hidden");
    } else if (this._levelSelectReturnTo === "running") {
      if (this.el.pauseMenu) this.el.pauseMenu.classList.remove("hidden");
    }
  }

  _drawLevelPreviews() {
    const previews = document.querySelectorAll(".level-card");
    const themes = [
      { road: "#121520", edge: "#220044", lane: "#00ffcc", side: "#0a0e18", sky: "#050510", scenery: "city" },
      { road: "#555960", edge: "#446633", lane: "#ffffff", side: "#2a5520", sky: "#6699bb", scenery: "forest" },
      { road: "#8b7355", edge: "#c4a84a", lane: "#ffeecc", side: "#d4b85a", sky: "#ccaa77", scenery: "desert" },
      { road: "#3a3828", edge: "#4a5530", lane: "#88cc66", side: "#2a3a1a", sky: "#556644", scenery: "swamp" },
      { road: "#667788", edge: "#8899aa", lane: "#ccddff", side: "#dde8f0", sky: "#aabbcc", scenery: "snow" },
      { road: "#445566", edge: "#3388aa", lane: "#ffffff", side: "#2266aa", sky: "#4488bb", scenery: "water" },
      { road: "#555555", edge: "#cc8844", lane: "#ffdd44", side: "#8a9a5a", sky: "#6699cc", scenery: "coast" },
      { road: "#2a2a30", edge: "#1a1a2e", lane: "#ffcc00", side: "#1a2218", sky: "#182840", scenery: "durham" },
    ];

    const W = 148, H = 100;
    const midY = Math.round(H * 0.42);

    previews.forEach((card, i) => {
      const canvas = card.querySelector("canvas");
      if (!canvas || !themes[i]) return;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      const t = themes[i];

      ctx.fillStyle = t.sky;
      ctx.fillRect(0, 0, W, midY);

      ctx.fillStyle = t.side;
      ctx.fillRect(0, midY, W, H - midY);

      const rL = W * 0.28, rR = W * 0.72;
      const bL = W * 0.36, bR = W * 0.64;
      ctx.fillStyle = t.road;
      ctx.beginPath();
      ctx.moveTo(rL, midY); ctx.lineTo(rR, midY);
      ctx.lineTo(bR, H); ctx.lineTo(bL, H);
      ctx.closePath(); ctx.fill();

      ctx.strokeStyle = t.edge; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(rL, midY); ctx.lineTo(bL, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rR, midY); ctx.lineTo(bR, H); ctx.stroke();

      ctx.strokeStyle = t.lane; ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      const m1 = rL + (rR - rL) * 0.37, m1b = bL + (bR - bL) * 0.37;
      const m2 = rL + (rR - rL) * 0.63, m2b = bL + (bR - bL) * 0.63;
      ctx.beginPath(); ctx.moveTo(m1, midY + 2); ctx.lineTo(m1b, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m2, midY + 2); ctx.lineTo(m2b, H); ctx.stroke();
      ctx.setLineDash([]);

      this._drawSceneryHints(ctx, t, W, H, midY);
    });
  }

  _drawSceneryHints(ctx, t, W, H, midY) {
    const s = t.scenery;
    if (s === "city") {
      ctx.fillStyle = "#2a3048";
      ctx.fillRect(4, 14, 12, 28); ctx.fillRect(20, 10, 10, 32);
      ctx.fillRect(W - 30, 8, 14, 34); ctx.fillRect(W - 14, 16, 10, 26);
      ctx.fillStyle = "#7a8a9a";
      ctx.fillRect(W - 42, 4, 8, 38);
      ctx.fillStyle = "#cc0000";
      ctx.fillRect(W - 41, 4, 6, 3);
    } else if (s === "forest") {
      ctx.fillStyle = "#5c3a1a";
      for (const x of [12, 30, W - 28, W - 12]) ctx.fillRect(x, midY - 16, 2, 16);
      ctx.fillStyle = "#2d6b30";
      for (const x of [10, 28, W - 30, W - 14]) { ctx.beginPath(); ctx.arc(x + 3, midY - 18, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#3a5a4a";
      ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(24, 6); ctx.lineTo(48, midY); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W - 48, midY); ctx.lineTo(W - 20, 3); ctx.lineTo(W, midY); ctx.fill();
    } else if (s === "desert") {
      ctx.fillStyle = "#3a7a3a";
      for (const x of [16, W - 20]) { ctx.fillRect(x, midY - 12, 2, 14); ctx.fillRect(x - 3, midY - 7, 2, 5); ctx.fillRect(x + 3, midY - 9, 2, 5); }
      ctx.fillStyle = "#a08050";
      ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(28, 10); ctx.lineTo(56, midY); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W - 56, midY); ctx.lineTo(W - 24, 6); ctx.lineTo(W, midY); ctx.fill();
    } else if (s === "swamp") {
      ctx.fillStyle = "#3a2a1a";
      for (const x of [10, 28, W - 26, W - 10]) { ctx.fillRect(x, midY - 20, 2, 20); ctx.fillRect(x - 2, midY - 14, 2, 6); }
      ctx.fillStyle = "#3a6630";
      for (const x of [8, 26, W - 28, W - 12]) { ctx.beginPath(); ctx.arc(x + 3, midY - 22, 5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "rgba(60,80,50,0.35)";
      ctx.fillRect(0, midY + 4, W, 8);
      ctx.fillStyle = "#2a4a30";
      ctx.beginPath(); ctx.arc(20, midY + 10, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W - 20, midY + 12, 4, 0, Math.PI * 2); ctx.fill();
    } else if (s === "snow") {
      ctx.fillStyle = "#1a4a2a";
      for (const x of [14, 32, W - 30, W - 14]) {
        ctx.beginPath(); ctx.moveTo(x, midY); ctx.lineTo(x + 4, midY - 16); ctx.lineTo(x + 8, midY); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 1, midY - 6); ctx.lineTo(x + 4, midY - 20); ctx.lineTo(x + 7, midY - 6); ctx.fill();
      }
      ctx.fillStyle = "#eef4ff";
      for (const x of [14, 32, W - 30, W - 14]) { ctx.beginPath(); ctx.moveTo(x + 2, midY - 14); ctx.lineTo(x + 4, midY - 22); ctx.lineTo(x + 6, midY - 14); ctx.fill(); }
      ctx.fillStyle = "#6a7a8a";
      ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(30, 4); ctx.lineTo(60, midY); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W - 60, midY); ctx.lineTo(W - 22, 2); ctx.lineTo(W, midY); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.moveTo(22, 8); ctx.lineTo(30, 2); ctx.lineTo(38, 8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W - 38, 6); ctx.lineTo(W - 24, 1); ctx.lineTo(W - 14, 6); ctx.fill();
    } else if (s === "water") {
      ctx.fillStyle = "rgba(34,102,170,0.5)";
      for (let y = midY + 4; y < H; y += 10) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(W * 0.25, y - 3, W * 0.75, y + 3, W, y); ctx.lineTo(W, y + 3); ctx.bezierCurveTo(W * 0.75, y + 6, W * 0.25, y, 0, y + 3); ctx.fill();
      }
      ctx.fillStyle = "#ff4422";
      ctx.beginPath(); ctx.arc(18, midY + 18, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(W - 18, midY + 14, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ccddee";
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(W * 0.3, 14, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(W * 0.7, 10, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (s === "coast") {
      ctx.fillStyle = "#2277aa";
      ctx.fillRect(0, midY - 6, W * 0.28, midY + 6);
      ctx.fillStyle = "#888888";
      ctx.fillRect(W * 0.26, midY - 2, 2, H - midY + 2);
      ctx.fillStyle = "#6a8a5a";
      ctx.beginPath(); ctx.moveTo(W - 50, midY); ctx.lineTo(W - 30, 6); ctx.lineTo(W - 10, midY); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W - 30, midY); ctx.lineTo(W - 14, 12); ctx.lineTo(W, midY); ctx.fill();
      ctx.fillStyle = "#ccddee";
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.ellipse(W * 0.4, 10, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (s === "durham") {
      ctx.fillStyle = "#2a3048";
      ctx.fillRect(4, 16, 10, 26); ctx.fillRect(18, 12, 8, 30);
      ctx.fillRect(W - 24, 14, 12, 28); ctx.fillRect(W - 10, 18, 8, 24);
      // Ansible tower
      ctx.fillStyle = "#4a5a6a";
      ctx.fillRect(W * 0.42, 4, 10, 38);
      ctx.fillStyle = "#ee1100";
      ctx.fillRect(W * 0.43, 2, 8, 3);
      // Water tower
      ctx.fillStyle = "#6a6a6a";
      ctx.fillRect(W * 0.28, 14, 1, 16); ctx.fillRect(W * 0.34, 14, 1, 16);
      ctx.fillStyle = "#ccccbb";
      ctx.fillRect(W * 0.26, 8, 12, 7);
      ctx.fillStyle = "#cc2200";
      ctx.fillRect(W * 0.27, 10, 10, 2);
      // Smokestack
      ctx.fillStyle = "#884422";
      ctx.fillRect(W - 36, 8, 4, 34);
      ctx.fillStyle = "rgba(136,136,136,0.3)";
      ctx.beginPath(); ctx.arc(W - 34, 6, 4, 0, Math.PI * 2); ctx.fill();
      // Stadium
      ctx.fillStyle = "#3a4858";
      ctx.fillRect(W * 0.6, 22, 14, 10);
      ctx.fillStyle = "#0044aa";
      ctx.fillRect(W * 0.61, 20, 12, 3);
    }
  }
}
