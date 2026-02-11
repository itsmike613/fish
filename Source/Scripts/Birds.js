import { THREE } from './Renderer.js';

export class Birds {
	constructor(state, events, renderer) {
		this.s = state;
		this.e = events;
		this.ren = renderer;

		this.grp = new THREE.Group();
		this.ren.scene.add(this.grp);

		this.b = [];
		this.t = 0;

		// extremely lightweight: 2 simple "V" birds as lines
		for (let i = 0; i < 2; i++) {
			const geo = new THREE.BufferGeometry();
			geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
				-0.12, 0, 0,
				0.00, 0.05, 0,
				0.12, 0, 0
			]), 3));
			const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 });
			const m = new THREE.Line(geo, mat);
			m.visible = false;
			this.grp.add(m);

			this.b.push({
				m,
				a: 0,
				r: 22 + Math.random() * 20,
				y: 10 + Math.random() * 6,
				sp: 0.25 + Math.random() * 0.25,
				on: 0
			});
		}
	}

	update(dt) {
		this.t += dt;

		// occasionally toggle on
		for (const x of this.b) {
			x.on -= dt;
			if (x.on <= 0 && Math.random() < dt * 0.05) {
				x.on = 6 + Math.random() * 10;
				x.m.visible = true;
				x.a = Math.random() * Math.PI * 2;
				x.r = 28 + Math.random() * 30;
				x.y = 10 + Math.random() * 8;
			}

			if (x.m.visible) {
				x.a += dt * x.sp;
				const cx = this.ren.cam.position.x;
				const cz = this.ren.cam.position.z;

				x.m.position.set(
					cx + Math.cos(x.a) * x.r,
					x.y,
					cz + Math.sin(x.a) * x.r
				);

				x.m.lookAt(cx, x.y, cz);

				// flap via tiny scale pulse
				const f = 1 + Math.sin(performance.now() * 0.02) * 0.18;
				x.m.scale.set(f, f, f);

				if (x.on <= 0) {
					x.m.visible = false;
				}
			}
		}
	}
}
