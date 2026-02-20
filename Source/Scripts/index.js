import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/* -------------------- data -------------------- */

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

/* -------------------- short helpers -------------------- */

const $ = (q) => document.querySelector(q);
const ls = {
    g: (k, d) => {
        try { return JSON.parse(localStorage.getItem(k)) ?? d; }
        catch { return d; }
    },
    s: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};
const rndi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* -------------------- local storage -------------------- */

const defC = () => ({
    lore: 0,
    fish: { C: 0, U: 0, R: 0, E: 0, L: 0 },
    junk: { C: 0, U: 0, R: 0, E: 0, L: 0 },
    treasure: { C: 0, U: 0, R: 0, E: 0, L: 0 }
});

const keyC = "c";
const keyInv = "inv";
const keyT0 = "t0";

const loadC = () => {
    const c = ls.g(keyC, null);
    if (!c) { const d = defC(); ls.s(keyC, d); return d; }
    // patch missing keys
    const d = defC();
    for (const k of ["lore", "fish", "junk", "treasure"]) if (c[k] == null) c[k] = d[k];
    for (const g of ["fish", "junk", "treasure"]) {
        for (const b of ["C", "U", "R", "E", "L"]) if (c[g][b] == null) c[g][b] = 0;
    }
    ls.s(keyC, c);
    return c;
};

const tot = (c) => {
    let n = 0;
    for (const g of ["fish", "junk", "treasure"]) {
        for (const b of ["C", "U", "R", "E", "L"]) n += (c[g][b] || 0);
    }
    return n;
};

const loadInv = () => {
    const v = ls.g(keyInv, null);
    if (Array.isArray(v) && v.length === 45) return v;
    const a = Array.from({ length: 45 }, () => null);
    ls.s(keyInv, a);
    return a;
};

/* -------------------- item lookup -------------------- */

const lmap = new Map(loot.map(x => [x.iden, x]));
const gLore = (k) => {
    if (!k?.startsWith("l")) return null;
    const i = parseInt(k.slice(1), 10);
    const x = lore[i];
    if (!x) return null;
    return {
        iden: k,
        name: x.name,
        desc: x.desc,
        icon: x.icon,
        file: x.file,
        ctgy: "lore",
        rrty: "lore",
        sell: false,
        slsp: 0,
        stak: 1,
        wght: 0
    };
};
const gIt = (k) => lmap.get(k) || gLore(k);

/* -------------------- toast -------------------- */

const ts = $("#toast");
const errIc = "./Source/Assets/Icons/error.png";

function toast(icon, msg) {
    const d = document.createElement("div");
    d.className = "t";
    d.innerHTML = `<img src="${icon}" alt=""><div class="m">${msg}</div>`;
    ts.appendChild(d);
    setTimeout(() => {
        d.style.transition = "opacity .2s ease, transform .2s ease";
        d.style.opacity = "0";
        d.style.transform = "translateY(-4px)";
        setTimeout(() => d.remove(), 220);
    }, 2200);
}

/* -------------------- time (24-min loop) -------------------- */

function t0() {
    let v = ls.g(keyT0, null);
    if (!v || typeof v !== "number") {
        v = Date.now();
        ls.s(keyT0, v);
    }
    return v;
}

function hrNow() {
    const ms = 24 * 60 * 1000;
    const dt = (Date.now() - t0()) % ms;
    return dt / 60000; // 1 real minute = 1 in-game hour
}

function fmtHr(h) {
    const hh = Math.floor(h) % 24;
    const mm = Math.floor((h - hh) * 60);
    const p2 = (n) => String(n).padStart(2, "0");
    return `${p2(hh)}:${p2(mm)}`;
}

/* -------------------- loot logic -------------------- */

const rb = (s) => (s === "common" ? "C" : s === "uncommon" ? "U" : s === "rare" ? "R" : s === "epic" ? "E" : "L");
const rw = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };

function inTime(h, rng) {
    const [a, b] = rng;
    if (a <= b) return h >= a && h < b;
    return h >= a || h < b; // wrap midnight
}

function okTime(h, it) {
    return (it.time || []).some(r => inTime(h, r));
}

function pickLoot(h) {
    const a = loot.filter(it => okTime(h, it));
    if (!a.length) return loot[0];

    let sum = 0;
    const w = a.map(it => {
        const v = rw[it.rrty] ?? 1;
        sum += v;
        return v;
    });

    let x = Math.random() * sum;
    for (let i = 0; i < a.length; i++) {
        x -= w[i];
        if (x <= 0) return a[i];
    }
    return a[a.length - 1];
}

