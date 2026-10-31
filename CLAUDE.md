# Ichor — project brief

## What this is

**Ichor** is an interactive family tree of Greek mythology for an English-speaking audience.
Subtitle: *The family tree of Greek myth* (gods and mortals alike, so not “of the Greek gods”).

It shows not only who descends from whom, but marriages, affairs, feuds and killings, transformations and curses. Its main difference from existing family trees is the **versions layer**: every link records which ancient sources tell it, and the user can switch source (Homer, Hesiod, the tragedians, Apollodorus, later writers) and watch the family rearrange itself.

The first branch is **"Two cursed houses"**: the House of Atreus and the House of Labdacus (Thebes), linked through Pelops and Chrysippus. Above them sit the gods (checked against Hesiod, Homer, the Homeric Hymns, Pindar, Euripides, Apollodorus, Pausanias, Hyginus and Ovid): so the tree runs from Gaia and Uranus down to Orestes. Rows: The first gods, Titans (all twelve of Hesiod, with the Erinyes), Children of the Titans (Zeus and his siblings, the sons of Iapetus, the children of Hyperion, Crius and Coeus, and the goddesses Zeus loved; Nemesis, a daughter of Night, sits there as his lover; Atlas sits there too, with his daughters the Pleiades on a line just below him), The younger gods (the children of Zeus, with Hecate, granddaughter of Coeus; not “Children of Zeus”, since Hecate is not his, and in Hesiod neither are Aphrodite and Hephaestus, and the Moirai are also daughters of Night); then a “Heroes and mortals” divider (not “Mortals”: Harmonia is a goddess, and Semele, Polydeuces, Helen and Iphigenia become immortal in some sources) and Generation I–VI. Thebes runs Cadmus and Harmonia (I), Polydorus, Agave and Semele (II), Labdacus and Pentheus (III), down to Eteocles and his sisters (VI); Semele’s son Dionysus stays with the gods, so his bloodline is the one drawn upwards. The house of Perseus runs Acrisius and Danaë (I), Perseus, Andromeda and Medusa (II), the sons of Perseus with Nicippe, a daughter of Pelops, and Amphitryon and Alcmene on a line below (III), down to Heracles, Eurystheus and Iphicles (IV), the row of Agamemnon: Eurystheus is a grandson of Pelops, born on the same day as Heracles. Creon, Jocasta’s brother, links it to Thebes through his daughter Megara. The Argonauts run from Aeolus (I) through Salmoneus, Cretheus, Athamas, Ino and Tyro (II), Phrixus and Helle, Pelias, Aeson and Aeetes (III), to Jason, Medea, Absyrtus, Glauce, Hypsipyle and Orpheus (IV); Aeetes and Circe are children of Helios, Ino is Cadmus’ daughter, and Heracles, the Dioscuri and Orpheus sail on the Argo. Troy, the house of Dardanus, runs Dardanus, son of Zeus and the Pleiad Electra, with his son Erichthonius on a line below (I), Tros with Ilus, Assaracus and Ganymede below (II), Laomedon and Capys with Priam, Hecuba, Tithonus, Hesione and Anchises below (III), to Hector, Paris, Cassandra, Aeneas and their kin (IV), the row of Agamemnon, and Astyanax (V). Aeacus, Peleus and Thetis lead to Achilles, and his son Neoptolemus marries Hermione, so Troy meets the house of Atreus through Helen, Cassandra and Hermione. The children of Heracles sit on Generation V: Hyllus and Macaria (by Deianira), the sons of Megara (a group: three in Apollodorus and Euripides, eight in Pindar), Telephus, Tlepolemus, and Iolaus, son of Iphicles; Iole and Omphale join Heracles’ row. Hyllus, Iolaus and Alcmene take their revenge on Eurystheus, and Achilles wounds and heals Telephus. Athens runs the earth-born Erichthonius (child of Hephaestus and Gaia, raised by Athena), with his son Pandion below him, and Europa (I); Erechtheus, Procne, Philomela and Tereus, the later Cecrops and Pandion, Minos and Pasiphae (II); Aegeus, Aethra, Itys, Androgeus, Ariadne, Phaedra, the Minotaur, Antiope and Pirithous, with Theseus on a line below (III); Hippolytus and Demophon (IV). Theseus links to the Argonauts through Medea, Aegeus’ wife, and to Atreus through Helen, whom he carried off. The Odyssey runs Sisyphus (son of Aeolus), Autolycus (son of Hermes), Arcesius and Nausithous (II); Laertes and Anticleia, Icarius, Alcinous and Arete, and Telamon, son of Aeacus, with Hesione (III); Odysseus, Penelope, Nausicaa, Palamedes, Ajax, Polyphemus (son of Poseidon) and the companions of Odysseus (a group) (IV); Telemachus, Telegonus (his son by Circe) and the suitors of Penelope (a group) (V). Calypso, daughter of Atlas, sits on a line below him. Sisyphus is drawn as a second father of Odysseus, as Euripides and Hyginus tell it. A group’s card heads its member list with `count` and `members_label` (“A hundred and eight suitors”; “sisters” by default). Rows show a figure’s place in the story rather than a strict generation (Aphrodite, born of Uranus in Hesiod, sits with the younger gods). The Olympians are not a row: they span two, and are marked instead by a small peak beside the medallion (`data/olympians.json`). No poet in our source groups lists all twelve, so the list follows the Parthenon east frieze (Dionysus) and Ennius (Vesta = Hestia), with Plato’s Phaedrus for Hestia; the twelfth seat is hollow. The idea that Hestia gave her seat to Dionysus is modern; don’t add it. The page heading is "From Gaia to Orestes" ("The gods and two cursed houses" sounded wrong).

