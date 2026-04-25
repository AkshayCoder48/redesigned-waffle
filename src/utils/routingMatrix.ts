/**
 * Generation Routing Matrix
 * Defines which sources/providers are valid for each modality
 * 
 * Routing Matrix:
 * - Text Generation: Local model upload, Cloud, OpenAI-compatible API
 * - Image Generation: Cloud only, OpenAI-compatible API (NO local image models)
 * - TTS: Local model upload, OpenAI-compatible API, Cloud
 * - Video Generation: Pollinations AI Cloud only (no local, no generic OpenAI-compatible)
 */

export type Modality = 'text' | 'image' | 'tts' | 'video';

export type GenerationSource = 'local' | 'cloud' | 'openai-compatible';

export interface RoutingEntry {
  allowedSources: GenerationSource[];
  description: string;
  notes?: string[];
}

export type RoutingMatrix = Record<Modality, RoutingEntry>;

/**
 * The routing matrix defines valid sources for each modality
 */
export const GENERATION_ROUTING_MATRIX: RoutingMatrix = {
  text: {
    allowedSources: ['local', 'cloud', 'openai-compatible'],
    description: 'Text generation supports all sources',
    notes: [
      'Local: Use uploaded GGUF/Safetensors models',
      'Cloud: Use Pollinations AI hosted models',
      'OpenAI-compatible: Use custom API endpoint',
    ],
  },
  image: {
    allowedSources: ['cloud', 'openai-compatible'],
    description: 'Image generation supports cloud and OpenAI-compatible only',
    notes: [
      'Local image models are NOT supported for image generation',
      'Cloud: Use Pollinations AI image models (Flux, etc.)',
      'OpenAI-compatible: Use custom image API endpoint',
    ],
  },
  tts: {
    allowedSources: ['local', 'cloud', 'openai-compatible'],
    description: 'Text-to-speech supports all sources',
    notes: [
      'Local: Use uploaded TTS models',
      'Cloud: Use Pollinations AI TTS',
      'OpenAI-compatible: Use custom TTS API endpoint',
    ],
  },
  video: {
    allowedSources: ['cloud'],
    description: 'Video generation is Pollinations AI Cloud only',
    notes: [
      'No local model support for video generation',
      'No generic OpenAI-compatible video endpoint support',
      'All video requests route to Pollinations AI',
    ],
  },
};

/**
 * Check if a source is allowed for a given modality
 */
export function isSourceAllowedForModality(modality: Modality, source: GenerationSource): boolean {
  const entry = GENERATION_ROUTING_MATRIX[modality];
  return entry.allowedSources.includes(source);
}

/**
 * Get allowed sources for a modality
 */
export function getAllowedSourcesForModality(modality: Modality): GenerationSource[] {
  return GENERATION_ROUTING_MATRIX[modality].allowedSources;
}

/**
 * Get routing information for a modality
 */
export function getRoutingInfo(modality: Modality): RoutingEntry {
  return GENERATION_ROUTING_MATRIX[modality];
}

/**
 * Determine the source type based on settings
 */
export function determineSourceType(
  modality: Modality,
  connectionType: 'local' | 'openai',
  hasLocalModels: boolean,
  selectedProviderId?: string
): GenerationSource {
  // Video is always cloud-only (Pollinations)
  if (modality === 'video') {
    return 'cloud';
  }

  // Check if it's a local model path
  if (connectionType === 'local' && hasLocalModels) {
    // Image doesn't support local
    if (modality === 'image') {
      // Fall back to cloud for image when local is selected
      return 'cloud';
    }
    return 'local';
  }

  // Check if using Pollinations (cloud)
  if (selectedProviderId === 'pollinations') {
    return 'cloud';
  }

  // Otherwise it's OpenAI-compatible
  return 'openai-compatible';
}

/**
 * Error class for routing violations
 */
export class RoutingError extends Error {
  public readonly modality: Modality;
  public readonly source: GenerationSource;
  public readonly allowedSources: GenerationSource[];
  public readonly actionable: boolean;

  constructor(
    modality: Modality,
    source: GenerationSource,
    allowedSources: GenerationSource[]
  ) {
    const allowedStr = allowedSources.join(', ');
    super(
      `Invalid source "${source}" for modality "${modality}". Allowed sources: ${allowedStr}`
    );
    this.name = 'RoutingError';
    this.modality = modality;
    this.source = source;
    this.allowedSources = allowedSources;
    this.actionable = true;
  }

