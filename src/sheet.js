/* The card as a container: its bar and section navigator, the phone sheet and its grip,
   the folding header, and closing whatever is open. */
import * as d3 from "d3";
import {SRC, N, STORIES} from "./data.js";
import {viewH} from "./camera.js";
import {state, named, wide} from "./state.js";
import {graphEl, svg, zoom, apply} from "./tree.js";
import {srcNote, curseSel, threadBtn} from "./controls.js";
import {openCurse, toldSteps} from "./stories.js";
import {select, moveToFamily} from "./main.js";

/* The part of the tree not covered by the card: beside it on wide screens, above it on phones. */
export const card = document.getElementById("card");

/* ---------- card ---------- */
const cardBody = document.getElementById("cardBody");
/* The sources of a link, and under them the passages where it is told, for those checked so far (`cite` in relations.json);
   with one source chosen, only its passage. */
export const srcText = (src, cite) => {
  const where = cite ? src.filter(s => cite[s] && (state.src==="all" || state.src===s)).map(s => cite[s]) : [];
  return `<span class="srcs">${src.map(s => state.src===s ? `<b>${SRC[s]}</b>` : SRC[s]).join(", ")}</span>${where.length ? `<span class="cites">${where.join(" · ")}</span>` : ""}`;
};
export function sentence(e){
  const A = named(e.from, true), B = named(e.to);
  // a parent from a group names the sister: “Perse, one of the Oceanids, is the mother of Circe.”
  if (e.type==="parent" && N[e.from].kind==="group" && e.note) return `${e.note}, one of ${named(e.from)}, is the mother of ${B}.`;
  if (e.type==="parent") return `${A} is the ${N[e.from].gender==="f"?"mother":"father"} of ${B}${e.note?` (${e.note})`:""}.`;
  if (e.type==="marriage") return `${A} married ${B}${e.note?`, ${e.note}`:""}.`;
  return `${A} ${e.note}.`;
}
export const draftTag = x => x.draft ? ` <em class="draft" title="Not yet checked">draft</em>` : "";
export const relItem = (id, e, withSentence) => `<li><button class="rel" data-go="${id}">${N[id].name}</button>${srcText(e.sources, e.cite)}${draftTag(e)}${withSentence?`<span class="note">${sentence(e)}</span>`:(e.note?`<span class="note">${e.note}</span>`:"")}</li>`;
export function shell(inner){
  cardBody.innerHTML = inner;
  card.querySelectorAll("[data-close]").forEach(b => b.onclick = resetMode);
  card.querySelectorAll("[data-go]").forEach(b => {
    b.onclick = () => select(b.dataset.go, true);
    if (b.tagName!=="BUTTON") b.onkeydown = ev => { if (ev.key==="Enter"||ev.key===" ") { ev.preventDefault(); select(b.dataset.go, true); } };
  });
  // a story opens where the figure comes in, or at its start if the chosen source skips that step
  card.querySelectorAll("[data-story]").forEach(b => b.onclick = () => {
    if (b.dataset.family) moveToFamily(b.dataset.family);
    const c = STORIES[b.dataset.story], at = +b.dataset.at;
    openCurse(c.id, toldSteps(c)[at-1] ? at : 0);
  });
  setFull(false); setSheet(true); card.classList.add("open"); card.scrollTop = 0;
  srcNote.classList.remove("show");
  // the bar at the top of the card keeps the name in view once the big one scrolls away
  const nm = document.getElementById("sheetName"), big = cardBody.querySelector(".card-name");
  nm.textContent = big ? big.firstChild.textContent.trim() : "";
  nm.classList.remove("on");
  buildNav();
}
const sheetName = document.getElementById("sheetName");
document.getElementById("sheetClose").onclick = () => resetMode();
card.addEventListener("scroll", () => {
  const big = cardBody.querySelector(".card-name");
  sheetName.classList.toggle("on", !!big && big.getBoundingClientRect().bottom < card.getBoundingClientRect().top + 44);
  spyNav();
}, {passive: true});
card.addEventListener("scrollend", () => { navLock = 0; }, {passive: true});
/* A long card gets a row of section names under its bar: tap one to jump there; the one being read is marked. */
const sheetBar = document.getElementById("sheetBar"), sheetNav = document.getElementById("sheetNav");
const NAV_LABEL = {"In the sky":"Sky", "Close family":"Family", "In the stories":"Stories", "The Twelve":"Twelve", "Changed shape":"Shape",
  "Made immortal":"Immortal", "Born to":"Parents", "Feuds & killings":"Feuds", "Feuds and fates":"Feuds", "Transformations":"Changes",
  "Where the sources disagree":"Versions", "Not in the ancient sources":"Not ancient", "In art":"Art", "Who they are":"Members"};
