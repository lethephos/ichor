# Ichor

*The family tree of Greek myth.* An interactive family tree of Greek mythology with a versions layer: every link records which ancient sources tell it. See `CLAUDE.md` for the project brief.

## Run

```sh
npm install
npm run dev      # local dev server
npm run build    # static site in dist/
npm run preview  # serve the build
```

## Layout

- `data/` — all content, edited as JSON:
  - `people.json` — figures: `id`, `name`, `greek`, `gender` (`m`/`f`), `generation` (the row, counted from the top; its name comes from `tiers` in `branches.json`), optional `draft` (true until checked), `kind` (`god` / `nymph` / `mortal` / `other-cycle`), `branch`, `role`, `tagline`, `story`, and optional `versions` (where the sources disagree), `transformation` (`text`, `sources`) and `art` (`title`, `meta`, `where`, `url`).
  - `relations.json` — links: `type` (`parent` / `marriage` / `affair` / `feud` / `transform` / `curse`), `from`, `to`, `sources`, optional `note`, optional `draft`. Order matters: it sets drawing order and which path Ariadne’s thread finds first.
  - `stories.json` — stories told step by step: `id`, `kind` (`curse` or `story`), `title`, `lead`, optional `draft` (true until the text is checked), `pairs` (the links the story highlights; each must be an existing relation), `steps` (`label`, `figures`, `text`). A figure may come back in later steps; it counts as met from the step where it first appears. Told by one source, a step is kept only if one of its links to the story so far is attested in that source, and it lists what that source records. Where the sources disagree, a step shows the alternative parents found in the data (for figures it introduces whose parentage the story covers) and the figures’ own Where the sources disagree text; no extra text is needed.
  - `olympians.json` — the Twelve Olympians, shown as a small peak at the upper left of a figure (hollow where only some lists count the god) and as a “The Twelve” section in the card: `note`, `core` (ids in every list we follow), `core_text`, `twelfth` (`id`, `text`: the gods who take the twelfth seat in some lists).
  - `sources.json` — the “All versions” label and note, and the source groups (`id`, `label`, `full`, `note`).
  - `branches.json` — branches of the tree: `id`, `title` and optional `subtitle` (the page heading), `tiers` (the names of the rows, from the top), `focus` (the figure the phone view opens on), `houses` (`label`, `founder`; the house name is drawn above its founder), optional `dividers` (`before`, `label`; a stronger rule drawn above row `before` and named on the left, such as “Mortals” where the gods end).
- `src/layout.js` — automatic tier layout. Rows come from `generation`; x is computed: each figure is pulled towards the figures it is linked to (blood and marriage most, affairs and feuds less), and rows are spaced so labels never collide and separate families stand apart. Nothing in the data holds a position, so a new figure only needs a `generation` and its relations. Where a row has ties, the order in `people.json` decides.
- `src/data.js` — loads the JSON and runs the layout.
- `src/main.js` — tree, controls, card, curse and thread panels.
- `src/styles/` — styles. `index.css` imports the rest in order:
  - `tokens.css` — design tokens: colours for the light (pale clay) and dark (black glaze) themes, the gold accent, fonts, shadow. Change a colour here, nowhere else.
  - `base.css` — page frame, box sizing, focus rings.
  - `header.css`, `controls.css`, `tree.css` (nodes and edge styles), `card.css` (figure card, shared by the panels), `curse-panel.css`, `thread-panel.css` — one file per component.
- `prototype/ichor-atreidae.html` — the original single-file prototype, kept as the reference.

Source group ids: `E` Homer & epic, `H` Hesiod, `T` Lyric & tragedy, `A` Apollodorus, `L` Later writers.
