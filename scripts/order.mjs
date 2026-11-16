/* Writes data/order.json: for every family, its figures from left to right, row by row, as the layout places them.
   The page reads that order and keeps to it, so adding a figure or a link does not reshuffle the tree.
   Run `npm run order` after adding figures (the data check asks for it). `npm run order -- --afresh` forgets the
   kept order and lets every family find a new one. */
import { readFileSync, writeFileSync } from "node:fs";
import { tierLayout } from "../src/layout.js";

const at = name => new URL(`../data/${name}.json`, import.meta.url);
const read = name => JSON.parse(readFileSync(at(name), "utf8"));
const people = read("people"), relations = read("relations"), branch = read("branches")[0];
let kept = {};
if (!process.argv.includes("--afresh")) try { kept = read("order"); } catch (e) {}

const out = {};
for (const f of branch.families) {
  // the same figures, links and rows as setFamily in src/data.js
  const keep = f.figures ? new Set(f.figures) : null, inFamily = id => !keep || keep.has(id);
  const mine = people.filter(p => inFamily(p.id)), links = relations.filter(r => inFamily(r.from) && inFamily(r.to));
  const gens = [...new Set(mine.map(p => p.generation))].sort((a, b) => a - b);
  const rowOf = Object.fromEntries(gens.map((g, i) => [g, i]));
  const {pos} = tierLayout(mine.map(p => ({...p, generation: rowOf[p.generation]})), links, kept[f.id]);
  out[f.id] = mine.map(p => p.id).sort((a, b) => (pos[a].y - pos[b].y) || (pos[a].x - pos[b].x));
}
writeFileSync(at("order"), "{\n" + Object.entries(out).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n") + "\n}\n");
console.log(`Order kept for ${Object.keys(out).length} families.`);
