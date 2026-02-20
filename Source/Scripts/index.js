import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

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

/* ---------- tiny utils ---------- */
const $ = (s) => document.querySelector(s);
const rndi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

const RR = { common: "C", uncommon: "U", rare: "R", epic: "E", legendary: "L" };
const RW = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };

const K = {
    cch: "cch",
    inv: "inv",
    t0: "t0"
};

const DEF = {
    lore: 0,
    fish: { C: 0, U: 0, R: 0, E: 0, L: 0 },
    junk: { C: 0, U: 0, R: 0, E: 0, L: 0 },
    treasure: { C: 0, U: 0, R: 0, E: 0, L: 0 }
};

function ld(k, d) {
    try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
    } catch { return d; }
}
function sv(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

function sumCch(c) {
    const s = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    return s(c.fish) + s(c.junk) + s(c.treasure);
}

function fmtHr(h) {
    const hh = Math.floor(h) % 24;
    const mm = Math.floor((h - Math.floor(h)) * 60);
    const ap = hh >= 12 ? "PM" : "AM";
    const h12 = ((hh + 11) % 12) + 1;
    return `${h12}:${String(mm).padStart(2, "0")} ${ap}`;
}

function inTime(hr, win) {
    // win: [[a,b], ...], supports wrap (a>b)
    for (const [a, b] of win) {
        if (a <= b) {
            if (hr >= a && hr <= b) return true;
        } else {
            if (hr >= a || hr <= b) return true;
        }
    }
    return false;
}

/* ---------- game time (24-min loop) ---------- */
/* Sync rule used here:
   24 real minutes = 24 in-game hours
   => 1 real minute = 1 in-game hour
   => 11:00 PM (23:00) = 23 minutes into the loop
*/
if (!localStorage.getItem(K.t0)) localStorage.setItem(K.t0, String(Date.now()));
const t0 = Number(localStorage.getItem(K.t0));

function curHr() {
    const loop = 24 * 60 * 1000;
    const e = (Date.now() - t0) % loop;
    return (e / loop) * 24; // 0..24
}

/* ---------- UI refs ---------- */
const ui = $("#ui");
const fish = $("#fish");
const btn = $("#btn");
const bar = $("#bar");
const clk = $("#clk");

const bag = $("#bag");
const grid = $("#grid");
const info = $("#info");

const ts = $("#ts");
const hand = $("#hand");
const himg = $("#himg");
const hcnt = $("#hcnt");

const view = $("#view");
const vimg = $("#vimg");

let cch = ld(K.cch, structuredClone(DEF));
let inv = ld(K.inv, Array.from({ length: 45 }, () => null));

/* ---------- toasts ---------- */
function toast(ic, msg) {
    const d = document.createElement("div");
    d.className = "t";
    const i = document.createElement("img");
    i.src = ic;
    const m = document.createElement("div");
    m.className = "m";
    m.textContent = msg;
    d.appendChild(i);
    d.appendChild(m);
    ts.appendChild(d);
    setTimeout(() => { d.style.opacity = "0"; d.style.transform = "translateY(-4px)"; }, 1800);
    setTimeout(() => d.remove(), 2150);
}

/* ---------- fishing state ---------- */
let st = "idle";     // idle | wait | bite
let tW = 0;          // wait end
let tB = 0;          // bite end
let tAnim = 0;

function resetFish() {
    st = "idle";
    btn.textContent = "Fish";
    bar.style.transition = "width .2s linear";
    bar.style.width = "0%";
}

function startFish() {
    st = "wait";
    btn.textContent = "Reel In";

    const ms = rndi(2000, 6000);
    const now = Date.now();
    tW = now + ms;

    // fill over wait duration
    bar.style.transition = `width ${ms}ms linear`;
    bar.style.width = "100%";

    clearTimeout(tAnim);
    tAnim = setTimeout(() => {
        // bite window: 2s
        st = "bite";
        const bms = 2000;
        tB = Date.now() + bms;

        // drain over bite duration
        bar.style.transition = `width ${bms}ms linear`;
        bar.style.width = "0%";

        clearTimeout(tAnim);
        tAnim = setTimeout(() => {
            if (st === "bite") {
                toast("./Source/Assets/Icons/error.png", "The fish escaped!");
                resetFish();
            }
        }, bms + 5);
    }, ms + 10);
}

function pickRrty() {
    const a = Object.entries(RW);
    const tot = a.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * tot;
    for (const [k, w] of a) {
        r -= w;
        if (r <= 0) return k;
    }
    return "common";
}

function pickLoot() {
    const hr = curHr();
    const rr = pickRrty();

    // time + rarity
    let a = loot.filter(x => x.rrty === rr && inTime(hr, x.time));
    if (!a.length) a = loot.filter(x => inTime(hr, x.time));
    if (!a.length) a = loot.slice();
    return a[rndi(0, a.length - 1)];
}

function getLoreIt(i) {
    const x = lore[i];
    return {
        name: x.name,
        desc: x.desc,
        iden: `lr${i}`,
        icon: x.icon,
        file: x.file,
        ctgy: "lore",
        rrty: "legendary",
        sell: false,
        slsp: 0,
        stak: 1,
        wght: 0
    };
}

function getIt(id) {
    if (id.startsWith("lr")) {
        const i = Number(id.slice(2));
        return getLoreIt(i);
    }
    return loot.find(x => x.iden === id) || null;
}

/* ---------- inventory ops ---------- */
let open = false;
let hov = -1;
let hnd = null; // {id,n}

function svAll() {
    sv(K.cch, cch);
    sv(K.inv, inv);
}

function addInv(id, n) {
    const it = getIt(id);
    if (!it) return false;

    const stak = it.stak ?? 1;

    // merge stacks first
    for (let i = 0; i < inv.length; i++) {
        const s = inv[i];
        if (!s) continue;
        if (s.id === id && s.n < stak) {
            const can = stak - s.n;
            const put = Math.min(can, n);
            s.n += put;
            n -= put;
            if (n <= 0) return true;
        }
    }

    // empty slots
    for (let i = 0; i < inv.length; i++) {
        if (inv[i]) continue;
        const put = Math.min(stak, n);
        inv[i] = { id, n: put };
        n -= put;
        if (n <= 0) return true;
    }
    return false;
}

function mvTo(a0, a1, b0, b1, i) {
    // move slot i from [a0..a1] to [b0..b1]
    const s = inv[i];
    if (!s) return;

    const it = getIt(s.id);
    const stak = it?.stak ?? 1;

    // try merge in target
    for (let j = b0; j <= b1; j++) {
        const t = inv[j];
        if (!t) continue;
        if (t.id === s.id && t.n < stak) {
            const can = stak - t.n;
            const put = Math.min(can, s.n);
            t.n += put;
            s.n -= put;
            if (s.n <= 0) { inv[i] = null; return; }
        }
    }
    // then empty target
    for (let j = b0; j <= b1; j++) {
        if (inv[j]) continue;
        inv[j] = { id: s.id, n: s.n };
        inv[i] = null;
        return;
    }
}

function renInv() {
    grid.innerHTML = "";
    for (let i = 0; i < 45; i++) {
        const d = document.createElement("div");
        d.className = "s";
        d.dataset.i = String(i);

        const s = inv[i];
        if (s) {
            const it = getIt(s.id);
            const ic = document.createElement("div");
            ic.className = "ic";
            ic.style.backgroundImage = `url("${it?.icon || ""}")`;
            d.appendChild(ic);

            if (s.n > 1) {
                const c = document.createElement("div");
                c.className = "cnt";
                c.textContent = String(s.n);
                d.appendChild(c);
            }
        }

        d.addEventListener("mouseenter", () => { hov = i; renInfo(); });
        d.addEventListener("mouseleave", () => { if (hov === i) { hov = -1; info.classList.add("hid"); } });

        d.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            const s = inv[i];
            if (!s) return;
            if (s.id.startsWith("lr")) {
                openLore(s.id);
            }
        });

        d.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            if (!open) return;

            const i = Number(d.dataset.i);
            const s = inv[i];

            // shift-click quick move between main (0-35) and hotbar (36-44)
            if (e.shiftKey && !hnd && s) {
                if (i <= 35) mvTo(0, 35, 36, 44, i);
                else mvTo(36, 44, 0, 35, i);
                svAll(); renInv(); renInfo();
                return;
            }

            // normal click pick/place/swap/merge
            if (!hnd) {
                if (!s) return;
                hnd = { id: s.id, n: s.n };
                inv[i] = null;
            } else {
                if (!s) {
                    inv[i] = { id: hnd.id, n: hnd.n };
                    hnd = null;
                } else {
                    const a = getIt(hnd.id);
                    const stak = a?.stak ?? 1;

                    if (s.id === hnd.id && s.n < stak) {
                        const can = stak - s.n;
                        const put = Math.min(can, hnd.n);
                        s.n += put;
                        hnd.n -= put;
                        if (hnd.n <= 0) hnd = null;
                    } else {
                        const tmp = { id: s.id, n: s.n };
                        inv[i] = { id: hnd.id, n: hnd.n };
                        hnd = tmp;
                    }
                }
            }

            svAll();
            renInv();
            renHand();
            renInfo();
        });

        grid.appendChild(d);
    }
}

