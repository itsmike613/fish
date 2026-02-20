import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

//
// ---------- DATA (from your spec) ----------
// (Fixed the Old Boot icon path to be consistent with your folder layout)
//
const loot = [
    {
        name: "Salmon",
        desc: "Smells Fishy",
        iden: "salmon",
        icon: "./Source/Assets/Catches/Fish/salmon.png",
        ctgy: "fish",
        rrty: "uncommon",
        sell: true,
        slsp: 15,
        stak: 256,
        wght: 10,
        xpmi: 5,
        xpma: 8,
        time: [[5, 8], [16.5, 21.25]]
    },
    {
        name: "Old Boot",
        desc: "Stinky Shoe",
        iden: "oldboot",
        icon: "./Source/Assets/Catches/Junk/oldboot.png",
        ctgy: "junk",
        rrty: "common",
        sell: true,
        stak: 256,
        wght: 1.5,
        xpmi: 2,
        xpma: 4,
        slsp: 2,
        time: [[0, 24]]
    },
    {
        name: "Crown",
        desc: "Very Shiny",
        iden: "crown",
        icon: "./Source/Assets/Catches/Treasure/crown.png",
        ctgy: "treasure",
        rrty: "rare",
        sell: true,
        stak: 256,
        wght: 2.8,
        xpmi: 7,
        xpma: 9,
        slsp: 1000,
        time: [[0, 24]]
    }
];

const lore = [
    {
        name: "Research Log #1",
        desc: "Entry 1",
        icon: "./Source/Assets/Catches/Lore/researchlog.png",
        file: "./Source/Assets/Catches/Files/researchlog1.png",
        ctch: 5
    },
    {
        name: "Soggy Travel Brochure",
        desc: "Water-damaged pamphlet",
        icon: "./Source/Assets/Catches/Lore/travelbrochure.png",
        file: "./Source/Assets/Catches/Files/travelbrochure.png",
        ctch: 17
    },
    {
        name: "Research Log #2",
        desc: "Entry 2",
        icon: "./Source/Assets/Catches/Lore/researchlog.png",
        file: "./Source/Assets/Catches/Files/researchlog2.png",
        ctch: 32
    }
];

//
// ---------- STORAGE ----------
// Keys: "catches" and "inventory"
//
const DEFAULT_CATCHES = {
    lore: 0,
    fish: { C: 0, U: 0, R: 0, E: 0, L: 0 },
    junk: { C: 0, U: 0, R: 0, E: 0, L: 0 },
    treasure: { C: 0, U: 0, R: 0, E: 0, L: 0 }
};

const INV_SIZE = 45; // 5x9 (we render 4 rows inventory + 1 row hotbar)
const MAIN_SLOTS = 36; // 4x9
const HOTBAR_SLOTS = 9; // 1x9

function loadJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}
function saveJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

function ensureStorage() {
    const c = loadJSON("catches", null);
    if (!c) saveJSON("catches", structuredClone(DEFAULT_CATCHES));

    const inv = loadJSON("inventory", null);
    if (!inv || !Array.isArray(inv.slots) || inv.slots.length !== INV_SIZE) {
        saveJSON("inventory", { slots: Array.from({ length: INV_SIZE }, () => null) });
    }

    const start = localStorage.getItem("gameStartMs");
    if (!start) localStorage.setItem("gameStartMs", String(Date.now()));
}
ensureStorage();

//
// ---------- TIME SYSTEM (24-minute loop) ----------
// 1 real minute = 1 in-game hour
// 24 real minutes per full in-game day
//
function getInGameHourFloat() {
    const startMs = Number(localStorage.getItem("gameStartMs")) || Date.now();
    const elapsedMin = ((Date.now() - startMs) / 60000) % 24;
    return (elapsedMin + 24) % 24;
}

function formatInGameTime(hourFloat) {
    const h = Math.floor(hourFloat) % 24;
    const m = Math.floor((hourFloat - h) * 60);
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return `${hh}:${mm}`;
}

//
// ---------- DOM ----------
//
const threeRoot = document.getElementById("threeRoot");
const clockText = document.getElementById("clockText");

const fishingCard = document.getElementById("fishingCard");
const fishBtn = document.getElementById("fishBtn");
const barFill = document.getElementById("barFill");

const toastHost = document.getElementById("toastHost");

const invOverlay = document.getElementById("invOverlay");
const invGrid = document.getElementById("invGrid");
const hotbarGrid = document.getElementById("hotbarGrid");
const itemInfo = document.getElementById("itemInfo");

