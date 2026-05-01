/**
 * Artifact Types and Interfaces
 * Defines types for screenshots, recordings, and artifact metadata
 */

export type ArtifactType = 'screenshot' | 'recording' | 'video';
export type ArtifactCaptureMode = 'always-on' | 'on-demand' | 'on-failure';
export type ScreenshotType = 'full-page' | 'viewport' | 'element';
export type RecordingStatus = 'idle' | 'recording' | 'saving' | 'saved' | 'error';

export interface ScreenshotOptions {
  type: ScreenshotType;
  selector?: string;
  path?: string;
  fullPage?: boolean;
}

export interface ArtifactMetadata {
  id: string;
  type: ArtifactType;
  name: string;
  filename: string;
  path: string;
  url: string;
  timestamp: number;
  taskId?: string;
  agentId?: string;
  sourceContext?: {
    url?: string;
    pageTitle?: string;
    stepName?: string;
    action?: string;
  };
  size?: number;
  mimeType: string;
  captureMode?: ArtifactCaptureMode;
}

export interface ArtifactCaptureError {
  code: 'PERMISSION_DENIED' | 'BROWSER_LIMITATION' | 'PATH_ISSUE' | 'STORAGE_ERROR' | 'UNKNOWN';
  message: string;
  suggestion: string;
}

export interface RecordingOptions {
  mode: ArtifactCaptureMode;
  fps?: number;
  path?: string;
}

export interface ArtifactEvent {
  type: 'screenshot_start' | 'screenshot_complete' | 'recording_start' | 'recording_complete' | 'recording_error' | 'artifact_shared';
  artifactId: string;
  artifactType: ArtifactType;
  timestamp: number;
  sourceContext?: ArtifactMetadata['sourceContext'];
  error?: ArtifactCaptureError;
}

export interface ArtifactStats {
  totalArtifacts: number;
  screenshotsCount: number;
  recordingsCount: number;
  totalSizeBytes: number;
  oldestTimestamp?: number;
  newestTimestamp?: number;
}

// Artifact manager state
export interface ArtifactManagerState {
  isCapturing: boolean;
  currentRecordingStatus: RecordingStatus;
  recordingDuration: number;
  lastArtifact?: ArtifactMetadata;
  pendingArtifacts: ArtifactMetadata[];
  events: ArtifactEvent[];
}