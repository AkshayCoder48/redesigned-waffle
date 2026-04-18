/**
 * Real GGUF and Safetensors model validation
 * Checks file headers and structure to verify format
 */

export type ModelFormat = 'gguf' | 'safetensors' | 'unknown';

export interface ValidationResult {
  valid: boolean;
  format: ModelFormat;
  details: string;
  error?: string;
}

/**
 * Check if a file is a valid GGUF file
 * GGUF magic number: 0x46554747 ("GGUF" in little endian)
 */
async function validateGGUF(file: File): Promise<ValidationResult> {
  const headerSize = 12; // Magic (4) + Version (4) + Tensor count (4)
  const buffer = await file.slice(0, headerSize).arrayBuffer();
  const view = new DataView(buffer);
  
  // Check magic number
  const magic = view.getUint32(0, true); // Little endian
  const expectedMagic = 0x46554747; // "GGUF"
  
  if (magic !== expectedMagic) {
    return {
      valid: false,
      format: 'gguf',
      details: 'Invalid GGUF magic number',
      error: 'File does not have valid GGUF header',
    };
  }
  
  // Read version
  const version = view.getUint32(4, true);
  
  // Read tensor count
  const tensorCount = view.getUint32(8, true);
  
  return {
    valid: true,
    format: 'gguf',
    details: `Valid GGUF v${version} with ${tensorCount} tensors`,
  };
}

/**
 * Check if a file is a valid Safetensors file
 * Safetensors has a specific header structure with JSON metadata
 */
async function validateSafetensors(file: File): Promise<ValidationResult> {
  const headerSize = Math.min(1024, file.size); // Read first 1KB
  const buffer = await file.slice(0, headerSize).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  // Safetensors files start with length of JSON header (8 bytes, little endian)
  if (bytes.length < 8) {
    return {
      valid: false,
      format: 'safetensors',
      details: 'File too small to be valid Safetensors',
      error: 'Invalid file size',
    };
  }
  
  // Read header length
  const headerLengthView = new DataView(buffer);
  const headerLength = Number(headerLengthView.getBigUint64(0, true)); // Little endian
  
  // Sanity check: header length should be reasonable
  if (headerLength > 100 * 1024 * 1024) { // > 100MB header is suspicious
    return {
      valid: false,
      format: 'safetensors',
      details: 'Header size too large',
      error: 'Invalid header length',
    };
  }
  
  if (headerLength > file.size - 8) {
    return {
      valid: false,
      format: 'safetensors',
      details: 'Header size exceeds file size',
      error: 'Invalid header length',
    };
  }
  
  // Try to parse JSON header
  try {
    const headerBuffer = await file.slice(8, 8 + headerLength).arrayBuffer();
    const headerText = new TextDecoder().decode(headerBuffer);
    const header = JSON.parse(headerText);
    
    // Check for expected fields
    if (!header.metadata && !header.tensors) {
      return {
        valid: false,
        format: 'safetensors',
        details: 'Missing required fields in header',
        error: 'Invalid Safetensors structure',
      };
    }
    
    const tensorCount = header.tensors ? Object.keys(header.tensors).length : 0;
    
    return {
      valid: true,
      format: 'safetensors',
      details: `Valid Safetensors with ${tensorCount} tensors`,
    };
  } catch (error) {
    return {
      valid: false,
      format: 'safetensors',
      details: 'Failed to parse header JSON',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate a model file and determine its format
 */
export async function validateModelFile(file: File): Promise<ValidationResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // First check by extension
  if (extension === 'gguf') {
    return validateGGUF(file);
  }
  
  if (extension === 'safetensors') {
    return validateSafetensors(file);
  }
  
  // Try auto-detection by checking both formats
  try {
    const ggufResult = await validateGGUF(file);
    if (ggufResult.valid) {
      return ggufResult;
    }
  } catch {
    // Not GGUF, continue
  }
  
  try {
    const safetensorsResult = await validateSafetensors(file);
    if (safetensorsResult.valid) {
      return safetensorsResult;
    }
  } catch {
    // Not Safetensors
  }
  
  return {
    valid: false,
    format: 'unknown',
    details: 'Unable to determine model format',
    error: 'Unsupported file format. Expected .gguf or .safetensors',
  };
}

/**
 * Test model compatibility (basic checks)
 */
export async function testModelCompatibility(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<{ success: boolean; details: string }> {
  try {
    onProgress?.(10, 'Reading file header...');
    
    const validation = await validateModelFile(file);
    
    if (!validation.valid) {
      return {
        success: false,
        details: validation.error || validation.details,
      };
    }
    
    onProgress?.(30, `Validated ${validation.format} format...`);
    
    // Additional checks
    onProgress?.(50, 'Checking file integrity...');
    
    // Check file size (should be reasonable)
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB < 1) {
      return {
        success: false,
        details: 'File too small to be a valid model',
      };
    }
    
    onProgress?.(70, `File size: ${sizeMB.toFixed(2)} MB...`);
    
    // For GGUF, we could do additional tensor validation here
    // For now, we do basic checks
    onProgress?.(90, 'Validation complete...');
    
    return {
      success: true,
      details: validation.details,
    };
  } catch (error) {
    return {
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error during validation',
    };
  } finally {
    onProgress?.(100, 'Done');
  }
}
