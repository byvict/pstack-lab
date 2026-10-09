import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const LAB = fileURLToPath(new URL("../bin/lab.mjs", import.meta.url));

const USAGE =
  "usage: lab duration parse <texto>\n" +
  "       lab duration format <ms>\n" +
  "       lab semver compare <a> <b>\n" +
  "       lab --help\n" +
  "       lab help\n";

function lab(args, { shebang = false } = {}) {
  const { status, stdout, stderr, error } = shebang
    ? spawnSync(LAB, args, { encoding: "utf8" })
    : spawnSync(process.execPath, [LAB, ...args], { encoding: "utf8" });
  assert.ifError(error);
  return { status, stdout, stderr };
}

function show(args) {
  const shown = args.map((arg) =>
    arg.length > 40 ? `${JSON.stringify(arg.slice(0, 8))}... (${arg.length} chars)` : JSON.stringify(arg),
  );
  return `[${shown.join(", ")}]`;
}

const SUCCESSES = [
  [["duration", "parse", "1h30m"], "5400000\n"],
  [["duration", "parse", "90m"], "5400000\n"],
  [["duration", "parse", "0ms"], "0\n"],
  [["duration", "parse", "2d3h4m5s6ms"], "183845006\n"],
  [["duration", "parse", "9007199254740991ms"], "9007199254740991\n"],
  [["duration", "parse", "104249991d8h59m991ms"], "9007199254740991\n"],
  [["duration", "format", "0"], "0ms\n"],
  [["duration", "format", "5400000"], "1h30m\n"],
  [["duration", "format", "183845006"], "2d3h4m5s6ms\n"],
  [["duration", "format", "3600001"], "1h1ms\n"],
  [["duration", "format", "9007199254740991"], "104249991d8h59m991ms\n"],
  [["semver", "compare", "1.0.0", "1.0.0"], "0\n"],
  [["semver", "compare", "1.0.0", "1.0.1"], "-1\n"],
  [["semver", "compare", "2.0.0", "1.0.0"], "1\n"],
  [["semver", "compare", "1.9.0", "1.10.0"], "-1\n"],
  [["semver", "compare", "1.0.0-rc.1", "1.0.0"], "-1\n"],
  [["semver", "compare", "1.0.0+build.1", "1.0.0+build.2"], "0\n"],
];

const HELP_REQUESTS = [["--help"], ["help"]];

const MALFORMED_MS = [
  "",
  " ",
  "00",
  "01",
  "09007199254740991",
  "-0",
  "-1",
  "+5",
  "1.0",
  "1.",
  "1e3",
  "0x10",
  "0b101",
  "0o17",
  "1_000",
  "1,000",
  "NaN",
  "Infinity",
  "1s",
  "--",
  "--help",
  "\t7\n",
  "1\n",
  "1\r\n",
  "1 ",
  "١",
  "１",
  "9007199254740991.4",
  "9".repeat(400) + "x",
];

const USAGE_ERRORS = [
  [],
  ["foo"],
  [""],
  ["-h"],
  ["--version"],
  ["HELP"],
  ["help", "x"],
  ["--help", "x"],
  ["help", "--help"],
  ["--", "duration", "parse", "1h"],
  ["duration"],
  ["semver"],
  ["duration", "--help"],
  ["duration", "help"],
  ["duration", "foo", "1s"],
  ["DURATION", "parse", "1h30m"],
  ["duration", "", "1s"],
  ["duration\n", "parse", "1s"],
  ["duration", "parse"],
  ["duration", "parse", "1h", "30m"],
  ["duration", "parse", "--", "-1s"],
  ["duration", "parse", "9007199254740992ms", "extra"],
  ["duration", "format"],
  ["duration", "format", "1", "extra"],
  ["duration", "format", "9007199254740992", "extra"],
  ["semver", "compare"],
  ["semver", "compare", "1.0.0"],
  ["semver", "compare", "1.0.0", "2.0.0", "3.0.0"],
  ...MALFORMED_MS.map((ms) => ["duration", "format", ms]),
];

