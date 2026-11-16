// Builds data/sky.json, the stars and constellation figures the sky map draws, from the open data of
// d3-celestial by Olaf Frohn (BSD 3-Clause): https://github.com/ofrohn/d3-celestial, folder data/.
//   node scripts/sky.mjs <folder holding stars.6.json, constellations.lines.json and constellations.json>
// Right ascension is kept in degrees, 0–360; stars down to magnitude 5.
import {readFileSync, writeFileSync} from "node:fs";
const dir = process.argv[2];
if (!dir) { console.error("usage: node scripts/sky.mjs <folder with the d3-celestial data files>"); process.exit(1); }
const read = f => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")).features;
const ra = lon => +(((lon % 360) + 360) % 360).toFixed(2), dec = lat => +lat.toFixed(2), pt = ([lon, lat]) => [ra(lon), dec(lat)];
const stars = read("stars.6.json").filter(s => s.properties.mag <= 5).map(s => [...pt(s.geometry.coordinates), +s.properties.mag.toFixed(1)]).sort((a, b) => a[2] - b[2]);
const lines = Object.fromEntries(read("constellations.lines.json").map(c => [c.id, c.geometry.coordinates.map(l => l.map(pt))]));
const names = Object.fromEntries(read("constellations.json").map(c => [c.id, {name: c.properties.name, at: pt(c.geometry.coordinates)}]));
const out = {credit: "Stars and constellation figures: d3-celestial by Olaf Frohn, BSD 3-Clause licence", stars, lines, names};
writeFileSync(new URL("../data/sky.json", import.meta.url), JSON.stringify(out));
console.log(`${stars.length} stars, ${Object.keys(lines).length} constellations`);
