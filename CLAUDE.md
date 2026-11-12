# Ichor — project brief

## What this is

**Ichor** is an interactive family tree of Greek mythology for an English-speaking audience.
Subtitle: *The family tree of Greek myth* (gods and mortals alike, so not “of the Greek gods”).

It shows not only who descends from whom, but marriages, affairs, feuds and killings, transformations and curses. Its main difference from existing family trees is the **versions layer**: every link records which ancient sources tell it, and the user can switch source (Homer, Hesiod, the tragedians, Apollodorus, later writers) and watch the family rearrange itself.

The site is live at https://ichor-orpin.vercel.app. It is a static site with no backend: Vite + D3, plain JavaScript, data as JSON in `/data`, deployed from `main` by Vercel.

## Where things are written down

This file holds the rules and the short picture. The detail lives in `docs/`; read the one the task touches, and update it when the task changes what it says.

- `docs/tree.md` — who sits on which row and why: the gods, the heroes’ rows I–VII, every family and house.
- `docs/features.md` — each part of the interface, how it behaves and why: the source switcher, the card, stories and their camera, the thread, search, the opening, links, the build.
- `docs/design.md` — the look, the palette, the logo, the header, the card bar, the Guide.
- `README.md` — how to run it, the fields of each JSON file, what each source file holds.

## Rules

**Sources**
- Groups: E = Homer, Homeric Hymns, Cypria; H = Hesiod (Theogony, Catalogue of Women); T = Pindar, Stesichorus, Aeschylus, Sophocles, Euripides; A = Apollodorus, Library; L = Pausanias, Hyginus, Ovid.
- Every relation must list its sources. Never add a link or a version without a source.
- A note names an author only where the link is known from them.
- A passage (`cite` on a relation, per source group) is written only after it has been found in the text itself, never from memory. A group with no checked passage is left out; the card then shows the group alone.
- An idea with a modern origin (Hestia giving her seat to Dionysus, Pandora’s box) appears only as a “Not in the ancient sources” note naming where it comes from, never as a link or a version.

**Tone**
- Taglines read like a family drama ("Served his brother a dinner of his own children."). Short sentences. Stories told step by step are in the present tense; the story on a figure’s card is in the past tense (present only for what is still true).
- All user-facing text in English, with typographic quotes and apostrophes.

**The tree**
- Rows count descent within each house, not time: “Lower means descended, not later.” Siblings share a row; a child whose parent shares the row drops a line below. The rows are never aligned by time: that would break one of those two.
- Nothing in the data holds a position. Layout is computed from `generation` and the relations, so a new figure needs only JSON. Places stay fixed when the source changes.
- Everyone goes into the one pool of data; families (`families` in `branches.json`) are views that keep the tree readable. A collective is one figure of `kind: group`.

**Look**
- A modern star chart after Hevelius: clean ivory by day, graphite by night. Fonts: GFS Didot (display, names, stories, Greek) and Manrope (interface).
- Gold is ichor, the blood of the gods: transformations, the selected figure, Ariadne’s thread, focus. Red is for curses only. The logo is gold only.
- Colours are tokens in `src/styles/tokens.css`; change a colour there, nowhere else.
- Buttons are square, like the cells of a table.
- Edge styles: descent = thin solid; marriage = double line; affair = dashed; feud = dash-dot; transformation = dotted gold with arrow; curse = red with arrow.

**Images**
- Only from Wikimedia Commons or museums with open licences, always with credit and licence.

**Code**
- Keep it simple: no backend, no framework, one dependency (D3).
- The files in `src/` are set up in a fixed order, each importing the one before it first (`state`, `theme`, `tree`, `camera`, `sheet`, `controls`, `find`, `figure`, `stories`, `guide`, `thread`, `intro`, `main`). That first import must stay.
- `npm run check` checks the data and runs before every build; a slip in the JSON stops the deploy.
- The build splits the data: the tree’s part goes with the code, the long texts a card shows come in a second file. A card waits for them through `whenTexts`. A new text field belongs in `TEXT_FIELDS` in `vite.config.js`.

**Working with the reader**
- Visual changes are discussed step by step; most points in `docs/design.md` were settled with the reader, so ask before changing one.
- Test a change on a phone (iPhone 13) and on desktop (1280×850), in light and dark, before showing it.
- A change that should not alter behaviour is checked by walking the old and new builds side by side.

## Current state

- 342 figures, 802 relations, 23 stories, from Gaia and Uranus down to Orestes, Antigone and the Epigoni. Rows: The first gods, Titans and their kin, Zeus and his kin, The younger gods, then the “Heroes and mortals” divider and rows I–VII.
- Families: Whole tree, The gods, The Titans, Zeus and his loves, Thebes, The House of Atreus, Perseus and Heracles, The Argonauts, Troy, The children of Heracles, Theseus and Athens, The Odyssey, The Seven against Thebes, Bellerophon and Corinth, The house of Minos, Io and the Danaids, Monsters and their killers, Orpheus and the underworld, The Trojan War. The page heading for the whole tree is “Gods and heroes”.
- Source switcher (All versions / Homer & epic / Hesiod / Lyric & tragedy / Apollodorus / Later writers) with a note per family and source; layer toggles.
- Figure card: who the figure is, a small family tree, feuds and fates, where the sources disagree, the stories they take part in, what is not ancient, the sky, art.
- Stories told step by step, by all sources or as one source tells them; every family has at least one, and all have been checked against the sources.
- Ariadne’s thread, search over the whole tree, the Guide with a tour, light and dark themes, the opening.
- The address names what is open: `?family=thebes`, `?figure=medea`, `?story=argonauts&step=3`, `?source=H`.

## Open questions

- Final name: Ichor or Stemma. Check domain and social handles.
- Images in cards: only from Wikimedia Commons or museums with open licences, always with credit. Each art entry with a picture has `image: {file, thumb, credit, licence, licence_url}` (`file` is the Commons file name, `thumb` its 960px thumbnail; paintings credit the painter, photos of sculpture credit the photographer with the CC licence linked). 36 of 37 works have one; the head of the Nemesis of Rhamnous has no open photo on Commons yet. Licence notes per artwork are in the verification document.
- Hesiod fragment numbering: Catalogue of Women fr. 23a (Merkelbach–West); the Most (Loeb) number still needs checking.
- Next branches: to be decided.
- A database: none for now (all data is static JSON, the theme pick is in localStorage). Left for the future, for features readers write to: accounts, favourites, comments, suggested corrections.
- Exact citations. 1,247 of the 1,961 link-and-source pairs have a passage (653 of 802 links have at least one). The House of Atreus was done by hand; the rest with `scripts/passages/match.py`, in two passes. The strict pass keeps a sentence that names both figures in a pattern of kinship, marriage, love or the deed; its finds were read wherever the pattern is loose (Homer, the tragedians, loves, deeds matched on one word) and sampled elsewhere. The loose pass (`LOOSE=1`) takes both figures close together in one section; all 482 of its finds were read and 124 thrown out. Still without a passage (714): links the texts tell without naming both figures together, deeds told in other words, and Hesiod’s papyrus fragments (Merkelbach–West 23a, 195), which the text used (Evelyn-White) does not have. These need reading the works themselves, figure by figure. Checking the passages also corrects the sources: where a listed source does not tell the link, it is taken off; where one tells it and was not listed, it is added.
