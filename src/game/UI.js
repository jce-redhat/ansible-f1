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
    };

    this._statusTimer = null;
    this._recoveryCountdownId = null;
    this._recoveryAutoTimer = null;
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

    on("btn-choose-level", () => {
      if (this.onPauseForLevelSelect) this.onPauseForLevelSelect();
      this._openLevelSelect("running");
    });
    on("btn-choose-level-menu", () => this._openLevelSelect("main_menu"));
    on("btn-choose-level-go", () => this._openLevelSelect("game_over"));
    on("btn-level-back", () => this._closeLevelSelect());

    document.querySelectorAll(".level-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.level;
        if (id && this.onLevelSelect) this.onLevelSelect(id);
        this._closeLevelSelect();
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
    this.onPauseForLevelSelect = h.onPauseForLevelSelect;
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
    if (!visible) this.resetQuizOverlay();
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
    let remaining = 5;
    cd.textContent = String(remaining);
    cd.classList.remove("hidden", "urgent");

    this._recoveryCountdownId = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        this._autoSelectNo(onAutoNo);
        return;
      }
      cd.textContent = String(remaining);
      if (remaining <= 2) {
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
    if (this.el.health)
      this.el.health.textContent = `${Math.max(0, Math.floor(health))}`;
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
      const names = { A: "Level A", B: "Level B", C: "Level C" };
      this.el.hudLevelName.textContent = names[levelId] || levelId;
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
      { bg: "#0a0e18", road: "#121520", edge: "#220044", lane: "#00ffcc", side: "#0a0e18", sky: "#050510", scenery: "city" },
      { bg: "#7799aa", road: "#555960", edge: "#446633", lane: "#ffffff", side: "#2a5520", sky: "#6699bb", scenery: "forest" },
      { bg: "#c4a870", road: "#8b7355", edge: "#c4a84a", lane: "#ffeecc", side: "#d4b85a", sky: "#ccaa77", scenery: "desert" },
    ];

    previews.forEach((card, i) => {
      const canvas = card.querySelector("canvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const t = themes[i];

      // Sky
      ctx.fillStyle = t.sky;
      ctx.fillRect(0, 0, 180, 50);

      // Ground / sides
      ctx.fillStyle = t.side;
      ctx.fillRect(0, 50, 180, 70);

      // Road (center strip)
      ctx.fillStyle = t.road;
      ctx.beginPath();
      ctx.moveTo(50, 50);
      ctx.lineTo(130, 50);
      ctx.lineTo(115, 120);
      ctx.lineTo(65, 120);
      ctx.closePath();
      ctx.fill();

      // Edge glow
      ctx.strokeStyle = t.edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 50); ctx.lineTo(65, 120);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(130, 50); ctx.lineTo(115, 120);
      ctx.stroke();

      // Lane markers
      ctx.strokeStyle = t.lane;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(80, 52); ctx.lineTo(82, 120);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(100, 52); ctx.lineTo(98, 120);
      ctx.stroke();
      ctx.setLineDash([]);

      // Scenery hints
      if (t.scenery === "city") {
        ctx.fillStyle = "#2a3048";
        ctx.fillRect(5, 20, 15, 30);
        ctx.fillRect(25, 15, 12, 35);
        ctx.fillRect(143, 10, 18, 40);
        ctx.fillRect(165, 22, 12, 28);
        // Red Hat building
        ctx.fillStyle = "#7a8a9a";
        ctx.fillRect(135, 5, 10, 45);
        ctx.fillStyle = "#cc0000";
        ctx.fillRect(136, 5, 8, 4);
      } else if (t.scenery === "forest") {
        ctx.fillStyle = "#5c3a1a";
        for (const x of [15, 35, 140, 160]) {
          ctx.fillRect(x, 30, 3, 20);
        }
        ctx.fillStyle = "#2d6b30";
        for (const x of [12, 32, 137, 157]) {
          ctx.beginPath();
          ctx.arc(x + 3, 28, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        // Mountains
        ctx.fillStyle = "#3a5a4a";
        ctx.beginPath(); ctx.moveTo(0, 50); ctx.lineTo(30, 10); ctx.lineTo(60, 50); ctx.fill();
        ctx.beginPath(); ctx.moveTo(120, 50); ctx.lineTo(155, 5); ctx.lineTo(180, 50); ctx.fill();
      } else if (t.scenery === "desert") {
        // Cacti
        ctx.fillStyle = "#3a7a3a";
        for (const x of [20, 155]) {
          ctx.fillRect(x, 40, 3, 18);
          ctx.fillRect(x - 3, 45, 3, 6);
          ctx.fillRect(x + 3, 42, 3, 6);
        }
        // Sand mountains
        ctx.fillStyle = "#a08050";
        ctx.beginPath(); ctx.moveTo(0, 50); ctx.lineTo(35, 15); ctx.lineTo(70, 50); ctx.fill();
        ctx.beginPath(); ctx.moveTo(110, 50); ctx.lineTo(150, 8); ctx.lineTo(180, 50); ctx.fill();
      }
    });
  }
}
