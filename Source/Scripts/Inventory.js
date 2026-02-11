export class Inventory {
	/**
	 * @param {object} opts
	 * @param {number} opts.hotbarSize
	 * @param {number} opts.bagSize
	 * @param {(id:string)=>any} opts.getItemDef
	 */
	constructor({ hotbarSize = 9, bagSize = 36, getItemDef }) {
		this.hotbarSize = hotbarSize;
		this.bagSize = bagSize;
		this.getItemDef = getItemDef;

		/** @type {{id:string, count:number}[]} */
		this.hotbar = Array.from({ length: hotbarSize }, () => ({ id: "", count: 0 }));
		/** @type {{id:string, count:number}[]} */
		this.bag = Array.from({ length: bagSize }, () => ({ id: "", count: 0 }));
	}

	getSlot(area, index) {
		const arr = area === "hotbar" ? this.hotbar : this.bag;
		return arr[index];
	}

	setSlot(area, index, slot) {
		const arr = area === "hotbar" ? this.hotbar : this.bag;
		arr[index].id = slot.id;
		arr[index].count = slot.count;
	}

	/**
	 * Add items with stacking rules.
	 * @returns {{added:number, remaining:number}}
	 */
	addItem(id, count) {
		let remaining = count;
		const def = this.getItemDef(id);
		const maxStack = def?.maxStack ?? 1;

		// 1) Fill existing stacks (hotbar then bag)
		remaining = this._fillExisting(this.hotbar, id, remaining, maxStack);
		remaining = this._fillExisting(this.bag, id, remaining, maxStack);

		// 2) Fill empty slots (hotbar then bag)
		remaining = this._fillEmpty(this.hotbar, id, remaining, maxStack);
		remaining = this._fillEmpty(this.bag, id, remaining, maxStack);

		return { added: count - remaining, remaining };
	}

	_fillExisting(arr, id, remaining, maxStack) {
		if (remaining <= 0) return 0;
		for (let i = 0; i < arr.length; i++) {
			const s = arr[i];
			if (s.id !== id || s.count <= 0) continue;
			const space = maxStack - s.count;
			if (space <= 0) continue;
			const take = remaining < space ? remaining : space;
			s.count += take;
			remaining -= take;
			if (remaining <= 0) break;
		}
		return remaining;
	}

	_fillEmpty(arr, id, remaining, maxStack) {
		if (remaining <= 0) return 0;
		for (let i = 0; i < arr.length; i++) {
			const s = arr[i];
			if (s.count > 0) continue;
			const take = remaining < maxStack ? remaining : maxStack;
			s.id = id;
			s.count = take;
			remaining -= take;
			if (remaining <= 0) break;
		}
		return remaining;
	}

	/**
	 * Click-to-move between hotbar and bag.
	 * One click moves as much as possible to the other area (no drag/drop).
	 */
	moveBetween(areaFrom, indexFrom) {
		const fromArr = areaFrom === "hotbar" ? this.hotbar : this.bag;
		const toArr = areaFrom === "hotbar" ? this.bag : this.hotbar;

		const src = fromArr[indexFrom];
		if (!src || src.count <= 0 || !src.id) return { moved: 0 };

		const def = this.getItemDef(src.id);
		const maxStack = def?.maxStack ?? 1;

		let remaining = src.count;

		// Fill existing stacks in destination
		for (let i = 0; i < toArr.length; i++) {
			const s = toArr[i];
			if (s.id !== src.id || s.count <= 0) continue;
			const space = maxStack - s.count;
			if (space <= 0) continue;
			const take = remaining < space ? remaining : space;
			s.count += take;
			remaining -= take;
			if (remaining <= 0) break;
		}

		// Fill empty slots in destination
		if (remaining > 0) {
			for (let i = 0; i < toArr.length; i++) {
				const s = toArr[i];
				if (s.count > 0) continue;
				const take = remaining < maxStack ? remaining : maxStack;
				s.id = src.id;
				s.count = take;
				remaining -= take;
				if (remaining <= 0) break;
			}
		}

		const moved = src.count - remaining;
		src.count = remaining;
		if (src.count <= 0) {
			src.id = "";
			src.count = 0;
		}
		return { moved };
	}
}