let navSecs = [], navLock = 0;
function buildNav(){
  navSecs = [...cardBody.querySelectorAll(".sec > h3")].map(h => h.parentElement);
  if (navSecs.length < 3) { navSecs = []; sheetNav.innerHTML = ""; sheetBar.classList.remove("has-nav"); return; }
  const label = s => { const h = s.querySelector("h3").textContent; return s.querySelector(".members") ? "Members" : NAV_LABEL[h] || h; };
  sheetNav.innerHTML = `<button type="button" class="nav-chip on" data-sec="-1">About</button>` +
    navSecs.map((s, i) => `<button type="button" class="nav-chip" data-sec="${i}">${label(s)}</button>`).join("");
  sheetBar.classList.add("has-nav"); sheetNav.scrollLeft = 0;
  sheetNav.querySelectorAll(".nav-chip").forEach(b => b.onclick = () => {
    const i = +b.dataset.sec, top = i < 0 ? 0 : card.scrollTop + navSecs[i].getBoundingClientRect().top - sheetBar.getBoundingClientRect().bottom - 8;
    navLock = Date.now() + 1500; markNav(i);
    card.scrollTo({top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
  });
}
function spyNav(){
  if (!navSecs.length || Date.now() < navLock) return;
  // a section is being read once its heading passes a line a third of the way down the visible card
  const top = sheetBar.getBoundingClientRect().bottom, bottom = Math.min(card.getBoundingClientRect().bottom, innerHeight);
  const line = top + Math.min(160, Math.max(24, (bottom - top) / 3));
  let i = -1; navSecs.forEach((s, k) => { if (s.getBoundingClientRect().top <= line) i = k; });
  // at the very end of the card the last sections can’t scroll up to the line: mark the last one in view
  if (card.scrollTop + card.clientHeight >= card.scrollHeight - 2 && i >= 0) navSecs.forEach((s, k) => { if (s.getBoundingClientRect().top < bottom - 80) i = Math.max(i, k); });
  markNav(i);
}
function markNav(i){
  sheetNav.querySelectorAll(".nav-chip").forEach(b => {
    const on = +b.dataset.sec === i; b.classList.toggle("on", on);
    if (on) { const l = b.offsetLeft - sheetNav.offsetLeft, r = l + b.offsetWidth;
      if (l < sheetNav.scrollLeft + 16 || r > sheetNav.scrollLeft + sheetNav.clientWidth - 16) sheetNav.scrollTo({left: l - 22, behavior: "smooth"}); }
  });
}
/* On phones, while the card is open the page header folds away and only the Family and Source pills stay,
   so the tree keeps the room above the card. The tree is held still on screen as the header goes or comes back. */
function setSheet(on){
  if (document.body.classList.contains("sheet") === on) return;
  if (on) foldMotion(() => holdStill(() => document.body.classList.add("sheet")));
  else foldMotion(() => document.body.classList.remove("sheet"));
}
/* The header also folds once the reader moves the tree; “Whole tree” and a new family bring it back. */
export function foldHeader(on){
  if (document.body.classList.contains("folded") === on) return;
  foldMotion(() => holdStill(() => document.body.classList.toggle("folded", on)));
}
/* On phones the header does not vanish at once (the tools strip lives outside .controls, so that moving it never drags the fixed strip along): it fades and lifts away while the line of pills slides up
   into its place, and the gold mark flies from the header to the start of the line (and back when it returns).
   The tree stays still underneath. */
const headerEl = document.querySelector("header"), controlsEl = document.querySelector(".controls");
let foldAnims = [], foldGhost = null;
function foldMotion(change){
  foldAnims.forEach(a => a.finish()); foldAnims = []; if (foldGhost) { foldGhost.remove(); foldGhost = null; }
  const shown = () => headerEl.getClientRects().length > 0;
  if (wide() || matchMedia("(prefers-reduced-motion: reduce)").matches || !document.documentElement.classList.contains("landed")) return change();
  const wasShown = shown(), top0 = controlsEl.getBoundingClientRect().top;
  const famBtn = controlsEl.querySelector(".family-btn"), famX0 = famBtn.getBoundingClientRect().left;
  const from = (wasShown ? headerEl.querySelector(".wm-sep") : controlsEl.querySelector(".mini-mark")).getBoundingClientRect();
  if (wasShown) {
    // the header leaves as a ghost of itself, since the real one is gone from the layout at once
    const r = headerEl.getBoundingClientRect();
    foldGhost = headerEl.cloneNode(true);
    foldGhost.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
    foldGhost.setAttribute("aria-hidden", "true");
    foldGhost.querySelector(".wm-sep").style.visibility = "hidden";
    Object.assign(foldGhost.style, {display:getComputedStyle(headerEl).display, position:"fixed", left:r.left+"px", top:r.top+"px", width:r.width+"px", height:r.height+"px", margin:0, zIndex:4, pointerEvents:"none", background:"var(--bg)"});
    document.body.appendChild(foldGhost);
  }
  change();
  const isShown = shown(), d = top0 - controlsEl.getBoundingClientRect().top;
  if (wasShown === isShown) { if (foldGhost) { foldGhost.remove(); foldGhost = null; } return; }
  const ease = "cubic-bezier(.3,0,.15,1)", ms = 380;
  const mark = isShown ? headerEl.querySelector(".wm-sep") : controlsEl.querySelector(".mini-mark");
  const to = mark.getBoundingClientRect();
  const dx = from.left + from.width/2 - to.left - to.width/2, dy = from.top + from.height/2 - to.top - to.height/2 - (isShown ? 0 : d);
  const markFrom = `translate(${dx}px,${dy}px) scale(${from.height / to.height})`;
  // hold the starting picture at once, and move only from the next free frame: opening a card is heavy work,
  // which would otherwise freeze the motion halfway
  Object.assign(controlsEl.style, {transform: `translateY(${d}px)`, zIndex: 5});
  // the family name makes room for the mark at the start of the line, or takes its place back
  const fx = famX0 - famBtn.getBoundingClientRect().left;
  famBtn.style.transform = `translateX(${fx}px)`;
  // the flying mark passes over the pills (the header makes no stacking context of its own, so this lifts it above them)
  Object.assign(mark.style, {transform: markFrom, position: "relative", zIndex: 6});
  // when the header returns, its words fade in round the mark, which flies back to them
  const words = isShown ? [...headerEl.querySelectorAll(".info, .kicker > :not(.wm-sep)")] : [];
  words.forEach(w => w.style.opacity = 0);
  const g = foldGhost;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    controlsEl.style.transform = mark.style.transform = famBtn.style.transform = ""; words.forEach(w => w.style.opacity = "");
    if (fx) foldAnims.push(famBtn.animate([{transform: `translateX(${fx}px)`}, {transform: "none"}], {duration: ms, easing: ease}));
    // transform and opacity only, so the motion stays smooth while the tree is busy moving its camera
    const slide = controlsEl.animate([{transform: `translateY(${d}px)`}, {transform: "none"}], {duration: ms, easing: ease});
    slide.onfinish = slide.oncancel = () => { controlsEl.style.zIndex = ""; };
    foldAnims.push(slide);
    const fly = mark.animate([{transform: markFrom}, {transform: "none"}], {duration: ms, easing: ease});
    fly.onfinish = fly.oncancel = () => { mark.style.position = mark.style.zIndex = ""; };
    foldAnims.push(fly);
    if (g) {
      const a = g.animate([{opacity: 1, transform: "none"}, {opacity: 0, transform: "translateY(-14px)"}], {duration: ms * .7, easing: ease, fill: "forwards"});
      a.onfinish = () => { g.remove(); if (foldGhost === g) foldGhost = null; };
      foldAnims.push(a);
    } else {
      words.forEach(w => foldAnims.push(w.animate([{opacity: 0, transform: "translateY(-8px)"}, {opacity: 1, transform: "none"}], {duration: ms, delay: 80, easing: ease, fill: "backwards"})));
    }
  }));
}
// change the page around the tree without the tree jumping on screen
function holdStill(change){
  const before = graphEl.getBoundingClientRect().top;
  change();
  const dy = before - graphEl.getBoundingClientRect().top;
  if (dy) { const t = d3.zoomTransform(graphEl); svg.interrupt().call(zoom.transform, d3.zoomIdentity.translate(t.x, t.y + dy).scale(t.k)); }
}