function renInfo() {
    if (hov < 0 || !inv[hov]) { info.classList.add("hid"); return; }
    const s = inv[hov];
    const it = getIt(s.id);
    if (!it) { info.classList.add("hid"); return; }

    const cat = it.ctgy || "—";
    const rr = it.rrty || "—";
    const pr = it.sell ? `$${it.slsp ?? 0}` : "—";
    const wt = (it.wght ?? 0) ? `${it.wght} lb` : "—";
    const st = it.stak ?? 1;
    const tm = it.time ? it.time.map(([a, b]) => `${a}-${b}`).join(" | ") : "—";

    info.innerHTML = `
    <div class="nm">${it.name}</div>
    <div class="ds">${it.desc}</div>
    <div class="ln">
      <div>Cat: ${cat}</div>
      <div>Rarity: ${rr}</div>
      <div>Price: ${pr}</div>
      <div>Stack: ${st}</div>
      <div>Weight: ${wt}</div>
      <div>Time: ${tm}</div>
    </div>
  `;
    info.classList.remove("hid");
}

function renHand() {
    if (!hnd) {
        hand.classList.add("hid");
        return;
    }
    const it = getIt(hnd.id);
    if (!it) {
        hand.classList.add("hid");
        return;
    }
    himg.src = it.icon;
    hcnt.textContent = hnd.n > 1 ? String(hnd.n) : "";
    hand.classList.remove("hid");
}

