import { testModelCompatibility } from './modelValidator';

export type ModelTestStatus = 'pending' | 'testing' | 'passed' | 'failed';

export interface ModelTestResult {
  status: ModelTestStatus;
  progress: number;
  details?: string;
  error?: string;
}

export async function testModel(file: File, onProgress?: (progress: number, message: string) => void): Promise<ModelTestResult> {
  // Validate file extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'gguf' && ext !== 'safetensors') {
    return {
      status: 'failed',
      progress: 0,
      error: `Invalid file format. Expected .gguf or .safetensors, got .${ext}`,
    };
  }

  // Validate file size (should be at least 1MB for a model)
  if (file.size < 1024 * 1024) {
    return {
      status: 'failed',
      progress: 0,
      error: 'File too small to be a valid model file (minimum 1MB)',
    };
  }

  // Run real validation
  try {
    const result = await testModelCompatibility(file, onProgress);
    
    if (result.success) {
      return {
        status: 'passed',
        progress: 100,
        details: result.details,
      };
    } else {
      return {
        status: 'failed',
        progress: 100,
        error: result.details,
      };
    }
  } catch (error) {
    return {
      status: 'failed',
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

export function getModelFormatFromFilename(filename: string): 'gguf' | 'safetensors' | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'gguf') return 'gguf';
  if (ext === 'safetensors') return 'safetensors';
  return null;
}
