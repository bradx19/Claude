// Renders a "day in the life" carousel plan (day.json) into 1080x1350 PNGs plus a preview sheet.
// Slide 1 is a cover, then one slide per time of day, then a closing slide with the facts.
// Each photo sits clean in the top of the slide; all text lives in a solid panel underneath.
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

// A light colour cast on each photo by time of day, kept subtle so the photo still reads true
const moods = {
  morning: 'rgba(255,196,120,.10)',
  midday:  'rgba(255,255,255,0)',
  evening: 'rgba(255,150,70,.12)',
  dusk:    'rgba(150,90,170,.10)',
  night:   'rgba(30,50,110,.18)',
};

const PHOTO_H = 940; // photo area height; the panel fills the rest of the 1350px slide

const head = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1350px; overflow: hidden; position: relative;
    font-family: '${brand.font}', sans-serif; color: #fff; background: ${ink}; }
  .serif { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
  .photo { position: absolute; top: 0; left: 0; right: 0; height: ${PHOTO_H}px; background-size: cover; background-repeat: no-repeat; }
  .wash { position: absolute; inset: 0; mix-blend-mode: soft-light; }
  .panel { position: absolute; top: ${PHOTO_H}px; left: 0; right: 0; bottom: 0; background: ${ink}; border-top: 6px solid ${gold}; }

  /* Small time tag on the photo corner: the only thing on top of the image */
  .tag { position: absolute; top: 48px; left: 48px; padding: 14px 22px; background: rgba(14,26,43,.78); border-radius: 4px;
    font-size: 22px; font-weight: 700; letter-spacing: .18em; color: ${gold}; }

  /* Timeline: one stop per moment of the day */
  .track { position: absolute; top: 40px; left: 72px; right: 72px; height: 50px; }
  .track .line { position: absolute; top: 7px; left: 0; right: 0; height: 2px; background: rgba(255,255,255,.25); }
  .track .done { position: absolute; top: 7px; left: 0; height: 2px; background: ${gold}; }
  .stop { position: absolute; top: 0; transform: translateX(-50%); text-align: center; }
  .stop i { display: block; width: 16px; height: 16px; margin: 0 auto; border-radius: 50%; border: 2px solid rgba(255,255,255,.55); background: ${ink}; }
  .stop.past i { background: #fff; border-color: #fff; }
  .stop.now i { background: ${gold}; border-color: ${gold}; box-shadow: 0 0 0 6px rgba(212,168,75,.25); }
  .stop span { display: block; margin-top: 10px; font-size: 16px; font-weight: 600; letter-spacing: .08em; color: rgba(255,255,255,.55); white-space: nowrap; }
  .stop.now span { color: ${gold}; }

  .row { position: absolute; top: 122px; left: 72px; right: 72px; display: flex; align-items: center; gap: 44px; }
  .time { flex: none; line-height: .85; text-align: left; }
  .time b { display: block; font-size: 132px; font-weight: 300; font-style: italic; letter-spacing: -.03em; }
  .time em { display: block; margin-top: 6px; font-style: normal; font-family: '${brand.font}'; font-size: 24px; font-weight: 700; letter-spacing: .24em; color: ${gold}; }
  .vr { flex: none; width: 2px; align-self: stretch; background: rgba(255,255,255,.18); }
  .headline { font-size: 50px; font-weight: 500; line-height: 1.08; letter-spacing: -.01em; }
  .sub { font-size: 25px; line-height: 1.4; margin-top: 12px; color: rgba(255,255,255,.78); }

  .footer { position: absolute; left: 72px; right: 72px; bottom: 40px; display: flex; justify-content: space-between;
    font-size: 18px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: rgba(255,255,255,.55); }
  .footer .swipe { color: ${gold}; }

  /* Cover */
  .cover .copy { position: absolute; top: 44px; left: 72px; right: 72px; }
  .eyebrow { font-size: 22px; font-weight: 700; letter-spacing: .24em; text-transform: uppercase; color: ${gold}; }
  .cover h1 { font-weight: 400; line-height: 1; margin-top: 18px; }
  .cover h1 .a { font-size: 64px; font-style: italic; font-weight: 300; }
  .cover h1 .b { display: block; font-size: 104px; letter-spacing: -.02em; }
  .cover .sub { margin-top: 18px; }

  /* Closing */
  .strip { position: absolute; top: 72px; left: 72px; right: 72px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .strip div { height: 600px; background-size: cover; background-position: center; border-radius: 6px; position: relative; }
  .strip div span { position: absolute; left: 0; right: 0; bottom: -36px; text-align: center; font-size: 18px; font-weight: 600; letter-spacing: .08em; color: rgba(255,255,255,.6); }
  .close .copy { position: absolute; left: 72px; right: 72px; bottom: 120px; }
  .close h2 { font-size: 92px; font-weight: 400; line-height: 1; letter-spacing: -.02em; margin-top: 18px; }
  .facts { list-style: none; padding: 0; margin-top: 34px; display: grid; grid-template-columns: repeat(3, auto); justify-content: start; gap: 14px 48px; font-size: 28px; }
  .facts li { padding-left: 28px; position: relative; color: rgba(255,255,255,.9); }
  .facts li::before { content: ''; position: absolute; left: 0; top: 13px; width: 11px; height: 11px; background: ${gold}; transform: rotate(45deg); }
  .button { display: inline-block; margin-top: 44px; padding: 22px 38px; background: ${gold}; color: ${ink}; font-size: 24px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; border-radius: 4px; }
  .who { display: inline-block; margin-left: 28px; font-size: 24px; color: rgba(255,255,255,.7); }
</style></head><body>`;

const footer = (n, total, swipe) =>
  `<div class="footer"><span>${esc(brand.team)} • ${esc(plan.footer)}</span><span class="${swipe ? 'swipe' : ''}">${swipe ? 'Swipe →' : `${n} / ${total}`}</span></div>`;

function track(active) {
  const n = plan.moments.length;
  const x = i => (n === 1 ? 50 : 4 + (i / (n - 1)) * 92);
  const stops = plan.moments.map((m, i) =>
    `<div class="stop ${i < active ? 'past' : i === active ? 'now' : ''}" style="left:${x(i)}%"><i></i><span>${esc(m.label)}</span></div>`).join('');
  return `<div class="track"><div class="line"></div><div class="done" style="width:${x(active)}%"></div>${stops}</div>`;
}

const photo = (p, focus, mood, tag = '') =>
  `<div class="photo" style="background-image:url('${img(p)}');background-position:${focus || 'center'}">
    <div class="wash" style="background:${moods[mood] || moods.midday}"></div>${tag}</div>`;

function coverSlide(total) {
  const c = plan.cover;
  return `${head}<div class="cover">${photo(c.photo, c.focus, 'midday')}
    <div class="panel"><div class="copy"><div class="eyebrow">${esc(c.eyebrow)}</div>
      <h1 class="serif"><span class="a">${esc(c.kicker)}</span><span class="b">${esc(c.title)}</span></h1>
      <div class="sub">${esc(c.sub)}</div></div>
    ${footer(1, total, true)}</div></div></body></html>`;
}

function momentSlide(m, i, total) {
  const [num, ampm] = m.time.split(' ');
  return `${head}${photo(m.photo, m.focus, m.mood, `<div class="tag">${esc(m.label)}</div>`)}
    <div class="panel">${track(i)}
      <div class="row"><div class="time serif"><b>${esc(num)}</b><em>${esc(ampm)}</em></div><div class="vr"></div>
        <div><div class="headline serif">${esc(m.headline)}</div><div class="sub">${esc(m.sub)}</div></div></div>
      ${footer(i + 2, total)}</div></body></html>`;
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
