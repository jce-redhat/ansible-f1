import * as THREE from "three";
import { Game } from "./game/Game.js";
import { UI } from "./game/UI.js";
import { getBestScore } from "./utils/storage.js";
import { startBgm, toggleMusicMute, toggleSfxMute } from "./utils/audio.js";
import { loadQuestions } from "./data/questions.js";

await loadQuestions();

const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
// Slightly lifted so silhouettes separate from the void (was pure black crush)
scene.background = new THREE.Color(0x0a0e18);
scene.fog = new THREE.Fog(0x0a0e18, 48, 175);

const camera = new THREE.PerspectiveCamera(
  58,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 5.2, 12);

const ui = new UI();
const game = new Game(renderer, scene, camera, ui);

ui.setHandlers({
  onStart: () => game.startFromMenu(),
  onResume: () => game.resume(),
  onRestart: () => game.startFromMenu(),
  onMenu: () => game.backToMenu(),
  onSaveScore: () => game.saveScore(),
  onRecoveryYes: () => game.onRecoveryYes(),
  onRecoveryNo: () => game.onRecoveryNo(),
  onUnstick: () => game.forceUnstick(),
  onBillboardClose: () => game.closeBillboard(),
  onTouchPause: () => {
    if (game.state === "running") {
      game.state = "paused";
      ui.showPause(true);
    }
  },
  onLevelSelect: (levelId) => game.switchLevel(levelId),
  onPauseForLevelSelect: () => {
    if (game.state === "running") {
      game.state = "paused";
    }
  },
});

game.state = "main_menu";
ui.showMainMenu(true);
ui.updateMenuBest(getBestScore());
ui.setActiveLevel("A");

startBgm("./assets/audio/bgm.m4a", 0.1);

const btnMusic = document.getElementById("btn-music");
const btnSfx = document.getElementById("btn-sfx");
if (btnMusic) {
  btnMusic.addEventListener("click", () => {
    const muted = toggleMusicMute();
    btnMusic.classList.toggle("muted", muted);
    btnMusic.title = muted ? "Music off" : "Toggle music";
  });
}
if (btnSfx) {
  btnSfx.addEventListener("click", () => {
    const muted = toggleSfxMute();
    btnSfx.classList.toggle("muted", muted);
    btnSfx.title = muted ? "SFX off" : "Toggle sound effects";
  });
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function frame() {
  requestAnimationFrame(frame);
  game.update();
  game.render();
}
requestAnimationFrame(frame);
