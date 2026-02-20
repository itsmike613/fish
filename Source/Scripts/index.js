// ----- Loot & Lore -----
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

// ----- DOM -----
const ui = $("#ui");
const btn = $("#btn");
const fill = $("#fill");
const bag = $("#bag");
const inv = $("#inv");
const inf = $("#inf");
const tos = $("#tos");
const cur = $("#cur");
const curi = $("#curi");
const curq = $("#curq");
const view = $("#view");
const pic = $("#pic");

function $(q) { return document.querySelector(q); }
function on(a, b, c) { a.addEventListener(b, c); }
function cls(el, c, v) { el.classList.toggle(c, !!v); }

// ----- Local storage -----
const key = "catches";
const ikey = "inv";

const base = {
    lore: 0,
    fish: { C: 0, U: 0, R: 0, E: 0, L: 0 },
    junk: { C: 0, U: 0, R: 0, E: 0, L: 0 },
    treasure: { C: 0, U: 0, R: 0, E: 0, L: 0 }
};

function load(k, def) {
    try {
        const v = JSON.parse(localStorage.getItem(k));
        return v ?? def;
    } catch (_) { return def; }
}
function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

let dat = load(key, base);
let bagon = false;
let vwon = false;

// Inventory: 45 slots: {id, q} or null
let slot = load(ikey, Array(45).fill(null));
if (!Array.isArray(slot) || slot.length !== 45) slot = Array(45).fill(null);

// Cursor item: {id, q} or null
let hand = null;

// ----- Time (24-min loop) -----
const day = 24 * 60 * 1000; // 24 real minutes
function hr() {
    const t = Date.now() % day;
    return t / 60000; // 1 real minute = 1 in-game hour
}

// ----- Helpers -----
const rwt = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };
const rmap = { common: "C", uncommon: "U", rare: "R", epic: "E", legendary: "L" };

function sum() {
    let s = 0;
    for (const k of ["fish", "junk", "treasure"]) {
        for (const r of ["C", "U", "R", "E", "L"]) s += (dat[k]?.[r] || 0);
    }
    return s;
}

function hit(h, a) {
    for (const p of a) {
        const s = p[0], e = p[1];
        if (s <= e) {
            if (h >= s && h < e) return true;
        } else {
            // wrap-around
            if (h >= s || h < e) return true;
        }
    }
    return false;
}

function pick(arr) {
    let w = 0;
    for (const it of arr) w += it.w;
    let x = Math.random() * w;
    for (const it of arr) {
        x -= it.w;
        if (x <= 0) return it.v;
    }
    return arr[arr.length - 1].v;
}

function meta(id) {
    if (!id) return null;
    if (id[0] === "l") {
        const i = parseInt(id.slice(1), 10);
        const it = lore[i];
        if (!it) return null;
        return {
            name: it.name,
            desc: it.desc,
            icon: it.icon,
            file: it.file,
            ctgy: "lore",
            rrty: "lore",
            sell: false,
            slsp: 0,
            stak: 1,
            wght: 0,
            xpmi: 0,
            xpma: 0
        };
    }
    const it = loot.find(x => x.iden === id);
    return it || null;
}

function add(id, q) {
    const m = meta(id);
    if (!m) return;
    const max = m.stak || 1;

    // stack into existing
    for (let i = 0; i < slot.length && q > 0; i++) {
        const s = slot[i];
        if (!s || s.id !== id) continue;
        const can = Math.max(0, max - s.q);
        if (can <= 0) continue;
        const put = Math.min(can, q);
        s.q += put;
        q -= put;
    }
    // fill empties
    for (let i = 0; i < slot.length && q > 0; i++) {
        if (slot[i]) continue;
        const put = Math.min(max, q);
        slot[i] = { id, q: put };
        q -= put;
    }
    save(ikey, slot);
}

function toast(ico, msg) {
    const d = document.createElement("div");
    d.className = "to";
    const i = document.createElement("img");
    i.src = ico;
    const s = document.createElement("span");
    s.textContent = msg;
    d.appendChild(i);
    d.appendChild(s);
    tos.appendChild(d);
    setTimeout(() => {
        d.style.opacity = "0";
        d.style.transform = "translateY(-4px)";
        d.style.transition = "150ms";
        setTimeout(() => d.remove(), 220);
    }, 2800);
}

