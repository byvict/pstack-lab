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

const LOWEST = "0.0.0-0";

function assertValid(versions) {
  for (const version of versions) {
    const label = JSON.stringify(version);
    assert.equal(compareSemver(version, version), 0, `${label} = ${label}`);
    assert.equal(compareSemver(version, LOWEST), 1, `${label} > ${LOWEST}`);
    assert.equal(compareSemver(LOWEST, version), -1, `${LOWEST} < ${label}`);
  }
}

const REJECTED = { name: "SyntaxError", message: /^compareSemver: / };

function assertInvalid(values) {
  for (const value of values) {
    const label = JSON.stringify(value);
    assert.throws(() => compareSemver(value, "2.0.0"), REJECTED, `${label} as a`);
    assert.throws(() => compareSemver("2.0.0", value), REJECTED, `${label} as b`);
  }
}

function assertEquivalent(pairs) {
  for (const [left, right] of pairs) {
    assert.equal(compareSemver(left, right), 0, `${left} = ${right}`);
    assert.equal(compareSemver(right, left), 0, `${right} = ${left}`);
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
  assertEquivalent([
    ["1.0.0+a", "1.0.0+b"],
    ["1.0.0", "1.0.0+0"],
    ["1.0.0", "1.0.0+20130313144700"],
    ["1.0.0-alpha+001", "1.0.0-alpha"],
    ["1.0.0-alpha+001", "1.0.0-alpha+1"],
    ["1.0.0-x.7.z.92+exp.sha.5114f85", "1.0.0-x.7.z.92"],
    ["0.0.0+-", "0.0.0+zzz.999"],
  ]);
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

test("prefixes error messages with the function name", () => {
  assert.throws(() => compareSemver(1, "1.0.0"), { name: "TypeError", message: /^compareSemver: / });
  assert.throws(() => compareSemver("1.0", "1.0.0"), { name: "SyntaxError", message: /^compareSemver: / });
});

test("names the first invalid version in the SyntaxError message", () => {
  assert.throws(() => compareSemver("1.0", "2.0"), { name: "SyntaxError", message: /"1\.0"/ });
  assert.throws(() => compareSemver("1.0.0", "2.0"), { name: "SyntaxError", message: /"2\.0"/ });
  assert.throws(() => compareSemver("1.0.0\n", "1.0.0"), { name: "SyntaxError", message: /"1\.0\.0\\n"/ });
});

test("throws TypeError for symbols and for objects that convert to a version string", () => {
  const cases = [
    ["Symbol", Symbol("1.0.0")],
    ["object with toString", { toString: () => "1.0.0" }],
    ["Object(string)", Object("1.0.0")],
    ["function", () => "1.0.0"],
  ];
  for (const [label, value] of cases) {
    assert.throws(() => compareSemver(value, "1.0.0"), TypeError, `${label} as a`);
    assert.throws(() => compareSemver("1.0.0", value), TypeError, `${label} as b`);
  }
});

test("accepts every pre-release and build example from items 9 and 10", () => {
  assertValid([
    "1.0.0-alpha",
    "1.0.0-alpha.1",
    "1.0.0-0.3.7",
    "1.0.0-x.7.z.92",
    "1.0.0-x-y-z.--",
    "1.0.0-alpha+001",
    "1.0.0+20130313144700",
    "1.0.0-beta+exp.sha.5114f85",
    "1.0.0+21AF26D3----117B344092BD",
  ]);
});

test("accepts grammar edge cases the BNF allows", () => {
  assertValid([
    "0.0.0",
    "10.20.30",
    "1.0.0-0",
    "1.0.0-0a",
    "1.0.0-00a",
    "1.0.0--",
    "1.0.0--0",
    "1.0.0-0-",
    "1.0.0-a-",
    "1.0.0-0.0",
    "1.0.0+0",
    "1.0.0+00",
    "1.0.0+-",
    "1.0.0+0.00.-",
    "1.0.0-0+0",
  ]);
});

test("rejects a version core without exactly three numeric parts", () => {
  assertInvalid(["1", "1.0", "1.0.0.0", "1.0.0.", ".1.0.0", "1..0", "a.b.c", "1.0.x"]);
});

test("rejects leading zeros in the version core", () => {
  assertInvalid(["01.0.0", "1.01.0", "1.0.01", "00.0.0"]);
});

test("rejects leading zeros in numeric pre-release identifiers", () => {
  assertInvalid(["1.0.0-01", "1.0.0-00", "1.0.0-alpha.01", "1.0.0-0.00"]);
});

test("rejects empty pre-release and build identifiers", () => {
  assertInvalid(["1.0.0-alpha..1", "1.0.0-.a", "1.0.0-a.", "1.0.0+a..b", "1.0.0+.a", "1.0.0+a."]);
});

test("rejects empty pre-release and build sections", () => {
  assertInvalid(["1.0.0-", "1.0.0+", "1.0.0-+a", "1.0.0-a+", "1.0.0-+"]);
});

test("rejects a second plus sign", () => {
  assertInvalid(["1.0.0+a+b", "1.0.0++a", "1.0.0-a+b+c"]);
});

test("rejects characters outside [0-9A-Za-z-] in identifiers", () => {
  assertInvalid([
    "1.0.0-a_b",
    "1.0.0-á",
    "1.0.0+a b",
    "1.0.0+á",
    "1.0.0-a/b",
    "1.0.0-a~b",
    "1.0.0+a_b",
    "1.0.0+a^b",
    "1.0.0+a[b]",
  ]);
});

test("rejects every other ASCII character at each separator position", () => {
  const identifierCharacters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-";
  const ascii = Array.from({ length: 128 }, (_, code) => String.fromCharCode(code));
  const sites = [
    ["1", ".", "2.3", ""],
    ["1.2", ".", "3", ""],
    ["1.2.3", "-", "a+b", ""],
    ["1.2.3", "+", "0.01", ""],
    ["1.2.3-a", "+", "0.01", ""],
    ["1.2.3-a", ".", "b", `${identifierCharacters}+`],
    ["1.2.3+a", ".", "b", identifierCharacters],
  ];
  for (const [before, separator, after, alsoValid] of sites) {
    assertValid([`${before}${separator}${after}`]);
    const others = ascii.filter((char) => char !== separator && !alsoValid.includes(char));
    assertInvalid(others.map((char) => `${before}${char}${after}`));
  }
});

test("rejects non-ASCII letters that Unicode case folding maps to ASCII", () => {
  assertInvalid(["1.0.0-\u017f", "1.0.0-\u212a", "1.0.0+\u212a"]);
});

test("rejects a prefix before the major version", () => {
  assertInvalid(["v1.0.0", "V1.0.0", "=1.0.0", "-1.0.0", "+1.0.0"]);
});

test("rejects whitespace anywhere", () => {
  assertInvalid([
    "1.0.0\n",
    "\n1.0.0",
    " 1.0.0",
    "1.0.0 ",
    "\t1.0.0",
    "1.0.0\t",
    "1.0.0\r\n",
    "1 .0.0",
    "1.0 .0",
    "1.0.0 -a",
    "1.0.0- a",
    "1.0.0-a\n",
    "1.0.0+a\n",
    "1.0.0\u00a0",
    "1.0.0\u2028",
  ]);
});

test("rejects non-ASCII number characters at every digit position", () => {
  const numbers = [];
  for (let code = 0x80; code <= 0x10ffff; code++) {
    const char = String.fromCodePoint(code);
    if (/\p{N}/u.test(char)) {
      numbers.push(char);
    }
  }
  assert.ok(numbers.length > 1000, `${numbers.length} non-ASCII number characters`);
  const sites = [
    (n) => `${n}.0.0`,
    (n) => `1${n}.0.0`,
    (n) => `1.${n}.0`,
    (n) => `1.1${n}.0`,
    (n) => `1.0.${n}`,
    (n) => `1.0.1${n}`,
    (n) => `1.0.0-${n}`,
    (n) => `1.0.0-1${n}`,
    (n) => `1.0.0-alpha.1${n}`,
    (n) => `1.0.0-${n}a`,
    (n) => `1.0.0-a${n}`,
    (n) => `1.0.0+${n}`,
    (n) => `1.0.0+1${n}`,
  ];
  for (const number of numbers) {
    assertInvalid(sites.map((site) => site(number)));
  }
});

test("rejects the empty string", () => {
  assertInvalid([""]);
});

test("rejects long invalid versions", () => {
  assertInvalid([
    `1.0.0-${"1".repeat(10000)}_`,
    `1.0.0-${"a.".repeat(5000)}`,
    `1.0.0-0${"0".repeat(10000)}`,
    `0${"0".repeat(10000)}.0.0`,
  ]);
});

test("orders the item 9 pre-release examples", () => {
  assertAscending(["1.0.0-0.3.7", "1.0.0-alpha", "1.0.0-alpha.1", "1.0.0-x.7.z.92", "1.0.0-x-y-z.--"]);
});

test("compares major, minor and patch numerically, not lexically", () => {
  assertAscending(["1.9.0", "1.10.0", "1.11.0"]);
  assertAscending(["9.0.0", "10.0.0", "11.0.0"]);
  assertAscending(["1.0.9", "1.0.10", "1.0.11"]);
});

test("decides by major before minor and by minor before patch", () => {
  assertAscending(["1.99.99", "2.0.0"]);
  assertAscending(["1.1.99", "1.2.0"]);
  assertAscending(["0.9.9", "1.0.0", "1.0.1", "1.1.0", "2.0.0"]);
});

test("ranks a pre-release of a higher core above a lower release", () => {
  assertAscending(["1.0.0", "1.0.1-alpha", "1.0.1"]);
  assertAscending(["1.0.99", "1.1.0-0", "1.1.0"]);
  assertAscending(["1.99.99", "2.0.0-0", "2.0.0"]);
});

test("ranks a release above every pre-release of the same core", () => {
  assertAscending(["1.0.0-0", "1.0.0"]);
  assertAscending(["1.0.0-zzz.99999999999999999999", "1.0.0"]);
  assertAscending(["1.0.0-0+zzz", "1.0.0+0"]);
});

test("compares numeric pre-release identifiers numerically, not lexically", () => {
  assertAscending(["1.0.0-2", "1.0.0-10"]);
  assertAscending(["1.0.0-0", "1.0.0-1", "1.0.0-9", "1.0.0-10", "1.0.0-100"]);
  assertAscending(["1.0.0-alpha.9", "1.0.0-alpha.10"]);
});

test("compares alphanumeric pre-release identifiers lexically, not numerically", () => {
  assertAscending(["1.0.0-a10", "1.0.0-a2"]);
  assertAscending(["1.0.0-10a", "1.0.0-9a"]);
  assertAscending(["1.0.0-00a", "1.0.0-0a"]);
});

test("ranks numeric pre-release identifiers below non-numeric ones", () => {
  assertAscending(["1.0.0-999", "1.0.0-0a"]);
  assertAscending(["1.0.0-1", "1.0.0--"]);
  assertAscending(["1.0.0-99999999999999999999", "1.0.0-A"]);
  assertAscending(["1.0.0-alpha.999", "1.0.0-alpha.-"]);
});

test("counts a pre-release identifier as numeric only when it is all ASCII digits", () => {
  assertAscending(["1.0.0-2", "1.0.0-0x1"]);
  assertAscending(["1.0.0-2", "1.0.0-0o7"]);
  assertAscending(["1.0.0-2", "1.0.0-1e3"]);
  assertAscending(["1.0.0-2", "1.0.0-Infinity"]);
  assertAscending(["1.0.0-0a", "1.0.0-0b1"]);
  assertAscending(["1.0.0-0x10", "1.0.0-0x9"]);
});

test("compares non-numeric pre-release identifiers in ASCII order", () => {
  assertAscending(["1.0.0-B", "1.0.0-a"]);
  assertAscending(["1.0.0--", "1.0.0-0a"]);
  assertAscending(["1.0.0-a.b", "1.0.0-a-b"]);
  assertAscending(["1.0.0--", "1.0.0-0a", "1.0.0-A", "1.0.0-Z", "1.0.0-a", "1.0.0-z"]);
  assertAscending(["1.0.0-a", "1.0.0-aa", "1.0.0-b"]);
});

test("ranks a longer pre-release higher only when the shared identifiers are equal", () => {
  assertAscending(["1.0.0-alpha", "1.0.0-alpha.0"]);
  assertAscending(["1.0.0-0", "1.0.0-0.0", "1.0.0-0.0.0"]);
  assertAscending(["1.0.0-a.b", "1.0.0-a.b.-"]);
  assertAscending(["1.0.0-a.z.z", "1.0.0-b"]);
});

test("compares numbers of several hundred digits by exact value", () => {
  const prefix = "123456789".repeat(50);
  const low = `${prefix}1`;
  const high = `${prefix}2`;
  assertAscending([`${low}.0.0`, `${high}.0.0`]);
  assertAscending([`0.${low}.0`, `0.${high}.0`]);
  assertAscending([`0.0.${low}`, `0.0.${high}`]);
  assertAscending([`1.0.0-${low}`, `1.0.0-${high}`]);
  assertAscending([`1.0.0-alpha.${low}`, `1.0.0-alpha.${high}`]);
  assertAscending([`${"9".repeat(400)}.0.0`, `1${"0".repeat(400)}.0.0`]);
  assertAscending([`1.0.0-${"9".repeat(400)}`, `1.0.0-1${"0".repeat(400)}`]);
});

test("accepts versions far longer than 255 characters", () => {
  const identifiers = Array.from({ length: 300 }, (_, i) => `x${i}`).join(".");
  const longPrerelease = `1.0.0-${identifiers}`;
  const longBuild = `1.0.0+${"f".repeat(5000)}`;
  const longCore = `${"1".repeat(5000)}.0.0`;
  assertValid([longPrerelease, longBuild, longCore]);
  assertAscending(["1.0.0-x0", longPrerelease, "1.0.0", "2.0.0", longCore]);
  assert.equal(compareSemver(longBuild, "1.0.0"), 0);
  assert.equal(compareSemver("1.0.0", longBuild), 0);
});
