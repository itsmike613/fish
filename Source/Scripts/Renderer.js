import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class Renderer {
	constructor(canvas) {
		this.canvas = canvas;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x7fb7ff);

		this.camera = new THREE.PerspectiveCamera(
			75,
			1,
			0.06,
			2000
		);

		this.renderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: false
		});

		this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.18;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;

		// Beach vibe lighting
		const sun = new THREE.DirectionalLight(0xfff0cf, 1.25);
		sun.position.set(12, 18, 8);
		this.scene.add(sun);

		const sky = new THREE.HemisphereLight(0x9fd2ff, 0xffd6a5, 0.85);
		this.scene.add(sky);

		// Warm distance haze
		this.surfaceFog = new THREE.FogExp2(0x7fb7ff, 0.006);
		this.underwaterFog = new THREE.FogExp2(0x2aa7c7, 0.045);
		this.scene.fog = this.surfaceFog;

		window.addEventListener("resize", () => this.resize());
		this.resize();
	}

	resize() {
		const w = this.canvas.clientWidth;
		const h = this.canvas.clientHeight;
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(w, h, false);
	}

	setUnderwater(isUnderwater) {
		if (isUnderwater) {
			this.scene.background.set(0x2aa7c7);
			this.scene.fog = this.underwaterFog;
			this.renderer.toneMappingExposure = 0.95;
		} else {
			this.scene.background.set(0x7fb7ff);
			this.scene.fog = this.surfaceFog;
			this.renderer.toneMappingExposure = 1.18;
		}
	}

	render() {
		this.renderer.render(this.scene, this.camera);
	}
}
