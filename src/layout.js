/* Automatic tier layout.
   Each figure sits on the row of its generation; only x is computed. Every figure is pulled
   towards the figures it is linked to (parents and children most, rivals least), then each
   row is sorted by where its figures want to be and pushed apart just enough that labels
   don’t collide. Repeated until it settles. Figures start in the order of people.json,
   which also breaks ties, so the result is stable.

   A row can grow downwards. A child whose parent sits on the same row (Atlas and his
   daughters the Pleiades) goes on a line below the parent, inside the row, with its
   spouse. So lower on a row always means descended. */

export const TOP = 90;          // y of the first row
export const ROW_GAP = 155;     // vertical distance between rows
export const LEFT = 60;         // x of the leftmost figure; rules start at x = 0
export const RIGHT_PAD = 140;   // space after the rightmost figure
export const BOTTOM_PAD = 85;   // space after the last row

const PULL = {parent:1, marriage:1, affair:0.3, feud:0.2, curse:0.2, transform:0.1};
const INERTIA = 0.5;            // how strongly a figure holds its previous place
const MIN_GAP = 92;             // minimum distance between neighbours on a row
const LABEL_PAD = 24;           // extra room between two labels
const FAMILY_GAP = 160;         // extra room between two unrelated families on a row
const CHAR_W = 8.6;             // rough width of one character of a label
const ROUNDS = 120;
const SUB_GAP = 78;             // vertical distance between two lines of one row

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
  const gen = Object.fromEntries(people.map(p => [p.id, p.generation]));
  const nRows = Math.max(...people.map(p => p.generation)) + 1;

  // the line of a figure inside its row: one below its lowest parent on the same row;
  // a married pair stays on one line (so Gaia and Uranus stay side by side, and
  // Clytemnestra drops with Agamemnon)
  const married = new Set(relations.filter(r => r.type==="marriage").flatMap(r => [r.from+"|"+r.to, r.to+"|"+r.from]));
  const sameRow = r => gen[r.from]===gen[r.to];
  const down = relations.filter(r => r.type==="parent" && sameRow(r) && !married.has(r.from+"|"+r.to));
  const pairs = relations.filter(r => r.type==="marriage" && sameRow(r));
  const level = Object.fromEntries(people.map(p => [p.id, 0]));
  for (let changed = true, n = 0; changed && n < 20; n++) {
    changed = false;
    const raise = (id, v) => { if (v > level[id]) { level[id] = v; changed = true; } };
    down.forEach(r => raise(r.to, level[r.from] + 1));
    pairs.forEach(r => { const v = Math.max(level[r.from], level[r.to]); raise(r.from, v); raise(r.to, v); });
  }

  // lines: [row][level] → figures
  const lines = Array.from({length: nRows}, () => []);
  people.forEach(p => ((lines[p.generation][level[p.id]] ||= [])).push(p.id));
  lines.forEach(ls => { for (let i = 0; i < ls.length; i++) ls[i] ||= []; if (!ls.length) ls.push([]); });
  const rows = lines.flat();

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

  // heights: each line of a row below the one before
  const minX = Math.min(...people.map(p => x[p.id]));
  const rowY = [], rowBottom = [], y = {};
  let top = TOP;
  lines.forEach((ls, r) => {
    rowY[r] = top;
    let lineY = top;
    ls.forEach((line, l) => {
      if (l > 0) lineY += SUB_GAP;
      line.forEach(id => y[id] = lineY);
    });
    rowBottom[r] = lineY;
    top = rowBottom[r] + ROW_GAP;
  });
  const pos = Object.fromEntries(people.map(p => [p.id, {x: Math.round(x[p.id] - minX + LEFT), y: y[p.id]}]));
  const width = Math.max(...Object.values(pos).map(p => p.x)) + RIGHT_PAD;
  const height = rowBottom[rowBottom.length-1] + BOTTOM_PAD;
  return {pos, rowY, rowBottom, width, height};
}
