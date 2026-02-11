import { THREE } from './Renderer.js';

export class Player {
	constructor(state, events, renderer, world) {
		this.s = state;
		this.e = events;
		this.ren = renderer;
		this.world = world;

		this.yaw = 0;
		this.pitch = 0;

		this.keys = new Set();
		this.locked = false;
		this.enabled = true;

		this.speed = 4.2;
		this.sprint = 6.4;
		this.jumpV = 6.0;
		this.g = 18.5;

		this._bind();
	}

	_bind() {
		const canvas = this.ren.r.domElement;

		canvas.addEventListener('click', () => {
			if (!this.s.ui.invOpen) canvas.requestPointerLock();
		});

		document.addEventListener('pointerlockchange', () => {
			this.locked = (document.pointerLockElement === canvas);
		});

		document.addEventListener('mousemove', (ev) => {
			if (!this.locked || this.s.ui.invOpen) return;
			const sx = ev.movementX || 0;
			const sy = ev.movementY || 0;

			this.yaw -= sx * 0.0022;
			this.pitch -= sy * 0.0022;
			const lim = Math.PI / 2 - 0.02;
			this.pitch = Math.max(-lim, Math.min(lim, this.pitch));

			this._applyCamRot();
		});

		window.addEventListener('keydown', (ev) => {
			this.keys.add(ev.code);
			if (ev.code === 'Space') ev.preventDefault();
		});

		window.addEventListener('keyup', (ev) => {
			this.keys.delete(ev.code);
		});

		this.e.on('ui:cursor', (on) => {
			// when inventory open -> show cursor, stop mouse look + movement
			this.enabled = !on;
			if (on && this.locked) document.exitPointerLock();
		});
	}

	_applyCamRot() {
		this.ren.cam.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
	}

	update(dt) {
		// keep camera synced to state
		const p = this.s.player.pos;
		const v = this.s.player.vel;

		if (!this.enabled) {
			// still clamp to island if somehow needed
			this.world.clampToIsland(p);
			this.ren.cam.position.set(p.x, p.y, p.z);
			return;
		}

		const forward = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0);
		const strafe = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);

		const sprinting = this.keys.has('ControlLeft') || this.keys.has('ControlRight');
		const sp = sprinting ? this.sprint : this.speed;

		// planar movement in camera yaw space
		const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
		let mx = 0, mz = 0;
		if (forward || strafe) {
			mx = (strafe * cos + forward * sin);
			mz = (forward * cos - strafe * sin);
			const len = Math.hypot(mx, mz) || 1;
			mx /= len; mz /= len;
		}

		v.x = mx * sp;
		v.z = mz * sp;

		// jump
		if (this.s.player.grounded && this.keys.has('Space')) {
			v.y = this.jumpV;
			this.s.player.grounded = false;
		}

		// gravity
		v.y -= this.g * dt;

		// integrate
		p.x += v.x * dt;
		p.y += v.y * dt;
		p.z += v.z * dt;

		// ground plane
		const eye = 1.7;
		if (p.y < eye) {
			p.y = eye;
			v.y = 0;
			this.s.player.grounded = true;
		}

		// shoreline boundary
		this.world.clampToIsland(p);

		this.ren.cam.position.set(p.x, p.y, p.z);
	}

	getRay() {
		const ray = new THREE.Raycaster();
		ray.setFromCamera(new THREE.Vector2(0, 0), this.ren.cam);
		return ray.ray;
	}
}