/* -------------------- inventory -------------------- */

let inv = loadInv();
let cur = null; // {k,q}
let hov = -1;

const bag = $("#bag");
const grid = $("#grid");
const info = $("#info");
const curEl = $("#cur");

function svInv() { ls.s(keyInv, inv); }

function stakMax(k) {
    const it = gIt(k);
    return it?.stak ?? 1;
}

function addInv(k, q = 1) {
    const mx = stakMax(k);

    // stack first
    for (let i = 0; i < inv.length && q > 0; i++) {
        const s = inv[i];
        if (!s || s.k !== k) continue;
        const can = mx - s.q;
        if (can <= 0) continue;
        const put = Math.min(can, q);
        s.q += put;
        q -= put;
    }
    // empty slots
    for (let i = 0; i < inv.length && q > 0; i++) {
        if (inv[i]) continue;
        const put = Math.min(mx, q);
        inv[i] = { k, q: put };
        q -= put;
    }

    svInv();
    renInv();
}

function renInv() {
    grid.innerHTML = "";
    for (let i = 0; i < 45; i++) {
        const s = inv[i];
        const d = document.createElement("div");
        d.className = "sl";
        d.dataset.i = String(i);

        if (s) {
            const it = gIt(s.k);
            if (it) {
                const im = document.createElement("img");
                im.className = "ic";
                im.src = it.icon;
                im.alt = it.name;
                d.appendChild(im);

                if (s.q > 1) {
                    const q = document.createElement("div");
                    q.className = "q";
                    q.textContent = String(s.q);
                    d.appendChild(q);
                }
            }
        }

        d.addEventListener("mouseenter", () => onHov(i));
        d.addEventListener("mouseleave", () => onHov(-1));
        d.addEventListener("click", (e) => onClk(e, i));
        d.addEventListener("contextmenu", (e) => onRc(e, i));

        grid.appendChild(d);
    }
    posInfo();
}

function posInfo() {
    if (bag.style.display !== "flex") return;
    const b = bag.querySelector(".bd");
    if (!b) return;
    const r = b.getBoundingClientRect();
    info.style.left = `${r.left}px`;
    info.style.top = `${r.bottom + 10}px`;
}

function setCur(v) {
    cur = v;
    if (!cur) {
        curEl.style.display = "none";
        curEl.setAttribute("aria-hidden", "true");
        curEl.innerHTML = "";
        return;
    }
    const it = gIt(cur.k);
    curEl.innerHTML = `
    <div style="position:relative">
      <img class="cic" src="${it?.icon || errIc}" alt="">
      ${cur.q > 1 ? `<div class="cq">${cur.q}</div>` : ``}
    </div>
  `;
    curEl.style.display = "block";
    curEl.setAttribute("aria-hidden", "false");
}

function onClk(e, i) {
    if (viewOn) return;

    if (e.shiftKey) return qmv(i);

    const s = inv[i];

    if (!cur && s) {
        inv[i] = null;
        setCur({ ...s });
        svInv(); renInv();
        return;
    }

    if (cur && !s) {
        inv[i] = { ...cur };
        setCur(null);
        svInv(); renInv();
        return;
    }

    if (cur && s) {
        if (s.k === cur.k) {
            const mx = stakMax(s.k);
            const can = mx - s.q;
            if (can > 0) {
                const put = Math.min(can, cur.q);
                s.q += put;
                cur.q -= put;
                if (cur.q <= 0) setCur(null);
                svInv(); renInv();
                return;
            }
        }
        // swap
        inv[i] = { ...cur };
        setCur({ ...s });
        svInv(); renInv();
    }
}

function qmv(i) {
    if (cur) return; // quick move only when not holding
    const s = inv[i];
    if (!s) return;

    const a = i < 36 ? [36, 44] : [0, 35];
    const mx = stakMax(s.k);

    // stack into target
    for (let j = a[0]; j <= a[1] && s.q > 0; j++) {
        const t = inv[j];
        if (!t || t.k !== s.k) continue;
        const can = mx - t.q;
        if (can <= 0) continue;
        const put = Math.min(can, s.q);
        t.q += put;
        s.q -= put;
    }

    // empty target
    for (let j = a[0]; j <= a[1] && s.q > 0; j++) {
        if (inv[j]) continue;
        inv[j] = { k: s.k, q: Math.min(mx, s.q) };
        s.q -= inv[j].q;
    }

    inv[i] = s.q > 0 ? s : null;
    svInv(); renInv();
}

