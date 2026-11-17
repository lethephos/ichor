/* The sky map: the figures the myths set among the stars, where they stand in the sky.
   A planisphere seen from the earth, the north celestial pole at the centre, down to 65° south:
   every star to the fifth magnitude, the constellation figures, and a name on each one that holds a figure.
   It is a view of its own over the tree; a tap on a name opens that figure’s card. */
import * as d3 from "d3";
import "./thread.js";
import {ALL_PEOPLE, FAMILY, FAMILIES, N} from "./data.js";
import {state, wide, inSky} from "./state.js";
import {resetMode} from "./sheet.js";
import {select, moveToFamily, syncUrl} from "./main.js";
import skyUrl from "../data/sky.json?url";
import ART from "../data/skyart.json";

const stage = document.getElementById("stage");
const view = document.createElement("div");
view.id = "skyView"; view.hidden = true;
view.innerHTML = `<svg id="skyMap" role="img" aria-label="Map of the sky with the constellations of Greek myth"></svg>
  <div class="sky-head"><h2>The sky</h2><p>The figures the myths set among the stars, where they stand. Tap a name to open its card.</p>
    <button class="act" id="skyClose" type="button">← The tree</button></div>`;
stage.appendChild(view);
const svg = d3.select("#skyMap"), root = svg.append("g");

/* 1° is PX wide on the map; the pole is at 0,0 and the rim at 65° south */
const PX = 6, SOUTH = -65, RIM = (90 - SOUTH) * PX;
// seen from the earth, right ascension runs clockwise round the northern pole
const at = ([ra, dec]) => { const r = (90 - dec) * PX, a = ra * Math.PI / 180; return [r * Math.sin(a), -r * Math.cos(a)]; };
// a constellation as the cards name it → its figure in the star data; the Pleiades are a cluster, not one of the 88
const PLEIADES = [56.75, 24.12];
const mean = pts => [d3.mean(pts, p => p[0]), d3.mean(pts, p => p[1])];

