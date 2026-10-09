import { test } from "node:test";
import assert from "node:assert/strict";
import { compareSemver, satisfiesSemver } from "../src/semver.mjs";

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

const RANGE_REJECTED = { name: "SyntaxError", message: /^satisfiesSemver: / };
const TYPE_REJECTED = { name: "TypeError", message: /^satisfiesSemver: / };

test("satisfiesSemver returns the item's example results", () => {
  const examples = [
    ["1.2.3", "^1.2.0", true],
    ["2.0.0", "^1.2.0", false],
    ["0.2.5", "^0.2.3", true],
    ["0.3.0", "^0.2.3", false],
    ["0.0.3", "^0.0.3", true],
    ["0.0.4", "^0.0.3", false],
    ["1.2.9", "~1.2.3", true],
    ["1.3.0", "~1.2.3", false],
    ["1.5.0", ">=1.2.0 <2.0.0", true],
    ["1.0.0+build.7", "=1.0.0", true],
    ["1.2.3", "1.2.3", true],
    ["2.0.0-alpha", "^1.2.3", true],
    ["99999999999999999999.0.0", "^99999999999999999999.0.0", true],
    ["100000000000000000000.0.0", "^99999999999999999999.0.0", false],
  ];
  for (const [version, range, expected] of examples) {
    assert.equal(satisfiesSemver(version, range), expected, `${version} against ${JSON.stringify(range)}`);
  }
});

test("satisfiesSemver throws the item's example SyntaxErrors", () => {
  assert.throws(() => satisfiesSemver("1.2", "^1.0.0"), RANGE_REJECTED);
  for (const range of ["", ">=1.0.0  <2.0.0", " ^1.0.0", "=>1.0.0", "^v1.0.0"]) {
    assert.throws(() => satisfiesSemver("1.2.3", range), RANGE_REJECTED, JSON.stringify(range));
  }
});

test("satisfiesSemver throws the item's example TypeError", () => {
  assert.throws(() => satisfiesSemver(1, "^1.0.0"), TYPE_REJECTED);
});

function against(version, range) {
  return `${JSON.stringify(version)} against ${JSON.stringify(range)}`;
}

function assertSatisfies(range, satisfying, failing) {
  for (const version of satisfying) {
    assert.equal(satisfiesSemver(version, range), true, against(version, range));
  }
  for (const version of failing) {
    assert.equal(satisfiesSemver(version, range), false, against(version, range));
  }
}

const NOT_STRINGS = {
  name: "TypeError",
  message: "satisfiesSemver: version and range must both be strings",
};

function invalidVersion(version) {
  return {
    name: "SyntaxError",
    message: `satisfiesSemver: ${JSON.stringify(version)} is not a valid SemVer 2.0.0 version`,
  };
}

function invalidRange(range) {
  return {
    name: "SyntaxError",
    message: `satisfiesSemver: ${JSON.stringify(range)} is not a valid range`,
  };
}

function assertInvalidRanges(version, ranges) {
  for (const range of ranges) {
    assert.throws(() => satisfiesSemver(version, range), invalidRange(range), against(version, range));
  }
}

const ASCII = Array.from({ length: 128 }, (_, code) => String.fromCharCode(code));

const OPERATOR_RESULTS = [
  ["=", { below: false, at: true, above: false }],
  ["", { below: false, at: true, above: false }],
  [">", { below: false, at: false, above: true }],
  [">=", { below: false, at: true, above: true }],
  ["<", { below: true, at: false, above: false }],
  ["<=", { below: true, at: true, above: false }],
];

const NEIGHBORHOODS = [
  {
    bound: "2.3.4",
    below: ["0.0.0", "1.3.4", "1.99.99", "2.2.4", "2.2.99", "2.3.3", "2.3.4-0", "2.3.4-rc.1"],
    at: ["2.3.4"],
    above: ["2.3.5-0", "2.3.5", "2.3.10", "2.4.0-0", "2.4.0", "2.10.0", "3.0.0-0", "3.0.0", "10.0.0"],
  },
  {
    bound: "2.3.4-beta.2",
    below: ["1.3.4", "2.2.4", "2.3.3", "2.3.4-0", "2.3.4-2", "2.3.4-alpha.9", "2.3.4-beta", "2.3.4-beta.1"],
    at: ["2.3.4-beta.2"],
    above: [
      "2.3.4-beta.10",
      "2.3.4-beta.2.0",
      "2.3.4-beta.a",
      "2.3.4-rc",
      "2.3.4",
      "2.3.5-0",
      "2.4.0",
      "3.0.0",
    ],
  },
  {
    bound: "0.0.0",
    below: ["0.0.0-0", "0.0.0-alpha"],
    at: ["0.0.0"],
    above: ["0.0.1-0", "0.0.1", "0.1.0", "1.0.0"],
  },
];

