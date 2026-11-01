const { chromium } = require('playwright');
const fs = require('fs');
const OUT = require('path').resolve(__dirname, '..');  // run: node brand/render.cjs
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=GFS+Didot&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">`;
const C = {
  light:{bg:'#E8CFB2',panel:'#F3E3D0',rule:'#C9A07D',ink:'#1E140D',muted:'#5A3F2C',line:'#2A1D14',gold:'#8A5E00'},
  dark:{bg:'#14100C',panel:'#1F1812',rule:'#3D3024',ink:'#EAD3B8',muted:'#A68E76',line:'#B98C66',gold:'#E8B54A'},
};
const DROP = 'M32 34.5C35 40.5 40.5 44 40.5 50.5a8.5 8.5 0 0 1-17 0C23.5 44 29 40.5 32 34.5Z';
const mark = (c, sw=2, dot=7) => `<circle cx="32" cy="16" r="11" fill="none" stroke="${c.ink}" stroke-width="${sw}"/>
  <circle cx="32" cy="16" r="${dot}" fill="${c.ink}"/><path d="M32 27v8" stroke="${c.ink}" stroke-width="${sw}"/>
  <path d="${DROP}" fill="${c.gold}"/>`;

const icon = (c, size) => `<html><body style="margin:0"><svg width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${c.bg}"/>
  <g transform="translate(32 32) scale(.74) translate(-32 -33)">${mark(c,2.6,6.6)}</g></svg></body></html>`;

// a fragment of the house of Atreus, drawn as the site draws it
function stemma(c){
  const N = {
    tantalus:[150,60,'Tantalus'], pelops:[150,170,'Pelops'], hipp:[290,170,'Hippodamia'],
    atreus:[150,280,'Atreus'], thyestes:[330,280,'Thyestes'],
    agam:[90,390,'Agamemnon'], clyt:[230,390,'Clytemnestra'], men:[390,390,'Menelaus'],
    iph:[40,500,'Iphigenia'], el:[160,500,'Electra'], or:[280,500,'Orestes'],
  };
  const L = (a,b,cls='') => { const [x1,y1]=N[a],[x2,y2]=N[b]; const my=(y1+y2)/2;
    return `<path d="M${x1} ${y1}V${my}H${x2}V${y2}" fill="none" stroke="${cls?c.gold:c.line}" stroke-width="${cls?3:1.4}" ${cls?'':`opacity=".55"`}/>`; };
  const W = (a,b) => { const [x1,y1]=N[a],[x2]=N[b]; return `<path d="M${x1+12} ${y1-2}H${x2-12}M${x1+12} ${y1+2}H${x2-12}" stroke="${c.line}" stroke-width="1.2" opacity=".55"/>`; };
  const F = (a,b) => { const [x1,y1]=N[a],[x2]=N[b]; return `<path d="M${x1+12} ${y1}H${x2-12}" stroke="${c.line}" stroke-width="1.4" stroke-dasharray="9 3 1.5 3" opacity=".55"/>`; };
  let s = L('tantalus','pelops','g') + W('pelops','hipp') + L('pelops','atreus','g') + L('pelops','thyestes') + F('atreus','thyestes')
    + L('atreus','agam','g') + L('atreus','men') + W('agam','clyt') + L('agam','iph') + L('agam','el') + L('agam','or','g');
  for (const [k,[x,y,n]] of Object.entries(N)) {
    const on = ['tantalus','pelops','atreus','agam','or'].includes(k);
    s += `<circle cx="${x}" cy="${y}" r="9" fill="${c.line}" ${on?'':'opacity=".7"'}/>${on?`<circle cx="${x}" cy="${y}" r="14" fill="none" stroke="${c.gold}" stroke-width="1.6"/>`:''}
      <text x="${x}" y="${y+34}" text-anchor="middle" font-family="GFS Didot" font-size="19" fill="${on?c.ink:c.muted}">${n}</text>`;
  }
  return s;
}
const og = c => `<html><head>${FONTS}</head><body style="margin:0">
<div style="width:1200px;height:630px;background:${c.bg};position:relative;overflow:hidden;font-family:Manrope">
  <svg width="1200" height="630" style="position:absolute;inset:0">
    <g transform="translate(700 40)">${stemma(c)}</g>
  </svg>
  <div style="position:absolute;left:84px;top:88px;width:600px">
    <svg width="92" height="92" viewBox="0 0 64 64">${mark(c)}</svg>
    <div style="font:600 17px Manrope;letter-spacing:.16em;text-transform:uppercase;color:${c.muted};margin-top:34px">The family tree of Greek myth</div>
    <div style="font:400 150px/0.95 'GFS Didot';color:${c.ink};margin-top:10px;letter-spacing:.01em">Ichor</div>
    <div style="font:400 31px/1.3 'GFS Didot';color:${c.muted};margin-top:26px;max-width:520px">Gods and heroes, from Gaia to Orestes. Every link with the ancient sources that tell it.</div>
  </div>
</div></body></html>`;

const lockup = (c, transparent) => `<html><head>${FONTS}</head><body style="margin:0;display:inline-block">
<div id="x" style="display:inline-flex;align-items:center;gap:26px;padding:40px 56px;background:${transparent?'transparent':c.bg}">
  <svg width="88" height="88" viewBox="0 0 64 64">${mark(c)}</svg>
  <div><div style="font:400 84px/0.9 'GFS Didot';color:${c.ink};letter-spacing:.02em">Ichor</div>
  <div style="font:600 15px Manrope;letter-spacing:.16em;text-transform:uppercase;color:${c.muted};margin-top:12px">The family tree of Greek myth</div></div>
</div></body></html>`;

(async () => {
  const b = await chromium.launch();
  const shot = async (html, w, h, path, opts={}) => {
    const p = await b.newPage({viewport:{width:w,height:h}, deviceScaleFactor: opts.dpr||1});
    await p.setContent(html, {waitUntil:'networkidle'}); await p.evaluate(() => document.fonts.ready);
    if (opts.el) await (await p.$(opts.el)).screenshot({path, omitBackground: !!opts.transparent});
    else await p.screenshot({path, omitBackground: !!opts.transparent});
    await p.close();
  };
  for (const s of [180,192,512]) await shot(icon(C.light,s), s, s, `${OUT}/public/${s===180?'apple-touch-icon':'icon-'+s}.png`);
  await shot(og(C.light), 1200, 630, `${OUT}/public/og.png`);
  await shot(og(C.dark), 1200, 630, `${OUT}/brand/og-dark.png`);
  await shot(lockup(C.light,false), 900, 300, `${OUT}/brand/ichor-lockup-light.png`, {el:'#x', dpr:2});
  await shot(lockup(C.dark,false), 900, 300, `${OUT}/brand/ichor-lockup-dark.png`, {el:'#x', dpr:2});
  await shot(icon(C.dark,512), 512, 512, `${OUT}/brand/ichor-avatar-dark.png`);
  await b.close();
})();
