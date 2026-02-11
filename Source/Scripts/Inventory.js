// fish/Source/Scripts/Inventory.js
import { loot } from './Loot.js';

function byId(){
  const m = new Map();
  for(const it of loot) m.set(it.id, it);
  return m;
}

const lootById = byId();

function maxStack(id){
  const it = lootById.get(id);
  return it ? (it.stackable|0) : 1;
}

function normSlot(s){
  if(!s) return null;
  if(typeof s !== 'object') return null;
  if(typeof s.id !== 'string') return null;
  const c = s.count|0;
  if(c <= 0) return null;
  return { id: s.id, count: c };
}

function canStack(id){
  return maxStack(id) > 1;
}

export class Inventory {
  constructor(state){
    this.state = state;
    this.cursor = null;
  }

  get hotbar(){ return this.state.data.hotbar; }
  get inv(){ return this.state.data.inventory; }

  _emitChanged(){
    this.state.emit('inv', null);
  }

  _save(){
    this.state.save();
  }

  slot(section, i){
    const a = (section === 'hotbar') ? this.hotbar : this.inv;
    return a[i] ?? null;
  }

  setSlot(section, i, v){
    const a = (section === 'hotbar') ? this.hotbar : this.inv;
    a[i] = normSlot(v);
  }

  click(section, i){
    const s = normSlot(this.slot(section, i));
    const c = normSlot(this.cursor);

    if(!c && s){
      this.cursor = s;
      this.setSlot(section, i, null);
      this._emitChanged();
      this.state.emit('cursor', this.cursor);
      this._save();
      return;
    }

    if(c && !s){
      this.setSlot(section, i, c);
      this.cursor = null;
      this._emitChanged();
      this.state.emit('cursor', this.cursor);
      this._save();
      return;
    }

    if(c && s){
      if(c.id === s.id && canStack(c.id)){
        const m = maxStack(c.id);
        const space = m - s.count;
        if(space > 0){
          const add = Math.min(space, c.count);
          s.count += add;
          c.count -= add;
          this.setSlot(section, i, s);
          this.cursor = c.count > 0 ? c : null;
          this._emitChanged();
          this.state.emit('cursor', this.cursor);
          this._save();
          return;
        }
      }

      this.setSlot(section, i, c);
      this.cursor = s;
      this._emitChanged();
      this.state.emit('cursor', this.cursor);
      this._save();
    }
  }

  add(id, count){
    count = count|0;
    if(count <= 0) return 0;
    const m = maxStack(id);

    const fill = (arr) => {
      if(m <= 1) return;
      for(let i=0;i<arr.length;i++){
        const s = normSlot(arr[i]);
        if(!s) continue;
        if(s.id !== id) continue;
        if(s.count >= m) continue;
        const space = m - s.count;
        const add = Math.min(space, count);
        s.count += add;
        count -= add;
        arr[i] = s;
        if(count <= 0) return;
      }
    };

    const place = (arr) => {
      for(let i=0;i<arr.length;i++){
        const s = normSlot(arr[i]);
        if(s) continue;
        const add = Math.min(m, count);
        arr[i] = { id, count: add };
        count -= add;
        if(count <= 0) return;
      }
    };

    fill(this.hotbar);
    fill(this.inv);
    place(this.hotbar);
    place(this.inv);

    this._emitChanged();
    this._save();
    return count; // leftover
  }

  stashCursor(){
    const c = normSlot(this.cursor);
    if(!c) return;
    const left = this.add(c.id, c.count);
    this.cursor = left > 0 ? { id: c.id, count: left } : null;
    this.state.emit('cursor', this.cursor);
    this._save();
  }
}