const FUNCTION_ERRORS = [
  [["duration", "parse", "-1s"], 'lab: SyntaxError: parseDuration: invalid duration "-1s"\n'],
  [["duration", "parse", "--"], 'lab: SyntaxError: parseDuration: invalid duration "--"\n'],
  [["duration", "parse", "--help"], 'lab: SyntaxError: parseDuration: invalid duration "--help"\n'],
  [["duration", "parse", ""], 'lab: SyntaxError: parseDuration: invalid duration ""\n'],
  [["duration", "parse", "1h\n"], 'lab: SyntaxError: parseDuration: invalid duration "1h\\n"\n'],
  [["duration", "parse", "1h 30m"], 'lab: SyntaxError: parseDuration: invalid duration "1h 30m"\n'],
  [["duration", "parse", "01m"], 'lab: SyntaxError: parseDuration: invalid duration "01m"\n'],
  [["duration", "parse", "%s"], 'lab: SyntaxError: parseDuration: invalid duration "%s"\n'],
  [
    ["duration", "parse", "9007199254740992ms"],
    'lab: RangeError: parseDuration: "9007199254740992ms" exceeds Number.MAX_SAFE_INTEGER milliseconds\n',
  ],
  [
    ["duration", "format", "9007199254740992"],
    "lab: RangeError: formatDuration: 9007199254740992 is not an integer from 0 to Number.MAX_SAFE_INTEGER\n",
  ],
  [
    ["duration", "format", "9007199254740993"],
    "lab: RangeError: formatDuration: 9007199254740992 is not an integer from 0 to Number.MAX_SAFE_INTEGER\n",
  ],
  [
    ["duration", "format", "9007199254740995"],
    "lab: RangeError: formatDuration: 9007199254740996 is not an integer from 0 to Number.MAX_SAFE_INTEGER\n",
  ],
  [
    ["duration", "format", "1" + "0".repeat(21)],
    "lab: RangeError: formatDuration: 1e+21 is not an integer from 0 to Number.MAX_SAFE_INTEGER\n",
  ],
  [
    ["duration", "format", "9".repeat(400)],
    "lab: RangeError: formatDuration: Infinity is not an integer from 0 to Number.MAX_SAFE_INTEGER\n",
  ],
  [
    ["semver", "compare", "1.0", "2.0.0"],
    'lab: SyntaxError: compareSemver: "1.0" is not a valid SemVer 2.0.0 version\n',
  ],
  [
    ["semver", "compare", "1.0.0", "2.0"],
    'lab: SyntaxError: compareSemver: "2.0" is not a valid SemVer 2.0.0 version\n',
  ],
  [
    ["semver", "compare", "bad-a", "bad-b"],
    'lab: SyntaxError: compareSemver: "bad-a" is not a valid SemVer 2.0.0 version\n',
  ],
  [
    ["semver", "compare", "", "1.0.0"],
    'lab: SyntaxError: compareSemver: "" is not a valid SemVer 2.0.0 version\n',
  ],
  [
    ["semver", "compare", "-1.0.0", "1.0.0"],
    'lab: SyntaxError: compareSemver: "-1.0.0" is not a valid SemVer 2.0.0 version\n',
  ],
  [
    ["semver", "compare", "--help", "1.0.0"],
    'lab: SyntaxError: compareSemver: "--help" is not a valid SemVer 2.0.0 version\n',
  ],
  [
    ["semver", "compare", "1.0.0", "--"],
    'lab: SyntaxError: compareSemver: "--" is not a valid SemVer 2.0.0 version\n',
  ],
  [
    ["semver", "compare", "1.0.0\n", "1.0.0"],
    'lab: SyntaxError: compareSemver: "1.0.0\\n" is not a valid SemVer 2.0.0 version\n',
  ],
];

test('the shebang runs ["duration", "parse", "1h30m"]', () => {
  assert.deepEqual(lab(["duration", "parse", "1h30m"], { shebang: true }), {
    status: 0,
    stdout: "5400000\n",
    stderr: "",
  });
});

for (const [args, stdout] of SUCCESSES) {
  test(`${show(args)} prints ${stdout.trimEnd()}`, () => {
    assert.deepEqual(lab(args), { status: 0, stdout, stderr: "" });
  });
}

for (const args of HELP_REQUESTS) {
  test(`${show(args)} prints the usage to stdout`, () => {
    assert.deepEqual(lab(args), { status: 0, stdout: USAGE, stderr: "" });
  });
}

for (const args of USAGE_ERRORS) {
  test(`${show(args)} is a usage error`, () => {
    assert.deepEqual(lab(args), { status: 2, stdout: "", stderr: USAGE });
  });
}

for (const [args, stderr] of FUNCTION_ERRORS) {
  test(`${show(args)} reports the function's error`, () => {
    assert.deepEqual(lab(args), { status: 1, stdout: "", stderr });
  });
}

test("a 90000-character error line reaches stderr whole", () => {
  assert.deepEqual(lab(["duration", "parse", "x".repeat(90_000)]), {
    status: 1,
    stdout: "",
    stderr: 'lab: SyntaxError: parseDuration: invalid duration "' + "x".repeat(90_000) + '"\n',
  });
});