// ----- Fishing -----
let st = 0; // 0 idle, 1 wait, 2 win
let t0 = 0;
let dur = 0;
let win = null;

function reset() {
    st = 0;
    btn.textContent = "Fish";
    fill.style.width = "0%";
    fill.style.background = "rgba(255,255,255,.30)";
    if (win) clearTimeout(win);
    win = null;
}

function roll() {
    const h = hr();
    const ok = loot.filter(it => hit(h, it.time || [[0, 24]]));

    // fallback if nothing matches
    const arr = (ok.length ? ok : loot).map(it => ({ v: it, w: rwt[it.rrty] || 1 }));
    return pick(arr);
}

function reel() {
    // normal loot choice (also drives catch counters even if lore replaces)
    const it = roll();

    // lore check: linear order, milestone on total+1
    const tot = sum();
    const li = dat.lore || 0;
    const nx = lore[li];

    let got = it;
    let id = it.iden;
    let q = Math.min(it.stak || 1, 1 + (Math.random() * 3 | 0));

    const mark = (nx && (tot + 1) === nx.ctch);
    if (mark) {
        got = meta("l" + li);
        id = "l" + li;
        q = 1;
        dat.lore = li + 1;
    }

    // increment counters using chosen loot category/rarity (even if lore item replaces the reward)
    const c = it.ctgy;
    const r = rmap[it.rrty] || "C";
    if (dat[c] && dat[c][r] != null) dat[c][r] += 1;

    save(key, dat);
    add(id, q);
    draw();

    toast(got.icon, `You caught x${q} ${got.name}!`);
}

function tickbar() {
    if (st !== 1) return;
    const t = performance.now();
    const p = Math.min(1, (t - t0) / dur);
    fill.style.width = (p * 100).toFixed(1) + "%";
    requestAnimationFrame(tickbar);
}

function go() {
    if (st === 0) {
        st = 1;
        btn.textContent = "Reel In";
        fill.style.width = "0%";
        fill.style.background = "rgba(255,255,255,.30)";
        dur = 2000 + Math.random() * 4000;
        t0 = performance.now();
        tickbar();

        setTimeout(() => {
            if (st !== 1) return;
            st = 2;
            fill.style.width = "100%";
            fill.style.background = "rgba(120,255,180,.55)";
            win = setTimeout(() => {
                if (st !== 2) return;
                toast("./Source/Assets/Icons/error.png", "The fish escaped!");
                reset();
            }, 2000);
        }, dur);

        return;
    }

    if (st === 1) {
        toast("./Source/Assets/Icons/error.png", "Too quick!");
        return;
    }

    if (st === 2) {
        if (win) clearTimeout(win);
        win = null;
        reel();
        reset();
    }
}

on(btn, "click", () => {
    if (bagon || vwon) return;
    go();
});

// ----- Backpack UI -----
function draw() {
    inv.innerHTML = "";
    for (let i = 0; i < 45; i++) {
        const d = document.createElement("div");
        d.className = "slot";
        d.dataset.i = i;

        const s = slot[i];
        if (s) {
            const m = meta(s.id);
            if (m) {
                const im = document.createElement("img");
                im.className = "ico";
                im.src = m.icon;
                d.appendChild(im);

                if (s.q > 1) {
                    const q = document.createElement("div");
                    q.className = "qty";
                    q.textContent = s.q;
                    d.appendChild(q);
                }
            }
        }

        on(d, "mouseenter", () => info(i));
        on(d, "mouseleave", () => { cls(inf, "off", true); });
        on(d, "mousedown", (e) => slotdown(e, i));

        inv.appendChild(d);
    }
}

