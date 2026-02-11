// fish/Source/Scripts/Game.js
import { State } from './State.js';
import { Renderer } from './Renderer.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { Inventory } from './Inventory.js';
import { UI } from './UI.js';
import { Fishing } from './Fishing.js';

export default class Game {
  constructor(){
    this.canvas = document.getElementById('c');

    this.state = new State();
    this.r = new Renderer(this.canvas);
    this.world = new World(this.r.scene);

    this.inv = new Inventory(this.state);
    this.player = new Player(this.state, this.r.camera, this.world, this.canvas);
    this.ui = new UI(this.state, this.inv, this.player, this.canvas);
    this.fish = new Fishing(this.state, this.world, this.r.camera, this.r.scene, this.inv);

    this._last = performance.now();
    this._run = (t) => this._tick(t);

    this._ctx = (e) => e.preventDefault();
    document.addEventListener('contextmenu', this._ctx);

    this._onDown = (e) => this._down(e);
    window.addEventListener('pointerdown', this._onDown);

    this._unload = () => this.state.save();
    window.addEventListener('beforeunload', this._unload);

    this.fish.restoreFromState();
  }

  _down(e){
    if(e.button !== 2) return;
    e.preventDefault();

    if(this.ui.open) return;

    if(this.state.data.fishing && this.state.data.fishing.active){
      this.fish.reel();
      return;
    }

    this.fish.cast();
  }

  start(){
    requestAnimationFrame(this._run);
  }

  _tick(t){
    const dt = Math.min(0.033, (t - this._last) / 1000);
    this._last = t;

    this.player.update(dt);
    this.world.update(this.player.pos);
    this.fish.update(dt);

    this.r.render();
    requestAnimationFrame(this._run);
  }

  dispose(){
    document.removeEventListener('contextmenu', this._ctx);
    window.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('beforeunload', this._unload);

    this.ui.dispose();
    this.player.dispose();
    this.r.dispose();
  }
}
