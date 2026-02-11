// fish/Source/Scripts/Fishing.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { loot } from './Loot.js';

function rand(a, b){
  return a + Math.random() * (b - a);
}

function now(){
  return Date.now();
}

function lootById(){
  const m = new Map();
  for(const it of loot) m.set(it.id, it);
  return m;
}

const lootMap = lootById();

export class Fishing {
  constructor(state, world, camera, scene, inv){
    this.state = state;
    this.world = world;
    this.camera = camera;
    this.scene = scene;
    this.inv = inv;

    this.active = false;
    this.bob = null;
    this.line = null;

    this.castAt = 0;
    this.biteAt = 0;
    this.biteTime = 0;
    this.expired = false;

    this._biteTimer = null;
    this._expireTimer = null;

    this.parts = [];
    this._partTick = 0;

    this._bobY = world.waterY + 0.06;
    this._dipT = 0;

    this.ray = new THREE.Raycaster();
    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
  }

  _saveFishing(){
    const f = {
      active: this.active,
      x: this.bob ? this.bob.position.x : 0,
      y: this.bob ? this.bob.position.y : 0,
      z: this.bob ? this.bob.position.z : 0,
      castAt: this.castAt,
      biteAt: this.biteAt,
      biteTime: this.biteTime,
      expired: this.expired
    };
    this.state.setFishing(f);
    this.state.save();
  }

  _clearTimers(){
    if(this._biteTimer){ clearTimeout(this._biteTimer); this._biteTimer = null; }
    if(this._expireTimer){ clearTimeout(this._expireTimer); this._expireTimer = null; }
  }

  _removeParts(){
    for(const p of this.parts) this.scene.remove(p.m);
    this.parts.length = 0;
  }

  _removeCast(){
    if(this.line){ this.scene.remove(this.line); this.line.geometry.dispose(); this.line = null; }
    if(this.bob){ this.scene.remove(this.bob); this.bob.geometry.dispose(); this.bob.material.dispose(); this.bob = null; }
    this._removeParts();
    this._clearTimers();

    this.active = false;
    this.castAt = 0;
    this.biteAt = 0;
    this.biteTime = 0;
    this.expired = false;
    this._dipT = 0;

    this._saveFishing();
  }

  _makeBob(pos){
    const g = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const m = new THREE.MeshBasicMaterial({ color: 0xff4040 });
    const bob = new THREE.Mesh(g, m);
    bob.position.copy(pos);
    this.scene.add(bob);
    return bob;
  }

  _makeLine(){
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(6);
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const m = new THREE.LineBasicMaterial({ color: 0x111111 });
    const l = new THREE.Line(g, m);
    this.scene.add(l);
    return l;
  }

  _pickLoot(){
    const catches = this.state.data.catches || {};
    const pool = [];

    let sum = 0;
    for(const it of loot){
      const got = catches[it.id] || 0;
      const cap = it.catchable;
      const ok = (cap === Infinity) || (got < cap);
      if(!ok) continue;
      const w = +it.weight || 0;
      if(w <= 0) continue;
      sum += w;
      pool.push({ it, sum });
    }

    if(pool.length === 0) return null;

    const r = Math.random() * sum;
    for(const p of pool){
      if(r <= p.sum) return p.it;
    }
    return pool[pool.length - 1].it;
  }

  cast(){
    if(this.active) return;

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.ray.set(this.camera.position, dir);

    const hit = this.world.raycastFirst(this.ray);
    if(!hit) return;

    if(hit.object !== this.world.water) return;

    const p = hit.point.clone();
    p.y = this._bobY;

    this.active = true;
    this.castAt = now();
    this.biteTime = 0;
    this.expired = false;

    this.bob = this._makeBob(p);
    this.line = this._makeLine();

    const wait = rand(0, 10) * 1000;
    this.biteAt = this.castAt + wait;

    this._clearTimers();
    this._biteTimer = setTimeout(() => this._bite(), wait);

    this._saveFishing();
  }

  _bite(){
    if(!this.active || !this.bob) return;

    this.biteTime = now();
    this.expired = false;
    this._dipT = 0;

    this._clearTimers();
    this._expireTimer = setTimeout(() => {
      this.expired = true;
      this._saveFishing();
    }, 1500);

    this._saveFishing();
  }

