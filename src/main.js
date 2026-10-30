import * as d3 from "d3";
import {SRC, SRC_FULL, SRC_NOTE, SRC_ALL_LABEL, ROWY, GENS, OX, W, H, P, N, E, CURSES} from "./data.js";

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
LAYERS.forEach(L => {
  const b = document.createElement("button");
  b.className = "toggle"; b.setAttribute("aria-pressed","true");
  b.innerHTML = `<svg viewBox="0 0 26 10" aria-hidden="true">${SAMPLE[L.k]}</svg>${L.label}`;
  b.onclick = () => { state.layers[L.k] = !state.layers[L.k]; b.setAttribute("aria-pressed", state.layers[L.k]); apply(true); };
  layerRow.appendChild(b);
});
const curseSel = document.getElementById("curseSel");
Object.values(CURSES).forEach(c => {
  const o = document.createElement("option"); o.value = c.id; o.textContent = c.title; curseSel.appendChild(o);
});
curseSel.onchange = () => { if (curseSel.value) openCurse(curseSel.value); else resetMode(); };
const threadBtn = document.getElementById("threadBtn");
threadBtn.onclick = () => state.mode==="thread" ? resetMode() : openThread();
const jump = document.getElementById("jump");
[...P].sort((a,b) => a.name.localeCompare(b.name)).forEach(p => {
  const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; jump.appendChild(o);
});
jump.onchange = () => { if (jump.value) { select(jump.value, true); jump.value = ""; } };

/* ---------- graph ---------- */
const svg = d3.select("#graph");
const defs = svg.append("defs");
[["curse","var(--curse)"],["transform","var(--transform)"]].forEach(([id,c]) => {
  defs.append("marker").attr("id","arr-"+id).attr("viewBox","0 0 10 10").attr("refX",8).attr("refY",5)
    .attr("markerWidth",6).attr("markerHeight",6).attr("orient","auto-start-reverse")
    .append("path").attr("d","M0,0 L10,5 L0,10 z").style("fill",c);
});
const root = svg.append("g");
const gGrid = root.append("g");
const gEdges = root.append("g");
const gNodes = root.append("g");

ROWY.forEach((y,i) => {
  gGrid.append("text").attr("class","gen").attr("x",0).attr("y",y+5).text(GENS[i]);
  if (i>0) gGrid.append("line").attr("class","genrule").attr("x1",0).attr("x2",W).attr("y1",(ROWY[i-1]+y)/2+12).attr("y2",(ROWY[i-1]+y)/2+12);
});
gGrid.append("text").attr("class","house").attr("x",OX-470).attr("y",ROWY[1]+8).attr("text-anchor","middle").text("House of Labdacus");
gGrid.append("text").attr("class","house").attr("x",OX+430).attr("y",ROWY[1]+60).attr("text-anchor","middle").text("House of Atreus");

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
const edgeSel = gEdges.selectAll("g.e").data(E).join("g").attr("class","e");
edgeSel.each(function(e){
  const g = d3.select(this), d = edgePath(e);
  if (e.type==="marriage") {
    g.append("path").attr("class","edge main").attr("d",d).style("stroke","var(--line)");
    g.append("path").attr("class","edge inner").attr("d",d).style("stroke","var(--bg)").attr("stroke-width",1.3);
  } else {
    const p = g.append("path").attr("class","edge main").attr("d",d);
    if (e.type==="parent") p.style("stroke","var(--line)");
    if (e.type==="affair") p.style("stroke","var(--line)").attr("stroke-dasharray","5 4");
    if (e.type==="feud") p.style("stroke","var(--line)").attr("stroke-dasharray","9 3 1.5 3");
    if (e.type==="transform") p.style("stroke","var(--transform)").attr("stroke-dasharray","1 5").attr("stroke-linecap","round").attr("marker-end","url(#arr-transform)");
    if (e.type==="curse") p.style("stroke","var(--curse)").attr("marker-end","url(#arr-curse)");
  }
});

const nodeSel = gNodes.selectAll("g.node").data(P).join("g")
  .attr("class","node").attr("transform", d => `translate(${d.x},${d.y})`)
  .attr("tabindex",0).attr("role","button").attr("aria-label", d => d.name)
  .on("click", (ev,d) => { ev.stopPropagation(); nodeClick(d.id); })
  .on("keydown", (ev,d) => { if (ev.key==="Enter"||ev.key===" ") { ev.preventDefault(); nodeClick(d.id); } });
nodeSel.each(function(d){
  const g = d3.select(this);
  g.append("circle").attr("r",26).style("fill","transparent");
  g.append("circle").attr("class","halo").attr("r",16);
  if (d.kind==="god") {
    g.append("circle").attr("r",RN+4).style("fill","none").style("stroke","var(--figure)").attr("stroke-width",1);
    g.append("circle").attr("r",RN).style("fill","var(--figure)");
  } else if (d.kind==="other-cycle") {
    g.append("circle").attr("r",RN).style("fill","var(--bg)").style("stroke","var(--figure)").attr("stroke-width",1.3).attr("stroke-dasharray","2.5 2.5");
  } else if (d.kind==="nymph") {
    g.append("circle").attr("r",RN-2).style("fill","var(--figure)");
  } else {
    g.append("circle").attr("r",RN).style("fill","var(--figure)");
  }
  if (d.transformation) g.append("path").attr("class","badge").attr("d","M0,-4.5 L4.5,0 L0,4.5 L-4.5,0 Z")
      .attr("transform",`translate(${RN+7},${-RN-3})`).style("fill","var(--transform)");
  g.append("text").attr("class","lbl" + (d.kind==="god"?" god":"")).attr("text-anchor","middle").attr("y", d.kind==="god" ? 34 : 30).text(d.name);
});
svg.on("click", () => { if (state.mode==="node") resetMode(); });