function setOpen(v) {
    open = v;
    if (open) {
        ui.classList.add("hid");
        bag.classList.remove("hid");
        bag.setAttribute("aria-hidden", "false");
        renInv();
        renInfo();
    } else {
        bag.classList.add("hid");
        bag.setAttribute("aria-hidden", "true");
        ui.classList.remove("hid");
        info.classList.add("hid");
        hov = -1;
        hnd = null;
        renHand();
    }
}

/* ---------- lore viewer ---------- */
let vOn = false;
function openLore(id) {
    const it = getIt(id);
    if (!it?.file) return;
    vimg.src = it.file;

    // hide all menus
    ui.classList.add("hid");
    bag.classList.add("hid");
    view.classList.remove("hid");
    vOn = true;
}

function closeLore() {
    if (!vOn) return;
    view.classList.add("hid");
    vOn = false;
    // re-open backpack
    setOpen(true);
}

view.addEventListener("mousedown", () => closeLore());

/* ---------- fishing rewards ---------- */
function giveCatch() {
    // Lore check (linear order): when total matches ctch, next catch becomes that lore item.
    const tot = sumCch(cch);
    if (cch.lore < lore.length && tot === lore[cch.lore].ctch) {
        const li = cch.lore;
        const it = getLoreIt(li);
        cch.lore += 1;

        addInv(it.iden, 1);
        svAll();
        toast(it.icon, `You caught x1 ${it.name}!`);
        if (open) { renInv(); renInfo(); }
        return;
    }

    const it = pickLoot();
    const k = RR[it.rrty] || "C";
    cch[it.ctgy][k] += 1;

    addInv(it.iden, 1);
    svAll();
    toast(it.icon, `You caught x1 ${it.name}!`);
    if (open) { renInv(); renInfo(); }
}

