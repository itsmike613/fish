import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { EffectComposer } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js";

export class Renderer {
	constructor({ state }) {
		this.state = state;
		this.canvas = document.getElementById("game");
		this.scene = new THREE.Scene();
		this.scene.fog = new THREE.FogExp2(0x87c7ff, 0.0006);
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 2200);
		this.camera.position.set(0, 1.7, 0);
		this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
		this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.05;
		this.sun = new THREE.DirectionalLight(0xfff1d0, 1.35);
		this.sun.position.set(6, 10, 4);
		this.scene.add(this.sun);
		this.ambient = new THREE.HemisphereLight(0xbfe8ff, 0xffcfa6, 0.75);
		this.scene.add(this.ambient);
		this.composer = new EffectComposer(this.renderer);
		this.composer.addPass(new RenderPass(this.scene, this.camera));
		this.bloom = new UnrealBloomPass(
			new THREE.Vector2(window.innerWidth, window.innerHeight),
			0.25,
			0.55,
			0.12
		);
		this.composer.addPass(this.bloom);

		this._defaultFogColor = new THREE.Color(0x87c7ff);
		this._underFogColor = new THREE.Color(0x2aa7c9);

		window.addEventListener("resize", () => this._onResize());
	}

	_onResize() {
		const w = window.innerWidth;
		const h = window.innerHeight;
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(w, h);
		this.composer.setSize(w, h);
	}

	setCameraPose(pos, yaw, pitch) {
		this.camera.position.set(pos.x, pos.y, pos.z);
		this.camera.rotation.set(pitch, yaw, 0, "YXZ");
	}

	update() {
		const waterY = this.state.world.waterY;
		const underwater = this.camera.position.y < (waterY - 0.05);

		if (underwater) {
			this.scene.fog.color.copy(this._underFogColor);
			this.scene.fog.density = 0.0085;
			this.renderer.toneMappingExposure = 0.95;
		} else {
			this.scene.fog.color.copy(this._defaultFogColor);
			this.scene.fog.density = 0.0006;
			this.renderer.toneMappingExposure = 1.05;
		}
	}

	render() {
		this.composer.render();
	}
}