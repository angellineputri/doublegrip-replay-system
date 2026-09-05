const STATUS_COLOR = {
  resumed: '#22c55e',
  replaying: '#3b82f6',
  created: '#f59e0b',
  abandoned: '#ef4444',
};

function fmtDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtSec(sec) {
  return sec != null ? `${sec.toFixed(1)}s` : '—';
}

export default function HistoryPanel({ open, onClose, replays, loading }) {
  if (!open) return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title}>Replay History</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {loading && <div style={styles.empty}>Loading…</div>}

        {!loading && replays?.length === 0 && (
          <div style={styles.empty}>No replays yet.</div>
        )}

        {!loading && replays?.length > 0 && (
          <ul style={styles.list}>
            {replays.map((r) => {
              const durationSec = Math.round((r.clip_end - r.clip_start) / 1000);
              const color = STATUS_COLOR[r.status] ?? '#6b7280';
              const effectiveDuration = r.video_duration != null
              ? Math.round(r.video_duration)
              : durationSec;
              return (
                <li key={r.id} style={styles.row}>
                  <div style={styles.rowMain}>
                    <span style={{ ...styles.dot, background: color }} />
                    <span style={styles.time}>{fmtDate(r.created_at)}</span>
                  </div>
                  <div style={styles.rowClip}>
                    {fmtSec(r.video_start)} → {fmtSec(r.video_end)}
                    <span style={styles.duration}>{effectiveDuration}s</span>
                  </div>
                  <div style={styles.rowMeta}>
                    <span style={styles.tag}>×{r.replay_count}</span>
                    <span style={styles.tag}>{r.playback_speed}×</span>
                    <span style={{ ...styles.tag, color }}>{r.status}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed', inset: 0,
    zIndex: 8000,
  },
  panel: {
    position: 'absolute', bottom: 80, right: 16,
    width: 320,
    background: 'rgba(15,15,15,0.95)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: '60vh',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  title: { color: '#fff', fontWeight: 700, fontSize: 14 },
  closeBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
    fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 0,
  },
  list: {
    listStyle: 'none', margin: 0, padding: 0,
    overflowY: 'auto', flex: 1,
  },
  row: {
    padding: '8px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  rowMain: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 },
  rowClip: { display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 18, marginBottom: 4, color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  rowMeta: { display: 'flex', gap: 6, paddingLeft: 18 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  time: { color: '#fff', fontSize: 13, fontWeight: 600 },
  duration: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginLeft: 'auto' },
  tag: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  empty: { color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: '16px 14px' },
};