function assertOperatorResults(versionBuild, boundBuild) {
  for (const [operator, results] of OPERATOR_RESULTS) {
    for (const neighborhood of NEIGHBORHOODS) {
      const range = `${operator}${neighborhood.bound}${boundBuild}`;
      for (const position of ["below", "at", "above"]) {
        for (const neighbor of neighborhood[position]) {
          const version = `${neighbor}${versionBuild}`;
          assert.equal(satisfiesSemver(version, range), results[position], against(version, range));
        }
      }
    }
  }
}

test("satisfiesSemver compares by precedence with =, no operator, >, >=, < and <=", () => {
  assertOperatorResults("", "");
});

test("satisfiesSemver ignores build metadata on either side of every operator", () => {
  const builds = ["", "+0", "+build.7", "+exp.sha.5114f85", "+-"];
  for (const versionBuild of builds) {
    for (const boundBuild of builds) {
      assertOperatorResults(versionBuild, boundBuild);
    }
  }
});

function assertLimits(cases) {
  for (const [range, satisfying, failing] of cases) {
    assertSatisfies(range, satisfying, failing);
    assertSatisfies(`${range}+build.9`, satisfying, failing);
  }
}

test("satisfiesSemver bounds ^ with a major above 0 by the next major", () => {
  assertLimits([
    [
      "^1.2.3",
      ["1.2.3", "1.2.3+build.7", "1.2.4-0", "1.2.4", "1.3.0", "1.5.0-0", "1.99.99", "2.0.0-0"],
      ["0.9.9", "1.0.0", "1.2.2", "1.2.3-0", "1.2.3-rc.1", "2.0.0", "2.0.0+0", "2.0.0+build.7"],
    ],
    ["^1.2.3", ["2.0.0-alpha", "2.0.0-rc.99"], ["2.0.1", "2.1.0", "3.0.0-0", "3.0.0", "10.0.0"]],
    [
      "^1.0.0",
      ["1.0.0", "1.0.1", "1.1.0", "1.99.99", "2.0.0-0"],
      ["0.99.99", "1.0.0-0", "2.0.0", "2.0.0+0", "2.0.1"],
    ],
    ["^9.9.9", ["9.9.9", "9.99.0", "10.0.0-0"], ["9.9.8", "9.9.9-0", "10.0.0", "10.0.0+0", "10.0.1"]],
  ]);
});

test("satisfiesSemver bounds ^ with major 0 and a minor above 0 by the next minor", () => {
  assertLimits([
    [
      "^0.2.3",
      ["0.2.3", "0.2.4", "0.2.99", "0.3.0-0", "0.3.0-rc.1"],
      ["0.0.0", "0.1.9", "0.2.2", "0.2.3-0", "0.3.0", "0.3.0+0", "0.3.1", "0.4.0", "1.0.0", "1.2.3"],
    ],
    ["^0.1.0", ["0.1.0", "0.1.1", "0.2.0-0"], ["0.0.9", "0.1.0-0", "0.2.0", "0.2.0+0", "1.0.0"]],
    ["^0.9.0", ["0.9.0", "0.9.9", "0.10.0-0"], ["0.8.9", "0.9.0-0", "0.10.0", "0.10.0+0", "1.0.0"]],
  ]);
});

test("satisfiesSemver bounds ^ with major and minor 0 by the next patch", () => {
  assertLimits([
    [
      "^0.0.3",
      ["0.0.3", "0.0.3+0", "0.0.4-0", "0.0.4-alpha"],
      ["0.0.2", "0.0.3-0", "0.0.4", "0.0.4+0", "0.0.5", "0.1.0", "0.3.0", "1.0.0"],
    ],
    [
      "^0.0.0",
      ["0.0.0", "0.0.0+0", "0.0.1-0"],
      ["0.0.0-0", "0.0.0-rc", "0.0.1", "0.0.1+0", "0.0.2", "0.1.0", "1.0.0"],
    ],
    ["^0.0.9", ["0.0.9", "0.0.10-0"], ["0.0.8", "0.0.9-0", "0.0.10", "0.0.10+0", "0.1.0"]],
  ]);
});

test("satisfiesSemver starts ^ at a pre-release v and bounds it by v's core", () => {
  assertLimits([
    [
      "^1.2.3-beta.2",
      ["1.2.3-beta.2", "1.2.3-beta.10", "1.2.3-rc", "1.2.3", "1.5.0-0", "2.0.0-0", "2.0.0-rc"],
      ["1.2.2", "1.2.3-0", "1.2.3-alpha", "1.2.3-beta", "1.2.3-beta.1", "2.0.0", "2.0.0+0"],
    ],
    [
      "^0.2.3-rc.1",
      ["0.2.3-rc.1", "0.2.3", "0.2.9", "0.3.0-0", "0.3.0-rc.2"],
      ["0.2.2", "0.2.3-beta", "0.2.3-rc.0", "0.3.0"],
    ],
    [
      "^0.0.3-rc.1",
      ["0.0.3-rc.1", "0.0.3-rc.2", "0.0.3", "0.0.4-0", "0.0.4-rc.2"],
      ["0.0.2", "0.0.3-alpha", "0.0.3-rc.0", "0.0.4", "0.0.4+0"],
    ],
    ["^0.0.0-0", ["0.0.0-0", "0.0.0-a", "0.0.0", "0.0.1-0"], ["0.0.1", "0.1.0", "1.0.0"]],
    ["^1.0.0-0", ["1.0.0-0", "1.0.0", "1.99.0", "2.0.0-0"], ["0.99.99", "2.0.0"]],
  ]);
});

