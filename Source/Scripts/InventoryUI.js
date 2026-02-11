// fish/Source/Scripts/InventoryUI.js
import { events } from "./Events.js";
import { clickSlot, shiftClick, getItem } from "./Inventory.js";

function slotEl(section, index) {
	const el = document.createElement("div");
	el.className = "slot";
	el.dataset.section = section;
	el.dataset.index = String(index);

	const img = document.createElement("img");
	img.alt = "";
	el.appendChild(img);

	const qty = document.createElement("div");
	qty.className = "qty";
	el.appendChild(qty);

	return el;
}

function renderSlot(el, slot) {
	const img = el.querySelector("img");
	const qty = el.querySelector(".qty");

	if (!slot) {
		img.style.opacity = "0";
		img.removeAttribute("src");
		qty.style.opacity = "0";
		qty.textContent = "";
		return;
	}

	const item = getItem(slot.id);
	if (!item) {
		img.style.opacity = "0";
		img.removeAttribute("src");
		qty.style.opacity = "0";
		qty.textContent = "";
		return;
	}

	img.src = item.sprite;
	img.style.opacity = "1";
	if (slot.qty > 1) {
		qty.textContent = String(slot.qty);
		qty.style.opacity = "1";
	} else {
		qty.textContent = "";
		qty.style.opacity = "0";
	}
}

export class InventoryUI {
	constructor(state) {
		this.state = state;

		this.wrap = document.getElementById("inventory");
		this.grid = document.getElementById("inventoryGrid");
		this.hotbar = document.getElementById("hotbar");

		this.cursor = document.getElementById("cursor");
		this.cursor.innerHTML = `
      <div class="wrap">
        <img alt="" />
        <div class="qty"></div>
      </div>
    `;
		this.cursorImg = this.cursor.querySelector("img");
		this.cursorQty = this.cursor.querySelector(".qty");

		this.invSlots = [];
		this.hotSlots = [];

		for (let i = 0; i < 36; i++) {
			const el = slotEl("inventory", i);
			this.grid.appendChild(el);
			this.invSlots.push(el);
		}

		for (let i = 0; i < 9; i++) {
			const el = slotEl("hotbar", i);
			this.hotbar.appendChild(el);
			this.hotSlots.push(el);
		}

		const onClick = (e) => {
			const target = e.target.closest(".slot");
			if (!target) return;

			const section = target.dataset.section;
			const index = Number(target.dataset.index);
			if (!Number.isFinite(index)) return;

			let changed = false;
			if (e.shiftKey) {
				changed = shiftClick(this.state, section, index);
			} else {
				changed = clickSlot(this.state, section, index);
			}

			if (changed) events.emit("inventoryChanged");
			this.render();
		};

		this.grid.addEventListener("click", onClick);
		this.hotbar.addEventListener("click", onClick);

		window.addEventListener("mousemove", (e) => {
			if (!this.state.cursor) return;
			this.cursor.style.left = `${e.clientX + 10}px`;
			this.cursor.style.top = `${e.clientY + 10}px`;
		});

		// Click outside inventory panels: try to put cursor back into inventory/hotbar
		window.addEventListener("click", (e) => {
			if (!this.state.cursor) return;

			const inSlot = e.target.closest(".slot");
			if (inSlot) return;

			const inInv = e.target.closest("#inventory");
			const inHot = e.target.closest("#hotbar");
			if (inInv || inHot) return;

			// Attempt to return held stack into player storage (hotbar then inventory)
			const held = this.state.cursor;
			const { addToPlayer } = awaitImportAddToPlayer();
			const left = addToPlayer(this.state, held.id, held.qty);
			this.state.cursor = left > 0 ? { id: held.id, qty: left } : null;

			if (left !== held.qty) events.emit("inventoryChanged");
			this.render();
		}, true);

		this.render();
	}

	setVisible(visible) {
		this.wrap.style.display = visible ? "block" : "none";
		this.wrap.setAttribute("aria-hidden", visible ? "false" : "true");
	}

	render() {
		for (let i = 0; i < 36; i++) renderSlot(this.invSlots[i], this.state.inventory[i]);
		for (let i = 0; i < 9; i++) renderSlot(this.hotSlots[i], this.state.hotbar[i]);

		const cur = this.state.cursor;
		if (!cur) {
			this.cursor.style.display = "none";
			return;
		}

		const item = getItem(cur.id);
		if (!item) {
			this.cursor.style.display = "none";
			return;
		}

		this.cursorImg.src = item.sprite;
		this.cursorQty.textContent = cur.qty > 1 ? String(cur.qty) : "";
		this.cursorQty.style.opacity = cur.qty > 1 ? "1" : "0";
		this.cursor.style.display = "block";
	}
}

// Avoid circular static import in top-level with window click handler usage
let _addToPlayer = null;
function awaitImportAddToPlayer() {
	if (_addToPlayer) return { addToPlayer: _addToPlayer };
	// eslint-disable-next-line no-undef
	return import("./Inventory.js").then((m) => {
		_addToPlayer = m.addToPlayer;
		return { addToPlayer: _addToPlayer };
	});
}
