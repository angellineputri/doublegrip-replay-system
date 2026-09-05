# Doublegrip Replay System

A courtside instant-replay system. One button captures the last 20 seconds of a looping live feed; the clip plays back with scrub, slow-motion, and replay-again controls before returning to live.

---

## Demo

[Watch the 3-minute walkthrough] https://drive.google.com/file/d/1SQ1YzpO4m18mVc42WLD-QkiUxOcLD_33/view?usp=sharing

## Prerequisites

- Node.js 18+

## Quick start

```bash
npm run setup  # one-time: installs all dependencies
npm run dev    # starts both services
```

Client: http://localhost:3000  
API: http://localhost:4000

Press **Space** or **Enter** to trigger a replay (equivalent to clicking the Replay button).  
Press **I** to toggle the info overlay (live buffer position, replay window, segment info).

*A sample 30-second clip is included at `server/media/sample-court.mp4` to simulate the live court feed*

## Running tests

```bash
# Backend integration tests (6 tests, node:test + supertest)
npm test --prefix server

# Frontend unit tests (computeReplayWindow, vitest)
npm test --prefix client
```

---

## Design Q&A

**1. Where is the rolling-buffer boundary represented?**

The buffer is not a real in-memory structure, it is modeled conceptually. In `bufferService.js`, `BUFFER_CAPACITY_SECONDS = 60` is defined as a documented architectural limit. The actual replay window is computed using `computeReplayWindow()` on the client side, which subtracts 20 seconds from the current live position. Because 20 is less than 60, every request can always be satisfied and no eviction logic is needed. The demo video also loops to simulate a continuous feed, so `computeReplayWindow` checks if the requested window crosses the loop point. If it does, it stitches two segments together (`segment1`/`segment2`) so the replay still correctly shows "the last 20 seconds," similar to how a real ring buffer wraps around without shifting data.

**2. How do you prevent duplicate or conflicting replay requests?**

A module-level lock (`activeReplayLock`, `activeReplayId`) inside the Express route blocks a second `POST /api/replays` with a 409 while a replay is still running. The lock can be released in two ways: either the client sends a `resume` event, or a server-side 60-second timer auto-releases it if the client never resumes (for example if there is a crash or dropped connection). In that timer case, the row is marked `abandoned` in the database, which is different from a normal `resumed` result. When the server restarts, any rows still marked `created` from an earlier ungraceful shutdown are reconciled to `abandoned` too, so the lock state and the saved history always stay consistent.

**3. What changes for a real RTSP camera and physical button?**

The video source changes from a static local file to an RTSP stream decoded on the server (for example with ffmpeg), which builds a real ring buffer of frames or segments instead of the current timestamp-subtraction simulation. The physical button becomes a hardware input (GPIO, BLE, or a dedicated courtside controller) that sends the same `POST /api/replays` request the UI button already sends, so the API contract does not need to change, only what triggers it. The 20s/60s window logic stays the same; only the source of "what's in the buffer" changes from computed-on-demand to actual stored frames.

**4. What would you monitor on the first installed court?**

Abandoned rate, since a spike would mean the resume flow is failing, timing out too aggressively, or confusing to use. Replay latency (target under 2s to visible playback) as a direct check on FR5. Lock contention (how often 409 happens), as a sign of either double-presses or a UI bug causing repeated submissions. And overall error rate on `/api/replays`, since a courtside device failing silently would be worse than one that is visibly down.

**5. What is the first thing you would redesign for 100 courts?**

The module-level in-process lock and the SQLite file, because both assume a single instance, which breaks as soon as multiple courts or multiple server instances need independent lock state and independent history. This would move to having a per-court identifier in every request and row, a shared datastore (Postgres, or Redis specifically for the lock since it's short-lived), and centralized log/metric aggregation instead of per-instance console output.

---

## Architecture

The system uses a plain two-service architecture: a Vite/React frontend and an Express backend, run together with a root `concurrently` script. The frontend never talks to SQLite directly, all state changes go through the 5-route API surface (`/api/system`, `/api/replays`, `/api/replays/:id`, `/api/replays/:id/events`, `/api/replays`). The backend owns all persistence, locking, and the `abandon`/`resume` lifecycle. The frontend owns all video playback and scrubbing logic, including the loop-boundary stitching math (`computeReplayWindow`).

## Key tradeoffs

- **Buffer is simulated** using timestamp subtraction, not a literal ring buffer. This gives correct behavior with zero ongoing computation, since no real video frames are being captured continuously.
- **Replay controls** (back-5, replay-again) work on the clip that is already fetched, not a new buffer query, which matches how the brief describes these as playback controls, not new API calls.
- **The clip does not auto-resume to live when it finishes.** It holds on the last frame with a clear decision-point banner, since the point of the product is to let players deliberate, not to rush them back to play.
- **The lock is a single in-process variable**, not a distributed lock. This is correct for one court or one server instance, and is explicitly named as the first thing to redesign for scale (which is what Q5 mentioned).
- **`abandoned` vs `resumed` vs `created`** distinguishes a timed-out session from a normal one, instead of collapsing them into one ambiguous status.
- **`video_start`/`video_end` (video-relative seconds) vs `clip_start`/`clip_end` (wall-clock ms)** are kept as two separate fields because they answer different questions: one drives the server-side buffer logic, the other is what the history panel shows to a human.
- **Structured JSON logging** is emitted at every meaningful server event, including replay created, 409 rejected, lock auto-released, resume received, server boot, and startup reconciliation, using a single `log(level, message, meta)` helper. Logs are machine-parseable without a logging library dependency, matching what a real operator would need for the monitoring described in Q4.

## Known limitations

Replays triggered in the first 20 seconds after a fresh server start (before the demo video has looped once) will show a clip shorter than 20s, since there is genuinely no earlier footage yet. This mirrors how a real camera would behave on startup, rather than being a bug.

## With more time

- Replace the simulated buffer with a real ring buffer of video segments, backed by an actual RTSP or webcam ingest pipeline instead of a static looping file. This removes the loop-boundary stitching logic entirely, since a true continuous feed has no artificial wrap point to work around.
- Move the replay lock and history storage out of process (Redis for the lock, Postgres for history), so the system can support multiple courts or multiple server instances without shared in-memory state, as noted in Q5.
- Add an end-to-end test that drives the actual browser UI through the full replay lifecycle, complementing the existing backend integration tests and the `computeReplayWindow` unit tests.
- Broaden error-state coverage beyond the network/409 cases handled now. For example a corrupt or missing media file, a resume event failing to persist, or the client losing connectivity mid-replay, each with its own recovery path instead of falling into one generic error banner.
- Add authentication and access control for the history endpoint, since a real installed system would need to restrict who can view or export replay history. This is explicitly out of scope for this prototype but would matter in production.
