'use strict';

const { randomUUID } = require('crypto');
const db = require('./db');

function seedIfEmpty() {
  if (process.env.NODE_ENV === 'test') return;

  const { count } = db.prepare('SELECT COUNT(*) as count FROM replays').get();
  if (count > 0) return;

  const now = Date.now();
  const WINDOW = 20000;

  const rows = [
    {
      id: randomUUID(),
      clip_start: now - 18 * 60 * 1000,
      clip_end: now - 18 * 60 * 1000 + WINDOW,
      created_at: new Date(now - 18 * 60 * 1000).toISOString(),
      replay_count: 3,
      playback_speed: 0.5,
      status: 'resumed',
    },
    {
      id: randomUUID(),
      clip_start: now - 10 * 60 * 1000,
      clip_end: now - 10 * 60 * 1000 + WINDOW,
      created_at: new Date(now - 10 * 60 * 1000).toISOString(),
      replay_count: 1,
      playback_speed: 1.0,
      status: 'resumed',
    },
    {
      id: randomUUID(),
      clip_start: now - 3 * 60 * 1000,
      clip_end: now - 3 * 60 * 1000 + WINDOW,
      created_at: new Date(now - 3 * 60 * 1000).toISOString(),
      replay_count: 0,
      playback_speed: 1.0,
      status: 'created',
    },
  ];

  const insert = db.prepare(`
    INSERT INTO replays (id, clip_start, clip_end, created_at, replay_count, playback_speed, status)
    VALUES (@id, @clip_start, @clip_end, @created_at, @replay_count, @playback_speed, @status)
  `);

  db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  })(rows);
}

module.exports = { seedIfEmpty };
