// ---------- data ----------
const loot = [
    {
        name: "Salmon", desc: "Smells Fishy", iden: "salmon",
        icon: "./Source/Assets/Catches/Fish/salmon.png",
        ctgy: "fish", rrty: "uncommon", sell: true, slsp: 15, stak: 256, wght: 10, xpmi: 5, xpma: 8,
        time: [[5, 8], [16.5, 21.25]]
    },
    {
        name: "Old Boot", desc: "Stinky Shoe", iden: "oldboot",
        icon: "./Source/Assets/Catches/Junk/oldboot.png",
        ctgy: "junk", rrty: "common", sell: true, stak: 256, wght: 1.5, xpmi: 2, xpma: 4, slsp: 2,
        time: [[0, 24]]
    },
    {
        name: "Crown", desc: "Very Shiny", iden: "crown",
        icon: "./Source/Assets/Catches/Treasure/crown.png",
        ctgy: "treasure", rrty: "rare", sell: true, stak: 256, wght: 2.8, xpmi: 7, xpma: 9, slsp: 1000,
        time: [[0, 24]]
    }
];

const lore = [
    {
        name: "Research Log #1", desc: "Entry 1",
        icon: "./Source/Assets/Catches/Lore/researchlog.png",
        file: "./Source/Assets/Catches/Files/researchlog1.png",
        ctch: 5
    },
    {
        name: "Soggy Travel Brochure", desc: "Water-damaged pamphlet",
        icon: "./Source/Assets/Catches/Lore/travelbrochure.png",
        file: "./Source/Assets/Catches/Files/travelbrochure.png",
        ctch: 17
    },
    {
        name: "Research Log #2", desc: "Entry 2",
        icon: "./Source/Assets/Catches/Lore/researchlog.png",
        file: "./Source/Assets/Catches/Files/researchlog2.png",
        ctch: 32
    }
];

// ---------- ui refs ----------
const bg = $("#bg");
const ui = $("#ui");
const fish = $("#fish");
const btn = $("#btn");
const bar = $("#bar");
const fill = $("#fill");
const ts = $("#ts");

const bag = $("#bag");
const grd = $("#grd");
const inf = $("#inf");
const in0 = $("#in0");
const in1 = $("#in1");

const view = $("#view");
const pic = $("#pic");

const cur = $("#cur");
const curi = $("#curi");
const curn = $("#curn");

// ---------- state ----------
let st = 0;      // 0 idle, 1 wait, 2 win
let t0 = 0;      // wait end
let ti = 0;      // wait timer
let tw = 0;      // win timer

let mode = 0;    // 0 home, 1 bag, 2 view
let hov = -1;

const err = "./Source/Assets/Icons/error.png";

// inv: 45 slots, split like MC: top 27, bot 18
let inv = [];
let hand = null; // {id,n}

// ---------- storage ----------
const keyc = "ct";
const keyi = "inv";

initc();
initi();
draw();

// ---------- fish logic ----------
btn.addEventListener("click", () => {
    if (mode !== 0) return;

    if (st === 0) cast();
    else if (st === 1) { toast(err, "Too quick!"); reset(); }
    else if (st === 2) reel();
});

function cast() {
    st = 1;
    btn.textContent = "Reel In";
    const dur = (2 + Math.random() * 4) * 1000;
    t0 = performance.now() + dur;

    fill.style.transition = "width 0ms linear";
    fill.style.width = "0%";
    void fill.offsetWidth;
    fill.style.transition = `width ${dur}ms linear`;
    fill.style.width = "100%";

    clearTimeout(ti);
    ti = setTimeout(() => {
        st = 2;
        // 2s window
        clearTimeout(tw);
        tw = setTimeout(() => {
            toast(err, "The fish escaped!");
            reset();
        }, 2000);
    }, dur);
}

function reel() {
    clearTimeout(tw);
    const got = get();
    add(got.id, 1);
    toast(got.icon, `You caught x1 ${got.name}!`);
    reset();
}

function reset() {
    st = 0;
    btn.textContent = "Fish";
    fill.style.transition = "width 120ms linear";
    fill.style.width = "0%";
    clearTimeout(ti);
    clearTimeout(tw);
}

