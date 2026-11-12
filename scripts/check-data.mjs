/* Checks the data before every build, so a slip in the JSON stops the deploy instead of reaching the site.
   Run with `npm run check`. It reads only /data; nothing here knows about the page. */
import { readFileSync } from "node:fs";

const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"));
const people = read("people"), relations = read("relations"), stories = read("stories");
const sources = read("sources"), branches = read("branches"), olympians = read("olympians");

const errors = [];
const fail = (where, what) => errors.push(`${where}: ${what}`);

const GROUPS = new Set(sources.groups.map(g => g.id));
const TYPES = new Set(["parent", "marriage", "affair", "feud", "transform", "curse"]);
const KINDS = new Set(["god", "nymph", "mortal", "other-cycle", "group"]);
const ids = new Set();
const known = id => ids.has(id);

/* a list of source groups: never empty, only known groups, none twice */
function checkSources(where, list){
  if (!Array.isArray(list) || !list.length) return fail(where, "no sources");
  list.forEach(s => { if (!GROUPS.has(s)) fail(where, `unknown source “${s}”`); });
  if (new Set(list).size !== list.length) fail(where, "a source is listed twice");
}

const nRows = Math.max(...branches.map(b => b.tiers.length));
people.forEach(p => {
  const at = `people ${p.id}`;
  if (ids.has(p.id)) fail(at, "id used twice");
  ids.add(p.id);
  ["name", "greek", "role", "tagline", "story"].forEach(k => { if (!p[k]) fail(at, `no ${k}`); });
  if (!KINDS.has(p.kind)) fail(at, `unknown kind “${p.kind}”`);
  if (!Number.isInteger(p.generation) || p.generation < 0 || p.generation >= nRows) fail(at, `generation ${p.generation} is not a row`);
  ["transformation", "immortal"].forEach(k => { if (p[k]) { if (!p[k].text) fail(at, `${k} has no text`); checkSources(`${at} ${k}`, p[k].sources); } });
  if (p.sky) { ["constellation", "text", "cite"].forEach(k => { if (!p.sky[k]) fail(at, `sky has no ${k}`); }); checkSources(`${at} sky`, p.sky.sources); }
  (p.art || []).forEach(a => {
    if (!a.title || !a.url) fail(at, "an artwork has no title or link");
    if (a.image) ["file", "thumb", "credit", "licence"].forEach(k => { if (!a.image[k]) fail(at, `the picture of “${a.title}” has no ${k}`); });
  });
});
people.forEach(p => (p.members || []).forEach(m => { if (m.id && !known(m.id)) fail(`people ${p.id}`, `member “${m.id}” is not a figure`); }));

const seen = new Map();
relations.forEach((r, i) => {
  const at = `relations #${i} (${r.type} ${r.from} → ${r.to})`;
  if (!TYPES.has(r.type)) fail(at, "unknown type");
  [r.from, r.to].forEach(id => { if (!known(id)) fail(at, `“${id}” is not a figure`); });
  if (r.from === r.to) fail(at, "links a figure to itself");
  checkSources(at, r.sources);
  // a passage is given per source group, and only for a group the link lists
  Object.entries(r.cite || {}).forEach(([k, v]) => { if (!r.sources.includes(k)) fail(at, `a passage for “${k}”, which is not among its sources`); if (!v || typeof v !== "string") fail(at, `an empty passage for “${k}”`); });
  // a marriage or an affair has no direction; the rest run from one figure to the other
  const pair = r.type === "marriage" || r.type === "affair" ? [r.from, r.to].sort() : [r.from, r.to];
  const key = [r.type, ...pair].join("|");
  if (seen.has(key)) fail(at, `the same link as #${seen.get(key)}`);
  seen.set(key, i);
});

const linked = new Set(relations.flatMap(r => [r.from + "|" + r.to, r.to + "|" + r.from]));
const checkPairs = (at, pairs) => (pairs || []).forEach(([a, b]) => { if (!linked.has(a + "|" + b)) fail(at, `no relation between ${a} and ${b}`); });
const storyIds = new Set();
stories.forEach(s => {
  const at = `stories ${s.id}`;
  if (storyIds.has(s.id)) fail(at, "id used twice");
  storyIds.add(s.id);
  if (!["curse", "story"].includes(s.kind)) fail(at, `unknown kind “${s.kind}”`);
  ["title", "lead"].forEach(k => { if (!s[k]) fail(at, `no ${k}`); });
  checkPairs(at, s.pairs);
  s.steps.forEach((st, i) => {
    const step = `${at}, step ${i + 1}`;
    if (!st.label || !st.text) fail(step, "no label or text");
    if (!st.figures?.length) fail(step, "no figures");
    (st.figures || []).forEach(id => { if (!known(id)) fail(step, `“${id}” is not a figure`); });
    checkPairs(step, st.pairs);
  });
});

branches.forEach(b => {
  const at = `branches ${b.id}`;
  if (!known(b.focus)) fail(at, `focus “${b.focus}” is not a figure`);
  (b.houses || []).forEach(h => { if (!known(h.founder)) fail(at, `founder “${h.founder}” is not a figure`); });
  const famIds = new Set();
  b.families.forEach(f => {
    const fam = `${at}, family ${f.id}`;
    if (famIds.has(f.id)) fail(fam, "id used twice");
    famIds.add(f.id);
    (f.figures || []).forEach(id => { if (!known(id)) fail(fam, `“${id}” is not a figure`); });
    if (f.figures && new Set(f.figures).size !== f.figures.length) fail(fam, "a figure is listed twice");
    if (!known(f.focus)) fail(fam, `focus “${f.focus}” is not a figure`);
    else if (f.figures && !f.figures.includes(f.focus)) fail(fam, `focus ${f.focus} is not in the family`);
    Object.keys(f.notes || {}).forEach(k => { if (!GROUPS.has(k)) fail(fam, `a note for unknown source “${k}”`); });
  });
});

sources.groups.forEach(g => (g.note_figures || []).forEach(id => { if (!known(id)) fail(`sources ${g.id}`, `“${id}” is not a figure`); }));
[...olympians.core, ...olympians.twelfth.map(t => t.id)].forEach(id => { if (!known(id)) fail("olympians", `“${id}” is not a figure`); });

if (errors.length) {
  console.error(`The data has ${errors.length} ${errors.length === 1 ? "problem" : "problems"}:\n` + errors.map(e => "  " + e).join("\n"));
  process.exit(1);
}
console.log(`Data checked: ${people.length} figures, ${relations.length} relations, ${stories.length} stories.`);
