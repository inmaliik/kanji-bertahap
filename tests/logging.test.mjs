// Answer log: storage chunks, quota failures, migration, sending queue, CSV.

import { test } from "node:test";
import assert from "node:assert/strict";
import { jsModule, MemoryStorage } from "./helpers.mjs";

const { setStorageBackend } = await import(jsModule("storage.js"));
let instance = 0;

/** A fresh logger module bound to a fresh in-memory storage. */
async function freshLogger(storage = new MemoryStorage()) {
  setStorageBackend(storage);
  const logger = await import(jsModule("logger.js", `instance=${++instance}`));
  return { logger, storage, col: (name) => logger.LOG_COLUMNS.indexOf(name) };
}

test("rows are stored in chunks and read back in order", async () => {
  const { logger, storage, col } = await freshLogger();
  for (let i = 0; i < 450; i++) logger.logAnswer({ responseMs: i });
  const rows = logger.getLogRows();
  assert.equal(rows.length, 450);
  assert.deepEqual(rows.slice(0, 3).map((r) => r[col("responseMs")]), [0, 1, 2]);
  assert.equal(JSON.parse(storage.getItem(logger.LOG_KEY)).chunkCount, 3);
  assert.equal(new Set(rows.map((r) => r[col("rowId")])).size, 450, "every row has a unique rowId");
});

test("a full storage never overwrites a complete chunk", async () => {
  const { logger, storage, col } = await freshLogger();
  for (let i = 0; i < 200; i++) logger.logAnswer({ responseMs: i });
  storage.limit = storage.used() + 5;
  assert.equal(logger.logAnswer({ responseMs: 200 }), false);
  storage.limit = Infinity;
  assert.equal(logger.logAnswer({ responseMs: 201 }), true);
  assert.equal(JSON.parse(storage.getItem(`${logger.LOG_KEY}.chunk.0`)).length, 200);
  assert.equal(logger.getLogRows().length, 202);
  assert.equal(logger.getLogStatus().unsavedRows, 1);
  assert.ok(logger.getLogRows().some((r) => r[col("responseMs")] === 200), "unsaved row kept in memory");
});

test("rows stored with an older column list are migrated once", async () => {
  const storage = new MemoryStorage();
  storage.setItem("kanjiGame.log.v1", JSON.stringify({ version: 1, columns: ["timestamp", "levelId", "answer"], chunkCount: 1, rowCount: 1, sentCount: 0 }));
  storage.setItem("kanjiGame.log.v1.chunk.0", JSON.stringify([["t0", "L01", "a"]]));
  const { logger, col } = await freshLogger(storage);
  logger.logAnswer({ levelId: "L02", answer: "b", hintUsed: true });
  const rows = logger.getLogRows();
  assert.equal(rows[0][col("answer")], "a");
  assert.equal(rows[1][col("hintUsed")], 1);
  assert.deepEqual(JSON.parse(storage.getItem("kanjiGame.log.v1")).columns, logger.LOG_COLUMNS);
});

test("unsent batches are marked sent, and a clear during sending does not mark new rows", async () => {
  const { logger } = await freshLogger();
  for (let i = 0; i < 230; i++) logger.logAnswer({ responseMs: i });
  let sent = 0;
  for (let batch = logger.getUnsentBatch(50); batch.rows.length; batch = logger.getUnsentBatch(50)) {
    logger.markSent(batch);
    sent += batch.rows.length;
  }
  assert.equal(sent, 230);
  assert.equal(logger.getLogStatus().unsentRows, 0);

  logger.logAnswer({ responseMs: 1 });
  const stale = logger.getUnsentBatch(50);
  logger.clearLog();
  logger.logAnswer({ responseMs: 2 });
  logger.markSent(stale);
  assert.equal(logger.getLogStatus().unsentRows, 1);
});

test("CSV has a BOM, escapes quotes, and neutralizes formulas", async () => {
  const { logger } = await freshLogger();
  logger.logAnswer({ stage: "production", answer: '=HYPERLINK("x"), "ok"' });
  const csv = logger.logToCsv();
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes(`"'=HYPERLINK(""x""), ""ok"""`));
});