// ---------- loot + lore ----------
const rmap = { common: "C", uncommon: "U", rare: "R", epic: "E", legendary: "L" };
const rw = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };

const lib = build();

function build() {
    const m = {};
    for (const a of loot) m[a.iden] = a;
    for (let i = 0; i < lore.length; i++) {
        m["l" + i] = {
            name: lore[i].name,
            desc: lore[i].desc,
            iden: "l" + i,
            icon: lore[i].icon,
            file: lore[i].file,
            ctgy: "lore",
            rrty: "lore",
            sell: false,
            slsp: 0,
            stak: 1,
            wght: 0
        };
    }
    return m;
}

function get() {
    const c = loadc();
    const tot = totc(c);
    const li = c.lore || 0;

    // roll normal loot (stats always use this)
    const hr = day();
    const list = loot.filter(a => ok(a, hr));
    const itm = pick(list.length ? list : loot);

    // lore override (linear order)
    let id = itm.iden;
    let ico = itm.icon;
    let nam = itm.name;

    if (li < lore.length && (tot + 1) === lore[li].ctch) {
        id = "l" + li;
        ico = lore[li].icon;
        nam = lore[li].name;
        c.lore = li + 1;
    }

    // stats: category + rarity from normal roll
    inc(c, itm.ctgy, rmap[itm.rrty] || "C");
    savec(c);

    return { id, icon: ico, name: nam };
}

function ok(a, hr) {
    for (const r of a.time) {
        const s = r[0], e = r[1];
        if (hr >= s && hr < e) return true;
    }
    return false;
}

function pick(list) {
    let sum = 0;
    for (const a of list) sum += (rw[a.rrty] || 1);
    let r = Math.random() * sum;
    for (const a of list) {
        r -= (rw[a.rrty] || 1);
        if (r <= 0) return a;
    }
    return list[list.length - 1];
}

function totc(c) {
    let n = 0;
    for (const k of ["fish", "junk", "treasure"]) {
        const b = c[k];
        for (const r of ["C", "U", "R", "E", "L"]) n += (b[r] || 0);
    }
    return n;
}

function inc(c, k, r) {
    c[k] = c[k] || { C: 0, U: 0, R: 0, E: 0, L: 0 };
    c[k][r] = (c[k][r] || 0) + 1;
}

function initc() {
    if (!localStorage.getItem(keyc)) {
        const c = {
            lore: 0,
            fish: { C: 0, U: 0, R: 0, E: 0, L: 0 },
            junk: { C: 0, U: 0, R: 0, E: 0, L: 0 },
            treasure: { C: 0, U: 0, R: 0, E: 0, L: 0 }
        };
        localStorage.setItem(keyc, JSON.stringify(c));
    }
}

function loadc() { return JSON.parse(localStorage.getItem(keyc)); }
function savec(c) { localStorage.setItem(keyc, JSON.stringify(c)); }

function initi() {
    const raw = localStorage.getItem(keyi);
    inv = raw ? JSON.parse(raw) : Array(45).fill(null);
    savei();
}
function savei() { localStorage.setItem(keyi, JSON.stringify(inv)); }

// ---------- inv logic ----------
function add(id, n) {
    const it = lib[id];
    if (!it) return;

    let left = n;
    const max = it.stak || 1;

    // stack first
    for (let i = 0; i < inv.length; i++) {
        const s = inv[i];
        if (!s || s.id !== id) continue;
        const can = max - s.n;
        if (can <= 0) continue;
        const put = Math.min(can, left);
        s.n += put;
        left -= put;
        if (!left) break;
    }
    // empty slots
    for (let i = 0; i < inv.length && left; i++) {
        if (inv[i]) continue;
        const put = Math.min(max, left);
        inv[i] = { id, n: put };
        left -= put;
    }

    savei();
    draw();
}

