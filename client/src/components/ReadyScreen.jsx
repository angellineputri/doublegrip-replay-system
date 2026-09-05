import { useEffect } from 'react';

export default function ReadyScreen({ liveVideoRef, triggerReplay, hasLooped }) {
  function capture() {
    triggerReplay(
      liveVideoRef.current?.currentTime ?? 0,
      liveVideoRef.current?.duration ?? 0,
      hasLooped,
    );
  }

  // Space/Enter only active while this component is mounted (status === 'ready').
  // Cleanup on unmount prevents duplicate listeners if the component re-mounts.
  useEffect(() => {
    function handleKey(e) {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        capture();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [triggerReplay]);

  return (
    <div style={styles.root}>
      <div style={styles.liveBadge}>
        <span style={styles.liveDot} />
        LIVE
      </div>

      <button style={styles.replayBtn} onClick={capture}>
        ⏮ Replay
      </button>
    </div>
  );
}

const styles = {
  root: { position: 'absolute', inset: 0 },
  liveBadge: {
    position: 'absolute', top: 16, left: 16,
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(0,0,0,0.55)', color: '#fff',
    padding: '4px 10px', borderRadius: 4,
    fontSize: 13, fontWeight: 700, letterSpacing: 1,
  },
  liveDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: '#ef4444', display: 'inline-block',
  },
  replayBtn: {
    position: 'absolute', bottom: 40, left: '50%',
    transform: 'translateX(-50%)',
    padding: '14px 40px', borderRadius: 10,
    background: '#fff', color: '#000',
    fontWeight: 700, fontSize: 18, cursor: 'pointer',
    border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  },
};
