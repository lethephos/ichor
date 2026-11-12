/* What the reader has chosen (source, layers, the open figure, story or thread), the kinds of link,
   and a few small helpers every part of the page uses. */
import {N} from "./data.js";

export const LAYERS = [
  {k:"parent", label:"Bloodlines"},
  {k:"marriage", label:"Marriages"},
  {k:"affair", label:"Affairs"},
  {k:"feud", label:"Feuds & killings"},
  {k:"transform", label:"Transformations"},
  {k:"curse", label:"Curses"}
];
export const SAMPLE = {
  parent:`<line x1="0" y1="5" x2="26" y2="5" stroke="var(--line)" stroke-width="1.4"/>`,
  marriage:`<line x1="0" y1="5" x2="26" y2="5" stroke="var(--line)" stroke-width="4"/><line x1="0" y1="5" x2="26" y2="5" stroke="var(--bg)" stroke-width="1.3"/>`,
  affair:`<line x1="0" y1="5" x2="26" y2="5" stroke="var(--line)" stroke-width="1.4" stroke-dasharray="5 4"/>`,
  feud:`<path d="M0,5 L4,1 L8,9 L12,1 L16,9 L20,1 L24,9 L26,5" fill="none" stroke="var(--line)" stroke-width="1.2"/>`,
  transform:`<line x1="0" y1="5" x2="26" y2="5" stroke="var(--transform)" stroke-width="2" stroke-dasharray="1 4" stroke-linecap="round"/>`,
  curse:`<line x1="0" y1="5" x2="22" y2="5" stroke="var(--curse)" stroke-width="1.8"/><path d="M20,1 L26,5 L20,9 z" fill="var(--curse)"/>`
};

export const state = {src:"all", layers:{parent:true, marriage:true, affair:true, feud:true, transform:true, curse:true}, sel:null, hover:null, mode:null, curseKey:null, step:0, pickOpen:false, path:null};
// a media query, not innerWidth: reading the width mid-pan forces a layout of the whole tree
const WIDE = matchMedia("(min-width: 900px)");
export const wide = () => WIDE.matches;

// what the chosen source and layers leave in view
export const attested = e => state.src==="all" || e.sources.includes(state.src);
export const edgeVisible = e => state.layers[e.type] && attested(e);
export const samePair = (e, [x,y]) => (e.from===x && e.to===y) || (e.from===y && e.to===x);
// a group reads as “the Muses” inside a sentence, “The Muses” at its start
export const named = (id, start) => N[id].kind==="group" ? `${start ? "The" : "the"} ${N[id].name}` : N[id].name;
export const esc = t => String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;");
