# Impact Lab

A small, entirely local swap-impact experiment for Ethereum token holders and the IMD community. Choose a hypothetical pool, change the swap amount, and compare the result with twice the liquidity. The page includes a visible paragraph explaining what was built and why.

The ready-to-publish site is **`dist/`**. Source, the npm lockfile, tests, and the complete static export are included. No wallet, account, backend, API key, analytics, remote font, external script, or network data is used. The `TOKEN` label describes a hypothetical asset, not a deployed token.

## Install and run

Requires Node.js 22.18 or later and npm. Tested with Node.js 24.21.0 and npm 11.19.0.

```sh
npm ci
npm run build
npm run preview
```

Open the local URL printed by the preview command. `npm run dev` starts Vite's development server. The production export does not depend on that server or on installed packages.

For a checkout where dependencies must stay outside the repository, use the supported external toolchain instead:

```sh
IMPACT_TOOLCHAIN=$(mktemp -d /tmp/impact-lab.XXXXXX)
cp package.json package-lock.json "$IMPACT_TOOLCHAIN/"
npm ci --prefix "$IMPACT_TOOLCHAIN" --cache /tmp/impact-lab-npm-cache
export FRONTEND_TOOLCHAIN="$IMPACT_TOOLCHAIN"
npm run build
npm run preview
```

This external installation method was used for this delivery; no `node_modules` directory was created in the repository. Do not submit installed dependencies or package caches.

## Use the experiment

1. Select Small, Medium, or Deep. All three start at 10,000 TOKEN per ETH, isolating the effect of liquidity.
2. Enter a swap amount or use the slider. Results update immediately. On narrow screens a compact result sits beside the controls, with a link to the full chart.
3. Select **Try 2× liquidity** to double both reserves while preserving the starting price and swap amount. The current reserves remain visible.
4. Open **Set custom reserves** for a different ratio. **Reset** restores the medium pool and a 1 ETH swap.

Amounts range from zero to 25% of the ETH reserve. ETH reserves range from 0.01 to 1,000,000; TOKEN reserves from 1 to 1,000,000,000,000. Use decimal notation without commas. An empty or invalid value removes the quote and shows a repair instruction. Switching presets preserves a fitting amount; an amount exceeding the new limit resets to 1 ETH.

## Model and limits

For ETH reserve `x`, TOKEN reserve `y`, and input `a`:

```text
fee = a × 0.003
effective input = a × 0.997
output = y × effective input / (x + effective input)
price impact = effective input / (x + effective input) × 100
average rate = output / a
```

Impact measures the output reduction relative to a quote at the starting reserve ratio after deducting the fee. The fee is reported separately. Zero input has zero output/impact and no displayed average rate. Impact labels are descriptive, not safety ratings.

This is a constant-product, single-pool model using approximate JavaScript decimal arithmetic. It excludes live prices, gas costs, transfer taxes, concentrated liquidity, other traders, integer token rounding, and execution. ETH represents the wrapped ETH side of a pool. It is an educational experiment, not a trade quote. The pricing model was checked against the [official v2 pricing explanation](https://developers.uniswap.org/docs/protocols/v2/concepts/pricing).

The page makes no requests after loading its local assets. Interactions also work when the network is disabled after loading. It has no service worker, so an offline reload of a remotely hosted URL is not promised. State is kept in memory and resets on reload.

## Rebuild and validate

```sh
npm run typecheck
npm test
npm run build
npm run check:export
npm exec playwright install chromium
npm run test:browser
```

For an external toolchain, install the browser with `"$FRONTEND_TOOLCHAIN/node_modules/.bin/playwright" install chromium`. Alternatively, set `BROWSER_EXECUTABLE_PATH` to an existing Chromium binary. `test:browser` starts its own temporary local server, serves the actual export under `/preview/`, tests it, and closes the server and browser. It writes evidence under `artifacts/`. Browser binaries and test packages are never runtime assets.

Final checks on 2026-10-08, all exit code 0:

| Command | Actual result |
| --- | --- |
| `npm run build` | Vite production build completed; 28 modules transformed |
| `npm run typecheck` | TypeScript strict check passed |
| `npm test` | 9 model tests passed, 0 failed |
| `npm run check:export` | 4 files, 227,880 bytes; all referenced assets relative and present |
| `npm run test:browser` | 54 checks passed across 7 widths; iframe and offline checks passed |

Build/typecheck/browser commands used `FRONTEND_TOOLCHAIN=/tmp/impact-lab-toolchain`. Browser validation used `BROWSER_EXECUTABLE_PATH=/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`.

Both axe scans (360px and 1200px) reported zero violations. Their manual-review flags concern decorative arrow glyphs; the corresponding foreground/background pairs were checked. Screenshots were inspected at both target widths, with keyboard focus, forced colors, and 200% text enlargement. This is worker-run evidence, not independent certification. Screen readers, physical phones, Safari/Firefox, and browser-native 200% zoom were not tested. See [the complete six-domain review](artifacts/validation.md), [machine results](artifacts/browser-checks.json), and [design system](DESIGN.md).

## Publish

Copy **all contents of `dist/` together** to a static hosting directory. The publisher serves these files as delivered; rebuilding at publication is unnecessary. Vite uses `base: './'`; there are no application routes or server rewrites. The export contains `index.html`, `icon.svg`, `licenses.txt`, and one hashed JavaScript bundle including the CSS.

The bundle is a deferred classic script, allowing it to load inside an opaque-origin sandbox without requiring CORS headers. A host can embed it like this, adjusting the relative destination and frame height for its layout:

```html
<iframe
  src="./impact-lab/"
  title="Impact Lab swap simulator"
  sandbox="allow-scripts"
  style="width:100%;height:900px;border:0"
></iframe>
```

Vertical scrolling stays inside the frame. No parent-window APIs or messaging are required. Production CSP blocks connection APIs, form submissions, and objects. Inline styles are permitted for the locally bundled CSS and chart coordinates. Development alone permits the local HMR connection.

`dist/` is intentionally not ignored. The explicit `.gitignore` path budget is 512 bytes (implemented: 192 bytes); it excludes dependency, cache, coverage, browser scratch, and compiler-cache paths at every nesting level. No submodule or vendored registry is used. See [submission inventory](artifacts/submission-size.json) for delivery size and hashes. Git metadata was not modified; publication/commit is left to the submission system.

## Attribution

The interface and inline illustrations were created for this module. React, React DOM, and Scheduler notices ship in `public/licenses.txt` and `dist/licenses.txt`. The pinned Better Interface guide informed design and review; its documentation method informed `DESIGN.md`. Attribution and both original license texts are retained in [the guidance notice](artifacts/NOTICE.md) and [guidance licenses](artifacts/guidance-LICENSE.txt).