test("satisfiesSemver bounds ~ by the next minor whatever the major", () => {
  assertLimits([
    [
      "~1.2.3",
      ["1.2.3", "1.2.3+0", "1.2.4", "1.2.99", "1.3.0-0", "1.3.0-rc.1"],
      ["1.1.9", "1.2.2", "1.2.3-0", "1.3.0", "1.3.0+0", "1.3.1", "1.4.0", "2.0.0-0", "2.0.0"],
    ],
    ["~1.0.0", ["1.0.0", "1.0.5", "1.1.0-0"], ["0.9.9", "1.0.0-0", "1.1.0", "1.1.0+0", "1.2.0", "2.0.0"]],
    ["~1.9.3", ["1.9.3", "1.9.99", "1.10.0-0"], ["1.9.2", "1.9.3-0", "1.10.0", "1.10.0+0", "2.0.0"]],
    ["~0.2.3", ["0.2.3", "0.2.9", "0.3.0-0"], ["0.2.2", "0.2.3-0", "0.3.0", "0.3.0+0", "1.0.0"]],
    [
      "~0.0.3",
      ["0.0.3", "0.0.4", "0.0.99", "0.1.0-0"],
      ["0.0.2", "0.0.3-0", "0.1.0", "0.1.0+0", "0.1.1", "0.2.0", "1.0.0"],
    ],
    ["~0.0.0", ["0.0.0", "0.0.9", "0.1.0-0"], ["0.0.0-0", "0.1.0", "0.1.0+0", "1.0.0"]],
  ]);
});

test("satisfiesSemver starts ~ at a pre-release v and bounds it by v's core", () => {
  assertLimits([
    [
      "~1.2.3-beta.2",
      ["1.2.3-beta.2", "1.2.3-rc", "1.2.3", "1.2.9", "1.3.0-0", "1.3.0-rc"],
      ["1.2.2", "1.2.3-0", "1.2.3-beta.1", "1.3.0"],
    ],
    [
      "~0.0.3-rc",
      ["0.0.3-rc", "0.0.3", "0.0.4", "0.1.0-0", "0.1.0-rc.1"],
      ["0.0.2", "0.0.3-beta", "0.1.0"],
    ],
  ]);
});

const SUCCESSORS = [
  ["8", "9"],
  ["9", "10"],
  ["19", "20"],
  ["99", "100"],
  ["199", "200"],
  ["909", "910"],
  ["9007199254740991", "9007199254740992"],
  ["9007199254740992", "9007199254740993"],
  ["9007199254740993", "9007199254740994"],
  ["99999999999999999999", "100000000000000000000"],
  ["999999999999999999999", "1000000000000000000000"],
  ["123456789012345678901", "123456789012345678902"],
  ["9".repeat(300), `1${"0".repeat(300)}`],
  [`1${"9".repeat(300)}`, `2${"0".repeat(300)}`],
  ["123456789".repeat(40), `${"123456789".repeat(39)}123456790`],
  [`${"8".repeat(200)}${"9".repeat(200)}`, `${"8".repeat(199)}9${"0".repeat(200)}`],
];

test("satisfiesSemver computes every ^ and ~ limit exactly, past Number precision", () => {
  const huge = "9".repeat(30);
  for (const [n, next] of SUCCESSORS) {
    assertSatisfies(
      `^${n}.0.0`,
      [`${n}.0.0`, `${n}.${huge}.${huge}`, `${next}.0.0-0`],
      [`${n}.0.0-0`, `${next}.0.0`, `${next}.0.0+0`, `${next}.0.1`],
    );
    assertSatisfies(
      `^0.${n}.0`,
      [`0.${n}.0`, `0.${n}.${huge}`, `0.${next}.0-0`],
      [`0.${n}.0-0`, `0.${next}.0`, `0.${next}.0+0`, `0.${next}.1`, "1.0.0"],
    );
    assertSatisfies(
      `^0.0.${n}`,
      [`0.0.${n}`, `0.0.${next}-0`],
      [`0.0.${n}-0`, `0.0.${next}`, `0.0.${next}+0`, "0.1.0"],
    );
    assertSatisfies(
      `~${n}.${n}.0`,
      [`${n}.${n}.0`, `${n}.${n}.${huge}`, `${n}.${next}.0-0`],
      [`${n}.${n}.0-0`, `${n}.${next}.0`, `${n}.${next}.0+0`, `${n}.${next}.1`, `${next}.0.0`],
    );
  }
});

