import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

export class Birds {
	/**
	 * @param {object} deps
	 * @param {any} deps.state
	 * @param {import("./Renderer.js").Renderer} deps.renderer
	 */
	constructor({ state, renderer }) {
		this.state = state;
		this.renderer = renderer;
		this.scene = renderer.scene;

		// Extremely lightweight: 1-2 simple "V" shapes using line segments
		const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });

		const makeGull = () => {
			const pts = [
				new THREE.Vector3(-0.18, 0, 0),
				new THREE.Vector3(0, 0.07, 0),
				new THREE.Vector3(0.18, 0, 0),
			];
			const geo = new THREE.BufferGeometry().setFromPoints(pts);
			const line = new THREE.Line(geo, mat);
			line.visible = false;
			return line;
		};

		this.gulls = [makeGull(), makeGull()];
		this.gulls.forEach(g => this.scene.add(g));

		this._active = false;
		this._nextSpawn = 3 + Math.random() * 6;
		this._t = 0;

		this._phase = 0;
	}

	update(dt) {
		this._t += dt;

		if (!this._active) {
			this._nextSpawn -= dt;
			if (this._nextSpawn <= 0) {
				this._active = true;
				this._phase = 0;
				this._nextSpawn = 6 + Math.random() * 10;

				const count = 1 + (Math.random() < 0.35 ? 1 : 0);
				for (let i = 0; i < this.gulls.length; i++) {
					this.gulls[i].visible = i < count;
				}
			}
			return;
		}

		// Fly a lazy circle around the island
		this._phase += dt * 0.35;
		const baseR = 7.0;
		const y = 5.2 + 0.4 * Math.sin(this._t * 1.3);

		for (let i = 0; i < this.gulls.length; i++) {
			const g = this.gulls[i];
			if (!g.visible) continue;

			const a = this._phase + i * 0.7;
			const r = baseR + i * 0.9;
			g.position.set(Math.cos(a) * r, y + i * 0.2, Math.sin(a) * r);

			// face tangent
			g.rotation.y = -a + Math.PI / 2;

			// tiny flap
			const flap = 0.06 * Math.sin(this._t * 9 + i);
			g.scale.set(1 + flap, 1, 1);
		}

		// auto-hide after a while
		if (this._phase > Math.PI * 2.2) {
			this._active = false;
			for (const g of this.gulls) g.visible = false;
		}
	}
}
