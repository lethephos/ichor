import {people, stories} from "virtual:ichor-core";
import textsUrl from "virtual:ichor-texts-url";
import relations from "../data/relations.json";
import sources from "../data/sources.json";
import branches from "../data/branches.json";
import olympians from "../data/olympians.json";
import {tierLayout} from "./layout.js";

/* ---------- sources ---------- */
export const SRC = Object.fromEntries(sources.groups.map(s => [s.id, s.label]));
export const SRC_FULL = Object.fromEntries(sources.groups.map(s => [s.id, s.full]));
export const SRC_ALL_LABEL = sources.all.label;
const SRC_GROUP = Object.fromEntries(sources.groups.map(s => [s.id, s]));

/* The note under the sources speaks of the family shown. A family may carry its own written note for each source
   (`notes` in branches.json); otherwise the source’s written note stays wherever all the figures it names are in it;
   otherwise the note is drawn from the links themselves, so it says nothing the data does not: where a figure has rival
   fathers or mothers and this source names one of them, it says which; failing that, how many of the family’s links it tells. */
export function sourceNote(k){
  if (k === "all") return sources.all.note;
  const g = SRC_GROUP[k];
  if (FAMILY.notes?.[k]) return FAMILY.notes[k];
  if (g.note_figures.every(id => N[id])) return g.note;
  const deg = {};
  E.forEach(e => { deg[e.from] = (deg[e.from] || 0) + 1; deg[e.to] = (deg[e.to] || 0) + 1; });
  const facts = [];
  const byChild = {};
  E.filter(e => e.type === "parent").forEach(e => (byChild[e.to] ||= []).push(e));
  Object.entries(byChild).forEach(([c, es]) => {
    if (N[c].kind === "group") return;
    for (const sex of ["m", "f"]) {
      const rivals = es.filter(e => N[e.from].gender === sex && N[e.from].kind !== "group");
      if (new Set(rivals.map(e => e.from)).size < 2) continue;
      const told = rivals.filter(e => e.sources.includes(k));
      if (told.length === 1) facts.push({child: c, parent: told[0].from, sex, w: deg[c] + deg[told[0].from]});
    }
  });
  facts.sort((a, b) => b.w - a.w);
  const name = id => N[id].name.replace(/^The /, "the ");
  const poss = id => name(id) + (name(id).endsWith("s") ? "’" : "’s");
  const role = sex => sex === "m" ? "father" : "mother";
  const [a, b] = facts;
  if (!a) {
    const told = E.filter(e => e.sources.includes(k)).length;
    if (!told) return `${g.tells} none of the links in this family.`;
    return told === E.length ? `${g.tells} all ${told} links in this family.` : `${g.tells} ${told} of the ${E.length} links in this family; the rest fade.`;
  }
  let said;
  if (!b) said = `${name(a.parent)} is ${poss(a.child)} ${role(a.sex)}`;
  else if (a.parent === b.parent) said = `${name(a.parent)} is the ${role(a.sex)} of ${name(a.child)} and ${name(b.child)}`;
  else if (a.child === b.child) said = `${name(a.child)} is the ${N[a.child].gender === "f" ? "daughter" : "son"} of ${name(a.sex === "m" ? a.parent : b.parent)} and ${name(a.sex === "m" ? b.parent : a.parent)}`;
  else said = `${name(a.parent)} is ${poss(a.child)} ${role(a.sex)}, and ${name(b.parent)} is ${poss(b.child)} ${role(b.sex)}`;
  return `${g.in}, ${said}.`;
}

/* ---------- branch and family ---------- */
export const BRANCH = branches[0];
// A family is a view on the one tree: the figures it names and the links between them.
// It is chosen in the URL (?family=thebes), so every family has its own address.
export const FAMILIES = BRANCH.families || [{id: "all", label: "Whole tree", title: BRANCH.title}];
// The family is read from the URL (?family=thebes) and changed in place by setFamily.
export let FAMILY, ROWY, ROWB, W, H, GENS, P, N, E, FOCUS, DIVIDERS, HOUSES, STORIES;

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
  ROWY = layout.rowY; ROWB = layout.rowBottom;
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
    return {label: h.label, x: f.x, y: f.row > 0 ? ROWB[f.row-1] + 60 : f.y - 40};
  });

  /* ---------- stories (the curses among them) ---------- */
  // a family shows only the stories it holds every figure of
  STORIES = Object.fromEntries(stories.filter(c => c.pairs.flat().every(inFamily)).map(c => [c.id, {...c, nodes: new Set(c.pairs.flat())}]));
}

/* Every story, whichever family is shown, and the family it opens in when it is not in this one:
   the smallest family that holds all its figures (the whole tree if none does). */
export const ALL_STORIES = stories;
/* Every figure, whichever family is shown, and the family a figure opens in when it is not in this one:
   the family that holds most of its links (Medea opens with the Argonauts, not in the house of Minos), the smaller on a tie;
   the whole tree if no family holds it. */
export const ALL_PEOPLE = people;
export function figureHome(id) {
  const mine = relations.filter(r => r.from === id || r.to === id);
  const held = f => mine.filter(r => f.figures.includes(r.from) && f.figures.includes(r.to)).length;
  const fits = FAMILIES.filter(f => f.figures && f.figures.includes(id)).map(f => [f, held(f)]);
  return fits.sort(([a, x], [b, y]) => (y - x) || (a.figures.length - b.figures.length))[0]?.[0] || FAMILIES[0];
}
export function storyHome(c) {
  const fits = FAMILIES.filter(f => !f.figures || c.pairs.flat().every(id => f.figures.includes(id)));
  return fits.sort((a, b) => (a.figures ? a.figures.length : 1e9) - (b.figures ? b.figures.length : 1e9))[0] || FAMILIES[0];
}

setFamily(new URLSearchParams(location.search).get("family"));

/* ---------- the long texts ---------- */
/* The tree draws itself from names, rows and links; the texts a card shows (a figure’s story, tagline, versions,
   art, sky and members, and the text of each story step) come in a second file, asked for as soon as this one runs
   (vite.config.js splits them). Anything that shows those texts goes through `whenTexts`, so a tap that comes
   before they do opens its card the moment they arrive. A failed load is tried again at the next such tap. */
let textsIn = false, loading = null;
function loadTexts() {
  return loading ||= fetch(textsUrl).then(r => r.ok ? r.json() : Promise.reject()).then(t => {
    const fill = p => Object.assign(p, t.people[p.id]);
    people.forEach(fill); P.forEach(fill);
    stories.forEach(s => s.steps.forEach((step, i) => { step.text = t.stories[s.id][i]; }));
    textsIn = true;
  }, () => { loading = null; });
}
export function whenTexts(fn) { if (textsIn) fn(); else loadTexts().then(() => { if (textsIn) fn(); }); }
loadTexts();

/* ---------- the Twelve Olympians: a mark on the figure, not a row ---------- */
// "all": in every list we follow; "some": the twelfth seat, which changes between lists
export const OLY = Object.fromEntries([
  ...olympians.core.map(id => [id, {in: "all", text: olympians.core_text}]),
  ...olympians.twelfth.map(t => [t.id, {in: "some", text: t.text}])
]);
export const OLY_NOTE = olympians.note;
