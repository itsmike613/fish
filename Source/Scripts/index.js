import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

/* Loot + Lore Data (shape locked) */
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

/* DOM */
const dom = {
    card: document.getElementById("card"),
    time: document.getElementById("labelTime"),
    bagTime: document.getElementById("bagTime"),
    fishBtn: document.getElementById("fishBtn"),
    fishBtnText: document.querySelector("#fishBtn .btnText"),
    toastWrap: document.getElementById("toastWrap"),
    bag: document.getElementById("bag"),
    grid: document.getElementById("grid"),
    infoText: document.getElementById("infoText"),
    held: document.getElementById("held"),
    loreView: document.getElementById("loreView"),
    loreImg: document.getElementById("loreImg"),
    bg: document.getElementById("bg"),
};

const icons = {
    error: "./Source/Assets/Icons/error.png"
};

/* Utilities */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

function rand(a, b) { return a + Math.random() * (b - a); }
function pickWeighted(list, getW) {
    const total = list.reduce((s, it) => s + Math.max(0, getW(it)), 0);
    let r = Math.random() * total;
    for (const it of list) {
        r -= Math.max(0, getW(it));
        if (r <= 0) return it;
    }
    return list[list.length - 1];
}

function rarityKey(rrty) {
    const map = { common: "C", uncommon: "U", rare: "R", epic: "E", legendary: "L" };
    return map[rrty] || "C";
}

/* In-Game Time (24-minute loop) */
class GameClock {
    constructor() {
        this.loopMs = 24 * 60 * 1000;
    }
    nowMs() { return Date.now(); }
    elapsedMs() {
        const now = this.nowMs();
        const loopStart = now - (now % this.loopMs); // stable; no drift
        return now - loopStart;
    }
    hourFloat() {
        const mins = this.elapsedMs() / 60000; // 0..24
        return mins;
    }
    timeText() {
        const mins = (this.elapsedMs() / 60000) * 60; // in-game minutes in a 24h day
        const total = (mins % (24 * 60) + (24 * 60)) % (24 * 60);
        const h = Math.floor(total / 60);
        const m = Math.floor(total % 60);
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        return `${hh}:${mm}`;
    }
}

/* Local Storage */
const store = {
    invKey: "fish_inv_v1",
    catchKey: "fish_catches_v1",
    readInv() {
        try {
            const raw = localStorage.getItem(this.invKey);
            const inv = raw ? JSON.parse(raw) : null;
            if (!Array.isArray(inv) || inv.length !== 45) return Array(45).fill(null);
            return inv;
        } catch { return Array(45).fill(null); }
    },
    writeInv(inv) {
        localStorage.setItem(this.invKey, JSON.stringify(inv));
    },
    readCatches() {
        const base = {
            lore: 0,
            fish: { C: 0, U: 0, R: 0, E: 0, L: 0 },
            junk: { C: 0, U: 0, R: 0, E: 0, L: 0 },
            treasure: { C: 0, U: 0, R: 0, E: 0, L: 0 }
        };
        try {
            const raw = localStorage.getItem(this.catchKey);
            const data = raw ? JSON.parse(raw) : null;
            if (!data) return base;
            for (const k of ["lore", "fish", "junk", "treasure"]) if (!(k in data)) return base;
            return data;
        } catch { return base; }
    },
    writeCatches(c) {
        localStorage.setItem(this.catchKey, JSON.stringify(c));
    }
};

function totalCatches(c) {
    const sumBucket = (obj) => Object.values(obj).reduce((s, v) => s + (Number(v) || 0), 0);
    return sumBucket(c.fish) + sumBucket(c.junk) + sumBucket(c.treasure);
}

