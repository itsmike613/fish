import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { LOOT_TABLE } from "./Loot.js";

function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }

function rarityWeight(r) {
	// Simple weighting: common > uncommon > rare > epic > legendary
	if (r === "common") return 60;
	if (r === "uncommon") return 25;
	if (r === "rare") return 10;
	if (r === "epic") return 4;
	if (r === "legendary") return 1;
	return 1;
}

function pickLootWeighted() {
	let total = 0;
	for (const it of LOOT_TABLE) total += rarityWeight(it.rarity);
	let roll = Math.random() * total;
	for (const it of LOOT_TABLE) {
		roll -= rarityWeight(it.rarity);
		if (roll <= 0) return it;
	}
	return LOOT_TABLE[0];
}

export class Fishing {
	/**
	 * @param {object} deps
	 * @param {import("./Events.js").Events} deps.events
	 * @param {any} deps.state
	 * @param {import("./Renderer.js").Renderer} deps.renderer
	 * @param {import("./World.js").World} deps.world
	 * @param {import("./Player.js").Player} deps.player
	 * @param {import("./Inventory.js").Inventory} deps.inventory
	 * @param {(id:string)=>any} deps.getItemDef
	 */
	constructor({ events, state, renderer, world, player, inventory, getItemDef }) {
		this.events = events;
		this.state = state;
		this.renderer = renderer;
		this.world = world;
		this.player = player;
		this.inventory = inventory;
		this.getItemDef = getItemDef;

		this.scene = renderer.scene;

		this.waterMesh = null;

		this.raycaster = new THREE.Raycaster();

		// Reuse geometries/materials
		this._bobberGeo = new THREE.SphereGeometry(0.07, 12, 10);
		this._bobberMat = new THREE.MeshStandardMaterial({
			color: 0xff6a3a,
			roughness: 0.35,
			metalness: 0.05,
			emissive: new THREE.Color(0x140400),
		});

		this._lineMat = new THREE.LineBasicMaterial({ color: 0x1b1b1b, transparent: true, opacity: 0.65 });

		// Countdown sprite (canvas texture)
		this._countCanvas = document.createElement("canvas");
		this._countCanvas.width = 256;
		this._countCanvas.height = 128;
		this._countCtx = this._countCanvas.getContext("2d");
		this._countTex = new THREE.CanvasTexture(this._countCanvas);
		this._countTex.colorSpace = THREE.SRGBColorSpace;
		this._countMat = new THREE.SpriteMaterial({ map: this._countTex, transparent: true, depthWrite: false });
		this._countSprite = new THREE.Sprite(this._countMat);
		this._countSprite.scale.set(0.9, 0.45, 1);

		// Fish particle trail (very lightweight)
		this._trailMax = 64;
		this._trailPositions = new Float32Array(this._trailMax * 3);
		this._trailGeo = new THREE.BufferGeometry();
		this._trailGeo.setAttribute("position", new THREE.BufferAttribute(this._trailPositions, 3));
		this._trailGeo.setDrawRange(0, 0);
		this._trailMat = new THREE.PointsMaterial({
			size: 0.06,
			color: 0xffffff,
			transparent: true,
			opacity: 0.75,
			depthWrite: false,
		});
		this._trailPoints = new THREE.Points(this._trailGeo, this._trailMat);

		this._trailActive = false;
		this._trailCount = 0;
		this._trailHead = 0;
		this._trailSrc = new THREE.Vector3();
		this._trailT = 0;

		// Cast objects
		this.bobberMesh = null;
		this.line = null;

		// State timing
		this._waitTotal = 0;

		// listen world ready (water mesh)
		this.events.on("world:ready", ({ waterMesh }) => { this.waterMesh = waterMesh; });

		// Mouse right-click logic
		window.addEventListener("mousedown", (e) => {
			if (e.button !== 2) return; // right click
			if (this.state.ui.inventoryOpen) return;

			const held = this._getSelectedHotbarItemId();
			if (held !== "fishingrod") return;

			if (!this.state.fishing.isCast) {
				this._tryCast();
			} else {
				if (this.state.fishing.biteActive) {
					this._reelIn();
				} else {
					// do nothing
				}
			}
		});
	}

	_getSelectedHotbarItemId() {
		const idx = this.state.ui.hotbarIndex;
		const slot = this.inventory.hotbar[idx];
		return slot?.id || "";
	}

