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
