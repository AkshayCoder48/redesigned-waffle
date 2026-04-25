/**
 * OPFS (Origin Private File System) Utilities
 * Provides streaming storage for large model files (T2I safetensors, TTS gguf/onnx)
 * Supports Android browser environment with fallback handling.
 */

export interface OPFSFile {
  name: string;
  path: string;
  size: number;
  type: 'model' | 'config' | 'temp';
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface OPFSProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface OPFSErrors {
  notSupported: string;
  quotaExceeded: string;
  accessDenied: string;
  unknown: string;
}

const ERRORS: OPFSErrors = {
  notSupported: 'OPFS is not supported in this browser. Please use Chrome, Edge, or Safari 15.2+.',
  quotaExceeded: 'Storage quota exceeded. Try clearing browser data or using a smaller model.',
  accessDenied: 'Access denied. Please grant storage permissions.',
  unknown: 'Unknown OPFS error occurred.',
};

/**
 * Check if OPFS is supported in the current environment
 */
export function isOPFSSupported(): boolean {
  return typeof window !== 'undefined' && 'navigator' in window && 'storage' in navigator && 'getDirectory' in navigator.storage;
}

/**
 * Get OPFS root directory
 */
async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  if (!isOPFSSupported()) {
    throw new Error(ERRORS.notSupported);
  }
  try {
    return await navigator.storage.getDirectory();
  } catch {
    throw new Error(ERRORS.accessDenied);
  }
}

/**
 * Check available storage quota
 */
export async function getStorageQuota(): Promise<{ used: number; available: number; quota: number }> {
  if ('estimate' in navigator) {
    const { usage = 0, quota = 0 } = await navigator.estimate();
    return {
      used: usage,
      available: quota - usage,
      quota,
    };
  }
  return { used: 0, available: 0, quota: 0 };
}

/**
 * Create OPFS directory if it doesn't exist
 */
async function ensureDirectory(path: string[]): Promise<FileSystemDirectoryHandle> {
  const root = await getOPFSRoot();
  let current = root;
  
  for (const segment of path) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }
  
  return current;
}

/**
 * Get the models directory handle
 */
async function getModelsDirectory(): Promise<FileSystemDirectoryHandle> {
  return ensureDirectory(['models']);
}

/**
 * Get the temp directory handle for uploads
 */
async function getTempDirectory(): Promise<FileSystemDirectoryHandle> {
  return ensureDirectory(['temp']);
}

/**
 * Write file to OPFS with streaming support for large files
 */
export async function writeOPFSFile(
  filename: string,
  data: ArrayBuffer | Uint8Array,
  type: OPFSFile['type'] = 'model',
  metadata?: Record<string, unknown>,
  onProgress?: (progress: OPFSProgress) => void
): Promise<OPFSFile> {
  const dir = await getModelsDirectory();
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();

  const totalSize = data.byteLength;
  let offset = 0;
  const chunkSize = 1024 * 1024; // 1MB chunks

  try {
    if (data instanceof Uint8Array) {
      // Write in chunks for progress reporting
      while (offset < totalSize) {
        const end = Math.min(offset + chunkSize, totalSize);
        const chunk = data.slice(offset, end);
        await writable.write(chunk);
        offset += chunk.byteLength;
        onProgress?.({
          loaded: offset,
          total: totalSize,
          percentage: Math.round((offset / totalSize) * 100),
        });
      }
    } else {
      // ArrayBuffer - read and write chunks
      const view = new Uint8Array(data);
      while (offset < totalSize) {
        const end = Math.min(offset + chunkSize, totalSize);
        const chunk = view.slice(offset, end);
        await writable.write(chunk);
        offset += chunk.byteLength;
        onProgress?.({
          loaded: offset,
          total: totalSize,
          percentage: Math.round((offset / totalSize) * 100),
        });
      }
    }
  } finally {
    await writable.close();
  }

  return {
    name: filename,
    path: `models/${filename}`,
    size: totalSize,
    type,
    createdAt: Date.now(),
    metadata,
  };
}

/**
 * Stream write from File API for browser uploads
 */
export async function writeOPFSFromFile(
  file: File,
  type: OPFSFile['type'] = 'model',
  metadata?: Record<string, unknown>,
  onProgress?: (progress: OPFSProgress) => void
): Promise<OPFSFile> {
  const dir = await getModelsDirectory();
  const filename = file.name;
  
  // Check if file already exists, delete if so
  try {
    const existing = await dir.getFileHandle(filename);
    await dir.removeEntry(filename, { recursive: true });
  } catch {
    // File doesn't exist, that's fine
  }

  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();

  const totalSize = file.size;
  const reader = file.stream().getReader();

  let loaded = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      await writable.write(value);
      loaded += value.byteLength;
      onProgress?.({
        loaded,
        total: totalSize,
        percentage: Math.round((loaded / totalSize) * 100),
      });
    }
  } finally {
    await writable.close();
  }

  return {
    name: filename,
    path: `models/${filename}`,
    size: totalSize,
    type,
    createdAt: Date.now(),
    metadata,
  };
}

