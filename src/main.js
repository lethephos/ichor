import * as d3 from "d3";
import {SRC, SRC_FULL, SRC_NOTE, SRC_ALL_LABEL, ROWY, GENS, W, H, P, N, E, CURSES, BRANCH, HOUSES} from "./data.js";

const LAYERS = [
  {k:"parent", label:"Bloodlines"},
  {k:"marriage", label:"Marriages"},
  {k:"affair", label:"Affairs"},
  {k:"feud", label:"Feuds & killings"},
  {k:"transform", label:"Transformations"},
  {k:"curse", label:"Curses"}
];
const SAMPLE = {
  parent:`<line x1="0" y1="5" x2="26" y2="5" stroke="var(--line)" stroke-width="1.4"/>`,
  marriage:`<line x1="0" y1="5" x2="26" y2="5" stroke="var(--line)" stroke-width="4"/><line x1="0" y1="5" x2="26" y2="5" stroke="var(--bg)" stroke-width="1.3"/>`,
  affair:`<line x1="0" y1="5" x2="26" y2="5" stroke="var(--line)" stroke-width="1.4" stroke-dasharray="5 4"/>`,
  feud:`<path d="M0,5 L4,1 L8,9 L12,1 L16,9 L20,1 L24,9 L26,5" fill="none" stroke="var(--line)" stroke-width="1.2"/>`,
  transform:`<line x1="0" y1="5" x2="26" y2="5" stroke="var(--transform)" stroke-width="2" stroke-dasharray="1 4" stroke-linecap="round"/>`,
  curse:`<line x1="0" y1="5" x2="22" y2="5" stroke="var(--curse)" stroke-width="1.8"/><path d="M20,1 L26,5 L20,9 z" fill="var(--curse)"/>`
};

const state = {src:"all", layers:{parent:true, marriage:true, affair:true, feud:true, transform:true, curse:true}, sel:null, mode:null, curseKey:null, path:null};

/* ---------- header ---------- */
document.getElementById("branchTitle").textContent = BRANCH.title;
document.getElementById("branchSub").textContent = BRANCH.subtitle;

/* ---------- controls ---------- */
const srcRow = document.getElementById("srcRow");
const srcNote = document.getElementById("srcNote");
[["all",SRC_ALL_LABEL], ...Object.entries(SRC)].forEach(([k,label]) => {
  const b = document.createElement("button");
  b.className = "tab"; b.textContent = label; b.dataset.src = k;
  b.setAttribute("aria-pressed", k===state.src);
  if (k!=="all") b.title = SRC_FULL[k];
  b.onclick = () => setSource(k);
  srcRow.appendChild(b);
});
function setSource(k){
  state.src = k;
  srcRow.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", x.dataset.src===k));
  srcNote.textContent = SRC_NOTE[k];
  if (state.mode==="thread" && state.threadEnds) runThread(...state.threadEnds, true);
  apply(true);
  if (state.mode==="node" && state.sel) renderNode(state.sel);
  nodeSel.filter(d => d.versions).classed("pulse", false);
  requestAnimationFrame(() => nodeSel.filter(d => d.versions).classed("pulse", true));
}
srcNote.textContent = SRC_NOTE.all;

const layerRow = document.getElementById("layerRow");
function toggleLayer(k){
  state.layers[k] = !state.layers[k];
  document.querySelectorAll(`[data-layer="${k}"]`).forEach(b => b.setAttribute("aria-pressed", state.layers[k]));
  apply(true);
}
LAYERS.forEach(L => {
  const b = document.createElement("button");
  b.className = "toggle"; b.dataset.layer = L.k; b.setAttribute("aria-pressed","true");
  b.innerHTML = `<svg viewBox="0 0 26 10" aria-hidden="true">${SAMPLE[L.k]}</svg>${L.label}`;
  b.onclick = () => toggleLayer(L.k);
  layerRow.appendChild(b);
});
const curseSel = document.getElementById("curseSel");
Object.values(CURSES).forEach(c => {
  const o = document.createElement("option"); o.value = c.id; o.textContent = c.title; curseSel.appendChild(o);
});
curseSel.onchange = () => { if (curseSel.value) openCurse(curseSel.value); else resetMode(); };
const threadBtn = document.getElementById("threadBtn");
threadBtn.onclick = () => state.mode==="thread" ? resetMode() : openThread();
/* Find a figure: names (English or Greek, accents ignored) narrow down as you type;
   names that start with what was typed come first. */
