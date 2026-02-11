// fish/Source/Scripts/Save.js
import { normalizeSlots, normalizeSlot, getItem } from "./Inventory.js";

const KEY = "fish.save.v1";

export function load(state) {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return;

		const data = JSON.parse(raw);
		if (!data || typeof data !== "object") return;

		if (Array.isArray(data.inventory)) state.inventory = normalizeSlots(data.inventory, 36);
		if (Array.isArray(data.hotbar)) state.hotbar = normalizeSlots(data.hotbar, 9);

		state.catchCounts = {};
		if (data.catchCounts && typeof data.catchCounts === "object") {
			for (const [id, v] of Object.entries(data.catchCounts)) {
				if (!getItem(id)) continue;
				const n = Math.floor(Number(v));
				if (!Number.isFinite(n) || n < 0) continue;
				state.catchCounts[id] = n;
			}
		}

		state.cursor = null;
	} catch {
		// ignore
	}
}

export function save(state) {
	const safeInventory = normalizeSlots(state.inventory, 36);
	const safeHotbar = normalizeSlots(state.hotbar, 9);

	const catchCounts = {};
	if (state.catchCounts && typeof state.catchCounts === "object") {
		for (const [id, v] of Object.entries(state.catchCounts)) {
			if (!getItem(id)) continue;
			const n = Math.floor(Number(v));
			if (!Number.isFinite(n) || n < 0) continue;
			catchCounts[id] = n;
		}
	}

	const data = {
		version: 1,
		inventory: safeInventory,
		hotbar: safeHotbar,
		catchCounts,
	};

	try {
		localStorage.setItem(KEY, JSON.stringify(data));
	} catch {
		// ignore
	}
}
