/* A figure’s card: who they are, their family tree, feuds and fates, versions, stories, sky and art. */
import {E, N, SRC, H, ALL_STORIES, OLY, OLY_NOTE} from "./data.js";
import "./find.js";
import {attested, esc, state} from "./state.js";
import {hevStar, svg, root, STAR} from "./tree.js";
import {srcText, card, relItem, shell, draftTag} from "./sheet.js";
import {storyMove} from "./stories.js";

/* Family: a small family tree of the figure, as the chosen source tells it.
   Parents on top (partners side by side), the figure below them, and under the figure its partners,
   each with the children they had together; children with no other parent named hang from the figure alone.
   Partners come in bands of two or three, joined to the figure by a line down the left, so a large family
   (Zeus) grows downwards like the card. Versions show as extra parents. */
const CF_W = 340, FT_BANDS = 4;
const SRC_SHORT = {E: "Homer", H: "Hesiod", T: "tragedy", A: "Apollodorus", L: "later"};
const dotSvg = (p, x, y, r) => `<g transform="translate(${x},${y})">${hevStar(p.kind==="god" ? r+3 : r+1, p.kind)}</g>`;
const ftLink = (type, d) => type==="marriage"
  ? `<g class="e e-marriage"><path class="edge main" d="${d}" stroke-width="4"/><path class="edge inner" d="${d}"/></g>`
  : `<g class="e e-${type==="affair" ? "affair" : "parent"}"><path class="edge main" d="${d}" stroke-width="1.2"/></g>`;
