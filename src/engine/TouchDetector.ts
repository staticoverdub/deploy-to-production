// Shared touch-device detection utility
// Cached result — safe to call frequently

let _cached: boolean | null = null;

export function isTouchDevice(): boolean {
  if (_cached !== null) return _cached;
  _cached = 'ontouchstart' in window
    && navigator.maxTouchPoints > 0
    && window.matchMedia('(pointer: coarse)').matches;
  return _cached;
}

export const LONG_PRESS_MS = 500;
