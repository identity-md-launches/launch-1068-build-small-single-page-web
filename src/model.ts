export const FEE = 0.003;
export const MAX_ETH = 1_000_000;
export const MAX_TOKENS = 1_000_000_000_000;
export const PRESETS = [
  { name: 'Small', eth: 10, tokens: 100_000, label: '10 ETH' },
  { name: 'Medium', eth: 100, tokens: 1_000_000, label: '100 ETH' },
  { name: 'Deep', eth: 1_000, tokens: 10_000_000, label: '1,000 ETH' },
] as const;

export function readNumber(value: string): number {
  if (!/^\d*\.?\d+$/.test(value.trim())) return NaN;
  return Number(value);
}

export function quote(eth: number, tokens: number, amount: number) {
  if (![eth, tokens, amount].every(Number.isFinite) || eth <= 0 || tokens <= 0 || amount < 0) {
    throw new RangeError('Reserves must be positive; the swap must be zero or positive.');
  }
  const fee = amount * FEE;
  const effective = amount * (1 - FEE);
  const output = tokens * (effective / (eth + effective));
  const impact = 100 * effective / (eth + effective);
  const spotOutput = effective * tokens / eth;
  return { output, impact, fee, spotOutput, rate: amount === 0 ? tokens / eth * (1 - FEE) : output / amount };
}

export function validate(eth: string, tokens: string, amount: string) {
  const x = readNumber(eth);
  const y = readNumber(tokens);
  const a = readNumber(amount);
  const errors: { eth?: string; tokens?: string; amount?: string } = {};
  if (!Number.isFinite(x) || x < 0.01 || x > MAX_ETH) errors.eth = 'Enter 0.01 to 1,000,000 ETH, using a decimal point.';
  if (!Number.isFinite(y) || y < 1 || y > MAX_TOKENS) errors.tokens = 'Enter 1 to 1,000,000,000,000 tokens, without commas.';
  if (!Number.isFinite(a) || a < 0 || (!errors.eth && a > x / 4)) {
    errors.amount = errors.eth ? 'Enter a positive amount or zero.' : `Enter 0 to ${format(x / 4, 4)} ETH (up to 25% of this pool).`;
  }
  return { x, y, a, errors, valid: Object.keys(errors).length === 0 };
}

export function format(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

export function percent(value: number) {
  return value > 0 && value < 0.01 ? '<0.01' : value.toFixed(2);
}
