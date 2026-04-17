import * as THREE from "three";
import { play } from "../utils/audio.js";

const CITY_SIZE = 120;
const GRID_SPACING = 12;
const GODZILLA_SPEED = 18;
const GODZILLA_TURN_SPEED = 3;
const GODZILLA_RADIUS = 2.5;
const DURATION = 60;
const BUILDING_SCORE = 100;
const FIRE_RANGE = 20;
const FIRE_RADIUS = 3;

const SFX_CRUSH = "./assets/audio/train-explosion.m4a";
const SFX_STOMP = "./assets/audio/obstacle-hit.wav";
const SFX_ROAR = "./assets/audio/train-whistle.m4a";
const SFX_FIRE = "./assets/audio/boost-whoosh.wav";

const BUILDING_COLORS = [
  0x8899aa, 0x667788, 0x556677, 0x99aabb,
  0xbbaa88, 0xccbb99, 0x778899, 0x6688aa,
  0x445566, 0x7799bb, 0xaa9977, 0x889988,
];

const WINDOW_COLOR = 0xffeeaa;
const WINDOW_DARK = 0x334455;

export class GodzillaMode {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.active = false;

    this.group = new THREE.Group();
    this.godzilla = null;
    this.buildings = [];
    this.rubble = [];
    this.fireParticles = [];
    this.score = 0;
    this.crushed = 0;
    this.timeLeft = DURATION;
    this.totalBuildings = 0;

    this._keys = { w: false, a: false, s: false, d: false };
    this._facing = 0;
    this._walkPhase = 0;
    this._godzillaPos = new THREE.Vector3();
    this._shakeUntil = 0;
    this._shakeAmp = 0;
    this._fireActive = false;
    this._fireTimer = 0;

    this._parts = {};

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onClickFire = this._onClickFire.bind(this);