/* Inventory */
class Inventory {
    constructor() {
        this.slots = store.readInv();
    }
    save() { store.writeInv(this.slots); }
    get(i) { return this.slots[i]; }
    set(i, it) { this.slots[i] = it; this.save(); }
    swap(a, b) {
        const t = this.slots[a];
        this.slots[a] = this.slots[b];
        this.slots[b] = t;
        this.save();
    }
    findMeta(iden) {
        const n = loot.find(x => x.iden === iden);
        if (n) return n;
        if (iden?.startsWith("lore_")) {
            const idx = Number(iden.split("_")[1]);
            if (Number.isFinite(idx) && lore[idx]) {
                return { ...lore[idx], iden, ctgy: "lore", rrty: "lore", sell: false, stak: 1 };
            }
        }
        return null;
    }
    add(iden, qty) {
        const meta = this.findMeta(iden);
        if (!meta) return { added: 0, left: qty };
        let left = qty;

        // stack into existing
        if (meta.stak && meta.stak > 1) {
            for (let i = 0; i < this.slots.length && left > 0; i++) {
                const s = this.slots[i];
                if (s && s.iden === iden && s.qty < meta.stak) {
                    const can = meta.stak - s.qty;
                    const take = Math.min(can, left);
                    s.qty += take;
                    left -= take;
                }
            }
        }

        // empty slots
        for (let i = 0; i < this.slots.length && left > 0; i++) {
            if (!this.slots[i]) {
                const put = meta.stak ? Math.min(meta.stak, left) : left;
                this.slots[i] = { iden, qty: put };
                left -= put;
            }
        }

        const added = qty - left;
        this.save();
        return { added, left };
    }
    moveToNext(idx) {
        const item = this.slots[idx];
        if (!item) return false;

        const meta = this.findMeta(item.iden);
        const start = (idx + 1) % this.slots.length;

        // pass 1: same stacks
        const order = [];
        for (let i = 0; i < this.slots.length; i++) {
            order.push((start + i) % this.slots.length);
        }

        if (meta?.stak > 1) {
            for (const j of order) {
                if (j === idx) continue;
                const s = this.slots[j];
                if (s && s.iden === item.iden && s.qty < meta.stak) {
                    const can = meta.stak - s.qty;
                    const take = Math.min(can, item.qty);
                    s.qty += take;
                    item.qty -= take;
                    if (item.qty <= 0) {
                        this.slots[idx] = null;
                        this.save();
                        return true;
                    }
                }
            }
        }

        // pass 2: empty
        for (const j of order) {
            if (j === idx) continue;
            if (!this.slots[j]) {
                this.slots[j] = item;
                this.slots[idx] = null;
                this.save();
                return true;
            }
        }
        return false;
    }
}

/* Toasts */
class Toasts {
    constructor(wrap) { this.wrap = wrap; }
    show(icon, text) {
        const row = document.createElement("div");
        row.className = "toast";
        const img = document.createElement("img");
        img.src = icon;
        img.alt = "";
        const msg = document.createElement("div");
        msg.textContent = text;
        row.append(img, msg);
        this.wrap.prepend(row);

        const remove = () => row.remove();
        setTimeout(remove, 2400);
    }
}

/* Loot System */
class LootSystem {
    constructor() {
        this.rarity = {
            common: { chance: 0.60, key: "C" },
            uncommon: { chance: 0.25, key: "U" },
            rare: { chance: 0.10, key: "R" },
            epic: { chance: 0.04, key: "E" },
            legendary: { chance: 0.01, key: "L" }
        };
    }
    timeOk(item, hour) {
        const h = (hour % 24 + 24) % 24;
        return item.time.some(([a, b]) => h >= a && h < b);
    }
    nextLore(catches) {
        const idx = Number(catches.lore) || 0;
        return lore[idx] ? { idx, entry: lore[idx] } : null;
    }
    roll(hour, catches) {
        const next = this.nextLore(catches);
        const total = totalCatches(catches);

        if (next && total === next.entry.ctch) {
            const iden = `lore_${next.idx}`;
            return { kind: "lore", qty: 1, item: { ...next.entry, iden } };
        }

        const candidates = loot.filter(it => this.timeOk(it, hour));
        if (!candidates.length) return null;

        // rarity roll: pick a rarity bucket based on chance among those available
        const buckets = {};
        for (const it of candidates) {
            (buckets[it.rrty] ||= []).push(it);
        }
        const available = Object.keys(buckets);

        // normalize chances over available rarities
        const pool = available.map(r => ({
            rrty: r,
            chance: this.rarity[r]?.chance ?? 0.01
        }));
        const sum = pool.reduce((s, p) => s + p.chance, 0);
        let r = Math.random() * sum;
        let chosen = pool[pool.length - 1].rrty;
        for (const p of pool) {
            r -= p.chance;
            if (r <= 0) { chosen = p.rrty; break; }
        }

        const pick = pickWeighted(buckets[chosen], it => it.wght ?? 1);
        return { kind: "loot", qty: 1, item: pick };
    }
}