function info(i) {
    const s = slot[i];
    if (!s) { cls(inf, "off", true); return; }
    const m = meta(s.id);
    if (!m) { cls(inf, "off", true); return; }

    cls(inf, "off", false);

    const a = [];
    if (m.ctgy !== "lore") {
        a.push(`Cat: ${m.ctgy}`);
        a.push(`Rarity: ${m.rrty}`);
        a.push(`Price: $${m.slsp}`);
        a.push(`Stack: ${m.stak}`);
        a.push(`Wght: ${m.wght}lb`);
        a.push(`XP: ${m.xpmi}-${m.xpma}`);
    } else {
        a.push(`Type: lore`);
        a.push(`Qty: ${s.q}`);
    }

    inf.innerHTML = `
    <div class="t">${m.name} <span style="color:rgba(255,255,255,.65);font-size:18px">x${s.q}</span></div>
    <div class="d">${m.desc}</div>
    <div class="m">${a.join(" • ")}</div>
  `;
}

function handdraw() {
    if (!hand) {
        cls(cur, "off", true);
        return;
    }
    const m = meta(hand.id);
    if (!m) { hand = null; cls(cur, "off", true); return; }
    curi.src = m.icon;
    curq.textContent = hand.q > 1 ? hand.q : "";
    cls(cur, "off", false);
}

function mv(i, a0, a1) {
    // move stack from i into first merge/empty in [a0,a1)
    const s = slot[i];
    if (!s) return;

    const m = meta(s.id);
    const max = (m?.stak || 1);

    // try merge
    for (let j = a0; j < a1; j++) {
        if (j === i) continue;
        const t = slot[j];
        if (!t || t.id !== s.id) continue;
        const can = Math.max(0, max - t.q);
        if (can <= 0) continue;
        const put = Math.min(can, s.q);
        t.q += put;
        s.q -= put;
        if (s.q <= 0) { slot[i] = null; return; }
    }

    // empty slot
    for (let j = a0; j < a1; j++) {
        if (j === i) continue;
        if (slot[j]) continue;
        slot[j] = { id: s.id, q: s.q };
        slot[i] = null;
        return;
    }
}

function slotdown(e, i) {
    e.preventDefault();

    const s = slot[i];
    const m = s ? meta(s.id) : null;

    // Shift-click quick move (main <-> bar)
    if (e.button === 0 && e.shiftKey && s && !hand) {
        const isbar = i >= 36;
        if (isbar) mv(i, 0, 36);
        else mv(i, 36, 45);
        save(ikey, slot);
        draw();
        return;
    }

    // Right-click: lore view OR split/place-one
    if (e.button === 2) {
        if (s && m && m.file) {
            openview(m.file);
            return;
        }

        // split / place-one
        if (!hand && s) {
            const take = Math.ceil(s.q / 2);
            hand = { id: s.id, q: take };
            s.q -= take;
            if (s.q <= 0) slot[i] = null;
            save(ikey, slot);
            draw();
            handdraw();
            return;
        }

        if (hand) {
            const hm = meta(hand.id);
            const max = (hm?.stak || 1);

            if (!s) {
                slot[i] = { id: hand.id, q: 1 };
                hand.q -= 1;
                if (hand.q <= 0) hand = null;
            } else if (s.id === hand.id && s.q < max) {
                s.q += 1;
                hand.q -= 1;
                if (hand.q <= 0) hand = null;
            }
            save(ikey, slot);
            draw();
            handdraw();
        }
        return;
    }

    // Left-click: pickup/move/swap/merge
    if (e.button === 0) {
        if (!hand && s) {
            hand = { id: s.id, q: s.q };
            slot[i] = null;
            save(ikey, slot);
            draw();
            handdraw();
            return;
        }

        if (hand && !s) {
            slot[i] = { id: hand.id, q: hand.q };
            hand = null;
            save(ikey, slot);
            draw();
            handdraw();
            return;
        }

        if (hand && s) {
            if (hand.id === s.id) {
                const hm = meta(hand.id);
                const max = (hm?.stak || 1);
                const can = Math.max(0, max - s.q);
                if (can > 0) {
                    const put = Math.min(can, hand.q);
                    s.q += put;
                    hand.q -= put;
                    if (hand.q <= 0) hand = null;
                    save(ikey, slot);
                    draw();
                    handdraw();
                    return;
                }
            }
            // swap
            const tmp = { id: s.id, q: s.q };
            slot[i] = { id: hand.id, q: hand.q };
            hand = tmp;
            save(ikey, slot);
            draw();
            handdraw();
        }
    }
}

