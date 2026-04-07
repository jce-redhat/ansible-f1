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
      hud: document.getElementById("hud"),
      flash: document.getElementById("screen-flash"),
      canvasWrap: document.getElementById("game-root"),

      health: document.getElementById("hud-health"),
      score: document.getElementById("hud-score"),
      speed: document.getElementById("hud-speed"),
      streak: document.getElementById("hud-streak"),
      shield: document.getElementById("hud-shield"),
      flow: document.getElementById("hud-flow"),
      status: document.getElementById("hud-status"),
      boostBar: document.getElementById("boost-bar"),
      boostFill: document.getElementById("boost-fill"),

      bestScoreMenu: document.getElementById("menu-best"),
      goScore: document.getElementById("go-score"),
      goBest: document.getElementById("go-best"),
      goHits: document.getElementById("go-hits"),
      goPickups: document.getElementById("go-pickups"),
      goCorrect: document.getElementById("go-correct"),

      quizPrompt: document.getElementById("quiz-prompt"),
      quizOpts: document.getElementById("quiz-options"),
      quizQuestionPanel: document.getElementById("quiz-question-panel"),
      quizResultPanel: document.getElementById("quiz-result-panel"),
      quizResultTitle: document.getElementById("quiz-result-title"),
      quizResultLines: document.getElementById("quiz-result-lines"),
      quizResultExplain: document.getElementById("quiz-result-explain"),
    };

    this._statusTimer = null;
    this._bindButtons();
  }

  _bindButtons() {
    const on = (id, fn) => {
      const b = document.getElementById(id);
      if (b) b.addEventListener("click", fn);
    };
    on("btn-start", () => this.onStart && this.onStart());
    on("btn-resume", () => this.onResume && this.onResume());
    on("btn-restart-pause", () => this.onRestart && this.onRestart());
    on("btn-restart-go", () => this.onRestart && this.onRestart());
    on("btn-menu-go", () => this.onMenu && this.onMenu());
    on("recovery-yes", () => this.onRecoveryYes && this.onRecoveryYes());
    on("recovery-no", () => this.onRecoveryNo && this.onRecoveryNo());
    on("btn-unstick", () => this.onUnstick && this.onUnstick());
  }

  setHandlers(h) {
    this.onStart = h.onStart;
    this.onResume = h.onResume;
    this.onRestart = h.onRestart;
    this.onMenu = h.onMenu;
    this.onRecoveryYes = h.onRecoveryYes;
    this.onRecoveryNo = h.onRecoveryNo;
    this.onUnstick = h.onUnstick;
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
   * @param {boolean} [showFirstTimeTip] — explain Yes vs No (once per browser; caller gates with storage)
   */
  showRecovery(visible, showFirstTimeTip = false) {
    this.el.recovery.classList.toggle("hidden", !visible);
    if (this.el.recoveryFirstTip) {
      this.el.recoveryFirstTip.classList.toggle(
        "hidden",
        !visible || !showFirstTimeTip
      );
    }
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
    } = data;
    if (this.el.health)
      this.el.health.textContent = `${Math.max(0, Math.floor(health))}`;
    if (this.el.score) this.el.score.textContent = `${Math.floor(score)}`;
    if (this.el.speed)
      this.el.speed.textContent = `${speed.toFixed(1)}`;
    if (this.el.streak) this.el.streak.textContent = `${streak}`;
    if (this.el.shield) {
      this.el.shield.textContent = shield ? "Shield: ON" : "Shield: —";
      this.el.shield.classList.toggle("active", !!shield);
    }
    if (this.el.flow) {
      this.el.flow.textContent = automationFlow
        ? "Automation Flow"
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
    if (this.el.goBest) this.el.goBest.textContent = String(Math.floor(stats.best));
    if (this.el.goHits) this.el.goHits.textContent = String(stats.hits);
    if (this.el.goPickups) this.el.goPickups.textContent = String(stats.pickups);
    if (this.el.goCorrect) this.el.goCorrect.textContent = String(stats.correct);
  }

  shake() {
    if (!this.el.canvasWrap) return;
    this.el.canvasWrap.classList.remove("shake");
    void this.el.canvasWrap.offsetWidth;
    this.el.canvasWrap.classList.add("shake");
  }
}
