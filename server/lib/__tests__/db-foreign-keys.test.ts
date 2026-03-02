import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../../../src/lib/db.ts";

test("SQLite rejects FK violations for brief_cards.brief_id", () => {
  const db = createDatabase(":memory:", { logger: { log: () => {} } });

  assert.throws(
    () => {
      db.prepare(
        `INSERT INTO brief_cards (id, brief_id, type, title, summary, why_it_matters, suggested_action, confidence)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        "card-1",
        "missing-brief",
        "THREAT",
        "Test title",
        JSON.stringify(["item"]),
        "Test why",
        "Test action",
        "HIGH",
      );
    },
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /FOREIGN KEY constraint failed/);
      return true;
    },
  );

  db.close();
});
