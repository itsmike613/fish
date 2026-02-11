// fish/Source/Scripts/Events.js
export class Events {
	constructor() {
		this.m = new Map();
	}

	on(type, fn) {
		if (!this.m.has(type)) this.m.set(type, new Set());
		this.m.get(type).add(fn);
	}

	off(type, fn) {
		const s = this.m.get(type);
		if (!s) return;
		s.delete(fn);
		if (s.size === 0) this.m.delete(type);
	}

	emit(type, data) {
		const s = this.m.get(type);
		if (!s) return;
		for (const fn of s) fn(data);
	}
}

export const events = new Events();
