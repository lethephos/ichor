/* Ariadne’s thread: the shortest path between two figures, as the chosen source allows. */
import {P, E, SRC, SRC_ALL_LABEL} from "./data.js";
import "./guide.js";
import {state, attested, named} from "./state.js";
import {apply} from "./tree.js";
import {keepInView, fitTo} from "./camera.js";
import {shell, sentence, srcText} from "./sheet.js";
import {curseSel, threadBtn} from "./controls.js";

/* Ariadne’s thread */
export function openThread(){
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
  keepInView();
}
export function shortestPath(a, b){
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
export function runThread(a, b, silent){
  state.threadEnds = [a, b];
  const out = document.getElementById("tOut");
  if (a===b) { if (out) out.innerHTML = `<p class="card-story">Pick two different figures.</p>`; return; }
  const res = shortestPath(a, b);
  if (!res) {
    state.path = null; apply(true);
    if (out) out.innerHTML = `<p class="card-story">In ${state.src==="all" ? "these sources" : SRC[state.src]}, no thread connects ${named(a)} and ${named(b)}. Try “${SRC_ALL_LABEL}”.</p>`;
    return;
  }
  state.path = {nodes:res.nodes, edges:res.edges.map(e => e.i)};
  if (out) out.innerHTML = `
    <div class="sec"><h3>${res.edges.length} ${res.edges.length===1?"link":"links"} apart${state.src==="all"?"":`, in ${SRC[state.src]}`}</h3>
    <ol class="thread-steps">${res.edges.map(e => `<li>${sentence(e)} ${srcText(e.sources)}</li>`).join("")}</ol></div>`;
  apply(true);
  if (!silent) fitTo(res.nodes, true);
}
