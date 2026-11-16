// A walk through the built site in a real browser: every family, every step of every story, a sample of cards,
// the sky layer and the sky map. It fails if any page throws an error. Not part of the build (the deploy has no
// browser): run it by hand before merging a change to the code or to the shape of the data.
//   npm run build && npm run preview &      then      npm run smoke [http://localhost:4173/]
// It needs Playwright, which is not a dependency of the site: any installed copy will do.
const { chromium, devices } = require("playwright");
const fs = require("fs"), path = require("path");
const read = n => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", n + ".json"), "utf8"));
const base = process.argv[2] || "http://localhost:4173/";
(async () => {
  const families = read("branches")[0].families.map(f => f.id), stories = read("stories"), people = read("people");
  const urls = [...families.map(f => `?family=${f}`),
    ...stories.flatMap(s => Array.from({length: s.steps.length + 2}, (_, i) => `?story=${s.id}&step=${i}`)),
    ...people.filter((p, i) => i % 9 === 0 || p.sky || p.kind === "group").map(p => `?figure=${p.id}`),
    "?sky=1", "?view=sky", "?view=sky&source=H", "?source=E", "?family=thebes&source=T"];
  const browser = await chromium.launch(), errors = [];
  for (const [name, opts] of [["desktop", {viewport: {width: 1280, height: 850}}], ["phone", devices["iPhone 13"]]]) {
    const page = await (await browser.newContext(opts)).newPage();
    let at = "";
    page.on("pageerror", e => errors.push(`${name} ${at}: ${e.message}`));
    for (const u of urls) {
      at = u;
      await page.goto(base + u, {waitUntil: "load"});
      await page.waitForTimeout(u.includes("story") ? 250 : 700);
      const drawn = await page.evaluate(() => document.querySelectorAll("#graph .node").length);
      if (!drawn) errors.push(`${name} ${u}: no tree drawn`);
    }
  }
  await browser.close();
  if (errors.length) { console.error(`Smoke: ${errors.length} problems\n  ` + errors.slice(0, 30).join("\n  ")); process.exit(1); }
  console.log(`Smoke: ${urls.length} pages on desktop and phone, no errors.`);
})();
