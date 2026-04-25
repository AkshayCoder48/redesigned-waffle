/**
 * Tests for Generation Routing Matrix
 * Validates that the routing matrix is correctly enforced for all modalities
 */

import { describe, it, expect } from 'vitest';
import {
  GENERATION_ROUTING_MATRIX,
  isSourceAllowedForModality,
  getAllowedSourcesForModality,
  getRoutingInfo,
  determineSourceType,
  RoutingError,
  validateRouting,
  getPollinationsModel,
  getPollinationsUrlForModality,
  getSourceDisplayName,
  type Modality,
  type GenerationSource,
} from '../utils/routingMatrix';

describe('Generation Routing Matrix', () => {
  describe('GENERATION_ROUTING_MATRIX', () => {
    it('should define all required modalities', () => {
      expect(GENERATION_ROUTING_MATRIX).toHaveProperty('text');
      expect(GENERATION_ROUTING_MATRIX).toHaveProperty('image');
      expect(GENERATION_ROUTING_MATRIX).toHaveProperty('tts');
      expect(GENERATION_ROUTING_MATRIX).toHaveProperty('video');
    });

    describe('Text Generation Routing', () => {
      it('should allow local models for text generation', () => {
        expect(GENERATION_ROUTING_MATRIX.text.allowedSources).toContain('local');
      });

      it('should allow cloud for text generation', () => {
        expect(GENERATION_ROUTING_MATRIX.text.allowedSources).toContain('cloud');
      });

      it('should allow openai-compatible for text generation', () => {
        expect(GENERATION_ROUTING_MATRIX.text.allowedSources).toContain('openai-compatible');
      });

      it('should have all three sources for text', () => {
        expect(GENERATION_ROUTING_MATRIX.text.allowedSources).toHaveLength(3);
      });
    });

    describe('Image Generation Routing', () => {
      it('should allow cloud for image generation', () => {
        expect(GENERATION_ROUTING_MATRIX.image.allowedSources).toContain('cloud');
      });

      it('should allow openai-compatible for image generation', () => {
        expect(GENERATION_ROUTING_MATRIX.image.allowedSources).toContain('openai-compatible');
      });

      it('should NOT allow local models for image generation', () => {
        expect(GENERATION_ROUTING_MATRIX.image.allowedSources).not.toContain('local');
      });

      it('should have exactly 2 sources for image', () => {
        expect(GENERATION_ROUTING_MATRIX.image.allowedSources).toHaveLength(2);
      });

      it('should have descriptive notes about local exclusion', () => {
        expect(GENERATION_ROUTING_MATRIX.image.notes).toBeDefined();
        const localNote = GENERATION_ROUTING_MATRIX.image.notes?.find(
          note => note.toLowerCase().includes('local')
        );
        expect(localNote).toBeDefined();
      });
    });

    describe('TTS Generation Routing', () => {
      it('should allow local models for TTS', () => {
        expect(GENERATION_ROUTING_MATRIX.tts.allowedSources).toContain('local');
      });

      it('should allow cloud for TTS', () => {
        expect(GENERATION_ROUTING_MATRIX.tts.allowedSources).toContain('cloud');
      });

      it('should allow openai-compatible for TTS', () => {
        expect(GENERATION_ROUTING_MATRIX.tts.allowedSources).toContain('openai-compatible');
      });

      it('should have all three sources for TTS', () => {
        expect(GENERATION_ROUTING_MATRIX.tts.allowedSources).toHaveLength(3);
      });
    });

    describe('Video Generation Routing', () => {
      it('should allow ONLY cloud for video generation', () => {
        expect(GENERATION_ROUTING_MATRIX.video.allowedSources).toContain('cloud');
      });

      it('should NOT allow local models for video generation', () => {
        expect(GENERATION_ROUTING_MATRIX.video.allowedSources).not.toContain('local');
      });

      it('should NOT allow openai-compatible for video generation', () => {
        expect(GENERATION_ROUTING_MATRIX.video.allowedSources).not.toContain('openai-compatible');
      });

      it('should have exactly 1 source for video', () => {
        expect(GENERATION_ROUTING_MATRIX.video.allowedSources).toHaveLength(1);
      });

      it('should have notes about Pollinations AI being the only option', () => {
        expect(GENERATION_ROUTING_MATRIX.video.notes).toBeDefined();
        expect(GENERATION_ROUTING_MATRIX.video.description).toContain('Pollinations');
      });
    });
  });

  describe('isSourceAllowedForModality', () => {
    describe('Text modality', () => {
      it('should allow local for text', () => {
        expect(isSourceAllowedForModality('text', 'local')).toBe(true);
      });

      it('should allow cloud for text', () => {
        expect(isSourceAllowedForModality('text', 'cloud')).toBe(true);
      });

      it('should allow openai-compatible for text', () => {
        expect(isSourceAllowedForModality('text', 'openai-compatible')).toBe(true);
      });
    });

    describe('Image modality', () => {
      it('should allow cloud for image', () => {
        expect(isSourceAllowedForModality('image', 'cloud')).toBe(true);
      });

      it('should allow openai-compatible for image', () => {
        expect(isSourceAllowedForModality('image', 'openai-compatible')).toBe(true);
      });

      it('should NOT allow local for image', () => {
        expect(isSourceAllowedForModality('image', 'local')).toBe(false);
      });
    });

    describe('TTS modality', () => {
      it('should allow local for tts', () => {
        expect(isSourceAllowedForModality('tts', 'local')).toBe(true);
      });

      it('should allow cloud for tts', () => {
        expect(isSourceAllowedForModality('tts', 'cloud')).toBe(true);
      });

      it('should allow openai-compatible for tts', () => {
        expect(isSourceAllowedForModality('tts', 'openai-compatible')).toBe(true);
      });
    });

    describe('Video modality', () => {
      it('should allow ONLY cloud for video', () => {
        expect(isSourceAllowedForModality('video', 'cloud')).toBe(true);
      });

      it('should NOT allow local for video', () => {
        expect(isSourceAllowedForModality('video', 'local')).toBe(false);
      });

      it('should NOT allow openai-compatible for video', () => {
        expect(isSourceAllowedForModality('video', 'openai-compatible')).toBe(false);
      });
    });
  });

  describe('getAllowedSourcesForModality', () => {
    it('should return correct sources for text', () => {
      const sources = getAllowedSourcesForModality('text');
      expect(sources).toContain('local');
      expect(sources).toContain('cloud');
      expect(sources).toContain('openai-compatible');
    });

    it('should return correct sources for image', () => {
      const sources = getAllowedSourcesForModality('image');
      expect(sources).not.toContain('local');
      expect(sources).toContain('cloud');
      expect(sources).toContain('openai-compatible');
    });

    it('should return correct sources for tts', () => {
      const sources = getAllowedSourcesForModality('tts');
      expect(sources).toContain('local');
      expect(sources).toContain('cloud');
      expect(sources).toContain('openai-compatible');
    });

    it('should return ONLY cloud for video', () => {
      const sources = getAllowedSourcesForModality('video');
      expect(sources).toHaveLength(1);
      expect(sources[0]).toBe('cloud');
    });
  });

  describe('getRoutingInfo', () => {
    it('should return routing entry for valid modality', () => {
      const entry = getRoutingInfo('image');
      expect(entry).toBeDefined();
      expect(entry.allowedSources).toBeDefined();
    });

    it('should have description for each modality', () => {
      expect(getRoutingInfo('text').description).toBeTruthy();
      expect(getRoutingInfo('image').description).toBeTruthy();
      expect(getRoutingInfo('tts').description).toBeTruthy();
      expect(getRoutingInfo('video').description).toBeTruthy();
    });
  });

  describe('determineSourceType', () => {
    const hasLocalModels = true;

    it('should return cloud for video regardless of settings', () => {
      // Video always routes to cloud
      expect(determineSourceType('video', 'local', true, 'pollinations')).toBe('cloud');
      expect(determineSourceType('video', 'openai', false, 'custom')).toBe('cloud');
    });

    it('should return local for text when connection is local and has models', () => {
      expect(determineSourceType('text', 'local', hasLocalModels, 'pollinations')).toBe('local');
    });

    it('should return local for tts when connection is local and has models', () => {
      expect(determineSourceType('tts', 'local', hasLocalModels, 'pollinations')).toBe('local');
    });

    it('should fallback to cloud for image when connection is local', () => {
      // Image doesn't support local, so should fallback to cloud
      expect(determineSourceType('image', 'local', hasLocalModels, 'pollinations')).toBe('cloud');
    });

    it('should return cloud for Pollinations provider', () => {
      expect(determineSourceType('text', 'openai', false, 'pollinations')).toBe('cloud');
    });

    it('should return openai-compatible for custom providers', () => {
      expect(determineSourceType('text', 'openai', false, 'custom-provider')).toBe('openai-compatible');
    });
  });

  describe('RoutingError', () => {
    describe('constructor', () => {
      it('should create error with correct properties', () => {
        const error = new RoutingError('image', 'local', ['cloud', 'openai-compatible']);
        expect(error.modality).toBe('image');
        expect(error.source).toBe('local');
        expect(error.allowedSources).toEqual(['cloud', 'openai-compatible']);
        expect(error.actionable).toBe(true);
      });

      it('should have descriptive message', () => {
        const error = new RoutingError('image', 'local', ['cloud', 'openai-compatible']);
        expect(error.message).toContain('image');
        expect(error.message).toContain('local');
        expect(error.message).toContain('cloud');
      });
    });

    describe('getUserFriendlyMessage', () => {
      it('should return appropriate message for image with local source', () => {
        const error = new RoutingError('image', 'local', ['cloud', 'openai-compatible']);
        const msg = error.getUserFriendlyMessage();
        expect(msg).toContain('local');
        expect(msg).toContain('Cloud');
      });

      it('should return appropriate message for video with wrong source', () => {
        const error = new RoutingError('video', 'local', ['cloud']);
        const msg = error.getUserFriendlyMessage();
        expect(msg).toContain('Pollinations');
        expect(msg).toContain('Cloud');
      });
    });

    describe('getSuggestedAction', () => {
      it('should suggest switching to cloud for image', () => {
        const error = new RoutingError('image', 'local', ['cloud', 'openai-compatible']);
        const action = error.getSuggestedAction();
        expect(action).toContain('Cloud');
      });

      it('should suggest using Pollinations for video', () => {
        const error = new RoutingError('video', 'local', ['cloud']);
        const action = error.getSuggestedAction();
        expect(action).toContain('Pollinations');
      });
    });
  });

  describe('validateRouting', () => {
    it('should not throw for valid routing', () => {
      expect(() => validateRouting('text', 'local')).not.toThrow();
      expect(() => validateRouting('image', 'cloud')).not.toThrow();
      expect(() => validateRouting('tts', 'openai-compatible')).not.toThrow();
      expect(() => validateRouting('video', 'cloud')).not.toThrow();
    });

    it('should throw RoutingError for invalid image routing', () => {
      expect(() => validateRouting('image', 'local')).toThrow(RoutingError);
    });

    it('should throw RoutingError for invalid video routing with local', () => {
      expect(() => validateRouting('video', 'local')).toThrow(RoutingError);
    });

    it('should throw RoutingError for invalid video routing with openai-compatible', () => {
      expect(() => validateRouting('video', 'openai-compatible')).toThrow(RoutingError);
    });
  });

  describe('getPollinationsModel', () => {
    it('should return flux as default for image', () => {
      expect(getPollinationsModel('image')).toBe('flux');
    });

    it('should return wan as default for video', () => {
      expect(getPollinationsModel('video')).toBe('wan');
    });

    it('should return openai-audio as default for tts', () => {
      expect(getPollinationsModel('tts')).toBe('openai-audio');
    });

    it('should return openai as default for text', () => {
      expect(getPollinationsModel('text')).toBe('openai');
    });

    it('should use selected model when provided', () => {
      expect(getPollinationsModel('image', 'gptimage')).toBe('gptimage');
      expect(getPollinationsModel('video', 'veo')).toBe('veo');
    });
  });

  describe('getPollinationsUrlForModality', () => {
    describe('Image URLs', () => {
      it('should generate image URL with correct format', () => {
        const url = getPollinationsUrlForModality('image', 'a cat');
        expect(url).toContain('image.pollinations.ai');
        expect(url).toContain('prompt');
        expect(url).toContain('a%20cat');
      });

      it('should include model parameter', () => {
        const url = getPollinationsUrlForModality('image', 'a cat', { model: 'flux' });
        expect(url).toContain('model=flux');
      });

      it('should include width and height', () => {
        const url = getPollinationsUrlForModality('image', 'a cat', { width: 512, height: 512 });
        expect(url).toContain('width=512');
        expect(url).toContain('height=512');
      });
    });

    describe('Video URLs', () => {
      it('should generate video URL with correct format', () => {
        const url = getPollinationsUrlForModality('video', 'a sunset');
        expect(url).toContain('gen.pollinations.ai');
        expect(url).toContain('video');
        expect(url).toContain('a%20sunset');
      });
    });

    describe('TTS URLs', () => {
      it('should generate audio URL with correct format', () => {
        const url = getPollinationsUrlForModality('tts', 'hello world');
        expect(url).toContain('gen.pollinations.ai');
        expect(url).toContain('audio');
        expect(url).toContain('hello%20world');
      });

      it('should include voice parameter', () => {
        const url = getPollinationsUrlForModality('tts', 'hello', { voice: 'nova' });
        expect(url).toContain('voice=nova');
      });
    });

    describe('Text URLs', () => {
      it('should return empty string for text modality', () => {
        const url = getPollinationsUrlForModality('text', 'hello');
        expect(url).toBe('');
      });
    });
  });

  describe('getSourceDisplayName', () => {
    it('should return correct display name for local', () => {
      expect(getSourceDisplayName('local')).toBe('Local Model');
    });

    it('should return correct display name for cloud', () => {
      expect(getSourceDisplayName('cloud')).toBe('Pollinations AI Cloud');
    });

    it('should return correct display name for openai-compatible', () => {
      expect(getSourceDisplayName('openai-compatible')).toBe('OpenAI-compatible API');
    });
  });
});

