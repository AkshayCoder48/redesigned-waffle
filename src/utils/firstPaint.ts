/**
 * Guaranteed first paint manager
 * Ensures loading screen always dismisses within startup time budget
 */

const FIRST_PAINT_TIMEOUT_MS = 8000; // 8 second budget
const INITIAL_RENDER_DELAY_MS = 16; // One frame

let paintConfirmed = false;
let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;
let dismissCallback: (() => void) | null = null;

/**
 * Called by main.tsx after React successfully mounts the initial component.
 * This is the "first paint" signal - React has committed to the DOM.
 */
export function confirmFirstPaint(): void {
  if (paintConfirmed) return;
  paintConfirmed = true;
  
  // Clear any pending fallback timeout
  if (fallbackTimeout) {
    clearTimeout(fallbackTimeout);
    fallbackTimeout = null;
  }
  
  console.log('[Startup] First paint confirmed');
}

/**
 * Register the dismiss callback that will be called if first paint is not confirmed
 * within the timeout period. This provides a fallback mechanism.
 */
export function registerFirstPaintFallback(onDismiss: () => void): void {
  dismissCallback = onDismiss;
  
  // Set up the safety timeout
  if (fallbackTimeout) {
    clearTimeout(fallbackTimeout);
  }
  
  fallbackTimeout = setTimeout(() => {
    if (!paintConfirmed && dismissCallback) {
      console.warn('[Startup] First paint timeout - triggering fallback');
      dismissCallback();
    }
  }, FIRST_PAINT_TIMEOUT_MS);
}

/**
 * Check if first paint has been confirmed
 */
export function hasFirstPaint(): boolean {
  return paintConfirmed;
}

/**
 * Reset state (for testing or manual recovery)
 */
export function resetFirstPaintState(): void {
  paintConfirmed = false;
  if (fallbackTimeout) {
    clearTimeout(fallbackTimeout);
    fallbackTimeout = null;
  }
  dismissCallback = null;
}