// Renders a "day in the life" carousel plan (day.json) into 1080x1350 PNGs plus a preview sheet.
// Slide 1 is a cover, then one slide per time of day, then a closing slide with the facts.
// Usage: node render-day.js <path/to/day.json>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const planPath = path.resolve(process.argv[2] || '');
if (!fs.existsSync(planPath)) {
  console.error('Usage: node render-day.js <path/to/day.json>');
  process.exit(1);
}
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const planDir = path.dirname(planPath);
const brand = JSON.parse(fs.readFileSync(path.join(__dirname, 'brand', `${plan.brand}.json`), 'utf8'));
const outDir = path.join(planDir, 'output-day');
fs.mkdirSync(outDir, { recursive: true });

const { gold, ink } = brand.colors;
const esc = (s = '') => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const img = p => `data:image/jpeg;base64,${fs.readFileSync(path.resolve(planDir, p)).toString('base64')}`;

// Light over each photo, by time of day: a soft colour wash plus how dark the bottom gets
const moods = {
  morning: { wash: 'rgba(255,196,120,.16)', blend: 'soft-light' },
  midday:  { wash: 'rgba(255,255,255,0)',   blend: 'normal' },
  evening: { wash: 'rgba(255,140,60,.22)',  blend: 'soft-light' },
  dusk:    { wash: 'rgba(120,70,160,.18)',  blend: 'soft-light' },
  night:   { wash: 'rgba(20,40,90,.35)',    blend: 'multiply' },
};

