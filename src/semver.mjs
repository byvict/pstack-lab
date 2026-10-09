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