const PEOPLE = [...P].sort((a,b) => a.name.localeCompare(b.name));
const fold = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const KEY = Object.fromEntries(P.map(p => [p.id, fold(p.name + " " + p.greek)]));
function findFigures(query){
  const q = fold(query.trim());
  if (!q) return PEOPLE;
  const starts = p => KEY[p.id].split(" ").some(w => w.startsWith(q));
  return PEOPLE.filter(p => KEY[p.id].includes(q)).sort((a,b) => starts(b) - starts(a));
}
const NONE = `<li class="none">No figure by that name.</li>`;

/* desktop: a search box with suggestions */
const finder = document.getElementById("finder"), finderList = document.getElementById("finderList");
let found = [], active = -1;
function showFinder(){
  found = findFigures(finder.value); active = found.length && finder.value.trim() ? 0 : -1;
  finderList.innerHTML = found.length ? found.map((p, i) =>
    `<li role="option" id="fig-${p.id}" data-id="${p.id}" aria-selected="${i===active}"><span class="n">${p.name}</span><span class="r">${p.role}</span></li>`).join("") : NONE;
  finderList.hidden = false; finder.setAttribute("aria-expanded", "true"); markActive();
}
function markActive(){
  finderList.querySelectorAll("[role=option]").forEach((li, i) => li.setAttribute("aria-selected", i===active));
  const li = found[active] && document.getElementById("fig-" + found[active].id);
  if (li) { li.scrollIntoView({block:"nearest"}); finder.setAttribute("aria-activedescendant", li.id); }
  else finder.removeAttribute("aria-activedescendant");
}
function hideFinder(){ finderList.hidden = true; finder.setAttribute("aria-expanded", "false"); finder.removeAttribute("aria-activedescendant"); }
function pickFinder(id){ hideFinder(); finder.value = ""; finder.blur(); select(id, true); }
finder.addEventListener("focus", showFinder);
finder.addEventListener("input", showFinder);
finder.addEventListener("blur", hideFinder);
finder.addEventListener("keydown", ev => {
  if (ev.key==="ArrowDown" || ev.key==="ArrowUp") {
    ev.preventDefault();
    if (finderList.hidden) showFinder();
    if (found.length) { active = (active + (ev.key==="ArrowDown" ? 1 : -1) + found.length) % found.length; markActive(); }
  } else if (ev.key==="Enter") {
    const p = found[active] || found[0];
    if (p && !finderList.hidden) { ev.preventDefault(); pickFinder(p.id); }
  } else if (ev.key==="Escape") { hideFinder(); finder.blur(); }
});
finderList.addEventListener("mousedown", ev => ev.preventDefault());   // keep focus in the box until the click lands
finderList.addEventListener("click", ev => { const li = ev.target.closest("[data-id]"); if (li) pickFinder(li.dataset.id); });
srcRow.addEventListener("scroll", () => srcRow.classList.toggle("at-end", srcRow.scrollLeft + srcRow.clientWidth >= srcRow.scrollWidth - 4));

/* phone toolbar: each button opens its panel, or closes it if already open */
const TOOL_OF = {layers:"layers", curses:"curses", curse:"curses", thread:"thread", find:"find"};
const OPEN = {layers:() => openLayers(), curses:() => openCurses(), thread:() => openThread(), find:() => openFind()};
const toolBtns = document.querySelectorAll("[data-tool]");
toolBtns.forEach(b => b.onclick = () => TOOL_OF[state.mode]===b.dataset.tool ? resetMode() : OPEN[b.dataset.tool]());
function syncTools(){
  toolBtns.forEach(b => b.setAttribute("aria-pressed", TOOL_OF[state.mode]===b.dataset.tool));
  threadBtn.setAttribute("aria-pressed", state.mode==="thread");
}
const hint = document.getElementById("hint");
const hideHint = () => hint.classList.add("gone");

/* ---------- graph ---------- */
const svg = d3.select("#graph");
const defs = svg.append("defs");
["curse","transform"].forEach(id => {
  defs.append("marker").attr("id","arr-"+id).attr("viewBox","0 0 10 10").attr("refX",8).attr("refY",5)
    .attr("markerWidth",6).attr("markerHeight",6).attr("orient","auto-start-reverse")
    .append("path").attr("class","arrow-"+id).attr("d","M0,0 L10,5 L0,10 z");
});
const root = svg.append("g");
const gGrid = root.append("g");
const gEdges = root.append("g");
const gNodes = root.append("g");

