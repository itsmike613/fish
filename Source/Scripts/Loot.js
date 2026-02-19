// fish/Source/Scripts/Loot.js
export const loot = [
	{
		name: "...", // Name
		desc: "...", // Description
		iden: "...", // ID
		imge: "...", // Image Sprite Path
		ctgy: "...", // Item Category
		luck: "...", // Item Rarity
		sell: true, // Sellable
		slsp: 15, // Selling Price
		stak: 256, // Stackable Size
		wght: 10, // Weight (lbs)
		xpmi: 5, // Exp Points Minimum
		xpma: 8, // Exp Points Maximum
		bait: ["invisbread"], // Bait That Ups Chances
		time: ["morning", "dusk"] // Time Catchable
  	},
	{
		name: "Salmon",
		desc: "Tastes like $15 and the crushing realization that 'fresh caught' is just a marketing term for 'sat in a bucket of lukewarm seawater for six hours.'",
		iden: "salmon",
		imge: "./Source/Assets/Catches/salmon.png",
		ctgy: "fish",
		rarity: "common",
		catchable: Infinity,
		sellable: true,
		stackable: 256,
		weight: 10,
		price: 15,
	}
];

export const bait = [
	{
		name: "Invisible Bread",
		desc: "The fish can't see it. You can't see it. Does it even exist? Who knows.",
		iden: "invisbread"
	}
];

export const lore = [
	{
		name: "Research Log #1",
		desc: "Entry 1",
		imge: "./Source/Assets/Catches/Lore/researchlog.png",
		file: "./Source/Assets/Catches/Files/researchlog1.png",
		iden: 1
		/*
			Entry 1: 'The island is 30% smaller than yesterday. I've stopped leaving my shoes near the shoreline.'
		*/
	},
	{
		name: "Research Log #2",
		desc: "Entry 2",
		imge: "./Source/Assets/Catches/Lore/researchlog.png",
		file: "./Source/Assets/Catches/Files/researchlog2.png",
		iden: 2
		/*
			Entry 2: 'Found one of my loafers inside a shark's stomach. The shark looked insulted. I’m beginning to think the island isn't sinking; it's being eaten. Also, Dave has started charging me rent for the rock I'm standing on.'
		*/
	},
	{
		name: "Research Log #3",
		desc: "Entry 3",
		imge: "./Source/Assets/Catches/Lore/researchlog.png",
		file: "./Source/Assets/Catches/Files/researchlog3.png",
		iden: 3
		/*
			Entry 3: 'Dave tried to evict me from my pebble today. He stopped mid-sentence when a tentacle the size of a school bus politely removed him from the premises. I’m now the CEO, the janitor, and the only guy left who isn't bait. Promotion feels... damp.'
		*/
	},
	{
		name: "Research Log #4",
		desc: "Entry 4",
		imge: "./Source/Assets/Catches/Lore/researchlog.png",
		file: "./Source/Assets/Catches/Files/researchlog4.png",
		iden: 4
		/*
			Entry 4: 'I caught a toaster today. It still had a piece of sourdough in it. I tried to share it with Dave, but he just sat there being a rock. Or a very still person. I’m starting to suspect Dave might just be a very large, unusually judgmental piece of granite. He still owes me five bucks.'
		*/
	},
	{
		name: "Soggy Travel Brochure",
		desc: "A glossy, water-damaged pamphlet for 'The Paradise Pebble.' It promises 5-star luxury, 'Adaptive Landmass Technology,' and a world-class concierge named Dave. Gary has circled the 'Free Parking' disclaimer in gold ink. It’s the smoking gun that proves Gary didn't get shipwrecked; he actually paid for this experience.",
		imge: "./Source/Assets/Catches/Lore/travelbrochure.png",
		file: "./Source/Assets/Catches/Files/travelbrochure.png",
		iden: 5
		/*
			[Title: THE PARADISE PEBBLE – EXCLUSIVE BOUTIQUE RETREAT]
			(Image: A photoshopped picture of a sprawling 5-star resort with a crystal-clear pool, despite the island currently being a 4-foot wide rock.)

			The Pitch:
				"Tired of the 'Mainland' hustle? Escape to a location so exclusive, it isn't even on most maps! Experience our Adaptive Landmass Technology™—a resort that literally moves with the rhythm of the ocean."

			Your Dedicated Staff:
				"Upon arrival, you will be greeted by our Head Concierge, Dave. Dave is a man of few words, known for his rock-solid stability and his ability to remain perfectly still for weeks at a time. He handles all guest complaints, though he rarely—if ever—responds to them."

			The Fine Print:
				Resort size may vary based on the tide, weather, or the hunger levels of the tectonic plates.
				The 'All-You-Can-Eat' buffet refers to the local ecosystem's policy toward guests.
				Please do not feed the island. It prefers to choose its own snacks.
		*/
	},
	{
        name: "Research Log #5",
        desc: "Entry 5",
        imge: "./Source/Assets/Catches/Lore/researchlog.png",
        file: "./Source/Assets/Catches/Files/researchlog5.png",
        iden: 6
        /*
            Entry 5: 'I found a patch of moss today. I tried to use it as a pillow, but when I peeled it back, there was a heavy iron hatch underneath. It has a keyhole shaped like a starfish. I asked Dave if he had the key. He didn't answer, but he looked like he was hiding something. Suspicious.'
        */
    },
    {
        name: "Research Log #6",
        desc: "Entry 6",
        imge: "./Source/Assets/Catches/Lore/researchlog.png",
        file: "./Source/Assets/Catches/Files/researchlog6.png",
        iden: 7
        /*
            Entry 6: 'Fished up a plastic remote today. It has three buttons: High Tide, Low Tide, and Panic. I pressed Panic. The entire island grew a single, hydraulic leg and hopped six feet to the left. I fell into the ocean. Dave didn't even flinch. Show-off.'
        */
    },
    {
        name: "Research Log #7",
        desc: "Entry 7",
        imge: "./Source/Assets/Catches/Lore/researchlog.png",
        file: "./Source/Assets/Catches/Files/researchlog7.png",
        iden: 8
        /*
            Entry 7: 'The sun is hot. I tried to use Dave for shade, but he’s not tall enough. I’ve started drawing a face on him so I know which side is his "business" side. He looks better with a mustache. He still hasn't paid me that five bucks.'
        */
    },
    {
        name: "Research Log #8",
        desc: "Entry 8",
        imge: "./Source/Assets/Catches/Lore/researchlog.png",
        file: "./Source/Assets/Catches/Files/researchlog8.png",
        iden: 9
        /*
            Entry 8: 'Caught a wet envelope. It’s a noise complaint from the "neighbors." I looked around for three miles. There are no neighbors. Just water. I think the ocean is gaslighting me. Dave agrees, but he’s biased.'
        */
    },
    {
        name: "A Crinkled Postcard",
        desc: "A postcard from the REAL Paradise Pebble.",
        imge: "./Source/Assets/Catches/Lore/postcard.png",
        file: "./Source/Assets/Catches/Files/postcard.png",
        iden: 10
        /*
            [Front: A picture of a lush, tropical island with 20-story hotels and a ferris wheel.]
            
            [Back: 'Dear Valued Guest, we noticed you never checked in for your 12:00 PM ferry. Please note that the Paradise Pebble is located 400 miles North of the "Testing Trench." If you are currently standing on a small, mechanical rock with a man named Dave, please remain calm and do not press the Panic button. Regards, Management.']
        */
    }
];


