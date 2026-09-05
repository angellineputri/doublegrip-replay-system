import { useRef, useState, useEffect } from 'react';
import { computeReplayWindow } from './utils/replayWindow';
import { useReplaySystem } from './hooks/useReplaySystem';
import ReadyScreen from './components/ReadyScreen';
import ReplayPlayer from './components/ReplayPlayer';
import HistoryPanel from './components/HistoryPanel';
import { getReplays } from './api';

const LIVE_VIDEO_URL = 'http://localhost:4000/media/sample-court.mp4';

export default function App() {
  const liveVideoRef = useRef(null);
  const replayVideoRef = useRef(null);

  const {
    status,
    currentReplay,
    errorMessage,
    triggerReplay,
    resumeLive,
    replayAgain,
    reportSpeedChange,
    dismissError,
  } = useReplaySystem();


  const [started, setStarted] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyReplays, setHistoryReplays] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [debugLive, setDebugLive] = useState(0);
  const [debugReplay, setDebugReplay] = useState(0);
  const [hasLooped, setHasLooped] = useState(false);
  const [replayedAt, setReplayedAt] = useState(null);
  const [resumedAt, setResumedAt] = useState(null);
  const prevLiveTimeRef = useRef(0);

  useEffect(() => {
    function handleKey(e) {
      if (e.code === 'KeyI') setShowDebug((v) => !v);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const t = liveVideoRef.current?.currentTime ?? 0;
      // Detect loop: currentTime jumped significantly backward (loop attribute resets it).
      if (t < prevLiveTimeRef.current - 1) setHasLooped(true);
      prevLiveTimeRef.current = t;
      setDebugLive(t);
      setDebugReplay(replayVideoRef.current?.currentTime ?? 0);
    }, 100);
    return () => clearInterval(id);
  }, []);

  const wrappedTrigger = (...args) => {
    const t = liveVideoRef.current?.currentTime ?? 0;
    const d = liveVideoRef.current?.duration ?? 0;
    setReplayedAt(computeReplayWindow(t, d, hasLooped));
    triggerReplay(...args);
  };

  const debugWindow = computeReplayWindow(
    debugLive,
    liveVideoRef.current?.duration ?? 0,
    hasLooped,
  );

  async function openHistory() {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await getReplays();
      setHistoryReplays(data);
    } finally {
      setHistoryLoading(false);
    }
  }

  function startLive() {
    liveVideoRef.current?.play();
    setStarted(true);
  }

  useEffect(() => {
    if (started) return;
    function handleKey(e) {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        startLive();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [started]);

  // Mute live audio during replay so it doesn't bleed over the clip; unmute on return to live.
  useEffect(() => {
    if (!liveVideoRef.current || !started) return;
    liveVideoRef.current.muted = status !== 'ready';
  }, [status, started]);

  const wrappedResume = (...args) => {
    setResumedAt(liveVideoRef.current?.currentTime ?? 0);
    resumeLive(...args);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      {/* Live video stays mounted and playing the entire time — visibility toggled so
          resuming live lands back at the exact frame instead of restarting from 0. */}
      <video
        ref={liveVideoRef}
        src={LIVE_VIDEO_URL}
        loop
        playsInline
        style={styles.liveVideo}
      />

      {!started && (
        <div style={styles.startOverlay} onClick={startLive}>
          <button style={styles.startBtn}>▶ Tap to Start</button>
        </div>
      )}

      {started && status === 'ready' && (
        <ReadyScreen liveVideoRef={liveVideoRef} triggerReplay={wrappedTrigger} hasLooped={hasLooped} />
      )}

      {(status === 'loading' || status === 'replaying' || status === 'resumed') && (
        <ReplayPlayer
          videoRef={replayVideoRef}
          status={status}
          currentReplay={currentReplay}
          resumeLive={wrappedResume}
          replayAgain={replayAgain}
          reportSpeedChange={reportSpeedChange}
        />
      )}

      {showDebug && (
        <div style={styles.debug}>
          <div><b>state:</b> {status === 'ready' ? 'live' : status} {hasLooped ? '(looped)' : '(first pass)'}</div>
          <div><b>live:</b> {debugLive.toFixed(2)}s</div>
          <div>
            <b>replay window:</b>{' '}
            {debugWindow.isWrapped
              ? `${debugWindow.segment1.start.toFixed(2)}→${debugWindow.segment1.end.toFixed(2)} + ${debugWindow.segment2.start.toFixed(2)}→${debugWindow.segment2.end.toFixed(2)} (wrap)`
              : `${debugWindow.segment1.start.toFixed(2)}s → ${debugWindow.segment1.end.toFixed(2)}s`}
          </div>
          {replayedAt !== null && (
            <div>
              <b>replayed at:</b>{' '}
              {replayedAt.isWrapped
                ? `${replayedAt.segment1.start.toFixed(2)}→${replayedAt.segment1.end.toFixed(2)} + ${replayedAt.segment2.start.toFixed(2)}→${replayedAt.segment2.end.toFixed(2)} (wrap)`
                : `${replayedAt.segment1.start.toFixed(2)}s → ${replayedAt.segment1.end.toFixed(2)}s`}
              {status !== 'ready' && ` (now: ${debugReplay.toFixed(2)}s)`}
            </div>
          )}
          {resumedAt !== null && <div><b>resumed at:</b> {resumedAt.toFixed(2)}s</div>}
        </div>
      )}


      <div style={styles.debugHint}>I — info</div>

      <button style={styles.historyBtn} onClick={historyOpen ? () => setHistoryOpen(false) : openHistory}>
        History{historyReplays !== null ? ` (${historyReplays.length})` : ''}
      </button>

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        replays={historyReplays}
        loading={historyLoading}
      />

      {status === 'error' && (
        <div style={styles.errorOverlay}>
          <p style={styles.errorText}>{errorMessage}</p>
          <button style={styles.errorBtn} onClick={dismissError}>Try again</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  liveVideo: {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%', objectFit: 'cover',
  },
  debug: {
    position: 'absolute', top: 12, right: 12,
    background: 'rgba(0,0,0,0.75)',
    color: '#0f0', fontFamily: 'monospace', fontSize: 12,
    padding: '8px 12px', borderRadius: 6,
    lineHeight: 1.8, zIndex: 9999,
    pointerEvents: 'none',
  },
  debugHint: {
    position: 'fixed', bottom: 64, left: 16,
    color: 'rgba(255,255,255,0.25)', fontSize: 11,
    fontFamily: 'monospace', pointerEvents: 'none',
    zIndex: 9999,
  },
  historyBtn: {
    position: 'fixed', bottom: 24, left: 16,
    zIndex: 7000,
    padding: '8px 16px', borderRadius: 8,
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff', fontWeight: 600, fontSize: 13,
    cursor: 'pointer',
  },
  startOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)',
    zIndex: 9000, cursor: 'pointer',
  },
  startBtn: {
    padding: '18px 48px', borderRadius: 12,
    background: '#fff', color: '#000',
    fontWeight: 700, fontSize: 22, cursor: 'pointer',
    border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  },
  errorOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.85)',
  },
  errorText: { color: '#f87171', fontSize: 18, marginBottom: 16 },
  errorBtn: {
    padding: '10px 28px', borderRadius: 8,
    background: '#fff', color: '#000',
    fontWeight: 700, fontSize: 15, cursor: 'pointer', border: 'none',
  },
};
