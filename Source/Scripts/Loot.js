// Loot.js = PURE DATA only (no logic)
// Required variable name: loot

export const loot = [
	{
		name: "Fishing Rod",
		description: "A simple rod for casting into the sea.",
		id: "fishingrod",
		sprite: "./Source/Assets/Tools/fishingrod.png",
		rarity: "common",
		weight: "—",
		sellValue: "$0",
		category: "tool",
		maxStackSize: 1
	},

	// Example item: Salmon (exact fields requested)
	{
		name: "Salmon",
		description: "A strong, swift fighter with firm pink meat.",
		id: "salmon",
		sprite: "./Source/Assets/Catches/salmon.png",
		rarity: "common",
		weight: "10lb",
		sellValue: "$15",
		category: "fish",
		maxStackSize: 8
	}
];



/*export const Loot = [
	{
		name: 'Salmon',
		description: 'A strong, swift fighter with firm pink meat.',
		id: 'salmon',
		sprite: 'Source/Assets/Catches/salmon.png',
		rarity: 'common',
		weight: '10lb',
		sell: 15,
		category: 'fish',
		maxStack: 8
	},
	{
		name: 'Old Boot',
		description: 'Wet, heavy, and somehow still smells worse.',
		id: 'boot',
		sprite: 'Source/Assets/Catches/salmon.png',
		rarity: 'common',
		weight: '3lb',
		sell: 1,
		category: 'junk',
		maxStack: 1
	},
	{
		name: 'Pearl',
		description: 'A smooth little treasure from the deep.',
		id: 'pearl',
		sprite: 'Source/Assets/Catches/salmon.png',
		rarity: 'rare',
		weight: '0.1lb',
		sell: 120,
		category: 'treasure',
		maxStack: 16
	}
];*/