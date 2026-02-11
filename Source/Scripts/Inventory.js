// fish/Source/Scripts/Inventory.js
import { loot } from './Loot.js';
import { events } from './Events.js';

export default class Inventory {
  constructor() {
    this.hot = new Array(9).fill(null);
    this.inv = new Array(36).fill(null);

    this.def = new Map();
    this.def.set('fishingrod', {
      id: 'fishingrod',
      name: 'Fishing Rod',
      sprite: './Source/Assets/Tools/fishingrod.png',
      stackable: 1,
    });

    for (const it of loot) {
      this.def.set(it.id, {
        id: it.id,
        name: it.name,
        sprite: it.sprite,
        stackable: it.stackable,
      });
    }
  }

  getDef(id) {
    return this.def.get(id) || null;
  }

  _maxStack(id) {
    const d = this.getDef(id);
    return d ? (d.stackable | 0) : 1;
  }

  _arr(section) {
    return section === 'hot' ? this.hot : this.inv;
  }

  get(section, i) {
    const a = this._arr(section);
    return a[i] || null;
  }

  set(section, i, item) {
    const a = this._arr(section);
    a[i] = item;
    events.emit('inv', null);
  }

  clear(section, i) {
    const a = this._arr(section);
    a[i] = null;
    events.emit('inv', null);
  }

  spawnStart() {
    this.hot[0] = { id: 'fishingrod', n: 1 };
    events.emit('inv', null);
  }

  _mergeInto(a, item) {
    if (!item || item.n <= 0) return 0;
    const max = this._maxStack(item.id);
    let left = item.n;

    for (let i = 0; i < a.length; i++) {
      const s = a[i];
      if (!s) continue;
      if (s.id !== item.id) continue;
      if (s.n >= max) continue;

      const can = Math.min(max - s.n, left);
      s.n += can;
      left -= can;
      if (left <= 0) return 0;
    }

    return left;
  }

  _placeInto(a, item) {
    if (!item || item.n <= 0) return 0;
    const max = this._maxStack(item.id);
    let left = item.n;

    for (let i = 0; i < a.length; i++) {
      if (a[i]) continue;
      const put = Math.min(max, left);
      a[i] = { id: item.id, n: put };
      left -= put;
      if (left <= 0) return 0;
    }

    return left;
  }

  addItem(id, n) {
    const item = { id, n: n | 0 };
    if (item.n <= 0) return false;

    let left = item.n;
    left = this._mergeInto(this.hot, { id, n: left });
    left = this._mergeInto(this.inv, { id, n: left });

    left = this._placeInto(this.hot, { id, n: left });
    left = this._placeInto(this.inv, { id, n: left });

    events.emit('inv', null);
    return left === 0;
  }

  moveBetween(section, i) {
    const from = section === 'hot' ? this.hot : this.inv;
    const to = section === 'hot' ? this.inv : this.hot;

    const it = from[i];
    if (!it) return;

    const leftAfterMerge = this._mergeInto(to, { id: it.id, n: it.n });
    const leftAfterPlace = this._placeInto(to, { id: it.id, n: leftAfterMerge });

    if (leftAfterPlace === it.n) return; // nothing moved

    if (leftAfterPlace <= 0) {
      from[i] = null;
    } else {
      from[i].n = leftAfterPlace;
    }

    events.emit('inv', null);
  }
}
