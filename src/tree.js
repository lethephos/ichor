/* The tree itself: stars and links drawn with D3, row names, pan and zoom,
   and `apply`, which shows the tree as the present choices tell it. */
import * as d3 from "d3";
import {N, ROWY, ROWB, W, DIVIDERS, GENS, HOUSES, E, P, OLY, STORIES} from "./data.js";
import "./theme.js";
import {state, wide, edgeVisible, samePair, attested} from "./state.js";
import {storyTimer} from "./camera.js";
import {resetMode, foldHeader} from "./sheet.js";
import {hideHint, syncTools} from "./controls.js";
import {reveal, STORY_TYPES} from "./stories.js";
import {nodeClick, syncUrl} from "./main.js";

/* ---------- graph ---------- */
export const svg = d3.select("#graph");
const defs = svg.append("defs");
["curse","transform"].forEach(id => {
  defs.append("marker").attr("id","arr-"+id).attr("viewBox","0 0 10 10").attr("refX",8).attr("refY",5)
    .attr("markerWidth",6).attr("markerHeight",6).attr("orient","auto-start-reverse")
    .append("path").attr("class","arrow-"+id).attr("d","M0,0 L10,5 L0,10 z");
});
export const root = svg.append("g");
const gGrid = root.append("g");
const gEdges = root.append("g");
const gNodes = root.append("g");

const RN = 8;
// the star-atlas mockup (?look=atlas): figures drawn as Hevelius drew stars
const LOOK = document.documentElement.dataset.look;
export const ATLAS = LOOK === "atlas" || LOOK === "stars";
const starPath = (n, R, r) => Array.from({length: n*2}, (_, i) => { const a = Math.PI*i/n - Math.PI/2, q = i%2 ? r : R; return `${i?"L":"M"}${(q*Math.cos(a)).toFixed(2)},${(q*Math.sin(a)).toFixed(2)}`; }).join("") + "Z";
// a bright star is a dark seal with a jagged rim and a pale star inside; a faint one a small six-rayed star
export const hevStar = (R, cls = "") => LOOK === "stars"
  // modern: a bright star is a fine ring round a four-pointed sparkle, a faint one the sparkle alone
  ? (R >= 7 ? `<circle class="star-ring" r="${R}"/><path class="dot star ${cls}" d="${starPath(4, R*0.72, R*0.17)}"/>` : `<path class="dot star ${cls}" d="${starPath(4, R*1.05, R*0.24)}"/>`)
  : R >= 7
  ? `<path class="dot star ${cls}" d="${starPath(18, R, R*0.84)}"/><path class="star-in" d="${starPath(8, R*0.66, R*0.24)}"/>`
  : `<path class="dot star ${cls}" d="${starPath(6, R, R*0.42)}"/>`;
