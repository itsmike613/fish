import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class Player {
	/**
	 * @param {object} deps
	 * @param {import("./Events.js").Events} deps.events
	 * @param {any} deps.state
	 * @param {import("./Renderer.js").Renderer} deps.renderer
	 * @param {import("./World.js").World} deps.world
	 */
	constructor({ events, state, renderer, world }) {
		this.events = events;
		this.state = state;
		this.renderer = renderer;
		this.world = world;

		this.yaw = 0;
		this.pitch = 0;

		this._keys = new Set();
		this._wantJump = false;

		this._tmpForward = new THREE.Vector3();
		this._tmpRight = new THREE.Vector3();

		this._bind();
	}

	_bind() {
		const canvas = document.getElementById("game");

		document.addEventListener("contextmenu", (e) => e.preventDefault());

		canvas.addEventListener("click", () => {
			if (this.state.ui.inventoryOpen) return;
			canvas.requestPointerLock();
		});

		document.addEventListener("pointerlockchange", () => {
			this.state.ui.pointerLocked = (document.pointerLockElement === canvas);
			this.events.emit("ui:pointerLock", { locked: this.state.ui.pointerLocked });
		});

		document.addEventListener("mousemove", (e) => {
			if (!this.state.ui.pointerLocked) return;
			if (this.state.ui.inventoryOpen) return;

			const mx = e.movementX || 0;
			const my = e.movementY || 0;

			const sens = 0.0022;
			this.yaw -= mx * sens;
			this.pitch -= my * sens;

			const lim = Math.PI / 2 - 0.01;
			if (this.pitch > lim) this.pitch = lim;
			if (this.pitch < -lim) this.pitch = -lim;
		});

		window.addEventListener("keydown", (e) => {
			// inventory toggling is handled in UI (which emits events)
			this._keys.add(e.code);
			if (e.code === "Space") this._wantJump = true;
		});

		window.addEventListener("keyup", (e) => {
			this._keys.delete(e.code);
		});

		// Inventory toggle event (pause movement + release lock)
		this.events.on("ui:inventory", ({ open }) => {
			if (open) {
				if (document.pointerLockElement) document.exitPointerLock();
			}
		});
	}

	getCameraRay() {
		// For Fishing: origin at camera position
		return {
			origin: this.renderer.camera.position.clone(),
			direction: new THREE.Vector3(0, 0, -1).applyQuaternion(this.renderer.camera.quaternion).normalize(),
		};
	}

	update(dt) {
		// Pause movement when inventory open
		if (this.state.ui.inventoryOpen) {
			// still update camera pose (to keep stable)
			this.renderer.setCameraPose(this.state.player.position, this.yaw, this.pitch);
			return;
		}

		const p = this.state.player.position;
		const v = this.state.player.velocity;

		const onGroundY = this.state.world.sandY + 1.7; // eye height above sand
		const groundEps = 0.02;

		// Movement speeds
		const walk = 4.4;
		const sprint = 6.6;
		const speed = this._keys.has("ControlLeft") || this._keys.has("ControlRight") ? sprint : walk;

		// Direction vectors from yaw
		const cy = Math.cos(this.yaw);
		const sy = Math.sin(this.yaw);

		// forward in XZ
		this._tmpForward.set(-sy, 0, -cy);
		this._tmpRight.set(cy, 0, -sy);

		let ax = 0, az = 0;
		if (this._keys.has("KeyW")) { ax += this._tmpForward.x; az += this._tmpForward.z; }
		if (this._keys.has("KeyS")) { ax -= this._tmpForward.x; az -= this._tmpForward.z; }
		if (this._keys.has("KeyA")) { ax -= this._tmpRight.x; az -= this._tmpRight.z; }
		if (this._keys.has("KeyD")) { ax += this._tmpRight.x; az += this._tmpRight.z; }

		// Normalize input
		const mag = Math.hypot(ax, az);
		if (mag > 0) { ax /= mag; az /= mag; }

		// Horizontal velocity (very simple FPS)
		const accel = 40;
		v.x += ax * accel * dt;
		v.z += az * accel * dt;

		// Friction
		const friction = 14;
		v.x -= v.x * friction * dt;
		v.z -= v.z * friction * dt;

		// Clamp horizontal speed
		const hv = Math.hypot(v.x, v.z);
		const maxHV = speed;
		if (hv > maxHV) {
			const s = maxHV / (hv || 1);
			v.x *= s; v.z *= s;
		}

		// Gravity
		v.y -= 20.0 * dt;

		// Jump
		const onGround = Math.abs(p.y - onGroundY) < groundEps;
		this.state.player.onGround = onGround;
		if (this._wantJump && onGround) {
			v.y = 7.2;
		}
		this._wantJump = false;

		// Integrate
		let nx = p.x + v.x * dt;
		let ny = p.y + v.y * dt;
		let nz = p.z + v.z * dt;

		// Ground collision
		if (ny < onGroundY) {
			ny = onGroundY;
			v.y = 0;
		}

		// Shoreline boundary clamp (no water entry)
		const tmp = { x: nx, y: ny, z: nz };
		this.world.clampToShoreline(tmp);
		nx = tmp.x; nz = tmp.z;

		p.x = nx; p.y = ny; p.z = nz;

		// Apply camera
		this.renderer.setCameraPose(p, this.yaw, this.pitch);
	}
}
