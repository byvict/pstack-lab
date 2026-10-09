#!/usr/bin/env node
import { formatDuration, parseDuration } from "../src/duration.mjs";
import { compareSemver } from "../src/semver.mjs";

const MILLISECONDS = /^(?:0|[1-9][0-9]*)$/;

const COMMANDS = [
  { words: ["duration", "parse"], operands: ["<texto>"], run: ([text]) => parseDuration(text) },
  {
    words: ["duration", "format"],
    operands: ["<ms>"],
    accepts: ([ms]) => MILLISECONDS.test(ms),
    run: ([ms]) => formatDuration(Number(ms)),
  },
  { words: ["semver", "compare"], operands: ["<a>", "<b>"], run: ([a, b]) => compareSemver(a, b) },
];

const HELP = ["--help", "help"];

const USAGE = [...COMMANDS.map(({ words, operands }) => [...words, ...operands].join(" ")), ...HELP]
  .map((line, i) => `${i === 0 ? "usage: " : " ".repeat("usage: ".length)}lab ${line}\n`)
  .join("");

const USAGE_ERROR = { code: 2, stderr: USAGE };

function run(argv) {
  if (argv.length === 1 && HELP.includes(argv[0])) {
    return { code: 0, stdout: USAGE };
  }
  const command = COMMANDS.find(({ words }) => words.every((word, i) => argv[i] === word));
  if (command === undefined) {
    return USAGE_ERROR;
  }
  const args = argv.slice(command.words.length);
  if (args.length !== command.operands.length || command.accepts?.(args) === false) {
    return USAGE_ERROR;
  }
  try {
    return { code: 0, stdout: `${command.run(args)}\n` };
  } catch (error) {
    if ([TypeError, SyntaxError, RangeError].some((type) => error instanceof type)) {
      return { code: 1, stderr: `lab: ${error.name}: ${error.message}\n` };
    }
    throw error;
  }
}

const { code, stdout = "", stderr = "" } = run(process.argv.slice(2));
process.stdout.write(stdout);
process.stderr.write(stderr);
// exitCode, not process.exit(): a natural exit drains pending pipe writes.
process.exitCode = code;
