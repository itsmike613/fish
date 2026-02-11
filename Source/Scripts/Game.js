// fish/Source/Scripts/Game.js
import Renderer from './Renderer.js';
import World from './World.js';
import Player from './Player.js';
import UI from './UI.js';
import Inventory from './Inventory.js';
import Fishing from './Fishing.js';
import { get, set, toggleInv, setSlot } from './State.js';

export default class Game {
  constructor() {
    this.renderer = new Renderer();
    this.world = new World(this.renderer.scene);
    this.inv = new Inventory();
    this.player = new Player(this.renderer.camera, this.world);
    this.fishing = new Fishing(this.renderer.scene, this.renderer.camera, this.world, this.inv);
    this.ui = new UI(this.inv, this.renderer, this.fishing);

    this.keys = {
      w: false, a: false, s: false, d: false,
      ctrl: false,
    };

    this._last = performance.now() / 1000;

    this._bind();
  }

  async start() {
    await this.world.init();
    this.renderer.resize();
    this.inv.spawnStart();
    this._loop();
  }

  _bind() {
    // prevent context menu
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // click to lock pointer (only when inventory closed)
    this.renderer.r.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        if (!get('invOpen') && !get('pointerLocked')) this.renderer.lockPointer();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!get('pointerLocked')) return;
      if (get('invOpen')) return;
      this.player.onMouseMove(e.movementX || 0, e.movementY || 0);
    });

    document.addEventListener('mousedown', (e) => {
      if (e.button !== 2) return;
      if (!get('pointerLocked')) return;
      if (get('invOpen')) return;

      const slot = get('slot');
      this.fishing.tryCastOrReel(performance.now() / 1000, slot);
    });

    document.addEventListener('keydown', (e) => {
      const code = e.code;

      if (code === 'KeyE') {
        toggleInv();
        if (get('invOpen')) {
          this.renderer.unlockPointer();
        }
        return;
      }

      if (get('invOpen')) return;

      if (code === 'KeyW') this.keys.w = true;
      else if (code === 'KeyA') this.keys.a = true;
      else if (code === 'KeyS') this.keys.s = true;
      else if (code === 'KeyD') this.keys.d = true;
      else if (code === 'ControlLeft' || code === 'ControlRight') this.keys.ctrl = true;
      else if (code === 'Space') this.player.setJumpPressed(true);
      else if (code.startsWith('Digit')) {
        const n = (code === 'Digit0') ? 10 : parseInt(code.slice(5), 10);
        if (Number.isFinite(n) && n >= 1 && n <= 9) setSlot(n - 1);
      }
    });

    document.addEventListener('keyup', (e) => {
      const code = e.code;

      if (code === 'KeyW') this.keys.w = false;
      else if (code === 'KeyA') this.keys.a = false;
      else if (code === 'KeyS') this.keys.s = false;
      else if (code === 'KeyD') this.keys.d = false;
      else if (code === 'ControlLeft' || code === 'ControlRight') this.keys.ctrl = false;
    });

    // keep key state sane on blur
    window.addEventListener('blur', () => {
      this.keys.w = this.keys.a = this.keys.s = this.keys.d = false;
      this.keys.ctrl = false;
    });

    // keep hint visibility accurate on pointer lock changes
    document.addEventListener('pointerlockchange', () => {
      set('pointerLocked', document.pointerLockElement === this.renderer.r.domElement);
    });
  }

  _loop() {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0.0, now - this._last));
    this._last = now;

    const allowMove = get('pointerLocked') && !get('invOpen');

    this.world.update(dt);
    this.player.update(dt, this.keys, allowMove);
    this.fishing.update(dt, now);
    this.ui.update();

    this.renderer.render();
    requestAnimationFrame(() => this._loop());
  }
}
