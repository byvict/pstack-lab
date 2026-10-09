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

const HOLDS = {
  "=": (order) => order === 0,
  ">": (order) => order > 0,
  ">=": (order) => order >= 0,
  "<": (order) => order < 0,
  "<=": (order) => order <= 0,
};

export function satisfiesSemver(version, range) {
  if (typeof version !== "string" || typeof range !== "string") {
    throw new TypeError("satisfiesSemver: version and range must both be strings");
  }
  if (!SEMVER.test(version)) {
    throw new SyntaxError(
      `satisfiesSemver: ${JSON.stringify(version)} is not a valid SemVer 2.0.0 version`,
    );
  }
  const subject = parse(version);
  return parseRange(range).every(([operator, bound]) =>
    HOLDS[operator](comparePrecedence(subject, bound)),
  );
}

function parseRange(range) {
  return range.split(" ").flatMap((comparator) => {
    const [operator] = OPERATOR.exec(comparator);
    const operand = comparator.slice(operator.length);
    if (!SEMVER.test(operand)) {
      throw new SyntaxError(`satisfiesSemver: ${JSON.stringify(range)} is not a valid range`);
    }
    const bound = parse(operand);
    if (operator === "^" || operator === "~") {
      const limit = operator === "^" ? caretLimit(bound.core) : tildeLimit(bound.core);
      return [
        [">=", bound],
        ["<", { core: limit, prerelease: [] }],
      ];
    }
    return [[operator || "=", bound]];
  });
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
