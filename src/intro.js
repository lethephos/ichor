/* The opening: the mark lands in the header and the tree lights up. */
import * as d3 from "d3";
import {N} from "./data.js";
import "./thread.js";
import {graphEl, nodeSel, edgeSel} from "./tree.js";

/* The tree lights up once the page has loaded: each star twinkles in from the top of the screen down
   (lower means descended), and its links are drawn in after it. With reduced motion it simply fades in. */
const html = document.documentElement;
export function intro(){
  html.classList.add("ready");
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sp = document.getElementById("splash");
  const seen = html.classList.contains("seen");
  try { sessionStorage.setItem("ichor-opened", "1"); } catch(e) {}
  if (!sp || seen) { if (sp) sp.remove(); html.classList.add("landed"); return lightUp(calm || seen); }
  // wait for the drop to rest in its place (30–70% of each 1.6s cycle, which starts 0.8s in), then land
  const drop = sp.querySelector(".sp-drop").getAnimations()[0];
  let wait = 0;
  if (!calm && drop) {
    const t = drop.currentTime - 800, ph = t < 0 ? -1 : t % 1600;
    wait = t < 0 ? 480 - t : ph < 480 ? 480 - ph : ph <= 1120 ? 0 : 2080 - ph;
  }
  setTimeout(() => {
    if (drop) drop.pause();
    const mark = sp.querySelector("svg"), target = document.querySelector(".kicker .wm-sep");
    const r = target && target.getBoundingClientRect();
    if (!calm && r && r.height) {
      const s = mark.getBoundingClientRect();
      mark.style.transform = `translate(${r.left + r.width/2 - s.left - s.width/2}px,${r.top + r.height/2 - s.top - s.height/2}px) scale(${r.height / s.height})`;
    } else mark.style.opacity = 0;
    html.classList.add("splash-out");
    lightUp(calm);
    setTimeout(() => { html.classList.add("landed"); sp.remove(); }, calm ? 350 : 800);
  }, wait);
}
function lightUp(calm){
  if (calm) { graphEl.classList.add("intro-calm"); return; }
  const t = d3.zoomTransform(graphEl), h = graphEl.clientHeight;
  const at = y => Math.round(80 + Math.min(1, Math.max(0, (t.y + y * t.k) / h)) * 900);
  nodeSel.style("--d", d => at(d.y) + "ms");
  const SOLID = new Set(["parent", "marriage", "curse"]);
  edgeSel.classed("draw", e => SOLID.has(e.type))
    .style("--d", e => at(Math.min(N[e.from].y, N[e.to].y)) + 260 + "ms")
    .each(function(e){ if (SOLID.has(e.type)) d3.select(this).selectAll(".edge").attr("pathLength", 1); });
  graphEl.classList.add("intro");
  setTimeout(() => {
    graphEl.classList.remove("intro");
    nodeSel.style("--d", null); edgeSel.classed("draw", false).style("--d", null).selectAll(".edge").attr("pathLength", null);
  }, 2200);
}
