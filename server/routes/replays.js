const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');
const { freezeReplayWindow } = require('../bufferService');

const router = express.Router();

let activeReplayLock = false;
let activeReplayId = null;
let lockTimer = null;

function releaseLock() {
  activeReplayLock = false;
  activeReplayId = null;
  clearTimeout(lockTimer);
  lockTimer = null;
}

// GET /api/system
router.get('/system', (req, res) => {
  res.json({
    state: activeReplayLock ? 'replaying' : 'ready',
    activeReplayId,
  });
});

// POST /api/replays
router.post('/replays', (req, res) => {
  if (activeReplayLock) {
    return res.status(409).json({ error: 'Replay already in progress', activeReplayId });
  }
  activeReplayLock = true;

  const { start, end, capturedAt } = freezeReplayWindow();
  const id = randomUUID();
  activeReplayId = id;

  // Safety net: auto-release lock after 60s in case the client never sends resume.
  // Marks the row abandoned — distinct from resumed, which requires an explicit user action.
  clearTimeout(lockTimer);
  lockTimer = setTimeout(() => {
    if (activeReplayId) {
      db.prepare("UPDATE replays SET status = 'abandoned' WHERE id = ?").run(activeReplayId);
    }
    releaseLock();
  }, 60 * 1000);

  const { video_duration, video_start, video_end } = req.body ?? {};

  db.prepare(`
    INSERT INTO replays (id, clip_start, clip_end, created_at, status, replay_count, video_duration, video_start, video_end)
    VALUES (?, ?, ?, ?, 'created', 1, ?, ?, ?)
  `).run(id, start, end, capturedAt, video_duration ?? null, video_start ?? null, video_end ?? null);

  res.status(201).json({ id, clip_start: start, clip_end: end, created_at: capturedAt, status: 'created', replay_count: 1, video_duration: video_duration ?? null, video_start: video_start ?? null, video_end: video_end ?? null });
});

// GET /api/replays/:id
router.get('/replays/:id', (req, res) => {
  const replay = db.prepare('SELECT * FROM replays WHERE id = ?').get(req.params.id);
  if (!replay) return res.status(404).json({ error: 'Not found' });
  res.json({ ...replay, video_url: '/media/sample-court.mp4' });
});

// POST /api/replays/:id/events
router.post('/replays/:id/events', (req, res) => {
  const { event_type, payload } = req.body;
  const replay = db.prepare('SELECT * FROM replays WHERE id = ?').get(req.params.id);
  if (!replay) return res.status(404).json({ error: 'Not found' });

  const eventId = randomUUID();
  db.prepare(`
    INSERT INTO replay_events (id, replay_id, event_type, payload, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(eventId, req.params.id, event_type, JSON.stringify(payload || {}), new Date().toISOString());

  if (event_type === 'replay_again') {
    db.prepare('UPDATE replays SET replay_count = replay_count + 1 WHERE id = ?').run(req.params.id);
  }
  if (event_type === 'speed_change') {
    db.prepare('UPDATE replays SET playback_speed = ? WHERE id = ?').run(payload.speed, req.params.id);
  }
  if (event_type === 'resume') {
    db.prepare('UPDATE replays SET status = ? WHERE id = ?').run('resumed', req.params.id);
    releaseLock();
  }
  if (event_type === 'abandon') {
    db.prepare('UPDATE replays SET status = ? WHERE id = ?').run('abandoned', req.params.id);
    releaseLock();
  }

  res.status(201).json({ id: eventId, event_type, created_at: new Date().toISOString() });
});

// GET /api/replays
router.get('/replays', (req, res) => {
  const rows = db.prepare('SELECT * FROM replays ORDER BY created_at DESC LIMIT 20').all();
  res.json(rows);
});

module.exports = router;