ROWY.forEach((y,i) => {
  gGrid.append("text").attr("class","gen").attr("x",0).attr("y",y+5).text(GENS[i]);
  if (i>0) gGrid.append("line").attr("class","genrule").attr("x1",0).attr("x2",W).attr("y1",(ROWY[i-1]+y)/2+12).attr("y2",(ROWY[i-1]+y)/2+12);
});
HOUSES.forEach(h => gGrid.append("text").attr("class","house").attr("x",h.x).attr("y",h.y).attr("text-anchor","middle").text(h.label));

const RN = 8;
function norm(x,y){ const l = Math.hypot(x,y)||1; return [x/l, y/l]; }
function edgePath(e){
  const a = N[e.from], b = N[e.to];
  if (e.type==="parent") {
    const my = (a.y + b.y)/2 + 6;
    return `M${a.x},${a.y+RN+2} C${a.x},${my} ${b.x},${my} ${b.x},${b.y-RN-2}`;
  }
  const dx = b.x-a.x, dy = b.y-a.y;
  const k = e.type==="affair" ? 1.25 : e.type==="feud" ? -1 : 1;
  let cx, cy;
  if (Math.abs(dy) < 1) { cx = (a.x+b.x)/2; cy = a.y - (24 + Math.abs(dx)*0.14) * k; }
  else { cx = (a.x+b.x)/2 - dy*0.14*k; cy = (a.y+b.y)/2 + dx*0.14*k; }
  const u1 = norm(cx-a.x, cy-a.y), u2 = norm(b.x-cx, b.y-cy);
  const pad = (e.type==="curse"||e.type==="transform") ? RN+8 : RN+2;
  return `M${a.x+u1[0]*(RN+2)},${a.y+u1[1]*(RN+2)} Q${cx},${cy} ${b.x-u2[0]*pad},${b.y-u2[1]*pad}`;
}
const BASE = {parent:1.2, marriage:4, affair:1.2, feud:1.2, transform:1.8, curse:1.7};
const edgeSel = gEdges.selectAll("g.e").data(E).join("g").attr("class", e => `e e-${e.type}`);
edgeSel.each(function(e){
  const g = d3.select(this), d = edgePath(e);
  const p = g.append("path").attr("class","edge main").attr("d",d);
  if (e.type==="marriage") g.append("path").attr("class","edge inner").attr("d",d);
  if (e.type==="transform" || e.type==="curse") p.attr("marker-end",`url(#arr-${e.type})`);
});

const nodeSel = gNodes.selectAll("g.node").data(P).join("g")
  .attr("class","node").attr("transform", d => `translate(${d.x},${d.y})`)
  .attr("tabindex",0).attr("role","button").attr("aria-label", d => d.name)
  .on("click", (ev,d) => { ev.stopPropagation(); nodeClick(d.id); })
  .on("keydown", (ev,d) => { if (ev.key==="Enter"||ev.key===" ") { ev.preventDefault(); nodeClick(d.id); } });
nodeSel.each(function(d){
  const g = d3.select(this);
  g.append("circle").attr("class","hit").attr("r",26);
  g.append("circle").attr("class","halo").attr("r",16);
  if (d.kind==="god") g.append("circle").attr("class","ring").attr("r",RN+4);
  g.append("circle").attr("class","dot " + d.kind).attr("r", d.kind==="nymph" ? RN-2 : RN);
  if (d.transformation) g.append("path").attr("class","badge").attr("d","M0,-4.5 L4.5,0 L0,4.5 L-4.5,0 Z")
      .attr("transform",`translate(${RN+7},${-RN-3})`);
  g.append("text").attr("class","lbl" + (d.kind==="god"?" god":"")).attr("text-anchor","middle").attr("y", d.kind==="god" ? 34 : 30).text(d.name);
});
svg.on("click", () => { if (state.mode==="node") resetMode(); });

