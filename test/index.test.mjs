import { test } from "node:test";
import assert from "node:assert/strict";
import { hello } from "../src/index.mjs";

test("hello returns lab", () => {
  assert.equal(hello(), "lab");
});
