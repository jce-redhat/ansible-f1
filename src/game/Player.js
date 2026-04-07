import * as THREE from "three";
import { CONFIG } from "../data/config.js";

/**
 * Low-poly open-wheel race car (F1-style read from chase cam), smooth lane lerp.
 */
export class Player {
  constructor(scene) {
    this.scene = scene;
    this.laneIndex = 1;
    this.targetLaneIndex = 1;
    this.mesh = this._buildMesh();
    this.mesh.position.set(
      CONFIG.LANES[this.laneIndex],
      CONFIG.PLAYER_Y,
      0
    );
    scene.add(this.mesh);

    this.flowGlow = null;
    this._buildFlowGlow();
  }

  _buildMesh() {
    const g = new THREE.Group();

    const livery = new THREE.MeshStandardMaterial({
      color: 0x00c8ea,
      metalness: 0.45,
      roughness: 0.38,
      emissive: 0x002030,
      emissiveIntensity: 0.35,
    });
    const carbon = new THREE.MeshStandardMaterial({
      color: 0x1a1a22,
      metalness: 0.55,
      roughness: 0.42,
      emissive: 0x050508,
      emissiveIntensity: 0.15,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0xe10600,
      metalness: 0.35,
      roughness: 0.45,
      emissive: 0x330000,
      emissiveIntensity: 0.35,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d,
      metalness: 0.15,
      roughness: 0.92,
    });
    const rim = new THREE.MeshStandardMaterial({
      color: 0x88aacc,
      metalness: 0.75,
      roughness: 0.28,
    });

    // --- Front wing (wide, low) + endplates — instant "open-wheel" read ---
    const fwMain = new THREE.Mesh(
      new THREE.BoxGeometry(2.15, 0.045, 0.38),
      carbon.clone()
    );
    fwMain.position.set(0, 0.11, -1.02);
    g.add(fwMain);

    const fwFlap = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.035, 0.22),
      carbon.clone()
    );
    fwFlap.position.set(0, 0.07, -1.14);
    g.add(fwFlap);

    const epL = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.26, 0.32),
      accent.clone()
    );
    epL.position.set(-1.06, 0.16, -1.02);
    g.add(epL);
    const epR = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.26, 0.32),
      accent.clone()
    );
    epR.position.set(1.06, 0.16, -1.02);
    g.add(epR);

    // --- Nose + narrow tip (forward = -Z) ---
    const noseCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.32, 0.55, 10),
      livery.clone()
    );
    noseCone.rotation.x = Math.PI / 2;
    noseCone.position.set(0, 0.2, -1.32);
    g.add(noseCone);

    const noseTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.35, 8),
      livery.clone()
    );
    noseTip.rotation.x = Math.PI / 2;
    noseTip.position.set(0, 0.2, -1.72);
    g.add(noseTip);

    // --- Monocoque / cockpit hump ---
    const cockpit = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.34, 0.62),
      livery.clone()
    );
    cockpit.position.set(0, 0.38, -0.38);
    g.add(cockpit);

    const airbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.12, 0.2),
      carbon.clone()
    );
    airbox.position.set(0, 0.52, -0.12);
    g.add(airbox);

    // Simplified halo (single torus segment vibe)
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.025, 6, 12, Math.PI * 0.92),
      carbon.clone()
    );
    halo.rotation.y = Math.PI / 2;
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.58, -0.28);
    g.add(halo);

    // --- Sidepods ---
    const podGeo = new THREE.BoxGeometry(0.38, 0.22, 0.72);
    const podL = new THREE.Mesh(podGeo, livery.clone());
    podL.position.set(-0.64, 0.24, 0.08);
    g.add(podL);
    const podR = new THREE.Mesh(podGeo.clone(), livery.clone());
    podR.position.set(0.64, 0.24, 0.08);
    g.add(podR);

    // --- Engine cover taper ---
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.26, 0.82),
      livery.clone()
    );
    cover.position.set(0, 0.36, 0.42);
    cover.rotation.x = -0.08;
    g.add(cover);

    // --- Rear wing (stacked elements + endplates) ---
    const rwLow = new THREE.Mesh(
      new THREE.BoxGeometry(1.78, 0.04, 0.24),
      carbon.clone()
    );
    rwLow.position.set(0, 0.44, 0.66);
    g.add(rwLow);

    const rwHigh = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 0.035, 0.18),
      carbon.clone()
    );
    rwHigh.position.set(0, 0.58, 0.62);
    g.add(rwHigh);

    const rwEpL = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.36, 0.48),
      accent.clone()
    );
    rwEpL.position.set(-0.9, 0.5, 0.64);
    g.add(rwEpL);
    const rwEpR = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.36, 0.48),
      accent.clone()
    );
    rwEpR.position.set(0.9, 0.5, 0.64);
    g.add(rwEpR);

    // FIA rain light strip
    const rainLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.06, 0.05),
      accent.clone()
    );
    rainLight.position.set(0, 0.38, 0.82);
    g.add(rainLight);

    // --- Mirrors ---
    const mirGeo = new THREE.BoxGeometry(0.12, 0.05, 0.08);
    const mirL = new THREE.Mesh(mirGeo, carbon.clone());
    mirL.position.set(-0.38, 0.48, -0.55);
    g.add(mirL);
    const mirR = new THREE.Mesh(mirGeo.clone(), carbon.clone());
    mirR.position.set(0.38, 0.48, -0.55);
    g.add(mirR);

    // --- Wheels (open-wheel silhouette) ---
    const addWheel = (x, z) => {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.21, 0.16, 18),
        rubber.clone()
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, 0.21, z);
      g.add(tire);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12),
        rim.clone()
      );
      disc.rotation.z = Math.PI / 2;
      disc.position.set(x, 0.21, z);
      g.add(disc);
    };
    addWheel(-0.78, -0.92);
    addWheel(0.78, -0.92);
    addWheel(-0.78, 0.38);
    addWheel(0.78, 0.38);

    const glow = new THREE.PointLight(0x00ffff, 0.55, 9);
    glow.position.set(0, 0.42, 0.72);
    g.add(glow);
    this.pointLight = glow;

    g.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });

    livery.dispose();
    carbon.dispose();
    accent.dispose();
    rubber.dispose();
    rim.dispose();

    return g;
  }

  _buildFlowGlow() {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.07, 8, 28),
      new THREE.MeshBasicMaterial({
        color: 0x66ffcc,
        transparent: true,
        opacity: 0,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    this.mesh.add(ring);
    this.flowGlow = ring;
  }

  setAutomationFlowActive(on) {
    if (!this.flowGlow) return;
    this.flowGlow.material.opacity = on ? 0.85 : 0;
    this.pointLight.intensity = on ? 1.2 : 0.6;
    this.pointLight.color.setHex(on ? 0x66ffcc : 0x00ffff);
  }

  moveLeft() {
    if (this.targetLaneIndex > 0) {
      this.targetLaneIndex--;
    }
  }

  moveRight() {
    if (this.targetLaneIndex < 2) {
      this.targetLaneIndex++;
    }
  }

  update(dt) {
    const tx = CONFIG.LANES[this.targetLaneIndex];
    this.laneIndex = this.targetLaneIndex;
    this.mesh.position.x = THREE.MathUtils.lerp(
      this.mesh.position.x,
      tx,
      1 - Math.exp(-CONFIG.LANE_LERP * dt)
    );

    const bob = Math.sin(performance.now() * 0.004) * 0.04;
    this.mesh.position.y = CONFIG.PLAYER_Y + bob;
    this.mesh.rotation.z = THREE.MathUtils.lerp(
      this.mesh.rotation.z,
      -(this.mesh.position.x - tx) * 0.22,
      0.2
    );
    this.mesh.rotation.y = Math.sin(performance.now() * 0.002) * 0.02;

    if (this.flowGlow && this.flowGlow.material.opacity > 0.01) {
      this.flowGlow.rotation.z += dt * 2.2;
    }
  }

  getWorldBox(target) {
    const hw = CONFIG.PLAYER_HALF_WIDTH;
    const hd = CONFIG.PLAYER_HALF_DEPTH;
    const p = this.mesh.position;
    target.min.set(p.x - hw, p.y - 0.35, p.z - hd);
    target.max.set(p.x + hw, p.y + 0.45, p.z + hd);
    return target;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        const m = c.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
  }
}
