const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : path.join(__dirname, 'replays.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS replays (
    id TEXT PRIMARY KEY,
    clip_start INTEGER NOT NULL,
    clip_end INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    replay_count INTEGER NOT NULL DEFAULT 0,
    playback_speed REAL NOT NULL DEFAULT 1.0,
    status TEXT NOT NULL DEFAULT 'created'
  );

  CREATE TABLE IF NOT EXISTS replay_events (
    id TEXT PRIMARY KEY,
    replay_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (replay_id) REFERENCES replays(id)
  );
`);

module.exports = db;