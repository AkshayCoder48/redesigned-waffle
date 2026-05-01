/**
 * useArtifacts Hook
 * React hook for accessing artifact functionality in components
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ArtifactMetadata,
  ArtifactEvent,
  ArtifactStats,
  ArtifactCaptureError,
  ScreenshotOptions,
  RecordingOptions,
  RecordingStatus,
} from '../utils/artifactTypes';
import {
  addArtifactListener,
  listArtifacts,
  getArtifact,
  deleteArtifact,
  clearAllArtifacts,
  getArtifactStats,
  cleanupOldArtifacts,
  downloadArtifact,
  startRecording,
  stopRecording,
  getRecordingState,
  initArtifactManager,
  captureScreenshot,
} from '../utils/artifactManager';

export interface UseArtifactsOptions {
  autoInit?: boolean;
  maxAgeMs?: number;
}

export interface UseArtifactsReturn {
  // State
  artifacts: ArtifactMetadata[];
  isLoading: boolean;
  error: ArtifactCaptureError | null;
  recordingStatus: RecordingStatus;
  recordingDuration: number;
  stats: ArtifactStats | null;
  
  // Screenshot
  takeScreenshot: (page: any, options: ScreenshotOptions, context?: { url?: string; pageTitle?: string; stepName?: string; agentId?: string; taskId?: string }) => Promise<ArtifactMetadata>;
  
  // Recording
  startRecording: (options?: RecordingOptions) => Promise<void>;
  stopRecording: (context?: { url?: string; pageTitle?: string; stepName?: string; agentId?: string; taskId?: string }) => Promise<ArtifactMetadata>;
  isRecording: boolean;
  
  // CRUD
  refreshArtifacts: () => Promise<void>;
  removeArtifact: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  
  // Stats
  getStats: () => Promise<ArtifactStats>;
  cleanupOld: (maxAgeMs?: number) => Promise<number>;
  
  // Actions
  download: (artifact: ArtifactMetadata) => void;
  
  // Events
  events: ArtifactEvent[];
}

export function useArtifacts(options: UseArtifactsOptions = {}): UseArtifactsReturn {
  const { autoInit = true, maxAgeMs = 7 * 24 * 60 * 60 * 1000 } = options;
  
  const [artifacts, setArtifacts] = useState<ArtifactMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ArtifactCaptureError | null>(null);
  const [events, setEvents] = useState<ArtifactEvent[]>([]);
  const [stats, setStats] = useState<ArtifactStats | null>(null);
  const [recordingState, setRecordingState] = useState<{ status: RecordingStatus; duration: number }>({
    status: 'idle',
    duration: 0,
  });

  // Initialize and load artifacts
  useEffect(() => {
    if (!autoInit) return;

    const init = async () => {
      try {
        await initArtifactManager();
        const loaded = await listArtifacts({ limit: 100 });
        setArtifacts(loaded);
        const loadedStats = await getArtifactStats();
        setStats(loadedStats);
      } catch (e) {
        console.error('[useArtifacts] Init error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [autoInit]);

  // Subscribe to artifact events
  useEffect(() => {
    const unsubscribe = addArtifactListener((event) => {
      setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
      
      // Refresh artifacts list on completion events
      if (event.type.endsWith('_complete') || event.type === 'artifact_shared') {
        listArtifacts({ limit: 100 }).then(setArtifacts).catch(console.error);
        getArtifactStats().then(setStats).catch(console.error);
      }
    });

    return unsubscribe;
  }, []);

  // Update recording duration while recording
  useEffect(() => {
    if (recordingState.status !== 'recording') return;

    const interval = setInterval(() => {
      const state = getRecordingState();
      setRecordingState({
        status: state.status,
        duration: state.startTime ? Date.now() - state.startTime : 0,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [recordingState.status]);

  // Refresh artifacts list
  const refreshArtifacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await listArtifacts({ limit: 100 });
      setArtifacts(loaded);
      const loadedStats = await getArtifactStats();
      setStats(loadedStats);
      setError(null);
    } catch (e) {
      setError({
        code: 'STORAGE_ERROR',
        message: 'Failed to load artifacts',
        suggestion: 'Check browser storage permissions',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Take screenshot
  const takeScreenshot = useCallback(async (
    page: any,
    options: ScreenshotOptions,
    context?: { url?: string; pageTitle?: string; stepName?: string; agentId?: string; taskId?: string }
  ) => {
    try {
      setError(null);
      const artifact = await captureScreenshot(page, options, context);
      await refreshArtifacts();
      return artifact;
    } catch (e) {
      const captureError: ArtifactCaptureError = {
        code: 'UNKNOWN',
        message: e instanceof Error ? e.message : 'Screenshot failed',
        suggestion: 'Check browser permissions and page state',
      };
      setError(captureError);
      throw captureError;
    }
  }, [refreshArtifacts]);

  // Start recording
  const startRecordingFn = useCallback(async (options?: RecordingOptions) => {
    try {
      setError(null);
      await startRecording(options);
      const state = getRecordingState();
      setRecordingState({ status: state.status, duration: state.startTime ? Date.now() - state.startTime : 0 });
    } catch (e) {
      const captureError: ArtifactCaptureError = {
        code: e?.code || 'UNKNOWN',
        message: e?.message || 'Failed to start recording',
        suggestion: e?.suggestion || 'Check browser permissions',
      };
      setError(captureError);
      throw captureError;
    }
  }, []);

  // Stop recording
  const stopRecordingFn = useCallback(async (context?: { url?: string; pageTitle?: string; stepName?: string; agentId?: string; taskId?: string }) => {
    try {
      setError(null);
      const artifact = await stopRecording(context);
      setRecordingState({ status: 'idle', duration: 0 });
      await refreshArtifacts();
      return artifact;
    } catch (e) {
      setRecordingState({ status: 'idle', duration: 0 });
      const captureError: ArtifactCaptureError = {
        code: 'UNKNOWN',
        message: e instanceof Error ? e.message : 'Failed to stop recording',
        suggestion: 'Check browser state',
      };
      setError(captureError);
      throw captureError;
    }
  }, [refreshArtifacts]);

  // Remove artifact
  const removeArtifact = useCallback(async (id: string) => {
    try {
      await deleteArtifact(id);
      setArtifacts(prev => prev.filter(a => a.id !== id));
      const loadedStats = await getArtifactStats();
      setStats(loadedStats);
    } catch (e) {
      console.error('[useArtifacts] Delete error:', e);
    }
  }, []);

  // Clear all artifacts
  const clearAll = useCallback(async () => {
    try {
      await clearAllArtifacts();
      setArtifacts([]);
      setStats({ totalArtifacts: 0, screenshotsCount: 0, recordingsCount: 0, totalSizeBytes: 0 });
    } catch (e) {
      console.error('[useArtifacts] Clear error:', e);
    }
  }, []);

  // Get stats
  const getStatsFn = useCallback(async () => {
    return getArtifactStats();
  }, []);

  // Cleanup old artifacts
  const cleanupOld = useCallback(async (cleanupMaxAgeMs?: number) => {
    const deleted = await cleanupOldArtifacts(cleanupMaxAgeMs || maxAgeMs);
    await refreshArtifacts();
    return deleted;
  }, [maxAgeMs, refreshArtifacts]);

  // Download artifact
  const download = useCallback((artifact: ArtifactMetadata) => {
    downloadArtifact(artifact);
  }, []);

  return {
    artifacts,
    isLoading,
    error,
    recordingStatus: recordingState.status,
    recordingDuration: recordingState.duration,
    stats,
    takeScreenshot,
    startRecording: startRecordingFn,
    stopRecording: stopRecordingFn,
    isRecording: recordingState.status === 'recording',
    refreshArtifacts,
    removeArtifact,
    clearAll,
    getStats: getStatsFn,
    cleanupOld,
    download,
    events,
  };
}

// Simplified hook for just receiving artifact events
export function useArtifactEvents(callback: (event: ArtifactEvent) => void) {
  useEffect(() => {
    return addArtifactListener(callback);
  }, [callback]);
}