/**
 * Read file from OPFS
 */
export async function readOPFSFile(filename: string): Promise<File | null> {
  try {
    const dir = await getModelsDirectory();
    const fileHandle = await dir.getFileHandle(filename);
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}

/**
 * List all files in OPFS models directory
 */
export async function listOPFSFiles(type?: OPFSFile['type']): Promise<OPFSFile[]> {
  const dir = await getModelsDirectory();
  const files: OPFSFile[] = [];

  for await (const [name, handle] of (dir as AsyncIterable<[string, FileSystemHandle]>)) {
    if (handle.kind === 'file') {
      const fileHandle = handle as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      
      files.push({
        name,
        path: `models/${name}`,
        size: file.size,
        type: type || 'model',
        createdAt: file.lastModified,
      });
    }
  }

  return files.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Delete file from OPFS
 */
export async function deleteOPFSFile(filename: string): Promise<boolean> {
  try {
    const dir = await getModelsDirectory();
    await dir.removeEntry(filename);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if OPFS file exists
 */
export async function opfsFileExists(filename: string): Promise<boolean> {
  try {
    const dir = await getModelsDirectory();
    await dir.getFileHandle(filename);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get OPFS file as ArrayBuffer
 */
export async function getOPFSFileBuffer(filename: string): Promise<ArrayBuffer | null> {
  const file = await readOPFSFile(filename);
  if (!file) return null;
  return await file.arrayBuffer();
}

/**
 * Clear all OPFS model files
 */
export async function clearOPFSModels(): Promise<void> {
  const dir = await getModelsDirectory();
  for await (const [name] of (dir as AsyncIterable<[string, FileSystemHandle]>)) {
    try {
      await dir.removeEntry(name);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Get total size of OPFS files
 */
export async function getOPFSTotalSize(): Promise<number> {
  const files = await listOPFSFiles();
  return files.reduce((sum, f) => sum + f.size, 0);
}

/**
 * Create blob URL from OPFS file for playback/preview
 */
export async function createOPFSBlobUrl(filename: string): Promise<string | null> {
  const file = await readOPFSFile(filename);
  if (!file) return null;
  return URL.createObjectURL(file);
}

/**
 * Revoke blob URL created from OPFS file
 */
export function revokeOPFSBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Device capability checks for Android/local inference
 */
export interface DeviceCapabilities {
  opfs: boolean;
  webgl: boolean;
  webgpu: boolean;
  webassembly: boolean;
  sharedArrayBuffer: boolean;
  sufficientStorage: boolean;
  recommendedMemory: number; // MB
}

export async function checkDeviceCapabilities(): Promise<DeviceCapabilities> {
  const quota = await getStorageQuota();
  const recommendedMB = 4096; // 4GB recommended for local inference
  const sufficientStorage = quota.available > 500 * 1024 * 1024; // 500MB minimum

  return {
    opfs: isOPFSSupported(),
    webgl: typeof WebGLRenderingContext !== 'undefined',
    webgpu: 'gpu' in navigator,
    webassembly: typeof WebAssembly !== 'undefined',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    sufficientStorage,
    recommendedMemory: recommendedMB,
  };
}

export interface CapabilityWarning {
  severity: 'error' | 'warning' | 'info';
  feature: string;
  message: string;
  suggestion: string;
}

export async function getCapabilityWarnings(): Promise<CapabilityWarning[]> {
  const capabilities = await checkDeviceCapabilities();
  const warnings: CapabilityWarning[] = [];

  if (!capabilities.opfs) {
    warnings.push({
      severity: 'error',
      feature: 'OPFS',
      message: 'Origin Private File System is not supported',
      suggestion: 'Please use Chrome 102+, Edge 102+, or Safari 15.2+. OPFS is required for storing large model files.',
    });
  }

  if (!capabilities.webassembly) {
    warnings.push({
      severity: 'error',
      feature: 'WebAssembly',
      message: 'WebAssembly is not available',
      suggestion: 'Your browser does not support WebAssembly, which is required for local model inference.',
    });
  }

  if (!capabilities.sharedArrayBuffer) {
    warnings.push({
      severity: 'warning',
      feature: 'SharedArrayBuffer',
      message: 'SharedArrayBuffer is not available',
      suggestion: 'Some local models may run slower without SharedArrayBuffer support. Cross-Origin Isolation is required.',
    });
  }

  if (!capabilities.sufficientStorage) {
    warnings.push({
      severity: 'warning',
      feature: 'Storage',
      message: 'Insufficient storage space',
      suggestion: 'Free up at least 500MB of browser storage to upload models.',
    });
  }

  if (!capabilities.webgpu && !capabilities.webgl) {
    warnings.push({
      severity: 'warning',
      feature: 'GPU Acceleration',
      message: 'GPU acceleration is not available',
      suggestion: 'Local inference may be slower without WebGL or WebGPU support.',
    });
  }

  return warnings;
}
