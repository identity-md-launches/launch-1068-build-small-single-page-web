import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';

// The optional toolchain directory keeps installed packages outside this checkout.
const require = createRequire(resolve(process.env.FRONTEND_TOOLCHAIN || '.', 'package.json'));

export default {
  base: './',
  resolve: {
    alias: {
      'react-dom': dirname(require.resolve('react-dom/package.json')),
      react: dirname(require.resolve('react/package.json')),
    },
  },
  plugins: [{
    name: 'local-development-connection',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace("connect-src 'none'", "connect-src 'self' ws:");
    },
  }, {
    name: 'sandbox-friendly-static-export',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Classic scripts and ordinary stylesheets also load in opaque-origin iframes.
        return html.replace('type="module"', 'defer').replaceAll(' crossorigin', '');
      },
    },
  }],
  build: {
    target: 'es2022',
    sourcemap: false,
    modulePreload: false,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
};
