// Shared runtime state slices. Keep them small + stable.
// Future systems (Save/Shop/Audio) can subscribe to Events and read/write specific slices here.
export function createState() {
	return {
		time: {
			now: 0,
			dt: 0,
		},

		ui: {
			inventoryOpen: false,
			hotbarIndex: 0, // 0..8
			pointerLocked: false,
		},

		world: {
			islandRadius: 6.0,     // diameter 12 tiles => radius 6
			shorelineRadius: 5.75, // movement boundary (slightly inside)
			waterY: 0.0,
			sandY: 0.06,
		},

		player: {
			position: { x: 0, y: 1.7, z: 0 },
			velocity: { x: 0, y: 0, z: 0 },
			onGround: false,
		},

		fishing: {
			isCast: false,
			biteActive: false,
			bobber: {
				x: 0, y: 0, z: 0,
			},
			// seconds remaining until bite
			timer: 0,
			// fish trail visibility window
			trailActive: false,
		},
	};
}
