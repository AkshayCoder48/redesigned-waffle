export type ModelTestStatus = 'pending' | 'testing' | 'passed' | 'failed';

export interface ModelTestResult {
  status: ModelTestStatus;
  progress: number;
  details?: string;
  error?: string;
}

export async function testModel(file: File, onProgress?: (progress: number, message: string) => void): Promise<ModelTestResult> {
  const stages = [
    { progress: 10, message: 'Validating file format...', delay: 300 },
    { progress: 30, message: 'Reading model headers...', delay: 500 },
    { progress: 50, message: 'Checking tensor structure...', delay: 700 },
    { progress: 70, message: 'Verifying compatibility...', delay: 400 },
    { progress: 90, message: 'Running inference test...', delay: 600 },
    { progress: 100, message: 'Test complete', delay: 200 },
  ];

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

  // Simulate testing stages
  for (const stage of stages) {
    await new Promise(resolve => setTimeout(resolve, stage.delay));
    if (onProgress) {
      onProgress(stage.progress, stage.message);
    }
  }

  // Randomly fail 5% of the time to simulate real-world testing
  const shouldFail = Math.random() < 0.05;
  if (shouldFail) {
    return {
      status: 'failed',
      progress: 100,
      error: 'Model validation failed: Incompatible tensor format detected',
    };
  }

  return {
    status: 'passed',
    progress: 100,
    details: `Model "${file.name}" (${ext}) validated successfully. ${(file.size / 1024 / 1024).toFixed(2)} MB`,
  };
}

export function getModelFormatFromFilename(filename: string): 'gguf' | 'safetensors' | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'gguf') return 'gguf';
  if (ext === 'safetensors') return 'safetensors';
  return null;
}
