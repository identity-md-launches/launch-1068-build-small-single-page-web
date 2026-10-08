import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quote, validate, readNumber, percent } from '../src/model.ts';

const near = (actual: number, expected: number, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('default swap has a reproducible quote and excludes the fee from price impact', () => {
  const q = quote(100, 1_000_000, 1);
  near(q.output, 9871.580343970612);
  near(q.fee, 0.003);
  near(q.impact, 0.9871580343970613);
  near(q.spotOutput, 9970);
  near(q.impact, (1 - q.output / q.spotOutput) * 100);
});

test('zero input is a valid no-swap state', () => {
  const q = quote(100, 1_000_000, 0);
  assert.equal(q.output, 0);
  assert.equal(q.fee, 0);
  assert.equal(q.impact, 0);
  assert.ok(validate('100', '1000000', '0').valid);
});

test('doubling both reserves preserves spot price and improves output', () => {
  const original = quote(10, 100000, 1);
  const doubled = quote(20, 200000, 1);
  assert.ok(doubled.output > original.output);
  assert.ok(doubled.impact < original.impact);
  assert.equal(doubled.spotOutput, original.spotOutput);
});

test('larger trades yield more tokens but a worse average rate', () => {
  const small = quote(100, 1_000_000, 1);
  const large = quote(100, 1_000_000, 25);
  assert.ok(large.output > small.output);
  assert.ok(large.rate < small.rate);
  assert.ok(large.impact > small.impact);
  assert.ok(large.impact < 20);
});

test('output remains inside the reserve and retained fees increase the product', () => {
  for (const x of [0.01, 10, 100, 1_000_000]) {
    for (const y of [1, 100_000, 1_000_000_000_000]) {
      for (const share of [0.0001, 0.01, 0.25]) {
        const a = x * share;
        const q = quote(x, y, a);
        assert.ok(q.output > 0 && q.output < y);
        assert.ok((x + a) * (y - q.output) > x * y);
        assert.ok(Number.isFinite(q.rate));
      }
    }
  }
});

test('fractional custom reserves and exact boundaries are accepted', () => {
  assert.ok(validate('0.01', '1', '0.0025').valid);
  assert.ok(validate('1000000', '1000000000000', '250000').valid);
  assert.ok(validate('10.5', '42.5', '.5').valid);
});

test('empty, nonfinite, negative, ambiguous and oversized values are rejected', () => {
  for (const input of ['', ' ', '-1', '1,000', 'NaN', 'Infinity', '1e6', '0x10', 'abc']) {
    assert.ok(!validate(input, '100', '1').valid, input);
    assert.ok(!validate('100', input, '1').valid, input);
    assert.ok(!validate('100', '100', input).valid, input);
  }
  assert.ok(validate('0', '100', '1').errors.eth);
  assert.ok(validate('100', '0', '1').errors.tokens);
  assert.ok(validate('1000001', '100', '1').errors.eth);
  assert.ok(validate('100', '1000000000001', '1').errors.tokens);
  assert.ok(validate('100', '100', '25.01').errors.amount);
});

test('invalid model arguments fail rather than producing a misleading quote', () => {
  assert.throws(() => quote(0, 100, 1), RangeError);
  assert.throws(() => quote(100, -1, 1), RangeError);
  assert.throws(() => quote(100, 100, -1), RangeError);
  assert.throws(() => quote(Infinity, 100, 1), RangeError);
});

test('very small positive impact is not formatted as zero', () => {
  assert.equal(percent(0.0001), '<0.01');
  assert.equal(percent(0), '0.00');
  assert.equal(percent(1.237), '1.24');
  assert.equal(readNumber(' 0.5 '), 0.5);
});