function familyTree(id){
  const live = E.filter(e => attested(e));
  const mine = live.filter(e => e.from===id || e.to===id);
  const other = e => e.from===id ? e.to : e.from;
  const uniq = ids => [...new Set(ids)];
  const parents = uniq(mine.filter(e => e.type==="parent" && e.to===id).map(e => e.from));
  const kids = uniq(mine.filter(e => e.type==="parent" && e.from===id).map(e => e.to));
  const union = (a, b) => live.find(e => (e.type==="marriage" || e.type==="affair") && ((e.from===a && e.to===b) || (e.from===b && e.to===a)));
  if (!parents.length && !kids.length && !mine.some(e => e.type==="marriage" || e.type==="affair")) return "";
  const me = N[id];
  const fit = (t, w) => t.length * 6.6 > w ? t.slice(0, Math.max(3, Math.floor(w/6.6) - 1)) + "…" : t;
  const node = (o, x, y, r, label) => `<g class="cf-n" data-go="${o}" role="button" tabindex="0" aria-label="${esc(N[o].name)}"><circle class="hit" cx="${x}" cy="${y}" r="15"/>${dotSvg(N[o], x, y, r)}${label}</g>`;

  // parents: partners side by side, each dropping to a bar above the figure
  let top = "", y = 0;
  const FX = 12;
  if (parents.length) {
    const order = [], left = [...parents];
    while (left.length) { const a = left.shift(); order.push(a); const i = left.findIndex(b => union(a, b)); if (i >= 0) order.push(left.splice(i, 1)[0]); }
    const n = order.length, gap = Math.min(120, (CF_W - 20) / n), xs = order.map((_, i) => 40 + i*gap);
    // when the sources disagree on the parents, each says who tells it
    const versions = state.src==="all" && n > 2;
    const py = 16, bar = py + (versions ? 54 : 44);
    const parts = [];
    order.forEach((o, i) => { if (i) { const u = union(order[i-1], o); if (u) parts.push(ftLink(u.type, `M${xs[i-1]+9},${py} L${xs[i]-9},${py}`)); } });
    order.forEach((o, i) => parts.push(ftLink("parent", `M${xs[i]},${py + (versions ? 42 : 28)} L${xs[i]},${bar}`)));
    parts.push(ftLink("parent", `M${FX},${bar} L${xs[n-1]},${bar} M${FX},${bar} L${FX},${bar+22}`));
    const tellers = o => { const srcs = new Set(live.filter(e => e.type==="parent" && e.from===o && e.to===id).flatMap(e => e.sources)); return Object.keys(SRC_SHORT).filter(k => srcs.has(k)).map(k => SRC_SHORT[k]).join(", "); };
    order.forEach((o, i) => parts.push(node(o, xs[i], py, 5, `<text class="cf-l" x="${xs[i]}" y="${py+22}" text-anchor="middle">${esc(fit(N[o].name, gap-6))}</text>` +
      (versions ? `<text class="cf-src" x="${xs[i]}" y="${py+36}" text-anchor="middle">${esc(fit(tellers(o), gap-4))}</text>` : ""))));
    top = parts.join(""); y = bar + 22;
  }
  // the figure itself
  const fy = y + 10;
  top += `<g class="cf-me">${dotSvg(me, FX, fy, 7)}<text class="cf-l me" x="${FX+16}" y="${fy+5}">${esc(me.name)}</text></g>`;

  // partners, each with the children they had together
  const partners = [], byId = {};
  const add = (o, type) => { if (!byId[o]) { byId[o] = {id: o, type, kids: []}; partners.push(byId[o]); } return byId[o]; };
  mine.filter(e => e.type==="marriage").forEach(e => add(other(e), "marriage"));
  mine.filter(e => e.type==="affair").forEach(e => add(other(e), "affair"));
  const alone = {id: null, type: null, kids: []};
  kids.forEach(k => {
    const co = uniq(live.filter(e => e.type==="parent" && e.to===k && e.from!==id).map(e => e.from));
    const known = co.filter(o => byId[o]);
    if (known.length) known.forEach(o => byId[o].kids.push(k));
    else if (co.length) co.forEach(o => add(o, "co").kids.push(k));
    else alone.kids.push(k);
  });
  if (alone.kids.length) partners.push(alone);

  // pack the partners into bands of three, or two when a name is long
  const isLong = q => (q.id && N[q.id].name.length > 12) || q.kids.some(k => N[k].name.length > 10);
  const bands = [];
  for (let i = 0; i < partners.length;) {
    const three = partners.slice(i, i+3), long = three.some(isLong);
    const per = long ? 2 : 3; bands.push(partners.slice(i, i+per)); i += per;
  }
  const svg = (h, body, label) => `<svg class="cf-svg ft" viewBox="-6 0 ${CF_W+12} ${h}" role="img" aria-label="${label}">${body}</svg>`;
  const out = [svg(fy + 12 + (bands.length ? 0 : 8), top + (bands.length ? ftLink("parent", `M${FX},${fy+8} L${FX},${fy+12}`) : ""), `Parents of ${esc(me.name)}`)];
  bands.forEach((band, b) => {
    const per = band.length === 2 || band.some(isLong) ? 2 : 3;
    const colW = (CF_W - 28) / per, rows = Math.max(...band.map(q => q.kids.length));
    const h = 52 + rows*24 + 8, last = b === bands.length - 1, parts = [];
    const xs = band.map((_, i) => 28 + i*colW + 6);
    parts.push(ftLink("parent", `M${FX},0 L${FX},${last ? 12 : h} M${FX},12 L${xs[xs.length-1]},12`));
    band.forEach((q, i) => {
      const x = xs[i], py = 40;
      if (q.id) {
        parts.push(ftLink(q.type==="co" ? "parent" : q.type, `M${x},12 L${x},${py-6}`));
        parts.push(node(q.id, x, py, 5, `<text class="cf-l" x="${x+11}" y="${py+5}">${esc(fit(N[q.id].name, colW-18))}</text>`));
      } else parts.push(`<text class="cf-h" x="${x+2}" y="${py+4}">No one else named</text>`);
      if (q.kids.length) {
        const ky = j => 66 + j*24;
        parts.push(ftLink("parent", `M${x},${q.id ? py+6 : 12} L${x},${ky(q.kids.length-1)}` + q.kids.map((_, j) => ` M${x},${ky(j)} L${x+10},${ky(j)}`).join("")));
        q.kids.forEach((k, j) => parts.push(node(k, x+14, ky(j), 3.5, `<text class="cf-l kid" x="${x+22}" y="${ky(j)+4.5}">${esc(fit(N[k].name, colW-30))}</text>`)));
      }
    });
    out.push(`<div class="ft-band${b >= FT_BANDS ? " more" : ""}">${svg(h, parts.join(""), `Partners and children of ${esc(me.name)}`)}</div>`);
  });
  const hidden = bands.slice(FT_BANDS).reduce((n, b) => n + b.filter(q => q.id).length, 0);
  return `<div class="ft-wrap">${out.join("")}</div>${hidden ? `<button class="ft-all" type="button">Show ${hidden} more partners</button>` : ""}`;
}
function familySec(id, lists){
  const tree = familyTree(id);
  if (!tree && !lists.length) return "";
  return `<div class="sec cf"><h3>Family</h3>${tree}
    ${tree ? `<p class="cf-note">${state.src==="all" ? "All versions at once: a figure may have more parents than one." : "As " + SRC[state.src] + " tell it."} Double lines are marriages, dashed lines affairs. Tap a name to move to them.</p>` : ""}
    ${lists.length ? `<details class="who"><summary>Who says so</summary>${lists.map(([h, items]) => `<h4>${h}</h4><ul class="rels">${items.join("")}</ul>`).join("")}</details>` : ""}</div>`;
}
function fatesSec(id, lists){
  const mine = E.filter(e => (e.from===id || e.to===id) && attested(e) && ["feud","curse","transform"].includes(e.type));
  const other = e => e.from===id ? e.to : e.from, seen = new Set();
  const fates = mine.filter(e => { const o = other(e); if (seen.has(o)) return false; seen.add(o); return true; });
  if (!fates.length && !lists.length) return "";
  return `<div class="sec"><h3>Feuds and fates</h3>${fates.length ? fateWheel(id, N[id], fates, dotSvg) : ""}${lists.map(([h, items]) => `<h4>${h}</h4><ul class="rels">${items.join("")}</ul>`).join("")}</div>`;
}