function openbag(v) {
    bagon = !!v;
    cls(bag, "off", !bagon);
    cls(ui, "hid", bagon);
    if (bagon) {
        reset();
        draw();
    } else {
        cls(inf, "off", true);
    }
}

function openview(src) {
    vwon = true;
    pic.src = src;
    cls(view, "off", false);
    cls(bag, "off", true);
    cls(ui, "hid", true);
}

function closeview() {
    vwon = false;
    cls(view, "off", true);
    // reopen backpack
    cls(bag, "off", false);
    cls(ui, "hid", true);
}

on(document, "mousemove", (e) => {
    if (!hand) return;
    cur.style.transform = `translate(${e.clientX + 10}px, ${e.clientY + 10}px)`;
});

on(document, "contextmenu", (e) => {
    if (bagon || vwon) e.preventDefault();
});

on(view, "mousedown", () => {
    if (vwon) closeview();
});

on(document, "keydown", (e) => {
    const k = e.key.toLowerCase();

    if (k === "e") {
        if (vwon) { closeview(); return; }
        openbag(!bagon);
    }

    if (k === "escape") {
        if (vwon) { closeview(); return; }
    }
});

// ----- Three.js water + day cycle + seagulls -----
let ren, scn, cam, wtr, tex, amb, sun, fog, star;
let gull = [];
let nxt = 0;

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

function col(a, b, t) {
    const ca = new THREE.Color(a);
    const cb = new THREE.Color(b);
    return ca.lerp(cb, clamp(t, 0, 1));
}

function sky(h) {
    // keyframes: night(0-5), sunrise(5-7), day(7-18), sunset(18-20), night(20-24)
    if (h < 5) {
        return { c: col("#060b18", "#060b18", 0), s: 0.15, a: 0.18, st: 1 };
    }
    if (h < 7) {
        const t = (h - 5) / 2;
        return { c: col("#08142a", "#ff7a3a", t), s: lerp(0.25, 0.85, t), a: lerp(0.22, 0.45, t), st: lerp(1, 0.2, t) };
    }
    if (h < 18) {
        const t = (h - 7) / 11;
        return { c: col("#87ceeb", "#7fd3ff", t), s: lerp(0.95, 1.10, t), a: lerp(0.45, 0.55, t), st: 0 };
    }
    if (h < 20) {
        const t = (h - 18) / 2;
        return { c: col("#6fb7ff", "#ff4b1f", t), s: lerp(0.95, 0.35, t), a: lerp(0.55, 0.25, t), st: lerp(0, 0.6, t) };
    }
    {
        const t = (h - 20) / 4;
        return { c: col("#1a0f2a", "#060b18", t), s: lerp(0.25, 0.15, t), a: lerp(0.22, 0.18, t), st: lerp(0.8, 1, t) };
    }
}

function mkstar() {
    const n = 900;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        // hemisphere above
        const r = 600 + Math.random() * 220;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.random() * Math.PI * 0.45; // tighter
        const x = Math.cos(th) * Math.sin(ph) * r;
        const y = Math.cos(ph) * r + 80;
        const z = Math.sin(th) * Math.sin(ph) * r;
        p[i * 3 + 0] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ size: 1.2, transparent: true, opacity: 0.9 });
    const s = new THREE.Points(g, m);
    return s;
}

function mkbird() {
    const g = new THREE.Group();

    const b = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0 })
    );
    b.scale.set(1.2, 0.8, 1.8);
    g.add(b);

    const w1 = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9 })
    );
    const w2 = w1.clone();
    w1.position.set(-0.9, 0.15, 0);
    w2.position.set(0.9, 0.15, 0);
    w1.rotation.y = Math.PI / 2;
    w2.rotation.y = -Math.PI / 2;
    g.add(w1); g.add(w2);

    g.userData.w1 = w1;
    g.userData.w2 = w2;

    // flight params
    g.userData.ang = Math.random() * Math.PI * 2;
    g.userData.rad = 40 + Math.random() * 70;
    g.userData.spd = 0.25 + Math.random() * 0.35;
    g.userData.alt = 18 + Math.random() * 18;
    g.userData.die = performance.now() + 12000 + Math.random() * 12000;

    return g;
}