  /**
   * Get user-friendly error message with actionable guidance
   */
  getUserFriendlyMessage(): string {
    switch (this.modality) {
      case 'image':
        if (this.source === 'local') {
          return `Image generation does not support local models. Please switch to Cloud (Pollinations AI) or configure an OpenAI-compatible image API endpoint.`;
        }
        return `Image generation is not supported with this source configuration. Use Cloud or OpenAI-compatible API.`;
      
      case 'video':
        return `Video generation is only available through Pollinations AI Cloud. No local models or custom video endpoints are supported.`;
      
      case 'tts':
        if (this.source === 'local' && !this.allowedSources.includes('local')) {
          return `TTS does not have a validated local model available. Please use Cloud or OpenAI-compatible API.`;
        }
        return `TTS source configuration is invalid.`;
      
      case 'text':
        return `Text generation source configuration is invalid.`;
      
      default:
        return `Unsupported modality: ${this.modality}`;
    }
  }

  /**
   * Get suggested action
   */
  getSuggestedAction(): string {
    switch (this.modality) {
      case 'image':
        if (this.source === 'local') {
          return 'Switch to Cloud mode or configure an OpenAI-compatible image API in Settings.';
        }
        return 'Check your provider settings.';
      
      case 'video':
        return 'Video generation will use Pollinations AI Cloud automatically.';
      
      case 'tts':
        return 'Validate a local TTS model or use Cloud/OpenAI-compatible TTS.';
      
      default:
        return 'Please check your settings.';
    }
  }
}

/**
 * Validate a routing request and throw if invalid
 */
export function validateRouting(
  modality: Modality,
  source: GenerationSource
): void {
  if (!isSourceAllowedForModality(modality, source)) {
    throw new RoutingError(
      modality,
      source,
      getAllowedSourcesForModality(modality)
    );
  }
}

/**
 * Get the appropriate Pollinations model for each modality
 */
export function getPollinationsModel(modality: Modality, selectedModelId?: string): string {
  switch (modality) {
    case 'image':
      // Default image models from Pollinations
      return selectedModelId || 'flux';
    
    case 'video':
      // Video always uses Pollinations - use a default
      return selectedModelId || 'wan';
    
    case 'tts':
      // TTS uses Pollinations audio endpoint
      return selectedModelId || 'openai-audio';
    
    case 'text':
    default:
      return selectedModelId || 'openai';
  }
}

/**
 * Map modality to intent type for orchestrator
 */
export function modalityToIntent(modality: Modality): 'image' | 'video' | 'audio' | 'general' {
  switch (modality) {
    case 'image':
      return 'image';
    case 'video':
      return 'video';
    case 'tts':
      return 'audio';
    case 'text':
    default:
      return 'general';
  }
}

/**
 * Check if modality requires special handling
 */
export function requiresSpecialHandling(modality: Modality): boolean {
  return modality === 'video';
}

/**
 * Get Pollinations URL for a modality
 */
export function getPollinationsUrlForModality(
  modality: Modality,
  prompt: string,
  options?: {
    model?: string;
    width?: number;
    height?: number;
    voice?: string;
  }
): string {
  const encodedPrompt = encodeURIComponent(prompt);

  switch (modality) {
    case 'image':
      return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${options?.width || 1024}&height=${options?.height || 1024}&nologo=true&model=${options?.model || 'flux'}`;
    
    case 'video':
      // Video always routes to Pollinations
      return `https://gen.pollinations.ai/video/${encodedPrompt}`;
    
    case 'tts':
      return `https://gen.pollinations.ai/audio/${encodedPrompt}?voice=${options?.voice || 'nova'}`;
    
    case 'text':
    default:
      return '';
  }
}

/**
 * Export source display names for UI
 */
export const SOURCE_DISPLAY_NAMES: Record<GenerationSource, string> = {
  local: 'Local Model',
  cloud: 'Pollinations AI Cloud',
  'openai-compatible': 'OpenAI-compatible API',
};

/**
 * Get source icon/name for display
 */
export function getSourceDisplayName(source: GenerationSource): string {
  return SOURCE_DISPLAY_NAMES[source];
}
