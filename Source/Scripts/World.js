import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class World {
	/**
	 * @param {object} deps
	 * @param {import("./Events.js").Events} deps.events
	 * @param {any} deps.state
	 * @param {import("./Renderer.js").Renderer} deps.renderer
	 */
	constructor({ events, state, renderer }) {
		this.events = events;
		this.state = state;
		this.renderer = renderer;
		this.scene = renderer.scene;

		this.center = new THREE.Vector3(0, 0, 0);

		this._loader = new THREE.TextureLoader();

		this._sandTex = this._loader.load("./Source/Assets/Terrain/sand.png");
		this._sandTex.colorSpace = THREE.SRGBColorSpace;
		this._sandTex.wrapS = this._sandTex.wrapT = THREE.RepeatWrapping;
		this._sandTex.repeat.set(6, 6);

		this._waterTex = this._loader.load("./Source/Assets/Terrain/water.png");
		this._waterTex.colorSpace = THREE.SRGBColorSpace;
		this._waterTex.wrapS = this._waterTex.wrapT = THREE.RepeatWrapping;
		this._waterTex.repeat.set(64, 64);

		this._buildIsland();
		this._buildWater();

		// Shared raycast target for Fishing (water mesh only)
		this.events.emit("world:ready", {
			waterMesh: this.waterMesh,
			islandRadius: this.state.world.islandRadius,
			shorelineRadius: this.state.world.shorelineRadius,
			waterY: this.state.world.waterY,
		});
	}

	_buildIsland() {
		const r = this.state.world.islandRadius;
		const y = this.state.world.sandY;

		const geo = new THREE.CircleGeometry(r, 64);
		geo.rotateX(-Math.PI / 2);

		const mat = new THREE.MeshStandardMaterial({
			map: this._sandTex,
			roughness: 1.0,
			metalness: 0.0,
		});

		this.islandMesh = new THREE.Mesh(geo, mat);
		this.islandMesh.position.y = y;
		this.islandMesh.receiveShadow = false;
		this.scene.add(this.islandMesh);
	}

	_buildWater() {
		const y = this.state.world.waterY;

		const geo = new THREE.PlaneGeometry(2000, 2000, 1, 1);
		geo.rotateX(-Math.PI / 2);

		// Transparent, vibrant reflective-ish water (cheap)
		const mat = new THREE.MeshStandardMaterial({
			map: this._waterTex,
			color: new THREE.Color(0x35c8ff),
			transparent: true,
			opacity: 0.72,
			roughness: 0.18,
			metalness: 0.10,
			depthWrite: false, // keep "endless surface" feel
		});

		this.waterMesh = new THREE.Mesh(geo, mat);
		this.waterMesh.position.y = y;
		this.scene.add(this.waterMesh);
	}

	/**
	 * Shoreline boundary helper.
	 * Keep player inside shoreline radius (no entering water).
	 */
	clampToShoreline(pos) {
		const maxR = this.state.world.shorelineRadius;
		const dx = pos.x - this.center.x;
		const dz = pos.z - this.center.z;
		const d2 = dx * dx + dz * dz;
		if (d2 <= maxR * maxR) return pos;

		const d = Math.sqrt(d2) || 1;
		const nx = dx / d;
		const nz = dz / d;
		pos.x = this.center.x + nx * maxR;
		pos.z = this.center.z + nz * maxR;
		return pos;
	}

	update(dt) {
		// Animate water texture offset for motion
		const t = this.state.time.now;
		this._waterTex.offset.x = (t * 0.008) % 1;
		this._waterTex.offset.y = (t * 0.006) % 1;

		// Subtle shimmer with small color pulse (warm beach vibe)
		const pulse = 0.04 * Math.sin(t * 0.7);
		this.waterMesh.material.opacity = 0.70 + pulse;
	}
}