function spawn() {
    const b = mkbird();
    scn.add(b);
    gull.push(b);
}

function init3() {
    scn = new THREE.Scene();

    cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 3000);
    cam.position.set(0, 34, 72);
    cam.lookAt(0, 0, 0);

    ren = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    ren.setSize(innerWidth, innerHeight);
    ren.setPixelRatio(Math.min(devicePixelRatio, 2));
    document.body.appendChild(ren.domElement);

    fog = new THREE.Fog(new THREE.Color("#0b1020"), 120, 520);
    scn.fog = fog;

    amb = new THREE.AmbientLight(0xffffff, 0.35);
    scn.add(amb);

    sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(80, 120, 50);
    scn.add(sun);

    // Water
    tex = new THREE.TextureLoader().load("./Source/Assets/Terrain/water.png");
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(120, 120);

    const mat = new THREE.MeshPhongMaterial({
        map: tex,
        transparent: true,
        opacity: 0.82,
        shininess: 80,
        specular: new THREE.Color(0x88aaff),
        color: new THREE.Color(0xffffff)
    });

    wtr = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1), mat);
    wtr.rotation.x = -Math.PI / 2;
    wtr.position.y = 0;
    scn.add(wtr);

    // Stars
    star = mkstar();
    scn.add(star);

    // Initial gulls (2-3 occasionally)
    const n = 2 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) spawn();
    nxt = performance.now() + 9000;

    on(window, "resize", () => {
        cam.aspect = innerWidth / innerHeight;
        cam.updateProjectionMatrix();
        ren.setSize(innerWidth, innerHeight);
    });

    let lt = performance.now();
    function loop() {
        const t = performance.now();
        const dt = Math.min(0.05, (t - lt) / 1000);
        lt = t;

        // subtle camera sway
        cam.position.x = Math.sin(t * 0.00035) * 1.5;
        cam.position.y = 34 + Math.sin(t * 0.00055) * 0.9;
        cam.lookAt(0, 0, 0);

        // water slide
        if (tex) {
            tex.offset.x += dt * 0.010;
            tex.offset.y += dt * 0.008;
        }

        // day cycle
        const h = hr();
        const s = sky(h);

        ren.setClearColor(s.c, 1);
        fog.color.copy(s.c);

        amb.intensity = s.a;
        sun.intensity = s.s;
        sun.color.copy(col("#fff2cc", "#ffffff", clamp((h - 7) / 2, 0, 1)));

        // stars fade
        star.material.opacity = clamp(s.st, 0, 1);
        star.visible = star.material.opacity > 0.02;

        // gull spawn/despawn
        if (t > nxt && gull.length < 3) {
            spawn();
            nxt = t + 8000 + Math.random() * 9000;
        }

        for (let i = gull.length - 1; i >= 0; i--) {
            const b = gull[i];
            if (t > b.userData.die && gull.length > 2) {
                scn.remove(b);
                gull.splice(i, 1);
                continue;
            }

            b.userData.ang += b.userData.spd * dt;
            const a = b.userData.ang;
            const r = b.userData.rad;

            const x = Math.cos(a) * r;
            const z = Math.sin(a) * r;
            const y = b.userData.alt + Math.sin(a * 2.2) * 1.2;

            b.position.set(x, y, z);

            // face direction
            const nx = -Math.sin(a);
            const nz = Math.cos(a);
            b.rotation.y = Math.atan2(nx, nz);

            // wings flap
            const f = Math.sin(t * 0.010 * 8) * 0.9;
            b.userData.w1.rotation.z = f;
            b.userData.w2.rotation.z = -f;
        }

        ren.render(scn, cam);
        requestAnimationFrame(loop);
    }
    loop();
}

// ----- Boot -----
draw();
handdraw();
reset();
init3();