/* Feuds and fates: rivals, curses and transformations on a ring around the figure,
   so their links never cross the family above. */
const WHEEL_MAX = 14;
function fateWheel(id, me, fates, dot){
  if (!fates.length) return "";
  const other = e => e.from===id ? e.to : e.from;
  const shown = fates.slice(0, WHEEL_MAX), n = shown.length;
  // a tall, narrow ring leaves room at the sides for the names
  const rx = n > 8 ? 70 : 62, ry = n > 8 ? 124 : 78, C = {x: CF_W/2, y: ry + 40};
  const parts = shown.map((e, i) => {
    const t = -Math.PI/2 + (i + (n % 2 ? 0 : 0.5)) * 2*Math.PI/n, c = Math.cos(t), s = Math.sin(t);
    const x = C.x + rx*c, y = C.y + ry*s, o = other(e), p = N[o];
    const a = e.from===id ? C : {x, y}, b = e.from===id ? {x, y} : C;
    const len = Math.hypot(b.x-a.x, b.y-a.y), cut = (e.from===id ? 10 : 12) / len;
    const bx = b.x - (b.x-a.x)*cut, by = b.y - (b.y-a.y)*cut;
    const arrow = e.type==="curse" || e.type==="transform" ? ` marker-end="url(#arr-${e.type})"` : "";
    const anchor = c > 0.1 ? "start" : c < -0.1 ? "end" : "middle";
    const lx = x + (anchor==="start" ? 11 : anchor==="end" ? -11 : 0), ly = anchor==="middle" ? (s < 0 ? y-11 : y+19) : y+4;
    // a long name breaks onto two lines at its middle space
    const words = p.name.split(" "), half = Math.ceil(words.length/2);
    const label = p.name.length > 13 && words.length > 1
      ? `<tspan x="${lx}" dy="-7">${esc(words.slice(0, half).join(" "))}</tspan><tspan x="${lx}" dy="15">${esc(words.slice(half).join(" "))}</tspan>`
      : esc(p.name);
    return {edge: `<g class="e e-${e.type}"><path class="edge main" d="M${a.x},${a.y} L${bx},${by}" stroke-width="1.2"${arrow}/></g>`,
      fig: `<g class="cf-n" data-go="${o}" role="button" tabindex="0" aria-label="${esc(p.name)}"><circle class="hit" cx="${x}" cy="${y}" r="16"/>${dot(p, x, y, 5)}<text class="cf-l" x="${lx}" y="${ly}" text-anchor="${anchor}">${label}</text></g>`};
  });
  const H = C.y + ry + 36 + (fates.length > WHEEL_MAX ? 16 : 0);
  return `<svg class="cf-svg cf-wheel" viewBox="-8 0 ${CF_W+16} ${H}" role="img" aria-label="Feuds and fates of ${esc(me.name)}">
    ${parts.map(q => q.edge).join("")}${parts.map(q => q.fig).join("")}
    <g class="cf-me">${dot(me, C.x, C.y, 7)}<text class="cf-l me" x="${C.x}" y="${C.y+4}" dx="12" text-anchor="start"></text></g>
    ${fates.length > WHEEL_MAX ? `<text class="cf-more" x="${CF_W/2}" y="${H-6}" text-anchor="middle">and ${fates.length - WHEEL_MAX} more</text>` : ""}
  </svg>`;
}
function storiesOf(id){
  const list = ALL_STORIES.map(c => [c, c.steps.findIndex(s => s.figures.includes(id))]).filter(([, i]) => i >= 0);
  if (!list.length) return "";
  return `<div class="sec"><h3>In the stories</h3><ul class="opts in-stories">${list.map(([c, i]) => {
    const home = storyMove(c);
    const where = i ? `From step ${i+1}, ${esc(c.steps[i].label)}` : esc(c.lead);
    return `<li><button class="opt" data-story="${c.id}" data-at="${i+1}"${home ? ` data-family="${home.id}"` : ""}><span>${c.title}${c.draft ? ` <em class="draft">draft</em>` : ""}<small>${where}${home ? ` · opens in ${esc(home.label)}` : ""}</small></span></button></li>`;
  }).join("")}</ul></div>`;
}
/* In art: the titles are links; a picture from Wikimedia Commons shows only on demand, as a preview:
   on hover or focus where there is a mouse, by a small button on touch screens. It is loaded the first time it opens,
   with its credit and licence; if it cannot be loaded, the preview and its button go away. */