/* UI: Inventory Grid */
class BagUI {
    constructor(inv) {
        this.inv = inv;
        this.hoverIdx = null;
        this.held = null;
        this.mouse = { x: 0, y: 0 };
        this.build();
        this.bind();
        this.render();
    }
    build() {
        dom.grid.innerHTML = "";
        for (let i = 0; i < 45; i++) {
            const slot = document.createElement("div");
            slot.className = "slot";
            slot.dataset.idx = String(i);
            dom.grid.append(slot);
        }
    }
    bind() {
        dom.bag.addEventListener("mousemove", (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            if (!dom.held.classList.contains("hidden")) {
                dom.held.style.left = `${this.mouse.x}px`;
                dom.held.style.top = `${this.mouse.y}px`;
            }
        });

        dom.grid.addEventListener("contextmenu", (e) => e.preventDefault());

        dom.grid.addEventListener("mouseover", (e) => {
            const slot = e.target.closest(".slot");
            if (!slot) return;
            const idx = Number(slot.dataset.idx);
            this.hoverIdx = idx;
            this.renderInfo(idx);
        });

        dom.grid.addEventListener("mouseleave", () => {
            this.hoverIdx = null;
            dom.infoText.textContent = "Hover an item to see details";
        });

        dom.grid.addEventListener("mousedown", (e) => {
            const slot = e.target.closest(".slot");
            if (!slot) return;
            const idx = Number(slot.dataset.idx);

            if (e.button === 2) { // right click
                const it = this.inv.get(idx);
                if (it && it.iden?.startsWith("lore_")) {
                    app.openLore(it.iden);
                }
                return;
            }

            if (e.shiftKey) {
                this.inv.moveToNext(idx);
                this.render();
                if (this.hoverIdx === idx) this.renderInfo(idx);
                return;
            }

            this.clickSlot(idx);
            this.render();
            if (this.hoverIdx === idx) this.renderInfo(idx);
        });
    }
    clickSlot(idx) {
        const slotIt = this.inv.get(idx);
        const heldIt = this.held;

        if (!heldIt && slotIt) {
            this.held = slotIt;
            this.inv.set(idx, null);
            this.showHeld();
            return;
        }

        if (heldIt && !slotIt) {
            this.inv.set(idx, heldIt);
            this.held = null;
            this.hideHeld();
            return;
        }

        if (heldIt && slotIt) {
            if (heldIt.iden === slotIt.iden) {
                const meta = this.inv.findMeta(heldIt.iden);
                if (meta?.stak > 1) {
                    const can = meta.stak - slotIt.qty;
                    if (can > 0) {
                        const take = Math.min(can, heldIt.qty);
                        slotIt.qty += take;
                        heldIt.qty -= take;
                        this.inv.save();
                        if (heldIt.qty <= 0) {
                            this.held = null;
                            this.hideHeld();
                        } else {
                            this.showHeld();
                        }
                        return;
                    }
                }
            }
            // swap
            this.inv.set(idx, heldIt);
            this.held = slotIt;
            this.showHeld();
            return;
        }
    }
    showHeld() {
        dom.held.innerHTML = "";
        const meta = this.inv.findMeta(this.held.iden);
        const img = document.createElement("img");
        img.src = meta?.icon || meta?.file || icons.error;
        img.alt = "";
        dom.held.append(img);
        if (this.held.qty > 1) {
            const q = document.createElement("div");
            q.className = "qty";
            q.textContent = String(this.held.qty);
            dom.held.append(q);
        }
        dom.held.classList.remove("hidden");
        dom.held.style.left = `${this.mouse.x}px`;
        dom.held.style.top = `${this.mouse.y}px`;
    }
    hideHeld() {
        dom.held.classList.add("hidden");
    }
    renderInfo(idx) {
        const it = this.inv.get(idx);
        if (!it) {
            dom.infoText.textContent = "Hover an item to see details";
            return;
        }
        const meta = this.inv.findMeta(it.iden);
        if (!meta) {
            dom.infoText.textContent = "Unknown item";
            return;
        }
        const lines = [];
        lines.push(`${meta.name}  x${it.qty}`);
        lines.push(meta.desc || "");
        if (meta.ctgy && meta.ctgy !== "lore") lines.push(`Category: ${meta.ctgy}`);
        if (meta.rrty && meta.rrty !== "lore") lines.push(`Rarity: ${meta.rrty}`);
        if (meta.sell) lines.push(`Price: ${meta.slsp}`);
        if (meta.stak) lines.push(`Stack: ${meta.stak}`);
        if (meta.xpmi != null && meta.xpma != null) lines.push(`XP: ${meta.xpmi}–${meta.xpma}`);
        if (meta.time) lines.push(`Time: ${meta.time.map(r => `${r[0]}–${r[1]}`).join(" | ")}`);
        if (meta.file) lines.push(`Right-click to view`);
        dom.infoText.textContent = lines.filter(Boolean).join("\n");
    }
    render() {
        const slots = [...dom.grid.children];
        for (let i = 0; i < 45; i++) {
            const el = slots[i];
            el.innerHTML = "";
            const it = this.inv.get(i);
            if (!it) continue;
            const meta = this.inv.findMeta(it.iden);
            const img = document.createElement("img");
            img.src = meta?.icon || icons.error;
            img.alt = "";
            el.append(img);
            if (it.qty > 1) {
                const q = document.createElement("div");
                q.className = "qty";
                q.textContent = String(it.qty);
                el.append(q);
            }
        }
    }
}