const held = document.getElementById("held");
const heldIcon = document.getElementById("heldIcon");
const heldQty = document.getElementById("heldQty");

const loreViewer = document.getElementById("loreViewer");
const loreImg = document.getElementById("loreImg");

//
// ---------- TOASTS ----------
// Structure: "[icon] message"
//
function toast(iconPath, message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `
    <img src="${iconPath}" alt="" />
    <div class="msg">${message}</div>
  `;
    toastHost.appendChild(el);

    const ttl = 2800;
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "translateY(-4px)";
        el.style.transition = "opacity .2s ease, transform .2s ease";
        setTimeout(() => el.remove(), 220);
    }, ttl);
}

const ERROR_ICON = "./Source/Assets/Icons/error.png";

//
// ---------- ITEM REGISTRY ----------
// loot + generated lore items
//
function rarityLetter(rrty) {
    switch (rrty) {
        case "common": return "C";
        case "uncommon": return "U";
        case "rare": return "R";
        case "epic": return "E";
        case "legendary": return "L";
        default: return "C";
    }
}

function loreId(index) {
    return `lore_${index}`;
}

function getItemDefById(id) {
    const base = loot.find(x => x.iden === id);
    if (base) return base;

    if (id.startsWith("lore_")) {
        const i = Number(id.split("_")[1]);
        const l = lore[i];
        if (!l) return null;
        return {
            name: l.name,
            desc: l.desc,
            iden: loreId(i),
            icon: l.icon,
            ctgy: "lore",
            rrty: "lore",
            sell: false,
            slsp: 0,
            stak: 1,
            wght: 0,
            xpmi: 0,
            xpma: 0,
            time: [[0, 24]],
            file: l.file
        };
    }
    return null;
}

//
// ---------- CATCH TOTAL + LORE LOGIC ----------
// Total = sum of all counts across fish/junk/treasure rarity buckets (NOT lore)
// Lore triggers when total == lore[nextIndex].ctch, and must be linear order.
//
function getCatches() {
    return loadJSON("catches", structuredClone(DEFAULT_CATCHES));
}
function setCatches(val) {
    saveJSON("catches", val);
}
function getTotalCatchesNonLore() {
    const c = getCatches();
    let sum = 0;
    for (const cat of ["fish", "junk", "treasure"]) {
        for (const k of ["C", "U", "R", "E", "L"]) sum += (c[cat]?.[k] || 0);
    }
    return sum;
}

function getNextLoreIndex() {
    const c = getCatches();
    return Math.min(Math.max(c.lore || 0, 0), lore.length);
}

function checkLoreOverride() {
    const total = getTotalCatchesNonLore();
    const idx = getNextLoreIndex();
    if (idx >= lore.length) return null;
    if (total === lore[idx].ctch) {
        return getItemDefById(loreId(idx));
    }
    return null;
}

//
// ---------- LOOT SELECTION ----------
// Filter by time catchable for current in-game hour, then weighted by rarity.
//
const rarityWeights = {
    common: 60,
    uncommon: 25,
    rare: 10,
    epic: 4,
    legendary: 1
};

function inTimeRanges(hour, ranges) {
    return ranges.some(([s, e]) => {
        if (s === e) return true;
        if (s < e) return hour >= s && hour < e;
        // wrap (e.g. 21 -> 2)
        return hour >= s || hour < e;
    });
}

