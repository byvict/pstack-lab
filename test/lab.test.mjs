import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { satisfiesSemver } from "../src/semver.mjs";

const LAB = fileURLToPath(new URL("../bin/lab.mjs", import.meta.url));
const DURATION = new URL("../src/duration.mjs", import.meta.url).href;

const USAGE =
  "usage: lab duration parse <texto>\n" +
  "       lab duration format <ms>\n" +
  "       lab semver compare <a> <b>\n" +
  "       lab semver satisfies <versão> <faixa>\n" +
  "       lab --help\n" +
  "       lab help\n";

function lab(args, { executable, nodeArgs = [] } = {}) {
  const { status, stdout, stderr, error } = executable
    ? spawnSync(executable, args, { encoding: "utf8", cwd: tmpdir() })
    : spawnSync(process.execPath, [...nodeArgs, LAB, ...args], { encoding: "utf8" });
  assert.ifError(error);
  return { status, stdout, stderr };
}

// No argv string reaches these error paths, so a child-only preload swaps parseDuration
// and reports any uncaught error on one line with exit 3. bin/lab.mjs itself is unchanged.
function withParseDuration(definition) {
  const stub =
    `import { parseDuration as real } from ${JSON.stringify(DURATION)};` +
    `export { formatDuration } from ${JSON.stringify(DURATION)};` +
    `export const parseDuration = ${definition};`;
  const preload =
    'import { registerHooks } from "node:module";' +
    "registerHooks({ resolve: (specifier, context, next) => {" +
    " const resolved = next(specifier, context);" +
    ` return resolved.url === ${JSON.stringify(DURATION)} && !context.parentURL?.startsWith("data:")` +
    ` ? { url: ${JSON.stringify(`data:text/javascript,${encodeURIComponent(stub)}`)}, shortCircuit: true }` +
    " : resolved; } });" +
    'process.on("uncaughtException", (error) => {' +
    ' console.error(`uncaught: ${error.name}: ${error.message}`); process.exitCode = 3; });';
  return ["--import", `data:text/javascript,${encodeURIComponent(preload)}`];
}

function labWithClosedReader(args, closed) {
  const open = closed === "stdout" ? "stderr" : "stdout";
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [LAB, ...args]);
    child[closed].destroy();
    let text = "";
    child[open].setEncoding("utf8");
    child[open].on("data", (chunk) => {
      text += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, [open]: text }));
  });
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
  [["semver", "compare", "1.0.0-B", "1.0.0-a"], "-1\n"],
  [["semver", "compare", "1.0.0-a", "1.0.0-B"], "1\n"],
  [["semver", "satisfies", "1.2.3", "^1.0.0"], "true\n"],
  [["semver", "satisfies", "2.0.0", "^1.0.0"], "false\n"],
  [["semver", "satisfies", "1.5.0", ">=1.2.3 <2.0.0"], "true\n"],
  [["semver", "satisfies", "2.0.0", ">=1.2.3 <2.0.0"], "false\n"],
  [["semver", "satisfies", "1.0.0", ">=1.2.3 <2.0.0"], "false\n"],
  [["semver", "satisfies", "1.0.0-B", ">=1.0.0-a"], "false\n"],
  [["semver", "satisfies", "1.0.0-a", ">=1.0.0-B"], "true\n"],
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
  "\t7\n",
  "1\n",
  "1\r\n",
  "1 ",
  "1\u2028",
  "\u0661",
  "\uFF11",
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
  ["duration"],
  ["semver"],
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
  ["semver", "satisfies"],
  ["semver", "satisfies", "1.2.3"],
  ["semver", "satisfies", "1.5.0", ">=1.2.3", "<2.0.0"],
  ["semver", "satisfies", "1.5.0", ">=1.2.3", "<2.0.0", "^1.4.0"],
  ...MALFORMED_MS.map((ms) => ["duration", "format", ms]),
];

