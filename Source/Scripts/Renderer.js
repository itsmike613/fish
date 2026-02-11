import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';

export class Renderer {
	constructor(state, events) {
		this.s = state;
		this.e = events;

		const canvas = document.querySelector('#c');
		this.r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
		this.r.setPixelRatio(Math.min(devicePixelRatio, 2));
		this.r.setSize(innerWidth, innerHeight, false);
		this.r.outputColorSpace = THREE.SRGBColorSpace;
		this.r.toneMapping = THREE.ACESFilmicToneMapping;
		this.r.toneMappingExposure = 1.05;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x7fd0ff);

		this.cam = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 2000);
		this.cam.position.set(0, 1.7, 0);

		// warm beach lighting
		this.scene.add(new THREE.HemisphereLight(0xfff2cc, 0x2a3b55, 0.95));
		const sun = new THREE.DirectionalLight(0xfff1d6, 1.05);
		sun.position.set(40, 60, 20);
		sun.castShadow = false;
		this.scene.add(sun);

		// subtle bloom (lightweight)
		this.composer = new EffectComposer(this.r);
		this.composer.addPass(new RenderPass(this.scene, this.cam));
		const bloom = new UnrealBloomPass(
			new THREE.Vector2(innerWidth, innerHeight),
			0.28,   // strength
			0.8,    // radius
			0.92    // threshold
		);
		this.composer.addPass(bloom);

		window.addEventListener('resize', () => this._resize());
	}

	_resize() {
		this.cam.aspect = innerWidth / innerHeight;
		this.cam.updateProjectionMatrix();
		this.r.setSize(innerWidth, innerHeight, false);
		this.composer.setSize(innerWidth, innerHeight);
	}

	setFog(isUnder) {
		if (isUnder) {
			this.scene.fog = new THREE.FogExp2(0x2cc9ff, 0.06);
			this.scene.background = new THREE.Color(0x2cc9ff);
		} else {
			this.scene.fog = new THREE.FogExp2(0x7fd0ff, 0.012);
			this.scene.background = new THREE.Color(0x7fd0ff);
		}
	}

	render() {
		this.composer.render();
	}
}

export { THREE };
