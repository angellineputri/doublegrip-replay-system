import { useEffect, useRef, useState } from 'react';

const VIDEO_URL = 'http://localhost:4000/media/sample-court.mp4';

export default function ReplayPlayer({
  videoRef,
  status,
  currentReplay,
  resumeLive,
  replayAgain,
  reportSpeedChange,
}) {
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);

  // Fires on first mount (new replay) and whenever replayAgain() refreshes the reference.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentReplay) return;
    video.currentTime = currentReplay.videoStart ?? 0;
    video.play().catch(() => {});
    setPaused(false);
    clearInterval(countdownRef.current);
    setCountdown(null);
  }, [currentReplay]);

  function togglePlayPause() {
    const video = videoRef.current;
    if (!video) return;
    cancelCountdown();
    if (video.paused) {
      video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  }

  function seekBack() {
    const video = videoRef.current;
    if (!video) return;
    const floor = currentReplay?.videoStart ?? 0;
    video.currentTime = Math.max(floor, video.currentTime - 5);
  }

  function toggleSpeed() {
    const video = videoRef.current;
    if (!video) return;
    const next = speed === 1 ? 0.5 : 1;
    video.playbackRate = next;
    setSpeed(next);
    reportSpeedChange(next);
  }

  function handleReplayAgain() {
    cancelCountdown();
    replayAgain();
    // currentTime reset happens in the useEffect above when currentReplay ref changes.
  }

  // Hold on the capture frame when the clip reaches videoEnd, then start countdown.
  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video || !currentReplay) return;
    if (video.currentTime >= currentReplay.videoEnd) {
      video.pause();
      video.currentTime = currentReplay.videoEnd;
      setPaused(true);
      startCountdown();
    }
  }

  function startCountdown() {
    if (countdownRef.current) return; // already counting
    setCountdown(5);
    let n = 5;
    countdownRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setCountdown(null);
        resumeLive();
      } else {
        setCountdown(n);
      }
    }, 1000);
  }

  function cancelCountdown() {
    clearInterval(countdownRef.current);
    countdownRef.current = null;
    setCountdown(null);
  }

  // Intentional no-op: natural end of file also holds the frame, same as videoEnd clamp above.
  function handleEnded() {}

  const controlsDisabled = status !== 'replaying';

  return (
    <div style={styles.root}>
      <video
        ref={videoRef}
        src={VIDEO_URL}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        style={styles.video}
      />

      {/* Loading overlay */}
      {status === 'loading' && (
        <div style={styles.overlay}>
          <div style={styles.spinner} />
        </div>
      )}

      {/* Countdown overlay — auto-resume after clip ends */}
      {countdown !== null && (
        <div style={styles.countdownOverlay}>
          <p style={styles.countdownLabel}>Resuming live in</p>
          <p style={styles.countdownNumber}>{countdown}</p>
        </div>
      )}

      {/* Resumed overlay — brief flash before unmounting back to ReadyScreen */}
      {status === 'resumed' && (
        <div style={styles.overlay}>
          <p style={styles.resumedText}>Back to live…</p>
        </div>
      )}

      {/* Player controls — visible during replaying, faded during other sub-states */}
      <div style={{ ...styles.controls, opacity: controlsDisabled ? 0.3 : 1 }}>
        <button style={styles.btn} onClick={seekBack} disabled={controlsDisabled}>
          ↩ –5s
        </button>
        <button style={styles.btn} onClick={togglePlayPause} disabled={controlsDisabled}>
          {paused ? '▶ Play' : '⏸ Pause'}
        </button>
        <button style={styles.btn} onClick={toggleSpeed} disabled={controlsDisabled}>
          {speed === 1 ? '0.5×' : '1×'}
        </button>
        <button style={styles.btn} onClick={handleReplayAgain} disabled={controlsDisabled}>
          ↺ Again
        </button>
        <button style={{ ...styles.btn, ...styles.resumeBtn }} onClick={() => { cancelCountdown(); resumeLive(); }} disabled={controlsDisabled}>
          ▶ Resume Live
        </button>
      </div>
    </div>
  );
}

const styles = {
  root: { position: 'relative', width: '100%', height: '100%' },
  video: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  overlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)',
  },
  spinner: {
    width: 48, height: 48, borderRadius: '50%',
    border: '4px solid rgba(255,255,255,0.2)',
    borderTopColor: '#fff',
    animation: 'spin 0.8s linear infinite',
  },
  resumedText: { color: '#fff', fontSize: 22, fontWeight: 600 },
  countdownOverlay: {
    position: 'absolute', bottom: 100, left: '50%',
    transform: 'translateX(-50%)',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  countdownLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4 },
  countdownNumber: { color: '#fff', fontSize: 64, fontWeight: 700, lineHeight: 1 },
  controls: {
    position: 'absolute', bottom: 32, left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex', gap: 10,
    transition: 'opacity 0.2s',
  },
  btn: {
    padding: '10px 20px', borderRadius: 8,
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(6px)',
    color: '#fff', fontWeight: 600, fontSize: 14,
    cursor: 'pointer', border: '1px solid rgba(255,255,255,0.25)',
  },
  resumeBtn: {
    background: '#fff', color: '#000',
    border: 'none',
  },
};
