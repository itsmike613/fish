// fish/Source/Scripts/UI.js
import { loot } from './Loot.js';

function lootById(){
  const m = new Map();
  for(const it of loot) m.set(it.id, it);
  return m;
}
const lootMap = lootById();

function makeSlot(section, i){
  const d = document.createElement('div');
  d.className = 'slot';
  d.dataset.section = section;
  d.dataset.i = String(i);
  return d;
}

function slotContent(d, item){
  d.innerHTML = '';
  if(!item) return;

  const info = lootMap.get(item.id);
  if(!info) return;

  const img = document.createElement('img');
  img.src = info.sprite;
  img.alt = info.name;
  d.appendChild(img);

  if(item.count > 1){
    const c = document.createElement('div');
    c.className = 'count';
    c.textContent = String(item.count);
    d.appendChild(c);
  }
}

function cursorContent(d, item){
  d.innerHTML = '';
  if(!item){
    d.classList.add('hidden');
    return;
  }
  const info = lootMap.get(item.id);
  if(!info){
    d.classList.add('hidden');
    return;
  }
  d.classList.remove('hidden');

  const img = document.createElement('img');
  img.src = info.sprite;
  img.alt = info.name;
  d.appendChild(img);

  if(item.count > 1){
    const c = document.createElement('div');
    c.className = 'count';
    c.textContent = String(item.count);
    d.appendChild(c);
  }
}

export class UI {
  constructor(state, inv, player, canvas){
    this.state = state;
    this.inv = inv;
    this.player = player;
    this.canvas = canvas;

    this.hotbarEl = document.getElementById('hotbar');
    this.invWrap = document.getElementById('inv');
    this.invGrid = document.getElementById('invGrid');
    this.cursorEl = document.getElementById('cursorItem');

    this.open = false;

    this.hotSlots = [];
    this.invSlots = [];

    this._build();

    this._onKey = (e) => this._key(e);
    this._onClick = (e) => this._click(e);
    this._onMouse = (e) => this._mouse(e);
    this._onCanvasDown = () => this._canvasDown();

    window.addEventListener('keydown', this._onKey);
    document.addEventListener('click', this._onClick);
    document.addEventListener('mousemove', this._onMouse, { passive:true });
    this.canvas.addEventListener('pointerdown', this._onCanvasDown);

    this.state.on('inv', () => this.render());
    this.state.on('selected', () => this.render());
    this.state.on('cursor', () => this.renderCursor());
    this.state.on('catch', () => this.render());

    this.render();
    this.renderCursor();

    this._setCursorMode(false);
  }

  _build(){
    for(let i=0;i<9;i++){
      const s = makeSlot('hotbar', i);
      this.hotbarEl.appendChild(s);
      this.hotSlots.push(s);
    }

    for(let i=0;i<36;i++){
      const s = makeSlot('inv', i);
      this.invGrid.appendChild(s);
      this.invSlots.push(s);
    }
  }

  _setCursorMode(open){
    if(open){
      document.body.style.cursor = 'default';
      this.invWrap.classList.remove('hidden');
      this.player.setEnabled(false);
      this.player.setLook(false);
      this.player.unlock();
    }else{
      document.body.style.cursor = 'none';
      this.invWrap.classList.add('hidden');
      this.player.setEnabled(true);
      this.player.setLook(true);
      this.player.requestLock();
    }
  }

  toggle(){
    this.open = !this.open;

    if(!this.open){
      this.inv.stashCursor();
      this.state.save(); // inventory close autosave
    }

    this._setCursorMode(this.open);
    this.render();
    this.renderCursor();
  }

  _key(e){
    if(e.code === 'KeyE'){
      e.preventDefault();
      this.toggle();
      return;
    }

    if(e.code.startsWith('Digit')){
      const n = (e.code === 'Digit0') ? 10 : (e.code.charCodeAt(5) - 48);
      if(n >= 1 && n <= 9){
        this.state.setSelected(n - 1);
      }
      return;
    }
  }

  _findSlotEl(el){
    if(!el) return null;
    const s = el.closest?.('.slot');
    if(!s) return null;
    const section = s.dataset.section;
    const i = parseInt(s.dataset.i || '0', 10);
    if(section !== 'hotbar' && section !== 'inv') return null;
    return { section, i };
  }

  _click(e){
    const hit = this._findSlotEl(e.target);
    if(!hit) return;

    if(!this.open && hit.section !== 'hotbar') return;

    this.inv.click(hit.section, hit.i);
    this.render();
    this.renderCursor();
  }

  _mouse(e){
    if(!this.open) return;
    this.cursorEl.style.left = `${e.clientX}px`;
    this.cursorEl.style.top = `${e.clientY}px`;
  }

  _canvasDown(){
    if(this.open) return;
    this.player.requestLock();
  }

  render(){
    const d = this.state.data;
    for(let i=0;i<9;i++){
      const el = this.hotSlots[i];
      el.classList.toggle('sel', d.selected === i);
      slotContent(el, d.hotbar[i]);
    }
    for(let i=0;i<36;i++){
      const el = this.invSlots[i];
      slotContent(el, d.inventory[i]);
    }
  }

  renderCursor(){
    cursorContent(this.cursorEl, this.inv.cursor);
  }

  dispose(){
    window.removeEventListener('keydown', this._onKey);
    document.removeEventListener('click', this._onClick);
    document.removeEventListener('mousemove', this._onMouse);
    this.canvas.removeEventListener('pointerdown', this._onCanvasDown);
  }
}