/* Fishing Flow */
class Fishing {
    constructor(clock, lootSys, inv, toasts) {
        this.clock = clock;
        this.lootSys = lootSys;
        this.inv = inv;
        this.toasts = toasts;

        this.state = "idle"; // idle | waiting | ready
        this.waitStart = 0;
        this.waitEnd = 0;
        this.readyEnd = 0;
    }
    reset() {
        this.state = "idle";
        this.waitStart = 0;
        this.waitEnd = 0;
        this.readyEnd = 0;
        dom.fishBtnText.textContent = "Fish";
        dom.fishBtn.style.setProperty("--p", "0%");
    }
    start() {
        this.state = "waiting";
        this.waitStart = Date.now();
        const waitMs = Math.floor(rand(2000, 6000));
        this.waitEnd = this.waitStart + waitMs;
        dom.fishBtnText.textContent = "Reel In";
        dom.fishBtn.style.setProperty("--p", "0%");
    }
    press() {
        const now = Date.now();

        if (this.state === "idle") {
            this.start();
            return;
        }

        if (this.state === "waiting") {
            // pressed before bite
            this.toasts.show(icons.error, "Too quick!");
            this.reset();
            return;
        }

        if (this.state === "ready") {
            // pressed within window
            if (now <= this.readyEnd) {
                this.catch();
            } else {
                this.toasts.show(icons.error, "The fish escaped!");
            }
            this.reset();
        }
    }
    frame() {
        const now = Date.now();

        if (this.state === "waiting") {
            const dur = Math.max(1, this.waitEnd - this.waitStart);
            const p = clamp((now - this.waitStart) / dur, 0, 1);
            dom.fishBtn.style.setProperty("--p", `${Math.floor(p * 100)}%`);

            if (now >= this.waitEnd) {
                this.state = "ready";
                this.readyEnd = now + 2000;
                dom.fishBtn.style.setProperty("--p", "0%");
            }
            return;
        }

        if (this.state === "ready") {
            const p = clamp((now - (this.readyEnd - 2000)) / 2000, 0, 1);
            dom.fishBtn.style.setProperty("--p", `${Math.floor(p * 100)}%`);

            if (now > this.readyEnd) {
                this.toasts.show(icons.error, "The fish escaped!");
                this.reset();
            }
        }
    }
    catch() {
        const catches = store.readCatches();
        const hour = this.clock.hourFloat();
        const res = this.lootSys.roll(hour, catches);
        if (!res) {
            this.toasts.show(icons.error, "Nothing bit...");
            return;
        }

        if (res.kind === "lore") {
            const add = this.inv.add(res.item.iden, res.qty);
            if (add.left > 0) {
                this.toasts.show(icons.error, "Backpack full!");
                return;
            }
            catches.lore = (Number(catches.lore) || 0) + 1;
            store.writeCatches(catches);
            this.toasts.show(res.item.icon, `You caught x${res.qty} ${res.item.name}!`);
            return;
        }

        // normal loot
        const add = this.inv.add(res.item.iden, res.qty);
        if (add.left > 0) {
            this.toasts.show(icons.error, "Backpack full!");
            return;
        }
        const key = rarityKey(res.item.rrty);
        catches[res.item.ctgy][key] = (Number(catches[res.item.ctgy][key]) || 0) + res.qty;
        store.writeCatches(catches);

        this.toasts.show(res.item.icon, `You caught x${res.qty} ${res.item.name}!`);
    }
}


