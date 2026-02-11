export class Inventory {
	constructor(state, events, loot) {
		this.s = state;
		this.e = events;
		this.byId = new Map(loot.map(x => [x.id, x]));
	}

	def(id) { return this.byId.get(id); }

	getSlot(kind, i) {
		return kind === 'hot' ? this.s.inv.hot[i] : this.s.inv.bag[i];
	}

	setSlot(kind, i, v) {
		if (kind === 'hot') this.s.inv.hot[i] = v;
		else this.s.inv.bag[i] = v;
		this.e.emit('inv:changed');
	}

	firstEmpty(kind) {
		const a = kind === 'hot' ? this.s.inv.hot : this.s.inv.bag;
		for (let i = 0; i < a.length; i++) if (!a[i]) return i;
		return -1;
	}

	addTo(kind, id, n) {
		const def = this.def(id);
		if (!def) return n;

		const a = kind === 'hot' ? this.s.inv.hot : this.s.inv.bag;

		// stack into existing
		for (let i = 0; i < a.length && n > 0; i++) {
			const it = a[i];
			if (it && it.id === id && it.n < def.maxStack) {
				const add = Math.min(n, def.maxStack - it.n);
				it.n += add;
				n -= add;
			}
		}

		// place into empty
		for (let i = 0; i < a.length && n > 0; i++) {
			if (!a[i]) {
				const add = Math.min(n, def.maxStack);
				a[i] = { id, n: add };
				n -= add;
			}
		}

		if (n !== 0) this.e.emit('inv:full', { id, n });
		this.e.emit('inv:changed');
		return n;
	}

	moveOne(srcKind, srcI, dstKind) {
		const src = this.getSlot(srcKind, srcI);
		if (!src) return false;

		const def = this.def(src.id);
		if (!def) return false;

		const dstArr = dstKind === 'hot' ? this.s.inv.hot : this.s.inv.bag;

		// try stack into same id
		for (let i = 0; i < dstArr.length; i++) {
			const d = dstArr[i];
			if (d && d.id === src.id && d.n < def.maxStack) {
				const add = Math.min(src.n, def.maxStack - d.n);
				d.n += add;
				src.n -= add;
				if (src.n <= 0) this.setSlot(srcKind, srcI, null);
				this.e.emit('inv:changed');
				return true;
			}
		}

		// try empty
		const empty = this.firstEmpty(dstKind);
		if (empty >= 0) {
			dstArr[empty] = src;
			this.setSlot(srcKind, srcI, null);
			this.e.emit('inv:changed');
			return true;
		}

		// swap with first slot (simple, predictable)
		const swapI = 0;
		const tmp = dstArr[swapI];
		dstArr[swapI] = src;
		this.setSlot(srcKind, srcI, tmp);
		this.e.emit('inv:changed');
		return true;
	}
}
