// fish/Source/Scripts/State.js
export const state = {
  uiMode: "fishing", // "fishing" | "inventory"
  inventory: Array.from({ length: 36 }, () => null),
  hotbar: Array.from({ length: 9 }, () => null),
  cursor: null, // {id, qty} | null
  catchCounts: {}, // { [id]: number }
};
