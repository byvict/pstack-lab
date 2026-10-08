const ASCII_SPELLINGS = new Map([
  ["ß", "ss"],
  ["æ", "ae"],
  ["œ", "oe"],
  ["ø", "o"],
  ["ł", "l"],
  ["đ", "d"],
  ["ð", "d"],
  ["þ", "th"],
  ["ħ", "h"],
  ["ı", "i"],
  ["ĸ", "k"],
  ["ŋ", "ng"],
  ["ŧ", "t"],
]);

export function slugify(text) {
  if (typeof text !== "string") {
    throw new TypeError("slugify expects a string");
  }
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]/gu, (char) => ASCII_SPELLINGS.get(char) ?? char)
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/g, "");
}