## Current state

The site is live at https://ichor-orpin.vercel.app (Vite + D3, data in `/data`, deployed from `main` by Vercel). The original prototype, `prototype/ichor-atreidae.html`, stays as the reference for behaviour and tone.

- 214 figures, 492 relations, from Gaia and Uranus to Orestes and Antigone, with the house of Perseus down to Heracles, the house of Aeolus down to Jason and Medea, the house of Dardanus down to the fall of Troy, the children of Heracles, Theseus and Athens with the family of Minos, and the Odyssey, in rows computed from `generation`; a row grows a line downwards for a child whose parent shares the row (with its spouse), so lower always means descended; no staggering, which made height ambiguous; pan and pinch-zoom.
- **Source switcher**: All versions / Homer & epic / Hesiod / Lyric & tragedy / Apollodorus / Later writers. Links not attested in the chosen source fade out; a one-line note says what changes.
- **Layer toggles**: Bloodlines, Marriages, Affairs, Feuds & killings, Transformations, Curses.
- **Figure card**: Greek name, name, tagline, role, story, The Twelve (for Olympians), Born to / Married / Affairs / Feuds & killings / Transformations / Curses / Children (each with its sources), Where the sources disagree, In art.
- **Stories**: the two curses and the myths of Cadmus, Hippodamia, Leda and Iphigenia, told step by step, by all sources or as one source tells it, with “Versions differ” and “Read as” inline.
- **Ariadne’s thread**: the shortest path between two figures, respecting the chosen source.
- Light / dark theme switch; search with live filtering.

## Decisions made so far (can be revisited)

**Visual direction**
- Fonts: GFS Didot (display, names, stories, Greek) + Manrope (interface).
- Palette “pale clay and gold ichor” (chosen in task 4, replaces the first black-figure/red-figure palette). Light theme = black ink on pale, unfired clay. Dark theme = clay lines on black glaze. Follows the system setting until the reader picks a theme with the sun/moon button in the top right corner of the header; the pick is saved in localStorage (`ichor-theme`), and a pick that matches the system is not saved, so the page follows the system again. Tokens live in `src/styles/tokens.css`.
  - Gold is ichor, the blood of the gods: transformations, the selected figure, Ariadne’s thread, focus (`--accent`). Red is for curses only.
  - Light: bg `#E8CFB2`, panel `#F3E3D0`, rule `#C9A07D`, text `#1E140D`, lines `#2A1D14`, muted `#5A3F2C`, curse `#A82A17`, gold `#8A5E00`.
  - Dark: bg `#14100C`, panel `#1F1812`, rule `#3D3024`, text `#EAD3B8`, lines `#B98C66`, muted `#A68E76`, curse `#E0533C`, gold `#E8B54A`.
  - All text meets WCAG AA contrast on both bg and panel.
- Small medallion nodes: gods have a double ring, figures from other cycles a dashed ring, a diamond badge marks a transformation, a small gold star marks a mortal made immortal (Semele, Cadmus, Helen, Menelaus, the Dioscuri, Iphigenia, Heracles, Ino, Ganymede, Tithonus, Ariadne; it hides when the chosen source doesn’t tell it), a small peak marks one of the Twelve Olympians (hollow for Hestia and Dionysus); a group (the Muses, the Fates…) is a ringed medallion holding three small dots.
- Row names sit in a column pinned to the left edge of the screen (small caps, interface font, fixed size at any zoom); the tree slides beneath it and the names follow their rows up and down. The “Heroes and mortals” divider is named there too.
- Edge styles: descent = thin solid; marriage = double line; affair = dashed; feud = dash-dot; transformation = dotted gold with arrow; curse = red with arrow.
- Header (reworked in task 4; the meander band was dropped): a small caps kicker "Ichor · The family tree of Greek myth", then the branch as the page title, "From Gaia to Orestes". "Now exploring" sits above the title, and the title opens the family switcher: Whole tree, The gods, The Titans, Zeus and his loves, Thebes, The House of Atreus, Perseus and Heracles, The Argonauts, Troy, The children of Heracles, Theseus and Athens, The Odyssey (`families` in `data/branches.json`; the choice lives in the URL, `?family=thebes`). Everyone goes into the one pool of data; families keep the tree readable as it grows. Collectives are one medallion each (`kind: group`): the Muses, Moirai, Horae, Charites, Oceanids, Pleiades, Erinyes, the sons of Megara, the suitors of Penelope and the companions of Odysseus; the card lists the sisters. Sources are pills, the chosen one filled; on desktop their note sits on the same line.
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
  - `people.json` — id, name, greek, gender, generation, kind (god / nymph / mortal / other-cycle / group), branch, role, tagline, story, versions, transformation, immortal (text and sources), art; a group adds count, members and members_note.
  - `relations.json` — type, from, to, sources, note.
  - `stories.json` — stories told step by step: the two curses and further myths (`kind`: curse or story). A story marked `draft` still needs checking against the sources; the three myths (Hippodamia, Leda, Iphigenia) have been checked.
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
- Next branches: to be decided (the rest of the house of Minos — Minos, Pasiphae and their children are already in, with Theseus; Bellerophon and Corinth, through Sisyphus; the Seven against Thebes).
