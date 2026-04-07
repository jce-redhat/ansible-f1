import * as THREE from "three";
/**
 * Dark roadway, glowing lane markers, rack props, horizon grid.
 */
export class Track {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    this._road();
    this._laneMarkers();
    this._sideProps();
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

    const edgeL = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.08, 420),
      new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        emissive: 0x220044,
        emissiveIntensity: 0.6,
      })
    );
    edgeL.position.set(-5.8, 0.05, -40);
    this.group.add(edgeL);

    const edgeR = edgeL.clone();
    edgeR.position.x = 5.8;
    this.group.add(edgeR);
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
    for (let i = 0; i < 24; i++) {
      const z = -180 + i * 14;
      const rack = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 3 + Math.random() * 1.5, 1.5),
        rackMat
      );
      rack.position.set(-8.5, 1.5, z);
      this.group.add(rack);
      const rack2 = rack.clone();
      rack2.position.x = 8.5;
      this.group.add(rack2);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 5, 6),
        poleMat
      );
      pole.position.set(-11, 2.5, z + 4);
      this.group.add(pole);
      const pole2 = pole.clone();
      pole2.position.x = 11;
      this.group.add(pole2);
    }
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
    if (!this.markerGroup) return;
    const totalLen = this._markerSpacing * this._markerCount;
    this.markerGroup.position.z += worldSpeed * dt;
    if (this.markerGroup.position.z > this._markerSpacing) {
      this.markerGroup.position.z -= this._markerSpacing;
    }
    if (this.markerGroup.position.z > totalLen) {
      this.markerGroup.position.z %= this._markerSpacing;
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
