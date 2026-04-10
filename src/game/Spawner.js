import * as THREE from "three";
import { CONFIG } from "../data/config.js";
import { HIT, setEntityBoxFromMesh } from "./CollisionSystem.js";

const _texLoader = new THREE.TextureLoader();
const _playbookTex = _texLoader.load("./assets/playbook-icon.png");
_playbookTex.colorSpace = THREE.SRGBColorSpace;
const _collectionTex = _texLoader.load("./assets/collection-icon.png");
_collectionTex.colorSpace = THREE.SRGBColorSpace;

let _id = 0;

function nextId() {
  _id += 1;
  return _id;
}

const RIVAL_COLORS = [
  { livery: 0xff4422, accent: 0xffaa00, emissive: 0x301000, glow: 0xff6600 },
  { livery: 0xeedd00, accent: 0x222222, emissive: 0x302800, glow: 0xffee44 },
  { livery: 0xcc44ff, accent: 0x22ffaa, emissive: 0x200030, glow: 0xbb66ff },
  { livery: 0x22dd44, accent: 0xffffff, emissive: 0x002810, glow: 0x44ff66 },
  { livery: 0xff66aa, accent: 0x220022, emissive: 0x300020, glow: 0xff88cc },
];

export class Spawner {
  constructor(scene) {
    this.scene = scene;
    /** @type {any[]} */
    this.obstacles = [];
    /** @type {any[]} */
    this.pickups = [];
    /** @type {any[]} */
    this.rivals = [];
    this.obstacleTimer = 0;
    this.pickupTimer = 1.2;
    this.rivalTimer = 0;
    this.busTimer = 0;
    this.gatorTimer = 0;
    this._nextRivalColorIdx = 0;
    this.levelId = "A";
  }

  reset() {
    for (const e of this.obstacles) this._removeEntity(e);
    for (const e of this.pickups) this._removeEntity(e);
    for (const e of this.rivals) this._removeEntity(e);
    this.obstacles.length = 0;
    this.pickups.length = 0;
    this.rivals.length = 0;
    this.obstacleTimer = 0;
    this.pickupTimer = 1.2;
    this.rivalTimer = 0;
    this.busTimer = 0;
    this.gatorTimer = 0;
  }

  _removeEntity(e) {
    if (e.mesh.parent === this.scene) this.scene.remove(e.mesh);
    e.mesh.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        const m = c.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
  }

  /**
   * @param {number} dt
   * @param {number} worldSpeed
   * @param {number} elapsedRunSeconds
   * @param {number} timeScale
   */
  update(dt, worldSpeed, elapsedRunSeconds, timeScale) {
    const warm = elapsedRunSeconds < CONFIG.WARMUP_SECONDS;
    const t = Math.min(1, elapsedRunSeconds / 120);
    const obstacleInterval = THREE.MathUtils.lerp(
      CONFIG.OBSTACLE_SPAWN_BASE,
      CONFIG.OBSTACLE_SPAWN_MIN,
      t
    );
    const pickupInterval = THREE.MathUtils.lerp(
      CONFIG.PICKUP_SPAWN_BASE,
      CONFIG.PICKUP_SPAWN_MIN,
      t * 0.85
    );

    if (warm) {
      this.obstacleTimer += dt * 0.65 * timeScale;
      this.pickupTimer += dt * 0.7 * timeScale;
    } else {
      this.obstacleTimer += dt * timeScale;
      this.pickupTimer += dt * timeScale;
    }

    if (this.obstacleTimer >= obstacleInterval) {
      const zSpawn = CONFIG.SPAWN_Z - Math.random() * 4;
      const lane = this._pickLaneForObstacle(zSpawn);
      if (!this._laneHasSpace(lane, zSpawn)) {
        this.obstacleTimer = obstacleInterval * 0.88;
      } else {
        this.obstacleTimer = 0;
        this._addObstacle(CONFIG.OBSTACLE_KIND, lane, zSpawn);
      }
    }

    if (this.pickupTimer >= pickupInterval) {
      this.pickupTimer = 0;
      this._spawnPickup(elapsedRunSeconds, warm);
    }

    const dz = worldSpeed * dt * timeScale;
    this._advanceEntities(this.obstacles, dz);
    this._advanceEntities(this.pickups, dz);
    this._animateObstacles(dt);
    this._animatePickups(dt);

    // Rivals: spawn, move, AI
    this.rivalTimer += dt * timeScale;
    if (this.rivals.length === 0 && this.rivalTimer > 6 && elapsedRunSeconds > 4) {
      this.rivalTimer = 0;
      this._spawnRival();
    }

    // School bus: Level F only, spawns periodically
    if (this.levelId === "F") {
      this.busTimer += dt * timeScale;
      const hasBus = this.rivals.some((r) => r.subtype === "SCHOOL_BUS");
      if (!hasBus && this.busTimer > 12 && elapsedRunSeconds > 6) {
        this.busTimer = 0;
        this._spawnBus();
      }
    }

    // Alligator: Level D (Bayou Swamp) only
    if (this.levelId === "D") {
      this.gatorTimer += dt * timeScale;
      const hasGator = this.obstacles.some((o) => o.subtype === "GATOR");
      if (!hasGator && this.gatorTimer > 15 && elapsedRunSeconds > 8) {
        this.gatorTimer = 0;
        this._spawnGator();
      }
    }

    this._updateRivals(dz, dt, worldSpeed);

    for (const e of this.obstacles) {
      if (e.active) this._syncBox(e);
    }
    for (const e of this.pickups) {
      if (e.active) this._syncBox(e);
    }
    for (const e of this.rivals) {
      if (e.active) this._syncBox(e);
    }
  }