const zoom = d3.zoom().scaleExtent([0.2, 3]).on("zoom", ev => root.attr("transform", ev.transform));
svg.call(zoom).on("dblclick.zoom", null);
const graphEl = document.getElementById("graph");
const wide = () => window.innerWidth >= 900;
function fitTo(ids, animate){
  const pts = ids ? ids.map(id => N[id]) : P;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x0 = Math.min(...xs) - (ids?80:OX), x1 = Math.max(...xs) + 80, y0 = Math.min(...ys) - 60, y1 = Math.max(...ys) + 60;
  const w = graphEl.clientWidth - (wide() ? 420 : 0), h = wide() ? graphEl.clientHeight : graphEl.clientHeight * (ids ? 0.42 : 1);
  const k = Math.min(1.1, Math.min(w/(x1-x0), h/(y1-y0)) * 0.95);
  const t = d3.zoomIdentity.translate((w-(x1-x0)*k)/2 - x0*k, (h-(y1-y0)*k)/2 - y0*k).scale(k);
  (animate ? svg.transition().duration(600) : svg).call(zoom.transform, t);
}
function focusOn(id){
  const w = graphEl.clientWidth, h = graphEl.clientHeight;
  const cur = d3.zoomTransform(graphEl);
  const k = Math.max(cur.k, Math.min(1, w/700));
  const p = N[id];
  const tx = wide() ? (w-420)/2 : w/2, ty = wide() ? h/2 : h*0.3;
  svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.translate(tx-p.x*k, ty-p.y*k).scale(k));
}
document.getElementById("fitBtn").onclick = () => fitTo(null, true);
function initialView(){
  const w = graphEl.clientWidth, h = graphEl.clientHeight;
  if (Math.min(w/W, h/H) >= 0.5) { fitTo(null, false); return; }
  const k = 0.55;
  svg.call(zoom.transform, d3.zoomIdentity.translate(w/2 - (OX+380)*k, h/2 - 480*k).scale(k));
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
    let op = (e.type==="curse"||e.type==="transform") ? 0.9 : 0.55;
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
}

/* ---------- card ---------- */
const card = document.getElementById("card");
const srcText = src => `<span class="srcs">${src.map(s => state.src===s ? `<b>${SRC[s]}</b>` : SRC[s]).join(", ")}</span>`;
function sentence(e){
  const A = N[e.from].name, B = N[e.to].name;
  if (e.type==="parent") return `${A} is the ${N[e.from].gender==="f"?"mother":"father"} of ${B}${e.note?` (${e.note})`:""}.`;
  if (e.type==="marriage") return `${A} married ${B}${e.note?`, ${e.note}`:""}.`;
  return `${A} ${e.note}.`;
}
const relItem = (id, e, withSentence) => `<li><button class="rel" data-go="${id}">${N[id].name}</button>${srcText(e.sources)}${withSentence?`<span class="note">${sentence(e)}</span>`:(e.note?`<span class="note">${e.note}</span>`:"")}</li>`;
function shell(inner){
  card.innerHTML = inner;
  card.querySelectorAll("[data-close]").forEach(b => b.onclick = resetMode);
  card.querySelectorAll("[data-go]").forEach(b => b.onclick = () => select(b.dataset.go, true));
  card.classList.add("open"); card.scrollTop = 0;
}
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
    ${p.transformation ? `<div class="sec"><h3>Changed shape</h3><ul class="rels"><li><span class="rel" style="text-decoration:none;cursor:default">${p.transformation.text}</span>${srcText(p.transformation.sources)}</li></ul></div>` : ""}
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
  card.classList.remove("open"); apply(true);
}

/* curses */
function openCurse(key){
  const c = CURSES[key];
  state.mode = "curse"; state.curseKey = key; state.sel = null; state.path = null;
  threadBtn.setAttribute("aria-pressed","false");
  shell(`
    <div class="card-top"><span class="greek">Ἀρά</span><button class="close" data-close>Close</button></div>
    <h2 class="card-name" style="font-size:32px">${c.title}</h2>
    <p class="card-tag">${c.lead}</p>
    <div class="sec"><h3>Generation by generation</h3><ol class="steps">
      ${c.steps.map(({generation:g, figures:who, text:t}) => `<li><span class="g">${g}</span><div><div class="t">${t}</div><div style="margin-top:4px">${who.map(id => `<button class="rel" data-go="${id}" style="font-size:15px;margin-right:10px">${N[id].name}</button>`).join("")}</div></div></li>`).join("")}
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
    <h2 class="card-name" style="font-size:34px">Ariadne’s thread</h2>
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