  reel(){
    if(!this.active) return;

    const t = now();
    let ok = false;

    if(this.biteTime > 0 && !this.expired){
      if((t - this.biteTime) <= 1500){
        ok = true;
      }
    }

    if(ok){
      const it = this._pickLoot();
      if(it){
        this.state.incCatch(it.id, 1);

        this.inv.add(it.id, 1);

        this.state.emit('catch', it.id);
        this.state.save();
      }
    }

    this._removeCast();
  }

  update(dt){
    if(!this.active || !this.bob || !this.line) return;

    const camPos = this.camera.position;
    const posAttr = this.line.geometry.getAttribute('position');
    posAttr.setXYZ(0, camPos.x, camPos.y, camPos.z);
    posAttr.setXYZ(1, this.bob.position.x, this.bob.position.y, this.bob.position.z);
    posAttr.needsUpdate = true;

    if(this.biteTime > 0){
      this._dipT += dt;

      const a = Math.min(this._dipT / 0.18, 1);
      const dip = Math.sin(a * Math.PI) * 0.16;

      this.bob.position.y = this._bobY - dip;
      if(a >= 1){
        this.bob.position.y = this._bobY;
      }
    }else{
      this.bob.position.y = this._bobY;
    }

    this._partTick += dt;
    if(this._partTick >= 0.12){
      this._partTick = 0;
      this._spawnPart();
    }

    for(let i=this.parts.length-1; i>=0; i--){
      const p = this.parts[i];
      p.t += dt;

      p.m.position.x += p.vx * dt;
      p.m.position.z += p.vz * dt;

      const dx = this.bob.position.x - p.m.position.x;
      const dz = this.bob.position.z - p.m.position.z;
      const d = Math.hypot(dx, dz);

      if(d < 0.25 || p.t > 2.0){
        this.scene.remove(p.m);
        p.m.geometry.dispose();
        p.m.material.dispose();
        this.parts.splice(i, 1);
        continue;
      }

      p.m.position.y = this.world.waterY + 0.02;
    }
  }

  _spawnPart(){
    if(!this.active || !this.bob) return;
    if(this.parts.length > 48) return;

    const r = rand(3.0, 6.0);
    const a = rand(0, Math.PI * 2);

    const sx = this.bob.position.x + Math.cos(a) * r;
    const sz = this.bob.position.z + Math.sin(a) * r;

    const dx = this.bob.position.x - sx;
    const dz = this.bob.position.z - sz;
    const d = Math.hypot(dx, dz) || 1;

    const sp = rand(2.8, 4.4);
    const vx = (dx / d) * sp;
    const vz = (dz / d) * sp;

    const g = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const o = new THREE.Mesh(g, m);
    o.position.set(sx, this.world.waterY + 0.02, sz);
    this.scene.add(o);

    this.parts.push({ m: o, vx, vz, t: 0 });
  }

  restoreFromState(){
    const f = this.state.data.fishing;
    if(!f || !f.active) return;

    this._removeCast();

    this.active = true;
    this.castAt = +f.castAt || now();
    this.biteAt = +f.biteAt || 0;
    this.biteTime = +f.biteTime || 0;
    this.expired = !!f.expired;

    const p = new THREE.Vector3(+f.x || 0, +f.y || this._bobY, +f.z || 0);
    if(p.y === 0) p.y = this._bobY;
    this.bob = this._makeBob(p);
    this.line = this._makeLine();

    const t = now();

    this._clearTimers();

    if(this.biteTime > 0){
      if((t - this.biteTime) > 1500){
        this.expired = true;
      }else if(!this.expired){
        const rem = 1500 - (t - this.biteTime);
        this._expireTimer = setTimeout(() => {
          this.expired = true;
          this._saveFishing();
        }, rem);
      }
    }else{
      if(this.biteAt > 0){
        if(t >= this.biteAt){
          this._bite();
        }else{
          const rem = this.biteAt - t;
          this._biteTimer = setTimeout(() => this._bite(), rem);
        }
      }
    }

    this._saveFishing();
  }
}