/* On phones the card is a sheet: half height at first; pull the grip up for full height, down to shrink or close. Tapping the grip toggles. */
const grip = document.getElementById("grip");
export function setFull(on){
  card.classList.toggle("full", on);
  grip.setAttribute("aria-expanded", on); grip.setAttribute("aria-label", on ? "Shrink card" : "Expand card");
}
let dragY = null, dragged = false;
grip.addEventListener("pointerdown", ev => { dragY = ev.clientY; grip.setPointerCapture(ev.pointerId); });
grip.addEventListener("pointerup", ev => {
  if (dragY===null) return;
  const dy = ev.clientY - dragY; dragY = null;
  if (Math.abs(dy) < 30) return;
  dragged = true;
  if (dy < 0) setFull(true); else if (card.classList.contains("full")) setFull(false); else resetMode();
});
grip.addEventListener("click", () => { if (dragged) { dragged = false; return; } setFull(!card.classList.contains("full")); });
export function resetMode(){
  // what the camera had framed above the card: a figure, a story step, the thread or a Guide example
  const framed = state.mode==="node" || state.mode==="tour" || !!state.path || !!state.curseKey || !!(state.demo && !state.demo.missing);
  state.demo = null;
  state.mode = null; state.sel = null; state.path = null; state.curseKey = null; state.threadEnds = null;
  curseSel.value = ""; threadBtn.setAttribute("aria-pressed","false");
  // on phones the header comes back as the card goes: the tree stays where it is on screen, and what was
  // framed above the card glides to the centre of the larger space; a plain panel (layers, find…) leaves it be
  const mid = () => graphEl.getBoundingClientRect().top + viewH() / 2;
  const before = mid();
  holdStill(() => { card.classList.remove("open"); setFull(false); setSheet(false); });
  const dy = framed ? mid() - before : 0, t = d3.zoomTransform(graphEl);
  if (!wide() && dy) svg.interrupt().transition().duration(300).call(zoom.transform, d3.zoomIdentity.translate(t.x, t.y + dy).scale(t.k));
  apply(true);
}

/* phone panels: layers, curses, find */
export const panelTop = greek => `<div class="card-top"><span class="greek" lang="grc">${greek}</span><button class="close" data-close>Close</button></div>`;
