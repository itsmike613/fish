// fish/Source/Scripts/Fishing.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { loot } from './Loot.js';
import { getCatch, incCatch } from './State.js';
import { events } from './Events.js';

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rgb(r, g, b) {
  r = Math.max(0, Math.min(255, r | 0));
  g = Math.max(0, Math.min(255, g | 0));
  b = Math.max(0, Math.min(255, b | 0));
  return `rgb(${r},${g},${b})`;
}

function easeIn(t) {
  return t * t;
}

export default class Fishing {
  constructor(scene, camera, world, inventory) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.inv = inventory;

    this.ray = new THREE.Raycaster();
    this.v2 = new THREE.Vector2(0, 0);

    this.active = false;
    this.state = 'none'; // waiting | bitten
    this.castAt = 0;
    this.wait = 0;
    this.biteAt = 0;

    this.bobber = null;
    this.line = null;
    this.lineGeo = null;

    this.spawnT = 0;
    this.particles = [];

    this._hud = { show: false, text: '', color: '#00ff00', pos: new THREE.Vector3() };

    this.pMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false });
    this.pGeo = new THREE.PlaneGeometry(0.12, 0.12);
  }

  _hasRodSelected(slot) {
    const it = this.inv.hot[slot];
    return !!it && it.id === 'fishingrod';
  }

  tryCastOrReel(now, slot) {
    if (this.active) {
      this._reel(now);
      return;
    }
    if (!this._hasRodSelected(slot)) return;
    this._cast(now);
  }

  _cast(now) {
    this.ray.setFromCamera(this.v2, this.camera);
    const hits = this.ray.intersectObjects(this.world.getRayTargets(), false);
    if (!hits.length) return;

    const hit = hits[0];
    if (hit.object !== this.world.water) return;

    const p = hit.point;
    if (!this.world.isWaterAt(p.x, p.z)) return;

    // spawn bobber at hit point
    const g = new THREE.SphereGeometry(0.08, 10, 10);
    const m = new THREE.MeshStandardMaterial({ color: 0xff4d4d, roughness: 0.6, metalness: 0.0 });
    const b = new THREE.Mesh(g, m);
    b.position.set(p.x, this.world.waterY + 0.05, p.z);
    this.scene.add(b);

    // line
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(6);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const lm = new THREE.LineBasicMaterial({ color: 0x0c0c0c, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, lm);
    this.scene.add(line);

    this.active = true;
    this.state = 'waiting';
    this.castAt = now;
    this.wait = Math.random() * 10.0;
    this.biteAt = 0;

    this.bobber = b;
    this.line = line;
    this.lineGeo = geo;

    this.spawnT = 0;
    this._hud.show = false;

    events.emit('fishing:cast', null);
  }

  _cleanup() {
    if (this.bobber) this.scene.remove(this.bobber);
    if (this.line) this.scene.remove(this.line);

    for (const p of this.particles) {
      this.scene.remove(p.m);
    }
    this.particles.length = 0;

    this.bobber = null;
    this.line = null;
    this.lineGeo = null;

    this.active = false;
    this.state = 'none';
    this._hud.show = false;
  }

  _availableLoot() {
    const out = [];
    for (const it of loot) {
      const n = getCatch(it.id);
      const lim = it.catchable;
      if (lim === Infinity || n < lim) out.push(it);
    }
    return out;
  }

  _pickLoot() {
    const a = this._availableLoot();
    if (!a.length) return null;

    let sum = 0;
    for (const it of a) sum += it.weight;

    let r = Math.random() * sum;
    for (const it of a) {
      r -= it.weight;
      if (r <= 0) return it;
    }
    return a[a.length - 1];
  }

  _reel(now) {
    let ok = false;
    if (this.state === 'bitten') {
      if (now - this.biteAt <= 1.5) ok = true;
    }

    if (ok) {
      const it = this._pickLoot();
      if (it) {
        const added = this.inv.addItem(it.id, 1);
        if (added) incCatch(it.id);
        events.emit('fishing:success', { id: it.id });
      } else {
        events.emit('fishing:success', { id: null });
      }
    } else {
      events.emit('fishing:fail', null);
    }

    this._cleanup();
  }

  _spawnParticle() {
    if (!this.bobber) return;

    const bx = this.bobber.position.x;
    const bz = this.bobber.position.z;

    const a = Math.random() * Math.PI * 2;
    const d = 3.2 + Math.random() * 6.5;
    const sx = bx + Math.cos(a) * d;
    const sz = bz + Math.sin(a) * d;

    const m = new THREE.Mesh(this.pGeo, this.pMat.clone());
    m.rotation.x = -Math.PI / 2;
    m.position.set(sx, this.world.waterY + 0.01, sz);

    const dx = bx - sx;
    const dz = bz - sz;
    const len = Math.hypot(dx, dz) || 1;

    const travel = 0.55 + Math.random() * 0.75;
    const sp = len / travel;

    const vx = (dx / len) * sp;
    const vz = (dz / len) * sp;

    this.scene.add(m);
    this.particles.push({ m, vx, vz, t: 0, life: travel });
  }

  update(dt, now) {
    if (!this.active) return;

    // line follows camera -> bobber
    if (this.lineGeo && this.bobber) {
      const a = this.lineGeo.attributes.position.array;
      a[0] = this.camera.position.x;
      a[1] = this.camera.position.y - 0.15;
      a[2] = this.camera.position.z;
      a[3] = this.bobber.position.x;
      a[4] = this.bobber.position.y;
      a[5] = this.bobber.position.z;
      this.lineGeo.attributes.position.needsUpdate = true;
    }

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.t += dt;
      const k = clamp01(1 - (p.t / p.life));
      p.m.material.opacity = lerp(0.0, 0.8, k);
      p.m.position.x += p.vx * dt;
      p.m.position.z += p.vz * dt;
      if (p.t >= p.life) {
        this.scene.remove(p.m);
        this.particles.splice(i, 1);
      }
    }

    if (this.state === 'waiting') {
      const end = this.castAt + this.wait;
      const rem = end - now;

      if (rem <= 0) {
        this.state = 'bitten';
        this.biteAt = now;
        this._hud.show = false;
        events.emit('fishing:bite', null);
      } else {
        if (rem <= 5.0) {
          // countdown above bobber
          const t = clamp01(rem / 5.0);
          const r = lerp(255, 0, t); // green -> red over last 5s
          const g = lerp(0, 255, t);
          this._hud.show = true;
          this._hud.text = `(${rem.toFixed(1)}s)`;
          this._hud.color = rgb(r, g, 0);
          if (this.bobber) this._hud.pos.copy(this.bobber.position).add(new THREE.Vector3(0, 0.55, 0));

          // fish approach trail
          this.spawnT += dt;
          while (this.spawnT >= 0.12) {
            this.spawnT -= 0.12;
            this._spawnParticle();
          }
        } else {
          this._hud.show = false;
        }
      }
    } else if (this.state === 'bitten') {
      if (this.bobber) {
        const t = clamp01((now - this.biteAt) / 0.25);
        const dip = easeIn(t) * 0.25;
        this.bobber.position.y = this.world.waterY + 0.05 - dip;
      }
    }
  }

  getHud() {
    if (!this.active) return { show: false };
    return this._hud;
  }
}
