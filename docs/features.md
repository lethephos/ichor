# What the site does

Each part of the interface and how it behaves. `CLAUDE.md` has the short list; `docs/design.md` has the look.

## The tree

- 342 figures and 802 relations in rows computed from `generation`. The whole tree opens at the top, on Gaia and Uranus with the Titans below; each family opens on its own `focus`.
- A row grows a line downwards for a child whose parent shares the row (with its spouse), so lower always means descended. Figures on a line are never staggered: height means descent and nothing else.
- Pan and pinch-zoom.

## Sources

- **Source switcher**: All versions / Homer & epic / Hesiod / Lyric & tragedy / Apollodorus / Later writers. Links not attested in the chosen source fade out.
- A one-line note says what changes, for the family shown (`sourceNote` in `data.js`), chosen in this order:
  1. the family’s own written note for that source (`notes` in `branches.json`; every family has them but the whole tree and the House of Atreus). Each was checked link by link against the data: what that source tells or leaves out in that family, e.g. “In Hesiod, Night marries Erebus and bears Hypnos and Thanatos; the punishments in Hades fade.” An author is named only where the link is known from them.
  2. the written note in `sources.json`, wherever all the figures it names (`note_figures`) are in the family;
  3. a note drawn from the links themselves, so it says nothing the data does not: where a figure has rival fathers or mothers and the source names one of them, which (“In Hesiod, Poseidon is Bellerophon’s father.”), or else how many of the family’s links the source tells (“Hesiod tells 15 of the 46 links in this family; the rest fade.”).
- **Layer toggles**: Bloodlines, Marriages, Affairs, Feuds & killings, Transformations, Curses.
- **Passages**: under the sources of a link the card names the passage where each tells it (“Iliad 1.113–114 · Apollodorus, Epitome 2.16 · Hyginus, Fabulae 117”), in the lists under “Who says so”, in Feuds and fates, in the thread and in the Guide’s examples; with one source chosen, only its passage. The passages come from `cite` on the relation. Each was found in the text before it was written down: Homer, the Homeric Hymns, Apollodorus, Hyginus and Pausanias in the translations on ToposText (Homer to within its five-line sections), the Cypria in Evelyn-White’s fragments on Theoi; Hesiod’s Theogony and Catalogue fragments (Evelyn-White’s numbers), Pindar, Aeschylus, Sophocles and Euripides on ToposText. A tragedy is cited by the speech the line falls in, as that text divides it. Where a passage was not found, the group shows without one.

## The figure card

Who the figure is comes first, then their links and versions, then the stories, which take the reader away from the card. In order:

- Greek name, name, tagline, role, story.
- The Twelve (for Olympians), Changed shape, Made immortal.
- **Family**: a small genealogical tree, as the chosen source tells it. The parents on top (partners side by side, joined by a double or dashed line; with all versions and more than two parents, each names its sources under it), the figure in gold below them, then each partner (wives and husbands, then lovers, then other parents of the children) hanging from a spine with their children listed under them; children with no other parent named go under “No one else named”. Partners come in bands of three (two for long names); after four bands the rest wait behind “Show N more partners”. The lists with sources (Born to, Married, Affairs, Children) sit folded under “Who says so”. Tapping a name moves to that figure.
- **Feuds and fates**: the ring of feuds, curses and transformations, then the lists Feuds & killings / Transformations / Curses with their sources.
- **Where the sources disagree**.
- **In the stories**: every story the figure takes part in, in any family. Each opens at the step where they come in, or at the start if the chosen source skips it. A story the shown family cannot hold says “opens in …” and switches to the smallest family that holds it, so the back button returns.
- **Not in the ancient sources**: popular ideas with a modern origin, each naming where it comes from (Hestia’s seat, Pandora’s box, Atlas holding the earth, Marlowe’s thousand ships, Hecate as crone, the modern Titan domains).
- **In the sky**: for the 17 figures the ancients set among the stars (Perseus, Andromeda, Cepheus, Cassiopeia, the sea monster (Cetus), Pegasus, Heracles, Ladon (Draco), Ariadne (the Crown), Orpheus (the Lyre), Zeus (the Swan), the Nemean Lion, Castor and Polydeuces, Ganymede (Aquarius), Erichthonius of Athens (the Charioteer) and the Pleiades): who put them there, from Hyginus, Astronomica 2, with Ovid for the Crown and Homer and Hesiod for the Pleiades, and Hevelius’ engraving of the constellation from his Uranographia, 1690, public domain on Commons.
- **In art**: links to the works. A work with a picture shows it as a preview on hover on desktop, or behind a small picture button on phones, loaded only when opened; pictures are never embedded in the card itself.

