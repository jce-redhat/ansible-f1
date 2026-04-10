import * as THREE from "three";
import { LEVELS } from "../data/config.js";

/**
 * Themed roadway, lane markers, side props, billboards, skyline, horizon, lights.
 * Accepts a level theme key ("A", "B", "C") to configure visuals.
 */
export class Track {
  constructor(scene, levelId = "A") {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.levelId = levelId;
    this.theme = LEVELS[levelId] || LEVELS.A;

    this._curve = this.theme.curve || null;
    this._scrollDist = 0;

    /** @type {Object<string, THREE.Group>} */
    this.billboards = {};

    this._road();
    this._laneMarkers();
    this._sideProps();
    this._billboards();
    this._skyline();
    this._horizon();
    this._lights();
  }

  getCurveX(worldZ) {
    if (!this._curve) return 0;
    return this._curve.amplitude *
      Math.sin((worldZ + this._scrollDist) * this._curve.frequency);
  }

  _road() {
    const t = this.theme;
    const roadMat = new THREE.MeshStandardMaterial({
      color: t.road, metalness: 0.15, roughness: 0.88,
      emissive: t.roadEmissive, emissiveIntensity: 0.12,
    });

    if (this._curve) {
      this._roadSegGroup = new THREE.Group();
      this.group.add(this._roadSegGroup);
      this._roadSegSpacing = 4;
      this._roadSegCount = 100;
      for (let i = 0; i < this._roadSegCount; i++) {
        const seg = new THREE.Mesh(
          new THREE.PlaneGeometry(24, this._roadSegSpacing + 0.6), roadMat
        );
        seg.rotation.x = -Math.PI / 2;
        seg.position.set(0, 0, -200 + i * this._roadSegSpacing);
        seg.receiveShadow = true;
        this._roadSegGroup.add(seg);
      }
    } else {
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 400), roadMat
      );
      road.rotation.x = -Math.PI / 2;
      road.position.y = 0;
      road.receiveShadow = true;
      this.group.add(road);
    }

    this.edgeGroup = new THREE.Group();
    this.group.add(this.edgeGroup);
    this._edgeSpacing = this._curve ? 5 : 20;
    this._edgeCount = this._curve ? 80 : 24;
    const edgeMat = new THREE.MeshStandardMaterial({
      color: t.edge, emissive: t.edgeEmissive, emissiveIntensity: 0.6,
    });
    this._edgeMeshes = [];
    for (let i = 0; i < this._edgeCount; i++) {
      const z = -200 + i * this._edgeSpacing;
      const el = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.08, this._edgeSpacing), edgeMat
      );
      el.position.set(-5.8, 0.05, z);
      el.userData.baseX = -5.8;
      this.edgeGroup.add(el);
      const er = el.clone();
      er.position.x = 5.8;
      er.userData.baseX = 5.8;
      this.edgeGroup.add(er);
      this._edgeMeshes.push(el, er);
    }

    // Ground planes on each side of the road
    if (t.scenery !== "city" && t.scenery !== "durham") {
      const groundMat = new THREE.MeshStandardMaterial({
        color: t.side, emissive: t.sideEmissive,
        emissiveIntensity: 0.15, roughness: 0.95,
      });
      const gw = this._curve ? 100 : 80;
      const groundL = new THREE.Mesh(new THREE.PlaneGeometry(gw, 400), groundMat);
      groundL.rotation.x = -Math.PI / 2;
      groundL.position.set(-51, -0.02, 0);
      this.group.add(groundL);
      const groundR = new THREE.Mesh(new THREE.PlaneGeometry(gw, 400), groundMat.clone());
      groundR.rotation.x = -Math.PI / 2;
      groundR.position.set(51, -0.02, 0);
      this.group.add(groundR);
    }
  }

  _laneMarkers() {
    this.markerGroup = new THREE.Group();
    this.group.add(this.markerGroup);

    const mat = new THREE.MeshBasicMaterial({
      color: this.theme.laneMarker,
      transparent: true, opacity: 0.85,
    });
    this._markerSpacing = this._curve ? 4 : 8;
    this._markerCount = this._curve ? 100 : 40;
    this._markerMeshes = [];
    for (let i = 0; i < this._markerCount; i++) {
      const z = -200 + i * this._markerSpacing;
      for (const x of [-1.6, 1.6]) {
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.02, this._markerSpacing * 0.4), mat
        );
        m.position.set(x, 0.03, z);
        m.userData.baseX = x;
        this.markerGroup.add(m);
        this._markerMeshes.push(m);
      }
    }
  }

  _sideProps() {
    this.propsGroup = new THREE.Group();
    this.group.add(this.propsGroup);
    this._propSpacing = 14;
    this._propCount = 28;
    this._propSlots = [];

    const s = this.theme.scenery;
    if (s === "city" || s === "durham") this._cityProps();
    else if (s === "forest") this._forestProps();
    else if (s === "desert") this._desertProps();
    else if (s === "swamp") this._swampProps();
    else if (s === "snow") this._snowProps();
    else if (s === "water") this._waterProps();
    else if (s === "coast") this._coastProps();

    // Total wrap range for props
    this._propTotalRange = this._propSpacing * this._propCount;
  }

  _cityProps() {
    const rackMat = new THREE.MeshStandardMaterial({
      color: 0x3d4658, metalness: 0.42, roughness: 0.52,
      emissive: 0x0c1830, emissiveIntensity: 0.55,
    });
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x4a5068, metalness: 0.35, roughness: 0.55,
      emissive: 0x1a1038, emissiveIntensity: 0.4,
    });
    for (let i = 0; i < this._propCount; i++) {
      const z = -200 + i * this._propSpacing;
      const rack = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 3 + Math.random() * 1.5, 1.5), rackMat
      );
      rack.position.set(-8.5, 1.5, z);
      this.propsGroup.add(rack);
      const rack2 = rack.clone();
      rack2.position.x = 8.5;
      this.propsGroup.add(rack2);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 5, 6), poleMat
      );
      pole.position.set(-11, 2.5, z + 4);
      this.propsGroup.add(pole);
      const pole2 = pole.clone();
      pole2.position.x = 11;
      this.propsGroup.add(pole2);
    }
  }

  _forestProps() {
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a1a, roughness: 0.9, metalness: 0.05,
    });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x2d6b30, roughness: 0.8, metalness: 0.05,
      emissive: 0x0a2a0a, emissiveIntensity: 0.2,
    });
    for (let i = 0; i < this._propCount; i++) {
      const z = -200 + i * this._propSpacing;
      const slot = new THREE.Group();
      slot.position.z = z;
      this.propsGroup.add(slot);
      this._propSlots.push(slot);

      for (const side of [-1, 1]) {
        const x = side * (8 + Math.random() * 5);
        const trunkH = 3 + Math.random() * 2;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.35, trunkH, 6), trunkMat
        );
        trunk.position.set(x, trunkH / 2, Math.random() * 4);
        slot.add(trunk);

        const crownR = 1.2 + Math.random() * 1;
        const crown = new THREE.Mesh(
          new THREE.SphereGeometry(crownR, 6, 5), leafMat
        );
        crown.position.set(x, trunkH + crownR * 0.5, trunk.position.z);
        slot.add(crown);

        if (Math.random() < 0.4) {
          const x2 = side * (14 + Math.random() * 4);
          const h2 = 2 + Math.random() * 3;
          const t2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.3, h2, 6), trunkMat
          );
          t2.position.set(x2, h2 / 2, 3);
          slot.add(t2);
          const c2 = new THREE.Mesh(
            new THREE.SphereGeometry(1 + Math.random() * 0.8, 6, 5), leafMat
          );
          c2.position.set(x2, h2 + 0.5, 3);
          slot.add(c2);
        }
      }
    }
  }

  _desertProps() {
    const cactusMat = new THREE.MeshStandardMaterial({
      color: 0x3a7a3a, roughness: 0.85, metalness: 0.05,
      emissive: 0x0a200a, emissiveIntensity: 0.15,
    });
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xb09060, roughness: 0.92, metalness: 0.05,
    });
    for (let i = 0; i < this._propCount; i++) {
      const z = -200 + i * this._propSpacing;
      const slot = new THREE.Group();
      slot.position.z = z;
      this.propsGroup.add(slot);
      this._propSlots.push(slot);

      for (const side of [-1, 1]) {
        const x = side * (8 + Math.random() * 6);
        if (Math.random() < 0.6) {
          const h = 2 + Math.random() * 3;
          const cactus = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.3, h, 8), cactusMat
          );
          cactus.position.set(x, h / 2, Math.random() * 3);
          slot.add(cactus);
          if (h > 3) {
            const armH = 1 + Math.random();
            const arm = new THREE.Mesh(
              new THREE.CylinderGeometry(0.12, 0.15, armH, 6), cactusMat
            );
            arm.position.set(x + side * 0.5, h * 0.6, cactus.position.z);
            arm.rotation.z = side * -0.8;
            slot.add(arm);
          }
        } else {
          const rw = 0.8 + Math.random() * 1.5;
          const rh = 0.5 + Math.random() * 1;
          const rock = new THREE.Mesh(
            new THREE.DodecahedronGeometry(rw, 0), rockMat
          );
          rock.position.set(x, rh * 0.3, Math.random() * 3);
          rock.scale.set(1, rh / rw, 1);
          slot.add(rock);
        }
      }
    }
  }

  _swampProps() {
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a, roughness: 0.95, metalness: 0.05,
    });
    const mossLeafMat = new THREE.MeshStandardMaterial({
      color: 0x3a6630, roughness: 0.85, metalness: 0.05,
      emissive: 0x0a1a0a, emissiveIntensity: 0.15,
    });
    const lillyMat = new THREE.MeshStandardMaterial({
      color: 0x2a5530, roughness: 0.9, metalness: 0.05,
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2a4a30, roughness: 0.6, metalness: 0.2,
      transparent: true, opacity: 0.5,
    });
    for (let i = 0; i < this._propCount; i++) {
      const z = -200 + i * this._propSpacing;
      const slot = new THREE.Group();
      slot.position.z = z;
      this.propsGroup.add(slot);
      this._propSlots.push(slot);

      for (const side of [-1, 1]) {
        const x = side * (8 + Math.random() * 5);
        const trunkH = 2.5 + Math.random() * 2;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.3, trunkH, 6), trunkMat
        );
        trunk.position.set(x, trunkH / 2, Math.random() * 3);
        trunk.rotation.z = (Math.random() - 0.5) * 0.3;
        slot.add(trunk);

        const crownR = 1.5 + Math.random() * 1;
        const crown = new THREE.Mesh(
          new THREE.SphereGeometry(crownR, 6, 5), mossLeafMat
        );
        crown.position.set(x, trunkH + crownR * 0.3, trunk.position.z);
        slot.add(crown);

        // hanging moss
        for (let m = 0; m < 3; m++) {
          const vine = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.8 + Math.random() * 0.6, 4),
            mossLeafMat
          );
          vine.position.set(
            x + (Math.random() - 0.5) * crownR,
            trunkH - 0.2 - Math.random() * 0.4,
            trunk.position.z + (Math.random() - 0.5) * crownR
          );
          slot.add(vine);
        }

        // water puddles
        if (Math.random() < 0.5) {
          const puddle = new THREE.Mesh(
            new THREE.CylinderGeometry(1 + Math.random(), 1 + Math.random(), 0.05, 8), waterMat
          );
          puddle.position.set(side * (12 + Math.random() * 4), 0.02, Math.random() * 4);
          slot.add(puddle);
          // lilly pad
          const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.04, 8), lillyMat
          );
          pad.position.set(puddle.position.x + 0.5, 0.05, puddle.position.z);
          slot.add(pad);
        }
      }
    }
  }

  _snowProps() {
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a3a2a, roughness: 0.9, metalness: 0.05,
    });
    const pineMat = new THREE.MeshStandardMaterial({
      color: 0x1a4a2a, roughness: 0.85, metalness: 0.05,
      emissive: 0x0a1a08, emissiveIntensity: 0.15,
    });
    const snowCapMat = new THREE.MeshStandardMaterial({
      color: 0xeef4ff, roughness: 0.6, metalness: 0.1,
      emissive: 0x445566, emissiveIntensity: 0.1,
    });
    const snowPileMat = new THREE.MeshStandardMaterial({
      color: 0xdde8f0, roughness: 0.7, metalness: 0.05,
    });
    for (let i = 0; i < this._propCount; i++) {
      const z = -200 + i * this._propSpacing;
      const slot = new THREE.Group();
      slot.position.z = z;
      this.propsGroup.add(slot);
      this._propSlots.push(slot);

      for (const side of [-1, 1]) {
        const x = side * (8 + Math.random() * 5);
        const treeH = 3 + Math.random() * 3;

        // pine tree: trunk + stacked cones
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.25, treeH * 0.4, 6), trunkMat
        );
        trunk.position.set(x, treeH * 0.2, Math.random() * 3);
        slot.add(trunk);

        for (let tier = 0; tier < 3; tier++) {
          const coneR = (1.6 - tier * 0.4) + Math.random() * 0.3;
          const coneH = treeH * 0.35;
          const cone = new THREE.Mesh(
            new THREE.ConeGeometry(coneR, coneH, 6), pineMat
          );
          cone.position.set(x, treeH * 0.3 + tier * coneH * 0.5, trunk.position.z);
          slot.add(cone);
        }

        // snow cap on top
        const cap = new THREE.Mesh(
          new THREE.ConeGeometry(0.5, 0.6, 6), snowCapMat
        );
        cap.position.set(x, treeH * 0.3 + 1.5 * (treeH * 0.35) * 0.5 + 0.3, trunk.position.z);
        slot.add(cap);

        // snow piles
        if (Math.random() < 0.4) {
          const pile = new THREE.Mesh(
            new THREE.SphereGeometry(0.6 + Math.random() * 0.5, 6, 4), snowPileMat
          );
          pile.position.set(side * (13 + Math.random() * 3), 0.2, Math.random() * 4);
          pile.scale.y = 0.4;
          slot.add(pile);
        }
      }
    }
  }

  _waterProps() {
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x8a6a3a, roughness: 0.9, metalness: 0.05,
    });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x2a8a3a, roughness: 0.75, metalness: 0.05,
      emissive: 0x0a2a0a, emissiveIntensity: 0.15,
    });
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xd4c090, roughness: 0.92, metalness: 0.05,
    });
    for (let i = 0; i < this._propCount; i++) {
      const z = -200 + i * this._propSpacing;
      const slot = new THREE.Group();
      slot.position.z = z;
      this.propsGroup.add(slot);
      this._propSlots.push(slot);

      for (const side of [-1, 1]) {
        const x = side * (8 + Math.random() * 5);
        const trunkH = 4 + Math.random() * 3;

        // curved palm trunk (slightly leaning)
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.25, trunkH, 6), trunkMat
        );
        trunk.position.set(x, trunkH / 2, Math.random() * 3);
        trunk.rotation.z = side * (0.1 + Math.random() * 0.15);
        trunk.rotation.x = (Math.random() - 0.5) * 0.1;
        slot.add(trunk);

        // palm fronds (elongated flat leaves radiating from top)
        const topX = x + side * trunkH * Math.sin(trunk.rotation.z) * 0.3;
        const topY = trunkH * 0.95;
        for (let f = 0; f < 6; f++) {
          const angle = (f / 6) * Math.PI * 2;
          const frondLen = 1.5 + Math.random() * 1;
          const frond = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.06, frondLen), leafMat
          );
          frond.position.set(
            topX + Math.cos(angle) * frondLen * 0.4,
            topY - 0.2 - Math.abs(Math.cos(angle)) * 0.5,
            trunk.position.z + Math.sin(angle) * frondLen * 0.4
          );
          frond.rotation.y = angle;
          frond.rotation.x = 0.4 + Math.random() * 0.3;
          slot.add(frond);
        }

        // sand patch at base
        if (Math.random() < 0.5) {
          const sand = new THREE.Mesh(
            new THREE.CylinderGeometry(0.8 + Math.random() * 0.5, 1 + Math.random() * 0.5, 0.06, 8),
            sandMat
          );
          sand.position.set(x, 0.02, trunk.position.z);
          slot.add(sand);
        }

        // extra palm in back row
        if (Math.random() < 0.35) {
          const x2 = side * (14 + Math.random() * 4);
          const h2 = 3 + Math.random() * 2;
          const t2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.2, h2, 6), trunkMat
          );
          t2.position.set(x2, h2 / 2, 2);
          t2.rotation.z = side * 0.12;
          slot.add(t2);
          for (let f = 0; f < 5; f++) {
            const angle = (f / 5) * Math.PI * 2;
            const frond = new THREE.Mesh(
              new THREE.BoxGeometry(0.3, 0.05, 1.2), leafMat
            );
            frond.position.set(
              x2 + Math.cos(angle) * 0.5,
              h2 - 0.3,
              2 + Math.sin(angle) * 0.5
            );
            frond.rotation.y = angle;
            frond.rotation.x = 0.5;
            slot.add(frond);
          }
        }
      }
    }
  }

  _coastProps() {
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0x8a7a60, roughness: 0.95, metalness: 0.05, flatShading: true,
    });
    const cliffDarkMat = new THREE.MeshStandardMaterial({
      color: 0x6a5a45, roughness: 0.95, metalness: 0.05, flatShading: true,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa, roughness: 0.6, metalness: 0.5,
    });
    const shrubMat = new THREE.MeshStandardMaterial({
      color: 0x5a8a4a, roughness: 0.85, metalness: 0.05,
    });
    const dirtMat = new THREE.MeshStandardMaterial({
      color: 0x9a7a50, roughness: 0.92, metalness: 0.05,
    });
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x6a9a4a, roughness: 0.88, metalness: 0.05, flatShading: true,
    });

    for (let i = 0; i < this._propCount; i++) {
      const z = -200 + i * this._propSpacing;
      const slot = new THREE.Group();
      slot.position.z = z;
      this.propsGroup.add(slot);
      this._propSlots.push(slot);

      // left: cliff face dropping down (visible wall below road level)
      const cliffH = 6 + Math.random() * 3;
      const cliff = new THREE.Mesh(
        new THREE.BoxGeometry(12, cliffH, this._propSpacing + 0.5),
        Math.random() < 0.5 ? cliffMat : cliffDarkMat
      );
      cliff.position.set(-13, -cliffH / 2 + 0.1, 0);
      slot.add(cliff);

      // rocky ledge along cliff top
      if (Math.random() < 0.7) {
        const ledge = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.6, 0), cliffMat
        );
        ledge.position.set(-7.5 - Math.random() * 2, 0.15, Math.random() * 6 - 3);
        ledge.scale.set(1.5, 0.4, 1);
        slot.add(ledge);
      }

      // guardrail on cliff edge
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.7, this._propSpacing), railMat
      );
      rail.position.set(-7.2, 0.35, 0);
      slot.add(rail);
      for (let p = 0; p < 4; p++) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), railMat
        );
        post.position.set(-7.2, 0.4, -5 + p * 3.5);
        slot.add(post);
      }

      // right: hillside rising up with dirt, shrubs, and slope
      const slopeH = 3 + Math.random() * 4;
      const slope = new THREE.Mesh(
        new THREE.BoxGeometry(14, slopeH, this._propSpacing + 0.5), hillMat
      );
      slope.position.set(16, slopeH / 2 - 0.5, 0);
      slot.add(slope);

      // dirt shoulder
      const dirt = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.15, this._propSpacing), dirtMat
      );
      dirt.position.set(8, 0.02, 0);
      slot.add(dirt);

      // shrubs on hillside
      for (let s = 0; s < 2; s++) {
        if (Math.random() < 0.6) {
          const shrub = new THREE.Mesh(
            new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 6, 5), shrubMat
          );
          shrub.position.set(10 + Math.random() * 6, 0.4 + Math.random() * slopeH * 0.3, Math.random() * 6 - 3);
          shrub.scale.y = 0.7;
          slot.add(shrub);
        }
      }
    }
  }

  _billboards() {
    const defs = this.theme.billboards.map((b, i) => ({
      ...b,
      x: i === 0 ? -18 : i === 1 ? 18 : 36,
      z: -65,
    }));

    const boardW = 8, boardH = 5;
    const poleH = 5;

    for (const def of defs) {
      const g = new THREE.Group();
      g.userData.billboardId = def.id;

      const poleMat = new THREE.MeshStandardMaterial({
        color: 0x4a5a78, metalness: 0.6, roughness: 0.4,
      });
      for (const side of [-1, 1]) {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.14, poleH, 8), poleMat
        );
        pole.position.set(side * (boardW / 2 - 0.4), poleH / 2, 0);
        g.add(pole);
      }

      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x2a3550, metalness: 0.3, roughness: 0.5,
      });
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(boardW + 0.3, boardH + 0.3, 0.15), frameMat
      );
      frame.position.y = poleH + boardH / 2;
      g.add(frame);

      const screenMat = new THREE.MeshStandardMaterial({
        color: 0x101824, metalness: 0.05, roughness: 0.92,
        emissive: 0x0a1020, emissiveIntensity: 0.3,
      });
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(boardW, boardH, 0.18), screenMat
      );
      screen.position.y = poleH + boardH / 2;
      screen.position.z = 0.08;
      g.add(screen);

      const accentMat = new THREE.MeshStandardMaterial({
        color: def.accent, emissive: def.accent, emissiveIntensity: 0.6,
        metalness: 0.1, roughness: 0.4,
      });
      const stripTop = new THREE.Mesh(
        new THREE.BoxGeometry(boardW + 0.1, 0.12, 0.2), accentMat
      );
      stripTop.position.set(0, poleH + boardH + 0.08, 0.1);
      g.add(stripTop);
      const stripBot = new THREE.Mesh(
        new THREE.BoxGeometry(boardW + 0.1, 0.12, 0.2), accentMat
      );
      stripBot.position.set(0, poleH - 0.08, 0.1);
      g.add(stripBot);

      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 320;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#0d1420";
      ctx.fillRect(0, 0, 512, 320);

      const accentHex = "#" + def.accent.toString(16).padStart(6, "0");
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, 480, 288);

      ctx.font = "bold 24px 'Courier New', monospace";
      ctx.fillStyle = accentHex;
      ctx.textAlign = "center";
      ctx.fillText("SIDE QUEST", 256, 60);

      ctx.font = "bold 48px 'Courier New', monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(def.label.toUpperCase(), 256, 140);

      ctx.font = "20px 'Courier New', monospace";
      ctx.fillStyle = "rgba(200,220,255,0.5)";
      ctx.fillText("[ Click to explore ]", 256, 200);

      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = "rgba(200,220,255,0.2)";
      ctx.lineWidth = 2;
      ctx.strokeRect(120, 230, 272, 60);
      ctx.font = "16px 'Courier New', monospace";
      ctx.fillStyle = "rgba(200,220,255,0.3)";
      ctx.fillText("Demo content placeholder", 256, 268);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const labelMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(boardW * 0.92, boardH * 0.92), labelMat
      );
      label.position.y = poleH + boardH / 2;
      label.position.z = 0.18;
      g.add(label);

      const spotL = new THREE.SpotLight(0xffffff, 2, 14, Math.PI / 5, 0.5, 1);
      spotL.position.set(-boardW / 3, poleH + boardH + 1.5, 3);
      spotL.target.position.set(0, poleH + boardH / 2, 0);
      g.add(spotL); g.add(spotL.target);

      const spotR = new THREE.SpotLight(0xffffff, 2, 14, Math.PI / 5, 0.5, 1);
      spotR.position.set(boardW / 3, poleH + boardH + 1.5, 3);
      spotR.target.position.set(0, poleH + boardH / 2, 0);
      g.add(spotR); g.add(spotR.target);

      const glow = new THREE.PointLight(def.accent, 0.5, 12);
      glow.position.set(0, poleH + boardH / 2, 3);
      g.add(glow);

      g.position.set(def.x, 0, def.z);
      if (def.x < 0) g.rotation.y = -0.25;
      else g.rotation.y = 0.25;

      this.billboards[def.id] = g;
      this.group.add(g);
    }
  }

  getBillboardMeshes() {
    const meshes = [];
    for (const id of Object.keys(this.billboards)) {
      this.billboards[id].traverse((c) => {
        if (c.isMesh) {
          c.userData._billboardId = id;
          meshes.push(c);
        }
      });
    }
    return meshes;
  }

  _skyline() {
    const skylineGroup = new THREE.Group();
    skylineGroup.position.set(0, 0, -120);
    this.group.add(skylineGroup);

    const s = this.theme.scenery;
    if (s === "city") this._citySkyline(skylineGroup);
    else if (s === "durham") this._durhamSkyline(skylineGroup);
    else if (s === "forest") this._mountainSkyline(skylineGroup, 0x3a5a4a, 0x4a6a5a, 0x556b55, 0xeeffee);
    else if (s === "desert") this._mountainSkyline(skylineGroup, 0xa08050, 0xb89060, 0xc49868, 0xffe8c0);
    else if (s === "swamp") this._swampSkyline(skylineGroup);
    else if (s === "snow") this._snowMountainSkyline(skylineGroup);
    else if (s === "water") this._waterSkyline(skylineGroup);
    else if (s === "coast") this._coastSkyline(skylineGroup);
  }

  _citySkyline(skylineGroup) {
    const bldgMat = (color, emissive = 0x000000) =>
      new THREE.MeshStandardMaterial({
        color, emissive, emissiveIntensity: 0.7,
        metalness: 0.1, roughness: 0.85, flatShading: true,
      });

    const buildings = [
      { x: -50, w: 10, h: 15, d: 8, color: 0x2a3048 },
      { x: -38, w: 8, h: 20, d: 7, color: 0x343a55 },
      { x: -26, w: 12, h: 12, d: 9, color: 0x282e44 },
      { x: -15, w: 7, h: 18, d: 6, color: 0x303650 },
      { x: -5, w: 9, h: 14, d: 7, color: 0x2c3248 },
      { x: 5, w: 8, h: 10, d: 6, color: 0x262c40 },
      { x: 38, w: 11, h: 11, d: 8, color: 0x282e44 },
      { x: 48, w: 7, h: 19, d: 6, color: 0x343a55 },
      { x: 58, w: 10, h: 14, d: 8, color: 0x2a3048 },
    ];

    for (const b of buildings) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, b.h, b.d), bldgMat(b.color, 0x141830)
      );
      mesh.position.set(b.x, b.h / 2, 0);
      skylineGroup.add(mesh);

      const winMat = new THREE.MeshBasicMaterial({
        color: 0x5588bb, transparent: true, opacity: 0.8,
      });
      const rows = Math.floor(b.h / 2.5);
      const cols = Math.floor(b.w / 2.2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() < 0.35) continue;
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), winMat);
          win.position.set(
            b.x - (b.w / 2) + 1.2 + c * 2.2,
            1.5 + r * 2.5,
            b.d / 2 + 0.05
          );
          skylineGroup.add(win);
        }
      }
    }

    // Red Hat HQ
    const rhqW = 14, rhqH = 26, rhqD = 10, rhqX = 22;
    const towerMat = bldgMat(0x7a8a9a, 0x1a2535);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(rhqW, rhqH, rhqD), towerMat);
    tower.position.set(rhqX, rhqH / 2, 0);
    skylineGroup.add(tower);

    const rhWinMat = new THREE.MeshBasicMaterial({
      color: 0x88aacc, transparent: true, opacity: 0.75,
    });
    const rhRows = Math.floor(rhqH / 2.2);
    const rhCols = Math.floor(rhqW / 1.8);
    for (let r = 0; r < rhRows; r++) {
      for (let c = 0; c < rhCols; c++) {
        if (Math.random() < 0.2) continue;
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), rhWinMat);
        win.position.set(
          rhqX - (rhqW / 2) + 1 + c * 1.8,
          1.8 + r * 2.2,
          rhqD / 2 + 0.06
        );
        skylineGroup.add(win);
      }
    }

    const signW = rhqW * 0.85, signH = 3.5;
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xcc0000, emissive: 0xcc0000, emissiveIntensity: 0.8,
      metalness: 0.05, roughness: 0.5,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(signW, signH, 0.3), signMat);
    sign.position.set(rhqX, rhqH - 1.2, rhqD / 2 + 0.2);
    skylineGroup.add(sign);

    const textMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pixelSize = 0.38;
    const letters = {
      R: [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],[0,3],[2,3],[0,4]],
      E: [[0,0],[1,0],[2,0],[0,1],[0,2],[1,2],[0,3],[0,4],[1,4],[2,4]],
      D: [[0,0],[1,0],[0,1],[2,1],[0,2],[2,2],[0,3],[2,3],[0,4],[1,4]],
      H: [[0,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],[0,3],[2,3],[0,4],[2,4]],
      A: [[1,0],[0,1],[2,1],[0,2],[1,2],[2,2],[0,3],[2,3],[0,4],[2,4]],
      T: [[0,0],[1,0],[2,0],[1,1],[1,2],[1,3],[1,4]],
    };
    const word = "REDHAT";
    const totalW = word.length * 3.5 * pixelSize;
    let cursorX = rhqX - totalW / 2;
    for (const ch of word) {
      if (ch === " ") { cursorX += 1.5 * pixelSize; continue; }
      const dots = letters[ch];
      if (!dots) { cursorX += 3.5 * pixelSize; continue; }
      for (const [dx, dy] of dots) {
        const px = new THREE.Mesh(
          new THREE.BoxGeometry(pixelSize * 0.85, pixelSize * 0.85, 0.15), textMat
        );
        px.position.set(cursorX + dx * pixelSize, rhqH - 0.2 - dy * pixelSize, rhqD / 2 + 0.4);
        skylineGroup.add(px);
      }
      cursorX += 3.5 * pixelSize;
    }

    const hatMat = new THREE.MeshStandardMaterial({
      color: 0xcc0000, emissive: 0xaa0000, emissiveIntensity: 0.6,
      metalness: 0.05, roughness: 0.5, flatShading: true,
    });
    const brim = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 2), hatMat);
    brim.position.set(rhqX, rhqH + 1.8, rhqD / 2 - 0.5);
    skylineGroup.add(brim);
    const crown = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.2, 1.8), hatMat);
    crown.position.set(rhqX - 0.3, rhqH + 3.2, rhqD / 2 - 0.5);
    skylineGroup.add(crown);
    const dent = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.5, 1.6),
      bldgMat(0x990000, 0x660000)
    );
    dent.position.set(rhqX - 0.3, rhqH + 4.3, rhqD / 2 - 0.5);
    skylineGroup.add(dent);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.4), hatMat);
    tip.position.set(rhqX + 1.8, rhqH + 3.0, rhqD / 2 - 0.5);
    skylineGroup.add(tip);
  }

  _mountainSkyline(skylineGroup, baseColor, midColor, peakColor, snowColor) {
    const baseMat = new THREE.MeshStandardMaterial({
      color: baseColor, roughness: 0.9, metalness: 0.05, flatShading: true,
    });
    const midMat = new THREE.MeshStandardMaterial({
      color: midColor, roughness: 0.9, metalness: 0.05, flatShading: true,
    });
    const peakMat = new THREE.MeshStandardMaterial({
      color: peakColor, roughness: 0.85, metalness: 0.05, flatShading: true,
    });
    const snowMat = new THREE.MeshStandardMaterial({
      color: snowColor, roughness: 0.7, metalness: 0.1, flatShading: true,
    });

    const mountains = [
      { x: -55, h: 30, r: 16 },
      { x: -35, h: 42, r: 20 },
      { x: -18, h: 25, r: 14 },
      { x: -2,  h: 38, r: 18 },
      { x: 18,  h: 45, r: 22 },
      { x: 38,  h: 32, r: 16 },
      { x: 55,  h: 28, r: 15 },
      { x: 70,  h: 36, r: 19 },
    ];

    for (const m of mountains) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(m.r, m.h, 6), baseMat
      );
      cone.position.set(m.x, m.h / 2, 0);
      skylineGroup.add(cone);

      // Mid section
      const mid = new THREE.Mesh(
        new THREE.ConeGeometry(m.r * 0.6, m.h * 0.55, 5), midMat
      );
      mid.position.set(m.x, m.h * 0.45, 0);
      skylineGroup.add(mid);

      // Snow cap on taller peaks
      if (m.h > 30) {
        const snow = new THREE.Mesh(
          new THREE.ConeGeometry(m.r * 0.25, m.h * 0.18, 5), snowMat
        );
        snow.position.set(m.x, m.h * 0.82, 0);
        skylineGroup.add(snow);
      }
    }
  }

  _snowMountainSkyline(skylineGroup) {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x6a7a8a, roughness: 0.9, metalness: 0.05, flatShading: true,
    });
    const midMat = new THREE.MeshStandardMaterial({
      color: 0x8090a0, roughness: 0.85, metalness: 0.05, flatShading: true,
    });
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xeef4ff, roughness: 0.6, metalness: 0.1, flatShading: true,
    });
    const snowBrightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.5, metalness: 0.15,
      emissive: 0x667788, emissiveIntensity: 0.15,
    });

    const peaks = [
      { x: -60, h: 28, w: 22 },
      { x: -35, h: 40, w: 28 },
      { x: -12, h: 32, w: 24 },
      { x: 10,  h: 45, w: 30 },
      { x: 35,  h: 36, w: 26 },
      { x: 58,  h: 30, w: 22 },
      { x: 78,  h: 38, w: 28 },
    ];

    for (const p of peaks) {
      // Wide base using a squashed sphere for a rounded mountain shape
      const base = new THREE.Mesh(
        new THREE.SphereGeometry(p.w / 2, 7, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        rockMat
      );
      base.scale.set(1, p.h / (p.w / 2), 1);
      base.position.set(p.x, 0, 0);
      skylineGroup.add(base);

      // Mid-section ridge
      const mid = new THREE.Mesh(
        new THREE.SphereGeometry(p.w * 0.35, 6, 5, 0, Math.PI * 2, 0, Math.PI / 2),
        midMat
      );
      mid.scale.set(1, (p.h * 0.7) / (p.w * 0.35), 1);
      mid.position.set(p.x, 0, 0);
      skylineGroup.add(mid);

      // Snow cap covering upper portion
      const capR = p.w * 0.3;
      const capH = p.h * 0.35;
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(capR, 6, 5, 0, Math.PI * 2, 0, Math.PI / 2),
        p.h > 35 ? snowBrightMat : snowMat
      );
      cap.scale.set(1.2, capH / capR, 1.2);
      cap.position.set(p.x, p.h * 0.55, 0);
      skylineGroup.add(cap);

      // Extra bright peak on tallest mountains
      if (p.h > 35) {
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(capR * 0.4, 5, 4, 0, Math.PI * 2, 0, Math.PI / 2),
          snowBrightMat
        );
        tip.scale.set(1, capH * 0.6 / (capR * 0.4), 1);
        tip.position.set(p.x, p.h * 0.75, 0);
        skylineGroup.add(tip);
      }
    }

    // Cloud wisps around peaks
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xdde8f0, transparent: true, opacity: 0.35,
      roughness: 0.95, metalness: 0.0,
    });
    for (let c = 0; c < 5; c++) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(4 + Math.random() * 4, 6, 5), cloudMat
      );
      cloud.position.set(-45 + c * 25, 20 + Math.random() * 12, 2);
      cloud.scale.set(2.5, 0.4, 1);
      skylineGroup.add(cloud);
    }
  }

  _swampSkyline(skylineGroup) {
    const treeMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a18, roughness: 0.9, metalness: 0.05, flatShading: true,
    });
    const mistMat = new THREE.MeshStandardMaterial({
      color: 0x4a5a3a, transparent: true, opacity: 0.35,
      roughness: 0.95, metalness: 0.0,
    });
    // dead tree silhouettes
    const positions = [-55, -38, -22, -8, 8, 25, 40, 55, 68];
    for (const x of positions) {
      const h = 12 + Math.random() * 18;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.8, h, 5), treeMat
      );
      trunk.position.set(x, h / 2, 0);
      trunk.rotation.z = (Math.random() - 0.5) * 0.15;
      skylineGroup.add(trunk);

      // bare branches
      for (let b = 0; b < 3; b++) {
        const bLen = 3 + Math.random() * 4;
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.2, bLen, 4), treeMat
        );
        branch.position.set(x + (Math.random() - 0.5) * 2, h * (0.5 + b * 0.15), 0);
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        skylineGroup.add(branch);
      }
    }
    // mist layer
    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 15), mistMat
    );
    mist.position.set(0, 6, 5);
    skylineGroup.add(mist);
  }

  _waterSkyline(skylineGroup) {
    const waveMat = new THREE.MeshStandardMaterial({
      color: 0x2266aa, roughness: 0.5, metalness: 0.2, flatShading: true,
      transparent: true, opacity: 0.7,
    });
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xccddee, roughness: 0.9, metalness: 0.0, flatShading: true,
      transparent: true, opacity: 0.6,
    });
    // rolling ocean waves
    for (let w = 0; w < 6; w++) {
      const waveW = 60 + Math.random() * 40;
      const waveH = 3 + Math.random() * 4;
      const wave = new THREE.Mesh(
        new THREE.CylinderGeometry(waveW / 2, waveW / 2, waveH, 8, 1, false, 0, Math.PI),
        waveMat
      );
      wave.rotation.z = Math.PI / 2;
      wave.rotation.y = Math.PI / 2;
      wave.position.set(-40 + w * 25, waveH * 0.3, -w * 5);
      wave.scale.set(1, 0.3, 1);
      skylineGroup.add(wave);
    }
    // clouds
    for (let c = 0; c < 5; c++) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(6 + Math.random() * 5, 6, 5), cloudMat
      );
      cloud.position.set(-50 + c * 28, 25 + Math.random() * 10, -5);
      cloud.scale.set(2, 0.6, 1);
      skylineGroup.add(cloud);
    }
  }

  _coastSkyline(skylineGroup) {
    // Ocean far below the cliff on the left — flat plane at negative Y
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x1477aa, roughness: 0.3, metalness: 0.3, flatShading: true,
    });
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200), oceanMat
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(-70, -8, -60);
    skylineGroup.add(ocean);

    // Deeper ocean layer for depth
    const deepMat = new THREE.MeshStandardMaterial({
      color: 0x0a5588, roughness: 0.4, metalness: 0.25,
    });
    const deep = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 80), deepMat
    );
    deep.position.set(-70, -2, -140);
    skylineGroup.add(deep);

    // Foam/surf at base of cliff
    const foamMat = new THREE.MeshStandardMaterial({
      color: 0xcceeFF, roughness: 0.7, metalness: 0.0,
      transparent: true, opacity: 0.6,
    });
    for (let f = 0; f < 6; f++) {
      const foam = new THREE.Mesh(
        new THREE.BoxGeometry(8 + Math.random() * 12, 0.2, 1.5), foamMat
      );
      foam.position.set(-22 - Math.random() * 30, -7.5, -20 + f * -14);
      foam.rotation.y = (Math.random() - 0.5) * 0.15;
      skylineGroup.add(foam);
    }

    // Distant cliff face on far left (visible rocky wall)
    const farCliffMat = new THREE.MeshStandardMaterial({
      color: 0x7a6a50, roughness: 0.95, metalness: 0.05, flatShading: true,
    });
    const farCliff = new THREE.Mesh(
      new THREE.BoxGeometry(30, 25, 80), farCliffMat
    );
    farCliff.position.set(-55, 2, -50);
    skylineGroup.add(farCliff);

    // Green vegetation on top of far cliff
    const vegMat = new THREE.MeshStandardMaterial({
      color: 0x5a8a3a, roughness: 0.85, metalness: 0.05, flatShading: true,
    });
    const veg = new THREE.Mesh(
      new THREE.BoxGeometry(32, 3, 82), vegMat
    );
    veg.position.set(-55, 15, -50);
    skylineGroup.add(veg);

    // Right: green coastal mountains rising behind the hill
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x4a7a3a, roughness: 0.9, metalness: 0.05, flatShading: true,
    });
    const hillPositions = [
      { x: 30, h: 30, r: 18 },
      { x: 50, h: 40, r: 24 },
      { x: 70, h: 32, r: 20 },
      { x: 88, h: 25, r: 16 },
    ];
    for (const hp of hillPositions) {
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(hp.r, hp.h, 6), hillMat
      );
      hill.position.set(hp.x, hp.h / 2, 0);
      skylineGroup.add(hill);
    }

    // Clouds
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xeef5ff, roughness: 0.9, metalness: 0.0, flatShading: true,
      transparent: true, opacity: 0.5,
    });
    for (let c = 0; c < 5; c++) {
      const cloud = new THREE.Mesh(
        new THREE.SphereGeometry(5 + Math.random() * 5, 6, 5), cloudMat
      );
      cloud.position.set(-40 + c * 28, 32 + Math.random() * 10, -5);
      cloud.scale.set(2.5, 0.5, 1);
      skylineGroup.add(cloud);
    }
  }

  _durhamSkyline(skylineGroup) {
    const bldgMat = (color, emissive = 0x000000) =>
      new THREE.MeshStandardMaterial({
        color, emissive, emissiveIntensity: 0.7,
        metalness: 0.1, roughness: 0.85, flatShading: true,
      });

    const buildings = [
      { x: -50, w: 9, h: 13, d: 7, color: 0x2a3048 },
      { x: -38, w: 7, h: 16, d: 6, color: 0x343a55 },
      { x: -26, w: 10, h: 10, d: 8, color: 0x282e44 },
      { x: -14, w: 6, h: 14, d: 5, color: 0x303650 },
      { x: 38, w: 9, h: 12, d: 7, color: 0x282e44 },
      { x: 50, w: 7, h: 15, d: 6, color: 0x343a55 },
      { x: 62, w: 10, h: 11, d: 7, color: 0x2a3048 },
    ];

    const winMat = new THREE.MeshBasicMaterial({
      color: 0x5588bb, transparent: true, opacity: 0.8,
    });

    for (const b of buildings) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, b.h, b.d), bldgMat(b.color, 0x141830)
      );
      mesh.position.set(b.x, b.h / 2, 0);
      skylineGroup.add(mesh);

      const rows = Math.floor(b.h / 2.5);
      const cols = Math.floor(b.w / 2.2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() < 0.35) continue;
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), winMat);
          win.position.set(
            b.x - (b.w / 2) + 1.2 + c * 2.2,
            1.5 + r * 2.5,
            b.d / 2 + 0.05
          );
          skylineGroup.add(win);
        }
      }
    }

    // --- Ansible Tower (main skyscraper with Ansible "A" on top) ---
    const towerX = 5, towerW = 12, towerH = 30, towerD = 9;
    const towerMat = bldgMat(0x4a5a6a, 0x1a2535);
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(towerW, towerH, towerD), towerMat
    );
    tower.position.set(towerX, towerH / 2, 0);
    skylineGroup.add(tower);

    const tRows = Math.floor(towerH / 2.2);
    const tCols = Math.floor(towerW / 1.8);
    for (let r = 0; r < tRows; r++) {
      for (let c = 0; c < tCols; c++) {
        if (Math.random() < 0.2) continue;
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), winMat);
        win.position.set(
          towerX - (towerW / 2) + 1 + c * 1.8,
          1.8 + r * 2.2,
          towerD / 2 + 0.06
        );
        skylineGroup.add(win);
      }
    }

    // Ansible "A" logo on top
    const aMat = new THREE.MeshStandardMaterial({
      color: 0xee1100, emissive: 0xee1100, emissiveIntensity: 0.9,
      metalness: 0.05, roughness: 0.5,
    });
    const pixelSize = 0.5;
    const ansibleA = [
      [2,0],[1,1],[3,1],[0,2],[4,2],[0,3],[1,3],[2,3],[3,3],[4,3],[0,4],[4,4],[0,5],[4,5]
    ];
    const aW = 5 * pixelSize;
    for (const [dx, dy] of ansibleA) {
      const px = new THREE.Mesh(
        new THREE.BoxGeometry(pixelSize * 0.85, pixelSize * 0.85, 0.15), aMat
      );
      px.position.set(
        towerX - aW / 2 + dx * pixelSize + pixelSize / 2,
        towerH + 1.5 - dy * pixelSize,
        towerD / 2 + 0.2
      );
      skylineGroup.add(px);
    }

    // --- Durham Water Tower (Lucky Strike style) ---
    const wtX = -5, wtBaseH = 14, wtTankR = 3.2, wtTankH = 5;
    const wtPoleMat = bldgMat(0x7a7a7a, 0x2a2a2a);
    const topR = 1.6;
    const botR = 4.8;
    const legPositions = [
      [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];
    for (const [lx, lz] of legPositions) {
      const topX = wtX + lx * topR;
      const topZ = lz * topR;
      const botX = wtX + lx * botR;
      const botZ = lz * botR;
      const dx = botX - topX;
      const dz = botZ - topZ;
      const legLen = Math.sqrt(dx * dx + dz * dz + wtBaseH * wtBaseH);
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.5, legLen, 6), wtPoleMat
      );
      leg.position.set((topX + botX) / 2, wtBaseH / 2, (topZ + botZ) / 2);
      const angleZ = -Math.atan2(dx, wtBaseH);
      const angleX = Math.atan2(dz, wtBaseH);
      leg.rotation.set(angleX, 0, angleZ);
      skylineGroup.add(leg);
    }

    const braceMat = bldgMat(0x666666, 0x1a1a1a);
    for (const braceFrac of [0.3, 0.6]) {
      const r = topR + (botR - topR) * (1 - braceFrac);
      const y = wtBaseH * braceFrac;
      for (let i = 0; i < 4; i++) {
        const a1 = (Math.PI / 4) + (i * Math.PI / 2);
        const a2 = a1 + Math.PI / 2;
        const x1 = wtX + Math.cos(a1) * r;
        const z1 = Math.sin(a1) * r;
        const x2 = wtX + Math.cos(a2) * r;
        const z2 = Math.sin(a2) * r;
        const bx = (x1 + x2) / 2;
        const bz = (z1 + z2) / 2;
        const bLen = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
        const brace = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, bLen, 4), braceMat
        );
        brace.position.set(bx, y, bz);
        brace.rotation.y = Math.atan2(z2 - z1, x2 - x1);
        brace.rotation.z = Math.PI / 2;
        skylineGroup.add(brace);
      }
    }

    const tankMat = bldgMat(0xccccbb, 0x222211);
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(wtTankR, wtTankR, wtTankH, 16), tankMat
    );
    tank.position.set(wtX, wtBaseH + wtTankH / 2, 0);
    skylineGroup.add(tank);

    const bowlGeo = new THREE.CylinderGeometry(wtTankR, topR + 0.2, 2, 16);
    const bowl = new THREE.Mesh(bowlGeo, tankMat);
    bowl.position.set(wtX, wtBaseH - 0.5, 0);
    skylineGroup.add(bowl);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(wtTankR + 0.3, 2.5, 16), tankMat
    );
    roof.position.set(wtX, wtBaseH + wtTankH + 1.25, 0);
    skylineGroup.add(roof);

    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xcc2200, emissive: 0xcc2200, emissiveIntensity: 0.5,
      metalness: 0.1, roughness: 0.5,
    });
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(wtTankR + 0.08, wtTankR + 0.08, 1.4, 16), stripeMat
    );
    stripe.position.set(wtX, wtBaseH + wtTankH / 2 + 0.5, 0);
    skylineGroup.add(stripe);

    // --- Smokestack ---
    const ssX = 22, ssH = 22;
    const ssMat = bldgMat(0x884422, 0x331100);
    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.8, ssH, 8), ssMat
    );
    stack.position.set(ssX, ssH / 2, 0);
    skylineGroup.add(stack);
    // top rim
    const rimMat = bldgMat(0x553311, 0x221100);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.3, 6, 12), rimMat
    );
    rim.position.set(ssX, ssH, 0);
    rim.rotation.x = Math.PI / 2;
    skylineGroup.add(rim);
    // smoke puffs
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0x888888, transparent: true, opacity: 0.3,
      roughness: 0.95, metalness: 0.0,
    });
    for (let p = 0; p < 4; p++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(1 + Math.random() * 1.5, 6, 5), smokeMat
      );
      puff.position.set(ssX + (Math.random() - 0.5) * 2, ssH + 2 + p * 2, 0);
      puff.scale.set(1.5, 0.8, 1);
      skylineGroup.add(puff);
    }

    // --- Baseball Stadium (Durham Bulls style) ---
    const stadX = -30, stadW = 18, stadH = 8, stadD = 12;
    const stadMat = bldgMat(0x3a4858, 0x141830);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(stadW, stadH, stadD), stadMat
    );
    base.position.set(stadX, stadH / 2, 0);
    skylineGroup.add(base);
    // curved seating (half-cylinder)
    const seatMat = bldgMat(0x2a3a48, 0x0a1020);
    const seats = new THREE.Mesh(
      new THREE.CylinderGeometry(stadW / 2, stadW / 2, stadD, 12, 1, false, 0, Math.PI),
      seatMat
    );
    seats.rotation.z = Math.PI / 2;
    seats.rotation.y = Math.PI / 2;
    seats.position.set(stadX, stadH + 1, 0);
    seats.scale.set(1, 0.4, 1);
    skylineGroup.add(seats);
    // light towers at stadium
    const lightPoleMat = bldgMat(0x5a5a5a, 0x111111);
    for (const dx of [-stadW / 2 - 1, stadW / 2 + 1]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, stadH + 6, 6), lightPoleMat
      );
      pole.position.set(stadX + dx, (stadH + 6) / 2, stadD / 2 + 1);
      skylineGroup.add(pole);
      // light fixture
      const lightMat = new THREE.MeshStandardMaterial({
        color: 0xffee88, emissive: 0xffee88, emissiveIntensity: 0.8,
      });
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.5, 0.5), lightMat
      );
      light.position.set(stadX + dx, stadH + 6, stadD / 2 + 1);
      skylineGroup.add(light);
    }
    // "BULLS" sign
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x0044aa, emissive: 0x0044aa, emissiveIntensity: 0.6,
    });
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(8, 2, 0.3), signMat
    );
    sign.position.set(stadX, stadH + 0.5, stadD / 2 + 0.2);
    skylineGroup.add(sign);
  }

  _horizon() {
    const t = this.theme;
    const isCity = t.scenery === "city" || t.scenery === "durham";

    const gridColors = {
      city: [0x336688, 0x1a2840], durham: [0x336688, 0x1a2840],
      forest: [0x447744, 0x2a4a2a], desert: [0x998855, 0x665530],
      swamp: [0x3a5530, 0x1a2a14], snow: [0x7788aa, 0x445566],
      water: [0x2255aa, 0x0a1840], coast: [0x557755, 0x2a3a2a],
    };
    const [gc1, gc2] = gridColors[t.scenery] || [0x888888, 0x444444];
    const grid = new THREE.GridHelper(400, 80, gc1, gc2);
    grid.position.y = 0.01;
    grid.position.z = -120;
    grid.scale.set(1.2, 1, 1.5);
    this.group.add(grid);

    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 200),
      new THREE.MeshBasicMaterial({
        color: t.sky, transparent: true, opacity: 0.95,
      })
    );
    sky.position.set(0, 80, -200);
    this.group.add(sky);
  }

  _lights() {
    const isCity = this.theme.scenery === "city" || this.theme.scenery === "durham";

    const amb = new THREE.AmbientLight(
      isCity ? 0xb8c8e0 : 0xdde8f0,
      isCity ? 0.72 : 0.9
    );
    this.group.add(amb);

    const hemi = new THREE.HemisphereLight(
      isCity ? 0x8899bb : 0xaabbcc,
      isCity ? 0x1a1520 : 0x443322,
      isCity ? 0.55 : 0.65
    );
    hemi.position.set(0, 80, 0);
    this.group.add(hemi);

    const key = new THREE.DirectionalLight(
      isCity ? 0xd8e8ff : 0xfff8e8,
      isCity ? 0.95 : 1.1
    );
    key.position.set(-6, 32, 28);
    this.group.add(key);

    const rim = new THREE.DirectionalLight(
      isCity ? 0xaaccff : 0xddccaa,
      isCity ? 0.45 : 0.55
    );
    rim.position.set(0, 14, 42);
    this.group.add(rim);

    if (isCity) {
      const fillL = new THREE.PointLight(0x55ddff, 1.15, 55, 1.8);
      fillL.position.set(-10, 4.5, 8);
      this.group.add(fillL);
      const fillR = new THREE.PointLight(0xcc77ff, 0.95, 55, 1.8);
      fillR.position.set(10, 4.5, 8);
      this.group.add(fillR);
      const accent = new THREE.PointLight(0xff66aa, 0.55, 90, 2);
      accent.position.set(0, 9, -25);
      this.group.add(accent);
    } else {
      const sun = new THREE.DirectionalLight(0xffeedd, 0.6);
      sun.position.set(30, 60, -50);
      this.group.add(sun);
    }
  }

  update(dt, worldSpeed) {
    const dz = worldSpeed * dt;

    if (this._curve) {
      this._scrollDist += worldSpeed * dt;
    }

    // Road segments (curved levels only)
    if (this._roadSegGroup) {
      this._roadSegGroup.position.z += dz;
      if (this._roadSegGroup.position.z > this._roadSegSpacing) {
        this._roadSegGroup.position.z -= this._roadSegSpacing;
      }
      for (const seg of this._roadSegGroup.children) {
        const wz = this._roadSegGroup.position.z + seg.position.z;
        seg.position.x = this.getCurveX(wz);
      }
    }

    if (this.markerGroup) {
      this.markerGroup.position.z += dz;
      if (this.markerGroup.position.z > this._markerSpacing) {
        this.markerGroup.position.z -= this._markerSpacing;
      }
    }

    // Apply curve offsets to lane markers
    if (this._curve && this._markerMeshes) {
      const gz = this.markerGroup.position.z;
      for (const m of this._markerMeshes) {
        const wz = gz + m.position.z;
        m.position.x = m.userData.baseX + this.getCurveX(wz);
      }
    }

    if (this.edgeGroup) {
      this.edgeGroup.position.z += dz;
      if (this.edgeGroup.position.z > this._edgeSpacing) {
        this.edgeGroup.position.z -= this._edgeSpacing;
      }
    }

    // Apply curve offsets to edge strips
    if (this._curve && this._edgeMeshes) {
      const gz = this.edgeGroup.position.z;
      for (const e of this._edgeMeshes) {
        const wz = gz + e.position.z;
        e.position.x = e.userData.baseX + this.getCurveX(wz);
      }
    }

    // Props: slot-based wrapping for forest/desert (individual groups),
    // group-based for city (simpler shapes that wrap cleanly)
    if (this._propSlots.length > 0) {
      const despawn = 20;
      const range = this._propTotalRange;
      for (const slot of this._propSlots) {
        slot.position.z += dz;
        if (slot.position.z > despawn) {
          slot.position.z -= range;
        }
        // Curve offset for prop slots
        if (this._curve) {
          slot.position.x = this.getCurveX(slot.position.z);
        }
      }
    } else if (this.propsGroup) {
      this.propsGroup.position.z += dz;
      if (this.propsGroup.position.z > this._propSpacing) {
        this.propsGroup.position.z -= this._propSpacing;
      }
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((c) => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        const m = c.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
  }
}
