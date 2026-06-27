import Database from "better-sqlite3";
import { app } from "electron";
import { join } from "path";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = join(app.getPath("userData"), "focus-tracker.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      declared_task TEXT NOT NULL,
      distraction_list TEXT NOT NULL DEFAULT '[]',
      summary_text TEXT
    );

    CREATE TABLE IF NOT EXISTS classification_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      timestamp TEXT NOT NULL,
      signal_type TEXT NOT NULL CHECK(signal_type IN ('native', 'browser', 'vision')),
      raw_signal TEXT NOT NULL,
      classification TEXT NOT NULL CHECK(classification IN ('on_task', 'distraction', 'drift', 'ambiguous')),
      reasoning TEXT
    );

    CREATE TABLE IF NOT EXISTS distraction_intervals (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      max_stage_reached INTEGER NOT NULL DEFAULT 0
    );
  `);

  return db;
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  declared_task: string;
  distraction_list: string;
  summary_text: string | null;
}

export function createSession(
  task: string,
  distractionList: string[],
): { id: string; startedAt: string } {
  const db = getDb();
  const id = newId();
  const startedAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO sessions (id, started_at, declared_task, distraction_list) VALUES (?, ?, ?, ?)",
  ).run(id, startedAt, task, JSON.stringify(distractionList));
  return { id, startedAt };
}

export function endSession(sessionId: string, summary: string): void {
  getDb()
    .prepare("UPDATE sessions SET ended_at = ?, summary_text = ? WHERE id = ?")
    .run(new Date().toISOString(), summary, sessionId);
}

export function getPastSessions(limit: number): Array<{
  id: string;
  startedAt: string;
  endedAt: string;
  task: string;
  summary: string;
}> {
  const rows = getDb()
    .prepare(
      `SELECT id, started_at, ended_at, declared_task, summary_text
       FROM sessions
       WHERE ended_at IS NOT NULL
       ORDER BY started_at DESC
       LIMIT ?`,
    )
    .all(limit) as SessionRow[];

  return rows.map((r) => ({
    id: r.id,
    startedAt: r.started_at,
    endedAt: r.ended_at ?? "",
    task: r.declared_task,
    summary: r.summary_text ?? "",
  }));
}

export function insertClassificationEvent(event: {
  sessionId: string;
  timestamp: string;
  signalType: "native" | "browser" | "vision";
  rawSignal: unknown;
  classification: "on_task" | "distraction" | "drift" | "ambiguous";
  reasoning?: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO classification_events
       (id, session_id, timestamp, signal_type, raw_signal, classification, reasoning)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId(),
      event.sessionId,
      event.timestamp,
      event.signalType,
      JSON.stringify(event.rawSignal),
      event.classification,
      event.reasoning ?? null,
    );
}

export function startDistractionInterval(sessionId: string): string {
  const id = newId();
  getDb()
    .prepare(
      "INSERT INTO distraction_intervals (id, session_id, started_at) VALUES (?, ?, ?)",
    )
    .run(id, sessionId, new Date().toISOString());
  return id;
}

export function endDistractionInterval(
  id: string,
  maxStageReached: number,
): void {
  getDb()
    .prepare(
      "UPDATE distraction_intervals SET ended_at = ?, max_stage_reached = ? WHERE id = ?",
    )
    .run(new Date().toISOString(), maxStageReached, id);
}