const zoom = d3.zoom().scaleExtent([0.2, 3]).on("zoom", ev => { root.attr("transform", ev.transform); if (ev.sourceEvent) hideHint(); });
svg.call(zoom).on("dblclick.zoom", null);
const graphEl = document.getElementById("graph");
const wide = () => window.innerWidth >= 900;
/* The part of the tree not covered by the card: beside it on wide screens, above it on phones. */
const card = document.getElementById("card");
const viewW = () => graphEl.clientWidth - (wide() && card.classList.contains("open") ? 420 : 0);
const toolsEl = document.getElementById("tools");
const viewH = () => {
  if (wide()) return graphEl.clientHeight;
  const covered = Math.max(card.classList.contains("open") ? card.offsetHeight : 0, toolsEl.offsetHeight + 12);
  return Math.max(120, graphEl.clientHeight - covered);
};
function fitTo(ids, animate){
  const pts = ids ? ids.map(id => N[id]) : P;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = ids ? Math.min(...xs) - 80 : -20, x1 = Math.max(...xs) + 80, y0 = Math.min(...ys) - 60, y1 = Math.max(...ys) + 60;
  const w = ids ? viewW() : graphEl.clientWidth - (wide() ? 420 : 0), h = viewH();
  const k = Math.min(1.1, Math.min(w/(x1-x0), h/(y1-y0)) * 0.95);
  const t = d3.zoomIdentity.translate((w-(x1-x0)*k)/2 - x0*k, (h-(y1-y0)*k)/2 - y0*k).scale(k);
  (animate ? svg.transition().duration(600) : svg).call(zoom.transform, t);
}
function focusOn(id){
  const w = graphEl.clientWidth, h = graphEl.clientHeight;
  const cur = d3.zoomTransform(graphEl);
  const k = Math.max(cur.k, Math.min(1, w/700));
  const p = N[id];
  const tx = wide() ? (w-420)/2 : w/2, ty = viewH()/2;
  svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.translate(tx-p.x*k, ty-p.y*k).scale(k));
}
document.getElementById("fitBtn").onclick = () => fitTo(null, true);
document.getElementById("fitFloat").onclick = () => fitTo(null, true);
function initialView(){
  const w = graphEl.clientWidth, h = graphEl.clientHeight;
  if (Math.min(w/W, h/H) >= 0.5) { fitTo(null, false); return; }
  const k = 0.55;
  const cy = (ROWY[0] + ROWY[ROWY.length-1]) / 2;
  svg.call(zoom.transform, d3.zoomIdentity.translate(w/2 - N[BRANCH.focus].x*k, viewH()/2 - cy*k).scale(k));
}

/* ---------- visibility ---------- */
const attested = e => state.src==="all" || e.sources.includes(state.src);
const edgeVisible = e => state.layers[e.type] && attested(e);
const samePair = (e, [x,y]) => (e.from===x && e.to===y) || (e.from===y && e.to===x);
function apply(animate){
  const sel = state.mode==="node" ? state.sel : null;
  const curse = state.mode==="curse" ? CURSES[state.curseKey] : null;
  const path = state.mode==="thread" ? state.path : null;
  const pathEdges = new Set(path ? path.edges : []);
  const pathNodes = new Set(path ? path.nodes : []);
  const visible = new Set();
  edgeSel.each(function(e){
    let vis = edgeVisible(e);
    const inCurse = curse && ["parent","curse","feud","affair","marriage"].includes(e.type) && curse.pairs.some(p => samePair(e,p)) && attested(e);
    const inPath = pathEdges.has(e.i);
    if (inPath) vis = true;
    const hot = (sel && (e.from===sel || e.to===sel)) || inCurse || inPath;
    // at rest, feuds and affairs stay faint so the bloodlines read first; they light up when selected
    let op = (e.type==="curse"||e.type==="transform") ? 0.9 : (e.type==="feud"||e.type==="affair") ? 0.3 : 0.55;
    if (sel || curse || path) op = hot ? 1 : 0.06;
    if (!vis && !inCurse) op = 0;
    if (vis) { visible.add(e.from); visible.add(e.to); }
    const g = d3.select(this).classed("thread", inPath);
    (animate ? g.transition().duration(380) : g).style("opacity", op);
    g.select(".main").attr("stroke-width", inPath ? 3 : hot ? BASE[e.type]*1.7 : BASE[e.type]);
  });
  const neigh = new Set();
  if (sel) { neigh.add(sel); E.forEach(e => { if (edgeVisible(e) && (e.from===sel||e.to===sel)) { neigh.add(e.from); neigh.add(e.to); } }); }
  nodeSel.classed("sel", d => d.id===sel).classed("ends", d => !!(path && (d.id===path.nodes[0] || d.id===path.nodes[path.nodes.length-1])));
  const nOp = d => {
    if (sel) return neigh.has(d.id) ? 1 : 0.2;
    if (curse) return curse.nodes.has(d.id) ? 1 : 0.18;
    if (path) return pathNodes.has(d.id) ? 1 : 0.18;
    if (state.src!=="all") return (visible.has(d.id) || (d.transformation && d.transformation.sources.includes(state.src))) ? 1 : 0.18;
    return 1;
  };
  (animate ? nodeSel.transition().duration(380) : nodeSel).style("opacity", nOp);
  nodeSel.selectAll(".badge").style("display", d => state.layers.transform && (state.src==="all" || d.transformation.sources.includes(state.src)) ? null : "none");
  syncTools();
}

