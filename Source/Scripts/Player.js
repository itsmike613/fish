import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class Player {
	constructor(renderer, events, state, world) {
		this.renderer = renderer;
		this.events = events;
		this.state = state;
		this.world = world;

		this.camera = renderer.camera;
		this.camera.position.set(0, 1.7, 0);

		this.pitch = 0;
		this.yaw = 0;

		this.velocity = new THREE.Vector3(0, 0, 0);

		this.move = {
			forward: false,
			backward: false,
			left: false,
			right: false,
			sprint: false,
			jump: false
		};

		this.settings = {
			walkSpeed: 3.6,
			sprintSpeed: 6.2,
			jumpVelocity: 5.2,
			gravity: 14.5,
			mouseSensitivity: 0.0022
		};

		this.onGround = false;

		this._bindInput();
		this._bindPointerLock(renderer.canvas);
	}

	_bindPointerLock(canvas) {
		canvas.addEventListener("click", () => {
			if (this.state.ui.inventoryOpen) return;
			canvas.requestPointerLock();
		});

		document.addEventListener("pointerlockchange", () => {
			const locked = document.pointerLockElement === canvas;
			this.state.input.pointerLocked = locked;
			this.events.emit("pointerlock:change", { locked });
		});

		document.addEventListener("mousemove", (e) => {
			if (!this.state.input.pointerLocked) return;
			if (this.state.ui.inventoryOpen) return;

			this.yaw -= e.movementX * this.settings.mouseSensitivity;
			this.pitch -= e.movementY * this.settings.mouseSensitivity;

			const maxPitch = Math.PI / 2 - 0.02;
			this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
		});
	}

	_bindInput() {
		const setKey = (code, down) => {
			if (this.state.ui.inventoryOpen) return;

			if (code === "KeyW") this.move.forward = down;
			if (code === "KeyS") this.move.backward = down;
			if (code === "KeyA") this.move.left = down;
			if (code === "KeyD") this.move.right = down;
			if (code === "ControlLeft" || code === "ControlRight") this.move.sprint = down;

			if (code === "Space") {
				if (down) this.move.jump = true;
			}
		};

		window.addEventListener("keydown", (e) => setKey(e.code, true));
		window.addEventListener("keyup", (e) => setKey(e.code, false));
	}

	getForwardVector() {
		const v = new THREE.Vector3(0, 0, -1);
		v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
		return v;
	}

	getRightVector() {
		const v = new THREE.Vector3(1, 0, 0);
		v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
		return v;
	}

	getPosition() {
		return this.camera.position;
	}

	update(dt) {
		// Apply camera rotation
		this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");

		if (this.state.ui.inventoryOpen) {
			this.move.jump = false;
			this.velocity.x = 0;
			this.velocity.z = 0;
			return;
		}

		const speed = this.move.sprint ? this.settings.sprintSpeed : this.settings.walkSpeed;

		const forward = this.getForwardVector();
		const right = this.getRightVector();

		const dir = new THREE.Vector3(0, 0, 0);
		if (this.move.forward) dir.add(forward);
		if (this.move.backward) dir.sub(forward);
		if (this.move.right) dir.add(right);
		if (this.move.left) dir.sub(right);

		if (dir.lengthSq() > 0) dir.normalize();

		// Horizontal movement (velocity-like but minimal allocations)
		const desiredX = dir.x * speed;
		const desiredZ = dir.z * speed;

		const pos = this.camera.position;
		const nextX = pos.x + desiredX * dt;
		const nextZ = pos.z + desiredZ * dt;

		const clamped = this.world.clampToIsland(nextX, nextZ, pos.x, pos.z);
		pos.x = clamped.x;
		pos.z = clamped.z;

		// Gravity / jump
		this.velocity.y -= this.settings.gravity * dt;

		const groundY = this.world.groundLevel + 1.7;
		const nextY = pos.y + this.velocity.y * dt;

		if (nextY <= groundY) {
			pos.y = groundY;
			this.velocity.y = 0;
			this.onGround = true;
		} else {
			pos.y = nextY;
			this.onGround = false;
		}

		if (this.move.jump && this.onGround) {
			this.velocity.y = this.settings.jumpVelocity;
			this.onGround = false;
		}
		this.move.jump = false;

		// Write to shared state
		this.state.player.position.x = pos.x;
		this.state.player.position.y = pos.y;
		this.state.player.position.z = pos.z;
	}
}
