const UNITS = [
  ["d", 86400000n],
  ["h", 3600000n],
  ["m", 60000n],
  ["s", 1000n],
  ["ms", 1n],
];

const DURATION = new RegExp(
  `^(?!$)${UNITS.map(([unit]) => `(?:(?<${unit}>0|[1-9][0-9]*)${unit})?`).join("")}$`,
);

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const MAX_SAFE_DIGITS = String(Number.MAX_SAFE_INTEGER).length;
const MAX_QUOTED_CHARACTERS = 1_000_000;

function quote(text) {
  const quoted = JSON.stringify(text.slice(0, MAX_QUOTED_CHARACTERS));
  return text.length > MAX_QUOTED_CHARACTERS ? `${quoted}... (${text.length} characters)` : quoted;
}

export function parseDuration(text) {
  if (typeof text !== "string") {
    throw new TypeError("parseDuration: text must be a string");
  }
  const match = DURATION.exec(text);
  if (match === null) {
    throw new SyntaxError(`parseDuration: invalid duration ${quote(text)}`);
  }
  let total = 0n;
  for (const [unit, factor] of UNITS) {
    const digits = match.groups[unit];
    if (digits !== undefined) {
      total += digits.length > MAX_SAFE_DIGITS ? MAX_SAFE + 1n : BigInt(digits) * factor;
    }
  }
  if (total > MAX_SAFE) {
    throw new RangeError(
      `parseDuration: ${quote(text)} exceeds Number.MAX_SAFE_INTEGER milliseconds`,
    );
  }
  return Number(total);
}

export function formatDuration(ms) {
  if (typeof ms !== "number") {
    throw new TypeError("formatDuration: ms must be a number");
  }
  if (!Number.isSafeInteger(ms) || ms < 0) {
    throw new RangeError(
      `formatDuration: ${ms} is not an integer from 0 to Number.MAX_SAFE_INTEGER`,
    );
  }
  let rest = BigInt(ms);
  let text = "";
  for (const [unit, factor] of UNITS) {
    const count = rest / factor;
    rest %= factor;
    if (count > 0n) {
      text += `${count}${unit}`;
    }
  }
  return text === "" ? "0ms" : text;
}
