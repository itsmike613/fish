// Small pub/sub. Systems communicate through events, not direct imports.
export class Events {
	constructor() {
		/** @type {Map<string, Set<Function>>} */
		this._map = new Map();
	}

	on(type, fn) {
		if (!this._map.has(type)) this._map.set(type, new Set());
		this._map.get(type).add(fn);
		return () => this.off(type, fn);
	}

	off(type, fn) {
		const set = this._map.get(type);
		if (!set) return;
		set.delete(fn);
		if (set.size === 0) this._map.delete(type);
	}

	emit(type, payload) {
		const set = this._map.get(type);
		if (!set) return;
		// Avoid allocations: iterate directly
		for (const fn of set) fn(payload);
	}
}
