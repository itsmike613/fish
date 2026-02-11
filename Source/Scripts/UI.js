export class UI {
	constructor(state, events, inv, loot) {
		this.s = state;
		this.e = events;
		this.inv = inv;
		this.byId = new Map(loot.map(x => [x.id, x]));

		this.elHot = document.querySelector('#hotbar');
		this.elWrap = document.querySelector('#invWrap');
		this.elGrid = document.querySelector('#invGrid');

		this.hotSlots = [];
		this.bagSlots = [];

		this._mkHotbar();
		this._mkInv();

		this._bind();

		this.e.on('inv:changed', () => this.draw());
		this.e.on('ui:inv', (open) => this.setInv(open));
		this.draw();
	}

	_bind() {
		window.addEventListener('keydown', (ev) => {
			if (ev.code === 'KeyE') {
				ev.preventDefault();
				this.e.emit('ui:toggleInv');
			}

			// 1..9
			if (!this.s.ui.invOpen) {
				const n = ev.key >= '1' && ev.key <= '9' ? (ev.key.charCodeAt(0) - 49) : -1;
				if (n >= 0) {
					this.s.ui.hotSel = n;
					this.e.emit('ui:hotSel', n);
					this.drawHotSel();
				}
			}
		});
	}

	setInv(open) {
		this.s.ui.invOpen = open;
		this.elWrap.classList.toggle('hidden', !open);
		this.e.emit('ui:cursor', open);
		this.drawHotSel();
		this.draw();
	}

	_mkHotbar() {
		this.elHot.innerHTML = '';
		for (let i = 0; i < 9; i++) {
			const d = document.createElement('div');
			d.className = 'slot';
			d.dataset.kind = 'hot';
			d.dataset.i = String(i);
			this.elHot.appendChild(d);
			this.hotSlots.push(d);

			// Click to move only when inv open
			d.addEventListener('click', (ev) => {
				if (!this.s.ui.invOpen) return;
				ev.preventDefault();
				this.inv.moveOne('hot', i, 'bag');
			});
		}
		this.drawHotSel();
	}

	_mkInv() {
		this.elGrid.innerHTML = '';
		for (let i = 0; i < 36; i++) {
			const d = document.createElement('div');
			d.className = 'slot';
			d.dataset.kind = 'bag';
			d.dataset.i = String(i);
			this.elGrid.appendChild(d);
			this.bagSlots.push(d);

			d.addEventListener('click', (ev) => {
				ev.preventDefault();
				this.inv.moveOne('bag', i, 'hot');
			});
		}
	}

	drawHotSel() {
		for (let i = 0; i < 9; i++) {
			this.hotSlots[i].classList.toggle('sel', i === this.s.ui.hotSel);
		}
	}

	_drawSlot(el, item) {
		el.innerHTML = '';
		if (!item) return;

		const def = this.byId.get(item.id);
		if (!def) return;

		const img = document.createElement('img');
		img.src = './' + def.sprite;
		img.alt = def.name;
		el.appendChild(img);

		if (item.n > 1) {
			const c = document.createElement('div');
			c.className = 'cnt';
			c.textContent = String(item.n);
			el.appendChild(c);
		}
	}

	draw() {
		for (let i = 0; i < 9; i++) this._drawSlot(this.hotSlots[i], this.s.inv.hot[i]);
		for (let i = 0; i < 36; i++) this._drawSlot(this.bagSlots[i], this.s.inv.bag[i]);
		this.drawHotSel();
	}
}
