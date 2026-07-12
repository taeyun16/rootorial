import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateUpdateFeedbackInput } from "../src/features/admin/admin.ts";

test("normalizes administrator feedback review input", () => {
  assert.deepEqual(validateUpdateFeedbackInput({
    id: "123e4567-e89b-42d3-a456-426614174000",
    status: "resolved",
    adminNote: "  문구를 수정함  ",
  }), {
    id: "123e4567-e89b-42d3-a456-426614174000",
    status: "resolved",
    adminNote: "문구를 수정함",
  });
});

test("rejects invalid feedback review state and oversized notes", () => {
  assert.throws(() => validateUpdateFeedbackInput({
    id: "123e4567-e89b-42d3-a456-426614174000",
    status: "deleted",
    adminNote: "",
  }));
  assert.throws(() => validateUpdateFeedbackInput({
    id: "123e4567-e89b-42d3-a456-426614174000",
    status: "reviewing",
    adminNote: "x".repeat(1001),
  }));
});

test("feedback migration backfills existing rows as pending", async () => {
  const migration = await readFile(new URL("../drizzle/0003_nice_silver_samurai.sql", import.meta.url), "utf8");
  assert.match(migration, /SELECT "id"[\s\S]+?'pending', NULL, NULL, NULL, "created_at"/);
  assert.doesNotMatch(migration, /SELECT "id"[\s\S]+?"status", "admin_note"/);
});
