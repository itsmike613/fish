// fish/Source/Scripts/State.js
import { Events } from './Events.js';
import { Save } from './Save.js';

function now(){
  return Date.now();
}

function fresh(){
  return {
    hotbar: Array.from({length:9}, () => null),
    inventory: Array.from({length:36}, () => null),
    selected: 0,

    catches: {},

    player: {
      x: 0,
      y: 1,
      z: 0,
      yaw: 0,
      pitch: 0
    },

    fishing: {
      active: false,
      x: 0,
      y: 0,
      z: 0,
      castAt: 0,
      biteAt: 0,
      biteTime: 0,
      expired: false
    },

    savedAt: now()
  };
}

export class State {
  constructor(){
    this.bus = new Events();
    const loaded = Save.load();
    this.data = loaded ? loaded : fresh();
    this._norm();
  }

  _norm(){
    const d = this.data;

    if(!Array.isArray(d.hotbar) || d.hotbar.length !== 9) d.hotbar = Array.from({length:9}, () => null);
    if(!Array.isArray(d.inventory) || d.inventory.length !== 36) d.inventory = Array.from({length:36}, () => null);

    if(typeof d.selected !== 'number' || d.selected < 0 || d.selected > 8) d.selected = 0;
    if(!d.catches || typeof d.catches !== 'object') d.catches = {};

    if(!d.player || typeof d.player !== 'object') d.player = {x:0,y:1,z:0,yaw:0,pitch:0};
    for(const k of ['x','y','z','yaw','pitch']){
      if(typeof d.player[k] !== 'number') d.player[k] = 0;
    }
    if(typeof d.player.y !== 'number') d.player.y = 1;
    if(d.player.y < 1) d.player.y = 1;

    if(!d.fishing || typeof d.fishing !== 'object'){
      d.fishing = {active:false,x:0,y:0,z:0,castAt:0,biteAt:0,biteTime:0,expired:false};
    }
    for(const k of ['active','x','y','z','castAt','biteAt','biteTime','expired']){
      if(!(k in d.fishing)){
        if(k === 'active' || k === 'expired') d.fishing[k] = false;
        else d.fishing[k] = 0;
      }
    }
  }

  on(name, fn){ return this.bus.on(name, fn); }
  emit(name, v){ this.bus.emit(name, v); }

  save(){
    this.data.savedAt = now();
    Save.save(this.data);
    this.emit('saved', null);
  }

  setSelected(i){
    const d = this.data;
    const n = Math.max(0, Math.min(8, i|0));
    if(d.selected !== n){
      d.selected = n;
      this.emit('selected', n);
      this.save();
    }
  }

  setPlayer(p){
    const d = this.data.player;
    d.x = p.x;
    d.y = p.y;
    d.z = p.z;
    d.yaw = p.yaw;
    d.pitch = p.pitch;
    this.emit('player', this.data.player);
  }

  setFishing(f){
    this.data.fishing = {
      active: !!f.active,
      x: +f.x || 0,
      y: +f.y || 0,
      z: +f.z || 0,
      castAt: +f.castAt || 0,
      biteAt: +f.biteAt || 0,
      biteTime: +f.biteTime || 0,
      expired: !!f.expired
    };
    this.emit('fishing', this.data.fishing);
  }

  incCatch(id, n=1){
    const d = this.data.catches;
    d[id] = (d[id] || 0) + (n|0);
    this.emit('catches', {id, count: d[id]});
  }
}