let drawn = false, loading = null, starSel, figSel, lineSel, artSel;
function load(){
  loading ||= fetch(skyUrl).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(draw).catch(() => { loading = null; });
  return loading;
}
function draw(sky){
  if (drawn) return;
  drawn = true;
  const code = Object.fromEntries(Object.entries(sky.names).map(([k, v]) => [v.name, k]));
  const figures = d3.groups(ALL_PEOPLE.filter(p => p.sky), p => p.sky.constellation)
    .map(([name, people]) => ({name, people, code: code[name], xy: mean((code[name] ? sky.lines[code[name]].flat() : [PLEIADES]).filter(p => p[1] >= SOUTH).map(at))}));   // the middle of the figure as drawn: right ascension wraps at 0h
  const held = new Set(figures.map(f => f.code));

  const grid = root.append("g").attr("class", "sky-grid");
  [60, 30, 0, -30].forEach(d => grid.append("circle").attr("r", (90 - d) * PX).classed("equator", d === 0));
  d3.range(0, 360, 30).forEach(ra => { const [x1, y1] = at([ra, 80]), [x2, y2] = at([ra, SOUTH]); grid.append("line").attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2); });
  grid.append("circle").attr("class", "rim").attr("r", RIM);
  grid.append("circle").attr("class", "rim").attr("r", RIM + 26);
  d3.range(0, 24).forEach(h => {
    const a = h * 15 * Math.PI / 180, r = RIM + 13;
    grid.append("text").attr("class", "sky-hour").attr("x", r * Math.sin(a)).attr("y", -r * Math.cos(a)).attr("dy", "0.35em").attr("text-anchor", "middle").text(`${h}h`);
  });

  // the figures as the old atlases drew them, faint under the stars
  // a drawing is fetched only when the sky is close enough to show it and it is near the screen
  artSel = root.append("g").attr("class", "sky-art").selectAll("image").data(Object.entries(ART)).join("image")
    .attr("width", ([, a]) => a.size[0]).attr("height", ([, a]) => a.size[1])
    .attr("transform", ([, a]) => `matrix(${a.matrix})`);

  const path = d3.line();
  // a figure’s line breaks where it dips below the rim
  const inside = l => l.reduce((parts, p) => { if (p[1] < SOUTH) parts.push([]); else parts[parts.length - 1].push(at(p)); return parts; }, [[]]).filter(p => p.length > 1);
  lineSel = root.append("g").selectAll("g").data(Object.entries(sky.lines)).join("g").attr("class", ([k]) => "sky-lines" + (held.has(k) ? " held" : ""));
  lineSel.each(function([, lines]){ lines.flatMap(inside).forEach(p => d3.select(this).append("path").attr("d", path(p))); });

  starSel = root.append("g").attr("class", "sky-stars").selectAll("circle").data(sky.stars.filter(s => s[1] >= SOUTH)).join("circle")
    .attr("cx", s => at(s)[0]).attr("cy", s => at(s)[1]);

  figSel = root.append("g").selectAll("g").data(figures).join("g").attr("class", "sky-fig")
    .attr("transform", f => `translate(${f.xy})`);
  figSel.each(function(f){
    const g = d3.select(this).append("g").attr("class", "sky-label");
    f.people.forEach((p, i) => g.append("text").datum(p).attr("class", "sky-who").attr("text-anchor", "middle").attr("y", i * 19).attr("tabindex", 0).attr("role", "button").text(p.name)
      .on("click", ev => { ev.stopPropagation(); open(p.id); })
      .on("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(p.id); } }));
    g.append("text").datum(f).attr("class", "sky-what").attr("text-anchor", "middle").attr("y", f.people.length * 19 - 3).text(f.name);
  });
  svg.call(zoom);
  frame(false);
  syncSky();
}

const zoom = d3.zoom().scaleExtent([0.12, 5]).on("zoom", ev => {
  const k = ev.transform.k;
  root.attr("transform", ev.transform);
  // names keep their size on screen whatever the zoom; stars grow a little as the sky comes closer
  figSel.select(".sky-label").attr("transform", `scale(${1 / k})`);
  starSel.attr("r", s => Math.max(0.55, (5.6 - s[2]) * 0.62) / Math.pow(k, 0.55));
  view.classList.toggle("far", k < 0.42);
  // the drawings wait until the sky comes close: from afar a figure is only a smudge
  const art = Math.max(0, Math.min(1, (k - (wide() ? 0.55 : 0.42)) / (wide() ? 0.4 : 0.3)));
  view.style.setProperty("--art", art.toFixed(2));
  if (art > 0) artSel.filter(function () { return !this.hasAttribute("href"); }).each(function ([, a]) {
    const m = a.matrix, [w, h] = a.size, [x, y] = ev.transform.apply([m[0] * w / 2 + m[2] * h / 2 + m[4], m[1] * w / 2 + m[3] * h / 2 + m[5]]);
    const pad = 110 * k;
    if (x > -pad && x < view.clientWidth + pad && y > -pad && y < view.clientHeight + pad) this.setAttribute("href", `/sky/${a.file}`);
  });
}).on("end", uncrowd);
/* Where names would run into each other, as on the whole sky, the later ones wait until the sky comes closer;
   the open figure and the constellations a source keeps come first */
function uncrowd(){
  if (!drawn || view.hidden) return;
  const kept = [], first = f => (f.people.some(p => state.sel === p.id) ? 0 : 2) + (f.people.some(inSky) ? 0 : 1);
  figSel.classed("crowded", false).sort((a, b) => first(a) - first(b)).each(function(){
    const b = this.querySelector(".sky-label").getBoundingClientRect();
    const hit = kept.some(k => b.left < k.right + 4 && b.right > k.left - 4 && b.top < k.bottom + 2 && b.bottom > k.top - 2);
    if (hit) this.classList.add("crowded"); else kept.push(b);
  });
}
const size = () => [view.clientWidth - (wide() && document.getElementById("card").classList.contains("open") ? 420 : 0), view.clientHeight];
function glide(t, animate){ (animate ? svg.transition().duration(600) : svg).call(zoom.transform, t); }
/* The opening view: near enough to read the names, on Perseus, Andromeda and her parents, the family that is in the sky together */
function frame(animate){
  const [w, h] = size(), k = wide() ? 0.8 : 0.5, [x, y] = at([15, 48]);
  glide(d3.zoomIdentity.translate(w / 2 - x * k, h / 2 - y * k).scale(k), animate);
}
function whole(){
  const [w, h] = size(), k = Math.min(w, h) / (2 * RIM + 90);
  glide(d3.zoomIdentity.translate(w / 2, h / 2).scale(k), true);
}
/* A name opens its figure’s card; the sky turns to bring that constellation into the free part of the screen */
function open(id){
  select(id, false);
  const f = figSel.data().find(f => f.people.some(p => p.id === id));
  if (!f) return;
  requestAnimationFrame(() => {
    const [w, h] = size(), k = Math.max(d3.zoomTransform(svg.node()).k, wide() ? 0.8 : 0.6), [x, y] = f.xy;
    glide(d3.zoomIdentity.translate(w / 2 - x * k, (wide() ? h / 2 : h * 0.22) - y * k).scale(k), true);
  });
}

const skyBtns = () => document.querySelectorAll("[data-view='sky']");
export function openSky(){
  if (state.view === "sky") return;
  if (state.mode) resetMode();
  if (FAMILY.id !== FAMILIES[0].id) moveToFamily(FAMILIES[0].id);   // the sky holds figures from every family
  state.view = "sky";
  view.hidden = false; document.body.classList.add("sky-view");
  // on phones the way back sits under the two buttons at the upper right, centred on the line between them
  const head = view.querySelector(".sky-head"), seam = document.getElementById("fitFloat").getBoundingClientRect().left;
  head.style.right = wide() ? "" : `${Math.max(innerWidth - seam, head.offsetWidth / 2 + 1)}px`;
  load().then(() => { if (drawn) frame(false); });
  syncSky(); syncUrl();
}
export function closeSky(){
  if (state.view !== "sky") return;
  state.view = null;
  view.hidden = true; document.body.classList.remove("sky-view");
  syncSky(); syncUrl();
}
/* Called whenever the tree is shown anew: the sky follows the source and the open card, and steps aside
   for what belongs to the tree (a story, the thread, the Guide, another family). */
export function syncSky(){
  if (state.view === "sky" && ((state.mode && state.mode !== "node" && state.mode !== "layers") || FAMILY.id !== FAMILIES[0].id)) return closeSky();
  skyBtns().forEach(b => b.setAttribute("aria-pressed", state.view === "sky"));
  if (!drawn || state.view !== "sky") return;
  figSel.classed("off", f => !f.people.some(inSky));
  figSel.selectAll(".sky-who").classed("off", p => !inSky(p)).classed("sel", p => state.mode === "node" && state.sel === p.id);
  const lit = new Set(figSel.data().filter(f => f.people.some(inSky)).map(f => f.code));
  lineSel.classed("off", ([k]) => !lit.has(k));
  const open = state.mode === "node" && figSel.data().find(f => f.people.some(p => p.id === state.sel));
  artSel.classed("off", ([k]) => !lit.has(k)).classed("sel", ([k]) => !!open && open.code === k);
  uncrowd();
}
document.getElementById("skyClose").onclick = closeSky;
document.getElementById("fitFloat").addEventListener("click", () => { if (state.view === "sky" && drawn) whole(); });
skyBtns().forEach(b => b.onclick = () => state.view === "sky" ? closeSky() : openSky());
addEventListener("keydown", ev => { if (ev.key === "Escape" && state.view === "sky" && !state.mode) closeSky(); });