/* Three.js Background */
class Sea {
    constructor(clock) {
        this.clock = clock;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 5000);
        this.camera.position.set(0, 6, 12);

        this.renderer = new THREE.WebGLRenderer({ canvas: dom.bg, antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

        this.lights();
        this.water();
        this.stars();
        this.gulls();

        this.last = performance.now();
        this.resize();
        window.addEventListener("resize", () => this.resize());
    }
    lights() {
        this.amb = new THREE.AmbientLight(0xffffff, 0.55);
        this.sun = new THREE.DirectionalLight(0xffffff, 0.85);
        this.sun.position.set(20, 30, 10);
        this.scene.add(this.amb, this.sun);
    }
    water() {
        const tex = new THREE.TextureLoader().load("./Source/Assets/Terrain/water.png");
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(220, 220);
        tex.offset.set(0, 0);

        const geo = new THREE.PlaneGeometry(5000, 5000, 1, 1);
        geo.rotateX(-Math.PI / 2);

        const mat = new THREE.MeshPhongMaterial({
            map: tex,
            transparent: true,
            opacity: 0.78,
            shininess: 70,
            specular: new THREE.Color(0x7bd4ff)
        });

        this.waterTex = tex;
        this.waterMesh = new THREE.Mesh(geo, mat);
        this.waterMesh.position.y = 0;
        this.scene.add(this.waterMesh);
    }
    stars() {
        const count = 900;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 900 + Math.random() * 800;
            const a = Math.random() * Math.PI * 2;
            const y = 80 + Math.random() * 180;
            pos[i * 3 + 0] = Math.cos(a) * r;
            pos[i * 3 + 1] = y;
            pos[i * 3 + 2] = Math.sin(a) * r;
        }
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, transparent: true, opacity: 0.0 });
        this.starPts = new THREE.Points(geo, this.starMat);
        this.scene.add(this.starPts);
    }
    gulls() {
        this.gullList = [];
        const n = 3;
        for (let i = 0; i < n; i++) {
            const g = new Gull();
            g.group.position.set(rand(-16, 16), rand(8, 14), rand(-18, -6));
            g.center = new THREE.Vector3(rand(-18, 18), rand(8, 14), rand(-18, -6));
            g.radius = rand(10, 18);
            g.speed = rand(0.25, 0.45);
            g.phase = rand(0, Math.PI * 2);
            this.gullList.push(g);
            this.scene.add(g.group);
        }
    }
    skyAt(hour) {
        // keyframes with smooth blend
        const h = (hour % 24 + 24) % 24;

        const col = {
            night: new THREE.Color(0x070b1a),
            sunrise: new THREE.Color(0xff9655),
            day: new THREE.Color(0x8fd7ff),
            sunset: new THREE.Color(0xff6a3d)
        };

        // segments: night->sunrise (5-7), sunrise->day (7-8), day (8-17), day->sunset (17-19), sunset->night (19-20)
        let bg = col.day.clone();
        let sunCol = new THREE.Color(0xffffff);
        let ambI = 0.55, sunI = 0.85, stars = 0;

        const blend = (aH, bH, aCol, bCol, t) => aCol.clone().lerp(bCol, t);

        if (h < 5) {
            // deep night towards dawn
            const t = smooth(clamp(h / 5, 0, 1));
            bg = blend(0, 5, col.night, col.night.clone().lerp(col.sunrise, 0.15), t);
            sunCol = new THREE.Color(0x9fb7ff);
            ambI = lerp(0.22, 0.32, t);
            sunI = lerp(0.05, 0.18, t);
            stars = lerp(1.0, 0.75, t);
        } else if (h < 7) {
            const t = smooth((h - 5) / 2);
            bg = blend(5, 7, col.night.clone().lerp(col.sunrise, 0.35), col.sunrise, t);
            sunCol = new THREE.Color(0xffc8a3).lerp(new THREE.Color(0xffffff), t);
            ambI = lerp(0.32, 0.55, t);
            sunI = lerp(0.18, 0.75, t);
            stars = lerp(0.75, 0.15, t);
        } else if (h < 8) {
            const t = smooth(h - 7);
            bg = blend(7, 8, col.sunrise, col.day, t);
            sunCol = new THREE.Color(0xfff2d0).lerp(new THREE.Color(0xffffff), t);
            ambI = lerp(0.55, 0.62, t);
            sunI = lerp(0.75, 0.92, t);
            stars = lerp(0.15, 0.0, t);
        } else if (h < 17) {
            bg = col.day.clone();
            sunCol = new THREE.Color(0xffffff);
            ambI = 0.62;
            sunI = 0.95;
            stars = 0.0;
        } else if (h < 19) {
            const t = smooth((h - 17) / 2);
            bg = blend(17, 19, col.day, col.sunset, t);
            sunCol = new THREE.Color(0xffffff).lerp(new THREE.Color(0xffbb7a), t);
            ambI = lerp(0.62, 0.45, t);
            sunI = lerp(0.95, 0.55, t);
            stars = lerp(0.0, 0.22, t);
        } else if (h < 20) {
            const t = smooth(h - 19);
            bg = blend(19, 20, col.sunset, col.night, t);
            sunCol = new THREE.Color(0xffbb7a).lerp(new THREE.Color(0x9fb7ff), t);
            ambI = lerp(0.45, 0.22, t);
            sunI = lerp(0.55, 0.05, t);
            stars = lerp(0.22, 1.0, t);
        } else {
            const t = smooth((h - 20) / 4);
            bg = blend(20, 24, col.night, col.night, t);
            sunCol = new THREE.Color(0x9fb7ff);
            ambI = lerp(0.22, 0.22, t);
            sunI = lerp(0.05, 0.05, t);
            stars = 1.0;
        }

        return { bg, sunCol, ambI, sunI, stars };
    }
    resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
    }
    frame() {
        const now = performance.now();
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;

        // keep water "infinite"
        this.waterMesh.position.x = this.camera.position.x;
        this.waterMesh.position.z = this.camera.position.z;

        // animate water texture
        this.waterTex.offset.x = (this.waterTex.offset.x + dt * 0.020) % 1;
        this.waterTex.offset.y = (this.waterTex.offset.y + dt * 0.012) % 1;

        // sky sync
        const hour = this.clock.hourFloat();
        const s = this.skyAt(hour);
        this.scene.background = s.bg;
        this.sun.color.copy(s.sunCol);
        this.amb.intensity = s.ambI;
        this.sun.intensity = s.sunI;
        this.starMat.opacity = s.stars;

        // gulls
        for (const g of this.gullList) g.update(dt, now / 1000);

        this.renderer.render(this.scene, this.camera);
    }
}

