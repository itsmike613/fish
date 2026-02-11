// fish/Source/Scripts/Save.js
const KEY = 'fish_save_v1';

function clone(v){
  return JSON.parse(JSON.stringify(v));
}

export const Save = {
  load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return null;
      const data = JSON.parse(raw);
      if(!data || typeof data !== 'object') return null;
      return data;
    }catch{
      return null;
    }
  },

  save(data){
    try{
      localStorage.setItem(KEY, JSON.stringify(clone(data)));
    }catch{
      // ignore
    }
  }
};
