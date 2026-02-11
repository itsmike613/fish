// fish/Source/Scripts/Player.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

function clamp(v, a, b){
  return Math.max(a, Math.min(b, v));
}

export class Player {
  constructor(state, camera, world, canvas){
    this.state = state;
    this.camera = camera;
    this.world = world;
    this.canvas = canvas;

    const p = state.data.player;

    this.pos = new THREE.Vector3(p.x, p.y, p.z);
    this.vel = new THREE.Vector3(0, 0, 0);

    this.yaw = p.yaw || 0;
    this.pitch = clamp(p.pitch || 0, -Math.PI/2 + 0.001, Math.PI/2 - 0.001);

    this.eye = 1.62;
    this.h = 1.8;
    this.r = 0.3;

    this.onGround = true;

    this.enabled = true;
    this.lookEnabled = true;

    this.keys = new Set();

    this.walk = 4.317;
    this.sprint = 5.612;
    this.jump = 7.75;
    this.g = 24.0;

    this.groundAccel = 40.0;
    this.airAccel = 10.0;
    this.groundFriction = 18.0;

    this._mouse = (e) => this._onMouse(e);
    this._down = (e) => this._onDown(e);
    this._up = (e) => this._onUp(e);

    document.addEventListener('mousemove', this._mouse, { passive:true });
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);

    this._syncCam();
  }

  setEnabled(v){
    this.enabled = !!v;
  }

  setLook(v){
    this.lookEnabled = !!v;
  }

  _isLocked(){
    return document.pointerLockElement === this.canvas;
  }

  _onMouse(e){
    if(!this.lookEnabled) return;
    if(!this._isLocked()) return;

    const mx = e.movementX || 0;
    const my = e.movementY || 0;

    const sens = 0.0022;

    this.yaw -= mx * sens;
    this.pitch -= my * sens;

    this.pitch = clamp(this.pitch, -Math.PI/2 + 0.001, Math.PI/2 - 0.001);
  }

  _onDown(e){
    if(e.code === 'Space') e.preventDefault();
    this.keys.add(e.code);
  }

  _onUp(e){
    this.keys.delete(e.code);
  }

  requestLock(){
    if(this._isLocked()) return;
    if(!this.lookEnabled) return;
    this.canvas.requestPointerLock?.();
  }

  unlock(){
    if(this._isLocked()) document.exitPointerLock?.();
  }

  _dir(){
    const f = (this.keys.has('KeyW') ? 1 : 0) + (this.keys.has('KeyS') ? -1 : 0);
    const s = (this.keys.has('KeyD') ? 1 : 0) + (this.keys.has('KeyA') ? -1 : 0);
    return { f, s };
  }

  _syncCam(){
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.position.set(this.pos.x, this.pos.y + this.eye, this.pos.z);
  }

  update(dt){
    if(!this.enabled){
      this.vel.x = 0;
      this.vel.z = 0;
      this._syncCam();
      this.state.setPlayer({ x:this.pos.x, y:this.pos.y, z:this.pos.z, yaw:this.yaw, pitch:this.pitch });
      return;
    }

    const { f, s } = this._dir();
    const run = this.keys.has('ControlLeft') || this.keys.has('ControlRight');
    const speed = run ? this.sprint : this.walk;

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);

    let ix = 0;
    let iz = 0;

    if(f !== 0 || s !== 0){
      let lx = s;
      let lz = f;

      const len = Math.hypot(lx, lz);
      lx /= len;
      lz /= len;

      ix = lx * cos - lz * sin;
      iz = lx * sin + lz * cos;
    }

    const targetX = ix * speed;
    const targetZ = iz * speed;

    const accel = this.onGround ? this.groundAccel : this.airAccel;

    this.vel.x += (targetX - this.vel.x) * clamp(accel * dt, 0, 1);
    this.vel.z += (targetZ - this.vel.z) * clamp(accel * dt, 0, 1);

    if(this.onGround && f === 0 && s === 0){
      const fr = clamp(this.groundFriction * dt, 0, 1);
      this.vel.x *= (1 - fr);
      this.vel.z *= (1 - fr);
    }

    if(this.keys.has('Space') && this.onGround){
      this.vel.y = this.jump;
      this.onGround = false;
    }

    this.vel.y -= this.g * dt;

    let nx = this.pos.x + this.vel.x * dt;
    let nz = this.pos.z;

    if(this.world.canStand(nx, nz, this.r)){
      this.pos.x = nx;
    }else{
      this.vel.x = 0;
    }

    nx = this.pos.x;
    nz = this.pos.z + this.vel.z * dt;

    if(this.world.canStand(nx, nz, this.r)){
      this.pos.z = nz;
    }else{
      this.vel.z = 0;
    }

    this.pos.y += this.vel.y * dt;

    if(this.pos.y <= this.world.sandTop){
      this.pos.y = this.world.sandTop;
      this.vel.y = 0;
      this.onGround = true;
    }else{
      this.onGround = false;
    }

    this._syncCam();
    this.state.setPlayer({ x:this.pos.x, y:this.pos.y, z:this.pos.z, yaw:this.yaw, pitch:this.pitch });
  }

  dispose(){
    document.removeEventListener('mousemove', this._mouse);
    window.removeEventListener('keydown', this._down);
    window.removeEventListener('keyup', this._up);
  }
}
