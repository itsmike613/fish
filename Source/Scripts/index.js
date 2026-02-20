import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

const $ = (s) => document.querySelector(s);

const el = {
    clk: $("#clk"),
    btn: $("#fbtn"),
    toasts: $("#toasts"),
    bag: $("#bag"),
    grid: $("#grid"),
    info: $("#info"),
    hold: $("#hold"),
    himg: $("#himg"),
    hqty: $("#hqty"),
    view: $("#view"),
    vimg: $("#vimg"),
};

const PATH = {
    err: "./Source/Assets/Icons/error.png",
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
        ctch: 2
    },
    {
        name: "Soggy Travel Brochure",
        desc: "Water-damaged pamphlet",
        icon: "./Source/Assets/Catches/Lore/travelbrochure.png",
        file: "./Source/Assets/Catches/Files/travelbrochure.png",
        ctch: 4
    },
    {
        name: "Research Log #2",
        desc: "Entry 2",
        icon: "./Source/Assets/Catches/Lore/researchlog.png",
        file: "./Source/Assets/Catches/Files/researchlog2.png",
        ctch: 6
    }
];

const rr2L = { common: "C", uncommon: "U", rare: "R", epic: "E", legendary: "L" };
const rrW = { common: 0.65, uncommon: 0.22, rare: 0.10, epic: 0.025, legendary: 0.005 };

const K = { st: "catches", bag: "bag" };

const st0 = () => ({
    lore: 0,
    fish: { C: 0, U: 0, R: 0, E: 0, L: 0 },
    junk: { C: 0, U: 0, R: 0, E: 0, L: 0 },
    treasure: { C: 0, U: 0, R: 0, E: 0, L: 0 }
});

const bag0 = () => Array.from({ length: 45 }, () => null);

function load(k, d) {
    try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
    } catch { return d; }
}
function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

function stGet() {
    const s = load(K.st, null);
    if (!s || !s.fish || !s.junk || !s.treasure) {
        const n = st0(); save(K.st, n); return n;
    }
    // patch missing keys
    for (const c of ["fish", "junk", "treasure"]) for (const L of ["C", "U", "R", "E", "L"]) if (s[c][L] == null) s[c][L] = 0;
    if (s.lore == null) s.lore = 0;
    save(K.st, s);
    return s;
}
function bagGet() {
    const b = load(K.bag, null);
    if (!Array.isArray(b) || b.length !== 45) { const n = bag0(); save(K.bag, n); return n; }
    return b;
}

function totalCatches(s) {
    let n = 0;
    for (const c of ["fish", "junk", "treasure"]) for (const L of ["C", "U", "R", "E", "L"]) n += (s[c][L] || 0);
    return n;
}

function toast(icon, msg, err = false) {
    const d = document.createElement("div");
    d.className = "toast" + (err ? " err" : "");
    d.innerHTML = `<img src="${icon}" alt=""><div class="msg">${msg}</div>`;
    el.toasts.appendChild(d);
    setTimeout(() => { d.style.opacity = "0"; d.style.transform = "translateY(-4px)"; }, 2000);
    setTimeout(() => d.remove(), 2600);
}

function fmtTime(h, m) {
    const ap = h >= 12 ? "PM" : "AM";
    const hh = (h % 12) || 12;
    return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
}

/* -------------------- 24-minute in-game clock --------------------
   Full day = 24 real minutes (1440 seconds).
   11:00 PM occurs at exactly 23 minutes into the loop.
------------------------------------------------------------------ */
const t0 = performance.now();
function gameMin() {
    const s = (performance.now() - t0) / 1000;
    return s % 1440; // 1 real second = 1 in-game minute
}
function gameHM() {
    const gm = gameMin();
    const h = Math.floor(gm / 60) % 24;
    const m = Math.floor(gm % 60);
    return { h, m, hf: h + m / 60 };
}
setInterval(() => {
    const { h, m } = gameHM();
    el.clk.textContent = fmtTime(h, m);
}, 150);

/* -------------------- Loot filtering -------------------- */
function inTime(hf, ranges) {
    for (const [a, b] of ranges) {
        if (b >= a) {
            if (hf >= a && hf < b) return true;
        } else { // wrap
            if (hf >= a || hf < b) return true;
        }
    }
    return false;
}

