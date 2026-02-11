// fish/Source/Scripts/FishingUI.js
import { events } from "./Events.js";

function clamp01(x) {
	return Math.max(0, Math.min(1, x));
}

function lerp(a, b, t) {
	return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
	const r = Math.round(lerp(c1[0], c2[0], t));
	const g = Math.round(lerp(c1[1], c2[1], t));
	const b = Math.round(lerp(c1[2], c2[2], t));
	return `rgb(${r},${g},${b})`;
}

const GREEN = [72, 255, 106];
const YELLOW = [255, 233, 90];
const ORANGE = [255, 155, 61];
const RED = [255, 61, 61];

function timerColor(ratio) {
	const t = clamp01(1 - ratio);
	if (t <= 1 / 3) return lerpColor(GREEN, YELLOW, t * 3);
	if (t <= 2 / 3) return lerpColor(YELLOW, ORANGE, (t - 1 / 3) * 3);
	return lerpColor(ORANGE, RED, (t - 2 / 3) * 3);
}

export class FishingUI {
	constructor() {
		this.wrap = document.getElementById("fishing");
		this.timer = document.getElementById("timer");
		this.fish = document.getElementById("fish");
		this.catch = document.getElementById("catch");

		this.active = false;
		this.waitTime = 0;
		this.startTime = 0;
		this.inCatch = false;
		this.catchStart = 0;
		this.catchWindow = 2.0;

		this.fish.addEventListener("click", () => this.onFish());
		this.catch.addEventListener("click", () => this.onCatch());

		this.setIdle();
	}

	setIdle() {
		this.active = false;
		this.inCatch = false;
		this.waitTime = 0;
		this.startTime = 0;
		this.catchStart = 0;

		this.timer.textContent = "0.0s";
		this.timer.style.color = `rgb(${GREEN[0]},${GREEN[1]},${GREEN[2]})`;

		this.fish.disabled = false;
		this.fish.style.display = "block";

		this.catch.classList.remove("ready");
		this.catch.disabled = false;
		this.catch.style.display = "none";
	}

	setActiveUI() {
		this.fish.disabled = true;
		this.fish.style.display = "none";

		this.catch.classList.remove("ready");
		this.catch.disabled = false;
		this.catch.style.display = "block";
	}

	now() {
		return performance.now() / 1000;
	}

	onFish() {
		if (this.active) return;

		this.active = true;
		this.inCatch = false;

		// Random 0–10 seconds, inclusive, integer seconds
		this.waitTime = Math.floor(Math.random() * 11);
		this.startTime = this.now();

		this.setActiveUI();
		this.update(0);
	}

	onCatch() {
		if (!this.active) return;

		const t = this.now();

		if (!this.inCatch) {
			events.emit("fishingResult", { ok: false, reason: "early" });
			this.setIdle();
			return;
		}

		const dt = t - this.catchStart;
		if (dt >= 0 && dt <= this.catchWindow) {
			events.emit("fishingResult", { ok: true });
			this.setIdle();
			return;
		}

		events.emit("fishingResult", { ok: false, reason: "late" });
		this.setIdle();
	}

	update() {
		if (!this.active) return;

		const t = this.now();
		const elapsed = t - this.startTime;
		const remain = Math.max(0, this.waitTime - elapsed);

		const denom = this.waitTime > 0 ? this.waitTime : 1;
		const ratio = this.waitTime > 0 ? clamp01(remain / denom) : 0;

		this.timer.textContent = `${remain.toFixed(1)}s`;
		this.timer.style.color = timerColor(ratio);

		if (!this.inCatch && remain <= 0) {
			this.inCatch = true;
			this.catchStart = t;
			this.catch.classList.add("ready");
			this.timer.textContent = `0.0s`;
			this.timer.style.color = lerpColor(ORANGE, RED, 1);
		}

		if (this.inCatch) {
			const cd = t - this.catchStart;
			if (cd >= this.catchWindow) {
				events.emit("fishingResult", { ok: false, reason: "late" });
				this.setIdle();
			}
		}
	}

	setVisible(visible) {
		this.wrap.style.display = visible ? "block" : "none";
	}
}
