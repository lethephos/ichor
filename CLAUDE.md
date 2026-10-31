# Ichor — project brief

## What this is

**Ichor** is an interactive family tree of Greek mythology for an English-speaking audience.
Subtitle: *The family tree of the Greek gods*.

It shows not only who descends from whom, but marriages, affairs, feuds and killings, transformations and curses. Its main difference from existing family trees is the **versions layer**: every link records which ancient sources tell it, and the user can switch source (Homer, Hesiod, the tragedians, Apollodorus, later writers) and watch the family rearrange itself.

The first branch is **"Two cursed houses"**: the House of Atreus and the House of Labdacus (Thebes), linked through Pelops and Chrysippus. Above them sit the gods (added in draft): the primordial gods, the Titans, the Olympians and the younger gods, so the tree runs from Gaia and Uranus down to Orestes. The page heading is now "The gods and two cursed houses".

## Current state

A working single-file prototype: `ichor-atreidae.html` (HTML + CSS + JS, D3 7.8.5 from cdnjs). All content is already fact-checked. Treat it as the reference for behaviour, content and style.

Features in the prototype:

- 43 figures, ~95 relations, laid out in tiers by generation (Gods, Generation I–V), pan and pinch-zoom.
- **Source switcher**: All versions / Homer & epic / Hesiod / Lyric & tragedy / Apollodorus / Later writers. Links not attested in the chosen source fade out; figures with disputed versions pulse; a one-line note says what changes.
- **Layer toggles**: Bloodlines, Marriages, Affairs, Feuds & killings, Transformations, Curses.
- **Figure card** (bottom sheet on mobile, side panel on desktop): Greek name, name, one-line dramatic tagline, role, story, Born to / Married / Affairs / Feuds & killings / Transformations / Curses / Children (each with its sources), "Where the sources disagree", "In art" (1–2 works with links).
- **Trace a curse**: the curse on the House of Atreus and on the House of Labdacus, told generation by generation and highlighted on the tree.
- **Ariadne’s thread**: pick two figures, get the shortest path between them (respects the selected source), narrated step by step.

## Decisions made so far (can be revisited)

**Visual direction**
- Fonts: GFS Didot (display, names, stories, Greek) + Manrope (interface).
- Palette “pale clay and gold ichor” (chosen in task 4, replaces the first black-figure/red-figure palette). Light theme = black ink on pale, unfired clay. Dark theme = clay lines on black glaze. Follows the system setting. Tokens live in `src/styles/tokens.css`.
  - Gold is ichor, the blood of the gods: transformations, the selected figure, Ariadne’s thread, focus (`--accent`). Red is for curses only.
  - Light: bg `#E8CFB2`, panel `#F3E3D0`, rule `#C9A07D`, text `#1E140D`, lines `#2A1D14`, muted `#5A3F2C`, curse `#A82A17`, gold `#8A5E00`.
  - Dark: bg `#14100C`, panel `#1F1812`, rule `#3D3024`, text `#EAD3B8`, lines `#B98C66`, muted `#A68E76`, curse `#E0533C`, gold `#E8B54A`.
  - All text meets WCAG AA contrast on both bg and panel.
- Small medallion nodes: gods have a double ring, figures from other cycles a dashed ring, a diamond badge marks a transformation.
- Edge styles: descent = thin solid; marriage = double line; affair = dashed; feud = dash-dot; transformation = dotted gold with arrow; curse = red with arrow.
- Header (reworked in task 4; the meander band was dropped): a small caps kicker "Ichor · The family tree of the Greek gods", then "Now exploring", then the branch as the page title, "Two cursed houses", with "Atreus and Labdacus" beside it on desktop and under it on phones. The title will become a branch switcher. Sources are pills, the chosen one filled; on desktop their note sits on the same line.
- Tools: on desktop the layer toggles, Trace a curse, Ariadne’s thread and the search box float in a dock at the bottom of the tree; on phones four buttons (Layers, Curses, Thread, Find) float at the bottom and open panels in the card sheet. "Whole tree" sits in the top corner of the tree.

**Tone**
- Taglines read like a family drama ("Served his brother a dinner of his own children."). Stories: short sentences, past tense.
- All user-facing text in English, with typographic quotes and apostrophes.

**Sources**
- Groups: E = Homer, Homeric Hymns, Cypria; H = Hesiod (Theogony, Catalogue of Women); T = Pindar, Stesichorus, Aeschylus, Sophocles, Euripides; A = Apollodorus, Library; L = Pausanias, Hyginus, Ovid.
- Every relation must list its sources. Never add a link or a version without a source.

## Target structure

Keep it simple: a static site, no backend.

- Vite + vanilla TypeScript (or plain JS) + D3.
- Data out of the code, in `/data`:
  - `people.json` — id, name, greek, gender, generation, kind (god / nymph / mortal / other-cycle), branch, role, tagline, story, versions, transformation, art.
  - `relations.json` — type, from, to, sources, note.
  - `stories.json` — stories told step by step: the two curses and further myths (`kind`: curse or story). A story marked `draft` was assembled from existing card texts and relation notes and still needs checking.
  - `sources.json` — source groups and their labels.
- Styles as design tokens (CSS variables) in one file; components separate (tree, card, controls, curse panel, thread panel).
- Layout computed from data (generation tiers), so new branches can be added by editing JSON only.
- Deploy to Vercel.

## First tasks, in order

1. Set up the project and move all data from the prototype into JSON. The result must look and behave exactly like the prototype.
2. Split styles into tokens and components.
3. Replace hand-placed x positions with an automatic tier layout.
4. Visual polish (to be discussed with me step by step), especially on mobile.
5. Deploy to Vercel.

## Open questions

- Final name: Ichor or Stemma. Check domain and social handles.
- Images in cards: only from Wikimedia Commons or museums with open licences, always with credit. Licence notes per artwork are in the verification document.
- Hesiod fragment numbering: Catalogue of Women fr. 23a (Merkelbach–West); the Most (Loeb) number still needs checking.
- Next branches: the Olympians, the children of Zeus.