function pickRarity(av) {
    const ws = [];
    for (const r of ["common", "uncommon", "rare", "epic", "legendary"]) {
        if (av.has(r)) ws.push([r, rrW[r]]);
    }
    let sum = ws.reduce((p, x) => p + x[1], 0);
    if (sum <= 0) return null;
    let roll = Math.random() * sum;
    for (const [r, w] of ws) {
        roll -= w;
        if (roll <= 0) return r;
    }
    return ws[ws.length - 1][0];
}

function rollLoot() {
    const { hf } = gameHM();
    const ok = loot.filter(it => inTime(hf, it.time));
    if (!ok.length) return loot[Math.floor(Math.random() * loot.length)];

    const av = new Set(ok.map(it => it.rrty));
    const rr = pickRarity(av);

    let pool = ok.filter(it => it.rrty === rr);
    if (!pool.length) pool = ok;
    return pool[Math.floor(Math.random() * pool.length)];
}

/* -------------------- Inventory -------------------- */
const items = new Map();
for (const it of loot) items.set(it.iden, it);
for (let i = 0; i < lore.length; i++) {
    items.set(`lore_${i}`, {
        name: lore[i].name,
        desc: lore[i].desc,
        iden: `lore_${i}`,
        icon: lore[i].icon,
        file: lore[i].file,
        ctgy: "lore",
        rrty: "lore",
        sell: false,
        slsp: 0,
        stak: 1,
        wght: 0,
        xpmi: 0,
        xpma: 0,
        time: [[0, 24]],
    });
}

let bag = bagGet();
let hold = null; // {id, n}

function slotEl(i) {
    const d = document.createElement("div");
    d.className = "slot";
    d.dataset.i = String(i);
    d.addEventListener("mouseenter", () => slotInfo(i));
    d.addEventListener("mouseleave", () => infoClear());
    d.addEventListener("contextmenu", (e) => { e.preventDefault(); slotRight(i); });
    d.addEventListener("click", (e) => slotClick(i, e.shiftKey));
    return d;
}

function draw() {
    el.grid.innerHTML = "";
    for (let i = 0; i < 45; i++) el.grid.appendChild(slotEl(i));
    drawSlots();
    infoClear();
}
function drawSlots() {
    for (const d of el.grid.children) {
        const i = +d.dataset.i;
        const s = bag[i];
        d.innerHTML = "";
        if (!s) continue;
        const it = items.get(s.id);
        if (!it) continue;
        const img = document.createElement("img");
        img.src = it.icon;
        img.alt = it.name;
        d.appendChild(img);
        if (s.n > 1) {
            const q = document.createElement("div");
            q.className = "qty";
            q.textContent = String(s.n);
            d.appendChild(q);
        }
    }
    holdDraw();
}
function holdDraw() {
    if (!hold) { el.hold.hidden = true; return; }
    const it = items.get(hold.id);
    el.himg.src = it.icon;
    el.himg.alt = it.name;
    el.hqty.textContent = hold.n > 1 ? String(hold.n) : "";
    el.hold.hidden = false;
}
window.addEventListener("mousemove", (e) => {
    if (!hold || !document.body.classList.contains("bagOpen")) return;
    el.hold.style.left = e.clientX + "px";
    el.hold.style.top = e.clientY + "px";
});

function infoClear() {
    el.info.innerHTML = `<div class="ds">Hover an item to see details.</div>`;
}
function slotInfo(i) {
    const s = bag[i];
    if (!s) { infoClear(); return; }
    const it = items.get(s.id);
    if (!it) { infoClear(); return; }

    const meta = [];
    if (it.ctgy !== "lore") meta.push(`$${it.slsp}`);
    if (it.ctgy !== "lore") meta.push(`${it.wght} lbs`);
    if (it.ctgy !== "lore") meta.push(`XP ${it.xpmi}-${it.xpma}`);
    if (it.ctgy !== "lore") meta.push(`Stack ${it.stak}`);

    el.info.innerHTML = `
    <div class="t">
      <div class="nm">${it.name}</div>
      <div class="rt">${it.ctgy}${it.ctgy !== "lore" ? " • " + it.rrty : ""}</div>
    </div>
    <div class="ds">${it.desc}</div>
    <div class="mt">${meta.map(x => `<span>${x}</span>`).join("")}</div>
  `;
}

