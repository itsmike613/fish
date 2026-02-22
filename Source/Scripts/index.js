import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

/* ----------------------------- Data ----------------------------- */

const paths = {
  error: "./Source/Assets/Icons/error.png",
  water: "./Source/Assets/Terrain/water.png",
};

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
    time: [[5, 8], [16.5, 21.25]],
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
    time: [[0, 24]],
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
    time: [[0, 24]],
  },
];

const lore = [
  {
    name: "Research Log #1",
    desc: "Entry 1",
    icon: "./Source/Assets/Catches/Lore/researchlog.png",
    file: "./Source/Assets/Catches/Files/researchlog1.png",
    ctch: 5,
  },
  {
    name: "Soggy Travel Brochure",
    desc: "Water-damaged pamphlet",
    icon: "./Source/Assets/Catches/Lore/travelbrochure.png",
    file: "./Source/Assets/Catches/Files/travelbrochure.png",
    ctch: 17,
  },
  {
    name: "Research Log #2",
    desc: "Entry 2",
    icon: "./Source/Assets/Catches/Lore/researchlog.png",
    file: "./Source/Assets/Catches/Files/researchlog2.png",
    ctch: 32,
  },
];

const rarity = {
  common:    { key: "C", chance: 0.60 },
  uncommon:  { key: "U", chance: 0.25 },
  rare:      { key: "R", chance: 0.10 },
  epic:      { key: "E", chance: 0.04 },
  legendary: { key: "L", chance: 0.01 },
};

const rarityOrder = ["legendary", "epic", "rare", "uncommon", "common"];

/* ----------------------------- Storage ----------------------------- */

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

function freshCatches() {
  return {
    lore: 0,
    fish: { C: 0, U: 0, R: 0, E: 0, L: 0 },
    junk: { C: 0, U: 0, R: 0, E: 0, L: 0 },
    treasure: { C: 0, U: 0, R: 0, E: 0, L: 0 },
  };
}

function ensureCatches() {
  const c = store.get("catches", null);
  if (!c || !c.fish || !c.junk || !c.treasure) {
    const clean = freshCatches();
    store.set("catches", clean);
    return clean;
  }
  // fill missing keys safely
  const clean = freshCatches();
  clean.lore = Number.isFinite(c.lore) ? c.lore : 0;
  for (const cat of ["fish", "junk", "treasure"]) {
    for (const k of ["C","U","R","E","L"]) {
      clean[cat][k] = Number.isFinite(c?.[cat]?.[k]) ? c[cat][k] : 0;
    }
  }
  store.set("catches", clean);
  return clean;
}

function totalNormalCatches(c) {
  let sum = 0;
  for (const cat of ["fish", "junk", "treasure"]) {
    for (const k of ["C","U","R","E","L"]) sum += c[cat][k] || 0;
  }
  return sum;
}

/* ----------------------------- Time ----------------------------- */
/**
 * 24-minute loop:
 * - 1 real second = 1 in-game minute (so 24 real minutes = 24 in-game hours)
 * - 11:00 PM is exactly 23 minutes into the loop
 */
class GameTime {
  constructor() {
    this.startMs = performance.now();
    this.loopMs = 24 * 60 * 1000;
  }
  minutesFloat(nowMs) {
    const t = (nowMs - this.startMs) % this.loopMs;
    return t / 1000; // 1 second => 1 in-game minute
  }
  hoursFloat(nowMs) {
    return this.minutesFloat(nowMs) / 60;
  }
  parts(nowMs) {
    const totalMin = Math.floor(this.minutesFloat(nowMs)) % 1440;
    const hour24 = Math.floor(totalMin / 60);
    const minute = totalMin % 60;
    return { hour24, minute, totalMin };
  }
  label(nowMs) {
    const { hour24, minute } = this.parts(nowMs);
    const am = hour24 < 12;
    const hour12 = (hour24 % 12) === 0 ? 12 : (hour24 % 12);
    const mm = String(minute).padStart(2, "0");
    return `${hour12}:${mm} ${am ? "AM" : "PM"}`;
  }
}