class Gull {
    constructor() {
        this.group = new THREE.Group();

        const bodyGeo = new THREE.BoxGeometry(0.9, 0.35, 0.35);
        const wingGeo = new THREE.BoxGeometry(0.7, 0.08, 0.35);
        const mat = new THREE.MeshStandardMaterial({ color: 0xf4f5fb, roughness: 0.9, metalness: 0.0 });

        this.body = new THREE.Mesh(bodyGeo, mat);
        this.body.position.set(0, 0, 0);
        this.group.add(this.body);

        this.wingL = new THREE.Mesh(wingGeo, mat);
        this.wingR = new THREE.Mesh(wingGeo, mat);

        this.wingL.position.set(-0.75, 0.02, 0);
        this.wingR.position.set(0.75, 0.02, 0);

        this.wingL.geometry.translate(0.35, 0, 0); // pivot at inner edge
        this.wingR.geometry.translate(-0.35, 0, 0);

        this.group.add(this.wingL, this.wingR);

        this.center = new THREE.Vector3(0, 10, -10);
        this.radius = 14;
        this.speed = 0.35;
        this.phase = Math.random() * Math.PI * 2;
        this.turn = 0;
    }
    update(dt, t) {
        this.turn += dt * this.speed;
        const x = this.center.x + Math.cos(this.turn + this.phase) * this.radius;
        const z = this.center.z + Math.sin(this.turn + this.phase) * this.radius;
        const y = this.center.y + Math.sin((this.turn + this.phase) * 0.7) * 1.2;

        this.group.position.set(x, y, z);
        this.group.lookAt(this.center.x, y, this.center.z);

        const flap = Math.sin(t * 7 + this.phase) * 0.95;
        this.wingL.rotation.z = flap;
        this.wingR.rotation.z = -flap;
    }
}

