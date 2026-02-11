// fish/Source/Scripts/Events.js
export class Events {
  constructor() {
    this.map = new Map();
  }

  on(name, fn) {
    if (!this.map.has(name)) this.map.set(name, new Set());
    this.map.get(name).add(fn);
    return () => this.off(name, fn);
  }

  off(name, fn) {
    const set = this.map.get(name);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) this.map.delete(name);
  }

  emit(name, data) {
    const set = this.map.get(name);
    if (!set) return;
    for (const fn of set) fn(data);
  }
}

export const events = new Events();
