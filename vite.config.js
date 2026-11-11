import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/* The data stays whole in /data, but the page loads it in two parts: what the tree needs to draw itself
   (names, rows, links, the outline of each story), then the long texts that only a card shows
   (stories, taglines, versions, art, sky, members, and the text of each story step).
   `virtual:ichor-core` is part of the main bundle; the texts are a second file, `texts.json`, fetched once the tree is up. */
const TEXT_FIELDS = ["story", "tagline", "versions", "art", "modern", "sky", "members", "members_note", "members_label", "count"];
const file = name => fileURLToPath(new URL(`./data/${name}.json`, import.meta.url));
const read = name => JSON.parse(readFileSync(file(name), "utf8"));

function splitTexts(){
  const CORE = "virtual:ichor-core", TEXTS = "virtual:ichor-texts-url", DEV_URL = "/@ichor/texts.json";
  let serving = false;
  const core = () => {
    const slim = read("people").map(p => {
      const q = Object.fromEntries(Object.entries(p).filter(([k]) => !TEXT_FIELDS.includes(k)));
      if (p.versions) q.versions = true;   // the tree marks figures the sources disagree on
      return q;
    });
    const outline = read("stories").map(s => ({...s, steps: s.steps.map(({text, ...step}) => step)}));
    return `export const people = ${JSON.stringify(slim)};\nexport const stories = ${JSON.stringify(outline)};`;
  };
  const texts = () => JSON.stringify({
    people: Object.fromEntries(read("people").map(p => [p.id, Object.fromEntries(TEXT_FIELDS.filter(k => k in p).map(k => [k, p[k]]))])),
    stories: Object.fromEntries(read("stories").map(s => [s.id, s.steps.map(st => st.text)]))
  });
  return {
    name: "ichor-split-texts",
    resolveId(id){ if (id === CORE || id === TEXTS) return "\0" + id; },
    load(id){
      if (id !== "\0" + CORE && id !== "\0" + TEXTS) return;
      ["people", "stories"].forEach(n => this.addWatchFile(file(n)));
      if (id === "\0" + CORE) return core();
      // the texts are a file of their own, so the page can ask for it again if the first try fails
      if (serving) return `export default ${JSON.stringify(DEV_URL)};`;
      return `export default import.meta.ROLLUP_FILE_URL_${this.emitFile({type: "asset", name: "texts.json", source: texts()})};`;
    },
    configureServer(server){
      serving = true;
      server.middlewares.use((req, res, next) => {
        if (req.url.split("?")[0] !== DEV_URL) return next();
        res.setHeader("Content-Type", "application/json"); res.end(texts());
      });
    },
    handleHotUpdate({file: f, server}){ if (f === file("people") || f === file("stories")) server.ws.send({type: "full-reload"}); }
  };
}

export default { plugins: [splitTexts()] };
