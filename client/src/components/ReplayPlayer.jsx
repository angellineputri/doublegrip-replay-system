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
  const [clampedAtEnd, setClampedAtEnd] = useState(false);
  const [activeSegment, setActiveSegment] = useState(1);

  // Fires on first mount (new replay) and on Replay Again (same frozen window, reset to start).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentReplay) return;
    video.currentTime = currentReplay.segment1.start;
    video.play().catch((err) => console.warn('video.play() rejected:', err.message));
    setPaused(false);
    setClampedAtEnd(false);
    setActiveSegment(1);
  }, [currentReplay]);

  // onTimeUpdate handles two cases in order of precedence:
  // 1. Wrapped mid-clip stitch: end of segment1 → jump to segment2 start, keep playing.
  // 2. True end of clip: pause and hold on last frame.
  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video || !currentReplay || clampedAtEnd) return;

    const { isWrapped, segment1, segment2 } = currentReplay;
    const t = video.currentTime;

    if (isWrapped && activeSegment === 1 && t >= segment1.end) {
      // Mid-clip stitch — not the end, just crossing the loop boundary.
      video.currentTime = segment2.start;
      video.play().catch((err) => console.warn('video.play() rejected:', err.message)); // seek alone won't resume if video is in ended state
      setActiveSegment(2);
      return;
    }

    const trueEnd = isWrapped ? segment2.end : segment1.end;
    const isInFinalSegment = !isWrapped || activeSegment === 2;

    if (isInFinalSegment && t >= trueEnd) {
      video.pause();
      video.currentTime = trueEnd;
      setPaused(true);
      setClampedAtEnd(true);
    }
  }

  function togglePlayPause() {
    const video = videoRef.current;
    if (!video) return;
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
    if (!video || !currentReplay) return;

    const { isWrapped, segment1, segment2 } = currentReplay;
    const wasAtEnd = clampedAtEnd;

    if (!isWrapped || activeSegment === 1) {
      video.currentTime = Math.max(segment1.start, video.currentTime - 5);
    } else {
      // Segment 2: back-5 may need to cross back into segment 1.
      const newTime = video.currentTime - 5;
      if (newTime >= segment2.start) {
        video.currentTime = newTime;
      } else {
        const overflow = segment2.start - newTime;
        video.currentTime = segment1.end - overflow;
        setActiveSegment(1);
      }
    }

    if (wasAtEnd) {
      setClampedAtEnd(false);
      setPaused(false);
      video.play().catch((err) => console.warn('video.play() rejected:', err.message));
    }
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
    replayAgain();
    // useEffect above resets to segment1.start when currentReplay ref refreshes.
  }

  // Natural EOF: if wrapped and still in segment 1, the file ended before onTimeUpdate
  // could catch t >= segment1.end — stitch to segment 2 here as a fallback.
  function handleEnded() {
    if (!currentReplay?.isWrapped || activeSegment !== 1) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = currentReplay.segment2.start;
    video.play().catch((err) => console.warn('video.play() rejected:', err.message));
    setActiveSegment(2);
  }

  const controlsDisabled = status !== 'replaying';
  const playPauseDisabled = controlsDisabled || clampedAtEnd;

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

      {status === 'loading' && (
        <div style={styles.overlay}>
          <div style={styles.spinner} />
        </div>
      )}

      {/* End-of-clip banner — makes the hold state legible, not broken-looking */}
      {clampedAtEnd && status === 'replaying' && (
        <div style={styles.endBanner}>
          End of clip — Replay Again or Resume Live
        </div>
      )}

      {status === 'resumed' && (
        <div style={styles.overlay}>
          <p style={styles.resumedText}>Back to live…</p>
        </div>
      )}

      <div style={{ ...styles.controls, opacity: controlsDisabled ? 0.3 : 1 }}>
        <button style={styles.btn} onClick={seekBack} disabled={controlsDisabled}>
          ↩ –5s
        </button>
        <button style={{ ...styles.btn, opacity: playPauseDisabled ? 0.3 : 1 }} onClick={togglePlayPause} disabled={playPauseDisabled}>
          {paused ? '▶ Play' : '⏸ Pause'}
        </button>
        <button style={styles.btn} onClick={toggleSpeed} disabled={controlsDisabled}>
          {speed === 1 ? '0.5×' : '1×'}
        </button>
        <button style={styles.btn} onClick={handleReplayAgain} disabled={controlsDisabled}>
          ↺ Again
        </button>
        <button style={{ ...styles.btn, ...styles.resumeBtn }} onClick={resumeLive} disabled={controlsDisabled}>
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
  endBanner: {
    position: 'absolute', top: 24, left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff', fontSize: 14, fontWeight: 600,
    padding: '6px 16px', borderRadius: 6,
    pointerEvents: 'none', whiteSpace: 'nowrap',
  },
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
