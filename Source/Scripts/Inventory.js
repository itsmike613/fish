export class Inventory {
	constructor(events) {
		this.events = events;

		// Required variable names:
		// inventory variable name: inventory (instance in Game.js)
		// hotbar variable name: hotbar (exposed array in Game.js)
		this.hotbar = Array.from({ length: 9 }, () => null);
		this.inventory = Array.from({ length: 36 }, () => null);
	}

	_cloneStack(stack) {
		return { id: stack.id, count: stack.count };
	}

	getStackSizeLimit(itemData) {
		return Math.max(1, itemData.maxStackSize || 1);
	}

	addItem(itemData, count) {
		// Try hotbar first, then inventory; apply stacking rules.
		const limit = this.getStackSizeLimit(itemData);

		const addTo = (slots) => {
			// Stack into existing
			for (let i = 0; i < slots.length; i++) {
				const s = slots[i];
				if (!s) continue;
				if (s.id !== itemData.id) continue;
				const space = limit - s.count;
				if (space <= 0) continue;
				const take = Math.min(space, count);
				s.count += take;
				count -= take;
				if (count <= 0) return true;
			}
			// Fill empty
			for (let i = 0; i < slots.length; i++) {
				if (slots[i]) continue;
				const take = Math.min(limit, count);
				slots[i] = { id: itemData.id, count: take };
				count -= take;
				if (count <= 0) return true;
			}
			return false;
		};

		const ok = addTo(this.hotbar) || addTo(this.inventory);
		this.events.emit("inventory:changed", {});
		return ok;
	}

	findFirstEmpty(slots) {
		for (let i = 0; i < slots.length; i++) if (!slots[i]) return i;
		return -1;
	}

	moveStack(sourceGroup, sourceIndex, destGroup) {
		const srcSlots = sourceGroup === "hotbar" ? this.hotbar : this.inventory;
		const dstSlots = destGroup === "hotbar" ? this.hotbar : this.inventory;

		const stack = srcSlots[sourceIndex];
		if (!stack) return false;

		// Try stack-merge into dst
		const stackId = stack.id;
		const dstItemSlots = dstSlots;

		// Need max stack size; UI can provide itemData but inventory shouldn't depend on UI.
		// We'll merge only into same id and leave max-size enforcement to addItem-like logic
		// by using events for item lookup.
		// Here: do a simple move: first empty OR merge if same id and dst has space (requires limit).
		// We'll ask for itemData via event synchronously:
		let itemData = null;
		this.events.emit("loot:requestItem", { id: stackId, set: (v) => (itemData = v) });
		if (!itemData) return false;

		const limit = this.getStackSizeLimit(itemData);

		// Merge into existing
		for (let i = 0; i < dstItemSlots.length; i++) {
			const d = dstItemSlots[i];
			if (!d) continue;
			if (d.id !== stackId) continue;
			const space = limit - d.count;
			if (space <= 0) continue;
			const take = Math.min(space, stack.count);
			d.count += take;
			stack.count -= take;
			if (stack.count <= 0) srcSlots[sourceIndex] = null;
			this.events.emit("inventory:changed", {});
			return true;
		}

		// Put into empty
		const empty = this.findFirstEmpty(dstItemSlots);
		if (empty === -1) return false;

		dstItemSlots[empty] = this._cloneStack(stack);
		srcSlots[sourceIndex] = null;

		this.events.emit("inventory:changed", {});
		return true;
	}

	getHotbarSelected(index) {
		return this.hotbar[index] || null;
	}
}
