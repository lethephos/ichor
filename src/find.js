/* Find a figure: the search box on desktop and the Find panel on phones. */
import {ALL_PEOPLE, P, N, figureHome} from "./data.js";
import {curseSel} from "./controls.js";
import {state, wide} from "./state.js";
import {apply} from "./tree.js";
import {keepInView} from "./camera.js";
import {shell, panelTop, setFull} from "./sheet.js";
import {moveToFamily, select} from "./main.js";

/* Find a figure: names (English or Greek, accents ignored) narrow down as you type;
   names that start with what was typed come first. */
const fold = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/* A name typed searches the whole tree: figures of the family shown come first, then the rest, each saying the family
   it opens in (the smallest that holds it), as a story the family cannot hold does. */
let PEOPLE, KEY;
export const ALL_KEY = Object.fromEntries(ALL_PEOPLE.map(p => [p.id, fold(p.name + " " + p.greek)]));
const ALL_SORTED = [...ALL_PEOPLE].sort((a,b) => a.name.localeCompare(b.name));
export function indexPeople(){
  PEOPLE = [...P].sort((a,b) => a.name.localeCompare(b.name));
  KEY = ALL_KEY;
}
function findFigures(query){
  const q = fold(query.trim());
  if (!q) return PEOPLE;
  // the name itself starting with it first, then any word of it, then anywhere
  const fit = p => KEY[p.id].startsWith(q) ? 0 : KEY[p.id].split(" ").some(w => w.startsWith(q)) ? 1 : 2;
  const rank = p => (N[p.id] ? 0 : 3) + fit(p);
  return ALL_SORTED.filter(p => KEY[p.id].includes(q)).sort((a,b) => rank(a) - rank(b));
}
const away = p => N[p.id] ? "" : ` · opens in ${figureHome(p.id).label}`;
// a figure outside the family shown opens in its own family; the back button returns
function goFigure(id){
  if (!N[id]) moveToFamily(figureHome(id).id);
  select(id, true);
}
const NONE = `<li class="none">No figure by that name.</li>`;

/* desktop: a search box with suggestions */
const finder = document.getElementById("finder"), finderList = document.getElementById("finderList");
let found = [], active = -1;
function showFinder(){
  found = findFigures(finder.value); active = found.length && finder.value.trim() ? 0 : -1;
  finderList.innerHTML = found.length ? found.map((p, i) =>
    `<li role="option" id="fig-${p.id}" data-id="${p.id}" aria-selected="${i===active}"><span class="n">${p.name}</span><span class="r">${p.role}${away(p)}</span></li>`).join("") : NONE;
  finderList.hidden = false; finder.setAttribute("aria-expanded", "true"); markActive();
}
function markActive(){
  finderList.querySelectorAll("[role=option]").forEach((li, i) => li.setAttribute("aria-selected", i===active));
  const li = found[active] && document.getElementById("fig-" + found[active].id);
  if (li) { li.scrollIntoView({block:"nearest"}); finder.setAttribute("aria-activedescendant", li.id); }
  else finder.removeAttribute("aria-activedescendant");
}
function hideFinder(){ finderList.hidden = true; finder.setAttribute("aria-expanded", "false"); finder.removeAttribute("aria-activedescendant"); }
function pickFinder(id){ hideFinder(); finder.value = ""; finder.blur(); goFigure(id); }
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
/* phone: the same search in a panel; the list is rebuilt on every keystroke */
export function openFind(){
  state.mode = "find"; state.sel = null; state.path = null; state.curseKey = null;
  curseSel.value = "";
  shell(`${panelTop("Ζήτησις")}
    <h2 class="card-name thread-title">Find a figure</h2>
    <input class="search" id="findQ" type="search" placeholder="Name, in English or Greek" autocomplete="off" spellcheck="false" aria-label="Find a figure">
    <ul class="rels found" id="findList" aria-live="polite"></ul>`);
  const q = document.getElementById("findQ"), list = document.getElementById("findList");
  const show = () => {
    const hits = findFigures(q.value);
    list.innerHTML = hits.length ? hits.map(p => `<li><button class="rel" data-go="${p.id}">${p.name}</button><span class="srcs">${p.role}${away(p)}</span></li>`).join("") : NONE;
  };
  q.oninput = show;
  q.onfocus = () => { if (!wide()) setFull(true); };   // keep the list above the phone keyboard
  q.onkeydown = ev => { if (ev.key==="Enter") { const hit = findFigures(q.value)[0]; if (hit) goFigure(hit.id); } };
  // the whole line answers a tap, not only the name: on a phone the role beside it is just as easy to hit
  list.onclick = ev => { const b = ev.target.closest("li")?.querySelector("[data-go]"); if (b) goFigure(b.dataset.go); };
  show();
  apply(true);
  keepInView();
}
