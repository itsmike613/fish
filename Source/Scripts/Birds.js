import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class Birds {
  constructor(renderer, world) {
    this.scene = renderer.scene;
    this.world = world;

    this.birds = [];
    this.spawnTimer = 0;

    // Reuse geometry/material
    this.birdGeometry = new THREE.PlaneGeometry(0.5, 0.25, 1, 1);
    this.birdMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
  }

  _spawnBird() {
    if (this.birds.length >= 2) return;

    const bird = new THREE.Mesh(this.birdGeometry, this.birdMaterial);
    bird.position.set(
      (Math.random() * 2 - 1) * 18,
      6 + Math.random() * 2,
      (Math.random() * 2 - 1) * 18
    );

    bird.userData = {
      angle: Math.random() * Math.PI * 2,
      radius: 18 + Math.random() * 10,
      speed: 0.35 + Math.random() * 0.35,
      height: bird.position.y,
      flap: Math.random() * 10
    };

    this.scene.add(bird);
    this.birds.push(bird);
  }

  update(dt, now) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      // occasional
      this.spawnTimer = 6 + Math.random() * 7;
      if (Math.random() < 0.7) this._spawnBird();
    }

    for (let i = this.birds.length - 1; i >= 0; i--) {
      const bird = this.birds[i];
      const d = bird.userData;

      d.angle += d.speed * dt;

      const x = Math.cos(d.angle) * d.radius;
      const z = Math.sin(d.angle) * d.radius;
      bird.position.x = x;
      bird.position.z = z;
      bird.position.y = d.height + Math.sin(now * 6 + d.flap) * 0.08;

      // face direction
      bird.rotation.y = -d.angle + Math.PI / 2;
      bird.rotation.z = Math.sin(now * 10 + d.flap) * 0.25;

      // despawn if extremely far (rare)
      const rr = Math.sqrt(x * x + z * z);
      if (rr > 80) {
        this.scene.remove(bird);
        this.birds.splice(i, 1);
      }
    }
  }
}
