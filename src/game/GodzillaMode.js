import * as THREE from "three";
import { play, pauseBgm, resumeBgm } from "../utils/audio.js";

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
const SFX_ROAR = "./assets/audio/godzilla.mp3";
const SFX_FIRE = "./assets/audio/boost-whoosh.wav";

const BUILDING_COLORS = [
  0xc8d0d8, 0xa8b8c8, 0xe8dcc8, 0xd4c8b0,
  0xf0ece4, 0xb0c0d0, 0x8ab0d0, 0xc0b8a8,
  0xd8d0c0, 0xa0a8b0, 0xb8c8d8, 0xe0d8c8,
  0x98b8d8, 0xc8c0b0, 0xd0d8e0, 0xb0a898,
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
    this.trees = [];
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
    this._crushSfxPlaying = false;

    this._camTheta = Math.PI;
    this._camPhi = 0.45;
    this._camDist = 25;
    this._dragging = false;
    this._dragDist = 0;
    this._lastMX = 0;
    this._lastMY = 0;

    this._parts = {};

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);

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
    this._dragging = false;
    this._dragDist = 0;
    this._camTheta = Math.PI;
    this._camPhi = 0.45;
    this._camDist = 25;
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

    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 1;
    skyCanvas.height = 256;
    const ctx = skyCanvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#3a6ec0");
    grad.addColorStop(0.5, "#7ab8e0");
    grad.addColorStop(1, "#c8e0f0");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = skyTex;
    this._skyTex = skyTex;

    this.scene.fog = new THREE.Fog(0xa8d0e8, 80, 220);

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("mousemove", this._onMouseMove);

    this._setupTouchControls();

    pauseBgm();
    play(SFX_ROAR, 0.9);
  }

  exit() {
    this.active = false;
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("mouseup", this._onMouseUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    this._teardownTouchControls();

    this._disposeGroup(this.group);
    this.scene.remove(this.group);
    this.group = new THREE.Group();
    this.buildings = [];
    this.trees = [];

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
    if (this._skyTex) { this._skyTex.dispose(); this._skyTex = null; }

    if (this._hiddenObjects) {
      this._hiddenObjects.forEach(o => { o.visible = true; });
      this._hiddenObjects = null;
    }

    clearTimeout(this._fireHoldTimer);
    this._fireActive = false;
    this.godzilla = null;
    this._parts = {};
    resumeBgm();
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
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x6a8a5a, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.group.add(ground);

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x707070, roughness: 0.8 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xb0aa98, roughness: 0.9 });
    const roadWidth = 5;
    const sidewalkW = 0.6;
    for (let x = -CITY_SIZE + GRID_SPACING; x < CITY_SIZE; x += GRID_SPACING) {
      const rGeo = new THREE.PlaneGeometry(roadWidth, CITY_SIZE * 2);
      const road = new THREE.Mesh(rGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.01, 0);
      this.group.add(road);
      for (const s of [-1, 1]) {
        const swGeo = new THREE.PlaneGeometry(sidewalkW, CITY_SIZE * 2);
        const sw = new THREE.Mesh(swGeo, sidewalkMat);
        sw.rotation.x = -Math.PI / 2;
        sw.position.set(x + s * (roadWidth / 2 + sidewalkW / 2), 0.02, 0);
        this.group.add(sw);
      }
    }
    for (let z = -CITY_SIZE + GRID_SPACING; z < CITY_SIZE; z += GRID_SPACING) {
      const rGeo = new THREE.PlaneGeometry(CITY_SIZE * 2, roadWidth);
      const road = new THREE.Mesh(rGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.01, z);
      this.group.add(road);
      for (const s of [-1, 1]) {
        const swGeo = new THREE.PlaneGeometry(CITY_SIZE * 2, sidewalkW);
        const sw = new THREE.Mesh(swGeo, sidewalkMat);
        sw.rotation.x = -Math.PI / 2;
        sw.position.set(0, 0.02, z + s * (roadWidth / 2 + sidewalkW / 2));
        this.group.add(sw);
      }
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
          });
        }
      }
    }
    this.totalBuildings = this.buildings.length;

    this._buildStreetTrees(roadWidth, sidewalkW);
    this._buildParkedCars(roadWidth);
    this._buildMountains();

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

    const ambient = new THREE.AmbientLight(0xc0d8f0, 0.8);
    this.group.add(ambient);

    this._buildClouds();
  }

  _buildStreetTrees(roadWidth, sidewalkW) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
    const leafColors = [0x3a8a3a, 0x4a9a4a, 0x2d7a2d, 0x5aaa5a, 0x48a048];
    this.trees = [];

    const _makeTree = (tx, tz) => {
      const treeGroup = new THREE.Group();
      const sizeScale = 0.6 + Math.random() * 0.8;
      const trunkH = (1.0 + Math.random() * 0.6) * sizeScale;
      const trunkGeo = new THREE.CylinderGeometry(0.1 * sizeScale, 0.14 * sizeScale, trunkH, 5);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      treeGroup.add(trunk);

      const leafR = (0.5 + Math.random() * 0.5) * sizeScale;
      const leafGeo = new THREE.SphereGeometry(leafR, 6, 5);
      const lc = leafColors[Math.floor(Math.random() * leafColors.length)];
      const lMat = new THREE.MeshStandardMaterial({ color: lc, roughness: 0.8 });
      const leaf = new THREE.Mesh(leafGeo, lMat);
      leaf.position.y = trunkH + leafR * 0.6;
      leaf.scale.y = 0.6 + Math.random() * 0.4;
      treeGroup.add(leaf);

      treeGroup.position.set(tx, 0, tz);
      this.group.add(treeGroup);
      this.trees.push({ mesh: treeGroup, x: tx, z: tz, r: leafR * sizeScale, alive: true });
    };

    const treeEdge = roadWidth / 2 + sidewalkW + 0.5;
    for (let x = -CITY_SIZE + GRID_SPACING; x < CITY_SIZE; x += GRID_SPACING) {
      for (let along = -CITY_SIZE + 4; along < CITY_SIZE; along += 5 + Math.random() * 5) {
        if (Math.random() > 0.55) continue;
        for (const s of [-1, 1]) _makeTree(x + s * treeEdge, along);
      }
    }
    for (let z = -CITY_SIZE + GRID_SPACING; z < CITY_SIZE; z += GRID_SPACING) {
      for (let along = -CITY_SIZE + 4; along < CITY_SIZE; along += 5 + Math.random() * 5) {
        if (Math.random() > 0.55) continue;
        for (const s of [-1, 1]) _makeTree(along, z + s * treeEdge);
      }
    }
  }

  _buildParkedCars(roadWidth) {
    const carColors = [0xcc2222, 0x2255cc, 0xeeeeee, 0x222222, 0xccaa22, 0x22aa44, 0x888888, 0x4488cc];
    const carBodyGeo = new THREE.BoxGeometry(0.8, 0.5, 1.6);
    const carRoofGeo = new THREE.BoxGeometry(0.7, 0.35, 0.9);
    const parkEdge = roadWidth / 2 - 0.6;

    for (let x = -CITY_SIZE + GRID_SPACING; x < CITY_SIZE; x += GRID_SPACING) {
      for (let along = -CITY_SIZE + 3; along < CITY_SIZE; along += 3 + Math.random() * 5) {
        if (Math.random() > 0.35) continue;
        const side = Math.random() < 0.5 ? -1 : 1;
        const cc = carColors[Math.floor(Math.random() * carColors.length)];
        const cMat = new THREE.MeshStandardMaterial({ color: cc, roughness: 0.5 });
        const body = new THREE.Mesh(carBodyGeo, cMat);
        body.position.set(x + side * parkEdge, 0.25, along);
        this.group.add(body);
        const roof = new THREE.Mesh(carRoofGeo, cMat);
        roof.position.set(x + side * parkEdge, 0.55, along);
        this.group.add(roof);
      }
    }
    for (let z = -CITY_SIZE + GRID_SPACING; z < CITY_SIZE; z += GRID_SPACING) {
      for (let along = -CITY_SIZE + 3; along < CITY_SIZE; along += 3 + Math.random() * 5) {
        if (Math.random() > 0.35) continue;
        const side = Math.random() < 0.5 ? -1 : 1;
        const cc = carColors[Math.floor(Math.random() * carColors.length)];
        const cMat = new THREE.MeshStandardMaterial({ color: cc, roughness: 0.5 });
        const body = new THREE.Mesh(carBodyGeo, cMat);
        body.position.set(along, 0.25, z + side * parkEdge);
        body.rotation.y = Math.PI / 2;
        this.group.add(body);
        const roof = new THREE.Mesh(carRoofGeo, cMat);
        roof.position.set(along, 0.55, z + side * parkEdge);
        roof.rotation.y = Math.PI / 2;
        this.group.add(roof);
      }
    }
  }

  _buildClouds() {
    for (let i = 0; i < 30; i++) {
      const cGroup = new THREE.Group();
      const puffs = 5 + Math.floor(Math.random() * 5);
      const baseOpacity = 0.45 + Math.random() * 0.2;
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: 1, transparent: true, opacity: baseOpacity,
        depthWrite: false,
      });
      for (let p = 0; p < puffs; p++) {
        const r = 6 + Math.random() * 10;
        const geo = new THREE.SphereGeometry(r, 7, 5);
        const puff = new THREE.Mesh(geo, cloudMat);
        puff.position.set(
          (Math.random() - 0.5) * 25,
          (Math.random() - 0.3) * 2,
          (Math.random() - 0.5) * 15
        );
        puff.scale.y = 0.25 + Math.random() * 0.12;
        cGroup.add(puff);
      }
      const spread = CITY_SIZE * 1.8;
      cGroup.position.set(
        (Math.random() - 0.5) * spread * 2,
        28 + Math.random() * 18,
        (Math.random() - 0.5) * spread * 2
      );
      this.group.add(cGroup);
    }
  }

  _spawnScorchMark(x, z, w, d) {
    const size = Math.max(w, d) * 1.2;
    const geo = new THREE.CircleGeometry(size, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x222222, roughness: 1, transparent: true, opacity: 0.6,
      depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    const mark = new THREE.Mesh(geo, mat);
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(x, 0.05, z);
    mark.renderOrder = 1;
    this.group.add(mark);
  }

  _buildMountainCluster(cx, cz, mainH) {
    const rockColors = [0x7a8a6a, 0x8a9a78, 0x6a7a5a, 0x9aaa88, 0x808868, 0x708060, 0xa0a888];
    const snowColor = 0xeeeeff;
    const mGroup = new THREE.Group();

    const subPeaks = 2 + Math.floor(Math.random() * 3);
    for (let p = 0; p < subPeaks; p++) {
      const isMain = p === 0;
      const h = isMain ? mainH : mainH * (0.4 + Math.random() * 0.5);
      const baseR = h * (0.6 + Math.random() * 0.4);
      const segs = 6 + Math.floor(Math.random() * 4);
      const color = rockColors[Math.floor(Math.random() * rockColors.length)];
      const geo = new THREE.ConeGeometry(baseR, h, segs);
      const verts = geo.attributes.position;
      for (let v = 0; v < verts.count; v++) {
        const y = verts.getY(v);
        if (y < h * 0.48 && y > -h * 0.48) {
          verts.setX(v, verts.getX(v) + (Math.random() - 0.5) * baseR * 0.25);
          verts.setZ(v, verts.getZ(v) + (Math.random() - 0.5) * baseR * 0.25);
        }
      }
      verts.needsUpdate = true;
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true });
      const peak = new THREE.Mesh(geo, mat);
      const ox = isMain ? 0 : (Math.random() - 0.5) * baseR * 1.2;
      const oz = isMain ? 0 : (Math.random() - 0.5) * baseR * 1.2;
      peak.position.set(ox, h / 2 - 3, oz);
      peak.scale.set(1, 1, 0.7 + Math.random() * 0.5);
      peak.rotation.y = Math.random() * Math.PI;
      peak.castShadow = true;
      mGroup.add(peak);

      if (h > 28) {
        const capFrac = 0.2;
        const capH = h * capFrac;
        const capR = baseR * capFrac;
        const capGeo = new THREE.ConeGeometry(capR, capH, segs);
        const capMat = new THREE.MeshStandardMaterial({ color: snowColor, roughness: 0.9, flatShading: true });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(ox, peak.position.y + h / 2 - capH / 2 + 0.3, oz);
        cap.scale.copy(peak.scale);
        cap.rotation.y = peak.rotation.y;
        mGroup.add(cap);
      }
    }

    mGroup.position.set(cx, 0, cz);
    this.group.add(mGroup);
  }

  _buildMountains() {
    const ring = CITY_SIZE + 10;
    const depth = 65;

    const peaksPerSide = 14;
    const sides = [
      { axis: "x", sign: -1 },
      { axis: "x", sign: 1 },
      { axis: "z", sign: -1 },
      { axis: "z", sign: 1 },
    ];

    for (const side of sides) {
      for (let i = 0; i < peaksPerSide; i++) {
        const t = (i / (peaksPerSide - 1)) * 2 - 1;
        const along = t * (CITY_SIZE + depth * 0.5);
        const outDist = ring + Math.random() * depth * 0.5;
        const h = 18 + Math.random() * 30;
        const cx = side.axis === "x" ? side.sign * outDist : along;
        const cz = side.axis === "z" ? side.sign * outDist : along;
        this._buildMountainCluster(cx, cz, h);
      }
    }

    for (let c = 0; c < 10; c++) {
      const angle = (c / 10) * Math.PI * 2 + Math.random() * 0.4;
      const dist = ring + depth * 0.3 + Math.random() * depth * 0.4;
      this._buildMountainCluster(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        20 + Math.random() * 25
      );
    }

    const outerGeo = new THREE.PlaneGeometry(CITY_SIZE * 6, CITY_SIZE * 6);
    const outerMat = new THREE.MeshStandardMaterial({ color: 0x5a7a4a, roughness: 0.95 });
    const outerGround = new THREE.Mesh(outerGeo, outerMat);
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.y = -0.05;
    outerGround.receiveShadow = true;
    this.group.add(outerGround);
  }

  _addWindows(bGroup, w, h, d) {
    const winW = 0.25;
    const winH = 0.35;
    const floorH = 1.4;
    const floors = Math.floor(h / floorH);

    const winMat = new THREE.MeshStandardMaterial({
      color: WINDOW_COLOR, emissive: WINDOW_COLOR, emissiveIntensity: 0.5,
      roughness: 0.2,
    });
    const winDarkMat = new THREE.MeshStandardMaterial({
      color: WINDOW_DARK, roughness: 0.5,
    });
    const winGeo = new THREE.PlaneGeometry(winW, winH);

    const colsX = Math.max(2, Math.floor(w / 0.7));
    const colsZ = Math.max(2, Math.floor(d / 0.7));

    for (let f = 0; f < floors; f++) {
      const wy = f * floorH + floorH * 0.55;
      if (wy > h - 0.4) break;

      for (let c = 0; c < colsX; c++) {
        const lit = Math.random() > 0.35;
        const mat = lit ? winMat : winDarkMat;
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
        const lit = Math.random() > 0.35;
        const mat = lit ? winMat : winDarkMat;
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
    const iron = 0x665544;
    const mat = new THREE.MeshStandardMaterial({ color: iron, roughness: 0.5 });

    const baseW = 7;
    const platY1 = 8;
    const platY2 = 16;
    const topY = 24;
    const spireY = 30;

    const topSpread1 = 2.2;

    for (const [sx, sz] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      const bx = sx * baseW / 2;
      const bz = sz * baseW / 2;
      const tx = sx * topSpread1 / 2;
      const tz = sz * topSpread1 / 2;
      const dx = tx - bx;
      const dy = platY1;
      const legLen = Math.sqrt(dx * dx + dy * dy + (tz - bz) ** 2);
      const legGeo = new THREE.BoxGeometry(0.6, legLen, 0.6);
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set((bx + tx) / 2, platY1 / 2, (bz + tz) / 2);
      const angleZ = Math.atan2(dx, dy);
      const angleX = Math.atan2(tz - bz, dy);
      leg.rotation.z = -angleZ;
      leg.rotation.x = angleX;
      leg.castShadow = true;
      tGroup.add(leg);
    }

    const arch = new THREE.BoxGeometry(baseW * 0.35, 0.4, baseW * 0.35);
    for (const y of [platY1 * 0.35, platY1 * 0.65]) {
      const bar = new THREE.Mesh(arch, mat);
      const frac = y / platY1;
      const s = 1 - frac * (1 - topSpread1 / baseW);
      bar.scale.set(s, 1, s);
      bar.position.y = y;
      tGroup.add(bar);
    }

    const p1Geo = new THREE.BoxGeometry(topSpread1 + 1.5, 0.6, topSpread1 + 1.5);
    const p1 = new THREE.Mesh(p1Geo, mat);
    p1.position.y = platY1;
    tGroup.add(p1);

    const rGeo = new THREE.BoxGeometry(0.5, 0.3, topSpread1 + 1.5);
    for (const sx of [-1, 1]) {
      const rail = new THREE.Mesh(rGeo, mat);
      rail.position.set(sx * (topSpread1 / 2 + 0.6), platY1 + 0.45, 0);
      tGroup.add(rail);
    }

    const midW = 1.6;
    const midGeo = new THREE.BoxGeometry(midW, platY2 - platY1, midW);
    const mid = new THREE.Mesh(midGeo, mat);
    mid.position.y = (platY1 + platY2) / 2;
    mid.castShadow = true;
    tGroup.add(mid);

    for (let y = platY1 + 1.5; y < platY2 - 1; y += 2) {
      const crossGeo = new THREE.BoxGeometry(midW + 0.6, 0.25, midW + 0.6);
      const cross = new THREE.Mesh(crossGeo, mat);
      cross.position.y = y;
      tGroup.add(cross);
    }

    const p2Geo = new THREE.BoxGeometry(midW + 1, 0.5, midW + 1);
    const p2 = new THREE.Mesh(p2Geo, mat);
    p2.position.y = platY2;
    tGroup.add(p2);

    const upperW = 0.8;
    const upperGeo = new THREE.BoxGeometry(upperW, topY - platY2, upperW);
    const upper = new THREE.Mesh(upperGeo, mat);
    upper.position.y = (platY2 + topY) / 2;
    upper.castShadow = true;
    tGroup.add(upper);

    const spireGeo = new THREE.ConeGeometry(0.35, spireY - topY, 4);
    const spire = new THREE.Mesh(spireGeo, mat);
    spire.position.y = topY + (spireY - topY) / 2;
    spire.castShadow = true;
    tGroup.add(spire);

    const tipGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.6,
    });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = spireY + 0.25;
    tGroup.add(tip);

    tGroup.position.set(cx, 0, cz);
    this.group.add(tGroup);

    this.buildings.push({
      mesh: tGroup,
      w: baseW + 2, h: spireY, d: baseW + 2,
      alive: true, crushing: false, crushT: 0, origY: 0,
    });
  }

  // --- Godzilla mesh ---

  _buildGodzilla() {
    const g = new THREE.Group();
    const green = 0x4aaf3a;
    const darkGreen = 0x357a28;
    const belly = 0xb0c88a;
    const eye = 0xffcc00;

    const greenMat = new THREE.MeshStandardMaterial({ color: green, roughness: 0.5, emissive: green, emissiveIntensity: 0.12 });
    const darkGreenMat = new THREE.MeshStandardMaterial({ color: darkGreen, roughness: 0.5, emissive: darkGreen, emissiveIntensity: 0.1 });

    const torsoGeo = new THREE.BoxGeometry(3, 4, 2.5);
    const torso = new THREE.Mesh(torsoGeo, greenMat);
    torso.position.y = 5;
    torso.castShadow = true;
    g.add(torso);

    const bellyGeo = new THREE.BoxGeometry(2.4, 3, 1.8);
    const bellyMat = new THREE.MeshStandardMaterial({ color: belly, roughness: 0.6, emissive: belly, emissiveIntensity: 0.08 });
    const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
    bellyMesh.position.set(0, 4.8, 0.4);
    g.add(bellyMesh);

    const headGeo = new THREE.BoxGeometry(2, 1.8, 2);
    const head = new THREE.Mesh(headGeo, greenMat);
    head.position.set(0, 8, 0.3);
    head.castShadow = true;
    g.add(head);
    this._parts.head = head;

    const snoutGeo = new THREE.BoxGeometry(1.5, 1.1, 1.3);
    const snout = new THREE.Mesh(snoutGeo, greenMat);
    snout.position.set(0, 7.85, 1.4);
    g.add(snout);

    const browGeo = new THREE.BoxGeometry(2.3, 0.5, 0.7);
    const brow = new THREE.Mesh(browGeo, darkGreenMat);
    brow.position.set(0, 8.75, 0.9);
    g.add(brow);

    const mouthGeo = new THREE.BoxGeometry(1.1, 0.35, 0.9);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x4a1020, roughness: 0.9 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 7.3, 1.5);
    g.add(mouth);

    const nostrilGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const nostrilMat = new THREE.MeshStandardMaterial({ color: 0x1a3a12, roughness: 0.8 });
    for (const sx of [-0.35, 0.35]) {
      const nostril = new THREE.Mesh(nostrilGeo, nostrilMat);
      nostril.position.set(sx, 8.0, 2.0);
      g.add(nostril);
    }

    const jawGeo = new THREE.BoxGeometry(1.5, 0.5, 1.5);
    const jaw = new THREE.Mesh(jawGeo, darkGreenMat);
    jaw.position.set(0, 7.0, 0.8);
    g.add(jaw);
    this._parts.jaw = jaw;

    const toothMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.3 });
    const toothGeo = new THREE.ConeGeometry(0.1, 0.35, 4);
    const teethPositions = [-0.5, -0.25, 0, 0.25, 0.5];
    for (const tx of teethPositions) {
      const topTooth = new THREE.Mesh(toothGeo, toothMat);
      topTooth.position.set(tx, 7.5, 1.55);
      topTooth.rotation.x = Math.PI;
      g.add(topTooth);
      const botTooth = new THREE.Mesh(toothGeo, toothMat);
      botTooth.position.set(tx, 7.1, 1.55);
      g.add(botTooth);
    }

    const eyeGeo = new THREE.SphereGeometry(0.28, 8, 8);
    const eyeWhiteGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: eye, emissive: eye, emissiveIntensity: 0.8 });
    const pupilGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
    for (const sx of [-0.65, 0.65]) {
      const white = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      white.position.set(sx, 8.35, 1.05);
      g.add(white);
      const iris = new THREE.Mesh(eyeGeo, eyeMat);
      iris.position.set(sx, 8.35, 1.2);
      g.add(iris);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(sx, 8.35, 1.35);
      g.add(pupil);
    }

    const armGeo = new THREE.BoxGeometry(0.7, 2, 0.7);
    const lArm = new THREE.Mesh(armGeo, greenMat);
    lArm.position.set(-2, 5.5, 0.3);
    g.add(lArm);
    const rArm = new THREE.Mesh(armGeo, greenMat);
    rArm.position.set(2, 5.5, 0.3);
    g.add(rArm);
    this._parts.lArm = lArm;
    this._parts.rArm = rArm;

    const legGeo = new THREE.BoxGeometry(1.2, 3, 1.2);
    const lLeg = new THREE.Mesh(legGeo, darkGreenMat);
    lLeg.position.set(-1, 1.5, 0);
    lLeg.castShadow = true;
    g.add(lLeg);
    const rLeg = new THREE.Mesh(legGeo, darkGreenMat);
    rLeg.position.set(1, 1.5, 0);
    rLeg.castShadow = true;
    g.add(rLeg);
    this._parts.lLeg = lLeg;
    this._parts.rLeg = rLeg;

    const tailParts = [];
    for (let i = 0; i < 5; i++) {
      const s = 1 - i * 0.15;
      const tGeo = new THREE.BoxGeometry(1.2 * s, 1 * s, 1.5);
      const seg = new THREE.Mesh(tGeo, darkGreenMat);
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

    const nameTag = this._makeNameSprite("Scott Harwell");
    nameTag.position.set(0, 11, 0);
    g.add(nameTag);

    this.godzilla = g;
    this.group.add(g);
  }

  _makeNameSprite(name) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    const r = 16;
    const pad = 20;
    const textW = 460;
    ctx.beginPath();
    ctx.roundRect((512 - textW) / 2 - pad, 10, textW + pad * 2, 80, r);
    ctx.fill();

    ctx.fillStyle = "#44ff44";
    ctx.font = "bold 42px 'Orbitron', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, 256, 50);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(6, 1.5, 1);
    return sprite;
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

  _onMouseDown(e) {
    this._dragging = true;
    this._lastMX = e.clientX;
    this._lastMY = e.clientY;
    this._dragDist = 0;
    if (e.button === 2) e.preventDefault();
  }

  _onMouseUp(e) {
    if (this._dragging && e.button === 0 && this._dragDist < 6) {
      this._fireActive = true;
      this._fireHoldTimer = setTimeout(() => { this._fireActive = false; }, 400);
    }
    this._dragging = false;
  }

  _onMouseMove(e) {
    if (!this._dragging) return;
    const dx = e.clientX - this._lastMX;
    const dy = e.clientY - this._lastMY;
    this._dragDist += Math.abs(dx) + Math.abs(dy);
    this._lastMX = e.clientX;
    this._lastMY = e.clientY;
    this._camTheta -= dx * 0.005;
    this._camPhi = Math.max(0.15, Math.min(1.2, this._camPhi - dy * 0.005));
  }

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

    this._preventCtx = (e) => e.preventDefault();
    window.addEventListener("contextmenu", this._preventCtx);
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
    if (this._preventCtx) {
      window.removeEventListener("contextmenu", this._preventCtx);
      this._preventCtx = null;
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
    this._updateTreeCollisions();
    this._updateRubble(dt);
    this._updateCrushAnims(dt);
    this._updateFire(dt, now);

    return false;
  }

  _updateMovement(dt) {
    let inputX = 0, inputZ = 0;

    if (this._touchActive) {
      inputX = this._touchDx;
      inputZ = -this._touchDy;
    } else {
      if (this._keys.a) inputX -= 1;
      if (this._keys.d) inputX += 1;
      if (this._keys.w) inputZ += 1;
      if (this._keys.s) inputZ -= 1;
    }

    const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
    const isMoving = len > 0.1;

    if (isMoving) {
      const nx = inputX / len;
      const nz = inputZ / len;

      const camFwd = this._camTheta;
      const mx = Math.sin(camFwd) * nz + Math.sin(camFwd - Math.PI / 2) * nx;
      const mz = Math.cos(camFwd) * nz + Math.cos(camFwd - Math.PI / 2) * nx;

      const speed = GODZILLA_SPEED * Math.min(len, 1);
      this._godzillaPos.x += mx * speed * dt;
      this._godzillaPos.z += mz * speed * dt;

      const bound = CITY_SIZE - 2;
      this._godzillaPos.x = Math.max(-bound, Math.min(bound, this._godzillaPos.x));
      this._godzillaPos.z = Math.max(-bound, Math.min(bound, this._godzillaPos.z));

      const hasForward = this._touchActive ? inputZ > 0.1 : (this._keys.w || this._keys.a || this._keys.d);
      if (hasForward) {
        const targetFacing = Math.atan2(mx, mz);
        let diff = targetFacing - this._facing;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        this._facing += diff * Math.min(1, GODZILLA_TURN_SPEED * dt * 5);
      }
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
    const cx = this._godzillaPos.x - Math.sin(this._camTheta) * Math.cos(this._camPhi) * this._camDist;
    const cy = this._godzillaPos.y + 1.0 + Math.sin(this._camPhi) * this._camDist;
    const cz = this._godzillaPos.z - Math.cos(this._camTheta) * Math.cos(this._camPhi) * this._camDist;

    const target = new THREE.Vector3(cx, cy, cz);
    this.camera.position.lerp(target, 1 - Math.exp(-6 * dt));

    let shake = 0;
    if (now < this._shakeUntil) {
      shake = this._shakeAmp * Math.sin(now * 0.08) * ((this._shakeUntil - now) / 200);
    }
    this.camera.position.x += shake;
    this.camera.position.y += shake * 0.5;

    this.camera.lookAt(
      this._godzillaPos.x,
      this._godzillaPos.y + 5,
      this._godzillaPos.z
    );
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

  _updateTreeCollisions() {
    if (!this.trees) return;
    const px = this._godzillaPos.x;
    const pz = this._godzillaPos.z;
    for (const t of this.trees) {
      if (!t.alive) continue;
      const dx = px - t.x;
      const dz = pz - t.z;
      if (dx * dx + dz * dz < (GODZILLA_RADIUS + t.r) * (GODZILLA_RADIUS + t.r)) {
        t.alive = false;
        t.mesh.visible = false;
      }
    }
  }

  _crushBuilding(b, now) {
    b.alive = false;
    b.crushing = true;
    b.crushT = 0;
    this.score += BUILDING_SCORE;
    this.crushed++;

    this._shakeUntil = now + 300;
    this._shakeAmp = 0.4;

    this._spawnRubble(b);
    this._spawnScorchMark(b.mesh.position.x, b.mesh.position.z, b.w, b.d);

    if (!this._crushSfxPlaying) {
      this._crushSfxPlaying = true;
      const a = new Audio(SFX_STOMP);
      a.volume = 0.6;
      a.onended = () => { this._crushSfxPlaying = false; };
      a.play().catch(() => { this._crushSfxPlaying = false; });
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
    const bx = building.mesh.position.x;
    const by = building.h * 0.4;
    const bz = building.mesh.position.z;

    const chunkCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < chunkCount; i++) {
      const size = 0.3 + Math.random() * 0.5;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x999999, roughness: 0.9, transparent: true, opacity: 1,
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
        mesh, type: "chunk",
        vx: (Math.random() - 0.5) * 10,
        vy: 3 + Math.random() * 6,
        vz: (Math.random() - 0.5) * 10,
        life: 1,
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        ),
      });
    }

    this._queueSmoke(bx, bz, building.w, building.d, building.h);
  }

  _queueSmoke(bx, bz, bw, bd, bh) {
    const plumeCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < plumeCount; i++) {
      const delay = Math.random() * 1.5;
      const sx = bx + (Math.random() - 0.5) * bw * 0.8;
      const sz = bz + (Math.random() - 0.5) * bd * 0.8;
      this.rubble.push({
        type: "smoke_queued", delay,
        sx, sz, bh,
      });
    }
  }

  _spawnSmokePuff(x, z, baseH) {
    const size = 1.2 + Math.random() * 1.8;
    const geo = new THREE.SphereGeometry(size, 6, 5);
    const shade = 0.35 + Math.random() * 0.2;
    const c = Math.floor(shade * 255);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(c / 255, c / 255, c / 255),
      roughness: 1, transparent: true, opacity: 0.5 + Math.random() * 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.5 + Math.random() * baseH * 0.3, z);
    mesh.scale.y = 0.6 + Math.random() * 0.3;
    this.scene.add(mesh);
    return {
      mesh, type: "smoke",
      vx: (Math.random() - 0.5) * 0.8,
      vy: 1.5 + Math.random() * 2,
      vz: (Math.random() - 0.5) * 0.8,
      life: 1,
      maxLife: 3 + Math.random() * 3,
      startOpacity: mat.opacity,
      growRate: 1 + Math.random() * 0.5,
    };
  }

  _updateRubble(dt) {
    for (let i = this.rubble.length - 1; i >= 0; i--) {
      const r = this.rubble[i];

      if (r.type === "smoke_queued") {
        r.delay -= dt;
        if (r.delay <= 0) {
          const puff = this._spawnSmokePuff(r.sx, r.sz, r.bh);
          this.rubble[i] = puff;
        }
        continue;
      }

      if (r.type === "chunk") {
        r.vy -= 25 * dt;
        r.mesh.position.x += r.vx * dt;
        r.mesh.position.y += r.vy * dt;
        r.mesh.position.z += r.vz * dt;
        r.mesh.rotation.x += r.spin.x * dt;
        r.mesh.rotation.y += r.spin.y * dt;
        r.mesh.rotation.z += r.spin.z * dt;
        if (r.mesh.position.y < 0) {
          r.mesh.position.y = 0;
          r.vy = Math.abs(r.vy) * 0.25;
          r.vx *= 0.5;
          r.vz *= 0.5;
        }
        r.life -= dt * 1.2;
        r.mesh.material.opacity = Math.max(0, r.life);
        if (r.life <= 0) {
          this.scene.remove(r.mesh);
          r.mesh.geometry.dispose();
          r.mesh.material.dispose();
          this.rubble.splice(i, 1);
        }
        continue;
      }

      if (r.type === "smoke") {
        r.mesh.position.x += r.vx * dt;
        r.mesh.position.y += r.vy * dt;
        r.mesh.position.z += r.vz * dt;

        const scale = r.mesh.scale.x + r.growRate * dt;
        r.mesh.scale.set(scale, scale * 0.7, scale);

        r.vy *= (1 - 0.3 * dt);
        r.vx *= (1 - 0.2 * dt);
        r.vz *= (1 - 0.2 * dt);

        r.life -= dt / r.maxLife;
        const fade = Math.max(0, r.life);
        r.mesh.material.opacity = r.startOpacity * fade * fade;

        if (r.life <= 0) {
          this.scene.remove(r.mesh);
          r.mesh.geometry.dispose();
          r.mesh.material.dispose();
          this.rubble.splice(i, 1);
        }
      }
    }
  }
}
