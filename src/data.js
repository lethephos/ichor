import people from "../data/people.json";
import relations from "../data/relations.json";
import curses from "../data/curses.json";
import sources from "../data/sources.json";

/* ---------- sources ---------- */
export const SRC = Object.fromEntries(sources.groups.map(s => [s.id, s.label]));
export const SRC_FULL = Object.fromEntries(sources.groups.map(s => [s.id, s.full]));
export const SRC_NOTE = {all: sources.all.note, ...Object.fromEntries(sources.groups.map(s => [s.id, s.note]))};
export const SRC_ALL_LABEL = sources.all.label;

/* ---------- layout (hand-placed x until the automatic tier layout lands) ---------- */
export const ROWY = [90, 245, 400, 555, 710, 865];
export const GENS = ["Gods", "Generation I", "Generation II", "Generation III", "Generation IV", "Generation V"];
export const OX = 720;
export const W = 2440, H = 950;

/* ---------- figures and relations ---------- */
export const P = people.map(p => ({...p, x: p.x + OX, y: ROWY[p.generation]}));
export const N = Object.fromEntries(P.map(p => [p.id, p]));
export const E = relations.map((r, i) => ({...r, i, note: r.note || ""}));

/* ---------- curse lines ---------- */
export const CURSES = Object.fromEntries(curses.map(c => [c.id, {...c, nodes: new Set(c.pairs.flat())}]));
