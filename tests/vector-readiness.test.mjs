import assert from "node:assert/strict";
import test from "node:test";
import { vectorReadiness } from "../src/features/vectors/vector-readiness.ts";

test("quiz success alone never claims the chapter is ready", () => {
  const state = vectorReadiness({ axis: false, shape: false, concepts: true }, "ko");
  assert.equal(state.ready, false);
  assert.equal(state.missing.length, 2);
  assert.match(state.message, /축 조립.*shape 탐정/);
});

test("all eight combinations agree, including invalidated evidence", () => {
  for (let bits = 0; bits < 8; bits++) {
    const state = vectorReadiness({ axis: Boolean(bits & 1), shape: Boolean(bits & 2), concepts: Boolean(bits & 4) }, "en");
    assert.equal(state.ready, bits === 7);
    assert.equal(state.missing.length === 0, state.ready);
  }
});
