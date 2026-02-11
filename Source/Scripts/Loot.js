// fish/Source/Scripts/Loot.js
// fish/Source/Scripts/Loot.js
export const loot = [
  {
    name: "Salmon",
    description: "Tastes like $15 and the crushing realization that 'fresh caught' is just a marketing term for 'sat in a bucket of lukewarm seawater for six hours.'",
    id: "salmon",
    sprite: "./Source/Assets/Catches/salmon.png",
    category: "fish",
    rarity: "common",
    catchable: Infinity,
    sellable: true,
    stackable: 256,
    weight: 10,
    price: 15
  },
  {
    name: "Research Log #1",
    description: "Entry 1: 'The island is 30% smaller than yesterday. I've stopped leaving my shoes near the shoreline.'",
    id: "researchlog1",
    sprite: "./Source/Assets/Catches/salmon.png",
    category: "lore",
    rarity: "uncommon",
    sellable: false,
    catchable: 1,
    stackable: 1,
    weight: 0.01,
    price: 0
  }
];


/*
export const loot = [
	{
		name: "Fishing Rod",
		description: "A simple rod for casting into the sea.",
		id: "fishingrod",
		sprite: "./Source/Assets/Tools/fishingrod.png",
		rarity: "common",
		weight: 0,
		price: 0,
		category: "tool",
		maxStackSize: 1,
		sellable: false
	},
	{
		name: "Salmon",
		description: "Tastes like $15 and the crushing realization that 'fresh caught' is just a marketing term for 'sat in a bucket of lukewarm seawater for six hours.'",
		id: "salmon",
		sprite: "./Source/Assets/Catches/salmon.png",
		category: "fish",
		rarity: "common",
		catchable: "infinite",
		sellable: true,
		stackable: 256,
		weight: 10,
		price: 15,
	},
	{
		name: "Soggy Newspaper",
		description: "An obituary for a local man who died of dehydration. The irony is dripping off the pages. Literally.",
		id: "newspaper",
		sprite: "./Source/Assets/Catches/newspaper.png",
		rarity: "common",
		weight: 8,
		price: 1,
		category: "junk",
		maxStackSize: 256,
		sellable: true
	},
	{
		name: "Rusty Hook",
		description: "Guaranteed to catch something, even if it’s just a life-altering case of tetanus.",
		id: "rustyhook",
		sprite: "./Source/Assets/Catches/rustyhook.png",
		rarity: "common",
		weight: 0.05,
		price: 3,
		category: "junk",
		maxStackSize: 256,
		sellable: true
	},
	{
		name: "Old Boot",
		description: "Lore says it belonged to a man who tried to walk to the mainland to 'find himself.' He didn't find himself, but he did find out that leather is surprisingly delicious to sharks. This is all that's left of him.",
		id: "oldboot",
		sprite: "./Source/Assets/Catches/oldboot.png",
		rarity: "common",
		weight: 5,
		price: 5,
		category: "junk",
		maxStackSize: 256,
		sellable: true
	},
	{
		name: "Solid Gold Dentures",
		description: "Someone literally put their money where their mouth was. Unfortunately, they didn't have much of a bite.",
		id: "golddentures",
		sprite: "./Source/Assets/Catches/golddentures.png",
		rarity: "epic",
		category: "treasure",
		weight: 0.066,
		price: 400,
		maxStackSize: 256,
		catchable: "inf",
		sellable: true
	},
	{
		name: "Research Log #1",
		description: "Entry 1: 'The island is 30% smaller than yesterday. I've stopped leaving my shoes near the shoreline.'",
		id: "researchlog1",
		sprite: "./Source/Assets/Catches/researchlog1.png",
		category: "lore",
		rarity: "uncommon",
		sellable: false,
		catchable: 1,
		stackable: 1,
		weight: 0.01,
		price: 0
	},
	{
		name: "Research Log #2",
		description: "Entry 2: 'Found one of my loafers inside a shark's stomach. The shark looked insulted. I’m beginning to think the island isn't sinking; it's being eaten. Also, Dave has started charging me rent for the rock I'm standing on.'",
		id: "researchlog2",
		sprite: "./Source/Assets/Catches/researchlog2.png",
		rarity: "uncommon",
		category: "lore",
		weight: 0.01,
		price: 0,
		maxStackSize: 1,
		catchable: 1,
		sellable: false
	},
	{
		name: "Research Log #3",
		description: "Entry 3: 'Dave tried to evict me from my pebble today. He stopped mid-sentence when a tentacle the size of a school bus politely removed him from the premises. I’m now the CEO, the janitor, and the only guy left who isn't bait. Promotion feels... damp.'",
		id: "researchlog3",
		sprite: "./Source/Assets/Catches/researchlog3.png",
		rarity: "rare",
		category: "lore",
		weight: 1,
		price: 0,
		maxStackSize: 1,
		catchable: 1,
		sellable: false
	}
];
*/


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