function pickWeighted(candidates) {
    const weights = candidates.map(it => rarityWeights[it.rrty] ?? 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
        r -= weights[i];
        if (r <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

function rollCatch() {
    // Lore override first
    const loreItem = checkLoreOverride();
    if (loreItem) return { item: loreItem, qty: 1, isLore: true };

    const hour = getInGameHourFloat();
    const timeFiltered = loot.filter(it => inTimeRanges(hour, it.time));
    const candidates = timeFiltered.length ? timeFiltered : loot.slice();

    const item = pickWeighted(candidates);
    return { item, qty: 1, isLore: false };
}

//
// ---------- INVENTORY ----------
// slots: [{id, qty}] or null
//
function getInv() {
    return loadJSON("inventory", { slots: Array.from({ length: INV_SIZE }, () => null) });
}
function setInv(inv) {
    saveJSON("inventory", inv);
}

function addToInventory(itemId, qty) {
    const inv = getInv();
    const def = getItemDefById(itemId);
    if (!def) return false;

    let remaining = qty;

    // Stack into existing
    if (def.stak > 1) {
        for (let i = 0; i < inv.slots.length && remaining > 0; i++) {
            const s = inv.slots[i];
            if (s && s.id === itemId) {
                const can = Math.max(def.stak - s.qty, 0);
                const take = Math.min(can, remaining);
                if (take > 0) {
                    s.qty += take;
                    remaining -= take;
                }
            }
        }
    }

    // Fill empty slots
    for (let i = 0; i < inv.slots.length && remaining > 0; i++) {
        if (!inv.slots[i]) {
            const take = Math.min(def.stak, remaining);
            inv.slots[i] = { id: itemId, qty: take };
            remaining -= take;
        }
    }

    setInv(inv);
    return remaining === 0;
}

function incrementCatchesFor(item, isLore) {
    const c = getCatches();

    if (isLore) {
        c.lore = (c.lore || 0) + 1;
        setCatches(c);
        return;
    }

    const letter = rarityLetter(item.rrty);
    if (c[item.ctgy] && c[item.ctgy][letter] !== undefined) {
        c[item.ctgy][letter] += 1;
    }
    setCatches(c);
}

//
// ---------- INVENTORY UI (Minecraft-ish) ----------
// Click: pickup/place/merge/swap
// Shift-click: quick move between main (0..35) and hotbar (36..44)
// Hover: info panel
// Right-click lore: show image
//
let invOpen = false;
let heldStack = null; // {id, qty}

function setHeld(stack) {
    heldStack = stack;
    if (!stack) {
        held.classList.add("hidden");
        return;
    }
    const def = getItemDefById(stack.id);
    heldIcon.src = def?.icon || "";
    heldQty.textContent = stack.qty > 1 ? String(stack.qty) : "";
    held.classList.remove("hidden");
}

window.addEventListener("mousemove", (e) => {
    if (held.classList.contains("hidden")) return;
    held.style.left = `${e.clientX}px`;
    held.style.top = `${e.clientY}px`;
});

function slotEl(index, stack) {
    const el = document.createElement("div");
    el.className = "slot";
    el.dataset.index = String(index);

    if (stack) {
        const def = getItemDefById(stack.id);
        const img = document.createElement("img");
        img.className = "icon";
        img.src = def?.icon || "";
        img.alt = def?.name || stack.id;

        const qty = document.createElement("div");
        qty.className = "qty";
        qty.textContent = stack.qty > 1 ? String(stack.qty) : "";

        el.appendChild(img);
        el.appendChild(qty);

        // Hover info
        el.addEventListener("mouseenter", () => showItemInfo(def, stack.qty));
        el.addEventListener("mouseleave", () => hideItemInfo());
    } else {
        el.addEventListener("mouseenter", () => hideItemInfo());
    }

    // Left click: pickup / place
    el.addEventListener("click", (e) => {
        e.preventDefault();
        const inv = getInv();
        const cur = inv.slots[index];

        // shift click quick move
        if (e.shiftKey && cur) {
            quickMove(index);
            return;
        }

        // normal click
        if (!heldStack && cur) {
            inv.slots[index] = null;
            setInv(inv);
            setHeld(cur);
            renderInventory();
            return;
        }

        if (heldStack && !cur) {
            inv.slots[index] = heldStack;
            setInv(inv);
            setHeld(null);
            renderInventory();
            return;
        }

        if (heldStack && cur) {
            // merge if same id and stackable
            if (cur.id === heldStack.id) {
                const def = getItemDefById(cur.id);
                const max = def?.stak ?? 1;
                const can = Math.max(max - cur.qty, 0);
                const take = Math.min(can, heldStack.qty);
                if (take > 0) {
                    cur.qty += take;
                    heldStack.qty -= take;
                    inv.slots[index] = cur;
                    setInv(inv);
                    if (heldStack.qty <= 0) setHeld(null);
                    else setHeld(heldStack);
                    renderInventory();
                    return;
                }
            }

            // swap
            inv.slots[index] = heldStack;
            setInv(inv);
            setHeld(cur);
            renderInventory();
        }
    });

    // Right click lore item -> viewer
    el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (!stack) return;
        const def = getItemDefById(stack.id);
        if (def?.ctgy === "lore" && def.file) {
            openLoreViewer(def.file);
        }
    });

    return el;
}

function renderInventory() {
    const inv = getInv();
    invGrid.innerHTML = "";
    hotbarGrid.innerHTML = "";

    for (let i = 0; i < MAIN_SLOTS; i++) {
        invGrid.appendChild(slotEl(i, inv.slots[i]));
    }
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
        const idx = MAIN_SLOTS + i;
        hotbarGrid.appendChild(slotEl(idx, inv.slots[idx]));
    }
}

