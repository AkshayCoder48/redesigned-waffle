/**
 * Startup Phases for tracking initialization
 * Provides logging and state management for app startup
 */

export type StartupPhase = 
  | 'init'
  | 'providers'
  | 'filesystem'
  | 'webcontainer'
  | 'rendering'
  | 'ready'
  | 'error';

export interface StartupState {
  phase: StartupPhase;
  isLoading: boolean;
  error: Error | null;
  startTime: number;
  phaseStartTimes: Partial<Record<StartupPhase, number>>;
}

const listeners: Set<(state: StartupState) => void> = new Set();

let currentState: StartupState = {
  phase: 'init',
  isLoading: true,
  error: null,
  startTime: Date.now(),
  phaseStartTimes: {},
};

function notify(): void {
  listeners.forEach(listener => listener(currentState));
}

export function getStartupState(): StartupState {
  return currentState;
}

export function subscribeToStartup(callback: (state: StartupState) => void): () => void {
  listeners.add(callback);
  callback(currentState);
  return () => listeners.delete(callback);
}

export function setPhase(phase: StartupPhase): void {
  const now = Date.now();
  currentState = {
    ...currentState,
    phase,
    phaseStartTimes: {
      ...currentState.phaseStartTimes,
      [phase]: now,
    },
    isLoading: phase !== 'ready' && phase !== 'error',
  };
  
  const elapsed = now - currentState.startTime;
  console.log(`[Startup] Phase: ${phase} (+${elapsed}ms since init)`);
  notify();
}

export function setError(error: Error): void {
  currentState = {
    ...currentState,
    phase: 'error',
    error,
    isLoading: false,
  };
  
  console.error(`[Startup] Error:`, error);
  notify();
}

export function setReady(): void {
  const elapsed = Date.now() - currentState.startTime;
  console.log(`[Startup] Ready! (${elapsed}ms total)`);
  setPhase('ready');
}

export function logPhase(phase: string, message: string): void {
  const elapsed = Date.now() - currentState.startTime;
  console.log(`[Startup:${phase}] ${message} (+${elapsed}ms)`);
}