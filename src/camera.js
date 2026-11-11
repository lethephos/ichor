/* The camera: fitting figures into the free part of the screen, the opening view,
   and the glides of a story step. */
import * as d3 from "d3";
import {N, P, W, H, FOCUS, E, ROWY} from "./data.js";
import {graphEl, rowLabels, svg, zoom} from "./tree.js";
import {wide} from "./state.js";
import {card, foldHeader} from "./sheet.js";

const viewW = () => graphEl.clientWidth - (wide() && card.classList.contains("open") ? 420 : 0);
const toolsEl = document.getElementById("tools");
const dockEl = document.getElementById("dock");
export const viewH = () => {
  if (wide()) return Math.max(120, graphEl.clientHeight - dockEl.offsetHeight - 26);
  const covered = Math.max(card.classList.contains("open") ? card.offsetHeight : 0, toolsEl.offsetHeight + 12);
  return Math.max(120, graphEl.clientHeight - covered);
};
// the width of the row-name column, which the tree should not start under
const inset = () => rowLabels.querySelector(".rl-col")?.offsetWidth || 0;
function fitBox(ids){
  const pts = ids ? ids.map(id => N[id]) : P;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = Math.min(...xs) - 80, x1 = Math.max(...xs) + 80, y0 = Math.min(...ys) - 60, y1 = Math.max(...ys) + 60;
  const left = inset(), w = viewW() - left, h = viewH();
  return {x0, x1, y0, y1, left, w, h, k: Math.min(1.1, Math.min(w/(x1-x0), h/(y1-y0)) * 0.95)};
}
export const fitScale = ids => fitBox(ids).k;
/* animate: true for the usual glide, or a duration in ms */
/* core: on phones, when ids would only fit too small to read, the camera frames just these (a story step's own figures,
   without the people at the other end of its links), so they come out as large as they can while all staying in view */
export const MIN_PHONE_K = 0.4;
export function fitTo(ids, animate, core){
  let box = fitBox(ids);
  if (core && !wide() && box.k < MIN_PHONE_K) box = fitBox(core);
  const {x0, x1, y0, y1, left, w, h, k} = box;
  const t = d3.zoomIdentity.translate(left + (w-(x1-x0)*k)/2 - x0*k, (h-(y1-y0)*k)/2 - y0*k).scale(k);
  (animate ? svg.transition().duration(animate===true ? 600 : animate) : svg).call(zoom.transform, t);
}
export function focusOn(id){
  const w = graphEl.clientWidth, h = graphEl.clientHeight;
  const cur = d3.zoomTransform(graphEl);
  const k = Math.max(cur.k, Math.min(1, w/700));
  const p = N[id];
  const tx = wide() ? (w-420)/2 : w/2, ty = viewH()/2;
  svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.translate(tx-p.x*k, ty-p.y*k).scale(k));
}
const fitBtn = document.getElementById("fitFloat");
fitBtn.onclick = () => { foldHeader(false); fitTo(null, true); };
// the theme switch and the whole-tree button travel together: on phones they join the line of pills,
// on wide screens they sit in the corner of the tree
const viewTools = document.getElementById("viewTools");
function placeFit(){
  const home = wide() ? document.getElementById("stage") : document.querySelector(".controls");
  if (viewTools.parentElement !== home) home.appendChild(viewTools);
}
placeFit(); addEventListener("resize", placeFit);
export function initialView(){
  const w = graphEl.clientWidth, h = graphEl.clientHeight;
  if (Math.min((w - inset())/W, h/H) >= 0.5) { fitTo(null, false); return; }
  const k = 0.55, f = N[FOCUS], left = inset(), cx = left + (w - left)/2;
  // a family whose focus is on its first row opens at the top (the whole tree, on the first gods);
  // otherwise the view is centred on the focus, halfway down the tree
  if (f.row === 0) {
    // centred on the focus and the partners beside it (Gaia and Uranus)
    const pair = [f, ...E.filter(e => e.type==="marriage" && (e.from===f.id || e.to===f.id))
      .map(e => N[e.from===f.id ? e.to : e.from]).filter(p => p.row === 0)];
    const x = pair.reduce((s, p) => s + p.x, 0) / pair.length;
    svg.call(zoom.transform, d3.zoomIdentity.translate(cx - x*k, (wide() ? 110 : 30) - ROWY[0]*k).scale(k)); return;
  }
  const cy = (ROWY[0] + ROWY[ROWY.length-1]) / 2;
  svg.call(zoom.transform, d3.zoomIdentity.translate(cx - f.x*k, viewH()/2 - cy*k).scale(k));
}
/* A plain panel (Layers, Stories, Find, the thread) leaves the tree where it is, but on a phone the sheet can then cover every
   figure, leaving an empty band above it (after a family was framed whole, or the tree was moved). Then the nearest figures
   glide up into the band, so the reader always sees some of the tree. */
export function keepInView(){
  if (wide()) return;
  const t = d3.zoomTransform(graphEl), h = viewH(), w = graphEl.clientWidth;
  const sx = p => p.x*t.k + t.x, sy = p => p.y*t.k + t.y;
  const across = P.filter(p => sx(p) > 0 && sx(p) < w);
  if (!across.length || across.some(p => sy(p) > h * 0.1 && sy(p) < h * 0.75)) return;   // figures only at the edge of the band don’t count
  // the figure nearest the band: below it, it comes to the band's upper part (its rows follow under it); above, to the lower
  const gap = p => sy(p) > h * 0.75 ? sy(p) - h * 0.75 : h * 0.1 - sy(p);
  const near = across.reduce((a, p) => gap(p) < gap(a) ? p : a);
  const dy = (sy(near) > h * 0.75 ? h * 0.35 : h * 0.65) - sy(near);
  svg.interrupt().transition().duration(400).call(zoom.transform, d3.zoomIdentity.translate(t.x, t.y + dy).scale(t.k));
}
/* On phones a step whose own figures sit far apart on a long row (the fall of Troy) would come out too small to read:
   the camera shows them a group at a time, in the order the step names them, gliding from one group to the next. */
export const STORY_GLIDE_K = 0.3;
export let storyTimer;
export function clusters(ids){
  const byX = [...ids].sort((a, b) => N[a].x - N[b].x), groups = [];
  byX.forEach(id => {
    const g = groups[groups.length-1];
    if (g && fitScale([...g, id]) >= MIN_PHONE_K) g.push(id); else groups.push([id]);
  });
  const first = g => Math.min(...g.map(id => ids.indexOf(id)));
  return groups.sort((a, b) => first(a) - first(b));
}
export function glideThrough(parts, still, i = 0){
  fitTo(parts[i], i ? 1400 : true);
  if (i + 1 < parts.length) storyTimer = setTimeout(() => { if (still()) glideThrough(parts, still, i + 1); }, i ? 2600 : 2000);
}