function showItemInfo(def, qty) {
    if (!def) return;
    itemInfo.classList.remove("hidden");

    const price = def.sell ? `$${def.slsp}` : "Not sellable";
    const rarity = def.ctgy === "lore" ? "Lore" : def.rrty;
    const weight = def.wght ?? 0;

    itemInfo.innerHTML = `
    <div class="name">${def.name} ${qty > 1 ? `x${qty}` : ""}</div>
    <div class="desc">${def.desc}</div>
    <div class="stats">
      <div><b>Category:</b> ${def.ctgy}</div>
      <div><b>Rarity:</b> ${rarity}</div>
      <div><b>Price:</b> ${price}</div>
      <div><b>Stack:</b> ${def.stak}</div>
      <div><b>Weight:</b> ${weight} lbs</div>
      <div><b>XP:</b> ${def.xpmi}-${def.xpma}</div>
    </div>
  `;
}

function hideItemInfo() {
    itemInfo.classList.add("hidden");
    itemInfo.innerHTML = "";
}

function quickMove(fromIndex) {
    const inv = getInv();
    const stack = inv.slots[fromIndex];
    if (!stack) return;

    const inMain = fromIndex < MAIN_SLOTS;
    const targetStart = inMain ? MAIN_SLOTS : 0;
    const targetEnd = inMain ? INV_SIZE : MAIN_SLOTS;

    const def = getItemDefById(stack.id);
    const max = def?.stak ?? 1;

    // Try merge first
    for (let i = targetStart; i < targetEnd; i++) {
        const s = inv.slots[i];
        if (s && s.id === stack.id && max > 1) {
            const can = Math.max(max - s.qty, 0);
            const take = Math.min(can, stack.qty);
            if (take > 0) {
                s.qty += take;
                stack.qty -= take;
                if (stack.qty <= 0) {
                    inv.slots[fromIndex] = null;
                    setInv(inv);
                    renderInventory();
                    return;
                }
            }
        }
    }

    // Then empty slot
    for (let i = targetStart; i < targetEnd; i++) {
        if (!inv.slots[i]) {
            inv.slots[i] = stack;
            inv.slots[fromIndex] = null;
            setInv(inv);
            renderInventory();
            return;
        }
    }

    // No room: do nothing
}

function openInventory() {
    invOpen = true;
    fishingCard.classList.add("hidden");
    invOverlay.classList.remove("hidden");
    renderInventory();
}

function closeInventory() {
    invOpen = false;
    invOverlay.classList.add("hidden");
    fishingCard.classList.remove("hidden");
    hideItemInfo();
    setHeld(null);
}

//
// ---------- LORE VIEWER ----------
// Right-click lore item in inventory -> show image.
// Exit: ESC, E, or click anywhere closes image and re-opens inventory.
//
let loreOpen = false;

function openLoreViewer(src) {
    loreOpen = true;
    loreImg.src = src;
    loreViewer.classList.remove("hidden");
    // hide menus
    invOverlay.classList.add("hidden");
    fishingCard.classList.add("hidden");
    setHeld(null);
    hideItemInfo();
}

function closeLoreViewer() {
    loreOpen = false;
    loreViewer.classList.add("hidden");
    // re-open inventory (spec)
    if (invOpen) invOverlay.classList.remove("hidden");
}

loreViewer.addEventListener("click", () => {
    if (loreOpen) closeLoreViewer();
});

//
// ---------- FISHING MECHANIC ----------
// - Idle: "Fish" (bar empty)
// - Click Fish => button -> "Reel In", bar fills over 2-6s
// - Clicking too early => "Too quick!" toast (no state change)
// - When fill completes => 2s window to click Reel In
// - Miss window => "The fish escaped!" and reset
//
let fishingState = "idle"; // idle | waiting | ready
let biteTimer = null;
let windowTimer = null;
let animRaf = null;

function resetFishingUI() {
    fishingState = "idle";
    fishBtn.textContent = "Fish";
    barFill.style.width = "0%";
    if (biteTimer) clearTimeout(biteTimer);
    if (windowTimer) clearTimeout(windowTimer);
    biteTimer = null;
    windowTimer = null;
    if (animRaf) cancelAnimationFrame(animRaf);
    animRaf = null;
}

