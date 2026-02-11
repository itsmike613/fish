// fish/Source/Scripts/Player.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

function clamp(v, a, b) {
	return Math.max(a, Math.min(b, v));
}

function approach(cur, target, maxDelta) {
	const d = target - cur;
	if (Math.abs(d) <= maxDelta) return target;
	return cur + Math.sign(d) * maxDelta;
}

export default class Player {
	constructor(camera, world) {
		this.camera = camera;
		this.world = world;

		this.pos = new THREE.Vector3(0, 1.0, 0);
		this.vel = new THREE.Vector3(0, 0, 0);

		this.yaw = 0;
		this.pitch = 0;

		this.eye = 1.62;
		this.h = 1.8;
		this.r = 0.3;

		this.onGround = true;

		// tuned to match Minecraft-like feel
		this.walk = 4.317;
		this.sprint = 5.612;
		this.jumpV = 8.4;
		this.g = 32.0;

		this.accelGround = 42.0;
		this.accelAir = 12.0;
		this.frictionGround = 18.0;
		this.frictionAir = 1.2;

		this.sense = 0.0022;

		this._wantJump = false;
	}

	onMouseMove(dx, dy) {
		this.yaw -= dx * this.sense;
		this.pitch -= dy * this.sense;
		this.pitch = clamp(this.pitch, -Math.PI / 2 + 0.001, Math.PI / 2 - 0.001);
	}

	setJumpPressed(v) {
		if (v) this._wantJump = true;
	}

	update(dt, input, allowMove) {
		const prev = this.pos.clone();

		const keys = input || {};
		const fwd = (keys.w ? 1 : 0) + (keys.s ? -1 : 0);
		const str = (keys.d ? 1 : 0) + (keys.a ? -1 : 0);

		let wish = new THREE.Vector3(0, 0, 0);
		if (allowMove) {
			if (fwd !== 0 || str !== 0) {
				const sin = Math.sin(this.yaw);
				const cos = Math.cos(this.yaw);

				const fx = sin;
				const fz = cos;
				const rx = cos;
				const rz = -sin;

				wish.x = fx * fwd + rx * str;
				wish.z = fz * fwd + rz * str;
				wish.normalize();
			}
		}

		const moving = wish.lengthSq() > 0;
		const max = allowMove && keys.ctrl && moving ? this.sprint : this.walk;

		const accel = this.onGround ? this.accelGround : this.accelAir;

		if (moving) {
			const dx = wish.x * max;
			const dz = wish.z * max;
			this.vel.x = approach(this.vel.x, dx, accel * dt);
			this.vel.z = approach(this.vel.z, dz, accel * dt);
		} else {
			const fr = this.onGround ? this.frictionGround : this.frictionAir;
			const k = Math.exp(-fr * dt);
			this.vel.x *= k;
			this.vel.z *= k;
			if (Math.abs(this.vel.x) < 0.0008) this.vel.x = 0;
			if (Math.abs(this.vel.z) < 0.0008) this.vel.z = 0;
		}

		if (allowMove && this._wantJump && this.onGround) {
			this.vel.y = this.jumpV;
			this.onGround = false;
		}
		this._wantJump = false;

		this.vel.y -= this.g * dt;

		this.pos.x += this.vel.x * dt;
		this.pos.y += this.vel.y * dt;
		this.pos.z += this.vel.z * dt;

		// ground
		const groundY = 1.0;
		if (this.pos.y <= groundY) {
			this.pos.y = groundY;
			this.vel.y = 0;
			this.onGround = true;
		} else {
			this.onGround = false;
		}

		// shoreline block
		if (!this.world.isAllowedXZ(this.pos.x, this.pos.z, this.r)) {
			this.pos.x = prev.x;
			this.pos.z = prev.z;
			this.vel.x = 0;
			this.vel.z = 0;
		}

		// camera
		this.camera.position.set(this.pos.x, this.pos.y + this.eye, this.pos.z);
		this.camera.rotation.order = 'YXZ';
		this.camera.rotation.y = this.yaw;
		this.camera.rotation.x = this.pitch;
		this.camera.rotation.z = 0;
	}
}
