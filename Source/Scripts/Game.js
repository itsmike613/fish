import { Events } from "./Events.js";
import { createState } from "./State.js";
import { Renderer } from "./Renderer.js";
import { World } from "./World.js";
import { Player } from "./Player.js";
import { UI } from "./UI.js";
import { Inventory } from "./Inventory.js";
import { LOOT_TABLE } from "./Loot.js";
import { Fishing } from "./Fishing.js";
import { Birds } from "./Birds.js";

export class Game {
	constructor() {
		this.events = new Events();
		this.state = createState();

		// Item lookup (shared)
		this._itemById = new Map(LOOT_TABLE.map(x => [x.id, x]));
		// Add tool defs not in Loot table (rod is a tool)
		this._itemById.set("fishingrod", {
			name: "Fishing Rod",
			description: "Cast into the sea and wait for a bite.",
			id: "fishingrod",
			sprite: "Source/Assets/Tools/fishingrod.png",
			rarity: "common",
			weight: "2lb",
			sellValue: 0,
			category: "treasure",
			maxStack: 1,
		});

		this.getItemDef = (id) => this._itemById.get(id);

		this.renderer = new Renderer({ state: this.state });
		this.world = new World({ events: this.events, state: this.state, renderer: this.renderer });

		this.inventory = new Inventory({
			hotbarSize: 9,
			bagSize: 36,
			getItemDef: this.getItemDef,
		});

		this.ui = new UI({
			events: this.events,
			state: this.state,
			inventory: this.inventory,
			getItemDef: this.getItemDef,
		});

		this.player = new Player({
			events: this.events,
			state: this.state,
			renderer: this.renderer,
			world: this.world,
		});

		this.fishing = new Fishing({
			events: this.events,
			state: this.state,
			renderer: this.renderer,
			world: this.world,
			player: this.player,
			inventory: this.inventory,
			getItemDef: this.getItemDef,
		});

		this.birds = new Birds({ state: this.state, renderer: this.renderer });

		this._bindEvents();

		// Starting item: fishing rod in hotbar slot 1
		this.inventory.setSlot("hotbar", 0, { id: "fishingrod", count: 1 });

		// Spawn at center (already in state defaults)
		this.ui.render();

		this._last = performance.now();
		this._raf = 0;

		this._loop = this._loop.bind(this);
	}

	_bindEvents() {
		// Inventory toggling: centralized here so future systems can hook it cleanly.
		this.events.on("ui:toggleInventory", () => {
			const open = !this.state.ui.inventoryOpen;
			this.events.emit("ui:inventory", { open });
		});

		this.events.on("inventory:changed", () => {
			this.ui.render();
		});

		// Optional: let UI respond to hotbar index changes
		this.events.on("ui:hotbarIndex", () => {
			this.ui.render();
		});
	}

	start() {
		this._raf = requestAnimationFrame(this._loop);
	}

	_loop(now) {
		this._raf = requestAnimationFrame(this._loop);

		const dt = Math.min(0.033, (now - this._last) / 1000);
		this._last = now;

		this.state.time.now += dt;
		this.state.time.dt = dt;

		// Update systems (single loop)
		this.player.update(dt);
		this.world.update(dt);
		this.fishing.update(dt);
		this.birds.update(dt);
		this.ui.update(dt);

		this.renderer.update();
		this.renderer.render();
	}
}
