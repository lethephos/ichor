import * as d3 from "d3";
import {SRC, SRC_FULL, SRC_NOTE, SRC_ALL_LABEL, ROWY, GENS, W, H, P, N, E, STORIES, BRANCH, HOUSES, OLY, OLY_NOTE} from "./data.js";

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

const state = {src:"all", layers:{parent:true, marriage:true, affair:true, feud:true, transform:true, curse:true}, sel:null, hover:null, mode:null, curseKey:null, step:0, pickOpen:false, path:null};

/* ---------- header ---------- */
document.getElementById("branchTitle").textContent = BRANCH.title;
document.getElementById("branchSub").textContent = BRANCH.subtitle || "";

/* ---------- light and dark theme ----------
   The page follows the system until the reader picks a theme. A pick that matches the
   system is not saved, so the page goes back to following it. */
const themeBtn = document.getElementById("themeBtn");
const systemDark = matchMedia("(prefers-color-scheme: dark)");
const isDark = () => (document.documentElement.dataset.theme || (systemDark.matches ? "dark" : "light")) === "dark";
function showTheme(){
  const next = isDark() ? "light" : "dark";
  themeBtn.setAttribute("aria-label", `Switch to the ${next} theme`);
  themeBtn.title = `${next[0].toUpperCase()}${next.slice(1)} theme`;
  themeBtn.classList.toggle("dark", isDark());
}
themeBtn.addEventListener("click", () => {
  const next = isDark() ? "light" : "dark";
  const follows = next === (systemDark.matches ? "dark" : "light");
  if (follows) delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = next;
  try { follows ? localStorage.removeItem("ichor-theme") : localStorage.setItem("ichor-theme", next); } catch(e) {}
  showTheme();
});
systemDark.addEventListener("change", showTheme);
showTheme();

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
  if (state.mode==="curse") openCurse(state.curseKey, state.step);
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
Object.values(STORIES).forEach(c => {
  const o = document.createElement("option"); o.value = c.id; o.textContent = c.title + (c.draft ? " (draft)" : ""); curseSel.appendChild(o);
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
  document.body.classList.toggle("story", state.mode==="curse");
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
// a divider is a stronger rule between two rows, named on the left (e.g. where the gods end and mortals begin)
(BRANCH.dividers || []).forEach(d => {
  const y = (ROWY[d.before-1] + ROWY[d.before]) / 2 + 12;
  gGrid.append("line").attr("class","divider").attr("x1",0).attr("x2",W).attr("y1",y).attr("y2",y);
  gGrid.append("text").attr("class","divider-label").attr("x",0).attr("y",y+4).text(d.label);
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
  .on("keydown", (ev,d) => { if (ev.key==="Enter"||ev.key===" ") { ev.preventDefault(); nodeClick(d.id); } })
  // with a mouse, hovering a figure previews its links; touch keeps tap-to-open
  .on("pointerenter", (ev,d) => { if (ev.pointerType==="mouse") { state.hover = d.id; apply(150); } })
  .on("pointerleave", (ev,d) => { if (state.hover===d.id) { state.hover = null; apply(150); } });
nodeSel.each(function(d){
  const g = d3.select(this);
  g.append("circle").attr("class","hit").attr("r",26);
  g.append("circle").attr("class","halo").attr("r",16);
  if (d.kind==="god") g.append("circle").attr("class","ring").attr("r",RN+4);
  g.append("circle").attr("class","dot " + d.kind).attr("r", d.kind==="nymph" ? RN-2 : RN);
  if (d.transformation) g.append("path").attr("class","badge").attr("d","M0,-4.5 L4.5,0 L0,4.5 L-4.5,0 Z")
      .attr("transform",`translate(${RN+7},${-RN-3})`);
  // Olympus: a small peak at the upper left; hollow where only some lists count the god
  if (OLY[d.id]) g.append("path").attr("class","oly " + OLY[d.id].in).attr("d","M0,-4 L4.5,3.5 L-4.5,3.5 Z")
      .attr("transform",`translate(${-RN-7},${-RN-3})`)
      .append("title").text(OLY[d.id].in==="all" ? "One of the Twelve Olympians" : "One of the Twelve in some lists");
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
const dockEl = document.getElementById("dock");
const viewH = () => {
  if (wide()) return Math.max(120, graphEl.clientHeight - dockEl.offsetHeight - 26);
  const covered = Math.max(card.classList.contains("open") ? card.offsetHeight : 0, toolsEl.offsetHeight + 12);
  return Math.max(120, graphEl.clientHeight - covered);
};
function fitTo(ids, animate){
  const pts = ids ? ids.map(id => N[id]) : P;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = ids ? Math.min(...xs) - 80 : -20, x1 = Math.max(...xs) + 80, y0 = Math.min(...ys) - 60, y1 = Math.max(...ys) + 60;
  const w = viewW(), h = viewH();
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
/* animate: false for an instant change, true for the usual fade, or a duration in ms */
function apply(animate){
  const dur = animate===true ? 380 : animate || 0;
  const hover = state.mode!=="curse" && state.mode!=="thread" ? state.hover : null;
  const sel = hover || (state.mode==="node" ? state.sel : null);
  const curse = state.mode==="curse" ? STORIES[state.curseKey] : null;
  const story = curse && state.step>=1 && state.step<=curse.steps.length ? reveal(curse, state.step) : null;
  const path = state.mode==="thread" ? state.path : null;
  const pathEdges = new Set(path ? path.edges : []);
  const pathNodes = new Set(path ? path.nodes : []);
  const visible = new Set();
  edgeSel.each(function(e){
    let vis = edgeVisible(e);
    let inCurse = curse && STORY_TYPES.includes(e.type) && curse.pairs.some(p => samePair(e,p)) && attested(e);
    if (story && inCurse && !(story.shown.has(e.from) && story.shown.has(e.to))) inCurse = false;   // not told yet
    const isAlt = !!(story && story.alt.has(e.i));
    if (isAlt) inCurse = true;
    const inPath = pathEdges.has(e.i);
    if (inPath) vis = true;
    const hot = (sel && (e.from===sel || e.to===sel)) || (inCurse && (!story || story.now.has(e.from) || story.now.has(e.to))) || inPath;
    // at rest, feuds and affairs stay faint so the bloodlines read first; they light up when selected
    let op = (e.type==="curse"||e.type==="transform") ? 0.9 : (e.type==="feud"||e.type==="affair") ? 0.3 : 0.55;
    if (sel || curse || path) op = hot ? 1 : inCurse ? 0.45 : story ? 0.03 : 0.06;
    if (!vis && !inCurse) op = 0;
    if (vis) { visible.add(e.from); visible.add(e.to); }
    const g = d3.select(this).classed("thread", inPath).classed("alt", isAlt);
    (dur ? g.transition().duration(dur) : g).style("opacity", op);
    g.select(".main").attr("stroke-width", inPath ? 3 : hot ? BASE[e.type]*1.7 : BASE[e.type]);
  });
  const neigh = new Set();
  if (sel) { neigh.add(sel); E.forEach(e => { if (edgeVisible(e) && (e.from===sel||e.to===sel)) { neigh.add(e.from); neigh.add(e.to); } }); }
  nodeSel.classed("sel", d => d.id===sel || (state.mode==="node" && d.id===state.sel)).classed("ends", d => !!(path && (d.id===path.nodes[0] || d.id===path.nodes[path.nodes.length-1])) || !!(story && story.now.has(d.id)));
  const nOp = d => {
    if (sel) return neigh.has(d.id) ? 1 : 0.2;
    if (story) return story.now.has(d.id) ? 1 : story.shown.has(d.id) ? 0.8 : 0.08;
    if (curse) return curse.nodes.has(d.id) ? 1 : 0.18;
    if (path) return pathNodes.has(d.id) ? 1 : 0.18;
    if (state.src!=="all") return (visible.has(d.id) || (d.transformation && d.transformation.sources.includes(state.src))) ? 1 : 0.18;
    return 1;
  };
  (dur ? nodeSel.transition().duration(dur) : nodeSel).style("opacity", nOp);
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
const draftTag = x => x.draft ? ` <em class="draft" title="Not yet checked">draft</em>` : "";
const relItem = (id, e, withSentence) => `<li><button class="rel" data-go="${id}">${N[id].name}</button>${srcText(e.sources)}${draftTag(e)}${withSentence?`<span class="note">${sentence(e)}</span>`:(e.note?`<span class="note">${e.note}</span>`:"")}</li>`;
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
    <h2 class="card-name">${p.name}${draftTag(p)}</h2>
    ${p.draft ? `<p class="draft-note">This figure was added from Hesiod, Homer, the Homeric Hymns, Apollodorus, Pindar and Hyginus, and is not yet checked.</p>` : ""}
    <p class="card-tag">${p.tagline}</p>
    <p class="card-role">${p.role}</p>
    <p class="card-story">${p.story}</p>
    ${OLY[id] ? `<div class="sec"><h3>The Twelve</h3><p class="oly-text"><svg class="oly-mark" viewBox="-6 -5 12 10" aria-hidden="true"><path class="oly ${OLY[id].in}" d="M0,-4 L4.5,3.5 L-4.5,3.5 Z"/></svg>${OLY[id].text}</p><p class="oly-note">${OLY_NOTE}</p></div>` : ""}
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
  select(id, true);
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
    <h2 class="card-name thread-title">Stories</h2>
    <p class="card-tag">Myths told one step at a time, as the tree fills in.</p>
    <ul class="opts">${Object.values(STORIES).map(c => `<li><button class="opt" data-curse="${c.id}"><span>${c.title}${c.draft ? ` <em class="draft">draft</em>` : ""}<small>${c.lead}</small></span></button></li>`).join("")}</ul>`);
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

/* Stories: a myth told one step at a time (a curse, one generation at a time). Step 0 introduces it, steps 1…n tell it and
   reveal on the tree only the figures met so far, step n+1 shows the whole line at once. */
/* Telling a story by one source uses only what is already in relations.json: a generation is
   told by a source when one of its links to the story so far is attested there. */
const STORY_TYPES = ["parent","curse","feud","affair","marriage","transform"];
const storyEdge = (c, e) => STORY_TYPES.includes(e.type) && c.pairs.some(p => samePair(e, p));
// the step where each figure first enters the story (0-based); figures may come back in later steps
function entries(c){
  const first = {};
  c.steps.forEach((s, i) => s.figures.forEach(id => { if (!(id in first)) first[id] = i; }));
  return first;
}
function stepLinks(c, i){   // the links that tell step i (0-based): from its figures to anyone met by then
  const figs = new Set(c.steps[i].figures), first = entries(c);
  const notYet = id => id in first && first[id] > i;
  return E.filter(e => storyEdge(c, e) && (figs.has(e.from) || figs.has(e.to))
    && !notYet(figs.has(e.from) ? e.to : e.from));
}
/* Figures this step brings in, and among them those whose parentage the story is about:
   those get their alternative parents and their Where the sources disagree text. */
const newcomers = (c, i) => { const first = entries(c); return c.steps[i].figures.filter(id => first[id]===i); };
const parentsInStory = (c, id) => E.some(e => e.type==="parent" && e.to===id && c.pairs.some(p => samePair(e, p)));
const toldSteps = c => c.steps.map((_, i) => state.src==="all" || stepLinks(c, i).some(attested));
function reveal(c, k, told = toldSteps(c)){
  const now = new Set(c.steps[k-1].figures), first = entries(c);
  const met = new Set(c.steps.slice(0, k).flatMap((s, i) => told[i] ? s.figures : []));
  const later = new Set(Object.keys(first).filter(id => first[id] >= k && told[first[id]]));
  const shown = new Set([...met, ...now]);
  // bring in the people the story has just touched (Aerope, Chrysippus…), unless their own step is still to come
  const touched = (a, b) => E.some(e => storyEdge(c, e) && samePair(e, [a, b]) && attested(e));
  c.pairs.forEach(([a, b]) => {
    if (met.has(a) && !later.has(b) && touched(a, b)) shown.add(b);
    if (met.has(b) && !later.has(a) && touched(a, b)) shown.add(a);
  });
  // the camera follows the step: its figures, with their parents, children and spouses already met
  const family = (a, b) => E.some(e => (e.type==="parent" || e.type==="marriage") && samePair(e, [a, b]));
  const focus = new Set(now);
  c.pairs.forEach(([a, b]) => {
    if (now.has(a) && shown.has(b) && family(a, b)) focus.add(b);
    if (now.has(b) && shown.has(a) && family(a, b)) focus.add(a);
  });
  // with all sources on, the other parents a current figure is given appear as alternatives
  const alt = new Set();
  if (state.src==="all") newcomers(c, k-1).filter(id => parentsInStory(c, id)).forEach(id => altParents(id).flat().forEach(e => {
    if (!shown.has(e.from)) { shown.add(e.from); focus.add(e.from); }
    alt.add(e.i);
  }));
  return {now, shown, focus, alt};
}
/* Real disagreements the data can show by itself: a child with two fathers, or two mothers, in different sources. */
function altParents(id){
  const byGender = {};
  E.filter(e => e.type==="parent" && e.to===id).forEach(e => (byGender[N[e.from].gender] ||= []).push(e));
  return Object.values(byGender).filter(g => g.length > 1);
}
const nextStep = (c, step, told) => { for (let i = step+1; i <= c.steps.length; i++) if (told[i-1]) return i; return c.steps.length + 1; };
const prevStep = (c, step, told) => { for (let i = Math.min(step-1, c.steps.length); i >= 1; i--) if (told[i-1]) return i; return 0; };
const whoLinks = ids => `<div class="who">${ids.map(id => `<button class="rel" data-go="${id}">${N[id].name}</button>`).join("")}</div>`;
const ORDER = {curse:0, feud:1, affair:2, marriage:3, parent:4};
function openCurse(key, step = 0){
  const c = STORIES[key], n = c.steps.length, told = toldSteps(c), src = state.src, by = SRC[src];
  state.mode = "curse"; state.curseKey = key; state.step = step; state.sel = null; state.path = null;
  curseSel.value = key;
  const back = prevStep(c, step, told), next = nextStep(c, step, told);
  const dots = `<div class="dots" aria-hidden="true">${c.steps.map((_, i) => `<span class="${!told[i] ? "skip" : i+1===step ? "on" : i+1<step ? "past" : ""}"></span>`).join("")}</div>`;
  const nav = (backLabel, nextLabel) => `<div class="story-nav">${backLabel ? `<button class="act" data-step="${back}">← ${backLabel}</button>` : "<span></span>"}${dots}${nextLabel ? `<button class="go" data-step="${next}">${nextLabel} →</button>` : "<span></span>"}</div>`;
  const pick = `<div class="story-src"><button class="story-src-toggle" aria-expanded="${state.pickOpen}">Told by <b>${src==="all" ? "all sources" : by}</b> <span aria-hidden="true">${state.pickOpen ? "▴" : "▾"}</span></button>
    ${state.pickOpen ? `<div class="story-src-row" role="group" aria-label="Told by">${[["all", "All sources"], ...Object.entries(SRC)].map(([k, l]) =>
      `<button class="tab" data-src="${k}" aria-pressed="${src===k}">${l}</button>`).join("")}</div>` : ""}</div>`;
  const count = told.filter(Boolean).length;
  // curses go generation by generation; other stories step by step
  const curse = c.kind==="curse", unit = curse ? "generation" : "step";
  const whole = curse ? "The whole curse" : "The whole story";
  const draft = c.draft ? `<p class="draft-note"><em class="draft">draft</em> Assembled from the figures’ cards and the notes on their links; not yet checked.</p>` : "";
  let body;
  if (step===0) body = `
    <h2 class="card-name curse-title">${c.title}</h2>
    <p class="card-tag">${c.lead}</p>
    ${draft}
    ${pick}
    <p class="story-hint">${src==="all" ? `Told ${unit} by ${unit}. The tree fills in as the story goes. Choose a source to hear only what it tells.`
      : count===n ? `Every ${unit} is told in ${by}.` : count ? `${count} of ${n} ${unit}s are told in ${by}; the others are skipped.` : `This story is not told in ${by}.`}</p>
    ${count ? nav(null, "Begin") : `<div class="story-nav"><span></span><button class="act" data-step="${n+1}">${whole} →</button></div>`}`;
  else if (step<=n) {
    const s = c.steps[step-1];
    const fresh = newcomers(c, step-1);
    const alts = fresh.filter(id => parentsInStory(c, id)).flatMap(id => altParents(id).map(g => ({id, g})));
    const vers = fresh.filter(id => N[id].versions);
    const readers = Object.keys(SRC).filter(k => stepLinks(c, step-1).some(e => e.sources.includes(k)));
    const differ = src!=="all" || !(alts.length || vers.length) ? "" : `
      <details class="story-ver"><summary>Versions differ <span>· ${[...new Set([...alts.map(a => a.id), ...vers])].map(id => N[id].name).join(", ")}</span></summary>
        ${alts.map(({id, g}) => `<p><b>${N[id].name}’s ${N[g[0].from].gender==="f" ? "mother" : "father"}:</b> ${g.map(e => `${N[e.from].name} <span class="srcs">(${e.sources.map(x => SRC[x]).join(", ")})</span>`).join(" or ")}.</p>`).join("")}
        ${vers.map(id => `<p><b>${N[id].name}.</b> ${N[id].versions}</p>`).join("")}
        ${readers.length ? `<div class="read-as"><span>Read this ${unit} as</span>${readers.map(k => `<button class="tab" data-read="${k}">${SRC[k]}</button>`).join("")}</div>` : ""}
      </details>`;
    const says = src==="all" ? differ : told[step-1]
      ? `<div class="story-says"><h3>In ${by}</h3><ul>${stepLinks(c, step-1).filter(attested).sort((a, b) => ORDER[a.type] - ORDER[b.type])
          .map(e => `<li>${sentence(e)}${e.sources.length===1 ? ` <span class="only">only here</span>` : ""}</li>`).join("")}</ul>
          <div class="read-as"><button class="tab" data-read="all">← All versions</button></div></div>`
      : `<p class="story-hint">This part is not told in ${by}.</p><div class="read-as"><button class="tab" data-read="all">← All versions</button></div>`;
    body = `
    <p class="story-of">${c.title}</p>
    ${pick}
    <p class="story-step">${s.label} <span>· ${step} of ${n}</span></p>
    <p class="story-text">${s.text}</p>
    ${whoLinks(s.figures)}
    ${says}
    ${nav(back ? "Back" : "Start", next>n ? whole : "Next")}`;
  }
  else body = `
    <h2 class="card-name curse-title">${c.title}</h2>
    <p class="card-tag">${c.lead}</p>
    ${pick}
    ${draft}
    <div class="sec"><h3>${curse ? "Generation by generation" : "Step by step"}</h3><ol class="steps">
      ${c.steps.map(({label:g, figures:who, text:t}, i) => `<li class="${told[i] ? "" : "untold"}"><span class="g">${g}${told[i] ? "" : `<br>Not in ${by}`}</span><div><div class="t">${t}</div>${whoLinks(who)}</div></li>`).join("")}
    </ol></div>
    <div class="story-nav"><button class="act" data-step="${back}">← Back</button>${count ? `<button class="act" data-step="${nextStep(c, 0, told)}">Tell it again</button>` : ""}</div>
    <p class="legend">Highlighted on the tree: ${curse ? "the bloodline, the crimes and the curses that carry it forward" : "everyone in the story and the links between them"}${src==="all" ? "" : `, as ${by} records them`}.</p>`;
  shell(`<div class="card-top"><span class="greek">${curse ? "Ἀρά" : "Μῦθος"}</span><button class="close" data-close>Close</button></div>${body}`);
  card.querySelectorAll("[data-step]").forEach(b => b.onclick = () => openCurse(key, +b.dataset.step));
  card.querySelectorAll(".story-src [data-src]").forEach(b => b.onclick = () => { state.pickOpen = false; setSource(b.dataset.src); });
  card.querySelectorAll("[data-read]").forEach(b => b.onclick = () => setSource(b.dataset.read));
  card.querySelectorAll(".story-ver").forEach(d => d.addEventListener("toggle", () => { if (d.open && !wide()) setFull(true); }));
  card.querySelectorAll(".story-src-toggle").forEach(b => b.onclick = () => { state.pickOpen = !state.pickOpen; openCurse(key, step); });
  apply(true);
  fitTo(step>=1 && step<=n ? [...reveal(c, step, told).focus] : [...c.nodes], true);
}
document.addEventListener("keydown", ev => {
  if (state.mode!=="curse" || ev.target.closest("input, select, textarea")) return;
  const c = STORIES[state.curseKey], told = toldSteps(c);
  if (ev.key==="ArrowRight" && state.step<=c.steps.length && told.some(Boolean)) openCurse(state.curseKey, nextStep(c, state.step, told));
  if (ev.key==="ArrowLeft" && state.step>0) openCurse(state.curseKey, prevStep(c, state.step, told));
});

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
