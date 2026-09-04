// BUFFER_CAPACITY_SECONDS marks the architectural boundary of the simulated ring buffer.
// In a real system, frames older than this would be evicted. Here it's never enforced
// because the only replay window (20s) is always well within the cap — no eviction logic needed.
const BUFFER_CAPACITY_SECONDS = 60;
const REPLAY_WINDOW_MS = 20 * 1000;

// Real-time subtraction stands in for a ring buffer: since no continuous frame storage
// exists in this simulation, wall-clock arithmetic is sufficient and correct.
function freezeReplayWindow() {
  const end = Date.now();
  const start = end - REPLAY_WINDOW_MS;
  return { start, end, capturedAt: new Date().toISOString() };
}

module.exports = { freezeReplayWindow };
