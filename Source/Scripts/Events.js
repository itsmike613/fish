export class Events {
	constructor() {
		this.m = new Map();
	}
	on(ev, fn) {
		let a = this.m.get(ev);
		if (!a) { a = []; this.m.set(ev, a); }
		a.push(fn);
		return () => this.off(ev, fn);
	}
	off(ev, fn) {
		const a = this.m.get(ev);
		if (!a) return;
		const i = a.indexOf(fn);
		if (i >= 0) a.splice(i, 1);
	}
	emit(ev, data) {
		const a = this.m.get(ev);
		if (!a) return;
		for (let i = 0; i < a.length; i++) a[i](data);
	}
}