function addToBag(id, n) {
    const it = items.get(id);
    if (!it) return n;

    // merge first
    if (it.stak > 1) {
        for (let i = 0; i < bag.length && n > 0; i++) {
            const s = bag[i];
            if (!s || s.id !== id) continue;
            const cap = it.stak - s.n;
            if (cap <= 0) continue;
            const mv = Math.min(cap, n);
            s.n += mv;
            n -= mv;
        }
    }

    // empty slots
    for (let i = 0; i < bag.length && n > 0; i++) {
        if (bag[i]) continue;
        const mv = Math.min(it.stak, n);
        bag[i] = { id, n: mv };
        n -= mv;
    }

    save(K.bag, bag);
    drawSlots();
    return n; // leftover
}

function slotClick(i, sh) {
    const s = bag[i];

    // shift-click: quick-move stack to first available/merge
    if (sh && !hold && s) {
        bag[i] = null;
        const left = addToBag(s.id, s.n);
        if (left > 0) bag[i] = { id: s.id, n: left };
        save(K.bag, bag);
        drawSlots();
        slotInfo(i);
        return;
    }

    // normal click: pick/place/swap/merge
    if (!hold) {
        if (!s) return;
        hold = { ...s };
        bag[i] = null;
    } else {
        if (!s) {
            bag[i] = { ...hold };
            hold = null;
        } else if (s.id === hold.id) {
            const it = items.get(s.id);
            const cap = it.stak - s.n;
            if (cap > 0) {
                const mv = Math.min(cap, hold.n);
                s.n += mv;
                hold.n -= mv;
                if (hold.n <= 0) hold = null;
            } else {
                // full, swap
                const tmp = { ...s };
                bag[i] = { ...hold };
                hold = tmp;
            }
        } else {
            const tmp = { ...s };
            bag[i] = { ...hold };
            hold = tmp;
        }
    }
    save(K.bag, bag);
    drawSlots();
    slotInfo(i);
}

function slotRight(i) {
    const s = bag[i];
    if (!s) return;
    const it = items.get(s.id);
    if (!it || it.ctgy !== "lore" || !it.file) return;
    openView(it.file);
}

function openView(src) {
    document.body.classList.add("viewOpen");
    el.vimg.src = src;
    el.view.setAttribute("aria-hidden", "false");
}
function closeView() {
    document.body.classList.remove("viewOpen");
    el.view.setAttribute("aria-hidden", "true");
    el.vimg.src = "";
}
el.view.addEventListener("click", () => closeView());

/* -------------------- Backpack toggle -------------------- */
function bagOpen() {
    resetCast();
    document.body.classList.add("bagOpen");
    el.bag.setAttribute("aria-hidden", "false");
    draw();
}
function bagClose() {
    hold = null;
    document.body.classList.remove("bagOpen");
    el.bag.setAttribute("aria-hidden", "true");
}
function bagToggle() {
    if (document.body.classList.contains("viewOpen")) { closeView(); return; }
    if (document.body.classList.contains("bagOpen")) bagClose();
    else bagOpen();
}

window.addEventListener("keydown", (e) => {
    if (e.key === "e" || e.key === "E") { e.preventDefault(); bagToggle(); }
    if (e.key === "Escape") {
        if (document.body.classList.contains("viewOpen")) closeView();
    }
});

/* -------------------- Fishing logic -------------------- */
let cast = { st: "idle", t0: 0, dur: 0, raf: 0, readyAt: 0, to: null };

function setP(p) { el.btn.style.setProperty("--p", String(Math.max(0, Math.min(100, p)))); }

function resetCast() {
    if (cast.raf) cancelAnimationFrame(cast.raf);
    if (cast.to) clearTimeout(cast.to);
    cast = { st: "idle", t0: 0, dur: 0, raf: 0, readyAt: 0, to: null };
    el.btn.classList.remove("ready");
    el.btn.textContent = "Fish";
    setP(0);
}

