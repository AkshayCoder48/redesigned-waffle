/**
 * Artifact Manager
 * Handles screenshot capture, screen recording, storage, and lifecycle
 * for Playwright automation visual artifacts
 */

import {
  ArtifactMetadata,
  ArtifactEvent,
  ArtifactStats,
  ArtifactCaptureError,
  ScreenshotOptions,
  RecordingOptions,
  ArtifactCaptureMode,
  RecordingStatus,
  ScreenshotType,
} from './artifactTypes';

// Storage helpers - using IndexedDB for artifact metadata
const DB_NAME = 'ai-maos-artifacts';
const DB_VERSION = 1;
const STORE_NAME = 'artifacts';

interface ArtifactRecord {
  id: string;
  type: string;
  name: string;
  filename: string;
  path: string;
  url: string;
  timestamp: number;
  taskId?: string;
  agentId?: string;
  sourceContext?: string;
  size?: number;
  mimeType: string;
  captureMode?: string;
}

class ArtifactDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('taskId', 'taskId', { unique: false });
        }
      };
    });
  }

  async saveArtifact(artifact: ArtifactRecord): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(artifact);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getArtifact(id: string): Promise<ArtifactRecord | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async listArtifacts(filter?: { type?: string; taskId?: string; limit?: number }): Promise<ArtifactRecord[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let results = request.result as ArtifactRecord[];
        
        if (filter?.type) {
          results = results.filter(r => r.type === filter.type);
        }
        if (filter?.taskId) {
          results = results.filter(r => r.taskId === filter.taskId);
        }
        
        // Sort by timestamp descending
        results.sort((a, b) => b.timestamp - a.timestamp);
        
        if (filter?.limit) {
          results = results.slice(0, filter.limit);
        }
        
        resolve(results);
      };
    });
  }

  async deleteArtifact(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getStats(): Promise<ArtifactStats> {
    const artifacts = await this.listArtifacts();
    
    return {
      totalArtifacts: artifacts.length,
      screenshotsCount: artifacts.filter(a => a.type === 'screenshot').length,
      recordingsCount: artifacts.filter(a => a.type === 'recording' || a.type === 'video').length,
      totalSizeBytes: artifacts.reduce((sum, a) => sum + (a.size || 0), 0),
      oldestTimestamp: artifacts.length > 0 ? Math.min(...artifacts.map(a => a.timestamp)) : undefined,
      newestTimestamp: artifacts.length > 0 ? Math.max(...artifacts.map(a => a.timestamp)) : undefined,
    };
  }
}

const artifactDb = new ArtifactDB();

// Event listeners for real-time updates
type ArtifactEventListener = (event: ArtifactEvent) => void;
const listeners: Set<ArtifactEventListener> = new Set();

export function addArtifactListener(callback: ArtifactEventListener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emitEvent(event: ArtifactEvent): void {
  listeners.forEach(listener => {
    try {
      listener(event);
    } catch (e) {
      console.error('[ArtifactManager] Event listener error:', e);
    }
  });
}

// Generate unique IDs
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Sanitize filename
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 200);
}