function startFishing() {
    fishingState = "waiting";
    fishBtn.textContent = "Reel In";
    barFill.style.width = "0%";

    const durationMs = (2000 + Math.random() * 4000) | 0; // 2-6 sec
    const start = performance.now();

    const tick = (t) => {
        const p = Math.min(1, (t - start) / durationMs);
        barFill.style.width = `${(p * 100).toFixed(1)}%`;
        if (p < 1 && fishingState === "waiting") {
            animRaf = requestAnimationFrame(tick);
        }
    };
    animRaf = requestAnimationFrame(tick);

    biteTimer = setTimeout(() => {
        fishingState = "ready";
        barFill.style.width = "100%";

        // 2s window to reel in
        windowTimer = setTimeout(() => {
            if (fishingState === "ready") {
                toast(ERROR_ICON, "The fish escaped!");
                resetFishingUI();
            }
        }, 2000);
    }, durationMs);
}

function successfulReel() {
    const { item, qty, isLore } = rollCatch();
    addToInventory(item.iden, qty);
    incrementCatchesFor(item, isLore);

    toast(item.icon, `You caught x${qty} ${item.name}!`);
    if (invOpen) renderInventory();
    resetFishingUI();
}

fishBtn.addEventListener("click", () => {
    if (loreOpen) return;

    if (fishingState === "idle") {
        startFishing();
        return;
    }

    if (fishingState === "waiting") {
        toast(ERROR_ICON, "Too quick!");
        return;
    }

    if (fishingState === "ready") {
        successfulReel();
    }
});

resetFishingUI();

//
// ---------- KEYBINDS ----------
// E toggles inventory; when lore viewer open, E closes image + reopens inventory.
// ESC closes lore viewer; also closes inventory (nice-to-have).
//
window.addEventListener("keydown", (e) => {
    if (e.code === "KeyE") {
        if (loreOpen) {
            closeLoreViewer();
            return;
        }
        if (!invOpen) openInventory();
        else closeInventory();
    }

    if (e.code === "Escape") {
        if (loreOpen) {
            closeLoreViewer();
            return;
        }
        if (invOpen) closeInventory();
    }
});

//
// ---------- THREE.JS BACKGROUND ----------
// Infinite water (big plane + moving UV), slight transparency,
// seagulls (2-3) occasionally, 24-min day cycle synced.
//
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
threeRoot.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 20000);
camera.position.set(0, 22, 38);
camera.lookAt(0, 0, 0);

scene.fog = new THREE.Fog(0x0b1020, 30, 2200);

// Lights updated each frame by in-game time
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(80, 120, -60);
scene.add(sun);

// Water
const texLoader = new THREE.TextureLoader();
const waterTex = texLoader.load("./Source/Assets/Terrain/water.png");
waterTex.wrapS = THREE.RepeatWrapping;
waterTex.wrapT = THREE.RepeatWrapping;
waterTex.repeat.set(600, 600);

const waterGeo = new THREE.PlaneGeometry(12000, 12000, 1, 1);
const waterMat = new THREE.MeshPhongMaterial({
    map: waterTex,
    transparent: true,
    opacity: 0.86,
    shininess: 80,
    specular: new THREE.Color(0x88bbff)
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.rotation.x = -Math.PI / 2;
water.position.y = 0;
scene.add(water);

// Stars (visible at night)
const starCount = 900;
const starGeom = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const r = 1400 + Math.random() * 1800;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * (Math.PI / 2); // upper hemisphere
    const x = r * Math.cos(theta) * Math.sin(phi);
    const y = 600 + r * Math.cos(phi);
    const z = r * Math.sin(theta) * Math.sin(phi);
    starPos[i * 3 + 0] = x;
    starPos[i * 3 + 1] = y;
    starPos[i * 3 + 2] = z;
}
starGeom.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.0, transparent: true, opacity: 0.0 });
const stars = new THREE.Points(starGeom, starMat);
scene.add(stars);

// Day-cycle colors (synced to in-game hour float)
const SKY_NIGHT = new THREE.Color(0x050b18);
const SKY_SUNRISE = new THREE.Color(0xffb36b);
const SKY_DAY = new THREE.Color(0x87ceeb);
const SKY_SUNSET = new THREE.Color(0xff6a3d);

function lerpColor(a, b, t) {
    return a.clone().lerp(b, t);
}

