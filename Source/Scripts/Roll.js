// fish/Source/Scripts/Roll.js
import { loot } from "./Loot.js";

const rarityWeights = [
    ["common", 60],
    ["uncommon", 25],
    ["rare", 10],
    ["epic", 4],
    ["legendary", 1],
];

const lootById = new Map();
for (const item of loot) lootById.set(item.id, item);

export function getLootById(id) {
    return lootById.get(id) || null;
}

export function canAward(id, catchCounts) {
    const item = lootById.get(id);
    if (!item) return false;
    if (item.catchable === Infinity) return true;
    const n = typeof catchCounts[id] === "number" ? catchCounts[id] : 0;
    return n < item.catchable;
}

function pickRarity() {
    let total = 0;
    for (const [, w] of rarityWeights) total += w;
    let r = Math.random() * total;
    for (const [rarity, w] of rarityWeights) {
        r -= w;
        if (r <= 0) return rarity;
    }
    return "common";
}

function candidatesForRarity(rarity, catchCounts) {
    const arr = [];
    for (const item of loot) {
        if (item.rarity !== rarity) continue;
        if (!canAward(item.id, catchCounts)) continue;
        arr.push(item);
    }
    return arr;
}

function findAnyAvailable(catchCounts) {
    for (const [rarity] of rarityWeights) {
        const c = candidatesForRarity(rarity, catchCounts);
        if (c.length) return c;
    }
    return [];
}

function rollQty(item) {
    if (item.stackable <= 1) return 1;

    if (item.category === "fish") return 1 + Math.floor(Math.random() * Math.min(4, item.stackable));
    if (item.category === "junk") return 1 + Math.floor(Math.random() * Math.min(2, item.stackable));
    return 1;
}

export function rollLoot(catchCounts) {
    const rarity = pickRarity();
    let candidates = candidatesForRarity(rarity, catchCounts);

    if (!candidates.length) {
        candidates = findAnyAvailable(catchCounts);
        if (!candidates.length) return null;
    }

    const item = candidates[Math.floor(Math.random() * candidates.length)];
    const qty = Math.min(item.stackable, Math.max(1, rollQty(item)));

    return { id: item.id, qty };
}

export function recordAward(catchCounts, id) {
    const item = lootById.get(id);
    if (!item) return;

    if (item.catchable === Infinity) return;

    const cur = typeof catchCounts[id] === "number" ? catchCounts[id] : 0;
    catchCounts[id] = cur + 1;
}
