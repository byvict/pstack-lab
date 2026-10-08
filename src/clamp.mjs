export function clamp(value, min, max) {
  if (Number.isNaN(value) || Number.isNaN(min) || Number.isNaN(max)) {
    throw new RangeError("clamp: value, min and max must not be NaN");
  }
  if (typeof min === "number" && typeof max === "number" && min > max) {
    throw new RangeError(`clamp: min (${min}) must not exceed max (${max})`);
  }
  if (
    typeof value !== "number" ||
    typeof min !== "number" ||
    typeof max !== "number"
  ) {
    throw new TypeError("clamp: value, min and max must all be numbers");
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