/* ---------- card ---------- */
const cardBody = document.getElementById("cardBody");
const srcText = src => `<span class="srcs">${src.map(s => state.src===s ? `<b>${SRC[s]}</b>` : SRC[s]).join(", ")}</span>`;
function sentence(e){
  const A = N[e.from].name, B = N[e.to].name;
  if (e.type==="parent") return `${A} is the ${N[e.from].gender==="f"?"mother":"father"} of ${B}${e.note?` (${e.note})`:""}.`;
  if (e.type==="marriage") return `${A} married ${B}${e.note?`, ${e.note}`:""}.`;
  return `${A} ${e.note}.`;
}
const relItem = (id, e, withSentence) => `<li><button class="rel" data-go="${id}">${N[id].name}</button>${srcText(e.sources)}${withSentence?`<span class="note">${sentence(e)}</span>`:(e.note?`<span class="note">${e.note}</span>`:"")}</li>`;
function shell(inner){
  cardBody.innerHTML = inner;
  card.querySelectorAll("[data-close]").forEach(b => b.onclick = resetMode);
  card.querySelectorAll("[data-go]").forEach(b => b.onclick = () => select(b.dataset.go, true));
  setFull(false); card.classList.add("open"); card.scrollTop = 0;
}

/* On phones the card is a sheet: half height at first; pull the grip up for full height, down to shrink or close. Tapping the grip toggles. */
const grip = document.getElementById("grip");
function setFull(on){
  card.classList.toggle("full", on);
  grip.setAttribute("aria-expanded", on); grip.setAttribute("aria-label", on ? "Shrink card" : "Expand card");
}
let dragY = null, dragged = false;
grip.addEventListener("pointerdown", ev => { dragY = ev.clientY; grip.setPointerCapture(ev.pointerId); });
grip.addEventListener("pointerup", ev => {
  if (dragY===null) return;
  const dy = ev.clientY - dragY; dragY = null;
  if (Math.abs(dy) < 30) return;
  dragged = true;
  if (dy < 0) setFull(true); else if (card.classList.contains("full")) setFull(false); else resetMode();
});
grip.addEventListener("click", () => { if (dragged) { dragged = false; return; } setFull(!card.classList.contains("full")); });
function renderNode(id){
  const p = N[id];
  const touches = e => e.from===id || e.to===id;
  const other = e => e.from===id ? e.to : e.from;
  const pick = (f, s) => E.filter(f).map(e => relItem(other(e), e, s));
  const groups = [
    ["Born to", pick(e => e.type==="parent" && e.to===id, false)],
    ["Married", pick(e => e.type==="marriage" && touches(e), false)],
    ["Affairs", pick(e => e.type==="affair" && touches(e), true)],
    ["Feuds & killings", pick(e => e.type==="feud" && touches(e), true)],
    ["Transformations", pick(e => e.type==="transform" && touches(e), true)],
    ["Curses", pick(e => e.type==="curse" && touches(e), true)],
    ["Children", pick(e => e.type==="parent" && e.from===id, false)]
  ].filter(g => g[1].length);
  shell(`
    <div class="card-top"><span class="greek" lang="grc">${p.greek}</span><button class="close" data-close>Close</button></div>
    <h2 class="card-name">${p.name}</h2>
    <p class="card-tag">${p.tagline}</p>
    <p class="card-role">${p.role}</p>
    <p class="card-story">${p.story}</p>
    ${p.transformation ? `<div class="sec"><h3>Changed shape</h3><ul class="rels"><li><span class="rel static">${p.transformation.text}</span>${srcText(p.transformation.sources)}</li></ul></div>` : ""}
    ${groups.map(([h, items]) => `<div class="sec"><h3>${h}</h3><ul class="rels">${items.join("")}</ul></div>`).join("")}
    ${p.versions ? `<div class="sec"><h3>Where the sources disagree</h3><div class="ver">${p.versions}</div></div>` : ""}
    ${p.art ? `<div class="sec"><h3>In art</h3><ul class="rels art">${p.art.map(({title:t, meta:m, where:w, url:u}) => `<li>${u ? `<a class="t" href="${u}" target="_blank" rel="noopener">${t}</a>` : `<span class="t">${t}</span>`}<br><span class="m">${m}. ${w}</span></li>`).join("")}</ul></div>` : ""}
    <p class="legend">Each link lists the sources that record it. Underlined artworks open a page about the work.</p>`);
}
function select(id, move){
  state.mode = "node"; state.sel = id; state.path = null;
  curseSel.value = ""; threadBtn.setAttribute("aria-pressed","false");
  renderNode(id); apply(true);
  if (move) focusOn(id);
}
function nodeClick(id){
  hideHint();
  if (state.mode==="thread") {
    const a = document.getElementById("tFrom"), b = document.getElementById("tTo");
    if (a && b) { if (!a.value || (a.value && b.value)) { a.value = id; b.value = ""; } else { b.value = id; runThread(a.value, b.value); } }
    return;
  }
  select(id);
}
function resetMode(){
  state.mode = null; state.sel = null; state.path = null; state.curseKey = null; state.threadEnds = null;
  curseSel.value = ""; threadBtn.setAttribute("aria-pressed","false");
  card.classList.remove("open"); setFull(false); apply(true);
}

