import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(resolve(process.env.FRONTEND_TOOLCHAIN || '.', 'package.json'));
const { chromium } = require('playwright');
const axe = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
const root = resolve('dist');
const artifacts = resolve('artifacts');
await mkdir(artifacts, { recursive: true });
const report = { checks: [], viewports: [], accessibility: [], contrast: [], errors: [], externalRequests: [], assets: [] };
const check = (name, value) => { assert.ok(value, name); report.checks.push(name); };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/frame.html') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Iframe test</title><style>body{margin:0}iframe{width:100%;height:100vh;border:0;display:block}</style></head><body><iframe title="Impact Lab" src="/preview/" sandbox="allow-scripts"></iframe></body></html>');
    return;
  }
  const path = resolve(root, '.' + decodeURIComponent(url.pathname.replace(/^\/preview/, '')));
  if (!path.startsWith(root + sep) && path !== root) { res.writeHead(403).end(); return; }
  try {
    const file = path === root ? resolve(root, 'index.html') : path;
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
  await context.route('**/*', route => {
    if (!route.request().url().startsWith(origin)) { report.externalRequests.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => report.errors.push(`Failed: ${request.url()}`));
  await page.goto(origin + '/preview/');
  await page.getByTestId('output').waitFor();
  check('Default output is 9,871.58 TOKEN', (await page.getByTestId('output').innerText()).includes('9,871.58'));
  check('Default fee is 0.003 ETH', (await page.getByTestId('fee').innerText()).includes('0.003'));

  for (const width of [1200, 960, 752, 751, 600, 360, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const dimensions = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
    check(`No horizontal overflow at ${width}px`, dimensions.viewport === dimensions.scroll);
    report.viewports.push(dimensions);
    if ([1200, 360].includes(width)) {
      await page.screenshot({ path: `${artifacts}/${width === 1200 ? 'desktop' : 'mobile'}.png`, fullPage: true });
      await page.evaluate(axe);
      const audit = await page.evaluate(async () => {
        const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } });
        return { violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: result.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), passedRules: result.passes.length };
      });
      report.accessibility.push({ width, ...audit });
      check(`Axe has no violations at ${width}px`, audit.violations.length === 0);
    }
  }

  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.reload();
  await page.keyboard.press('Tab');
  check('Keyboard begins on skip link', await page.getByRole('link', { name: 'Skip to experiment' }).evaluate(e => e === document.activeElement));
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  check('Skip link reaches the experiment controls', await page.getByRole('button', { name: 'Reset', exact: true }).evaluate(e => e === document.activeElement));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  check('Keyboard activates Small pool', await page.getByRole('button', { name: 'Small 10 ETH' }).getAttribute('aria-pressed') === 'true');
  check('Small pool increases impact', (await page.getByTestId('impact').innerText()).includes('9.07'));
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  check('Keyboard opens custom reserves', await page.locator('.custom-pool').getAttribute('open') !== null);
  await page.keyboard.press('Tab');
  check('Keyboard reaches ETH reserve input', await page.locator('#eth-reserve').evaluate(e => e === document.activeElement));
  await page.screenshot({ path: `${artifacts}/keyboard-focus.png`, fullPage: true });

  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.locator('#swap-amount').fill('10');
  check('Typing changes output', (await page.getByTestId('output').innerText()).includes('90,661.09'));
  await page.getByRole('button', { name: 'Try 2× liquidity' }).click();
  check('Double liquidity updates both reserves visibly', (await page.getByTestId('reserves').innerText()).includes('200 ETH · 2,000,000 TOKEN'));
  check('Double liquidity reduces impact', (await page.getByTestId('impact').innerText()).includes('4.75'));
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  check('Reset restores amount', await page.locator('#swap-amount').inputValue() === '1');
  check('Reset restores medium preset', await page.getByRole('button', { name: 'Medium 100 ETH' }).getAttribute('aria-pressed') === 'true');
  await page.locator('#swap-amount').focus();
  await page.keyboard.press('Tab');
  check('Range follows amount in the tab order', await page.locator('#amount-slider').evaluate(e => e === document.activeElement));
  await page.keyboard.press('End');
  check('Range keyboard End selects pool maximum', await page.locator('#swap-amount').inputValue() === '25');
  await page.keyboard.press('Home');
  check('Range keyboard Home selects zero', await page.locator('#swap-amount').inputValue() === '0');
  check('Zero state is explained', await page.getByText('No swap yet', { exact: true }).isVisible());
  await page.locator('#swap-amount').fill('');
  check('Empty input removes stale results', await page.getByTestId('output').count() === 0);
  check('Invalid amount exposes an associated inline error', await page.locator('#swap-amount').getAttribute('aria-invalid') === 'true' && await page.locator('#amount-error').isVisible());
  await page.locator('#swap-amount').fill('26');
  check('Out of range amount gives a recovery bound', (await page.locator('#amount-error').innerText()).includes('0 to 25 ETH'));
  await page.locator('#swap-amount').fill('1');
  await page.locator('.custom-pool summary').click();
  await page.locator('#eth-reserve').fill('0');
  check('Zero reserve pauses results and disables slider', await page.getByTestId('output').count() === 0 && await page.locator('#amount-slider').isDisabled());
  await page.locator('.custom-pool summary').click();
  await page.getByRole('button', { name: 'Edit pool reserves' }).click();
  check('Error recovery opens and focuses invalid reserve', await page.locator('#eth-reserve').evaluate(e => e === document.activeElement));
  await page.locator('#eth-reserve').fill('100');
  await page.locator('#token-reserve').fill('500000');
  check('Custom token reserve changes output', (await page.getByTestId('output').innerText()).includes('4,935.79'));
  await page.locator('#eth-reserve').fill('1000000');
  await page.locator('#token-reserve').fill('1000000000000');
  check('Doubling stops at documented reserve limit', await page.getByRole('button', { name: 'Reserve limit reached' }).isDisabled());
  await page.locator('#swap-amount').fill('250000');
  await page.setViewportSize({ width: 320, height: 1000 });
  check('Maximum values still fit at 320px', await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.locator('.methodology summary').click();
  check('Method disclosure explains formula and exclusions', await page.getByText('The calculation:', { exact: false }).isVisible() && await page.getByText('The limits:', { exact: false }).isVisible());
  await page.locator('.methodology summary').click();
  await page.setViewportSize({ width: 360, height: 1000 });
  await page.getByRole('link', { name: 'See chart' }).click();
  check('Mobile shortcut reaches the results heading', await page.evaluate(() => Math.abs(document.getElementById('result-title').getBoundingClientRect().top - 24) < 4));

  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  check('200% text enlargement has no document overflow', await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
  check('Enlarged preset labels stay inside their buttons', await page.locator('.pool-options button').evaluateAll(buttons => buttons.every(button => [...button.children].every(child => child.getBoundingClientRect().right <= button.getBoundingClientRect().right && child.getBoundingClientRect().left >= button.getBoundingClientRect().left))));
  await page.screenshot({ path: `${artifacts}/text-200.png`, fullPage: true });
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  check('Reduced motion disables button transitions', await page.locator('.primary-button').evaluate(e => getComputedStyle(e).transitionDuration === '0s'));
  await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'active' });
  await page.getByRole('button', { name: 'Reset', exact: true }).focus();
  await page.keyboard.press('Tab');
  await page.screenshot({ path: `${artifacts}/forced-colors.png`, fullPage: true });
  check('Forced-colors mode retains a focus outline', await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none'));
  await page.emulateMedia({ forcedColors: 'none' });

  report.contrast = await page.evaluate(() => {
    const rgb = c => c.match(/[\d.]+/g).slice(0, 3).map(Number);
    const lum = c => rgb(c).map(v => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((v, x, i) => v + x * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const pairs = [
      ['Body on page', 'h1', 'body', 'color'],
      ['Secondary on page', '.intro-copy', 'body', 'color'],
      ['Secondary on card', '.metric-label', '.results-panel', 'color'],
      ['Button label', '.primary-button', '.primary-button', 'color'],
      ['Selected preset', '[aria-pressed="true"]', '[aria-pressed="true"]', 'color'],
      ['Comparison text', '.comparison-eyebrow', '.comparison', 'color'],
      ['Control border', '.pool-options button', '.controls-panel', 'borderTopColor'],
      ['Focus on page', '.pool-options button:focus', 'body', 'outlineColor'],
    ];
    return pairs.map(([name, fgSelector, bgSelector, prop]) => {
      const fg = getComputedStyle(document.querySelector(fgSelector))[prop];
      const bgElement = document.querySelector(bgSelector);
      let bg = getComputedStyle(bgElement).backgroundColor;
      if (bg === 'rgba(0, 0, 0, 0)') bg = getComputedStyle(bgSelector === 'body' ? document.documentElement : document.querySelector('.experiment')).backgroundColor;
      return { name, foreground: fg, background: bg, ratio: Number(ratio(fg, bg).toFixed(2)) };
    });
  });
  for (const pair of report.contrast) check(`${pair.name} contrast meets ${/border|Focus/.test(pair.name) ? 3 : 4.5}:1`, pair.ratio >= (/border|Focus/.test(pair.name) ? 3 : 4.5));

  report.assets = await page.evaluate(() => performance.getEntriesByType('resource').map(r => new URL(r.name).pathname));
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Deep 1,000 ETH' }).click();
  await page.locator('#swap-amount').fill('5');
  check('Loaded module remains interactive with network disabled', (await page.getByTestId('output').innerText()).includes('49,602.73'));
  await context.setOffline(false);
  await page.goto(origin + '/frame.html');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Small 10 ETH' }).click();
  check('Sandboxed iframe runs without same-origin permission', (await frame.getByTestId('impact').innerText()).includes('9.07'));
  await page.setViewportSize({ width: 360, height: 900 });
  await frame.locator('#swap-amount').fill('2');
  check('Sandboxed iframe updates at 360px', (await frame.getByTestId('output').innerText()).includes('16,624.98'));
  await page.setViewportSize({ width: 1200, height: 900 });
  await frame.getByRole('button', { name: 'Try 2× liquidity' }).click();
  check('Sandboxed iframe comparison works at 1200px', (await frame.getByTestId('reserves').innerText()).includes('20 ETH'));
  check('No external runtime requests', report.externalRequests.length === 0);
  check('No console errors or failed resources', report.errors.length === 0);
  console.log(`PASS: ${report.checks.length} browser checks; ${report.viewports.length} widths; 2 axe audits; offline and sandboxed iframe interactions.`);
} catch (error) {
  report.failure = String(error.stack || error);
  throw error;
} finally {
  await writeFile(`${artifacts}/browser-checks.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await new Promise(done => server.close(done));
}