/* ----------------------------- Toasts ----------------------------- */

class Toasts {
  constructor(root) {
    this.root = root;
  }
  show(icon, msg, ms = 2200) {
    const el = document.createElement("div");
    el.className = "toast";

    const img = document.createElement("img");
    img.src = icon;
    img.alt = "";

    const txt = document.createElement("div");
    txt.className = "toastMsg";
    txt.textContent = msg;

    el.append(img, txt);
    this.root.prepend(el);

    // fade out
    const kill = () => el.remove();
    window.setTimeout(() => {
      el.style.transition = "opacity 220ms ease, transform 220ms ease";
      el.style.opacity = "0";
      el.style.transform = "translateY(-6px)";
      window.setTimeout(kill, 240);
    }, ms);
  }
}

/* ----------------------------- Loot Rules ----------------------------- */

function inTimeRange(hoursFloat, ranges) {
  const t = ((hoursFloat % 24) + 24) % 24;
  return ranges.some(([a, b]) => {
    if (a === b) return true;
    if (a < b) return t >= a && t < b;
    return t >= a || t < b; // wrap midnight
  });
}

function rollRarity() {
  const r = Math.random();
  let acc = 0;
  // common -> legendary as defined (accumulate in that order)
  for (const name of ["common","uncommon","rare","epic","legendary"]) {
    acc += rarity[name].chance;
    if (r <= acc) return name;
  }
  return "common";
}