const COMMONS = "https://commons.wikimedia.org/wiki/File:";
const PIC_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor"/><circle cx="5.5" cy="6.5" r="1.3" fill="currentColor"/><path d="M2 12 L6.5 8.5 L9 10.5 L11.5 8 L14 10.5" fill="none" stroke="currentColor"/></svg>`;
// a figure the ancients set among the stars, with Hevelius’ engraving of the constellation
function skySec(k){
  const page = COMMONS + encodeURIComponent(k.image.file.replace(/ /g, "_"));
  return `<div class="sec sky"><h3>In the sky</h3><p class="sky-name">${k.constellation}</p>
    <figure class="sky-pic"><img onclick="this.classList.toggle('orig')" title="Tap for the plate as printed" src="${k.image.thumb}" alt="${esc(k.constellation)}, engraved by Johannes Hevelius" loading="lazy" decoding="async">
    <figcaption>${esc(k.image.credit)} · ${esc(k.image.licence)}, via <a href="${page}" target="_blank" rel="noopener">Wikimedia Commons</a></figcaption></figure>
    <p class="sky-text">${k.text}</p><p class="sky-cite">${k.cite}${srcText(k.sources)}</p></div>`;
}
function artItem({title:t, meta:m, where:w, url:u, image:im}){
  const link = u ? `<a class="t" href="${u}" target="_blank" rel="noopener">${t}</a>` : `<span class="t" tabindex="0">${t}</span>`;
  if (!im) return `<li>${link}<br><span class="m">${m}. ${w}</span></li>`;
  const page = COMMONS + encodeURIComponent(im.file.replace(/ /g, "_"));
  return `<li class="has-pic">${link}<button class="pic-btn" aria-expanded="false" aria-label="Show picture of ${esc(t)}" title="Show picture">${PIC_ICON}</button><br><span class="m">${m}. ${w}</span>
    <figure class="art-pic" hidden><img data-src="${im.thumb}" alt="${esc(t)}" decoding="async">
    <figcaption>${esc(im.credit)} · ${im.licence_url ? `<a href="${im.licence_url}" target="_blank" rel="noopener">${esc(im.licence)}</a>` : esc(im.licence)}, via <a href="${page}" target="_blank" rel="noopener">Wikimedia Commons</a></figcaption></figure></li>`;
}
function wirePictures(root){
  const hover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  root.querySelectorAll(".has-pic").forEach(li => {
    const fig = li.querySelector(".art-pic"), img = fig.querySelector("img"), btn = li.querySelector(".pic-btn"), t = li.querySelector(".t");
    const show = on => {
      if (on && !img.src) { img.onerror = () => { fig.remove(); btn.remove(); }; img.src = img.dataset.src; }
      fig.hidden = !on; btn.setAttribute("aria-expanded", on);
    };
    btn.onclick = () => { fig.classList.remove("float"); show(fig.hidden); };
    if (hover) {
      let timer;
      const open = () => {
        clearTimeout(timer);
        if (!fig.hidden) return;
        fig.classList.add("float"); show(true);
        // below the title, or above it when the card has no room underneath
        const room = card.getBoundingClientRect().bottom - t.getBoundingClientRect().bottom;
        const up = room < 360 && t.getBoundingClientRect().top - card.getBoundingClientRect().top > room;
        fig.style.top = up ? "auto" : t.offsetTop + t.offsetHeight + 4 + "px";
        fig.style.bottom = up ? li.offsetHeight - t.offsetTop + 4 + "px" : "auto";
      };
      const close = () => { timer = setTimeout(() => { if (fig.classList.contains("float")) { show(false); fig.classList.remove("float"); } }, 120); };
      [t, fig].forEach(el => { el.addEventListener("mouseenter", open); el.addEventListener("mouseleave", close); });
      t.addEventListener("focus", open); t.addEventListener("blur", close);
    }
  });
}
const FAMILY_LISTS = ["Born to", "Married", "Affairs", "Children"];
export function renderNode(id){
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
    <h2 class="card-name">${p.name}${draftTag(p)}</h2>
    ${p.draft ? `<p class="draft-note">This figure was added from Hesiod, Homer, the Homeric Hymns, Apollodorus, Pindar and Hyginus, and is not yet checked.</p>` : ""}
    <p class="card-tag">${p.tagline}</p>
    <p class="card-role">${p.role}</p>
    <p class="card-story">${p.story}</p>
    ${p.members ? `<div class="sec"><h3>${p.count ? `${p.count} ${p.members_label || "sisters"}` : "Who they are"}</h3><ul class="rels members">${p.members.map(m => `<li>${m.id && N[m.id] ? `<button class="rel" data-go="${m.id}">${m.name}</button>` : `<span class="rel static">${m.name}</span>`} <span class="greek-sm" lang="grc">${m.greek}</span>${m.note ? `<span class="note">${m.note}</span>` : ""}</li>`).join("")}</ul>${p.members_note ? `<p class="oly-note">${p.members_note}</p>` : ""}</div>` : ""}
    ${OLY[id] ? `<div class="sec"><h3>The Twelve</h3><p class="oly-text"><svg class="oly-mark" viewBox="-6 -5 12 10" aria-hidden="true"><path class="oly ${OLY[id].in}" d="M0,-4 L4.5,3.5 L-4.5,3.5 Z"/></svg>${OLY[id].text}</p><p class="oly-note">${OLY_NOTE}</p></div>` : ""}
    ${p.transformation ? `<div class="sec"><h3>Changed shape</h3><ul class="rels"><li><span class="rel static">${p.transformation.text}</span>${srcText(p.transformation.sources)}</li></ul></div>` : ""}
    ${p.immortal ? `<div class="sec"><h3>Made immortal</h3><ul class="rels"><li><span class="rel static"><svg class="imm-mark" viewBox="-6 -6 12 12" aria-hidden="true"><path class="imm" d="${STAR}"/></svg>${p.immortal.text}</span>${srcText(p.immortal.sources)}</li></ul></div>` : ""}
    ${familySec(id, groups.filter(g => FAMILY_LISTS.includes(g[0])))}
    ${fatesSec(id, groups.filter(g => !FAMILY_LISTS.includes(g[0])))}
    ${p.versions ? `<div class="sec"><h3>Where the sources disagree</h3><div class="ver">${p.versions}</div></div>` : ""}
    ${storiesOf(id)}
    ${p.modern ? `<div class="sec"><h3>Not in the ancient sources</h3>${p.modern.map(t => `<div class="ver modern">${t}</div>`).join("")}</div>` : ""}
    ${p.sky ? skySec(p.sky) : ""}
    ${p.art ? `<div class="sec"><h3>In art</h3><ul class="rels art">${p.art.map(artItem).join("")}</ul></div>` : ""}
    <p class="legend">Each link lists the sources that record it. Underlined artworks open a page about the work; the picture icon shows the work itself.</p>`);
  wirePictures(card);
  const all = card.querySelector(".ft-all");
  if (all) all.onclick = () => { card.querySelectorAll(".ft-band.more").forEach(b => b.classList.remove("more")); all.remove(); };
}
