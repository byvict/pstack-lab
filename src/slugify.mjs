export function slugify(text) {
  if (typeof text !== "string") {
    throw new TypeError("slugify expects a string");
  }
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/g, "");
}
