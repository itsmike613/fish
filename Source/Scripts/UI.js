export class UI {
	/**
	 * @param {object} deps
	 * @param {import("./Events.js").Events} deps.events
	 * @param {any} deps.state
	 * @param {import("./Inventory.js").Inventory} deps.inventory
	 * @param {(id:string)=>any} deps.getItemDef
	 */
	constructor({ events, state, inventory, getItemDef }) {
		this.events = events;
		this.state = state;
		this.inventory = inventory;
		this.getItemDef = getItemDef;

		this.elHotbar = document.getElementById("hotbar");
		this.elHotbarSlots = document.getElementById("hotbar-slots");
		this.elInv = document.getElementById("inventory");
		this.elInvSlots = document.getElementById("inventory-slots");
		this.elCrosshair = document.getElementById("crosshair");
		this.elToast = document.getElementById("toast");

		this._toastT = 0;

		this._hotbarSlotEls = [];
		this._invSlotEls = [];

		this._buildSlots();
		this._bindInputs();

		// React to inventory toggle
		this.events.on("ui:inventory", ({ open }) => {
			this._setInventoryOpen(!!open);
			this.render();
		});

		// Small feedback messages
		this.events.on("ui:toast", ({ text, seconds = 1.4 }) => {
			this._showToast(text, seconds);
		});
	}

	_buildSlots() {
		// Hotbar 9
		this.elHotbarSlots.innerHTML = "";
		for (let i = 0; i < 9; i++) {
			const el = this._makeSlotEl("hotbar", i);
			this.elHotbarSlots.appendChild(el);
			this._hotbarSlotEls.push(el);
		}

		// Inventory 36
		this.elInvSlots.innerHTML = "";
		for (let i = 0; i < 36; i++) {
			const el = this._makeSlotEl("bag", i);
			this.elInvSlots.appendChild(el);
			this._invSlotEls.push(el);
		}
	}

	_makeSlotEl(area, index) {
		const el = document.createElement("div");
		el.className = "slot";
		el.dataset.area = area;
		el.dataset.index = String(index);

		const idx = document.createElement("div");
		idx.className = "index";
		if (area === "hotbar") idx.textContent = String(index + 1);
		el.appendChild(idx);

		const img = document.createElement("img");
		img.draggable = false;
		img.style.display = "none";
		el.appendChild(img);

		const count = document.createElement("div");
		count.className = "count";
		count.textContent = "";
		el.appendChild(count);

		el.addEventListener("click", () => {
			// Only clickable when inventory is open (cursor visible)
			if (!this.state.ui.inventoryOpen) return;

			if (area === "hotbar") {
				const res = this.inventory.moveBetween("hotbar", index);
				if (res.moved > 0) this.events.emit("inventory:changed", {});
			} else {
				const res = this.inventory.moveBetween("bag", index);
				if (res.moved > 0) this.events.emit("inventory:changed", {});
			}
			this.render();
		});

		return el;
	}

	_bindInputs() {
		window.addEventListener("keydown", (e) => {
			if (e.code === "KeyE") {
				this.events.emit("ui:toggleInventory", {});
				e.preventDefault();
				return;
			}

			// Hotbar selection (works even when inventory is open)
			const n = this._keyToHotbarIndex(e.code);
			if (n !== -1) {
				this.state.ui.hotbarIndex = n;
				this.events.emit("ui:hotbarIndex", { index: n });
				this.render();
			}
		});
	}

	_keyToHotbarIndex(code) {
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

	_setInventoryOpen(open) {
		this.state.ui.inventoryOpen = open;
		this.elInv.classList.toggle("hidden", !open);
		this.elCrosshair.style.display = open ? "none" : "block";
	}

	_showToast(text, seconds) {
		this.elToast.textContent = text;
		this.elToast.classList.remove("hidden");
		this._toastT = seconds;
	}

	update(dt) {
		if (this._toastT > 0) {
			this._toastT -= dt;
			if (this._toastT <= 0) {
				this.elToast.classList.add("hidden");
			}
		}
	}

	render() {
		// Hotbar selected
		for (let i = 0; i < 9; i++) {
			this._hotbarSlotEls[i].classList.toggle("selected", i === this.state.ui.hotbarIndex);
		}

		// Hotbar content
		for (let i = 0; i < 9; i++) {
			this._renderSlot(this._hotbarSlotEls[i], this.inventory.hotbar[i]);
		}

		// Inventory content
		for (let i = 0; i < 36; i++) {
			this._renderSlot(this._invSlotEls[i], this.inventory.bag[i]);
		}
	}

	_renderSlot(el, slot) {
		const img = el.querySelector("img");
		const countEl = el.querySelector(".count");

		if (!slot || slot.count <= 0 || !slot.id) {
			img.style.display = "none";
			img.src = "";
			countEl.textContent = "";
			return;
		}

		const def = this.getItemDef(slot.id);
		img.style.display = "block";
		img.src = `./${def.sprite}`;
		img.alt = def.name;

		countEl.textContent = slot.count > 1 ? String(slot.count) : "";
	}
}