test("satisfiesSemver computes limits of million-digit numbers", () => {
  const expand = (text) =>
    text.replaceAll("N", "9".repeat(1_000_000)).replaceAll("P", `1${"0".repeat(1_000_000)}`);
  for (const [version, range, expected] of [
    ["N.1.0", "^N.0.0", true],
    ["P.0.0-0", "^N.0.0", true],
    ["P.0.0", "^N.0.0", false],
    ["0.N.1", "^0.N.0", true],
    ["0.P.0-0", "^0.N.0", true],
    ["0.P.0", "^0.N.0", false],
    ["0.0.N", "^0.0.N", true],
    ["0.0.P-0", "^0.0.N", true],
    ["0.0.P", "^0.0.N", false],
    ["1.N.1", "~1.N.0", true],
    ["1.P.0-0", "~1.N.0", true],
    ["1.P.0", "~1.N.0", false],
    ["N8.1.0", "^N8.0.0", true],
    ["N9.0.0-0", "^N8.0.0", true],
    ["N9.0.0", "^N8.0.0", false],
  ]) {
    assert.equal(
      satisfiesSemver(expand(version), expand(range)),
      expected,
      `${version} against ${range}, where N is a million nines and P is N + 1`,
    );
  }
});

test("satisfiesSemver computes a limit for a number longer than the largest BigInt", () => {
  const range = `^${"9".repeat(330_000_000)}.0.0`;
  assert.equal(
    satisfiesSemver("1.0.0", range),
    false,
    "1.0.0 against ^N.0.0, where N is 330 million nines",
  );
});

test("satisfiesSemver requires every comparator of the range to hold", () => {
  const holding = [">=1.0.0", "<2.0.0", "^1.2.0", "~1.5.0", "=1.5.0", "1.5.0", ">1.4.9", "<=1.5.0"];
  const failing = ["<1.5.0", ">1.5.0", "^2.0.0", "~1.4.0", "=1.5.1", "1.4.0", ">=1.5.1", "<=1.4.99"];
  for (const comparator of holding) {
    assertSatisfies(comparator, ["1.5.0"], []);
    assertSatisfies(`${comparator} >=1.0.0`, ["1.5.0"], []);
    assertSatisfies(`>=1.0.0 ${comparator}`, ["1.5.0"], []);
    assertSatisfies(`>=1.0.0 ${comparator} <2.0.0`, ["1.5.0"], []);
  }
  for (const comparator of failing) {
    assertSatisfies(comparator, [], ["1.5.0"]);
    assertSatisfies(`${comparator} >=1.0.0`, [], ["1.5.0"]);
    assertSatisfies(`>=1.0.0 ${comparator}`, [], ["1.5.0"]);
    assertSatisfies(`${comparator} >=1.0.0 <2.0.0`, [], ["1.5.0"]);
    assertSatisfies(`>=1.0.0 ${comparator} <2.0.0`, [], ["1.5.0"]);
    assertSatisfies(`>=1.0.0 <2.0.0 ${comparator}`, [], ["1.5.0"]);
  }
  assertSatisfies(holding.join(" "), ["1.5.0"], ["1.4.9", "1.5.1"]);
});

test("satisfiesSemver returns false for an unsatisfiable range", () => {
  const versions = ["0.0.0-0", "0.0.0", "1.0.0-0", "1.0.0", "1.5.0", "2.0.0-0", "2.0.0", "3.0.0"];
  for (const range of [
    "<0.0.0-0",
    ">=2.0.0 <1.0.0",
    ">1.0.0 <1.0.0",
    ">=1.0.0 <1.0.0",
    ">1.0.0 <=1.0.0",
    "=1.0.0 =2.0.0",
    "1.0.0 2.0.0",
    "^1.0.0 ^2.0.0",
    "~1.2.0 ~1.3.0",
  ]) {
    assertSatisfies(range, [], versions);
  }
  assertSatisfies(">=1.0.0 <=1.0.0", ["1.0.0", "1.0.0+0"], ["1.0.0-0", "1.0.1-0", "0.9.9"]);
});

test("satisfiesSemver evaluates a range of a thousand comparators", () => {
  const comparators = Array.from({ length: 1000 }, () => ">=1.0.0");
  assertSatisfies(comparators.join(" "), ["1.0.0", "9.9.9"], ["0.9.9"]);
  comparators[500] = "<1.0.0";
  assertSatisfies(comparators.join(" "), [], ["0.9.9", "1.0.0", "9.9.9"]);
});

test("satisfiesSemver validates every comparator before evaluating any", () => {
  assertInvalidRanges("1.2.3", [
    "<1.0.0 ^v1.0.0",
    "<1.0.0 >=1.0.0 1.2",
    "<1.0.0 ",
    "<1.0.0  >=1.0.0",
    "<1.0.0 x",
  ]);
});

test("satisfiesSemver separates comparators only by a single ASCII space", () => {
  const sites = [
    [">=1.0.0", "<2.0.0", "1.5.0", { " ": true }],
    ["^1.0.0", "~1.5.0", "1.5.0", { " ": true }],
    [">=1.0.0 <2.0.0", "~1.5.0", "1.5.0", { " ": true }],
    [">=1.0.0", "<2.0.0 ~1.5.0", "1.5.0", { " ": true }],
    ["1.2.3", "1.2.3", "1.2.3", { " ": true, "-": false, "+": true }],
  ];
  for (const [left, right, version, valid] of sites) {
    for (const char of ASCII) {
      const range = `${left}${char}${right}`;
      if (Object.hasOwn(valid, char)) {
        assert.equal(satisfiesSemver(version, range), valid[char], against(version, range));
      } else {
        assertInvalidRanges(version, [range]);
      }
    }
  }
});

