let ctx = null;
const buffers = {};
let unlocked = false;

let _sfxMuted = false;
let _musicMuted = false;

function getContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

function unlock() {
  if (unlocked) return;
  const c = getContext();
  if (c.state === "suspended") c.resume();
  unlocked = true;
  if (_bgmEl && _bgmEl.paused && !_musicMuted) {
    _bgmEl.play().catch(() => {});
  }
}

window.addEventListener("click", unlock, { once: true });
window.addEventListener("keydown", unlock, { once: true });

async function loadBuffer(url) {
  if (buffers[url]) return buffers[url];
  const c = getContext();
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  const buf = await c.decodeAudioData(arr);
  buffers[url] = buf;
  return buf;
}

export async function preload(urls) {
  await Promise.all(urls.map((u) => loadBuffer(u)));
}

export function play(url, volume = 1) {
  if (_sfxMuted) return;
  const c = getContext();
  if (c.state === "suspended") c.resume();
  const buf = buffers[url];
  if (!buf) {
    const el = new Audio(url);
    el.volume = volume;
    el.play().catch(() => {});
    loadBuffer(url).catch(() => {});
    return;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(c.destination);
  src.start(0);
}

// --- Engine loop (in-game SFX loop, respects SFX mute) ---
let _loopEl = null;
let _loopUrl = null;
let _loopVol = 0.2;

export function startLoop(url, volume = 0.2) {
  stopLoop();
  _loopUrl = url;
  _loopVol = volume;
  if (_sfxMuted) return;
  _loopEl = new Audio(url);
  _loopEl.loop = true;
  _loopEl.volume = volume;
  _loopEl.play().catch(() => {});
}

export function stopLoop() {
  if (_loopEl) {
    _loopEl.pause();
    _loopEl.currentTime = 0;
    _loopEl = null;
  }
  _loopUrl = null;
}

// --- Background music (always looping, independent of engine loop) ---
let _bgmEl = null;
let _bgmVol = 0.1;

export function startBgm(url, volume = 0.1) {
  if (_bgmEl) {
    _bgmEl.pause();
    _bgmEl = null;
  }
  _bgmVol = volume;
  _bgmEl = new Audio(url);
  _bgmEl.loop = true;
  _bgmEl.volume = _musicMuted ? 0 : volume;
  _bgmEl.play().catch(() => {});
}

export function pauseBgm() {
  if (_bgmEl && !_bgmEl.paused) _bgmEl.pause();
}

export function resumeBgm() {
  if (_bgmEl && _bgmEl.paused && !_musicMuted) _bgmEl.play().catch(() => {});
}

// --- Mute toggles ---
export function isSfxMuted() {
  return _sfxMuted;
}

export function toggleSfxMute() {
  _sfxMuted = !_sfxMuted;
  if (_sfxMuted) {
    if (_loopEl) {
      _loopEl.pause();
      _loopEl.currentTime = 0;
      _loopEl = null;
    }
  } else if (_loopUrl) {
    _loopEl = new Audio(_loopUrl);
    _loopEl.loop = true;
    _loopEl.volume = _loopVol;
    _loopEl.play().catch(() => {});
  }
  return _sfxMuted;
}

export function isMusicMuted() {
  return _musicMuted;
}

export function toggleMusicMute() {
  _musicMuted = !_musicMuted;
  if (_bgmEl) {
    _bgmEl.volume = _musicMuted ? 0 : _bgmVol;
  }
  return _musicMuted;
}
