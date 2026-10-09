import { test } from "node:test";
import assert from "node:assert/strict";
import { compareSemver } from "../src/semver.mjs";

function assertAscending(versions) {
  for (let i = 0; i < versions.length; i++) {
    assert.equal(compareSemver(versions[i], versions[i]), 0, `${versions[i]} = ${versions[i]}`);
    for (let j = i + 1; j < versions.length; j++) {
      assert.equal(compareSemver(versions[i], versions[j]), -1, `${versions[i]} < ${versions[j]}`);
      assert.equal(compareSemver(versions[j], versions[i]), 1, `${versions[j]} > ${versions[i]}`);
    }
  }
}

test("orders the section 11 pre-release example chain", () => {
  assertAscending([
    "1.0.0-alpha",
    "1.0.0-alpha.1",
    "1.0.0-alpha.beta",
    "1.0.0-beta",
    "1.0.0-beta.2",
    "1.0.0-beta.11",
    "1.0.0-rc.1",
    "1.0.0",
  ]);
});

test("orders the section 11 normal version example chain", () => {
  assertAscending(["1.0.0", "2.0.0", "2.1.0", "2.1.1"]);
});

test("ignores build metadata", () => {
  assert.equal(compareSemver("1.0.0+a", "1.0.0+b"), 0);
  assert.equal(compareSemver("1.0.0+b", "1.0.0+a"), 0);
  assert.equal(compareSemver("1.0.0", "1.0.0+20130313144700"), 0);
  assert.equal(compareSemver("1.0.0-alpha+001", "1.0.0-alpha"), 0);
  assert.equal(compareSemver("1.0.0-alpha+zzz", "1.0.0-alpha.1+aaa"), -1);
});

test("compares numbers of any size by exact value", () => {
  assert.equal(compareSemver("1.0.0-99999999999999999999", "1.0.0-100000000000000000000"), -1);
  assert.equal(compareSemver("1.0.0-100000000000000000000", "1.0.0-99999999999999999999"), 1);
  assert.equal(compareSemver("99999999999999999999.0.0", "100000000000000000000.0.0"), -1);
  assert.equal(compareSemver("0.99999999999999999999.0", "0.100000000000000000000.0"), -1);
  assert.equal(compareSemver("0.0.99999999999999999999", "0.0.100000000000000000000"), -1);
  assert.equal(compareSemver("0.0.9007199254740993", "0.0.9007199254740992"), 1);
  assert.equal(compareSemver("1.0.0-9007199254740993", "1.0.0-9007199254740992"), 1);
});

test("throws TypeError when a or b is not a string", () => {
  for (const value of [undefined, null, 1, 1n, true, {}, ["1.0.0"], new String("1.0.0")]) {
    assert.throws(() => compareSemver(value, "1.0.0"), TypeError);
    assert.throws(() => compareSemver("1.0.0", value), TypeError);
  }
  assert.throws(() => compareSemver(), TypeError);
  assert.throws(() => compareSemver("1.0.0"), TypeError);
});

test("checks the type of both arguments before the syntax of either", () => {
  assert.throws(() => compareSemver("not a version", 1), TypeError);
  assert.throws(() => compareSemver(1, "not a version"), TypeError);
  assert.throws(() => compareSemver("v1.0.0", undefined), TypeError);
});

test("throws SyntaxError when a or b is not a valid SemVer 2.0.0 string", () => {
  for (const value of ["", "v1.0.0", " 1.0.0", "1.0.0 ", "1.0", "01.0.0", "1.0.0-01", "1.0.0-", "1.0.0+"]) {
    assert.throws(() => compareSemver(value, "1.0.0"), SyntaxError, JSON.stringify(value));
    assert.throws(() => compareSemver("1.0.0", value), SyntaxError, JSON.stringify(value));
  }
});

test("prefixes error messages with the function name", () => {
  assert.throws(() => compareSemver(1, "1.0.0"), { name: "TypeError", message: /^compareSemver: / });
  assert.throws(() => compareSemver("1.0", "1.0.0"), { name: "SyntaxError", message: /^compareSemver: / });
});
