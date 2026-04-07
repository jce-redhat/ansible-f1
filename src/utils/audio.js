let ctx = null;
const buffers = {};
let unlocked = false;

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
  const c = getContext();
  if (c.state === "suspended") c.resume();
  const buf = buffers[url];
  if (!buf) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(c.destination);
  src.start(0);
}