	_tryCast() {
		if (!this.waterMesh) return;

		// Raycast from camera to water plane
		const cam = this.renderer.camera;
		const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).normalize();

		this.raycaster.set(cam.position, dir);
		this.raycaster.far = 80;

		const hits = this.raycaster.intersectObject(this.waterMesh, false);
		if (!hits || hits.length === 0) {
			this.events.emit("ui:toast", { text: "Aim at water to cast." });
			return;
		}

		const hit = hits[0].point;

		// Only allow casting if the hit point is outside the island (aiming at actual water)
		const r = Math.hypot(hit.x, hit.z);
		if (r < this.state.world.islandRadius - 0.1) {
			this.events.emit("ui:toast", { text: "Cast into the water, not the sand." });
			return;
		}

		// Spawn bobber + line
		this._spawnBobber(hit);

		// Random wait 0..10s
		this._waitTotal = Math.random() * 10.0;
		this.state.fishing.timer = this._waitTotal;
		this.state.fishing.isCast = true;
		this.state.fishing.biteActive = false;

		// trail becomes active a bit before bite; we’ll ramp it in during last ~3.5 seconds
		this._trailActive = false;
		this._trailCount = 0;
		this._trailHead = 0;
		this._trailGeo.setDrawRange(0, 0);
		this._trailPoints.visible = false;

