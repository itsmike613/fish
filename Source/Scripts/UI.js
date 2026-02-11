// fish/Source/Scripts/UI.js
import { get } from './State.js';
import { events } from './Events.js';

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

export default class UI {
  constructor(inv, renderer, fishing) {
    this.inv = inv;
    this.renderer = renderer;
    this.fishing = fishing;

    this.hint = document.getElementById('hint');
    this.hotbar = document.getElementById('hotbar');
    this.invWrap = document.getElementById('inv');
    this.grid = document.getElementById('grid');
    this.bob = document.getElementById('bob');

    this.hotSlots = [];
    this.invSlots = [];

    this._buildHotbar();
    this._buildInv();

    this._syncAll();

    events.on('inv', () => this._syncAll());
    events.on('state:slot', () => this._syncHotSel());
    events.on('state:invOpen', () => this._syncInvOpen());

    this._syncInvOpen();
    this._syncHint();
  }

  _buildHotbar() {
    this.hotbar.innerHTML = '';
    this.hotSlots.length = 0;

    for (let i = 0; i < 9; i++) {
      const s = el('div', 'slot');
      const img = el('img');
      img.draggable = false;
      const cnt = el('div', 'cnt');

      s.appendChild(img);
      s.appendChild(cnt);

      this.hotbar.appendChild(s);
      this.hotSlots.push({ s, img, cnt });
    }
  }

  _buildInv() {
    this.grid.innerHTML = '';
    this.invSlots.length = 0;

    for (let i = 0; i < 36; i++) {
      const s = el('div', 'slot');
      const img = el('img');
      img.draggable = false;
      const cnt = el('div', 'cnt');

      s.appendChild(img);
      s.appendChild(cnt);

      s.addEventListener('click', () => {
        if (!get('invOpen')) return;
        this.inv.moveBetween('inv', i);
      });

      this.grid.appendChild(s);
      this.invSlots.push({ s, img, cnt });
    }

    // enable clicking hotbar only when inventory open
    for (let i = 0; i < 9; i++) {
      this.hotSlots[i].s.addEventListener('click', () => {
        if (!get('invOpen')) return;
        this.inv.moveBetween('hot', i);
      });
    }
  }

  _syncAll() {
    this._syncHot();
    this._syncInv();
    this._syncHotSel();
  }

  _syncSlot(ui, item) {
    if (!item) {
      ui.img.style.display = 'none';
      ui.img.src = '';
      ui.cnt.textContent = '';
      return;
    }

    const d = this.inv.getDef(item.id);
    if (!d) {
      ui.img.style.display = 'none';
      ui.img.src = '';
      ui.cnt.textContent = '';
      return;
    }

    ui.img.style.display = 'block';
    ui.img.src = d.sprite;
    ui.cnt.textContent = item.n > 1 ? String(item.n) : '';
  }

  _syncHot() {
    for (let i = 0; i < 9; i++) {
      this._syncSlot(this.hotSlots[i], this.inv.hot[i]);
    }
  }

  _syncInv() {
    for (let i = 0; i < 36; i++) {
      this._syncSlot(this.invSlots[i], this.inv.inv[i]);
    }
  }

  _syncHotSel() {
    const sel = get('slot');
    for (let i = 0; i < 9; i++) {
      if (i === sel) this.hotSlots[i].s.classList.add('sel');
      else this.hotSlots[i].s.classList.remove('sel');
    }
  }

  _syncInvOpen() {
    const open = get('invOpen');
    this.invWrap.classList.toggle('hide', !open);
    this.hotbar.style.pointerEvents = open ? 'auto' : 'none';
    this._syncHint();
  }

  _syncHint() {
    const open = get('invOpen');
    const locked = get('pointerLocked');
    const show = !open && !locked;
    this.hint.style.display = show ? 'block' : 'none';
  }

  update() {
    this._syncHint();

    const hud = this.fishing.getHud();
    if (!hud || !hud.show) {
      this.bob.classList.add('hide');
      return;
    }

    const cam = this.renderer.camera;
    const r = this.renderer.r;
    const v = hud.pos.clone().project(cam);

    const x = (v.x * 0.5 + 0.5) * r.domElement.clientWidth;
    const y = (-v.y * 0.5 + 0.5) * r.domElement.clientHeight;

    this.bob.classList.remove('hide');
    this.bob.textContent = hud.text;
    this.bob.style.color = hud.color;
    this.bob.style.left = `${x}px`;
    this.bob.style.top = `${y}px`;
  }
}
