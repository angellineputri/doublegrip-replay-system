import { useState, useCallback, useRef } from 'react';
import { createReplay, postEvent, getSystem } from '../api';

// Keyboard listeners (Space/Enter → triggerReplay) belong in the consuming component,
// not here — keeps the hook testable in isolation and out of the DOM lifecycle.

export function useReplaySystem() {
  const [status, setStatus] = useState('ready');
  const [currentReplay, setCurrentReplay] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const resumeTimer = useRef(null);

  const triggerReplay = useCallback(async (liveVideoTime = 0) => {
    // Belt-and-suspenders guard on top of the server's 409 lock.
    // Prevents double-fires from rapid clicks or keyboard listener misfires.
    if (status !== 'ready') return;

    setStatus('loading');
    setErrorMessage(null);

    try {
      const replay = await createReplay();
      const videoEnd = liveVideoTime;
      const videoStart = Math.max(0, videoEnd - 20);
      setCurrentReplay({ ...replay, videoStart, videoEnd });
      setStatus('replaying');
    } catch (err) {
      if (err.status === 409) {
        // Lock is stuck — fetch the active replay ID and release it, then retry once.
        try {
          const system = await getSystem();
          if (system.activeReplayId) {
            await postEvent(system.activeReplayId, 'resume');
          }
          const replay = await createReplay();
          const videoEnd = liveVideoTime;
          const videoStart = Math.max(0, videoEnd - 20);
          setCurrentReplay({ ...replay, videoStart, videoEnd });
          setStatus('replaying');
        } catch {
          setErrorMessage('Could not start replay. Please try again.');
          setStatus('error');
        }
      } else {
        setErrorMessage(err.message);
        setStatus('error');
      }
    }
  }, [status]);

  const resumeLive = useCallback(async () => {
    if (!currentReplay || status !== 'replaying') return;
    setStatus('resumed');


    try {
      await postEvent(currentReplay.id, 'resume');
    } catch {
      // Resume event is best-effort — the server lock releases regardless of UI state.
    }

    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      setStatus('ready');
      setCurrentReplay(null);
    }, 1500);
  }, [currentReplay, status]);

  const replayAgain = useCallback(async () => {
    if (!currentReplay) return;
    try {
      await postEvent(currentReplay.id, 'replay_again');
    } catch {
      // Non-critical telemetry event — stay in replaying state regardless.
    }
    // Status stays 'replaying'; the player component resets currentTime to 0.
    setCurrentReplay((r) => ({ ...r }));
  }, [currentReplay]);

  const reportSpeedChange = useCallback(async (speed) => {
    if (!currentReplay) return;
    try {
      await postEvent(currentReplay.id, 'speed_change', { speed });
    } catch {
      // Non-critical telemetry — ignore silently.
    }
  }, [currentReplay]);

  const dismissError = useCallback(() => {
    setErrorMessage(null);
    setStatus('ready');
  }, []);

  return {
    status,
    currentReplay,
    errorMessage,
    triggerReplay,
    resumeLive,
    replayAgain,
    reportSpeedChange,
    dismissError,
  };
}
