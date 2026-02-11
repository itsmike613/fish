export function makeState() {
	return {
		ui: {
			invOpen: false,
			hotSel: 0,
			cursor: true
		},
		world: {
			tile: 1,
			islandR: 6,
			shorePad: 0.15,
			waterY: 0
		},
		player: {
			pos: { x: 0, y: 1.7, z: 0 },
			vel: { x: 0, y: 0, z: 0 },
			grounded: true,
			sprint: false
		},
		inv: {
			hot: Array.from({ length: 9 }, () => null),
			bag: Array.from({ length: 36 }, () => null),
		},
		fishing: {
			cast: false,
			bite: false,
			t: 0,
			showCd: false,
			cd: 0
		}
	};
}