  _advanceEntities(list, dz) {
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e.active) continue;
      e.mesh.position.z += dz;
      e.z = e.mesh.position.z;
      if (e.mesh.position.z > CONFIG.DESPAWN_Z) {
        e.active = false;
        list.splice(i, 1);
        this._removeEntity(e);
      }
    }
  }

  _syncBox(e) {
    const h = e.hit;
    setEntityBoxFromMesh(e.mesh, h.w, h.h, h.d, e.worldBox);
  }

  _laneHasSpace(lane, zSpawn) {
    const minD = CONFIG.MIN_OBSTACLE_ALONG_Z;
    for (const o of this.obstacles) {
      if (!o.active || o.lane !== lane) continue;
      if (Math.abs(o.mesh.position.z - zSpawn) < minD) return false;
    }
    return true;
  }

  /**
   * One obstacle per wave; always leave two empty lanes.
   * Prefer lanes with enough |Δz| spacing so same-lane “trains” don’t spawn.
   */
  _pickLaneForObstacle(zSpawn) {
    const minD = CONFIG.MIN_OBSTACLE_ALONG_Z;
    const clear = [];
    for (let lane = 0; lane < 3; lane++) {
      let ok = true;
      for (const o of this.obstacles) {
        if (!o.active || o.lane !== lane) continue;
        if (Math.abs(o.mesh.position.z - zSpawn) < minD) {
          ok = false;
          break;
        }
      }
      if (ok) clear.push(lane);
    }
    if (clear.length > 0) {
      return clear[Math.floor(Math.random() * clear.length)];
    }
    let bestLane = 0;
    let bestDist = -1;
    for (let lane = 0; lane < 3; lane++) {
      let dMin = 999;
      for (const o of this.obstacles) {
        if (!o.active || o.lane !== lane) continue;
        dMin = Math.min(dMin, Math.abs(o.mesh.position.z - zSpawn));
      }
      if (dMin > bestDist) {
        bestDist = dMin;
        bestLane = lane;
      }
    }
    return bestLane;
  }

  _spawnPickup(elapsed, warm) {
    const lane = Math.floor(Math.random() * 3);
    const z = CONFIG.SPAWN_Z - Math.random() * 15;

    let roll = Math.random();
    let type;
    if (roll < (warm ? 0.15 : 0.25)) {
      type = "BOOST_TOKEN";
    } else if (roll < 0.50) {
      type = "PLAYBOOK";
    } else if (roll < 0.75) {
      type = "CERTIFIED_COLLECTION";
    } else if (roll < 0.88) {
      type = "POLICY_SHIELD";
    } else {
      type = Math.random() < 0.5 ? "PLAYBOOK" : "CERTIFIED_COLLECTION";
    }

    // Find a lane that doesn't overlap an obstacle at this Z depth
    const minSep = CONFIG.MIN_OBSTACLE_ALONG_Z * 0.55;
    const laneOrder = [lane, (lane + 1) % 3, (lane + 2) % 3];
    let chosen = lane;
    for (const candidate of laneOrder) {
      const blocked = this.obstacles.some(
        (o) =>
          o.active &&
          o.lane === candidate &&
          Math.abs(o.mesh.position.z - z) < minSep
      );
      if (!blocked) {
        chosen = candidate;
        break;
      }
    }
    this._addPickup(type, chosen, z);
  }

  _addObstacle(type, lane, z) {
    const mesh = this._makeObstacleMesh();
    const x = CONFIG.LANES[lane];
    mesh.position.set(x, 0.0, z);
    this.scene.add(mesh);
    const hit = { ...HIT.obstacle };
    const e = {
      id: nextId(),
      kind: "obstacle",
      subtype: type,
      lane,
      mesh,
      z,
      active: true,
      worldBox: new THREE.Box3(),
      hit,
      flashT: 0,
    };
    this._syncBox(e);
    this.obstacles.push(e);
  }

  _addPickup(type, lane, z) {
    const mesh = this._makePickupMesh(type);
    const x = CONFIG.LANES[lane];
    mesh.position.set(x, 0.65, z);
    this.scene.add(mesh);
    const e = {
      id: nextId(),
      kind: "pickup",
      subtype: type,
      lane,
      mesh,
      z,
      active: true,
      worldBox: new THREE.Box3(),
      hit: { ...HIT.pickup },
      bobPhase: Math.random() * Math.PI * 2,
    };
    this._syncBox(e);
    this.pickups.push(e);
  }

  /** Single MVP hazard: red “Outage” block + yellow warning strip (matches HUD legend). */
  _makeObstacleMesh() {
    const g = new THREE.Group();

    const wallW = 1.8, wallH = 1.3, wallD = 0.55;
    const brickW = 0.38, brickH = 0.14, mortarGap = 0.025;

    const brickMat = new THREE.MeshStandardMaterial({
      color: 0xb33319, roughness: 0.82, metalness: 0.05,
      emissive: 0x3a0800, emissiveIntensity: 0.25,
    });
    const darkBrickMat = new THREE.MeshStandardMaterial({
      color: 0x8b2010, roughness: 0.88, metalness: 0.05,
      emissive: 0x2a0600, emissiveIntensity: 0.2,
    });
    const mortarMat = new THREE.MeshStandardMaterial({
      color: 0x888884, roughness: 0.95, metalness: 0.0,
    });

    const mortarSlab = new THREE.Mesh(
      new THREE.BoxGeometry(wallW, wallH, wallD * 0.92), mortarMat
    );
    mortarSlab.position.y = wallH / 2;
    g.add(mortarSlab);

    const brickGeo = new THREE.BoxGeometry(
      brickW - mortarGap, brickH - mortarGap, wallD
    );
    const stepX = brickW;
    const stepY = brickH;
    const cols = Math.floor(wallW / stepX);
    const rows = Math.floor(wallH / stepY);
    const startX = -(cols * stepX) / 2 + stepX / 2;

    for (let row = 0; row < rows; row++) {
      const offset = row % 2 === 1 ? stepX * 0.5 : 0;
      const y = row * stepY + stepY / 2;
      for (let col = 0; col < cols; col++) {
        let x = startX + col * stepX + offset;
        if (x - brickW / 2 < -wallW / 2) x += stepX * 0.5;
        if (x + brickW / 2 > wallW / 2) continue;
        const mat = Math.random() < 0.3 ? darkBrickMat : brickMat;
        const brick = new THREE.Mesh(brickGeo, mat);
        brick.position.set(x, y, 0);
        g.add(brick);
      }
    }

    const capMat = new THREE.MeshStandardMaterial({
      color: 0x666662, roughness: 0.75, metalness: 0.1,
    });
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(wallW + 0.06, 0.08, wallD + 0.06), capMat
    );
    cap.position.y = wallH + 0.04;
    g.add(cap);

    const warn = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.16, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xffee00 })
    );
    warn.position.set(0, wallH + 0.14, wallD / 2 + 0.04);
    g.add(warn);

    return g;
  }

  _makePickupMesh(type) {
    if (type === "POLICY_SHIELD") return this._makeShieldMesh();
    if (type === "PLAYBOOK") return this._makePlaybookMesh();
    if (type === "CERTIFIED_COLLECTION") return this._makeCollectionMesh();

    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffdd00,
      metalness: 0.25,
      roughness: 0.35,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5,
    });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), mat);
    g.add(core);
    g.userData.core = core;
    return g;
  }

  _makeShieldMesh() {
    const g = new THREE.Group();

    // Classic heater shield: flat top, wide shoulders, tapers to bottom point
    const s = new THREE.Shape();
    s.moveTo(-0.44, 0.5);
    s.lineTo(0.44, 0.5);
    s.lineTo(0.46, 0.42);
    s.lineTo(0.44, 0.05);
    s.lineTo(0.34, -0.25);
    s.lineTo(0.18, -0.48);
    s.lineTo(0, -0.62);
    s.lineTo(-0.18, -0.48);
    s.lineTo(-0.34, -0.25);
    s.lineTo(-0.44, 0.05);
    s.lineTo(-0.46, 0.42);
    s.lineTo(-0.44, 0.5);

    const body = new THREE.ExtrudeGeometry(s, {
      depth: 0.15,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.03,
      bevelSegments: 2,
      curveSegments: 1,
    });
    body.center();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xaa44ff,
      emissive: 0x440088,
      emissiveIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.3,
    });
    const shieldBody = new THREE.Mesh(body, mat);
    g.add(shieldBody);

    // Vertical bar (cross detail)
    const barMat = new THREE.MeshStandardMaterial({
      color: 0xddaaff,
      emissive: 0x7733cc,
      emissiveIntensity: 0.5,
      metalness: 0.6,
      roughness: 0.25,
    });
    const vBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.85, 0.06),
      barMat
    );
    vBar.position.set(0, 0, 0.1);
    g.add(vBar);

    // Horizontal bar
    const hBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.08, 0.06),
      barMat.clone()
    );
    hBar.position.set(0, 0.1, 0.1);
    g.add(hBar);

    g.userData.core = g;
    return g;
  }

  _makePlaybookMesh() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      map: _playbookTex,
      transparent: true,
      side: THREE.DoubleSide,
      emissive: 0xffffff,
      emissiveMap: _playbookTex,
      emissiveIntensity: 0.35,
      metalness: 0.1,
      roughness: 0.6,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), mat);
    g.add(plane);
    g.userData.core = g;
    return g;
  }

  _makeCollectionMesh() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      map: _collectionTex,
      transparent: true,
      side: THREE.DoubleSide,
      emissive: 0xffffff,
      emissiveMap: _collectionTex,
      emissiveIntensity: 0.35,
      metalness: 0.1,
      roughness: 0.6,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), mat);
    g.add(plane);
    g.userData.core = g;
    return g;
  }

  _animateObstacles() {
  }

  _animatePickups(dt) {
    const t = performance.now() * 0.001;
    for (const e of this.pickups) {
      if (!e.active) continue;
      const baseY = 0.65;
      e.mesh.position.y =
        baseY + Math.sin(t * 3 + e.bobPhase) * 0.12;
      const c = e.mesh.userData.core;
      if (!c) continue;
      const st = e.subtype;
      if (st === "POLICY_SHIELD" || st === "PLAYBOOK" || st === "CERTIFIED_COLLECTION") {
        c.rotation.y += dt * 2.2;
      } else {
        c.rotation.x += dt * 1.8;
        c.rotation.y += dt * 2.2;
      }
    }
  }

  // ─── Rival cars ───

  _spawnRival() {
    const lane = Math.floor(Math.random() * 3);
    const z = CONFIG.SPAWN_Z - Math.random() * 10;
    const colors = RIVAL_COLORS[this._nextRivalColorIdx % RIVAL_COLORS.length];
    this._nextRivalColorIdx++;
    const mesh = this._makeRivalMesh(colors);
    mesh.position.set(CONFIG.LANES[lane], CONFIG.PLAYER_Y, z);
    this.scene.add(mesh);
    const e = {
      id: nextId(),
      kind: "rival",
      subtype: "RIVAL",
      lane,
      targetLane: lane,
      mesh,
      z,
      active: true,
      worldBox: new THREE.Box3(),
      hit: { w: 0.7, h: 0.6, d: 2.0 },
      aiTimer: 0,
    };
    this._syncBox(e);
    this.rivals.push(e);
  }

  _updateRivals(dz, dt, worldSpeed) {
    const rivalSpeed = CONFIG.BASE_SPEED * 0.8;
    const rivalDz = rivalSpeed * dt;
    const busSpeed = CONFIG.BASE_SPEED * CONFIG.BUS_SPEED_MULT;
    const busDz = busSpeed * dt;
    for (let i = this.rivals.length - 1; i >= 0; i--) {
      const r = this.rivals[i];
      if (!r.active) continue;

      const isBus = r.subtype === "SCHOOL_BUS";
      r.mesh.position.z += dz - (isBus ? busDz : rivalDz);
      r.z = r.mesh.position.z;

      // Smooth lane lerp
      const tx = CONFIG.LANES[r.targetLane];
      r.mesh.position.x = THREE.MathUtils.lerp(r.mesh.position.x, tx, 1 - Math.exp(-6 * dt));
      r.lane = r.targetLane;

      if (!isBus) {
        r.aiTimer -= dt;
        if (r.aiTimer <= 0) {
          r.aiTimer = 0.4 + Math.random() * 0.3;
          this._rivalDodge(r);
        }
        r.mesh.position.y = CONFIG.PLAYER_Y + Math.sin(performance.now() * 0.003 + r.id) * 0.03;
      } else {
        // Bus plows through obstacles in its lane
        this._busSmashObstacles(r);
      }

      const tooFarAhead = r.mesh.position.z < CONFIG.SPAWN_Z - 80;
      if (r.mesh.position.z > CONFIG.DESPAWN_Z || tooFarAhead) {
        r.active = false;
        this.rivals.splice(i, 1);
        this._removeEntity(r);
      }
    }
  }

  _busSmashObstacles(bus) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      if (!o.active || o.lane !== bus.lane) continue;
      const dz = o.mesh.position.z - bus.mesh.position.z;
      if (dz > -3.5 && dz < 3.5) {
        this.explodeObstacle(o);
      }
    }
  }

  _rivalDodge(r) {
    const lookAhead = 30;
    const blocked = [false, false, false];
    for (const o of this.obstacles) {
      if (!o.active) continue;
      const dz = o.mesh.position.z - r.mesh.position.z;
      if (dz > -lookAhead && dz < 0) {
        blocked[o.lane] = true;
      }
    }
    if (!blocked[r.targetLane]) return;
    const candidates = [0, 1, 2].filter((l) => !blocked[l]);
    if (candidates.length > 0) {
      // Prefer adjacent lanes
      const adjacent = candidates.filter((l) => Math.abs(l - r.targetLane) === 1);
      r.targetLane = adjacent.length > 0
        ? adjacent[Math.floor(Math.random() * adjacent.length)]
        : candidates[Math.floor(Math.random() * candidates.length)];
    }
  }

  explodeRival(e) {
    if (!e || !e.mesh) return;
    const pos = e.mesh.position.clone();
    const parts = [];
    e.mesh.traverse((c) => {
      if (c.isMesh) parts.push(c);
    });

    // Detach parts and scatter them
    const debrisGroup = new THREE.Group();
    debrisGroup.position.copy(pos);
    this.scene.add(debrisGroup);

    for (const part of parts) {
      const p = part.clone();
      p.position.set(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.3,
        (Math.random() - 0.5) * 0.5
      );
      debrisGroup.add(p);
    }

    // Animate debris flying outward
    const velocities = [];
    for (let i = 0; i < debrisGroup.children.length; i++) {
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        3 + Math.random() * 8,
        (Math.random() - 0.5) * 10
      ));
    }

    let elapsed = 0;
    const animate = () => {
      elapsed += 0.016;
      if (elapsed > 1.2) {
        this.scene.remove(debrisGroup);
        debrisGroup.traverse((c) => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
            else c.material.dispose();
          }
        });
        return;
      }
      const children = debrisGroup.children;
      for (let i = 0; i < children.length; i++) {
        const v = velocities[i];
        if (!v) continue;
        children[i].position.x += v.x * 0.016;
        children[i].position.y += v.y * 0.016;
        children[i].position.z += v.z * 0.016;
        v.y -= 15 * 0.016; // gravity
        children[i].rotation.x += 5 * 0.016;
        children[i].rotation.z += 3 * 0.016;
      }
      const fade = 1 - elapsed / 1.2;
      debrisGroup.traverse((c) => {
        if (c.isMesh && c.material && c.material.opacity !== undefined) {
          c.material.transparent = true;
          c.material.opacity = fade;
        }
      });
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    // Remove the original rival
    e.active = false;
    const idx = this.rivals.indexOf(e);
    if (idx >= 0) this.rivals.splice(idx, 1);
    this._removeEntity(e);
  }

  explodeObstacle(e) {
    if (!e || !e.mesh) return;
    const pos = e.mesh.position.clone();
    const parts = [];
    e.mesh.traverse((c) => {
      if (c.isMesh) parts.push(c);
    });

    const debrisGroup = new THREE.Group();
    debrisGroup.position.copy(pos);
    this.scene.add(debrisGroup);

    for (const part of parts) {
      const p = part.clone();
      if (p.material) {
        p.material = p.material.clone();
        p.material.transparent = true;
      }
      p.position.set(
        (Math.random() - 0.5) * 0.8,
        Math.random() * 0.4,
        (Math.random() - 0.5) * 0.8
      );
      debrisGroup.add(p);
    }

    const velocities = [];
    for (let i = 0; i < debrisGroup.children.length; i++) {
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        2 + Math.random() * 7,
        (Math.random() - 0.5) * 12
      ));
    }

    let elapsed = 0;
    const animate = () => {
      elapsed += 0.016;
      if (elapsed > 1.0) {
        this.scene.remove(debrisGroup);
        debrisGroup.traverse((c) => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
            else c.material.dispose();
          }
        });
        return;
      }
      const children = debrisGroup.children;
      for (let i = 0; i < children.length; i++) {
        const v = velocities[i];
        if (!v) continue;
        children[i].position.x += v.x * 0.016;
        children[i].position.y += v.y * 0.016;
        children[i].position.z += v.z * 0.016;
        v.y -= 18 * 0.016;
        children[i].rotation.x += 6 * 0.016;
        children[i].rotation.z += 4 * 0.016;
      }
      const fade = 1 - elapsed / 1.0;
      debrisGroup.traverse((c) => {
        if (c.isMesh && c.material) {
          c.material.opacity = fade;
        }
      });
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    e.active = false;
    const oi = this.obstacles.indexOf(e);
    if (oi >= 0) this.obstacles.splice(oi, 1);
    this._removeEntity(e);
  }

  _makeRivalMesh(colors) {
    const g = new THREE.Group();

    const livery = new THREE.MeshStandardMaterial({
      color: colors.livery, metalness: 0.45, roughness: 0.38,
      emissive: colors.emissive, emissiveIntensity: 0.35,
    });
    const carbon = new THREE.MeshStandardMaterial({
      color: 0x1a1a22, metalness: 0.55, roughness: 0.42,
      emissive: 0x050508, emissiveIntensity: 0.15,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: colors.accent, metalness: 0.35, roughness: 0.45,
      emissive: colors.emissive, emissiveIntensity: 0.35,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d, metalness: 0.15, roughness: 0.92,
    });
    const rim = new THREE.MeshStandardMaterial({
      color: 0x88aacc, metalness: 0.75, roughness: 0.28,
    });

    // Front wing
    const fw1 = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.045, 0.38), carbon.clone());
    fw1.position.set(0, 0.11, -1.02); g.add(fw1);
    const fw2 = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.035, 0.22), carbon.clone());
    fw2.position.set(0, 0.07, -1.14); g.add(fw2);
    const epL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.32), accent.clone());
    epL.position.set(-1.06, 0.16, -1.02); g.add(epL);
    const epR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.32), accent.clone());
    epR.position.set(1.06, 0.16, -1.02); g.add(epR);

    // Nose
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.32, 0.55, 10), livery.clone());
    nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.2, -1.32); g.add(nose);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 8), livery.clone());
    tip.rotation.x = Math.PI / 2; tip.position.set(0, 0.2, -1.72); g.add(tip);

    // Cockpit
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.34, 0.62), livery.clone());
    cockpit.position.set(0, 0.38, -0.38); g.add(cockpit);
    const airbox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.2), carbon.clone());
    airbox.position.set(0, 0.52, -0.12); g.add(airbox);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 6, 12, Math.PI * 0.92), carbon.clone());
    halo.rotation.y = Math.PI / 2; halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.58, -0.28); g.add(halo);

    // Sidepods
    const podGeo = new THREE.BoxGeometry(0.38, 0.22, 0.72);
    const pL = new THREE.Mesh(podGeo, livery.clone()); pL.position.set(-0.64, 0.24, 0.08); g.add(pL);
    const pR = new THREE.Mesh(podGeo.clone(), livery.clone()); pR.position.set(0.64, 0.24, 0.08); g.add(pR);

    // Engine cover
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.26, 0.82), livery.clone());
    cover.position.set(0, 0.36, 0.42); cover.rotation.x = -0.08; g.add(cover);

    // Rear wing
    const rw1 = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.04, 0.24), carbon.clone());
    rw1.position.set(0, 0.44, 0.66); g.add(rw1);
    const rw2 = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.035, 0.18), carbon.clone());
    rw2.position.set(0, 0.58, 0.62); g.add(rw2);
    const rwL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.48), accent.clone());
    rwL.position.set(-0.9, 0.5, 0.64); g.add(rwL);
    const rwR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.48), accent.clone());
    rwR.position.set(0.9, 0.5, 0.64); g.add(rwR);
    const rain = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.05), accent.clone());
    rain.position.set(0, 0.38, 0.82); g.add(rain);

    // Wheels
    const addWheel = (x, z) => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.16, 18), rubber.clone());
      tire.rotation.z = Math.PI / 2; tire.position.set(x, 0.21, z); g.add(tire);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), rim.clone());
      disc.rotation.z = Math.PI / 2; disc.position.set(x, 0.21, z); g.add(disc);
    };
    addWheel(-0.78, -0.92); addWheel(0.78, -0.92);
    addWheel(-0.78, 0.38); addWheel(0.78, 0.38);

    const glow = new THREE.PointLight(colors.glow, 0.4, 7);
    glow.position.set(0, 0.42, 0.72); g.add(glow);

    livery.dispose(); carbon.dispose(); accent.dispose(); rubber.dispose(); rim.dispose();
    return g;
  }

  // ─── Alligator (Level D) ───

  _spawnGator() {
    const pair = Math.random() < 0.5 ? [0, 1] : [1, 2];
    const cx = (CONFIG.LANES[pair[0]] + CONFIG.LANES[pair[1]]) / 2;
    const z = CONFIG.SPAWN_Z - Math.random() * 6;
    const mesh = this._makeGatorMesh();
    mesh.position.set(cx, 0, z);
    this.scene.add(mesh);
    const e = {
      id: nextId(),
      kind: "obstacle",
      subtype: "GATOR",
      lane: pair[0],
      lanes: pair,
      mesh,
      z,
      active: true,
      worldBox: new THREE.Box3(),
      hit: { w: 2.8, h: 0.6, d: 2.5 },
      flashT: 0,
    };
    this._syncBox(e);
    this.obstacles.push(e);
  }

  _makeGatorMesh() {
    const g = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x3a5a2a, roughness: 0.85, metalness: 0.05,
      emissive: 0x1a2a0a, emissiveIntensity: 0.2,
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0x6a7a4a, roughness: 0.8, metalness: 0.05,
      emissive: 0x2a3a1a, emissiveIntensity: 0.15,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x2a3a1a, roughness: 0.9, metalness: 0.05,
      emissive: 0x0a1a04, emissiveIntensity: 0.2,
    });

    // Main body — long low oval
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.9, 4.5, 8, 1), skinMat
    );
    body.rotation.z = Math.PI / 2;
    body.rotation.y = Math.PI / 2;
    body.position.set(0, 0.45, 0);
    body.scale.set(1, 0.45, 1);
    g.add(body);

    // Belly
    const belly = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.8, 4.0, 8, 1), bellyMat
    );
    belly.rotation.z = Math.PI / 2;
    belly.rotation.y = Math.PI / 2;
    belly.position.set(0, 0.25, 0);
    belly.scale.set(1, 0.3, 1);
    g.add(belly);

    // Head — wider wedge at front
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.4, 1.8), skinMat.clone()
    );
    head.position.set(0, 0.35, -2.8);
    g.add(head);

    // Upper jaw
    const upperJaw = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.2, 1.2), skinMat.clone()
    );
    upperJaw.position.set(0, 0.42, -3.8);
    g.add(upperJaw);

    // Snout tip
    const snout = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.15, 0.5), skinMat.clone()
    );
    snout.position.set(0, 0.38, -4.5);
    g.add(snout);

    // Lower jaw (slightly open)
    const lowerJaw = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.12, 1.0), bellyMat.clone()
    );
    lowerJaw.position.set(0, 0.18, -3.7);
    lowerJaw.rotation.x = 0.08;
    g.add(lowerJaw);

    // Teeth (jagged white bits along jaw edges)
    const toothMat = new THREE.MeshStandardMaterial({
      color: 0xeeeedd, roughness: 0.5, metalness: 0.1,
    });
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const idx = i % 4;
      const tz = -3.2 - idx * 0.35;
      const tooth = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.12, 4), toothMat
      );
      tooth.position.set(side * 0.55, 0.28, tz);
      tooth.rotation.x = Math.PI;
      g.add(tooth);
    }

    // Eyes — bulging on top of head
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xddcc22, emissive: 0x886600, emissiveIntensity: 0.6,
      roughness: 0.3, metalness: 0.2,
    });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111100 });
    for (const side of [-0.5, 0.5]) {
      const eyeBump = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 6), skinMat.clone()
      );
      eyeBump.position.set(side, 0.62, -2.5);
      g.add(eyeBump);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 6), eyeMat
      );
      eye.position.set(side, 0.68, -2.5);
      g.add(eye);
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 4), pupilMat
      );
      pupil.position.set(side, 0.7, -2.62);
      g.add(pupil);
    }

    // Nostrils
    const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x1a1a0a });
    for (const side of [-0.2, 0.2]) {
      const nostril = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 5, 4), nostrilMat
      );
      nostril.position.set(side, 0.44, -4.7);
      g.add(nostril);
    }

    // Spine ridges
    for (let i = 0; i < 12; i++) {
      const sz = -1.5 + i * 0.4;
      const ridge = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.15 + Math.random() * 0.08, 4), darkMat
      );
      ridge.position.set(0, 0.7 + Math.random() * 0.04, sz);
      g.add(ridge);
    }

    // Tail — tapers backward
    const tailSegs = [
      { w: 0.5, h: 0.3, d: 1.2, z: 2.8, y: 0.3 },
      { w: 0.3, h: 0.2, d: 1.0, z: 3.7, y: 0.25 },
      { w: 0.15, h: 0.1, d: 0.8, z: 4.4, y: 0.2 },
    ];
    for (const ts of tailSegs) {
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(ts.w, ts.h, ts.d), skinMat.clone()
      );
      seg.position.set(0, ts.y, ts.z);
      g.add(seg);
    }

    // Legs (stubby, splayed out)
    const legMat = darkMat.clone();
    const legPositions = [
      { x: -0.8, z: -1.2 }, { x: 0.8, z: -1.2 },
      { x: -0.9, z: 1.0 }, { x: 0.9, z: 1.0 },
    ];
    for (const lp of legPositions) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.2, 0.5), legMat
      );
      leg.position.set(lp.x, 0.12, lp.z);
      g.add(leg);
      // Claws
      for (let c = 0; c < 3; c++) {
        const claw = new THREE.Mesh(
          new THREE.ConeGeometry(0.03, 0.1, 3), darkMat
        );
        claw.position.set(
          lp.x + (c - 1) * 0.1,
          0.05,
          lp.z + (lp.z < 0 ? -0.3 : 0.3)
        );
        claw.rotation.x = lp.z < 0 ? -Math.PI / 2 : Math.PI / 2;
        g.add(claw);
      }
    }

    skinMat.dispose(); bellyMat.dispose(); darkMat.dispose();
    return g;
  }

  // ─── School bus (Level F) ───

  _spawnBus() {
    const lane = Math.floor(Math.random() * 3);
    const z = CONFIG.SPAWN_Z - 10;
    const mesh = this._makeBusMesh();
    mesh.position.set(CONFIG.LANES[lane], 0, z);
    this.scene.add(mesh);
    const e = {
      id: nextId(),
      kind: "rival",
      subtype: "SCHOOL_BUS",
      lane,
      targetLane: lane,
      mesh,
      z,
      active: true,
      worldBox: new THREE.Box3(),
      hit: { w: 0.9, h: 1.0, d: 2.8 },
      aiTimer: 999,
    };
    this._syncBox(e);
    this.rivals.push(e);
  }

  _makeBusMesh() {
    const g = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00, metalness: 0.2, roughness: 0.5,
      emissive: 0x442200, emissiveIntensity: 0.3,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x111111, metalness: 0.3, roughness: 0.6,
    });
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x88ccff, metalness: 0.6, roughness: 0.2,
      emissive: 0x224466, emissiveIntensity: 0.3,
      transparent: true, opacity: 0.7,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d, metalness: 0.15, roughness: 0.92,
    });
    const bumperMat = new THREE.MeshStandardMaterial({
      color: 0x222222, metalness: 0.4, roughness: 0.6,
    });

    const bW = 1.6, bH = 1.6, bD = 4.5;

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, bD), bodyMat);
    body.position.y = bH / 2 + 0.35;
    g.add(body);

    // Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(bW + 0.04, 0.08, bD + 0.04), trimMat
    );
    roof.position.y = bH + 0.35 + 0.04;
    g.add(roof);

    // Hood (front lower section)
    const hood = new THREE.Mesh(new THREE.BoxGeometry(bW, 0.9, 0.8), bodyMat.clone());
    hood.position.set(0, 0.8, -(bD / 2) - 0.4);
    g.add(hood);

    // Front bumper
    const fBumper = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.1, 0.35, 0.15), bumperMat);
    fBumper.position.set(0, 0.5, -(bD / 2) - 0.82);
    g.add(fBumper);

    // Rear bumper
    const rBumper = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.1, 0.35, 0.15), bumperMat);
    rBumper.position.set(0, 0.5, bD / 2 + 0.08);
    g.add(rBumper);

    // Black stripe along bottom
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(bW + 0.02, 0.2, bD + 0.02), trimMat
    );
    stripe.position.y = 0.45;
    g.add(stripe);

    // Windows (both sides)
    const winH = 0.6, winW = 0.7, winGap = 0.15;
    const winY = bH / 2 + 0.35 + 0.25;
    const winCount = Math.floor((bD - 0.8) / (winW + winGap));
    const winStartZ = -(winCount * (winW + winGap)) / 2 + (winW + winGap) / 2;
    for (let i = 0; i < winCount; i++) {
      const wz = winStartZ + i * (winW + winGap);
      for (const side of [-1, 1]) {
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(winW, winH), windowMat
        );
        win.position.set(side * (bW / 2 + 0.01), winY, wz);
        win.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        g.add(win);
      }
    }

    // Windshield
    const ws = new THREE.Mesh(
      new THREE.PlaneGeometry(bW * 0.8, 0.7), windowMat
    );
    ws.position.set(0, bH / 2 + 0.55, -(bD / 2) - 0.01);
    g.add(ws);

    // Headlights
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    for (const side of [-0.55, 0.55]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.06), headlightMat);
      hl.position.set(side, 0.85, -(bD / 2) - 0.83);
      g.add(hl);
    }

    // Taillights
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    for (const side of [-0.55, 0.55]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.06), tailMat);
      tl.position.set(side, 0.75, bD / 2 + 0.08);
      g.add(tl);
    }

    // Stop sign arm (left side, folded flat)
    const stopArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0x440000, emissiveIntensity: 0.4 })
    );
    stopArm.position.set(-(bW / 2) - 0.02, bH / 2 + 0.5, -(bD / 4));
    g.add(stopArm);

    // Wheels
    const addWheel = (x, z) => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), rubber);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, 0.3, z);
      g.add(tire);
    };
    addWheel(-0.85, -1.5); addWheel(0.85, -1.5);
    addWheel(-0.85, 1.3); addWheel(0.85, 1.3);
    // Rear duals
    addWheel(-0.85, 1.7); addWheel(0.85, 1.7);

    bodyMat.dispose(); trimMat.dispose(); windowMat.dispose();
    rubber.dispose(); bumperMat.dispose();
    return g;
  }

  /**
   * Pull pickups toward player X when magnet active
   */
  applyMagnet(playerX, strength, dt) {
    for (const e of this.pickups) {
      if (!e.active || e.subtype === "BOOST_TOKEN") continue;
      const x = e.mesh.position.x;
      const dx = playerX - x;
      e.mesh.position.x += dx * Math.min(1, strength * dt);
    }
  }

  getAllCollidable() {
    return [...this.obstacles, ...this.pickups, ...this.rivals].filter((e) => e.active);
  }

  removeEntity(e) {
    if (!e) return;
    e.active = false;
    const list = e.kind === "obstacle" ? this.obstacles : e.kind === "rival" ? this.rivals : this.pickups;
    const i = list.indexOf(e);
    if (i >= 0) list.splice(i, 1);
    this._removeEntity(e);
  }
}
