import { test } from "node:test";
import assert from "node:assert/strict";
import { clamp } from "../src/clamp.mjs";

test("returns the value when it is inside the range", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, -5, -1), -3);
  assert.equal(clamp(0.5, 0, 1), 0.5);
});

test("returns the value when it sits on a bound", () => {
  assert.equal(clamp(0, 0, 10), 0);
  assert.equal(clamp(10, 0, 10), 10);
});

test("returns min when the value is below min", () => {
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(-7, -5, -1), -5);
  assert.equal(clamp(2, 4, 9), 4);
});

test("returns max when the value is above max", () => {
  assert.equal(clamp(42, 0, 10), 10);
  assert.equal(clamp(0, -5, -1), -1);
  assert.equal(clamp(100, 4, 9), 9);
});

test("returns the shared bound when min equals max", () => {
  assert.equal(clamp(5, 3, 3), 3);
  assert.equal(clamp(3, 3, 3), 3);
  assert.equal(clamp(1, 3, 3), 3);
});

test("throws RangeError when min is greater than max", () => {
  assert.throws(() => clamp(5, 10, 0), RangeError);
  assert.throws(() => clamp(0, 1, -1), RangeError);
  assert.throws(() => clamp(1, Infinity, -Infinity), RangeError);
});

test("throws RangeError when any argument is NaN", () => {
  assert.throws(() => clamp(NaN, 0, 10), RangeError);
  assert.throws(() => clamp(5, NaN, 10), RangeError);
  assert.throws(() => clamp(5, 0, NaN), RangeError);
});

test("throws TypeError when an argument is a numeric string", () => {
  assert.throws(() => clamp("5", 0, 10), TypeError);
  assert.throws(() => clamp(5, "0", 10), TypeError);
  assert.throws(() => clamp(5, 0, "10"), TypeError);
});

test("throws TypeError when an argument is a bigint", () => {
  assert.throws(() => clamp(5n, 0, 10), TypeError);
  assert.throws(() => clamp(5, 0n, 10), TypeError);
  assert.throws(() => clamp(5, 0, 10n), TypeError);
});

test("throws TypeError when an argument is null or undefined", () => {
  assert.throws(() => clamp(null, 0, 10), TypeError);
  assert.throws(() => clamp(5, null, 10), TypeError);
  assert.throws(() => clamp(5, 0, undefined), TypeError);
  assert.throws(() => clamp(undefined, 0, 10), TypeError);
});

test("throws TypeError when an argument is a boolean", () => {
  assert.throws(() => clamp(true, 0, 10), TypeError);
  assert.throws(() => clamp(5, false, 10), TypeError);
  assert.throws(() => clamp(5, 0, true), TypeError);
});

test("throws TypeError when an argument is a Number object", () => {
  assert.throws(() => clamp(new Number(5), 0, 10), TypeError);
  assert.throws(() => clamp(5, new Number(0), 10), TypeError);
  assert.throws(() => clamp(5, 0, new Number(10)), TypeError);
});

test("throws TypeError when an argument is missing", () => {
  assert.throws(() => clamp(5, 0), TypeError);
  assert.throws(() => clamp(5), TypeError);
  assert.throws(() => clamp(), TypeError);
});

test("checks argument types before NaN and the range", () => {
  assert.throws(() => clamp("5", 10, 0), TypeError);
  assert.throws(() => clamp("5", NaN, 10), TypeError);
});

test("clamps against infinite values and bounds", () => {
  assert.equal(clamp(5, -Infinity, Infinity), 5);
  assert.equal(clamp(Infinity, 0, 10), 10);
  assert.equal(clamp(-Infinity, 0, 10), 0);
  assert.equal(clamp(Infinity, 0, Infinity), Infinity);
});

test("returns a signed zero with its sign intact", () => {
  assert.equal(clamp(-0, 0, 1), -0);
  assert.equal(clamp(-1, -0, 1), -0);
  assert.equal(clamp(1, -1, -0), -0);
  assert.equal(clamp(0, -0, 0), 0);
});

test("treats 0 and -0 as equal bounds", () => {
  assert.equal(clamp(0, 0, -0), 0);
  assert.equal(clamp(-0, 0, -0), -0);
});
