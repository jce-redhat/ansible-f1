import * as THREE from "three";
import { CONFIG } from "../data/config.js";

/**
 * Low-poly open-wheel race car (F1-style read from chase cam), smooth lane lerp.
 */
export class Player {
  constructor(scene, carType = "f1") {
    this.scene = scene;
    this.laneIndex = 1;
    this.targetLaneIndex = 1;
    this.carType = carType;
    this.mesh = this._buildCarForType(carType);
    this.mesh.position.set(
      CONFIG.LANES[this.laneIndex],
      CONFIG.PLAYER_Y,
      0
    );
    scene.add(this.mesh);

    this.flowGlow = null;
    this.shieldRing = null;
    this._buildFlowGlow();
    this._buildShieldRing();
  }

  swapCar(carType) {
    if (carType === this.carType) return;
    const pos = this.mesh.position.clone();
    const vis = this.mesh.visible;
    this.dispose();
    this.carType = carType;
    this.mesh = this._buildCarForType(carType);
    this.mesh.position.copy(pos);
    this.mesh.visible = vis;
    this.scene.add(this.mesh);
    this.flowGlow = null;
    this.shieldRing = null;
    this._buildFlowGlow();
    this._buildShieldRing();
  }

  _buildCarForType(type) {
    if (type === "truck") return this._buildTruckMesh();
    if (type === "f1_yellow") return this._buildYellowF1Mesh();
    if (type === "f1_pink") return this._buildPinkF1Mesh();
    return this._buildMesh();
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

  _buildYellowF1Mesh() {
    const g = new THREE.Group();

    const livery = new THREE.MeshStandardMaterial({
      color: 0xffd000, metalness: 0.5, roughness: 0.32,
      emissive: 0x332800, emissiveIntensity: 0.4,
    });
    const carbon = new THREE.MeshStandardMaterial({
      color: 0x111118, metalness: 0.6, roughness: 0.38,
      emissive: 0x050508, emissiveIntensity: 0.15,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0xff6600, metalness: 0.4, roughness: 0.4,
      emissive: 0x331100, emissiveIntensity: 0.35,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d, metalness: 0.15, roughness: 0.92,
    });
    const rim = new THREE.MeshStandardMaterial({
      color: 0xddaa00, metalness: 0.8, roughness: 0.22,
    });

    // Sleeker front wing
    const fwMain = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.04, 0.42), carbon.clone());
    fwMain.position.set(0, 0.1, -1.08);
    g.add(fwMain);

