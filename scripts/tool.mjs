import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(process.env.FRONTEND_TOOLCHAIN || '.');
const require = createRequire(resolve(root, 'package.json'));
const command = process.argv[2];
if (command === 'typecheck') {
  const tsc = resolve(dirname(require.resolve('typescript/package.json')), 'bin/tsc');
  const result = spawnSync(process.execPath, [tsc, '--noEmit', '--typeRoots', resolve(root, 'node_modules/@types')], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
const { default: config } = await import('../vite.config.mjs');
const vite = await import(pathToFileURL(require.resolve('vite')).href);
const options = { ...config, configFile: false };
if (command === 'build') await vite.build(options);
else if (command === 'dev') {
  const server = await vite.createServer(options);
  await server.listen();
  server.printUrls();
} else if (command === 'preview') {
  const server = await vite.preview(options);
  server.printUrls();
} else throw new Error(`Unknown command: ${command}`);
