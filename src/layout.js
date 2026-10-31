/* Automatic tier layout.
   Each figure sits on the row of its generation; only x is computed. Every figure is pulled
   towards the figures it is linked to (parents and children most, rivals least), then each
   row is sorted by where its figures want to be and pushed apart just enough that labels
   don’t collide. Repeated until it settles. Figures start in the order of people.json,
   which also breaks ties, so the result is stable. */

export const TOP = 90;          // y of the first row
export const ROW_GAP = 155;     // vertical distance between rows
export const LEFT = 160;        // x of the leftmost figure; generation labels sit at x = 0
export const RIGHT_PAD = 140;   // space after the rightmost figure
export const BOTTOM_PAD = 85;   // space after the last row

const PULL = {parent:1, marriage:1, affair:0.3, feud:0.2, curse:0.2, transform:0.1};
const INERTIA = 0.5;            // how strongly a figure holds its previous place
const MIN_GAP = 120;            // minimum distance between neighbours on a row
const LABEL_PAD = 34;           // extra room between two labels
const FAMILY_GAP = 160;         // extra room between two unrelated families on a row
const CHAR_W = 8.6;             // rough width of one character of a label
const ROUNDS = 120;

const labelWidth = name => name.length * CHAR_W;

/* Least-squares placement of an ordered row: as close as possible to `want`,
   keeping at least gaps[i] between figure i and i+1 (pool adjacent violators). */
function place(want, gaps){
  const off = [0];
  for (let i = 1; i < want.length; i++) off[i] = off[i-1] + gaps[i-1];
  const blocks = [];
  want.forEach((w, i) => {
    blocks.push({sum: w - off[i], n: 1});
    while (blocks.length > 1) {
      const b = blocks[blocks.length-1], a = blocks[blocks.length-2];
      if (a.sum/a.n <= b.sum/b.n) break;
      a.sum += b.sum; a.n += b.n; blocks.pop();
    }
  });
  const out = [];
  blocks.forEach(b => { for (let k = 0; k < b.n; k++) out.push(b.sum/b.n); });
  return out.map((v, i) => v + off[i]);
}

/* Families: figures joined by blood or marriage. Two families of two or more figures
   that meet on a row get extra room, so houses read as separate groups. */
function families(people, relations){
  const root = Object.fromEntries(people.map(p => [p.id, p.id]));
  const find = id => root[id]===id ? id : (root[id] = find(root[id]));
  relations.forEach(r => { if (r.type==="parent" || r.type==="marriage") root[find(r.from)] = find(r.to); });
  const size = {};
  people.forEach(p => { const f = find(p.id); size[f] = (size[f]||0) + 1; });
  return Object.fromEntries(people.map(p => [p.id, size[find(p.id)] > 1 ? find(p.id) : null]));
}

export function tierLayout(people, relations){
  const name = Object.fromEntries(people.map(p => [p.id, p.name]));
  const fam = families(people, relations);
  const rows = [];
  people.forEach(p => (rows[p.generation] ||= []).push(p.id));
  for (let i = 0; i < rows.length; i++) rows[i] ||= [];

  const links = Object.fromEntries(people.map(p => [p.id, []]));
  relations.forEach(r => {
    const w = PULL[r.type] || 0;
    links[r.from].push([r.to, w]); links[r.to].push([r.from, w]);
  });
  const gap = (a, b) => Math.max(MIN_GAP, (labelWidth(name[a]) + labelWidth(name[b]))/2 + LABEL_PAD)
    + (fam[a] && fam[b] && fam[a]!==fam[b] ? FAMILY_GAP : 0);
  const gapsOf = row => row.slice(1).map((id, i) => gap(row[i], id));

  // start: each row in data order, centred on 0
  const x = {};
  rows.forEach(row => {
    const pos = place(row.map(() => 0), gapsOf(row));
    const mid = (pos[0] + pos[pos.length-1]) / 2;
    row.forEach((id, i) => x[id] = pos[i] - mid);
  });
  const order = Object.fromEntries(people.map((p, i) => [p.id, i]));

  for (let round = 0; round < ROUNDS; round++) {
    const want = {};
    people.forEach(({id}) => {
      let s = INERTIA * x[id], w = INERTIA;
      links[id].forEach(([j, wj]) => { s += wj * x[j]; w += wj; });
      want[id] = s / w;
    });
    rows.forEach(row => {
      row.sort((a, b) => (want[a] - want[b]) || (order[a] - order[b]));
      const pos = place(row.map(id => want[id]), gapsOf(row));
      row.forEach((id, i) => x[id] = pos[i]);
    });
  }

  const minX = Math.min(...people.map(p => x[p.id]));
  const rowY = rows.map((_, i) => TOP + i * ROW_GAP);
  const pos = Object.fromEntries(people.map(p => [p.id, {x: Math.round(x[p.id] - minX + LEFT), y: rowY[p.generation]}]));
  const width = Math.max(...Object.values(pos).map(p => p.x)) + RIGHT_PAD;
  const height = rowY[rowY.length-1] + BOTTOM_PAD;
  return {pos, rowY, width, height};
}