const FUNCTION_ERRORS = [
  [["duration", "parse", "-1s"], 'lab: SyntaxError: parseDuration: invalid duration "-1s"\n'],
  [["duration", "parse", ""],'lab: SyntaxError: parseDuration: invalid duration ""\n'],
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
    ["semver", "compare", "1.0.0\n", "1.0.0"],
    'lab: SyntaxError: compareSemver: "1.0.0\\n" is not a valid SemVer 2.0.0 version\n',
  ],
  [
    ["semver", "satisfies", "1.0", "^1.0.0"],
    'lab: SyntaxError: satisfiesSemver: "1.0" is not a valid SemVer 2.0.0 version\n',
  ],
  [
    ["semver", "satisfies", "1.0.0", "^1.0"],
    'lab: SyntaxError: satisfiesSemver: "^1.0" is not a valid range\n',
  ],
  [
    ["semver", "satisfies", "1.0", "^1.0"],
    'lab: SyntaxError: satisfiesSemver: "1.0" is not a valid SemVer 2.0.0 version\n',
  ],
  [
    ["semver", "satisfies", "1.5.0", ">=1.2.3 <2.0"],
    'lab: SyntaxError: satisfiesSemver: ">=1.2.3 <2.0" is not a valid range\n',
  ],
  [
    ["semver", "satisfies", "^1.2.3", "1.5.0"],
    'lab: SyntaxError: satisfiesSemver: "^1.2.3" is not a valid SemVer 2.0.0 version\n',
  ],
  [
    ["semver", "satisfies", "1.5.0 >=1.2.3", "<2.0.0"],
    'lab: SyntaxError: satisfiesSemver: "1.5.0 >=1.2.3" is not a valid SemVer 2.0.0 version\n',
  ],
];

const syntaxError = (message) => ({ status: 1, stdout: "", stderr: `lab: SyntaxError: ${message}\n` });

const OPERANDS = [
  {
    words: ["duration", "parse"],
    slots: [
      {
        valid: "1h",
        nearMisses: [" 1h", "\t1h", "\u00A01h", "1h ", "1H", "\uFF11h", "1h\u212A"],
        rejects: (token) => syntaxError(`parseDuration: invalid duration ${JSON.stringify(token)}`),
      },
    ],
  },
  {
    words: ["duration", "format"],
    slots: [
      {
        valid: "5",
        nearMisses: [" 5", "\t5", "\u00A05", "5 ", "\uFF15"],
        rejects: () => ({ status: 2, stdout: "", stderr: USAGE }),
      },
    ],
  },
  {
    words: ["semver", "compare"],
    slots: [
      {
        valid: "1.0.0",
        nearMisses: [" 1.0.0", "\t1.0.0", "\u00A01.0.0", "1.0.0 ", "\uFF11.0.0", "1.0.0-\u212A", "v1.0.0", "=1.0.0"],
        rejects: (token) => syntaxError(`compareSemver: ${JSON.stringify(token)} is not a valid SemVer 2.0.0 version`),
      },
      {
        valid: "2.0.0",
        nearMisses: [" 2.0.0", "\t2.0.0", "\u00A02.0.0", "2.0.0 ", "\uFF12.0.0", "2.0.0-\u212A", "v2.0.0", "=2.0.0"],
        rejects: (token) => syntaxError(`compareSemver: ${JSON.stringify(token)} is not a valid SemVer 2.0.0 version`),
      },
    ],
  },
  {
    words: ["semver", "satisfies"],
    slots: [
      {
        valid: "1.5.0",
        nearMisses: [
          " 1.5.0",
          "\t1.5.0",
          "\u00A01.5.0",
          "1.5.0 ",
          "1.5.0\n",
          "",
          "\uFF11.5.0",
          "1.5.0-\u212A",
          "1.5.0-\u017F",
          "1.5.0+",
          "v1.5.0",
          "=1.5.0",
          "01.5.0",
        ],
        rejects: (token) =>
          syntaxError(`satisfiesSemver: ${JSON.stringify(token)} is not a valid SemVer 2.0.0 version`),
      },
      {
        valid: ">=1.2.3 <2.0.0",
        nearMisses: [
          " >=1.2.3 <2.0.0",
          ">=1.2.3 <2.0.0 ",
          ">=1.2.3 <2.0.0\n",
          "",
          ">=1.2.3  <2.0.0",
          ">=1.2.3\t<2.0.0",
          ">=1.2.3\u00A0<2.0.0",
          '">=1.2.3 <2.0.0"',
          "\uFF1E=1.2.3 <2.0.0",
          ">=1.2.3-\u212A <2.0.0",
          ">=1.2.3-\u017F <2.0.0",
          ">=1.2.3+ <2.0.0",
          ">=1.2.3, <2.0.0",
          ">=v1.2.3 <2.0.0",
          "*",
          "x",
          ">=2.0.0 || <1.6.0",
          "1.x || 2.x",
          "1.2.3 - 2.0.0",
          ">= 1.2.3",
          "~>1.2.3",
        ],
        rejects: (token) => syntaxError(`satisfiesSemver: ${JSON.stringify(token)} is not a valid range`),
      },
    ],
  },
];