		this.events.emit("fishing:cast", { at: { x: hit.x, y: hit.y, z: hit.z } });
	}

	_spawnBobber(hitPoint) {
		const y = this.state.world.waterY + 0.02;
		const pos = new THREE.Vector3(hitPoint.x, y, hitPoint.z);

		// bobber
		this.bobberMesh = new THREE.Mesh(this._bobberGeo, this._bobberMat);
		this.bobberMesh.position.copy(pos);
		this.scene.add(this.bobberMesh);

		// countdown sprite
		this._countSprite.position.set(pos.x, pos.y + 0.55, pos.z);
		this._countSprite.visible = false;
		this.scene.add(this._countSprite);

		// line (camera to bobber)
		const pts = [new THREE.Vector3(), pos.clone()];
		const geo = new THREE.BufferGeometry().setFromPoints(pts);
		this.line = new THREE.Line(geo, this._lineMat);
		this.scene.add(this.line);

		// trail points
		if (!this._trailPoints.parent) this.scene.add(this._trailPoints);

		// write state bobber
		this.state.fishing.bobber.x = pos.x;
		this.state.fishing.bobber.y = pos.y;
		this.state.fishing.bobber.z = pos.z;
	}

	_despawnCast() {
		if (this.line) {
			this.line.geometry.dispose();
			this.scene.remove(this.line);
			this.line = null;
		}
		if (this.bobberMesh) {
			this.scene.remove(this.bobberMesh);
			this.bobberMesh = null;
		}
		if (this._countSprite) {
			this.scene.remove(this._countSprite);
		}
		this._trailPoints.visible = false;
		this._trailGeo.setDrawRange(0, 0);

		this.state.fishing.isCast = false;
		this.state.fishing.biteActive = false;
		this.state.fishing.timer = 0;
		this.state.fishing.trailActive = false;
	}

	_reelIn() {
		// Award loot
		const item = pickLootWeighted();
		const res = this.inventory.addItem(item.id, 1);

		if (res.added > 0) {
			this.events.emit("inventory:changed", {});
			this.events.emit("ui:toast", { text: `Caught: ${item.name}` });
			this.events.emit("fishing:catch", { id: item.id });
		} else {
			this.events.emit("ui:toast", { text: "Inventory full!" });
		}

		this._despawnCast();
	}

	update(dt) {
		if (!this.state.fishing.isCast) return;

		// Update line endpoints
		if (this.line && this.bobberMesh) {
			const cam = this.renderer.camera;

			// "hand" point slightly in front of camera
			const hand = new THREE.Vector3(0.18, -0.18, -0.35).applyQuaternion(cam.quaternion).add(cam.position);

			const arr = this.line.geometry.attributes.position.array;
			arr[0] = hand.x; arr[1] = hand.y; arr[2] = hand.z;
			arr[3] = this.bobberMesh.position.x;
			arr[4] = this.bobberMesh.position.y;
			arr[5] = this.bobberMesh.position.z;
			this.line.geometry.attributes.position.needsUpdate = true;
		}

		// Timer to bite
		if (!this.state.fishing.biteActive) {
			this.state.fishing.timer -= dt;
			if (this.state.fishing.timer <= 0) {
				this.state.fishing.timer = 0;
				this.state.fishing.biteActive = true;
				this._countSprite.visible = false;
				this._trailPoints.visible = false;
				this._trailGeo.setDrawRange(0, 0);
				this.events.emit("fishing:biteActive", {});
			} else {
				// Countdown visible for last 5 seconds
				const show = this.state.fishing.timer <= 5.0;
				this._countSprite.visible = show;
				if (show && this.bobberMesh) {
					this._countSprite.position.set(
						this.bobberMesh.position.x,
						this.bobberMesh.position.y + 0.55,
						this.bobberMesh.position.z
					);
					this._drawCountdown(this.state.fishing.timer);
				}

				// Fish trail starts approaching during the last ~3.5 seconds
				if (this.state.fishing.timer <= 3.5) {
					this._updateTrail(dt);
				}
			}
		} else {
			// Bobber dip animation while bite-active
			if (this.bobberMesh) {
				const t = this.state.time.now;
				const dip = 0.07 * Math.sin(t * 10.0) - 0.05;
				this.bobberMesh.position.y = this.state.world.waterY + 0.02 + dip;
			}
		}
	}

	_drawCountdown(secondsLeft) {
		const ctx = this._countCtx;
		ctx.clearRect(0, 0, 256, 128);

		// color transitions green -> red as approaches 0
		const t = clamp01(1 - (secondsLeft / 5.0));
		const r = Math.floor(60 + 195 * t);
		const g = Math.floor(220 - 160 * t);
		const b = Math.floor(90 - 70 * t);

		// panel bubble
		ctx.fillStyle = "rgba(0,0,0,0.45)";
		ctx.strokeStyle = "rgba(255,255,255,0.18)";
		ctx.lineWidth = 6;
		roundRect(ctx, 16, 20, 224, 88, 18, true, true);

		ctx.font = "bold 42px system-ui, -apple-system, Segoe UI, Roboto, Arial";
		ctx.fillStyle = `rgb(${r},${g},${b})`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(`(${secondsLeft.toFixed(1)}s)`, 128, 64);

		this._countTex.needsUpdate = true;
	}

	_updateTrail(dt) {
		if (!this.bobberMesh) return;

		// Enable once
		if (!this._trailActive) {
			this._trailActive = true;
			this._trailPoints.visible = true;

			// start from a point out in the water toward horizon (relative to bobber)
			const angle = Math.random() * Math.PI * 2;
			const dist = 6 + Math.random() * 10;
			this._trailSrc.set(
				this.bobberMesh.position.x + Math.cos(angle) * dist,
				this.state.world.waterY + 0.02,
				this.bobberMesh.position.z + Math.sin(angle) * dist
			);

			this._trailT = 0;
			this._trailCount = 0;
			this._trailHead = 0;
			this._trailGeo.setDrawRange(0, 0);
		}

		// Move source toward bobber and leave points
		this._trailT += dt;
		const bob = this.bobberMesh.position;
		const speed = 1.8 + 0.8 * Math.sin(this.state.time.now * 2.0);

		const toBobX = bob.x - this._trailSrc.x;
		const toBobZ = bob.z - this._trailSrc.z;
		const d = Math.hypot(toBobX, toBobZ) || 1;

		this._trailSrc.x += (toBobX / d) * speed * dt;
		this._trailSrc.z += (toBobZ / d) * speed * dt;

		// Write a new point at a fixed rate
		const emitRate = 40; // points/sec
		const step = 1 / emitRate;

		// Emit multiple if dt is large
		const emits = Math.min(4, Math.floor((dt + 0.00001) / step) + 1);
		for (let k = 0; k < emits; k++) {
			const i = this._trailHead % this._trailMax;
			const base = i * 3;

			// slight wiggle
			const wig = 0.08 * Math.sin(this.state.time.now * 9 + i);
			this._trailPositions[base + 0] = this._trailSrc.x + wig;
			this._trailPositions[base + 1] = this.state.world.waterY + 0.02;
			this._trailPositions[base + 2] = this._trailSrc.z - wig;

			this._trailHead++;
			if (this._trailCount < this._trailMax) this._trailCount++;
		}

		this._trailGeo.attributes.position.needsUpdate = true;
		this._trailGeo.setDrawRange(0, this._trailCount);
	}
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
	const min = Math.min(w, h);
	if (r > min / 2) r = min / 2;
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
	if (fill) ctx.fill();
	if (stroke) ctx.stroke();
}