## Stories

- The two curses, how Zeus became king, and the myths of Cadmus, Hippodamia, Leda, Iphigenia, Perseus, the labours of Heracles, Theseus and the Minotaur, Jason and the Golden Fleece, the Seven against Thebes, the Trojan War, the wanderings of Odysseus, Prometheus and the fire, the house of Dardanus, Bellerophon and Pegasus, Minos and Daedalus, Io and the Danaids, Down to Hades, the children of Heracles, the loves of Zeus and the brood of Echidna. Every family has at least one. All have been checked against the sources; a story marked `draft` would still need it.
- A story is told step by step (a curse, generation by generation), by all sources or as one source tells it, with “Versions differ” and “Read as” inline.
- A step is told by a source when the links it reaches first (from its figures to people already met) are attested there. A step can list its own `pairs` when its figures reach further than it tells (Medea meets Jason in Colchis, not yet Pelias); those links wait for their step on the tree.
- **The camera** frames the step’s figures and the other ends of the links that tell it. On phones, when that would come out smaller than 0.4, it frames the step’s own figures only, so they are as large as they can be while all in view. When even those would come out below 0.3 (they sit far apart on one long row, as in the fall of Troy in the Trojan War family), the camera shows them a group at a time, each as large as fits (0.4 or more), in the order the step names them, gliding from one group to the next (`clusters`, `glideThrough`); a pan or a new step stops the glide.
- On phones a story picked in the whole tree opens in its own family (the smallest that holds it; the list says “opens in …” and the back button returns), since in the whole tree its figures sit too far apart to read on a small screen.

## Finding one’s way

- **Ariadne’s thread**: the shortest path between two figures, respecting the chosen source.
- **Search** with live filtering, over the whole tree. The shown family’s own figures come first, then the rest, each saying “opens in …”; picking one of those switches to the family that holds most of its links (`figureHome` in `data.js`: Medea opens with the Argonauts), so the back button returns. Within each part, names that start with what was typed come first, then names with a word that does (Odysseus before the companions of Odysseus). On phones the whole line of a result answers a tap.
- **Links to what is open** (`syncUrl`, `openFromUrl` in `main.js`): the address names the figure, the story step and the source, beside the family: `?figure=medea`, `?story=argonauts&step=3`, `?source=H`; the tab’s title names the figure or story too. Only a change of family adds a step to the browser’s history; the rest rewrites the address in place, so the back button returns to the last family with the card that was open there. A figure or story the family in the address cannot hold opens in its own family (on phones a story in the whole tree does too).

## The opening

`src/styles/intro.css`, `intro()` in `intro.js`.

- The page starts as the logo’s mark alone in the middle of the screen: the star opens its rays (with a slight turn), then a drop gathers at the south ray and settles into place. Once the code and data are in, the mark flies to its place in the header and the rest of the page appears round it (the header’s own mark waits hidden until it lands). While loading goes on, the drop falls away and gathers again. About 1.3 s at the shortest.
- Then the tree lights up: stars twinkle in from the top of the screen down, their links following (bloodlines, marriages and curses drawn as lines, the rest fading in), about two seconds.
- With reduced motion the mark stays still and the page simply fades in. If the code never arrives, the mark gives way after 10 s.
- The opening plays once a session (`sessionStorage` `ichor-opened`, checked in the inline script in the head, which adds `seen`): a reload or a new family link in the same session opens the page at once, with the tree simply fading in.

## Under the bonnet

- **Code layout**: one file per part of the interface (`state`, `theme`, `tree`, `camera`, `sheet`, `controls`, `find`, `figure`, `stories`, `guide`, `thread`, `intro`, `main`; the README says what each holds). The files call each other freely but are set up in that fixed order, each importing the one before it first; that first import must stay.
- **Texts load second** (`vite.config.js`, `whenTexts` in `data.js`): the JSON in `/data` stays whole, but the build splits it. The page’s code carries what the tree needs to draw itself (names, rows, links, the outline of each story); the long texts only a card shows (a figure’s story, tagline, versions, art, sky, members, and the text of each story step) go into a second file, `texts.json`, fetched as soon as the code runs. A figure’s card and a story step wait for the texts (`select`, `openCurse`), so a tap in the first moments opens its card when they arrive; if the file fails to load, the next tap asks for it again.
- **Data check** (`scripts/check-data.mjs`, `npm run check`, run before every build, so a slip stops the deploy): every relation has known figures and sources and is not listed twice (a marriage or affair in either direction), a passage is given only for a source the link lists, story pairs are real relations, families, houses, Olympians and group members name real figures, figures have their texts, pictures their credit and licence.