function draw() {
    grd.innerHTML = "";
    for (let i = 0; i < 45; i++) {
        const d = document.createElement("div");
        d.className = "sl";
        d.dataset.i = i;

        const s = inv[i];
        if (s) {
            const it = lib[s.id];
            if (it) {
                const im = document.createElement("img");
                im.src = it.icon;
                im.draggable = false;
                d.appendChild(im);

                if (s.n > 1) {
                    const n = document.createElement("div");
                    n.className = "n";
                    n.textContent = s.n;
                    d.appendChild(n);
                }
            }
        }

        d.addEventListener("mouseenter", () => show(i));
        d.addEventListener("mouseleave", () => show(-1));
        d.addEventListener("click", (e) => click(i, e.shiftKey));
        d.addEventListener("contextmenu", (e) => rclk(i, e));

        grd.appendChild(d);
    }
}

function click(i, sh) {
    if (mode !== 1) return;

    if (sh) {
        qmv(i);
        return;
    }

    const s = inv[i];

    // pick
    if (!hand && s) {
        hand = { id: s.id, n: s.n };
        inv[i] = null;
        savei(); draw();
        showcur();
        return;
    }

    // place
    if (hand) {
        if (!s) {
            inv[i] = { id: hand.id, n: hand.n };
            hand = null;
            savei(); draw();
            showcur();
            return;
        }

        // merge if same
        if (s.id === hand.id) {
            const it = lib[s.id];
            const max = it.stak || 1;
            const can = max - s.n;
            if (can > 0) {
                const put = Math.min(can, hand.n);
                s.n += put;
                hand.n -= put;
                if (hand.n <= 0) hand = null;
                savei(); draw();
                showcur();
                return;
            }
        }

        // swap
        const tmp = { id: s.id, n: s.n };
        inv[i] = { id: hand.id, n: hand.n };
        hand = tmp;
        savei(); draw();
        showcur();
    }
}

function qmv(i) {
    const s = inv[i];
    if (!s) return;

    const top = i < 27;
    const a0 = top ? 27 : 0;
    const a1 = top ? 45 : 27;

    const it = lib[s.id];
    const max = it.stak || 1;

    // stack
    for (let j = a0; j < a1 && s.n > 0; j++) {
        const d = inv[j];
        if (!d || d.id !== s.id) continue;
        const can = max - d.n;
        if (can <= 0) continue;
        const put = Math.min(can, s.n);
        d.n += put;
        s.n -= put;
    }
    // empty
    for (let j = a0; j < a1 && s.n > 0; j++) {
        if (inv[j]) continue;
        const put = Math.min(max, s.n);
        inv[j] = { id: s.id, n: put };
        s.n -= put;
    }

    if (s.n <= 0) inv[i] = null;

    savei(); draw();
    showcur();
}

function show(i) {
    hov = i;
    if (mode !== 1) return;

    if (i < 0 || !inv[i]) {
        in0.textContent = "Hover an item";
        in1.textContent = "";
        return;
    }

    const s = inv[i];
    const it = lib[s.id];
    if (!it) return;

    in0.textContent = it.name;
    const p = it.sell ? `$${it.slsp}` : "Not sellable";
    const w = (it.wght != null) ? `${it.wght} lbs` : "-";
    const st = (it.stak != null) ? `Stack ${it.stak}` : "-";
    const cat = it.ctgy;
    const rr = it.rrty;

    in1.innerHTML =
        `${it.desc}<br>` +
        `Cat: <b>${cat}</b> &nbsp; Rr: <b>${rr}</b><br>` +
        `Price: <b>${p}</b> &nbsp; ${st} &nbsp; W: <b>${w}</b>`;
}

function rclk(i, e) {
    if (mode !== 1) return;
    e.preventDefault();

    const s = inv[i];
    if (!s) return;
    const it = lib[s.id];
    if (!it || it.ctgy !== "lore") return;

    // open lore file view
    mode = 2;
    bag.style.display = "none";
    inf.style.display = "none";
    view.style.display = "flex";
    pic.src = it.file;
}

// cursor
window.addEventListener("mousemove", (e) => {
    if (mode !== 1 || !hand) {
        cur.style.display = "none";
        return;
    }
    cur.style.display = "block";
    cur.style.left = e.clientX + "px";
    cur.style.top = e.clientY + "px";
});