/* ---------- fish button ---------- */
btn.addEventListener("click", () => {
    if (open || vOn) return;

    const now = Date.now();

    if (st === "idle") {
        startFish();
        return;
    }

    if (st === "wait") {
        // too early
        toast("./Source/Assets/Icons/error.png", "Too quick!");
        resetFish();
        return;
    }

    if (st === "bite") {
        if (now <= tB) {
            giveCatch();
            resetFish();
        } else {
            toast("./Source/Assets/Icons/error.png", "The fish escaped!");
            resetFish();
        }
    }
});

/* ---------- keys ---------- */
window.addEventListener("keydown", (e) => {
    if (e.code === "KeyE") {
        e.preventDefault();
        if (vOn) { closeLore(); return; }
        setOpen(!open);
        return;
    }
    if (e.code === "Escape") {
        if (vOn) { closeLore(); return; }
        if (open) { setOpen(false); }
    }
});

/* ---------- mouse move (hand) ---------- */
window.addEventListener("mousemove", (e) => {
    if (!hnd) return;
    renHand();
    hand.style.transform = `translate(${e.clientX + 10}px, ${e.clientY + 10}px)`;
});

/* ---------- clock UI ---------- */
function tickClk() {
    const hr = curHr();
    clk.textContent = `Time: ${fmtHr(hr)} · Total: ${sumCch(cch)}`;
    requestAnimationFrame(tickClk);
}
tickClk();

/* ---------- Three.js background (water + sky + gulls) ---------- */
const cvs = $("#bg");
const ren = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: true });
ren.setPixelRatio(Math.min(devicePixelRatio, 2));

const scn = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
cam.position.set(0, 18, 28);
cam.lookAt(0, 4, -30);

const amb = new THREE.AmbientLight(0xffffff, 0.6);
scn.add(amb);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(30, 60, 20);
scn.add(sun);

scn.fog = new THREE.Fog(0x0b1220, 60, 420);

// water plane
const tl = new THREE.TextureLoader();
const wtx = tl.load("./Source/Assets/Terrain/water.png", (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(200, 200);
});
wtx.colorSpace = THREE.SRGBColorSpace;

const wmat = new THREE.MeshPhongMaterial({
    map: wtx,
    transparent: true,
    opacity: 0.84,
    shininess: 60,
    specular: new THREE.Color(0x99ccff)
});
const wgeo = new THREE.PlaneGeometry(2000, 2000, 1, 1);
const wtr = new THREE.Mesh(wgeo, wmat);
wtr.rotation.x = -Math.PI / 2;
wtr.position.y = 0;
scn.add(wtr);

// stars (points)
const stN = 900;
const stPos = new Float32Array(stN * 3);
for (let i = 0; i < stN; i++) {
    const r = rnd(240, 520);
    const th = rnd(0, Math.PI * 2);
    const ph = rnd(0.15, Math.PI * 0.55);
    stPos[i * 3 + 0] = Math.cos(th) * Math.sin(ph) * r;
    stPos[i * 3 + 1] = Math.cos(ph) * r + 80;
    stPos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * r;
}
const stGeo = new THREE.BufferGeometry();
stGeo.setAttribute("position", new THREE.BufferAttribute(stPos, 3));
const stMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0.0 });
const stars = new THREE.Points(stGeo, stMat);
scn.add(stars);

// gulls
function mkGull() {
    const g = new THREE.Group();

    const b = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.0 })
    );
    b.scale.set(1.6, 0.8, 0.9);
    g.add(b);

    const wm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const wg = new THREE.PlaneGeometry(1.1, 0.35);

    const wl = new THREE.Mesh(wg, wm);
    wl.position.set(-0.72, 0, 0);
    wl.rotation.y = Math.PI * 0.07;
    g.add(wl);

    const wr = new THREE.Mesh(wg, wm);
    wr.position.set(0.72, 0, 0);
    wr.rotation.y = -Math.PI * 0.07;
    g.add(wr);

    g.userData = {
        on: false, t0: 0, t1: 0, a: 0, sp: 0, r: 0, y: 0, wl, wr
    };

    g.visible = false;
    scn.add(g);
    return g;
}

const gull = [mkGull(), mkGull(), mkGull()];
let gNext = Date.now() + rndi(6000, 12000);

