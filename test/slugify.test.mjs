import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/slugify.mjs";

function assertSlugs(cases) {
  for (const [input, expected] of cases) {
    assert.equal(slugify(input), expected, `slugify(${JSON.stringify(input)})`);
  }
}

test("turns the item example into ola-mundo", () => {
  assert.equal(slugify("Olá, Mundo!"), "ola-mundo");
});

test("lowercases ASCII letters", () => {
  assertSlugs([
    ["HELLO", "hello"],
    ["MiXeD CaSe", "mixed-case"],
  ]);
});

test("removes diacritics", () => {
  assertSlugs([
    ["Crème Brûlée", "creme-brulee"],
    ["São João", "sao-joao"],
    ["ÀÉÎÕÜÇÑ", "aeioucn"],
  ]);
});

test("replaces each run of characters outside a-z and 0-9 with one hyphen", () => {
  assertSlugs([
    ["a  --  b__c...d", "a-b-c-d"],
    ["foo & bar / baz", "foo-bar-baz"],
    ["Release 2.0.1", "release-2-0-1"],
  ]);
});

test("trims hyphens from both ends", () => {
  assertSlugs([
    ["  --Hello--  ", "hello"],
    ["!!!wow!!!", "wow"],
    ["-already-slugged-", "already-slugged"],
  ]);
});

test("returns a slug unchanged", () => {
  assertSlugs([
    ["ola-mundo", "ola-mundo"],
    ["abc-123", "abc-123"],
  ]);
});

test("throws a TypeError for input that is not a string", () => {
  for (const value of [undefined, null, 42, {}, ["a", "b"], new String("text")]) {
    assert.throws(() => slugify(value), TypeError);
  }
});

test("returns an empty string when no character survives", () => {
  assertSlugs([
    ["", ""],
    ["!!!", ""],
    ["   ", ""],
    ["東京", ""],
    ["Москва", ""],
  ]);
});

test("spells Latin letters that do not decompose in ASCII", () => {
  assertSlugs([
    ["Straße", "strasse"],
    ["GROẞ", "gross"],
    ["Ærø", "aero"],
    ["œuvre", "oeuvre"],
    ["Łódź", "lodz"],
    ["Đà Nẵng", "da-nang"],
    ["Þór", "thor"],
    ["Guðrún", "gudrun"],
    ["Ħamrun", "hamrun"],
    ["Diyarbakır", "diyarbakir"],
    ["ĸ ŋ ŧ", "k-ng-t"],
  ]);
});

test("turns every letter of Latin-1 Supplement and Latin Extended-A into ASCII letters", () => {
  for (let code = 0xc0; code <= 0x17f; code++) {
    const letter = String.fromCodePoint(code);
    if (/\p{L}/u.test(letter)) {
      assert.match(slugify(letter), /^[a-z]+$/, `U+${code.toString(16).toUpperCase()} ${letter}`);
    }
  }
});

test("treats characters with no ASCII spelling as separators", () => {
  assertSlugs([
    ["aəb", "a-b"],
    ["a東京b", "a-b"],
    ["a😀b", "a-b"],
  ]);
});

test("expands compatibility characters", () => {
  assertSlugs([
    ["ﬁle", "file"],
    ["Ｈｅｌｌｏ", "hello"],
    ["e²", "e2"],
    ["™", "tm"],
    ["𝐇𝐞𝐥𝐥𝐨", "hello"],
  ]);
});

test("keeps a word whole when a combining mark sits inside it", () => {
  assertSlugs([
    ["İstanbul", "istanbul"],
    ["Café", "cafe"],
    ["e᪰x", "ex"],
  ]);
});