describe('Routing Matrix Positive/Negative Test Cases', () => {
  describe('Positive Cases - Valid Combinations', () => {
    const validCombinations: Array<{ modality: Modality; source: GenerationSource }> = [
      { modality: 'text', source: 'local' },
      { modality: 'text', source: 'cloud' },
      { modality: 'text', source: 'openai-compatible' },
      { modality: 'image', source: 'cloud' },
      { modality: 'image', source: 'openai-compatible' },
      { modality: 'tts', source: 'local' },
      { modality: 'tts', source: 'cloud' },
      { modality: 'tts', source: 'openai-compatible' },
      { modality: 'video', source: 'cloud' },
    ];

    test.each(validCombinations)(
      'should allow $source for $modality',
      ({ modality, source }) => {
        expect(isSourceAllowedForModality(modality, source)).toBe(true);
        expect(() => validateRouting(modality, source)).not.toThrow();
      }
    );
  });

  describe('Negative Cases - Invalid Combinations', () => {
    const invalidCombinations: Array<{ modality: Modality; source: GenerationSource }> = [
      // Image doesn't support local
      { modality: 'image', source: 'local' },
      // Video doesn't support local
      { modality: 'video', source: 'local' },
      // Video doesn't support openai-compatible
      { modality: 'video', source: 'openai-compatible' },
    ];

    test.each(invalidCombinations)(
      'should NOT allow $source for $modality',
      ({ modality, source }) => {
        expect(isSourceAllowedForModality(modality, source)).toBe(false);
        expect(() => validateRouting(modality, source)).toThrow(RoutingError);
      }
    );
  });
});