const OPTION_TOKENS = ["--", "--x", "-", "-h", "--help", "help"];

const validOperands = (slots) => slots.map(({ valid }) => valid);

const OPERAND_IN_SLOT = OPERANDS.flatMap(({ words, slots }) => {
  const valid = validOperands(slots);
  return slots.flatMap(({ nearMisses, rejects }, slot) =>
    [...OPTION_TOKENS, ...nearMisses].map((token) => [[...words, ...valid.with(slot, token)], rejects(token)]),
  );
});

const OPTION_MISPLACED = [
  ...OPERANDS.flatMap(({ words, slots }) => {
    const argv = [...words, ...validOperands(slots)];
    return OPTION_TOKENS.flatMap((token) =>
      Array.from({ length: argv.length + 1 }, (_, at) => argv.toSpliced(at, 0, token)),
    );
  }),
  ...[...new Set(OPERANDS.map(({ words }) => words[0]))].flatMap((group) =>
    OPTION_TOKENS.map((token) => [group, token]),
  ),
  ...OPERANDS.flatMap(({ words, slots }) =>
    slots.slice(1).flatMap((_, given) =>
      OPTION_TOKENS.map((token) => [...words, ...validOperands(slots.slice(0, given)), token]),
    ),
  ),
];

const SATISFIES = OPERANDS.find(({ words }) => words[1] === "satisfies");
const SATISFIES_ARGS = [...SATISFIES.words, ...validOperands(SATISFIES.slots)];
const WORD_NEAR_MISSES = [
  ["SEMVER", "\u017Femver", " semver", "semver "],
  ["SATISFIES", "satisfie\u017F", " satisfies", "satisfies "],
];
const BLANK_TOKENS = ["", " "];

const COMMAND_WORD_REPLACED = WORD_NEAR_MISSES.flatMap((nearMisses, at) =>
  [...OPTION_TOKENS, ...nearMisses].map((token) => SATISFIES_ARGS.with(at, token)),
);
const NEIGHBOURS_JOINED = Array.from({ length: SATISFIES_ARGS.length - 1 }, (_, at) =>
  SATISFIES_ARGS.toSpliced(at, 2, SATISFIES_ARGS.slice(at, at + 2).join(" ")),
);
const BLANK_INSERTED = BLANK_TOKENS.flatMap((token) =>
  Array.from({ length: SATISFIES_ARGS.length + 1 }, (_, at) => SATISFIES_ARGS.toSpliced(at, 0, token)),
);

const ASCII_PUNCTUATION = [..."!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~"];

const prefixesAndExtensions = (word) => [
  ...Array.from({ length: word.length }, (_, end) => word.slice(0, end)),
  ...["x", ...ASCII_PUNCTUATION].map((character) => word + character),
];

const WORD_PREFIXES_AND_EXTENSIONS = OPERANDS.flatMap(({ words, slots }) => {
  const argv = [...words, ...validOperands(slots)];
  return words.flatMap((word, at) => prefixesAndExtensions(word).map((token) => argv.with(at, token)));
});

const orders = (items) =>
  items.length <= 1
    ? [items]
    : items.flatMap((item, at) => orders(items.toSpliced(at, 1)).map((rest) => [item, ...rest]));

const COMMAND_WORDS_MOVED = OPERANDS.flatMap(({ words, slots }) => {
  const operands = validOperands(slots);
  return [
    ...words.map((_, at) => [...words.toSpliced(at, 1), ...operands]),
    ...orders(words)
      .filter((order) => order.some((word, at) => word !== words[at]))
      .map((order) => [...order, ...operands]),
  ];
});

