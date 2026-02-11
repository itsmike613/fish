import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class Fishing {
  constructor(renderer, world, player, events, state, inventory) {
    this.renderer = renderer;
    this.scene = renderer.scene;
    this.camera = renderer.camera;

    this.world = world;
    this.player = player;
    this.events = events;
    this.state = state;
    this.inventory = inventory;

    // Required variable names
    this.bobber = null;
    this.line = null;
    this.particles = null;

    this.lootIndex = new Map();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(0, 0);

    this._tmpVec3 = new THREE.Vector3();
    this._tmpVec3b = new THREE.Vector3();
    this._tmpMat4 = new THREE.Matrix4();

    this._bindLootIndex();
    this._bindMouse();
  }

  _bindLootIndex() {
    // Build a map for synchronous lookups (also shared to UI/inventory via event)
    this.events.on("loot:loaded", ({ loot }) => {
      this.lootIndex.clear();
      for (const item of loot) this.lootIndex.set(item.id, item);

      // Share with UI + Inventory move logic
      this.events.emit("loot:registerIndex", { index: this.lootIndex });
    });
  }

  _bindMouse() {
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    window.addEventListener("mousedown", (e) => {
      if (e.button !== 2) return; // right click
      if (this.state.ui.inventoryOpen) return;

      // Must be holding fishing rod in selected hotbar slot
      const selected = this.state.ui.selectedHotbarIndex;
      const stack = this.inventory.getHotbarSelected(selected);
      if (!stack || stack.id !== "fishingrod") return;

      const fish = this.state.fish;

      if (!fish.cast) {
        this._tryCast();
        return;
      }

      if (fish.cast && fish.biteActive) {
        this._reelIn();
      }
    });
  }

  _tryCast() {
    if (!this.world.water) return;

    // Raycast from center of screen
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hits = this.raycaster.intersectObject(this.world.water, false);
    if (!hits || hits.length === 0) return;

    const hit = hits[0];
    const p = hit.point;

    // Only allow if aiming at water outside island radius
    const r = Math.sqrt(p.x * p.x + p.z * p.z);
    if (r <= this.world.islandRadius) return;

    this._spawnBobberAndLine(p);

    const fish = this.state.fish;
    fish.cast = true;
    fish.biteActive = false;

    fish.wait = Math.random() * 10.0; // 0–10 seconds
    fish.timer = fish.wait;

    this.events.emit("fish:cast", { point: { x: p.x, y: p.y, z: p.z } });
  }

  _spawnBobberAndLine(point) {
    // Bobber
    const bobberGeom = new THREE.SphereGeometry(0.08, 10, 10);
    const bobberMat = new THREE.MeshStandardMaterial({
      color: 0xff4455,
      roughness: 0.35,
      metalness: 0.0
    });

    const bobber = new THREE.Mesh(bobberGeom, bobberMat);
    bobber.position.set(point.x, this.world.waterLevel + 0.04, point.z);
    this.scene.add(bobber);
    this.bobber = bobber;

    // Line
    const lineGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    lineGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x202020,
      transparent: true,
      opacity: 0.75
    });

    const line = new THREE.Line(lineGeom, lineMat);
    this.scene.add(line);
    this.line = line;

    // Particles (Points)
    const particleGeom = new THREE.BufferGeometry();
    const max = 120;
    const pos = new Float32Array(max * 3);
    const life = new Float32Array(max);
    particleGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    particleGeom.setAttribute("life", new THREE.BufferAttribute(life, 1));

    const particleMat = new THREE.PointsMaterial({
      color: 0xb9fff0,
      size: 0.05,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    const particles = new THREE.Points(particleGeom, particleMat);
    particles.frustumCulled = false;
    particles.userData.max = max;
    particles.userData.spawnAccumulator = 0;
    this.scene.add(particles);
    this.particles = particles;
  }

  _clearBobber() {
    if (this.bobber) {
      this.scene.remove(this.bobber);
      this.bobber.geometry.dispose();
      this.bobber.material.dispose();
      this.bobber = null;
    }
    if (this.line) {
      this.scene.remove(this.line);
      this.line.geometry.dispose();
      this.line.material.dispose();
      this.line = null;
    }
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      this.particles.material.dispose();
      this.particles = null;
    }

    this.events.emit("fish:countdown", { visible: false });
  }

  _reelIn() {
    // Award an item (simple weighted roll by rarity)
    const item = this._rollCatch();
    if (item) {
      this.inventory.addItem(item, 1);
      this.events.emit("fish:catch", { id: item.id });
    }

    const fish = this.state.fish;
    fish.cast = false;
    fish.biteActive = false;
    fish.timer = 0;
    fish.wait = 0;

    this._clearBobber();
  }

  _rollCatch() {
    // Only fish/junk/treasure are catchable. (Tool not catchable)
    const candidates = [];
    for (const item of this.lootIndex.values()) {
      if (item.category === "fish" || item.category === "junk" || item.category === "treasure") {
        candidates.push(item);
      }
    }
    if (candidates.length === 0) return null;

    // Rarity weights
    const rarityWeight = (r) => {
      if (r === "common") return 60;
      if (r === "uncommon") return 25;
      if (r === "rare") return 10;
      if (r === "epic") return 4;
      if (r === "legendary") return 1;
      return 5;
    };

    let total = 0;
    for (const c of candidates) total += rarityWeight(c.rarity);

    let roll = Math.random() * total;
    for (const c of candidates) {
      roll -= rarityWeight(c.rarity);
      if (roll <= 0) return c;
    }
    return candidates[candidates.length - 1];
  }

  update(dt) {
    const fish = this.state.fish;
    if (!fish.cast || !this.bobber) return;

    // Update line endpoints each frame
    if (this.line) {
      const posAttr = this.line.geometry.getAttribute("position");
      const a = this.camera.position;
      const b = this.bobber.position;

      posAttr.setXYZ(0, a.x, a.y - 0.10, a.z);
      posAttr.setXYZ(1, b.x, b.y, b.z);
      posAttr.needsUpdate = true;
    }

    // Timer countdown
    if (!fish.biteActive) {
      fish.timer -= dt;

      // Last 5 seconds show countdown above bobber
      if (fish.timer > 0 && fish.timer <= 5) {
        this._emitCountdown(fish.timer);
        this._updateParticles(dt, true);
      } else {
        this.events.emit("fish:countdown", { visible: false });
        this._updateParticles(dt, false);
      }

      if (fish.timer <= 0) {
        fish.biteActive = true;
        fish.timer = 0;
        this.events.emit("fish:countdown", { visible: false });
      }
    } else {
      // Bite active: bobber dips
      const t = this.state.time.now;
      const dip = 0.04 + Math.sin(t * 10.0) * 0.018;
      this.bobber.position.y = this.world.waterLevel + 0.02 - dip;
      this._updateParticles(dt, false);
    }
  }

  _emitCountdown(timer) {
    const bobber = this.bobber;
    if (!bobber) return;

    // Project bobber to screen
    this._tmpVec3.copy(bobber.position);
    this._tmpVec3.project(this.camera);

    const x = (this._tmpVec3.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-this._tmpVec3.y * 0.5 + 0.5) * window.innerHeight;

    // Color transitions green -> red as approaches 0
    const t = Math.max(0, Math.min(1, timer / 5));
    const hue = 120 * t; // 120 green down to 0 red
    const color = `hsl(${hue}, 90%, 60%)`;

    const text = `(${timer.toFixed(1)}s)`;
    this.events.emit("fish:countdown", {
      visible: true,
      text,
      color,
      x,
      y
    });
  }

  _updateParticles(dt, active) {
    if (!this.particles) return;

    const geom = this.particles.geometry;
    const posAttr = geom.getAttribute("position");
    const lifeAttr = geom.getAttribute("life");
    const max = this.particles.userData.max;

    // decay
    for (let i = 0; i < max; i++) {
      let life = lifeAttr.getX(i);
      if (life <= 0) continue;

      life -= dt;
      lifeAttr.setX(i, life);

      // Move toward bobber
      const ix = i * 3;
      const px = posAttr.array[ix + 0];
      const py = posAttr.array[ix + 1];
      const pz = posAttr.array[ix + 2];

      const bx = this.bobber.position.x;
      const by = this.bobber.position.y;
      const bz = this.bobber.position.z;

      const dx = bx - px;
      const dy = by - py;
      const dz = bz - pz;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const speed = 1.8;

      posAttr.array[ix + 0] = px + (dx / len) * speed * dt;
      posAttr.array[ix + 1] = py + (dy / len) * speed * dt;
      posAttr.array[ix + 2] = pz + (dz / len) * speed * dt;

      // If reached bobber, kill
      if (len < 0.12) lifeAttr.setX(i, 0);
    }

    // spawn when active
    if (active) {
      this.particles.userData.spawnAccumulator += dt;

      while (this.particles.userData.spawnAccumulator >= 0.06) {
        this.particles.userData.spawnAccumulator -= 0.06;
        this._spawnParticleNearBobber(posAttr, lifeAttr, max);
      }
    }

    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  }

  _spawnParticleNearBobber(posAttr, lifeAttr, max) {
    // find a dead slot
    for (let i = 0; i < max; i++) {
      if (lifeAttr.getX(i) > 0) continue;

      const angle = Math.random() * Math.PI * 2;
      const radius = 1.6 + Math.random() * 2.6;

      const sx = this.bobber.position.x + Math.cos(angle) * radius;
      const sz = this.bobber.position.z + Math.sin(angle) * radius;
      const sy = this.world.waterLevel + 0.02 + Math.random() * 0.07;

      const ix = i * 3;
      posAttr.array[ix + 0] = sx;
      posAttr.array[ix + 1] = sy;
      posAttr.array[ix + 2] = sz;

      lifeAttr.setX(i, 0.9 + Math.random() * 0.5);
      return;
    }
  }
}
