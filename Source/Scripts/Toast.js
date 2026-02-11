// fish/Source/Scripts/Toast.js
export class Toast {
	constructor(root) {
		this.root = root;
	}

	show({ text, icon = null }) {
		const el = document.createElement("div");
		el.className = "toastItem";

		if (icon) {
			const img = document.createElement("img");
			img.src = icon;
			img.alt = "";
			el.appendChild(img);
		}

		const span = document.createElement("div");
		span.className = "text";
		span.textContent = text;
		el.appendChild(span);

		this.root.appendChild(el);

		const lifeMs = 2000;
		const fadeMs = 280;

		window.setTimeout(() => {
			el.classList.add("fade");
		}, Math.max(0, lifeMs - fadeMs));

		window.setTimeout(() => {
			el.remove();
		}, lifeMs + 40);
	}
}
