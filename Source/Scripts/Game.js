import { Events } from "./Events.js";
import { createState } from "./State.js";
import { Renderer } from "./Renderer.js";
import { World } from "./World.js";
import { Player } from "./Player.js";
import { UI } from "./UI.js";
import { Inventory } from "./Inventory.js";
import { loot } from "./Loot.js";
import { Fishing } from "./Fishing.js";
import { Birds } from "./Birds.js";

export class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");

    this.events = new Events();
    this.state = createState();

    this.renderer = new Renderer(this.canvas);
    this.world = new World(this.renderer);

    // inventory variable name: inventory
    const inventory = new Inventory(this.events);
    this.inventory = inventory;

    // hotbar variable name: hotbar
    const hotbar = inventory.hotbar;
    this.hotbar = hotbar;

    this.ui = new UI(this.events, this.state, this.inventory);

    this.player = new Player(this.renderer, this.events, this.state, this.world);

    this.fishing = new Fishing(
      this.renderer,
      this.world,
      this.player,
      this.events,
      this.state,
      this.inventory
    );

    this.birds = new Birds(this.renderer, this.world);

    this._bootstrapLoot();
    this._bootstrapStartingItems();
  }

  _bootstrapLoot() {
    // Notify systems loot is available
    this.events.emit("loot:loaded", { loot });
  }

  _bootstrapStartingItems() {
    // Player spawns with fishing rod in hotbar slot 1 (index 0)
    this.inventory.hotbar[0] = { id: "fishingrod", count: 1 };
    this.events.emit("inventory:changed", {});
  }

  start() {
    let last = performance.now();

    const loop = (nowMs) => {
      const now = nowMs * 0.001;
      const dt = Math.min(0.05, now - (last * 0.001));
      last = nowMs;

      this.state.time.now = now;
      this.state.time.dt = dt;

      // Update world visuals
      this.world.update(dt);

      // Player movement + camera
      this.player.update(dt);

      // Underwater look (cyan) without visible sides/bottom
      const camY = this.renderer.camera.position.y;
      this.renderer.setUnderwater(camY < this.world.waterLevel + 0.05);

      // Fishing
      this.fishing.update(dt);

      // Birds
      this.birds.update(dt, now);

      // Render
      this.renderer.render();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}
