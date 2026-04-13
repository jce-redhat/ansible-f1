import { getLeaderboard, loadAchievements, ACHIEVEMENT_DEFS } from "../utils/storage.js";
import { fetchGlobalLeaderboard } from "../utils/firebase.js";
import * as THREE from "three";
import { LEVELS, DRIVERS } from "../data/config.js";
import { Player } from "./Player.js";

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
      remIcons: document.getElementById("rem-icons"),
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
      goCountry: document.getElementById("go-country"),
      goLeaderboard: document.getElementById("go-leaderboard"),
      goRankBanner: document.getElementById("go-rank-banner"),
      lbBody: document.getElementById("lb-body"),
      lbScroll: document.getElementById("lb-scroll"),

      quizPrompt: document.getElementById("quiz-prompt"),
      quizOpts: document.getElementById("quiz-options"),
      quizQuestionPanel: document.getElementById("quiz-question-panel"),
      quizResultPanel: document.getElementById("quiz-result-panel"),
      quizResultTitle: document.getElementById("quiz-result-title"),
      quizResultLines: document.getElementById("quiz-result-lines"),
      quizResultExplain: document.getElementById("quiz-result-explain"),
      quizResultTimer: document.getElementById("quiz-result-timer"),
      quizResultCountdown: document.getElementById("quiz-result-countdown"),

      billboardOverlay: document.getElementById("billboard-overlay"),
      billboardLabel: document.getElementById("billboard-label"),
      billboardContent: document.getElementById("billboard-content"),

      levelSelect: document.getElementById("level-select"),
      hudLevelName: document.getElementById("hud-level-name"),

      quizCountdown: document.getElementById("quiz-countdown"),
      damagePopup: document.getElementById("damage-popup"),
      pickupPopup: document.getElementById("pickup-popup"),
      hippoAnnounce: document.getElementById("hippo-announce"),

      manualBoost: document.getElementById("hud-manual-boost"),
      mbFill: document.getElementById("mb-fill"),
      brakeVignette: document.getElementById("brake-vignette"),
      finishFill: document.getElementById("finish-fill"),
      finishTime: document.getElementById("finish-time"),

      attractScores: document.getElementById("attract-scores"),
      attractScoresList: document.getElementById("attract-scores-list"),

      comboDisplay: document.getElementById("combo-display"),
      achievementPopup: document.getElementById("achievement-popup"),
      quizToggle: document.getElementById("quiz-toggle"),
      menuAchievements: document.getElementById("menu-achievements"),
      achievementsGrid: document.getElementById("achievements-grid"),

      driverSelect: document.getElementById("driver-select"),
      driverCards: document.getElementById("driver-cards"),
      driverDetail: document.getElementById("driver-detail"),
      driverDetailPhoto: document.getElementById("driver-detail-photo"),
      driverDetailName: document.getElementById("driver-detail-name"),
      driverDetailOrigin: document.getElementById("driver-detail-origin"),
      driverDetailBio: document.getElementById("driver-detail-bio"),

      levelComplete: document.getElementById("level-complete"),
      lcTitle: document.getElementById("lc-title"),
      lcMessage: document.getElementById("lc-message"),
      lcScore: document.getElementById("lc-score"),
      lcHits: document.getElementById("lc-hits"),
      lcPickups: document.getElementById("lc-pickups"),
      lcCorrect: document.getElementById("lc-correct"),
      lcEntry: document.getElementById("lc-entry"),
      lcNameInput: document.getElementById("lc-name-input"),
      lcCountry: document.getElementById("lc-country"),
      lcLeaderboard: document.getElementById("lc-leaderboard"),
      lcRankBanner: document.getElementById("lc-rank-banner"),
      lcLbBody: document.getElementById("lc-lb-body"),
      lcLbScroll: document.getElementById("lc-lb-scroll"),
    };

    this._selectedDriver = "anshul";
    this._statusTimer = null;
    this._recoveryCountdownId = null;
    this._recoveryAutoTimer = null;
    this._quizCountdownId = null;
    this._quizAutoTimer = null;
    this._levelSelectReturnTo = "main_menu";
    this._populateCountrySelect();
    this._bindButtons();
    this._drawLevelPreviews();
  }

  _populateCountrySelect() {
    const countries = [
      "US","GB","CA","AU","DE","FR","ES","IT","PT","NL","BE","AT","CH",
      "SE","NO","DK","FI","IE","PL","CZ","RO","HU","BG","HR","SK","SI",
      "LT","LV","EE","UA","RU","TR","GR","IL","IN","JP","KR","CN","TW",
      "SG","MY","TH","PH","ID","VN","BR","MX","AR","CL","CO","PE","ZA",
      "NG","EG","KE","NZ","SA","AE","QA","PK",
    ];
    for (const sel of [this.el.goCountry, this.el.lcCountry]) {
      if (!sel) continue;
      sel.innerHTML = "";
      for (const code of countries) {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = this._countryFlag(code);
        sel.appendChild(opt);
      }
      sel.value = "US";
    }
  }

  _bindButtons() {
    const on = (id, fn) => {
      const b = document.getElementById(id);
      if (b) b.addEventListener("click", fn);
    };
    on("btn-start", () => this.onStart && this.onStart());
    on("btn-highscores", () => this._showMenuLeaderboard());
    on("btn-lb-back", () => this._hideMenuLeaderboard());
    on("btn-achievements", () => this._showMenuAchievements());
    on("btn-ach-back", () => this._hideMenuAchievements());
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
    on("btn-choose-driver", () => this._showDriverSelect());
    on("btn-driver-back", () => this._hideDriverSelect());
    on("btn-select-driver", () => this._confirmDriver());

    window.addEventListener("keydown", (e) => {
      if (!this.isDriverSelectVisible() || this.el.driverDetail.classList.contains("hidden")) return;
      const keys = Object.keys(DRIVERS);
      const idx = keys.indexOf(this._pendingDriver);
      if (idx < 0) return;
      if (e.code === "ArrowLeft" || e.code === "ArrowUp") {
        e.preventDefault();
        this._showDriverDetail(keys[(idx - 1 + keys.length) % keys.length]);
      } else if (e.code === "ArrowRight" || e.code === "ArrowDown") {
        e.preventDefault();
        this._showDriverDetail(keys[(idx + 1) % keys.length]);
      }
    });

    on("btn-next-lc", () => this.onRestart && this.onRestart());
    on("btn-menu-lc", () => this.onMenu && this.onMenu());
    on("btn-save-score-lc", () => this.onSaveScoreLc && this.onSaveScoreLc());
    on("btn-choose-level-lc", () => this._openLevelSelect("level_complete"));
    const lcNameInput = document.getElementById("lc-name-input");
    if (lcNameInput) {
      lcNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (this.onSaveScoreLc) this.onSaveScoreLc();
        }
      });
    }

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
    this.onDriverSelect = h.onDriverSelect;
    this.onSaveScoreLc = h.onSaveScoreLc;
  }

  showMainMenu(visible) {
    this.el.mainMenu.classList.toggle("hidden", !visible);
  }

  async showAttractScores(visible) {
    if (!this.el.attractScores) return;
    if (visible && !this._attractClickBound) {
      this._attractClickBound = true;
      this.el.attractScores.addEventListener("click", () => {
        this.showAttractScores(false);
      });
    }
    if (visible) {
      const list = this.el.attractScoresList;
      list.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem">Loading…</div>';
      this.el.mainMenu.classList.add("hidden");
      this.el.attractScores.classList.remove("hidden");

      let board = await fetchGlobalLeaderboard(10).catch(() => []);
      if (board.length === 0) board = getLeaderboard().slice(0, 10);

      list.innerHTML = "";
      if (board.length === 0) {
        list.innerHTML = '<div style="color:var(--muted);text-align:center;padding:1rem">No scores yet — be the first!</div>';
      } else {
        board.forEach((entry, i) => {
          const row = document.createElement("div");
          row.className = "attract-score-row";
          row.style.animationDelay = `${i * 0.08}s`;
          const flag = this._countryFlag(entry.country);
          const lvl = this._levelLabel(entry.level);
          row.innerHTML = `<span class="rank">${i + 1}.</span>${flag ? `<span class="flag">${flag}</span>` : ""}<span class="name">${entry.name}</span>${lvl ? `<span class="level">${lvl}</span>` : ""}<span class="pts">${Math.floor(entry.score).toLocaleString()}</span>`;
          list.appendChild(row);
        });
      }
    } else {
      this.el.mainMenu.classList.remove("hidden");
      this.el.attractScores.classList.add("hidden");
    }
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

  showHippoAnnounce() {
    const el = this.el.hippoAnnounce;
    if (!el) return;
    el.classList.remove("show");
    el.innerHTML = "🦛 HIPPO MODE<br>ENGAGED 🦛";
    void el.offsetWidth;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 3000);
  }

  showCombo(count) {
    const el = this.el.comboDisplay;
    if (!el) return;
    if (count < 2) {
      el.classList.add("hidden");
      el.classList.remove("active");
      return;
    }
    el.textContent = `COMBO x${count}`;
    el.classList.remove("hidden", "active");
    void el.offsetWidth;
    el.classList.add("active");
  }

  showAchievement(name, desc) {
    const el = this.el.achievementPopup;
    if (!el) return;
    el.classList.remove("hidden", "show");
    el.innerHTML = `<div class="ach-title">Achievement Unlocked</div><div class="ach-name">${name}</div><div class="ach-desc">${desc}</div>`;
    void el.offsetWidth;
    el.classList.add("show");
    clearTimeout(this._achTimer);
    this._achTimer = setTimeout(() => {
      el.classList.remove("show");
      el.classList.add("hidden");
    }, 4000);
  }

  showAchievementsMenu(defs, unlocked) {
    const grid = this.el.achievementsGrid;
    const panel = this.el.menuAchievements;
    if (!grid || !panel) return;
    grid.innerHTML = "";
    for (const d of defs) {
      const isUnlocked = !!unlocked[d.id];
      const card = document.createElement("div");
      card.className = `ach-card ${isUnlocked ? "unlocked" : "locked"}`;
      card.innerHTML = `<div class="ach-card-name">${isUnlocked ? d.name : "???"}</div><div class="ach-card-desc">${d.desc}</div>`;
      grid.appendChild(card);
    }
    panel.classList.remove("hidden");
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

  startResultCountdown(seconds) {
    this.stopResultCountdown();
    const el = this.el.quizResultTimer;
    const cd = this.el.quizResultCountdown;
    if (!el || !cd) return;
    let remaining = seconds;
    cd.textContent = String(remaining);
    el.classList.remove("hidden");
    this._resultCountdownId = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        this.stopResultCountdown();
        return;
      }
      cd.textContent = String(remaining);
    }, 1000);
  }

  stopResultCountdown() {
    clearInterval(this._resultCountdownId);
    this._resultCountdownId = null;
    if (this.el.quizResultTimer) {
      this.el.quizResultTimer.classList.add("hidden");
    }
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

  async updateMenuBest(localBest) {
    if (!this.el.bestScoreMenu) return;
    this.el.bestScoreMenu.textContent = String(Math.floor(localBest));
    try {
      const board = await fetchGlobalLeaderboard(1);
      const globalBest = board.length > 0 ? board[0].score : 0;
      const best = Math.max(localBest, globalBest);
      this.el.bestScoreMenu.textContent = String(Math.floor(best));
    } catch { /* keep local value */ }
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

    if (this.el.remIcons && data.maxRemediations != null) {
      const used = data.remediationsUsed || 0;
      const max = data.maxRemediations;
      let html = "";
      for (let i = 0; i < max; i++) {
        const cls = i < max - used ? "rem-pip available" : "rem-pip spent";
        html += `<span class="${cls}">+</span>`;
      }
      this.el.remIcons.innerHTML = html;
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
    if (data.finishProgress != null && this.el.finishFill) {
      const p = Math.max(0, Math.min(1, data.finishProgress));
      this.el.finishFill.style.transform = `scaleX(${p})`;
    }
    if (data.finishTimeLeft != null && this.el.finishTime) {
      const secs = Math.max(0, Math.ceil(data.finishTimeLeft));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      this.el.finishTime.textContent = `${m}:${String(s).padStart(2, "0")}`;
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
  resetGameOver(lastName, lastCountry) {
    if (this.el.goEntry) this.el.goEntry.classList.remove("hidden");
    if (this.el.goLeaderboard) this.el.goLeaderboard.classList.add("hidden");
    if (this.el.goRankBanner) this.el.goRankBanner.classList.add("hidden");
    if (this.el.goNameInput) {
      this.el.goNameInput.value = lastName || "";
      setTimeout(() => this.el.goNameInput.focus(), 80);
    }
    if (this.el.goCountry) {
      this.el.goCountry.value = lastCountry || "US";
    }
  }

  getEnteredName() {
    return this.el.goNameInput ? this.el.goNameInput.value.trim() : "";
  }

  getSelectedCountry() {
    return this.el.goCountry ? this.el.goCountry.value : "US";
  }

  /** Switch from entry to leaderboard view and render the table. */
  async showLeaderboard(board, highlightRank, playerName, playerScore) {
    if (this.el.goEntry) this.el.goEntry.classList.add("hidden");
    const lb = this.el.goLeaderboard;
    if (lb) lb.classList.remove("hidden");

    const body = this.el.lbBody;
    if (!body) return;

    this._renderBoardInto(body, board);

    const global = await fetchGlobalLeaderboard(50);
    if (global.length > 0) {
      const globalRank = this._findPlayerRank(global, playerName, playerScore);
      this._renderBoardInto(body, global, globalRank);
      this._showRankBanner(this.el.goRankBanner, globalRank, global.length);
      if (this.el.lbScroll && globalRank >= 0) {
        const rows = body.querySelectorAll("tr");
        if (rows[globalRank]) {
          setTimeout(() => rows[globalRank].scrollIntoView({ block: "center" }), 100);
        }
      }
    } else {
      this._renderBoardInto(body, board, highlightRank);
      this._showRankBanner(this.el.goRankBanner, highlightRank, board.length);
    }
  }

  showLevelComplete(visible) {
    if (this.el.levelComplete) this.el.levelComplete.classList.toggle("hidden", !visible);
  }

  setLevelCompleteStats(stats, isCheater = false, cheaterType = null) {
    if (this.el.lcScore) this.el.lcScore.textContent = String(Math.floor(stats.score));
    if (this.el.lcHits) this.el.lcHits.textContent = String(stats.hits);
    if (this.el.lcPickups) this.el.lcPickups.textContent = String(stats.pickups);
    if (this.el.lcCorrect) this.el.lcCorrect.textContent = String(stats.correct);
    if (isCheater) {
      if (cheaterType === "hippo") {
        if (this.el.lcTitle) this.el.lcTitle.textContent = "🦛 Hippo Mode Complete!";
        if (this.el.lcMessage) this.el.lcMessage.textContent =
          "Sorry, hippo mode can't be on the leaderboard. Stop cheating!";
      } else {
        if (this.el.lcTitle) this.el.lcTitle.textContent = "Nice Finish... Cheater";
        if (this.el.lcMessage) this.el.lcMessage.textContent =
          "Playing as Andrius is basically cheating. Pick a real driver and try again — if you dare.";
      }
      if (this.el.lcEntry) this.el.lcEntry.classList.add("hidden");
    } else {
      if (this.el.lcTitle) this.el.lcTitle.textContent = "Level Complete!";
      const bonus = stats.finishBonus || 0;
      if (this.el.lcMessage) this.el.lcMessage.textContent =
        bonus > 0 ? `Finish bonus: +${bonus.toLocaleString()} points!` : "";
      if (this.el.lcEntry) this.el.lcEntry.classList.remove("hidden");
    }
  }

  resetLevelComplete(lastName, lastCountry) {
    if (this.el.lcEntry) this.el.lcEntry.classList.remove("hidden");
    if (this.el.lcLeaderboard) this.el.lcLeaderboard.classList.add("hidden");
    if (this.el.lcRankBanner) this.el.lcRankBanner.classList.add("hidden");
    if (this.el.lcNameInput) {
      this.el.lcNameInput.value = lastName || "";
      setTimeout(() => this.el.lcNameInput.focus(), 80);
    }
    if (this.el.lcCountry) {
      this.el.lcCountry.value = lastCountry || "US";
    }
  }

  getLcEnteredName() {
    return this.el.lcNameInput ? this.el.lcNameInput.value.trim() : "";
  }

  getLcSelectedCountry() {
    return this.el.lcCountry ? this.el.lcCountry.value : "US";
  }

  async showLcLeaderboard(board, highlightRank, playerName, playerScore) {
    if (this.el.lcEntry) this.el.lcEntry.classList.add("hidden");
    const lb = this.el.lcLeaderboard;
    if (lb) lb.classList.remove("hidden");

    const body = this.el.lcLbBody;
    if (!body) return;

    this._renderBoardInto(body, board);

    const global = await fetchGlobalLeaderboard(50);
    if (global.length > 0) {
      const globalRank = this._findPlayerRank(global, playerName, playerScore);
      this._renderBoardInto(body, global, globalRank);
      this._showRankBanner(this.el.lcRankBanner, globalRank, global.length);
      if (this.el.lcLbScroll && globalRank >= 0) {
        const rows = body.querySelectorAll("tr");
        if (rows[globalRank]) {
          setTimeout(() => rows[globalRank].scrollIntoView({ block: "center" }), 100);
        }
      }
    } else {
      this._renderBoardInto(body, board, highlightRank);
      this._showRankBanner(this.el.lcRankBanner, highlightRank, board.length);
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

  _countryFlag(code) {
    if (!code || code.length !== 2) return "";
    return String.fromCodePoint(
      ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
    );
  }

  _levelLabel(id) {
    const lvl = LEVELS[id];
    return lvl ? lvl.subtitle : "";
  }

  _renderBoardInto(body, board, highlightIdx = -1) {
    body.innerHTML = "";
    if (board.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.textContent = "No scores yet — play a round!";
      td.style.textAlign = "center";
      td.style.color = "var(--muted)";
      td.style.padding = "1.5rem 0.5rem";
      tr.appendChild(td);
      body.appendChild(tr);
    } else {
      board.forEach((entry, i) => {
        const tr = document.createElement("tr");
        if (i === highlightIdx) tr.classList.add("lb-current");
        const tdRank = document.createElement("td");
        tdRank.textContent = String(i + 1);
        const tdFlag = document.createElement("td");
        tdFlag.className = "lb-flag";
        tdFlag.textContent = this._countryFlag(entry.country);
        const tdName = document.createElement("td");
        tdName.textContent = entry.name || "???";
        const tdLevel = document.createElement("td");
        tdLevel.className = "lb-level";
        tdLevel.textContent = this._levelLabel(entry.level);
        const tdScore = document.createElement("td");
        tdScore.textContent = String(Math.floor(entry.score));
        tr.append(tdRank, tdFlag, tdName, tdLevel, tdScore);
        body.appendChild(tr);
      });
    }
  }

  _findPlayerRank(board, name, score) {
    if (!name) return -1;
    const normName = name.trim().toLowerCase();
    const normScore = Math.floor(score);
    return board.findIndex(
      (e) => e.name.trim().toLowerCase() === normName && Math.floor(e.score) === normScore
    );
  }

  _ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  _showRankBanner(banner, rank, boardSize) {
    if (!banner) return;
    if (rank < 0) {
      banner.className = "rank-banner outside";
      banner.textContent = `Your score didn't make the top ${boardSize} — keep racing!`;
      banner.classList.remove("hidden");
      return;
    }
    const place = this._ordinal(rank + 1);
    const inTop50 = rank < 50;
    banner.className = `rank-banner ${inTop50 ? "top50" : "outside"}`;
    banner.textContent = inTop50
      ? `${place} Place!`
      : `${place} Place`;
    banner.classList.remove("hidden");
  }

  async _fetchBoard() {
    const global = await fetchGlobalLeaderboard(50);
    return global.length > 0 ? global : getLeaderboard();
  }

  async _showMenuLeaderboard() {
    const lb = document.getElementById("menu-leaderboard");
    if (!lb) return;
    lb.classList.remove("hidden");
    this._toggleMenuButtons(false);
    const body = document.getElementById("menu-lb-body");
    if (!body) return;
    body.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:1rem">Loading…</td></tr>';
    const board = await this._fetchBoard();
    this._renderBoardInto(body, board);
  }

  _hideMenuLeaderboard() {
    const lb = document.getElementById("menu-leaderboard");
    if (lb) lb.classList.add("hidden");
    this._toggleMenuButtons(true);
  }

  _showMenuAchievements() {
    this.showAchievementsMenu(ACHIEVEMENT_DEFS, loadAchievements());
    this._toggleMenuButtons(false);
  }

  _hideMenuAchievements() {
    if (this.el.menuAchievements) {
      this.el.menuAchievements.classList.add("hidden");
    }
    this._toggleMenuButtons(true);
  }

  _showDriverSelect() {
    if (!this.el.driverSelect) return;
    this.el.mainMenu.classList.add("hidden");
    this.el.attractScores.classList.add("hidden");
    this.el.driverSelect.classList.remove("hidden");
    this.el.driverDetail.classList.add("hidden");
    this.el.driverCards.classList.remove("compact");
    this._renderDriverCards();
  }

  _hideDriverSelect() {
    this._stopCarPreview();
    if (this.el.driverSelect) this.el.driverSelect.classList.add("hidden");
    this.el.mainMenu.classList.remove("hidden");
  }

  _carLabel(carType) {
    if (carType === "truck") return "Pickup Truck";
    if (carType === "lightcycle") return "Lightcycle";
    if (carType === "delorean") return "DeLorean";
    if (carType === "semi_truck") return "18-Wheeler";
    return "F1 Racer";
  }

  _renderDriverCards() {
    const container = this.el.driverCards;
    if (!container) return;
    container.innerHTML = "";
    for (const d of Object.values(DRIVERS)) {
      const flag = d.country ? this._countryFlag(d.country) : "";
      const card = document.createElement("div");
      card.className = "driver-card" + (d.id === this._selectedDriver ? " active" : "");
      card.innerHTML = `
        <img class="driver-card-photo" src="${d.photo}" alt="${d.name}" />
        <p class="driver-card-name">${flag ? `<span class="driver-card-flag">${flag}</span> ` : ""}${d.name}</p>
        <p class="driver-card-origin">${d.origin}</p>
        <span class="driver-card-tag">${this._carLabel(d.car)}</span>
      `;
      card.addEventListener("click", () => this._showDriverDetail(d.id));
      container.appendChild(card);
    }
  }

  _showDriverDetail(driverId) {
    const d = DRIVERS[driverId];
    if (!d) return;
    this._pendingDriver = driverId;
    this.el.driverDetail.classList.remove("hidden");
    this.el.driverDetailPhoto.src = d.photo;
    this.el.driverDetailPhoto.alt = d.name;
    const flag = d.country ? this._countryFlag(d.country) : "";
    this.el.driverDetailName.textContent = `${flag} ${d.name}`;
    this.el.driverDetailOrigin.textContent = d.origin;
    this.el.driverDetailBio.textContent = d.bio;

    this.el.driverCards.classList.add("compact");
    this.el.driverCards.querySelectorAll(".driver-card").forEach((c) => c.classList.remove("active"));
    const cards = this.el.driverCards.children;
    const keys = Object.keys(DRIVERS);
    const idx = keys.indexOf(driverId);
    if (idx >= 0 && cards[idx]) cards[idx].classList.add("active");

    this._startCarPreview(d.car);
  }

  _startCarPreview(carType) {
    this._stopCarPreview();

    const container = document.getElementById("driver-car-preview");
    if (!container) return;

    const w = 200, h = 200;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 50);
    camera.position.set(3.5, 2.5, 3.5);
    camera.lookAt(0, 0.3, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(4, 6, 3);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-3, 2, -2);
    scene.add(fill);

    const tempPlayer = new Player(scene, carType);
    const car = tempPlayer.mesh;
    car.position.set(0, 0, 0);

    const pivot = new THREE.Group();
    pivot.add(car);
    scene.add(pivot);

    let running = true;
    const animate = () => {
      if (!running) return;
      requestAnimationFrame(animate);
      pivot.rotation.y += 0.008;
      renderer.render(scene, camera);
    };
    animate();

    this._carPreview = { renderer, scene, tempPlayer, pivot, running: true, stop() {
      running = false;
      tempPlayer.dispose();
      renderer.dispose();
      container.innerHTML = "";
    }};
  }

  _stopCarPreview() {
    if (this._carPreview) {
      this._carPreview.stop();
      this._carPreview = null;
    }
  }

  _confirmDriver() {
    if (!this._pendingDriver) return;
    this._selectedDriver = this._pendingDriver;
    if (this.onDriverSelect) this.onDriverSelect(this._selectedDriver);
    this._hideDriverSelect();
  }

  showDriverSelect(visible) {
    if (!visible) this._stopCarPreview();
    if (this.el.driverSelect) {
      this.el.driverSelect.classList.toggle("hidden", !visible);
    }
  }

  isDriverSelectVisible() {
    return this.el.driverSelect && !this.el.driverSelect.classList.contains("hidden");
  }

  setActiveDriver(id) {
    this._selectedDriver = id;
  }

  _toggleMenuButtons(visible) {
    const ids = ["btn-start", "btn-choose-driver", "btn-choose-level-menu", "btn-highscores", "btn-achievements"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.classList.toggle("hidden", !visible);
    }
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
    if (this.el.levelComplete) this.el.levelComplete.classList.add("hidden");
    this.showLevelSelect(true);
  }

  _closeLevelSelect() {
    this.showLevelSelect(false);
    if (this._levelSelectReturnTo === "main_menu") {
      this.el.mainMenu.classList.remove("hidden");
    } else if (this._levelSelectReturnTo === "game_over") {
      if (this.el.gameOver) this.el.gameOver.classList.remove("hidden");
    } else if (this._levelSelectReturnTo === "level_complete") {
      if (this.el.levelComplete) this.el.levelComplete.classList.remove("hidden");
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
