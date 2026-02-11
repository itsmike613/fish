import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class World {
	constructor(renderer) {
		this.scene = renderer.scene;

		this.tileSize = 1;
		this.islandDiameterTiles = 12;
		this.islandRadius = (this.islandDiameterTiles * this.tileSize) / 2; // 6
		this.waterLevel = 0;
		this.groundLevel = 0.06;

		this.textures = {
			sand: null,
			water: null
		};

		this.island = null;
		this.water = null;

		this._loadTextures().then(() => {
			this._buildIsland();
			this._buildWater();
		});
	}

	async _loadTextures() {
		const loader = new THREE.TextureLoader();

		const loadOne = (url) =>
			new Promise((resolve, reject) => {
				loader.load(
					url,
					(tex) => resolve(tex),
					undefined,
					(err) => reject(err)
				);
			});

		const sand = await loadOne("./Source/Assets/Terrain/sand.png");
		sand.colorSpace = THREE.SRGBColorSpace;
		sand.wrapS = THREE.RepeatWrapping;
		sand.wrapT = THREE.RepeatWrapping;
		sand.repeat.set(6, 6);
		sand.anisotropy = 4;
		sand.magFilter = THREE.NearestFilter;
		sand.minFilter = THREE.NearestMipMapNearestFilter;

		const water = await loadOne("./Source/Assets/Terrain/water.png");
		water.colorSpace = THREE.SRGBColorSpace;
		water.wrapS = THREE.RepeatWrapping;
		water.wrapT = THREE.RepeatWrapping;
		water.repeat.set(140, 140);
		water.anisotropy = 4;
		water.magFilter = THREE.NearestFilter;
		water.minFilter = THREE.NearestMipMapNearestFilter;

		this.textures.sand = sand;
		this.textures.water = water;
	}

	_buildIsland() {
		const geometry = new THREE.CircleGeometry(this.islandRadius, 64);
		// Rotate so it lies flat in XZ
		geometry.rotateX(-Math.PI / 2);

		const material = new THREE.MeshStandardMaterial({
			map: this.textures.sand,
			roughness: 0.96,
			metalness: 0.0
		});

		const island = new THREE.Mesh(geometry, material);
		island.position.y = this.groundLevel;
		island.receiveShadow = false;
		this.scene.add(island);

		this.island = island;
	}

	_buildWater() {
		const size = 2000;
		const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
		geometry.rotateX(-Math.PI / 2);

		const material = new THREE.MeshPhongMaterial({
			map: this.textures.water,
			color: new THREE.Color(0x5cc6ff),
			transparent: true,
			opacity: 0.86,
			shininess: 90,
			specular: new THREE.Color(0xffffff)
		});

		const water = new THREE.Mesh(geometry, material);
		water.position.y = this.waterLevel;
		water.renderOrder = 0;
		this.scene.add(water);

		this.water = water;
	}

	update(dt) {
		if (this.water?.material?.map) {
			// Simple endless movement (shader-pack vibe without postprocessing)
			const tex = this.water.material.map;
			tex.offset.x = (tex.offset.x + dt * 0.02) % 1;
			tex.offset.y = (tex.offset.y + dt * 0.015) % 1;
		}
	}

	isPointOverWater(x, z) {
		const r = Math.sqrt(x * x + z * z);
		return r > this.islandRadius;
	}

	clampToIsland(nextX, nextZ, currentX, currentZ) {
		// Prevent entering water: slide along boundary (no teleport)
		const r = Math.sqrt(nextX * nextX + nextZ * nextZ);
		const limit = this.islandRadius - 0.25;
		if (r <= limit) return { x: nextX, z: nextZ, blocked: false };

		// If crossing boundary, project onto circle at limit, then try preserve tangential movement.
		const angle = Math.atan2(nextZ, nextX);
		const clampedX = Math.cos(angle) * limit;
		const clampedZ = Math.sin(angle) * limit;

		// Tangential slide: keep component perpendicular to radius (approx)
		const dx = nextX - currentX;
		const dz = nextZ - currentZ;
		const rx = clampedX;
		const rz = clampedZ;
		const rr = Math.sqrt(rx * rx + rz * rz) || 1;
		const nx = rx / rr;
		const nz = rz / rr;

		const dot = dx * nx + dz * nz; // radial component
		const tx = dx - dot * nx;
		const tz = dz - dot * nz;

		// Apply tangential only (small)
		const slidX = clampedX + tx;
		const slidZ = clampedZ + tz;
		const slidR = Math.sqrt(slidX * slidX + slidZ * slidZ);

		if (slidR > limit) {
			const a2 = Math.atan2(slidZ, slidX);
			return { x: Math.cos(a2) * limit, z: Math.sin(a2) * limit, blocked: true };
		}

		return { x: slidX, z: slidZ, blocked: true };
	}
}
