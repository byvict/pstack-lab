#!/usr/bin/env node
import { formatDuration, parseDuration } from "../src/duration.mjs";
import { compareSemver } from "../src/semver.mjs";

const MILLISECONDS = /^(?:0|[1-9][0-9]*)$/;

const verbatim = (name) => ({ name, read: (arg) => arg });
const milliseconds = (name) => ({ name, read: (arg) => (MILLISECONDS.test(arg) ? Number(arg) : undefined) });

const COMMANDS = [
  { words: ["duration", "parse"], params: [verbatim("<texto>")], fn: parseDuration },
  { words: ["duration", "format"], params: [milliseconds("<ms>")], fn: formatDuration },
  { words: ["semver", "compare"], params: [verbatim("<a>"), verbatim("<b>")], fn: compareSemver },
];

const HELP = ["--help", "help"];

const SYNOPSES = [
  ...COMMANDS.map(({ words, params }) => ["lab", ...words, ...params.map(({ name }) => name)].join(" ")),
  ...HELP.map((word) => `lab ${word}`),
];
const USAGE = `usage: ${SYNOPSES.join("\n       ")}\n`;
const USAGE_ERROR = { code: 2, text: USAGE };

function run(args) {
  if (args.length === 1 && HELP.includes(args[0])) {
    return { code: 0, text: USAGE };
  }
  const command = COMMANDS.find(({ words }) => words.every((word, i) => args[i] === word));
  if (command === undefined) {
    return USAGE_ERROR;
  }
  const operands = args.slice(command.words.length);
  if (operands.length !== command.params.length) {
    return USAGE_ERROR;
  }
  const values = command.params.map((param, i) => param.read(operands[i]));
  if (values.includes(undefined)) {
    return USAGE_ERROR;
  }
  try {
    return { code: 0, text: `${command.fn(...values)}\n` };
  } catch (error) {
    if ([TypeError, SyntaxError, RangeError].some((type) => error instanceof type)) {
      return { code: 1, text: `lab: ${error.name}: ${error.message}\n` };
    }
    throw error;
  }
}

const { code, text } = run(process.argv.slice(2));
(code === 0 ? process.stdout : process.stderr).write(text);
// exitCode, not process.exit(): a natural exit drains pending pipe writes.
process.exitCode = code;