/*export const loot = [
  {
    name: "Salmon",
    description:
      "Tastes like $15 and the crushing realization that 'fresh caught' is just a marketing term for 'sat in a bucket of lukewarm seawater for six hours.'",
    id: "salmon",
    sprite: "./Source/Assets/Catches/salmon.png",
    category: "fish",
    rarity: "common",
    catchable: Infinity,
    sellable: true,
    stackable: 256,
    weight: 10,
    price: 15,
  },
  {
    name: "Research Log #1",
    description:
      "Entry 1: 'The island is 30% smaller than yesterday. I've stopped leaving my shoes near the shoreline.'",
    id: "researchlog1",
    sprite: "./Source/Assets/Catches/researchlog1.png",
    category: "lore",
    rarity: "uncommon",
    sellable: false,
    catchable: 1,
    stackable: 1,
    weight: 0.01,
    price: 0,
  },

  {
    name: "Old Boot",
    description: "A boot with more stories than support.",
    id: "oldboot",
    sprite: "./Source/Assets/Catches/salmon.png",
    category: "junk",
    rarity: "common",
    catchable: Infinity,
    sellable: true,
    stackable: 64,
    weight: 1.5,
    price: 2,
  },
  {
    name: "Glass Bottle",
    description: "Empty, unless you count the smell.",
    id: "bottle",
    sprite: "./Source/Assets/Catches/salmon.png",
    category: "junk",
    rarity: "common",
    catchable: Infinity,
    sellable: true,
    stackable: 64,
    weight: 0.4,
    price: 1,
  },
  {
    name: "Silver Ring",
    description: "Cold, clean, and suspiciously perfect.",
    id: "silverring",
    sprite: "./Source/Assets/Catches/salmon.png",
    category: "treasure",
    rarity: "rare",
    catchable: Infinity,
    sellable: true,
    stackable: 16,
    weight: 0.05,
    price: 120,
  },
  {
    name: "Pearl",
    description: "A small sphere of luck and seawater.",
    id: "pearl",
    sprite: "./Source/Assets/Catches/salmon.png",
    category: "treasure",
    rarity: "epic",
    catchable: Infinity,
    sellable: true,
    stackable: 16,
    weight: 0.02,
    price: 420,
  },
  {
    name: "Crown Fragment",
    description: "A sharp piece of something that used to matter.",
    id: "crownfragment",
    sprite: "./Source/Assets/Catches/salmon.png",
    category: "treasure",
    rarity: "legendary",
    catchable: Infinity,
    sellable: true,
    stackable: 4,
    weight: 0.2,
    price: 2500,
  },
  {
    name: "Research Log #2",
    description:
      "Entry 2: 'The gulls don't land anymore. They just orbit, like they're waiting for something to stop moving.'",
    id: "researchlog2",
    sprite: "./Source/Assets/Catches/researchlog1.png",
    category: "lore",
    rarity: "rare",
    sellable: false,
    catchable: 1,
    stackable: 1,
    weight: 0.01,
    price: 0,
  },
];*/



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