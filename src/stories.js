/* Stories told step by step, by all sources or as one source tells them. */
import {STORIES, FAMILY, FAMILIES, storyHome, E, N, SRC} from "./data.js";
import "./figure.js";
import {wide, state, esc, samePair, attested} from "./state.js";
import {apply} from "./tree.js";
import {keepInView, storyTimer, fitScale, MIN_PHONE_K, STORY_GLIDE_K, clusters, glideThrough, fitTo} from "./camera.js";
import {shell, panelTop, card, sentence, setFull} from "./sheet.js";
import {curseSel, setSource} from "./controls.js";
import {moveToFamily} from "./main.js";

/* The stories a figure takes part in, in any family: each opens at the step where they come in.
   A story this family cannot hold opens in its own family, which the line under it names. */
/* The family a story should open in, or null to tell it here: its own family when this one cannot hold it, and,
   on phones, when the whole tree is shown, since there its figures sit too far apart to read on a small screen */
export function storyMove(c){
  if (!STORIES[c.id] || (!wide() && FAMILY.id === FAMILIES[0].id)) { const home = storyHome(c); return home.id === FAMILY.id ? null : home; }
  return null;
}
export function openCurses(){
  state.mode = "curses"; state.sel = null; state.path = null; state.curseKey = null;
  curseSel.value = "";
  shell(`${panelTop("Ἀραί")}
    <h2 class="card-name thread-title">Stories</h2>
    <p class="card-tag">Myths told one step at a time, as the tree fills in.</p>
    <ul class="opts">${Object.values(STORIES).map(c => { const home = storyMove(c);
      return `<li><button class="opt" data-curse="${c.id}"${home ? ` data-family="${home.id}"` : ""}><span>${c.title}${c.draft ? ` <em class="draft">draft</em>` : ""}<small>${c.lead}${home ? ` · opens in ${esc(home.label)}` : ""}</small></span></button></li>`; }).join("")}</ul>`);
  card.querySelectorAll("[data-curse]").forEach(b => b.onclick = () => { if (b.dataset.family) moveToFamily(b.dataset.family); openCurse(b.dataset.curse); });
  apply(true);
  keepInView();
}

/* Stories: a myth told one step at a time (a curse, one generation at a time). Step 0 introduces it, steps 1…n tell it and
   reveal on the tree only the figures met so far, step n+1 shows the whole line at once. */
/* Telling a story by one source uses only what is already in relations.json: a generation is
   told by a source when one of its links to the story so far is attested there. */
export const STORY_TYPES = ["parent","curse","feud","affair","marriage","transform"];
const storyEdge = (c, e) => STORY_TYPES.includes(e.type) && c.pairs.some(p => samePair(e, p));
// the step where each figure first enters the story (0-based); figures may come back in later steps
function entries(c){
  const first = {};
  c.steps.forEach((s, i) => s.figures.forEach(id => { if (!(id in first)) first[id] = i; }));
  return first;
}
function reached(c, i){   // the links step i (0-based) reaches: from its figures to anyone met by then
  const figs = new Set(c.steps[i].figures), first = entries(c);
  const notYet = id => id in first && first[id] > i;
  return E.filter(e => storyEdge(c, e) && (figs.has(e.from) || figs.has(e.to))
    && !notYet(figs.has(e.from) ? e.to : e.from));
}
/* The links that tell step i: those it reaches first, so that a figure coming back (Medea in Iolcus) does not
   bring back what earlier steps told; a step that only returns to old links (the black sail) is told by them.
   A step can name its own pairs when its figures reach further than it tells (Medea meets Jason, not yet Pelias). */
const STEP_LINKS = new Map();
function stepLinks(c, i){
  const key = c.id + "/" + i;
  if (!STEP_LINKS.has(key)) {
    const own = c.steps[i].pairs;
    const before = new Set(c.steps.slice(0, i).flatMap((_, j) => stepLinks(c, j)));
    const now = own ? E.filter(e => storyEdge(c, e) && own.some(p => samePair(e, p))) : reached(c, i);
    const fresh = now.filter(e => !before.has(e));
    STEP_LINKS.set(key, own || !fresh.length ? now : fresh);
  }
  return STEP_LINKS.get(key);
}
/* Figures this step brings in, and among them those whose parentage the story is about:
   those get their alternative parents and their Where the sources disagree text. */
const newcomers = (c, i) => { const first = entries(c); return c.steps[i].figures.filter(id => first[id]===i); };
const parentsInStory = (c, id) => E.some(e => e.type==="parent" && e.to===id && c.pairs.some(p => samePair(e, p)));
export const toldSteps = c => c.steps.map((_, i) => state.src==="all" || stepLinks(c, i).some(attested));
export function reveal(c, k, told = toldSteps(c)){
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
  // the camera follows the step: its figures, with the people at the other end of the links that tell it
  const focus = new Set(now);
  stepLinks(c, k-1).filter(attested).forEach(e => [e.from, e.to].forEach(id => { if (shown.has(id)) focus.add(id); }));
  // with all sources on, the other parents a current figure is given appear as alternatives
  const alt = new Set();
  if (state.src==="all") newcomers(c, k-1).filter(id => parentsInStory(c, id)).forEach(id => altParents(id).flat().forEach(e => {
    if (!shown.has(e.from)) { shown.add(e.from); focus.add(e.from); }
    alt.add(e.i);
  }));
  // links a later step tells, and none so far, wait for it (Medea’s feud with Pelias waits for the cauldron)
  const sofar = new Set(c.steps.slice(0, k).flatMap((_, i) => stepLinks(c, i)));
  const ahead = new Set(c.steps.slice(k).flatMap((_, j) => stepLinks(c, k+j)).filter(e => !sofar.has(e)).map(e => e.i));
  return {now, shown, focus, alt, ahead};
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
export function openCurse(key, step = 0){
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
      : count===n ? `Every ${unit} is told in ${by}.` : count ? `${count} of ${n} ${unit}s ${count===1 ? "is" : "are"} told in ${by}; the others are skipped.` : `This story is not told in ${by}.`}</p>
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
  clearTimeout(storyTimer);
  if (step>=1 && step<=n) {
    const r = reveal(c, step, told), core = [...r.now].filter(id => N[id]);
    const parts = !wide() && fitScale([...r.focus]) < MIN_PHONE_K && fitScale(core) < STORY_GLIDE_K ? clusters(core) : null;
    if (parts && parts.length > 1) glideThrough(parts, () => state.mode==="curse" && state.curseKey===key && state.step===step);
    else fitTo([...r.focus], true, core);
  }
  else fitTo([...c.nodes], true);
}
document.addEventListener("keydown", ev => {
  if (state.mode!=="curse" || ev.target.closest("input, select, textarea")) return;
  const c = STORIES[state.curseKey], told = toldSteps(c);
  if (ev.key==="ArrowRight" && state.step<=c.steps.length && told.some(Boolean)) openCurse(state.curseKey, nextStep(c, state.step, told));
  if (ev.key==="ArrowLeft" && state.step>0) openCurse(state.curseKey, prevStep(c, state.step, told));
});