test("satisfiesSemver rejects Unicode spaces and format characters anywhere in a range", () => {
  const invisible = [];
  for (let code = 0x80; code <= 0x10ffff; code++) {
    const char = String.fromCodePoint(code);
    if (/[\p{White_Space}\p{Cf}]/u.test(char)) {
      invisible.push(char);
    }
  }
  assert.ok(invisible.length > 150, `${invisible.length} non-ASCII space and format characters`);
  for (const char of invisible) {
    assertInvalidRanges("1.5.0", [
      `>=1.0.0${char}<2.0.0`,
      `>=1.0.0 ${char}<2.0.0`,
      `>=1.0.0${char} <2.0.0`,
      `${char}^1.0.0`,
      `^1.0.0${char}`,
      `^${char}1.0.0`,
      char,
    ]);
  }
});

test("satisfiesSemver rejects two or more spaces between comparators", () => {
  assertInvalidRanges("1.5.0", [
    ">=1.0.0  <2.0.0",
    ">=1.0.0   <2.0.0",
    ">=1.0.0 <2.0.0  ~1.5.0",
    ">=1.0.0  <2.0.0 ~1.5.0",
    ">=1.0.0 \t<2.0.0",
    ">=1.0.0\t <2.0.0",
    ">=1.0.0 \n <2.0.0",
  ]);
});

test("satisfiesSemver rejects leading and trailing whitespace", () => {
  for (const space of [" ", "  ", "\t", "\n", "\r", "\r\n", "\v", "\f"]) {
    for (const range of ["^1.0.0", ">=1.0.0 <2.0.0"]) {
      assertInvalidRanges("1.5.0", [`${space}${range}`, `${range}${space}`, `${space}${range}${space}`]);
    }
    assertInvalidRanges("1.5.0", [space]);
  }
});

test("satisfiesSemver rejects an empty range and empty comparators", () => {
  assertInvalidRanges("1.2.3", ["", " ", "^1.0.0 ", " ^1.0.0", "^1.0.0  ^1.0.0"]);
});

test("satisfiesSemver accepts only =, >, <, ^, ~ or a version's first digit before the version", () => {
  const operators = { "=": true, ">": false, "<": false, "^": true, "~": true };
  for (const char of ASCII) {
    const range = `${char}1.2.3`;
    if (Object.hasOwn(operators, char)) {
      assert.equal(satisfiesSemver("1.2.3", range), operators[char], against("1.2.3", range));
    } else if ("123456789".includes(char)) {
      assert.equal(satisfiesSemver("1.2.3", range), false, against("1.2.3", range));
    } else {
      assertInvalidRanges("1.2.3", [range]);
    }
  }
});

test("satisfiesSemver rejects any character between an operator and its version", () => {
  const withLongerMajor = {
    "=": false,
    ">": false,
    ">=": false,
    "<": true,
    "<=": true,
    "^": false,
    "~": false,
  };
  for (const [operator, result] of Object.entries(withLongerMajor)) {
    for (const char of ASCII) {
      const range = `${operator}${char}1.2.3`;
      if ("123456789".includes(char)) {
        assert.equal(satisfiesSemver("1.2.3", range), result, against("1.2.3", range));
      } else if (char === "=" && (operator === ">" || operator === "<")) {
        assert.equal(satisfiesSemver("1.2.3", range), true, against("1.2.3", range));
      } else {
        assertInvalidRanges("1.2.3", [range]);
      }
    }
  }
});

test("satisfiesSemver rejects operators other than >= and <= made of =, <, >, ^ and ~", () => {
  const ranges = [];
  for (const first of "=<>^~") {
    for (const second of "=<>^~") {
      if (`${first}${second}` !== ">=" && `${first}${second}` !== "<=") {
        ranges.push(`${first}${second}1.2.3`);
      }
    }
  }
  assert.equal(ranges.length, 23, "two-character combinations");
  assertInvalidRanges("1.2.3", ranges);
  assertInvalidRanges("1.2.3", [">==1.2.3", "<==1.2.3", ">=>1.2.3", "^^^1.2.3", "~~~1.2.3"]);
});

test("satisfiesSemver rejects a space inside or after an operator", () => {
  assertInvalidRanges("1.2.3", [
    "= 1.2.3",
    "> 1.2.3",
    ">= 1.2.3",
    "< 1.2.3",
    "<= 1.2.3",
    "^ 1.2.3",
    "~ 1.2.3",
    "> =1.2.3",
    "< =1.2.3",
    ">=1.0.0 < 2.0.0",
    "^1.0.0 ~ 1.2.3",
  ]);
});

