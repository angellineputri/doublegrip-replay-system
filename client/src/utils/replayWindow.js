// Computes the 20s replay window relative to the looping video's current position.
// When currentTime is near the start of the loop (< replayLength seconds in), the window
// wraps around: segment1 is the tail of the previous loop, segment2 is [0, currentTime].
// hasLooped must be true before wrapping is allowed — on the first pass through the clip,
// rawStart < 0 just means we haven't seen 20 seconds yet, so clamp at 0 instead of wrapping.
export function computeReplayWindow(currentTime, clipDuration, hasLooped, replayLength = 20) {
  const rawStart = currentTime - replayLength;

  if (hasLooped && rawStart < 0) {
    const wrappedStart = clipDuration + rawStart;
    return {
      isWrapped: true,
      segment1: { start: wrappedStart, end: clipDuration },
      segment2: { start: 0, end: currentTime },
    };
  }

  return {
    isWrapped: false,
    segment1: { start: Math.max(0, rawStart), end: currentTime },
    segment2: null,
  };
}