// Returns factors + sky color based on hour (continuous)
function dayCycle(hour) {
    // Segments:
    // Night: 20-24 and 0-5
    // Sunrise: 5-7
    // Day: 7-17
    // Sunset: 17-20
    if (hour < 5) {
        // night to sunrise hint
        const t = hour / 5;
        return { sky: lerpColor(SKY_NIGHT, SKY_NIGHT, t), sun: 0.08, amb: 0.20, stars: 1.0 };
    }
    if (hour < 7) {
        const t = (hour - 5) / 2;
        return { sky: lerpColor(SKY_NIGHT, SKY_SUNRISE, t), sun: 0.55, amb: 0.55, stars: 1.0 - t };
    }
    if (hour < 17) {
        const t = (hour - 7) / 10;
        return { sky: lerpColor(SKY_DAY, SKY_DAY, t), sun: 1.0, amb: 0.85, stars: 0.0 };
    }
    if (hour < 20) {
        const t = (hour - 17) / 3;
        return { sky: lerpColor(SKY_DAY, SKY_SUNSET, t), sun: 0.75 - 0.35 * t, amb: 0.70, stars: 0.15 * t };
    }
    // 20-24 night
    const t = (hour - 20) / 4;
    return { sky: lerpColor(SKY_SUNSET, SKY_NIGHT, t), sun: 0.25 * (1 - t), amb: 0.35, stars: 0.35 + 0.65 * t };
}

// Seagulls (simple white bodies + flapping wings)
class Seagull {
    constructor() {
        this.group = new THREE.Group();

        const body = new THREE.Mesh(
            new THREE.SphereGeometry(0.7, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.0 })
        );
        body.scale.set(1.2, 0.8, 0.9);
        this.group.add(body);

        const wingGeom = new THREE.BoxGeometry(1.6, 0.08, 0.7);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });

        this.wingL = new THREE.Mesh(wingGeom, wingMat);
        this.wingR = new THREE.Mesh(wingGeom, wingMat);

        this.wingL.position.set(-1.05, 0.05, 0);
        this.wingR.position.set(1.05, 0.05, 0);
        this.group.add(this.wingL, this.wingR);

        this.birth = performance.now();
        this.lifeMs = 9000 + Math.random() * 11000;

        this.radius = 70 + Math.random() * 80;
        this.speed = 0.35 + Math.random() * 0.35;
        this.height = 22 + Math.random() * 16;
        this.phase = Math.random() * Math.PI * 2;
    }

    update(t, camPos) {
        const age = t - this.birth;
        const u = age / 1000;

        const ang = this.phase + u * this.speed;
        const x = camPos.x + Math.cos(ang) * this.radius;
        const z = camPos.z + Math.sin(ang) * this.radius;
        const y = this.height + Math.sin(u * 0.9) * 2.2;

        this.group.position.set(x, y, z);
        this.group.lookAt(camPos.x, y, camPos.z);

        const flap = Math.sin(u * 9.5) * 0.85;
        this.wingL.rotation.z = flap;
        this.wingR.rotation.z = -flap;

        return age < this.lifeMs;
    }
}

const gulls = [];
function maybeSpawnGull() {
    if (gulls.length >= 3) return;
    if (Math.random() < 0.55) { // occasional
        const g = new Seagull();
        gulls.push(g);
        scene.add(g.group);
    }
}
setInterval(maybeSpawnGull, 7000);

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);

// Render loop
let lastT = performance.now();
function animate(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    // Update time UI
    const hour = getInGameHourFloat();
    clockText.textContent = `${formatInGameTime(hour)} (24-min day)`;

    // Day cycle visuals (synced to in-game hour)
    const cyc = dayCycle(hour);
    scene.background = cyc.sky;
    scene.fog.color.copy(cyc.sky);

    ambient.intensity = cyc.amb;
    sun.intensity = cyc.sun;
    // Rotate sun direction across the "day"
    const sunAng = (hour / 24) * Math.PI * 2;
    sun.position.set(Math.cos(sunAng) * 200, 120 + Math.sin(sunAng) * 40, Math.sin(sunAng) * -200);

    starMat.opacity = Math.min(1, Math.max(0, cyc.stars));

    // Water sliding
    waterTex.offset.x = (waterTex.offset.x + dt * 0.012) % 1;
    waterTex.offset.y = (waterTex.offset.y + dt * 0.006) % 1;

    // Seagulls update
    for (let i = gulls.length - 1; i >= 0; i--) {
        const alive = gulls[i].update(t, camera.position);
        if (!alive) {
            scene.remove(gulls[i].group);
            gulls.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

//
// ---------- FINAL: keep fishing UI consistent on page load ----------
//
if (invOpen) renderInventory();