function showcur() {
    if (mode === 1 && hand) {
        curi.src = lib[hand.id]?.icon || "";
        curn.textContent = hand.n > 1 ? hand.n : "";
        cur.style.display = "block";
    } else {
        cur.style.display = "none";
    }
}

// ---------- keys / modes ----------
window.addEventListener("keydown", (e) => {
    if (e.key === "e" || e.key === "E") {
        if (mode === 2) closev();
        else if (mode === 1) closeb();
        else openb();
    }
    if (e.key === "Escape") {
        if (mode === 2) closev();
        else if (mode === 1) closeb();
    }
});

view.addEventListener("click", () => {
    if (mode === 2) closev();
});

function openb() {
    mode = 1;
    document.body.classList.add("hide");
    bag.style.display = "block";
    inf.style.display = "block";
    show(-1);
    showcur();
}

function closeb() {
    mode = 0;
    document.body.classList.remove("hide");
    bag.style.display = "none";
    inf.style.display = "none";
    hand = null;
    showcur();
}

function closev() {
    mode = 1;
    view.style.display = "none";
    bag.style.display = "block";
    inf.style.display = "block";
    show(hov);
    showcur();
}

// ---------- toast ----------
function toast(ico, msg) {
    const d = document.createElement("div");
    d.className = "t";

    const i = document.createElement("img");
    i.src = ico;

    const s = document.createElement("span");
    s.textContent = msg;

    d.appendChild(i);
    d.appendChild(s);
    ts.appendChild(d);

    setTimeout(() => {
        d.style.opacity = "0";
        d.style.transform = "translateY(-6px)";
        d.style.transition = "opacity .18s ease, transform .18s ease";
    }, 2200);

    setTimeout(() => d.remove(), 2500);
}

// ---------- time (24 min loop) ----------
const tday = 24 * 60 * 1000; // 24 real minutes
function day() {
    const ms = performance.now() % tday;
    return (ms / tday) * 24; // 0..24
}

// ---------- three ----------
let sc, cam, rd, wat, tex, sun, amb, fog, sky, star, gull;
init3();
loop();

function init3() {
    sc = new THREE.Scene();

    cam = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 20000);
    cam.position.set(0, 9, 22);
    cam.lookAt(0, 0, 0);

    rd = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rd.setSize(innerWidth, innerHeight);
    rd.setPixelRatio(Math.min(devicePixelRatio, 2));
    bg.appendChild(rd.domElement);

    const load = new THREE.TextureLoader();
    tex = load.load("./Source/Assets/Terrain/water.png");
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1200, 1200);

    const geo = new THREE.PlaneGeometry(20000, 20000, 1, 1);
    const mat = new THREE.MeshPhongMaterial({
        map: tex,
        transparent: true,
        opacity: 0.78,
        shininess: 80,
        depthWrite: false
    });

    wat = new THREE.Mesh(geo, mat);
    wat.rotation.x = -Math.PI / 2;
    wat.position.y = 0;
    sc.add(wat);

    fog = new THREE.Fog(new THREE.Color("#0a0c12"), 60, 800);
    sc.fog = fog;

    amb = new THREE.AmbientLight(0xffffff, 0.35);
    sc.add(amb);

    sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(60, 80, 30);
    sc.add(sun);

    star = mkstar();
    sc.add(star);

    gull = mkgull();
    sc.add(gull.g);
    spawn();

    window.addEventListener("resize", () => {
        cam.aspect = innerWidth / innerHeight;
        cam.updateProjectionMatrix();
        rd.setSize(innerWidth, innerHeight);
    });
}

function loop() {
    const hr = day();
    sky = col(hr);

    sc.background = sky;
    fog.color.copy(sky);

    // lights
    const nf = night(hr); // 0..1
    amb.intensity = 0.25 + (1 - nf) * 0.25;
    sun.intensity = 0.15 + (1 - nf) * 1.05;
    sun.color.copy(suncol(hr));

    // stars fade in at night
    star.material.opacity = nf;
    star.material.needsUpdate = true;

    // water scroll
    tex.offset.x += 0.00028;
    tex.offset.y += 0.00018;

    // gull anim
    gulltick();

    rd.render(sc, cam);
    requestAnimationFrame(loop);
}