function awardLoreIfAny() {
    const s = stGet();
    const idx = s.lore || 0;
    const nx = lore[idx];
    if (!nx) return null;

    const tot = totalCatches(s);
    // award when total equals the ctch threshold (linear, no skipping)
    if (tot === nx.ctch) {
        s.lore = idx + 1;
        save(K.st, s);
        return { id: `lore_${idx}`, n: 1 };
    }
    return null;
}

function catchOne() {
    const loreDrop = awardLoreIfAny();
    if (loreDrop) {
        const it = items.get(loreDrop.id);
        addToBag(loreDrop.id, loreDrop.n);
        toast(it.icon, `You caught x${loreDrop.n} ${it.name}!`);
        return;
    }

    const it = rollLoot();
    const n = 1 + (Math.random() < 0.22 ? 1 : 0) + (Math.random() < 0.08 ? 1 : 0);

    // increment local storage counts
    const s = stGet();
    const L = rr2L[it.rrty] || "C";
    if (s[it.ctgy] && s[it.ctgy][L] != null) s[it.ctgy][L] += 1;
    save(K.st, s);

    addToBag(it.iden, Math.min(n, it.stak));
    toast(it.icon, `You caught x${Math.min(n, it.stak)} ${it.name}!`);
}

function castStart() {
    cast.st = "wait";
    cast.t0 = performance.now();
    cast.dur = 2000 + Math.random() * 4000;
    el.btn.textContent = "Reel In";
    el.btn.classList.remove("ready");
    setP(0);

    const tick = () => {
        if (cast.st !== "wait") return;
        const p = ((performance.now() - cast.t0) / cast.dur) * 100;
        setP(p);
        if (p >= 100) return castReady();
        cast.raf = requestAnimationFrame(tick);
    };
    cast.raf = requestAnimationFrame(tick);
}

function castReady() {
    cast.st = "ready";
    cast.readyAt = performance.now();
    el.btn.classList.add("ready");
    setP(100);

    cast.to = setTimeout(() => {
        if (cast.st !== "ready") return;
        toast(PATH.err, "The fish escaped!", true);
        resetCast();
    }, 2000);
}

function castClick() {
    if (document.body.classList.contains("bagOpen")) return;

    if (cast.st === "idle") {
        castStart();
        return;
    }
    if (cast.st === "wait") {
        toast(PATH.err, "Too quick!", true);
        resetCast();
        return;
    }
    if (cast.st === "ready") {
        catchOne();
        resetCast();
    }
}

el.btn.addEventListener("click", castClick);

/* -------------------- Three.js background -------------------- */
const cvs = $("#bg");
const r = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: true });
r.setPixelRatio(Math.min(devicePixelRatio, 2));
r.setSize(innerWidth, innerHeight, false);

const sc = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 20000);
cam.position.set(0, 75, 190);
cam.lookAt(0, 0, 0);

const fog = new THREE.Fog(new THREE.Color("#0a0f2b"), 260, 9000);
sc.fog = fog;

const amb = new THREE.AmbientLight(0xffffff, 0.45);
sc.add(amb);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(260, 380, 120);
sc.add(sun);

