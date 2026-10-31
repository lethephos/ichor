import people from "../data/people.json";
import relations from "../data/relations.json";
import stories from "../data/stories.json";
import sources from "../data/sources.json";
import branches from "../data/branches.json";
import olympians from "../data/olympians.json";
import {tierLayout} from "./layout.js";

/* ---------- sources ---------- */
export const SRC = Object.fromEntries(sources.groups.map(s => [s.id, s.label]));
export const SRC_FULL = Object.fromEntries(sources.groups.map(s => [s.id, s.full]));
export const SRC_NOTE = {all: sources.all.note, ...Object.fromEntries(sources.groups.map(s => [s.id, s.note]))};
export const SRC_ALL_LABEL = sources.all.label;

/* ---------- branch ---------- */
export const BRANCH = branches[0];

/* ---------- figures, relations and their layout ---------- */
const layout = tierLayout(people, relations);
export const ROWY = layout.rowY;
export const W = layout.width, H = layout.height;
// row names come from the branch; rows it does not name are simply numbered
export const GENS = ROWY.map((_, i) => (BRANCH.tiers || [])[i] || `Row ${i + 1}`);
export const P = people.map(p => ({...p, ...layout.pos[p.id]}));
export const N = Object.fromEntries(P.map(p => [p.id, p]));
export const E = relations.map((r, i) => ({...r, i, note: r.note || ""}));

/* House names sit between the founder’s row and the row above, over the founder. */
export const HOUSES = BRANCH.houses.map(h => {
  const f = N[h.founder];
  return {label: h.label, x: f.x, y: f.generation > 0 ? ROWY[f.generation-1] + 60 : f.y - 40};
});

/* ---------- stories (the curses among them) ---------- */
export const STORIES = Object.fromEntries(stories.map(c => [c.id, {...c, nodes: new Set(c.pairs.flat())}]));

/* ---------- the Twelve Olympians: a mark on the figure, not a row ---------- */
// "all": in every list we follow; "some": the twelfth seat, which changes between lists
export const OLY = Object.fromEntries([
  ...olympians.core.map(id => [id, {in: "all", text: olympians.core_text}]),
  ...olympians.twelfth.map(t => [t.id, {in: "some", text: t.text}])
]);
export const OLY_NOTE = olympians.note;
