// fish/Source/Scripts/Events.js
export class Events {
  constructor(){
    this.m = new Map();
  }

  on(name, fn){
    if(!this.m.has(name)) this.m.set(name, new Set());
    this.m.get(name).add(fn);
    return () => this.off(name, fn);
  }

  off(name, fn){
    const s = this.m.get(name);
    if(!s) return;
    s.delete(fn);
    if(s.size === 0) this.m.delete(name);
  }

  emit(name, data){
    const s = this.m.get(name);
    if(!s) return;
    for(const fn of s) fn(data);
  }
}
