#!/usr/bin/env node
'use strict';

// Rebuild the repository's original brand artwork from local Rough.js and fonts.
// Usage: node scripts/build-brand.cjs [--modules-dir PATH] [--browser-executable PATH]
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'assets');
const output = path.join(assets, 'brand');
const rough = require(path.join(assets, 'vendor', 'rough.cjs.js'));

const ink = '#252525';
const colors = { yellow: '#fff0b3', green: '#d3f4d3', blue: '#e5f4ff' };
const generator = rough.generator();
let seed = 92801;
const paint = drawable => generator.toPaths(drawable).map(p =>
  `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill || 'none'}" stroke-linecap="round" stroke-linejoin="round"/>`
).join('\n');
const options = (extra = {}) => ({
  stroke: ink, strokeWidth: 2.8, roughness: 0.58, bowing: 0.5,
  fillStyle: 'solid', seed: seed++, ...extra,
});
const roundRect = (x, y, w, h, r) =>
  `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;

// One clear relationship: a main idea branches into two smaller ideas.
const mark = [
  paint(generator.linearPath([[64, 48], [64, 62]], options({ disableMultiStroke: true }))),
  paint(generator.linearPath([[32, 75], [32, 63], [96, 63], [96, 75]], options({ disableMultiStroke: true }))),
  paint(generator.linearPath([[26.7, 69.6], [32, 76], [37.3, 69.6]], options({ disableMultiStroke: true }))),
  paint(generator.linearPath([[90.7, 69.6], [96, 76], [101.3, 69.6]], options({ disableMultiStroke: true }))),
  paint(generator.path(roundRect(39, 15, 50, 33, 6), options({ fill: colors.yellow }))),
  paint(generator.path(roundRect(10, 82, 44, 30, 6), options({ fill: colors.green }))),
  paint(generator.path(roundRect(74, 82, 44, 30, 6), options({ fill: colors.blue }))),
].join('\n');

function logo(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128" role="img" aria-label="Handdrawn Diagrams: one node branches into two">${mark}</svg>`;
}

async function main() {
  const args = process.argv.slice(2), opts = {};
  while (args.length) {
    const flag = args.shift();
    if (flag === '--help') {
      console.log('node scripts/build-brand.cjs [--modules-dir PATH] [--browser-executable PATH]');
      return;
    }
    if (!['--modules-dir', '--browser-executable'].includes(flag) || !args.length) {
      throw Error('Unknown or incomplete option: ' + flag);
    }
    opts[flag.slice(2)] = args.shift();
  }
  let playwright;
  try {
    playwright = opts['modules-dir']
      ? require(path.join(path.resolve(opts['modules-dir']), 'playwright'))
      : require('playwright');
  } catch {
    throw Error('Playwright not found. Install dependencies or pass --modules-dir PATH.');
  }
  const explicit = opts['browser-executable'] || process.env.HANDDRAWN_BROWSER;
  const candidates = explicit ? [explicit] : [
    playwright.chromium.executablePath(),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    ...(process.platform === 'win32' ? [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.LOCALAPPDATA || os.homedir(), 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ] : []),
  ];
  const executablePath = candidates.find(candidate => fs.existsSync(candidate));
  if (!executablePath) {
    throw Error('Chromium not found. Run npx playwright install chromium or pass --browser-executable PATH.');
  }
  const lines = ['Handdrawn Diagrams', '手绘机制图', '把复杂机制，画得一眼明白'];
  const coverage = new Set(JSON.parse(fs.readFileSync(path.join(assets, 'font-coverage.json'), 'utf8')));
  for (const char of lines.join('')) {
    if (!/\s/.test(char) && !coverage.has(char.codePointAt(0))) throw Error('Missing bundled glyph: ' + char);
  }
  const css = fs.readFileSync(path.join(assets, 'fonts.css'), 'utf8')
    .replace(/url\("([^"]+)"\)/g, (_, p) => `url("${pathToFileURL(path.join(assets, p)).href}")`);
  const text = (content, x, y, size, color, maxWidth) =>
    `<text x="${x}" y="${y}" font-family="HandLatin, HandZh" font-size="${size}" fill="${color}" data-max-width="${maxWidth}">${content}</text>`;
  const banner = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="240" viewBox="0 0 1000 240">
    <path d="M0 0H1000V240H0Z" fill="#ffffff"/>
    <g transform="translate(64 40) scale(1.25)">${mark}</g>
    ${text(lines[0], 274, 98, 50, ink, 670)}
    ${text(lines[1], 276, 146, 32, ink, 650)}
    ${text(lines[2], 277, 187, 22, '#686868', 650)}
  </svg>`;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'handdrawn-brand-'));
  let browser;
  try {
    browser = await playwright.chromium.launch({ executablePath, headless: true });
    fs.mkdirSync(output, { recursive: true });
    const render = async (svg, name, width, height, scale, transparent) => {
      const htmlPath = path.join(temp, name + '.html');
      fs.writeFileSync(htmlPath, `<!doctype html><meta charset="utf-8"><style>${css}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}svg{display:block}</style>${svg}`);
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
      await page.route(/^https?:\/\//, request => request.abort());
      await page.goto(pathToFileURL(htmlPath).href);
      await page.evaluate(() => document.fonts.ready);
      const check = await page.evaluate(({ width, height }) => {
        const errors = [];
        for (const font of document.fonts) if (font.status === 'error') errors.push('Font failed: ' + font.family);
        for (const item of document.querySelectorAll('text')) {
          const box = item.getBBox();
          if (box.x < 0 || box.y < 0 || box.x + box.width > width || box.y + box.height > height) errors.push('Text outside canvas: ' + item.textContent);
          if (box.width > Number(item.dataset.maxWidth)) errors.push('Text too wide: ' + item.textContent);
        }
        return { errors, fontsLoaded: [...document.fonts].filter(font => font.status === 'loaded').length };
      }, { width, height });
      if (check.errors.length) throw Error(check.errors.join('\n'));
      await page.screenshot({ path: path.join(temp, name), omitBackground: transparent });
      await page.close();
      return { file: name, width: width * scale, height: height * scale, ...check };
    };
    const checks = [];
    checks.push(await render(logo(128), 'logo.png', 128, 128, 4, true));
    checks.push(await render(logo(32), 'logo-32.png', 32, 32, 1, true));
    checks.push(await render(banner, 'banner.png', 1000, 240, 2, false));
    // Publish only after every rendering and font/bounds check passes.
    fs.writeFileSync(path.join(output, 'logo.svg'), logo(512) + '\n');
    for (const check of checks) fs.copyFileSync(path.join(temp, check.file), path.join(output, check.file));
    console.log(JSON.stringify({ output, checks }, null, 2));
  } finally {
    if (browser) await browser.close();
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
