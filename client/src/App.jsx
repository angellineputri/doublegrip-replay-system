import { useRef, useState, useEffect } from 'react';
import { useReplaySystem } from './hooks/useReplaySystem';
import ReadyScreen from './components/ReadyScreen';
import ReplayPlayer from './components/ReplayPlayer';

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


  const [debugLive, setDebugLive] = useState(0);
  const [debugReplay, setDebugReplay] = useState(0);
  const [replayedAt, setReplayedAt] = useState(null);
  const [resumedAt, setResumedAt] = useState(null);

  useEffect(() => {
    const id = setInterval(() => {
      setDebugLive(liveVideoRef.current?.currentTime ?? 0);
      setDebugReplay(replayVideoRef.current?.currentTime ?? 0);
    }, 100);
    return () => clearInterval(id);
  }, []);

  const replayDebugStart = Math.max(0, debugLive - 20);

  const wrappedTrigger = (...args) => {
    const end = liveVideoRef.current?.currentTime ?? 0;
    setReplayedAt({ start: Math.max(0, end - 20), end });
    triggerReplay(...args);
  };

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
        autoPlay
        loop
        muted
        playsInline
        style={styles.liveVideo}
      />

      {status === 'ready' && (
        <ReadyScreen liveVideoRef={liveVideoRef} triggerReplay={wrappedTrigger} />
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

      <div style={styles.debug}>
        <div><b>state:</b> {status === 'ready' ? 'live' : status}</div>
        <div><b>live:</b> {debugLive.toFixed(2)}s</div>
        <div><b>replay window:</b> {replayDebugStart.toFixed(2)}s → {debugLive.toFixed(2)}s</div>
        {replayedAt !== null && (
          <div>
            <b>replayed at:</b> {replayedAt.start.toFixed(2)}s → {replayedAt.end.toFixed(2)}s
            {status !== 'ready' && ` (now: ${debugReplay.toFixed(2)}s)`}
          </div>
        )}
        {resumedAt !== null && <div><b>resumed at:</b> {resumedAt.toFixed(2)}s</div>}
      </div>

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
