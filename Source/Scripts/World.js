// fish/Source/Scripts/World.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

function loadTex(url) {
	const loader = new THREE.TextureLoader();
	return new Promise((resolve, reject) => {
		loader.load(
			url,
			(t) => resolve(t),
			undefined,
			(e) => reject(e)
		);
	});
}

export default class World {
	constructor(scene) {
		this.scene = scene;

		this.waterY = 0.8;
		this.floorY = -20;

		this.size = 12;
		this.half = this.size / 2;
		this.radius = 5.8;

		this.tiles = new Set();
		this.sand = null;
		this.water = null;
		this.floor = null;

		this._sandTex = null;
		this._waterTex = null;
		this._t = 0;
	}

	async init() {
		this._sandTex = await loadTex('./Source/Assets/Terrain/sand.png');
		this._waterTex = await loadTex('./Source/Assets/Terrain/water.png');

		for (const t of [this._sandTex, this._waterTex]) {
			t.colorSpace = THREE.SRGBColorSpace;
			t.wrapS = THREE.RepeatWrapping;
			t.wrapT = THREE.RepeatWrapping;
			t.magFilter = THREE.NearestFilter;
			t.minFilter = THREE.NearestMipMapNearestFilter;
		}

		this._buildIsland();
		this._buildWater();
		this._buildFloor();
	}

	_buildIsland() {
		const geom = new THREE.BoxGeometry(1, 1, 1);
		const mat = new THREE.MeshStandardMaterial({
			map: this._sandTex,
			roughness: 1.0,
			metalness: 0.0,
		});

		const centers = [];
		for (let iz = 0; iz < this.size; iz++) {
			for (let ix = 0; ix < this.size; ix++) {
				const cx = (ix - (this.half - 0.5));
				const cz = (iz - (this.half - 0.5));
				const d = Math.hypot(cx, cz);
				if (d <= this.radius) {
					const key = `${ix},${iz}`;
					this.tiles.add(key);
					centers.push([cx, cz]);
				}
			}
		}

		const mesh = new THREE.InstancedMesh(geom, mat, centers.length);
		mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
		mesh.frustumCulled = true;

		const m = new THREE.Matrix4();
		const p = new THREE.Vector3();
		const q = new THREE.Quaternion();
		const s = new THREE.Vector3(1, 1, 1);

		for (let i = 0; i < centers.length; i++) {
			p.set(centers[i][0], 0.5, centers[i][1]);
			m.compose(p, q, s);
			mesh.setMatrixAt(i, m);
		}
		mesh.instanceMatrix.needsUpdate = true;

		this.sand = mesh;
		this.scene.add(mesh);
	}

	_buildWater() {
		const geom = new THREE.PlaneGeometry(1200, 1200, 1, 1);
		this._waterTex.repeat.set(220, 220);

		const mat = new THREE.MeshStandardMaterial({
			map: this._waterTex,
			roughness: 0.25,
			metalness: 0.0,
			transparent: true,
			opacity: 0.62,
			depthWrite: false,
		});

		const mesh = new THREE.Mesh(geom, mat);
		mesh.rotation.x = -Math.PI / 2;
		mesh.position.y = this.waterY;
		mesh.frustumCulled = true;

		this.water = mesh;
		this.scene.add(mesh);
	}

	_buildFloor() {
		const geom = new THREE.PlaneGeometry(1400, 1400, 1, 1);
		const mat = new THREE.MeshLambertMaterial({
			color: 0x1aa9c2,
			transparent: true,
			opacity: 0.9,
		});

		const mesh = new THREE.Mesh(geom, mat);
		mesh.rotation.x = -Math.PI / 2;
		mesh.position.y = this.floorY;
		this.floor = mesh;
		this.scene.add(mesh);
	}

	update(dt) {
		this._t += dt;
		if (this.water && this.water.material && this.water.material.map) {
			const t = this.water.material.map;
			t.offset.x = (this._t * 0.012) % 1;
			t.offset.y = (this._t * 0.008) % 1;
		}
	}

	_toTile(x, z) {
		const ix = Math.floor(x + this.half);
		const iz = Math.floor(z + this.half);
		return [ix, iz];
	}

	isSandAt(x, z) {
		const [ix, iz] = this._toTile(x, z);
		if (ix < 0 || ix >= this.size || iz < 0 || iz >= this.size) return false;
		return this.tiles.has(`${ix},${iz}`);
	}

	isAllowedXZ(x, z, r) {
		// prevent entering water by ensuring the player's radius stays over sand
		if (!this.isSandAt(x, z)) return false;
		if (!this.isSandAt(x + r, z)) return false;
		if (!this.isSandAt(x - r, z)) return false;
		if (!this.isSandAt(x, z + r)) return false;
		if (!this.isSandAt(x, z - r)) return false;
		return true;
	}

	isWaterAt(x, z) {
		return !this.isSandAt(x, z);
	}

	getRayTargets() {
		return [this.sand, this.water];
	}
}
