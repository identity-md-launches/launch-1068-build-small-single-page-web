import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FEE, MAX_ETH, MAX_TOKENS, PRESETS, format, percent, quote, validate } from './model';
import './styles.css';

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{diagonal ? <path d="M6 18 18 6M6 6h12v12" /> : <path d="M4 12h15m-6-6 6 6-6 6" />}</svg>;
}

function ImpactChart({ reserve, amount }: { reserve: number; amount: number }) {
  const plotX = (value: number) => value / (reserve / 4) * 100;
  const plotY = (value: number) => 100 - value / 22 * 100;
  const curve = (depth: number) => Array.from({ length: 81 }, (_, i) => {
    const trade = i / 80 * reserve / 4;
    return `${i === 0 ? 'M' : 'L'}${plotX(trade)},${plotY(quote(reserve * depth, 1, trade).impact)}`;
  }).join(' ');
  const impact = quote(reserve, 1, amount).impact;
  return <div className="chart" role="img" aria-label={`Price impact rises with swap size. At ${format(amount, 6)} ETH, this pool has ${percent(impact)}% impact; a pool with twice the liquidity has ${percent(quote(reserve * 2, 1, amount).impact)}% impact.`}>
    <span className="axis-title">Price impact</span>
    <div className="chart-body">
      <div className="y-axis" aria-hidden="true">{[20, 15, 10, 5, 0].map(n => <span key={n} style={{ top: `${plotY(n)}%` }}>{n}%</span>)}</div>
      <div className="plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {[0, 5, 10, 15, 20].map(n => <line key={n} x1="0" x2="100" y1={plotY(n)} y2={plotY(n)} className="grid-line" />)}
          <path d={`${curve(1)} L100,100 L0,100 Z`} className="chart-area" />
          <path d={curve(2)} className="comparison-line" />
          <path d={curve(1)} className="impact-line" />
          <line x1={plotX(amount)} x2={plotX(amount)} y1={plotY(impact)} y2="100" className="cursor-line" />
        </svg>
        <span className="plot-point" style={{ left: `${plotX(amount)}%`, top: `${plotY(impact)}%` }} />
      </div>
    </div>
    <div className="x-axis" aria-hidden="true">{[0, 0.125, 0.25].map(n => <span key={n}>{format(reserve * n, 4)}</span>)}</div>
    <span className="axis-title x-title">Swap size (ETH)</span>
  </div>;
}

