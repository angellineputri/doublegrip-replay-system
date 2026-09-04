// Tests must run in the order defined below — activeReplayLock in replays.js is a
// module-level singleton, so each step depends on the state left by the previous one.
// node:test runs sequentially by default; do not add --concurrency or parallel flags.

'use strict';

process.env.NODE_ENV = 'test'; // must be set before any require() loads db.js

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');
const app = require('../index');

const request = supertest(app);
let createdId;

test('POST /api/replays — creates a replay and engages the lock', async () => {
  const res = await request.post('/api/replays').expect(201);
  assert.ok(res.body.id, 'response has id');
  assert.ok(typeof res.body.clip_start === 'number', 'clip_start is a number');
  assert.ok(typeof res.body.clip_end === 'number', 'clip_end is a number');
  assert.ok(res.body.clip_end - res.body.clip_start <= 20, 'clip window is at most 20 seconds');
  createdId = res.body.id;
});

test('GET /api/system — reports replaying immediately after lock engages', async () => {
  const res = await request.get('/api/system').expect(200);
  assert.equal(res.body.state, 'replaying');
});

test('POST /api/replays — returns 409 while lock is held', async () => {
  await request.post('/api/replays').expect(409);
});

test('POST /api/replays/:id/events resume — releases the lock', async () => {
  const res = await request
    .post(`/api/replays/${createdId}/events`)
    .send({ event_type: 'resume' })
    .expect(201);
  assert.equal(res.body.event_type, 'resume');
});

test('GET /api/system — reports ready after resume', async () => {
  const res = await request.get('/api/system').expect(200);
  assert.equal(res.body.state, 'ready');
});

test('POST /api/replays — succeeds again after lock is released', async () => {
  const res = await request.post('/api/replays').expect(201);
  assert.ok(res.body.id, 'new replay created after lock release');
  assert.notEqual(res.body.id, createdId, 'new replay has a fresh id');
});
