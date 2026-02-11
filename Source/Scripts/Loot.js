// PURE DATA ONLY: no logic here.
export const LOOT_TABLE = [
	{
		name: "Salmon",
		description: "A strong, swift fighter with firm pink meat.",
		id: "salmon",
		sprite: "Source/Assets/Catches/salmon.png",
		rarity: "common",
		weight: "10lb",
		sellValue: 15,
		category: "fish",
		maxStack: 8,
	},

	// A few extras to prove the architecture is expandable:
	{
		name: "Driftwood",
		description: "Sun-bleached and salty. Good for… something.",
		id: "driftwood",
		sprite: "Source/Assets/Catches/salmon.png", // placeholder sprite if you don't have one
		rarity: "common",
		weight: "2lb",
		sellValue: 2,
		category: "junk",
		maxStack: 16,
	},
	{
		name: "Old Coin",
		description: "A corroded coin with faint markings.",
		id: "old_coin",
		sprite: "Source/Assets/Catches/salmon.png", // placeholder sprite if you don't have one
		rarity: "uncommon",
		weight: "0.1lb",
		sellValue: 25,
		category: "treasure",
		maxStack: 32,
	},
	{
		name: "Pearl",
		description: "Smooth, bright, and oddly warm to the touch.",
		id: "pearl",
		sprite: "Source/Assets/Catches/salmon.png", // placeholder sprite if you don't have one
		rarity: "rare",
		weight: "0.2lb",
		sellValue: 80,
		category: "treasure",
		maxStack: 16,
	},
];

// Weighted by rarity in Fishing.js (logic lives there).
