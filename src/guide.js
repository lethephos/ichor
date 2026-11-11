/* The Guide: a live legend of the lines, the rows and the sources, and the tour. */
import {E, N, sourceNote, SRC, SRC_FULL, FAMILY, FAMILIES, SRC_ALL_LABEL} from "./data.js";
import {openCurses} from "./stories.js";
import {state, samePair, attested, LAYERS, SAMPLE} from "./state.js";
import {apply, svg} from "./tree.js";
import {fitScale, fitTo} from "./camera.js";
import {resetMode, card, sentence, srcText, shell, panelTop} from "./sheet.js";
import {curseSel, setSource, srcNote, noteTimer} from "./controls.js";
import {shortestPath, openThread} from "./thread.js";
import {moveToFamily} from "./main.js";

/* Guide: what Ichor is, how to read the tree, the lines and the sources */
const infoBtn = document.getElementById("infoBtn");
infoBtn.onclick = () => state.mode==="about" || state.mode==="tour" ? resetMode() : openAbout();
/* The Guide is a live legend: each line style, the rule about rows and each source can be tapped to see it on the tree. */
const DEMO_PAIRS = {parent:["atreus","agamemnon"], marriage:["zeus","hera"], affair:["zeus","leda"], feud:["atreus","thyestes"], transform:["zeus","io"], curse:["myrtilus","pelops"]};
function demoEdge(type){
  const pick = E.find(e => e.type===type && samePair(e, DEMO_PAIRS[type]) && attested(e));
  return pick || E.filter(e => e.type===type && attested(e)).sort((a, b) => b.sources.length - a.sources.length)[0] || null;
}
const ROWS_DEMO = {pairs:[["atreus","agamemnon"],["tydeus","diomedes"]], text:"Agamemnon and Diomedes fought side by side at Troy, yet Diomedes sits three rows lower: the rows count steps down each house, not years."};
function showDemo(key){
  if (state.demo && state.demo.key===key) { state.demo = null; }
  else if (key==="rows") {
    const edges = E.filter(e => e.type==="parent" && ROWS_DEMO.pairs.some(pr => samePair(e, pr)));
    const nodes = ROWS_DEMO.pairs.flat().filter(id => N[id]);
    state.demo = nodes.length===4 ? {key, edges:new Set(edges.map(e => e.i)), nodes:new Set(nodes)} : {key, edges:new Set(), nodes:new Set(), missing:true};
  } else {
    const e = demoEdge(key);
    state.demo = e ? {key, edges:new Set([e.i]), nodes:new Set([e.from, e.to]), e} : {key, edges:new Set(), nodes:new Set(), missing:true};
  }
  card.querySelectorAll("[data-demo]").forEach(b => {
    const on = !!state.demo && state.demo.key===b.dataset.demo;
    b.setAttribute("aria-pressed", on);
    const note = b.querySelector(".demo-note");
    note.innerHTML = !on ? "" : state.demo.missing ? "Not in this family: pick Whole tree to see it." : b.dataset.demo==="rows" ? ROWS_DEMO.text : `${sentence(state.demo.e)} ${srcText(state.demo.e.sources)}`;
  });
  apply(true);
  if (!state.demo || state.demo.missing) return;
  // the rows example spans the tree: if both pairs don’t fit at a readable size, show one, then glide to the other
  const d = state.demo;
  if (key==="rows" && fitScale([...d.nodes]) < 0.5) {
    fitTo(ROWS_DEMO.pairs[0], true);
    clearTimeout(demoTimer);
    demoTimer = setTimeout(() => { if (state.mode==="about" && state.demo===d) fitTo(ROWS_DEMO.pairs[1], 1400); }, 1900);
  } else fitTo([...d.nodes], true);
}
let demoTimer;
function showGuideSources(){
  card.querySelectorAll("[data-guide-src]").forEach(b => {
    const on = state.src===b.dataset.guideSrc;
    b.setAttribute("aria-pressed", on);
    b.querySelector(".demo-note").textContent = on ? sourceNote(b.dataset.guideSrc) : "";
  });
}
function openAbout(){
  state.mode = "about"; state.sel = null; state.path = null; state.curseKey = null; state.demo = null;
  curseSel.value = "";
  const item = (attr, label, small = "", svg = "") => `<li><button class="opt demo" ${attr} aria-pressed="false">${svg}<span>${label}${small ? `<small>${small}</small>` : ""}<small class="demo-note" aria-live="polite"></small></span></button></li>`;
  shell(`${panelTop("ἰχώρ")}
    <h2 class="card-name thread-title">Guide to Ichor</h2>
    <p class="card-tag">The family tree of Greek myth.</p>
    <button class="go tour-go" id="tourGo" type="button">Take the tour →</button>
    <p class="card-story">Gods and heroes in one tree: who descends from whom, who married, loved, fought and cursed whom. Every link names the ancient sources that tell it. Pick a source and watch the family rearrange itself.</p>
    <div class="sec"><h3>How to read it</h3><ul class="rels about">
      <li><span class="rel static">Tap a figure to open its card. Pinch or scroll to zoom, drag to move.</span></li>
      <li><span class="rel static">Family picks a part of the tree; Source shows only what one group of ancient writers tells.</span></li>
    </ul><ul class="opts">${item(`data-demo="rows"`, "Lower means descended, not later", "The rows I–VII count steps down each house, so the houses don’t line up in time.")}</ul></div>
    <div class="sec"><h3>The lines</h3><p class="demo-hint">Tap one to see an example on the tree.</p><ul class="opts">${LAYERS.map(L => item(`data-demo="${L.k}"`, L.label, "", `<svg viewBox="0 0 26 10" aria-hidden="true">${SAMPLE[L.k]}</svg>`)).join("")}</ul></div>
    <div class="sec"><h3>The sources</h3><p class="demo-hint">Tap one to show only what it tells; tap again for all versions.</p><ul class="opts">${Object.keys(SRC).map(k => item(`data-guide-src="${k}"`, SRC[k], SRC_FULL[k])).join("")}</ul></div>`);
  card.querySelectorAll("[data-demo]").forEach(b => b.onclick = () => showDemo(b.dataset.demo));
  card.querySelectorAll("[data-guide-src]").forEach(b => b.onclick = () => {
    // a source shows itself across the whole tree, so any example on show steps aside; its note is already in the Guide
    if (state.demo) showDemo(state.demo.key);
    setSource(state.src===b.dataset.guideSrc ? "all" : b.dataset.guideSrc);
    srcNote.classList.remove("show"); clearTimeout(noteTimer);
    showGuideSources();
  });
  showGuideSources();
  document.getElementById("tourGo").onclick = () => {   // the tour walks the whole tree
    if (FAMILY.id !== FAMILIES[0].id) moveToFamily(FAMILIES[0].id);
    openTour(1);
  };
  infoBtn.setAttribute("aria-pressed", "true");
  apply(true);
}
/* The tour: a minute with Ichor, five steps on the whole tree, each lit up and framed like a step of a story. */
const TOUR = [
  {label:"The stars", text:"Each star is a figure: the gods wear a fine ring, mortals are the bare star. Tap one to open its card.",
   pairs:[["zeus","hera"]], types:["marriage"]},
  {label:"The lines", text:"Lines say how figures are linked. In the house of Atreus: plain from parent to child, double for his marriage to Aerope, dashes and dots for his feud with Thyestes, red for the curse Thyestes laid on him.",
   pairs:[["pelops","atreus"],["atreus","agamemnon"],["atreus","aerope"],["atreus","thyestes"]], types:["parent","marriage","feud","curse"]},
  {label:"Lower means descended", text:"Lower on the tree means descended, not later. " + ROWS_DEMO.text,
   pairs:ROWS_DEMO.pairs, types:["parent"], rows:true},
  {label:"The sources", text:"The sources don’t always agree. Agamemnon’s father is Atreus in Homer, Pleisthenes in Hesiod. Pick a source and the tree keeps only what it tells.",
   pairs:[["atreus","agamemnon"],["pleisthenes","agamemnon"],["aerope","agamemnon"]], types:["parent"], read:["all","E","H"]},
  {label:"Stories and the thread", text:"Stories tells the great myths step by step. Ariadne’s thread finds how any two figures are linked: Oedipus and Orestes meet in Pelops.",
   thread:["oedipus","orestes"], end:true}
];
let tourTimer;
function tourDemo(t){
  if (t.thread) {
    const path = N[t.thread[0]] && N[t.thread[1]] ? shortestPath(...t.thread) : null;
    return path ? {key:"tour", edges:new Set(path.edges.map(e => e.i)), nodes:new Set(path.nodes), path} : null;
  }
  const edges = E.filter(e => t.types.includes(e.type) && t.pairs.some(pr => samePair(e, pr)));
  return {key:"tour", edges:new Set(edges.map(e => e.i)), nodes:new Set(t.pairs.flat().filter(id => N[id]))};
}
function openTour(step){
  const n = TOUR.length;
  state.mode = "tour"; state.tourStep = step; state.sel = null; state.path = null; state.curseKey = null;
  curseSel.value = "";
  const t = TOUR[step-1], d = tourDemo(t);
  state.demo = d;
  const dots = `<div class="dots" aria-hidden="true">${TOUR.map((_, i) => `<span class="${i+1===step ? "on" : i+1<step ? "past" : ""}"></span>`).join("")}</div>`;
  const read = t.read ? `<div class="read-as tour-read" role="group" aria-label="Told by">${t.read.map(k => `<button class="tab" data-read="${k}" aria-pressed="${state.src===k}">${k==="all" ? SRC_ALL_LABEL : SRC[k]}</button>`).join("")}</div>` : "";
  const pathLine = t.thread && d ? `<p class="tour-path">${d.path.nodes.map(id => N[id].name).join(" → ")}</p>` : "";
  const end = t.end ? `<div class="tour-end"><button class="act" data-tour-open="stories">Open Stories</button><button class="act" data-tour-open="thread">Try the thread</button></div>` : "";
  shell(`<p class="story-of">A minute with Ichor</p>
    <p class="story-step">${t.label} <span>· ${step} of ${n}</span></p>
    <p class="story-text tour-text">${t.text}</p>
    ${pathLine}${read}${end}
    <div class="story-nav"><button class="act" data-tour="${step-1}">← ${step>1 ? "Back" : "Guide"}</button>${dots}${step<n ? `<button class="go" data-tour="${step+1}">Next →</button>` : `<button class="go" data-tour="done">Done</button>`}</div>`);
  card.querySelectorAll("[data-tour]").forEach(b => b.onclick = () => {
    const v = b.dataset.tour;
    if (v==="done") resetMode(); else if (v==="0") openAbout(); else openTour(+v);
  });
  card.querySelectorAll("[data-read]").forEach(b => b.onclick = () => {
    setSource(b.dataset.read);
    srcNote.classList.remove("show"); clearTimeout(noteTimer);
    card.querySelectorAll("[data-read]").forEach(x => x.setAttribute("aria-pressed", x.dataset.read===state.src));
  });
  card.querySelectorAll("[data-tour-open]").forEach(b => b.onclick = () => b.dataset.tourOpen==="stories" ? openCurses() : openThread());
  infoBtn.setAttribute("aria-pressed", "true");
  apply(true);
  clearTimeout(tourTimer);
  if (!d || !d.nodes.size) return;
  // the rows step spans the tree: if it doesn’t fit at a readable size, show one house, then glide to the other
  if (t.rows && fitScale([...d.nodes]) < 0.5) {
    fitTo(t.pairs[0], true);
    tourTimer = setTimeout(() => { if (state.mode==="tour" && state.demo===d) fitTo(t.pairs[1], 1400); }, 1900);
  } else fitTo([...d.nodes], true);
}
document.addEventListener("keydown", ev => {
  if (state.mode!=="tour" || ev.target.closest("input, select, textarea")) return;
  if (ev.key==="ArrowRight" && state.tourStep < TOUR.length) openTour(state.tourStep + 1);
  if (ev.key==="ArrowLeft" && state.tourStep > 1) openTour(state.tourStep - 1);
});
