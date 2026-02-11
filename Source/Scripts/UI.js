export class UI {
	constructor(events, state, inventory) {
		this.events = events;
		this.state = state;
		this.inventory = inventory;

		// Required DOM ids
		this.hotbarRoot = document.getElementById("hotbar");
		this.inventoryRoot = document.getElementById("inventory");
		this.crosshair = document.getElementById("crosshair");

		this.countdown = document.getElementById("bobberCountdown");

		this.itemDataById = new Map();

		this.hotbarSlots = [];
		this.inventorySlots = [];

		this._buildHotbar();
		this._buildInventory();

		this._bindKeys();
		this._bindLootLookup();
		this._bindInventoryChanged();

		this.render();
	}

	_bindLootLookup() {
		// Inventory requests item data via event
		this.events.on("loot:registerIndex", ({ index }) => {
			this.itemDataById = index;
			this.render();
		});

		this.events.on("loot:requestItem", ({ id, set }) => {
			set(this.itemDataById.get(id) || null);
		});
	}

	_bindInventoryChanged() {
		this.events.on("inventory:changed", () => this.render());
		this.events.on("ui:hotbarSelected", () => this.render());
		this.events.on("ui:inventoryToggled", () => this._applyInventoryMode());
		this.events.on("fish:countdown", (payload) => this._renderCountdown(payload));
	}

	_bindKeys() {
		window.addEventListener("keydown", (e) => {
			if (e.code === "KeyE") {
				e.preventDefault();
				this.toggleInventory();
				return;
			}

			// Number keys 1-9 select hotbar even when inventory closed
			if (!this.state.ui.inventoryOpen) {
				const n = this._numberKeyToIndex(e.code);
				if (n !== -1) {
					this.state.ui.selectedHotbarIndex = n;
					this.events.emit("ui:hotbarSelected", { index: n });
				}
			}
		});
	}

	_numberKeyToIndex(code) {
		if (code === "Digit1") return 0;
		if (code === "Digit2") return 1;
		if (code === "Digit3") return 2;
		if (code === "Digit4") return 3;
		if (code === "Digit5") return 4;
		if (code === "Digit6") return 5;
		if (code === "Digit7") return 6;
		if (code === "Digit8") return 7;
		if (code === "Digit9") return 8;
		return -1;
	}

	toggleInventory() {
		this.state.ui.inventoryOpen = !this.state.ui.inventoryOpen;
		this.events.emit("ui:inventoryToggled", { open: this.state.ui.inventoryOpen });
	}

	_applyInventoryMode() {
		const open = this.state.ui.inventoryOpen;

		if (open) {
			this.inventoryRoot.classList.remove("hidden");
			document.body.classList.add("inventoryOpen");
			// Stop pointer lock to show cursor
			if (document.pointerLockElement) document.exitPointerLock();
		} else {
			this.inventoryRoot.classList.add("hidden");
			document.body.classList.remove("inventoryOpen");
			// countdown hiding handled by Fishing
		}
	}

	_buildHotbar() {
		this.hotbarRoot.innerHTML = "";
		this.hotbarSlots = [];

		for (let i = 0; i < 9; i++) {
			const slot = document.createElement("div");
			slot.className = "slot";
			slot.dataset.group = "hotbar";
			slot.dataset.index = String(i);

			slot.addEventListener("click", () => {
				if (this.state.ui.inventoryOpen) {
					// In inventory mode, clicking hotbar slot moves item to inventory
					this.inventory.moveStack("hotbar", i, "inventory");
				} else {
					// Select slot
					this.state.ui.selectedHotbarIndex = i;
					this.events.emit("ui:hotbarSelected", { index: i });
				}
			});

			this.hotbarRoot.appendChild(slot);
			this.hotbarSlots.push(slot);
		}
	}

	_buildInventory() {
		this.inventoryRoot.innerHTML = "";

		const title = document.createElement("div");
		title.className = "inventoryTitle";

		const label = document.createElement("div");
		label.className = "label";
		label.textContent = "Inventory";

		const tip = document.createElement("div");
		tip.className = "tip";
		tip.textContent = "Click items to move between inventory and hotbar • Press E to close";

		title.appendChild(label);
		title.appendChild(tip);

		const grid = document.createElement("div");
		grid.className = "inventoryGrid";

		this.inventorySlots = [];

		for (let i = 0; i < 36; i++) {
			const slot = document.createElement("div");
			slot.className = "slot";
			slot.dataset.group = "inventory";
			slot.dataset.index = String(i);

			slot.addEventListener("click", () => {
				// Click inventory slot moves to hotbar
				this.inventory.moveStack("inventory", i, "hotbar");
			});

			grid.appendChild(slot);
			this.inventorySlots.push(slot);
		}

		this.inventoryRoot.appendChild(title);
		this.inventoryRoot.appendChild(grid);
	}

	render() {
		// Hotbar visuals
		const selected = this.state.ui.selectedHotbarIndex;

		for (let i = 0; i < 9; i++) {
			const slot = this.hotbarSlots[i];
			slot.classList.toggle("selected", i === selected);
			this._renderSlot(slot, this.inventory.hotbar[i]);
		}

		// Inventory visuals
		for (let i = 0; i < 36; i++) {
			const slot = this.inventorySlots[i];
			this._renderSlot(slot, this.inventory.inventory[i]);
		}
	}

	_renderSlot(slotEl, stack) {
		slotEl.innerHTML = "";

		if (!stack) return;

		const data = this.itemDataById.get(stack.id);
		if (!data) return;

		const img = document.createElement("img");
		img.src = data.sprite;
		img.alt = data.name;

		slotEl.appendChild(img);

		if (stack.count > 1) {
			const count = document.createElement("div");
			count.className = "count";
			count.textContent = String(stack.count);
			slotEl.appendChild(count);
		}
	}

	_renderCountdown(payload) {
		// payload: { visible, text, color, x, y }
		if (!payload || !payload.visible) {
			this.countdown.classList.add("hidden");
			return;
		}
		this.countdown.classList.remove("hidden");
		this.countdown.textContent = payload.text;
		this.countdown.style.color = payload.color;
		this.countdown.style.left = `${payload.x}px`;
		this.countdown.style.top = `${payload.y}px`;
	}
}
