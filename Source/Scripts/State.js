export function createState() {
	// Shared runtime state slices (future-proof: add Save/Shop/Audio later via events + new slices)
	return {
		time: {
			now: 0,
			dt: 0
		},
		ui: {
			inventoryOpen: false,
			selectedHotbarIndex: 0
		},
		input: {
			pointerLocked: false
		},
		player: {
			position: { x: 0, y: 0, z: 0 }
		},
		// fishing state variable name: fish
		fish: {
			cast: false,
			biteActive: false,
			timer: 0,
			wait: 0,
			lastCountdownVisible: false
		}
	};
}
