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

export function parseDuration(text) {
  if (typeof text !== "string") {
    throw new TypeError("parseDuration: text must be a string");
  }
  const match = DURATION.exec(text);
  if (match === null) {
    throw new SyntaxError(`parseDuration: invalid duration ${JSON.stringify(text)}`);
  }
  let total = 0n;
  for (const [unit, factor] of UNITS) {
    const digits = match.groups[unit];
    if (digits !== undefined) {
      total += BigInt(digits) * factor;
    }
  }
  if (total > MAX_SAFE) {
    throw new RangeError(
      `parseDuration: ${JSON.stringify(text)} exceeds Number.MAX_SAFE_INTEGER milliseconds`,
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