// ----- sky / day stages -----
function col(hr) {
    // stages: night [0-5,20-24], sunrise [5-8], day [8-17], sunset [17-20]
    if (hr < 5) return lerp("#060814", "#0a0c18", hr / 5);
    if (hr < 8) return lerp("#0a0c18", "#ff9a62", (hr - 5) / 3);
    if (hr < 17) return lerp("#9ddcff", "#bfe9ff", (hr - 8) / 9);
    if (hr < 20) return lerp("#ff8a5a", "#2a1b3d", (hr - 17) / 3);
    return lerp("#2a1b3d", "#060814", (hr - 20) / 4);
}

function suncol(hr) {
    if (hr < 5) return new THREE.Color("#9bb7ff");
    if (hr < 8) return new THREE.Color(lerp("#ffd2a6", "#ffffff", (hr - 5) / 3));
    if (hr < 17) return new THREE.Color("#ffffff");
    if (hr < 20) return new THREE.Color(lerp("#ffd2a6", "#ffb07a", (hr - 17) / 3));
    return new THREE.Color("#9bb7ff");
}

function night(hr) {
    // 1 at deep night, 0 at day
    if (hr < 5) return 1;
    if (hr < 8) return 1 - (hr - 5) / 3;
    if (hr < 17) return 0;
    if (hr < 20) return (hr - 17) / 3;
    return 1;
}

function lerp(a, b, t) {
    const ca = new THREE.Color(a);
    const cb = new THREE.Color(b);
    const c = ca.lerp(cb, clamp(t));
    return c;
}
function clamp(x) { return Math.max(0, Math.min(1, x)); }

// ----- stars -----
function mkstar() {
    const n = 1200;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        const r = 900 + Math.random() * 600;
        const th = Math.random() * Math.PI * 2;
        const y = 120 + Math.random() * 320;
        pos[i * 3 + 0] = Math.cos(th) * r;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = Math.sin(th) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 1, depthWrite: false });
    return new THREE.Points(g, m);
}

// ----- gulls -----
function mkgull() {
    const g = new THREE.Group();
    g.visible = false;

    const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0 })
    );

    const wmat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9 });
    const wing = new THREE.PlaneGeometry(0.9, 0.22);

    const l = new THREE.Mesh(wing, wmat);
    const r = new THREE.Mesh(wing, wmat);
    l.position.set(-0.55, 0, 0);
    r.position.set(0.55, 0, 0);
    l.rotation.y = 0.25;
    r.rotation.y = -0.25;

    g.add(body, l, r);

    return { g, l, r, t: 0, a: 0, s: 0, x: 0, z: 0, y: 0, sp: 0 };
}

function spawn() {
    // 2-3 gulls occasionally: we reuse one gull, but spawn it 2-3 times per minute-ish
    const n = 2 + Math.floor(Math.random() * 2); // 2..3
    let k = 0;

    const go = () => {
        if (k >= n) return;
        k++;

        gull.g.visible = true;
        gull.t = 0;
        gull.a = Math.random() * Math.PI * 2;
        gull.s = (Math.random() * 2 - 1) * 1;
        gull.y = 12 + Math.random() * 10;
        gull.sp = 0.8 + Math.random() * 0.8;

        // run 6-10s then hide
        setTimeout(() => { gull.g.visible = false; }, 6500 + Math.random() * 3500);

        setTimeout(go, 900 + Math.random() * 1400);
    };

    go();

    // next cycle
    setTimeout(spawn, 9000 + Math.random() * 16000);
}

function gulltick() {
    if (!gull.g.visible) return;

    gull.t += 0.06;

    // orbit-ish pass
    const r = 55;
    const a = gull.a + gull.t * gull.sp * 0.2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    gull.g.position.set(x, gull.y + Math.sin(gull.t * 0.7) * 0.6, z);
    gull.g.lookAt(0, gull.y, 0);

    // flap
    const f = Math.sin(gull.t * 7.0) * 0.55;
    gull.l.rotation.z = f;
    gull.r.rotation.z = -f;
}

// ---------- helpers ----------
function $(q) { return document.querySelector(q); }
