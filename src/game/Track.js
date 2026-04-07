import * as THREE from "three";
/**
 * Dark roadway, glowing lane markers, rack props, horizon grid, billboards.
 */
export class Track {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

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

  _road() {
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 400),
      new THREE.MeshStandardMaterial({
        color: 0x121520,
        metalness: 0.15,
        roughness: 0.88,
        emissive: 0x020408,
        emissiveIntensity: 0.12,
      })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.receiveShadow = true;
    this.group.add(road);

    this.edgeGroup = new THREE.Group();
    this.group.add(this.edgeGroup);
    this._edgeSpacing = 20;
    this._edgeCount = 24;
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      emissive: 0x220044,
      emissiveIntensity: 0.6,
    });
    for (let i = 0; i < this._edgeCount; i++) {
      const z = -200 + i * this._edgeSpacing;
      const el = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.08, this._edgeSpacing),
        edgeMat
      );
      el.position.set(-5.8, 0.05, z);
      this.edgeGroup.add(el);
      const er = el.clone();
      er.position.x = 5.8;
      this.edgeGroup.add(er);
    }
  }

  _laneMarkers() {
    this.markerGroup = new THREE.Group();
    this.group.add(this.markerGroup);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.85,
    });
    this._markerSpacing = 8;
    this._markerCount = 40;
    for (let i = 0; i < this._markerCount; i++) {
      const z = -200 + i * this._markerSpacing;
      for (const x of [-1.6, 1.6]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 3.2), mat);
        m.position.set(x, 0.03, z);
        this.markerGroup.add(m);
      }
    }
  }

  _sideProps() {
    this.propsGroup = new THREE.Group();
    this.group.add(this.propsGroup);

    const rackMat = new THREE.MeshStandardMaterial({
      color: 0x3d4658,
      metalness: 0.42,
      roughness: 0.52,
      emissive: 0x0c1830,
      emissiveIntensity: 0.55,
    });
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x4a5068,
      metalness: 0.35,
      roughness: 0.55,
      emissive: 0x1a1038,
      emissiveIntensity: 0.4,
    });
    this._propSpacing = 14;
    this._propCount = 28;
    for (let i = 0; i < this._propCount; i++) {
      const z = -200 + i * this._propSpacing;
      const rack = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 3 + Math.random() * 1.5, 1.5),
        rackMat
      );
      rack.position.set(-8.5, 1.5, z);
      this.propsGroup.add(rack);
      const rack2 = rack.clone();
      rack2.position.x = 8.5;
      this.propsGroup.add(rack2);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 5, 6),
        poleMat
      );
      pole.position.set(-11, 2.5, z + 4);
      this.propsGroup.add(pole);
      const pole2 = pole.clone();
      pole2.position.x = 11;
      this.propsGroup.add(pole2);
    }
  }

  _billboards() {
    const defs = [
      { id: "demo1", label: "Demo 1", x: 14,  z: -42, accent: 0x00c8ea },
      { id: "demo2", label: "Demo 2", x: 15,  z: -68, accent: 0xff6644 },
      { id: "demo3", label: "Demo 3", x: -14, z: -55, accent: 0x66ffcc },
    ];

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
          new THREE.CylinderGeometry(0.12, 0.14, poleH, 8),
          poleMat
        );
        pole.position.set(side * (boardW / 2 - 0.4), poleH / 2, 0);
        g.add(pole);
      }

      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x2a3550, metalness: 0.3, roughness: 0.5,
      });
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(boardW + 0.3, boardH + 0.3, 0.15),
        frameMat
      );
      frame.position.y = poleH + boardH / 2;
      g.add(frame);

      const screenMat = new THREE.MeshStandardMaterial({
        color: 0x101824, metalness: 0.05, roughness: 0.92,
        emissive: 0x0a1020, emissiveIntensity: 0.3,
      });
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(boardW, boardH, 0.18),
        screenMat
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

      // Label text via canvas texture
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 320;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#0d1420";
      ctx.fillRect(0, 0, 512, 320);

      // Border
      const accentHex = "#" + def.accent.toString(16).padStart(6, "0");
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, 480, 288);

      // "SIDE QUEST" header
      ctx.font = "bold 24px 'Courier New', monospace";
      ctx.fillStyle = accentHex;
      ctx.textAlign = "center";
      ctx.fillText("SIDE QUEST", 256, 60);

      // Demo label
      ctx.font = "bold 48px 'Courier New', monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(def.label.toUpperCase(), 256, 140);

      // "Click to explore" hint
      ctx.font = "20px 'Courier New', monospace";
      ctx.fillStyle = "rgba(200,220,255,0.5)";
      ctx.fillText("[ Click to explore ]", 256, 200);

      // Placeholder dashed box
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = "rgba(200,220,255,0.2)";
      ctx.lineWidth = 2;
      ctx.strokeRect(120, 230, 272, 60);
      ctx.font = "16px 'Courier New', monospace";
      ctx.fillStyle = "rgba(200,220,255,0.3)";
      ctx.fillText("Demo content placeholder", 256, 268);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const labelMat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true,
      });
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(boardW * 0.92, boardH * 0.92),
        labelMat
      );
      label.position.y = poleH + boardH / 2;
      label.position.z = 0.18;
      g.add(label);

      // Spotlights illuminating the board face
      const spotL = new THREE.SpotLight(0xffffff, 2, 14, Math.PI / 5, 0.5, 1);
      spotL.position.set(-boardW / 3, poleH + boardH + 1.5, 3);
      spotL.target.position.set(0, poleH + boardH / 2, 0);
      g.add(spotL);
      g.add(spotL.target);

      const spotR = new THREE.SpotLight(0xffffff, 2, 14, Math.PI / 5, 0.5, 1);
      spotR.position.set(boardW / 3, poleH + boardH + 1.5, 3);
      spotR.target.position.set(0, poleH + boardH / 2, 0);
      g.add(spotR);
      g.add(spotR.target);

      // Accent glow
      const glow = new THREE.PointLight(def.accent, 0.5, 12);
      glow.position.set(0, poleH + boardH / 2, 3);
      g.add(glow);

      g.position.set(def.x, 0, def.z);
      // Face the road
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

    const bldgMat = (color, emissive = 0x000000) =>
      new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: 0.7,
        metalness: 0.1,
        roughness: 0.85,
        flatShading: true,
      });

    // Generic background buildings (blocky, 16-bit style)
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
        new THREE.BoxGeometry(b.w, b.h, b.d),
        bldgMat(b.color, 0x141830)
      );
      mesh.position.set(b.x, b.h / 2, 0);
      skylineGroup.add(mesh);

      // Window grid (emissive dots)
      const winMat = new THREE.MeshBasicMaterial({
        color: 0x5588bb,
        transparent: true,
        opacity: 0.8,
      });
      const rows = Math.floor(b.h / 2.5);
      const cols = Math.floor(b.w / 2.2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() < 0.35) continue;
          const win = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 0.6),
            winMat
          );
          win.position.set(
            b.x - (b.w / 2) + 1.2 + c * 2.2,
            1.5 + r * 2.5,
            b.d / 2 + 0.05
          );
          skylineGroup.add(win);
        }
      }
    }

    // --- Red Hat HQ building (center-right, tallest, distinctive) ---
    const rhqW = 14;
    const rhqH = 26;
    const rhqD = 10;
    const rhqX = 22;

    // Main tower — light gray/blue tint like the real building
    const towerMat = bldgMat(0x7a8a9a, 0x1a2535);
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(rhqW, rhqH, rhqD),
      towerMat
    );
    tower.position.set(rhqX, rhqH / 2, 0);
    skylineGroup.add(tower);

    // Window grid on the tower
    const rhWinMat = new THREE.MeshBasicMaterial({
      color: 0x88aacc,
      transparent: true,
      opacity: 0.75,
    });
    const rhRows = Math.floor(rhqH / 2.2);
    const rhCols = Math.floor(rhqW / 1.8);
    for (let r = 0; r < rhRows; r++) {
      for (let c = 0; c < rhCols; c++) {
        if (Math.random() < 0.2) continue;
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.9, 0.7),
          rhWinMat
        );
        win.position.set(
          rhqX - (rhqW / 2) + 1 + c * 1.8,
          1.8 + r * 2.2,
          rhqD / 2 + 0.06
        );
        skylineGroup.add(win);
      }
    }

    // Red Hat sign panel on top
    const signW = rhqW * 0.85;
    const signH = 3.5;
    const signMat = new THREE.MeshStandardMaterial({
      color: 0xcc0000,
      emissive: 0xcc0000,
      emissiveIntensity: 0.8,
      metalness: 0.05,
      roughness: 0.5,
    });
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(signW, signH, 0.3),
      signMat
    );
    sign.position.set(rhqX, rhqH - 1.2, rhqD / 2 + 0.2);
    skylineGroup.add(sign);

    // "RED HAT" text using small white blocks (pixel-art lettering)
    const textMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pixelSize = 0.38;
    // Simplified pixel font: R E D  H A T
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
          new THREE.BoxGeometry(pixelSize * 0.85, pixelSize * 0.85, 0.15),
          textMat
        );
        px.position.set(
          cursorX + dx * pixelSize,
          rhqH - 0.2 - dy * pixelSize,
          rhqD / 2 + 0.4
        );
        skylineGroup.add(px);
      }
      cursorX += 3.5 * pixelSize;
    }

    // Fedora silhouette on top of the building (blocky pixel art)
    const hatMat = new THREE.MeshStandardMaterial({
      color: 0xcc0000,
      emissive: 0xaa0000,
      emissiveIntensity: 0.6,
      metalness: 0.05,
      roughness: 0.5,
      flatShading: true,
    });
    // Brim
    const brim = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.6, 2),
      hatMat
    );
    brim.position.set(rhqX, rhqH + 1.8, rhqD / 2 - 0.5);
    skylineGroup.add(brim);
    // Crown
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.2, 1.8),
      hatMat
    );
    crown.position.set(rhqX - 0.3, rhqH + 3.2, rhqD / 2 - 0.5);
    skylineGroup.add(crown);
    // Crown dent/pinch (slightly inset top)
    const dent = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.5, 1.6),
      bldgMat(0x990000, 0x660000)
    );
    dent.position.set(rhqX - 0.3, rhqH + 4.3, rhqD / 2 - 0.5);
    skylineGroup.add(dent);
    // Tip of hat (right side bump)
    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.0, 1.4),
      hatMat
    );
    tip.position.set(rhqX + 1.8, rhqH + 3.0, rhqD / 2 - 0.5);
    skylineGroup.add(tip);
  }

  _horizon() {
    const grid = new THREE.GridHelper(400, 80, 0x336688, 0x1a2840);
    grid.position.y = 0.01;
    grid.position.z = -120;
    const s = grid.scale;
    s.x = 1.2;
    s.z = 1.5;
    this.group.add(grid);

    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 200),
      new THREE.MeshBasicMaterial({
        color: 0x050510,
        transparent: true,
        opacity: 0.95,
      })
    );
    sky.position.set(0, 80, -200);
    this.group.add(sky);
  }

  _lights() {
    // Base fill — stops pure-black side faces
    const amb = new THREE.AmbientLight(0xb8c8e0, 0.72);
    this.group.add(amb);

    const hemi = new THREE.HemisphereLight(0x8899bb, 0x1a1520, 0.55);
    hemi.position.set(0, 80, 0);
    this.group.add(hemi);

    // Key from ahead-above (highway “headlights / moon”)
    const key = new THREE.DirectionalLight(0xd8e8ff, 0.95);
    key.position.set(-6, 32, 28);
    this.group.add(key);

    // Rim toward camera — defines vertical edges of roadside props
    const rim = new THREE.DirectionalLight(0xaaccff, 0.45);
    rim.position.set(0, 14, 42);
    this.group.add(rim);

    // Side fills: hit inward faces of left/right racks (toward the track)
    const fillL = new THREE.PointLight(0x55ddff, 1.15, 55, 1.8);
    fillL.position.set(-10, 4.5, 8);
    this.group.add(fillL);

    const fillR = new THREE.PointLight(0xcc77ff, 0.95, 55, 1.8);
    fillR.position.set(10, 4.5, 8);
    this.group.add(fillR);

    const accent = new THREE.PointLight(0xff66aa, 0.55, 90, 2);
    accent.position.set(0, 9, -25);
    this.group.add(accent);
  }

  /**
   * @param {number} dt — frame delta (seconds)
   * @param {number} worldSpeed — current forward speed (units/s)
   */
  update(dt, worldSpeed) {
    const dz = worldSpeed * dt;

    if (this.markerGroup) {
      this.markerGroup.position.z += dz;
      if (this.markerGroup.position.z > this._markerSpacing) {
        this.markerGroup.position.z -= this._markerSpacing;
      }
    }

    if (this.propsGroup) {
      this.propsGroup.position.z += dz;
      if (this.propsGroup.position.z > this._propSpacing) {
        this.propsGroup.position.z -= this._propSpacing;
      }
    }

    if (this.edgeGroup) {
      this.edgeGroup.position.z += dz;
      if (this.edgeGroup.position.z > this._edgeSpacing) {
        this.edgeGroup.position.z -= this._edgeSpacing;
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