    this._touchActive = false;
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchDx = 0;
    this._touchDy = 0;
    this._joystickEl = null;
    this._joystickKnob = null;
    this._fireBtn = null;
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
  }

  enter(hiddenObjects) {
    this.active = true;
    this._hiddenObjects = hiddenObjects;
    this.score = 0;
    this.crushed = 0;
    this.timeLeft = DURATION;
    this._facing = 0;
    this._walkPhase = 0;
    this._keys = { w: false, a: false, s: false, d: false };
    this._shakeUntil = 0;
    this._fireActive = false;
    this._fireTimer = 0;
    this.rubble = [];
    this.fireParticles = [];

    hiddenObjects.forEach(o => { o.visible = false; });

    this._buildCity();
    this._buildGodzilla();
    this.scene.add(this.group);

    this._godzillaPos.set(0, 0, 0);
    this.godzilla.position.copy(this._godzillaPos);

    this._savedFog = this.scene.fog;
    this._savedBg = this.scene.background;
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 200);

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousedown", this._onClickFire);
    window.addEventListener("mouseup", this._onClickFireEnd);

    this._setupTouchControls();

    play(SFX_ROAR, 0.9);
  }

  exit() {
    this.active = false;
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousedown", this._onClickFire);
    window.removeEventListener("mouseup", this._onClickFireEnd);
    this._teardownTouchControls();

    this._disposeGroup(this.group);
    this.scene.remove(this.group);
    this.group = new THREE.Group();
    this.buildings = [];

    for (const r of this.rubble) {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.mesh.material.dispose();
    }
    this.rubble = [];

    for (const p of this.fireParticles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this.fireParticles = [];

    this.scene.fog = this._savedFog;
    this.scene.background = this._savedBg;

    if (this._hiddenObjects) {
      this._hiddenObjects.forEach(o => { o.visible = true; });
      this._hiddenObjects = null;
    }

    this.godzilla = null;
    this._parts = {};
  }

  _disposeGroup(g) {
    g.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
    while (g.children.length) g.remove(g.children[0]);
  }

  // --- City ---

  _buildCity() {
    const groundGeo = new THREE.PlaneGeometry(CITY_SIZE * 2, CITY_SIZE * 2);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x445544, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.group.add(ground);

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.85 });
    const roadWidth = 5;
    for (let x = -CITY_SIZE + GRID_SPACING; x < CITY_SIZE; x += GRID_SPACING) {
      const rGeo = new THREE.PlaneGeometry(roadWidth, CITY_SIZE * 2);
      const road = new THREE.Mesh(rGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.01, 0);
      this.group.add(road);
    }
    for (let z = -CITY_SIZE + GRID_SPACING; z < CITY_SIZE; z += GRID_SPACING) {
      const rGeo = new THREE.PlaneGeometry(CITY_SIZE * 2, roadWidth);
      const road = new THREE.Mesh(rGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.01, z);
      this.group.add(road);
    }

    this.buildings = [];
    const halfRoad = roadWidth / 2 + 0.5;

    let eiffelPlaced = false;

    for (let gx = -CITY_SIZE + GRID_SPACING; gx < CITY_SIZE; gx += GRID_SPACING) {
      for (let gz = -CITY_SIZE + GRID_SPACING; gz < CITY_SIZE; gz += GRID_SPACING) {
        if (Math.abs(gx) < GRID_SPACING && Math.abs(gz) < GRID_SPACING) continue;

        if (!eiffelPlaced && Math.abs(gx - 36) < GRID_SPACING && Math.abs(gz - 36) < GRID_SPACING) {
          this._buildEiffelTower(gx, gz);
          eiffelPlaced = true;
          continue;
        }

        const bPerBlock = 1 + Math.floor(Math.random() * 2);
        for (let b = 0; b < bPerBlock; b++) {
          const w = 2 + Math.random() * 2.5;
          const d = 2 + Math.random() * 2.5;
          const h = 3 + Math.random() * 10;
          const color = BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];
          const hasPointedRoof = Math.random() < 0.2;
          const hasScoreMarker = Math.random() < 0.08;

          const bGroup = new THREE.Group();

          const geo = new THREE.BoxGeometry(w, h, d);
          const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.position.y = h / 2;
          bGroup.add(mesh);

          this._addWindows(bGroup, w, h, d);

          if (hasPointedRoof) {
            const roofH = 1.5 + Math.random() * 2;
            const roofGeo = new THREE.ConeGeometry(Math.min(w, d) * 0.6, roofH, 4);
            const roofMat = new THREE.MeshStandardMaterial({ color: 0x884433, roughness: 0.6 });
            const roof = new THREE.Mesh(roofGeo, roofMat);
            roof.position.y = h + roofH / 2;
            roof.rotation.y = Math.PI / 4;
            roof.castShadow = true;
            bGroup.add(roof);
          }

          if (hasScoreMarker) {
            const ringGeo = new THREE.TorusGeometry(1.2, 0.15, 8, 16);
            const ringMat = new THREE.MeshStandardMaterial({
              color: 0xffdd00, emissive: 0xffdd00, emissiveIntensity: 0.5,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.y = h + 2;
            ring.rotation.x = Math.PI / 2;
            bGroup.add(ring);
          }

          const offX = (Math.random() - 0.5) * (GRID_SPACING - halfRoad * 2 - w);
          const offZ = (Math.random() - 0.5) * (GRID_SPACING - halfRoad * 2 - d);
          bGroup.position.set(gx + offX, 0, gz + offZ);
          this.group.add(bGroup);

          this.buildings.push({
            mesh: bGroup,
            w, h, d,
            alive: true,
            crushing: false,
            crushT: 0,
            origY: 0,
            hasScoreMarker,
          });
        }
      }
    }
    this.totalBuildings = this.buildings.length;

    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    this.group.add(sun);
    this.group.add(sun.target);

    const ambient = new THREE.AmbientLight(0x99bbdd, 0.6);
    this.group.add(ambient);
  }

  _addWindows(bGroup, w, h, d) {
    const winW = 0.4;
    const winH = 0.5;
    const floorH = 2;
    const floors = Math.floor(h / floorH);

    const winMat = new THREE.MeshStandardMaterial({
      color: WINDOW_COLOR, emissive: WINDOW_COLOR, emissiveIntensity: 0.3,
      roughness: 0.3,
    });
    const winDarkMat = new THREE.MeshStandardMaterial({
      color: WINDOW_DARK, roughness: 0.5,
    });
    const winGeo = new THREE.PlaneGeometry(winW, winH);

    const colsX = Math.max(1, Math.floor(w / 1.2));
    const colsZ = Math.max(1, Math.floor(d / 1.2));

    for (let f = 0; f < floors; f++) {
      const wy = f * floorH + floorH * 0.6;
      if (wy > h - 0.5) break;
      const lit = Math.random() > 0.3;
      const mat = lit ? winMat : winDarkMat;

      for (let c = 0; c < colsX; c++) {
        const wx = -w / 2 + (w / (colsX + 1)) * (c + 1);
        const wf = new THREE.Mesh(winGeo, mat);
        wf.position.set(wx, wy, d / 2 + 0.01);
        bGroup.add(wf);
        const wb = new THREE.Mesh(winGeo, mat);
        wb.position.set(wx, wy, -d / 2 - 0.01);
        wb.rotation.y = Math.PI;
        bGroup.add(wb);
      }
      for (let c = 0; c < colsZ; c++) {
        const wz = -d / 2 + (d / (colsZ + 1)) * (c + 1);
        const wl = new THREE.Mesh(winGeo, mat);
        wl.position.set(-w / 2 - 0.01, wy, wz);
        wl.rotation.y = -Math.PI / 2;
        bGroup.add(wl);
        const wr = new THREE.Mesh(winGeo, mat);
        wr.position.set(w / 2 + 0.01, wy, wz);
        wr.rotation.y = Math.PI / 2;
        bGroup.add(wr);
      }
    }
  }

  _buildEiffelTower(cx, cz) {
    const tGroup = new THREE.Group();
    const ironColor = 0x665544;
    const mat = new THREE.MeshStandardMaterial({ color: ironColor, roughness: 0.5 });

    const legW = 0.8;
    const baseSpread = 4;
    const towerH = 28;

    for (const [sx, sz] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      const legGeo = new THREE.BoxGeometry(legW, towerH * 0.4, legW);
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(sx * baseSpread * 0.5, towerH * 0.2, sz * baseSpread * 0.5);
      leg.rotation.z = sx * -0.15;
      leg.rotation.x = sz * 0.15;
      leg.castShadow = true;
      tGroup.add(leg);
    }

    const platGeo = new THREE.BoxGeometry(baseSpread * 0.9, 0.5, baseSpread * 0.9);
    const plat = new THREE.Mesh(platGeo, mat);
    plat.position.y = towerH * 0.35;
    tGroup.add(plat);

    const midGeo = new THREE.BoxGeometry(2, towerH * 0.35, 2);
    const mid = new THREE.Mesh(midGeo, mat);
    mid.position.y = towerH * 0.35 + towerH * 0.175;
    mid.castShadow = true;
    tGroup.add(mid);

    const platGeo2 = new THREE.BoxGeometry(2.5, 0.4, 2.5);
    const plat2 = new THREE.Mesh(platGeo2, mat);
    plat2.position.y = towerH * 0.7;
    tGroup.add(plat2);

    const spireGeo = new THREE.ConeGeometry(0.4, towerH * 0.3, 4);
    const spire = new THREE.Mesh(spireGeo, mat);
    spire.position.y = towerH * 0.7 + towerH * 0.15;
    spire.castShadow = true;
    tGroup.add(spire);

    const tipGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.6,
    });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = towerH * 0.85 + 0.3;
    tGroup.add(tip);

    tGroup.position.set(cx, 0, cz);
    this.group.add(tGroup);

    this.buildings.push({
      mesh: tGroup,
      w: baseSpread + 2, h: towerH, d: baseSpread + 2,
      alive: true, crushing: false, crushT: 0, origY: 0,
      hasScoreMarker: true,
    });
  }

  // --- Godzilla mesh ---

  _buildGodzilla() {
    const g = new THREE.Group();
    const green = 0x2d5a27;
    const darkGreen = 0x1e3d1a;
    const belly = 0x8a9a6a;
    const eye = 0xffcc00;

    const torsoGeo = new THREE.BoxGeometry(3, 4, 2.5);
    const torsoMat = new THREE.MeshStandardMaterial({ color: green, roughness: 0.6 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 5;
    torso.castShadow = true;
    g.add(torso);

    const bellyGeo = new THREE.BoxGeometry(2.4, 3, 1.8);
    const bellyMat = new THREE.MeshStandardMaterial({ color: belly, roughness: 0.7 });
    const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
    bellyMesh.position.set(0, 4.8, 0.4);
    g.add(bellyMesh);

    const headGeo = new THREE.BoxGeometry(2, 1.8, 2);
    const headMat = new THREE.MeshStandardMaterial({ color: green, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 8, 0.3);
    head.castShadow = true;
    g.add(head);
    this._parts.head = head;

    const jawGeo = new THREE.BoxGeometry(1.8, 0.6, 1.8);
    const jawMat = new THREE.MeshStandardMaterial({ color: darkGreen, roughness: 0.5 });
    const jaw = new THREE.Mesh(jawGeo, jawMat);
    jaw.position.set(0, 7, 0.4);
    g.add(jaw);
    this._parts.jaw = jaw;

    const eyeGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: eye, emissive: eye, emissiveIntensity: 0.8 });
    const lEye = new THREE.Mesh(eyeGeo, eyeMat);
    lEye.position.set(-0.6, 8.3, 1);
    g.add(lEye);
    const rEye = new THREE.Mesh(eyeGeo, eyeMat);
    rEye.position.set(0.6, 8.3, 1);
    g.add(rEye);

    const armGeo = new THREE.BoxGeometry(0.7, 2, 0.7);
    const armMat = new THREE.MeshStandardMaterial({ color: green, roughness: 0.6 });
    const lArm = new THREE.Mesh(armGeo, armMat);
    lArm.position.set(-2, 5.5, 0.3);
    g.add(lArm);
    const rArm = new THREE.Mesh(armGeo, armMat);
    rArm.position.set(2, 5.5, 0.3);
    g.add(rArm);
    this._parts.lArm = lArm;
    this._parts.rArm = rArm;

    const legGeo = new THREE.BoxGeometry(1.2, 3, 1.2);
    const legMat = new THREE.MeshStandardMaterial({ color: darkGreen, roughness: 0.6 });
    const lLeg = new THREE.Mesh(legGeo, legMat);
    lLeg.position.set(-1, 1.5, 0);
    lLeg.castShadow = true;
    g.add(lLeg);
    const rLeg = new THREE.Mesh(legGeo, legMat);
    rLeg.position.set(1, 1.5, 0);
    rLeg.castShadow = true;
    g.add(rLeg);
    this._parts.lLeg = lLeg;
    this._parts.rLeg = rLeg;

    const tailParts = [];
    for (let i = 0; i < 5; i++) {
      const s = 1 - i * 0.15;
      const tGeo = new THREE.BoxGeometry(1.2 * s, 1 * s, 1.5);
      const tMat = new THREE.MeshStandardMaterial({ color: darkGreen, roughness: 0.6 });
      const seg = new THREE.Mesh(tGeo, tMat);
      seg.position.set(0, 3 - i * 0.5, -1.5 - i * 1.4);
      seg.castShadow = true;
      g.add(seg);
      tailParts.push(seg);
    }
    this._parts.tail = tailParts;

    const spineGeo = new THREE.ConeGeometry(0.3, 1.2, 4);
    const spineMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.4 });
    for (let i = 0; i < 5; i++) {
      const spine = new THREE.Mesh(spineGeo, spineMat);
      spine.position.set(0, 7.5 - i * 1.1, -0.8 - i * 0.3);
      spine.rotation.x = -0.2;
      g.add(spine);
    }

    this.godzilla = g;
    this.group.add(g);
  }

  // --- Input ---

  _onKeyDown(e) {
    const k = e.code;
    if (k === "KeyW" || k === "ArrowUp") { this._keys.w = true; e.preventDefault(); }
    if (k === "KeyS" || k === "ArrowDown") { this._keys.s = true; e.preventDefault(); }
    if (k === "KeyA" || k === "ArrowLeft") { this._keys.a = true; e.preventDefault(); }
    if (k === "KeyD" || k === "ArrowRight") { this._keys.d = true; e.preventDefault(); }
  }

  _onKeyUp(e) {
    const k = e.code;
    if (k === "KeyW" || k === "ArrowUp") this._keys.w = false;
    if (k === "KeyS" || k === "ArrowDown") this._keys.s = false;
    if (k === "KeyA" || k === "ArrowLeft") this._keys.a = false;
    if (k === "KeyD" || k === "ArrowRight") this._keys.d = false;
  }

  _onClickFire = () => { this._fireActive = true; };
  _onClickFireEnd = () => { this._fireActive = false; };

  _setupTouchControls() {
    const isMobile = window.matchMedia("(pointer: coarse)").matches;
    if (!isMobile) return;

    this._joystickEl = document.createElement("div");
    Object.assign(this._joystickEl.style, {
      position: "fixed", bottom: "30px", left: "30px",
      width: "120px", height: "120px", borderRadius: "50%",
      background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)",
      zIndex: "800", touchAction: "none",
    });
    this._joystickKnob = document.createElement("div");
    Object.assign(this._joystickKnob.style, {
      position: "absolute", width: "44px", height: "44px", borderRadius: "50%",
      background: "rgba(255,255,255,0.5)", left: "38px", top: "38px",
      transition: "none", pointerEvents: "none",
    });
    this._joystickEl.appendChild(this._joystickKnob);
    document.body.appendChild(this._joystickEl);

    this._joystickEl.addEventListener("touchstart", this._onTouchStart, { passive: false });
    this._joystickEl.addEventListener("touchmove", this._onTouchMove, { passive: false });
    this._joystickEl.addEventListener("touchend", this._onTouchEnd, { passive: false });
    this._joystickEl.addEventListener("touchcancel", this._onTouchEnd, { passive: false });

    this._fireBtn = document.createElement("button");
    this._fireBtn.textContent = "🔥";
    Object.assign(this._fireBtn.style, {
      position: "fixed", bottom: "50px", right: "30px",
      width: "70px", height: "70px", borderRadius: "50%",
      background: "rgba(255,80,0,0.4)", border: "2px solid rgba(255,120,0,0.6)",
      fontSize: "2rem", zIndex: "800", touchAction: "none",
      color: "#fff", cursor: "pointer",
    });
    this._fireBtn.addEventListener("touchstart", (e) => { e.preventDefault(); this._fireActive = true; }, { passive: false });
    this._fireBtn.addEventListener("touchend", (e) => { e.preventDefault(); this._fireActive = false; }, { passive: false });
    this._fireBtn.addEventListener("touchcancel", () => { this._fireActive = false; });
    document.body.appendChild(this._fireBtn);
  }

  _teardownTouchControls() {
    if (this._joystickEl) {
      this._joystickEl.removeEventListener("touchstart", this._onTouchStart);
      this._joystickEl.removeEventListener("touchmove", this._onTouchMove);
      this._joystickEl.removeEventListener("touchend", this._onTouchEnd);
      this._joystickEl.removeEventListener("touchcancel", this._onTouchEnd);
      this._joystickEl.remove();
      this._joystickEl = null;
      this._joystickKnob = null;
    }
    if (this._fireBtn) {
      this._fireBtn.remove();
      this._fireBtn = null;
    }
    this._touchActive = false;
    this._touchDx = 0;
    this._touchDy = 0;
    this._fireActive = false;
  }

  _onTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    const rect = this._joystickEl.getBoundingClientRect();
    this._touchStartX = rect.left + rect.width / 2;
    this._touchStartY = rect.top + rect.height / 2;
    this._touchActive = true;
    this._updateJoystick(t.clientX, t.clientY);
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (!this._touchActive) return;
    this._updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
  }

  _onTouchEnd(e) {
    e.preventDefault();
    this._touchActive = false;
    this._touchDx = 0;
    this._touchDy = 0;
    if (this._joystickKnob) {
      this._joystickKnob.style.left = "38px";
      this._joystickKnob.style.top = "38px";
    }
  }

  _updateJoystick(cx, cy) {
    let dx = cx - this._touchStartX;
    let dy = cy - this._touchStartY;
    const maxR = 50;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) { dx = dx / dist * maxR; dy = dy / dist * maxR; }
    this._touchDx = dx / maxR;
    this._touchDy = dy / maxR;
    if (this._joystickKnob) {
      this._joystickKnob.style.left = (38 + dx) + "px";
      this._joystickKnob.style.top = (38 + dy) + "px";
    }
  }

  // --- Update loop ---

  update(dt, now) {
    if (!this.active) return false;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      return true;
    }

    this._updateMovement(dt);
    this._updateWalkAnim(dt);
    this._updateCamera(dt, now);
    this._updateCollisions(now);
    this._updateRubble(dt);
    this._updateCrushAnims(dt);
    this._updateFire(dt, now);

    return false;
  }

  _updateMovement(dt) {
    let moveX = 0, moveZ = 0;

    if (this._touchActive) {
      moveX = this._touchDx;
      moveZ = this._touchDy;
    } else {
      if (this._keys.a) moveX -= 1;
      if (this._keys.d) moveX += 1;
      if (this._keys.w) moveZ += 1;
      if (this._keys.s) moveZ -= 1;
    }

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0.1) {
      const nx = moveX / len;
      const nz = moveZ / len;

      const targetAngle = Math.atan2(nx, nz);
      let diff = targetAngle - this._facing;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      this._facing += diff * Math.min(1, GODZILLA_TURN_SPEED * dt * 5);

      const speed = GODZILLA_SPEED * Math.min(len, 1);
      this._godzillaPos.x += Math.sin(this._facing) * speed * dt;
      this._godzillaPos.z += Math.cos(this._facing) * speed * dt;

      const bound = CITY_SIZE - 2;
      this._godzillaPos.x = Math.max(-bound, Math.min(bound, this._godzillaPos.x));
      this._godzillaPos.z = Math.max(-bound, Math.min(bound, this._godzillaPos.z));
    }

    this.godzilla.position.set(this._godzillaPos.x, 0, this._godzillaPos.z);
    this.godzilla.rotation.y = this._facing;
  }

  _updateWalkAnim(dt) {
    const moving = this._keys.w || this._keys.s || this._keys.a || this._keys.d || this._touchActive;
    if (moving) {
      this._walkPhase += dt * 8;
    } else {
      this._walkPhase *= 0.9;
    }
    const s = Math.sin(this._walkPhase);
    if (this._parts.lLeg) this._parts.lLeg.rotation.x = s * 0.4;
    if (this._parts.rLeg) this._parts.rLeg.rotation.x = -s * 0.4;
    if (this._parts.lArm) this._parts.lArm.rotation.x = -s * 0.3;
    if (this._parts.rArm) this._parts.rArm.rotation.x = s * 0.3;

    if (this._parts.tail) {
      for (let i = 0; i < this._parts.tail.length; i++) {
        this._parts.tail[i].rotation.y = Math.sin(this._walkPhase - i * 0.5) * 0.15;
      }
    }

    if (this._parts.jaw) {
      const jawOpen = this._fireActive ? 0.5 : Math.abs(Math.sin(this._walkPhase * 0.3)) * 0.15;
      this._parts.jaw.position.y = 7 - jawOpen;
    }
  }

  _updateCamera(dt, now) {
    const camDist = 25;
    const camHeight = 18;
    const behindAngle = this._facing + Math.PI;
    const offset = new THREE.Vector3(
      Math.sin(behindAngle) * camDist,
      camHeight,
      Math.cos(behindAngle) * camDist
    );
    const target = this._godzillaPos.clone().add(offset);
    this.camera.position.lerp(target, 1 - Math.exp(-3 * dt));

    let shake = 0;
    if (now < this._shakeUntil) {
      shake = this._shakeAmp * Math.sin(now * 0.08) * ((this._shakeUntil - now) / 200);
    }
    this.camera.position.x += shake;
    this.camera.position.y += shake * 0.5;

    const lookTarget = this._godzillaPos.clone();
    lookTarget.y = 5;
    this.camera.lookAt(lookTarget);
  }

  _updateCollisions(now) {
    const px = this._godzillaPos.x;
    const pz = this._godzillaPos.z;

    for (const b of this.buildings) {
      if (!b.alive || b.crushing) continue;
      const bx = b.mesh.position.x;
      const bz = b.mesh.position.z;
      const halfW = b.w / 2 + GODZILLA_RADIUS;
      const halfD = b.d / 2 + GODZILLA_RADIUS;

      if (Math.abs(px - bx) < halfW && Math.abs(pz - bz) < halfD) {
        this._crushBuilding(b, now);
      }
    }
  }

  _crushBuilding(b, now) {
    b.alive = false;
    b.crushing = true;
    b.crushT = 0;
    const pts = b.hasScoreMarker ? BUILDING_SCORE * 3 : BUILDING_SCORE;
    this.score += pts;
    this.crushed++;

    this._shakeUntil = now + 300;
    this._shakeAmp = 0.4;

    this._spawnRubble(b);

    if (this.crushed % 3 === 0) {
      play(SFX_CRUSH, 0.7);
    } else {
      play(SFX_STOMP, 0.6);
    }
  }

  _updateCrushAnims(dt) {
    for (const b of this.buildings) {
      if (!b.crushing) continue;
      b.crushT += dt * 3;
      if (b.crushT >= 1) {
        b.crushing = false;
        b.mesh.visible = false;
      } else {
        const s = 1 - b.crushT;
        b.mesh.scale.set(1 + b.crushT * 0.3, s, 1 + b.crushT * 0.3);
        b.mesh.position.y = b.origY * s;
      }
    }
  }

  // --- Fire breath ---

  _updateFire(dt, now) {
    if (this._fireActive) {
      this._fireTimer += dt;
      if (this._fireTimer > 0.03) {
        this._fireTimer = 0;
        this._spawnFireParticle();
      }
      this._checkFireCollisions(now);
    }

    for (let i = this.fireParticles.length - 1; i >= 0; i--) {
      const p = this.fireParticles[i];
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      p.life -= dt * 2.5;
      const t = Math.max(0, p.life);
      p.mesh.material.opacity = t;
      p.mesh.scale.setScalar(1 + (1 - t) * 2);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.fireParticles.splice(i, 1);
      }
    }
  }

  _spawnFireParticle() {
    const mouthOffset = new THREE.Vector3(0, 7.5, 1.5);
    mouthOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this._facing);
    const pos = this._godzillaPos.clone().add(mouthOffset);

    const spread = 0.3;
    const dir = new THREE.Vector3(
      Math.sin(this._facing) + (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * 0.3 - 0.1,
      Math.cos(this._facing) + (Math.random() - 0.5) * spread
    ).normalize().multiplyScalar(30 + Math.random() * 10);

    const colors = [0xff4400, 0xff8800, 0xffcc00, 0xff2200, 0xffaa00];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 0.3 + Math.random() * 0.5;
    const geo = new THREE.SphereGeometry(size, 6, 6);
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.5,
      transparent: true, opacity: 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    this.fireParticles.push({ mesh, vel: dir, life: 1 });

    if (Math.random() < 0.05) play(SFX_FIRE, 0.3);
  }

  _checkFireCollisions(now) {
    const fwd = new THREE.Vector3(Math.sin(this._facing), 0, Math.cos(this._facing));
    const origin = this._godzillaPos.clone();

    for (const b of this.buildings) {
      if (!b.alive || b.crushing) continue;
      const bx = b.mesh.position.x;
      const bz = b.mesh.position.z;
      const toB = new THREE.Vector2(bx - origin.x, bz - origin.z);
      const dist = toB.length();
      if (dist > FIRE_RANGE) continue;

      const dot = (fwd.x * toB.x + fwd.z * toB.y) / dist;
      if (dot < 0.7) continue;

      const perpDist = Math.abs(-fwd.z * toB.x + fwd.x * toB.y);
      if (perpDist < FIRE_RADIUS + b.w / 2) {
        this._crushBuilding(b, now);
      }
    }
  }

  _spawnRubble(building) {
    const count = 6 + Math.floor(Math.random() * 6);
    const bx = building.mesh.position.x;
    const by = building.h * 0.4;
    const bz = building.mesh.position.z;

    const baseColor = 0x888888;

    for (let i = 0; i < count; i++) {
      const size = 0.3 + Math.random() * 0.6;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshStandardMaterial({
        color: baseColor, roughness: 0.8, transparent: true, opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        bx + (Math.random() - 0.5) * building.w,
        by + Math.random() * 2,
        bz + (Math.random() - 0.5) * building.d
      );
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.rubble.push({
        mesh,
        vx: (Math.random() - 0.5) * 12,
        vy: 4 + Math.random() * 8,
        vz: (Math.random() - 0.5) * 12,
        life: 1,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
      });
    }
  }

  _updateRubble(dt) {
    for (let i = this.rubble.length - 1; i >= 0; i--) {
      const r = this.rubble[i];
      r.vy -= 25 * dt;
      r.mesh.position.x += r.vx * dt;
      r.mesh.position.y += r.vy * dt;
      r.mesh.position.z += r.vz * dt;
      r.mesh.rotation.x += r.spin.x * dt;
      r.mesh.rotation.y += r.spin.y * dt;
      r.mesh.rotation.z += r.spin.z * dt;

      if (r.mesh.position.y < 0) {
        r.mesh.position.y = 0;
        r.vy = Math.abs(r.vy) * 0.3;
        r.vx *= 0.6;
        r.vz *= 0.6;
      }

      r.life -= dt * 0.8;
      r.mesh.material.opacity = Math.max(0, r.life);

      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        this.rubble.splice(i, 1);
      }
    }
  }
}