function onHov(i) {
    hov = i;
    if (i < 0 || !inv[i]) {
        info.style.display = "none";
        info.setAttribute("aria-hidden", "true");
        return;
    }
    const s = inv[i];
    const it = gIt(s.k);
    if (!it) return;

    $("#inm").textContent = it.name;
    $("#ids").textContent = `${it.desc}`;
    const bits = [];
    bits.push(`Qty: ${s.q}/${stakMax(s.k)}`);
    if (it.ctgy && it.ctgy !== "lore") bits.push(`Type: ${it.ctgy}`);
    if (it.rrty && it.rrty !== "lore") bits.push(`Rarity: ${it.rrty}`);
    if (it.sell) bits.push(`Price: $${it.slsp}`);
    if (it.wght) bits.push(`Weight: ${it.wght} lb`);
    if (it.time && it.ctgy !== "lore") bits.push(`Time: ${it.time.map(r => `${r[0]}-${r[1]}`).join(" | ")}`);

    $("#ist").textContent = bits.join("  •  ");

    info.style.display = "block";
    info.setAttribute("aria-hidden", "false");
    posInfo();
}

let viewOn = false;
let viewFromBag = false;

function onRc(e, i) {
    e.preventDefault();
    if (viewOn) return;
    const s = inv[i];
    if (!s) return;
    if (!s.k?.startsWith("l")) return;

    const it = gIt(s.k);
    if (!it?.file) return;
    openView(it.file);
}

const vw = $("#view");
const vimg = $("#vimg");

function openView(src) {
    viewOn = true;
    viewFromBag = bag.style.display === "flex";

    $("#ui").style.display = "none";
    bag.style.display = "none";
    info.style.display = "none";
    setCur(null);

    vimg.src = src;
    vw.style.display = "flex";
    vw.setAttribute("aria-hidden", "false");
}

function closeView() {
    viewOn = false;
    vw.style.display = "none";
    vw.setAttribute("aria-hidden", "true");

    if (viewFromBag) {
        openBag(true);
    } else {
        $("#ui").style.display = "flex";
    }
}

vw.addEventListener("click", () => { if (viewOn) closeView(); });

/* -------------------- bag toggle -------------------- */

let bagOn = false;

function openBag(on) {
    bagOn = !!on;
    if (bagOn) {
        $("#ui").style.display = "none";
        bag.style.display = "flex";
        bag.setAttribute("aria-hidden", "false");
        renInv();
        setCur(cur); // refresh
        posInfo();
    } else {
        bag.style.display = "none";
        bag.setAttribute("aria-hidden", "true");
        info.style.display = "none";
        info.setAttribute("aria-hidden", "true");
        setCur(null);
        $("#ui").style.display = "flex";
    }
}

document.addEventListener("mousemove", (e) => {
    if (!bagOn || !cur) return;
    curEl.style.left = `${e.clientX}px`;
    curEl.style.top = `${e.clientY}px`;
});

window.addEventListener("resize", () => posInfo());

/* -------------------- fishing UI logic -------------------- */

const btn = $("#btn");
const fill = $("#fill");
const tm = $("#tm");

let st = "idle"; // idle | wait | win
let tA = null;   // anim
let tW = null;   // wait timeout
let tE = null;   // escape timeout

function setFill(p) {
    fill.style.width = `${clamp(p, 0, 100)}%`;
}

function animBar(ms, a, b, done) {
    tA = { t: performance.now(), ms, a, b, done };
}

function stopAll() {
    if (tW) clearTimeout(tW);
    if (tE) clearTimeout(tE);
    tW = tE = null;
    tA = null;
}

function rst() {
    stopAll();
    st = "idle";
    btn.textContent = "Fish";
    setFill(0);
}

function tooQuick() {
    toast(errIc, "Too quick!");
    rst();
}

function escaped() {
    toast(errIc, "The fish escaped!");
    rst();
}

function win() {
    st = "win";
    // drain in 2s
    animBar(2000, 100, 0, () => { });
    tE = setTimeout(() => escaped(), 2000);
}

function bite() {
    win();
}

function cast() {
    stopAll();
    st = "wait";
    btn.textContent = "Reel In";
    setFill(0);

    const ms = rndi(2000, 6000);
    animBar(ms, 0, 100, () => { });
    tW = setTimeout(() => bite(), ms);
}