describe('Routing Matrix Integration Scenarios', () => {
  describe('User with local models selected', () => {
    const hasLocalModels = true;
    const connectionType = 'local' as const;

    it('should route text to local', () => {
      expect(determineSourceType('text', connectionType, hasLocalModels, 'pollinations')).toBe('local');
    });

    it('should route tts to local', () => {
      expect(determineSourceType('tts', connectionType, hasLocalModels, 'pollinations')).toBe('local');
    });

    it('should route image to cloud (fallback)', () => {
      // Image doesn't support local, so should fallback to cloud
      expect(determineSourceType('image', connectionType, hasLocalModels, 'pollinations')).toBe('cloud');
    });

    it('should route video to cloud', () => {
      expect(determineSourceType('video', connectionType, hasLocalModels, 'pollinations')).toBe('cloud');
    });
  });

  describe('User with cloud provider selected', () => {
    const hasLocalModels = false;
    const connectionType = 'openai' as const;

    it('should route text to cloud', () => {
      expect(determineSourceType('text', connectionType, hasLocalModels, 'pollinations')).toBe('cloud');
    });

    it('should route image to cloud', () => {
      expect(determineSourceType('image', connectionType, hasLocalModels, 'pollinations')).toBe('cloud');
    });

    it('should route video to cloud', () => {
      expect(determineSourceType('video', connectionType, hasLocalModels, 'pollinations')).toBe('cloud');
    });
  });

  describe('User with custom provider selected', () => {
    const hasLocalModels = false;
    const connectionType = 'openai' as const;
    const customProvider = 'custom-api';

    it('should route text to openai-compatible', () => {
      expect(determineSourceType('text', connectionType, hasLocalModels, customProvider)).toBe('openai-compatible');
    });

    it('should route image to openai-compatible', () => {
      expect(determineSourceType('image', connectionType, hasLocalModels, customProvider)).toBe('openai-compatible');
    });

    it('should still route video to cloud (Pollinations only)', () => {
      expect(determineSourceType('video', connectionType, hasLocalModels, customProvider)).toBe('cloud');
    });
  });
});

describe('No Debug/Tool Trace Leakage', () => {
  it('RoutingError messages should be user-friendly, not debug traces', () => {
    const error = new RoutingError('image', 'local', ['cloud', 'openai-compatible']);
    const message = error.getUserFriendlyMessage();
    
    // Should not contain internal variable names or stack traces
    expect(message).not.toContain('undefined');
    expect(message).not.toContain('null');
    expect(message).not.toContain('stack');
    expect(message).not.toContain('at ');
    expect(message).not.toContain('[object');
  });

  it('Routing matrix should have no debug notes', () => {
    Object.values(GENERATION_ROUTING_MATRIX).forEach(entry => {
      entry.notes?.forEach(note => {
        expect(note).not.toContain('TODO');
        expect(note).not.toContain('FIXME');
        expect(note).not.toContain('DEBUG');
      });
    });
  });
});
