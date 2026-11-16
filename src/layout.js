/* Automatic tier layout.
   Each figure sits on the row of its generation; only x is computed. Every figure is pulled
   towards the figures it is linked to (parents and children most, rivals least), then each
   row is sorted by where its figures want to be and pushed apart just enough that labels
   don’t collide. Repeated until it settles. Figures start in the order of people.json,
   which also breaks ties, so the result is stable.

   Once found, the order of each row is kept in data/order.json (`npm run order` writes it) and the layout only
   spreads the rows out again: a figure added later takes its place among the others without moving them about.

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
   keeping at least gaps[i] between figure i and i+1 (pool adjacent violators).
   With `weight`, a figure with more or stronger links counts for more: then no round shifts the tree as a whole,
   and repeated rounds come to rest. */
function place(want, gaps, weight){
  const off = [0];
  for (let i = 1; i < want.length; i++) off[i] = off[i-1] + gaps[i-1];
  const blocks = [];
  want.forEach((w, i) => {
    const k = weight ? weight[i] : 1;
    blocks.push({sum: (w - off[i]) * k, n: k, count: 1});
    while (blocks.length > 1) {
      const b = blocks[blocks.length-1], a = blocks[blocks.length-2];
      if (a.sum/a.n <= b.sum/b.n) break;
      a.sum += b.sum; a.n += b.n; a.count += b.count; blocks.pop();
    }
  });
  const out = [];
  blocks.forEach(b => { for (let k = 0; k < b.count; k++) out.push(b.sum/b.n); });
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

export function tierLayout(people, relations, kept){
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

  const order = Object.fromEntries(people.map((p, i) => [p.id, i]));
  const x = {};
  /* One round after another, every figure moves towards the figures it is linked to, and each row is spread out again.
     With `free`, a row is also re-sorted by where its figures want to be: that is how an order is found in the first place. */
  const settle = (rows, free) => {
    rows.forEach(row => {
      const pos = place(row.map(() => 0), gapsOf(row));
      const mid = (pos[0] + pos[pos.length-1]) / 2;
      row.forEach((id, i) => x[id] = pos[i] - mid);
    });
    // a free search runs a set number of rounds; a kept order is spread until nothing moves any more
    for (let round = 0, moved = 1; free ? round < ROUNDS : moved > 0.01 && round < 4000; round++) {
      const was = {...x};
      const want = {}, heft = {};
      rows.flat().forEach(id => {
        let s = INERTIA * x[id], w = INERTIA;
        links[id].forEach(([j, wj]) => { if (x[j] !== undefined) { s += wj * x[j]; w += wj; } });
        want[id] = s / w; heft[id] = w;
      });
      rows.forEach(row => {
        if (free) row.sort((a, b) => (want[a] - want[b]) || (order[a] - order[b]));
        const pos = place(row.map(id => want[id]), gapsOf(row), free ? null : row.map(id => heft[id]));
        row.forEach((id, i) => x[id] = pos[i]);
      });
      // the tree as a whole may still slide sideways, which does not matter: only its shape has to stop changing
      const d = Object.keys(x).map(id => x[id] - was[id]), slide = d.reduce((s, v) => s + v, 0) / d.length;
      moved = Math.max(...d.map(v => Math.abs(v - slide)));
      if (!free && typeof process !== "undefined" && process.env.ROUNDS_LOG && (moved <= 0.01 || round === 3999)) console.log("rounds", round + 1, "last move", moved.toFixed(3));
    }
  };
  if (!kept) settle(rows, true);
  else {
    /* A kept order (data/order.json): the figures it names stay in that order on their rows, so the tree does not
       reshuffle when the data grows. A newcomer goes where its links pull it, between the figures already there. */
    const rank = Object.fromEntries(kept.map((id, i) => [id, i]));
    const old = rows.map(row => row.filter(id => rank[id] !== undefined).sort((a, b) => rank[a] - rank[b]));
    settle(old.filter(row => row.length), false);
    const fresh = people.map(p => p.id).filter(id => rank[id] === undefined);
    for (let pass = 0; pass < 3; pass++) fresh.forEach(id => {     // three passes: a newcomer may hang on another newcomer
      let s = 0, w = 0;
      links[id].forEach(([j, wj]) => { if (x[j] !== undefined) { s += wj * x[j]; w += wj; } });
      if (w) x[id] = s / w;
    });
    rows.forEach((row, r) => {
      const all = [...old[r]];
      row.filter(id => rank[id] === undefined).forEach(id => {
        // with no link to place it by, a newcomer goes to the end of its row
        const at = x[id] === undefined ? all.length : all.findIndex(o => x[o] > x[id]);
        all.splice(at < 0 ? all.length : at, 0, id);
      });
      row.splice(0, row.length, ...all);
    });
    Object.keys(x).forEach(id => delete x[id]);
    settle(rows, false);
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
