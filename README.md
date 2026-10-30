# Ichor

*The family tree of the Greek gods.* An interactive family tree of Greek mythology with a versions layer: every link records which ancient sources tell it. See `CLAUDE.md` for the project brief.

## Run

```sh
npm install
npm run dev      # local dev server
npm run build    # static site in dist/
npm run preview  # serve the build
```

## Layout

- `data/` — all content, edited as JSON:
  - `people.json` — figures: `id`, `name`, `greek`, `gender` (`m`/`f`), `generation` (0 = Gods, 1–5 = Generation I–V), `x` (hand-placed horizontal position, to be replaced by the automatic tier layout), `kind` (`god` / `nymph` / `mortal` / `other-cycle`), `branch`, `role`, `tagline`, `story`, and optional `versions` (where the sources disagree), `transformation` (`text`, `sources`) and `art` (`title`, `meta`, `where`, `url`).
  - `relations.json` — links: `type` (`parent` / `marriage` / `affair` / `feud` / `transform` / `curse`), `from`, `to`, `sources`, optional `note`. Order matters: it sets drawing order and which path Ariadne’s thread finds first.
  - `curses.json` — curse lines: `id`, `title`, `lead`, `pairs` (links highlighted on the tree), `steps` (`generation`, `figures`, `text`).
  - `sources.json` — the “All versions” label and note, and the source groups (`id`, `label`, `full`, `note`).
- `src/data.js` — loads the JSON and adds layout coordinates.
- `src/main.js` — tree, controls, card, curse and thread panels.
- `src/styles/` — styles. `index.css` imports the rest in order:
  - `tokens.css` — design tokens: colours for the light (black-figure) and dark (red-figure) themes, fonts, shadow. Change a colour here, nowhere else.
  - `base.css` — page frame, box sizing, focus rings.
  - `header.css`, `controls.css`, `tree.css` (nodes and edge styles), `card.css` (figure card, shared by the panels), `curse-panel.css`, `thread-panel.css` — one file per component.
- `prototype/ichor-atreidae.html` — the original single-file prototype, kept as the reference.

Source group ids: `E` Homer & epic, `H` Hesiod, `T` Lyric & tragedy, `A` Apollodorus, `L` Later writers.