/* App */
class App {
    constructor() {
        this.clock = new GameClock();
        this.inv = new Inventory();
        this.toasts = new Toasts(dom.toastWrap);
        this.lootSys = new LootSystem();
        this.bagUI = new BagUI(this.inv);
        this.fishing = new Fishing(this.clock, this.lootSys, this.inv, this.toasts);
        this.sea = new Sea(this.clock);

        this.mode = "fish"; // fish | bag | lore
        this.bind();
        this.loop();
    }
    bind() {
        dom.fishBtn.addEventListener("click", () => this.fishing.press());

        window.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() === "e") {
                e.preventDefault();
                if (this.mode === "fish") this.openBag();
                else if (this.mode === "bag") this.closeBag();
                else if (this.mode === "lore") this.closeLore(); // return to bag
            }
            if (e.key === "Escape") {
                if (this.mode === "lore") this.closeLore();
            }
        });

        dom.loreView.addEventListener("click", () => this.closeLore());
    }
    openBag() {
        this.fishing.reset();
        this.mode = "bag";
        dom.bag.classList.remove("hidden");
        dom.card.classList.add("hidden");
        // toasts hidden while in bag
        dom.toastWrap.classList.add("hidden");
        this.bagUI.render();
    }
    closeBag() {
        this.mode = "fish";
        dom.bag.classList.add("hidden");
        dom.card.classList.remove("hidden");
        dom.toastWrap.classList.remove("hidden");
    }
    openLore(iden) {
        const idx = Number(iden.split("_")[1]);
        const entry = lore[idx];
        if (!entry) return;

        this.mode = "lore";
        dom.bag.classList.add("hidden");
        dom.toastWrap.classList.add("hidden");
        dom.card.classList.add("hidden");
        dom.loreImg.src = entry.file;
        dom.loreView.classList.remove("hidden");
    }
    closeLore() {
        dom.loreView.classList.add("hidden");
        this.mode = "bag";
        dom.bag.classList.remove("hidden");
        dom.toastWrap.classList.add("hidden");
    }
    loop() {
        const tick = () => {
            // time labels
            const t = this.clock.timeText();
            dom.time.textContent = t;
            dom.bagTime.textContent = t;

            // fishing state
            if (this.mode === "fish") this.fishing.frame();

            // background
            this.sea.frame();

            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
}

const app = new App();
window.app = app; // debug
