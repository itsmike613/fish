import { THREE } from './Renderer.js';

export class Fishing {
	constructor(state, events, renderer, world, player, inv, loot) {
		this.s = state;
		this.e = events;
		this.ren = renderer;
		this.world = world;
		this.pl = player;
		this.inv = inv;

		this.loot = loot;

		this.grp = new THREE.Group();
		this.ren.scene.add(this.grp);

		this.bob = null;
		this.line = null;

		this.castT = 0;
		this.waitT = 0;
		this.bite = false;

		// fish trail particles (reused buffers)
		this.pN = 48;
		this.pPos = new Float32Array(this.pN * 3);
		this.pVel = new Float32Array(this.pN * 3);
		this.pLife = new Float32Array(this.pN);
		this.pGeo = new THREE.BufferGeometry();
		this.pGeo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
		this.pMat = new THREE.PointsMaterial({ size: 0.06, transparent: true, opacity: 0.75 });
		this.pPts = new THREE.Points(this.pGeo, this.pMat);
		this.pPts.visible = false;
		this.grp.add(this.pPts);

		// bobber countdown tag
		this.tag = document.querySelector('#bobberTag');

		this._bind();
	}

	_bind() {
		window.addEventListener('contextmenu', (ev) => ev.preventDefault());

		window.addEventListener('mousedown', (ev) => {
			if (ev.button !== 2) return; // right click
			if (this.s.ui.invOpen) return;

			// logic: if not cast -> cast; if cast and bite-active -> reel; else nothing
			if (!this.s.fishing.cast) {
				this.tryCast();
			} else {
				if (this.bite) this.reel();
			}
		});

		this.e.on('ui:toggleInv', () => {
			this.e.emit('ui:inv', !this.s.ui.invOpen);
		});
	}

	tryCast() {
		// require fishing rod in selected hotbar slot
		const slot = this.s.inv.hot[this.s.ui.hotSel];
		if (!slot || slot.id !== 'fishingrod') return;

		const ray = this.pl.getRay();
		const hit = this.world.rayToWater(ray);
		if (!hit) return; // only allow aiming at water

		this._spawnBobber(hit);
		this._spawnLine();

		this.s.fishing.cast = true;
		this.s.fishing.bite = false;

		this.castT = 0;
		this.waitT = Math.random() * 10; // 0-10s
		this.bite = false;
	}