test("satisfiesSemver rejects other range syntaxes", () => {
  assertInvalidRanges("1.2.3", [
    "1.0.0 - 2.0.0",
    "1.0.0 -2.0.0",
    "1.0.0- 2.0.0",
    "^1.0.0 || ^2.0.0",
    "^1.0.0||^2.0.0",
    "||",
    "*",
    "x",
    "X",
    "1.x",
    "1.2.x",
    "1.x.x",
    "1.*",
    "1.2.*",
    "1",
    "1.2",
    "^1",
    "^1.2",
    "~1",
    "~1.2",
    ">1",
    "<=1.2",
    "~>1.2.3",
    "!=1.2.3",
    "!1.2.3",
    "<>1.2.3",
    "==1.2.3",
    "=v1.2.3",
    "v1.2.3",
    "^v1.2.3",
    "latest",
    ">=1.0.0,<2.0.0",
    ">=1.0.0, <2.0.0",
    ">=1.0.0&&<2.0.0",
    ">=1.0.0 && <2.0.0",
    "[1.0.0,2.0.0)",
    "(1.2.3)",
    "^",
    "~",
    ">=",
    "=",
  ]);
});

test("satisfiesSemver reads a hyphen without spaces as a pre-release, not a hyphen range", () => {
  assertSatisfies("1.0.0-2.0.0", ["1.0.0-2.0.0", "1.0.0-2.0.0+0"], ["1.0.0", "1.5.0", "2.0.0"]);
});

test("satisfiesSemver rejects an operator or a range in the version argument", () => {
  const operators = ["=", ">", ">=", "<", "<=", "^", "~"];
  for (const version of [...operators.map((operator) => `${operator}1.2.3`), "1.2.3 1.2.3", "*"]) {
    assert.throws(
      () => satisfiesSemver(version, ">=0.0.0-0"),
      invalidVersion(version),
      against(version, ">=0.0.0-0"),
    );
  }
});

const COMPARATOR_FORMS = [
  (version) => version,
  (version) => `=${version}`,
  (version) => `>=${version}`,
  (version) => `<=${version}`,
  (version) => `^${version}`,
  (version) => `~${version}`,
  (version) => `>=0.0.0-0 ^${version}`,
];

function assertAcceptedVersions(versions) {
  for (const version of versions) {
    assertSatisfies(">=0.0.0-0", [version], []);
    assertSatisfies("<0.0.0-0", [], [version]);
    for (const form of COMPARATOR_FORMS) {
      assertSatisfies(form(version), [version], []);
    }
    assertSatisfies(`>${version}`, [], [version]);
    assertSatisfies(`<${version}`, [], [version]);
    assertSatisfies(`<=${version}`, [LOWEST], []);
  }
}

function assertRejectedVersions(values) {
  for (const value of values) {
    const label = JSON.stringify(value);
    assert.throws(
      () => satisfiesSemver(value, ">=0.0.0-0"),
      invalidVersion(value),
      `${label} as the version`,
    );
    for (const form of COMPARATOR_FORMS) {
      const range = form(value);
      assert.throws(
        () => satisfiesSemver("1.2.3", range),
        invalidRange(range),
        `${label} in ${JSON.stringify(range)}`,
      );
    }
  }
}

test("satisfiesSemver accepts the pre-release and build shapes of items 9 and 10 in both positions", () => {
  assertAcceptedVersions([
    "4.5.6-rc",
    "4.5.6-rc.7",
    "4.5.6-7.0.9",
    "4.5.6-y.8.w.13",
    "4.5.6-a-b-c.---",
    "4.5.6-rc+007",
    "4.5.6+20991231235959",
    "4.5.6-gamma+exp.sha.0a1b2c3",
    "4.5.6+FF00----AA11",
  ]);
});

test("satisfiesSemver accepts grammar edge cases the BNF allows in both positions", () => {
  assertAcceptedVersions([
    "0.0.0",
    "7.70.700",
    "3.0.0-0",
    "3.0.0-0z",
    "3.0.0-000z",
    "3.0.0--",
    "3.0.0---",
    "3.0.0--1",
    "3.0.0-1-",
    "3.0.0-z-",
    "3.0.0-1.0.0",
    "3.0.0-A.Z.a.z.0.9",
    "3.0.0+1",
    "3.0.0+000",
    "3.0.0+--",
    "3.0.0+1.01.-",
    "3.0.0+A-Z.a-z.0-9",
    "3.0.0-1+1",
  ]);
});

test("satisfiesSemver accepts versions far longer than 255 characters in both positions", () => {
  assertAcceptedVersions([
    `4.5.6-${Array.from({ length: 300 }, (_, i) => `id${i}`).join(".")}`,
    `4.5.6+${"e".repeat(5000)}`,
    `${"7".repeat(5000)}.5.6`,
    `4.${"7".repeat(5000)}.6`,
    `4.5.${"7".repeat(5000)}`,
  ]);
});

test("satisfiesSemver rejects a version core without exactly three numeric parts in both positions", () => {
  assertRejectedVersions([
    "2",
    "2.1",
    "2.1.0.0",
    "2.1.0.",
    ".2.1.0",
    "2..1",
    "2.1..0",
    "x.y.z",
    "2.1.x",
    "2.x.0",
    "2.1.*",
    ".",
  ]);
});