    const fwFlap = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.03, 0.2), carbon.clone());
    fwFlap.position.set(0, 0.065, -1.22);
    g.add(fwFlap);

    // Aggressive endplates
    const epL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.36), accent.clone());
    epL.position.set(-1.12, 0.16, -1.08);
    g.add(epL);
    const epR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.36), accent.clone());
    epR.position.set(1.12, 0.16, -1.08);
    g.add(epR);

    // Elongated nose
    const noseCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.28, 0.6, 10), livery.clone()
    );
    noseCone.rotation.x = Math.PI / 2;
    noseCone.position.set(0, 0.19, -1.4);
    g.add(noseCone);

    const noseTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.42, 8), livery.clone()
    );
    noseTip.rotation.x = Math.PI / 2;
    noseTip.position.set(0, 0.19, -1.82);
    g.add(noseTip);

    // Cockpit — lower, tighter
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.3, 0.58), livery.clone());
    cockpit.position.set(0, 0.36, -0.4);
    g.add(cockpit);

    const airbox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.18), carbon.clone());
    airbox.position.set(0, 0.52, -0.14);
    g.add(airbox);

    // Halo
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.022, 6, 12, Math.PI * 0.92), carbon.clone()
    );
    halo.rotation.y = Math.PI / 2;
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.56, -0.3);
    g.add(halo);

    // Narrow sidepods (super aerodynamic)
    const podGeo = new THREE.BoxGeometry(0.34, 0.18, 0.78);
    const podL = new THREE.Mesh(podGeo, livery.clone());
    podL.position.set(-0.6, 0.22, 0.1);
    g.add(podL);
    const podR = new THREE.Mesh(podGeo.clone(), livery.clone());
    podR.position.set(0.6, 0.22, 0.1);
    g.add(podR);

    // Engine cover — long, tapered
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.88), livery.clone());
    cover.position.set(0, 0.34, 0.44);
    cover.rotation.x = -0.1;
    g.add(cover);

    // Shark fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.5), accent.clone());
    fin.position.set(0, 0.52, 0.35);
    g.add(fin);

    // Rear wing — taller DRS style
    const rwLow = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.035, 0.22), carbon.clone());
    rwLow.position.set(0, 0.48, 0.7);
    g.add(rwLow);

    const rwHigh = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.03, 0.16), carbon.clone());
    rwHigh.position.set(0, 0.64, 0.66);
    g.add(rwHigh);

    const rwEpL = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.4, 0.44), accent.clone());
    rwEpL.position.set(-0.92, 0.54, 0.68);
    g.add(rwEpL);
    const rwEpR = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.4, 0.44), accent.clone());
    rwEpR.position.set(0.92, 0.54, 0.68);
    g.add(rwEpR);

    // Rain light
    const rainLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.06, 0.04), accent.clone()
    );
    rainLight.position.set(0, 0.4, 0.86);
    g.add(rainLight);

    // Mirrors
    const mirGeo = new THREE.BoxGeometry(0.1, 0.045, 0.07);
    const mirL = new THREE.Mesh(mirGeo, carbon.clone());
    mirL.position.set(-0.36, 0.46, -0.58);
    g.add(mirL);
    const mirR = new THREE.Mesh(mirGeo.clone(), carbon.clone());
    mirR.position.set(0.36, 0.46, -0.58);
    g.add(mirR);

    // Wheels — gold rims
    const addWheel = (x, z) => {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.21, 0.16, 18), rubber.clone()
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, 0.21, z);
      g.add(tire);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), rim.clone()
      );
      disc.rotation.z = Math.PI / 2;
      disc.position.set(x, 0.21, z);
      g.add(disc);
    };
    addWheel(-0.78, -0.95);
    addWheel(0.78, -0.95);
    addWheel(-0.78, 0.4);
    addWheel(0.78, 0.4);

    // Yellow-gold underglow
    const glow = new THREE.PointLight(0xffcc00, 0.6, 9);
    glow.position.set(0, 0.42, 0.72);
    g.add(glow);
    this.pointLight = glow;

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    livery.dispose(); carbon.dispose(); accent.dispose();
    rubber.dispose(); rim.dispose();

    return g;
  }

  _buildPinkF1Mesh() {
    const g = new THREE.Group();

    const livery = new THREE.MeshStandardMaterial({
      color: 0xff69b4, metalness: 0.45, roughness: 0.34,
      emissive: 0x330018, emissiveIntensity: 0.35,
    });
    const carbon = new THREE.MeshStandardMaterial({
      color: 0x1a1a22, metalness: 0.55, roughness: 0.42,
      emissive: 0x050508, emissiveIntensity: 0.15,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.5, roughness: 0.3,
      emissive: 0x222222, emissiveIntensity: 0.2,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d, metalness: 0.15, roughness: 0.92,
    });
    const rim = new THREE.MeshStandardMaterial({
      color: 0xffaacc, metalness: 0.75, roughness: 0.25,
    });

    // Front wing
    const fwMain = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.045, 0.38), carbon.clone());
    fwMain.position.set(0, 0.11, -1.02);
    g.add(fwMain);
    const fwFlap = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.035, 0.22), carbon.clone());
    fwFlap.position.set(0, 0.07, -1.14);
    g.add(fwFlap);

    // Endplates
    const epL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.32), accent.clone());
    epL.position.set(-1.06, 0.16, -1.02);
    g.add(epL);
    const epR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.32), accent.clone());
    epR.position.set(1.06, 0.16, -1.02);
    g.add(epR);

    // Nose
    const noseCone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.32, 0.55, 10), livery.clone()
    );
    noseCone.rotation.x = Math.PI / 2;
    noseCone.position.set(0, 0.2, -1.32);
    g.add(noseCone);
    const noseTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.35, 8), livery.clone()
    );
    noseTip.rotation.x = Math.PI / 2;
    noseTip.position.set(0, 0.2, -1.72);
    g.add(noseTip);

    // Cockpit
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.34, 0.62), livery.clone());
    cockpit.position.set(0, 0.38, -0.38);
    g.add(cockpit);
    const airbox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.2), carbon.clone());
    airbox.position.set(0, 0.52, -0.12);
    g.add(airbox);

    // Halo
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.025, 6, 12, Math.PI * 0.92), carbon.clone()
    );
    halo.rotation.y = Math.PI / 2;
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.58, -0.28);
    g.add(halo);

    // Sidepods
    const podGeo = new THREE.BoxGeometry(0.38, 0.22, 0.72);
    const podL = new THREE.Mesh(podGeo, livery.clone());
    podL.position.set(-0.64, 0.24, 0.08);
    g.add(podL);
    const podR = new THREE.Mesh(podGeo.clone(), livery.clone());
    podR.position.set(0.64, 0.24, 0.08);
    g.add(podR);

    // Engine cover
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.26, 0.82), livery.clone());
    cover.position.set(0, 0.36, 0.42);
    cover.rotation.x = -0.08;
    g.add(cover);

    // Rear wing
    const rwLow = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.04, 0.24), carbon.clone());
    rwLow.position.set(0, 0.44, 0.66);
    g.add(rwLow);
    const rwHigh = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.035, 0.18), carbon.clone());
    rwHigh.position.set(0, 0.58, 0.62);
    g.add(rwHigh);
    const rwEpL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.48), accent.clone());
    rwEpL.position.set(-0.9, 0.5, 0.64);
    g.add(rwEpL);
    const rwEpR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.48), accent.clone());
    rwEpR.position.set(0.9, 0.5, 0.64);
    g.add(rwEpR);

    // Rain light — hot pink glow
    const rainLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.06, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0xff1493, emissive: 0xff1493, emissiveIntensity: 0.8,
      })
    );
    rainLight.position.set(0, 0.38, 0.82);
    g.add(rainLight);

    // Mirrors
    const mirGeo = new THREE.BoxGeometry(0.12, 0.05, 0.08);
    const mirL = new THREE.Mesh(mirGeo, carbon.clone());
    mirL.position.set(-0.38, 0.48, -0.55);
    g.add(mirL);
    const mirR = new THREE.Mesh(mirGeo.clone(), carbon.clone());
    mirR.position.set(0.38, 0.48, -0.55);
    g.add(mirR);

    // Wheels — pink rims
    const addWheel = (x, z) => {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.21, 0.16, 18), rubber.clone()
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, 0.21, z);
      g.add(tire);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), rim.clone()
      );
      disc.rotation.z = Math.PI / 2;
      disc.position.set(x, 0.21, z);
      g.add(disc);
    };
    addWheel(-0.78, -0.92);
    addWheel(0.78, -0.92);
    addWheel(-0.78, 0.38);
    addWheel(0.78, 0.38);

    const glow = new THREE.PointLight(0xff69b4, 0.55, 9);
    glow.position.set(0, 0.42, 0.72);
    g.add(glow);
    this.pointLight = glow;

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    livery.dispose(); carbon.dispose(); accent.dispose();
    rubber.dispose(); rim.dispose();

    return g;
  }

  _buildTruckMesh() {
    const g = new THREE.Group();

    const paint = new THREE.MeshStandardMaterial({
      color: 0x22aa44, metalness: 0.4, roughness: 0.4,
      emissive: 0x0a2a0a, emissiveIntensity: 0.3,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x1a1a22, metalness: 0.5, roughness: 0.45,
      emissive: 0x050508, emissiveIntensity: 0.15,
    });
    const chrome = new THREE.MeshStandardMaterial({
      color: 0xccddee, metalness: 0.8, roughness: 0.2,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d, metalness: 0.15, roughness: 0.92,
    });
    const rim = new THREE.MeshStandardMaterial({
      color: 0x88aacc, metalness: 0.75, roughness: 0.28,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x88ccff, metalness: 0.5, roughness: 0.15,
      transparent: true, opacity: 0.6,
    });
    const red = new THREE.MeshStandardMaterial({
      color: 0xee2200, metalness: 0.3, roughness: 0.4,
      emissive: 0x440000, emissiveIntensity: 0.4,
    });

    // Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 1.1), paint);
    cab.position.set(0, 0.7, -0.4);
    g.add(cab);

    // Cab roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.1), dark);
    roof.position.set(0, 1.16, -0.4);
    g.add(roof);

    // Windshield
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), glass);
    ws.position.set(0, 0.85, -0.97);
    g.add(ws);

    // Rear window
    const rw = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5), glass);
    rw.position.set(0, 0.85, 0.16);
    rw.rotation.y = Math.PI;
    g.add(rw);

    // Bed
    const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.6), dark);
    bedFloor.position.set(0, 0.28, 0.95);
    g.add(bedFloor);

    // Bed sides
    const bedSideMat = paint.clone();
    const bedL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 1.6), bedSideMat);
    bedL.position.set(-0.75, 0.48, 0.95);
    g.add(bedL);
    const bedR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 1.6), bedSideMat);
    bedR.position.set(0.75, 0.48, 0.95);
    g.add(bedR);

    // Tailgate
    const tailgate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.06), bedSideMat);
    tailgate.position.set(0, 0.48, 1.76);
    g.add(tailgate);

    // Hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.25, 0.7), paint.clone());
    hood.position.set(0, 0.45, -1.15);
    g.add(hood);

    // Front grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.06), chrome);
    grille.position.set(0, 0.45, -1.52);
    g.add(grille);

    // Front bumper
    const fBump = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.12), dark);
    fBump.position.set(0, 0.22, -1.52);
    g.add(fBump);

    // Rear bumper
    const rBump = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.12), dark);
    rBump.position.set(0, 0.22, 1.78);
    g.add(rBump);

    // Headlights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    for (const side of [-0.5, 0.5]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.06), hlMat);
      hl.position.set(side, 0.5, -1.53);
      g.add(hl);
    }

    // Taillights
    for (const side of [-0.55, 0.55]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.06), red);
      tl.position.set(side, 0.5, 1.79);
      g.add(tl);
    }

    // Roll bar in bed
    const rollBar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.08), chrome);
    rollBar.position.set(0, 0.85, 0.25);
    g.add(rollBar);
    for (const side of [-0.55, 0.55]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), chrome);
      post.position.set(side, 0.6, 0.25);
      g.add(post);
    }

    // Big tires (lifted truck!)
    const addWheel = (x, z) => {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16), rubber
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, 0.32, z);
      g.add(tire);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.08, 10), rim
      );
      disc.rotation.z = Math.PI / 2;
      disc.position.set(x, 0.32, z);
      g.add(disc);
    };
    addWheel(-0.82, -0.9);
    addWheel(0.82, -0.9);
    addWheel(-0.82, 1.2);
    addWheel(0.82, 1.2);

    // Underglow (green)
    const glow = new THREE.PointLight(0x44ff66, 0.55, 9);
    glow.position.set(0, 0.15, 0.4);
    g.add(glow);
    this.pointLight = glow;

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    paint.dispose(); dark.dispose(); chrome.dispose();
    rubber.dispose(); rim.dispose(); glass.dispose(); red.dispose();

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

  _buildShieldRing() {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.055, 8, 32),
      new THREE.MeshBasicMaterial({
        color: 0xaa55ff,
        transparent: true,
        opacity: 0,
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    this.mesh.add(ring);
    this.shieldRing = ring;
  }

  setShieldActive(on) {
    if (!this.shieldRing) return;
    this.shieldRing.material.opacity = on ? 0.75 : 0;
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
    if (this.shieldRing && this.shieldRing.material.opacity > 0.01) {
      this.shieldRing.rotation.z -= dt * 1.5;
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

  explode() {
    const pos = this.mesh.position.clone();
    const parts = [];
    this.mesh.traverse((c) => { if (c.isMesh) parts.push(c); });

    const debris = new THREE.Group();
    debris.position.copy(pos);
    this.scene.add(debris);

    for (const part of parts) {
      const p = part.clone();
      if (p.material && !Array.isArray(p.material)) {
        p.material = p.material.clone();
        p.material.transparent = true;
      }
      p.position.set(
        (Math.random() - 0.5) * 0.4,
        Math.random() * 0.2,
        (Math.random() - 0.5) * 0.4
      );
      debris.add(p);
    }

    const vels = debris.children.map(() => new THREE.Vector3(
      (Math.random() - 0.5) * 14,
      4 + Math.random() * 10,
      (Math.random() - 0.5) * 12
    ));

    this.mesh.visible = false;

    let elapsed = 0;
    const animate = () => {
      elapsed += 0.016;
      if (elapsed > 1.5) {
        this.scene.remove(debris);
        debris.traverse((c) => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
            else c.material.dispose();
          }
        });
        return;
      }
      for (let i = 0; i < debris.children.length; i++) {
        const v = vels[i];
        if (!v) continue;
        debris.children[i].position.x += v.x * 0.016;
        debris.children[i].position.y += v.y * 0.016;
        debris.children[i].position.z += v.z * 0.016;
        v.y -= 16 * 0.016;
        debris.children[i].rotation.x += 6 * 0.016;
        debris.children[i].rotation.z += 4 * 0.016;
      }
      const fade = 1 - elapsed / 1.5;
      debris.traverse((c) => {
        if (c.isMesh && c.material) {
          c.material.transparent = true;
          c.material.opacity = fade;
        }
      });
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
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
