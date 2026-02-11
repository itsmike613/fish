// fish/Source/Scripts/Background.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

function makeRenderer(container) {
	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.domElement.style.width = "100%";
	renderer.domElement.style.height = "100%";
	renderer.domElement.style.display = "block";
	renderer.domElement.style.position = "absolute";
	renderer.domElement.style.inset = "0";
	renderer.domElement.style.pointerEvents = "none";
	container.appendChild(renderer.domElement);
	return renderer;
}

function makeSeagull(material) {
	const group = new THREE.Group();

	const bodyGeo = new THREE.ConeGeometry(0.18, 0.8, 4, 1);
	const body = new THREE.Mesh(bodyGeo, material);
	body.rotation.x = Math.PI * 0.5;
	group.add(body);

	const headGeo = new THREE.SphereGeometry(0.16, 6, 4);
	const head = new THREE.Mesh(headGeo, material);
	head.position.set(0, 0.12, 0.34);
	group.add(head);

	const wingGeo = new THREE.BoxGeometry(0.95, 0.05, 0.22);

	const wingL = new THREE.Mesh(wingGeo, material);
	wingL.position.set(-0.55, 0.06, 0.08);
	wingL.geometry.translate(0.45, 0, 0);
	group.add(wingL);

	const wingR = new THREE.Mesh(wingGeo, material);
	wingR.position.set(0.55, 0.06, 0.08);
	wingR.geometry.translate(-0.45, 0, 0);
	group.add(wingR);

	const tailGeo = new THREE.BoxGeometry(0.20, 0.05, 0.25);
	const tail = new THREE.Mesh(tailGeo, material);
	tail.position.set(0, 0.03, -0.34);
	group.add(tail);

	return { group, wingL, wingR };
}

export class Background {
	constructor() {
		this.container = document.getElementById("background");

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x9fdcff);
		this.scene.fog = new THREE.Fog(0x9fdcff, 18, 220);

		this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
		this.camera.position.set(0, 8, 18);
		this.camera.lookAt(0, 0, 0);

		this.renderer = makeRenderer(this.container);

		const ambient = new THREE.AmbientLight(0xffffff, 0.55);
		this.scene.add(ambient);

		const dir = new THREE.DirectionalLight(0xffffff, 0.9);
		dir.position.set(-8, 16, 10);
		this.scene.add(dir);

		this.time = 0;

		this.initWater();
		this.initSeafloor();
		this.initSeagulls();

		window.addEventListener("resize", () => this.onResize());
		this.onResize();
	}

	initWater() {
		const geo = new THREE.PlaneGeometry(240, 240, 220, 220);

		const tex = new THREE.TextureLoader().load("./Source/Assets/Terrain/water.png");
		tex.wrapS = THREE.RepeatWrapping;
		tex.wrapT = THREE.RepeatWrapping;
		tex.repeat.set(18, 18);
		tex.colorSpace = THREE.SRGBColorSpace;

		const mat = new THREE.MeshPhongMaterial({
			color: 0x66cfff,
			map: tex,
			transparent: true,
			opacity: 0.42,
			shininess: 120,
			specular: new THREE.Color(0xffffff),
			depthWrite: false,
		});

		const mesh = new THREE.Mesh(geo, mat);
		mesh.rotation.x = -Math.PI / 2;
		mesh.position.y = 0;
		this.scene.add(mesh);

		const pos = geo.attributes.position;
		const base = new Float32Array(pos.count * 3);
		base.set(pos.array);

		this.water = { mesh, geo, mat, tex, pos, base };
	}

	initSeafloor() {
		const geo = new THREE.PlaneGeometry(420, 420, 1, 1);
		const mat = new THREE.MeshLambertMaterial({
			color: 0x00a4b8,
			transparent: true,
			opacity: 0.85,
		});

		const mesh = new THREE.Mesh(geo, mat);
		mesh.rotation.x = -Math.PI / 2;
		mesh.position.y = -20;
		this.scene.add(mesh);

		const hazeGeo = new THREE.PlaneGeometry(420, 420, 1, 1);
		const hazeMat = new THREE.MeshLambertMaterial({
			color: 0x00d6ff,
			transparent: true,
			opacity: 0.10,
			depthWrite: false,
		});

		const haze = new THREE.Mesh(hazeGeo, hazeMat);
		haze.rotation.x = -Math.PI / 2;
		haze.position.y = -8;
		this.scene.add(haze);
	}

	initSeagulls() {
		const mat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			roughness: 0.75,
			metalness: 0.05,
			flatShading: true,
		});

		this.gulls = [];
		const count = 9;

		for (let i = 0; i < count; i++) {
			const g = makeSeagull(mat);
			const radius = 20 + Math.random() * 28;
			const speed = 0.12 + Math.random() * 0.22;
			const height = 11 + Math.random() * 7;
			const angle = Math.random() * Math.PI * 2;
			const phase = Math.random() * Math.PI * 2;

			g.group.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
			g.group.scale.setScalar(1.15 + Math.random() * 0.55);
			this.scene.add(g.group);

			this.gulls.push({ ...g, radius, speed, height, angle, phase });
		}
	}

	onResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	update(dt) {
		this.time += dt;

		// camera drift
		const sway = Math.sin(this.time * 0.15) * 1.1;
		const bob = Math.sin(this.time * 0.22) * 0.35;
		this.camera.position.x = sway;
		this.camera.position.y = 8 + bob;
		this.camera.lookAt(0, 0, 0);

		// water wave + scroll
		const w = this.water;
		if (w) {
			w.tex.offset.x = (this.time * 0.012) % 1;
			w.tex.offset.y = (this.time * 0.018) % 1;

			const pos = w.pos;
			const arr = pos.array;
			const base = w.base;

			const t = this.time;
			const amp = 0.32;

			for (let i = 0; i < pos.count; i++) {
				const ix = i * 3;
				const x = base[ix + 0];
				const y = base[ix + 1];

				const a = Math.sin(t * 0.95 + x * 0.22 + y * 0.18);
				const b = Math.cos(t * 0.75 + x * 0.16 - y * 0.24);
				arr[ix + 2] = (a + b) * 0.5 * amp; // local Z -> world Y after rotation
			}

			pos.needsUpdate = true;
			w.geo.computeVertexNormals();
		}

		// gulls
		for (const g of this.gulls) {
			g.angle += g.speed * dt;
			const a = g.angle;

			const x = Math.cos(a) * g.radius;
			const z = Math.sin(a) * g.radius;
			const y = g.height + Math.sin(a * 2 + g.phase) * 0.6;

			g.group.position.set(x, y, z);
			g.group.rotation.y = -a + Math.PI / 2;

			const flap = Math.sin(this.time * 9.2 + g.phase) * 0.85;
			g.wingL.rotation.z = flap;
			g.wingR.rotation.z = -flap;
		}

		this.renderer.render(this.scene, this.camera);
	}
}
