const SEMVER =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-((?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const NUMERIC = /^[0-9]+$/;

export function compareSemver(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    throw new TypeError("compareSemver: a and b must both be strings");
  }
  return comparePrecedence(parse(a), parse(b));
}

function parse(version) {
  const match = SEMVER.exec(version);
  if (match === null) {
    throw new SyntaxError(
      `compareSemver: ${JSON.stringify(version)} is not a valid SemVer 2.0.0 version`,
    );
  }
  const [, major, minor, patch, prerelease] = match;
  return {
    core: [major, minor, patch],
    prerelease: prerelease === undefined ? [] : prerelease.split("."),
  };
}

function comparePrecedence(left, right) {
  for (let i = 0; i < 3; i++) {
    const order = compareUnpaddedIntegers(left.core[i], right.core[i]);
    if (order !== 0) {
      return order;
    }
  }
  const leftPre = left.prerelease;
  const rightPre = right.prerelease;
  if (leftPre.length === 0 && rightPre.length > 0) {
    return 1;
  }
  if (rightPre.length === 0 && leftPre.length > 0) {
    return -1;
  }
  for (let i = 0; i < Math.min(leftPre.length, rightPre.length); i++) {
    const order = compareIdentifiers(leftPre[i], rightPre[i]);
    if (order !== 0) {
      return order;
    }
  }
  return compareValues(leftPre.length, rightPre.length);
}

function compareIdentifiers(x, y) {
  const xIsNumeric = NUMERIC.test(x);
  const yIsNumeric = NUMERIC.test(y);
  if (xIsNumeric && yIsNumeric) {
    return compareUnpaddedIntegers(x, y);
  }
  if (xIsNumeric !== yIsNumeric) {
    return xIsNumeric ? -1 : 1;
  }
  return compareValues(x, y);
}

function compareUnpaddedIntegers(x, y) {
  return compareValues(x.length, y.length) || compareValues(x, y);
}

function compareValues(x, y) {
  if (x < y) {
    return -1;
  }
  if (x > y) {
    return 1;
  }
  return 0;
}

const OPERATOR = /^(?:[<>]=?|[=^~]?)/;
const CORE = /(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)/y;
const PRERELEASE_IDENTIFIER = /(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?![0-9A-Za-z-])/y;
const BUILD_IDENTIFIER = /[0-9A-Za-z-]+/y;

const HOLDS = {
  "=": (order) => order === 0,
  ">": (order) => order > 0,
  ">=": (order) => order >= 0,
  "<": (order) => order < 0,
  "<=": (order) => order <= 0,
};

const MAX_QUOTED_CHARACTERS = 1_000_000;

function quote(text) {
  const quoted = JSON.stringify(text.slice(0, MAX_QUOTED_CHARACTERS));
  return text.length > MAX_QUOTED_CHARACTERS ? `${quoted}... (${text.length} characters)` : quoted;
}

export function satisfiesSemver(version, range) {
  if (typeof version !== "string" || typeof range !== "string") {
    throw new TypeError("satisfiesSemver: version and range must both be strings");
  }
  const subject = parseVersion(version);
  if (subject === null) {
    throw new SyntaxError(`satisfiesSemver: ${quote(version)} is not a valid SemVer 2.0.0 version`);
  }
  for (const comparisons of comparators(range)) {
    if (comparisons === null) {
      throw new SyntaxError(`satisfiesSemver: ${quote(range)} is not a valid range`);
    }
  }
  for (const comparisons of comparators(range)) {
    for (const [operator, bound] of comparisons) {
      if (!HOLDS[operator](compareVersions(subject, bound))) {
        return false;
      }
    }
  }
  return true;
}

function* comparators(range) {
  let start = 0;
  for (;;) {
    const end = range.indexOf(" ", start);
    yield parseComparator(range.slice(start, end === -1 ? range.length : end));
    if (end === -1) {
      return;
    }
    start = end + 1;
  }
}

function parseComparator(text) {
  const [operator] = OPERATOR.exec(text);
  const bound = parseVersion(text.slice(operator.length));
  if (bound === null) {
    return null;
  }
  if (operator === "^" || operator === "~") {
    const limit = operator === "^" ? caretLimit(bound.core) : tildeLimit(bound.core);
    return [
      [">=", bound],
      ["<", { core: limit, prerelease: "" }],
    ];
  }
  return [[operator || "=", bound]];
}

function parseVersion(text) {
  CORE.lastIndex = 0;
  const core = CORE.exec(text);
  if (core === null) {
    return null;
  }
  let end = CORE.lastIndex;
  let prerelease = "";
  if (text[end] === "-") {
    const start = end + 1;
    end = skipIdentifiers(text, start, PRERELEASE_IDENTIFIER);
    if (end === -1) {
      return null;
    }
    prerelease = text.slice(start, end);
  }
  if (text[end] === "+") {
    end = skipIdentifiers(text, end + 1, BUILD_IDENTIFIER);
  }
  return end === text.length ? { core: core.slice(1), prerelease } : null;
}

function skipIdentifiers(text, start, identifier) {
  let end = start;
  for (;;) {
    identifier.lastIndex = end;
    if (!identifier.test(text)) {
      return -1;
    }
    end = identifier.lastIndex;
    if (text[end] !== ".") {
      return end;
    }
    end++;
  }
}

function compareVersions(left, right) {
  for (let i = 0; i < 3; i++) {
    const order = compareUnpaddedIntegers(left.core[i], right.core[i]);
    if (order !== 0) {
      return order;
    }
  }
  return comparePrereleases(left.prerelease, right.prerelease);
}

function comparePrereleases(left, right) {
  if (left === "" || right === "") {
    return compareValues(left === "", right === "");
  }
  let leftStart = 0;
  let rightStart = 0;
  for (;;) {
    const leftEnd = endOfIdentifier(left, leftStart);
    const rightEnd = endOfIdentifier(right, rightStart);
    const order = compareIdentifiers(left.slice(leftStart, leftEnd), right.slice(rightStart, rightEnd));
    if (order !== 0) {
      return order;
    }
    if (leftEnd === left.length || rightEnd === right.length) {
      return compareValues(leftEnd < left.length, rightEnd < right.length);
    }
    leftStart = leftEnd + 1;
    rightStart = rightEnd + 1;
  }
}

function endOfIdentifier(text, start) {
  const dot = text.indexOf(".", start);
  return dot === -1 ? text.length : dot;
}

function caretLimit([major, minor, patch]) {
  if (major !== "0") {
    return [increment(major), "0", "0"];
  }
  if (minor !== "0") {
    return ["0", increment(minor), "0"];
  }
  return ["0", "0", increment(patch)];
}

function tildeLimit([major, minor]) {
  return [major, increment(minor), "0"];
}

function increment(digits) {
  let last = digits.length - 1;
  while (last >= 0 && digits[last] === "9") {
    last--;
  }
  const head =
    last < 0 ? "1" : digits.slice(0, last) + String.fromCharCode(digits.charCodeAt(last) + 1);
  return head + "0".repeat(digits.length - 1 - last);
}
