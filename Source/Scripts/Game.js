import { Events } from './Events.js';
import { makeState } from './State.js';
import { Renderer } from './Renderer.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { Inventory } from './Inventory.js';
import { UI } from './UI.js';
import { Loot } from './Loot.js';
import { Fishing } from './Fishing.js';
import { Birds } from './Birds.js';

export class Game {
	constructor() {
		this.e = new Events();
		this.s = makeState();

		this.ren = new Renderer(this.s, this.e);
		this.world = new World(this.s, this.e, this.ren);

		this.inv = new Inventory(this.s, this.e, Loot);

		// Starting item: fishing rod in hotbar slot 1 (index 0)
		this.inv.byId.set('fishingrod', {
			name: 'Fishing Rod',
			description: 'Simple but reliable.',
			id: 'fishingrod',
			sprite: 'Source/Assets/Tools/fishingrod.png',
			rarity: 'common',
			weight: '—',
			sell: 0,
			category: 'tool',
			maxStack: 1
		});
		this.s.inv.hot[0] = { id: 'fishingrod', n: 1 };

		this.ui = new UI(this.s, this.e, this.inv, [...Loot, this.inv.byId.get('fishingrod')]);

		this.player = new Player(this.s, this.e, this.ren, this.world);

		this.fish = new Fishing(this.s, this.e, this.ren, this.world, this.player, this.inv, Loot);

		this.birds = new Birds(this.s, this.e, this.ren);

		this._last = 0;

		// clean cross-system toggles via events (future Save/Shop/Audio safe)
		this.e.on('ui:toggleInv', () => this.e.emit('ui:inv', !this.s.ui.invOpen));
	}

	start() {
		requestAnimationFrame((t) => this._loop(t));
	}

	_loop(t) {
		const dt = Math.min(0.033, (t - this._last) / 1000 || 0);
		this._last = t;

		// update
		this.world.update(dt);
		this.player.update(dt);
		this.fish.update(dt);
		this.birds.update(dt);

		// underwater look (player can't enter water, but keeps the requirement + future-proof)
		const under = this.ren.cam.position.y < this.s.world.waterY + 0.05;
		this.ren.setFog(under);

		// render
		this.ren.render();

		requestAnimationFrame((tt) => this._loop(tt));
	}
}
