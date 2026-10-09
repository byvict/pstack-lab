import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDuration } from "../src/duration.mjs";

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
