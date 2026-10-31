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

/* ---------- branch and family ---------- */
export const BRANCH = branches[0];
// A family is a view on the one tree: the figures it names and the links between them.
// It is chosen in the URL (?family=thebes), so every family has its own address.
export const FAMILIES = BRANCH.families || [{id: "all", label: "Whole tree", title: BRANCH.title}];
// The family is read from the URL (?family=thebes) and changed in place by setFamily.
export let FAMILY, ROWY, W, H, GENS, P, N, E, FOCUS, DIVIDERS, HOUSES, STORIES;

export function familyOf(id) { return FAMILIES.find(f => f.id === id) || FAMILIES[0]; }

export function setFamily(id) {
  FAMILY = familyOf(id);
  const keep = FAMILY.figures ? new Set(FAMILY.figures) : null;
  const inFamily = id => !keep || keep.has(id);
  const people_ = people.filter(p => inFamily(p.id));
  const relations_ = relations.filter(r => inFamily(r.from) && inFamily(r.to));

  /* ---------- figures, relations and their layout ---------- */
  // rows come from `generation`; a row nobody in the family sits on is left out
  const gens = [...new Set(people_.map(p => p.generation))].sort((a, b) => a - b);
  const rowOf = Object.fromEntries(gens.map((g, i) => [g, i]));
  const layout = tierLayout(people_.map(p => ({...p, generation: rowOf[p.generation]})), relations_);
  ROWY = layout.rowY;
  W = layout.width; H = layout.height;
  // row names come from the branch; rows it does not name are simply numbered
  GENS = gens.map(g => (BRANCH.tiers || [])[g] || `Row ${g + 1}`);
  P = people_.map(p => ({...p, row: rowOf[p.generation], ...layout.pos[p.id]}));
  N = Object.fromEntries(P.map(p => [p.id, p]));
  E = relations_.map((r, i) => ({...r, i, note: r.note || ""}));
  FOCUS = N[FAMILY.focus] ? FAMILY.focus : N[BRANCH.focus] ? BRANCH.focus : P[0].id;

  /* A divider sits above the first row at or below its generation, if rows lie on both sides. */
  DIVIDERS = (BRANCH.dividers || [])
    .map(d => ({label: d.label, before: gens.findIndex(g => g >= d.before)}))
    .filter(d => d.before > 0);

  /* House names sit between the founder’s row and the row above, over the founder. */
  // a family may name the houses it labels; otherwise every house whose founder it holds
  HOUSES = BRANCH.houses.filter(h => N[h.founder] && (!FAMILY.houses || FAMILY.houses.includes(h.label))).map(h => {
    const f = N[h.founder];
    return {label: h.label, x: f.x, y: f.row > 0 ? ROWY[f.row-1] + 60 : f.y - 40};
  });

  /* ---------- stories (the curses among them) ---------- */
  // a family shows only the stories it holds every figure of
  STORIES = Object.fromEntries(stories.filter(c => c.pairs.flat().every(inFamily)).map(c => [c.id, {...c, nodes: new Set(c.pairs.flat())}]));
}

setFamily(new URLSearchParams(location.search).get("family"));

/* ---------- the Twelve Olympians: a mark on the figure, not a row ---------- */
// "all": in every list we follow; "some": the twelfth seat, which changes between lists
export const OLY = Object.fromEntries([
  ...olympians.core.map(id => [id, {in: "all", text: olympians.core_text}]),
  ...olympians.twelfth.map(t => [t.id, {in: "some", text: t.text}])
]);
export const OLY_NOTE = olympians.note;
