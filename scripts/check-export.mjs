import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

async function files(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const children = await Promise.all(entries.map(e => e.isDirectory() ? files(join(path, e.name)) : [join(path, e.name)]));
  return children.flat();
}
const html = await readFile('dist/index.html', 'utf8');
assert.ok(html.includes('connect-src \'none\''), 'Runtime connections must be disabled.');
assert.ok(!html.includes('type="module"') && !html.includes('crossorigin'), 'Export must load in opaque-origin iframes.');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = match[1];
  assert.ok(url.startsWith('./'), `Non-relative asset URL: ${url}`);
  await stat(resolve('dist', url));
}
const exported = await files('dist');
for (const file of exported) {
  assert.ok(!/node_modules|\.map$|\.tgz$/.test(file), `Unnecessary packaging file: ${file}`);
}
const bytes = (await Promise.all(exported.map(async file => (await stat(file)).size))).reduce((a, b) => a + b, 0);
assert.ok(bytes < 1_000_000, 'Static export should remain under 1 MB.');
console.log(`PASS: ${exported.length} export files; ${bytes} bytes; relative assets exist; runtime connections blocked.`);
