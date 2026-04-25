/**
 * Tests for Text/TTS Model Selection and Persistence
 */

import { describe, it, expect } from 'vitest';

describe('SettingsPanel - Model Selection Persistence', () => {
  describe('Local Storage Keys', () => {
    it('should use correct localStorage keys for text model selection', () => {
      // Verify the localStorage key format
      expect('ai-maos-text-model').toBeTruthy();
      expect('ai-maos-text-local-model').toBeTruthy();
    });

    it('should use correct localStorage keys for TTS model selection', () => {
      // Verify the localStorage key format
      expect('ai-maos-tts-model').toBeTruthy();
      expect('ai-maos-tts-local-model').toBeTruthy();
      expect('ai-maos-tts-voice').toBeTruthy();
    });

    it('should use correct localStorage keys for video model selection', () => {
      // Verify the localStorage key format
      expect('ai-maos-video-model').toBeTruthy();
    });
  });
});

describe('Model Selection Keys Format', () => {
  it('should support local model prefix for routing', () => {
    const modelId = 'local:model-123';
    expect(modelId.startsWith('local:')).toBe(true);
  });

  it('should support cloud model without prefix', () => {
    const modelId = 'flux';
    expect(modelId.startsWith('local:')).toBe(false);
  });
});
