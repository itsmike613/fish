export class Events {
	constructor() {
		this.listeners = new Map();
	}

	on(name, fn) {
		if (!this.listeners.has(name)) this.listeners.set(name, new Set());
		this.listeners.get(name).add(fn);
		return () => this.off(name, fn);
	}

	off(name, fn) {
		const set = this.listeners.get(name);
		if (!set) return;
		set.delete(fn);
		if (set.size === 0) this.listeners.delete(name);
	}

	emit(name, payload) {
		const set = this.listeners.get(name);
		if (!set) return;
		for (const fn of set) fn(payload);
	}
}