function actG() {
    const n = rndi(2, 3);
    const now = Date.now();
    let k = 0;
    for (const g of gull) {
        if (k >= n) break;
        if (g.userData.on) continue;
        g.userData.on = true;
        g.userData.t0 = now;
        g.userData.t1 = now + rndi(9000, 16000);
        g.userData.a = rnd(0, Math.PI * 2);
        g.userData.sp = rnd(0.25, 0.55);
        g.userData.r = rnd(28, 58);
        g.userData.y = rnd(16, 28);
        g.visible = true;
        k++;
    }
    gNext = now + rndi(16000, 34000);
}

function col(hex) { return new THREE.Color(hex); }
const C = {
    n: col("#040616"),
    sr: col("#ff7b2e"),
    d: col("#87cfff"),
    ss: col("#ff3b6a")
};

function skyAt(hr) {
    // stages:
    // night: 20-5, sunrise: 5-7, day: 7-17, sunset: 17-20
    let c, ni = 0;

    if (hr >= 20 || hr < 5) {
        // night with slight fade near edges
        const t = (hr >= 20) ? (hr - 20) / 4 : (hr + 4) / 9; // 20->24 and 0->5
        c = C.n.clone();
        ni = 1.0 - clamp(t, 0, 1) * 0.35;
        return { c, ni: 1.0 };
    }
    if (hr >= 5 && hr < 7) {
        const t = (hr - 5) / 2;
        c = C.n.clone().lerp(C.sr, t);
        return { c, ni: clamp(1.0 - t, 0, 1) };
    }
    if (hr >= 7 && hr < 17) {
        const t = (hr - 7) / 10;
        c = C.sr.clone().lerp(C.d, clamp(t * 1.15, 0, 1));
        return { c, ni: 0.0 };
    }
    // 17-20 sunset
    {
        const t = (hr - 17) / 3;
        c = C.d.clone().lerp(C.ss, t);
        return { c, ni: 0.0 };
    }
}

function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ren.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

let tPrev = performance.now();
function loop(tNow) {
    const dt = Math.min(0.05, (tNow - tPrev) / 1000);
    tPrev = tNow;

    const hr = curHr();
    const sky = skyAt(hr);

    scn.background = sky.c;
    scn.fog.color.copy(sky.c);

    // lighting sync
    const day = clamp((Math.sin((hr / 24) * Math.PI * 2 - Math.PI / 2) + 1) / 2, 0, 1);
    const li = lerp(0.25, 1.25, day);
    amb.intensity = lerp(0.25, 0.7, day);
    sun.intensity = li;

    // sun direction
    const ang = (hr / 24) * Math.PI * 2;
    sun.position.set(Math.cos(ang) * 60, lerp(10, 85, day), Math.sin(ang) * 60);

    // stars fade
    const stO = clamp(1.0 - day * 1.25, 0, 1);
    stMat.opacity = stO * 0.95;

    // water scroll
    if (wtx) {
        wtx.offset.x += dt * 0.015;
        wtx.offset.y += dt * 0.010;
    }
    // keep plane centered (infinite feel)
    wtr.position.x = cam.position.x;
    wtr.position.z = cam.position.z;

    // gentle camera bob
    cam.position.y = 18 + Math.sin(tNow * 0.0008) * 0.35;

    // gull spawner
    if (Date.now() > gNext) actG();

    // gull anim
    const now = Date.now();
    for (const g of gull) {
        const u = g.userData;
        if (!u.on) continue;

        if (now > u.t1) {
            u.on = false;
            g.visible = false;
            continue;
        }

        u.a += u.sp * dt;
        const x = cam.position.x + Math.cos(u.a) * u.r;
        const z = cam.position.z + Math.sin(u.a) * u.r - 40;
        const y = u.y + Math.sin(u.a * 2.0) * 1.4;

        g.position.set(x, y, z);
        g.lookAt(cam.position.x, y, cam.position.z);

        const flap = Math.sin(tNow * 0.010) * 0.8;
        u.wl.rotation.z = flap;
        u.wr.rotation.z = -flap;
    }

    ren.render(scn, cam);
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- init ---------- */
resetFish();
setOpen(false);
svAll();