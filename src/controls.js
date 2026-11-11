/* The controls round the tree: source pills, layer toggles, the Stories list,
   the phone tools strip and the Layers panel. */
import {SRC_ALL_LABEL, SRC, SRC_FULL, sourceNote, STORIES} from "./data.js";
import {resetMode, shell, panelTop, card} from "./sheet.js";
import {state, wide, LAYERS, SAMPLE} from "./state.js";
import {apply, nodeSel} from "./tree.js";
import {keepInView} from "./camera.js";
import {openFind} from "./find.js";
import {renderNode} from "./figure.js";
import {openCurse, openCurses} from "./stories.js";
import {runThread, openThread} from "./thread.js";
import {openFamilies} from "./main.js";

/* ---------- controls ---------- */
const srcRow = document.getElementById("srcRow");
export const srcNote = document.getElementById("srcNote");
[["all",SRC_ALL_LABEL], ...Object.entries(SRC)].forEach(([k,label]) => {
  const b = document.createElement("button");
  b.className = "tab"; b.textContent = label; b.dataset.src = k;
  b.setAttribute("aria-pressed", k===state.src);
  if (k!=="all") b.title = SRC_FULL[k];
  b.onclick = () => setSource(k);
  srcRow.appendChild(b);
});
/* On phones the sources are one pill, “Source [All versions ▾]”, that opens a list, like the families. */
const srcBtn = document.getElementById("srcBtn"), srcMenu = document.getElementById("srcMenu"), srcName = document.getElementById("srcName");
srcMenu.innerHTML = [["all",SRC_ALL_LABEL], ...Object.entries(SRC)].map(([k,label]) => `<li role="option" aria-selected="${k===state.src}" data-src="${k}" tabindex="-1">
  <span class="fm-label">${label}</span>${k!=="all" ? `<span class="fm-note">${SRC_FULL[k]}</span>` : ""}</li>`).join("");
const srcItems = [...srcMenu.querySelectorAll("li")];
function openSources(open){
  srcMenu.hidden = !open; srcBtn.setAttribute("aria-expanded", String(open));
  if (open) { openFamilies(false); (srcItems.find(li => li.getAttribute("aria-selected")==="true") || srcItems[0]).focus(); }
}
function pickSource(k){ openSources(false); srcBtn.focus(); if (k !== state.src) setSource(k); }
srcBtn.addEventListener("click", ev => { ev.stopPropagation(); openSources(srcMenu.hidden); });
srcMenu.addEventListener("click", ev => { const li = ev.target.closest("li"); if (li) pickSource(li.dataset.src); });
srcMenu.addEventListener("keydown", ev => {
  const i = srcItems.indexOf(document.activeElement);
  if (ev.key==="ArrowDown") { ev.preventDefault(); srcItems[Math.min(i+1, srcItems.length-1)].focus(); }
  else if (ev.key==="ArrowUp") { ev.preventDefault(); srcItems[Math.max(i-1, 0)].focus(); }
  else if (ev.key==="Enter" || ev.key===" ") { ev.preventDefault(); if (i>=0) pickSource(srcItems[i].dataset.src); }
  else if (ev.key==="Escape" || ev.key==="Tab") { openSources(false); if (ev.key==="Escape") srcBtn.focus(); }
});
document.addEventListener("click", ev => { if (!srcMenu.hidden && !srcMenu.contains(ev.target)) openSources(false); });
function showSource(){
  srcName.textContent = state.src==="all" ? SRC_ALL_LABEL : SRC[state.src];
  srcItems.forEach(li => li.setAttribute("aria-selected", String(li.dataset.src===state.src)));
}
showSource();
export function setSource(k){
  state.src = k;
  srcRow.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-pressed", x.dataset.src===k));
  showSource();
  srcNote.textContent = sourceNote(k);
  if (!wide()) { srcNote.classList.add("show"); clearTimeout(noteTimer); noteTimer = setTimeout(() => srcNote.classList.remove("show"), 4500); }
  if (state.mode==="thread" && state.threadEnds) runThread(...state.threadEnds, true);
  apply(true);
  if (state.mode==="node" && state.sel) renderNode(state.sel);
  if (state.mode==="curse") openCurse(state.curseKey, state.step);
  nodeSel.filter(d => d.versions).classed("pulse", false);
  requestAnimationFrame(() => nodeSel.filter(d => d.versions).classed("pulse", true));
}
srcNote.textContent = sourceNote(state.src);
export let noteTimer;
srcNote.addEventListener("click", () => srcNote.classList.remove("show"));

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
export const curseSel = document.getElementById("curseSel");
const curseFirst = curseSel.querySelector('option[value=""]');
export function buildStories(){
  curseSel.replaceChildren(...(curseFirst ? [curseFirst] : []));
  Object.values(STORIES).forEach(c => {
    const o = document.createElement("option"); o.value = c.id; o.textContent = c.title + (c.draft ? " (draft)" : ""); curseSel.appendChild(o);
  });
  curseSel.value = "";
  // a family with no stories of its own shows no story controls
  const none = !Object.keys(STORIES).length;
  curseSel.hidden = none; document.querySelector('[data-tool="curses"]').hidden = none;
}
curseSel.onchange = () => { if (curseSel.value) openCurse(curseSel.value); else resetMode(); };
export const threadBtn = document.getElementById("threadBtn");
threadBtn.onclick = () => state.mode==="thread" ? resetMode() : openThread();
srcRow.addEventListener("scroll", () => srcRow.classList.toggle("at-end", srcRow.scrollLeft + srcRow.clientWidth >= srcRow.scrollWidth - 4));

/* phone toolbar: each button opens its panel, or closes it if already open */
const TOOL_OF = {layers:"layers", curses:"curses", curse:"curses", thread:"thread", find:"find"};
const OPEN = {layers:() => openLayers(), curses:() => openCurses(), thread:() => openThread(), find:() => openFind()};
const toolBtns = document.querySelectorAll("[data-tool]");
toolBtns.forEach(b => b.onclick = () => TOOL_OF[state.mode]===b.dataset.tool ? resetMode() : OPEN[b.dataset.tool]());
export function syncTools(){
  document.body.classList.toggle("story", state.mode==="curse");
  toolBtns.forEach(b => b.setAttribute("aria-pressed", TOOL_OF[state.mode]===b.dataset.tool));
  document.getElementById("infoBtn").setAttribute("aria-pressed", state.mode==="about" || state.mode==="tour");
  threadBtn.setAttribute("aria-pressed", state.mode==="thread");
}
const hint = document.getElementById("hint");
export const hideHint = () => hint.classList.add("gone");
function openLayers(){
  state.mode = "layers"; state.sel = null; state.path = null; state.curseKey = null;
  curseSel.value = "";
  shell(`${panelTop("Δεσμοί")}
    <h2 class="card-name thread-title">Layers</h2>
    <p class="card-tag">Choose which kinds of link to draw.</p>
    <ul class="opts">${LAYERS.map(L => `<li><button class="opt" data-layer="${L.k}" aria-pressed="${state.layers[L.k]}"><svg viewBox="0 0 26 10" aria-hidden="true">${SAMPLE[L.k]}</svg>${L.label}</button></li>`).join("")}</ul>`);
  card.querySelectorAll("[data-layer]").forEach(b => b.onclick = () => toggleLayer(b.dataset.layer));
  apply(true);
  keepInView();
}