/* phone panels: layers, curses, find */
const panelTop = greek => `<div class="card-top"><span class="greek" lang="grc">${greek}</span><button class="close" data-close>Close</button></div>`;
function openLayers(){
  state.mode = "layers"; state.sel = null; state.path = null; state.curseKey = null;
  curseSel.value = "";
  shell(`${panelTop("Δεσμοί")}
    <h2 class="card-name thread-title">Layers</h2>
    <p class="card-tag">Choose which kinds of link to draw.</p>
    <ul class="opts">${LAYERS.map(L => `<li><button class="opt" data-layer="${L.k}" aria-pressed="${state.layers[L.k]}"><svg viewBox="0 0 26 10" aria-hidden="true">${SAMPLE[L.k]}</svg>${L.label}</button></li>`).join("")}</ul>`);
  card.querySelectorAll("[data-layer]").forEach(b => b.onclick = () => toggleLayer(b.dataset.layer));
  apply(true);
}
function openCurses(){
  state.mode = "curses"; state.sel = null; state.path = null; state.curseKey = null;
  curseSel.value = "";
  shell(`${panelTop("Ἀραί")}
    <h2 class="card-name thread-title">Trace a curse</h2>
    <p class="card-tag">Follow a curse down the generations.</p>
    <ul class="opts">${Object.values(CURSES).map(c => `<li><button class="opt" data-curse="${c.id}"><span>${c.title}<small>${c.lead}</small></span></button></li>`).join("")}</ul>`);
  card.querySelectorAll("[data-curse]").forEach(b => b.onclick = () => openCurse(b.dataset.curse));
  apply(true);
}
/* phone: the same search in a panel; the list is rebuilt on every keystroke */
function openFind(){
  state.mode = "find"; state.sel = null; state.path = null; state.curseKey = null;
  curseSel.value = "";
  shell(`${panelTop("Ζήτησις")}
    <h2 class="card-name thread-title">Find a figure</h2>
    <input class="search" id="findQ" type="search" placeholder="Name, in English or Greek" autocomplete="off" spellcheck="false" aria-label="Find a figure">
    <ul class="rels found" id="findList" aria-live="polite"></ul>`);
  const q = document.getElementById("findQ"), list = document.getElementById("findList");
  const show = () => {
    const hits = findFigures(q.value);
    list.innerHTML = hits.length ? hits.map(p => `<li><button class="rel" data-go="${p.id}">${p.name}</button><span class="srcs">${p.role}</span></li>`).join("") : NONE;
  };
  q.oninput = show;
  q.onfocus = () => { if (!wide()) setFull(true); };   // keep the list above the phone keyboard
  q.onkeydown = ev => { if (ev.key==="Enter") { const hit = findFigures(q.value)[0]; if (hit) select(hit.id, true); } };
  list.onclick = ev => { const b = ev.target.closest("[data-go]"); if (b) select(b.dataset.go, true); };
  show();
  apply(true);
}