function App() {
  const [eth, setEth] = useState('100');
  const [tokens, setTokens] = useState('1000000');
  const [amount, setAmount] = useState('1');
  const [customOpen, setCustomOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const values = validate(eth, tokens, amount);
  const { x, y, a, errors, valid } = values;
  const result = valid ? quote(x, y, a) : null;
  const comparison = valid ? quote(x * 2, y * 2, a) : null;
  const canDouble = valid && x * 2 <= MAX_ETH && y * 2 <= MAX_TOKENS;
  const selectedPreset = PRESETS.findIndex(p => p.eth === x && p.tokens === y);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAnnouncement(valid ? `${format(result!.output, 4)} tokens received. ${percent(result!.impact)} percent price impact.` : 'Simulation paused. Check the highlighted inputs.');
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [eth, tokens, amount]); // The announcement waits until input pauses.

  function choosePool(index: number) {
    const pool = PRESETS[index];
    setEth(String(pool.eth));
    setTokens(String(pool.tokens));
    if (!Number.isFinite(a) || a > pool.eth / 4) setAmount(String(Math.min(1, pool.eth / 4)));
  }

  function reset() {
    setEth('100'); setTokens('1000000'); setAmount('1'); setCustomOpen(false);
  }

  const impactLabel = !result || a === 0 ? 'No swap yet' : result.impact < 1 ? 'Light impact' : result.impact < 5 ? 'Noticeable impact' : 'Large impact';

  return <>
    <a className="skip-link" href="#experiment">Skip to experiment</a>
    <div className="page-shell">
      <header className="site-header">
        <div className="identity"><img src="./icon.svg" width="36" height="36" alt="" /><span>Impact Lab<span className="identity-divider" aria-hidden="true">/</span><span className="identity-subtitle">Token experiments</span></span></div>
        <span className="offline-badge"><span aria-hidden="true" />Works offline</span>
      </header>

      <main>
        <section className="intro" aria-labelledby="page-title">
          <div><p className="eyebrow"><span className="tiny-line" />A liquidity experiment</p>
            <h1 id="page-title">Small swap.<br /><span>Bigger ripple.</span></h1>
            <p className="intro-copy">The same swap hits differently in a smaller pool.<br className="desktop-break" /> Move the numbers. See why liquidity matters.</p>
          </div>
          <div className="ripple-illustration" aria-hidden="true">
            <svg viewBox="0 0 260 200" fill="none"><path className="ripple-guide" d="M15 155h230M130 5v185" /><g className="ripple-rings"><ellipse cx="130" cy="141" rx="106" ry="40" /><ellipse cx="130" cy="141" rx="78" ry="29" /><ellipse cx="130" cy="141" rx="49" ry="18" /><ellipse cx="130" cy="141" rx="20" ry="7" /></g><path className="eth-top" d="m130 18-29 48 29 17 29-17Z" /><path className="eth-bottom" d="m101 73 29 39 29-39-29 17Z" /><path className="eth-facet" d="M130 18v65l29-17ZM130 90v22l29-39Z" /><path className="drop-line" d="M130 117v18" /></svg>
            <span>One swap. A whole pool.</span>
          </div>
        </section>

        <div id="experiment" className="experiment" tabIndex={-1}>
          <section className="controls-panel" aria-labelledby="setup-title">
            <div className="section-heading"><h2 id="setup-title"><span className="step">01</span>Set the scene</h2><button className="reset-button" onClick={reset} type="button"><span aria-hidden="true">↺</span> Reset</button></div>
            <fieldset className="pool-fieldset"><legend>Choose a pool</legend><div className="pool-options">{PRESETS.map((pool, i) => <button key={pool.name} type="button" aria-pressed={selectedPreset === i} onClick={() => choosePool(i)}><span>{pool.name}</span><small>{pool.label}</small></button>)}</div></fieldset>
            <p className="pool-description">Example ETH / TOKEN pool<strong className="pool-balance" data-testid="reserves">{errors.eth ? '—' : format(x, 4)} ETH · {errors.tokens ? '—' : format(y, 2)} TOKEN</strong><span>All presets start at 10,000 TOKEN per ETH.</span></p>

            <details className="custom-pool" open={customOpen} onToggle={event => setCustomOpen(event.currentTarget.open)}>
              <summary>Set custom reserves<span aria-hidden="true">+</span></summary>
              <div className="reserve-fields">
                <label htmlFor="eth-reserve">ETH in the pool</label>
                <input id="eth-reserve" name="eth-reserve" type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={eth} onChange={e => setEth(e.target.value)} aria-invalid={Boolean(errors.eth)} aria-describedby={errors.eth ? 'eth-error' : undefined} />
                {errors.eth && <p id="eth-error" className="field-error">{errors.eth}</p>}
                <label htmlFor="token-reserve">TOKEN in the pool</label>
                <input id="token-reserve" name="token-reserve" type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={tokens} onChange={e => setTokens(e.target.value)} aria-invalid={Boolean(errors.tokens)} aria-describedby={errors.tokens ? 'token-error' : undefined} />
                {errors.tokens && <p id="token-error" className="field-error">{errors.tokens}</p>}
              </div>
            </details>

            <div className="swap-control"><label htmlFor="swap-amount">Swap amount</label>
              <div className={`amount-field ${errors.amount ? 'has-error' : ''}`}><input id="swap-amount" name="swap-amount" type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={amount} onChange={e => setAmount(e.target.value)} aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'amount-error amount-hint' : 'amount-hint'} /><span>ETH<svg viewBox="0 0 14 22" width="12" height="19" fill="currentColor" aria-hidden="true"><path d="m7 0-7 11 7 4 7-4ZM0 13l7 9 7-9-7 4Z" /></svg></span></div>
              {errors.amount && <p id="amount-error" className="field-error">{errors.amount}</p>}
              <label className="sr-only" htmlFor="amount-slider">Adjust swap amount</label>
              <input id="amount-slider" type="range" min="0" max="1000" step="1" disabled={Boolean(errors.eth)} value={Number.isFinite(a) && !errors.eth ? Math.min(1000, Math.max(0, a / (x / 4) * 1000)) : 0} onChange={e => setAmount(String(Number((Number(e.target.value) / 1000 * x / 4).toFixed(8))))} aria-valuetext={`${format(Number.isFinite(a) ? a : 0, 6)} ETH`} />
              <div className="range-labels" aria-hidden="true"><span>0 ETH</span><span>{errors.eth ? '25% of pool' : `${format(x / 4, 4)} ETH`}</span></div>
              <p id="amount-hint" className="field-hint">Try a swap up to 25% of the ETH reserve.</p>
            </div>
            {result && <div className="mobile-result"><div><span>You receive</span><strong>{result.output > 0 && result.output < 0.01 ? '<0.01' : format(result.output)} TOKEN</strong><span>{percent(result.impact)}% price impact</span></div><a href="#result-title">See chart <span aria-hidden="true">↓</span></a></div>}
            <div className="pool-footnote"><span className="small-spark" aria-hidden="true">✳</span><span>Instant results. Hypothetical tokens.<br />Fixed {FEE * 100}% pool fee.</span></div>
          </section>

          <section className="results-panel" aria-labelledby="result-title">
            <div className="section-heading"><h2 id="result-title"><span className="step">02</span>See the ripple</h2><span className="simulation-label">Simulation</span></div>
            {result && comparison ? <>
              <div className="result-overview"><div><p className="metric-label">You receive</p><div className="output-value" data-testid="output">{result.output > 0 && result.output < 0.01 ? '<0.01' : format(result.output)}<span>TOKEN</span></div></div><div className={`impact-badge ${result.impact >= 5 ? 'high-impact' : ''}`}><span className="impact-dot" aria-hidden="true" />{impactLabel}</div></div>
              <div className="metrics"><div><p className="metric-label">Price impact</p><strong data-testid="impact">{percent(result.impact)}<span>%</span></strong></div><div><p className="metric-label">Pool fee</p><strong data-testid="fee">{result.fee > 0 && result.fee < 0.000001 ? '<0.000001' : format(result.fee, 6)}<span>ETH</span></strong></div><div><p className="metric-label">Average rate</p><strong>{a === 0 ? '—' : result.rate > 0 && result.rate < 0.01 ? '<0.01' : format(result.rate)}<span>TOKEN / ETH</span></strong></div></div>
              <div className="chart-topline"><h3>More swap, more impact</h3><div className="chart-legend"><span><i />This pool</span><span><i />2× liquidity</span></div></div>
              <ImpactChart reserve={x} amount={a} />
              <div className="comparison"><div><span className="comparison-eyebrow">What if the pool were deeper?</span><p>{a === 0 ? <>Add a swap to compare pool sizes.</> : <>2× liquidity gives you <strong>{comparison.output - result.output > 0 && comparison.output - result.output < 0.01 ? '<0.01' : format(comparison.output - result.output)} more TOKEN.</strong></>}</p></div><button type="button" className="primary-button" disabled={!canDouble} onClick={() => { setEth(String(x * 2)); setTokens(String(y * 2)); }}>{canDouble ? 'Try 2× liquidity' : 'Reserve limit reached'}<Arrow /></button></div>
              <p className="result-note">Price impact compares output with the starting pool rate after the fee. It is different from slippage tolerance.</p>
            </> : <div className="empty-state"><span aria-hidden="true">↗</span><h3>Let’s check those numbers.</h3><p>Fix the highlighted inputs to see your simulation. Results update as you type.</p>{(errors.eth || errors.tokens) && <button type="button" className="primary-button" onClick={() => { setCustomOpen(true); window.setTimeout(() => document.getElementById(errors.eth ? 'eth-reserve' : 'token-reserve')?.focus(), 0); }}>Edit pool reserves<Arrow /></button>}</div>}
          </section>
        </div>

        <section className="takeaway" aria-labelledby="takeaway-title"><span className="takeaway-mark" aria-hidden="true">↳</span><div><h2 id="takeaway-title">Liquidity is the room a swap has to move.</h2><p>A bigger trade takes a larger share of a pool’s tokens, changing the rate as it goes. Double both reserves at the same starting price, and the same swap has less impact.</p></div><span className="formula" role="math" aria-label="x times y equals k">x · y = k</span></section>

        <details className="methodology"><summary>What’s under the hood?<span aria-hidden="true">+</span></summary><div className="method-content"><p>This is a constant-product pool model, with ETH as the input and a hypothetical TOKEN as the output. The fee is retained by the pool. ETH represents the wrapped ETH side of an Ethereum pool.</p><p><strong>The calculation:</strong> effective input = swap × 0.997; tokens received = TOKEN reserve × effective input ÷ (ETH reserve + effective input). Price impact = effective input ÷ (ETH reserve + effective input) × 100.</p><p><strong>The limits:</strong> one swap, one pool, fixed 0.3% fee. No live prices, gas costs, token taxes, other traders, concentrated liquidity, or transaction execution. Results are approximate decimal calculations, not on-chain quotes. Impact labels describe magnitude: below 1%, 1–5%, and 5% or more; they are not safety ratings.</p></div></details>

        <footer><div className="footer-title"><span className="footer-dot" aria-hidden="true" />Built for curious holders</div><p>Impact Lab is an interactive swap simulator built for the IMD community. It makes the relationship between trade size and liquidity visible, so holders can explore pool mechanics in under a minute, without an account or wallet.</p><span className="footer-signoff">Explore. Adjust. Understand.<Arrow diagonal /></span></footer>
      </main>
    </div>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);
