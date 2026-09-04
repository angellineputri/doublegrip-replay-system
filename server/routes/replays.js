const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../db');
const { freezeReplayWindow } = require('../bufferService');

const router = express.Router();

let activeReplayLock = false;

// GET /api/system
router.get('/system', (req, res) => {
  res.json({ state: activeReplayLock ? 'replaying' : 'ready' });
});

// POST /api/replays
router.post('/replays', (req, res) => {
  if (activeReplayLock) {
    return res.status(409).json({ error: 'Replay already in progress' });
  }
  activeReplayLock = true;

  const { start, end, capturedAt } = freezeReplayWindow();
  const id = randomUUID();

  db.prepare(`
    INSERT INTO replays (id, clip_start, clip_end, created_at, status)
    VALUES (?, ?, ?, ?, 'created')
  `).run(id, start, end, capturedAt);

  res.status(201).json({ id, clip_start: start, clip_end: end, created_at: capturedAt, status: 'created' });
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
    activeReplayLock = false; // release the lock — back to ready
  }

  res.status(201).json({ id: eventId, event_type, created_at: new Date().toISOString() });
});

// GET /api/replays
router.get('/replays', (req, res) => {
  const rows = db.prepare('SELECT * FROM replays ORDER BY created_at DESC LIMIT 20').all();
  res.json(rows);
});

module.exports = router;