function catchIt() {
    stopAll();
    st = "idle";
    btn.textContent = "Fish";
    setFill(0);

    const c = loadC();
    const h = hrNow();

    // normal loot pick (for stats)
    const it = pickLoot(h);

    // increment category+rarity buckets
    const b = rb(it.rrty);
    c[it.ctgy][b] += 1;

    // lore check AFTER increment (milestone triggers on that catch)
    const nx = lore[c.lore];
    if (nx && tot(c) === nx.ctch) {
        const lk = `l${c.lore}`;
        c.lore += 1;
        ls.s(keyC, c);
        addInv(lk, 1);
        toast(nx.icon, `You caught x1 ${nx.name}!`);
        return;
    }

    ls.s(keyC, c);
    addInv(it.iden, 1);
    toast(it.icon, `You caught x1 ${it.name}!`);
}

btn.addEventListener("click", () => {
    if (bagOn || viewOn) return;

    if (st === "idle") return cast();
    if (st === "wait") return tooQuick();
    if (st === "win") return catchIt();
});

/* -------------------- keys -------------------- */

document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();

    if (k === "e") {
        if (viewOn) { closeView(); return; }
        openBag(!bagOn);
        return;
    }

    if (k === "escape") {
        if (viewOn) { closeView(); return; }
        if (bagOn) openBag(false);
    }
});

/* -------------------- three.js water + sky + gulls -------------------- */

const bg = $("#bg");
const sc = new THREE.Scene();

const cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1200);
cam.position.set(0, 20, 34);
cam.lookAt(0, 0, 0);

const rndr = new THREE.WebGLRenderer({ antialias: true, alpha: true });
rndr.setPixelRatio(Math.min(devicePixelRatio, 2));
rndr.setSize(innerWidth, innerHeight);
rndr.outputColorSpace = THREE.SRGBColorSpace;
bg.appendChild(rndr.domElement);

sc.fog = new THREE.Fog(new THREE.Color("#0a1220"), 60, 420);

const amb = new THREE.AmbientLight(0xffffff, 0.35);
sc.add(amb);

const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(80, 120, -60);
sc.add(sun);

// water
const tex = new THREE.TextureLoader().load("./Source/Assets/Terrain/water.png");
tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
tex.repeat.set(240, 240);
tex.colorSpace = THREE.SRGBColorSpace;

const wG = new THREE.PlaneGeometry(1400, 1400, 1, 1);
const wM = new THREE.MeshPhongMaterial({
    map: tex,
    transparent: true,
    opacity: 0.82,
    shininess: 60,
    specular: new THREE.Color("#9ad7ff")
});
const w = new THREE.Mesh(wG, wM);
w.rotation.x = -Math.PI / 2;
w.position.y = 0;
sc.add(w);

// stars (night)
const stG = new THREE.BufferGeometry();
const stN = 1200;
const stP = new Float32Array(stN * 3);
for (let i = 0; i < stN; i++) {
    const r = 520;
    const u = Math.random();
    const v = Math.random();
    const th = 2 * Math.PI * u;
    const ph = Math.acos(2 * v - 1);
    const x = r * Math.sin(ph) * Math.cos(th);
    const y = r * Math.cos(ph);
    const z = r * Math.sin(ph) * Math.sin(th);
    stP[i * 3 + 0] = x;
    stP[i * 3 + 1] = Math.abs(y) + 40;
    stP[i * 3 + 2] = z;
}
stG.setAttribute("position", new THREE.BufferAttribute(stP, 3));
const stM = new THREE.PointsMaterial({ size: 1.4, transparent: true, opacity: 0.0 });
const stars = new THREE.Points(stG, stM);
sc.add(stars);

// gulls
const guls = [];
let nxtG = performance.now() + rnd(3000, 7000);

function mkGul() {
    const g = new THREE.Group();

    const bm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.0 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), bm);
    body.scale.set(1.3, 1.0, 1.0);
    g.add(body);

    const wm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, metalness: 0.0 });
    const wingGeo = new THREE.BoxGeometry(1.2, 0.06, 0.35);

    const l = new THREE.Group();
    const lm = new THREE.Mesh(wingGeo, wm);
    lm.position.x = 0.6;
    l.add(lm);
    l.position.set(-0.2, 0.05, 0);
    g.add(l);

    const r = new THREE.Group();
    const rm = new THREE.Mesh(wingGeo, wm);
    rm.position.x = -0.6;
    r.add(rm);
    r.position.set(0.2, 0.05, 0);
    g.add(r);

    const o = {
        g,
        l,
        r,
        a: rnd(0, Math.PI * 2),
        r0: rnd(26, 60),
        h0: rnd(14, 28),
        sp: rnd(0.18, 0.32),
        lf: performance.now() + rnd(18000, 42000)
    };
    g.position.set(Math.cos(o.a) * o.r0, o.h0, Math.sin(o.a) * o.r0);
    sc.add(g);
    return o;
}

