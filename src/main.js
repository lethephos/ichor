/* The page: the family switcher, the address, opening and closing a figure, and the start.
   The parts call each other freely, but they are set up in a fixed order, each file importing the one
   before it first: state, theme, tree, camera, sheet, controls, find, figure, stories, guide, thread, intro, main. */
import {whenTexts, FAMILY, FAMILIES, setFamily, sourceNote, familyOf, STORIES, N, ALL_STORIES, SRC, figureHome, BRANCH} from "./data.js";
import {intro} from "./intro.js";
import {state} from "./state.js";
import {drawTree, apply} from "./tree.js";
import {initialView, focusOn} from "./camera.js";
import {resetMode, foldHeader} from "./sheet.js";
import {hideHint, buildStories, srcNote, setSource, curseSel, threadBtn} from "./controls.js";
import {indexPeople, ALL_KEY} from "./find.js";
import {renderNode} from "./figure.js";
import {storyMove, openCurse} from "./stories.js";
import {runThread} from "./thread.js";

/* ---------- header ---------- */
const SITE_TITLE = document.title;
// what the address asked for when the page opened, read before anything rewrites it
const START = new URLSearchParams(location.search);
function showFamily(){
  document.getElementById("branchTitle").textContent = FAMILY.title;
  document.getElementById("familyName").textContent = FAMILY.label;
  familyItems.forEach(li => li.setAttribute("aria-selected", String(li.dataset.family === FAMILY.id)));
}

/* ---------- family switcher: a pill above the sources opens the list of families ---------- */
const familyBtn = document.getElementById("familyBtn"), familyMenu = document.getElementById("familyMenu");
familyMenu.innerHTML = FAMILIES.map(f => `<li role="option" aria-selected="${f.id===FAMILY.id}" data-family="${f.id}" tabindex="-1">
  <span class="fm-label">${f.label}</span>${f.note ? `<span class="fm-note">${f.note}</span>` : ""}</li>`).join("");
const familyItems = [...familyMenu.querySelectorAll("li")];
export function openFamilies(open){
  familyMenu.hidden = !open; familyBtn.setAttribute("aria-expanded", String(open));
  if (open) { document.getElementById("srcMenu").hidden = true; document.getElementById("srcBtn").setAttribute("aria-expanded", "false"); }
  if (open) (familyItems.find(li => li.getAttribute("aria-selected")==="true") || familyItems[0]).focus();
}
/* Switching family redraws the tree in place: the chosen source and layers stay as they are,
   and the address changes so the family can be shared and the back button returns to the last one. */
function switchFamily(id){
  hideHint(); state.hover = null; resetMode();
  setFamily(id); foldHeader(false);
  showFamily(); buildStories(); indexPeople(); drawTree();
  srcNote.textContent = sourceNote(state.src);
  initialView(); apply(false);
}
function goFamily(id){
  openFamilies(false); familyBtn.focus();
  moveToFamily(id);
}
export function moveToFamily(id){
  if (familyOf(id).id === FAMILY.id) return;
  const url = new URL(location.href);
  if (id === FAMILIES[0].id) url.searchParams.delete("family"); else url.searchParams.set("family", id);
  history.pushState({family: id}, "", url);
  switchFamily(id);
}
addEventListener("popstate", () => {
  const q = new URLSearchParams(location.search), id = q.get("family");
  if (familyOf(id).id !== FAMILY.id) switchFamily(id);
  else if (state.mode==="node" || state.mode==="curse") resetMode();
  openFromUrl(q);
});
/* The address names what is open, so a figure, a story step or a reading by one source can be sent as a link:
   ?figure=medea, ?story=argonauts&step=3, ?source=H, beside the family. Only a change of family adds a step
   to the browser’s history; the rest rewrites the address in place, so the back button still returns to the
   last family, now with the card that was open there. */
export function syncUrl(){
  const url = new URL(location.href), q = url.searchParams;
  const set = (k, v) => v ? q.set(k, v) : q.delete(k);
  const story = state.mode==="curse" ? STORIES[state.curseKey] : null, fig = state.mode==="node" ? N[state.sel] : null;
  set("figure", fig && fig.id);
  set("story", story && story.id);
  set("step", story && state.step ? String(state.step) : null);
  set("source", state.src==="all" ? null : state.src);
  if (url.href !== location.href) history.replaceState(history.state, "", url);
  const title = fig ? `${fig.name} · Ichor` : story ? `${story.title} · Ichor` : FAMILY.id === FAMILIES[0].id ? SITE_TITLE : `${FAMILY.title} · Ichor`;
  if (document.title !== title) document.title = title;
}
/* Opening what an address names. A figure or a story the family in the address cannot hold opens in its own
   family (as from Find and the Stories list), without a new step in the history. */
function openFromUrl(q){
  const land = home => {
    if (home.id === FAMILY.id) return;
    const url = new URL(location.href);
    if (home.id === FAMILIES[0].id) url.searchParams.delete("family"); else url.searchParams.set("family", home.id);
    history.replaceState(history.state, "", url);
    switchFamily(home.id);
  };
  const src = q.get("source"), fig = q.get("figure"), story = ALL_STORIES.find(c => c.id === q.get("story"));
  if (src && SRC[src] && src !== state.src) setSource(src);
  if (story) {
    const home = storyMove(story);
    if (home) land(home);
    const step = Math.round(+q.get("step")) || 0;
    openCurse(story.id, Math.min(Math.max(step, 0), story.steps.length + 1));
  } else if (fig && ALL_KEY[fig]) {
    if (!N[fig]) land(figureHome(fig));
    select(fig, true);
  }
}
familyBtn.addEventListener("click", ev => { ev.stopPropagation(); openFamilies(familyMenu.hidden); });
familyMenu.addEventListener("click", ev => { const li = ev.target.closest("li"); if (li) goFamily(li.dataset.family); });
familyMenu.addEventListener("keydown", ev => {
  const i = familyItems.indexOf(document.activeElement);
  if (ev.key==="ArrowDown") { ev.preventDefault(); familyItems[Math.min(i+1, familyItems.length-1)].focus(); }
  else if (ev.key==="ArrowUp") { ev.preventDefault(); familyItems[Math.max(i-1, 0)].focus(); }
  else if (ev.key==="Enter" || ev.key===" ") { ev.preventDefault(); if (i>=0) goFamily(familyItems[i].dataset.family); }
  else if (ev.key==="Escape" || ev.key==="Tab") { openFamilies(false); if (ev.key==="Escape") familyBtn.focus(); }
});
document.addEventListener("click", ev => { if (!familyMenu.hidden && !familyMenu.contains(ev.target)) openFamilies(false); });
document.getElementById("branchSub").textContent = BRANCH.subtitle || "";
/* A card shows the long texts, so it opens once they are in (at once, but for a tap in the first moments). */
export function select(id, move){
  whenTexts(() => {
    if (!N[id]) return;
    state.mode = "node"; state.sel = id; state.path = null;
    curseSel.value = ""; threadBtn.setAttribute("aria-pressed","false");
    renderNode(id); apply(true);
    if (move) focusOn(id);
  });
}
export function nodeClick(id){
  hideHint();
  if (state.mode==="thread") {
    const a = document.getElementById("tFrom"), b = document.getElementById("tTo");
    if (a && b) { if (!a.value || (a.value && b.value)) { a.value = id; b.value = ""; } else { b.value = id; runThread(a.value, b.value); } }
    return;
  }
  select(id, true);
}

showFamily(); buildStories(); indexPeople(); drawTree();
initialView();
apply(false);
openFromUrl(START);
intro();