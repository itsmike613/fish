// fish/Source/Scripts/State.js
import { events } from './Events.js';

const s = {
	invOpen: false,
	pointerLocked: false,
	slot: 0,
	catches: Object.create(null),
};

export function get(key) {
	return s[key];
}

export function set(key, val) {
	if (s[key] === val) return;
	s[key] = val;
	events.emit('state', { key, val });
	events.emit(`state:${key}`, val);
}

export function toggleInv() {
	set('invOpen', !s.invOpen);
}

export function setSlot(i) {
	const n = Math.max(0, Math.min(8, i | 0));
	set('slot', n);
}

export function getCatch(id) {
	return s.catches[id] || 0;
}

export function incCatch(id) {
	s.catches[id] = (s.catches[id] || 0) + 1;
	events.emit('catches', { id, n: s.catches[id] });
}