function updGul(dt, now) {
    if (now > nxtG && guls.length < 3) {
        guls.push(mkGul());
        nxtG = now + rnd(9000, 20000);
    }

    for (let i = guls.length - 1; i >= 0; i--) {
        const b = guls[i];
        if (now > b.lf) {
            sc.remove(b.g);
            guls.splice(i, 1);
            continue;
        }
        b.a += b.sp * dt;
        const x = Math.cos(b.a) * b.r0;
        const z = Math.sin(b.a) * b.r0;
        const y = b.h0 + Math.sin(b.a * 2.1) * 1.2;

        b.g.position.set(x, y, z);
        b.g.rotation.y = -b.a + Math.PI / 2;

        const flap = Math.sin(now * 0.012) * 0.6;
        b.l.rotation.z = flap;
        b.r.rotation.z = -flap;
    }
}

/* -------------------- sky + light sync (24-min clock) -------------------- */

const cNight = new THREE.Color("#07101e");
const cRise = new THREE.Color("#ff8a3d");
const cDay = new THREE.Color("#87ceeb");
const cSet = new THREE.Color("#ff4f2a");

function lerpC(a, b, t) {
    return a.clone().lerp(b, clamp(t, 0, 1));
}

function skyAt(h) {
    // stages: night(20-5), sunrise(5-8), day(8-17), sunset(17-20)
    const n = (h >= 20 || h < 5);
    const r = (h >= 5 && h < 8);
    const d = (h >= 8 && h < 17);
    const s = (h >= 17 && h < 20);

    let sky = cDay;
    let ambI = 0.45, sunI = 0.9, stO = 0.0;

    if (n) {
        // night: fade deeper after 22, brighten slightly near 5
        const t = h >= 20 ? (h - 20) / 9 : (h + 4) / 9;
        sky = lerpC(cSet, cNight, t);
        ambI = 0.18;
        sunI = 0.12;
        stO = 0.95;
    } else if (r) {
        // sunrise: night -> rise -> day
        const t = (h - 5) / 3;
        if (t < 0.5) sky = lerpC(cNight, cRise, t / 0.5);
        else sky = lerpC(cRise, cDay, (t - 0.5) / 0.5);
        ambI = 0.22 + t * 0.28;
        sunI = 0.18 + t * 0.82;
        stO = 0.75 * (1 - t);
    } else if (d) {
        sky = cDay;
        ambI = 0.48;
        sunI = 1.05;
        stO = 0.0;
    } else if (s) {
        // sunset: day -> set -> night
        const t = (h - 17) / 3;
        if (t < 0.5) sky = lerpC(cDay, cSet, t / 0.5);
        else sky = lerpC(cSet, cNight, (t - 0.5) / 0.5);
        ambI = 0.48 - t * 0.30;
        sunI = 1.05 - t * 0.90;
        stO = 0.35 + t * 0.55;
    }

    return { sky, ambI, sunI, stO };
}

/* -------------------- main loop -------------------- */

function onRz() {
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
    rndr.setSize(innerWidth, innerHeight);
    posInfo();
}
addEventListener("resize", onRz);

let lt = performance.now();

function tick(now) {
    const dt = (now - lt) / 1000;
    lt = now;

    // UI time
    const h = hrNow();
    tm.textContent = fmtHr(h);

    // progress anim
    if (tA) {
        const t = clamp((now - tA.t) / tA.ms, 0, 1);
        setFill(tA.a + (tA.b - tA.a) * t);
        if (t >= 1) {
            const d = tA.done;
            tA = null;
            if (d) d();
        }
    }

    // keep water "infinite"
    w.position.x = cam.position.x;
    w.position.z = cam.position.z;

    // water slide
    tex.offset.x += dt * 0.012;
    tex.offset.y += dt * 0.006;

    // day/night sync
    const sk = skyAt(h);
    sc.background = sk.sky;
    sc.fog.color.copy(sk.sky);

    amb.intensity = sk.ambI;
    sun.intensity = sk.sunI;

    // tint sun a bit by stage
    if (h >= 5 && h < 8) sun.color.copy(lerpC(new THREE.Color("#ffd6a8"), new THREE.Color("#ffffff"), (h - 5) / 3));
    else if (h >= 17 && h < 20) sun.color.copy(lerpC(new THREE.Color("#ffffff"), new THREE.Color("#ffb085"), (h - 17) / 3));
    else sun.color.set(0xffffff);

    stM.opacity = sk.stO;

    // gulls
    updGul(dt, now);

    rndr.render(sc, cam);
    requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* -------------------- init -------------------- */

renInv();
rst();