import { test } from "node:test";
import assert from "node:assert/strict";
import { inspect } from "node:util";
import { formatDuration, parseDuration } from "../src/duration.mjs";

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

function assertFormats(cases) {
  for (const [ms, expected] of cases) {
    assert.equal(formatDuration(ms), expected, inspect(ms));
  }
}

function assertFormatThrowsFor(ErrorClass, values) {
  for (const value of values) {
    assert.throws(() => formatDuration(value), ErrorClass, inspect(value));
  }
}

function assertNumbersRoundTrip(values) {
  for (const ms of values) {
    assert.equal(parseDuration(formatDuration(ms)), ms, inspect(ms));
  }
}

function assertTextsRoundTrip(texts) {
  for (const text of texts) {
    assert.equal(formatDuration(parseDuration(text)), text, JSON.stringify(text));
  }
}

function inOrderCombinations(segments) {
  return segments.reduce(
    (texts, segment) => [...texts, ...texts.map((text) => text + segment)],
    [""],
  );
}

test("formats each unit on its own", () => {
  assertFormats([
    [86400000, "1d"],
    [3600000, "1h"],
    [60000, "1m"],
    [1000, "1s"],
    [1, "1ms"],
  ]);
});

test("formats zero and minus zero as 0ms", () => {
  assertFormats([
    [0, "0ms"],
    [-0, "0ms"],
  ]);
});

test("formats all five units in order", () => {
  assertFormats([
    [90061001, "1d1h1m1s1ms"],
    [183845006, "2d3h4m5s6ms"],
  ]);
});

test("skips zero segments", () => {
  assertFormats([
    [3600001, "1h1ms"],
    [86401000, "1d1s"],
    [5400000, "1h30m"],
    [86400001, "1d1ms"],
  ]);
});

test("formats each unit at its largest canonical value and carries one past it", () => {
  assertFormats([
    [999, "999ms"],
    [1000, "1s"],
    [59999, "59s999ms"],
    [60000, "1m"],
    [3599999, "59m59s999ms"],
    [3600000, "1h"],
    [86399999, "23h59m59s999ms"],
    [86400000, "1d"],
    [172799999, "1d23h59m59s999ms"],
  ]);
});

test("puts no cap on d", () => {
  assertFormats([
    [Number.MAX_SAFE_INTEGER, "104249991d8h59m991ms"],
    [8640000000000, "100000d"],
    [8640000000000000, "100000000d"],
  ]);
});

test("throws TypeError when ms is not a number", () => {
  assertFormatThrowsFor(TypeError, [
    1000n,
    0n,
    "1000",
    "0",
    "1s",
    "NaN",
    "-1",
    undefined,
    null,
    true,
    {},
    [1000],
    new Number(1000),
    Symbol("1"),
  ]);
});

test("throws RangeError unless ms is an integer from 0 to Number.MAX_SAFE_INTEGER", () => {
  assertFormatThrowsFor(RangeError, [
    NaN,
    Infinity,
    -Infinity,
    1.5,
    0.5,
    Number.EPSILON,
    Number.MIN_VALUE,
    -1,
    -1.5,
    -Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER + 1,
    Number.MAX_SAFE_INTEGER + 2,
    Number.MAX_VALUE,
  ]);
});

test("round-trips numbers through formatDuration and parseDuration", () => {
  assertNumbersRoundTrip([
    0,
    1,
    999,
    1000,
    59999,
    60000,
    3599999,
    3600001,
    5400000,
    86399999,
    86400000,
    86400001,
    90061001,
    Number.MAX_SAFE_INTEGER - 1,
    Number.MAX_SAFE_INTEGER,
  ]);
});

test("round-trips a fixed pseudo-random sweep of numbers across every magnitude", () => {
  const values = [];
  let state = 1n;
  for (let index = 0; index < 4096; index += 1) {
    state = BigInt.asUintN(64, state * 6364136223846793005n + 1442695040888963407n);
    // Top 53 bits fit Number.MAX_SAFE_INTEGER; shifting index % 53 more covers every magnitude.
    values.push(Number(state >> BigInt(11 + (index % 53))));
  }
  assertNumbersRoundTrip(values);
});

test("round-trips canonical strings through parseDuration and formatDuration", () => {
  assertTextsRoundTrip(["0ms", "104249991d8h59m991ms", "23h59m59s999ms", "1d23h59m59s999ms"]);
});

test("round-trips every in-order subset of units at count 1 and at the largest values", () => {
  const tails = inOrderCombinations(["59m", "59s", "999ms"]);
  // 104249991d fits Number.MAX_SAFE_INTEGER beside 59m59s999ms but not beside 23h.
  const heads = ["", "23h", "104249991d", "99999d23h"];
  const texts = [
    ...inOrderCombinations(["1d", "1h", "1m", "1s", "1ms"]),
    ...heads.flatMap((head) => tails.map((tail) => head + tail)),
  ].filter((text) => text !== "");
  assert.equal(texts.length, 62);
  assertTextsRoundTrip(texts);
});

test("normalizes a non-canonical string through the round trip", () => {
  for (const [text, expected] of [
    ["90m", "1h30m"],
    ["1000ms", "1s"],
    ["25h", "1d1h"],
    ["0d0h0m0s0ms", "0ms"],
    ["0h1s", "1s"],
  ]) {
    assert.equal(formatDuration(parseDuration(text)), expected, JSON.stringify(text));
  }
});

test("ends the round trip at Number.MAX_SAFE_INTEGER", () => {
  assert.equal(formatDuration(Number.MAX_SAFE_INTEGER), "104249991d8h59m991ms");
  assert.throws(() => parseDuration("104249991d8h59m992ms"), RangeError, '"104249991d8h59m992ms"');
  assert.throws(
    () => formatDuration(Number.MAX_SAFE_INTEGER + 1),
    RangeError,
    "Number.MAX_SAFE_INTEGER + 1",
  );
});
