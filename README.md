# Ichor

*The family tree of Greek myth.* An interactive family tree of Greek mythology with a versions layer: every link records which ancient sources tell it. See `CLAUDE.md` for the project brief.

**Live site: [ichor-orpin.vercel.app](https://ichor-orpin.vercel.app)**

## Run

```sh
npm install
npm run dev      # local dev server
npm run build    # static site in dist/
npm run preview  # serve the build
```

## Layout

- `data/` — all content, edited as JSON:
  - `people.json` — figures: `id`, `name`, `greek`, `gender` (`m`/`f`), `generation` (the row, counted from the top; its name comes from `tiers` in `branches.json`), optional `draft` (true until checked), `kind` (`god` / `nymph` / `mortal` / `other-cycle` / `group`), `branch`, `role`, `tagline`, `story`, and optional `versions` (where the sources disagree), for a group `count` (“Nine”), `members` (`name`, `greek`, optional `note`, and `id` if the member is drawn on her own) and `members_note`, `members_label` (what heads the member list: “sisters” by default), `transformation` (`text`, `sources`), `immortal` (`text`, `sources`: a mortal made immortal, shown as a small gold star at the upper left), `modern` (popular ideas the ancient sources do not hold, each naming its modern origin), `sky` (`constellation`, `text`, `cite`, `sources`, `image`: for figures set among the stars) and `art` (`title`, `meta`, `where`, `url`, optional `image`: `file`, `thumb`, `credit`, `licence`, `licence_url`, from Wikimedia Commons).
  - `relations.json` — links: `type` (`parent` / `marriage` / `affair` / `feud` / `transform` / `curse`), `from`, `to`, `sources`, optional `note`, optional `draft`. Order matters: it sets drawing order and which path Ariadne’s thread finds first.
  - `stories.json` — stories told step by step: `id`, `kind` (`curse` or `story`), `title`, `lead`, optional `draft` (true until the text is checked), `pairs` (the links the story highlights; each must be an existing relation), `steps` (`label`, `figures`, optional `pairs`, `text`). A figure may come back in later steps; it counts as met from the step where it first appears. A step is told by the links it reaches first, from its figures to people already met; a step can list its own `pairs` when its figures reach further than it tells. Told by one source, a step is kept only if one of those links is attested in that source, and it lists what that source records. Where the sources disagree, a step shows the alternative parents found in the data (for figures it introduces whose parentage the story covers) and the figures’ own Where the sources disagree text; no extra text is needed.
  - `olympians.json` — the Twelve Olympians, shown as a small peak at the upper left of a figure (hollow where only some lists count the god) and as a “The Twelve” section in the card: `note`, `core` (ids in every list we follow), `core_text`, `twelfth` (`id`, `text`: the gods who take the twelfth seat in some lists).
  - `sources.json` — the “All versions” label and note, and the source groups (`id`, `label`, `full`, `note`, `in` and `tells` for notes drawn from the data, `note_figures`: the written `note` shows only in a family that holds all of them).
  - `branches.json` — branches of the tree: `id`, `title` and optional `subtitle` (the page heading), `tiers` (the names of the rows, from the top), `focus` (the figure the phone view opens on), `houses` (`label`, `founder`; the house name is drawn above its founder), `families` (views on the one tree, chosen in the title and kept in the URL as `?family=id`: `id`, `label`, `title`, `note`, optional `notes` (one written note per source group, shown when that source is picked), `focus`, optional `figures` (all figures when left out) and `houses` (the house labels it shows); a family shows the links between its figures, the rows it uses and the stories it holds every figure of), optional `dividers` (`before`, `label`; a stronger rule drawn above row `before` and named on the left, such as “Heroes and mortals” where the gods end).
- `public/` — favicon (follows the system theme), touch and app icons, `site.webmanifest`, and `og.png`, the card shown when a link is shared.
- `brand/` — the logo as SVG: the mark (a four-rayed star whose south ray runs into a drop of gold) and the wordmark, the mark beside “Ichor”, for light and dark backgrounds.
- `src/layout.js` — automatic tier layout. Rows come from `generation`; x is computed: each figure is pulled towards the figures it is linked to (blood and marriage most, affairs and feuds less), and rows are spaced so labels never collide and separate families stand apart. Nothing in the data holds a position, so a new figure only needs a `generation` and its relations. Where a row has ties, the order in `people.json` decides. A row grows downwards when it needs to: a child whose parent sits on the same row goes on a line below (with its spouse), so lower on a row always means descended.
- `src/data.js` — loads the JSON and runs the layout.
- `src/main.js` — tree, controls, card, curse and thread panels.
- `src/styles/` — styles. `index.css` imports the rest in order:
  - `tokens.css` — design tokens: colours, the gold accent, fonts, shadow. Its base palette is the earlier pale clay and black glaze, shown with `?look=clay`.
  - `stars.css` — the default look, a modern star chart after Hevelius: ivory by day, graphite by night, over the tokens. Change a colour here or in `tokens.css`, nowhere else.
  - `atlas.css` — a mockup of the antique star atlas, only with `?look=atlas`.
  - `intro.css` — the opening: the mark draws itself, flies to the header, and the tree lights up.
  - `base.css` — page frame, box sizing, focus rings.
  - `header.css`, `controls.css`, `tree.css` (nodes and edge styles), `card.css` (figure card, shared by the panels), `curse-panel.css`, `thread-panel.css` — one file per component.
- `prototype/ichor-atreidae.html` — the original single-file prototype, kept as the reference.

Source group ids: `E` Homer & epic, `H` Hesiod, `T` Lyric & tragedy, `A` Apollodorus, `L` Later writers.
