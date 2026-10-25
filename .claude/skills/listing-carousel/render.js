// Renders a carousel plan (slides.json) into 1080x1350 PNGs plus a preview sheet.
// Usage: node render.js <path/to/slides.json>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const planPath = path.resolve(process.argv[2] || '');
if (!fs.existsSync(planPath)) {
  console.error('Usage: node render.js <path/to/slides.json>');
  process.exit(1);
}
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const planDir = path.dirname(planPath);
const brand = JSON.parse(fs.readFileSync(path.join(__dirname, 'brand', `${plan.brand}.json`), 'utf8'));
const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const outDir = path.join(planDir, 'output');
fs.mkdirSync(outDir, { recursive: true });

const esc = (s = '') => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function slideHtml(slide, i, total) {
  const photo = fs.readFileSync(path.resolve(planDir, slide.photo)).toString('base64');
  const button = slide.button ? `<div class="button">${esc(slide.button)}</div>` : '';
  return template
    .replaceAll('{{gold}}', brand.colors.gold)
    .replaceAll('{{ink}}', brand.colors.ink)
    .replaceAll('{{font}}', brand.font)
    .replace('{{photo}}', `data:image/jpeg;base64,${photo}`)
    .replace('{{focus}}', slide.focus || 'center')
    .replace('{{team}}', esc(brand.team))
    .replace('{{eyebrow}}', esc(slide.eyebrow))
    .replace('{{headline}}', esc(slide.headline))
    .replace('{{sub}}', esc(slide.sub))
    .replace('{{button}}', button)
    .replace('{{footer}}', esc(plan.footer))
    .replace('{{count}}', `${i + 1} / ${total}`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  const files = [];
  for (const [i, slide] of plan.slides.entries()) {
    await page.setContent(slideHtml(slide, i, plan.slides.length), { waitUntil: 'load' });
    const file = path.join(outDir, `slide_${i + 1}.png`);
    await page.screenshot({ path: file });
    files.push(file);
  }

  // Preview sheet: all slides side by side, for a quick review before posting
  const thumbs = files.map(f => `<img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}">`).join('');
  await page.setViewportSize({ width: 1800, height: 400 });
  await page.setContent(`<body style="margin:0;padding:24px;background:#ECE9E3;display:flex;flex-wrap:wrap;gap:24px">
    <style>img{width:324px;height:405px}</style>${thumbs}</body>`);
  await page.screenshot({ path: path.join(outDir, 'preview.png'), fullPage: true });

  await browser.close();
  console.log(`Rendered ${files.length} slides to ${outDir}`);
})();
