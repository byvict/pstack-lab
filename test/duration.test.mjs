import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDuration } from "../src/duration.mjs";

function assertDurations(cases) {
  for (const [text, expected] of cases) {
    assert.equal(parseDuration(text), expected, JSON.stringify(text));
  }
}

function assertThrowsFor(ErrorClass, texts) {
  for (const text of texts) {
    assert.throws(() => parseDuration(text), ErrorClass, JSON.stringify(text));
  }
}

test("parses the item examples into milliseconds", () => {
  assert.equal(parseDuration("1h30m"), 5400000);
  assert.equal(parseDuration("0ms"), 0);
  assert.equal(parseDuration("1m"), 60000);
  assert.equal(parseDuration("1ms"), 1);
  assert.equal(parseDuration("2d3ms"), 172800003);
});

test("lets one segment exceed the next unit", () => {
  assert.equal(parseDuration("90m"), 5400000);
});

test("throws SyntaxError for the item's invalid examples", () => {
  for (const text of ["1h1h", "30m1h", "1h 30m", "01m", "1H", "1.5h", "-1s", ""]) {
    assert.throws(() => parseDuration(text), SyntaxError, JSON.stringify(text));
  }
});

test("throws TypeError when text is not a string", () => {
  for (const value of [undefined, null, 5400000, 1n, true, {}, ["1h"]]) {
    assert.throws(() => parseDuration(value), TypeError, String(value));
  }
});

test("returns Number.MAX_SAFE_INTEGER and throws RangeError one past it", () => {
  assert.equal(parseDuration("9007199254740991ms"), 9007199254740991);
  assert.throws(() => parseDuration("9007199254740992ms"), RangeError);
});

test("parses each unit on its own", () => {
  assertDurations([
    ["1d", 86400000],
    ["1h", 3600000],
    ["1m", 60000],
    ["1s", 1000],
    ["1ms", 1],
  ]);
});

test("adds all five units when they appear in order", () => {
  assertDurations([
    ["1d1h1m1s1ms", 90061001],
    ["2d3h4m5s6ms", 183845006],
  ]);
});

test("puts no cap on a segment", () => {
  assertDurations([
    ["25h", 90000000],
    ["61s", 61000],
    ["1000ms", 1000],
  ]);
});

test("reads ms as its own unit, after m and s", () => {
  assertDurations([
    ["1m1ms", 60001],
    ["1s1ms", 1001],
    ["1h1m1ms", 3660001],
  ]);
  assertThrowsFor(SyntaxError, ["1ms1s", "1ms1m"]);
});

test("accepts zero in any segment and returns +0 when every segment is zero", () => {
  assertDurations([
    ["0d0h0m0s0ms", 0],
    ["0d", 0],
    ["1h0m", 3600000],
    ["0h1s", 1000],
  ]);
});

test("throws SyntaxError for a unit with no number or a number with no unit", () => {
  assertThrowsFor(SyntaxError, ["h", "ms", "d", "1hm", "10", "0", "1h30", "1d1"]);
});

test("throws SyntaxError for a leading zero", () => {
  assertThrowsFor(SyntaxError, ["00ms", "007s", "1h05m"]);
});

test("throws SyntaxError for a repeated unit or units out of order", () => {
  assertThrowsFor(SyntaxError, ["1ms1ms", "1s1m", "1h1d", "1h30m1h", "1d1d", "1s1s"]);
});

test("throws SyntaxError for digits outside ASCII", () => {
  assertThrowsFor(SyntaxError, ["１h", "١h", "1١h"]);
});

test("throws SyntaxError for whitespace anywhere", () => {
  assertThrowsFor(SyntaxError, [" 1h", "1h ", "1h\n", "\n1h", "\t1h", "1h\r\n", "1h\u00a0"]);
});

test("throws SyntaxError for signs and other number notations", () => {
  assertThrowsFor(SyntaxError, ["+1s", "1e3ms", "1_000ms", "0x10s", "1,000ms", "1.0s"]);
});

test("throws SyntaxError for unknown units", () => {
  assertThrowsFor(SyntaxError, ["1w", "1us", "1\u00b5s", "1\u03bcs", "1sec"]);
});

test("throws SyntaxError for a unit that is not all lowercase", () => {
  assertThrowsFor(SyntaxError, ["1Ms", "1mS", "1MS", "1D", "1M", "1S"]);
});

test("throws TypeError for a String object", () => {
  assert.throws(() => parseDuration(new String("1h")), TypeError, 'new String("1h")');
  assert.throws(() => parseDuration(new String("")), TypeError, 'new String("")');
});

test("throws SyntaxError before checking the range", () => {
  assertThrowsFor(SyntaxError, ["99999999999999999999d1h1h", "99999999999999999999d "]);
});

test("returns Number.MAX_SAFE_INTEGER across segments and throws RangeError one past it", () => {
  assert.equal(parseDuration("104249991d32340991ms"), 9007199254740991);
  assert.throws(() => parseDuration("104249991d32340992ms"), RangeError);
});

test("throws RangeError for a huge segment instead of rounding", () => {
  assert.throws(() => parseDuration("99999999999999999999d"), RangeError, '"99999999999999999999d"');
  assert.throws(() => parseDuration(`${"9".repeat(400)}ms`), RangeError, "400-digit ms segment");
});