const head = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1350px; overflow: hidden; position: relative;
    font-family: '${brand.font}', sans-serif; color: #fff; background: ${ink}; }
  .photo { position: absolute; inset: 0; background-size: cover; background-repeat: no-repeat; }
  .wash { position: absolute; inset: 0; }
  .shade { position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(14,26,43,.70) 0%, rgba(14,26,43,0) 20%, rgba(14,26,43,0) 42%, rgba(14,26,43,.80) 72%, ${ink} 100%); }
  .serif { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
  .brand { position: absolute; top: 64px; left: 72px; font-size: 22px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; }

  /* Timeline across the top: one stop per moment of the day */
  .track { position: absolute; top: 132px; left: 72px; right: 72px; height: 60px; }
  .track .line { position: absolute; top: 9px; left: 0; right: 0; height: 2px; background: rgba(255,255,255,.35); }
  .track .done { position: absolute; top: 9px; left: 0; height: 2px; background: ${gold}; }
  .stop { position: absolute; top: 0; transform: translateX(-50%); text-align: center; }
  .stop i { display: block; width: 20px; height: 20px; margin: 0 auto; border-radius: 50%; border: 2px solid rgba(255,255,255,.7); background: ${ink}; }
  .stop.past i { background: #fff; border-color: #fff; }
  .stop.now i { background: ${gold}; border-color: ${gold}; box-shadow: 0 0 0 8px rgba(212,168,75,.28), 0 0 28px rgba(212,168,75,.8); }
  .stop span { display: block; margin-top: 14px; font-size: 18px; font-weight: 600; letter-spacing: .08em; color: rgba(255,255,255,.7); white-space: nowrap; }
  .stop.now span { color: ${gold}; }

  .copy { position: absolute; left: 72px; right: 72px; bottom: 170px; text-shadow: 0 2px 20px rgba(14,26,43,.45); }
  .time { display: flex; align-items: baseline; gap: 18px; line-height: .9; }
  .time b { font-size: 230px; font-weight: 300; font-style: italic; letter-spacing: -.03em; }
  .time em { font-style: normal; font-family: '${brand.font}'; font-size: 34px; font-weight: 700; letter-spacing: .2em; color: ${gold}; }
  .headline { font-size: 74px; font-weight: 500; line-height: 1.05; margin-top: 18px; letter-spacing: -.01em; }
  .sub { font-size: 32px; line-height: 1.4; margin-top: 22px; color: rgba(255,255,255,.88); max-width: 900px; }

  .footer { position: absolute; left: 72px; right: 72px; bottom: 64px; display: flex; justify-content: space-between;
    font-size: 22px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.8);
    border-top: 1.5px solid rgba(255,255,255,.35); padding-top: 26px; }
  .footer .swipe { color: ${gold}; }

  /* Cover */
  .cover .copy { bottom: 190px; text-shadow: 0 2px 24px rgba(14,26,43,.6); }
  .cover .shade { background: linear-gradient(to bottom, rgba(14,26,43,.6) 0%, rgba(14,26,43,0) 18%, rgba(14,26,43,0) 30%, rgba(14,26,43,.85) 55%, ${ink} 100%); }
  .eyebrow { font-size: 26px; font-weight: 700; letter-spacing: .24em; text-transform: uppercase; color: ${gold}; }
  .cover h1 { font-weight: 400; line-height: .95; margin-top: 26px; }
  .cover h1 .a { display: block; font-size: 96px; font-style: italic; font-weight: 300; }
  .cover h1 .b { display: block; font-size: 132px; letter-spacing: -.02em; }
  .rule { width: 120px; height: 4px; background: ${gold}; margin: 40px 0 30px; }

  /* Closing */
  .close { background: ${ink}; }
  .strip { position: absolute; top: 96px; left: 72px; right: 72px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
  .strip div { height: 420px; background-size: cover; background-position: center; border-radius: 6px; position: relative; }
  .strip div span { position: absolute; left: 0; right: 0; bottom: -40px; text-align: center; font-size: 19px; font-weight: 600; letter-spacing: .08em; color: rgba(255,255,255,.7); }
  .close .copy { bottom: 190px; }
  .close h2 { font-size: 104px; font-weight: 400; line-height: 1; letter-spacing: -.02em; margin-top: 22px; }
  .close h2 i { font-weight: 300; }
  .facts { list-style: none; padding: 0; margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px 40px; font-size: 30px; }
  .facts li { padding-left: 30px; position: relative; color: rgba(255,255,255,.92); }
  .facts li::before { content: ''; position: absolute; left: 0; top: 14px; width: 12px; height: 12px; background: ${gold}; transform: rotate(45deg); }
  .button { display: inline-block; margin-top: 54px; padding: 24px 40px; background: ${gold}; color: ${ink}; font-size: 26px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; border-radius: 4px; }
  .who { display: inline-block; margin-left: 28px; font-size: 26px; color: rgba(255,255,255,.75); }
</style></head><body>`;

const footer = (n, total, swipe) =>
  `<div class="footer"><span>${esc(plan.footer)}</span><span class="${swipe ? 'swipe' : ''}">${swipe ? 'Swipe →' : `${n} / ${total}`}</span></div>`;

function track(active) {
  const n = plan.moments.length;
  const x = i => (n === 1 ? 50 : 4 + (i / (n - 1)) * 92);
  const stops = plan.moments.map((m, i) =>
    `<div class="stop ${i < active ? 'past' : i === active ? 'now' : ''}" style="left:${x(i)}%"><i></i><span>${esc(m.label)}</span></div>`).join('');
  return `<div class="track"><div class="line"></div><div class="done" style="width:${x(active)}%"></div>${stops}</div>`;
}

function photoLayers(photo, focus, mood) {
  const m = moods[mood] || moods.midday;
  return `<div class="photo" style="background-image:url('${img(photo)}');background-position:${focus || 'center'}"></div>
    <div class="wash" style="background:${m.wash};mix-blend-mode:${m.blend}"></div><div class="shade"></div>`;
}

function coverSlide(total) {
  const c = plan.cover;
  return `${head}<div class="cover">${photoLayers(c.photo, c.focus, 'morning')}
    <div class="brand">${esc(brand.team)}</div>
    <div class="copy"><div class="eyebrow">${esc(c.eyebrow)}</div>
      <h1 class="serif"><span class="a">${esc(c.kicker)}</span><span class="b">${esc(c.title)}</span></h1>
      <div class="rule"></div><div class="sub">${esc(c.sub)}</div></div>
    ${footer(1, total, true)}</div></body></html>`;
}

function momentSlide(m, i, total) {
  const [num, ampm] = m.time.split(' ');
  return `${head}${photoLayers(m.photo, m.focus, m.mood)}
    <div class="brand">${esc(brand.team)}</div>${track(i)}
    <div class="copy"><div class="time serif"><b>${esc(num)}</b><em>${esc(ampm)}</em></div>
      <div class="headline serif">${esc(m.headline)}</div><div class="sub">${esc(m.sub)}</div></div>
    ${footer(i + 2, total)}</body></html>`;
}

function closingSlide(total) {
  const c = plan.closing;
  const strip = plan.moments.map(m =>
    `<div style="background-image:url('${img(m.photo)}');background-position:${m.focus || 'center'}"><span>${esc(m.label)}</span></div>`).join('');
  const facts = c.facts.map(f => `<li>${esc(f)}</li>`).join('');
  return `${head}<div class="close"><div class="strip">${strip}</div>
    <div class="copy"><div class="eyebrow">${esc(c.eyebrow)}</div>
      <h2 class="serif">${esc(brand.closing.headline)}</h2>
      <ul class="facts">${facts}</ul>
      <div><span class="button">${esc(c.button)}</span><span class="who">${esc(c.who)}</span></div></div>
    ${footer(total, total)}</div></body></html>`;
}

(async () => {
  const total = plan.moments.length + 2;
  const pages = [coverSlide(total), ...plan.moments.map((m, i) => momentSlide(m, i, total)), closingSlide(total)];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  const files = [];
  for (const [i, html] of pages.entries()) {
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(outDir, `slide_${i + 1}.png`);
    await page.screenshot({ path: file });
    files.push(file);
  }

  // Preview sheet: all slides in a row, for a quick review before posting
  const thumbs = files.map(f => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">`).join('');
  await page.setViewportSize({ width: 1900, height: 400 });
  await page.setContent(`<body style="margin:0;padding:24px;background:#ECE9E3;display:flex;flex-wrap:wrap;gap:20px">
    <style>img{width:240px;height:300px}</style>${thumbs}</body>`);
  await page.screenshot({ path: path.join(outDir, 'preview.png'), fullPage: true });

  await browser.close();
  console.log(`Rendered ${files.length} slides to ${outDir}`);
})();