// Default storage path
const getDefaultArtifactPath = (type: 'screenshots' | 'recordings'): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${type}/${timestamp}`;
};

// Capture screenshot from browser
export interface BrowserPageLike {
  screenshot(options?: { path?: string; fullPage?: boolean; type?: string }): Promise<Buffer>;
  locator(selector: string): { screenshot(options?: object): Promise<Buffer> };
}

export async function captureScreenshot(
  page: BrowserPageLike,
  options: ScreenshotOptions,
  context?: {
    url?: string;
    pageTitle?: string;
    stepName?: string;
    agentId?: string;
    taskId?: string;
  }
): Promise<ArtifactMetadata> {
  const id = generateId('scr');
  const timestamp = Date.now();
  
  // Emit start event
  emitEvent({
    type: 'screenshot_start',
    artifactId: id,
    artifactType: 'screenshot',
    timestamp,
    sourceContext: context,
  });

  try {
    let imageBuffer: Buffer;
    let filename: string;
    let screenshotType: ScreenshotType = options.type;

    if (options.selector && options.type === 'element') {
      // Element screenshot
      const locator = page.locator(options.selector);
      imageBuffer = await locator.screenshot();
      filename = `element_${timestamp}.png`;
    } else if (options.fullPage || options.type === 'full-page') {
      // Full page screenshot
      imageBuffer = await page.screenshot({ fullPage: true });
      filename = `fullpage_${timestamp}.png`;
      screenshotType = 'full-page';
    } else {
      // Viewport screenshot
      imageBuffer = await page.screenshot();
      filename = `viewport_${timestamp}.png`;
      screenshotType = 'viewport';
    }

    // Convert buffer to blob and store
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    const url = URL.createObjectURL(blob);

    const artifact: ArtifactMetadata = {
      id,
      type: 'screenshot',
      name: `${screenshotType} screenshot`,
      filename,
      path: options.path || getDefaultArtifactPath('screenshots'),
      url,
      timestamp,
      taskId: context?.taskId,
      agentId: context?.agentId,
      sourceContext: {
        url: context?.url,
        pageTitle: context?.pageTitle,
        stepName: context?.stepName,
        action: `captured ${screenshotType} screenshot`,
      },
      size: blob.size,
      mimeType: 'image/png',
    };

    // Save to IndexedDB
    const record: ArtifactRecord = {
      id: artifact.id,
      type: artifact.type,
      name: artifact.name,
      filename: artifact.filename,
      path: artifact.path,
      url: artifact.url,
      timestamp: artifact.timestamp,
      taskId: artifact.taskId,
      agentId: artifact.agentId,
      sourceContext: JSON.stringify(artifact.sourceContext),
      size: artifact.size,
      mimeType: artifact.mimeType,
    };
    await artifactDb.saveArtifact(record);

    // Emit completion event
    emitEvent({
      type: 'screenshot_complete',
      artifactId: id,
      artifactType: 'screenshot',
      timestamp: Date.now(),
      sourceContext: artifact.sourceContext,
    });

    return artifact;
  } catch (error) {
    const captureError: ArtifactCaptureError = {
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Screenshot capture failed',
      suggestion: 'Check browser permissions and ensure page is loaded',
    };

    // Emit error event
    emitEvent({
      type: 'recording_error',
      artifactId: id,
      artifactType: 'screenshot',
      timestamp: Date.now(),
      sourceContext: context,
      error: captureError,
    });

    throw captureError;
  }
}

// Screen recording state
let recordingState: {
  status: RecordingStatus;
  startTime: number;
  duration: number;
  mode: ArtifactCaptureMode;
  mediaRecorder?: MediaRecorder;
  chunks: Blob[];
  stream?: MediaStream;
} = {
  status: 'idle',
  startTime: 0,
  duration: 0,
  mode: 'on-demand',
  chunks: [],
};

// Update recording state
function updateRecordingState(updates: Partial<typeof recordingState>): void {
  recordingState = { ...recordingState, ...updates };
}

// Get current recording state
export function getRecordingState(): { status: RecordingStatus; startTime: number; duration: number; mode: ArtifactCaptureMode } {
  return { status: recordingState.status, startTime: recordingState.startTime, duration: recordingState.duration, mode: recordingState.mode };
}

// Start screen recording
export async function startRecording(options: RecordingOptions = { mode: 'on-demand' }): Promise<void> {
  if (recordingState.status === 'recording') {
    console.warn('[ArtifactManager] Recording already in progress');
    return;
  }

  const id = generateId('rec');
  const timestamp = Date.now();

  // Emit start event
  emitEvent({
    type: 'recording_start',
    artifactId: id,
    artifactType: 'recording',
    timestamp,
  });

  try {
    // Request screen capture
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'monitor',
        ...(options.fps && { frameRate: { ideal: options.fps } }),
      } as MediaTrackConstraints,
      audio: false,
    });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
    });

    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.start(1000); // Collect data every second

    updateRecordingState({
      status: 'recording',
      startTime: Date.now(),
      duration: 0,
      mode: options.mode,
      mediaRecorder,
      chunks,
      stream,
    });

    console.log('[ArtifactManager] Recording started');
  } catch (error) {
    let errorCode: ArtifactCaptureError['code'] = 'UNKNOWN';
    let suggestion = 'Check browser permissions for screen capture';

    if (error instanceof Error) {
      if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
        errorCode = 'PERMISSION_DENIED';
        suggestion = 'Please allow screen capture in browser permissions';
      } else if (error.message.includes('not supported')) {
        errorCode = 'BROWSER_LIMITATION';
        suggestion = 'Screen recording may not be supported in this browser';
      }
    }

    emitEvent({
      type: 'recording_error',
      artifactId: id,
      artifactType: 'recording',
      timestamp: Date.now(),
      error: {
        code: errorCode,
        message: error instanceof Error ? error.message : 'Failed to start recording',
        suggestion,
      },
    });

    throw { code: errorCode, message: error?.message || 'Failed to start recording', suggestion };
  }
}

// Stop recording and save artifact
export async function stopRecording(context?: {
  url?: string;
  pageTitle?: string;
  stepName?: string;
  agentId?: string;
  taskId?: string;
}): Promise<ArtifactMetadata> {
  if (recordingState.status !== 'recording') {
    throw new Error('No recording in progress');
  }

  const id = generateId('rec');
  const timestamp = Date.now();

  updateRecordingState({ status: 'saving' });

  return new Promise((resolve, reject) => {
    if (!recordingState.mediaRecorder) {
      reject(new Error('MediaRecorder not available'));
      return;
    }

    recordingState.mediaRecorder.onstop = async () => {
      try {
        // Stop all tracks
        recordingState.stream?.getTracks().forEach(track => track.stop());

        // Create blob from chunks
        const blob = new Blob(recordingState.chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const duration = recordingState.duration;

        const filename = `recording_${timestamp}.webm`;
        const artifact: ArtifactMetadata = {
          id,
          type: 'recording',
          name: `Screen recording (${Math.round(duration / 1000)}s)`,
          filename,
          path: getDefaultArtifactPath('recordings'),
          url,
          timestamp,
          taskId: context?.taskId,
          agentId: context?.agentId,
          sourceContext: {
            url: context?.url,
            pageTitle: context?.pageTitle,
            stepName: context?.stepName,
            action: `recorded ${Math.round(duration / 1000)}s screen recording`,
          },
          size: blob.size,
          mimeType: 'video/webm',
          captureMode: recordingState.mode,
        };

        // Save to IndexedDB
        const record: ArtifactRecord = {
          id: artifact.id,
          type: artifact.type,
          name: artifact.name,
          filename: artifact.filename,
          path: artifact.path,
          url: artifact.url,
          timestamp: artifact.timestamp,
          taskId: artifact.taskId,
          agentId: artifact.agentId,
          sourceContext: JSON.stringify(artifact.sourceContext),
          size: artifact.size,
          mimeType: artifact.mimeType,
          captureMode: artifact.captureMode,
        };
        await artifactDb.saveArtifact(record);

        updateRecordingState({
          status: 'saved',
          duration: 0,
          mediaRecorder: undefined,
          chunks: [],
          stream: undefined,
        });

        // Emit completion event
        emitEvent({
          type: 'recording_complete',
          artifactId: id,
          artifactType: 'recording',
          timestamp: Date.now(),
          sourceContext: artifact.sourceContext,
        });

        resolve(artifact);
      } catch (error) {
        reject(error);
      }
    };

    recordingState.mediaRecorder.stop();
  });
}

// Cancel recording without saving
export function cancelRecording(): void {
  if (recordingState.status !== 'recording') return;

  recordingState.stream?.getTracks().forEach(track => track.stop());
  recordingState.mediaRecorder?.stop();

  updateRecordingState({
    status: 'idle',
    duration: 0,
    mediaRecorder: undefined,
    chunks: [],
    stream: undefined,
  });

  console.log('[ArtifactManager] Recording cancelled');
}

// Get recording duration
export function getRecordingDuration(): number {
  if (recordingState.status !== 'recording') return 0;
  return Date.now() - recordingState.startTime;
}

// List artifacts with optional filtering
export async function listArtifacts(filter?: { type?: string; taskId?: string; limit?: number }): Promise<ArtifactMetadata[]> {
  const records = await artifactDb.listArtifacts(filter);
  
  return records.map(record => ({
    id: record.id,
    type: record.type as 'screenshot' | 'recording' | 'video',
    name: record.name,
    filename: record.filename,
    path: record.path,
    url: record.url,
    timestamp: record.timestamp,
    taskId: record.taskId,
    agentId: record.agentId,
    sourceContext: record.sourceContext ? JSON.parse(record.sourceContext) : undefined,
    size: record.size,
    mimeType: record.mimeType,
    captureMode: record.captureMode as ArtifactCaptureMode | undefined,
  }));
}

// Get single artifact
export async function getArtifact(id: string): Promise<ArtifactMetadata | null> {
  const record = await artifactDb.getArtifact(id);
  if (!record) return null;

  return {
    id: record.id,
    type: record.type as 'screenshot' | 'recording' | 'video',
    name: record.name,
    filename: record.filename,
    path: record.path,
    url: record.url,
    timestamp: record.timestamp,
    taskId: record.taskId,
    agentId: record.agentId,
    sourceContext: record.sourceContext ? JSON.parse(record.sourceContext) : undefined,
    size: record.size,
    mimeType: record.mimeType,
    captureMode: record.captureMode as ArtifactCaptureMode | undefined,
  };
}

// Delete artifact
export async function deleteArtifact(id: string): Promise<void> {
  const artifact = await getArtifact(id);
  if (artifact?.url) {
    URL.revokeObjectURL(artifact.url);
  }
  await artifactDb.deleteArtifact(id);
}

// Clear all artifacts
export async function clearAllArtifacts(): Promise<void> {
  const artifacts = await listArtifacts();
  artifacts.forEach(artifact => {
    if (artifact.url) {
      URL.revokeObjectURL(artifact.url);
    }
  });
  await artifactDb.clearAll();
}

// Get artifact statistics
export async function getArtifactStats(): Promise<ArtifactStats> {
  return artifactDb.getStats();
}

// Cleanup old artifacts (retention policy)
export async function cleanupOldArtifacts(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
  const cutoff = Date.now() - maxAgeMs;
  const artifacts = await listArtifacts();
  
  let deletedCount = 0;
  for (const artifact of artifacts) {
    if (artifact.timestamp < cutoff) {
      await deleteArtifact(artifact.id);
      deletedCount++;
    }
  }
  
  return deletedCount;
}

// Download artifact helper
export function downloadArtifact(artifact: ArtifactMetadata): void {
  const a = document.createElement('a');
  a.href = artifact.url;
  a.download = artifact.filename;
  a.click();
}

// Share artifact (emit share event)
export function shareArtifact(artifactId: string, target: 'chat' | 'activity'): void {
  emitEvent({
    type: 'artifact_shared',
    artifactId,
    artifactType: 'screenshot', // Will be determined from artifact
    timestamp: Date.now(),
  });
}

// Auto-capture hooks for automation integration
export interface CaptureHooks {
  onStepComplete?: (context: { url?: string; pageTitle?: string; stepName?: string; agentId?: string; taskId?: string }) => void;
  onFailure?: (error: Error, context: { url?: string; pageTitle?: string; stepName?: string; agentId?: string; taskId?: string }) => void;
}

let captureHooks: CaptureHooks = {};

export function setCaptureHooks(hooks: CaptureHooks): void {
  captureHooks = hooks;
}

export function triggerStepCompleteHook(context: Parameters<NonNullable<CaptureHooks['onStepComplete']>>[0]): void {
  captureHooks.onStepComplete?.(context);
}

export function triggerFailureHook(error: Error, context: Parameters<NonNullable<CaptureHooks['onFailure']>>[0]): void {
  captureHooks.onFailure?.(error, context);
}

// Initialize artifact DB
export async function initArtifactManager(): Promise<void> {
  await artifactDb.init();
}

// Export types
export type { ArtifactCaptureMode, ScreenshotType } from './artifactTypes';