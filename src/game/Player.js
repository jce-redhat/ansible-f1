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
    this._smokeParticles = null;
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
    this._smokeParticles = null;
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
    if (type === "lightcycle") return this._buildLightcycleMesh();
    if (type === "delorean") return this._buildDeloreanMesh();
    if (type === "semi_truck") return this._buildSemiTruckMesh();
    if (type === "f1_yellow") return this._buildF1({
      livery: 0xffd000, liveryEmit: 0x332800,
      accent: 0xff6600, accentEmit: 0x331100,
      rim: 0xddaa00, glow: 0xffcc00,
    });
    if (type === "f1_pink") return this._buildF1({
      livery: 0xff69b4, liveryEmit: 0x330018,
      accent: 0xffffff, accentEmit: 0x222222,
      rim: 0xffaacc, glow: 0xff69b4,
    });
    if (type === "f1_purple") return this._buildF1({
      livery: 0x8833cc, liveryEmit: 0x1a0033,
      accent: 0xcc44ff, accentEmit: 0x330066,
      rim: 0xaa66dd, glow: 0x9944ff,
    });
    if (type === "f1_turquoise") return this._buildF1({
      livery: 0x00d4cc, liveryEmit: 0x002a28,
      accent: 0x88eeff, accentEmit: 0x113344,
      rim: 0x66ddee, glow: 0x00e5d0,
    });
    if (type === "f1_black_gold") return this._buildF1({
      livery: 0x111111, liveryEmit: 0x000000,
      accent: 0xdaa520, accentEmit: 0x332200,
      rim: 0xdaa520, glow: 0xffd700,
    });
    if (type === "f1_pink_gold") return this._buildF1({
      livery: 0xff69b4, liveryEmit: 0x330018,
      accent: 0xdaa520, accentEmit: 0x332200,
      rim: 0xdaa520, glow: 0xff69b4,
    });
    if (type === "f1_blue_white") return this._buildF1({
      livery: 0x00205b, liveryEmit: 0x000d26,
      accent: 0xffffff, accentEmit: 0x444444,
      rim: 0xffffff, glow: 0x0044aa,
    });
    if (type === "hippo") return this._buildHippoMesh();
    if (type === "skateboard") return this._buildSkateboardMesh();
    return this._buildF1();
  }

  _buildF1(scheme = {}) {
    const {
      livery: livCol = 0x00c8ea, liveryEmit: livEmit = 0x002030,
      accent: accCol = 0xe10600, accentEmit: accEmit = 0x330000,
      rim: rimCol = 0x88aacc, glow: glowCol = 0x00ffff,
    } = scheme;

    const g = new THREE.Group();

    const livery = new THREE.MeshStandardMaterial({
      color: livCol, metalness: 0.5, roughness: 0.32,
      emissive: livEmit, emissiveIntensity: 0.35,
    });
    const carbon = new THREE.MeshStandardMaterial({
      color: 0x111118, metalness: 0.6, roughness: 0.35,
      emissive: 0x050508, emissiveIntensity: 0.15,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: accCol, metalness: 0.4, roughness: 0.4,
      emissive: accEmit, emissiveIntensity: 0.35,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d, metalness: 0.15, roughness: 0.92,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: rimCol, metalness: 0.8, roughness: 0.22,
    });
    const metal = new THREE.MeshStandardMaterial({
      color: 0x667788, metalness: 0.7, roughness: 0.3,
    });

    // ── Floor / plank (thin strip under the body only) ──
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 2.2), carbon.clone());
    floor.position.set(0, 0.08, -0.15);
    g.add(floor);

    // Floor edge rails
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 1.2), carbon.clone());
      edge.position.set(side * 0.38, 0.08, 0.1);
      g.add(edge);
    }

    // ── Front wing — multi-element, wider, lower ──
    const fwMain = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.035, 0.32), carbon.clone());
    fwMain.position.set(0, 0.08, -1.55);
    g.add(fwMain);

    const fwFlap1 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.025, 0.14), carbon.clone());
    fwFlap1.position.set(0, 0.11, -1.68);
    fwFlap1.rotation.x = 0.15;
    g.add(fwFlap1);

    const fwFlap2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.02, 0.1), carbon.clone());
    fwFlap2.position.set(0, 0.13, -1.76);
    fwFlap2.rotation.x = 0.25;
    g.add(fwFlap2);

    // Endplates (curved look via angled box)
    for (const side of [-1, 1]) {
      const ep = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.45), accent.clone());
      ep.position.set(side * 1.14, 0.12, -1.55);
      g.add(ep);
      const epFin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.2), accent.clone());
      epFin.position.set(side * 1.08, 0.08, -1.78);
      epFin.rotation.x = 0.2;
      g.add(epFin);
    }

    // Nose pillar (connects front wing to monocoque)
    const nosePillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.1, 0.25), livery.clone()
    );
    nosePillar.position.set(0, 0.13, -1.35);
    g.add(nosePillar);

    // ── Nose — tapered box sections (no cones) ──
    // Wide base transitioning from monocoque
    const noseBase = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.4), livery.clone());
    noseBase.position.set(0, 0.2, -0.9);
    g.add(noseBase);

    // Mid-section taper
    const noseMid = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 0.4), livery.clone());
    noseMid.position.set(0, 0.19, -1.2);
    g.add(noseMid);

    // Narrow front section
    const noseFront = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.35), livery.clone());
    noseFront.position.set(0, 0.18, -1.48);
    g.add(noseFront);

    // Nose tip (rounded, not pointy)
    const noseTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 6), livery.clone()
    );
    noseTip.scale.set(1, 0.8, 1.8);
    noseTip.position.set(0, 0.18, -1.68);
    g.add(noseTip);

    // ── Monocoque / survival cell ──
    const monoFront = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.5), livery.clone());
    monoFront.position.set(0, 0.28, -0.6);
    g.add(monoFront);

    // Cockpit tub
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.55), livery.clone());
    cockpit.position.set(0, 0.38, -0.32);
    g.add(cockpit);

    // Cockpit opening (dark inset)
    const cockpitHole = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.3), carbon.clone());
    cockpitHole.position.set(0, 0.5, -0.32);
    g.add(cockpitHole);

    // Driver helmet (small sphere for detail)
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 6), accent.clone()
    );
    helmet.position.set(0, 0.52, -0.3);
    g.add(helmet);

    // ── Airbox (above/behind driver head) ──
    const airbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.14, 0.22, 8), carbon.clone()
    );
    airbox.position.set(0, 0.56, -0.08);
    g.add(airbox);

    // T-camera
    const tcam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), accent.clone());
    tcam.position.set(0, 0.68, -0.08);
    g.add(tcam);

    // ── Halo device ──
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.028, 6, 14, Math.PI * 0.88), metal.clone()
    );
    halo.rotation.y = Math.PI / 2;
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.55, -0.22);
    g.add(halo);

    // Halo center pillar
    const haloPillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.04), metal.clone());
    haloPillar.position.set(0, 0.48, -0.44);
    g.add(haloPillar);

    // ── Sidepods with undercut ──
    for (const side of [-1, 1]) {
      // Upper sidepod body
      const podTop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.85), livery.clone());
      podTop.position.set(side * 0.58, 0.28, 0.1);
      g.add(podTop);

      // Sidepod inlet (darker mouth)
      const inlet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.06), carbon.clone());
      inlet.position.set(side * 0.58, 0.26, -0.34);
      g.add(inlet);

      // Undercut (recessed area below sidepod)
      const undercut = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.7), carbon.clone());
      undercut.position.set(side * 0.58, 0.14, 0.15);
      g.add(undercut);

      // Bargeboard / turning vane
      const vane = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.3), carbon.clone());
      vane.position.set(side * 0.42, 0.16, -0.5);
      vane.rotation.y = side * 0.15;
      g.add(vane);
    }

    // ── Engine cover — long taper with spine ──
    const coverWide = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.5), livery.clone());
    coverWide.position.set(0, 0.35, 0.25);
    g.add(coverWide);

    const coverNarrow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.24, 0.6, 8), livery.clone()
    );
    coverNarrow.rotation.x = Math.PI / 2;
    coverNarrow.position.set(0, 0.35, 0.65);
    g.add(coverNarrow);

    // Shark fin
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.16, 0.55), accent.clone());
    fin.position.set(0, 0.5, 0.4);
    g.add(fin);

    // Spine ridge on engine cover
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.7), carbon.clone());
    spine.position.set(0, 0.46, 0.35);
    g.add(spine);

    // ── Rear wing — tall, aggressive ──
    const rwMain = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.28), carbon.clone());
    rwMain.position.set(0, 0.56, 0.92);
    g.add(rwMain);

    const rwFlap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.025, 0.14), carbon.clone());
    rwFlap.position.set(0, 0.62, 0.86);
    rwFlap.rotation.x = -0.12;
    g.add(rwFlap);

    // Wing swan-neck mounts
    for (const side of [-0.3, 0.3]) {
      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.06), metal.clone());
      mount.position.set(side, 0.48, 0.9);
      g.add(mount);
    }

    // Endplates
    for (const side of [-1, 1]) {
      const rwEp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.38), accent.clone());
      rwEp.position.set(side * 0.82, 0.52, 0.9);
      g.add(rwEp);
    }

    // Beam wing (lower element)
    const beamWing = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.025, 0.12), carbon.clone());
    beamWing.position.set(0, 0.38, 0.88);
    g.add(beamWing);

    // FIA rain light
    const rainLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.05, 0.04),
      new THREE.MeshStandardMaterial({
        color: accCol, emissive: accCol, emissiveIntensity: 0.8,
      })
    );
    rainLight.position.set(0, 0.34, 0.96);
    g.add(rainLight);

    // ── Exhaust pipe ──
    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.4 })
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0, 0.28, 0.96);
    g.add(exhaust);

    // ── Mirrors on stalks ──
    for (const side of [-1, 1]) {
      const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), carbon.clone());
      stalk.position.set(side * 0.34, 0.44, -0.5);
      g.add(stalk);
      const mirr = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.06), metal.clone());
      mirr.position.set(side * 0.42, 0.44, -0.5);
      g.add(mirr);
    }

    // ── Wheels ──
    const addWheel = (x, z, isFront) => {
      const r = isFront ? 0.24 : 0.26;
      const w = isFront ? 0.14 : 0.18;
      const tireGrp = new THREE.Group();
      tireGrp.position.set(x, r, z);

      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, w, 20), rubber.clone()
      );
      tire.rotation.z = Math.PI / 2;
      tireGrp.add(tire);

      // Wheel cover (outer face)
      const cover = new THREE.Mesh(
        new THREE.CylinderGeometry(r - 0.03, r - 0.03, 0.03, 16),
        rimMat.clone()
      );
      cover.rotation.z = Math.PI / 2;
      cover.position.x = Math.sign(x) * (w / 2 + 0.01);
      tireGrp.add(cover);

      // Hub detail
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8), metal.clone()
      );
      hub.rotation.z = Math.PI / 2;
      hub.position.x = Math.sign(x) * (w / 2 + 0.02);
      tireGrp.add(hub);

      g.add(tireGrp);
    };
    addWheel(-0.85, -0.95, true);
    addWheel(0.85, -0.95, true);
    addWheel(-0.85, 0.52, false);
    addWheel(0.85, 0.52, false);

    // Suspension arms (front)
    for (const side of [-1, 1]) {
      for (const arm of [-0.08, 0.08]) {
        const sus = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.02), metal.clone());
        sus.position.set(side * 0.55, 0.2 + arm, -0.95);
        g.add(sus);
      }
      // Rear suspension
      for (const arm of [-0.06, 0.06]) {
        const sus = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.02), metal.clone());
        sus.position.set(side * 0.55, 0.22 + arm, 0.52);
        g.add(sus);
      }
    }

    // ── Underglow light ──
    const glowLight = new THREE.PointLight(glowCol, 0.55, 9);
    glowLight.position.set(0, 0.42, 0.5);
    g.add(glowLight);
    this.pointLight = glowLight;

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    livery.dispose(); carbon.dispose(); accent.dispose();
    rubber.dispose(); rimMat.dispose(); metal.dispose();

    return g;
  }

  _buildMesh() {
    return this._buildF1();
  }

  _buildLightcycleMesh() {
    const g = new THREE.Group();

    const body = new THREE.MeshStandardMaterial({
      color: 0x0a0a12, metalness: 0.7, roughness: 0.25,
      emissive: 0x000000,
    });
    const neon = new THREE.MeshStandardMaterial({
      color: 0x00ffaa, metalness: 0.3, roughness: 0.2,
      emissive: 0x00ffaa, emissiveIntensity: 0.9,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d, metalness: 0.15, roughness: 0.92,
    });
    const chrome = new THREE.MeshStandardMaterial({
      color: 0x889999, metalness: 0.85, roughness: 0.15,
    });
    const visor = new THREE.MeshStandardMaterial({
      color: 0x44ffcc, metalness: 0.6, roughness: 0.1,
      emissive: 0x22aa88, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.7,
    });

    // ── Main chassis spine (long, low, sleek) ──
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 2.8), body.clone());
    spine.position.set(0, 0.35, -0.1);
    g.add(spine);

    // Lower fairing (wider, hugs the ground)
    const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 2.4), body.clone());
    fairing.position.set(0, 0.22, -0.1);
    g.add(fairing);

    // Front cowl (tapers forward)
    const cowlFront = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.5), body.clone());
    cowlFront.position.set(0, 0.32, -1.35);
    g.add(cowlFront);

    const cowlTip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.35), body.clone());
    cowlTip.position.set(0, 0.3, -1.65);
    g.add(cowlTip);

    // Nose tip (rounded)
    const noseTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 6), body.clone()
    );
    noseTip.scale.set(1, 0.7, 2.0);
    noseTip.position.set(0, 0.3, -1.85);
    g.add(noseTip);

    // Rear tail (tapers back and up)
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.5), body.clone());
    tail.position.set(0, 0.4, 1.2);
    tail.rotation.x = -0.15;
    g.add(tail);

    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.45), body.clone());
    tailFin.position.set(0, 0.55, 1.15);
    g.add(tailFin);

    // ── Rider (crouched forward) ──
    // Torso (leaned forward)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.45), body.clone());
    torso.position.set(0, 0.58, -0.15);
    torso.rotation.x = -0.3;
    g.add(torso);

    // Helmet
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 8), body.clone()
    );
    helmet.position.set(0, 0.72, -0.42);
    g.add(helmet);

    // Visor
    const visorMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 6, 0, Math.PI), visor
    );
    visorMesh.rotation.y = Math.PI;
    visorMesh.position.set(0, 0.73, -0.48);
    g.add(visorMesh);

    // Arms (reaching to handlebars)
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.3), body.clone());
      arm.position.set(side * 0.2, 0.52, -0.5);
      arm.rotation.x = -0.4;
      g.add(arm);
    }

    // Handlebars
    const handlebar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), chrome.clone());
    handlebar.position.set(0, 0.46, -0.68);
    g.add(handlebar);

    // ── Neon light strips (Tron signature) ──
    // Spine top strip
    const stripTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 2.6), neon.clone());
    stripTop.position.set(0, 0.47, -0.1);
    g.add(stripTop);

    // Side strips (left + right)
    for (const side of [-1, 1]) {
      const stripSide = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 2.2), neon.clone());
      stripSide.position.set(side * 0.28, 0.3, -0.1);
      g.add(stripSide);

      // Lower fairing accent
      const stripLow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1.8), neon.clone());
      stripLow.position.set(side * 0.26, 0.17, -0.1);
      g.add(stripLow);
    }

    // Front fork neon accents
    const stripNose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), neon.clone());
    stripNose.position.set(0, 0.3, -1.82);
    g.add(stripNose);

    // Tail light bar
    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.03), neon.clone());
    tailLight.position.set(0, 0.48, 1.42);
    g.add(tailLight);

    // Helmet visor neon rim
    const visorRim = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.02), neon.clone());
    visorRim.position.set(0, 0.72, -0.55);
    g.add(visorRim);

    // ── Wheels (large, enclosed, Tron-style) ──
    // Front wheel
    const fTire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.1, 20), rubber.clone()
    );
    fTire.rotation.z = Math.PI / 2;
    fTire.position.set(0, 0.28, -1.15);
    g.add(fTire);

    // Front wheel neon ring
    const fRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.015, 6, 24), neon.clone()
    );
    fRing.rotation.y = Math.PI / 2;
    fRing.position.set(0, 0.28, -1.15);
    g.add(fRing);

    // Front wheel hub
    const fHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), chrome.clone()
    );
    fHub.rotation.z = Math.PI / 2;
    fHub.position.set(0, 0.28, -1.15);
    g.add(fHub);

    // Front fork (two prongs)
    for (const side of [-0.08, 0.08]) {
      const fork = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), chrome.clone());
      fork.position.set(side, 0.32, -1.15);
      fork.rotation.x = 0.1;
      g.add(fork);
    }

    // Rear wheel (bigger)
    const rTire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.14, 20), rubber.clone()
    );
    rTire.rotation.z = Math.PI / 2;
    rTire.position.set(0, 0.32, 0.85);
    g.add(rTire);

    // Rear wheel neon ring
    const rRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.018, 6, 24), neon.clone()
    );
    rRing.rotation.y = Math.PI / 2;
    rRing.position.set(0, 0.32, 0.85);
    g.add(rRing);

    // Rear wheel hub
    const rHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.16, 8), chrome.clone()
    );
    rHub.rotation.z = Math.PI / 2;
    rHub.position.set(0, 0.32, 0.85);
    g.add(rHub);

    // Rear swingarm
    for (const side of [-0.1, 0.1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.6), chrome.clone());
      arm.position.set(side, 0.28, 0.65);
      g.add(arm);
    }

    // ── Underglow ──
    const glow = new THREE.PointLight(0x00ffaa, 0.7, 8);
    glow.position.set(0, 0.1, 0);
    g.add(glow);
    this.pointLight = glow;

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    body.dispose(); neon.dispose(); rubber.dispose();
    chrome.dispose();

    return g;
  }

  _buildDeloreanMesh() {
    const g = new THREE.Group();

    const steel = new THREE.MeshStandardMaterial({
      color: 0xc0c0c8, metalness: 0.9, roughness: 0.14,
      emissive: 0x181820, emissiveIntensity: 0.12,
    });
    const darkSteel = new THREE.MeshStandardMaterial({
      color: 0x808088, metalness: 0.85, roughness: 0.2,
      emissive: 0x0a0a0a, emissiveIntensity: 0.1,
    });
    const black = new THREE.MeshStandardMaterial({
      color: 0x080810, metalness: 0.5, roughness: 0.45,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x88bbdd, metalness: 0.5, roughness: 0.1,
      transparent: true, opacity: 0.45,
    });
    const fluxBlue = new THREE.MeshStandardMaterial({
      color: 0x44ccff, emissive: 0x44ccff, emissiveIntensity: 0.9,
      metalness: 0.3, roughness: 0.2,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d, metalness: 0.15, roughness: 0.92,
    });
    const chrome = new THREE.MeshStandardMaterial({
      color: 0xddddee, metalness: 0.92, roughness: 0.1,
    });
    const tailRed = new THREE.MeshStandardMaterial({
      color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.6,
      metalness: 0.3, roughness: 0.3,
    });

    const H = 0.3;

    // ── Lower body / chassis (long, wide, low slab) ──
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 3.4), darkSteel.clone());
    chassis.position.set(0, 0.2 + H, 0);
    g.add(chassis);

    // ── Main body — wedge profile, low front rising to rear ──
    // Front section (very low, flat hood)
    const hoodFront = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.7), steel.clone());
    hoodFront.position.set(0, 0.3 + H, -1.2);
    g.add(hoodFront);

    // Hood mid (slightly higher)
    const hoodMid = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.55), steel.clone());
    hoodMid.position.set(0, 0.33 + H, -0.72);
    g.add(hoodMid);

    // Hood crease lines
    for (const side of [-0.35, 0.35]) {
      const crease = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1.2), darkSteel.clone());
      crease.position.set(side, 0.35 + H, -0.95);
      g.add(crease);
    }

    // Front fascia (low, wide, angular)
    const frontFascia = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 0.08), darkSteel.clone());
    frontFascia.position.set(0, 0.24 + H, -1.58);
    g.add(frontFascia);

    // DMC grille (narrow black slit)
    const grilleBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.06), black.clone());
    grilleBar.position.set(0, 0.28 + H, -1.59);
    g.add(grilleBar);

    // Headlights (rectangular, recessed)
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    for (const side of [-0.6, 0.6]) {
      const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.08), black.clone());
      hlHousing.position.set(side, 0.3 + H, -1.59);
      g.add(hlHousing);
      const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.04), hlMat);
      hlLens.position.set(side, 0.3 + H, -1.62);
      g.add(hlLens);
    }

    // Front bumper (thin chrome strip)
    const fBump = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.05), chrome.clone());
    fBump.position.set(0, 0.17 + H, -1.6);
    g.add(fBump);

    // ── Cabin / greenhouse (set back, compact) ──
    // A-pillars + windshield frame
    const wsFrame = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.45, 0.06), steel.clone());
    wsFrame.position.set(0, 0.56 + H, -0.42);
    wsFrame.rotation.x = -0.4;
    g.add(wsFrame);

    // Windshield glass
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.38, 0.04), glass.clone());
    windshield.position.set(0, 0.56 + H, -0.41);
    windshield.rotation.x = -0.4;
    g.add(windshield);

    // Roof panel (narrow, between gull-wing doors)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.6), steel.clone());
    roof.position.set(0, 0.72 + H, -0.1);
    g.add(roof);

    // Roof rails (where gull-wing doors hinge)
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.65), darkSteel.clone());
      rail.position.set(side * 0.35, 0.72 + H, -0.1);
      g.add(rail);
    }

    // Side windows (triangular feel via two angled pieces)
    for (const side of [-1, 1]) {
      const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.55), glass.clone());
      sideWin.position.set(side * 0.78, 0.55 + H, -0.12);
      g.add(sideWin);
    }

    // B-pillar / rear quarter
    for (const side of [-1, 1]) {
      const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.06), steel.clone());
      bPillar.position.set(side * 0.78, 0.55 + H, 0.15);
      g.add(bPillar);
    }

    // ── Sloping fastback (roof → rear deck) ──
    const slopeLen = Math.sqrt(0.35 * 0.35 + 0.75 * 0.75);
    const slopeAngle = Math.atan2(0.35, 0.75);
    const slopePanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.04, slopeLen), steel.clone()
    );
    slopePanel.position.set(0, 0.55 + H, 0.55);
    slopePanel.rotation.x = slopeAngle;
    g.add(slopePanel);

    // Rear window glass inset into the slope
    const rearWin = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.03, slopeLen * 0.45), glass.clone()
    );
    rearWin.position.set(0, 0.62 + H, 0.35);
    rearWin.rotation.x = slopeAngle;
    g.add(rearWin);

    // Rear louvers over the lower slope (iconic DMC-12 feature)
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const lz = 0.45 + t * 0.45;
      const ly = 0.55 + H - t * 0.21;
      const louver = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.015, 0.04), darkSteel.clone()
      );
      louver.position.set(0, ly, lz);
      louver.rotation.x = slopeAngle;
      g.add(louver);
    }

    // Side slope panels (close the fastback edges)
    for (const side of [-1, 1]) {
      const slopeSide = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, slopeLen), steel.clone()
      );
      slopeSide.position.set(side * 0.76, 0.55 + H, 0.55);
      slopeSide.rotation.x = slopeAngle;
      g.add(slopeSide);
    }

    // ── Rear body / trunk area (lower, flat deck behind the slope) ──
    const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.35), steel.clone());
    rearDeck.position.set(0, 0.35 + H, 1.05);
    g.add(rearDeck);

    // Body sides (full length, giving the car its shape)
    for (const side of [-1, 1]) {
      const bodySide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 3.2), steel.clone());
      bodySide.position.set(side * 0.85, 0.28 + H, 0);
      g.add(bodySide);

      // Lower rocker panel
      const rocker = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 3.0), darkSteel.clone());
      rocker.position.set(side * 0.87, 0.17 + H, 0);
      g.add(rocker);

      // Gull-wing door seam line
      const doorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.35, 0.9), darkSteel.clone());
      doorSeam.position.set(side * 0.86, 0.45 + H, -0.05);
      g.add(doorSeam);
    }

    // Rear fascia
    const rearFascia = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.06), darkSteel.clone());
    rearFascia.position.set(0, 0.26 + H, 1.26);
    g.add(rearFascia);

    // Rear bumper
    const rBump = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 0.05), chrome.clone());
    rBump.position.set(0, 0.17 + H, 1.28);
    g.add(rBump);

    // Taillights (wide horizontal bar, classic DeLorean)
    for (const side of [-0.5, 0.5]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.05), tailRed);
      tl.position.set(side, 0.3 + H, 1.28);
      g.add(tl);
    }

    // ── BTTF2 rear louver vents (right-triangle wedge with grid slats) ──
    // Profile: flat vertical face at the rear, slopes down toward the front
    for (const side of [-1, 1]) {
      const ventGrp = new THREE.Group();
      ventGrp.position.set(side * 0.52, 0.35 + H, 0.84);

      const ventW = 0.34;
      const ventD = 0.42;
      const ventH = 0.28;

      // Triangle in X-Y: vertical edge at X=ventD (rear), slope to origin (front)
      const triShape = new THREE.Shape();
      triShape.moveTo(0, 0);
      triShape.lineTo(ventD, 0);
      triShape.lineTo(ventD, ventH);
      triShape.closePath();

      const ventShellGeo = new THREE.ExtrudeGeometry(triShape, {
        depth: ventW, bevelEnabled: false,
      });
      ventShellGeo.translate(0, 0, -ventW / 2);
      const ventShell = new THREE.Mesh(ventShellGeo, darkSteel.clone());
      ventShell.rotation.y = -Math.PI / 2;
      ventGrp.add(ventShell);

      // Interior dark void (slightly inset)
      const inset = 0.025;
      const innerShape = new THREE.Shape();
      innerShape.moveTo(0, 0);
      innerShape.lineTo(ventD - inset * 2, 0);
      innerShape.lineTo(ventD - inset * 2, ventH - inset * 2);
      innerShape.closePath();
      const innerGeo = new THREE.ExtrudeGeometry(innerShape, {
        depth: ventW - inset * 2, bevelEnabled: false,
      });
      innerGeo.translate(0, 0, -(ventW - inset * 2) / 2);
      const inner = new THREE.Mesh(innerGeo, black.clone());
      inner.rotation.y = -Math.PI / 2;
      inner.position.set(0, inset, inset);
      ventGrp.add(inner);

      // Horizontal grid slats (each shorter toward the top, following the slope)
      const slatCount = 6;
      for (let i = 1; i < slatCount; i++) {
        const frac = i / slatCount;
        const slatY = frac * ventH;
        const slatLen = ventD * (1 - frac);
        if (slatLen < 0.03) continue;
        const slat = new THREE.Mesh(
          new THREE.BoxGeometry(ventW + 0.01, 0.012, slatLen),
          steel.clone()
        );
        slat.position.set(0, slatY, ventD - slatLen / 2);
        ventGrp.add(slat);
      }

      // Rear face frame (the flat vertical edge)
      const rearFrame = new THREE.Mesh(
        new THREE.BoxGeometry(ventW + 0.02, ventH + 0.01, 0.02),
        darkSteel.clone()
      );
      rearFrame.position.set(0, ventH / 2, ventD + 0.01);
      ventGrp.add(rearFrame);

      g.add(ventGrp);
    }

    // ── Mr. Fusion (on rear deck, between vents) ──
    const fusionBase = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.2), darkSteel.clone());
    fusionBase.position.set(0, 0.46 + H, 0.9);
    g.add(fusionBase);
    const fusionCan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.14, 8), chrome.clone()
    );
    fusionCan.position.set(0, 0.58 + H, 0.9);
    g.add(fusionCan);

    // ── Flux band around body (glowing blue stripe) ──
    const fluxBand = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.02, 0.04), fluxBlue.clone());
    fluxBand.position.set(0, 0.22 + H, -0.3);
    g.add(fluxBand);
    // Rear flux band
    const fluxBandR = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.02, 0.04), fluxBlue.clone());
    fluxBandR.position.set(0, 0.22 + H, 0.6);
    g.add(fluxBandR);

    // ── Flux capacitor Y glow (inside cabin) ──
    const fluxV = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.03), fluxBlue.clone());
    fluxV.position.set(0, 0.52 + H, 0.15);
    g.add(fluxV);
    for (const side of [-0.06, 0.06]) {
      const fluxArm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.03), fluxBlue.clone());
      fluxArm.position.set(side, 0.46 + H, 0.15);
      fluxArm.rotation.z = side > 0 ? -0.5 : 0.5;
      g.add(fluxArm);
    }

    // ── Hover pods — flat discs pointing down (BTTF2 style) ──
    const podY = 0.12 + H;
    const addHoverUnit = (x, z) => {
      // Flat disc pod
      const pod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.18, 0.04, 14), darkSteel.clone()
      );
      pod.position.set(x, podY, z);
      g.add(pod);

      // Inner disc (darker)
      const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.02, 14), rubber.clone()
      );
      inner.position.set(x, podY - 0.025, z);
      g.add(inner);

      // Glowing thruster face on bottom
      const jet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.01, 14),
        new THREE.MeshStandardMaterial({
          color: 0x44ccff, emissive: 0x44ccff, emissiveIntensity: 1.4,
          transparent: true, opacity: 0.6,
        })
      );
      jet.position.set(x, podY - 0.04, z);
      g.add(jet);
    };

    addHoverUnit(-0.72, -1.05);
    addHoverUnit(0.72, -1.05);
    addHoverUnit(-0.72, 0.9);
    addHoverUnit(0.72, 0.9);

    // ── Underglow ──
    const hoverGlow = new THREE.PointLight(0x44ccff, 0.7, 5);
    hoverGlow.position.set(0, 0.05, 0);
    g.add(hoverGlow);

    const fusionGlow = new THREE.PointLight(0xffaa44, 0.25, 3);
    fusionGlow.position.set(0, 0.6 + H, 0.9);
    g.add(fusionGlow);

    this.pointLight = hoverGlow;

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    steel.dispose(); darkSteel.dispose(); black.dispose();
    glass.dispose(); fluxBlue.dispose(); rubber.dispose();
    chrome.dispose();

    return g;
  }

  _buildSemiTruckMesh() {
    const g = new THREE.Group();

    const paint = new THREE.MeshStandardMaterial({
      color: 0x881100, metalness: 0.4, roughness: 0.4,
      emissive: 0x220000, emissiveIntensity: 0.25,
    });
    const chrome = new THREE.MeshStandardMaterial({
      color: 0xccddee, metalness: 0.9, roughness: 0.12,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x1a1a22, metalness: 0.5, roughness: 0.45,
      emissive: 0x050508, emissiveIntensity: 0.15,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d, metalness: 0.15, roughness: 0.92,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x88ccff, metalness: 0.5, roughness: 0.15,
      transparent: true, opacity: 0.5,
    });
    const red = new THREE.MeshStandardMaterial({
      color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.5,
      metalness: 0.3, roughness: 0.4,
    });

    // ── Cab ──
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.3), paint.clone());
    cab.position.set(0, 0.85, -0.8);
    g.add(cab);

    // Cab roof
    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.3), dark.clone());
    cabRoof.position.set(0, 1.42, -0.8);
    g.add(cabRoof);

    // Roof fairing / air deflector
    const fairing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.06), paint.clone());
    fairing.position.set(0, 1.55, -0.18);
    fairing.rotation.x = -0.5;
    g.add(fairing);

    // Windshield
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), glass.clone());
    ws.position.set(0, 1.05, -1.46);
    g.add(ws);

    // Side windows
    for (const side of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), glass.clone());
      sw.rotation.y = side * Math.PI / 2;
      sw.position.set(side * 0.81, 1.05, -0.75);
      g.add(sw);
    }

    // Front bumper (massive chrome)
    const fBump = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 0.15), chrome.clone());
    fBump.position.set(0, 0.35, -1.5);
    g.add(fBump);

    // Grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 0.08), chrome.clone());
    grille.position.set(0, 0.6, -1.48);
    g.add(grille);

    // Headlights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    for (const side of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.06), hlMat);
      hl.position.set(side, 0.6, -1.5);
      g.add(hl);
    }

    // ── Exhaust stacks (twin chrome pipes — smoke source!) ──
    for (const side of [-0.65, 0.65]) {
      const stack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.07, 1.2, 8), chrome.clone()
      );
      stack.position.set(side, 1.3, -0.2);
      g.add(stack);

      // Stack cap
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.06, 0.06, 8), dark.clone()
      );
      cap.position.set(side, 1.92, -0.2);
      g.add(cap);
    }

    // ── Trailer ──
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 2.8), dark.clone());
    trailer.position.set(0, 0.85, 1.2);
    g.add(trailer);

    // Trailer side accents
    for (const side of [-1, 1]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 2.6), paint.clone());
      stripe.position.set(side * 0.76, 0.85, 1.2);
      g.add(stripe);
    }

    // Trailer rear doors
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.05, 0.04), dark.clone());
    doorL.position.set(-0.37, 0.82, 2.62);
    g.add(doorL);
    const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.05, 0.04), dark.clone());
    doorR.position.set(0.37, 0.82, 2.62);
    g.add(doorR);

    // Door seam
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.0, 0.06), chrome.clone());
    seam.position.set(0, 0.82, 2.63);
    g.add(seam);

    // Rear bumper
    const rBump = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 0.1), chrome.clone());
    rBump.position.set(0, 0.28, 2.64);
    g.add(rBump);

    // Taillights
    for (const side of [-0.6, 0.6]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.06), red);
      tl.position.set(side, 0.45, 2.65);
      g.add(tl);
    }

    // Mud flaps
    for (const side of [-0.7, 0.7]) {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.02), rubber.clone());
      flap.position.set(side, 0.3, 2.55);
      g.add(flap);
    }

    // ── Wheels (lots of them!) ──
    const addAxle = (z, count) => {
      for (const side of [-1, 1]) {
        for (let i = 0; i < count; i++) {
          const zOff = z + i * 0.35;
          const tire = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.28, 0.16, 14), rubber.clone()
          );
          tire.rotation.z = Math.PI / 2;
          tire.position.set(side * 0.82, 0.28, zOff);
          g.add(tire);
          const hub = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.04, 8), chrome.clone()
          );
          hub.rotation.z = Math.PI / 2;
          hub.position.set(side * 0.82, 0.28, zOff);
          g.add(hub);
        }
      }
    };
    addAxle(-1.1, 1);       // Front steer axle
    addAxle(-0.15, 2);      // Cab rear tandem
    addAxle(1.6, 2);        // Trailer tandem

    // ── Smoke particle system ──
    const smokeCount = 60;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeSizes = new Float32Array(smokeCount);

    for (let i = 0; i < smokeCount; i++) {
      smokePositions[i * 3] = (Math.random() - 0.5) * 0.3;
      smokePositions[i * 3 + 1] = Math.random() * 2.5;
      smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      smokeSizes[i] = 0.15 + Math.random() * 0.25;
    }
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePositions, 3));
    smokeGeo.setAttribute("size", new THREE.BufferAttribute(smokeSizes, 1));

    const smokeMat = new THREE.PointsMaterial({
      color: 0x666666,
      size: 0.3,
      transparent: true,
      opacity: 0.35,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const smokeL = new THREE.Points(smokeGeo, smokeMat);
    smokeL.position.set(-0.65, 1.9, -0.2);
    g.add(smokeL);

    const smokeR = new THREE.Points(smokeGeo.clone(), smokeMat.clone());
    smokeR.position.set(0.65, 1.9, -0.2);
    g.add(smokeR);

    this._smokeParticles = [smokeL, smokeR];

    // Headlight glow
    const glow = new THREE.PointLight(0xffaa44, 0.5, 8);
    glow.position.set(0, 0.6, -1.5);
    g.add(glow);
    this.pointLight = glow;

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    paint.dispose(); chrome.dispose(); dark.dispose();
    rubber.dispose(); glass.dispose();

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

  _buildHippoMesh() {
    const g = new THREE.Group();
    const grey = new THREE.MeshStandardMaterial({ color: 0x7a6e65, roughness: 0.8 });
    const darkGrey = new THREE.MeshStandardMaterial({ color: 0x5a504a, roughness: 0.8 });
    const pink = new THREE.MeshStandardMaterial({ color: 0xd4888a, roughness: 0.6 });
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const black = new THREE.MeshStandardMaterial({ color: 0x111111 });

    // Body (barrel-shaped)
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 2.2), grey.clone());
    body.position.set(0, 0.6, 0);
    g.add(body);

    // Belly (rounder underside)
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 8), grey.clone());
    belly.scale.set(1.1, 0.7, 1.6);
    belly.position.set(0, 0.35, 0);
    g.add(belly);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.8), grey.clone());
    head.position.set(0, 0.8, -1.3);
    g.add(head);

    // Snout (big wide muzzle)
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.5), darkGrey.clone());
    snout.position.set(0, 0.65, -1.7);
    g.add(snout);

    // Nostrils
    for (const side of [-1, 1]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), black.clone());
      nostril.position.set(side * 0.18, 0.75, -1.96);
      g.add(nostril);
    }

    // Mouth line
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.02), pink.clone());
    mouth.position.set(0, 0.45, -1.96);
    g.add(mouth);

    // Eyes
    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), white.clone());
      eyeWhite.position.set(side * 0.32, 1.0, -1.45);
      g.add(eyeWhite);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), black.clone());
      pupil.position.set(side * 0.32, 1.0, -1.54);
      g.add(pupil);
    }

    // Ears (small bumps on top)
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.1), darkGrey.clone());
      ear.position.set(side * 0.35, 1.2, -1.15);
      ear.rotation.z = side * 0.3;
      g.add(ear);
    }

    // Tail (small stubby)
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.25), darkGrey.clone());
    tail.position.set(0, 0.9, 1.2);
    tail.rotation.x = -0.4;
    g.add(tail);

    // Legs (4 stumpy legs, stored for animation)
    this._hippoLegs = [];
    const legPositions = [
      { x: -0.45, z: -0.6 },  // front-left
      { x: 0.45, z: -0.6 },   // front-right
      { x: -0.45, z: 0.6 },   // rear-left
      { x: 0.45, z: 0.6 },    // rear-right
    ];
    for (let i = 0; i < 4; i++) {
      const lp = legPositions[i];
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.3), darkGrey.clone());
      leg.position.set(lp.x, 0.15, lp.z);
      g.add(leg);
      this._hippoLegs.push({ mesh: leg, baseY: 0.15, phase: i < 2 ? 0 : Math.PI });
    }

    // Rider sitting on top
    const skin = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.7 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.6 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x222244, roughness: 0.7 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 });

    const riderGrp = new THREE.Group();
    riderGrp.position.set(0, 1.1, 0.1);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.35), shirt);
    torso.position.set(0, 0.45, 0);
    riderGrp.add(torso);

    const rHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), skin);
    rHead.position.set(0, 0.85, 0);
    riderGrp.add(rHead);

    const rHair = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.32), hair);
    rHair.position.set(0, 1.03, 0);
    riderGrp.add(rHair);

    this._riderArms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), shirt);
      arm.position.set(side * 0.32, 0.4, -0.05);
      arm.rotation.x = -0.4;
      riderGrp.add(arm);
      this._riderArms.push({ mesh: arm, side, baseX: -0.4 });

      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), skin);
      hand.position.set(side * 0.32, 0.15, -0.2);
      riderGrp.add(hand);
      this._riderArms.push({ mesh: hand, side, isHand: true });
    }

    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.4, 0.17), pants);
      leg.position.set(side * 0.15, 0.05, 0.02);
      leg.rotation.x = 0.2;
      riderGrp.add(leg);
    }

    this._riderGrp = riderGrp;
    g.add(riderGrp);

    // Underglow
    const glow = new THREE.PointLight(0x66ffcc, 0.5, 8);
    glow.position.set(0, 0.1, 0);
    g.add(glow);
    this.pointLight = glow;

    return g;
  }

  _buildSkateboardMesh() {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.7 });
    const flannel = new THREE.MeshStandardMaterial({ color: 0x8b2020, roughness: 0.75 });
    const flannelDark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.75 });
    const tshirt = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
    const jeans = new THREE.MeshStandardMaterial({ color: 0x3a5d8f, roughness: 0.8 });
    const shoe = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.85 });
    const sole = new THREE.MeshStandardMaterial({ color: 0xf0ead6, roughness: 0.6 });
    const lace = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x3b2214, roughness: 0.8 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x2a5a2a, roughness: 0.6 });
    const boardTop = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const boardBottom = new THREE.MeshStandardMaterial({ color: 0xc8a25c, roughness: 0.5 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 });
    const truckMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.6 });

    // ── SKATEBOARD ──
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.06, 2.0),
      [boardBottom, boardBottom, boardTop, boardBottom, boardBottom, boardBottom]
    );
    deck.position.set(0, 0.22, 0);
    g.add(deck);

    for (const z of [-1.0, 1.0]) {
      const kick = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.16), boardBottom);
      kick.position.set(0, 0.27, z);
      kick.rotation.x = z > 0 ? 0.4 : -0.4;
      g.add(kick);
    }

    for (const z of [-0.58, 0.58]) {
      const truck = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.08), truckMat);
      truck.position.set(0, 0.16, z);
      g.add(truck);
      for (const x of [-0.26, 0.26]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.1, z);
        g.add(wheel);
      }
    }

    // ── RIDER — all parts placed directly, no sub-groups for legs ──
    // The rider faces -Z in local space. We rotate the whole group so
    // the rider stands sideways on the board (body perpendicular to travel).
    const rider = new THREE.Group();
    rider.position.set(0, 0.28, 0);
    rider.rotation.y = -1.4;

    // ── FRONT LEG (left) — single tall piece, slight angle toward front of board ──
    const footYaw = 1.0;
    const ftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.28), shoe);
    ftShoe.position.set(0, 0.0, 0.38);
    ftShoe.rotation.y = footYaw;
    rider.add(ftShoe);
    const ftSole = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.03, 0.29), sole);
    ftSole.position.set(0, -0.04, 0.38);
    ftSole.rotation.y = footYaw;
    rider.add(ftSole);

    const ftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.58, 0.14), jeans);
    ftLeg.position.set(0, 0.36, 0.24);
    ftLeg.rotation.x = -0.22;
    rider.add(ftLeg);

    // ── BACK LEG (right) — single tall piece, angled toward back of board ──
    const bkShoe = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.28), shoe);
    bkShoe.position.set(0, 0.0, -0.36);
    bkShoe.rotation.y = footYaw;
    rider.add(bkShoe);
    const bkSole = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.03, 0.29), sole);
    bkSole.position.set(0, -0.04, -0.36);
    bkSole.rotation.y = footYaw;
    rider.add(bkSole);

    const bkLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.58, 0.14), jeans);
    bkLeg.position.set(0, 0.36, -0.20);
    bkLeg.rotation.x = 0.22;
    rider.add(bkLeg);

    this._skateLegs = [ftLeg, bkLeg];

    // ── HIPS + BELT ──
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.30), jeans);
    hips.position.set(0, 0.66, 0.02);
    rider.add(hips);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.035, 0.31), flannelDark);
    belt.position.set(0, 0.72, 0.02);
    rider.add(belt);

    // ── TORSO — black tee with flannel over it ──
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.22), tshirt);
    torso.position.set(0, 0.94, 0.02);
    torso.rotation.x = 0.12;
    rider.add(torso);

    const flannelShell = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.26), flannel);
    flannelShell.position.set(0, 0.94, 0.02);
    flannelShell.rotation.x = 0.12;
    rider.add(flannelShell);

    for (const yOff of [-0.10, 0.02, 0.14]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.025, 0.27), flannelDark);
      stripe.position.set(0, 0.94 + yOff, 0.02);
      stripe.rotation.x = 0.12;
      rider.add(stripe);
    }

    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.06), tshirt);
    collar.position.set(0, 1.13, -0.06);
    rider.add(collar);

    // ── ARMS — out for balance, one forward one back ──
    this._skateArms = [];
    const rUpper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.11), flannel);
    rUpper.position.set(0.25, 0.98, -0.04);
    rUpper.rotation.z = 0.55;
    rUpper.rotation.x = -0.2;
    rider.add(rUpper);
    const rFore = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, 0.10), skin);
    rFore.position.set(0.44, 0.82, -0.10);
    rFore.rotation.z = 0.2;
    rFore.rotation.x = -0.3;
    rider.add(rFore);
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), skin);
    rHand.position.set(0.50, 0.70, -0.14);
    rider.add(rHand);
    this._skateArms.push({ upper: rUpper, forearm: rFore, hand: rHand, side: 1 });

    const lUpper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.11), flannel);
    lUpper.position.set(-0.25, 0.98, 0.06);
    lUpper.rotation.z = -0.55;
    lUpper.rotation.x = 0.15;
    rider.add(lUpper);
    const lFore = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, 0.10), skin);
    lFore.position.set(-0.44, 0.82, 0.12);
    lFore.rotation.z = -0.2;
    lFore.rotation.x = 0.2;
    rider.add(lFore);
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), skin);
    lHand.position.set(-0.50, 0.70, 0.16);
    rider.add(lHand);
    this._skateArms.push({ upper: lUpper, forearm: lFore, hand: lHand, side: -1 });

    // ── HEAD ──
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), skin);
    head.position.set(0, 1.30, -0.02);
    head.rotation.x = 0.06;
    rider.add(head);

    // Hair poking out front under backwards cap
    const hairFront = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.06), hair);
    hairFront.position.set(0, 1.20, -0.13);
    rider.add(hairFront);
    for (const s of [-1, 1]) {
      const sideHair = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.14), hair);
      sideHair.position.set(s * 0.14, 1.21, -0.02);
      rider.add(sideHair);
    }

    // Backwards cap — crown + brim pointing back
    const capCrown = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.09, 0.30), capMat);
    capCrown.position.set(0, 1.47, -0.02);
    rider.add(capCrown);
    const capBand = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.04, 0.30), capMat);
    capBand.position.set(0, 1.42, -0.02);
    rider.add(capBand);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.022, 0.14), capMat);
    brim.position.set(0, 1.41, 0.17);
    brim.rotation.x = 0.15;
    rider.add(brim);

    // Eyes
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const side of [-1, 1]) {
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.030, 6, 4), white);
      eyeW.position.set(side * 0.07, 1.32, -0.13);
      rider.add(eyeW);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), pupilMat);
      pupil.position.set(side * 0.07, 1.32, -0.15);
      rider.add(pupil);
    }

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, 0.015), pupilMat);
    mouth.position.set(0.02, 1.24, -0.13);
    rider.add(mouth);

    this._skateRider = rider;
    g.add(rider);

    this._skateJumping = false;
    this._skateJumpVel = 0;
    this._skateJumpY = 0;

    const glow = new THREE.PointLight(0x0055aa, 0.5, 8);
    glow.position.set(0, 0.05, 0);
    g.add(glow);
    this.pointLight = glow;

    return g;
  }

  skateJump() {
    if (this.carType !== "skateboard" || this._skateJumping) return;
    this._skateJumping = true;
    this._skateJumpVel = 8;
    this._skateJumpY = 0;
  }

  get isAirborne() {
    return this.carType === "skateboard" && this._skateJumping;
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

    const t = performance.now();
    const isHover = this.carType === "delorean";
    const isHippo = this.carType === "hippo";
    const isSkate = this.carType === "skateboard";
    const bob = Math.sin(t * 0.004) * (isHover ? 0.08 : isHippo ? 0.06 : isSkate ? 0.02 : 0.04);
    const hoverLift = isHover ? 0.25 : 0;

    if (isSkate && this._skateJumping) {
      this._skateJumpVel -= 18 * dt;
      this._skateJumpY += this._skateJumpVel * dt;
      if (this._skateJumpY <= 0) {
        this._skateJumpY = 0;
        this._skateJumping = false;
        this._skateJumpVel = 0;
      }
      this.mesh.position.y = CONFIG.PLAYER_Y + bob + this._skateJumpY;
      this.mesh.rotation.x = this._skateJumpY > 0.3 ? Math.sin(t * 0.015) * 0.15 : 0;
    } else {
      this.mesh.position.y = CONFIG.PLAYER_Y + hoverLift + bob;
    }

    this.mesh.rotation.z = THREE.MathUtils.lerp(
      this.mesh.rotation.z,
      -(this.mesh.position.x - tx) * (isHippo ? 0.1 : isSkate ? 0.15 : 0.22),
      0.2
    );
    this.mesh.rotation.y = Math.sin(t * 0.002) * 0.02;

    if (isHippo && this._hippoLegs) {
      const legSpeed = 18;
      for (const leg of this._hippoLegs) {
        const swing = Math.sin(t * 0.001 * legSpeed + leg.phase) * 0.25;
        leg.mesh.position.y = leg.baseY + Math.abs(swing) * 0.3;
        leg.mesh.rotation.x = swing;
      }
    }

    if (isSkate && this._skateRider) {
      const crouch = this._skateJumping ? -0.04 : Math.sin(t * 0.005) * 0.015;
      this._skateRider.position.y = 0.28 + crouch;
      if (this._skateArms) {
        for (const a of this._skateArms) {
          const wave = this._skateJumping
            ? Math.sin(t * 0.012 + a.side * 2) * 0.5
            : Math.sin(t * 0.003 + a.side) * 0.06;
          a.upper.rotation.z = a.side * 0.5 + wave;
        }
      }
    }

    this.mesh.rotation.x = isHover
      ? Math.sin(t * 0.0025) * 0.035 + Math.cos(t * 0.0017) * 0.02
      : 0;

    if (this._smokeParticles) {
      for (const smoke of this._smokeParticles) {
        const pos = smoke.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          pos.array[i * 3] += (Math.random() - 0.5) * 0.02;
          pos.array[i * 3 + 1] += dt * (1.5 + Math.random());
          pos.array[i * 3 + 2] += (Math.random() - 0.5) * 0.02;
          if (pos.array[i * 3 + 1] > 2.5) {
            pos.array[i * 3] = (Math.random() - 0.5) * 0.15;
            pos.array[i * 3 + 1] = 0;
            pos.array[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
          }
        }
        pos.needsUpdate = true;
      }
    }

    if (this.flowGlow && this.flowGlow.material.opacity > 0.01) {
      this.flowGlow.rotation.z += dt * 2.2;
    }
    if (this.shieldRing && this.shieldRing.material.opacity > 0.01) {
      this.shieldRing.rotation.z -= dt * 1.5;
    }
  }

  updateCelebration(dt, elapsed) {
    if (this.carType !== "hippo") return;

    const t = elapsed * 1000;

    const bigBounce = Math.abs(Math.sin(elapsed * 4)) * 0.35;
    this.mesh.position.y = CONFIG.PLAYER_Y + bigBounce;
    this.mesh.rotation.y = Math.sin(elapsed * 2.5) * 0.25;

    if (this._hippoLegs) {
      for (const leg of this._hippoLegs) {
        const stomp = Math.abs(Math.sin(t * 0.012 + leg.phase)) * 0.4;
        leg.mesh.position.y = leg.baseY + stomp * 0.35;
        leg.mesh.rotation.x = Math.sin(t * 0.012 + leg.phase) * 0.35;
      }
    }

    if (this._riderGrp) {
      this._riderGrp.position.y = 1.1 + Math.abs(Math.sin(elapsed * 5)) * 0.15;
      this._riderGrp.rotation.z = Math.sin(elapsed * 3) * 0.12;
    }

    if (this._riderArms) {
      for (const a of this._riderArms) {
        if (a.isHand) {
          a.mesh.position.y = 0.15 + Math.abs(Math.sin(elapsed * 7 + a.side * 2)) * 0.25;
          a.mesh.position.z = -0.2;
        } else {
          a.mesh.rotation.x = -1.8 + Math.sin(elapsed * 7 + a.side * 2) * 0.5;
          a.mesh.rotation.z = a.side * 0.2;
        }
      }
    }
  }

  resetCelebrationPose() {
    if (this.carType !== "hippo") return;

    this.mesh.position.y = CONFIG.PLAYER_Y;
    this.mesh.rotation.y = 0;

    if (this._hippoLegs) {
      for (const leg of this._hippoLegs) {
        leg.mesh.position.y = leg.baseY;
        leg.mesh.rotation.x = 0;
      }
    }

    if (this._riderGrp) {
      this._riderGrp.position.y = 1.1;
      this._riderGrp.rotation.z = 0;
    }

    if (this._riderArms) {
      for (const a of this._riderArms) {
        if (a.isHand) {
          a.mesh.position.y = 0.15;
          a.mesh.position.z = -0.2;
        } else {
          a.mesh.rotation.x = a.baseX;
          a.mesh.rotation.z = 0;
        }
      }
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