function pickLoot(hoursFloat) {
  const pool = loot.filter(it => inTimeRange(hoursFloat, it.time));
  if (pool.length === 0) return null;

  let rrty = rollRarity();

  // If rolled rarity has no items in pool, degrade toward common.
  const idx = rarityOrder.indexOf(rrty);
  const scan = idx === -1 ? rarityOrder.slice() : rarityOrder.slice(idx);
  for (let i = scan.length - 1; i >= 0; i--) {
    const name = scan[i];
    const group = pool.filter(it => it.rrty === name);
    if (group.length) return group[Math.floor(Math.random() * group.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ----------------------------- Inventory ----------------------------- */

class Inventory {
  constructor(gridEl, infoEl, cursorEl, cursorImgEl, cursorQtyEl) {
    this.gridEl = gridEl;
    this.infoEl = infoEl;
    this.cursorEl = cursorEl;
    this.cursorImgEl = cursorImgEl;
    this.cursorQtyEl = cursorQtyEl;

    this.size = 45;
    this.slots = this.load();
    this.held = null; // { slot: {kind,...}, from: index|null }
    this.hoverIndex = null;

    this.buildGrid();
    this.renderAll();
    this.bind();
  }

  load() {
    const raw = store.get("inv", null);
    if (!Array.isArray(raw) || raw.length !== 45) {
      const clean = Array.from({ length: 45 }, () => null);
      store.set("inv", clean);
      return clean;
    }
    return raw.map(v => (v && typeof v === "object") ? v : null);
  }

  save() {
    store.set("inv", this.slots);
  }

  defOf(slot) {
    if (!slot) return null;
    if (slot.kind === "lore") return lore[slot.loreIndex] ? { ...lore[slot.loreIndex], kind: "lore" } : null;
    if (slot.kind === "loot") return loot.find(it => it.iden === slot.iden) ? { ...loot.find(it => it.iden === slot.iden), kind: "loot" } : null;
    return null;
  }

  buildGrid() {
    this.gridEl.innerHTML = "";
    for (let i = 0; i < this.size; i++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.index = String(i);

      const img = document.createElement("img");
      img.alt = "";
      img.draggable = false;

      const qty = document.createElement("div");
      qty.className = "qty";

      slot.append(img, qty);
      this.gridEl.append(slot);
    }
  }

  renderSlot(i) {
    const slotEl = this.gridEl.children[i];
    const img = slotEl.querySelector("img");
    const qtyEl = slotEl.querySelector(".qty");

    const data = this.slots[i];
    const def = this.defOf(data);

    slotEl.classList.toggle("slotHeld", this.held?.from === i);

    if (!data || !def) {
      img.src = "";
      img.style.opacity = "0";
      qtyEl.textContent = "";
      return;
    }

    img.src = def.icon;
    img.style.opacity = "1";

    const q = data.qty ?? 1;
    qtyEl.textContent = q > 1 ? String(q) : "";
  }

  renderAll() {
    for (let i = 0; i < this.size; i++) this.renderSlot(i);
  }

  setInfo(def) {
    if (!def) {
      this.infoEl.innerHTML = "Hover an item to see details";
      return;
    }

    const lines = [];
    if (def.kind === "lore") {
      lines.push(`<div class="infoTitle">${def.name}</div>`);
      lines.push(`<div class="infoBody">${def.desc}</div>`);
      lines.push(`<div class="infoBody">Lore item</div>`);
    } else {
      lines.push(`<div class="infoTitle">${def.name}</div>`);
      lines.push(`<div class="infoBody">${def.desc}</div>`);
      lines.push(
        `<div class="infoBody">Price: $${def.slsp} • Weight: ${def.wght} lbs • Rarity: ${def.rrty}</div>`
      );
    }
    this.infoEl.innerHTML = lines.join("");
  }

  setCursor(def, qty) {
    if (!def) {
      this.cursorEl.classList.add("hidden");
      this.cursorImgEl.src = "";
      this.cursorQtyEl.textContent = "";
      return;
    }
    this.cursorEl.classList.remove("hidden");
    this.cursorImgEl.src = def.icon;
    this.cursorQtyEl.textContent = qty > 1 ? String(qty) : "";
  }

  bind() {
    this.gridEl.addEventListener("mousemove", (e) => {
      if (this.held) {
        this.cursorEl.style.left = `${e.clientX}px`;
        this.cursorEl.style.top = `${e.clientY}px`;
      }
    });

    this.gridEl.addEventListener("mouseleave", () => {
      this.hoverIndex = null;
      this.setInfo(null);
    });

    this.gridEl.addEventListener("contextmenu", (e) => e.preventDefault());

    this.gridEl.addEventListener("mousedown", (e) => {
      const slotEl = e.target.closest(".slot");
      if (!slotEl) return;

      const index = Number(slotEl.dataset.index);
      const slotData = this.slots[index];

      if (e.button === 2) {
        // right click: lore view
        const def = this.defOf(slotData);
        if (def?.kind === "lore") this.onLoreOpen?.(def.file);
        return;
      }

      if (e.button !== 0) return;

      // shift-click quick move (hotbar row 0 <-> rest)
      if (e.shiftKey && slotData && !this.held) {
        this.quickMove(index);
        return;
      }

      this.clickSlot(index);
    });

    this.gridEl.addEventListener("mouseover", (e) => {
      const slotEl = e.target.closest(".slot");
      if (!slotEl) return;
      const i = Number(slotEl.dataset.index);
      if (this.hoverIndex === i) return;
      this.hoverIndex = i;
      this.setInfo(this.defOf(this.slots[i]));
    });
  }

  isSame(a, b) {
    if (!a || !b) return false;
    if (a.kind !== b.kind) return false;
    if (a.kind === "lore") return a.loreIndex === b.loreIndex;
    return a.iden === b.iden;
  }

  maxStack(slot) {
    const def = this.defOf(slot);
    if (!def) return 1;
    if (def.kind === "lore") return 1;
    return def.stak ?? 1;
  }

  clickSlot(index) {
    const here = this.slots[index];

    if (!this.held) {
      if (!here) return;
      this.held = { slot: { ...here }, from: index };
      this.slots[index] = null;
      this.save();
      this.renderAll();
      const def = this.defOf(this.held.slot);
      this.setCursor(def, this.held.slot.qty ?? 1);
      return;
    }

    // placing held into slot
    const heldSlot = this.held.slot;
    const heldDef = this.defOf(heldSlot);
    const heldQty = heldSlot.qty ?? 1;

    if (!here) {
      this.slots[index] = { ...heldSlot };
      this.held = null;
      this.save();
      this.renderAll();
      this.setCursor(null, 0);
      return;
    }

    // merge if same and stackable
    if (this.isSame(heldSlot, here)) {
      const max = this.maxStack(here);
      const hereQty = here.qty ?? 1;
      const room = Math.max(0, max - hereQty);
      const put = Math.min(room, heldQty);

      if (put > 0) {
        here.qty = hereQty + put;
        heldSlot.qty = heldQty - put;
        this.slots[index] = here;

        if ((heldSlot.qty ?? 0) <= 0) {
          this.held = null;
          this.setCursor(null, 0);
        } else {
          this.held.slot = heldSlot;
          this.setCursor(heldDef, heldSlot.qty ?? 1);
        }

        this.save();
        this.renderAll();
        return;
      }
      // no room => swap
    }

    // swap
    this.slots[index] = { ...heldSlot };
    this.held.slot = { ...here };
    this.save();
    this.renderAll();
    const newHeldDef = this.defOf(this.held.slot);
    this.setCursor(newHeldDef, this.held.slot.qty ?? 1);
  }

  quickMove(fromIndex) {
    const slot = this.slots[fromIndex];
    if (!slot) return;

    const inHotbar = fromIndex >= 0 && fromIndex < 9;
    const search = inHotbar ? { start: 9, end: 45 } : { start: 0, end: 9 };

    // try stack into same item first
    for (let i = search.start; i < search.end; i++) {
      const dst = this.slots[i];
      if (!dst) continue;
      if (!this.isSame(dst, slot)) continue;

      const max = this.maxStack(dst);
      const dstQty = dst.qty ?? 1;
      const srcQty = slot.qty ?? 1;
      const room = Math.max(0, max - dstQty);
      const move = Math.min(room, srcQty);

      if (move > 0) {
        dst.qty = dstQty + move;
        slot.qty = srcQty - move;
        this.slots[i] = dst;
        if ((slot.qty ?? 0) <= 0) {
          this.slots[fromIndex] = null;
          this.save();
          this.renderAll();
          this.setInfo(this.defOf(this.slots[this.hoverIndex]));
          return;
        }
      }
    }

    // then first empty
    for (let i = search.start; i < search.end; i++) {
      if (this.slots[i]) continue;
      this.slots[i] = { ...slot };
      this.slots[fromIndex] = null;
      this.save();
      this.renderAll();
      this.setInfo(this.defOf(this.slots[this.hoverIndex]));
      return;
    }
  }

  add(def, qty) {
    if (!def || qty <= 0) return { ok: false };

    const slotToAdd = def.kind === "lore"
      ? { kind: "lore", loreIndex: def.loreIndex, qty }
      : { kind: "loot", iden: def.iden, qty };

    const max = def.kind === "lore" ? 1 : (def.stak ?? 1);

    // stack first
    let remaining = qty;
    for (let i = 0; i < this.size; i++) {
      const dst = this.slots[i];
      if (!dst) continue;
      if (!this.isSame(dst, slotToAdd)) continue;

      const dstQty = dst.qty ?? 1;
      const room = Math.max(0, max - dstQty);
      const put = Math.min(room, remaining);

      if (put > 0) {
        dst.qty = dstQty + put;
        this.slots[i] = dst;
        remaining -= put;
        if (remaining <= 0) break;
      }
    }

    // empty slots
    for (let i = 0; i < this.size && remaining > 0; i++) {
      if (this.slots[i]) continue;
      const put = Math.min(max, remaining);
      this.slots[i] = { ...slotToAdd, qty: put };
      remaining -= put;
    }

    this.save();
    this.renderAll();

    return { ok: remaining <= 0, remaining };
  }
}

/* ----------------------------- Lore View ----------------------------- */

class LoreView {
  constructor(root, imgEl) {
    this.root = root;
    this.imgEl = imgEl;
    this.opened = false;

    this.root.addEventListener("mousedown", () => this.close());
    window.addEventListener("keydown", (e) => {
      if (!this.opened) return;
      if (e.key === "Escape" || e.key === "e" || e.key === "E") this.close();
    });
  }
  open(src) {
    this.imgEl.src = src;
    this.root.classList.remove("hidden");
    this.root.setAttribute("aria-hidden", "false");
    this.opened = true;
  }
  close() {
    this.root.classList.add("hidden");
    this.root.setAttribute("aria-hidden", "true");
    this.opened = false;
  }
}

/* ----------------------------- Three.js World ----------------------------- */

class Bird {
  constructor(scene, basePos) {
    this.group = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.0 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 0.35), mat);
    body.position.set(0, 0, 0);

    const wingGeo = new THREE.BoxGeometry(0.55, 0.08, 0.25);
    const leftWing = new THREE.Mesh(wingGeo, mat);
    const rightWing = new THREE.Mesh(wingGeo, mat);

    leftWing.position.set(-0.62, 0.05, 0);
    rightWing.position.set(0.62, 0.05, 0);

    // hinge effect by nesting wings in pivots
    this.leftPivot = new THREE.Group();
    this.rightPivot = new THREE.Group();
    this.leftPivot.position.set(-0.35, 0.05, 0);
    this.rightPivot.position.set(0.35, 0.05, 0);
    leftWing.position.set(-0.27, 0, 0);
    rightWing.position.set(0.27, 0, 0);

    this.leftPivot.add(leftWing);
    this.rightPivot.add(rightWing);

    this.group.add(body, this.leftPivot, this.rightPivot);

    this.t = Math.random() * 100;
    this.center = basePos.clone();
    this.radius = 8 + Math.random() * 10;
    this.height = 4 + Math.random() * 3;
    this.speed = 0.25 + Math.random() * 0.35;
    this.turnMs = 0;
    this.turnEveryMs = 2500 + Math.random() * 3500;

    scene.add(this.group);
  }

  update(dt, nowMs, focus) {
    this.t += dt;

    const flap = Math.sin(this.t * 10.5) * 0.8;
    this.leftPivot.rotation.z = flap;
    this.rightPivot.rotation.z = -flap;

    // occasionally change orbit
    if (nowMs - this.turnMs > this.turnEveryMs) {
      this.turnMs = nowMs;
      this.turnEveryMs = 2500 + Math.random() * 4500;
      this.radius = 8 + Math.random() * 14;
      this.height = 3.6 + Math.random() * 4.2;
      this.speed = 0.20 + Math.random() * 0.45;
    }

    const a = this.t * this.speed;
    const x = focus.x + Math.cos(a) * this.radius;
    const z = focus.z + Math.sin(a * 0.9) * this.radius;
    const y = this.height + Math.sin(a * 1.3) * 0.35;

    this.group.position.set(x, y, z);

    // face along motion
    const nx = focus.x + Math.cos(a + 0.02) * this.radius;
    const nz = focus.z + Math.sin((a + 0.02) * 0.9) * this.radius;
    this.group.lookAt(nx, y, nz);
  }
}

class World {
  constructor(hostEl) {
    this.hostEl = hostEl;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(new THREE.Color("#0a0b12"), 18, 220);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(0, 7.5, 16);
    this.camera.lookAt(0, 0, -40);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    hostEl.append(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.ambient = new THREE.AmbientLight(0xffffff, 0.25);
    this.sun = new THREE.DirectionalLight(0xffffff, 0.9);
    this.sun.position.set(12, 18, 6);
    this.scene.add(this.ambient, this.sun);

    this.waterTex = new THREE.TextureLoader().load(paths.water);
    this.waterTex.wrapS = THREE.RepeatWrapping;
    this.waterTex.wrapT = THREE.RepeatWrapping;
    this.waterTex.repeat.set(120, 120);
    this.waterTex.colorSpace = THREE.SRGBColorSpace;

    const waterMat = new THREE.MeshPhongMaterial({
      map: this.waterTex,
      transparent: true,
      opacity: 0.86,
      shininess: 35,
      specular: new THREE.Color(0x1a1a22),
    });

    const waterGeo = new THREE.PlaneGeometry(1200, 1200, 1, 1);
    this.water = new THREE.Mesh(waterGeo, waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0;
    this.scene.add(this.water);

    this.stars = this.makeStars();
    this.scene.add(this.stars);

    this.birds = [
      new Bird(this.scene, new THREE.Vector3(0, 0, 0)),
      new Bird(this.scene, new THREE.Vector3(0, 0, 0)),
      new Bird(this.scene, new THREE.Vector3(0, 0, 0)),
    ];

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  makeStars() {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 });

    const count = 140;
    for (let i = 0; i < count; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat.clone());
      s.position.set(
        (Math.random() - 0.5) * 300,
        50 + Math.random() * 140,
        (Math.random() - 0.5) * 300
      );
      g.add(s);
    }
    return g;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  setSky(hoursFloat) {
    // keyframes for 4-stage cycle with smooth blends
    const t = ((hoursFloat % 24) + 24) % 24;

    const k = (h, col, amb, sun, fog) => ({ h, col: new THREE.Color(col), amb, sun, fog: new THREE.Color(fog) });

    const keys = [
      k(0.0,  "#060814", 0.16, 0.08, "#070812"), // night
      k(5.0,  "#080a18", 0.18, 0.10, "#080a16"), // night->sunrise lead
      k(8.0,  "#ffb07a", 0.40, 0.75, "#6a4a3a"), // sunrise
      k(12.0, "#89c8ff", 0.55, 1.05, "#4e86a6"), // day
      k(17.0, "#7ebeff", 0.48, 0.95, "#4a7f9e"), // day->sunset lead
      k(20.0, "#ff9a6a", 0.34, 0.65, "#5b3e35"), // sunset
      k(24.0, "#060814", 0.16, 0.08, "#070812"), // night
    ];

    const findSegment = () => {
      for (let i = 0; i < keys.length - 1; i++) {
        const a = keys[i], b = keys[i + 1];
        if (t >= a.h && t <= b.h) return { a, b };
      }
      return { a: keys[0], b: keys[1] };
    };

    const { a, b } = findSegment();
    const span = Math.max(0.0001, b.h - a.h);
    const u = (t - a.h) / span;

    const bg = a.col.clone().lerp(b.col, u);
    this.scene.background = bg;

    const fogCol = a.fog.clone().lerp(b.fog, u);
    this.scene.fog.color.copy(fogCol);

    this.ambient.intensity = a.amb + (b.amb - a.amb) * u;
    this.sun.intensity = a.sun + (b.sun - a.sun) * u;

    // warmer sun around sunrise/sunset
    const warm = new THREE.Color("#ffd2a6");
    const cool = new THREE.Color("#ffffff");
    const warmMix = (t >= 6 && t <= 9) ? (1 - Math.abs(t - 7.5) / 1.5) :
                    (t >= 18 && t <= 21) ? (1 - Math.abs(t - 19.5) / 1.5) : 0;
    this.sun.color.copy(cool.clone().lerp(warm, THREE.MathUtils.clamp(warmMix, 0, 1)));

    // stars fade at night
    const night = (t < 6 || t > 20) ? 1 : 0;
    const edge = (t >= 5 && t <= 7) ? 1 - Math.abs(t - 6) / 1 : (t >= 19 && t <= 21) ? 1 - Math.abs(t - 20) / 1 : 0;
    const starAlpha = THREE.MathUtils.clamp(night * 0.95 + edge * 0.55, 0, 1);
    for (const s of this.stars.children) s.material.opacity = starAlpha;
  }

  tick(hoursFloat, dt, nowMs) {
    // infinite feel: keep plane under camera
    this.water.position.x = this.camera.position.x;
    this.water.position.z = this.camera.position.z;

    // water scroll
    const spd = 0.015;
    this.waterTex.offset.x = (this.waterTex.offset.x + spd * dt) % 1;
    this.waterTex.offset.y = (this.waterTex.offset.y + spd * dt * 0.65) % 1;

    this.setSky(hoursFloat);

    const focus = this.camera.position;
    for (const b of this.birds) b.update(dt, nowMs, focus);

    this.renderer.render(this.scene, this.camera);
  }
}

/* ----------------------------- Fishing ----------------------------- */

class Fishing {
  constructor(btnEl, btnTextEl, barEl, time, inv, toasts) {
    this.btnEl = btnEl;
    this.btnTextEl = btnTextEl;
    this.barEl = barEl;

    this.time = time;
    this.inv = inv;
    this.toasts = toasts;

    this.state = "idle"; // idle | waiting | bite
    this.waitMs = 0;
    this.biteMs = 2000;
    this.stateStartMs = 0;

    this.btnEl.addEventListener("click", () => this.onClick());
    this.resetUI();
  }

  resetUI() {
    this.state = "idle";
    this.waitMs = 0;
    this.stateStartMs = 0;
    this.btnTextEl.textContent = "Fish";
    this.barEl.classList.remove("bite");
    this.barEl.style.width = "0%";
    this.btnEl.disabled = false;
  }

  cancel() {
    this.resetUI();
  }

  onClick() {
    if (this.state === "idle") {
      this.state = "waiting";
      this.waitMs = (2000 + Math.random() * 4000);
      this.stateStartMs = performance.now();
      this.btnTextEl.textContent = "Reel In";
      this.barEl.classList.remove("bite");
      this.barEl.style.width = "0%";
      return;
    }

    if (this.state === "waiting") {
      this.toasts.show(paths.error, "Too quick!");
      this.resetUI();
      return;
    }

    if (this.state === "bite") {
      this.catchOne();
      this.resetUI();
    }
  }

  catchOne() {
    const c = ensureCatches();
    const total = totalNormalCatches(c);
    const nextLoreIndex = Math.max(0, c.lore | 0);
    const nextLore = lore[nextLoreIndex] || null;

    // lore triggers on the catch that would make total == ctch
    if (nextLore && (total + 1) === nextLore.ctch) {
      const loreDef = { ...nextLore, kind: "lore", loreIndex: nextLoreIndex, stak: 1 };
      const added = this.inv.add(loreDef, 1);
      if (!added.ok) {
        this.toasts.show(paths.error, "Backpack full!");
        return;
      }
      c.lore = nextLoreIndex + 1;
      store.set("catches", c);

      this.toasts.show(loreDef.icon, `You caught x1 ${loreDef.name}!`);
      return;
    }

    const hours = this.time.hoursFloat(performance.now());
    const item = pickLoot(hours);
    if (!item) {
      this.toasts.show(paths.error, "Nothing bites right now.");
      return;
    }

    const added = this.inv.add({ ...item, kind: "loot" }, 1);
    if (!added.ok) {
      this.toasts.show(paths.error, "Backpack full!");
      return;
    }

    // increment catch counts (category + rarity)
    const k = rarity[item.rrty]?.key;
    if (k && c[item.ctgy] && c[item.ctgy][k] !== undefined) {
      c[item.ctgy][k] += 1;
      store.set("catches", c);
    }

    this.toasts.show(item.icon, `You caught x1 ${item.name}!`);
  }

  tick(nowMs) {
    if (this.state === "idle") return;

    if (this.state === "waiting") {
      const t = (nowMs - this.stateStartMs) / this.waitMs;
      const p = Math.max(0, Math.min(1, t));
      this.barEl.style.width = `${(p * 100).toFixed(2)}%`;

      if (t >= 1) {
        this.state = "bite";
        this.stateStartMs = nowMs;
        this.barEl.classList.add("bite");
        this.barEl.style.width = "100%";
      }
      return;
    }

    if (this.state === "bite") {
      const t = (nowMs - this.stateStartMs) / this.biteMs;
      const left = 1 - Math.max(0, Math.min(1, t));
      this.barEl.style.width = `${(left * 100).toFixed(2)}%`;

      if (t >= 1) {
        this.toasts.show(paths.error, "The fish escaped!");
        this.resetUI();
      }
    }
  }
}

/* ----------------------------- UI / App ----------------------------- */

const el = {
  world: document.getElementById("world"),
  ui: document.getElementById("ui"),
  card: document.getElementById("card"),
  clock: document.getElementById("clock"),
  packClock: document.getElementById("packClock"),
  fishBtn: document.getElementById("fishBtn"),
  fishText: document.getElementById("fishText"),
  barFill: document.getElementById("barFill"),
  toasts: document.getElementById("toasts"),
  backpack: document.getElementById("backpack"),
  grid: document.getElementById("grid"),
  info: document.getElementById("info"),
  cursor: document.getElementById("cursor"),
  cursorImg: document.getElementById("cursorImg"),
  cursorQty: document.getElementById("cursorQty"),
  loreView: document.getElementById("loreView"),
  loreImg: document.getElementById("loreImg"),
};

ensureCatches();

const time = new GameTime();
const toast = new Toasts(el.toasts);
const world = new World(el.world);
const loreView = new LoreView(el.loreView, el.loreImg);
const inv = new Inventory(el.grid, el.info, el.cursor, el.cursorImg, el.cursorQty);

inv.onLoreOpen = (src) => {
  // hide all UI while showing lore file, then return to backpack
  el.ui.classList.add("hidden");
  el.toasts.classList.add("hidden");
  el.backpack.classList.remove("hidden");
  loreView.open(src);
};

const fishing = new Fishing(el.fishBtn, el.fishText, el.barFill, time, inv, toast);

function setUiHidden(hidden) {
  el.ui.classList.toggle("hidden", hidden);
  el.toasts.classList.toggle("hidden", hidden);
}

function openBackpack() {
  // cancel fishing interactions while in backpack
  fishing.cancel();
  setUiHidden(true);
  el.backpack.classList.remove("hidden");
  el.backpack.setAttribute("aria-hidden", "false");
}

function closeBackpack() {
  loreView.close();
  el.backpack.classList.add("hidden");
  el.backpack.setAttribute("aria-hidden", "true");
  setUiHidden(false);
  inv.setCursor(null, 0);
  inv.setInfo(null);
  inv.held = null;
  inv.renderAll();
}

function toggleBackpack() {
  const open = !el.backpack.classList.contains("hidden");
  if (loreView.opened) {
    loreView.close();
    // returns to backpack
    return;
  }
  if (open) closeBackpack();
  else openBackpack();
}

window.addEventListener("keydown", (e) => {
  if (e.key === "e" || e.key === "E") {
    e.preventDefault();
    toggleBackpack();
  }
  if ((e.key === "Escape") && loreView.opened) {
    e.preventDefault();
    loreView.close();
  }
});

window.addEventListener("mousedown", () => {
  // clicking anywhere while lore view open exits back to backpack
  if (loreView.opened) loreView.close();
});

/* ----------------------------- Main Loop ----------------------------- */

let lastMs = performance.now();
let lastClockTick = 0;

function loop(nowMs) {
  const dt = Math.min(0.05, (nowMs - lastMs) / 1000);
  lastMs = nowMs;

  // clocks (avoid DOM spam)
  if (nowMs - lastClockTick > 120) {
    lastClockTick = nowMs;
    const label = time.label(nowMs);
    el.clock.textContent = label;
    el.packClock.textContent = label;
  }

  // world + fishing
  const hours = time.hoursFloat(nowMs);
  world.tick(hours, dt, nowMs);

  if (el.backpack.classList.contains("hidden") && !loreView.opened) {
    fishing.tick(nowMs);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);