test("satisfiesSemver rejects leading zeros in the version core in both positions", () => {
  assertRejectedVersions(["02.1.0", "2.01.0", "2.1.00", "00.0.0", "0.00.0", "0.0.00", "007.0.0"]);
});

test("satisfiesSemver rejects leading zeros in numeric pre-release identifiers in both positions", () => {
  assertRejectedVersions(["2.1.0-02", "2.1.0-000", "2.1.0-rc.01", "2.1.0-0.00", "2.1.0-1.007"]);
});

test("satisfiesSemver rejects empty pre-release and build identifiers in both positions", () => {
  assertRejectedVersions([
    "2.1.0-rc..1",
    "2.1.0-.rc",
    "2.1.0-rc.",
    "2.1.0-rc.+b",
    "2.1.0+b..c",
    "2.1.0+.b",
    "2.1.0+b.",
  ]);
});

test("satisfiesSemver rejects empty pre-release and build sections in both positions", () => {
  assertRejectedVersions(["2.1.0-", "2.1.0+", "2.1.0-+b", "2.1.0-rc+", "2.1.0-+"]);
});

test("satisfiesSemver rejects a second plus sign in both positions", () => {
  assertRejectedVersions(["2.1.0+b+c", "2.1.0++b", "2.1.0-rc+b+c", "2.1.0+b.c+d"]);
});

test("satisfiesSemver rejects characters outside [0-9A-Za-z-] in identifiers in both positions", () => {
  assertRejectedVersions([
    "2.1.0-rc_1",
    "2.1.0-r\u00e9",
    "2.1.0+b c",
    "2.1.0+\u00e9",
    "2.1.0-rc/1",
    "2.1.0-rc~1",
    "2.1.0-rc!",
    "2.1.0-rc*",
    "2.1.0+b_c",
    "2.1.0+b^c",
    "2.1.0+b[c]",
    "2.1.0+b=c",
    "2.1.0+b>c",
  ]);
});

test("satisfiesSemver rejects other ASCII characters at each version separator in both positions", () => {
  const identifierCharacters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-";
  const sites = [
    ["4", ".", "5.6", ""],
    ["4.5", ".", "6", ""],
    ["4.5.6", "-", "rc+b", ""],
    ["4.5.6", "+", "0.07", ""],
    ["4.5.6-rc", "+", "0.07", ""],
    ["4.5.6-rc", ".", "x", `${identifierCharacters}+`],
    ["4.5.6+b", ".", "x", identifierCharacters],
  ];
  for (const [before, separator, after, alsoValid] of sites) {
    assertAcceptedVersions([`${before}${separator}${after}`]);
    const others = ASCII.filter((char) => char !== separator && !alsoValid.includes(char));
    assertRejectedVersions(others.map((char) => `${before}${char}${after}`));
  }
});

test("satisfiesSemver rejects non-ASCII letters that case-fold to ASCII in both positions", () => {
  assertRejectedVersions([
    "2.1.0-\u017f",
    "2.1.0-\u212a",
    "2.1.0+\u212a",
    "2.1.0-\u0130",
    "2.1.0+\u0131",
    "\u212a.1.0",
  ]);
});

test("satisfiesSemver rejects a prefix before the major version in both positions", () => {
  assertRejectedVersions(["v2.1.0", "V2.1.0", "-2.1.0", "+2.1.0", "x2.1.0"]);
});

test("satisfiesSemver rejects whitespace anywhere in a version in both positions", () => {
  assertRejectedVersions([
    "2.1.0\n",
    "\n2.1.0",
    " 2.1.0",
    "2.1.0 ",
    "\t2.1.0",
    "2.1.0\t",
    "2.1.0\r\n",
    "2.1.0\v",
    "2.1.0\f",
    "2 .1.0",
    "2.1 .0",
    "2.1.0 -rc",
    "2.1.0- rc",
    "2.1.0-rc\n",
    "2.1.0+b\n",
    "2.1.0\u00a0",
    "\u30002.1.0",
    "2.1.0\u2029",
    "2.1.0\ufeff",
  ]);
});

test("satisfiesSemver rejects non-ASCII number characters at every digit site in both positions", () => {
  const numbers = [];
  for (let code = 0x80; code <= 0x10ffff; code++) {
    const char = String.fromCodePoint(code);
    if (/\p{N}/u.test(char)) {
      numbers.push(char);
    }
  }
  assert.ok(numbers.length > 1000, `${numbers.length} non-ASCII number characters`);
  const sites = [
    (n) => `${n}.5.6`,
    (n) => `4${n}.5.6`,
    (n) => `4.${n}.6`,
    (n) => `4.5${n}.6`,
    (n) => `4.5.${n}`,
    (n) => `4.5.6${n}`,
    (n) => `4.5.6-${n}`,
    (n) => `4.5.6-7${n}`,
    (n) => `4.5.6-rc.7${n}`,
    (n) => `4.5.6-${n}rc`,
    (n) => `4.5.6-rc${n}`,
    (n) => `4.5.6+${n}`,
    (n) => `4.5.6+7${n}`,
  ];
  for (const number of numbers) {
    assertRejectedVersions(sites.map((site) => site(number)));
  }
});

