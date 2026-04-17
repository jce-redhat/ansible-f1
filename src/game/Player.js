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
    this._truckExhaust = null;
    this._jetFlame = null;
    this._trexLegs = null;
    this._trexTail = null;
    this._trexJaw = null;
    this._ogreArms = null;
    this._ogreLegs = null;
    this._trainSteam = null;
    this._bikeLegs = null;
    this._bikeRider = null;
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
    if (type === "scaloneta") return this._buildScalonetaMesh();
    if (type === "f16") return this._buildF16Mesh();
    if (type === "trex") return this._buildTrexMesh();
    if (type === "cadillac") return this._buildCadillacMesh();
    if (type === "ogre") return this._buildOgreMesh();
    if (type === "crooner") return this._buildCroonerMesh();
    if (type === "timetrain") return this._buildTimeTrainMesh();
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
    if (type === "f1_maroon") return this._buildF1({
      livery: 0x660000, liveryEmit: 0x1a0000,
      accent: 0xff6600, accentEmit: 0x331100,
      rim: 0xcc5500, glow: 0x882200,
    });
    if (type === "hippo") return this._buildHippoMesh();
    if (type === "skateboard") return this._buildSkateboardMesh();
    if (type === "bicycle") return this._buildBicycleMesh();
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

  _buildScalonetaMesh() {
    const g = new THREE.Group();

    // Materials
    const skyBlue = new THREE.MeshStandardMaterial({
      color: 0x43A1D5, metalness: 0.3, roughness: 0.4,
      emissive: 0x1a3055, emissiveIntensity: 0.2,
    });
    const white = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0, metalness: 0.2, roughness: 0.5,
      emissive: 0x222222, emissiveIntensity: 0.1,
    });
    const cream = new THREE.MeshStandardMaterial({
      color: 0xf5e6c8, metalness: 0.15, roughness: 0.6,
    });
    const chrome = new THREE.MeshStandardMaterial({
      color: 0xccddee, metalness: 0.9, roughness: 0.12,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x1a1a22, metalness: 0.5, roughness: 0.45,
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d, metalness: 0.15, roughness: 0.92,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x88ccff, metalness: 0.5, roughness: 0.15,
      transparent: true, opacity: 0.45,
    });
    const red = new THREE.MeshStandardMaterial({
      color: 0xcc2200, emissive: 0xcc2200, emissiveIntensity: 0.5,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: 0xddaa33, metalness: 0.7, roughness: 0.3,
      emissive: 0x553300, emissiveIntensity: 0.3,
    });
    const sunYellow = new THREE.MeshStandardMaterial({
      color: 0xffd700, metalness: 0.4, roughness: 0.3,
      emissive: 0xaa8800, emissiveIntensity: 0.4,
    });

    // Geometries for reusable elements
    const fW = 0.5; // Flag length
    const fH = 0.12; // Flag stripe height
    const fD = 0.01; // Flag thickness
    const poleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.9, 8);
    const flagGeo = new THREE.BoxGeometry(fD, fH, fW);
    const sunFlagGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.014, 12);

    // Bus body — lower half (sky blue)
    const bodyLower = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.8, 3.6), skyBlue.clone());
    bodyLower.position.set(0, 0.65, 0.3);
    g.add(bodyLower);

    // Bus body — white stripe (middle band)
    const stripeW = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.25, 3.62), white.clone());
    stripeW.position.set(0, 1.15, 0.3);
    g.add(stripeW);

    // Bus body — upper half (sky blue)
    const bodyUpper = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 3.6), skyBlue.clone());
    bodyUpper.position.set(0, 1.5, 0.3);
    g.add(bodyUpper);

    // Roof (cream/off-white)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 3.5), cream.clone());
    roof.position.set(0, 1.81, 0.3);
    g.add(roof);

    // Roof rack / luggage rail
    for (const side of [-0.65, 0.65]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 2.8), chrome.clone());
      rail.position.set(side, 1.93, 0.3);
      g.add(rail);
    }

    // Gold ornamental trim along roofline
    const trimFront = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), gold.clone());
    trimFront.position.set(0, 1.84, -1.48);
    g.add(trimFront);
    const trimBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), gold.clone());
    trimBack.position.set(0, 1.84, 2.08);
    g.add(trimBack);

    // Front face — nose (slightly protruding lower)
    const noseLower = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.2), skyBlue.clone());
    noseLower.position.set(0, 0.55, -1.6);
    g.add(noseLower);
    const noseUpper = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.12), cream.clone());
    noseUpper.position.set(0, 1.0, -1.6);
    g.add(noseUpper);

    // Windshield
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), glass.clone());
    windshield.position.set(0, 1.45, -1.52);
    g.add(windshield);

    // Destination sign above windshield
    const signBg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.06), dark.clone());
    signBg.position.set(0, 1.78, -1.54);
    g.add(signBg);
    const signFace = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 0.02), white.clone());
    signFace.position.set(0, 1.78, -1.56);
    g.add(signFace);

    // Front bumper (chrome, classic style)
    const fBump = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.2), chrome.clone());
    fBump.position.set(0, 0.28, -1.62);
    g.add(fBump);

    // Headlights (round, classic bus)
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    for (const side of [-0.55, 0.55]) {
      const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10), hlMat);
      hl.rotation.x = Math.PI / 2;
      hl.position.set(side, 0.5, -1.68);
      g.add(hl);
      const hlRim = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 10), chrome.clone());
      hlRim.rotation.x = Math.PI / 2;
      hlRim.position.set(side, 0.5, -1.66);
      g.add(hlRim);
    }

    // Grille (red accent, classic front)
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.06), red.clone());
    grille.position.set(0, 0.55, -1.65);
    g.add(grille);

    // Number "10" badge (gold on front)
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.04), gold.clone());
    badge.position.set(-0.25, 0.55, -1.68);
    g.add(badge);

    // --- SIDE WINDOWS AND FLAGS ---
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const zPos = -0.9 + i * 0.6;

        // Glass Window
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.35), glass.clone());
        win.rotation.y = side * Math.PI / 2;
        win.position.set(side * 0.86, 1.45, zPos);
        g.add(win);

        // Add Flags to 1st, 3rd, and 5th windows
        if (i % 2 === 0) {
          const poleGroup = new THREE.Group();

          // Silver pole
          const pole = new THREE.Mesh(poleGeo, chrome.clone());
          pole.position.set(0, 0.45, 0);
          poleGroup.add(pole);

          // The Flag grouping (pivoting from the pole)
          const flagGroup = new THREE.Group();
          flagGroup.position.set(0, 0.75, 0);

          // Top Blue Stripe
          const fTop = new THREE.Mesh(flagGeo, skyBlue.clone());
          fTop.position.set(0, fH, fW / 2);

          // Middle White Stripe
          const fMid = new THREE.Mesh(flagGeo, white.clone());
          fMid.position.set(0, 0, fW / 2);

          // Bottom Blue Stripe
          const fBot = new THREE.Mesh(flagGeo, skyBlue.clone());
          fBot.position.set(0, -fH, fW / 2);

          // Tiny Suns on both sides of the middle stripe
          const sun1 = new THREE.Mesh(sunFlagGeo, sunYellow.clone());
          sun1.rotation.z = Math.PI / 2;
          sun1.position.set(0.005, 0, fW / 2);

          const sun2 = new THREE.Mesh(sunFlagGeo, sunYellow.clone());
          sun2.rotation.z = Math.PI / 2;
          sun2.position.set(-0.005, 0, fW / 2);

          flagGroup.add(fTop, fMid, fBot, sun1, sun2);

          // Randomize wave/flutter for organic feel
          flagGroup.rotation.y = (Math.random() - 0.5) * 0.5; // Left/right flap
          flagGroup.rotation.x = (Math.random() - 0.5) * 0.2; // Up/down flutter

          poleGroup.add(flagGroup);

          // Attach pole bottom to window sill
          poleGroup.position.set(side * 0.86, 1.25, zPos - 0.1);
          // Angle it outward (z) and backward toward rear (x)
          poleGroup.rotation.z = side * -0.7;
          poleGroup.rotation.x = 0.3;

          g.add(poleGroup);
        }
      }
    }

    // Side white vertical stripes (Argentina flag pattern)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.75, 0.15), white.clone());
        stripe.position.set(side * 0.87, 0.65, -0.5 + i * 0.8);
        g.add(stripe);
      }
    }

    // --- ARGENTINA FLAG REAR SECTION ---
    // Rear base panel (sky blue)
    const rearBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 0.08), skyBlue.clone());
    rearBase.position.set(0, 1.0, 2.11);
    g.add(rearBase);

    // Rear white stripe (wider, Argentina flag middle band)
    const stripeHeight = 0.46;
    const rearWhiteStripe = new THREE.Mesh(new THREE.BoxGeometry(1.52, stripeHeight, 0.04), white.clone());
    rearWhiteStripe.position.set(0, 1.0, 2.14);
    g.add(rearWhiteStripe);

    // Sun of May (centered on white stripe)
    const sun = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), sunYellow.clone());
    sun.rotation.x = Math.PI / 2;
    sun.position.set(0, 1.0, 2.17);
    g.add(sun);

    // Three gold championship stars above the flag
    const starGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 5);

    const star1 = new THREE.Mesh(starGeo, gold.clone());
    star1.rotation.x = Math.PI / 2;
    star1.position.set(-0.35, 1.45, 2.16);
    g.add(star1);

    const star2 = new THREE.Mesh(starGeo, gold.clone());
    star2.rotation.x = Math.PI / 2;
    star2.position.set(0, 1.55, 2.16);
    g.add(star2);

    const star3 = new THREE.Mesh(starGeo, gold.clone());
    star3.rotation.x = Math.PI / 2;
    star3.position.set(0.35, 1.45, 2.16);
    g.add(star3);

    // Rear bumper
    const rBump = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.12), chrome.clone());
    rBump.position.set(0, 0.28, 2.16);
    g.add(rBump);

    // Taillights
    for (const side of [-0.55, 0.55]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.06), red.clone());
      tl.position.set(side, 0.5, 2.16);
      g.add(tl);
    }

    // Wheels (2 axles)
    const addAxle = (z) => {
      for (const side of [-1, 1]) {
        const tire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, 0.18, 14), rubber.clone()
        );
        tire.rotation.z = Math.PI / 2;
        tire.position.set(side * 0.88, 0.28, z);
        g.add(tire);
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.04, 8), chrome.clone()
        );
        hub.rotation.z = Math.PI / 2;
        hub.position.set(side * 0.88, 0.28, z);
        g.add(hub);
      }
    };
    addAxle(-1.0);
    addAxle(1.5);

    // Headlight glow
    const glow = new THREE.PointLight(0xffffcc, 0.4, 6);
    glow.position.set(0, 0.5, -1.7);
    g.add(glow);
    this.pointLight = glow;

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    // Cleanup geometries and materials
    skyBlue.dispose(); white.dispose(); cream.dispose(); chrome.dispose();
    dark.dispose(); rubber.dispose(); glass.dispose(); gold.dispose();
    sunYellow.dispose(); hlMat.dispose(); red.dispose(); starGeo.dispose();
    poleGeo.dispose(); flagGeo.dispose(); sunFlagGeo.dispose();

    return g;
  }

  _buildF16Mesh() {
    const g = new THREE.Group();

    const grey = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.7, roughness: 0.3 });
    const darkGrey = new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.6, roughness: 0.4 });
    const cockpitGlass = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.7 });
    const accentRed = new THREE.MeshStandardMaterial({ color: 0xcc2200, metalness: 0.5, roughness: 0.4, emissive: 0x440000 });
    const exhaust = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });

    // Fuselage
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 4.0, 8), grey);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.set(0, 0, 0);
    g.add(fuselage);

    // Nose cone
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 8), grey);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0, -2.6);
    g.add(nose);

    // Nose tip (pitot tube)
    const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), darkGrey);
    pitot.rotation.x = Math.PI / 2;
    pitot.position.set(0, 0, -3.4);
    g.add(pitot);

    // Cockpit canopy
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), cockpitGlass);
    canopy.scale.set(0.8, 0.7, 1.6);
    canopy.position.set(0, 0.3, -0.8);
    g.add(canopy);

    // Cockpit frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.9), darkGrey);
    frame.position.set(0, 0.5, -0.8);
    g.add(frame);

    // Air intake (under fuselage)
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 1.0), darkGrey);
    intake.position.set(0, -0.25, 0.2);
    g.add(intake);

    // Main wings (delta shape)
    for (const side of [-1, 1]) {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(side * 2.2, 0.3);
      wingShape.lineTo(side * 1.6, 1.2);
      wingShape.lineTo(0, 0.8);
      wingShape.closePath();
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: false });
      const wing = new THREE.Mesh(wingGeo, grey);
      wing.rotation.x = -Math.PI / 2;
      wing.position.set(0, -0.05, -0.3);
      g.add(wing);

      // Wingtip missile
      const missile = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.6, 6), accentRed);
      missile.rotation.x = Math.PI / 2;
      missile.position.set(side * 2.1, -0.05, 0.2);
      g.add(missile);
    }

    // Horizontal stabilizers (tail)
    for (const side of [-1, 1]) {
      const stabShape = new THREE.Shape();
      stabShape.moveTo(0, 0);
      stabShape.lineTo(side * 0.9, 0.1);
      stabShape.lineTo(side * 0.6, 0.5);
      stabShape.lineTo(0, 0.35);
      stabShape.closePath();
      const stabGeo = new THREE.ExtrudeGeometry(stabShape, { depth: 0.04, bevelEnabled: false });
      const stab = new THREE.Mesh(stabGeo, grey);
      stab.rotation.x = -Math.PI / 2;
      stab.position.set(0, 0.05, 1.4);
      g.add(stab);
    }

    // Vertical tail fin
    const tailShape = new THREE.Shape();
    tailShape.moveTo(0, 0);
    tailShape.lineTo(0.04, 0);
    tailShape.lineTo(0.04, 1.0);
    tailShape.lineTo(-0.15, 0.6);
    tailShape.closePath();
    const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.04, bevelEnabled: false });
    const tail = new THREE.Mesh(tailGeo, grey);
    tail.position.set(-0.02, 0.25, 1.2);
    g.add(tail);

    // Red tail stripe
    const tailStripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.3), accentRed);
    tailStripe.position.set(0, 1.1, 1.45);
    g.add(tailStripe);

    // Engine exhaust nozzle
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.4, 8), exhaust);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 0, 2.2);
    g.add(nozzle);

    // Afterburner inner glow
    const burnerMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.8 });
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.05, 0.3, 8), burnerMat);
    burner.rotation.x = Math.PI / 2;
    burner.position.set(0, 0, 2.4);
    g.add(burner);
    burnerMat.dispose();

    // Jet flame particle system
    const flameCount = 120;
    const flameGeo = new THREE.BufferGeometry();
    const flamePos = new Float32Array(flameCount * 3);
    for (let i = 0; i < flameCount; i++) {
      flamePos[i * 3] = (Math.random() - 0.5) * 0.2;
      flamePos[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      flamePos[i * 3 + 2] = Math.random() * 2.0;
    }
    flameGeo.setAttribute("position", new THREE.BufferAttribute(flamePos, 3));
    const flameMat = new THREE.PointsMaterial({
      color: 0xff4400,
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flame = new THREE.Points(flameGeo, flameMat);
    flame.position.set(0, 0, 2.5);
    g.add(flame);
    this._jetFlame = flame;

    // Underglow (orange)
    const glow = new THREE.PointLight(0xff6600, 1.0, 8);
    glow.position.set(0, -0.3, 1.5);
    g.add(glow);
    this.pointLight = glow;

    // Headlight
    const headlight = new THREE.PointLight(0xffffff, 0.5, 10);
    headlight.position.set(0, 0, -2.5);
    g.add(headlight);

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

    grey.dispose(); darkGrey.dispose(); cockpitGlass.dispose();
    accentRed.dispose(); exhaust.dispose();

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

    // Exhaust pipe
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8), pipeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(0.55, 0.25, 1.85);
    g.add(pipe);

    // Thick black exhaust smoke
    const smokeCount = 100;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    for (let i = 0; i < smokeCount; i++) {
      smokePos[i * 3] = (Math.random() - 0.5) * 0.25;
      smokePos[i * 3 + 1] = Math.random() * 1.8;
      smokePos[i * 3 + 2] = Math.random() * 1.5;
    }
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0x111111,
      size: 0.35,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const exhaust = new THREE.Points(smokeGeo, smokeMat);
    exhaust.position.set(0.55, 0.25, 1.9);
    g.add(exhaust);
    this._truckExhaust = exhaust;

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

  _buildCroonerMesh() {
    const g = new THREE.Group();

    const bodyCol = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e, metalness: 0.6, roughness: 0.3,
      emissive: 0x080814, emissiveIntensity: 0.2,
    });
    const chrome = new THREE.MeshStandardMaterial({
      color: 0xddddee, metalness: 0.92, roughness: 0.08,
    });
    const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x334466, metalness: 0.3, roughness: 0.15,
      transparent: true, opacity: 0.4,
    });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.92 });
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const suitMat = new THREE.MeshStandardMaterial({
      color: 0x222244, roughness: 0.5, metalness: 0.2,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xddb088, roughness: 0.7 });
    const hatMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, roughness: 0.4, metalness: 0.3,
    });
    const decalMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.7,
    });

    const H = 0.15;

    // Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 3.4), black);
    chassis.position.set(0, 0.12 + H, 0);
    g.add(chassis);

    // Main body — long dark sedan (town car style)
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 3.2), bodyCol);
    body.position.set(0, 0.32 + H, 0);
    g.add(body);

    // Hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.0), bodyCol);
    hood.position.set(0, 0.52 + H, -0.9);
    g.add(hood);

    // Front fascia
    const frontFascia = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 0.06), chrome);
    frontFascia.position.set(0, 0.32 + H, -1.5);
    g.add(frontFascia);

    // Front bumper
    const fBumper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.1), chrome);
    fBumper.position.set(0, 0.2 + H, -1.55);
    g.add(fBumper);

    // Headlights
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), hlMat);
      hl.position.set(side * 0.65, 0.38 + H, -1.54);
      g.add(hl);
    }

    // Grille
    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.04), chrome);
      bar.position.set(-0.35 + i * 0.14, 0.34 + H, -1.53);
      g.add(bar);
    }

    // Cabin / roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.4), bodyCol);
    roof.position.set(0, 0.78 + H, 0);
    g.add(roof);

    // A-pillars
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), bodyCol);
      pillar.position.set(side * 0.72, 0.64 + H, -0.55);
      pillar.rotation.x = -0.2;
      g.add(pillar);
    }

    // Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.32, 0.04), glass);
    windshield.position.set(0, 0.66 + H, -0.55);
    windshield.rotation.x = -0.25;
    g.add(windshield);

    // Side windows with fedora/cigar decal silhouettes
    for (const side of [-1, 1]) {
      const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 1.0), glass);
      sideWin.position.set(side * 0.76, 0.64 + H, 0);
      g.add(sideWin);

      // The famous decal — fedora silhouette on window
      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.35), decalMat);
      brim.position.set(side * 0.78, 0.74 + H, -0.15);
      g.add(brim);
      const crown = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.2), decalMat);
      crown.position.set(side * 0.78, 0.8 + H, -0.15);
      g.add(crown);
      // Cigar decal
      const cigar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.18, 4), decalMat);
      cigar.rotation.x = Math.PI / 2;
      cigar.rotation.z = side * 0.3;
      cigar.position.set(side * 0.78, 0.65 + H, -0.05);
      g.add(cigar);
    }

    // Rear window
    const rearWin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.04), glass);
    rearWin.position.set(0, 0.64 + H, 0.55);
    rearWin.rotation.x = 0.2;
    g.add(rearWin);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.6), bodyCol);
    trunk.position.set(0, 0.5 + H, 1.2);
    g.add(trunk);

    // Rear bumper
    const rBumper = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.08), chrome);
    rBumper.position.set(0, 0.2 + H, 1.55);
    g.add(rBumper);

    // Tail lights
    const tailRed = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    for (const side of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.04), tailRed);
      tail.position.set(side * 0.65, 0.35 + H, 1.56);
      g.add(tail);
    }

    // Side trim
    for (const side of [-1, 1]) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 2.8), chrome);
      trim.position.set(side * 0.86, 0.38 + H, 0);
      g.add(trim);
    }

    // Wheels
    for (const xSign of [-1, 1]) {
      for (const zPos of [-0.95, 0.95]) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 10), rubber);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(xSign * 0.9, 0.2 + H, zPos);
        g.add(tire);
        const hubcap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10), chrome);
        hubcap.rotation.z = Math.PI / 2;
        hubcap.position.set(xSign * 0.97, 0.2 + H, zPos);
        g.add(hubcap);
      }
    }

    // The Driving Crooner figure — visible through the driver window
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), skinMat);
    head.position.set(-0.25, 0.82 + H, -0.15);
    g.add(head);

    // Fedora
    const fedBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 8), hatMat);
    fedBrim.position.set(-0.25, 0.92 + H, -0.15);
    g.add(fedBrim);
    const fedCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 8), hatMat);
    fedCrown.position.set(-0.25, 0.98 + H, -0.15);
    g.add(fedCrown);

    // Suit torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.2), suitMat);
    torso.position.set(-0.25, 0.6 + H, -0.15);
    g.add(torso);

    // Gold underglow
    const glow = new THREE.PointLight(0xffd700, 1.2, 4);
    glow.position.set(0, 0.15, 0);
    g.add(glow);

    g.rotation.y = Math.PI;
    return g;
  }

  _buildTimeTrainMesh() {
    const g = new THREE.Group();

    const iron = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a, metalness: 0.8, roughness: 0.25,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: 0xcc9933, metalness: 0.85, roughness: 0.15,
      emissive: 0x442200, emissiveIntensity: 0.3,
    });
    const copper = new THREE.MeshStandardMaterial({
      color: 0xbb6633, metalness: 0.7, roughness: 0.2,
    });
    const steel = new THREE.MeshStandardMaterial({
      color: 0x556677, metalness: 0.75, roughness: 0.3,
    });
    const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const red = new THREE.MeshStandardMaterial({
      color: 0xaa2211, roughness: 0.5, metalness: 0.3,
      emissive: 0x331100, emissiveIntensity: 0.2,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x664422, roughness: 0.8,
    });
    const glowBlue = new THREE.MeshBasicMaterial({ color: 0x00ccff });
    const glowOrange = new THREE.MeshBasicMaterial({ color: 0xff8800 });
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Locomotive boiler (main cylindrical body)
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.8, 10), iron);
    boiler.rotation.z = Math.PI / 2;
    boiler.rotation.y = Math.PI / 2;
    boiler.position.set(0, 0.7, -0.2);
    g.add(boiler);

    // Boiler bands (brass rings)
    for (let i = 0; i < 5; i++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.025, 6, 12), brass);
      band.rotation.x = Math.PI / 2;
      band.position.set(0, 0.7, -1.2 + i * 0.6);
      g.add(band);
    }

    // Smokebox (front — wider dark section)
    const smokebox = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10), steel);
    smokebox.rotation.z = Math.PI / 2;
    smokebox.rotation.y = Math.PI / 2;
    smokebox.position.set(0, 0.7, -1.5);
    g.add(smokebox);

    // Smokestack
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.55, 8), brass);
    stack.position.set(0, 1.28, -1.3);
    g.add(stack);
    const stackTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.12, 8), brass);
    stackTop.position.set(0, 1.6, -1.3);
    g.add(stackTop);

    // Steam dome (on top of boiler)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), brass);
    dome.scale.y = 0.7;
    dome.position.set(0, 1.15, -0.4);
    g.add(dome);

    // Sand dome
    const sandDome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), copper);
    sandDome.scale.y = 0.7;
    sandDome.position.set(0, 1.15, 0.2);
    g.add(sandDome);

    // Cab (rear engineer cabin)
    const cabBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 1.0), red);
    cabBase.position.set(0, 0.75, 1.1);
    g.add(cabBase);
    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.2), iron);
    cabRoof.position.set(0, 1.25, 1.1);
    g.add(cabRoof);

    // Cab windows
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x334466, transparent: true, opacity: 0.4, metalness: 0.3,
    });
    for (const side of [-1, 1]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.35), winMat);
      win.rotation.y = side * Math.PI / 2;
      win.position.set(side * 0.66, 0.9, 1.1);
      g.add(win);
    }

    // Chassis / frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 3.6), black);
    frame.position.set(0, 0.18, -0.1);
    g.add(frame);

    // Cowcatcher (front)
    const cowShape = new THREE.Shape();
    cowShape.moveTo(-0.5, 0);
    cowShape.lineTo(0, -0.25);
    cowShape.lineTo(0.5, 0);
    const cowGeo = new THREE.ExtrudeGeometry(cowShape, { depth: 0.06, bevelEnabled: false });
    const cowcatcher = new THREE.Mesh(cowGeo, iron);
    cowcatcher.rotation.x = Math.PI / 2;
    cowcatcher.position.set(0, 0.2, -1.95);
    g.add(cowcatcher);

    // Drive wheels (large)
    for (const side of [-1, 1]) {
      for (const zOff of [-0.6, 0.2]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12), iron);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 0.65, 0.28, zOff);
        g.add(wheel);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8), brass);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(side * 0.7, 0.28, zOff);
        g.add(hub);
      }
      // Small front wheels
      const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 10), iron);
      fWheel.rotation.z = Math.PI / 2;
      fWheel.position.set(side * 0.6, 0.18, -1.3);
      g.add(fWheel);
      // Rear cab wheel
      const rWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 10), iron);
      rWheel.rotation.z = Math.PI / 2;
      rWheel.position.set(side * 0.6, 0.2, 1.0);
      g.add(rWheel);
    }

    // Connecting rods (pistons)
    for (const side of [-1, 1]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4), brass);
      rod.rotation.x = Math.PI / 2;
      rod.position.set(side * 0.72, 0.28, -0.2);
      g.add(rod);
    }

    // --- BTTF3 time travel modifications ---

    // Flux capacitor housing (on the smokebox)
    const fluxBox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.06), steel);
    fluxBox.position.set(0, 0.95, -1.72);
    g.add(fluxBox);
    // Y-shaped flux lines
    for (let a = 0; a < 3; a++) {
      const angle = (a * Math.PI * 2) / 3 - Math.PI / 2;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 4), glowBlue);
      tube.position.set(
        Math.cos(angle) * 0.07, 0.95 + Math.sin(angle) * 0.07, -1.74
      );
      tube.rotation.z = angle;
      g.add(tube);
    }

    // Hover conversion — no wheels touch the ground, train floats
    // Glowing hover pads (underneath)
    for (const zOff of [-1.0, 0, 1.0]) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.3), glowBlue);
      pad.position.set(0, 0.06, zOff);
      g.add(pad);
    }

    // Mr. Fusion on the cab roof
    const fusionBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.15, 8), steel);
    fusionBase.position.set(0, 1.35, 1.1);
    g.add(fusionBase);
    const fusionTop = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 0.12, 8), brass);
    fusionTop.position.set(0, 1.48, 1.1);
    g.add(fusionTop);

    // Headlight (front lantern)
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), glowOrange);
    lantern.position.set(0, 1.0, -1.72);
    g.add(lantern);

    // Bell
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6, 0, Math.PI * 2, 0, Math.PI / 2), brass);
    bell.position.set(0.25, 1.25, -0.9);
    g.add(bell);

    // Whistle
    const whistle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15, 5), brass);
    whistle.position.set(-0.2, 1.25, -0.1);
    g.add(whistle);

    // Side railing / running boards
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 2.8), brass);
      rail.position.set(side * 0.62, 0.38, -0.2);
      g.add(rail);
    }

    // Time circuit display on cab side
    for (const side of [-1, 1]) {
      const display = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.5), black);
      display.position.set(side * 0.66, 0.95, 1.1);
      g.add(display);
      // Three LED rows (destination, present, departed)
      const ledColors = [0xff0000, 0x00ff00, 0xffaa00];
      for (let r = 0; r < 3; r++) {
        const led = new THREE.Mesh(
          new THREE.BoxGeometry(0.025, 0.03, 0.4),
          new THREE.MeshBasicMaterial({ color: ledColors[r] })
        );
        led.position.set(side * 0.67, 1.0 - r * 0.05, 1.1);
        g.add(led);
      }
    }

    // Exhaust steam particles
    const steamCount = 30;
    const steamPositions = new Float32Array(steamCount * 3);
    for (let i = 0; i < steamCount; i++) {
      steamPositions[i * 3] = (Math.random() - 0.5) * 0.2;
      steamPositions[i * 3 + 1] = 1.7 + Math.random() * 0.5;
      steamPositions[i * 3 + 2] = -1.3;
    }
    const steamGeo = new THREE.BufferGeometry();
    steamGeo.setAttribute("position", new THREE.BufferAttribute(steamPositions, 3));
    const steamMat = new THREE.PointsMaterial({
      color: 0xcccccc, size: 0.08, transparent: true, opacity: 0.6,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this._trainSteam = new THREE.Points(steamGeo, steamMat);
    g.add(this._trainSteam);

    // Blue time-travel glow underneath
    const glow = new THREE.PointLight(0x00ccff, 1.5, 5);
    glow.position.set(0, 0.1, 0);
    g.add(glow);

    // Warm cab glow
    const cabGlow = new THREE.PointLight(0xff8844, 0.6, 3);
    cabGlow.position.set(0, 0.9, 1.1);
    g.add(cabGlow);

    g.rotation.y = Math.PI;
    return g;
  }

  _buildOgreMesh() {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    inner.rotation.y = Math.PI;
    const skinColor = new THREE.Color(0x5a8a3a);
    const mat = new THREE.MeshStandardMaterial({
      color: skinColor, roughness: 0.65, metalness: 0.05,
      emissive: skinColor.clone().multiplyScalar(0.2), emissiveIntensity: 1,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: skinColor.clone().multiplyScalar(0.6), roughness: 0.8, metalness: 0.05,
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: skinColor.clone().lerp(new THREE.Color(0xaaaa77), 0.3), roughness: 0.7,
    });
    const clothMat = new THREE.MeshStandardMaterial({
      color: 0x5a3a1a, roughness: 0.9,
      emissive: new THREE.Color(0x2a1a08), emissiveIntensity: 0.2,
    });
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xddddbb, roughness: 0.4, metalness: 0.3 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const clubMat = new THREE.MeshStandardMaterial({
      color: 0x6a4a1a, roughness: 0.8,
      emissive: new THREE.Color(0x3a2510), emissiveIntensity: 0.3,
    });
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.3 });
    const footMat = new THREE.MeshStandardMaterial({ color: skinColor.clone().multiplyScalar(0.55), roughness: 0.9 });

    const S = 0.55;

    // Upper body group (hunched forward)
    const upper = new THREE.Group();
    upper.position.set(0, 1.1 * S, 0);
    upper.rotation.x = 0.2;

    // Belly
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.85 * S, 6, 6), bellyMat);
    belly.position.set(0, 0.1 * S, 0.15 * S);
    belly.scale.set(1.0, 0.8, 0.9);
    upper.add(belly);

    // Chest
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.75 * S, 6, 6), mat);
    chest.position.set(0, 0.7 * S, 0);
    chest.scale.set(1.2, 0.9, 0.85);
    upper.add(chest);

    // Shoulder hump
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.7 * S, 5, 5), mat);
    hump.position.set(0, 1.2 * S, -0.15 * S);
    hump.scale.set(1.3, 0.7, 1.0);
    upper.add(hump);

    // Head group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.5 * S, 0.35 * S);

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.6 * S, 6, 6), mat);
    cranium.scale.set(1.1, 0.85, 0.95);
    headGroup.add(cranium);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.9 * S, 0.15 * S, 0.35 * S), darkMat);
    brow.position.set(0, 0.15 * S, 0.35 * S);
    headGroup.add(brow);

    // Eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09 * S, 4, 4), eyeMat);
    eyeL.position.set(0.22 * S, 0.08 * S, 0.5 * S);
    headGroup.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = -0.22 * S;
    headGroup.add(eyeR);

    // Jaw
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.65 * S, 0.25 * S, 0.45 * S), darkMat);
    jaw.position.set(0, -0.25 * S, 0.25 * S);
    headGroup.add(jaw);

    // Tusks
    const tuskL = new THREE.Mesh(new THREE.ConeGeometry(0.07 * S, 0.35 * S, 4), tuskMat);
    tuskL.position.set(0.25 * S, -0.1 * S, 0.45 * S);
    tuskL.rotation.x = -0.5;
    tuskL.rotation.z = -0.2;
    headGroup.add(tuskL);
    const tuskR = tuskL.clone();
    tuskR.position.x = -0.25 * S;
    tuskR.rotation.z = 0.2;
    headGroup.add(tuskR);

    upper.add(headGroup);

    // Right arm (with club)
    const armR = new THREE.Group();
    armR.position.set(0.85 * S, 0.9 * S, 0);
    armR.rotation.z = -0.15;
    const upperArmR = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * S, 0.25 * S, 1.0 * S, 6), mat);
    upperArmR.position.y = -0.5 * S;
    armR.add(upperArmR);
    const forearmR = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * S, 0.22 * S, 0.9 * S, 6), mat);
    forearmR.position.set(0, -1.1 * S, 0.1 * S);
    forearmR.rotation.x = 0.2;
    armR.add(forearmR);
    const fistR = new THREE.Mesh(new THREE.SphereGeometry(0.22 * S, 4, 4), darkMat);
    fistR.position.set(0, -1.6 * S, 0.15 * S);
    armR.add(fistR);
    // Club
    const clubHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * S, 0.08 * S, 1.8 * S, 5), clubMat);
    clubHandle.position.set(0.05 * S, -1.0 * S, 0.25 * S);
    clubHandle.rotation.x = 0.3;
    armR.add(clubHandle);
    const clubKnob = new THREE.Mesh(new THREE.SphereGeometry(0.2 * S, 4, 4), clubMat);
    clubKnob.position.set(0.05 * S, -0.15 * S, 0.5 * S);
    armR.add(clubKnob);
    for (let sp = 0; sp < 3; sp++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04 * S, 0.15 * S, 4), spikeMat);
      spike.position.set(
        0.05 * S + Math.cos(sp * 2.1) * 0.18 * S,
        -0.15 * S,
        0.5 * S + Math.sin(sp * 2.1) * 0.18 * S
      );
      armR.add(spike);
    }
    upper.add(armR);

    // Left arm
    const armL = new THREE.Group();
    armL.position.set(-0.85 * S, 0.9 * S, 0);
    armL.rotation.z = 0.15;
    const upperArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * S, 0.25 * S, 1.0 * S, 6), mat);
    upperArmL.position.y = -0.5 * S;
    armL.add(upperArmL);
    const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * S, 0.22 * S, 0.9 * S, 6), mat);
    forearmL.position.set(0, -1.1 * S, 0.1 * S);
    forearmL.rotation.x = 0.2;
    armL.add(forearmL);
    const fistL = new THREE.Mesh(new THREE.SphereGeometry(0.22 * S, 4, 4), darkMat);
    fistL.position.set(0, -1.6 * S, 0.15 * S);
    armL.add(fistL);
    upper.add(armL);

    inner.add(upper);

    // Belt / loincloth
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * S, 0.5 * S, 0.35 * S, 8), clothMat);
    belt.position.y = 0.95 * S;
    inner.add(belt);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.5 * S, 0.5 * S, 0.08 * S), clothMat);
    flap.position.set(0, 0.65 * S, 0.4 * S);
    inner.add(flap);

    // Legs
    this._ogreLegs = [];
    this._ogreArms = [armL, armR];
    for (const side of [-1, 1]) {
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.3 * S, 0.85 * S, 0);
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * S, 0.32 * S, 0.7 * S, 6), darkMat);
      legMesh.position.y = -0.35 * S;
      legPivot.add(legMesh);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4 * S, 0.12 * S, 0.55 * S), footMat);
      foot.position.set(0, -0.75 * S, 0.12 * S);
      legPivot.add(foot);
      inner.add(legPivot);
      this._ogreLegs.push({ group: legPivot, phase: side * Math.PI });
    }

    // Green underglow
    const glow = new THREE.PointLight(0x55aa33, 1.2, 4);
    glow.position.set(0, 0.2, 0);
    inner.add(glow);

    g.add(inner);
    return g;
  }

  _buildCadillacMesh() {
    const g = new THREE.Group();
    const pink = new THREE.MeshStandardMaterial({
      color: 0xff85a2, metalness: 0.45, roughness: 0.3,
      emissive: 0x330010, emissiveIntensity: 0.2,
    });
    const darkPink = new THREE.MeshStandardMaterial({
      color: 0xcc6080, metalness: 0.5, roughness: 0.35,
      emissive: 0x220008, emissiveIntensity: 0.15,
    });
    const chrome = new THREE.MeshStandardMaterial({
      color: 0xddddee, metalness: 0.92, roughness: 0.08,
    });
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.92 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x88bbdd, metalness: 0.4, roughness: 0.1,
      transparent: true, opacity: 0.35,
    });
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tailRed = new THREE.MeshStandardMaterial({
      color: 0xff2200, emissive: 0xff2200, emissiveIntensity: 0.5,
    });

    const H = 0.15;

    // Chassis / underbody
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 4.0), black);
    chassis.position.set(0, 0.12 + H, 0);
    g.add(chassis);

    // Main body — long, low, wide (classic '59 Cadillac proportions)
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 3.6), pink);
    body.position.set(0, 0.3 + H, 0);
    g.add(body);

    // Hood — long, flat, extends forward
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.4), pink);
    hood.position.set(0, 0.48 + H, -1.0);
    g.add(hood);

    // Hood ornament
    const ornament = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 4), chrome);
    ornament.position.set(0, 0.58 + H, -1.6);
    g.add(ornament);

    // Front fascia
    const frontFascia = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 0.08), chrome);
    frontFascia.position.set(0, 0.3 + H, -1.75);
    g.add(frontFascia);

    // Chrome bumper — front
    const fBumper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.12), chrome);
    fBumper.position.set(0, 0.2 + H, -1.8);
    g.add(fBumper);

    // Grille — wide chrome teeth
    for (let i = 0; i < 8; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.06), chrome);
      bar.position.set(-0.56 + i * 0.16, 0.32 + H, -1.78);
      g.add(bar);
    }

    // Headlights — dual round, chrome housing
    for (const side of [-1, 1]) {
      for (const offset of [0, 0.22]) {
        const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), chrome);
        housing.rotation.x = Math.PI / 2;
        housing.position.set(side * (0.65 + offset), 0.38 + H, -1.78);
        g.add(housing);
        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), hlMat);
        lens.position.set(side * (0.65 + offset), 0.38 + H, -1.82);
        g.add(lens);
      }
    }

    // Side body trim — chrome strip along the length
    for (const side of [-1, 1]) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 3.2), chrome);
      trim.position.set(side * 0.96, 0.38 + H, 0);
      g.add(trim);
    }

    // Rear deck — slightly raised
    const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.8), pink);
    rearDeck.position.set(0, 0.5 + H, 1.2);
    g.add(rearDeck);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.5), pink);
    trunk.position.set(0, 0.46 + H, 1.55);
    g.add(trunk);

    // Iconic tail fins — the signature '59 Cadillac feature
    for (const side of [-1, 1]) {
      // Fin body — tall, sweeping back
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.6), pink);
      fin.position.set(side * 0.88, 0.6 + H, 1.5);
      fin.rotation.x = -0.15;
      g.add(fin);
      // Fin tip — pointed
      const finTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), darkPink);
      finTip.rotation.x = -Math.PI / 2;
      finTip.position.set(side * 0.88, 0.72 + H, 1.8);
      g.add(finTip);
      // Tail light — iconic bullet shape in the fin
      const tailLight = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.12, 8), tailRed);
      tailLight.rotation.x = Math.PI / 2;
      tailLight.position.set(side * 0.88, 0.5 + H, 1.82);
      g.add(tailLight);
    }

    // Rear bumper — chrome
    const rBumper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.1), chrome);
    rBumper.position.set(0, 0.2 + H, 1.85);
    g.add(rBumper);

    // Convertible interior — seats visible (no roof)
    // Front bench seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 0.5), white);
    seat.position.set(0, 0.52 + H, -0.1);
    g.add(seat);
    // Seat back
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.1), white);
    seatBack.position.set(0, 0.62 + H, 0.12);
    g.add(seatBack);

    // Rear seat
    const rSeat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.45), white);
    rSeat.position.set(0, 0.5 + H, 0.6);
    g.add(rSeat);
    const rSeatBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.28, 0.08), white);
    rSeatBack.position.set(0, 0.6 + H, 0.8);
    g.add(rSeatBack);

    // Windshield — wrap-around style
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.4, 0.04), glass);
    windshield.position.set(0, 0.7 + H, -0.45);
    windshield.rotation.x = -0.35;
    g.add(windshield);

    // Windshield frame — chrome
    const wsFrame = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.42, 0.02), chrome);
    wsFrame.position.set(0, 0.7 + H, -0.44);
    wsFrame.rotation.x = -0.35;
    g.add(wsFrame);

    // Dashboard
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.3), black);
    dash.position.set(0, 0.55 + H, -0.35);
    g.add(dash);

    // Steering wheel
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 12), chrome);
    wheel.rotation.x = Math.PI / 4;
    wheel.position.set(-0.3, 0.65 + H, -0.3);
    g.add(wheel);

    // Doors — side panels with contour
    for (const side of [-1, 1]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 1.2), darkPink);
      door.position.set(side * 0.94, 0.42 + H, 0);
      g.add(door);
    }

    // Whitewall tires — classic style
    for (const xSign of [-1, 1]) {
      for (const zPos of [-1.15, 1.15]) {
        // Tire
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), rubber);
        tire.rotation.z = Math.PI / 2;
        tire.position.set(xSign * 1.0, 0.22 + H, zPos);
        g.add(tire);
        // Whitewall band
        const whitewall = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.16, 12), white);
        whitewall.rotation.z = Math.PI / 2;
        whitewall.position.set(xSign * 1.0, 0.22 + H, zPos);
        whitewall.scale.set(0.85, 0.85, 0.85);
        g.add(whitewall);
        // Chrome hubcap
        const hubcap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), chrome);
        hubcap.rotation.z = Math.PI / 2;
        hubcap.position.set(xSign * 1.08, 0.22 + H, zPos);
        g.add(hubcap);
      }
    }

    // Pink underglow
    const glow = new THREE.PointLight(0xff69b4, 1.5, 5);
    glow.position.set(0, 0.15, 0);
    g.add(glow);

    g.rotation.y = Math.PI;
    return g;
  }

  _buildTrexMesh() {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0x3d6b35, roughness: 0.85, metalness: 0.1 });
    const belly = new THREE.MeshStandardMaterial({ color: 0x7a9a50, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a4a22, roughness: 0.8 });
    const white = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x443300, emissiveIntensity: 0.5 });
    const pupil = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xfffff0, roughness: 0.4 });

    // Torso — main body, angled forward
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 1.6, 8), skin);
    torso.rotation.x = Math.PI / 2;
    torso.position.set(0, 1.2, -0.1);
    g.add(torso);

    // Belly plate
    const bellyPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.35, 1.2, 8), belly);
    bellyPlate.rotation.x = Math.PI / 2;
    bellyPlate.position.set(0, 1.0, -0.05);
    g.add(bellyPlate);

    // Neck — tilting forward
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.7, 8), skin);
    neck.rotation.x = 0.4;
    neck.position.set(0, 1.55, -0.7);
    g.add(neck);

    // Head — large, boxy skull
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.8), skin);
    head.position.set(0, 1.85, -1.1);
    g.add(head);

    // Snout — extends forward from head
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.5), skin);
    snout.position.set(0, 1.75, -1.55);
    g.add(snout);

    // Lower jaw — animated
    const jaw = new THREE.Group();
    jaw.position.set(0, 1.6, -1.1);
    const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.7), skin);
    jawMesh.position.set(0, 0, -0.3);
    jaw.add(jawMesh);
    const jawBelly = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.55), belly);
    jawBelly.position.set(0, 0.05, -0.25);
    jaw.add(jawBelly);
    g.add(jaw);
    this._trexJaw = jaw;

    // Teeth — top row
    for (let i = 0; i < 5; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), toothMat);
      tooth.position.set(-0.18 + i * 0.09, 1.6, -1.75 + (i % 2) * 0.04);
      tooth.rotation.x = Math.PI;
      g.add(tooth);
    }
    // Teeth — bottom jaw
    for (let i = 0; i < 4; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), toothMat);
      tooth.position.set(-0.13 + i * 0.09, 0.08, -0.5 + (i % 2) * 0.03);
      jaw.add(tooth);
    }

    // Eyes — menacing, forward-facing
    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
      eyeWhite.position.set(side * 0.3, 2.0, -1.1);
      g.add(eyeWhite);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), pupil);
      p.position.set(side * 0.32, 2.0, -1.18);
      g.add(p);
    }

    // Brow ridges
    for (const side of [-1, 1]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.15), dark);
      brow.position.set(side * 0.25, 2.12, -1.1);
      brow.rotation.z = side * -0.3;
      g.add(brow);
    }

    // Tiny arms (classic T-Rex!)
    for (const side of [-1, 1]) {
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.25, 6), skin);
      upper.rotation.z = side * 0.5;
      upper.position.set(side * 0.45, 1.15, -0.55);
      g.add(upper);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), dark);
      claw.rotation.z = side * 0.8;
      claw.position.set(side * 0.55, 1.0, -0.55);
      g.add(claw);
    }

    // Legs with thighs and shins
    this._trexLegs = [];
    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.35, 0, 0.15);

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.6, 6), skin);
      thigh.position.set(0, 0.7, 0);
      legGroup.add(thigh);

      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.5, 6), skin);
      shin.position.set(0, 0.3, 0.1);
      legGroup.add(shin);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.35), dark);
      foot.position.set(0, 0.04, 0.15);
      legGroup.add(foot);

      // Toe claws
      for (let t = -1; t <= 1; t++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 4), toothMat);
        claw.rotation.x = Math.PI / 2;
        claw.position.set(t * 0.08, 0.04, 0.35);
        legGroup.add(claw);
      }

      g.add(legGroup);
      this._trexLegs.push({ group: legGroup, side, phase: side * Math.PI });
    }

    // Tail — thick at base, tapers
    const tail = new THREE.Group();
    tail.position.set(0, 1.1, 0.6);
    const tailBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.7, 6), skin);
    tailBase.rotation.x = -Math.PI / 2;
    tailBase.position.set(0, 0, 0.3);
    tail.add(tailBase);
    const tailMid = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.7, 6), skin);
    tailMid.rotation.x = -Math.PI / 2;
    tailMid.position.set(0, -0.05, 0.95);
    tail.add(tailMid);
    const tailTip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.04, 0.6, 6), skin);
    tailTip.rotation.x = -Math.PI / 2;
    tailTip.position.set(0, -0.1, 1.5);
    tail.add(tailTip);
    g.add(tail);
    this._trexTail = tail;

    // Dorsal ridges — small spines along the back
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), dark);
      spike.position.set(0, 1.75 - i * 0.08, -0.4 + i * 0.25);
      g.add(spike);
    }

    // Underglow
    const glow = new THREE.PointLight(0x44ff44, 1.2, 4);
    glow.position.set(0, 0.3, 0);
    g.add(glow);

    g.rotation.y = Math.PI;
    return g;
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

    // ── RIDER — stands sideways: left side faces forward (-Z), right side faces camera ──
    // Rider's local -Z = forward (face direction). Rotate so left shoulder leads.
    const rider = new THREE.Group();
    rider.position.set(0, 0.28, 0);
    rider.rotation.y = Math.PI / 2;

    // Rider local +X = board tail (world +Z), local -X = board nose (world -Z).
    // Rider local Z = across board width (world X).
    // Shoes long axis in Z = across the board. Feet placed along X = along the board.

    // Front foot (toward nose, direction of travel)
    const ftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.28), shoe);
    ftShoe.position.set(-0.38, 0.0, 0);
    rider.add(ftShoe);
    const ftSole = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.03, 0.29), sole);
    ftSole.position.set(-0.38, -0.04, 0);
    rider.add(ftSole);

    const ftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.58, 0.14), jeans);
    ftLeg.position.set(-0.24, 0.36, 0);
    ftLeg.rotation.x = 0.22;
    rider.add(ftLeg);

    // Back foot (toward tail)
    const bkShoe = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.28), shoe);
    bkShoe.position.set(0.36, 0.0, 0);
    rider.add(bkShoe);
    const bkSole = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.03, 0.29), sole);
    bkSole.position.set(0.36, -0.04, 0);
    rider.add(bkSole);

    const bkLeg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.58, 0.14), jeans);
    bkLeg.position.set(0.20, 0.36, 0);
    bkLeg.rotation.x = -0.22;
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

  // ── Bicycle (Hicham secret) ──

  _buildBicycleMesh() {
    const g = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0044aa, metalness: 0.7, roughness: 0.3 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.15 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const spokeMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc4956a, roughness: 0.7 });
    const jersey = new THREE.MeshStandardMaterial({ color: 0x0033aa, roughness: 0.6 });
    const jerseyAccent = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const shorts = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x0044aa, roughness: 0.4, metalness: 0.3 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.2, metalness: 0.5 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x330000 });
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    const wheelRadius = 0.45;
    const tubeRadius = 0.035;

    // Wheels
    for (const zOff of [-0.7, 0.7]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius, 0.02, 8, 24), spokeMat);
      rim.rotation.y = Math.PI / 2;
      rim.position.set(0, wheelRadius, zOff);
      g.add(rim);
      const tire = new THREE.Mesh(new THREE.TorusGeometry(wheelRadius, tubeRadius, 8, 24), tireMat);
      tire.rotation.y = Math.PI / 2;
      tire.position.set(0, wheelRadius, zOff);
      g.add(tire);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), chromeMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(0, wheelRadius, zOff);
      g.add(hub);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, wheelRadius - 0.05, 4), spokeMat);
        spoke.position.set(0, wheelRadius, zOff);
        spoke.rotation.y = Math.PI / 2;
        spoke.rotation.z = angle;
        g.add(spoke);
      }
    }

    // Frame - main triangle
    const downTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6), frameMat);
    downTube.position.set(0, 0.55, 0.05);
    downTube.rotation.x = 0.45;
    g.add(downTube);
    const seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 6), frameMat);
    seatTube.position.set(0, 0.70, -0.25);
    seatTube.rotation.x = 0.1;
    g.add(seatTube);
    const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.9, 6), frameMat);
    topTube.position.set(0, 0.95, 0.0);
    topTube.rotation.x = 0.2;
    g.add(topTube);
    // Chain stay
    const chainStay = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), frameMat);
    chainStay.position.set(0, 0.48, -0.32);
    chainStay.rotation.x = 0.15;
    g.add(chainStay);
    // Seat stay
    const seatStay = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 6), frameMat);
    seatStay.position.set(0, 0.72, -0.38);
    seatStay.rotation.x = 0.45;
    g.add(seatStay);

    // Fork
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6), chromeMat);
    fork.position.set(0, 0.62, 0.62);
    fork.rotation.x = -0.2;
    g.add(fork);

    // Handlebars
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 6), chromeMat);
    stem.position.set(0, 1.02, 0.58);
    g.add(stem);
    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), chromeMat);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, 1.10, 0.55);
    g.add(handlebar);
    // Drop bar curves
    for (const s of [-1, 1]) {
      const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 6), chromeMat);
      drop.position.set(s * 0.25, 1.04, 0.58);
      drop.rotation.x = 0.4;
      g.add(drop);
    }

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.22), seatMat);
    seat.position.set(0, 1.06, -0.28);
    g.add(seat);
    const seatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 6), chromeMat);
    seatPost.position.set(0, 0.96, -0.28);
    g.add(seatPost);

    // Pedals + cranks
    const crankMat = chromeMat;
    for (const s of [-1, 1]) {
      const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6), crankMat);
      crank.rotation.z = Math.PI / 2;
      crank.position.set(s * 0.12, 0.42, -0.05);
      g.add(crank);
      const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.06), chromeMat);
      pedal.position.set(s * 0.20, 0.42 + s * 0.06, -0.05);
      g.add(pedal);
    }

    // ── RIDER (sits on seat, leans forward to bars) ──
    const rider = new THREE.Group();
    rider.position.set(0, 0, 0);

    // Hips — anchor point connecting torso to legs
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.18), shorts);
    hips.position.set(0, 0.92, -0.25);
    rider.add(hips);

    // Legs (attached at hips, reach down to pedals)
    this._bikeLegs = [];
    // Right leg
    const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.12), shorts);
    rThigh.position.set(0.12, 0.72, -0.20);
    rThigh.rotation.x = 0.5;
    rider.add(rThigh);
    const rShin = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.30, 0.10), skin);
    rShin.position.set(0.12, 0.48, -0.06);
    rShin.rotation.x = -0.2;
    rider.add(rShin);
    const rFoot = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.16), shoeMat);
    rFoot.position.set(0.18, 0.36, -0.05);
    rider.add(rFoot);
    this._bikeLegs.push({ thigh: rThigh, shin: rShin, foot: rFoot, phase: 0 });

    // Left leg
    const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.12), shorts);
    lThigh.position.set(-0.12, 0.72, -0.20);
    lThigh.rotation.x = -0.2;
    rider.add(lThigh);
    const lShin = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.30, 0.10), skin);
    lShin.position.set(-0.12, 0.48, -0.06);
    lShin.rotation.x = 0.3;
    rider.add(lShin);
    const lFoot = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.16), shoeMat);
    lFoot.position.set(-0.18, 0.36, -0.05);
    rider.add(lFoot);
    this._bikeLegs.push({ thigh: lThigh, shin: lShin, foot: lFoot, phase: Math.PI });

    // Torso (leaning forward from hips toward handlebars)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.38, 0.20), jersey);
    torso.position.set(0, 1.10, -0.08);
    torso.rotation.x = -0.55;
    rider.add(torso);
    // Jersey stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.06, 0.21), jerseyAccent);
    stripe.position.set(0, 1.04, -0.08);
    stripe.rotation.x = -0.55;
    rider.add(stripe);
    // Maple leaf on back (red diamond shape)
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.01), redMat);
    leaf.position.set(0, 1.12, 0.03);
    leaf.rotation.x = -0.55;
    leaf.rotation.z = Math.PI / 4;
    rider.add(leaf);

    // Arms (reaching forward to handlebars)
    for (const s of [-1, 1]) {
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 0.09), jersey);
      upper.position.set(s * 0.20, 1.16, 0.10);
      upper.rotation.x = -1.0;
      rider.add(upper);
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.08), skin);
      forearm.position.set(s * 0.22, 1.08, 0.26);
      forearm.rotation.x = -0.5;
      rider.add(forearm);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), skin);
      hand.position.set(s * 0.22, 1.04, 0.36);
      rider.add(hand);
    }

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), skin);
    head.position.set(0, 1.44, 0.04);
    head.rotation.x = -0.2;
    rider.add(head);

    // Cycling helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), helmetMat);
    helmet.scale.set(1, 0.75, 1.3);
    helmet.position.set(0, 1.56, 0.06);
    rider.add(helmet);
    // Helmet vents
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.12), new THREE.MeshStandardMaterial({ color: 0x001133 }));
      vent.position.set((i - 1) * 0.06, 1.62, 0.06);
      rider.add(vent);
    }

    // Sunglasses
    for (const s of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.03), lensMat);
      lens.position.set(s * 0.06, 1.46, -0.09);
      rider.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.03), chromeMat);
    bridge.position.set(0, 1.46, -0.09);
    rider.add(bridge);

    // Eyes behind glasses
    for (const s of [-1, 1]) {
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), white);
      eyeW.position.set(s * 0.06, 1.45, -0.10);
      rider.add(eyeW);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 4), pupilMat);
      pupil.position.set(s * 0.06, 1.45, -0.12);
      rider.add(pupil);
    }

    g.add(rider);
    this._bikeRider = rider;
    this._bikePedalAngle = 0;

    // Flip entire bike to face -Z (forward direction)
    g.rotation.y = Math.PI;

    const glow = new THREE.PointLight(0x0055ff, 0.5, 8);
    glow.position.set(0, 0.3, 0);
    g.add(glow);
    this.pointLight = glow;

    return g;
  }

  // ── DeLorean Time Travel ──

  initTimeTravel() {
    if (this._ttFireTrails) return;
    const fireMat = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.25,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false,
    });

    const trailCount = 80;
    const trails = [];
    for (const xOff of [-0.85, 0.85]) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(trailCount * 3);
      for (let i = 0; i < trailCount; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 0.15;
        pos[i * 3 + 1] = Math.random() * 0.2;
        pos[i * 3 + 2] = i * 0.12;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, fireMat.clone());
      pts.position.set(xOff, 0.1, 1.0);
      pts.visible = false;
      this.mesh.add(pts);
      trails.push(pts);
    }
    this._ttFireTrails = trails;
    this._ttState = "idle";
    this._ttTimer = 0;
    this._ttSavedSpeed = 1;
    this._ttSpeedMult = 1;
    this._ttCooldown = 0;
    this._ttCooldownMax = 15;
  }

  startTimeTravel() {
    if (this.carType !== "delorean") return false;
    this.initTimeTravel();
    if (this._ttState !== "idle") return false;
    if (this._ttCooldown > 0) return false;
    this._ttState = "accelerating";
    this._ttTimer = 0;
    this._ttSpeedMult = 1;
    this._showFireTrails(true);
    return true;
  }

  get isTimeTraveling() {
    return this._ttState && this._ttState !== "idle";
  }

  get ttCooldownRemaining() {
    return this._ttCooldown || 0;
  }

  get ttCooldownMax() {
    return this._ttCooldownMax || 15;
  }

  get ttReady() {
    return this.carType === "delorean" && (this._ttCooldown || 0) <= 0
      && (!this._ttState || this._ttState === "idle");
  }

  get timeTravelSpeedMult() {
    return this._ttSpeedMult || 1;
  }

  get isTimeTravelInvisible() {
    return this._ttState === "accelerating" || this._ttState === "vanished" || this._ttState === "reappearing";
  }

  _showFireTrails(on) {
    if (!this._ttFireTrails) return;
    for (const t of this._ttFireTrails) t.visible = on;
  }

  updateTimeTravel(dt) {
    if (this._ttCooldown > 0) {
      this._ttCooldown = Math.max(0, this._ttCooldown - dt);
    }
    if (!this._ttState || this._ttState === "idle") return;
    this._ttTimer += dt;
    const t = performance.now();

    if (this._ttState === "accelerating") {
      this._ttSpeedMult = 1 + this._ttTimer * 4;
      if (this._ttFireTrails) {
        for (const trail of this._ttFireTrails) {
          trail.material.opacity = Math.min(0.95, 0.4 + this._ttTimer * 1.5);
          trail.material.color.setHex(
            this._ttTimer > 0.4 ? 0x44ccff : 0xff6600
          );
          const pos = trail.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            pos.array[i * 3] = (Math.random() - 0.5) * 0.2;
            pos.array[i * 3 + 1] = Math.random() * 0.3;
            pos.array[i * 3 + 2] = i * 0.12 + Math.random() * 0.1;
          }
          pos.needsUpdate = true;
        }
      }
      if (this.pointLight) {
        this.pointLight.intensity = 0.5 + this._ttTimer * 3;
        this.pointLight.color.setHex(this._ttTimer > 0.4 ? 0x44ccff : 0xff8800);
      }
      if (this._ttTimer >= 0.7) {
        this._ttState = "vanished";
        this._ttTimer = 0;
        this._ttSpeedMult = 3;
        this.mesh.traverse((o) => {
          if (o.isMesh) {
            o._ttSavedVis = o.visible;
            o.visible = false;
          }
        });
        this._showFireTrails(true);
        if (this._ttFireTrails) {
          for (const trail of this._ttFireTrails) {
            trail.material.opacity = 0.95;
            trail.material.color.setHex(0x44ccff);
            trail.visible = true;
          }
        }
      }
    } else if (this._ttState === "vanished") {
      this._ttSpeedMult = THREE.MathUtils.lerp(3, 1.5, this._ttTimer / 1.5);
      if (this._ttFireTrails) {
        const fade = Math.max(0, 1 - this._ttTimer / 1.5);
        for (const trail of this._ttFireTrails) {
          trail.material.opacity = fade * 0.8;
          const pos = trail.geometry.attributes.position;
          for (let i = 0; i < pos.count; i++) {
            pos.array[i * 3] = (Math.random() - 0.5) * 0.3;
            pos.array[i * 3 + 1] = Math.random() * 0.4;
            pos.array[i * 3 + 2] = i * 0.15 + Math.random() * 0.2;
          }
          pos.needsUpdate = true;
        }
      }
      if (this._ttTimer >= 1.5) {
        this._ttState = "reappearing";
        this._ttTimer = 0;
        this.mesh.traverse((o) => {
          if (o.isMesh && o._ttSavedVis !== undefined) {
            o.visible = o._ttSavedVis;
            delete o._ttSavedVis;
          }
        });
      }
    } else if (this._ttState === "reappearing") {
      this._ttSpeedMult = THREE.MathUtils.lerp(1.5, 1, this._ttTimer / 0.6);
      if (this._ttFireTrails) {
        const fade = Math.max(0, 1 - this._ttTimer / 0.6);
        for (const trail of this._ttFireTrails) {
          trail.material.opacity = fade * 0.6;
          trail.material.color.setHex(0xff6600);
        }
      }
      if (this.pointLight) {
        this.pointLight.intensity = THREE.MathUtils.lerp(2, 0.5, this._ttTimer / 0.6);
        this.pointLight.color.setHex(0xffaa44);
      }
      const flicker = Math.sin(t * 0.05) > 0;
      this.mesh.traverse((o) => {
        if (o.isMesh && !o.isPoints) o.visible = flicker || this._ttTimer > 0.3;
      });
      if (this._ttTimer >= 0.6) {
        this._ttState = "idle";
        this._ttTimer = 0;
        this._ttSpeedMult = 1;
        this._ttCooldown = this._ttCooldownMax;
        this._showFireTrails(false);
        this.mesh.traverse((o) => {
          if (o.isMesh) o.visible = true;
        });
        if (this.pointLight) {
          this.pointLight.intensity = 0.5;
          this.pointLight.color.setHex(0xffaa44);
        }
      }
    }
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
    const isF16 = this.carType === "f16";
    const isTrex = this.carType === "trex";
    const isOgreType = this.carType === "ogre";
    const isTrain = this.carType === "timetrain";
    const bob = Math.sin(t * 0.004) * (isF16 ? 0.1 : isTrex ? 0.03 : isOgreType ? 0.04 : isTrain ? 0.06 : isHover ? 0.08 : isHippo ? 0.06 : isSkate ? 0.02 : 0.04);
    const hoverLift = isF16 ? 2.0 : isTrain ? 0.35 : isHover ? 0.25 : 0;

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
      -(this.mesh.position.x - tx) * (isF16 ? 0.35 : isTrex ? 0.08 : isOgreType ? 0.08 : isHippo ? 0.1 : isSkate ? 0.15 : 0.22),
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

    if (isTrex && this._trexLegs) {
      const stride = 14;
      for (const leg of this._trexLegs) {
        const swing = Math.sin(t * 0.001 * stride + leg.phase) * 0.4;
        leg.group.rotation.x = swing;
        leg.group.position.y = Math.abs(Math.sin(t * 0.001 * stride + leg.phase)) * 0.15;
      }
    }
    if (isTrex && this._trexTail) {
      this._trexTail.rotation.y = Math.sin(t * 0.003) * 0.25;
    }
    if (isTrex && this._trexJaw) {
      this._trexJaw.rotation.x = Math.sin(t * 0.006) * 0.08 + 0.05;
    }

    const isOgre = this.carType === "ogre";
    if (isOgre && this._ogreLegs) {
      const stride = 10;
      for (const leg of this._ogreLegs) {
        const swing = Math.sin(t * 0.001 * stride + leg.phase) * 0.35;
        leg.group.rotation.x = swing;
      }
    }
    if (isOgre && this._ogreArms) {
      const armSwing = Math.sin(t * 0.005) * 0.2;
      this._ogreArms[0].rotation.x = armSwing;
      this._ogreArms[1].rotation.x = -armSwing;
    }

    const isBike = this.carType === "bicycle";
    if (isBike && this._bikeLegs) {
      this._bikePedalAngle = (this._bikePedalAngle || 0) + dt * 8;
      for (const leg of this._bikeLegs) {
        const angle = this._bikePedalAngle + leg.phase;
        leg.thigh.rotation.x = 0.15 + Math.sin(angle) * 0.55;
        leg.shin.rotation.x = 0.05 + Math.cos(angle) * 0.45;
      }
    }

    if (isTrain && this._trainSteam) {
      const pos = this._trainSteam.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.array[i * 3] += (Math.random() - 0.5) * 0.03;
        pos.array[i * 3 + 1] += dt * (1.2 + Math.random() * 0.8);
        pos.array[i * 3 + 2] += (Math.random() - 0.5) * 0.03;
        if (pos.array[i * 3 + 1] > 2.5) {
          pos.array[i * 3] = (Math.random() - 0.5) * 0.2;
          pos.array[i * 3 + 1] = 1.7;
          pos.array[i * 3 + 2] = -1.3;
        }
      }
      pos.needsUpdate = true;
    }

    this.mesh.rotation.x = isF16
      ? Math.sin(t * 0.003) * 0.04 + Math.cos(t * 0.002) * 0.025
      : isTrain
        ? Math.sin(t * 0.002) * 0.03 + Math.cos(t * 0.0015) * 0.018
        : isHover
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

    if (this._truckExhaust) {
      const pos = this._truckExhaust.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.array[i * 3] += (Math.random() - 0.5) * 0.03;
        pos.array[i * 3 + 1] += dt * (0.8 + Math.random() * 0.6);
        pos.array[i * 3 + 2] += dt * (0.5 + Math.random() * 0.4);
        if (pos.array[i * 3 + 1] > 1.8 || pos.array[i * 3 + 2] > 1.5) {
          pos.array[i * 3] = (Math.random() - 0.5) * 0.15;
          pos.array[i * 3 + 1] = Math.random() * 0.1;
          pos.array[i * 3 + 2] = Math.random() * 0.1;
        }
      }
      pos.needsUpdate = true;
    }

    if (this._jetFlame) {
      const pos = this._jetFlame.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.array[i * 3] += (Math.random() - 0.5) * 0.04;
        pos.array[i * 3 + 1] += (Math.random() - 0.5) * 0.04;
        pos.array[i * 3 + 2] += dt * (8 + Math.random() * 4);
        const age = pos.array[i * 3 + 2];
        if (age > 2.5) {
          pos.array[i * 3] = (Math.random() - 0.5) * 0.15;
          pos.array[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
          pos.array[i * 3 + 2] = 0;
        }
      }
      pos.needsUpdate = true;
      this._jetFlame.material.color.setHex(
        Math.random() > 0.5 ? 0xff4400 : 0xff6600
      );
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
