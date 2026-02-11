import { THREE } from './Renderer.js';

export class World {
	constructor(state, events, renderer) {
		this.s = state;
		this.e = events;
		this.ren = renderer;

		this.grp = new THREE.Group();
		this.ren.scene.add(this.grp);

		this.tex = new THREE.TextureLoader();

		this.island = null;
		this.water = null;

		this._mkIsland();
		this._mkWater();
	}

	_mkIsland() {
		const sand = this.tex.load('./Source/Assets/Terrain/sand.png');
		sand.colorSpace = THREE.SRGBColorSpace;
		sand.wrapS = sand.wrapT = THREE.RepeatWrapping;
		sand.repeat.set(12, 12); // 12 tiles across diameter

		const geo = new THREE.CircleGeometry(this.s.world.islandR, 64);
		geo.rotateX(-Math.PI / 2);

		const mat = new THREE.MeshStandardMaterial({
			map: sand,
			roughness: 1.0,
			metalness: 0.0
		});

		const m = new THREE.Mesh(geo, mat);
		m.position.y = 0.02; // sits just above water
		m.receiveShadow = false;

		this.island = m;
		this.grp.add(m);
	}

	_mkWater() {
		const water = this.tex.load('./Source/Assets/Terrain/water.png');
		water.colorSpace = THREE.SRGBColorSpace;
		water.wrapS = water.wrapT = THREE.RepeatWrapping;
		water.repeat.set(220, 220);

		const geo = new THREE.PlaneGeometry(2000, 2000, 1, 1);
		geo.rotateX(-Math.PI / 2);

		const mat = new THREE.MeshPhongMaterial({
			map: water,
			transparent: true,
			opacity: 0.78,
			shininess: 110,
			specular: new THREE.Color(0xffffff),
			depthWrite: false
		});

		const m = new THREE.Mesh(geo, mat);
		m.position.y = this.s.world.waterY;
		this.water = m;
		this.grp.add(m);

		this.waterTex = water;
		this.waterMat = mat;
	}

	// shoreline block: keep player inside island radius
	clampToIsland(pos) {
		const r = this.s.world.islandR - this.s.world.shorePad;
		const x = pos.x, z = pos.z;
		const d = Math.hypot(x, z);
		if (d > r) {
			const k = r / d;
			pos.x = x * k;
			pos.z = z * k;
			return true;
		}
		return false;
	}

	isWaterPoint(p) {
		// water is anywhere outside the sand disc
		const d = Math.hypot(p.x, p.z);
		return d > this.s.world.islandR + 0.01;
	}

	// ray from camera, intersect y=waterY plane
	rayToWater(ray) {
		const y = this.s.world.waterY;
		const o = ray.origin;
		const d = ray.direction;
		if (Math.abs(d.y) < 1e-5) return null;
		const t = (y - o.y) / d.y;
		if (t <= 0) return null;

		const hit = new THREE.Vector3(
			o.x + d.x * t,
			y,
			o.z + d.z * t
		);

		if (!this.isWaterPoint(hit)) return null;
		return hit;
	}

	update(dt) {
		// animate water texture for "moving reflective water"
		const t = this.waterTex;
		t.offset.x = (t.offset.x + dt * 0.018) % 1;
		t.offset.y = (t.offset.y + dt * 0.011) % 1;

		// slight shimmer by modulating opacity
		this.waterMat.opacity = 0.76 + Math.sin(performance.now() * 0.0012) * 0.03;
	}
}