/* curses */
function openCurse(key){
  const c = CURSES[key];
  state.mode = "curse"; state.curseKey = key; state.sel = null; state.path = null;
  threadBtn.setAttribute("aria-pressed","false");
  shell(`
    <div class="card-top"><span class="greek">Ἀρά</span><button class="close" data-close>Close</button></div>
    <h2 class="card-name curse-title">${c.title}</h2>
    <p class="card-tag">${c.lead}</p>
    <div class="sec"><h3>Generation by generation</h3><ol class="steps">
      ${c.steps.map(({generation:g, figures:who, text:t}) => `<li><span class="g">${g}</span><div><div class="t">${t}</div><div class="who">${who.map(id => `<button class="rel" data-go="${id}">${N[id].name}</button>`).join("")}</div></div></li>`).join("")}
    </ol></div>
    <p class="legend">Highlighted on the tree: the bloodline, the crimes and the curses that carry it forward.</p>`);
  apply(true);
  fitTo([...c.nodes], true);
}

/* Ariadne’s thread */
function openThread(){
  state.mode = "thread"; state.sel = null; state.path = null; state.curseKey = null;
  curseSel.value = ""; threadBtn.setAttribute("aria-pressed","true");
  const opts = [...P].sort((a,b) => a.name.localeCompare(b.name)).map(p => `<option value="${p.id}">${p.name}</option>`).join("");
  shell(`
    <div class="card-top"><span class="greek">Μίτος</span><button class="close" data-close>Close</button></div>
    <h2 class="card-name thread-title">Ariadne’s thread</h2>
    <p class="card-tag">Pick any two figures to find the shortest path between them.</p>
    <div class="pick">
      <label>From<select id="tFrom"><option value="">Choose, or tap the tree</option>${opts}</select></label>
      <label>To<select id="tTo"><option value="">Choose, or tap the tree</option>${opts}</select></label>
      <button class="go" id="tGo">Follow the thread</button>
    </div>
    <div id="tOut"></div>`);
  document.getElementById("tGo").onclick = () => {
    const a = document.getElementById("tFrom").value, b = document.getElementById("tTo").value;
    if (a && b) runThread(a, b);
  };
  apply(true);
}
function shortestPath(a, b){
  const adj = {};
  E.forEach(e => { if (!attested(e)) return; (adj[e.from] ||= []).push([e.to, e]); (adj[e.to] ||= []).push([e.from, e]); });
  const prev = {[a]:null}, q = [a];
  while (q.length) {
    const u = q.shift(); if (u===b) break;
    (adj[u]||[]).forEach(([v, e]) => { if (!(v in prev)) { prev[v] = [u, e]; q.push(v); } });
  }
  if (!(b in prev)) return null;
  const nodes = [b], edges = [];
  let cur = b;
  while (prev[cur]) { const [u, e] = prev[cur]; edges.unshift(e); nodes.unshift(u); cur = u; }
  return {nodes, edges};
}
function runThread(a, b, silent){
  state.threadEnds = [a, b];
  const out = document.getElementById("tOut");
  if (a===b) { if (out) out.innerHTML = `<p class="card-story">Pick two different figures.</p>`; return; }
  const res = shortestPath(a, b);
  if (!res) {
    state.path = null; apply(true);
    if (out) out.innerHTML = `<p class="card-story">In ${state.src==="all" ? "these sources" : SRC[state.src]}, no thread connects ${N[a].name} and ${N[b].name}. Try “${SRC_ALL_LABEL}”.</p>`;
    return;
  }
  state.path = {nodes:res.nodes, edges:res.edges.map(e => e.i)};
  if (out) out.innerHTML = `
    <div class="sec"><h3>${res.edges.length} ${res.edges.length===1?"link":"links"} apart${state.src==="all"?"":`, in ${SRC[state.src]}`}</h3>
    <ol class="thread-steps">${res.edges.map(e => `<li>${sentence(e)} ${srcText(e.sources)}</li>`).join("")}</ol></div>`;
  apply(true);
  if (!silent) fitTo(res.nodes, true);
}

initialView();
apply(false);
