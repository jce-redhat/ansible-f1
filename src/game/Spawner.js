import * as THREE from "three";
import { CONFIG } from "../data/config.js";
import { HIT, setEntityBoxFromMesh } from "./CollisionSystem.js";

const _playbookTex = new THREE.TextureLoader().load("./assets/playbook-icon.png");
_playbookTex.colorSpace = THREE.SRGBColorSpace;

let _id = 0;

function nextId() {
  _id += 1;
  return _id;
}

export class Spawner {
  constructor(scene) {
    this.scene = scene;
    /** @type {any[]} */
    this.obstacles = [];
    /** @type {any[]} */
    this.pickups = [];
    this.obstacleTimer = 0;
    this.pickupTimer = 1.2;
  }

  reset() {
    for (const e of this.obstacles) this._removeEntity(e);
    for (const e of this.pickups) this._removeEntity(e);
    this.obstacles.length = 0;
    this.pickups.length = 0;
    this.obstacleTimer = 0;
    this.pickupTimer = 1.2;
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

    for (const e of this.obstacles) {
      if (e.active) this._syncBox(e);
    }
    for (const e of this.pickups) {
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

    // Boost token rarity
    let roll = Math.random();
    let type;
    if (roll < (warm ? 0.04 : 0.07)) {
      type = "BOOST_TOKEN";
    } else if (roll < 0.35) {
      type = "PLAYBOOK";
    } else if (roll < 0.6) {
      type = "CERTIFIED_COLLECTION";
    } else if (roll < 0.82) {
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
    mesh.position.set(x, 0.75, z);
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
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xaa0000,
      emissiveIntensity: 0.5,
      metalness: 0.2,
      roughness: 0.55,
    });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), mat);
    cube.position.y = 0.2;
    g.add(cube);
    const warn = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.16, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    warn.position.set(0, 0.85, 0.62);
    g.add(warn);
    return g;
  }

  _makePickupMesh(type) {
    if (type === "POLICY_SHIELD") return this._makeShieldMesh();
    if (type === "PLAYBOOK") return this._makePlaybookMesh();

    const g = new THREE.Group();
    let color = 0x00ff66;
    let emissive = 0x004422;
    if (type === "BOOST_TOKEN") {
      color = 0xffdd00;
      emissive = 0xffaa00;
    }
    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.25,
      roughness: 0.35,
      emissive,
      emissiveIntensity: 0.5,
    });
    const geo =
      type === "BOOST_TOKEN"
        ? new THREE.OctahedronGeometry(0.55, 0)
        : new THREE.IcosahedronGeometry(0.5, 0);
    const core = new THREE.Mesh(geo, mat);
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

  _animateObstacles(dt) {
    for (const e of this.obstacles) {
      if (!e.active) continue;
      e.mesh.rotation.y += dt * 0.35;
    }
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
      if (st === "POLICY_SHIELD" || st === "PLAYBOOK") {
        c.rotation.y += dt * 2.2;
      } else {
        c.rotation.x += dt * 1.8;
        c.rotation.y += dt * 2.2;
      }
    }
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
    return [...this.obstacles, ...this.pickups].filter((e) => e.active);
  }

  removeEntity(e) {
    if (!e) return;
    e.active = false;
    const list = e.kind === "obstacle" ? this.obstacles : this.pickups;
    const i = list.indexOf(e);
    if (i >= 0) list.splice(i, 1);
    this._removeEntity(e);
  }
}