const HELP_WORDS = ["help", "--help"];

const HELP_SHAPES = [
  ...new Map(
    [
      ...HELP_WORDS.flatMap((help) => prefixesAndExtensions(help).map((token) => [token])),
      ...HELP_WORDS.flatMap((help) => [
        ...[...new Set(OPERANDS.flatMap(({ words }) => words))].map((word) => [help, word]),
        ...OPERANDS.map(({ words }) => [help, ...words]),
        ...OPERANDS.map(({ words, slots }) => [help, ...words, ...validOperands(slots)]),
      ]),
    ].map((args) => [JSON.stringify(args), args]),
  ).values(),
];

const PERTURBING_CHARACTERS = [
  ...Array.from({ length: 0x1f }, (_, code) => String.fromCharCode(code + 1)),
  "\x7F",
  " ",
  ...ASCII_PUNCTUATION,
];

const NON_ASCII_CHARACTERS = [
  0x85, 0xa0, 0xad, 0x1680, 0x2000, 0x200a, 0x200b, 0x200c, 0x200d, 0x2028, 0x2029, 0x202f, 0x205f, 0x2060, 0x3000,
  0xfeff, 0x80, 0x9f, 0xff0e, 0xff10,
].map((code) => String.fromCharCode(code));

const ESCAPE_FORMS = ["%20", "%3E", "%2E", "\\t", "\\n", "\\r", "\\\\", "\\x41", "\\u0041", "&gt;"];

const GRAMMAR_ALPHABET = [..."019xX*.-+ \t|~^=<>"];

const REJECTED_FORMS = [
  "1.5.x",
  "1.x",
  "1.X",
  "1.5.*",
  "1.5",
  "1",
  "~1.5",
  "^1.x",
  ">=1.2.3 || <2.0.0",
  "1.2.3 - 2.0.0",
  ">= 1.2.3",
  "~>1.2.3",
  "v1.5.0",
];

const swapCaseAt = (text, at) =>
  text.slice(0, at) +
  (text[at] === text[at].toUpperCase() ? text[at].toLowerCase() : text[at].toUpperCase()) +
  text.slice(at + 1);

const FORMS = [
  ...new Set([
    ...REJECTED_FORMS,
    ...REJECTED_FORMS.flatMap((form) =>
      [...form].flatMap((character, at) => (/[A-Za-z]/.test(character) ? [swapCaseAt(form, at)] : [])),
    ),
  ]),
];

const surrounded = (operand, additions) =>
  additions.flatMap((addition) => [addition + operand, operand + addition, addition + operand + addition]);

const neighbours = (operand) => [
  ...Array.from({ length: operand.length + 1 }, (_, at) =>
    GRAMMAR_ALPHABET.map((character) => operand.slice(0, at) + character + operand.slice(at)),
  ).flat(),
  ...[...operand].flatMap((_, at) =>
    GRAMMAR_ALPHABET.map((character) => operand.slice(0, at) + character + operand.slice(at + 1)),
  ),
  ...[...operand].map((_, at) => operand.slice(0, at) + operand.slice(at + 1)),
];

const ESCAPES_IN_PLACE = { " ": ["%20", "\\t"], ">": ["%3E"], ".": ["%2E"] };

const escapedInPlace = (operand) =>
  [...operand].flatMap((character, at) =>
    (ESCAPES_IN_PLACE[character] ?? []).map((escape) => operand.slice(0, at) + escape + operand.slice(at + 1)),
  );

const perturbed = (operand) =>
  [
    ...new Set([
      ...surrounded(operand, PERTURBING_CHARACTERS),
      ...FORMS,
      ...surrounded(operand, NON_ASCII_CHARACTERS),
      ...neighbours(operand),
      ...surrounded(operand, ESCAPE_FORMS),
      ...escapedInPlace(operand),
    ]),
  ].filter((variant) => variant !== operand);

const [VERSION, RANGE] = validOperands(SATISFIES.slots);