	_spawnBobber(p) {
		if (this.bob) this.grp.remove(this.bob);
		const geo = new THREE.SphereGeometry(0.08, 12, 10);
		const mat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			roughness: 0.35,
			metalness: 0.0,
			emissive: new THREE.Color(0x111111)
		});
		const m = new THREE.Mesh(geo, mat);
		m.position.copy(p);
		m.position.y = this.s.world.waterY + 0.04;
		this.bob = m;
		this.grp.add(m);
	}

	_spawnLine() {
		if (this.line) this.grp.remove(this.line);

		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
		const mat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 });
		const l = new THREE.Line(geo, mat);
		this.line = l;
		this.grp.add(l);
	}

	_despawn() {
		if (this.bob) { this.grp.remove(this.bob); this.bob.geometry.dispose(); this.bob.material.dispose(); this.bob = null; }
		if (this.line) { this.grp.remove(this.line); this.line.geometry.dispose(); this.line.material.dispose(); this.line = null; }
		this.pPts.visible = false;
		this.tag.classList.add('hidden');

		this.s.fishing.cast = false;
		this.s.fishing.bite = false;
		this.bite = false;
	}

	reel() {
		// award a random item by weight (uses Loot table)
		const got = this._rollLoot();
		if (got) {
			// add to bag first, overflow to hotbar (simple rule, future Shop/Save safe)
			let left = this.inv.addTo('bag', got.id, 1);
			if (left > 0) this.inv.addTo('hot', got.id, left);
			this.e.emit('fish:got', got);
		}
		this._despawn();
	}

	_rollLoot() {
		let sum = 0;
		for (const it of this.loot) sum += (it.weightRoll ?? this._weightFromRarity(it.rarity));

		let r = Math.random() * sum;
		for (const it of this.loot) {
			r -= (it.weightRoll ?? this._weightFromRarity(it.rarity));
			if (r <= 0) return it;
		}
		return this.loot[0] || null;
	}

	_weightFromRarity(r) {
		// common most likely; legendary least
		switch (r) {
			case 'legendary': return 1;
			case 'epic': return 3;
			case 'rare': return 8;
			case 'uncommon': return 18;
			default: return 40;
		}
	}

	_rodTip(out) {
		// simple approximation: camera forward a bit and down a touch
		out.copy(this.ren.cam.position);
		const f = new THREE.Vector3();
		this.ren.cam.getWorldDirection(f);
		out.addScaledVector(f, 0.55);
		out.y -= 0.18;
		return out;
	}

	_updateLine() {
		if (!this.line || !this.bob) return;

		const pos = this.line.geometry.attributes.position.array;
		const a = new THREE.Vector3();
		this._rodTip(a);

		pos[0] = a.x; pos[1] = a.y; pos[2] = a.z;
		pos[3] = this.bob.position.x;
		pos[4] = this.bob.position.y;
		pos[5] = this.bob.position.z;

		this.line.geometry.attributes.position.needsUpdate = true;
	}

	_setTag(text, t01) {
		if (!this.bob) return;
		const p = this.bob.position.clone();
		p.y += 0.22;

		// project to screen
		p.project(this.ren.cam);
		const x = (p.x * 0.5 + 0.5) * innerWidth;
		const y = (-p.y * 0.5 + 0.5) * innerHeight;

		this.tag.style.left = `${x}px`;
		this.tag.style.top = `${y}px`;
		this.tag.textContent = text;

		// green -> red
		const r = Math.floor(60 + 180 * t01);
		const g = Math.floor(220 - 170 * t01);
		this.tag.style.color = `rgb(${r},${g},70)`;

		this.tag.classList.remove('hidden');
	}

	_spawnTrail() {
		if (!this.bob) return;

		this.pPts.visible = true;

		const bx = this.bob.position.x;
		const by = this.bob.position.y;
		const bz = this.bob.position.z;

		for (let i = 0; i < this.pN; i++) {
			const k = i * 3;
			const ang = Math.random() * Math.PI * 2;
			const rad = 1.2 + Math.random() * 3.5;

			const x = bx + Math.cos(ang) * rad;
			const z = bz + Math.sin(ang) * rad;
			const y = this.s.world.waterY - (0.3 + Math.random() * 1.2);

			this.pPos[k + 0] = x;
			this.pPos[k + 1] = y;
			this.pPos[k + 2] = z;

			// velocity toward bobber
			const dx = bx - x;
			const dy = (by - 0.08) - y;
			const dz = bz - z;
			const inv = 1 / (Math.hypot(dx, dy, dz) || 1);
			this.pVel[k + 0] = dx * inv * (0.8 + Math.random() * 0.9);
			this.pVel[k + 1] = dy * inv * (0.8 + Math.random() * 0.9);
			this.pVel[k + 2] = dz * inv * (0.8 + Math.random() * 0.9);

			this.pLife[i] = 0.6 + Math.random() * 0.8;
		}

		this.pGeo.attributes.position.needsUpdate = true;
	}

	_updTrail(dt) {
		if (!this.pPts.visible) return;
		let alive = 0;

		for (let i = 0; i < this.pN; i++) {
			const k = i * 3;
			let life = this.pLife[i];
			if (life <= 0) continue;

			life -= dt;
			this.pLife[i] = life;
			if (life <= 0) continue;

			this.pPos[k + 0] += this.pVel[k + 0] * dt * 3.0;
			this.pPos[k + 1] += this.pVel[k + 1] * dt * 3.0;
			this.pPos[k + 2] += this.pVel[k + 2] * dt * 3.0;

			alive++;
		}

		this.pGeo.attributes.position.needsUpdate = true;
		if (alive === 0) this.pPts.visible = false;
	}

	update(dt) {
		if (!this.s.fishing.cast) {
			this.tag.classList.add('hidden');
			return;
		}

		this.castT += dt;

		this._updateLine();

		// countdown for last 5 seconds
		const rem = this.waitT - this.castT;

		if (rem <= 0 && !this.bite) {
			this.bite = true;
			this.s.fishing.bite = true;
			this.pPts.visible = false;
		}

		// fish coming: show trail approaching bobber
		if (rem <= 2.0 && rem > 0 && !this.bite) {
			if (!this.pPts.visible) this._spawnTrail();
		}
		this._updTrail(dt);

		if (rem <= 5 && rem > 0 && !this.bite) {
			const t01 = 1 - (rem / 5); // 0 -> 1
			this._setTag(`(${rem.toFixed(1)}s)`, t01);
		} else {
			this.tag.classList.add('hidden');
		}

		// bobber dip when bite-active
		if (this.bob) {
			const base = this.s.world.waterY + 0.04;
			if (this.bite) {
				const dip = 0.09 + Math.sin(performance.now() * 0.018) * 0.03;
				this.bob.position.y = base - dip;
				this._setTag('(BITE!) Right-click', 1);
			} else {
				const bob = Math.sin(performance.now() * 0.0018) * 0.01;
				this.bob.position.y = base + bob;
			}
		}
	}
}