test("satisfiesSemver rejects the empty version in both positions", () => {
  assertRejectedVersions([""]);
});

test("satisfiesSemver rejects long invalid versions in both positions", () => {
  assertRejectedVersions([
    `4.5.6-${"7".repeat(10000)}_`,
    `4.5.6-${"b.".repeat(5000)}`,
    `4.5.6-0${"7".repeat(10000)}`,
    `0${"4".repeat(10000)}.5.6`,
    `4.5.6+${"b".repeat(10000)}+`,
  ]);
});

function nonStrings(text) {
  return [
    ["undefined", undefined],
    ["null", null],
    ["true", true],
    ["false", false],
    ["0", 0],
    ["1", 1],
    ["NaN", NaN],
    ["1n", 1n],
    ["Symbol", Symbol(text)],
    ["empty object", {}],
    ["empty array", []],
    ["array of the text", [text]],
    ["new String", new String(text)],
    ["Object(string)", Object(text)],
    ["object with toString", { toString: () => text }],
    ["object with valueOf", { valueOf: () => text }],
    ["object with Symbol.toPrimitive", { [Symbol.toPrimitive]: () => text }],
    ["function", () => text],
    ["RegExp", new RegExp(text)],
  ];
}

test("satisfiesSemver throws TypeError for every kind of non-string in each position", () => {
  for (const [label, value] of nonStrings("1.2.3")) {
    assert.throws(() => satisfiesSemver(value, "^1.0.0"), NOT_STRINGS, `${label} as the version`);
  }
  for (const [label, value] of nonStrings("^1.0.0")) {
    assert.throws(() => satisfiesSemver("1.2.3", value), NOT_STRINGS, `${label} as the range`);
    assert.throws(() => satisfiesSemver(value, value), NOT_STRINGS, `${label} as both`);
  }
});

test("satisfiesSemver throws TypeError for missing arguments", () => {
  assert.throws(() => satisfiesSemver(), NOT_STRINGS, "no arguments");
  assert.throws(() => satisfiesSemver("1.2.3"), NOT_STRINGS, "no range");
});

test("satisfiesSemver checks the type of both arguments before the syntax of either", () => {
  assert.throws(() => satisfiesSemver("1.2", 1), NOT_STRINGS, "invalid version, numeric range");
  assert.throws(() => satisfiesSemver("1.2"), NOT_STRINGS, "invalid version, missing range");
  assert.throws(() => satisfiesSemver("", null), NOT_STRINGS, "empty version, null range");
  assert.throws(
    () => satisfiesSemver("v1.2.3", new String("^1.0.0")),
    NOT_STRINGS,
    "invalid version, String range",
  );
  assert.throws(() => satisfiesSemver(1, "^v1.0.0"), NOT_STRINGS, "numeric version, invalid range");
  assert.throws(() => satisfiesSemver(undefined, ""), NOT_STRINGS, "undefined version, empty range");
  assert.throws(
    () => satisfiesSemver(new String("1.2.3"), " "),
    NOT_STRINGS,
    "String version, blank range",
  );
});

test("satisfiesSemver names the version when both the version and the range are invalid", () => {
  for (const [version, range] of [
    ["1.2", "^1.0.0"],
    ["1.2", "^v1.0.0"],
    ["", ""],
    ["1.2.3 ", " ^1.0.0"],
    ["v1.2.3", "=>1.0.0"],
    ["=1.2.3", ">=1.0.0  <2.0.0"],
  ]) {
    assert.throws(() => satisfiesSemver(version, range), invalidVersion(version), against(version, range));
  }
});

test("satisfiesSemver names the whole range when one comparator is invalid", () => {
  assertInvalidRanges("1.2.3", [">=1.0.0 <2.0.0 ~v1.2.3", "^1.0.0 1.2", ">=1.0.0  <2.0.0"]);
});

test("satisfiesSemver quotes the named input with JSON.stringify after its own prefix", () => {
  assert.throws(() => satisfiesSemver("1.2.3\n", "^1.0.0"), {
    name: "SyntaxError",
    message: 'satisfiesSemver: "1.2.3\\n" is not a valid SemVer 2.0.0 version',
  });
  assert.throws(() => satisfiesSemver("1.2.3", '^1.0.0\t"x"'), {
    name: "SyntaxError",
    message: 'satisfiesSemver: "^1.0.0\\t\\"x\\"" is not a valid range',
  });
  assert.throws(() => satisfiesSemver("1.2.3", ""), {
    name: "SyntaxError",
    message: 'satisfiesSemver: "" is not a valid range',
  });
  assert.throws(() => satisfiesSemver(Symbol("1.2.3"), "^1.0.0"), {
    name: "TypeError",
    message: "satisfiesSemver: version and range must both be strings",
  });
});