const BOUNDED_RANGES = [
  ["=1.2.3", ["1.2.2", "1.2.3", "1.2.4"]],
  ["1.2.3", ["1.2.2", "1.2.3", "1.2.4"]],
  [">1.2.3", ["1.2.2", "1.2.3", "1.2.4"]],
  [">=1.2.3", ["1.2.2", "1.2.3", "1.2.4"]],
  ["<1.2.3", ["1.2.2", "1.2.3", "1.2.4"]],
  ["<=1.2.3", ["1.2.2", "1.2.3", "1.2.4"]],
  ["^1.2.3", ["1.2.2", "1.2.3", "1.2.4", "1.9.9", "2.0.0", "2.0.1"]],
  ["^0.2.3", ["0.2.2", "0.2.3", "0.2.4", "0.2.9", "0.3.0", "0.3.1"]],
  ["^0.0.3", ["0.0.2", "0.0.3", "0.0.4"]],
  ["~1.2.3", ["1.2.2", "1.2.3", "1.2.4", "1.2.9", "1.3.0", "1.3.1"]],
  [">=1.2.3-beta.2", ["1.2.3-beta.1", "1.2.3-beta.2", "1.2.3-beta.3"]],
  ["1.2.3+build.5", ["1.2.2", "1.2.3", "1.2.4"]],
  [">=1.2.3 <2.0.0", ["1.2.2", "1.2.3", "1.2.4", "1.9.9", "2.0.0", "2.0.1"]],
];

const SATISFIES_VERBATIM = [
  ...perturbed(VERSION).map((version) => [version, RANGE]),
  ...perturbed(RANGE).map((range) => [VERSION, range]),
  ...BOUNDED_RANGES.flatMap(([range, versions]) => versions.map((version) => [version, range])),
];

function satisfiesOracle(version, range) {
  try {
    return { status: 0, stdout: `${satisfiesSemver(version, range)}\n`, stderr: "" };
  } catch (error) {
    return { status: 1, stdout: "", stderr: `lab: ${error.name}: ${error.message}\n` };
  }
}

const LONG_OPERANDS = ["x".repeat(90_000), "\x01".repeat(130_000)];

const LONG_ERROR_LINES = OPERANDS.flatMap(({ words, slots }) => {
  const valid = validOperands(slots);
  return LONG_OPERANDS.flatMap((operand) =>
    slots
      .map(({ rejects }, slot) => [[...words, ...valid.with(slot, operand)], rejects(operand)])
      .filter(([, { status }]) => status === 1),
  );
});

const USAGE_ERROR = { status: 2, stdout: "", stderr: USAGE };

const READER_GONE = [
  [["help"], { status: 0, stdout: USAGE, stderr: "" }],
  [["--help"], { status: 0, stdout: USAGE, stderr: "" }],
  [["duration", "parse", "90m"], { status: 0, stdout: "5400000\n", stderr: "" }],
  [["duration", "parse"], USAGE_ERROR],
  [["duration", "parse", "-1s"], syntaxError('parseDuration: invalid duration "-1s"')],
  [["duration", "format", "5400000"], { status: 0, stdout: "1h30m\n", stderr: "" }],
  [["duration", "format"], USAGE_ERROR],
  [
    ["duration", "format", "9007199254740992"],
    {
      status: 1,
      stdout: "",
      stderr: "lab: RangeError: formatDuration: 9007199254740992 is not an integer from 0 to Number.MAX_SAFE_INTEGER\n",
    },
  ],
  [["semver", "compare", "1.0.0", "2.0.0"], { status: 0, stdout: "-1\n", stderr: "" }],
  [["semver", "compare", "1.0.0"], USAGE_ERROR],
  [["semver", "compare", "1.0", "2.0.0"], syntaxError('compareSemver: "1.0" is not a valid SemVer 2.0.0 version')],
  [["semver", "satisfies", "1.5.0", ">=1.2.3 <2.0.0"], { status: 0, stdout: "true\n", stderr: "" }],
  [["semver", "satisfies", "1.5.0"], USAGE_ERROR],
  [["semver", "satisfies", "1.0", "^1.0.0"], syntaxError('satisfiesSemver: "1.0" is not a valid SemVer 2.0.0 version')],
];