// sky dome (simple gradient shader)
const skyGeo = new THREE.SphereGeometry(12000, 24, 16);
const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: false,
    uniforms: {
        top: { value: new THREE.Color("#0b1333") },
        bot: { value: new THREE.Color("#01020a") },
        pow: { value: 0.9 }
    },
    vertexShader: `
    varying vec3 vPos;
    void main(){
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
    fragmentShader: `
    varying vec3 vPos;
    uniform vec3 top;
    uniform vec3 bot;
    uniform float pow;
    void main(){
      float h = normalize(vPos).y * 0.5 + 0.5;
      h = pow(h, pow);
      vec3 col = mix(bot, top, h);
      gl_FragColor = vec4(col, 1.0);
    }
  `
});
const sky = new THREE.Mesh(skyGeo, skyMat);
sc.add(sky);

// stars (fade in at night)
const starGeo = new THREE.BufferGeometry();
const starN = 1200;
const starPos = new Float32Array(starN * 3);
for (let i = 0; i < starN; i++) {
    const rad = 9000 + Math.random() * 2500;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.random() * Math.PI * 0.55; // mostly upper hemisphere
    const x = Math.cos(th) * Math.sin(ph) * rad;
    const y = Math.cos(ph) * rad;
    const z = Math.sin(th) * Math.sin(ph) * rad;
    starPos[i * 3 + 0] = x;
    starPos[i * 3 + 1] = y;
    starPos[i * 3 + 2] = z;
}
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 12, sizeAttenuation: true, transparent: true, opacity: 1 });
const stars = new THREE.Points(starGeo, starMat);
sc.add(stars);

// water plane
const tl = new THREE.TextureLoader();
const wTex = tl.load(PATH.water);
wTex.wrapS = wTex.wrapT = THREE.RepeatWrapping;
wTex.repeat.set(500, 500);
wTex.colorSpace = THREE.SRGBColorSpace;

const wGeo = new THREE.PlaneGeometry(20000, 20000, 1, 1);
const wMat = new THREE.MeshStandardMaterial({
    map: wTex,
    transparent: true,
    opacity: 0.78,
    roughness: 0.15,
    metalness: 0.0
});
const water = new THREE.Mesh(wGeo, wMat);
water.rotation.x = -Math.PI / 2;
water.position.y = 0;
sc.add(water);

// simple seagulls
class Gull {
    constructor(seed) {
        this.g = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.SphereGeometry(4.2, 16, 12),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
        );
        body.scale.set(1.2, 0.8, 1.0);
        this.g.add(body);

        const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });

        this.wL = new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, 3), wingMat);
        this.wR = new THREE.Mesh(new THREE.BoxGeometry(10, 0.8, 3), wingMat);
        this.wL.position.set(-8, 0, 0);
        this.wR.position.set(8, 0, 0);
        this.wL.geometry.translate(-5, 0, 0);
        this.wR.geometry.translate(5, 0, 0);
        this.g.add(this.wL, this.wR);

        this.a = seed * Math.PI * 2;
        this.ra = 220 + Math.random() * 240;
        this.h = 90 + Math.random() * 60;
        this.sp = 0.10 + Math.random() * 0.12;
        this.tNext = performance.now() + 6000 + Math.random() * 6000;

        this.g.position.set(Math.cos(this.a) * this.ra, this.h, Math.sin(this.a) * this.ra);
        sc.add(this.g);
    }
    upd(dt) {
        const t = performance.now();

        if (t > this.tNext) {
            this.tNext = t + 6000 + Math.random() * 8000;
            this.ra = 160 + Math.random() * 520;
            this.h = 70 + Math.random() * 110;
            this.sp = 0.08 + Math.random() * 0.16;
        }

        this.a += this.sp * dt;
        const x = Math.cos(this.a) * this.ra;
        const z = Math.sin(this.a) * this.ra;
        const y = this.h + Math.sin(this.a * 2.2) * 8;

        this.g.position.set(x, y, z);
        this.g.lookAt(0, y - 10, 0);

        const flap = Math.sin(t * 0.012 + this.ra) * 0.9;
        this.wL.rotation.z = 0.25 + flap;
        this.wR.rotation.z = -0.25 - flap;
    }
}
const gulls = [new Gull(0.12), new Gull(0.44), new Gull(0.78)];

function mixC(a, b, t) {
    const ca = new THREE.Color(a), cb = new THREE.Color(b);
    return ca.lerp(cb, t);
}
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function smooth(a, b, x) {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
}

const env = {
    night: { top: "#070c22", bot: "#000007", fog: "#0a0f2b", sun: "#a9c7ff", sI: 0.22, aI: 0.40, stars: 1.0 },
    rise: { top: "#ffb36b", bot: "#2a1950", fog: "#7d4a8f", sun: "#ffd9b2", sI: 0.85, aI: 0.55, stars: 0.35 },
    day: { top: "#78d0ff", bot: "#d4f4ff", fog: "#93d9ff", sun: "#fff1d2", sI: 1.10, aI: 0.58, stars: 0.0 },
    set: { top: "#ff6a3d", bot: "#1b1033", fog: "#7a2e4a", sun: "#ffc08a", sI: 0.80, aI: 0.52, stars: 0.45 },
};

function envAt(hf) {
    const w = 0.5; // blend window (hours)
    // stages: Night, Sunrise (5-8), Day (8-17), Sunset (17-20), Night
    if (hf < 5 - w || hf >= 20 + w) return env.night;

    if (hf >= 5 - w && hf < 5 + w) {
        const t = smooth(5 - w, 5 + w, hf);
        return {
            top: mixC(env.night.top, env.rise.top, t),
            bot: mixC(env.night.bot, env.rise.bot, t),
            fog: mixC(env.night.fog, env.rise.fog, t),
            sun: mixC(env.night.sun, env.rise.sun, t),
            sI: env.night.sI + (env.rise.sI - env.night.sI) * t,
            aI: env.night.aI + (env.rise.aI - env.night.aI) * t,
            stars: env.night.stars + (env.rise.stars - env.night.stars) * t,
        };
    }
    if (hf >= 5 + w && hf < 8 - w) return env.rise;

    if (hf >= 8 - w && hf < 8 + w) {
        const t = smooth(8 - w, 8 + w, hf);
        return {
            top: mixC(env.rise.top, env.day.top, t),
            bot: mixC(env.rise.bot, env.day.bot, t),
            fog: mixC(env.rise.fog, env.day.fog, t),
            sun: mixC(env.rise.sun, env.day.sun, t),
            sI: env.rise.sI + (env.day.sI - env.rise.sI) * t,
            aI: env.rise.aI + (env.day.aI - env.rise.aI) * t,
            stars: env.rise.stars + (env.day.stars - env.rise.stars) * t,
        };
    }
    if (hf >= 8 + w && hf < 17 - w) return env.day;

    if (hf >= 17 - w && hf < 17 + w) {
        const t = smooth(17 - w, 17 + w, hf);
        return {
            top: mixC(env.day.top, env.set.top, t),
            bot: mixC(env.day.bot, env.set.bot, t),
            fog: mixC(env.day.fog, env.set.fog, t),
            sun: mixC(env.day.sun, env.set.sun, t),
            sI: env.day.sI + (env.set.sI - env.day.sI) * t,
            aI: env.day.aI + (env.set.aI - env.day.aI) * t,
            stars: env.day.stars + (env.set.stars - env.day.stars) * t,
        };
    }
    if (hf >= 17 + w && hf < 20 - w) return env.set;

    if (hf >= 20 - w && hf < 20 + w) {
        const t = smooth(20 - w, 20 + w, hf);
        return {
            top: mixC(env.set.top, env.night.top, t),
            bot: mixC(env.set.bot, env.night.bot, t),
            fog: mixC(env.set.fog, env.night.fog, t),
            sun: mixC(env.set.sun, env.night.sun, t),
            sI: env.set.sI + (env.night.sI - env.set.sI) * t,
            aI: env.set.aI + (env.night.aI - env.set.aI) * t,
            stars: env.set.stars + (env.night.stars - env.set.stars) * t,
        };
    }
    return env.night;
}

let lt = performance.now();
function loop() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lt) / 1000);
    lt = now;

    // animate water
    wTex.offset.x += dt * 0.012;
    wTex.offset.y += dt * 0.008;

    // gulls
    for (const g of gulls) g.upd(dt);

    // environment sync to clock
    const { hf } = gameHM();
    const e = envAt(hf);

    skyMat.uniforms.top.value.copy(e.top instanceof THREE.Color ? e.top : new THREE.Color(e.top));
    skyMat.uniforms.bot.value.copy(e.bot instanceof THREE.Color ? e.bot : new THREE.Color(e.bot));

    const fc = e.fog instanceof THREE.Color ? e.fog : new THREE.Color(e.fog);
    fog.color.copy(fc);

    sun.color.copy(e.sun instanceof THREE.Color ? e.sun : new THREE.Color(e.sun));
    sun.intensity = e.sI;
    amb.intensity = e.aI;

    starMat.opacity = e.stars;

    r.render(sc, cam);
    requestAnimationFrame(loop);
}
loop();

addEventListener("resize", () => {
    r.setSize(innerWidth, innerHeight, false);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
});

// init UI
draw();
resetCast();