export const STAR = "M0,-6 L1.6,-1.6 L6,0 L1.6,1.6 L0,6 L-1.6,1.6 L-6,0 L-1.6,-1.6 Z";   // ambrosia: made immortal
function norm(x,y){ const l = Math.hypot(x,y)||1; return [x/l, y/l]; }
function edgePath(e){
  const a = N[e.from], b = N[e.to];
  if (e.type==="parent") {
    const my = (a.y + b.y)/2 + 6;
    // a child drawn above the parent (Dionysus, a god, over his mortal mother Semele) leaves from the top
    const up = b.y < a.y ? -1 : 1;
    return `M${a.x},${a.y+up*(RN+2)} C${a.x},${my} ${b.x},${my} ${b.x},${b.y-up*(RN+2)}`;
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
export let edgeSel, nodeSel;
/* The tree of the chosen family: rows, dividers and houses, then links, then figures. */
export function drawTree(){
  gGrid.selectAll("*").remove(); gEdges.selectAll("*").remove(); gNodes.selectAll("*").remove();
  if (LOOK === "stars") {
    // a star chart's graticule: faint meridians across the rows, and graduations on every rule (one dashed line each)
    const top = ROWY[0] - 70, bot = ROWB[ROWB.length-1] + 70;
    for (let x = 120; x < W; x += 240) gGrid.append("line").attr("class","meridian").attr("x1",x).attr("x2",x).attr("y1",top).attr("y2",bot);
    ROWY.forEach((y,i) => { if (i>0) { const yy = (ROWB[i-1]+y)/2+12; gGrid.append("line").attr("class","ticks").attr("x1",0).attr("x2",W).attr("y1",yy).attr("y2",yy); } });
    DIVIDERS.forEach(d => { const yy = (ROWB[d.before-1] + ROWY[d.before]) / 2 + 12; gGrid.append("line").attr("class","ticks major").attr("x1",0).attr("x2",W).attr("y1",yy).attr("y2",yy); });
  }
  ROWY.forEach((y,i) => {
    if (i>0) gGrid.append("line").attr("class","genrule").attr("x1",0).attr("x2",W).attr("y1",(ROWB[i-1]+y)/2+12).attr("y2",(ROWB[i-1]+y)/2+12);
  });
  // a divider is a stronger rule between two rows (e.g. where the gods end and mortals begin)
  const labels = GENS.map((g, i) => ({text: g, y: ROWY[i], yt: i ? (ROWB[i-1] + ROWY[i]) / 2 + 12 : ROWY[0] - 46, cls: "rl"}));
  DIVIDERS.forEach(d => {
    const y = (ROWB[d.before-1] + ROWY[d.before]) / 2 + 12;
    gGrid.append("line").attr("class","divider").attr("x1",0).attr("x2",W).attr("y1",y).attr("y2",y);
    labels.push({text: d.label, y, yt: y, cls: "rl rl-divider"});
  });
  // row names live in a column pinned to the left edge of the screen (see placeRowLabels)
  rowLabels.innerHTML = `<div class="rl-col"></div>` + labels.map(l => `<div class="${l.cls}" data-y="${l.y}" data-yt="${l.yt}">${l.text}</div>`).join("");
  HOUSES.forEach(h => gGrid.append("text").attr("class","house").attr("x",h.x).attr("y",h.y).attr("text-anchor","middle").text(h.label));

  edgeSel = gEdges.selectAll("g.e").data(E).join("g").attr("class", e => `e e-${e.type}`);
  edgeSel.each(function(e){
    const g = d3.select(this), d = edgePath(e);
    const p = g.append("path").attr("class","edge main").attr("d",d);
    if (e.type==="marriage") g.append("path").attr("class","edge inner").attr("d",d);
    if (e.type==="transform" || e.type==="curse") p.attr("marker-end",`url(#arr-${e.type})`);
  });

  nodeSel = gNodes.selectAll("g.node").data(P).join("g")
    .attr("class","node").attr("transform", d => `translate(${d.x},${d.y})`)
    .attr("tabindex",0).attr("role","button").attr("aria-label", d => d.name)
    .on("click", (ev,d) => { ev.stopPropagation(); nodeClick(d.id); })
    .on("keydown", (ev,d) => { if (ev.key==="Enter"||ev.key===" ") { ev.preventDefault(); nodeClick(d.id); } })
    // with a mouse, hovering a figure previews its links; touch keeps tap-to-open
    .on("pointerenter", (ev,d) => { if (ev.pointerType==="mouse") { state.hover = d.id; apply(150); } })
    .on("pointerleave", (ev,d) => { if (state.hover===d.id) { state.hover = null; apply(150); } });
  const deg = {}; if (ATLAS) E.forEach(e => { deg[e.from] = (deg[e.from]||0) + 1; deg[e.to] = (deg[e.to]||0) + 1; });
  nodeSel.each(function(d){
    const g = d3.select(this);
    if (ATLAS) {
      g.append("circle").attr("class","hit").attr("r",26);
      g.append("circle").attr("class","halo").attr("r",16);
      const R = (d.kind==="god" ? 7.5 : 5) + Math.min(deg[d.id]||0, 24) / 24 * 4.5;
      if (d.kind==="group") [[0,-5],[-5,3.5],[5,3.5]].forEach(([x,y]) => g.append("g").attr("transform",`translate(${x},${y})`).html(hevStar(4, "group")));
      else g.append("g").html(hevStar(d.kind==="nymph" ? R-1 : R, d.kind));
      if (d.transformation) g.append("path").attr("class","badge").attr("d","M0,-4 L4,0 L0,4 L-4,0 Z").attr("transform",`translate(${R+6},${-R-2})`);
      if (d.immortal) g.append("path").attr("class","imm").attr("d",STAR).attr("transform",`translate(${-R-6},${-R-2})`).append("title").text("Made immortal in some sources");
      if (OLY[d.id]) g.append("path").attr("class","oly " + OLY[d.id].in).attr("d","M0,-4 L4.5,3.5 L-4.5,3.5 Z").attr("transform",`translate(${-R-6},${-R-2})`).append("title").text(OLY[d.id].in==="all" ? "One of the Twelve Olympians" : "One of the Twelve in some lists");
      const caps = d.kind==="god" || d.kind==="group";
      g.append("text").attr("class","lbl" + (caps?" god":"")).attr("text-anchor","middle").attr("y", R + 18).text(d.name);
      return;
    }
    g.append("circle").attr("class","hit").attr("r",26);
    g.append("circle").attr("class","halo").attr("r",16);
    if (d.kind==="god" || d.kind==="group") g.append("circle").attr("class","ring").attr("r",RN+4);
    // a group (the Muses, the Fates…) is one medallion holding three small ones
    if (d.kind==="group") [[0,-3.6],[-3.6,2.6],[3.6,2.6]].forEach(([x,y]) => g.append("circle").attr("class","dot group").attr("cx",x).attr("cy",y).attr("r",3.4));
    else g.append("circle").attr("class","dot " + d.kind).attr("r", d.kind==="nymph" ? RN-2 : RN);
    if (d.transformation) g.append("path").attr("class","badge").attr("d","M0,-4.5 L4.5,0 L0,4.5 L-4.5,0 Z")
        .attr("transform",`translate(${RN+7},${-RN-3})`);
    // made immortal: a small gold star at the upper left (only mortals have one, so it never meets the peak)
    if (d.immortal) g.append("path").attr("class","imm").attr("d",STAR)
        .attr("transform",`translate(${-RN-7},${-RN-3})`)
        .append("title").text("Made immortal in some sources");
    // Olympus: a small peak at the upper left; hollow where only some lists count the god
    if (OLY[d.id]) g.append("path").attr("class","oly " + OLY[d.id].in).attr("d","M0,-4 L4.5,3.5 L-4.5,3.5 Z")
        .attr("transform",`translate(${-RN-7},${-RN-3})`)
        .append("title").text(OLY[d.id].in==="all" ? "One of the Twelve Olympians" : "One of the Twelve in some lists");
    const ringed = d.kind==="god" || d.kind==="group";
    g.append("text").attr("class","lbl" + (ringed?" god":"")).attr("text-anchor","middle").attr("y", ringed ? 34 : 30).text(d.name);
  });
}
svg.on("click", () => { if (state.mode==="node") resetMode(); });

/* Row names stay readable at any zoom: they sit in a column on the left of the screen,
   at a fixed size, and only follow their row up and down. */
export const rowLabels = document.getElementById("rowLabels");
/* On phones there is no column: each name is a small tag at the left edge, just under its row's top rule
   (a divider's name sits just above its line), so the tree keeps the whole width. */
function placeRowLabels(t){
  const w = wide();
  // on phones a name is fixed at the start of its line and moves with the tree, so it shows only when that part is in view;
  // when the tree is zoomed far out the rows are too close for names, so they hide
  const left = w ? "" : `${t.x + 8}px`, off = !w && t.k < 0.32;
  rowLabels.classList.toggle("off", off);
  rowLabels.querySelectorAll("[data-y]").forEach(el => { el.style.top = `${t.y + (w ? el.dataset.y : el.dataset.yt) * t.k}px`; el.style.left = left; });
}
let panned = false;
export const zoom = d3.zoom().scaleExtent([0.2, 3])
  .on("zoom", ev => { root.attr("transform", ev.transform); placeRowLabels(ev.transform); if (ev.sourceEvent) { hideHint(); panned = true; clearTimeout(storyTimer); } })
  // on phones the header folds away once the reader moves the tree, as it does while a card is open
  .on("end", () => { if (panned && !wide()) foldHeader(true); panned = false; });
svg.call(zoom).on("dblclick.zoom", null);
export const graphEl = document.getElementById("graph");
/* animate: false for an instant change, true for the usual fade, or a duration in ms */
export function apply(animate){
  const dur = animate===true ? 380 : animate || 0;
  const hover = state.mode!=="curse" && state.mode!=="thread" ? state.hover : null;
  const sel = hover || (state.mode==="node" ? state.sel : null);
  const curse = state.mode==="curse" ? STORIES[state.curseKey] : null;
  const story = curse && state.step>=1 && state.step<=curse.steps.length ? reveal(curse, state.step) : null;
  const path = state.mode==="thread" ? state.path : null;
  const demo = (state.mode==="about" || state.mode==="tour") && state.demo && !state.demo.missing ? state.demo : null;
  const pathEdges = new Set(path ? path.edges : []);
  const pathNodes = new Set(path ? path.nodes : []);
  const visible = new Set();
  edgeSel.each(function(e){
    let vis = edgeVisible(e);
    let inCurse = curse && STORY_TYPES.includes(e.type) && curse.pairs.some(p => samePair(e,p)) && attested(e);
    if (story && inCurse && (!(story.shown.has(e.from) && story.shown.has(e.to)) || story.ahead.has(e.i))) inCurse = false;   // not told yet
    const isAlt = !!(story && story.alt.has(e.i));
    if (isAlt) inCurse = true;
    const inPath = pathEdges.has(e.i) || !!(demo && demo.edges.has(e.i) && attested(e));
    if (inPath) vis = true;
    const hot = (sel && (e.from===sel || e.to===sel)) || (inCurse && (!story || story.now.has(e.from) || story.now.has(e.to))) || inPath;
    // at rest, feuds and affairs stay faint so the bloodlines read first; they light up when selected
    let op = (e.type==="curse"||e.type==="transform") ? 0.9 : (e.type==="feud"||e.type==="affair") ? 0.3 : 0.55;
    if (sel || curse || path || demo) op = hot ? 1 : inCurse ? 0.45 : story ? 0.03 : 0.06;
    if (!vis && !inCurse) op = 0;
    if (vis) { visible.add(e.from); visible.add(e.to); }
    const g = d3.select(this).classed("thread", inPath && !demo).classed("alt", isAlt).classed("hot", !!(hot && (sel || curse || path || demo)));
    (dur ? g.transition().duration(dur) : g).style("opacity", op);
    g.select(".main").attr("stroke-width", inPath && !demo ? 3 : inPath ? BASE[e.type]*2 : hot ? BASE[e.type]*1.7 : BASE[e.type]);
  });
  const neigh = new Set();
  if (sel) { neigh.add(sel); E.forEach(e => { if (edgeVisible(e) && (e.from===sel||e.to===sel)) { neigh.add(e.from); neigh.add(e.to); } }); }
  nodeSel.classed("sel", d => d.id===sel || (state.mode==="node" && d.id===state.sel)).classed("ends", d => !!(demo && demo.nodes.has(d.id)) || !!(path && (d.id===path.nodes[0] || d.id===path.nodes[path.nodes.length-1])) || !!(story && story.now.has(d.id)));
  const nOp = d => {
    if (sel) return neigh.has(d.id) ? 1 : 0.2;
    if (story) return story.now.has(d.id) ? 1 : story.shown.has(d.id) ? 0.8 : 0.08;
    if (curse) return curse.nodes.has(d.id) ? 1 : 0.18;
    if (path) return pathNodes.has(d.id) ? 1 : 0.18;
    if (demo) return demo.nodes.has(d.id) ? 1 : 0.15;
    if (state.src!=="all") return (visible.has(d.id) || (d.transformation && d.transformation.sources.includes(state.src))) ? 1 : 0.18;
    return 1;
  };
  (dur ? nodeSel.transition().duration(dur) : nodeSel).style("opacity", nOp);
  nodeSel.selectAll(".imm").style("display", d => state.src==="all" || d.immortal.sources.includes(state.src) ? null : "none");
  nodeSel.selectAll(".badge").style("display", d => state.layers.transform && (state.src==="all" || d.transformation.sources.includes(state.src)) ? null : "none");
  syncTools();
  syncUrl();
}
