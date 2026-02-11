// fish/Source/Scripts/Renderer.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { set } from './State.js';

export default class Renderer {
	constructor() {
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 600);
		this.r = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
		this.r.outputColorSpace = THREE.SRGBColorSpace;
		this.r.toneMapping = THREE.ACESFilmicToneMapping;
		this.r.toneMappingExposure = 1.15;

		this.scene.background = new THREE.Color(0xaad7ff);
		this.scene.fog = new THREE.FogExp2(0xaad7ff, 0.010);

		const amb = new THREE.AmbientLight(0xffffff, 0.62);
		this.scene.add(amb);

		const sun = new THREE.DirectionalLight(0xffffff, 0.95);
		sun.position.set(30, 60, 20);
		this.scene.add(sun);

		this.r.domElement.id = 'c';
		this.r.domElement.tabIndex = 0;
		document.body.appendChild(this.r.domElement);

		this._onResize = () => this.resize();
		window.addEventListener('resize', this._onResize, { passive: true });

		this._onLockChange = () => {
			set('pointerLocked', document.pointerLockElement === this.r.domElement);
		};
		document.addEventListener('pointerlockchange', this._onLockChange);
	}

	resize() {
		const w = window.innerWidth;
		const h = window.innerHeight;
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.r.setSize(w, h, false);
		this.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	}

	render() {
		this.r.render(this.scene, this.camera);
	}

	lockPointer() {
		this.r.domElement.requestPointerLock();
	}

	unlockPointer() {
		if (document.pointerLockElement === this.r.domElement) document.exitPointerLock();
	}
}
