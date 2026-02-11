// fish/Source/Scripts/Inventory.js
import { loot } from "./Loot.js";

const lootById = new Map();
for (const item of loot) lootById.set(item.id, item);

export function getItem(id) {
	return lootById.get(id) || null;
}

export function maxStack(id) {
	const item = lootById.get(id);
	return item ? Math.max(1, item.stackable | 0) : 1;
}

export function normalizeSlot(slot) {
	if (!slot || typeof slot !== "object") return null;
	if (typeof slot.id !== "string") return null;
	const item = getItem(slot.id);
	if (!item) return null;
	const qty = Math.floor(Number(slot.qty));
	if (!Number.isFinite(qty) || qty <= 0) return null;
	return { id: slot.id, qty: Math.min(qty, maxStack(slot.id)) };
}

export function normalizeSlots(slots, expectedLen) {
	const out = Array.from({ length: expectedLen }, () => null);
	for (let i = 0; i < expectedLen; i++) out[i] = normalizeSlot(slots[i]);
	return out;
}

function mergeInto(slot, id, qty) {
	const m = maxStack(id);
	if (!slot) return { slot: { id, qty: Math.min(qty, m) }, left: Math.max(0, qty - m) };
	if (slot.id !== id) return { slot, left: qty };

	const space = m - slot.qty;
	if (space <= 0) return { slot, left: qty };

	const moved = Math.min(space, qty);
	return { slot: { id, qty: slot.qty + moved }, left: qty - moved };
}

export function addToSlots(slots, id, qty) {
	let left = qty;

	const m = maxStack(id);

	// merge
	for (let i = 0; i < slots.length; i++) {
		if (!slots[i] || slots[i].id !== id) continue;
		if (slots[i].qty >= m) continue;

		const res = mergeInto(slots[i], id, left);
		slots[i] = res.slot;
		left = res.left;
		if (left <= 0) return 0;
	}

	// empty fill
	for (let i = 0; i < slots.length; i++) {
		if (slots[i]) continue;
		const take = Math.min(m, left);
		slots[i] = { id, qty: take };
		left -= take;
		if (left <= 0) return 0;
	}

	return left;
}

export function addToPlayer(state, id, qty) {
	let left = qty;
	left = addToSlots(state.hotbar, id, left);
	left = addToSlots(state.inventory, id, left);
	return left;
}

export function clickSlot(state, section, index) {
	const slots = section === "hotbar" ? state.hotbar : state.inventory;
	const cur = state.cursor ? { ...state.cursor } : null;
	const slot = slots[index] ? { ...slots[index] } : null;

	if (!cur) {
		if (!slot) return false;
		state.cursor = slot;
		slots[index] = null;
		return true;
	}

	if (!slot) {
		slots[index] = cur;
		state.cursor = null;
		return true;
	}

	if (slot.id === cur.id) {
		const m = maxStack(slot.id);
		const space = m - slot.qty;

		if (space <= 0) {
			slots[index] = cur;
			state.cursor = slot;
			return true;
		}

		const moved = Math.min(space, cur.qty);
		slot.qty += moved;
		cur.qty -= moved;

		slots[index] = slot;
		state.cursor = cur.qty > 0 ? cur : null;
		return true;
	}

	slots[index] = cur;
	state.cursor = slot;
	return true;
}

function moveStackInto(sourceSlot, destSlots) {
	if (!sourceSlot) return { moved: 0, leftSlot: null };

	const id = sourceSlot.id;
	let left = sourceSlot.qty;

	// merge
	const m = maxStack(id);
	for (let i = 0; i < destSlots.length; i++) {
		const d = destSlots[i];
		if (!d || d.id !== id) continue;
		if (d.qty >= m) continue;

		const space = m - d.qty;
		const moved = Math.min(space, left);
		destSlots[i] = { id, qty: d.qty + moved };
		left -= moved;
		if (left <= 0) return { moved: sourceSlot.qty, leftSlot: null };
	}

	// empties
	for (let i = 0; i < destSlots.length; i++) {
		if (destSlots[i]) continue;
		const take = Math.min(m, left);
		destSlots[i] = { id, qty: take };
		left -= take;
		if (left <= 0) return { moved: sourceSlot.qty, leftSlot: null };
	}

	const movedTotal = sourceSlot.qty - left;
	return { moved: movedTotal, leftSlot: left > 0 ? { id, qty: left } : null };
}

export function shiftClick(state, section, index) {
	const sourceSlots = section === "hotbar" ? state.hotbar : state.inventory;
	const destSlots = section === "hotbar" ? state.inventory : state.hotbar;

	const src = sourceSlots[index];
	if (!src) return false;

	const res = moveStackInto(src, destSlots);
	if (res.moved <= 0) return false;

	sourceSlots[index] = res.leftSlot;
	return true;
}
