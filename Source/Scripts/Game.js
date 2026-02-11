// fish/Source/Scripts/Game.js
import { state } from "./State.js";
import { events } from "./Events.js";
import { Background } from "./Background.js";
import { FishingUI } from "./FishingUI.js";
import { InventoryUI } from "./InventoryUI.js";
import { Toast } from "./Toast.js";
import { load, save } from "./Save.js";
import { rollLoot, getLootById, recordAward } from "./Roll.js";
import { addToPlayer } from "./Inventory.js";

export class Game {
	constructor() {
		load(state);

		this.background = new Background();
		this.fishingUI = new FishingUI();
		this.inventoryUI = new InventoryUI(state);
		this.toast = new Toast(document.getElementById("toast"));

		this.setMode(state.uiMode);

		events.on("fishingResult", (res) => this.onFishingResult(res));
		events.on("inventoryChanged", () => save(state));

		window.addEventListener("keydown", (e) => this.onKeyDown(e));

		this.last = performance.now() / 1000;
		this.raf = 0;
	}

	start() {
		this.loop();
	}

	setMode(mode) {
		state.uiMode = mode;

		const invOpen = mode === "inventory";
		this.inventoryUI.setVisible(invOpen);

		// Hotbar always visible; inventory panel only when open.
		this.fishingUI.setVisible(!invOpen);

		this.inventoryUI.render();
	}

	onKeyDown(e) {
		if (e.repeat) return;

		if (e.key === "e" || e.key === "E") {
			const next = state.uiMode === "inventory" ? "fishing" : "inventory";
			this.setMode(next);
			save(state);
		}
	}

	onFishingResult(res) {
		if (!res || typeof res !== "object") return;

		if (!res.ok) {
			if (res.reason === "early") {
				this.toast.show({ text: "Too early — the hook didn’t catch anything." });
			} else {
				this.toast.show({ text: "Too late — the fish got away." });
			}
			return;
		}

		const rolled = rollLoot(state.catchCounts);
		if (!rolled) {
			this.toast.show({ text: "Nothing bit." });
			return;
		}

		const item = getLootById(rolled.id);
		if (!item) {
			this.toast.show({ text: "Nothing bit." });
			return;
		}

		const left = addToPlayer(state, rolled.id, rolled.qty);
		const added = rolled.qty - left;

		if (added <= 0) {
			this.toast.show({ text: "Inventory full — the catch slipped away." });
			return;
		}

		recordAward(state.catchCounts, rolled.id);

		this.toast.show({
			icon: item.sprite,
			text: `You caught x${added} (${item.name})!`,
		});

		events.emit("inventoryChanged");
		save(state);
		this.inventoryUI.render();
	}

	loop() {
		const now = performance.now() / 1000;
		const dt = Math.min(0.05, Math.max(0, now - this.last));
		this.last = now;

		this.background.update(dt);
		this.fishingUI.update(dt);

		this.raf = requestAnimationFrame(() => this.loop());
	}
}
