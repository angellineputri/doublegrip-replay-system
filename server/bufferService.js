// Models a continuously-running 60s buffer as a virtual clock.
// "Now" = time elapsed since server start, modulo the sample clip's duration.
// A replay request captures [now-20, now] as the clip's start/end timestamps.

const SERVER_START = Date.now();
const BUFFER_WINDOW_SEC = 60;
const REPLAY_WINDOW_SEC = 20;

function getCurrentBufferTime() {
  return Math.floor((Date.now() - SERVER_START) / 1000) % BUFFER_WINDOW_SEC;
}

function freezeReplayWindow() {
  const now = getCurrentBufferTime();
  const start = Math.max(0, now - REPLAY_WINDOW_SEC);
  return { start, end: now, capturedAt: new Date().toISOString() };
}

module.exports = { getCurrentBufferTime, freezeReplayWindow };