test('package.json\'s "lab" bin runs ["duration", "parse", "1h30m"] through its shebang from another directory', () => {
  const { bin } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const executable = fileURLToPath(new URL(`../${bin.lab}`, import.meta.url));
  assert.deepEqual(lab(["duration", "parse", "1h30m"], { executable }), {
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

for (const [args, expected] of OPERAND_IN_SLOT) {
  test(`${show(args)} hands the operand on unchanged`, () => {
    assert.deepEqual(lab(args), expected);
  });
}

for (const args of OPTION_MISPLACED) {
  test(`${show(args)} is a usage error with the option-shaped token in place`, () => {
    assert.deepEqual(lab(args), { status: 2, stdout: "", stderr: USAGE });
  });
}

for (const args of [...COMMAND_WORD_REPLACED, ...NEIGHBOURS_JOINED, ...BLANK_INSERTED]) {
  test(`${show(args)} is a usage error with the near miss in place`, () => {
    assert.deepEqual(lab(args), { status: 2, stdout: "", stderr: USAGE });
  });
}

for (const args of WORD_PREFIXES_AND_EXTENSIONS) {
  test(`${show(args)} is a usage error with the command word cut or extended`, () => {
    assert.deepEqual(lab(args), USAGE_ERROR);
  });
}

for (const args of COMMAND_WORDS_MOVED) {
  test(`${show(args)} is a usage error with the command words moved or missing`, () => {
    assert.deepEqual(lab(args), USAGE_ERROR);
  });
}

for (const args of HELP_SHAPES) {
  test(`${show(args)} is a usage error, not a help request`, () => {
    assert.deepEqual(lab(args), USAGE_ERROR);
  });
}

for (const [version, range] of SATISFIES_VERBATIM) {
  const args = ["semver", "satisfies", version, range];
  test(`${show(args)} prints what satisfiesSemver gives for the same strings`, () => {
    assert.deepEqual(lab(args), satisfiesOracle(version, range));
  });
}

for (const [args, expected] of LONG_ERROR_LINES) {
  test(`${show(args)} writes its whole ${expected.stderr.length}-character error line`, () => {
    assert.deepEqual(lab(args), expected);
  });
}

for (const [args, { status, stdout, stderr }] of READER_GONE) {
  test(`${show(args)} exits ${status} when either reader is gone`, async () => {
    assert.deepEqual(await labWithClosedReader(args, "stderr"), { status, stdout });
    assert.deepEqual(await labWithClosedReader(args, "stdout"), { status, stderr });
  });
}

test("a 90000-character error line reaches stderr whole", () => {
  assert.deepEqual(lab(["duration", "parse", "x".repeat(90_000)]), {
    status: 1,
    stdout: "",
    stderr: 'lab: SyntaxError: parseDuration: invalid duration "' + "x".repeat(90_000) + '"\n',
  });
});

test("a usage error exits 2 when either reader is gone", async () => {
  assert.deepEqual(await labWithClosedReader(["foo"], "stdout"), { status: 2, stderr: USAGE });
  assert.deepEqual(await labWithClosedReader(["foo"], "stderr"), { status: 2, stdout: "" });
});

test("a success exits 0 when either reader is gone", async () => {
  assert.deepEqual(await labWithClosedReader(["duration", "parse", "1h"], "stderr"), {
    status: 0,
    stdout: "3600000\n",
  });
  assert.deepEqual(await labWithClosedReader(["duration", "parse", "1h"], "stdout"), { status: 0, stderr: "" });
});

test("a TypeError from the function becomes one stderr line with exit 1", () => {
  assert.deepEqual(lab(["duration", "parse", "1h"], { nodeArgs: withParseDuration("() => real(undefined)") }), {
    status: 1,
    stdout: "",
    stderr: "lab: TypeError: parseDuration: text must be a string\n",
  });
});

test("an error outside TypeError, SyntaxError and RangeError stays uncaught", () => {
  assert.deepEqual(
    lab(["duration", "parse", "1h"], { nodeArgs: withParseDuration('() => { throw new Error("boom"); }') }),
    { status: 3, stdout: "", stderr: "uncaught: Error: boom\n" },
  );
});
